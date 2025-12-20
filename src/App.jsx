import React, { useState } from 'react';
import AuthHome from './AuthHome.jsx';
import Login from './Login.jsx';
import Register from './Register.jsx';
import Room from './room.jsx';
import './App.css';

function App() {
  // 画面遷移の状態管理
  const [currentScreen, setCurrentScreen] = useState('auth'); // 'auth', 'login', 'signup', 'room'

  // 画面遷移ハンドラ
  const handleNavigation = (screen) => {
    setCurrentScreen(screen);
  };

  // ログイン成功
  const handleLoginSuccess = () => {
    setCurrentScreen('room');
  };

  // 登録成功
  const handleRegisterSuccess = () => {
    setCurrentScreen('room');
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

  // Room画面
  return (
    <Room 
      onLogout={() => setCurrentScreen('auth')} 
    />
  );
}

export default App;