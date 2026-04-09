class Noclip {
  
  /*//////////////////////////////////////////////////////////////////////*/
  static NoclipEnabled = false;
  /*//////////////////////////////////////////////////////////////////////*/

  constructor(physicsState) {
    this.p = physicsState;
    this.enabled = Noclip.NoclipEnabled;
    this._boundPlayer = null;
    this._originalKillPlayer = null;
  }
  bindPlayer(player) {
    if (!player) {
      return;
    }
    if (this._boundPlayer !== player) {
      this._boundPlayer = player;
      this._originalKillPlayer = player.killPlayer;
    }
    if (!this.enabled) {
      this._restorePlayerKillHook();
      return;
    }
    if (this._boundPlayer && this._boundPlayer.killPlayer !== this._noopKillPlayer) {
      this._boundPlayer.killPlayer = this._noopKillPlayer;
    }
  }
  _noopKillPlayer() {}
  _restorePlayerKillHook() {
    if (this._boundPlayer && this._originalKillPlayer) {
      this._boundPlayer.killPlayer = this._originalKillPlayer;
    }
  }
  setEnabled(enabled) {
    this.enabled = !!enabled;
    if (this.enabled) {
      this.bindPlayer(this._boundPlayer);
    } else {
      this._restorePlayerKillHook();
    }
  }
  apply() {
    this.p.noclipEnabled = this.enabled;
    if (this.enabled) {
      this.p.isDead = false;
    }
  }
}
