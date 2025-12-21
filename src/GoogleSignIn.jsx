import React, { useState } from 'react';
import './GoogleSignIn.css';
import GoogleIconImg from "./assets/google-icon.png";

const GoogleSignIn = ({ onNavigate, onSignInSuccess }) => {
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = () => {
    setLoading(true);

    // TODO: Googleログイン処理をここに実装
    // 仮の処理として1秒後にログイン成功（ダミーユーザーデータ）
    setTimeout(() => {
      setLoading(false);
      // ダミーのトークンとユーザーデータを渡す（実際のGoogle認証実装時に置き換え）
      const dummyToken = `google_token_${Date.now()}`;
      const dummyUser = {
        ID: 1,
        id: 1,
        name: 'Google User',
        email: 'googleuser@example.com'
      };
      onSignInSuccess(dummyToken, dummyUser);
    }, 1000);
  };

  return (
    <div className="google-signin-container">
      <div className="google-signin-card">
        <div className="google-logo">
          <img
            src={GoogleIconImg}
            alt="Google"
            className="google-logo-img"
          />
        </div>

        <h2 className="signin-title">Googleでログイン</h2>
        <p className="signin-description">
          Googleアカウントを使用してOshiTrackerにログインします
        </p>

        <button
          className="google-signin-action-btn"
          onClick={handleGoogleSignIn}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="spinner"></span>
              <span>ログイン中...</span>
            </>
          ) : (
            <>
              <img
                src={GoogleIconImg}
                alt="Google"
                className="btn-google-icon"
              />
              <span>Googleアカウントでログイン</span>
            </>
          )}
        </button>

        <button
          className="back-btn"
          onClick={() => onNavigate('auth')}
        >
          戻る
        </button>
      </div>
    </div>
  );
};

export default GoogleSignIn;