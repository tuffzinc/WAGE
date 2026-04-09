const PauseKind = {
  REPLAY: "pauseReplay",
  RESUME: "pauseResume",
  MENU: "pauseMenu"
};
const EndKind = {
  REPLAY: "endReplay",
  MENU: "endMenu"
};
const GDRegistry = {
  PauseReturnFadeIn: "pauseReturnFadeIn",
  FadeInFromBlack: "fadeInFromBlack"
};
const SceneFadeMs = {
  PauseMenuOut: 250,
  PauseMenuIn: 250,
  EndMenuOut: 400,
  EndMenuIn: 400
};

const CreditsLink = "https://www.youtube.com/watch?v=JhKyKEDxo8Q";

const MenuLinks = [{
  key: "downloadSteam_001",
  url: "https://store.steampowered.com/app/322170/Geometry_Dash"
}, {
  key: "downloadGoogle_001",
  url: "https://play.google.com/store/apps/details?id=com.robtopx.geometryjump&hl=en"
}, {
  key: "downloadApple_001",
  url: "https://apps.apple.com/us/app/geometry-dash/id625334537"
}];

const EndScreenLinks = [{
  key: "downloadApple_001",
  url: "https://apps.apple.com/us/app/geometry-dash/id625334537"
}, {
  key: "downloadGoogle_001",
  url: "https://play.google.com/store/apps/details?id=com.robtopx.geometryjump&hl=en"
}, {
  key: "downloadSteam_001",
  url: "https://store.steampowered.com/app/322170/Geometry_Dash"
}];

const PauseButtons = [{
  frame: "GJ_replayBtn_001.png",
  kind: PauseKind.REPLAY
}, {
  frame: "GJ_playBtn2_001.png",
  kind: PauseKind.RESUME
}, {
  frame: "GJ_menuBtn_001.png",
  kind: PauseKind.MENU
}];

const EndScreenButtons = [{
  frame: "GJ_replayBtn_001.png",
  dx: -200,
  kind: EndKind.REPLAY
}, {
  frame: "GJ_menuBtn_001.png",
  dx: 200,
  kind: EndKind.MENU
}];

const bunttons = [{
  key: "WAGE.png",
  action: "open_gui"
}];
