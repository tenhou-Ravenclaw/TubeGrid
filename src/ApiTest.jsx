import { useState, useEffect, useRef } from 'react'
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
    const [volumePresets, setVolumePresets] = useState([])
    const [sessions, setSessions] = useState([])
    const [selectedSession, setSelectedSession] = useState(null)
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [selectedUserId, setSelectedUserId] = useState('')
    const [videoIdInput, setVideoIdInput] = useState('')
    const [selectedGroupId, setSelectedGroupId] = useState('')
    const [playingVideos, setPlayingVideos] = useState([]) // {videoId, title, volume, isMain, streamId, playerId}
    const [testVideoId, setTestVideoId] = useState('')
    const playersRef = useRef({}) // {playerId: YT.Player}
    const [ytReady, setYtReady] = useState(false)

    // YouTube IFrame APIの読み込み確認
    useEffect(() => {
        if (window.YT && window.YT.Player) {
            setYtReady(true)
        } else {
            window.onYouTubeIframeAPIReady = () => {
                setYtReady(true)
            }
            // 既に読み込まれている場合
            if (window.YT && window.YT.Player) {
                setYtReady(true)
            }
        }
    }, [])

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
            if (!channelId) {
                setLoading(false)
                return
            }

            // まずチャンネル情報を取得
            setMessage('チャンネル情報を取得中...')
            const channelInfoResponse = await fetch(`${API_BASE_URL}/channels/${channelId}/info`)
            let channelName = `配信者${Date.now()}`

            if (channelInfoResponse.ok) {
                const channelInfo = await channelInfoResponse.json()
                channelName = channelInfo.channel_name
                setMessage(`チャンネル名を取得しました: ${channelName}`)
            } else {
                const errorData = await channelInfoResponse.json()
                setMessage(`警告: チャンネル情報の取得に失敗しました（${errorData.error}）。デフォルト名で登録します。`)
            }

            // 配信者を登録
            const response = await fetch(`${API_BASE_URL}/talents`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: channelName,
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

    // 音量プリセット一覧取得
    const fetchVolumePresets = async () => {
        if (!selectedUserId) {
            setMessage('ユーザーIDを選択してください')
            return
        }
        setLoading(true)
        setMessage('')
        try {
            const response = await fetch(`${API_BASE_URL}/users/${selectedUserId}/volume-presets`)
            if (response.ok) {
                const data = await response.json()
                setVolumePresets(data)
                setMessage('音量プリセット一覧を取得しました')
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

    // 音量プリセット保存
    const handleSaveVolumePreset = async () => {
        if (!selectedUserId) {
            setMessage('ユーザーIDを選択してください')
            return
        }
        const talentId = prompt('配信者IDを入力してください')
        if (!talentId) return
        const volume = prompt('音量を入力してください（0-100）')
        if (!volume) return

        setLoading(true)
        setMessage('')
        try {
            const response = await fetch(`${API_BASE_URL}/users/${selectedUserId}/volume-presets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    talent_id: parseInt(talentId),
                    volume: parseInt(volume),
                }),
            })
            if (response.ok) {
                const data = await response.json()
                setVolumePresets([...volumePresets, data])
                setMessage('音量プリセットを保存しました')
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

    // 音量プリセット保存（配信者IDと音量を指定）
    const handleSaveVolumePresetWithTalent = async (talentId, volume) => {
        if (!selectedUserId) {
            setMessage('ユーザーIDを選択してください')
            return
        }
        setLoading(true)
        setMessage('')
        try {
            const response = await fetch(`${API_BASE_URL}/users/${selectedUserId}/volume-presets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    talent_id: talentId,
                    volume: volume,
                }),
            })
            if (response.ok) {
                const data = await response.json()
                setVolumePresets([...volumePresets, data])
                setMessage('音量プリセットを保存しました')
                fetchVolumePresets()
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

    // 音量プリセット更新
    const handleUpdateVolumePreset = async (talentId) => {
        if (!selectedUserId) {
            setMessage('ユーザーIDを選択してください')
            return
        }
        const volume = prompt('新しい音量を入力してください（0-100）')
        if (!volume) return

        setLoading(true)
        setMessage('')
        try {
            const response = await fetch(`${API_BASE_URL}/users/${selectedUserId}/volume-presets/${talentId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    volume: parseInt(volume),
                }),
            })
            if (response.ok) {
                const data = await response.json()
                setVolumePresets(volumePresets.map((p) => (p.talent_id === talentId ? data : p)))
                setMessage('音量プリセットを更新しました')
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

    // 音量プリセット削除
    const handleDeleteVolumePreset = async (talentId) => {
        if (!selectedUserId) {
            setMessage('ユーザーIDを選択してください')
            return
        }
        setLoading(true)
        setMessage('')
        try {
            const response = await fetch(`${API_BASE_URL}/users/${selectedUserId}/volume-presets/${talentId}`, {
                method: 'DELETE',
            })
            if (response.ok) {
                setVolumePresets(volumePresets.filter((p) => p.talent_id !== talentId))
                setMessage('音量プリセットを削除しました')
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

    // セッション作成
    const handleCreateSession = async () => {
        if (!selectedUserId) {
            setMessage('ユーザーIDを選択してください')
            return
        }
        const sessionName = prompt('セッション名を入力してください（オプション）')
        const groupId = prompt('グループIDを入力してください（オプション、空欄でスキップ）')

        setLoading(true)
        setMessage('')
        try {
            const requestBody = {}
            if (sessionName) {
                requestBody.session_name = sessionName
            }
            if (groupId) {
                requestBody.group_id = parseInt(groupId)
            }

            const response = await fetch(`${API_BASE_URL}/users/${selectedUserId}/sessions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            })
            if (response.ok) {
                const data = await response.json()
                setSessions([...sessions, data])
                setMessage('セッションを作成しました（推し優先ルール適用済み）')
                fetchSessions()
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

    // セッション一覧取得
    const fetchSessions = async () => {
        if (!selectedUserId) {
            setMessage('ユーザーIDを選択してください')
            return
        }
        setLoading(true)
        setMessage('')
        try {
            const response = await fetch(`${API_BASE_URL}/users/${selectedUserId}/sessions`)
            if (response.ok) {
                const data = await response.json()
                setSessions(data)
                setMessage('セッション一覧を取得しました')
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

    // セッション詳細取得
    const handleGetSessionDetail = async (sessionId) => {
        if (!selectedUserId) {
            setMessage('ユーザーIDを選択してください')
            return
        }
        setLoading(true)
        setMessage('')
        try {
            const response = await fetch(`${API_BASE_URL}/users/${selectedUserId}/sessions/${sessionId}`)
            if (response.ok) {
                const data = await response.json()
                setSelectedSession(data)
                setMessage('セッション詳細を取得しました')
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

    // セッション更新（メイン入れ替え）
    const handleUpdateSessionMain = async (sessionId, streamId) => {
        if (!selectedUserId) {
            setMessage('ユーザーIDを選択してください')
            return
        }
        setLoading(true)
        setMessage('')
        try {
            const response = await fetch(`${API_BASE_URL}/users/${selectedUserId}/sessions/${sessionId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    main_stream_id: streamId,
                }),
            })
            if (response.ok) {
                const data = await response.json()
                setSessions(sessions.map((s) => (s.ID === sessionId ? data : s)))
                if (selectedSession && selectedSession.ID === sessionId) {
                    setSelectedSession(data)
                }
                setMessage('メイン枠を入れ替えました')
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

    // セッション更新（音量更新）
    const handleUpdateSessionVolume = async (sessionId, streamId) => {
        if (!selectedUserId) {
            setMessage('ユーザーIDを選択してください')
            return
        }
        const volume = prompt('新しい音量を入力してください（0-100）')
        if (!volume) return

        setLoading(true)
        setMessage('')
        try {
            const response = await fetch(`${API_BASE_URL}/users/${selectedUserId}/sessions/${sessionId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    update_volumes: [
                        {
                            stream_id: streamId,
                            volume: parseInt(volume),
                        },
                    ],
                }),
            })
            if (response.ok) {
                const data = await response.json()
                setSessions(sessions.map((s) => (s.ID === sessionId ? data : s)))
                if (selectedSession && selectedSession.ID === sessionId) {
                    setSelectedSession(data)
                }
                setMessage('音量を更新しました')
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

    // セッション削除
    const handleDeleteSession = async (sessionId) => {
        if (!selectedUserId) {
            setMessage('ユーザーIDを選択してください')
            return
        }
        if (!confirm('セッションを削除しますか？')) return

        setLoading(true)
        setMessage('')
        try {
            const response = await fetch(`${API_BASE_URL}/users/${selectedUserId}/sessions/${sessionId}`, {
                method: 'DELETE',
            })
            if (response.ok) {
                setSessions(sessions.filter((s) => s.ID !== sessionId))
                if (selectedSession && selectedSession.ID === sessionId) {
                    setSelectedSession(null)
                }
                setMessage('セッションを削除しました')
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
                    <div style={{ marginTop: '15px', padding: '15px', background: '#f9f9f9', borderRadius: '4px' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '10px' }}>推しを登録</h3>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <select
                                value=""
                                onChange={async (e) => {
                                    const talentId = e.target.value
                                    if (!talentId || !selectedUserId) return
                                    setLoading(true)
                                    try {
                                        const response = await fetch(`${API_BASE_URL}/users/${selectedUserId}/favorite/${talentId}`, {
                                            method: 'POST',
                                        })
                                        if (response.ok) {
                                            setMessage('推しを登録しました')
                                        } else {
                                            const data = await response.json()
                                            setMessage(`エラー: ${data.error}`)
                                        }
                                    } catch (error) {
                                        setMessage(`エラー: ${error.message}`)
                                    } finally {
                                        setLoading(false)
                                    }
                                    e.target.value = ''
                                }}
                                disabled={!selectedUserId || talents.length === 0}
                                style={{ padding: '5px', minWidth: '200px' }}
                            >
                                <option value="">配信者を選択して推し登録...</option>
                                {talents.map((talent) => (
                                    <option key={talent.ID} value={talent.ID}>
                                        {talent.name} (ID: {talent.ID})
                                    </option>
                                ))}
                            </select>
                            <button
                                onClick={async () => {
                                    if (!selectedUserId) return
                                    setLoading(true)
                                    try {
                                        const response = await fetch(`${API_BASE_URL}/users/${selectedUserId}/favorites`)
                                        if (response.ok) {
                                            const data = await response.json()
                                            setMessage(`推し一覧: ${data.length}人登録されています`)
                                        } else {
                                            const data = await response.json()
                                            setMessage(`エラー: ${data.error}`)
                                        }
                                    } catch (error) {
                                        setMessage(`エラー: ${error.message}`)
                                    } finally {
                                        setLoading(false)
                                    }
                                }}
                                disabled={!selectedUserId}
                                className="small-button"
                            >
                                推し一覧取得
                            </button>
                        </div>
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                            {!selectedUserId && '※ ユーザーIDを選択してください'}
                            {selectedUserId && talents.length === 0 && '※ 配信者を登録してください'}
                            {selectedUserId && talents.length > 0 && '※ 推しを登録すると、セッション作成時に自動でメイン枠に設定されます'}
                        </div>
                    </div>
                </section>

                {/* 配信者管理 */}
                <section className="section">
                    <h2>🎬 配信者管理</h2>
                    <div style={{ marginBottom: '15px', padding: '15px', background: '#e3f2fd', borderRadius: '4px', border: '1px solid #2196F3' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '10px', fontSize: '16px' }}>📝 チャンネルIDの取得方法</h3>
                        <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                            <p style={{ margin: '5px 0' }}><strong>方法1: チャンネルURLから取得</strong></p>
                            <p style={{ margin: '5px 0', paddingLeft: '15px' }}>
                                チャンネルURL: <code>https://www.youtube.com/channel/UCxxxxxxxxxxxxx</code><br />
                                → チャンネルID: <code>UCxxxxxxxxxxxxx</code>（「channel/」の後の部分）
                            </p>
                            <p style={{ margin: '10px 0 5px 0' }}><strong>方法2: カスタムURLから取得</strong></p>
                            <p style={{ margin: '5px 0', paddingLeft: '15px' }}>
                                カスタムURL: <code>https://www.youtube.com/@channelname</code> の場合、<br />
                                チャンネルページを開き、ページのソースコード（Ctrl+U）で「channel/UC」を検索
                            </p>
                            <p style={{ margin: '10px 0 5px 0' }}><strong>方法3: チャンネル情報から取得</strong></p>
                            <p style={{ margin: '5px 0', paddingLeft: '15px' }}>
                                チャンネルページ → 「概要」タブ → 「チャンネル詳細」の下に表示されるID
                            </p>
                        </div>
                    </div>
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
                                    <div style={{ marginTop: '10px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                        <select
                                            value=""
                                            onChange={async (e) => {
                                                const talentId = e.target.value
                                                if (!talentId) return
                                                setLoading(true)
                                                try {
                                                    const response = await fetch(`${API_BASE_URL}/groups/${group.ID}/add-talent/${talentId}`, {
                                                        method: 'POST',
                                                    })
                                                    if (response.ok) {
                                                        setMessage('グループに配信者を追加しました')
                                                        fetchGroups()
                                                    } else {
                                                        const data = await response.json()
                                                        setMessage(`エラー: ${data.error}`)
                                                    }
                                                } catch (error) {
                                                    setMessage(`エラー: ${error.message}`)
                                                } finally {
                                                    setLoading(false)
                                                }
                                                e.target.value = ''
                                            }}
                                            disabled={talents.length === 0}
                                            style={{ padding: '5px', minWidth: '200px' }}
                                        >
                                            <option value="">配信者を追加...</option>
                                            {talents.map((talent) => (
                                                <option key={talent.ID} value={talent.ID}>
                                                    {talent.name} (ID: {talent.ID})
                                                </option>
                                            ))}
                                        </select>
                                        <button
                                            className="small-button"
                                            onClick={() => handleGetLiveStreams(group.ID)}
                                        >
                                            LIVE配信一括取得
                                        </button>
                                    </div>
                                    {talents.length === 0 && (
                                        <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                                            ※ 配信者を登録してください
                                        </div>
                                    )}
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

                {/* 音量プリセット管理 */}
                <section className="section">
                    <h2>🔊 音量プリセット管理</h2>
                    <div className="button-group">
                        <button onClick={fetchVolumePresets} disabled={!selectedUserId}>
                            プリセット一覧取得
                        </button>
                    </div>
                    <div style={{ marginTop: '15px', padding: '15px', background: '#f9f9f9', borderRadius: '4px' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '10px' }}>新しいプリセットを追加</h3>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <select
                                value=""
                                onChange={(e) => {
                                    const talentId = e.target.value
                                    if (talentId) {
                                        const talent = talents.find(t => t.ID === parseInt(talentId))
                                        if (talent) {
                                            const volume = prompt(`${talent.name}の音量を入力してください（0-100）`, '50')
                                            if (volume !== null) {
                                                handleSaveVolumePresetWithTalent(parseInt(talentId), parseInt(volume))
                                            }
                                        }
                                        e.target.value = ''
                                    }
                                }}
                                disabled={!selectedUserId || talents.length === 0}
                                style={{ padding: '5px', minWidth: '200px' }}
                            >
                                <option value="">配信者を選択...</option>
                                {talents.map((talent) => (
                                    <option key={talent.ID} value={talent.ID}>
                                        {talent.name} (ID: {talent.ID})
                                    </option>
                                ))}
                            </select>
                            <span style={{ fontSize: '12px', color: '#666' }}>
                                {!selectedUserId && '※ ユーザーIDを選択してください'}
                                {selectedUserId && talents.length === 0 && '※ 配信者を登録してください'}
                            </span>
                        </div>
                    </div>
                    {volumePresets.length > 0 && (
                        <div className="list" style={{ marginTop: '15px' }}>
                            {volumePresets.map((preset) => {
                                const talent = talents.find(t => t.ID === preset.talent_id)
                                return (
                                    <div key={preset.ID} className="item">
                                        <div><strong>配信者:</strong> {talent ? talent.name : `ID: ${preset.talent_id}`}</div>
                                        <div><strong>音量:</strong> {preset.volume}%</div>
                                        <div style={{ marginTop: '10px' }}>
                                            <button
                                                className="small-button"
                                                onClick={() => handleUpdateVolumePreset(preset.talent_id)}
                                            >
                                                更新
                                            </button>
                                            <button
                                                className="small-button"
                                                onClick={() => handleDeleteVolumePreset(preset.talent_id)}
                                                style={{ marginLeft: '5px' }}
                                            >
                                                削除
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </section>

                {/* 視聴セッション管理 */}
                <section className="section">
                    <h2>📺 視聴セッション管理</h2>
                    <div style={{ marginBottom: '15px', padding: '15px', background: '#f9f9f9', borderRadius: '4px' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '10px' }}>新しいセッションを作成</h3>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '10px' }}>
                            <input
                                type="text"
                                placeholder="セッション名（オプション）"
                                id="session-name-input"
                                style={{ padding: '5px', minWidth: '200px' }}
                            />
                            <select
                                value=""
                                onChange={async (e) => {
                                    const groupId = e.target.value
                                    if (!groupId) return
                                    const sessionName = document.getElementById('session-name-input')?.value || ''
                                    setLoading(true)
                                    setMessage('')
                                    try {
                                        const response = await fetch(`${API_BASE_URL}/users/${selectedUserId}/sessions`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                session_name: sessionName,
                                                group_id: parseInt(groupId),
                                            }),
                                        })
                                        if (response.ok) {
                                            const data = await response.json()
                                            setSessions([...sessions, data])
                                            setMessage('セッションを作成しました（推し優先ルール適用済み）')
                                            fetchSessions()
                                            const input = document.getElementById('session-name-input')
                                            if (input) input.value = ''
                                        } else {
                                            const data = await response.json()
                                            setMessage(`エラー: ${data.error}`)
                                        }
                                    } catch (error) {
                                        setMessage(`エラー: ${error.message}`)
                                    } finally {
                                        setLoading(false)
                                    }
                                    e.target.value = ''
                                }}
                                disabled={!selectedUserId || groups.length === 0}
                                style={{ padding: '5px', minWidth: '200px' }}
                            >
                                <option value="">グループを選択してセッション作成...</option>
                                {groups.map((group) => (
                                    <option key={group.ID} value={group.ID}>
                                        {group.name} (ID: {group.ID})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                            {!selectedUserId && '※ ユーザーIDを選択してください'}
                            {selectedUserId && groups.length === 0 && '※ グループを作成してください'}
                            {selectedUserId && groups.length > 0 && '※ グループを選択すると、そのグループのLIVE配信を自動取得し、推し優先ルールを適用します'}
                        </div>
                    </div>
                    <div className="button-group">
                        <button onClick={fetchSessions} disabled={!selectedUserId}>
                            セッション一覧取得
                        </button>
                    </div>
                    {sessions.length > 0 && (
                        <div className="list">
                            {sessions.map((session) => (
                                <div key={session.ID} className="item">
                                    <div><strong>セッション名:</strong> {session.session_name || '(無名)'}</div>
                                    <div><strong>ID:</strong> {session.ID}</div>
                                    <div><strong>状態:</strong> {session.is_active ? 'アクティブ' : '非アクティブ'}</div>
                                    <div><strong>ストリーム数:</strong> {session.streams?.length || 0}</div>
                                    <div style={{ marginTop: '10px' }}>
                                        <button
                                            className="small-button"
                                            onClick={() => handleGetSessionDetail(session.ID)}
                                        >
                                            詳細取得
                                        </button>
                                        <button
                                            className="small-button"
                                            onClick={() => handleDeleteSession(session.ID)}
                                            style={{ marginLeft: '5px' }}
                                        >
                                            削除
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {selectedSession && (
                        <div style={{ marginTop: '20px', padding: '15px', background: 'white', borderRadius: '4px', border: '1px solid #ddd' }}>
                            <h3>セッション詳細: {selectedSession.session_name || '(無名)'}</h3>
                            {selectedSession.streams && selectedSession.streams.length > 0 ? (
                                <div className="list">
                                    {selectedSession.streams.map((stream) => (
                                        <div key={stream.ID} className="item">
                                            <div><strong>タイトル:</strong> {stream.title}</div>
                                            <div><strong>VideoID:</strong> {stream.video_id}</div>
                                            <div><strong>音量:</strong> {stream.volume}%</div>
                                            <div><strong>位置:</strong> {stream.position}</div>
                                            <div><strong>メイン:</strong> {stream.is_main ? '✅' : '❌'}</div>
                                            <div style={{ marginTop: '10px' }}>
                                                {!stream.is_main && (
                                                    <button
                                                        className="small-button"
                                                        onClick={() => handleUpdateSessionMain(selectedSession.ID, stream.ID)}
                                                    >
                                                        メインに設定
                                                    </button>
                                                )}
                                                <button
                                                    className="small-button"
                                                    onClick={() => handleUpdateSessionVolume(selectedSession.ID, stream.ID)}
                                                    style={{ marginLeft: '5px' }}
                                                >
                                                    音量変更
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div>ストリームがありません</div>
                            )}
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
                                    <button
                                        className="small-button"
                                        onClick={() => {
                                            const videoId = stream.stream_url.match(/[?&]v=([^&]+)/)?.[1] || stream.stream_url.split('/').pop()
                                            setPlayingVideos([...playingVideos, {
                                                videoId: videoId,
                                                title: stream.title,
                                                volume: 50,
                                                isMain: playingVideos.length === 0,
                                                streamId: null
                                            }])
                                        }}
                                        style={{ marginTop: '8px' }}
                                    >
                                        動画を追加
                                    </button>
                                    <a href={stream.stream_url} target="_blank" rel="noopener noreferrer" style={{ marginLeft: '5px' }}>
                                        視聴する
                                    </a>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* 動画再生・音量バランステスト */}
                <section className="section">
                    <h2>🎬 動画再生・音量バランステスト</h2>
                    <div style={{ marginBottom: '15px' }}>
                        <input
                            type="text"
                            value={testVideoId}
                            onChange={(e) => setTestVideoId(e.target.value)}
                            placeholder="YouTube動画IDを入力（例: dQw4w9WgXcQ）"
                            style={{ padding: '5px', width: '300px', marginRight: '10px' }}
                        />
                        <button
                            onClick={() => {
                                if (testVideoId) {
                                    setPlayingVideos([...playingVideos, {
                                        videoId: testVideoId,
                                        title: `動画 ${testVideoId}`,
                                        volume: 50,
                                        isMain: playingVideos.length === 0,
                                        streamId: null
                                    }])
                                    setTestVideoId('')
                                }
                            }}
                        >
                            動画を追加
                        </button>
                        <button
                            onClick={() => {
                                if (selectedSession && selectedSession.streams) {
                                    const newVideos = selectedSession.streams.map((stream) => ({
                                        videoId: stream.video_id,
                                        title: stream.title || `動画 ${stream.video_id}`,
                                        volume: stream.volume,
                                        isMain: stream.is_main,
                                        streamId: stream.ID
                                    }))
                                    setPlayingVideos(newVideos)
                                    setMessage('セッションから動画を読み込みました')
                                } else {
                                    setMessage('セッションを選択してください')
                                }
                            }}
                            disabled={!selectedSession}
                            style={{ marginLeft: '10px' }}
                        >
                            セッションから読み込み
                        </button>
                        <button
                            onClick={() => {
                                // すべてのプレイヤーを削除
                                Object.keys(playersRef.current).forEach((key) => {
                                    const player = playersRef.current[key]
                                    if (player && player.destroy) {
                                        player.destroy()
                                    }
                                })
                                playersRef.current = {}
                                setPlayingVideos([])
                            }}
                            style={{ marginLeft: '10px', background: '#d32f2f' }}
                        >
                            全削除
                        </button>
                    </div>

                    {playingVideos.length > 0 && (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
                            gap: '20px',
                            marginTop: '20px'
                        }}>
                            {playingVideos.map((video, index) => (
                                <div
                                    key={index}
                                    style={{
                                        background: video.isMain ? '#fff3cd' : 'white',
                                        padding: '15px',
                                        borderRadius: '8px',
                                        border: video.isMain ? '3px solid #ffc107' : '1px solid #ddd',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                    }}
                                >
                                    <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <strong>{video.isMain ? '📺 メイン' : '📱 サブ'}</strong>
                                            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                                                {video.title}
                                            </div>
                                        </div>
                                        <button
                                            className="small-button"
                                            onClick={async () => {
                                                const newVideos = playingVideos.map((v, i) => ({
                                                    ...v,
                                                    isMain: i === index
                                                }))
                                                setPlayingVideos(newVideos)

                                                // セッションのストリームIDがある場合、APIに反映
                                                if (video.streamId && selectedSession && selectedUserId) {
                                                    try {
                                                        await fetch(`${API_BASE_URL}/users/${selectedUserId}/sessions/${selectedSession.ID}`, {
                                                            method: 'PUT',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({
                                                                main_stream_id: video.streamId
                                                            })
                                                        })
                                                        // セッションを再取得
                                                        const response = await fetch(`${API_BASE_URL}/users/${selectedUserId}/sessions/${selectedSession.ID}`)
                                                        if (response.ok) {
                                                            const data = await response.json()
                                                            setSelectedSession(data)
                                                        }
                                                    } catch (error) {
                                                        console.error('メイン切り替えエラー:', error)
                                                    }
                                                }
                                            }}
                                            disabled={video.isMain}
                                        >
                                            {video.isMain ? 'メイン' : 'メインに'}
                                        </button>
                                    </div>
                                    <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', marginBottom: '10px' }}>
                                        <div
                                            id={`youtube-player-${index}`}
                                            style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                height: '100%'
                                            }}
                                        />
                                        {ytReady && (
                                            <YouTubePlayer
                                                playerId={`youtube-player-${index}`}
                                                videoId={video.videoId}
                                                volume={video.volume}
                                                onPlayerReady={(player) => {
                                                    playersRef.current[`player-${index}`] = player
                                                }}
                                            />
                                        )}
                                    </div>
                                    <div style={{ marginTop: '10px' }}>
                                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                                            音量: {video.volume}%
                                        </label>
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={video.volume}
                                            onChange={async (e) => {
                                                const newVolume = parseInt(e.target.value)
                                                const newVideos = [...playingVideos]
                                                newVideos[index].volume = newVolume
                                                setPlayingVideos(newVideos)

                                                // YouTubeプレイヤーの音量を更新
                                                const player = playersRef.current[`player-${index}`]
                                                if (player && player.setVolume) {
                                                    player.setVolume(newVolume)
                                                }

                                                // セッションのストリームIDがある場合、APIに反映
                                                if (video.streamId && selectedSession && selectedUserId) {
                                                    try {
                                                        await fetch(`${API_BASE_URL}/users/${selectedUserId}/sessions/${selectedSession.ID}`, {
                                                            method: 'PUT',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({
                                                                update_volumes: [{
                                                                    stream_id: video.streamId,
                                                                    volume: newVolume
                                                                }]
                                                            })
                                                        })
                                                    } catch (error) {
                                                        console.error('音量更新エラー:', error)
                                                    }
                                                }
                                            }}
                                            style={{ width: '100%' }}
                                        />
                                        <div style={{ display: 'flex', gap: '5px', marginTop: '8px' }}>
                                            <button
                                                className="small-button"
                                                onClick={async () => {
                                                    const newVideos = [...playingVideos]
                                                    const newVolume = Math.min(100, newVideos[index].volume + 10)
                                                    newVideos[index].volume = newVolume
                                                    setPlayingVideos(newVideos)

                                                    // YouTubeプレイヤーの音量を更新
                                                    const player = playersRef.current[`player-${index}`]
                                                    if (player && player.setVolume) {
                                                        player.setVolume(newVolume)
                                                    }

                                                    // セッションのストリームIDがある場合、APIに反映
                                                    if (video.streamId && selectedSession && selectedUserId) {
                                                        try {
                                                            await fetch(`${API_BASE_URL}/users/${selectedUserId}/sessions/${selectedSession.ID}`, {
                                                                method: 'PUT',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({
                                                                    update_volumes: [{
                                                                        stream_id: video.streamId,
                                                                        volume: newVolume
                                                                    }]
                                                                })
                                                            })
                                                        } catch (error) {
                                                            console.error('音量更新エラー:', error)
                                                        }
                                                    }
                                                }}
                                            >
                                                +10
                                            </button>
                                            <button
                                                className="small-button"
                                                onClick={async () => {
                                                    const newVideos = [...playingVideos]
                                                    const newVolume = Math.max(0, newVideos[index].volume - 10)
                                                    newVideos[index].volume = newVolume
                                                    setPlayingVideos(newVideos)

                                                    // YouTubeプレイヤーの音量を更新
                                                    const player = playersRef.current[`player-${index}`]
                                                    if (player && player.setVolume) {
                                                        player.setVolume(newVolume)
                                                    }

                                                    // セッションのストリームIDがある場合、APIに反映
                                                    if (video.streamId && selectedSession && selectedUserId) {
                                                        try {
                                                            await fetch(`${API_BASE_URL}/users/${selectedUserId}/sessions/${selectedSession.ID}`, {
                                                                method: 'PUT',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({
                                                                    update_volumes: [{
                                                                        stream_id: video.streamId,
                                                                        volume: newVolume
                                                                    }]
                                                                })
                                                            })
                                                        } catch (error) {
                                                            console.error('音量更新エラー:', error)
                                                        }
                                                    }
                                                }}
                                            >
                                                -10
                                            </button>
                                            <button
                                                className="small-button"
                                                onClick={async () => {
                                                    const newVideos = [...playingVideos]
                                                    const newVolume = video.isMain ? 80 : 30
                                                    newVideos[index].volume = newVolume
                                                    setPlayingVideos(newVideos)

                                                    // YouTubeプレイヤーの音量を更新
                                                    const player = playersRef.current[`player-${index}`]
                                                    if (player && player.setVolume) {
                                                        player.setVolume(newVolume)
                                                    }

                                                    // セッションのストリームIDがある場合、APIに反映
                                                    if (video.streamId && selectedSession && selectedUserId) {
                                                        try {
                                                            await fetch(`${API_BASE_URL}/users/${selectedUserId}/sessions/${selectedSession.ID}`, {
                                                                method: 'PUT',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({
                                                                    update_volumes: [{
                                                                        stream_id: video.streamId,
                                                                        volume: newVolume
                                                                    }]
                                                                })
                                                            })
                                                        } catch (error) {
                                                            console.error('音量更新エラー:', error)
                                                        }
                                                    }
                                                }}
                                            >
                                                プリセット
                                            </button>
                                            <button
                                                className="small-button"
                                                onClick={() => {
                                                    // プレイヤーを削除
                                                    const player = playersRef.current[`player-${index}`]
                                                    if (player && player.destroy) {
                                                        player.destroy()
                                                    }
                                                    delete playersRef.current[`player-${index}`]
                                                    setPlayingVideos(playingVideos.filter((_, i) => i !== index))
                                                }}
                                                style={{ marginLeft: 'auto', background: '#d32f2f' }}
                                            >
                                                削除
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {playingVideos.length === 0 && (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                            動画を追加してテストを開始してください
                        </div>
                    )}

                    {playingVideos.length > 0 && (
                        <div style={{ marginTop: '20px', padding: '15px', background: '#f0f0f0', borderRadius: '4px' }}>
                            <h3>音量バランス情報</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                                {playingVideos.map((video, index) => (
                                    <div key={index} style={{ background: 'white', padding: '10px', borderRadius: '4px' }}>
                                        <div><strong>{video.isMain ? '📺 メイン' : '📱 サブ'}</strong></div>
                                        <div style={{ fontSize: '12px', color: '#666' }}>{video.title}</div>
                                        <div style={{ marginTop: '5px' }}>
                                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: video.volume > 70 ? '#4CAF50' : video.volume > 40 ? '#ff9800' : '#f44336' }}>
                                                {video.volume}%
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </section>
            </div>
        </div>
    )
}

// YouTubeプレイヤーコンポーネント
function YouTubePlayer({ playerId, videoId, volume, onPlayerReady }) {
    const playerRef = useRef(null)
    const onPlayerReadyRef = useRef(onPlayerReady)

    // onPlayerReadyの最新値を保持
    useEffect(() => {
        onPlayerReadyRef.current = onPlayerReady
    }, [onPlayerReady])

    useEffect(() => {
        let player = null
        let checkInterval = null

        function initializePlayer() {
            if (!window.YT || !window.YT.Player) return

            player = new window.YT.Player(playerId, {
                videoId: videoId,
                playerVars: {
                    autoplay: 1,
                    controls: 1,
                    mute: 0,
                    rel: 0,
                },
                events: {
                    onReady: (event) => {
                        event.target.setVolume(volume)
                        playerRef.current = event.target
                        if (onPlayerReadyRef.current) {
                            onPlayerReadyRef.current(event.target)
                        }
                    },
                },
            })
        }

        if (!window.YT || !window.YT.Player) {
            // YouTube APIがまだ読み込まれていない場合、少し待つ
            checkInterval = setInterval(() => {
                if (window.YT && window.YT.Player) {
                    clearInterval(checkInterval)
                    initializePlayer()
                }
            }, 100)
        } else {
            initializePlayer()
        }

        return () => {
            if (checkInterval) {
                clearInterval(checkInterval)
            }
            if (player && player.destroy) {
                player.destroy()
            }
            playerRef.current = null
        }
    }, [playerId, videoId]) // onPlayerReadyを依存配列から削除

    // 音量変更時の処理
    useEffect(() => {
        if (playerRef.current && playerRef.current.setVolume) {
            try {
                playerRef.current.setVolume(volume)
            } catch (error) {
                console.error('音量設定エラー:', error)
            }
        }
    }, [volume])

    return null
}

export default ApiTest

