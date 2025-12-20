import React, {useRef, useState} from "react";
import Draggable from "react-draggable";
import "./Room.css";
import roomImg from "./assets/room.png";
import monitorFrameImg from "./assets/main-monitor-frame.png";
import monitorArmImg from "./assets/monitor-arm.png";
import subMonitorFrameImg from "./assets/sub-monitor1-frame.png";
import Monitor from "./monitor";
import SmallMonitor from "./SmallMonitor";
import smallMonitorFrameImg from "./assets/small-monitor-frame.png";
import menuIconImg from "./assets/menu-icon.png";
import searchIconImg from "./assets/search-icon.png";
import youtubeIconImg from "./assets/youtube-icon.png";
import mainVolumeImg from "./assets/volume-bar.png";

const Room = () => {
  // ★【重要】React 18のエラーを防ぐためのつまみ専用Ref
  const mainHandleRef = useRef(null);

  // --- 1. 状態管理（State） ---
  const [mainVid, setMainVid] = useState("LIVE_ID_MAIN");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  // --- 2. 初期データ（略） ---
  const INITIAL_SUB_DATA = [
    {
      id: "sub1",
      x: 920,
      y: 300,
      vid: "fSAtD36VPhI",
      rotate: -10,
      label: "推し1",
    },
    {id: "sub2", x: 1370, y: 70, vid: "dQw4w9WgXcQ", rotate: 0, label: "推し2"},
    {
      id: "sub3",
      x: 1800,
      y: 300,
      vid: "fSAtD36VPhI",
      rotate: 10,
      label: "推し3",
    },
    {
      id: "sub4",
      x: 860,
      y: 760,
      vid: "dQw4w9WgXcQ",
      rotate: 15,
      label: "推し4",
    },
    {
      id: "sub5",
      x: 1850,
      y: 800,
      vid: "fSAtD36VPhI",
      rotate: -15,
      label: "推し5",
    },
  ];

  const INITIAL_SMALL_DATA = [
    {
      id: "sm-l1",
      x: 270,
      y: 100,
      rotate: 0,
      vid: "fSAtD36VPhI",
      label: "監視 01",
      isOshi: false,
    },
    {
      id: "sm-l2",
      x: 600,
      y: 220,
      rotate: 0,
      vid: "dQw4w9WgXcQ",
      label: "監視 02",
      isOshi: false,
    },
    {
      id: "sm-l3",
      x: 320,
      y: 420,
      rotate: 0,
      vid: "fSAtD36VPhI",
      label: "監視 03",
      isOshi: false,
    },
    {
      id: "sm-l4",
      x: 530,
      y: 660,
      rotate: 0,
      vid: "dQw4w9WgXcQ",
      label: "監視 04",
      isOshi: false,
    },
    {
      id: "sm-l5",
      x: 240,
      y: 860,
      rotate: 0,
      vid: "fSAtD36VPhI",
      label: "監視 05",
      isOshi: false,
    },
    {
      id: "sm-r1",
      x: 2630,
      y: 100,
      rotate: 0,
      vid: "dQw4w9WgXcQ",
      label: "監視 06",
      isOshi: false,
    },
    {
      id: "sm-r2",
      x: 2310,
      y: 220,
      rotate: 0,
      vid: "fSAtD36VPhI",
      label: "監視 07",
      isOshi: false,
    },
    {
      id: "sm-r3",
      x: 2560,
      y: 420,
      rotate: 0,
      vid: "dQw4w9WgXcQ",
      label: "監視 08",
      isOshi: true,
    },
    {
      id: "sm-r4",
      x: 2380,
      y: 660,
      rotate: 0,
      vid: "fSAtD36VPhI",
      label: "監視 09",
      isOshi: false,
    },
    {
      id: "sm-r5",
      x: 2650,
      y: 860,
      rotate: 0,
      vid: "dQw4w9WgXcQ",
      label: "監視 10",
      isOshi: false,
    },
  ];

  const [subData, setSubData] = useState(INITIAL_SUB_DATA);
  const [smallData, setSmallData] = useState(INITIAL_SMALL_DATA);

  // --- 3. ロジック（略） ---
  const swapVideo = (id, type) => {
    const oldMainVid = mainVid;
    let targetVid = "";
    if (type === "sub") {
      const target = subData.find((s) => s.id === id);
      targetVid = target.vid;
      setSubData(
        subData.map((s) => (s.id === id ? {...s, vid: oldMainVid} : s))
      );
    } else {
      const target = smallData.find((s) => s.id === id);
      targetVid = target.vid;
      setSmallData(
        smallData.map((s) => (s.id === id ? {...s, vid: oldMainVid} : s))
      );
    }
    setMainVid(targetVid);
  };

  const handleSearch = async () => {
    if (!searchQuery) return;
    console.log("バックエンド：APIを叩いてください:", searchQuery);
  };

  return (
    <div className="world-wrapper">
      {/* メニューボタン */}
      <button
        className="menu-trigger"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
      >
        <img src={menuIconImg} alt="menu" />
      </button>

      {/* スライドパネル */}
      <div className={`search-panel ${isMenuOpen ? "open" : ""}`}>
        <div className="search-container">
          <div className="search-logo">
            <img src={youtubeIconImg} alt="YouTube" />
          </div>
          <div className="search-bar">
            <input
              type="text"
              placeholder="検索"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <button className="search-btn" onClick={handleSearch}>
              <img src={searchIconImg} alt="検索" />
            </button>
          </div>
        </div>
        <div className="search-results-list">
          {searchResults.map((video) => (
            <div
              key={video.id}
              className="video-card"
              draggable
              onDragStart={(e) =>
                e.dataTransfer.setData(
                  "text",
                  `https://www.youtube.com/watch?v=${video.id}`
                )
              }
            >
              <div className="thumb-container">
                <img src={video.thumbnail} alt={video.title} />
              </div>
              <div className="video-info">
                <p className="video-title">{video.title}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="world">
        <img src={roomImg} className="bg-layer" draggable="false" />
        <img
          src={monitorArmImg}
          className="part-arm"
          style={{position: "absolute"}}
        />

        {subData.map((data) => (
          <Monitor
            key={data.id}
            {...data}
            frameImg={subMonitorFrameImg}
            onSwap={() => swapVideo(data.id, "sub")}
          />
        ))}

        {/* --- メインモニター --- */}
        <div
          className="monitor-group main-fixed"
          style={{
            left: "1150px",
            top: "300px",
            position: "absolute",
            // width: "1000px" ← CSSの !important を効かせるため、ここを削除または 800px 等に下げる
            width: "800px",
          }}
        >
          <div className="screen-inside main-screen">
            <iframe
              src={`https://www.youtube.com/embed/${mainVid}`}
              frameBorder="0"
            />
          </div>

          <div className="volume-overlay main-volume">
            <div
              style={{
                position: "relative",
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
              }}
            >
              <img
                src={mainVolumeImg}
                alt="main-volume"
                style={{width: "100%", pointerEvents: "none"}}
              />

              {/* ★【修正】メインのつまみにも nodeRef を指定 */}
              <Draggable
                nodeRef={mainHandleRef}
                axis="x"
                bounds="parent"
                defaultPosition={{x: 100, y: 0}}
              >
                <div ref={mainHandleRef} className="volume-handle" />
              </Draggable>
            </div>
          </div>
          <img src={monitorFrameImg} className="part-frame" />
          <div className="monitor-label">MAIN</div>
        </div>

        {smallData.map((data) => (
          <SmallMonitor
            key={data.id}
            {...data}
            frameImg={smallMonitorFrameImg}
            onSwap={() => swapVideo(data.id, "small")}
          />
        ))}
      </div>
    </div>
  );
};

export default Room;
