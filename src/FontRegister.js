// parses bmfont .fnt text and registers a phaser bitmap font from the atlas texture
function registerBitmapFontFromFnt(scene, textureKey, fntText) {
  const atlasTexture = scene.textures.get(textureKey);
  const imageSource = atlasTexture.source[0];
  const texWidth = imageSource.width;
  const texHeight = imageSource.height;
  const fontData = {
    font: textureKey,
    size: 0,
    lineHeight: 0,
    chars: {}
  };
  const kerningPairs = [];
  for (const lineStr of fntText.split("\n")) {
    const tokens = lineStr.trim().split(/\s+/);
    if (!tokens.length) {
      continue;
    }
    const tag = tokens[0];
    const attrs = {};
    for (let ti = 1; ti < tokens.length; ti++) {
      const eqIdx = tokens[ti].indexOf("=");
      if (eqIdx >= 0) {
        attrs[tokens[ti].slice(0, eqIdx)] = tokens[ti].slice(eqIdx + 1).replace(/^"|"$/g, "");
      }
    }
    if (tag === "info") {
      fontData.size = parseInt(attrs.size, 10);
    } else if (tag === "common") {
      fontData.lineHeight = parseInt(attrs.lineHeight, 10);
    } else if (tag === "char") {
      const charId = parseInt(attrs.id, 10);
      const x = parseInt(attrs.x, 10);
      const y = parseInt(attrs.y, 10);
      const width = parseInt(attrs.width, 10);
      const height = parseInt(attrs.height, 10);
      const texU0 = x / texWidth;
      const texV0 = y / texHeight;
      const texU1 = (x + width) / texWidth;
      const texV1 = (y + height) / texHeight;
      fontData.chars[charId] = {
        x,
        y,
        width,
        height,
        centerX: Math.floor(width / 2),
        centerY: Math.floor(height / 2),
        xOffset: parseInt(attrs.xoffset, 10),
        yOffset: parseInt(attrs.yoffset, 10),
        xAdvance: parseInt(attrs.xadvance, 10),
        data: {},
        kerning: {},
        u0: texU0,
        v0: texV0,
        u1: texU1,
        v1: texV1
      };
      if (width !== 0 && height !== 0) {
        const charStr = String.fromCharCode(charId);
        const charFrame = atlasTexture.add(charStr, 0, x, y, width, height);
        if (charFrame) {
          charFrame.setUVs(width, height, texU0, texV0, texU1, texV1);
        }
      }
    } else if (tag === "kerning") {
      kerningPairs.push({
        first: parseInt(attrs.first, 10),
        second: parseInt(attrs.second, 10),
        amount: parseInt(attrs.amount, 10)
      });
    }
  }
  for (const kp of kerningPairs) {
    if (fontData.chars[kp.second]) {
      fontData.chars[kp.second].kerning[kp.first] = kp.amount;
    }
  }
  scene.cache.bitmapFont.add(textureKey, {
    data: fontData,
    texture: textureKey,
    frame: null
  });
}
