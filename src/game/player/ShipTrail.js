class ShipTrailRibbon {
  constructor(scene, _textureKeyUnused, trailSeconds, minDist, strokeWidth, maxSegLen, color = 16777215, opacity = 1) {
    this._color = color;
    this._opacity = opacity;
    this._fadeDelta = 1 / trailSeconds;
    this._minSegSq = minDist * minDist;
    this._maxSeg = maxSegLen;
    this._maxPoints = Math.floor(trailSeconds * 60 + 2) * 5;
    this._stroke = strokeWidth;
    this._pts = [];
    this._posR = {
      x: 0,
      y: 0
    };
    this._posInit = false;
    this._active = false;
    this._gfx = scene.add.graphics();
    this._gfx.setBlendMode(Phaser.BlendModes.ADD);
  }
  addToContainer(container, depth) {
    container.add(this._gfx);
    this._gfx.setDepth(depth);
  }
  setPosition(x, y) {
    this._posR.x = x;
    this._posR.y = y;
    this._posInit = true;
  }
  start() {
    this._active = true;
  }
  stop() {
    this._active = false;
  }
  reset() {
    this._pts = [];
    this._posInit = false;
    this._gfx.clear();
  }
  update(deltaSec) {
    if (!this._posInit) {
      this._gfx.clear();
      return;
    }
    const fade = deltaSec * this._fadeDelta;
    let write = 0;
    for (let i = 0; i < this._pts.length; i++) {
      this._pts[i].state -= fade;
      if (this._pts[i].state > 0) {
        if (write !== i) {
          this._pts[write] = this._pts[i];
        }
        write++;
      }
    }
    this._pts.length = write;
    if (this._active && this._pts.length < this._maxPoints) {
      const ptCount = this._pts.length;
      let addPoint = true;
      if (ptCount > 0) {
        const last = this._pts[ptCount - 1];
        const dx = this._posR.x - last.x;
        const dy = this._posR.y - last.y;
        const distSq = dx * dx + dy * dy;
        if (this._maxSeg > 0 && Math.sqrt(distSq) > this._maxSeg) {
          this._pts.length = 0;
        } else if (distSq < this._minSegSq) {
          addPoint = false;
        } else if (ptCount > 1) {
          const prev = this._pts[ptCount - 2];
          const dx2 = this._posR.x - prev.x;
          const dy2 = this._posR.y - prev.y;
          if (dx2 * dx2 + dy2 * dy2 < this._minSegSq * 2) {
            addPoint = false;
          }
        }
      }
      if (addPoint) {
        this._pts.push({
          x: this._posR.x,
          y: this._posR.y,
          state: 1
        });
      }
    }
    this._gfx.clear();
    const len = this._pts.length;
    if (len >= 2) {
      for (let i = 0; i < len - 1; i++) {
        const a = this._pts[i];
        const b = this._pts[i + 1];
        const lineAlpha = (a.state + b.state) * 0.5 * this._opacity;
        this._gfx.lineStyle(this._stroke, this._color, lineAlpha);
        this._gfx.lineBetween(a.x, a.y, b.x, b.y);
      }
    }
  }
}

function addDepthSpriteFromAtlas(scene, x, y, frameKey, depth, visible) {
  const resolved = resolveAtlasFrame(scene, frameKey);
  if (!resolved) {
    return null;
  }
  const img = scene.add.image(x, y, resolved.atlas, resolved.frame);
  img.setDepth(depth);
  img.setVisible(visible);
  return {
    sprite: img
  };
}
