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
}) => {
  const nodeRef = useRef(null); // 本体用
  const handleRef = useRef(null); // つまみ用
  const [videoId, setVideoId] = useState(vid);

  useEffect(() => {
    setVideoId(vid);
  }, [vid]);

  const handleDrop = (e) => {
    e.preventDefault();
    const url = e.dataTransfer.getData("text");
    const match = url.match(/(?:v=|\/embed\/|youtu\.be\/)([^&?/]+)/);
    if (match) setVideoId(match[1]);
  };

  return (
    <Draggable nodeRef={nodeRef}>
      <div
        ref={nodeRef}
        className={`monitor-draggable-wrapper small-monitor ${
          isOshi ? "oshi-focus" : ""
        }`}
        style={{
          position: "absolute",
          left: `${x}px`,
          top: `${y}px`,
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
            <iframe
              src={`https://www.youtube.com/embed/${videoId}`}
              frameBorder="0"
              title={`small-${id}`}
            />
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
                defaultPosition={{x: 40, y: 0}}
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

export default SmallMonitor;
