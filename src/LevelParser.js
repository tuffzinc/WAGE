// level string parsing for the level format
function parseGjLevelObjectRecord(recordText) {
  const fields = recordText.split(",");
  const rawByKey = {};

  for (let i = 0; i + 1 < fields.length; i += 2) {
    const key = parseInt(fields[i], 10);
    const value = fields[i + 1];
    rawByKey[key] = value;
  }
  const objectId = parseInt(rawByKey[1] || "0", 10);
  if (objectId === 0) {
    return null;
  }
  return {
    id: objectId,
    x: parseFloat(rawByKey[2] || "0"),
    y: parseFloat(rawByKey[3] || "0"),
    flipX: rawByKey[4] === "1",
    flipY: rawByKey[5] === "1",
    rot: parseFloat(rawByKey[6] || "0"),
    scale: parseFloat(rawByKey[32] || "1"),
    zLayer: parseInt(rawByKey[24] || "0", 10),
    zOrder: parseInt(rawByKey[25] || "0", 10),
    groups: rawByKey[57] || "",
    color1: parseInt(rawByKey[21] || "0", 10),
    color2: parseInt(rawByKey[22] || "0", 10),
    _raw: rawByKey
  };
}

function parseCompressedGjLevelString(levelBase64) {
  const normalizedBase64 = (function normalizeBase64(raw) {
    let padded = raw.replace(/-/g, "+").replace(/_/g, "/");
    while (padded.length % 4 !== 0) {
      padded += "=";
    }
    return padded;
  })(levelBase64.trim());

  const binary = atob(normalizedBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  const inflated = zlibExports.inflate(bytes);
  const decoded = new TextDecoder().decode(inflated);

  const parts = decoded.split(";");
  const settingsHeader = parts.length > 0 ? parts[0] : "";
  const objects = [];

  for (let i = 1; i < parts.length; i++) {
    if (parts[i].length === 0) {
      continue;
    }
    const parsedObject = parseGjLevelObjectRecord(parts[i]);
    if (parsedObject) {
      objects.push(parsedObject);
    }
  }

  return {
    settings: settingsHeader,
    objects
  };
}
