// scrolling ground, object layers by section, collision buckets, color triggers etc
// portals/blocks/spikes spawn from gjObjectById.
// colors use ColorManager + COLOR_ID_* (at GameScene.update + color triggers 29/30)
class GameLevel {
  constructor(scene, cameraXRef) {
    this._scene = scene;
    this._cameraXRef = cameraXRef;
    this.additiveContainer = scene.add.container(0, 0).setDepth(-1);
    this.container = scene.add.container(0, 0);
    this.topContainer = scene.add.container(0, 0).setDepth(13);
    this.objects = [];
    this.endXPos = 0;
    this._groundY = 0;
    this._ceilingY = null;
    this._flyGroundActive = false;
    this._groundAnimFrom = 0;
    this._groundAnimTo = 0;
    this._groundAnimTime = 0;
    this._groundAnimDuration = 0;
    this._groundAnimating = false;
    this._groundTargetValue = 0;
    this._flyFloorY = 0;
    this._flyCeilingY = 0;
    this.flyCameraTarget = null;
    this._colorTriggers = [];
    this._colorTriggerIdx = 0;
    this._audioScaleSprites = [];
    this._enterEffectTriggers = [];
    this._enterEffectTriggerIdx = 0;
    this._activeEnterEffect = 0;
    this._activeExitEffect = 0;
    this._sections = [];
    this._sectionContainers = [];
    this._collisionSections = [];
    this._nearbyBuffer = [];
    this._visMinSec = -1;
    this._visMaxSec = -1;
    this._groundStartScreenY = gameYToWorldY(0);
    this._ceilingStartScreenY = 0;
    this._buildGround();
  }
  loadLevel(compressedLevelB64) {
    let {
      objects: levelObjects
    } = parseCompressedGjLevelString(compressedLevelB64);
    this._spawnLevelObjects(levelObjects);
  }

  /*/////////////////////// drag div insert ///////////////////////////////////*/
  reloadLevelFromData(compressedB64, attemptsLabel) {
    let levelObjects;
    try {
      levelObjects = parseCompressedGjLevelString(compressedB64).objects;
    } catch (e) {
      console.warn("Invalid level data", e);
      return;
    }
    if (attemptsLabel && attemptsLabel.parentContainer === this.topContainer) {
      this.topContainer.remove(attemptsLabel, false);
    }
    this.additiveContainer.removeAll(true);
    this.container.removeAll(true);
    const keep = attemptsLabel;
    const list = this.topContainer.list.slice();
    for (let i = 0; i < list.length; i++) {
      const ch = list[i];
      if (ch !== keep) {
        ch.destroy();
      }
    }
    this.objects = [];
    this._sections = [];
    this._sectionContainers = [];
    this._collisionSections = [];
    this._colorTriggers = [];
    this._enterEffectTriggers = [];
    this._colorTriggerIdx = 0;
    this._enterEffectTriggerIdx = 0;
    this._activeEnterEffect = 0;
    this._activeExitEffect = 0;
    this._audioScaleSprites = [];
    this.endXPos = 0;
    this._lastObjectX = 0;
    this.resetGroundState();
    this._spawnLevelObjects(levelObjects);
    this.createEndPortal(this._scene);
    if (attemptsLabel && attemptsLabel.scene) {
      this.topContainer.add(attemptsLabel);
    }
  }
  /*/////////////////////// drag div insert ///////////////////////////////////*/
  
  // scrolling ground/ceiling tiles, floor line and edge shadows (tint updated with setGroundColor from ColorManager)
  _buildGround() {
    const scene = this._scene;
    const groundSquareFrame = scene.textures.getFrame("GJ_WebSheet", "groundSquare_01_001.png");
    this._tileW = groundSquareFrame ? groundSquareFrame.width : 1012;
    this._groundTiles = [];
    this._ceilingTiles = [];
    let tileCount = Math.ceil(gameWidth / this._tileW) + 2;
    let baselineY = gameYToWorldY(0);
    const startWorldX = -viewportHalfMinus150;
    for (let ti = 0; ti < tileCount; ti++) {
      let tileWorldX = startWorldX + ti * this._tileW;
      let groundImg = scene.add.image(0, baselineY, "GJ_WebSheet", "groundSquare_01_001.png");
      groundImg.setOrigin(0, 0);
      groundImg.setTint(17578);
      groundImg.setDepth(20);
      groundImg._worldX = tileWorldX;
      this._groundTiles.push(groundImg);
      let ceilingImg = scene.add.image(0, baselineY, "GJ_WebSheet", "groundSquare_01_001.png");
      ceilingImg.setOrigin(0, 1);
      ceilingImg.setFlipY(true);
      ceilingImg.setTint(17578);
      ceilingImg.setDepth(20);
      ceilingImg.setVisible(false);
      ceilingImg._worldX = tileWorldX;
      this._ceilingTiles.push(ceilingImg);
    }
    this._maxGroundWorldX = startWorldX + (tileCount - 1) * this._tileW;
    const floorLineFrame = scene.textures.getFrame("GJ_WebSheet", "floorLine_01_001.png");
    const floorLineW = floorLineFrame ? floorLineFrame.width : 888;
    const floorLineScaleX = gameWidth / floorLineW;
    this._groundLine = scene.add.image(gameWidth / 2, baselineY - 1, "GJ_WebSheet", "floorLine_01_001.png").setOrigin(0.5, 0).setScale(floorLineScaleX, 1).setBlendMode(blendAdditive).setDepth(21).setScrollFactor(0);
    this._ceilingLine = scene.add.image(gameWidth / 2, baselineY + 1, "GJ_WebSheet", "floorLine_01_001.png").setOrigin(0.5, 1).setScale(floorLineScaleX, 1).setFlipY(true).setBlendMode(blendAdditive).setDepth(21).setScrollFactor(0).setVisible(false);
    const shadowAlpha = 100 / 255;
    this._groundShadowL = scene.add.image(-1, baselineY, "GJ_WebSheet", "groundSquareShadow_001.png").setOrigin(0, 0).setScrollFactor(0).setDepth(22).setAlpha(shadowAlpha).setScale(0.7, 1).setBlendMode(blendNormal);
    this._groundShadowR = scene.add.image(gameWidth + 1, baselineY, "GJ_WebSheet", "groundSquareShadow_001.png").setOrigin(1, 0).setScrollFactor(0).setDepth(22).setAlpha(shadowAlpha).setScale(0.7, 1).setFlipX(true).setBlendMode(blendNormal);
    this._ceilingShadowL = scene.add.image(-1, baselineY, "GJ_WebSheet", "groundSquareShadow_001.png").setOrigin(0, 1).setScrollFactor(0).setDepth(22).setAlpha(shadowAlpha).setScale(0.7, 1).setFlipY(true).setBlendMode(blendNormal).setVisible(false);
    this._ceilingShadowR = scene.add.image(gameWidth + 1, baselineY, "GJ_WebSheet", "groundSquareShadow_001.png").setOrigin(1, 1).setScrollFactor(0).setDepth(22).setAlpha(shadowAlpha).setScale(0.7, 1).setFlipX(true).setFlipY(true).setBlendMode(blendNormal).setVisible(false);
  }
  resizeScreen() {
    var refTintGround;
    var refTintCeil;
    const scene = this._scene;
    const tileW = this._tileW;
    const neededTiles = Math.ceil(gameWidth / tileW) + 2;
    const baselineY2 = gameYToWorldY(0);
    while (this._groundTiles.length < neededTiles) {
      const newWorldX = this._maxGroundWorldX + tileW;
      let newGround = scene.add.image(0, baselineY2, "GJ_WebSheet", "groundSquare_01_001.png");
      newGround.setOrigin(0, 0).setTint(((refTintGround = this._groundTiles[0]) == null ? undefined : refTintGround.tintTopLeft) || 17578).setDepth(20);
      newGround._worldX = newWorldX;
      this._groundTiles.push(newGround);
      let newCeiling = scene.add.image(0, baselineY2, "GJ_WebSheet", "groundSquare_01_001.png");
      newCeiling.setOrigin(0, 1).setFlipY(true).setTint(((refTintCeil = this._groundTiles[0]) == null ? undefined : refTintCeil.tintTopLeft) || 17578).setDepth(20).setVisible(false);
      newCeiling._worldX = newWorldX;
      this._ceilingTiles.push(newCeiling);
      this._maxGroundWorldX = newWorldX;
    }
    const floorLineFrame2 = this._scene.textures.getFrame("GJ_WebSheet", "floorLine_01_001.png");
    const floorLineScaleX2 = gameWidth / (floorLineFrame2 ? floorLineFrame2.width : 888);
    this._groundLine.x = gameWidth / 2;
    this._groundLine.setScale(floorLineScaleX2, 1);
    this._ceilingLine.x = gameWidth / 2;
    this._ceilingLine.setScale(floorLineScaleX2, 1);
    this._groundShadowR.x = gameWidth + 1;
    this._ceilingShadowR.x = gameWidth + 1;
  }
  // scroll / recycle ground tiles with the camera, when in ship gamemode animates floor/ceiling towards the so called ship "corridor" (idk how that would be called)
  updateGroundTiles(groundYOffset = 0) {
    const camX = this._cameraXRef.value;
    const tileW = this._tileW;
    let groundScreenY;
    let ceilingScreenY;
    let rightmostWorldX = -Infinity;
    let leftmostWorldX = Infinity;
    for (let i = 0; i < this._groundTiles.length; i++) {
      const wx = this._groundTiles[i]._worldX;
      if (wx > rightmostWorldX) {
        rightmostWorldX = wx;
      }
      if (wx < leftmostWorldX) {
        leftmostWorldX = wx;
      }
    }
    if (this._flyGroundActive && this._groundTargetValue > 0.001) {
      let groundBlendT = this._groundTargetValue;
      const flyFloorVisualY = 620;
      const flyCeilingVisualY = 20;
      groundScreenY = this._groundStartScreenY + (flyFloorVisualY - this._groundStartScreenY) * groundBlendT;
      ceilingScreenY = this._ceilingStartScreenY + (flyCeilingVisualY - this._ceilingStartScreenY) * groundBlendT;
        let maxGroundY = gameYToWorldY(0) + groundYOffset;
      if (groundScreenY > maxGroundY) {
        groundScreenY = maxGroundY;
      }
    } else {
      groundScreenY = gameYToWorldY(0) + groundYOffset;
      ceilingScreenY = 0;
    }
    for (let gi = 0; gi < this._groundTiles.length; gi++) {
      let groundTile = this._groundTiles[gi];
      let ceilingTile = this._ceilingTiles[gi];
      if (groundTile._worldX + tileW <= camX) {
        groundTile._worldX = rightmostWorldX + tileW;
        ceilingTile._worldX = groundTile._worldX;
        rightmostWorldX = groundTile._worldX;
      } else if (groundTile._worldX >= camX + gameWidth + tileW) {
        groundTile._worldX = leftmostWorldX - tileW;
        ceilingTile._worldX = groundTile._worldX;
        leftmostWorldX = groundTile._worldX;
      }
      let screenX = groundTile._worldX - camX;
      groundTile.x = screenX;
      groundTile.y = groundScreenY;
      ceilingTile.x = screenX;
      ceilingTile.y = ceilingScreenY;
      ceilingTile.setVisible(this._flyGroundActive && this._groundTargetValue > 0);
    }
    this._maxGroundWorldX = rightmostWorldX;
    this._groundLine.y = groundScreenY;
    if (this._flyGroundActive && this._groundTargetValue > 0) {
      this._ceilingLine.y = ceilingScreenY;
      this._ceilingLine.setVisible(true);
    } else {
      this._ceilingLine.setVisible(false);
    }
    this._groundShadowL.y = groundScreenY;
    this._groundShadowR.y = groundScreenY;
    let showCeilingDecor = this._flyGroundActive && this._groundTargetValue > 0;
    this._ceilingShadowL.y = ceilingScreenY;
    this._ceilingShadowR.y = ceilingScreenY;
    this._ceilingShadowL.setVisible(showCeilingDecor);
    this._ceilingShadowR.setVisible(showCeilingDecor);
  }
  shiftGroundTiles(worldShiftX) {
    for (let si = 0; si < this._groundTiles.length; si++) {
      this._groundTiles[si]._worldX += worldShiftX;
      this._ceilingTiles[si]._worldX += worldShiftX;
    }
    this._maxGroundWorldX += worldShiftX;
  }
  resetGroundTiles(startWorldX) {
    const tw = this._tileW;
    for (let ri = 0; ri < this._groundTiles.length; ri++) {
      this._groundTiles[ri]._worldX = startWorldX + ri * tw;
      this._ceilingTiles[ri]._worldX = startWorldX + ri * tw;
    }
    this._maxGroundWorldX = startWorldX + (this._groundTiles.length - 1) * tw;
    this.resetGroundState();
  }
  resetGroundState() {
    this._flyGroundActive = false;
    this._groundTargetValue = 0;
    this._groundAnimating = false;
    this._groundY = 0;
    this._ceilingY = null;
    this.flyCameraTarget = null;
  }
  _computeFlyBounds(anchorGameY) {
    let floorSnap = anchorGameY - 300;
    floorSnap = Math.floor(floorSnap / gridCellPx) * gridCellPx;
    floorSnap = Math.max(0, floorSnap);
    return {
      floorY: floorSnap,
      ceilingY: floorSnap + ceilingExtraPx
    };
  }
  setFlyMode(enableFlyMode, playerGameY) {
    if (enableFlyMode) {
      let bounds = this._computeFlyBounds(playerGameY);
      this._flyFloorY = bounds.floorY;
      this._flyCeilingY = bounds.ceilingY;
      this._flyGroundActive = true;
      let cameraAnchorGameY = this._flyFloorY + 300;
      this.flyCameraTarget = cameraAnchorGameY - 320 + bgParallaxDrop;
      if (this.flyCameraTarget < 0) {
        this.flyCameraTarget = 0;
      }
      let camYOffset = this._scene && this._scene._cameraY || 0;
      this._groundStartScreenY = gameYToWorldY(0) + camYOffset;
      this._ceilingStartScreenY = 0;
      this._groundAnimFrom = this._groundTargetValue;
      this._groundAnimTo = 1;
      this._groundAnimTime = 0;
      this._groundAnimDuration = 0.5;
      this._groundAnimating = true;
    } else {
      this.flyCameraTarget = null;
      this._groundAnimFrom = this._groundTargetValue;
      this._groundAnimTo = 0;
      this._groundAnimTime = 0;
      this._groundAnimDuration = 0.5;
      this._groundAnimating = true;
    }
  }
  stepGroundAnimation(deltaSeconds) {
    if (!this._groundAnimating) {
      return;
    }
    this._groundAnimTime += deltaSeconds;
    let animT = this._groundAnimDuration > 0 ? Math.min(this._groundAnimTime / this._groundAnimDuration, 1) : 1;
    this._groundTargetValue = this._groundAnimFrom + (this._groundAnimTo - this._groundAnimFrom) * animT;
    if (animT >= 1) {
      this._groundAnimating = false;
      this._groundTargetValue = this._groundAnimTo;
      if (this._groundAnimTo === 0) {
        this._flyGroundActive = false;
      }
    }
  }
  getFloorY() {
    if (this._flyGroundActive) {
      return this._flyFloorY;
    } else {
      return 0;
    }
  }
  getCeilingY() {
    if (this._flyGroundActive) {
      return this._flyCeilingY;
    } else {
      return null;
    }
  }
  _applyVisualProps(scene, sprite, frameName, levelObj, layerProps = null) {
    if (!sprite) {
      return;
    }
    const {
      dx: frameOffsetX,
      dy: frameOffsetY
    } = function (sceneRef, frameRef) {
      let vR2 = resolveAtlasFrame(sceneRef, frameRef);
      if (!vR2) {
        return {
          dx: 0,
          dy: 0
        };
      }
      let phaserFrame = sceneRef.textures.get(vR2.atlas).get(vR2.frame);
      if (!phaserFrame) {
        return {
          dx: 0,
          dy: 0
        };
      }
      let customData = phaserFrame.customData || {};
      if (customData.gjSpriteOffset) {
        return {
          dx: customData.gjSpriteOffset.x || 0,
          dy: -(customData.gjSpriteOffset.y || 0)
        };
      }
      let realW = phaserFrame.realWidth;
      let realH = phaserFrame.realHeight;
      let trimW = phaserFrame.width;
      let trimH = phaserFrame.height;
      let srcX = 0;
      let srcY = 0;
      if (customData.spriteSourceSize) {
        srcX = customData.spriteSourceSize.x || 0;
        srcY = customData.spriteSourceSize.y || 0;
      }
      return {
        dx: realW / 2 - (srcX + trimW / 2),
        dy: realH / 2 - (srcY + trimH / 2)
      };
    }(scene, frameName);
    if (levelObj.flipX) {
      sprite.setFlipX(true);
    }
    if (levelObj.flipY) {
      sprite.setFlipY(true);
    }
    let totalRotationDeg = (sprite.getData("gjBaseRotationDeg") || 0) + levelObj.rot;
    if (totalRotationDeg !== 0) {
      sprite.setAngle(totalRotationDeg);
    }
    if (levelObj.scale !== 1) {
      sprite.setScale(levelObj.scale);
    }
    if (layerProps) {
      if (layerProps.tint !== undefined) {
        sprite.setTint(layerProps.tint);
      } else if (layerProps.black) {
        sprite.setTint(0);
      }
    }
  }
  _addVisualSprite(sprite, layerProps = null) {
    if (sprite) {
      if (layerProps && layerProps.blend === "additive") {
        sprite.setBlendMode(blendAdditive);
        sprite._eeLayer = 0;
      } else if (layerProps && layerProps._portalFront) {
        sprite._eeLayer = 2;
      } else if (layerProps && layerProps.z !== undefined && layerProps.z < 0) {
        sprite._eeLayer = 0;
      } else {
        sprite._eeLayer = 1;
      }
    }
  }
  _getGlowFrameName(frameName) {
    if (frameName && frameName.endsWith("_001.png")) {
      return frameName.replace("_001.png", "_glow_001.png");
    } else {
      return null;
    }
  }
  _addGlowSprite(scene, worldX, worldY, frameName, levelObj, sectionWorldX) {
    let glowFrameName = this._getGlowFrameName(frameName);
    if (!glowFrameName) {
      return;
    }
    if (!resolveAtlasFrame(scene, glowFrameName) && !scene.textures.exists(glowFrameName)) {
      return;
    }
    let glowSprite = addAtlasOrStandaloneImage(scene, worldX, worldY, glowFrameName);
    if (glowSprite) {
      this._applyVisualProps(scene, glowSprite, glowFrameName, levelObj);
      glowSprite.setBlendMode(blendAdditive);
      glowSprite._eeLayer = 0;
      if (sectionWorldX !== undefined) {
        glowSprite._eeWorldX = sectionWorldX;
        glowSprite._eeBaseY = worldY;
        this._addToSection(glowSprite);
      }
    }
  }
  // builds visuals + collision from parsed level objects (see gjObjectById for id to sprite/portal data)
  _spawnLevelObjects(levelObjects) {
    const scene = this._scene;
    this._lastObjectX = 0;
    for (let obj of levelObjects) {
      let def = getGjObjectById(obj.id);
      if (def && def.type === objectTypeTrigger) {
        // color triggers 29/30 - COLOR_ID_BACKGROUND / COLOR_ID_GROUND (GameScene applies via ColorManager)
        if (obj.id === 29 || obj.id === 30) {
          this._colorTriggers.push({
            x: obj.x * 2,
            index: obj.id === 29 ? 1000 : 1001,
            color: {
              r: parseInt(obj._raw[7] ?? 255, 10),
              g: parseInt(obj._raw[8] ?? 255, 10),
              b: parseInt(obj._raw[9] ?? 255, 10)
            },
            duration: parseFloat(obj._raw[10] ?? 0),
            tintGround: obj._raw[14] === "1"
          });
        }
        if (def.enterEffect) {
          this._enterEffectTriggers.push({
            x: obj.x * 2,
            effect: def.enterEffect
          });
        }
        continue;
      }
      let worldX = obj.x * 2;
      let gameY = obj.y * 2;
      if (worldX > this._lastObjectX) {
        this._lastObjectX = worldX;
      }
      let frameName = def ? def.frame : null;
      if (def && def.randomFrames) {
        frameName = def.randomFrames[Math.floor(Math.random() * def.randomFrames.length)];
      }
      if (frameName) {
        let worldX2 = worldX;
        let worldY = gameYToWorldY(gameY);
        const isPortalFrontLayer = (def.type === objectTypePortal || def.type === objectTypeSpeed) && frameName.includes("_front_");
        if (isPortalFrontLayer) {
          const backFrameName = frameName.replace("_front_", "_back_");
          let backSprite = addAtlasOrStandaloneImage(scene, worldX2, worldY, backFrameName);
          if (backSprite) {
            this._applyVisualProps(scene, backSprite, backFrameName, obj);
            backSprite._eeLayer = 1;
            backSprite._eeWorldX = worldX;
            backSprite._eeBaseY = worldY;
            this._addToSection(backSprite);
          }
        }
        if (def.glow) {
          this._addGlowSprite(scene, worldX2, worldY, frameName, obj, worldX);
        }
        const layerProps = isPortalFrontLayer ? {
          ...def,
          _portalFront: true
        } : def;
        let mainSprite = addAtlasOrStandaloneImage(scene, worldX2, worldY, frameName);
        if (mainSprite) {
          this._applyVisualProps(scene, mainSprite, frameName, obj, def);
          this._addVisualSprite(mainSprite, layerProps);
          mainSprite._eeWorldX = worldX;
          mainSprite._eeBaseY = worldY;
          this._addToSection(mainSprite);
        }
        if (def && (def.type === collisionSolid || def.type === collisionHazard)) {
          let detailFrameName = frameName.replace("_001.png", "_2_001.png");
          let detailSprite = resolveAtlasFrame(scene, detailFrameName) ? addAtlasOrStandaloneImage(scene, worldX2, worldY, detailFrameName) : null;
          if (detailSprite) {
            this._applyVisualProps(scene, detailSprite, detailFrameName, obj);
            this._addVisualSprite(detailSprite);
            detailSprite._eeWorldX = worldX;
            detailSprite._eeBaseY = worldY;
            this._addToSection(detailSprite);
          }
        }
        if (def.children) {
          for (let child of def.children) {
            let offsetX = child.dx || 0;
            let offsetY = child.dy || 0;
            if (child.localDx !== undefined || child.localDy !== undefined) {
              let localX = child.localDx || 0;
              let localY = child.localDy || 0;
              if (obj.flipX) {
                localX = -localX;
              }
              if (obj.flipY) {
                localY = -localY;
              }
              let rotRad = (obj.rot || 0) * Math.PI / 180;
              offsetX = localX * Math.cos(rotRad) - localY * Math.sin(rotRad);
              offsetY = localX * Math.sin(rotRad) + localY * Math.cos(rotRad);
            }
            let childSprite = addAtlasOrStandaloneImage(scene, worldX2 + offsetX, worldY + offsetY, child.frame);
            if (childSprite) {
              this._applyVisualProps(scene, childSprite, child.frame, obj, child);
              if (child.audioScale) {
                childSprite.setScale(0.1);
                childSprite.setAlpha(0.9);
                childSprite._eeAudioScale = true;
                this._audioScaleSprites.push(childSprite);
              }
              if ((child.z !== undefined ? child.z : -1) < 0) {
                childSprite._eeLayer = 1;
                childSprite._eeBehindParent = true;
              } else {
                this._addVisualSprite(childSprite, child);
              }
              childSprite._eeWorldX = worldX + offsetX;
              childSprite._eeBaseY = worldY + offsetY;
              this._addToSection(childSprite);
            }
          }
        }
      }
      if (def && def.portalParticle && frameName) {
        let particleAnchorX = worldX;
        let particleY = gameYToWorldY(gameY);
        const particleXOffset = 2;
        let emitterX = particleAnchorX - particleXOffset * 5;
        const emitZone = {
          getRandomPoint: pt => {
            let angle = (Math.random() * 190 + 85) * Math.PI / 180;
            let radius = particleXOffset * 20 + Math.random() * 40 * particleXOffset;
            pt.x = Math.cos(angle) * radius;
            pt.y = Math.sin(angle) * radius;
            return pt;
          }
        };
        const particleTargetRadius = 20;
        let portalParticles = scene.add.particles(emitterX, particleY, "GJ_WebSheet", {
          frame: "square.png",
          lifespan: {
            min: 200,
            max: 1000
          },
          speed: 0,
          scale: {
            start: 0.75,
            end: 0.125
          },
          alpha: {
            start: 0.5,
            end: 0
          },
          tint: def.portalParticleColor,
          blendMode: Phaser.BlendModes.ADD,
          frequency: 20,
          maxParticles: 0,
          emitting: true,
          emitZone: {
            type: "random",
            source: emitZone
          },
          emitCallback: particle => {
            let dx = -particle.x;
            let dy = -particle.y;
            let len = Math.sqrt(dx * dx + dy * dy) || 1;
            let lifeSec = particle.life / 1000;
            let speed = (len - particleTargetRadius) / (lifeSec || 0.3);
            particle.velocityX = dx / len * speed;
            particle.velocityY = dy / len * speed;
          }
        });
        portalParticles.setDepth(14);
        portalParticles._eeLayer = 2;
        portalParticles._eeWorldX = worldX;
        portalParticles._eeBaseY = particleY;
        this._addToSection(portalParticles);
      }
      if (def) {
        if (def.type === collisionSolid && def.gridW > 0 && def.gridH > 0) {
          let solidW = def.gridW * gridCellPx;
          let solidH = def.gridH * gridCellPx;
          let solidRect = new CollisionRect(collisionSolid, worldX, gameY, solidW, solidH);
          this.objects.push(solidRect);
          this._addCollisionToSection(solidRect);
        } else if (def.type === collisionHazard) {
          let hazW = 0;
          let hazH = 0;
          if (def.spriteW > 0 && def.spriteH > 0 && def.hitboxScaleX !== undefined && def.hitboxScaleY !== undefined) {
            hazW = def.spriteW * def.hitboxScaleX * 2;
            hazH = def.spriteH * def.hitboxScaleY * 2;
          } else if (def.gridW > 0 && def.gridH > 0) {
            hazW = def.gridW * 12;
            hazH = def.gridH * 24;
          }
          if (hazW > 0 && hazH > 0) {
            let hazRect = new CollisionRect(collisionHazard, worldX, gameY, hazW, hazH);
            this.objects.push(hazRect);
            this._addCollisionToSection(hazRect);
          }
        } else if (def.type === objectTypePortal) {
          const portalHitboxW = 90;
          let portalH = def.gridH * gridCellPx;
          let portalModeType = null;
          if (def.sub === "fly") {
            portalModeType = objectTypeFlyMode;
          } else if (def.sub === "cube") {
            portalModeType = objectTypeCubeMode;
          }
          if (portalModeType) {
            let portalRect = new CollisionRect(portalModeType, worldX, gameY, portalHitboxW, portalH);
            portalRect.portalY = gameY;
            this.objects.push(portalRect);
            this._addCollisionToSection(portalRect);
          }
        }
      }
    }
    this._colorTriggers.sort((a, b) => a.x - b.x);
    this._enterEffectTriggers.sort((a, b) => a.x - b.x);
    this.endXPos = Math.max(gameWidth + 1200, this._lastObjectX + 680);
  }
  createEndPortal(scene) {
    var gradientFrameRef;
    if (this.endXPos <= 0) {
      return;
    }
    const endX = this.endXPos;
    const portalWorldY = gameYToWorldY(240);
    const pillarCount = Math.round(16);
    this._endPortalContainer = scene.add.container(endX, portalWorldY);
    for (let pi = 0; pi < pillarCount; pi++) {
      const pillar = scene.add.image(0, (pi - Math.floor(pillarCount / 2)) * gridCellPx, "GJ_WebSheet", "square_02_001.png").setAngle(-90);
      this._endPortalContainer.add(pillar);
    }
    this.container.add(this._endPortalContainer);
    this._endPortalShine = scene.add.image(endX - 58, portalWorldY, "GJ_WebSheet", "gradientBar.png");
    const gradientH = ((gradientFrameRef = scene.textures.getFrame("GJ_WebSheet", "gradientBar.png")) == null ? undefined : gradientFrameRef.height) || 64;
    this._endPortalShine.setBlendMode(blendAdditive);
    this._endPortalShine.setTint(tintLimeGreen);
    this._endPortalShine.setScale(1, 960 / gradientH);
    this.additiveContainer.add(this._endPortalShine);
    const endEmitterX = endX - 30;
    const endEmitZone = {
      getRandomPoint: pt => {
        const angle = (85 + Math.random() * 190) * Math.PI / 180;
        const radius = 320 + (Math.random() * 2 - 1) * 80;
        pt.x = Math.cos(angle) * radius;
        pt.y = Math.sin(angle) * radius;
        return pt;
      }
    };
    this._endPortalEmitter = scene.add.particles(endEmitterX, portalWorldY, "GJ_WebSheet", {
      frame: "square.png",
      lifespan: {
        min: 200,
        max: 1000
      },
      speed: 0,
      scale: {
        start: 0.75,
        end: 0.125
      },
      alpha: {
        start: 1,
        end: 0
      },
      tint: tintLimeGreen,
      blendMode: Phaser.BlendModes.ADD,
      frequency: 10,
      maxParticles: 100,
      emitting: true,
      emitZone: {
        type: "random",
        source: endEmitZone
      },
      emitCallback: particle => {
        const dx = -particle.x;
        const dy = -particle.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const speed = (len - 20) / (particle.life / 1000 || 0.3);
        particle.velocityX = dx / len * speed;
        particle.velocityY = dy / len * speed;
      }
    });
    this._endPortalEmitter.setDepth(14);
    this.topContainer.add(this._endPortalEmitter);
    this._endPortalGameY = 240;
  }
  updateEndPortalY(cameraYOffset, allowLowerThanDefault) {
    if (!this._endPortalContainer) {
      return;
    }
    const baseGameY = 140 + cameraYOffset;
    const resolvedGameY = allowLowerThanDefault ? baseGameY : Math.max(240, baseGameY);
    const portalY = gameYToWorldY(resolvedGameY);
    this._endPortalContainer.y = portalY;
    this._endPortalShine.y = portalY;
    this._endPortalEmitter.y = portalY;
    this._endPortalGameY = resolvedGameY;
  }
  checkColorTriggers(playerWorldX) {
    let fired = [];
    while (this._colorTriggerIdx < this._colorTriggers.length) {
      let trig = this._colorTriggers[this._colorTriggerIdx];
      if (!(trig.x <= playerWorldX)) {
        break;
      }
      fired.push(trig);
      this._colorTriggerIdx++;
    }
    return fired;
  }
  resetColorTriggers() {
    this._colorTriggerIdx = 0;
  }
  _addToSection(sprite) {
    const secIdx = Math.max(0, Math.floor(sprite._eeWorldX / 400));
    this._sections[secIdx] ||= [];
    this._sections[secIdx].push(sprite);
    const layer = sprite._eeLayer !== undefined ? sprite._eeLayer : 1;
    if (layer === 2) {
      this.topContainer.add(sprite);
      return;
    }
    if (!this._sectionContainers[secIdx]) {
      const pair = {
        additive: this._scene.add.container(0, 0),
        normal: this._scene.add.container(0, 0)
      };
      this.additiveContainer.add(pair.additive);
      this.container.add(pair.normal);
      this._sectionContainers[secIdx] = pair;
    }
    const containers = this._sectionContainers[secIdx];
    if (layer === 0) {
      containers.additive.add(sprite);
    } else if (sprite._eeBehindParent) {
      containers.normal.addAt(sprite, 0);
    } else {
      containers.normal.add(sprite);
    }
  }
  _addCollisionToSection(collisionRect) {
    const colSec = Math.max(0, Math.floor(collisionRect.x / 400));
    this._collisionSections[colSec] ||= [];
    this._collisionSections[colSec].push(collisionRect);
  }
  _setSectionVisible(sectionIndex, visible) {
    const sec = this._sectionContainers[sectionIndex];
    if (sec) {
      sec.additive.visible = visible;
      sec.normal.visible = visible;
    }
  }
  updateVisibility(cameraX) {
    const maxSec = this._sectionContainers.length - 1;
    if (maxSec < 0) {
      return;
    }
    const visMin = Math.max(0, Math.floor((cameraX - 140) / 400));
    const visMax = Math.min(maxSec, Math.floor((cameraX + gameWidth + 140) / 400));
    const prevMin = this._visMinSec;
    const prevMax = this._visMaxSec;
    if (prevMin < 0) {
      for (let si = 0; si <= maxSec; si++) {
        this._setSectionVisible(si, si >= visMin && si <= visMax);
      }
      this._visMinSec = visMin;
      this._visMaxSec = visMax;
      return;
    }
    if (visMin !== prevMin || visMax !== prevMax) {
      if (visMin > prevMin) {
        for (let h = prevMin; h <= Math.min(visMin - 1, prevMax); h++) {
          this._setSectionVisible(h, false);
        }
      }
      if (visMax < prevMax) {
        for (let h = Math.max(visMax + 1, prevMin); h <= prevMax; h++) {
          this._setSectionVisible(h, false);
        }
      }
      if (visMin < prevMin) {
        for (let h = visMin; h <= Math.min(prevMin - 1, visMax); h++) {
          this._setSectionVisible(h, true);
        }
      }
      if (visMax > prevMax) {
        for (let h = Math.max(prevMax + 1, visMin); h <= visMax; h++) {
          this._setSectionVisible(h, true);
        }
      }
      this._visMinSec = visMin;
      this._visMaxSec = visMax;
    }
  }
  getNearbySectionObjects(worldX) {
    const centerSec = Math.max(0, Math.floor(worldX / 400));
    const fromSec = Math.max(0, centerSec - 1);
    const toSec = Math.min(this._collisionSections.length - 1, centerSec + 1);
    const buf = this._nearbyBuffer;
    buf.length = 0;
    for (let si = fromSec; si <= toSec; si++) {
      const sec = this._collisionSections[si];
      if (sec) {
        for (let oi = 0; oi < sec.length; oi++) {
          buf.push(sec[oi]);
        }
      }
    }
    return buf;
  }
  checkEnterEffectTriggers(playerWorldX) {
    while (this._enterEffectTriggerIdx < this._enterEffectTriggers.length) {
      let row = this._enterEffectTriggers[this._enterEffectTriggerIdx];
      if (!(row.x <= playerWorldX)) {
        break;
      }
      this._activeEnterEffect = row.effect;
      this._activeExitEffect = row.effect;
      this._enterEffectTriggerIdx++;
    }
  }
  resetEnterEffectTriggers() {
    this._enterEffectTriggerIdx = 0;
    this._activeEnterEffect = 0;
    this._activeExitEffect = 0;
    for (let si = 0; si < this._sections.length; si++) {
      this._setSectionVisible(si, true);
      const sec = this._sections[si];
      if (sec) {
        for (let oi = 0; oi < sec.length; oi++) {
          const spr = sec[oi];
          spr._eeActive = false;
          spr.visible = true;
          spr.x = spr._eeWorldX;
          spr.y = spr._eeBaseY;
          if (!spr._eeAudioScale) {
            spr.setScale(1);
          }
          spr.setAlpha(1);
        }
      }
    }
  }
  // scroll-based enter/exit motion for deco (from enterEffect triggers)
  // beat synced rods use _eeAudioScale + updateAudioScale instead
  applyEnterEffects(cameraX) {
    const secW = 400;
    const margin = 140;
    const slidePx = 200;
    const camX = cameraX;
    const camRight = cameraX + gameWidth;
    const camCenterX = cameraX + gameWidth / 2;
    const secFirst = Math.max(0, Math.floor((camX - margin) / secW));
    const secLast = Math.min(this._sections.length - 1, Math.floor((camRight + margin) / secW));
    for (let si = secFirst; si <= secLast; si++) {
      const sec = this._sections[si];
      if (!sec) {
        continue;
      }
      const secLeft = si * secW;
      const fullyOnScreen = secLeft >= camX + margin && secLeft + secW <= camRight - margin;
      for (let oi = 0; oi < sec.length; oi++) {
        const spr = sec[oi];
        if (fullyOnScreen) {
          if (spr._eeActive) {
            spr._eeActive = false;
            spr.y = spr._eeBaseY;
            spr.x = spr._eeWorldX;
            if (!spr._eeAudioScale) {
              spr.setScale(1);
            }
            spr.setAlpha(1);
          }
          continue;
        }
        const worldX = spr._eeWorldX;
        const onRightHalf = worldX > camCenterX;
        let tEdge;
        tEdge = onRightHalf ? Math.max(0, Math.min(1, (camRight - worldX) / margin)) : Math.max(0, Math.min(1, (worldX - camX) / margin));
        if (tEdge >= 1) {
          if (spr._eeActive) {
            spr._eeActive = false;
            spr.y = spr._eeBaseY;
            spr.x = spr._eeWorldX;
            if (!spr._eeAudioScale) {
              spr.setScale(1);
            }
            spr.setAlpha(1);
          }
          continue;
        }
        spr._eeActive = true;
        const effectId = onRightHalf ? this._activeEnterEffect : this._activeExitEffect;
        const invT = 1 - tEdge;
        let y = spr._eeBaseY;
        let x = spr._eeWorldX;
        let alphaT = tEdge;
        let scaleMul = 1;
        switch (effectId) {
          case 0:
            break;
          case 1:
            y = spr._eeBaseY + slidePx * invT;
            break;
          case 2:
            y = spr._eeBaseY - slidePx * invT;
            break;
          case 3:
            x = spr._eeWorldX - slidePx * invT;
            break;
          case 4:
            x = spr._eeWorldX + slidePx * invT;
            break;
          case 5:
            if (!spr._eeAudioScale) {
              scaleMul = tEdge;
            }
            break;
          case 6:
            if (!spr._eeAudioScale) {
              scaleMul = 1 + invT * 0.75;
            }
        }
        if (spr.x !== x) {
          spr.x = x;
        }
        if (spr.y !== y) {
          spr.y = y;
        }
        if (spr.alpha !== alphaT) {
          spr.alpha = alphaT;
        }
        if (!spr._eeAudioScale && spr.scaleX !== scaleMul) {
          spr.setScale(scaleMul);
        }
      }
    }
  }
  setGroundColor(groundTint) {
    for (let g of this._groundTiles) {
      g.setTint(groundTint);
    }
    for (let c of this._ceilingTiles) {
      c.setTint(groundTint);
    }
  }
  // rod/orb sprites with _eeAudioScale - beat pulses from logic in GameScene (not enterEffect)
  updateAudioScale(scaleValue) {
    for (let s of this._audioScaleSprites) {
      s.setScale(scaleValue);
    }
  }
  resetVisibility() {
    this._visMinSec = -1;
    this._visMaxSec = -1;
  }
  resetObjects() {
    for (let o of this.objects) {
      o.activated = false;
    }
    for (let s of this._audioScaleSprites) {
      s.setScale(0.1);
    }
  }
}
