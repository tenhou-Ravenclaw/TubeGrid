import React, {useRef} from "react";
import Draggable from "react-draggable";
import "./Room.css";
import roomImg from "./assets/room.png";
import monitorFrameImg from "./assets/main-monitor-frame.png";
import monitorArmImg from "./assets/monitor-arm.png";

const Room = () => {
  const mainRef = useRef(null);

  return (
    <div className="world-wrapper">
      <div className="world">
        {/* 背景画像 */}
        <img
          src={roomImg}
          className="bg-layer"
          draggable="false"
          alt="background"
        />

        <Draggable nodeRef={mainRef}>
          {/* ★Draggableの直下は必ずこの1枚のdivだけにします */}
          <div
            ref={mainRef}
            className="monitor-group"
            style={{ left: "500px", top: "200px" }}
          >
            {/* 1. 一番下：アーム */}
            <img src={monitorArmImg} className="part-arm" draggable="false" />

            {/* 2. 真ん中：YouTube配信画面 */}
            <div className="screen-inside">
              <iframe
                src="https://www.youtube.com/embed/fSAtD36VPhI" /* テスト用に動画IDを入れました */
                frameBorder="0"
                style={{ width: "100%", height: "100%" }}
              />
            </div>

            {/* 3. 一番上：モニターの枠（穴あき） */}
            <img
              src={monitorFrameImg}
              className="part-frame"
              draggable="false"
            />
          </div>
        </Draggable>
      </div>
    </div>
  );
};

export default Room;
