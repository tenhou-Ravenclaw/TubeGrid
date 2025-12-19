// SmallMonitor.jsx
import React, { useRef, useEffect, useState } from "react";
import Draggable from "react-draggable";

// props に id, vid (defaultVidから変更), onSwap, isOshi, label を追加
const SmallMonitor = ({ id, x, y, rotate, vid, frameImg, onSwap, isOshi, label }) => {
  const nodeRef = useRef(null);
  const [videoId, setVideoId] = useState(vid);

  // メインモニターとの入れ替え（vidの変更）を検知して画面を更新
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
        // 推しなら .oshi-focus クラスを付与
        className={`monitor-draggable-wrapper small-monitor ${isOshi ? "oshi-focus" : ""}`}
        style={{
          position: "absolute",
          left: `${x}px`,
          top: `${y}px`,
          width: "300px", 
          // 推しなら少し手前に、通常ならサブモニター(100)より背面に
          zIndex: isOshi ? 150 : 80, 
        }}
        // ★ダブルクリックで入れ替え実行
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
          {/* ★推しバッジ（小さいモニター用スタイル） */}
          {isOshi && <div className="oshi-badge small">推し</div>}

          <div className="screen-inside small-screen">
            <iframe
              src={`https://www.youtube.com/embed/${videoId}`}
              frameBorder="0"
              title={`small-${id}`}
            />
            {/* 識別ラベル */}
            <div className="monitor-label small-label">{label}</div>
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