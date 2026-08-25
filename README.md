# TriageZero

Scaffolded full-stack foundation for an autonomous regression test failure investigation platform.

## Stack
- Frontend: React + Vite
- Backend: FastAPI + SQLAlchemy + Pydantic
- Database: PostgreSQL
- Local orchestration: Docker Compose

## Security note
Never commit `.env` files or credentials. Use `.env.example` as the configuration template.

## Quick start (recommended)
1. Copy env template:
   ```bash
   cp .env.example .env
   ```
2. Start full stack:
   ```bash
   docker compose up --build
   ```

### Local URLs
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- FastAPI docs: http://localhost:8000/docs

## Optional manual development
### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd frontend
npm install
VITE_API_BASE_URL=http://localhost:8000 npm run dev
```

## Repository layout
- `frontend/` React application scaffold
- `backend/` FastAPI application scaffold
- `infra/postgres/` local PostgreSQL compose setup
- `docker-compose.yml` unified local stack
