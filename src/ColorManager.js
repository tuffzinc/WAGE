// rgb tweens for level palette slots (COLOR_ID_BACKGROUND / COLOR_ID_GROUND from color triggers)
class ColorManager {
  constructor() {
    this.reset();
  }
  reset() {
    this._colors = {
      [COLOR_ID_BACKGROUND]: {
        r: 0,
        g: 102,
        b: 255
      },
      [COLOR_ID_GROUND]: {
        r: 0,
        g: 68,
        b: 170
      }
    };
    this._actions = {};
  }
  triggerColor(colorId, targetColor, duration) {
    let fromRgb = {
      ...this.getColor(colorId)
    };
    this._actions[colorId] = new RgbColorTween(fromRgb, targetColor, duration);
    if (duration <= 0) {
      this._colors[colorId] = {
        ...targetColor
      };
    }
  }
  step(deltaSeconds) {
    for (let colorId in this._actions) {
      let tween = this._actions[colorId];
      tween.step(deltaSeconds);
      this._colors[colorId] = {
        ...tween.current
      };
      if (tween.done) {
        delete this._actions[colorId];
      }
    }
  }
  getColor(colorId) {
    return this._colors[colorId] || {
      r: 255,
      g: 255,
      b: 255
    };
  }
  getHex(colorId) {
    let rgb = this.getColor(colorId);
    return rgb.r << 16 | rgb.g << 8 | rgb.b;
  }
}
