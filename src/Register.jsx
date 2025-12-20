import React, { useState } from 'react';
import './Register.css';
import iconImg from "./assets/icon.png";
import heartImg from "./assets/heart.png";

const Register = ({ onNavigate, onRegisterSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!agreedToTerms) return; // チェックされていない場合は送信しない
    
    // TODO: バックエンドとの連携処理
    console.log('Register:', { email, password });
    
    // 仮の登録成功処理
    onRegisterSuccess();
  };

  return (
    <div className="register-container">
      {/* 左側：ブランディングエリア */}
      <div className="register-left">
        <h1 className="app-title">OshiTracker</h1>
        <p className="app-subtitle">
          すべての推しを同時に
          <br />
          推せるwebアプリ
        </p>
      </div>

      {/* 右側：登録カード */}
      <div className="register-right">
        <div className="register-card">
          {/* アイコン */}
          <div className="register-icon">
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

          {/* 登録フォーム */}
          <form className="register-form" onSubmit={handleSubmit}>
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
            </div>

            {/* 利用規約同意チェックボックス */}
            <div className="checkbox-group">
              <label className="checkbox-container">
                <input
                  type="checkbox"
                  className="checkbox-input"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                />
                <span className="checkbox-visual"></span>
                <span className="checkbox-text">利用規約とプライバシーポリシーに同意します</span>
              </label>
            </div>

            {/* 新規登録ボタン */}
            <button 
              type="submit" 
              className={`register-submit-btn ${!agreedToTerms ? 'disabled' : ''}`}
              disabled={!agreedToTerms}
            >
              新規登録
            </button>

            {/* ログインへのリンク */}
            <button 
              type="button" 
              className="login-link"
              onClick={() => onNavigate('login')}
            >
              アカウントをお持ちの方はこちら
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;