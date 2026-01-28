from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
import httpx
import os
from pydantic import BaseModel
from typing import Optional, List
from dotenv import load_dotenv
from apscheduler.schedulers.background import BackgroundScheduler
from supabase import create_client, Client
import logging
import asyncio

load_dotenv()

# Configuração de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="PromoShare Backend Gateway")

# Configuração de CORS - No Docker, o Nginx cuidará disso, 
# mas deixamos aqui por segurança em dev local.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configurações sensíveis vindas do ambiente
WEBHOOK_URL = os.getenv("WEBHOOK_URL", "https://76.13.66.108.sslip.io/webhook/promoshare")
WEBHOOK_AUTH_TOKEN = os.getenv("WEBHOOK_AUTH_TOKEN", "a3f9c2e87b4d1a6e9f0c5b72e4d8a1c3f6b0e9d7a2c4f8b5e1d6a9c0b7e4f2")
EXTERNAL_API_BASE_URL = "https://api.divulgadorinteligente.com"
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://behdyuplqoxgdbujzkob.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "sb_publishable_OHdZ5yIbqvoowxDpmIEYqQ_xNzoMIB7")

# Cliente Supabase
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

class PromotionPayload(BaseModel):
    id: str
    title: str
    price: str
    original_price: Optional[str] = None
    link: str
    cupom: Optional[str] = None
    image_url: str
    seller: Optional[str] = None
    free_shipping: Optional[bool] = None
    installment: Optional[str] = None
    extra_info: Optional[str] = None
    category: Optional[str] = None
    target_groups: List[Optional[str]]
    target_details: List[dict]
    timestamp: str
    app: str

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/api/products")
async def get_external_product(sitename: str, start: int = 0, limit: int = 1):
    """
    Proxy seguro para a API externa.
    """
    url = f"{EXTERNAL_API_BASE_URL}/api/products"
    params = {
        "sitename": sitename,
        "start": start,
        "limit": limit
    }
    
    headers = {
        "accept": "application/json, text/plain, */*",
        "accept-language": "pt-BR,pt;q=0.9",
        "priority": "u=1, i",
        "sec-ch-ua": '"Not(A:Brand";v="8", "Chromium";v="144", "Google Chrome";v="144"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site"
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, params=params, headers=headers, timeout=30.0)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Erro ao conectar na API externa: {str(e)}")

@app.post("/api/send-webhook")
async def send_webhook(promo: PromotionPayload, authorization: Optional[str] = Header(None)):
    """
    Dispara o webhook de forma segura. 
    O token sensível fica guardado apenas aqui no Python.
    """
    # TODO: Validar aqui o JWT do usuário vindo do Supabase (authorization)
    # para garantir que só usuários logados disparem webhooks.
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": WEBHOOK_AUTH_TOKEN
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                WEBHOOK_URL,
                json=promo.dict(),
                headers=headers,
                timeout=30.0
            )
            # O webhook pode retornar erros, mas não queremos travar o front por isso
            return {
                "status": "success" if response.status_code < 400 else "partial_error",
                "webhook_status": response.status_code,
                "detail": response.text if response.status_code >= 400 else "Sent successfully"
            }
        except Exception as e:
            # Logamos o erro, mas retornamos sucesso para o front (já que o dado foi salvo no Supabase)
            print(f"Erro no Webhook: {str(e)}")
            return {"status": "webhook_failed", "detail": str(e)}

# ===== WORKER DE AUTO-SEND =====

async def check_and_send_new_offers():
    """
    Worker que verifica a cada 1 minuto se há novas ofertas
    e envia automaticamente para usuários com auto_send_enabled = true
    """
    try:
        logger.info("🔄 Verificando novas ofertas...")
        
        # Busca usuários com auto-send ativado
        users_response = supabase.table('users').select('*').eq('auto_send_enabled', True).execute()
        
        if not users_response.data:
            logger.info("Nenhum usuário com auto-send ativado")
            return
        
        logger.info(f"📋 {len(users_response.data)} usuários com auto-send ativado")
        
        # Busca a última oferta da API externa
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{EXTERNAL_API_BASE_URL}/api/products",
                    params={"sitename": "thautec", "start": 0, "limit": 1},
                    timeout=30.0
                )
                response.raise_for_status()
                external_data = response.json()
                
                if not external_data.get('data') or len(external_data['data']) == 0:
                    logger.info("Nenhum produto encontrado na API externa")
                    return
                
                product = external_data['data'][0]
                external_id = product.get('id')
                
                logger.info(f"🔍 Última oferta externa: {external_id}")
                
                # Para cada usuário com auto-send ativo
                for user in users_response.data:
                    last_checked_id = user.get('last_checked_offer_id')
                    
                    # Se o ID mudou, há uma nova oferta
                    if external_id and str(external_id) != str(last_checked_id):
                        logger.info(f"🔔 Nova oferta detectada para {user['email']}: {product['attributes']['title']}")
                        
                        # Verifica se já existe no banco
                        existing = supabase.table('offers').select('*').eq('external_id', str(external_id)).execute()
                        
                        if not existing.data or len(existing.data) == 0:
                            # Busca grupos do usuário
                            groups_response = supabase.table('groups').select('*').execute()
                            all_groups = groups_response.data or []
                            
                            # Prepara dados da oferta
                            attr = product['attributes']
                            
                            price = attr.get('price', '')
                            original_price = attr.get('price_from')
                            
                            # Salva no banco
                            offer_data = {
                                'external_id': str(external_id),
                                'title': attr.get('title', ''),
                                'price': price,
                                'original_price': original_price,
                                'link': attr.get('link', ''),
                                'cupom': attr.get('cupom'),
                                'image_url': attr.get('image', ''),
                                'seller': attr.get('seller'),
                                'free_shipping': attr.get('free_shipping', False),
                                'installment': attr.get('installment'),
                                'extra_info': attr.get('extra_info'),
                                'category': None
                            }
                            
                            saved_offer = supabase.table('offers').insert(offer_data).execute()
                            
                            if saved_offer.data:
                                logger.info(f"✅ Oferta salva no banco: {saved_offer.data[0]['id']}")
                                
                                # Prepara payload do webhook
                                webhook_payload = {
                                    "id": str(saved_offer.data[0]['id']),
                                    "title": offer_data['title'],
                                    "price": price,
                                    "original_price": original_price,
                                    "link": offer_data['link'],
                                    "cupom": offer_data['cupom'],
                                    "image_url": offer_data['image_url'],
                                    "seller": offer_data['seller'],
                                    "free_shipping": offer_data['free_shipping'],
                                    "installment": offer_data['installment'],
                                    "extra_info": offer_data['extra_info'],
                                    "category": None,
                                    "target_groups": [g['api_identifier'] for g in all_groups],
                                    "target_details": [
                                        {
                                            "api_identifier": g['api_identifier'],
                                            "name": g['name'],
                                            "platform": g['platform']
                                        } for g in all_groups
                                    ],
                                    "timestamp": saved_offer.data[0]['created_at'],
                                    "app": "PromoShare"
                                }
                                
                                # Envia webhook
                                headers = {
                                    "Content-Type": "application/json",
                                    "Authorization": WEBHOOK_AUTH_TOKEN
                                }
                                
                                webhook_response = await client.post(
                                    WEBHOOK_URL,
                                    json=webhook_payload,
                                    headers=headers,
                                    timeout=30.0
                                )
                                
                                logger.info(f"📤 Webhook enviado: {webhook_response.status_code}")
                        
                        # Atualiza o último ID verificado
                        supabase.table('users').update({
                            'last_checked_offer_id': str(external_id)
                        }).eq('email', user['email']).execute()
                        
            except Exception as e:
                logger.error(f"Erro ao buscar ofertas externas: {str(e)}")
                
    except Exception as e:
        logger.error(f"Erro no worker de auto-send: {str(e)}")

# Scheduler
scheduler = BackgroundScheduler()

def run_async_check():
    """Helper para rodar função async no scheduler"""
    asyncio.run(check_and_send_new_offers())

@app.on_event("startup")
async def startup_event():
    """Inicia o scheduler quando a aplicação iniciar"""
    logger.info("🚀 Iniciando worker de auto-send...")
    scheduler.add_job(
        run_async_check,
        'interval',
        minutes=1,
        id='auto_send_worker'
    )
    scheduler.start()
    logger.info("✅ Worker de auto-send iniciado! Verificando a cada 1 minuto.")

@app.on_event("shutdown")
async def shutdown_event():
    """Para o scheduler quando a aplicação desligar"""
    scheduler.shutdown()
    logger.info("🛑 Worker de auto-send parado.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
