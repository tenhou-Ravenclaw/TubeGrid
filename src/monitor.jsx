// Monitor.jsx
import React, { useRef, useEffect, useState } from "react";
import Draggable from "react-draggable";
import subVolumeImg from "./assets/subVolume-bar.png";

const Monitor = ({ id, x, y, rotate, vid, frameImg, onSwap, isOshi, label }) => {
  const nodeRef = useRef(null);
  const handleRef = useRef(null);
  const [videoId, setVideoId] = useState(vid);

  useEffect(() => { setVideoId(vid); }, [vid]);

  return (
    <Draggable nodeRef={nodeRef}>
      <div
        ref={nodeRef}
        className={`monitor-draggable-wrapper ${isOshi ? "oshi-focus" : ""}`}
        style={{ position: "absolute", left: `${x}px`, top: `${y}px`, zIndex: isOshi ? 150 : 100 }}
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
            <iframe src={`https://www.youtube.com/embed/${videoId}`} frameBorder="0" title={`monitor-${id}`} />
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
                defaultPosition={{ x: 50, y: 0 }}
                onStart={(e) => e.stopPropagation()}
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