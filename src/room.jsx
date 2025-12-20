import React, {useRef, useState, useEffect} from "react";
import Draggable from "react-draggable";
import "./Room.css";
import roomImg from "./assets/room.png";
import monitorFrameImg from "./assets/main-monitor-frame.png";
import monitorArmImg from "./assets/monitor-arm.png";
import subMonitorFrameImg from "./assets/sub-monitor1-frame.png";
import Monitor from "./monitor";
import SmallMonitor from "./SmallMonitor";
import smallMonitorFrameImg from "./assets/small-monitor-frame.png";
import menuIconImg from "./assets/menu-icon.png";
import searchIconImg from "./assets/search-icon.png";
import youtubeIconImg from "./assets/youtube-icon.png";
import mainVolumeImg from "./assets/volume-bar.png";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const Room = ({ onLogout, userId: propUserId }) => {
  const mainHandleRef = useRef(null);
  const connectionErrorShownRef = useRef(false); // 接続エラーメッセージを1回だけ表示するためのフラグ

  // ユーザーID管理: props > ローカルストレージ > デフォルト値
  const [userId, setUserId] = useState(() => {
    if (propUserId) return propUserId;
    const stored = localStorage.getItem('tubeGrid_userId');
    if (stored) return parseInt(stored, 10);
    return null; // 後で最初のユーザーを取得する
  });

  const [mainVid, setMainVid] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // セッション管理
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [currentSession, setCurrentSession] = useState(null);
  
  // ルームレイアウト管理
  const [roomLayouts, setRoomLayouts] = useState([]);
  const [layoutLoaded, setLayoutLoaded] = useState(false);
  
  // 音量プリセット管理
  const [volumePresets, setVolumePresets] = useState([]);
  
  // YouTube Player管理
  const [ytReady, setYtReady] = useState(false);
  const mainPlayerRef = useRef(null);
  const [mainVolume, setMainVolume] = useState(50);
  const playersRef = useRef({}); // {monitorId: YT.Player}

  // デフォルト位置の定義（動画がない場合の配置用）
  const DEFAULT_POSITIONS = {
    sub: [
      { x: 920, y: 300, rotate: 0 },
      { x: 1370, y: 70, rotate: 0 },
      { x: 1800, y: 300, rotate: 0 },
      { x: 860, y: 760, rotate: 0 },
      { x: 1850, y: 800, rotate: 0 },
    ],
    small: [
      { x: 270, y: 100, rotate: 0 },
      { x: 600, y: 220, rotate: 0 },
      { x: 320, y: 420, rotate: 0 },
      { x: 530, y: 660, rotate: 0 },
      { x: 240, y: 860, rotate: 0 },
      { x: 2630, y: 100, rotate: 0 },
      { x: 2310, y: 220, rotate: 0 },
      { x: 2560, y: 420, rotate: 0 },
      { x: 2380, y: 660, rotate: 0 },
      { x: 2650, y: 860, rotate: 0 },
    ]
  };

  // ユーザーIDが設定されていない場合、最初のユーザーを取得
  useEffect(() => {
    if (!userId) {
      const fetchFirstUser = async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/users`);
          if (response.ok) {
            const users = await response.json();
            if (users && users.length > 0) {
              const firstUserId = users[0].ID || users[0].id;
              setUserId(firstUserId);
              localStorage.setItem('tubeGrid_userId', firstUserId.toString());
            }
          }
        } catch (err) {
          // バックエンドサーバーが起動していない場合は、エラーを1回だけ表示
          // ユーザーはログイン後にuserIdが設定されるため、このエラーは無視して問題ない
          if (err.message && err.message.includes('Failed to fetch')) {
            if (!connectionErrorShownRef.current) {
              console.warn('バックエンドサーバーに接続できません。ログイン後にユーザーIDが設定されます。');
              connectionErrorShownRef.current = true;
            }
          } else {
            console.error('ユーザー取得エラー:', err);
          }
        }
      };
      fetchFirstUser();
    }
  }, [userId]);

  // セッション一覧取得
  useEffect(() => {
    if (!userId) return;

    const fetchSessions = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}/sessions`);
        if (response.ok) {
          const data = await response.json();
          setSessions(data || []);
          
          // アクティブセッションを自動選択
          const activeSession = data.find(s => s.is_active || s.IsActive);
          if (activeSession) {
            setSelectedSessionId(activeSession.ID || activeSession.id);
          } else if (data.length > 0) {
            // アクティブセッションがない場合、最新のセッションを選択
            const latestSession = data[data.length - 1];
            setSelectedSessionId(latestSession.ID || latestSession.id);
          }
        } else {
          const errorData = await response.json();
          setError(`セッション取得エラー: ${errorData.error || '不明なエラー'}`);
        }
      } catch (err) {
        console.error('セッション取得エラー:', err);
        setError(`セッション取得エラー: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [userId]);

  // セッション詳細取得
  useEffect(() => {
    if (!userId || !selectedSessionId) return;

    const fetchSessionDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}/sessions/${selectedSessionId}`);
        if (response.ok) {
          const data = await response.json();
          setCurrentSession(data);
          
          // セッションから動画IDを更新
          const streams = data.streams || data.Streams || [];
          const mainStream = streams.find(s => s.is_main || s.IsMain);
          if (mainStream) {
            setMainVid(mainStream.video_id || mainStream.VideoID);
          }
        } else {
          const errorData = await response.json();
          setError(`セッション詳細取得エラー: ${errorData.error || '不明なエラー'}`);
        }
      } catch (err) {
        console.error('セッション詳細取得エラー:', err);
        setError(`セッション詳細取得エラー: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchSessionDetail();
  }, [userId, selectedSessionId]);

  // ルームレイアウトの読み込み
  useEffect(() => {
    if (!userId) return;

    const fetchRoomLayout = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}/room-layout`);
        if (response.ok) {
          const data = await response.json();
          setRoomLayouts(data || []);
          setLayoutLoaded(true);
        } else if (response.status === 404) {
          // レイアウトが存在しない場合はデフォルト値を使用
          setLayoutLoaded(true);
        } else {
          const errorData = await response.json();
          console.error('レイアウト取得エラー:', errorData.error);
        }
      } catch (err) {
        console.error('レイアウト取得エラー:', err);
      }
    };

    fetchRoomLayout();
  }, [userId]);

  // 音量プリセットの取得
  useEffect(() => {
    if (!userId) return;

    const fetchVolumePresets = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}/volume-presets`);
        if (response.ok) {
          const data = await response.json();
          setVolumePresets(data || []);
        }
      } catch (err) {
        console.error('音量プリセット取得エラー:', err);
      }
    };

    fetchVolumePresets();
  }, [userId]);

  // 音量プリセットの適用
  const applyVolumePreset = (talentId) => {
    const preset = volumePresets.find(p => 
      (p.talent_id || p.TalentID) === talentId
    );
    return preset ? (preset.volume || preset.Volume || 50) : 50;
  };

  // YouTube IFrame APIの読み込み確認
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      setYtReady(true);
    } else {
      window.onYouTubeIframeAPIReady = () => {
        setYtReady(true);
      };
      // 既に読み込まれている場合
      if (window.YT && window.YT.Player) {
        setYtReady(true);
      }
    }
  }, []);

  // メインモニター用のYouTube Player初期化
  useEffect(() => {
    if (!ytReady || !mainVid) return;

    const playerId = 'main-youtube-player';
    let player = null;

    function initializeMainPlayer() {
      if (!window.YT || !window.YT.Player) return;

      player = new window.YT.Player(playerId, {
        videoId: mainVid,
        playerVars: {
          autoplay: 1,
          controls: 1,
          mute: 0,
          rel: 0,
        },
        events: {
          onReady: (event) => {
            event.target.setVolume(mainVolume);
            mainPlayerRef.current = event.target;
          },
        },
      });
    }

    if (window.YT && window.YT.Player) {
      initializeMainPlayer();
    }

    return () => {
      if (player && player.destroy) {
        player.destroy();
      }
      mainPlayerRef.current = null;
    };
  }, [ytReady, mainVid]);

  // メインモニターの音量変更
  useEffect(() => {
    if (mainPlayerRef.current && mainPlayerRef.current.setVolume) {
      try {
        mainPlayerRef.current.setVolume(mainVolume);
      } catch (error) {
        console.error('メイン音量設定エラー:', error);
      }
    }
  }, [mainVolume]);

  // レイアウトデータからモニター位置を取得
  const getLayoutForMonitor = (monitorId) => {
    return roomLayouts.find(layout => 
      (layout.monitor_id || layout.MonitorID) === monitorId
    );
  };

  // セッションストリームをモニター用データ構造にマッピング
  const mapSessionStreamsToMonitors = (session) => {
    if (!session || !session.streams || session.streams.length === 0) {
      return {
        mainVid: null,
        subData: [],
        smallData: []
      };
    }

    const streams = session.streams || session.Streams || [];
    
    // メインストリームを取得
    const mainStream = streams.find(s => s.is_main || s.IsMain);
    const mainVid = mainStream ? (mainStream.video_id || mainStream.VideoID) : null;

    // サブストリーム（メイン以外の最初の5つ）
    const subStreams = streams
      .filter(s => !(s.is_main || s.IsMain))
      .slice(0, 5)
      .map((stream, index) => {
        const streamId = stream.id || stream.ID;
        const videoId = stream.video_id || stream.VideoID;
        const title = stream.title || stream.Title || '';
        const talentId = stream.talent_id || stream.TalentID;
        const monitorId = `sub-${streamId}`;
        
        // レイアウトから位置を取得、なければデフォルト
        const layout = getLayoutForMonitor(monitorId);
        const defaultPos = DEFAULT_POSITIONS.sub[index] || DEFAULT_POSITIONS.sub[0];
        
        // 音量プリセットを適用
        const presetVolume = applyVolumePreset(talentId);
        const streamVolume = stream.volume || stream.Volume || presetVolume;
        
        return {
          id: monitorId,
          x: layout ? (layout.x || layout.X) : defaultPos.x,
          y: layout ? (layout.y || layout.Y) : defaultPos.y,
          vid: videoId,
          rotate: layout ? (layout.rotate || layout.Rotate) : defaultPos.rotate,
          label: title.substring(0, 10) || `配信${index + 1}`,
          streamId: streamId,
          talentId: talentId,
          volume: streamVolume
        };
      });

    // 小さいモニター（残りのストリーム）
    const smallStreams = streams
      .filter(s => !(s.is_main || s.IsMain))
      .slice(5)
      .map((stream, index) => {
        const streamId = stream.id || stream.ID;
        const videoId = stream.video_id || stream.VideoID;
        const title = stream.title || stream.Title || '';
        const talentId = stream.talent_id || stream.TalentID;
        const isOshi = false; // TODO: 推し情報を取得
        const monitorId = `sm-${streamId}`;
        
        // レイアウトから位置を取得、なければデフォルト
        const layout = getLayoutForMonitor(monitorId);
        const defaultPos = DEFAULT_POSITIONS.small[index % DEFAULT_POSITIONS.small.length];
        
        // 音量プリセットを適用
        const presetVolume = applyVolumePreset(talentId);
        const streamVolume = stream.volume || stream.Volume || presetVolume;
        
        return {
          id: monitorId,
          x: layout ? (layout.x || layout.X) : defaultPos.x,
          y: layout ? (layout.y || layout.Y) : defaultPos.y,
          rotate: layout ? (layout.rotate || layout.Rotate) : defaultPos.rotate,
          vid: videoId,
          label: title.substring(0, 10) || `監視 ${index + 1}`,
          isOshi: isOshi,
          streamId: streamId,
          talentId: talentId,
          volume: streamVolume
        };
      });

    return {
      mainVid,
      subData: subStreams,
      smallData: smallStreams
    };
  };

  // セッションからモニターデータを取得
  const monitorData = currentSession ? mapSessionStreamsToMonitors(currentSession) : {
    mainVid: null,
    subData: [],
    smallData: []
  };

  const subData = monitorData.subData;
  const smallData = monitorData.smallData;

  // デバウンス用のタイマー
  const layoutSaveTimers = useRef({});

  // モニター位置変更の保存（デバウンス付き）
  const saveMonitorPosition = async (monitorId, position) => {
    if (!userId) return;

    // 既存のタイマーをクリア
    if (layoutSaveTimers.current[monitorId]) {
      clearTimeout(layoutSaveTimers.current[monitorId]);
    }

    // デバウンス: 500ms後に保存
    layoutSaveTimers.current[monitorId] = setTimeout(async () => {
      try {
        // 既存のレイアウトを確認
        const existingLayout = roomLayouts.find(l => 
          (l.monitor_id || l.MonitorID) === monitorId
        );

        const layoutData = {
          monitor_id: monitorId,
          video_id: position.videoId || '',
          x: position.x,
          y: position.y,
          rotate: position.rotate || 0,
          width: position.width || 0,
          height: position.height || 0,
          z_index: position.zIndex || 100,
          is_main: position.isMain || false,
          is_oshi: position.isOshi || false,
          label: position.label || '',
          monitor_type: position.monitorType || 'sub'
        };

        if (existingLayout) {
          // 更新
          const response = await fetch(
            `${API_BASE_URL}/users/${userId}/room-layout/${monitorId}`,
            {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(layoutData)
            }
          );
          if (response.ok) {
            // ローカル状態を更新
            setRoomLayouts(prev => prev.map(l => 
              (l.monitor_id || l.MonitorID) === monitorId 
                ? { ...l, ...layoutData }
                : l
            ));
          }
        } else {
          // 新規作成（初期保存）
          const allLayouts = [...roomLayouts, layoutData];
          const response = await fetch(
            `${API_BASE_URL}/users/${userId}/room-layout`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(allLayouts)
            }
          );
          if (response.ok) {
            const data = await response.json();
            setRoomLayouts(data.layouts || allLayouts);
          }
        }
      } catch (err) {
        console.error('レイアウト保存エラー:', err);
      }
    }, 500);
  };

  // 検索結果から動画をセッションに追加
  const handleAddVideoToSession = async (videoId, title) => {
    if (!userId) {
      setError('ユーザーIDが設定されていません');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 動画情報を取得
      const videoInfoResponse = await fetch(`${API_BASE_URL}/videos/${videoId}/info`);
      if (!videoInfoResponse.ok) {
        throw new Error('動画情報の取得に失敗しました');
      }
      const videoInfo = await videoInfoResponse.json();
      const videoTitle = title || videoInfo.title || '動画';

      let sessionId = selectedSessionId;

      // セッションが選択されていない場合、新しいセッションを作成
      if (!sessionId) {
        const createResponse = await fetch(
          `${API_BASE_URL}/users/${userId}/sessions`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              session_name: `セッション ${new Date().toLocaleString('ja-JP')}`,
              streams: [{
                talent_id: 0, // TODO: チャンネルIDから配信者IDを取得
                video_id: videoId,
                stream_url: `https://www.youtube.com/watch?v=${videoId}`,
                title: videoTitle
              }]
            })
          }
        );

        if (createResponse.ok) {
          const newSession = await createResponse.json();
          sessionId = newSession.ID || newSession.id;
          setSelectedSessionId(sessionId);
          
          // セッション一覧を再取得
          const sessionsResponse = await fetch(`${API_BASE_URL}/users/${userId}/sessions`);
          if (sessionsResponse.ok) {
            const sessionsData = await sessionsResponse.json();
            setSessions(sessionsData || []);
          }

          // セッション詳細を取得して状態を更新
          const sessionDetailResponse = await fetch(
            `${API_BASE_URL}/users/${userId}/sessions/${sessionId}`
          );
          if (sessionDetailResponse.ok) {
            const sessionData = await sessionDetailResponse.json();
            setCurrentSession(sessionData);
            setError(null);
          }
        } else {
          const errorData = await createResponse.json();
          setError(`セッション作成エラー: ${errorData.error || '不明なエラー'}`);
        }
      } else {
        // 既存のセッションにストリームを追加
        const response = await fetch(
          `${API_BASE_URL}/users/${userId}/sessions/${sessionId}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              add_streams: [{
                talent_id: 0, // TODO: チャンネルIDから配信者IDを取得
                video_id: videoId,
                stream_url: `https://www.youtube.com/watch?v=${videoId}`,
                title: videoTitle
              }]
            })
          }
        );

        if (response.ok) {
          // セッション情報を再取得
          const sessionResponse = await fetch(
            `${API_BASE_URL}/users/${userId}/sessions/${sessionId}`
          );
          if (sessionResponse.ok) {
            const sessionData = await sessionResponse.json();
            setCurrentSession(sessionData);
            setError(null);
          }
        } else {
          const errorData = await response.json();
          setError(`動画追加エラー: ${errorData.error || '不明なエラー'}`);
        }
      }
    } catch (err) {
      console.error('動画追加エラー:', err);
      setError(`動画追加エラー: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const swapVideo = async (id, type) => {
    if (!userId || !selectedSessionId) return;

    const oldMainVid = mainVid;
    let targetVid = "";
    let targetStreamId = null;
    
    if (type === "sub") {
      const target = subData.find((s) => s.id === id);
      if (!target) return;
      targetVid = target.vid;
      targetStreamId = target.streamId;
    } else {
      const target = smallData.find((s) => s.id === id);
      if (!target) return;
      targetVid = target.vid;
      targetStreamId = target.streamId;
    }

    // メインストリームを切り替え
    setMainVid(targetVid);

    // APIでメインストリームを更新
    try {
      const response = await fetch(
        `${API_BASE_URL}/users/${userId}/sessions/${selectedSessionId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            main_stream_id: targetStreamId
          })
        }
      );

      if (response.ok) {
        // セッション情報を再取得
        const sessionResponse = await fetch(
          `${API_BASE_URL}/users/${userId}/sessions/${selectedSessionId}`
        );
        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json();
          setCurrentSession(sessionData);
        }
      } else {
        console.error('メインストリーム更新エラー');
      }
    } catch (err) {
      console.error('メインストリーム更新エラー:', err);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError('検索クエリを入力してください');
      return;
    }

    setLoading(true);
    setError(null);
    setSearchResults([]);

    try {
      const encodedQuery = encodeURIComponent(searchQuery.trim());
      const response = await fetch(
        `${API_BASE_URL}/youtube/search?q=${encodedQuery}&max_results=10`
      );

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results || []);
        if (data.results && data.results.length === 0) {
          setError('検索結果が見つかりませんでした');
        }
      } else {
        const errorData = await response.json();
        setError(`検索エラー: ${errorData.error || '不明なエラー'}`);
      }
    } catch (err) {
      console.error('検索エラー:', err);
      setError(`検索エラー: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="world-wrapper">
      <button
        className="menu-trigger"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
      >
        <img src={menuIconImg} alt="menu" />
      </button>

      <div className={`search-panel ${isMenuOpen ? "open" : ""}`}>
        <div className="search-container">
          <div className="search-logo">
            <img src={youtubeIconImg} alt="YouTube" />
          </div>
          <div className="search-bar">
            <input
              type="text"
              placeholder="検索"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <button className="search-btn" onClick={handleSearch}>
              <img src={searchIconImg} alt="検索" />
            </button>
          </div>
        </div>

        {/* セッション選択UI */}
        <div className="session-selector" style={{ padding: '10px', borderBottom: '1px solid #333' }}>
          <label style={{ display: 'block', marginBottom: '5px', color: '#fff', fontSize: '14px' }}>
            セッション選択:
          </label>
          <select
            value={selectedSessionId || ''}
            onChange={(e) => setSelectedSessionId(e.target.value ? parseInt(e.target.value, 10) : null)}
            style={{
              width: '100%',
              padding: '8px',
              backgroundColor: '#333',
              color: '#fff',
              border: '1px solid #555',
              borderRadius: '4px',
              fontSize: '14px'
            }}
            disabled={loading || sessions.length === 0}
          >
            {sessions.length === 0 ? (
              <option value="">セッションがありません</option>
            ) : (
              <>
                <option value="">セッションを選択...</option>
                {sessions.map((session) => (
                  <option key={session.ID || session.id} value={session.ID || session.id}>
                    {session.session_name || session.SessionName || `セッション ${session.ID || session.id}`}
                    {(session.is_active || session.IsActive) && ' (アクティブ)'}
                  </option>
                ))}
              </>
            )}
          </select>
          {error && (
            <div style={{ color: '#ff4444', fontSize: '12px', marginTop: '5px' }}>
              {error}
            </div>
          )}
        </div>
        
        <div className="search-results-list">
          {loading && (
            <div style={{ padding: '20px', textAlign: 'center', color: '#fff' }}>
              検索中...
            </div>
          )}
          {!loading && searchResults.length === 0 && !error && (
            <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
              検索結果が表示されます
            </div>
          )}
          {error && (
            <div style={{ padding: '10px', color: '#ff4444', fontSize: '14px' }}>
              {error}
            </div>
          )}
          {!loading && searchResults.map((video) => {
            const videoId = video.video_id || video.id;
            const title = video.title || video.Title;
            const thumbnail = video.thumbnail_url || video.thumbnail;
            return (
              <div
                key={videoId}
                className="video-card"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(
                    "text",
                    `https://www.youtube.com/watch?v=${videoId}`
                  );
                }}
                onClick={() => {
                  handleAddVideoToSession(videoId, title);
                }}
                style={{ cursor: 'pointer' }}
              >
                <div className="thumb-container">
                  <img src={thumbnail} alt={title} />
                </div>
                <div className="video-info">
                  <p className="video-title">{title}</p>
                  {video.channel_name && (
                    <p className="video-channel" style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                      {video.channel_name}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="panel-footer">
          <button className="logout-btn" onClick={onLogout}>
            ログアウト
          </button>
        </div>
      </div>

      <div className="world">
        <img src={roomImg} className="bg-layer" draggable="false" />
        <img
          src={monitorArmImg}
          className="part-arm"
          style={{position: "absolute"}}
        />

        {subData.map((data) => (
          <Monitor
            key={data.id}
            {...data}
            frameImg={subMonitorFrameImg}
            onSwap={() => swapVideo(data.id, "sub")}
            volume={data.volume || 50}
            onPositionChange={(position) => saveMonitorPosition(data.id, {
              ...position,
              videoId: data.vid,
              label: data.label,
              isMain: false,
              isOshi: data.isOshi,
              monitorType: 'sub'
            })}
          />
        ))}

        <div
          className="monitor-group main-fixed"
          style={{
            left: "1150px",
            top: "300px",
            position: "absolute",
            width: "800px",
          }}
        >
          <div className="screen-inside main-screen">
            {mainVid ? (
              ytReady ? (
                <div id="main-youtube-player"></div>
              ) : (
                <iframe
                  src={`https://www.youtube.com/embed/${mainVid}`}
                  frameBorder="0"
                />
              )
            ) : (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                height: '100%', 
                color: '#888',
                fontSize: '18px'
              }}>
                動画を選択してください
              </div>
            )}
          </div>

          <div className="volume-overlay main-volume">
            <div
              style={{
                position: "relative",
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
              }}
            >
              <img
                src={mainVolumeImg}
                alt="main-volume"
                style={{width: "100%", pointerEvents: "none"}}
              />

              <Draggable
                nodeRef={mainHandleRef}
                axis="x"
                bounds="parent"
                defaultPosition={{x: 100, y: 0}}
                onDrag={(e, data) => {
                  // 音量スライダーの位置から音量を計算（0-100）
                  const parentWidth = data.node.parentElement.offsetWidth;
                  const volume = Math.round((data.x / parentWidth) * 100);
                  const clampedVolume = Math.max(0, Math.min(100, volume));
                  setMainVolume(clampedVolume);
                }}
              >
                <div ref={mainHandleRef} className="volume-handle" />
              </Draggable>
            </div>
          </div>
          <img src={monitorFrameImg} className="part-frame" />
          <div className="monitor-label">MAIN</div>
        </div>

        {smallData.map((data) => (
          <SmallMonitor
            key={data.id}
            {...data}
            frameImg={smallMonitorFrameImg}
            onSwap={() => swapVideo(data.id, "small")}
            volume={data.volume || 50}
            onPositionChange={(position) => saveMonitorPosition(data.id, {
              ...position,
              videoId: data.vid,
              label: data.label,
              isMain: false,
              isOshi: data.isOshi,
              monitorType: 'small'
            })}
          />
        ))}
      </div>
    </div>
  );
};

export default Room;