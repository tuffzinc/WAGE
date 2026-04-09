// object type tags used by the registry and GameLevel collision/spawn logic
const objectTypeDeco = "deco";
const objectTypePortal = "portal";
const objectTypePad = "pad";
const objectTypeRing = "ring";
const objectTypeTrigger = "trigger";
const objectTypeSpeed = "speed";
const objectTypeFlyMode = "fly";
const objectTypeCubeMode = "cube";

// object registry data: assets/data/objects.json (loaded in BootScene, see initobjectsFromJson)
let gjObjectById = {};
function initobjectsFromJson(pack) {
  gjObjectById = {};
  if (!pack || typeof pack.objects !== "object") {
    return;
  }
  const raw = pack.objects;
  for (const key of Object.keys(raw)) {
    gjObjectById[+key] = raw[key];
  }
  const glowIds = pack.glowObjectIds || [];
  for (let gi = 0; gi < glowIds.length; gi++) {
    const oid = glowIds[gi];
    if (gjObjectById[oid]) {
      gjObjectById[oid].glow = true;
    }
  }
}
function getGjObjectById(objectId) {
  return gjObjectById[objectId] || null;
}
