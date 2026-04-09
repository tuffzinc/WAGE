const TEXTURE_ATLAS_KEYS = ["GJ_WebSheet"];

function resolveAtlasFrame(scene, frameKey) {
  for (let atlasKey of TEXTURE_ATLAS_KEYS) {
    if (scene.textures.exists(atlasKey)) {
      if (scene.textures.get(atlasKey).has(frameKey)) {
        return {
          atlas: atlasKey,
          frame: frameKey
        };
      }
    }
  }
  return null;
}

function addAtlasOrStandaloneImage(scene, x, y, textureKeyOrFrame) {
  const hit = resolveAtlasFrame(scene, textureKeyOrFrame);
  if (hit) {
    return scene.add.image(x, y, hit.atlas, hit.frame);
  }
  if (scene.textures.exists(textureKeyOrFrame)) {
    return scene.add.image(x, y, textureKeyOrFrame);
  }
  return null;
}
