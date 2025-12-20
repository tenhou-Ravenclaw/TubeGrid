
import React, { useState } from 'react';
import AuthHome from './AuthHome.jsx';
import Login from './Login.jsx';
import Register from './Register.jsx';
import Room from './room.jsx';
import './App.css';

const API_BASE_URL = 'http://localhost:8080'

function App() {

  const [users, setUsers] = useState([])
  const [talents, setTalents] = useState([])
  const [groups, setGroups] = useState([])
  const [streamStatus, setStreamStatus] = useState(null)
  const [liveStreams, setLiveStreams] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // ユーザー登録
  const handleRegisterUser = async () => {
    setLoading(true)
    setMessage('')
    try {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `ユーザー${Date.now()}`,
          email: `user${Date.now()}@example.com`,
        }),
      })
      const data = await response.json()
      if (response.ok) {
        setMessage(`ユーザー登録成功: ${data.name} (ID: ${data.ID})`)
        fetchUsers()
      } else {
        setMessage(`エラー: ${data.error}`)
      }
    } catch (error) {
      setMessage(`エラー: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // ユーザー一覧取得
  const fetchUsers = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/users`)
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
        setMessage('ユーザー一覧を取得しました')
      } else {
        const data = await response.json()
        setMessage(`エラー: ${data.error}`)
      }
    } catch (error) {
      setMessage(`エラー: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // 配信者登録
  const handleRegisterTalent = async () => {
    setLoading(true)
    setMessage('')
    try {
      const channelId = prompt('チャンネルIDを入力してください（例: UCxxxxxxxxxxxxx）')
      if (!channelId) return

      const response = await fetch(`${API_BASE_URL}/talents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `配信者${Date.now()}`,
          channel_id: channelId,
          platform: 'youtube',
        }),
      })
      const data = await response.json()
      if (response.ok) {
        setMessage(`配信者登録成功: ${data.name} (ID: ${data.ID})`)
        fetchTalents()
      } else {
        setMessage(`エラー: ${data.error}`)
      }
    } catch (error) {
      setMessage(`エラー: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // 配信者一覧取得
  const fetchTalents = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/talents`)
      if (response.ok) {
        const data = await response.json()
        setTalents(data)
      }
    } catch (error) {
      setMessage(`エラー: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // グループ作成
  const handleCreateGroup = async () => {
    setLoading(true)
    setMessage('')
    try {
      const groupName = prompt('グループ名を入力してください')
      if (!groupName) return

      const response = await fetch(`${API_BASE_URL}/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: groupName,
        }),
      })
      const data = await response.json()
      if (response.ok) {
        setMessage(`グループ作成成功: ${data.name} (ID: ${data.ID})`)
        fetchGroups()
      } else {
        setMessage(`エラー: ${data.error}`)
      }
    } catch (error) {
      setMessage(`エラー: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // グループ一覧取得
  const fetchGroups = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/groups`)
      if (response.ok) {
        const data = await response.json()
        setGroups(data)
      }
    } catch (error) {
      setMessage(`エラー: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // 配信状態取得
  const handleGetStreamStatus = async (talentId) => {
    setLoading(true)
    setMessage('')
    try {
      const response = await fetch(`${API_BASE_URL}/talents/${talentId}/stream-status`)
      if (response.ok) {
        const data = await response.json()
        setStreamStatus(data)
        setMessage(data.is_live ? '配信中です！' : '現在配信していません')
      } else {
        const data = await response.json()
        setMessage(`エラー: ${data.error}`)
      }
    } catch (error) {
      setMessage(`エラー: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // 箱推し一括展開（LIVE配信取得）
  const handleGetLiveStreams = async (groupId) => {
    setLoading(true)
    setMessage('')
    try {
      const response = await fetch(`${API_BASE_URL}/groups/${groupId}/live-streams`)
      if (response.ok) {
        const data = await response.json()
        setLiveStreams(data.live_streams || [])
        setMessage(`${data.count}件のLIVE配信が見つかりました`)
      } else {
        const data = await response.json()
        setMessage(`エラー: ${data.error}`)
      }
    } catch (error) {
      setMessage(`エラー: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }


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
    <div className="app">
      <h1>📡 推し活コマンドセンター - API動作確認</h1>

      {message && (
        <div className={`message ${message.includes('エラー') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      {loading && <div className="loading">読み込み中...</div>}

      <div className="sections">
        {/* ユーザー管理 */}
        <section className="section">
          <h2>👤 ユーザー管理</h2>
          <div className="button-group">
            <button onClick={handleRegisterUser}>ユーザー登録</button>
            <button onClick={fetchUsers}>ユーザー一覧取得</button>
          </div>
          <p className="info-text">※ ユーザー登録後、登録されたユーザーIDをメモしておいてください</p>
          {users.length > 0 && (
            <div className="list">
              {users.map((user) => (
                <div key={user.ID} className="item">
                  {user.name} ({user.email}) - ID: {user.ID}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 配信者管理 */}
        <section className="section">
          <h2>🎬 配信者管理</h2>
          <div className="button-group">
            <button onClick={handleRegisterTalent}>配信者登録</button>
            <button onClick={fetchTalents}>配信者一覧取得</button>
          </div>
          {talents.length > 0 && (
            <div className="list">
              {talents.map((talent) => (
                <div key={talent.ID} className="item">
                  <div>
                    <strong>{talent.name}</strong> ({talent.platform}) - ID: {talent.ID}
                  </div>
                  <div className="sub-text">ChannelID: {talent.channel_id}</div>
                  <button
                    className="small-button"
                    onClick={() => handleGetStreamStatus(talent.ID)}
                  >
                    配信状態取得
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* グループ管理 */}
        <section className="section">
          <h2>📦 グループ管理</h2>
          <div className="button-group">
            <button onClick={handleCreateGroup}>グループ作成</button>
            <button onClick={fetchGroups}>グループ一覧取得</button>
          </div>
          {groups.length > 0 && (
            <div className="list">
              {groups.map((group) => (
                <div key={group.ID} className="item">
                  <div>
                    <strong>{group.name}</strong> - ID: {group.ID}
                  </div>
                  <button
                    className="small-button"
                    onClick={() => handleGetLiveStreams(group.ID)}
                  >
                    LIVE配信一括取得
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 配信状態表示 */}
        {streamStatus && (
          <section className="section">
            <h2>📺 配信状態</h2>
            <div className="stream-status">
              <div className={streamStatus.is_live ? 'live' : 'offline'}>
                {streamStatus.is_live ? '🔴 LIVE' : '⚫ OFFLINE'}
              </div>
              {streamStatus.is_live && (
                <>
                  <div><strong>タイトル:</strong> {streamStatus.title}</div>
                  <div><strong>視聴者数:</strong> {streamStatus.viewer_count.toLocaleString()}人</div>
                  <div><strong>URL:</strong> <a href={streamStatus.stream_url} target="_blank" rel="noopener noreferrer">{streamStatus.stream_url}</a></div>
                  {streamStatus.thumbnail_url && (
                    <img src={streamStatus.thumbnail_url} alt="Thumbnail" className="thumbnail" />
                  )}
                </>
              )}
            </div>
          </section>
        )}

        {/* LIVE配信一覧 */}
        {liveStreams.length > 0 && (
          <section className="section">
            <h2>🔴 LIVE配信一覧</h2>
            <div className="list">
              {liveStreams.map((stream, index) => (
                <div key={index} className="item live-item">
                  <div className="live-badge">🔴 LIVE</div>
                  <div><strong>{stream.talent_name}</strong></div>
                  <div>{stream.title}</div>
                  <div>視聴者数: {stream.viewer_count.toLocaleString()}人</div>
                  <a href={stream.stream_url} target="_blank" rel="noopener noreferrer">
                    視聴する
                  </a>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )

}

export default App;