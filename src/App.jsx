
import React, { useState } from 'react';
import AuthHome from './AuthHome.jsx';
import Login from './Login.jsx';
import Register from './Register.jsx';
import GoogleSignIn from './GoogleSignIn.jsx';
import Room from './room.jsx';
import './App.css';

const API_BASE_URL = 'http://localhost:8080'

function App() {
  // 認証状態管理
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem('authToken');
  });
  const [currentUser, setCurrentUser] = useState(() => {
    const storedUser = localStorage.getItem('currentUser');
    // 無効な値（null、undefined、空文字列、"undefined"、"null"）をチェック
    if (!storedUser || storedUser === 'undefined' || storedUser === 'null' || storedUser.trim() === '') {
      // 無効な値が保存されている場合は削除
      if (storedUser === 'undefined' || storedUser === 'null') {
        localStorage.removeItem('currentUser');
      }
      return null;
    }
    try {
      return JSON.parse(storedUser);
    } catch (error) {
      // パースエラーが発生した場合も無効なデータを削除
      localStorage.removeItem('currentUser');
      return null;
    }
  });
  const [currentScreen, setCurrentScreen] = useState(() => {
    return localStorage.getItem('authToken') ? 'room' : 'auth';
  })


  // 画面遷移ハンドラ
  const handleNavigation = (screen) => {
    setCurrentScreen(screen);
  };

  // ログイン成功
  const handleLoginSuccess = (token, user) => {
    localStorage.setItem('authToken', token);
    localStorage.setItem('currentUser', JSON.stringify(user));
    localStorage.setItem('tubeGrid_userId', user.ID?.toString() || user.id?.toString());
    setIsAuthenticated(true);
    setCurrentUser(user);
    setCurrentScreen('room');
  };

  // 登録成功
  const handleRegisterSuccess = (token, user) => {
    localStorage.setItem('authToken', token);
    localStorage.setItem('currentUser', JSON.stringify(user));
    localStorage.setItem('tubeGrid_userId', user.ID?.toString() || user.id?.toString());
    setIsAuthenticated(true);
    setCurrentUser(user);
    setCurrentScreen('room');
  };

  // ログアウト
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('tubeGrid_userId');
    setIsAuthenticated(false);
    setCurrentUser(null);
    setCurrentScreen('auth');
  };

  // 画面の出し分け
  if (currentScreen === 'auth') {
    return <AuthHome onNavigate={handleNavigation} />;
  }

  if (currentScreen === 'login') {
    return (
      <Login
        onNavigate={handleNavigation}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  if (currentScreen === 'signup') {
    return (
      <Register
        onNavigate={handleNavigation}
        onRegisterSuccess={handleRegisterSuccess}
      />
    );
  }

  if (currentScreen === 'google-signin') {
    return (
      <GoogleSignIn
        onNavigate={handleNavigation}
        onSignInSuccess={handleLoginSuccess}
      />
    );
  }

  // Room画面
  if (currentScreen === 'room') {
    if (!isAuthenticated) {
      // 未認証の場合は認証画面にリダイレクト
      setCurrentScreen('auth');
      return <AuthHome onNavigate={handleNavigation} />;
    }
    // ローカルストレージからユーザーIDを取得
    const storedUserId = localStorage.getItem('tubeGrid_userId');
    const userId = storedUserId ? parseInt(storedUserId, 10) : (currentUser?.ID || currentUser?.id || null);
    return <Room onLogout={handleLogout} userId={userId} />;
  }

  // デフォルトは認証画面
  return <AuthHome onNavigate={handleNavigation} />;

}

export default App;