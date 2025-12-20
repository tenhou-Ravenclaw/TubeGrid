import React, { useState } from 'react';
import './Login.css';
import iconImg from "./assets/icon.png";
import heartImg from "./assets/heart.png";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const Login = ({ onNavigate, onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // ログイン成功
        onLoginSuccess(data.token, data.user);
      } else {
        setError(data.error || 'ログインに失敗しました');
      }
    } catch (err) {
      console.error('ログインエラー:', err);
      setError('ネットワークエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* 左側：ブランディングエリア */}
      <div className="login-left">
        <h1 className="app-title">OshiTracker</h1>
        <p className="app-subtitle">
          すべての推しを同時に
          <br />
          推せるwebアプリ
        </p>
      </div>

      {/* 右側：ログインカード */}
      <div className="login-right">
        <div className="login-card">
          {/* アイコン */}
          <div className="login-icon">
            <div className="icon-wrapper">
              <img 
                src={iconImg} 
                alt="OshiTracker Icon" 
                className="main-icon-img"
              />
              <img 
                src={heartImg}
                alt="heart" 
                className="floating-heart-img"
              />
            </div>
          </div>

          {/* ログインフォーム */}
          <form className="login-form" onSubmit={handleSubmit}>
            {/* メールアドレス */}
            <div className="form-group">
              <label className="form-label">メールアドレス</label>
              <input
                type="email"
                className="form-input"
                placeholder="sample@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* パスワード */}
            <div className="form-group">
              <label className="form-label">
                パスワード
                <span className="password-hint">半角英数と記号を含む6文字以上</span>
              </label>
              <input
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <button 
                type="button" 
                className="forgot-password-link"
                onClick={() => console.log('パスワードを忘れた方はこちら')}
              >
                パスワードをお忘れの方はこちら
              </button>
            </div>

            {/* エラーメッセージ */}
            {error && (
              <div className="error-message" style={{ 
                color: '#ff4444', 
                fontSize: '14px', 
                marginBottom: '10px',
                textAlign: 'center'
              }}>
                {error}
              </div>
            )}

            {/* ログインボタン */}
            <button 
              type="submit" 
              className="login-submit-btn"
              disabled={loading}
            >
              {loading ? 'ログイン中...' : 'ログイン'}
            </button>

            {/* 新規登録へのリンク */}
            <button 
              type="button" 
              className="signup-link"
              onClick={() => onNavigate('signup')}
            >
              アカウントをお持ちでない方はこちら
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;