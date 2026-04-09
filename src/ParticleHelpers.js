function tweenRadialGraphic(scene, centerX, centerY, startRadius, endRadius, durationMs, filled = false, ringOnly = false, color = 16777215) {
  const gfx = scene.add.graphics().setScrollFactor(0).setDepth(55).setBlendMode(blendAdditive);
  const state = {
    r: startRadius,
    t: 0
  };
  scene.tweens.add({
    targets: state,
    r: endRadius,
    t: 1,
    duration: durationMs,
    ease: filled && !ringOnly ? "Quad.Out" : "Linear",
    onUpdate: () => {
      const u = state.t;
      const alphaMul = ringOnly ? u < 0.5 ? u * 2 : (1 - u) * 2 : 1 - u;
      gfx.clear();
      if (filled) {
        gfx.fillStyle(color, Math.max(0, alphaMul));
        gfx.fillCircle(centerX, centerY, state.r);
      } else {
        gfx.lineStyle(4, color, Math.max(0, alphaMul));
        gfx.strokeCircle(centerX, centerY, state.r);
      }
    },
    onComplete: () => gfx.destroy()
  });
}

function spawnSparkleBurst(scene, tintA = 16777215, tintB = 16777215) {
  const baseX = 200 + (gameWidth - 400) * Math.random();
  const baseY = 200 + Math.random() * 240;
  tweenRadialGraphic(scene, baseX, baseY, 40, 140 + Math.random() * 60, 500, true, true, tintB);
  scene.add.particles(baseX, baseY, "GJ_WebSheet", {
    frame: "square.png",
    speed: {
      min: 520,
      max: 920
    },
    angle: {
      min: 0,
      max: 360
    },
    scale: {
      start: 0.4,
      end: 0.13
    },
    alpha: {
      start: 1,
      end: 0
    },
    lifespan: {
      min: 0,
      max: 500
    },
    stopAfter: 25,
    blendMode: blendAdditive,
    tint: tintA,
    x: {
      min: -20,
      max: 20
    },
    y: {
      min: -20,
      max: 20
    }
  }).setScrollFactor(0).setDepth(57);
}
