import logging
from fastapi import FastAPI, Depends, Request, Cookie, HTTPException
from fastapi.responses import FileResponse, RedirectResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from starlette.status import HTTP_401_UNAUTHORIZED, HTTP_303_SEE_OTHER
from starlette.middleware.base import BaseHTTPMiddleware

# Import routers
from routers import members, scan, auth
from routers.auth import verify_session_token
from mongo_db import MongoDB

app = FastAPI()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Authentication middleware
class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        logger.info(f"Request path: {request.url.path}")
        
        # Paths that don't require authentication
        public_paths = ["/login", "/api/v1/auth/login", "/static/", "/favicon.ico"]        
        
        # Check if the path is public
        for path in public_paths:
            if request.url.path.startswith(path):
                return await call_next(request)
        
        # Get session token from cookie
        session_token = request.cookies.get("session_token")
        
        # If no token or invalid token, redirect to login
        if not session_token or not verify_session_token(session_token):
            logger.warning(f"Authentication failed for path: {request.url.path}")
            if request.url.path.startswith("/api/"):
                return JSONResponse(
                    status_code=HTTP_401_UNAUTHORIZED,
                    content={"detail": "Not authenticated"}
                )
            return RedirectResponse(url="/login", status_code=HTTP_303_SEE_OTHER)
        
        # Token is valid, proceed
        return await call_next(request)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://dopadash.com", "https://www.dopadash.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add auth middleware
app.add_middleware(AuthMiddleware)

# Mount the static files directory
app.mount("/static", StaticFiles(directory="/app/frontend"), name="static")

# Include routers
app.include_router(members.router)
app.include_router(scan.router)
app.include_router(auth.router)

# Login page - no auth required
@app.get("/login")
async def login_page():
    return FileResponse("/app/frontend/login/index.html")

# Root route - redirect to login
@app.get("/")
async def root():
    return RedirectResponse(url="/login")

# Protected routes - require authentication
@app.get("/main_page")
async def main_page():
    return FileResponse("/app/frontend/main_page/index.html")

@app.get("/enter_member")
async def enter_member():
    return FileResponse("/app/frontend/enter_member/index.html")

@app.get("/all_members")
async def all_members():
    return FileResponse("/app/frontend/all_members/index.html")

@app.get("/scan_qr")
async def scan_qr():
    return FileResponse("/app/frontend/scan_qr/index.html")

@app.get("/member_profile")
async def member_profile():
    return FileResponse("/app/frontend/member_profile/index.html")
