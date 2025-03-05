from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

class LoginData(BaseModel):
    username: str
    password: str

