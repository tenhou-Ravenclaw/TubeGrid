import React, {useRef, useEffect, useState} from "react";
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
  isOshi,
  label,
  onPositionChange,
  volume: propVolume = 50,
}) => {
  const nodeRef = useRef(null); // 本体用
  const handleRef = useRef(null); // つまみ用
  const [videoId, setVideoId] = useState(vid);
  const [position, setPosition] = useState({ x, y });
  const [volume, setVolume] = useState(propVolume);
  const playerRef = useRef(null);
  const [volumePosition, setVolumePosition] = useState({ x: 40, y: 0 });

  useEffect(() => {
    setVideoId(vid);
  }, [vid]);
  useEffect(() => {
    setPosition({ x, y });
  }, [x, y]);
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

  const handleDragStop = (e, data) => {
    const newPosition = {
      x: data.x,
      y: data.y,
      rotate: rotate || 0,
      width: 300,
      height: 0,
      zIndex: isOshi ? 150 : 80
    };
    setPosition(newPosition);
    if (onPositionChange) {
      onPositionChange(newPosition);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const url = e.dataTransfer.getData("text");
    const match = url.match(/(?:v=|\/embed\/|youtu\.be\/)([^&?/]+)/);
    if (match) setVideoId(match[1]);
  };

  return (
    <Draggable nodeRef={nodeRef} onStop={handleDragStop} position={position}>
      <div
        ref={nodeRef}
        className={`monitor-draggable-wrapper small-monitor ${
          isOshi ? "oshi-focus" : ""
        }`}
        style={{
          position: "absolute",
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: "300px",
          zIndex: isOshi ? 150 : 80,
        }}
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
                style={{width: "100%"}}
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
