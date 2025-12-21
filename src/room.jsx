import React, { useRef, useState, useEffect } from "react";
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
  const [, setLayoutLoaded] = useState(false);

  // 音量プリセット管理
  const [volumePresets, setVolumePresets] = useState([]);

  // 盛り上がり配信管理
  const [surgeStreams, setSurgeStreams] = useState({}); // {videoId: surgeScore}
  const [commentMetrics, setCommentMetrics] = useState({}); // {videoId: {commentGrowthScore, keywordScore, ...}}

  // YouTube Player管理
  const [ytReady, setYtReady] = useState(false);
  const mainPlayerRef = useRef(null);
  const [mainVolume, setMainVolume] = useState(50);

  // 画面サイズに応じたスケール管理
  const [worldScale, setWorldScale] = useState(1);
  const worldRef = useRef(null);
  const worldWrapperRef = useRef(null);

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

  // 盛り上がり配信の定期取得（30秒ごと）
  useEffect(() => {
    if (!selectedSessionId || !userId) return;

    const fetchCommentMetrics = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/users/${userId}/sessions/${selectedSessionId}/surge-streams`
        );
        if (response.ok) {
          const data = await response.json();
          const surgeMap = {};
          const metricsMap = {};

          data.streams?.forEach(stream => {
            const videoId = stream.video_id || stream.VideoID;
            const surgeScore = stream.surge_score || 0;
            surgeMap[videoId] = surgeScore;
            metricsMap[videoId] = {
              commentGrowthScore: stream.comment_growth_score || 0,
              keywordScore: stream.keyword_score || 0,
              superChatScore: stream.super_chat_score || 0,
              commentRate: stream.comment_rate || 0,
              commentGrowthRate: stream.comment_growth_rate || 0,
            };
          });

          setSurgeStreams(surgeMap);
          setCommentMetrics(metricsMap);

          // コンソールに表示
          logSurgeMetrics(data.streams || []);

          // 盛り上がり配信の音量を自動調整
          adjustVolumesForSurge(surgeMap);
        }
      } catch (err) {
        console.error('盛り上がり配信取得エラー:', err);
      }
    };

    fetchCommentMetrics();
    const interval = setInterval(fetchCommentMetrics, 30000); // 30秒ごと

    return () => clearInterval(interval);
  }, [selectedSessionId, userId]);

  // 盛り上がりメトリクスをコンソールに表示
  const logSurgeMetrics = (streams) => {
    if (!streams || streams.length === 0) return;

    console.log(`\n🔥 盛り上がり状況 [${new Date().toLocaleTimeString()}]`);
    console.log('='.repeat(80));

    streams
      .sort((a, b) => (b.surge_score || 0) - (a.surge_score || 0))
      .forEach((stream, index) => {
        const score = stream.surge_score || 0;
        const videoId = stream.video_id || stream.VideoID || 'unknown';
        const emoji = score > 0.7 ? '🔥🔥🔥' : score > 0.4 ? '🔥🔥' : score > 0.2 ? '🔥' : '📊';
        const style = score > 0.5 ? 'color: #ff0000; font-weight: bold' : 'color: #888';

        console.log(
          `%c${emoji} ${index + 1}. ${videoId}`,
          style
        );
        console.log(`   総合スコア: ${(score * 100).toFixed(1)}%`);
        console.log(`   - コメント増加: ${((stream.comment_growth_score || 0) * 100).toFixed(1)}%`);
        console.log(`   - 単語含有率: ${((stream.keyword_score || 0) * 100).toFixed(1)}%`);
        console.log(`   - スーパーチャット: ${((stream.super_chat_score || 0) * 100).toFixed(1)}%`);
        console.log(`   - コメント速度: ${(stream.comment_rate || 0).toFixed(2)} コメント/秒`);
      });

    console.log('='.repeat(80));
  };

  // 盛り上がり配信の音量自動調整
  const adjustVolumesForSurge = (surgeMap) => {
    // 盛り上がりスコアに基づいて音量を調整
    Object.entries(surgeMap).forEach(([videoId, score]) => {
      if (score > 0.3) { // 閾値: 0.3
        adjustStreamVolume(videoId, score);
      }
    });
  };

  // ストリームの音量を調整
  const adjustStreamVolume = (videoId, surgeScore) => {
    // スコアに基づいて音量を計算（例: 50 + surgeScore * 30 = 50-80の範囲）
    const targetVolume = Math.min(100, Math.max(50, 50 + surgeScore * 30));

    // メインモニターの音量調整
    if (mainVid === videoId && mainPlayerRef.current) {
      try {
        mainPlayerRef.current.setVolume(targetVolume);
      } catch (error) {
        console.error('メイン音量調整エラー:', error);
      }
    }

    // サブ・スモールモニターの音量調整
    // playersRefから該当するプレイヤーを探して調整
    // 注意: 現在の実装では、Monitor/SmallMonitorコンポーネント内で音量を管理しているため、
    // ここではログのみ出力（実際の調整はコンポーネント側で実装）
    console.log(`音量調整: VideoID=${videoId}, SurgeScore=${surgeScore.toFixed(2)}, TargetVolume=${targetVolume}`);
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

  // メインモニターの再生・一時停止の切り替え
  const toggleMainPlayPause = () => {
    if (!mainPlayerRef.current) return;

    try {
      const state = mainPlayerRef.current.getPlayerState();
      // 1: 再生中, 2: 一時停止中, 3: バッファリング中, 5: 動画終了
      if (state === 1) {
        mainPlayerRef.current.pauseVideo();
      } else {
        mainPlayerRef.current.playVideo();
      }
    } catch (error) {
      console.error('メイン再生制御エラー:', error);
    }
  };

  // メインモニターのクリックイベントハンドラー
  const handleMainMonitorClick = (e) => {
    // 音量バーやその他の操作可能要素の場合は無視
    if (e.target.closest('.volume-overlay') || e.target.closest('.volume-handle')) {
      return;
    }

    toggleMainPlayPause();
  };

  // 画面サイズに応じて.worldをスケール
  useEffect(() => {
    const updateScale = () => {
      if (!worldRef.current) return;

      const worldWidth = 3213; // 元の幅
      const worldHeight = 1357; // 元の高さ

      // 利用可能な領域を計算（検索パネルの幅を考慮）
      const availableWidth = window.innerWidth - (isMenuOpen ? 380 : 0);
      const availableHeight = window.innerHeight;

      // 幅と高さの両方に収まるスケールを計算
      const scaleX = availableWidth / worldWidth;
      const scaleY = availableHeight / worldHeight;
      const scale = Math.min(scaleX, scaleY); // 1を超えても良い（画面が大きい場合）

      setWorldScale(scale);

      // .world要素を中央配置（スケール後のサイズを考慮）
      const scaledWidth = worldWidth * scale;
      const scaledHeight = worldHeight * scale;
      const left = (availableWidth - scaledWidth) / 2;
      const top = (availableHeight - scaledHeight) / 2;

      if (worldRef.current) {
        worldRef.current.style.left = `${left}px`;
        worldRef.current.style.top = `${top}px`;
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);

    return () => {
      window.removeEventListener('resize', updateScale);
    };
  }, [isMenuOpen]);

  // レイアウトデータからモニター位置を取得
  const getLayoutForMonitor = (monitorId) => {
    // 現在のセッションに存在するストリームのレイアウトのみを返す
    const layout = roomLayouts.find(layout =>
      (layout.monitor_id || layout.MonitorID) === monitorId
    );

    // レイアウトが存在する場合、そのレイアウトが現在のセッションのストリームに対応しているか確認
    if (layout && currentSession) {
      const streams = currentSession.streams || currentSession.Streams || [];
      // monitorIdからstreamIdを抽出（例: "sub-2" -> 2）
      const streamIdMatch = monitorId.match(/(?:sub-|sm-)(\d+)/);
      if (streamIdMatch) {
        const streamId = parseInt(streamIdMatch[1], 10);
        const streamExists = streams.some(s => (s.id || s.ID) === streamId);
        if (!streamExists) {
          // ストリームが存在しない場合はnullを返す（削除されたモニターのレイアウト）
          return null;
        }
      }
    }

    return layout;
  };

  // セッションストリームをモニター用データ構造にマッピング
  const mapSessionStreamsToMonitors = (session) => {
    const streams = session?.streams || session?.Streams || [];
    if (!session || streams.length === 0) {
      return {
        mainVid: null,
        subData: [],
        smallData: []
      };
    }

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
          volume: streamVolume,
          surgeScore: surgeStreams[videoId] || 0
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
          volume: streamVolume,
          surgeScore: surgeStreams[videoId] || 0
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
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/9c3b95fe-856f-4f22-a41e-a1e48435e158', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'room.jsx:479', message: 'saveMonitorPosition called', data: { monitorId, userId, position }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'C' }) }).catch(() => { });
    // #endregion
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
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/9c3b95fe-856f-4f22-a41e-a1e48435e158', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'room.jsx:508', message: 'Before API call', data: { monitorId, existingLayout: !!existingLayout, layoutData }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'D' }) }).catch(() => { });
        // #endregion

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
          } else {
            // #region agent log
            const errorText = await response.text().catch(() => '');
            fetch('http://127.0.0.1:7243/ingest/9c3b95fe-856f-4f22-a41e-a1e48435e158', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'room.jsx:546', message: 'PUT layout error', data: { monitorId, status: response.status, errorText: errorText.substring(0, 300), layoutData }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'K' }) }).catch(() => { });
            // #endregion
            console.error('レイアウト更新エラー:', response.status, errorText);
          }
        } else {
          // 新規作成（初期保存）
          // 既存のレイアウトから必要なフィールドのみを抽出し、新しいレイアウトを追加
          const cleanLayouts = roomLayouts.map(l => ({
            monitor_id: l.monitor_id || l.MonitorID,
            video_id: l.video_id || l.VideoID || '',
            x: l.x || l.X || 0,
            y: l.y || l.Y || 0,
            rotate: l.rotate || l.Rotate || 0,
            width: l.width || l.Width || 0,
            height: l.height || l.Height || 0,
            z_index: l.z_index || l.ZIndex || 100,
            is_main: l.is_main || l.IsMain || false,
            is_oshi: l.is_oshi || l.IsOshi || false,
            label: l.label || l.Label || '',
            monitor_type: l.monitor_type || l.MonitorType || 'sub'
          }));
          const allLayouts = [...cleanLayouts, layoutData];
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/9c3b95fe-856f-4f22-a41e-a1e48435e158', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'room.jsx:560', message: 'POST request about to be sent', data: { monitorId, url: `${API_BASE_URL}/users/${userId}/room-layout`, bodySize: JSON.stringify(allLayouts).length, layoutCount: allLayouts.length }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'D' }) }).catch(() => { });
          // #endregion
          const response = await fetch(
            `${API_BASE_URL}/users/${userId}/room-layout`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(allLayouts)
            }
          );
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/9c3b95fe-856f-4f22-a41e-a1e48435e158', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'room.jsx:589', message: 'POST response received', data: { monitorId, status: response.status, statusText: response.statusText, ok: response.ok }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'D' }) }).catch(() => { });
          // #endregion
          if (response.ok) {
            const data = await response.json();
            setRoomLayouts(data.layouts || allLayouts);
          } else {
            // #region agent log
            let errorData;
            try {
              errorData = await response.json();
            } catch (e) {
              const errorText = await response.text().catch(() => '');
              errorData = { error: errorText };
            }
            fetch('http://127.0.0.1:7243/ingest/9c3b95fe-856f-4f22-a41e-a1e48435e158', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'room.jsx:597', message: 'POST layout error', data: { monitorId, status: response.status, errorData, layoutData, allLayoutsCount: allLayouts.length }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'K' }) }).catch(() => { });
            // #endregion
            console.error('レイアウト保存エラー:', response.status, errorData);
          }
        }
      } catch (err) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/9c3b95fe-856f-4f22-a41e-a1e48435e158', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'room.jsx:545', message: 'saveMonitorPosition error', data: { monitorId, error: err.message, stack: err.stack?.substring(0, 200) }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'D' }) }).catch(() => { });
        // #endregion
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

  const deleteMonitor = async (streamId, type) => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/9c3b95fe-856f-4f22-a41e-a1e48435e158', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'room.jsx:728', message: 'deleteMonitor called', data: { streamId, type, userId, selectedSessionId }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'B' }) }).catch(() => { });
    // #endregion
    if (!userId || !selectedSessionId) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/9c3b95fe-856f-4f22-a41e-a1e48435e158', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'room.jsx:729', message: 'deleteMonitor early return', data: { userId, selectedSessionId }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'C' }) }).catch(() => { });
      // #endregion
      return;
    }

    // 確認ダイアログ
    if (!confirm('このモニターを削除しますか？')) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/9c3b95fe-856f-4f22-a41e-a1e48435e158', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'room.jsx:732', message: 'deleteMonitor cancelled by user', data: { streamId }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'D' }) }).catch(() => { });
      // #endregion
      return;
    }

    try {
      const requestBody = {
        remove_stream_ids: [streamId]
      };
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/9c3b95fe-856f-4f22-a41e-a1e48435e158', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'room.jsx:735', message: 'Before API request', data: { streamId, url: `${API_BASE_URL}/users/${userId}/sessions/${selectedSessionId}`, requestBody }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'E' }) }).catch(() => { });
      // #endregion
      const response = await fetch(
        `${API_BASE_URL}/users/${userId}/sessions/${selectedSessionId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        }
      );

      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/9c3b95fe-856f-4f22-a41e-a1e48435e158', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'room.jsx:746', message: 'API response received', data: { streamId, status: response.status, statusText: response.statusText, ok: response.ok }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'E' }) }).catch(() => { });
      // #endregion

      if (response.ok) {
        // セッション情報を再取得
        const sessionResponse = await fetch(
          `${API_BASE_URL}/users/${userId}/sessions/${selectedSessionId}`
        );
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/9c3b95fe-856f-4f22-a41e-a1e48435e158', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'room.jsx:751', message: 'Session refresh response', data: { status: sessionResponse.status, ok: sessionResponse.ok }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'F' }) }).catch(() => { });
        // #endregion
        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json();
          const streams = sessionData.streams || sessionData.Streams || [];
          const streamIds = streams.map(s => s.id || s.ID);
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/9c3b95fe-856f-4f22-a41e-a1e48435e158', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'room.jsx:777', message: 'Setting current session', data: { streamCount: streams.length, streamIds, deletedStreamId: streamId, isDeleted: !streamIds.includes(streamId), rawSessionData: JSON.stringify(sessionData).substring(0, 1000) }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'F' }) }).catch(() => { });
          // #endregion

          // 削除されたモニターのレイアウトも削除
          const deletedMonitorId = type === "sub" ? `sub-${streamId}` : `sm-${streamId}`;
          try {
            const layoutDeleteResponse = await fetch(
              `${API_BASE_URL}/users/${userId}/room-layout/${deletedMonitorId}`,
              {
                method: 'DELETE'
              }
            );
            if (layoutDeleteResponse.ok) {
              // ローカルのレイアウト状態からも削除
              setRoomLayouts(prev => prev.filter(l =>
                (l.monitor_id || l.MonitorID) !== deletedMonitorId
              ));
            }
          } catch (err) {
            // レイアウト削除のエラーは無視（レイアウトが存在しない場合もある）
            console.warn('レイアウト削除エラー:', err);
          }

          setCurrentSession(sessionData);
        } else {
          // #region agent log
          const errorText = await sessionResponse.text().catch(() => '');
          fetch('http://127.0.0.1:7243/ingest/9c3b95fe-856f-4f22-a41e-a1e48435e158', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'room.jsx:785', message: 'Session refresh failed', data: { status: sessionResponse.status, errorText: errorText.substring(0, 200) }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'F' }) }).catch(() => { });
          // #endregion
        }
      } else {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          const errorText = await response.text().catch(() => '');
          errorData = { error: errorText || '不明なエラー' };
        }
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/9c3b95fe-856f-4f22-a41e-a1e48435e158', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'room.jsx:800', message: 'Delete API error', data: { streamId, error: errorData.error, status: response.status, errorData }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'E' }) }).catch(() => { });
        // #endregion
        setError(`削除エラー: ${errorData.error || '不明なエラー'}`);
      }
    } catch (err) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/9c3b95fe-856f-4f22-a41e-a1e48435e158', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'room.jsx:760', message: 'Delete exception', data: { streamId, error: err.message, stack: err.stack?.substring(0, 200) }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'G' }) }).catch(() => { });
      // #endregion
      console.error('モニター削除エラー:', err);
      setError(`モニター削除エラー: ${err.message}`);
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
    <div className="world-wrapper" ref={worldWrapperRef}>
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

      <div
        className="world"
        ref={worldRef}
        style={{
          transform: `scale(${worldScale})`,
        }}
      >
        <img src={roomImg} className="bg-layer" draggable="false" />
        <img
          src={monitorArmImg}
          className="part-arm"
          style={{ position: "absolute" }}
        />

        {subData.map((data) => {
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/9c3b95fe-856f-4f22-a41e-a1e48435e158', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'room.jsx:973', message: 'Rendering Monitor', data: { monitorId: data.id, streamId: data.streamId, hasStreamId: !!data.streamId }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'H' }) }).catch(() => { });
          // #endregion
          return (
            <Monitor
              key={data.id}
              {...data}
              frameImg={subMonitorFrameImg}
              onSwap={() => swapVideo(data.id, "sub")}
              onDelete={() => deleteMonitor(data.streamId, "sub")}
              volume={data.volume || 50}
              surgeScore={data.surgeScore || 0}
              onPositionChange={(position) => saveMonitorPosition(data.id, {
                ...position,
                videoId: data.vid,
                label: data.label,
                isMain: false,
                isOshi: data.isOshi,
                monitorType: 'sub'
              })}
            />
          );
        })}

        <div
          className="monitor-group main-fixed"
          style={{
            left: "1150px",
            top: "300px",
            position: "absolute",
            width: "800px",
          }}
          onClick={handleMainMonitorClick}
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
                style={{ width: "100%", pointerEvents: "none" }}
              />

              <Draggable
                nodeRef={mainHandleRef}
                axis="x"
                bounds="parent"
                defaultPosition={{ x: 100, y: 0 }}
                onStart={(e) => e.stopPropagation()}
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

        {smallData.map((data) => {
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/9c3b95fe-856f-4f22-a41e-a1e48435e158', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'room.jsx:1065', message: 'Rendering SmallMonitor', data: { monitorId: data.id, streamId: data.streamId, hasStreamId: !!data.streamId }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'H' }) }).catch(() => { });
          // #endregion
          return (
            <SmallMonitor
              key={data.id}
              {...data}
              frameImg={smallMonitorFrameImg}
              onSwap={() => swapVideo(data.id, "small")}
              onDelete={() => deleteMonitor(data.streamId, "small")}
              volume={data.volume || 50}
              surgeScore={data.surgeScore || 0}
              onPositionChange={(position) => saveMonitorPosition(data.id, {
                ...position,
                videoId: data.vid,
                label: data.label,
                isMain: false,
                isOshi: data.isOshi,
                monitorType: 'small'
              })}
            />
          );
        })}
      </div>
    </div>
  );
};

export default Room;