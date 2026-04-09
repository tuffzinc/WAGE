const spriteQuality = "ld"; // ld or hd
let gameWidth = Math.round(10240 / 9);
const gameHeight = 640;
const renderScale = spriteQuality === "hd" ? 2 : 1;
const gridCellPx = 60;
function setSceneRenderZoom(scene) {
  const z = renderScale;
  if (typeof z !== "number" || z <= 0) {return}
  const list = scene.cameras.cameras;
  for (let i = 0; i < list.length; i++) {
    const cam = list[i];
    if (z > 1) {
      cam.setOrigin(0, 0);
      cam.setZoom(z);
    } else {
      cam.setOrigin(0.5, 0.5);
      cam.setZoom(1);
    }
  }
}

const bgParallaxDrop = 180;
let viewportHalfMinus150 = gameWidth / 2 - 150;
function setGameWidthFromMinHeight(minGameWidth) {
  gameWidth = minGameWidth;
  viewportHalfMinus150 = minGameWidth / 2 - 150;
}
const physicsFixedDt = 1 / 240;
const scrollVelocityMul = 11.540004;
const inputSmoothingMul = 0.9;
const gravityMul = 1.916398;
const ceilingExtraPx = 600;
const tintLimeGreen = 65280;
const tintWhite = 65535;
const collisionSolid = "solid";
const collisionHazard = "hazard";
const collisionPortalFly = "portal_fly";
const collisionPortalCube = "portal_cube";
const groundBaselineY = 460;
function gameYToWorldY(gameY) {
  return groundBaselineY - gameY;
}
let blendAdditive = Phaser.BlendModes.ADD;
let blendNormal = Phaser.BlendModes.NORMAL;
