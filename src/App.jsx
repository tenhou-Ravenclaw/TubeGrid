import React from 'react';
import Room from './room.jsx'; // Room.jsx を読み込む
import './App.css';

function App() {
  return (
    <div className="app-container">
      {/* 現在は1画面完結なのでRoomのみ。
         将来的にログイン画面などを作る場合はここで switch 文などで切り替えます
      */}
      <Room />
    </div>
  );
}

export default App;