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

  // ユーザーID管理: props > ローカルストレージ > デフォルト値
  const [userId, setUserId] = useState(() => {
    if (propUserId) return propUserId;
    const stored = localStorage.getItem('tubeGrid_userId');
    if (stored) return parseInt(stored, 10);
    return null; // 後で最初のユーザーを取得する
  });

  const [mainVid, setMainVid] = useState(() => {
    // 初期値は後でセッションから更新される
    return "LIVE_ID_MAIN";
  });
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

  const INITIAL_SUB_DATA = [
    {
      id: "sub1",
      x: 920,
      y: 300,
      vid: "fSAtD36VPhI",
      rotate: 0,
      label: "推し1",
    },
    {id: "sub2", x: 1370, y: 70, vid: "dQw4w9WgXcQ", rotate: 0, label: "推し2"},
    {
      id: "sub3",
      x: 1800,
      y: 300,
      vid: "fSAtD36VPhI",
      rotate: 0,
      label: "推し3",
    },
    {
      id: "sub4",
      x: 860,
      y: 760,
      vid: "dQw4w9WgXcQ",
      rotate: 0,
      label: "推し4",
    },
    {
      id: "sub5",
      x: 1850,
      y: 800,
      vid: "fSAtD36VPhI",
      rotate: 0,
      label: "推し5",
    },
  ];

  const INITIAL_SMALL_DATA = [
    {
      id: "sm-l1",
      x: 270,
      y: 100,
      rotate: 0,
      vid: "fSAtD36VPhI",
      label: "監視 01",
      isOshi: false,
    },
    {
      id: "sm-l2",
      x: 600,
      y: 220,
      rotate: 0,
      vid: "dQw4w9WgXcQ",
      label: "監視 02",
      isOshi: false,
    },
    {
      id: "sm-l3",
      x: 320,
      y: 420,
      rotate: 0,
      vid: "fSAtD36VPhI",
      label: "監視 03",
      isOshi: false,
    },
    {
      id: "sm-l4",
      x: 530,
      y: 660,
      rotate: 0,
      vid: "dQw4w9WgXcQ",
      label: "監視 04",
      isOshi: false,
    },
    {
      id: "sm-l5",
      x: 240,
      y: 860,
      rotate: 0,
      vid: "fSAtD36VPhI",
      label: "監視 05",
      isOshi: false,
    },
    {
      id: "sm-r1",
      x: 2630,
      y: 100,
      rotate: 0,
      vid: "dQw4w9WgXcQ",
      label: "監視 06",
      isOshi: false,
    },
    {
      id: "sm-r2",
      x: 2310,
      y: 220,
      rotate: 0,
      vid: "fSAtD36VPhI",
      label: "監視 07",
      isOshi: false,
    },
    {
      id: "sm-r3",
      x: 2560,
      y: 420,
      rotate: 0,
      vid: "dQw4w9WgXcQ",
      label: "監視 08",
      isOshi: true,
    },
    {
      id: "sm-r4",
      x: 2380,
      y: 660,
      rotate: 0,
      vid: "fSAtD36VPhI",
      label: "監視 09",
      isOshi: false,
    },
    {
      id: "sm-r5",
      x: 2650,
      y: 860,
      rotate: 0,
      vid: "dQw4w9WgXcQ",
      label: "監視 10",
      isOshi: false,
    },
  ];

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
          console.error('ユーザー取得エラー:', err);
          setError('ユーザー情報の取得に失敗しました');
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
    if (!ytReady || !mainVid || mainVid === "LIVE_ID_MAIN") return;

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
        mainVid: "LIVE_ID_MAIN",
        subData: INITIAL_SUB_DATA,
        smallData: INITIAL_SMALL_DATA
      };
    }

    const streams = session.streams || session.Streams || [];
    
    // メインストリームを取得
    const mainStream = streams.find(s => s.is_main || s.IsMain);
    const mainVid = mainStream ? (mainStream.video_id || mainStream.VideoID) : "LIVE_ID_MAIN";

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
        const defaultSub = INITIAL_SUB_DATA[index] || INITIAL_SUB_DATA[0];
        
        // 音量プリセットを適用
        const presetVolume = applyVolumePreset(talentId);
        const streamVolume = stream.volume || stream.Volume || presetVolume;
        
        return {
          id: monitorId,
          x: layout ? (layout.x || layout.X) : defaultSub.x,
          y: layout ? (layout.y || layout.Y) : defaultSub.y,
          vid: videoId,
          rotate: layout ? (layout.rotate || layout.Rotate) : defaultSub.rotate,
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
        const defaultSmall = INITIAL_SMALL_DATA[index % INITIAL_SMALL_DATA.length];
        
        // 音量プリセットを適用
        const presetVolume = applyVolumePreset(talentId);
        const streamVolume = stream.volume || stream.Volume || presetVolume;
        
        return {
          id: monitorId,
          x: layout ? (layout.x || layout.X) : defaultSmall.x,
          y: layout ? (layout.y || layout.Y) : defaultSmall.y,
          rotate: layout ? (layout.rotate || layout.Rotate) : defaultSmall.rotate,
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
      subData: subStreams.length > 0 ? subStreams : INITIAL_SUB_DATA,
      smallData: smallStreams.length > 0 ? smallStreams : INITIAL_SMALL_DATA
    };
  };

  // セッションからモニターデータを取得
  const monitorData = currentSession ? mapSessionStreamsToMonitors(currentSession) : {
    mainVid: "LIVE_ID_MAIN",
    subData: INITIAL_SUB_DATA,
    smallData: INITIAL_SMALL_DATA
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
    if (!searchQuery) return;
    console.log("バックエンド：APIを叩いてください:", searchQuery);
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
          {searchResults.map((video) => (
            <div
              key={video.id}
              className="video-card"
              draggable
              onDragStart={(e) =>
                e.dataTransfer.setData(
                  "text",
                  `https://www.youtube.com/watch?v=${video.id}`
                )
              }
            >
              <div className="thumb-container">
                <img src={video.thumbnail} alt={video.title} />
              </div>
              <div className="video-info">
                <p className="video-title">{video.title}</p>
              </div>
            </div>
          ))}
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
            {ytReady && mainVid && mainVid !== "LIVE_ID_MAIN" ? (
              <div id="main-youtube-player"></div>
            ) : (
              <iframe
                src={`https://www.youtube.com/embed/${mainVid}`}
                frameBorder="0"
              />
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