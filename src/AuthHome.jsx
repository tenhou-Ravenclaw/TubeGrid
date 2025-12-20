import React from 'react';
import './AuthHome.css';
import iconImg from "./assets/icon.png";
import heartImg from "./assets/heart.png";

const AuthHome = ({ onNavigate }) => {
  return (
    <div className="auth-container">
      {/* 左側：ブランディングエリア */}
      <div className="auth-left">
        <h1 className="app-title">OshiTracker</h1>
        <p className="app-subtitle">
          すべての推しを同時に
          <br />
          推せるwebアプリ
        </p>
      </div>

      {/* 右側：認証カード */}
      <div className="auth-right">
        <div className="auth-card">
          {/* アイコン */}
          <div className="auth-icon">
            <div className="icon-wrapper">
              {/* メインアイコン画像 */}
              <img 
                src={iconImg} 
                alt="OshiTracker Icon" 
                className="main-icon-img"
              />
              {/* 浮遊するハート画像 */}
              <img 
                src={heartImg} 
                alt="heart" 
                className="floating-heart-img"
              />
            </div>
          </div>

          {/* ボタン群 */}
          <div className="auth-buttons">
            <button 
              className="auth-btn login-btn"
              onClick={() => onNavigate('login')}
            >
              ログイン
            </button>
            <button 
              className="auth-btn signup-btn"
              onClick={() => onNavigate('signup')}
            >
              新規登録
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthHome;