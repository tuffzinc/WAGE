// audio, so music and sfx. getMeteringValue() feeds rod/orb pulse scaling
class AudioManager {
  constructor(scene) {
    this._scene = scene;
    this._music = null;
    this._userMusicVol = scene.game.registry.get("userMusicVol") ?? 1;
    this._meteringEnabled = false;
    this._analyser = null;
    this._meterBuffer = null;
    this._meterValue = 0.1;
    this._lastAudio = 0.1;
    this._lastPeak = 0;
    this._silenceCounter = 0;
  }
  _effectiveVolume() {
    return this._userMusicVol * 0.8;
  }
  startMusic() {
    if (this._music) {
      this._music.stop();
      this._music.destroy();
    }
    this._music = this._scene.sound.add("stereo_madness", {
      loop: true,
      volume: this._effectiveVolume()
    });
    this._music.play();
    this._setupAnalyser();
  }
  stopMusic() {
    if (this._music) {
      this._music.stop();
    }
  }
  pauseMusic() {
    if (this._music && this._music.isPlaying) {
      this._music.pause();
    }
  }
  resumeMusic() {
    if (this._music && this._music.isPaused) {
      this._music.resume();
    }
  }
  getUserMusicVolume() {
    return this._userMusicVol;
  }
  setUserMusicVolume(volume) {
    this._userMusicVol = volume;
    this._scene.game.registry.set("userMusicVol", volume);
    if (this._music) {
      this._music.volume = this._effectiveVolume();
    }
  }
  getMusicVolume() {
    return this._effectiveVolume();
  }
  setMusicVolume(volume) {
    this.setUserMusicVolume(volume / 0.8);
  }
  fadeInMusic(durationMs = 1000) {
    if (this._music) {
      this._music.stop();
      this._music.destroy();
    }
    this._music = this._scene.sound.add("stereo_madness", {
      loop: true,
      volume: 0
    });
    this._music.play();
    this._setupAnalyser();
    this._scene.tweens.add({
      targets: this._music,
      volume: this._effectiveVolume(),
      duration: durationMs
    });
  }
  fadeOutMusic(durationMs = 1500) {
    if (this._music && this._music.isPlaying) {
      this._music.setLoop(false);
      this._scene.tweens.add({
        targets: this._music,
        volume: 0,
        duration: durationMs,
        onComplete: () => {
          if (this._music) {
            this._music.stop();
          }
        }
      });
    }
  }
  playEffect(soundKey, config = {}) {
    const sfxSceneMul = this._scene._sfxVolume !== undefined ? this._scene._sfxVolume : 1;
    config.volume = (config.volume || 1) * sfxSceneMul;
    this._scene.sound.play(soundKey, config);
  }
  _setupAnalyser() {
    const audioCtx = this._scene.sound.context;
    if (audioCtx) {
      this._analyser = audioCtx.createAnalyser();
      this._analyser.fftSize = 2048;
      this._meterBuffer = new Float32Array(this._analyser.fftSize);
      this._scene.sound.masterVolumeNode.connect(this._analyser);
      this._meteringEnabled = true;
    }
  }
  update(deltaSeconds) {
    if (!this._meteringEnabled || !this._analyser) {
      return;
    }
    this._analyser.getFloatTimeDomainData(this._meterBuffer);
    let peakAbs = 0;
    for (let si = 0; si < this._meterBuffer.length; si++) {
      let sampleAbs = Math.abs(this._meterBuffer[si]);
      if (sampleAbs > peakAbs) {
        peakAbs = sampleAbs;
      }
    }
    const musicVolNorm = this._effectiveVolume();
    if (musicVolNorm > 0) {
      peakAbs /= musicVolNorm;
    }
    this._meterValue = 0.1 + peakAbs;
    const dtScaled = deltaSeconds * 60;
    if (this._silenceCounter < 3 || this._meterValue < this._lastAudio * 1.1 || this._meterValue < this._lastPeak * 0.95 && this._lastAudio > this._lastPeak * 0.2) {
      this._meterValue = this._lastAudio * Math.pow(0.92, dtScaled);
    } else {
      this._silenceCounter = 0;
      this._lastPeak = this._meterValue;
      this._meterValue *= Math.pow(1.46, dtScaled);
    }
    if (this._meterValue <= 0.1) {
      this._lastPeak = 0;
    }
    this._lastAudio = this._meterValue;
    this._silenceCounter++;
  }
  getMeteringValue() {
    return this._meterValue;
  }
  reset() {
    this._meterValue = 0.1;
    this._lastAudio = 0.1;
    this._lastPeak = 0;
    this._silenceCounter = 0;
    this.stopMusic();
  }
}
