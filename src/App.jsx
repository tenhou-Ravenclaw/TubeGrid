import React, { useState } from 'react';
import AuthHome from './AuthHome.jsx';
import Login from './Login.jsx';
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
    // TODO: Register.jsx作成後にここを更新
    return (
      <div style={{ 
        width: '100vw', 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #E91E63 0%, #EC407A 100%)',
        color: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2>新規登録画面（Register.jsx未実装）</h2>
          <button 
            onClick={handleLoginSuccess}
            style={{ 
              margin: '10px',
              padding: '10px 20px',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            仮登録してRoomへ
          </button>
          <button 
            onClick={() => setCurrentScreen('auth')}
            style={{ 
              margin: '10px',
              padding: '10px 20px',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            戻る
          </button>
        </div>
      </div>
    );
  }

  // Room画面
  return <Room />;
}

export default App;