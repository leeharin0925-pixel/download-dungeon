import { app as p, BrowserWindow as v, ipcMain as f } from "electron";
import { fileURLToPath as j } from "node:url";
import r from "node:path";
import d from "node:fs/promises";
const M = r.dirname(j(import.meta.url)), g = "DungeonSorted";
function P(n) {
  const s = n.replace(/^\./, "").toLowerCase(), o = ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg", "ico", "heic", "avif"], t = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "md", "rtf", "odt", "ods", "csv"], m = ["zip", "rar", "7z", "tar", "gz", "bz2", "xz"], i = ["mp4", "mkv", "webm", "mov", "avi", "wmv", "m4v"], a = ["mp3", "wav", "flac", "aac", "ogg", "m4a", "wma"], e = ["js", "ts", "tsx", "jsx", "py", "java", "cpp", "c", "h", "rs", "go", "html", "css", "json", "vue", "svelte"];
  return o.includes(s) ? "Images" : t.includes(s) ? "Documents" : m.includes(s) ? "Archives" : i.includes(s) ? "Video" : a.includes(s) ? "Audio" : e.includes(s) ? "Code" : "Other";
}
async function D(n) {
  try {
    await d.access(n);
  } catch {
    return n;
  }
  const s = r.dirname(n), o = r.basename(n), t = r.extname(o), m = t ? o.slice(0, -t.length) : o;
  let i = 1;
  for (; ; ) {
    const a = r.join(s, `${m} (${i})${t}`);
    try {
      await d.access(a), i++;
    } catch {
      return a;
    }
  }
}
function _(n) {
  const s = n.toLowerCase();
  return s.startsWith("~$") ? !0 : s.endsWith(".tmp") || s.endsWith(".temp") || s.endsWith(".part") || s.endsWith(".crdownload") || s.endsWith(".download") || s.endsWith(".bak");
}
function x(n, s) {
  const o = [];
  let t = 0;
  const m = 24 * 60 * 60 * 1e3, i = (s - n.atimeMs) / m;
  if (i >= 30) {
    const a = Math.min(35, Math.floor((i - 30) / 7) * 3);
    t += 40 + a, o.push(`${Math.floor(i)}일 미접근`);
  }
  return n.size >= 500 * 1024 * 1024 ? (t += 36, o.push("대용량(500MB+)")) : n.size >= 100 * 1024 * 1024 ? (t += 24, o.push("중대용량(100MB+)")) : n.size >= 25 * 1024 * 1024 && (t += 12, o.push("용량 큼(25MB+)")), _(n.name) && (t += 45, o.push("임시파일 패턴")), { score: t, reasons: o };
}
process.env.APP_ROOT = r.join(M, "..");
const w = process.env.VITE_DEV_SERVER_URL, C = r.join(process.env.APP_ROOT, "dist-electron"), y = r.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = w ? r.join(process.env.APP_ROOT, "public") : y;
let u;
function z() {
  u = new v({
    icon: r.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: r.join(M, "preload.mjs")
    }
  }), u.webContents.on("did-finish-load", () => {
    u == null || u.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), w ? u.loadURL(w) : u.loadFile(r.join(y, "index.html"));
}
p.on("window-all-closed", () => {
  process.platform !== "darwin" && (p.quit(), u = null);
});
p.on("activate", () => {
  v.getAllWindows().length === 0 && z();
});
function R() {
  f.handle("dungeon:analyzeDownloads", async () => {
    const n = p.getPath("downloads"), s = await d.readdir(n, { withFileTypes: !0 }), o = [];
    for (const e of s) {
      if (!e.isFile() || e.name.startsWith(".")) continue;
      const c = r.join(n, e.name), l = await d.stat(c);
      o.push({ name: e.name, size: l.size, mtimeMs: l.mtimeMs, atimeMs: l.atimeMs });
    }
    const t = /* @__PURE__ */ new Map();
    for (const e of o) {
      const c = `${e.name.toLowerCase()}::${e.size}`, l = t.get(c);
      l ? l.push(e) : t.set(c, [e]);
    }
    const m = Array.from(t.values()).filter((e) => e.length > 1).map((e) => ({ name: e[0].name, size: e[0].size, count: e.length, files: e.map((c) => c.name) })).sort((e, c) => c.count - e.count || c.size - e.size || e.name.localeCompare(c.name)), i = Date.now(), a = o.map((e) => {
      const c = x(e, i);
      return { name: e.name, size: e.size, atimeMs: e.atimeMs, score: c.score, reasons: c.reasons };
    }).filter((e) => e.score >= 35).sort((e, c) => c.score - e.score || c.size - e.size || e.name.localeCompare(c.name)).slice(0, 20);
    return { root: n, duplicateGroups: m, recommendations: a, scannedFileCount: o.length };
  }), f.handle("dungeon:scanDownloads", async () => {
    const n = p.getPath("downloads"), s = await d.readdir(n, { withFileTypes: !0 }), o = [];
    for (const t of s) {
      const m = r.join(n, t.name);
      if (t.isDirectory()) {
        if (t.name === g) continue;
        const a = await d.stat(m);
        o.push({ name: t.name, isDirectory: !0, ext: "", size: 0, mtimeMs: a.mtimeMs });
        continue;
      }
      if (!t.isFile()) continue;
      const i = await d.stat(m);
      o.push({ name: t.name, isDirectory: !1, ext: r.extname(t.name), size: i.size, mtimeMs: i.mtimeMs });
    }
    return { root: n, items: o };
  }), f.handle("dungeon:organizeDownloads", async () => {
    const n = p.getPath("downloads"), s = r.join(n, g);
    await d.mkdir(s, { recursive: !0 });
    const o = await d.readdir(n, { withFileTypes: !0 });
    let t = 0;
    const m = [], i = [];
    for (const a of o) {
      if (!a.isFile() || a.name.startsWith(".")) continue;
      const e = P(r.extname(a.name)), c = r.join(s, e);
      await d.mkdir(c, { recursive: !0 });
      const l = r.join(n, a.name);
      let h = r.join(c, a.name);
      h = await D(h);
      try {
        await d.rename(l, h), t++, m.push(a.name);
      } catch {
        i.push(a.name);
      }
    }
    return { moved: t, moves: m, failed: i };
  }), f.handle("dungeon:deleteFiles", async (n, s) => {
    const o = p.getPath("downloads");
    let t = 0;
    const m = [];
    for (const i of s) {
      if (i.includes("/") || i.includes("\\") || i.includes("..")) {
        m.push(i);
        continue;
      }
      const a = r.join(o, i);
      if (!a.startsWith(o)) {
        m.push(i);
        continue;
      }
      try {
        await d.unlink(a), t++;
      } catch {
        m.push(i);
      }
    }
    return { deleted: t, failed: m };
  });
}
p.whenReady().then(() => {
  R(), z();
});
export {
  C as MAIN_DIST,
  y as RENDERER_DIST,
  w as VITE_DEV_SERVER_URL
};
