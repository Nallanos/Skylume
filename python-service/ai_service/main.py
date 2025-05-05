from fastapi import FastAPI
from ai_service.api import endpoints

app = FastAPI()

app.include_router(endpoints.router)