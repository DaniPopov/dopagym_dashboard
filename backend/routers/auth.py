from fastapi import APIRouter, Depends, HTTPException, Response, Form, Request
from fastapi.security import OAuth2PasswordBearer
from starlette.status import HTTP_401_UNAUTHORIZED
import secrets
import time
from typing import Dict

router = APIRouter(prefix="/api/v1/auth", tags=["authentication"])

# Simple in-memory session store (replace with database in production)
sessions: Dict[str, Dict] = {}

# This should be a dictionary with usernames as keys
admin_username = "123"
admin_password = "123"

# Session expiration time (in seconds)
SESSION_EXPIRY = 3600 * 24  # 24 hours

# Create a token
def create_session_token(username: str) -> str:
    token = secrets.token_hex(16)
    sessions[token] = {
        "username": username,
        "created_at": time.time(),
        "expires_at": time.time() + SESSION_EXPIRY
    }
    return token

# Verify token
def verify_session_token(token: str) -> Dict:
    session = sessions.get(token)
    if not session:
        return None
    
    # Check if session has expired
    if time.time() > session["expires_at"]:
        del sessions[token]
        return None
        
    return session

# Login endpoint
@router.post("/login")
async def login(
    response: Response,
    username: str = Form(...),  # Use ... to make it required
    password: str = Form(...)
):
    # Validate credentials against our user database
    if username != admin_username or password != admin_password:
        raise HTTPException(
            status_code=HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    
    # Create session token
    token = create_session_token(username)
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        max_age=SESSION_EXPIRY,
        path="/"
    )
    
    return {"message": "Login successful", "token": token}

# Get current user
@router.get("/me")
async def get_current_user(request: Request):
    # Get token from cookie instead of requiring it as a parameter
    token = request.cookies.get("session_token")
    
    if not token:
        raise HTTPException(
            status_code=HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    session = verify_session_token(token)
    if not session:
        raise HTTPException(
            status_code=HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid"
        )
    
    username = session["username"]
    
    # Since we're using hardcoded credentials, just return the username
    return {
        "username": username,
        "full_name": "Admin User"  # You can hardcode this or remove it if not needed
    }

