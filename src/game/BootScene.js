// not much is here since we're immediately moving into LoadingScene.js
class BootScene extends Phaser.Scene {
  constructor() {
    super({
      key: "BootScene"
    });
  }
  preload() {
    setSceneRenderZoom(this);
    (function (game) {
      if (game.renderer.type === Phaser.WEBGL) {
        let gl = game.renderer.gl;
        blendAdditive = game.renderer.addBlendMode([gl.SRC_ALPHA, gl.ONE], gl.FUNC_ADD);
        blendNormal = game.renderer.addBlendMode([gl.DST_COLOR, gl.ONE_MINUS_SRC_ALPHA], gl.FUNC_ADD);
      }
    })(this.game);
    let gjAtlasData = loadJsonSync("assets/data/GJ_WebSheet.json");
    if (spriteQuality === "hd") {gjAtlasData = scaleAtlasJsonForDoubleResolution(gjAtlasData)}
    this.load.atlas("GJ_WebSheet", imagePathForSpriteQuality("assets/images/GJ_WebSheet.png"), gjAtlasData);
    this.load.image("game_bg_01", imagePathForSpriteQuality("assets/images/game_bg_01_001.png"));
    this.load.image("sliderBar", imagePathForSpriteQuality("assets/images/sliderBar.png"));
    this.load.image("goldFont", imagePathForSpriteQuality("assets/fonts/goldFont.png"));
    this.load.text("goldFontFnt", fontFntPathForSpriteQuality("assets/fonts/goldFont.fnt"));
    this.load.atlas("GJ_yourshit", imagePathForSpriteQuality("assets/images/GJ_yourshit.png"), gjAtlasData);
  }
  create() {
    applyHdTextureSizeFixes(this);
    const goldFontFntText = this.cache.text.get("goldFontFnt");
    if (goldFontFntText) {
      registerBitmapFontFromFnt(this, "goldFont", goldFontFntText);
    }
    this.scene.start("LoadingScene");
  }
}
