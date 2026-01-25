from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
import httpx
import os
from pydantic import BaseModel
from typing import Optional, List
from dotenv import load_dotenv

load_dotenv()

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

class PromotionPayload(BaseModel):
    id: str
    title: str
    price: float
    original_price: Optional[float] = None
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
