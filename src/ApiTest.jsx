import { useState } from 'react'
import './App.css'

const API_BASE_URL = 'http://localhost:8080'

function ApiTest() {
  const [users, setUsers] = useState([])
  const [talents, setTalents] = useState([])
  const [groups, setGroups] = useState([])
  const [streamStatus, setStreamStatus] = useState(null)
  const [liveStreams, setLiveStreams] = useState([])
  const [videoInfo, setVideoInfo] = useState(null)
  const [roomLayouts, setRoomLayouts] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [videoIdInput, setVideoIdInput] = useState('')

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
        setMessage('配信者一覧を取得しました')
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
        setMessage('グループ一覧を取得しました')
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

  // 動画情報取得
  const handleGetVideoInfo = async () => {
    if (!videoIdInput) {
      setMessage('動画IDを入力してください')
      return
    }
    setLoading(true)
    setMessage('')
    try {
      const response = await fetch(`${API_BASE_URL}/videos/${videoIdInput}/info`)
      if (response.ok) {
        const data = await response.json()
        setVideoInfo(data)
        setMessage('動画情報を取得しました')
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

  // ルームレイアウト取得
  const fetchRoomLayout = async (userId) => {
    if (!userId) {
      setMessage('ユーザーIDを選択してください')
      return
    }
    setLoading(true)
    setMessage('')
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}/room-layout`)
      if (response.ok) {
        const data = await response.json()
        setRoomLayouts(data)
        setMessage('ルームレイアウトを取得しました')
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

  // ルームレイアウト保存
  const handleSaveRoomLayout = async () => {
    if (!selectedUserId) {
      setMessage('ユーザーIDを選択してください')
      return
    }
    setLoading(true)
    setMessage('')
    try {
      // サンプルレイアウトデータ
      const sampleLayouts = [
        {
          monitor_id: 'main-1',
          video_id: 'dQw4w9WgXcQ',
          x: 100,
          y: 100,
          rotate: 0,
          width: 800,
          height: 450,
          z_index: 100,
          is_main: true,
          is_oshi: false,
          label: 'メインモニター',
          monitor_type: 'main',
        },
        {
          monitor_id: 'small-1',
          video_id: 'jNQXAC9IVRw',
          x: 950,
          y: 100,
          rotate: 0,
          width: 300,
          height: 200,
          z_index: 80,
          is_main: false,
          is_oshi: true,
          label: 'サブモニター1',
          monitor_type: 'small',
        },
      ]

      const response = await fetch(`${API_BASE_URL}/users/${selectedUserId}/room-layout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sampleLayouts),
      })
      if (response.ok) {
        const data = await response.json()
        setRoomLayouts(data.layouts)
        setMessage('ルームレイアウトを保存しました')
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

  // ルームレイアウト更新
  const handleUpdateRoomLayout = async (monitorId) => {
    if (!selectedUserId) {
      setMessage('ユーザーIDを選択してください')
      return
    }
    setLoading(true)
    setMessage('')
    try {
      const layout = roomLayouts.find((l) => l.monitor_id === monitorId)
      if (!layout) {
        setMessage('レイアウトが見つかりません')
        return
      }

      // サンプル更新データ
      const updateData = {
        ...layout,
        x: layout.x + 10,
        y: layout.y + 10,
      }

      const response = await fetch(`${API_BASE_URL}/users/${selectedUserId}/room-layout/${monitorId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })
      if (response.ok) {
        const data = await response.json()
        setRoomLayouts(roomLayouts.map((l) => (l.monitor_id === monitorId ? data.layout : l)))
        setMessage('ルームレイアウトを更新しました')
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

  // ルームレイアウト削除
  const handleDeleteRoomLayout = async (monitorId) => {
    if (!selectedUserId) {
      setMessage('ユーザーIDを選択してください')
      return
    }
    setLoading(true)
    setMessage('')
    try {
      const response = await fetch(`${API_BASE_URL}/users/${selectedUserId}/room-layout/${monitorId}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        setRoomLayouts(roomLayouts.filter((l) => l.monitor_id !== monitorId))
        setMessage('ルームレイアウトを削除しました')
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

  return (
    <div className="app">
      <h1>📡 APIテストページ</h1>

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
          {users.length > 0 && (
            <div className="list">
              {users.map((user) => (
                <div key={user.ID} className="item">
                  {user.name} ({user.email}) - ID: {user.ID}
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: '10px' }}>
            <label>
              ユーザーID選択:
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                style={{ marginLeft: '10px', padding: '5px' }}
              >
                <option value="">選択してください</option>
                {users.map((user) => (
                  <option key={user.ID} value={user.ID}>
                    {user.name} (ID: {user.ID})
                  </option>
                ))}
              </select>
            </label>
          </div>
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

        {/* 動画情報取得 */}
        <section className="section">
          <h2>🎥 動画情報取得</h2>
          <div style={{ marginBottom: '10px' }}>
            <input
              type="text"
              value={videoIdInput}
              onChange={(e) => setVideoIdInput(e.target.value)}
              placeholder="YouTube動画IDを入力（例: dQw4w9WgXcQ）"
              style={{ padding: '5px', width: '300px', marginRight: '10px' }}
            />
            <button onClick={handleGetVideoInfo}>動画情報取得</button>
          </div>
          {videoInfo && (
            <div className="item">
              <div><strong>タイトル:</strong> {videoInfo.title}</div>
              <div><strong>チャンネル:</strong> {videoInfo.channel_name}</div>
              <div><strong>公開日:</strong> {videoInfo.published_at}</div>
              <div><strong>動画ID:</strong> {videoInfo.video_id}</div>
              {videoInfo.thumbnail_url && (
                <img src={videoInfo.thumbnail_url} alt="Thumbnail" className="thumbnail" style={{ marginTop: '10px' }} />
              )}
            </div>
          )}
        </section>

        {/* ルームレイアウト管理 */}
        <section className="section">
          <h2>🏠 ルームレイアウト管理</h2>
          <div className="button-group">
            <button onClick={() => fetchRoomLayout(selectedUserId)} disabled={!selectedUserId}>
              レイアウト取得
            </button>
            <button onClick={handleSaveRoomLayout} disabled={!selectedUserId}>
              レイアウト保存（サンプル）
            </button>
          </div>
          {roomLayouts.length > 0 && (
            <div className="list">
              {roomLayouts.map((layout) => (
                <div key={layout.monitor_id} className="item">
                  <div><strong>MonitorID:</strong> {layout.monitor_id}</div>
                  <div><strong>VideoID:</strong> {layout.video_id}</div>
                  <div><strong>位置:</strong> ({layout.x}, {layout.y})</div>
                  <div><strong>サイズ:</strong> {layout.width} x {layout.height}</div>
                  <div><strong>タイプ:</strong> {layout.monitor_type} {layout.is_main && '(メイン)'} {layout.is_oshi && '(推し)'}</div>
                  <div><strong>ラベル:</strong> {layout.label}</div>
                  <div style={{ marginTop: '10px' }}>
                    <button
                      className="small-button"
                      onClick={() => handleUpdateRoomLayout(layout.monitor_id)}
                    >
                      更新
                    </button>
                    <button
                      className="small-button"
                      onClick={() => handleDeleteRoomLayout(layout.monitor_id)}
                      style={{ marginLeft: '5px' }}
                    >
                      削除
                    </button>
                  </div>
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

export default ApiTest

