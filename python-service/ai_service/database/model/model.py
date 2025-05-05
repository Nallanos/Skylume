from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class Account(BaseModel):
    id: str
    job_id: str
    did: str
    user_id: str
    is_rate_limited: bool
    app_password: str
    followers_cursor: Optional[str] = None
    session: Optional[str] = None
    number_of_message_sent: int = 0
    number_of_message_received: int = 0
    seen_notification_at: datetime
    handle: str
    follower_cursor: Optional[str] = None
    numbers_of_followers_analyzed: int = 0

    @property
    def at_session(self) -> Optional[dict]:
        if self.session:
            return self.session
        return None
    
class Follower(BaseModel):
    handle: str
    interest: List[str]
    account_handle: str
    user: Optional['Account'] = None  # Relation avec le modèle Account