# 🎯 PromoShare

Sistema de gerenciamento e distribuição de promoções para grupos de Telegram e WhatsApp, com painel administrativo e automação inteligente.

## 📋 Sobre o Projeto

O **PromoShare** é uma plataforma completa para:

- 📢 **Gerenciar promoções** - Cadastre, edite e organize promoções com imagens, preços, cupons e links
- 👥 **Gerenciar grupos** - Configure grupos de Telegram e WhatsApp para receber promoções
- 🏷️ **Categorizar** - Organize promoções por categorias (Eletrônicos, Moda, Casa, etc.)
- 🤖 **Automatizar envios** - Crie regras para envio automático de promoções para grupos específicos
- 📊 **Dashboard** - Acompanhe estatísticas de envios e performance
- 👤 **Multi-usuários** - Sistema de login com diferentes níveis de acesso (Admin/User)

## 🛠️ Tecnologias

### Frontend
- **React 19** + **TypeScript**
- **Vite** - Build tool
- **Tailwind CSS 4** - Estilização
- **React Router 7** - Roteamento
- **Recharts** - Gráficos
- **Lucide React** - Ícones
- **Supabase JS** - Cliente de banco de dados

### Backend
- **Python 3** + **FastAPI**
- **Supabase** - Banco de dados e autenticação
- **APScheduler** - Agendamento de tarefas
- **Uvicorn** - Servidor ASGI

### Infraestrutura
- **Docker** + **Docker Compose**
- **Nginx** - Servidor web e proxy reverso

## 🚀 Como Executar

### Pré-requisitos

- **Node.js** 18+
- **Python** 3.10+
- **Docker** e **Docker Compose** (opcional, para produção)

### Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
VITE_SUPABASE_URL=sua_url_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima
GEMINI_API_KEY=sua_chave_gemini
```

Crie um arquivo `.env` na pasta `backend/`:

```env
SUPABASE_URL=sua_url_supabase
SUPABASE_KEY=sua_chave_anonima
SUPABASE_SERVICE_KEY=sua_chave_service_role
WEBHOOK_URL=url_do_webhook
WEBHOOK_AUTH_TOKEN=token_do_webhook
```

### Desenvolvimento Local

#### Frontend

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

O frontend estará disponível em `http://localhost:5173`

#### Backend

```bash
# Entrar na pasta do backend
cd backend

# Criar ambiente virtual (opcional)
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac

# Instalar dependências
pip install -r requirements.txt

# Iniciar servidor
uvicorn main:app --reload --port 8000
```

O backend estará disponível em `http://localhost:8000`

### Produção com Docker

```bash
# Build e execução
docker-compose up -d --build

# Ver logs
docker-compose logs -f

# Parar
docker-compose down
```

A aplicação estará disponível na porta `8091`.

## 📁 Estrutura do Projeto

```
PromoShare/
├── components/           # Componentes React
│   ├── AdminPage.tsx     # Painel administrativo
│   ├── AutomationPage.tsx# Regras de automação
│   ├── CategoriesPage.tsx# Gerenciamento de categorias
│   ├── Dashboard.tsx     # Dashboard principal
│   ├── GroupsPage.tsx    # Gerenciamento de grupos
│   ├── Login.tsx         # Página de login
│   ├── PromotionsPage.tsx# Gerenciamento de promoções
│   └── ui/               # Componentes de UI reutilizáveis
├── services/
│   ├── supabase.ts       # Cliente e API do Supabase
│   └── geminiService.ts  # Integração com Gemini AI
├── backend/
│   ├── main.py           # API FastAPI
│   ├── requirements.txt  # Dependências Python
│   └── Dockerfile        # Container do backend
├── App.tsx               # Componente principal
├── types.ts              # Tipagens TypeScript
├── docker-compose.yml    # Orquestração de containers
├── Dockerfile            # Container do frontend
└── nginx.conf            # Configuração do Nginx
```

## 🔐 Autenticação

O sistema utiliza **Supabase Auth** para autenticação. Existem dois níveis de acesso:

- **ADMIN** - Acesso total ao sistema
- **USER** - Acesso limitado às suas próprias promoções e grupos

## 📡 API Endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/health` | Health check |
| POST | `/api/users` | Criar novo usuário |
| GET | `/api/products` | Buscar produtos externos |
| POST | `/api/send-promotion` | Enviar promoção para grupos |

## 📝 Scripts Disponíveis

```bash
npm run dev      # Inicia servidor de desenvolvimento
npm run build    # Gera build de produção
npm run preview  # Preview da build de produção
```

## 🤝 Contribuindo

1. Faça um fork do projeto
2. Crie sua branch (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto é privado e de uso exclusivo.
