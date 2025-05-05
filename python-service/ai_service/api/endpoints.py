from fastapi import APIRouter
from pydantic import BaseModel
from typing import List
from ai_service.services.tagger import generate_tags
from ai_service.database.database import Database
from atproto_client.models.app.bsky.actor.defs import ProfileView

router = APIRouter()
database =  Database()
# Modèle pour un cluster
class Cluster(BaseModel):
    account_handle: str
    followers: List[ProfileView]

@router.post("/tagAllAccountFollowers")
async def tag_clusters(request: Cluster):
    try:
        print("python called")
        await database.init()
        cluster_tags = await generate_tags(request.account_handle, request.followers, database)
        return cluster_tags
    except Exception as e:
        print(f"Error occurred: {str(e)}")
        return {"error": str(e)}