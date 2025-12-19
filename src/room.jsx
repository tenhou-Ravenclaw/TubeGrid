import React, {useRef} from "react";
import Draggable from "react-draggable";
import "./Room.css";
import roomImg from "./assets/room.png";
import monitorFrameImg from "./assets/main-monitor-frame.png";
import monitorArmImg from "./assets/monitor-arm.png";

const Room = () => {
  // メインモニターは固定なので Ref 不要（動かさないため）
  // サブモニター用の Ref を作成
  const subRef1 = useRef(null);

  return (
    <div className="world-wrapper">
      <div className="world">
        {/* --- 背景画像 --- */}
        <img src={roomImg} className="bg-layer" draggable="false" />

        {/* --- ① メインモニター（固定） --- */}
        {/* Draggable で囲まないことで、位置が固定されます */}
        <div 
          className="monitor-group main-fixed" 
          style={{ left: "1200px", top: "350px" }} // 固定したい座標を指定
        >
          <img src={monitorArmImg} className="part-arm" draggable="false" />
          <div className="screen-inside">
            <iframe src="https://www.youtube.com/embed/LIVE_ID_MAIN" frameBorder="0" />
          </div>
          <img src={monitorFrameImg} className="part-frame" draggable="false" />
        </div>

        {/* --- ② サブモニター（動かせる） --- */}
        <Draggable nodeRef={subRef1}>
          <div 
            ref={subRef1} 
            className="monitor-group sub-movable" 
            style={{ left: "500px", top: "200px", width: "500px" }} // サブは少し小さめに
          >
            <div className="screen-inside">
              <iframe src="https://www.youtube.com/embed/LIVE_ID_SUB" frameBorder="0" />
            </div>
            <img src={monitorFrameImg} className="part-frame" draggable="false" />
          </div>
        </Draggable>

      </div>
    </div>
  );
};

export default Room;
