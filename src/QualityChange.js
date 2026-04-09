function imagePathWithHdSuffix(path) {
  return path.replace(/\.(png|jpg|jpeg|webp)$/i, "-hd.$1");
}

function imagePathForSpriteQuality(ldPath) {
  if (spriteQuality !== "hd") {
    return ldPath;
  }
  return imagePathWithHdSuffix(ldPath);
}

function fontFntPathWithHdSuffix(path) {
  return path.replace(/\.fnt$/i, "-hd.fnt");
}
function fontFntPathForSpriteQuality(ldPath) {
  if (spriteQuality !== "hd") {
    return ldPath;
  }
  return fontFntPathWithHdSuffix(ldPath);
}

function scaleAtlasJsonForDoubleResolution(json) {
  const out = JSON.parse(JSON.stringify(json));
  const textures = out.textures;
  if (!textures) {
    return out;
  }
  for (let ti = 0; ti < textures.length; ti++) {
    const tex = textures[ti];
    if (tex.size) {
      if (typeof tex.size.w === "number") {
        tex.size.w *= 2;
      }
      if (typeof tex.size.h === "number") {
        tex.size.h *= 2;
      }
    }
    const frames = tex.frames;
    if (!frames) {
      continue;
    }
    for (let fi = 0; fi < frames.length; fi++) {
      const fr = frames[fi];
      if (fr.frame) {
        fr.frame.x *= 2;
        fr.frame.y *= 2;
        fr.frame.w *= 2;
        fr.frame.h *= 2;
      }
    }
  }
  return out;
}

function loadJsonSync(url) {
  const xhr = new XMLHttpRequest();
  xhr.open("GET", url, false);
  xhr.send(null);
  if (xhr.status !== 200 && xhr.status !== 0) {
    throw new Error("Failed to load JSON: " + url + " (status " + xhr.status + ")");
  }
  return JSON.parse(xhr.responseText);
}

const HDTextureKeys = new Set(["GJ_WebSheet", "game_bg_01", "sliderBar", "square04_001", "GJ_square02"]);

function installHdWebglSpriteQuadPatch(game) {
  if (spriteQuality !== "hd" || !game || !game.renderer) {
    return;
  }
  if (game.renderer.type !== Phaser.WEBGL && game.renderer.type !== 2) {
    return;
  }
  const Pipelines = Phaser.Renderer && Phaser.Renderer.WebGL && Phaser.Renderer.WebGL.Pipelines;
  const MP = Pipelines && Pipelines.MultiPipeline;
  if (!MP || !MP.prototype || !MP.prototype.batchSprite || MP.prototype.__hdQuadPatchInstalled) {
    return;
  }
  const orig = MP.prototype.batchSprite;
  MP.prototype.batchSprite = function (gameObject, camera, parentMatrix) {
    if (gameObject.isCropped) {
      return orig.call(this, gameObject, camera, parentMatrix);
    }
    const frame = gameObject.frame;
    if (!frame || frame.rotated) {
      return orig.call(this, gameObject, camera, parentMatrix);
    }
    const texKey = frame.texture.key;
    if (!HDTextureKeys.has(texKey)) {
      return orig.call(this, gameObject, camera, parentMatrix);
    }
    const cw = frame.cutWidth;
    const ch = frame.cutHeight;
    const fw = frame.width;
    const fh = frame.height;
    if (!(cw > fw + 0.5 || ch > fh + 0.5)) {
      return orig.call(this, gameObject, camera, parentMatrix);
    }
    frame.cutWidth = fw;
    frame.cutHeight = fh;
    try {
      return orig.call(this, gameObject, camera, parentMatrix);
    } finally {
      frame.cutWidth = cw;
      frame.cutHeight = ch;
    }
  };
  MP.prototype.__hdQuadPatchInstalled = true;
}

function applyHdTextureSizeFixes(scene) {
  if (spriteQuality !== "hd") {
    return;
  }
  const atlasKey = "GJ_WebSheet";
  if (scene.textures.exists(atlasKey)) {
    const atlasTex = scene.textures.get(atlasKey);
    const src0 = atlasTex.source[0];
    if (src0) {
      src0.resolution = 2;
    }
    const frameNames = atlasTex.getFrameNames();
    for (let i = 0; i < frameNames.length; i++) {
      const name = frameNames[i];
      if (name === "__BASE") {
        continue;
      }
      const frame = atlasTex.get(name);
      if (!frame || frame.trimmed) {
        continue;
      }
      const cd = frame.customData;
      if (!cd || !cd.sourceSize || !cd.spriteSourceSize) {
        continue;
      }
      const ss = cd.sourceSize;
      const sss = cd.spriteSourceSize;
      frame.setTrim(ss.w, ss.h, sss.x, sss.y, sss.w, sss.h);
    }
  }
  const hdStandalone = scene._hdStandaloneKeys;
  if (hdStandalone && hdStandalone.size) {
    hdStandalone.forEach(key => {
      if (!scene.textures.exists(key)) {
        return;
      }
      const tex = scene.textures.get(key);
      const s = tex.source[0];
      if (s) {
        s.resolution = 2;
      }
      const fr = tex.get();
      if (!fr || fr.trimmed) {
        return;
      }
      const cw = fr.cutWidth;
      const ch = fr.cutHeight;
      if (cw <= 0 || ch <= 0) {
        return;
      }
      fr.setTrim(cw / 2, ch / 2, 0, 0, cw / 2, ch / 2);
    });
  }
  installHdWebglSpriteQuadPatch(scene.game);
}
