// Monitor.jsx

import React, { useRef, useState } from "react"; 
import Draggable from "react-draggable";

// 修正前: const Monitor = ({ id, initialPos, frameImg, defaultVid }) => {
// 修正後: x と y を追加します
const Monitor = ({ x, y, frameImg, defaultVid }) => {
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
        className="monitor-group sub-movable"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        style={{ 
          width: "500px", 
          position: "absolute", 
          left: `${x}px`, // ここで x を使っているので、上で受け取らないとエラーになる
          top: `${y}px`,  // y も同様
        }}
      >
        <div className="screen-inside sub-screen">
          <iframe 
            src={`https://www.youtube.com/embed/${videoId}`} 
            frameBorder="0"
          />
        </div>
        <img src={frameImg} className="part-frame" draggable="false" alt="frame" />
      </div>
    </Draggable>
  );
};

// Monitor.jsx の一番下に追加
export default Monitor;