// Monitor.jsx

import React, {useRef, useState} from "react";
import Draggable from "react-draggable";

const Monitor = ({x, y, rotate, frameImg, defaultVid}) => {
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
      {/* 1. 外側の箱：移動（Draggable）を担当 */}
      <div
        ref={nodeRef}
        className="monitor-draggable-wrapper"
        style={{
          position: "absolute",
          left: `${x}px`,
          top: `${y}px`,
          width: "500px",
          zIndex: 100
        }}
      >
        {/* 2. 内側の箱：回転（rotate）を担当 */}
        <div
          className="monitor-group sub-movable"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          style={{
            width: "100%",
            transform: `rotate(${rotate}deg)`,
            transformOrigin: "center center",
          }}
        >
          <div className="screen-inside sub-screen">
            <iframe
              src={`https://www.youtube.com/embed/${videoId}`}
              frameBorder="0"
            />
          </div>
          <img
            src={frameImg}
            className="part-frame"
            draggable="false"
            alt="frame"
          />
        </div>
      </div>
    </Draggable>
  );
};

export default Monitor;