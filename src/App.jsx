import React, { useState } from 'react';
import Room from './room.jsx';
import AuthHome from './AuthHome.jsx'; // 玄関画面をインポート
import './App.css';

function App() {
  // 現在どの画面を表示するかを管理する状態
  // 'auth' : ログイン/新規登録の選択画面 (玄関)
  // 'room' : メインの配信部屋画面
  const [currentScreen, setCurrentScreen] = useState('auth');

  // 画面を切り替えるための関数
  // 将来的にはここで「ログイン成功」を受け取ってから切り替えるように拡張できます
  const handleLoginSuccess = () => {
    setCurrentScreen('room');
  };

  return (
    <div className="app-container">
      {/* 画面の状態によって表示するコンポーネントを切り替える */}
      {currentScreen === 'auth' ? (
        <AuthHome onEnter={handleLoginSuccess} />
      ) : (
        <Room />
      )}
    </div>
  );
}

export default App;