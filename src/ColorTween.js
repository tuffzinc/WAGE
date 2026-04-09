const COLOR_ID_BACKGROUND = 1000;
const COLOR_ID_GROUND = 1001;

class RgbColorTween {
  constructor(fromRgb, toRgb, durationSec) {
    this.from = {
      ...fromRgb
    };
    this.to = {
      ...toRgb
    };
    this.duration = durationSec;
    this.elapsed = 0;
    this.done = durationSec <= 0;
    this.current = durationSec <= 0 ? {
      ...toRgb
    } : {
      ...fromRgb
    };
  }
  step(deltaSec) {
    if (this.done) {
      return;
    }
    this.elapsed += deltaSec;
    let t = this.duration > 0 ? Math.min(this.elapsed / this.duration, 1) : 1;
    if (t >= 1) {
      this.current = {
        ...this.to
      };
      this.done = true;
    } else {
      this.current = {
        r: Math.round(this.from.r + (this.to.r - this.from.r) * t),
        g: Math.round(this.from.g + (this.to.g - this.from.g) * t),
        b: Math.round(this.from.b + (this.to.b - this.from.b) * t)
      };
    }
  }
}
