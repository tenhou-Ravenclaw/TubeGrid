import React, { useRef, useEffect, useState } from "react";
import Draggable from "react-draggable";
import subVolumeImg from "./assets/subVolume-bar.png";

const SmallMonitor = ({
  id,
  x,
  y,
  rotate,
  vid,
  frameImg,
  onSwap,
  onDelete,
  isOshi,
  label,
  onPositionChange,
  volume: propVolume = 50,
  surgeScore = 0,
}) => {
  const createPosition = (xPos, yPos) => ({
    x: xPos,
    y: yPos,
    rotate: rotate || 0,
    width: 300,
    height: 0,
    zIndex: isOshi ? 650 : 600, // 小モニターもメイン(500)より前に出す
  });

  const nodeRef = useRef(null); // 本体用
  const handleRef = useRef(null); // つまみ用
  const [videoId, setVideoId] = useState(vid);
  const [position, setPosition] = useState(() => createPosition(x, y));
  const lastValidPositionRef = useRef(createPosition(x, y));
  const [volume, setVolume] = useState(propVolume);
  const playerRef = useRef(null);
  const [volumePosition, setVolumePosition] = useState({ x: 40, y: 0 });
  const [isPlaying, setIsPlaying] = useState(true); // 再生状態を追跡

  // クリック/ホールド検出用
  const holdTimerRef = useRef(null);
  const isDraggingRef = useRef(false);
  const isHoldingRef = useRef(false);
  const mouseDownTimeRef = useRef(0);

  useEffect(() => {
    setVideoId(vid);
  }, [vid]);
  useEffect(() => {
    const nextPosition = createPosition(x, y);
    setPosition(nextPosition);
    lastValidPositionRef.current = nextPosition;
  }, [x, y, rotate, isOshi]);
  useEffect(() => {
    setVolume(propVolume);
  }, [propVolume]);

  // YouTube Player初期化
  useEffect(() => {
    if (!window.YT || !window.YT.Player || !videoId) return;

    const playerId = `small-player-${id}`;
    let player = null;

    function initializePlayer() {
      if (!window.YT || !window.YT.Player) return;

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
            event.target.setVolume(volume);
            playerRef.current = event.target;
          },
        },
      });
    }

    if (window.YT && window.YT.Player) {
      initializePlayer();
    }

    return () => {
      if (player && player.destroy) {
        player.destroy();
      }
      playerRef.current = null;
    };
  }, [videoId, id]);

  // 音量変更
  useEffect(() => {
    if (playerRef.current && playerRef.current.setVolume) {
      try {
        playerRef.current.setVolume(volume);
      } catch (error) {
        console.error('音量設定エラー:', error);
      }
    }
  }, [volume]);

  // 再生状態の更新
  useEffect(() => {
    if (!playerRef.current) return;

    const updatePlayState = () => {
      try {
        const state = playerRef.current.getPlayerState();
        // 1: 再生中, 2: 一時停止中, 3: バッファリング中, 5: 動画終了
        setIsPlaying(state === 1 || state === 3);
      } catch (error) {
        console.error('再生状態取得エラー:', error);
      }
    };

    // 定期的に再生状態を更新（500msごと）
    const interval = setInterval(updatePlayState, 500);
    updatePlayState(); // 初回実行

    return () => clearInterval(interval);
  }, [playerRef.current]);

  // 再生・一時停止の切り替え
  const togglePlayPause = (e) => {
    if (e) {
      e.stopPropagation();
    }
    if (!playerRef.current) return;

    try {
      const state = playerRef.current.getPlayerState();
      // 1: 再生中, 2: 一時停止中, 3: バッファリング中, 5: 動画終了
      if (state === 1) {
        playerRef.current.pauseVideo();
        setIsPlaying(false);
      } else {
        playerRef.current.playVideo();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('再生制御エラー:', error);
    }
  };

  // マウスダウン: ホールド検出開始
  const handleMouseDown = (e) => {
    // 音量バーやその他の操作可能要素の場合は無視
    if (e.target.closest('.volume-overlay') || e.target.closest('.volume-handle')) {
      return;
    }

    mouseDownTimeRef.current = Date.now();
    isHoldingRef.current = false;
    isDraggingRef.current = false;

    // 300ms後にホールドと判定
    holdTimerRef.current = setTimeout(() => {
      isHoldingRef.current = true;
    }, 300);
  };

  // マウスアップ: クリック判定
  const handleMouseUp = (e) => {
    // 音量バーやその他の操作可能要素の場合は無視
    if (e.target.closest('.volume-overlay') || e.target.closest('.volume-handle')) {
      return;
    }

    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }

    const holdDuration = Date.now() - mouseDownTimeRef.current;

    // ドラッグ中でなく、短いクリック（300ms未満）の場合は再生・一時停止
    if (!isDraggingRef.current && !isHoldingRef.current && holdDuration < 300) {
      togglePlayPause();
    }

    isHoldingRef.current = false;
  };

  // 盛り上がりスコアに基づいてクラス名を決定
  const getSurgeClass = () => {
    if (surgeScore > 0.7) return 'surge-high';
    if (surgeScore > 0.4) return 'surge-medium';
    return '';
  };

  const isWithinViewport = () => {
    if (!nodeRef.current) return true;
    const rect = nodeRef.current.getBoundingClientRect();
    const margin = 8;
    return (
      rect.left >= margin &&
      rect.top >= margin &&
      rect.right <= window.innerWidth - margin &&
      rect.bottom <= window.innerHeight - margin
    );
  };

  // ドラッグ開始時の処理
  const handleDragStart = () => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/9c3b95fe-856f-4f22-a41e-a1e48435e158', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'SmallMonitor.jsx:149', message: 'handleDragStart called', data: { monitorId: id, isDraggingBefore: isDraggingRef.current }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
    // #endregion
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    isDraggingRef.current = true;
  };

  const handleDragStop = (e, data) => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/9c3b95fe-856f-4f22-a41e-a1e48435e158', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'SmallMonitor.jsx:157', message: 'handleDragStop called', data: { monitorId: id, isDragging: isDraggingRef.current, position: { x: data.x, y: data.y }, currentPosition: { x: position.x, y: position.y } }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'post-fix', hypothesisId: 'A' }) }).catch(() => { });
    // #endregion
    const newPosition = createPosition(data.x, data.y);
    const positionChanged = data.x !== position.x || data.y !== position.y;
    const withinViewport = isWithinViewport();
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/9c3b95fe-856f-4f22-a41e-a1e48435e158', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'SmallMonitor.jsx:166', message: 'Before onPositionChange', data: { monitorId: id, isDragging: isDraggingRef.current, positionChanged }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'post-fix', hypothesisId: 'B' }) }).catch(() => { });
    // #endregion
    if (withinViewport) {
      setPosition(newPosition);
      lastValidPositionRef.current = newPosition;
      // 実際にドラッグが発生し、位置が変わった場合のみ位置を保存
      if (onPositionChange && isDraggingRef.current && positionChanged) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/9c3b95fe-856f-4f22-a41e-a1e48435e158', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'SmallMonitor.jsx:170', message: 'Calling onPositionChange', data: { monitorId: id, newPosition }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'post-fix', hypothesisId: 'A' }) }).catch(() => { });
        // #endregion
        onPositionChange(newPosition);
      }
    } else {
      setPosition(lastValidPositionRef.current);
    }
    isDraggingRef.current = false;
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const url = e.dataTransfer.getData("text");
    const match = url.match(/(?:v=|\/embed\/|youtu\.be\/)([^&?/]+)/);
    if (match) setVideoId(match[1]);
  };

  return (
    <Draggable
      nodeRef={nodeRef}
      onStop={handleDragStop}
      onStart={handleDragStart}
      position={position}
      bounds={{ left: -1000, top: -1000, right: 4000, bottom: 2000 }}
    >
      <div
        ref={nodeRef}
        className={`monitor-draggable-wrapper small-monitor ${isOshi ? "oshi-focus" : ""
          } ${getSurgeClass()}`}
        style={{
          position: "absolute",
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: "300px",
          zIndex: position.zIndex,
        }}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onDoubleClick={onSwap}
      >
        <div
          className="monitor-group small-movable"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          style={{
            width: "100%",
            transform: `rotate(${rotate}deg)`,
            transformOrigin: "center center",
          }}
        >
          {onDelete && (
            <button
              className="monitor-delete-btn small"
              onClick={(e) => {
                // #region agent log
                fetch('http://127.0.0.1:7243/ingest/9c3b95fe-856f-4f22-a41e-a1e48435e158', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'SmallMonitor.jsx:231', message: 'Delete button clicked', data: { monitorId: id, hasOnDelete: !!onDelete }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
                // #endregion
                e.stopPropagation();
                // #region agent log
                fetch('http://127.0.0.1:7243/ingest/9c3b95fe-856f-4f22-a41e-a1e48435e158', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'SmallMonitor.jsx:234', message: 'Calling onDelete', data: { monitorId: id }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
                // #endregion
                onDelete();
              }}
              title="モニターを削除"
            >
              ×
            </button>
          )}
          {surgeScore > 0.4 && (
            <div className="surge-indicator small" style={{
              position: 'absolute',
              top: '3px',
              left: '30px',
              background: 'rgba(255, 0, 0, 0.8)',
              color: 'white',
              padding: '1px 4px',
              borderRadius: '3px',
              fontSize: '9px',
              zIndex: 1001,
              fontWeight: 'bold'
            }}>
              🔥 {Math.round(surgeScore * 100)}%
            </div>
          )}
          <button
            className="monitor-play-pause-btn small"
            onClick={togglePlayPause}
            title={isPlaying ? "一時停止" : "再生"}
          >
            {isPlaying ? "⏸" : "▶"}
          </button>
          {isOshi && <div className="oshi-badge small">推し</div>}

          <div className="screen-inside small-screen">
            {window.YT && window.YT.Player && videoId ? (
              <div id={`small-player-${id}`} style={{ width: '100%', height: '100%' }}></div>
            ) : (
              <iframe
                src={`https://www.youtube.com/embed/${videoId}`}
                frameBorder="0"
                title={`small-${id}`}
              />
            )}
            <div className="monitor-label small-label">{label}</div>
          </div>
          <img
            src={frameImg}
            className="part-frame"
            draggable="false"
            alt="small-frame"
          />

          {/* 音量バーエリア */}
          <div className="volume-overlay small-volume">
            <div
              style={{
                position: "relative",
                width: "100%",
                display: "flex",
                alignItems: "center",
              }}
            >
              <img
                src={subVolumeImg}
                alt="volume-bar"
                className="volume-bar-img"
                style={{ width: "100%" }}
              />
              <Draggable
                nodeRef={handleRef}
                axis="x"
                bounds="parent"
                position={volumePosition}
                onStart={(e) => e.stopPropagation()}
                onDrag={(e, data) => {
                  const parentWidth = data.node.parentElement.offsetWidth;
                  const newVolume = Math.round((data.x / parentWidth) * 100);
                  const clampedVolume = Math.max(0, Math.min(100, newVolume));
                  setVolume(clampedVolume);
                  setVolumePosition({ x: data.x, y: 0 });
                }}
              >
                <div ref={handleRef} className="volume-handle" />
              </Draggable>
            </div>
          </div>
        </div>
      </div>
    </Draggable>
  );
};

export default SmallMonitor;
