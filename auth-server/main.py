from fastapi import FastAPI
from starlette.middleware.sessions import SessionMiddleware
from fastapi.middleware.cors import CORSMiddleware
from auth import router as auth_router

app = FastAPI()

# セッションの設定（適当な文字列に変更してください）
app.add_middleware(SessionMiddleware, secret_key="your-super-secret-key")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)