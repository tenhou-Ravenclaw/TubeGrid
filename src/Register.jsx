import React, { useState } from 'react';
import './Register.css';
import iconImg from "./assets/icon.png";
import heartImg from "./assets/heart.png";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const Register = ({ onNavigate, onRegisterSuccess }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!agreedToTerms) {
      setError('利用規約に同意してください');
      return;
    }

    if (password !== confirmPassword) {
      setError('パスワードが一致しません');
      return;
    }

    if (password.length < 8) {
      setError('パスワードは8文字以上である必要があります');
      return;
    }

    setLoading(true);

    const requestData = { name, email, password };
    console.log('Register request data:', requestData);

    try {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();
      console.log('Register response:', response.status, data);

      if (response.ok) {
        // 登録成功後、自動ログイン
        const loginResponse = await fetch(`${API_BASE_URL}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        const loginData = await loginResponse.json();
        if (loginResponse.ok) {
          onRegisterSuccess(loginData.token, loginData.user);
        } else {
          // 登録は成功したがログインに失敗した場合
          setError('登録に成功しましたが、ログインに失敗しました。ログインページからログインしてください。');
          setTimeout(() => {
            onNavigate('login');
          }, 2000);
        }
      } else {
        console.error('Register error response:', data);
        setError(data.error || '登録に失敗しました');
      }
    } catch (err) {
      console.error('登録エラー:', err);
      setError('ネットワークエラーが発生しました');
    } finally {
      setLoading(false);
    }
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
            {/* 名前 */}
            <div className="form-group">
              <label className="form-label">名前</label>
              <input
                type="text"
                className="form-input"
                placeholder="山田太郎"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

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
                <span className="password-hint">8文字以上</span>
              </label>
              <input
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>

            {/* パスワード確認 */}
            <div className="form-group">
              <label className="form-label">パスワード（確認）</label>
              <input
                type="password"
                className="form-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
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

            {/* 新規登録ボタン */}
            <button
              type="submit"
              className={`register-submit-btn ${!agreedToTerms ? 'disabled' : ''}`}
              disabled={!agreedToTerms || loading}
            >
              {loading ? '登録中...' : '新規登録'}
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