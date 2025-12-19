// Monitor.jsx
import React, {useRef, useEffect, useState} from "react";
import Draggable from "react-draggable";
import subVolumeImg from "./assets/subVolume-bar.png";

// propsに id, vid, onSwap, isOshi, label を追加
const Monitor = ({id, x, y, rotate, vid, frameImg, onSwap, isOshi, label}) => {
  const nodeRef = useRef(null);

  // APIやRoom.jsxからの動画ID変更を反映させるためにuseEffectを使う
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
      {/* 移動を担当する外枠 */}
      <div
        ref={nodeRef}
        className={`monitor-draggable-wrapper ${isOshi ? "oshi-focus" : ""}`}
        style={{
          position: "absolute",
          left: `${x}px`,
          top: `${y}px`,
          width: "500px",
          // 推しの場合は他のモニターより手前に表示
          zIndex: isOshi ? 150 : 100,
        }}
        // ★ダブルクリックでRoom.jsxのswapVideoを発動
        onDoubleClick={onSwap}
      >
        
        {/* 回転を担当する内枠 */}
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
          {/* ★STEP 7: 最推しバッジ（isOshiがtrueの時だけ表示） */}
          {isOshi && <div className="oshi-badge">最推し</div>}

          <div className="screen-inside sub-screen">
            <iframe
              src={`https://www.youtube.com/embed/${videoId}`}
              frameBorder="0"
              title={`monitor-${id}`}
            />
            {/* ★STEP 2: 識別ラベル */}
            <div className="monitor-label small">{label}</div>
            {/* --- STEP 6: 音量バーの追加 --- */}
            <div className="volume-overlay">
              <img src={subVolumeImg} alt="volume" />
            </div>
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
