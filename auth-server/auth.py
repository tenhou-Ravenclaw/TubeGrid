import os
from pathlib import Path
import httpx
from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.responses import RedirectResponse
from google.oauth2 import id_token
from google.auth.transport import requests
from dotenv import load_dotenv

# DB連携用
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

# 1つ上の階層にある .env を読み込む
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

router = APIRouter(prefix="/auth", tags=["authentication"])

# --- データベース設定 (Ginのuser.dbを参照) ---
# auth-serverから見て ../backend/user.db を指すように設定
DATABASE_URL = "sqlite:///../backend/user.db"
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, unique=True, index=True)

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Google OAuth2.0の設定
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI")
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"

@router.get("/login")
async def login():
    # 取得した値がNoneでないかデバッグ確認
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail=".envからGOOGLE_CLIENT_IDを読み込めませんでした")
    
    google_auth_url = (
        f"{GOOGLE_AUTH_URL}?client_id={GOOGLE_CLIENT_ID}"
        f"&redirect_uri={GOOGLE_REDIRECT_URI}"
        f"&response_type=code&scope=openid%20email%20profile"
        f"&access_type=offline&prompt=consent"
    )
    return RedirectResponse(google_auth_url)

@router.get("/callback")
async def callback(code: str, request: Request, db: Session = Depends(get_db)):
    data = {
        "code": code,
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "grant_type": "authorization_code",
    }
    async with httpx.AsyncClient() as client:
        response = await client.post(GOOGLE_TOKEN_URL, data=data)
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail=f"Googleトークン取得エラー: {response.text}")
        token_response = response.json()
    
    id_token_value = token_response.get("id_token")
    
    try:
        id_info = id_token.verify_oauth2_token(id_token_value, requests.Request(), GOOGLE_CLIENT_ID)
        
        email = id_info.get("email")
        name = id_info.get("name")

        # Gin側のDBにユーザーが存在するかチェックし、なければ作成
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(name=name, email=email)
            db.add(user)
            db.commit()
            db.refresh(user)

        request.session["user_id"] = user.id
        request.session["user_name"] = user.name
        
        # 成功後のリダイレクト先（Viteのポート等に合わせて調整）
        return RedirectResponse(url="http://localhost:5173/")
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"認証エラー: {str(e)}")