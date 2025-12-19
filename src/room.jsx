import React, {useRef} from "react";
import Draggable from "react-draggable";
import "./Room.css";
import roomImg from "./assets/room.png";
import monitorFrameImg from "./assets/main-monitor-frame.png";
import monitorArmImg from "./assets/monitor-arm.png";
import subMonitorFrameImg from "./assets/sub-monitor1-frame.png";
import Monitor from "./monitor"; // さっき作った部品を読み込む

const Room = () => {
  const subData = [
    // x, y に加えて rotate (角度) を追加
    {id: "sub1", x: 820, y: 300, vid: "fSAtD36VPhI", rotate: -10}, // 少し左に傾ける
    {id: "sub2", x: 1370, y: 70, vid: "dQw4w9WgXcQ", rotate: 0}, // まっすぐ
    {id: "sub3", x: 1900, y: 300, vid: "fSAtD36VPhI", rotate: 10}, // 右に傾ける
    {id: "sub4", x: 860, y: 760, vid: "dQw4w9WgXcQ", rotate: 15}, // 大きく左傾斜
    {id: "sub5", x: 1850, y: 800, vid: "fSAtD36VPhI", rotate: -15}, // 右下に傾斜
  ];

  return (
    <div className="world-wrapper">
      <div className="world">
        {/* 1. 背景 (z-index: 1) */}
        <img src={roomImg} className="bg-layer" draggable="false" />

        {/* 2. モニターアーム (アームだけを背景のすぐ上に置く) */}
        {/* メインモニターのグループから外に出すと、サブモニターの下に潜り込ませやすいです */}
        <img
          src={monitorArmImg}
          className="part-arm"
          style={{position: "absolute"}}
        />

        {/* 3. サブモニター群 (z-index: 100) */}
        {subData.map((data) => (
          <Monitor
            key={data.id}
            x={data.x}
            y={data.y}
            rotate={data.rotate}
            frameImg={subMonitorFrameImg}
            defaultVid={data.vid}
          />
        ))}

        {/* 4. メインモニターの本体 (z-index: 500) */}
        <div
          className="monitor-group main-fixed"
          style={{left: "1200px", top: "350px", position: "absolute"}}
        >
          <div className="screen-inside main-screen">
            <iframe src="https://www.youtube.com/embed/LIVE_ID_MAIN" />
          </div>
          <img src={monitorFrameImg} className="part-frame" />
        </div>
      </div>
    </div>
  );
};

export default Room;
