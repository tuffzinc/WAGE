class LoadingScene extends Phaser.Scene {
  constructor() {
    super({
      key: "LoadingScene"
    });
    this._bgTiles = [];
    this._progressBars = [];
  }

  _pickRandomSplashLine() {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", "assets/data/splashes.txt", false);
      xhr.send(null);
      if (xhr.status !== 200 && xhr.status !== 0) {
        return "Loading resources";
      }
      const lines = xhr.responseText.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
      if (lines.length < 1) {
        return "Loading resources";
      }
      return lines[Math.floor(Math.random() * lines.length)];
    } catch (_err) {
      return "Loading resources";
    }
  }

  _buildLoadingLayout() {
    const camWidth = gameWidth;
    const camHeight = gameHeight;

    const bgTexture = this.textures.get("game_bg_01");
    const bgFrame = bgTexture.get();
    const tileW = bgFrame.width;
    const tileH = bgFrame.height;
    const cols = Math.ceil(camWidth / tileW) + 1;
    const rows = Math.ceil(camHeight / tileH) + 1;

    for (let yi = 0; yi < rows; yi++) {
      for (let xi = 0; xi < cols; xi++) {
        const bg = this.add.image(xi * tileW, yi * tileH, "game_bg_01")
          .setOrigin(0, 0)
          .setScrollFactor(0)
          .setDepth(-10);
        bg.setTint(Phaser.Display.Color.GetColor(0, 102, 255));
        this._bgTiles.push(bg);
      }
    }

    this.add.image(camWidth / 2, camHeight / 2 - 140, "GJ_WebSheet", "RobTopLogoBig_001.png")
      .setOrigin(0.5, 0.5)
      .setScale(0.9)
      .setDepth(10);

    this.add.image(camWidth / 2, camHeight / 2 - 15, "GJ_WebSheet", "GJ_logo_001.png")
      .setOrigin(0.5, 0.5)
      .setDepth(10);
    this.add.image(camWidth / 2, camHeight / 2 + 67.5, "GJ_WebSheet", "tryMe_001.png")
      .setOrigin(0.5, 0.5)
      .setDepth(10);

    const sliderScale = 0.9;
    const grooveFrame = this.textures.getFrame("GJ_WebSheet", "slidergroove.png");
    const grooveWidth = grooveFrame ? grooveFrame.width : 400;
    const trackW = (grooveWidth - 8) * sliderScale;
    const sliderYs = [camHeight / 2 + 165]; // don't put multiple entries here, it creates multiple identical sliders lol 😭 

    for (let i = 0; i < sliderYs.length; i++) {
      const y = sliderYs[i];
      const trackLeft = camWidth / 2 - grooveWidth * sliderScale / 2 + 2.8;
      const fill = this.add.tileSprite(trackLeft, y, 1, 11.2, "sliderBar")
        .setOrigin(0, 0.5)
        .setDepth(11);
      fill.setVisible(false);
      const groove = this.add.image(camWidth / 2, y, "GJ_WebSheet", "slidergroove.png")
        .setScale(sliderScale)
        .setDepth(12);
      this._progressBars.push({
        fill,
        width: trackW
      });
    }

    const splash = this._pickRandomSplashLine();
    if (this.cache.bitmapFont.exists("goldFont")) {
      this._splashText = this.add.bitmapText(camWidth / 2, camHeight / 2 + 238, "goldFont", splash, 40)
        .setOrigin(0.5, 0.5)
        .setScale(0.75)
        .setDepth(12);
    } else {
      this._splashText = this.add.text(camWidth / 2, camHeight / 2 + 248, splash, {
        fontSize: "26px",
        color: "#f7d45a",
        fontFamily: "Arial",
        align: "center",
        stroke: "#8c6c10",
        strokeThickness: 4
      }).setOrigin(0.5, 0.5).setDepth(12);
    }
  }

  _setProgress(progress01) {
    const p = Math.max(0, Math.min(1, progress01));
    for (let i = 0; i < this._progressBars.length; i++) {
      const bar = this._progressBars[i];
      const fillWidth = Math.floor(bar.width * p);
      if (fillWidth > 0) {
        bar.fill.setVisible(true);
        bar.fill.width = fillWidth;
      } else {
        bar.fill.setVisible(false);
      }
    }
  }

  preload() {
    setSceneRenderZoom(this);
    this._buildLoadingLayout();
    this._setProgress(0);

    this._hdStandaloneKeys = spriteQuality === "hd" ? new Set(["game_bg_01", "sliderBar", "square04_001", "GJ_square02"]) : new Set();
    this.load.on("progress", loadRatio => {
      this._setProgress(loadRatio);
    });
    this.load.on("loaderror", file => {
      if (spriteQuality !== "hd" || !file) {
        return;
      }
      const url = file.url || "";
      if (file.key === "bigFontFnt" && url.indexOf("-hd.fnt") >= 0) {
        this.load.text("bigFontFnt", "assets/fonts/bigFont.fnt");
        this.load.image("bigFont", "assets/fonts/bigFont.png");
        this.load.start();
        return;
      }
      if (file.key === "goldFontFnt" && url.indexOf("-hd.fnt") >= 0) {
        this.load.text("goldFontFnt", "assets/fonts/goldFont.fnt");
        this.load.image("goldFont", "assets/fonts/goldFont.png");
        this.load.start();
        return;
      }
      if (file.type !== "image") {
        return;
      }
      if (file.key === "GJ_WebSheet") {
        return;
      }
      if (!url || url.indexOf("-hd.") < 0) {
        return;
      }
      const ldUrl = url.replace("-hd.", ".");
      if (ldUrl === url) {
        return;
      }
      if (file.key === "bigFont") {
        this.load.image("bigFont", ldUrl);
        this.load.text("bigFontFnt", "assets/fonts/bigFont.fnt");
        this.load.start();
        return;
      }
      if (file.key === "goldFont") {
        this.load.image("goldFont", ldUrl);
        this.load.text("goldFontFnt", "assets/fonts/goldFont.fnt");
        this.load.start();
        return;
      }
      if (this._hdStandaloneKeys) {
        this._hdStandaloneKeys.delete(file.key);
      }
      this.load.image(file.key, ldUrl);
      this.load.start();
    });

    this.load.image("bigFont", imagePathForSpriteQuality("assets/fonts/bigFont.png"));
    this.load.text("bigFontFnt", fontFntPathForSpriteQuality("assets/fonts/bigFont.fnt"));
    if (!this.textures.exists("goldFont")) {
      this.load.image("goldFont", imagePathForSpriteQuality("assets/fonts/goldFont.png"));
    }
    if (!this.cache.text.exists("goldFontFnt")) {
      this.load.text("goldFontFnt", fontFntPathForSpriteQuality("assets/fonts/goldFont.fnt"));
    }
    this.load.image("square04_001", imagePathForSpriteQuality("assets/images/square04_001.png"));
    this.load.image("GJ_square02", imagePathForSpriteQuality("assets/images/GJ_square02.png"));
    this.load.text("level_1", "assets/data/level.txt");
    this.load.json("gjObjects", "assets/data/objects.json");
    this.load.audio("stereo_madness", "assets/audio/StereoMadness.mp3");
    this.load.audio("explode_11", "assets/audio/explode_11.ogg");
    this.load.audio("endStart_02", "assets/audio/endStart_02.ogg");
    this.load.audio("playSound_01", "assets/audio/playSound_01.ogg");
    this.load.audio("quitSound_01", "assets/audio/quitSound_01.ogg");
    this.load.audio("highscoreGet02", "assets/audio/highscoreGet02.ogg");
  }

  create() {
    this._setProgress(1);
    applyHdTextureSizeFixes(this);
    initobjectsFromJson(this.cache.json.get("gjObjects"));
    this.cache.text.get("level_1");

    const bigFontFntText = this.cache.text.get("bigFontFnt");
    if (bigFontFntText) {
      registerBitmapFontFromFnt(this, "bigFont", bigFontFntText);
    }
    const goldFontFntText = this.cache.text.get("goldFontFnt");
    if (goldFontFntText) {
      registerBitmapFontFromFnt(this, "goldFont", goldFontFntText);
    }

    this.scene.launch("GameScene");
    this.scene.bringToTop("LoadingScene");
    this.game.events.once("gd:gamescene-ready", () => {
      this.game.events.once("postrender", () => {
        this.scene.stop("LoadingScene");
      });
    });
  }
}
