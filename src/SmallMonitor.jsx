// SmallMonitor.jsx
import React, { useRef, useState } from "react";
import Draggable from "react-draggable";

const SmallMonitor = ({ x, y, rotate, frameImg, defaultVid }) => {
  const nodeRef = useRef(null);
  const [videoId, setVideoId] = useState(defaultVid);

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
        className="monitor-draggable-wrapper"
        style={{
          position: "absolute",
          left: `${x}px`,
          top: `${y}px`,
          width: "300px", // さらに小さいモニターなので300px程度に
          zIndex: 100
        }}
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
          {/* 小さいモニター専用の画面クラス */}
          <div className="screen-inside small-screen">
            <iframe
              src={`https://www.youtube.com/embed/${videoId}`}
              frameBorder="0"
            />
          </div>
          <img
            src={frameImg}
            className="part-frame"
            draggable="false"
            alt="small-frame"
          />
        </div>
      </div>
    </Draggable>
  );
};

export default SmallMonitor;