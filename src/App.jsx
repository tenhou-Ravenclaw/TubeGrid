
import React, { useState } from 'react';
import AuthHome from './AuthHome.jsx';
import Login from './Login.jsx';
import Register from './Register.jsx';
import GoogleSignIn from './GoogleSignIn.jsx';
import Room from './room.jsx';
import './App.css';

const API_BASE_URL = 'http://localhost:8080'

function App() {

  const [currentScreen, setCurrentScreen] = useState('room')
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
    return <Room onLogout={() => setCurrentScreen('auth')} />;
  }

  // デフォルトは認証画面
  return <AuthHome onNavigate={handleNavigation} />;

}

export default App;