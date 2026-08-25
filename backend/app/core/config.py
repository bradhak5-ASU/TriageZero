from pydantic import BaseModel


class Settings(BaseModel):
    app_name: str = "TriageZero API"
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/triagezero"


settings = Settings()
