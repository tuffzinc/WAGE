// merges all game code and dependencies back into one

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(root, "src");
const manifest = path.join(src, "manifest.json");
const outfile = path.join(root, "dist.js");
const strip = process.env.STRIP_GAME_BANNERS !== "0";

function stripfirstbanner(text) {
    const s = text.trimStart();
    if (!s.startsWith("/**")) {return text}
    const end = s.indexOf("*/");
    if (end === -1) {return text}
    return s.slice(end + 2).replace(/^\s*/, "");
}

function assembleall() {
    const { segments } = JSON.parse(fs.readFileSync(manifest, "utf8"));
    const parts = [];
    for (const seg of segments) {
        const file = path.join(src, seg.file);
        if (!fs.existsSync(file)) {throw new Error("missing file?! " + seg.file)}
        let body = fs.readFileSync(file, "utf8");
        if (strip) {body = stripfirstbanner(body)}
        parts.push(body.trimEnd());
    }
    const text = parts.join("\n") + "\n";
    fs.writeFileSync(outfile, text, "utf8");
    console.log("wrote dist.js (" + text.split(/\r?\n/).length + " lines, " + Math.round(text.length / 1024) + " KiB)");
}
assembleall();
console.log("done!");
