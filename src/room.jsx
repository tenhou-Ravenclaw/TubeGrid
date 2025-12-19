import React, {useRef} from "react";
import Draggable from "react-draggable";
import "./Room.css";
import roomImg from "./assets/room.png";
import monitorFrameImg from "./assets/main-monitor-frame.png";
import monitorArmImg from "./assets/monitor-arm.png";
import subMonitorFrameImg from "./assets/sub-monitor1-frame.png";
import Monitor from "./monitor"; // さっき作った部品を読み込む

const Room = () => {
  // 画像「部屋（仮）.jpg」の配置を参考にした座標データ
  const subData = [
    {id: "sub1", x: 450, y: 300, vid: "fSAtD36VPhI"}, // メイン左上
    {id: "sub2", x: 600, y: 180, vid: "dQw4w9WgXcQ"}, // メイン上中央
    {id: "sub3", x: 950, y: 300, vid: "fSAtD36VPhI"}, // メイン右上
    {id: "sub4", x: 500, y: 600, vid: "dQw4w9WgXcQ"}, // メイン左下
    {id: "sub5", x: 950, y: 650, vid: "fSAtD36VPhI"}, // メイン右下
  ];

  return (
    <div className="world-wrapper">
      <div className="world">
        <img src={roomImg} className="bg-layer" draggable="false" />
        {/* メインモニター（固定） */}
        <div
          className="monitor-group main-fixed"
          style={{left: "1200px", top: "350px"}}
        >
          <img src={monitorArmImg} className="part-arm" />
          <div className="screen-inside main-screen">
            <iframe src="https://www.youtube.com/embed/LIVE_ID_MAIN" />
          </div>
          <img src={monitorFrameImg} className="part-frame" />
        </div>
        {/* サブモニター群（mapで展開） */}
        // Room.jsx の map 部分を書き換え
        {subData.map((data) => (
          <Monitor
            key={data.id}
            // initialPos ではなく x と y をそのまま渡す
            x={data.x}
            y={data.y}
            frameImg={subMonitorFrameImg}
            defaultVid={data.vid}
          />
        ))}
      </div>
    </div>
  );
};

export default Room;
