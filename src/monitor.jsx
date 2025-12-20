// Monitor.jsx
import React, { useRef, useEffect, useState } from "react";
import Draggable from "react-draggable";
import subVolumeImg from "./assets/subVolume-bar.png";

const Monitor = ({ id, x, y, rotate, vid, frameImg, onSwap, isOshi, label, onPositionChange, volume: propVolume = 50 }) => {
  const nodeRef = useRef(null);
  const handleRef = useRef(null);
  const [videoId, setVideoId] = useState(vid);
  const [position, setPosition] = useState({ x, y });
  const [volume, setVolume] = useState(propVolume);
  const playerRef = useRef(null);
  const [volumePosition, setVolumePosition] = useState({ x: 50, y: 0 });

  useEffect(() => { setVideoId(vid); }, [vid]);
  useEffect(() => { setPosition({ x, y }); }, [x, y]);
  useEffect(() => { setVolume(propVolume); }, [propVolume]);
  
  // YouTube Player初期化
  useEffect(() => {
    if (!window.YT || !window.YT.Player || !videoId) return;

    const playerId = `sub-player-${id}`;
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
      width: 0,
      height: 0,
      zIndex: isOshi ? 150 : 100
    };
    setPosition(newPosition);
    if (onPositionChange) {
      onPositionChange(newPosition);
    }
  };

  return (
    <Draggable nodeRef={nodeRef} onStop={handleDragStop} position={position}>
      <div
        ref={nodeRef}
        className={`monitor-draggable-wrapper ${isOshi ? "oshi-focus" : ""}`}
        style={{ position: "absolute", left: `${position.x}px`, top: `${position.y}px`, zIndex: isOshi ? 150 : 100 }}
        onDoubleClick={onSwap}
      >
        <div 
          className="monitor-group" 
          style={{ 
            transform: `rotate(${rotate}deg)`, 
            transformOrigin: "center center",
            width: "100%" 
          }}
        >
          <div className="screen-inside sub-screen">
            {window.YT && window.YT.Player && videoId ? (
              <div id={`sub-player-${id}`} style={{ width: '100%', height: '100%' }}></div>
            ) : (
              <iframe src={`https://www.youtube.com/embed/${videoId}`} frameBorder="0" title={`monitor-${id}`} />
            )}
            <div className="monitor-label small">{label}</div>
          </div>

          <img src={frameImg} className="part-frame" draggable="false" alt="frame" style={{ width: "100%", height: "auto" }} />

          <div className="volume-overlay sub-volume">
            <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center" }}>
              <img src={subVolumeImg} alt="volume-bar" style={{ width: "100%", pointerEvents: "none" }} />
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

export default Monitor;