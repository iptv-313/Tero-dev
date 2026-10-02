import { useState, useEffect, useRef, useCallback, useMemo } from "react";

const PROXY = import.meta.env.VITE_PROXY_URL || "http://localhost:3001";
const CATALOG_API = import.meta.env.VITE_CATALOG_URL || PROXY;

async function stalkerFetch(path, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("X-Auth-Code", localStorage.getItem("sv-auth-code") || "");
  return fetch(`${PROXY}${path}`, { ...init, headers });
}

// ══════════════════════════════════════════════════════════════════
// THEMES (OTT Navigator style multi-theme)
// ══════════════════════════════════════════════════════════════════
const THEMES = {
  Dark:   { bg:"#f4f2eb", s1:"#fffdf7", s2:"#eeece3", s3:"#e4e1d7", accent:"#ef5a43", accent2:"#345b9b", t1:"#202722", t2:"#59635b", t3:"#858c82" },
 
};
const THEME_NAMES = Object.keys(THEMES);
const PROFILE_COLORS = ["#ef5a43"];

// ══════════════════════════════════════════════════════════════════
// STORAGE + GUEST SESSION
// ══════════════════════════════════════════════════════════════════
function getGuestId() {
  let id = localStorage.getItem("sv-guest-id");
  if (!id) { id = crypto.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem("sv-guest-id", id); }
  return id;
}
const GUEST_ID = getGuestId();

// Cloud sync is handled by per-connection D1 catalog API (syncContentToD1, etc.)
// Legacy session sync disabled — no /api/session endpoint on CF Worker
function scheduleCloudSync() {}

const db = {
  async get(key, fallback = null) {
    try {
      if (window.storage) { const r = await window.storage.get(key); return r ? JSON.parse(r.value) : fallback; }
      const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback;
    } catch { return fallback; }
  },
  async set(key, value) {
    try {
      if (window.storage) { await window.storage.set(key, JSON.stringify(value)); }
      else localStorage.setItem(key, JSON.stringify(value));
      scheduleCloudSync();
    } catch {}
  },
};

// IndexedDB cache for large stalker data (avoids localStorage 5MB limit)
const idbCache = (() => {
  let dbP;
  function open() {
    if (dbP) return dbP;
    dbP = new Promise(r => {
      const req = indexedDB.open("sv-stalker-cache", 1);
      req.onupgradeneeded = () => req.result.createObjectStore("c");
      req.onsuccess = () => r(req.result);
      req.onerror = () => r(null);
    });
    return dbP;
  }
  return {
    async get(key) {
      const d = await open(); if (!d) return null;
      return new Promise(r => { const g = d.transaction("c","readonly").objectStore("c").get(key); g.onsuccess = () => r(g.result ?? null); g.onerror = () => r(null); });
    },
    async set(key, val) {
      const d = await open(); if (!d) return;
      return new Promise(r => { const tx = d.transaction("c","readwrite"); tx.objectStore("c").put(val, key); tx.oncomplete = () => r(); tx.onerror = () => r(); });
    },
  };
})();

// Deterministic connection ID for IDB/D1 keying
function connId(c) {
  if (!c) return null;
  if (c.type === "stalker") return `stalker:${c.server}:${c.mac}`;
  if (c.type === "xtream") return `xtream:${c.server}:${c.user}`;
  if (c.type === "m3u") return `m3u:${c.url}`;
  return "hls";
}

// D1 catalog API helper (fire-and-forget background sync)
function catalogAPI(path, opts = {}) {
  const { method = "GET", body } = opts;
  const headers = { "X-Guest-Id": GUEST_ID };
  if (body) headers["Content-Type"] = "application/json";
  return fetch(`${CATALOG_API}/api/catalog/${path}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  }).then(r => r.json()).catch(() => null);
}

function syncContentToD1(connectionId, type, items) {
  catalogAPI("content", { method: "PUT", body: { connectionId, type, items: items.map(i => ({
    id: i.id, name: i.name, logo: i.logo, group: i.group, url: i.url,
    num: i.num, epgId: i.epgId, year: i.year, rating: i.rating,
    stalkerCmd: i._stalkerCmd || i.stalkerCmd,
  })) } });
}

function syncCategoriesToD1(connectionId, section, categories) {
  catalogAPI("categories", { method: "PUT", body: { connectionId, section, categories } });
}

function syncConnectionToD1(id, type, config) {
  // Strip large arrays (channels, etc.) — content is synced separately via syncContentToD1
  const { channels, ...light } = config;
  catalogAPI("connections", { method: "PUT", body: { id, type, config: light } });
}

function syncFavoritesToD1(connectionId, favorites) {
  catalogAPI("favorites", { method: "PUT", body: { profileId: connectionId, favorites } });
}

function syncHistoryToD1(history) {
  catalogAPI("history", { method: "PUT", body: { history } });
}

function syncPreferencesToD1(prefs) {
  catalogAPI("preferences", { method: "PUT", body: { preferences: prefs } });
}

// Migrate old idbCache/localStorage data to new permanent IDB keys
async function migrateOldCache() {
  try {
    const migrated = await idbCache.get("sv-migrated-v2");
    if (migrated) return;
    // Migrate old stalker category caches from localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("sv-s-") && key.includes("cats-")) {
        try {
          const { cats } = JSON.parse(localStorage.getItem(key));
          if (cats) {
            // Extract server from key: sv-s-{section}cats-{server}
            const match = key.match(/^sv-s-(vod|series)cats-(.+)$/);
            if (match) await idbCache.set(`cats-ls:${match[2]}:${match[1]}`, cats);
          }
        } catch {}
      }
    }
    // Migrate old stalker channel caches (stored via db.set → localStorage)
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("sv-stalker-channels-")) {
        try {
          const channels = JSON.parse(localStorage.getItem(key));
          if (channels) {
            const server = key.replace("sv-stalker-channels-", "");
            await idbCache.set(`channels-ls:${server}`, channels);
          }
        } catch {}
      }
    }
    await idbCache.set("sv-migrated-v2", true);
  } catch {}
}
migrateOldCache();

// Cloud restore disabled — D1 catalog API handles persistence per-connection
// Future: restore connections list from D1 on first load

// ══════════════════════════════════════════════════════════════════
// UTILS
// ══════════════════════════════════════════════════════════════════
function parseM3U(text) {
  const lines = text.split("\n"); const out = [];
  let cur = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith("#EXTINF")) {
      const name   = (line.match(/,(.+)$/) || [])[1]?.trim() || "Unknown";
      const logo   = (line.match(/tvg-logo="([^"]+)"/) || [])[1] || null;
      const group  = (line.match(/group-title="([^"]+)"/) || [])[1] || "Uncategorized";
      const epgId  = (line.match(/tvg-id="([^"]+)"/) || [])[1] || null;
      const num    = parseInt((line.match(/tvg-chno="([^"]+)"/) || [])[1]) || null;
      cur = { name, logo, group, epgId, num, type:"live" };
    } else if (line && !line.startsWith("#") && cur) {
      cur.url = line; cur.id = cur.url; out.push(cur); cur = null;
    }
  }
  return out;
}

function parseXMLTV(xml) {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  const programs = {};
  doc.querySelectorAll("programme").forEach(p => {
    const ch = p.getAttribute("channel")?.toLowerCase().trim();
    if (!ch) return;
    const start = parseEPGDate(p.getAttribute("start"));
    const stop  = parseEPGDate(p.getAttribute("stop"));
    if (!programs[ch]) programs[ch] = [];
    programs[ch].push({ title: p.querySelector("title")?.textContent || "", start, stop });
  });
  return programs;
}

function parseEPGDate(s) {
  if (!s) return 0;
  const m = s.match(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
  if (!m) return 0;
  return new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`).getTime();
}

function getEPGNow(programs, epgId) {
  if (!programs || !epgId) return null;
  const key = epgId.toLowerCase().trim();
  const list = programs[key] || programs[epgId] || [];
  const now = Date.now();
  return list.find(p => p.start <= now && p.stop > now) || null;
}

function epgLookup(epgData, ch) {
  if (!epgData) return null;
  // Try normalized epgId (xmltv_id), then raw, then channel numeric id
  const norm = ch.epgId?.toLowerCase().trim();
  return (norm && epgData[norm]) || (ch.epgId && epgData[ch.epgId]) || (ch.id && epgData[ch.id]) || null;
}

function fmtTime(sec) {
  if (!sec) return "0:00";
  const h = Math.floor(sec/3600), m = Math.floor((sec%3600)/60), s = Math.floor(sec%60);
  return h > 0 ? `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}` : `${m}:${String(s).padStart(2,"0")}`;
}

async function proxyFetch(url) {
  const path = `/proxy?url=${encodeURIComponent(url)}`;
  let res = await fetch(`${CATALOG_API}${path}`).catch(() => null);
  if (!res?.ok) res = await fetch(`${PROXY}${path}`);
  return res;
}

function makeXtreamAPI(server, user, pass) {
  const base = `${server}/player_api.php?username=${user}&password=${pass}`;
  return {
    auth: () => proxyFetch(base).then(r => r.json()),
    getLiveCategories: () => proxyFetch(`${base}&action=get_live_categories`).then(r => r.json()),
    getLive: () => proxyFetch(`${base}&action=get_live_streams`).then(r => r.json()),
    liveURL: id => `${server}/live/${user}/${pass}/${id}.ts`,
  };
}

function uid() { return Math.random().toString(36).slice(2,10); }

// Transform stalker item URL: extract direct HTTP URLs, store original as _stalkerCmd
function transformStalkerItem(item) {
  if (item._stalkerCmd !== undefined) return item;
  const raw = (item.url || "").replace(/^ffmpeg\s+/, "").trim();
  const isDirect = raw.startsWith("http") && !raw.includes("localhost");
  return { ...item, _stalkerCmd: item.url, url: isDirect ? raw : null };
}

// ══════════════════════════════════════════════════════════════════
// CSS GENERATOR - ULTRA MODERN PREMIUM RE-DESIGN
// ══════════════════════════════════════════════════════════════════
function genCSS(t) {
  const isLight = t.bg === "#ffffff" || t.bg === "#f8f9fc";
  const b1 = isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.04)";
  const b2 = isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.08)";
  return `
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Rajdhani:wght@600;700&family=Space+Grotesk:wght@500;600;700&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

:root{
  --bg:${t.bg};--s1:${t.s1};--s2:${t.s2};--s3:${t.s3};
  --b1:${b1};--b2:${b2};
  --accent:${t.accent};--accent2:${t.accent2};
  --glow:${t.accent}22;
  --t1:${t.t1};--t2:${t.t2};--t3:${t.t3};
  --danger:#ff3b5c;--ok:#00e699;
  --shadow:${isLight ? "rgba(0,0,0,0.04)" : "rgba(0,0,0,0.4)"};
  --hover-bg:${isLight ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.02)"};
  --radius-lg: 16px;--radius-md: 10px;--radius-sm: 6px;
}

body{background:var(--bg);font-family:'Plus Jakarta Sans',sans-serif;color:var(--t1);overflow:hidden;overflow-y:auto;-webkit-font-smoothing:antialiased}
.app{display:flex;height:100vh;overflow:hidden;background:var(--bg)}

/* SETUP */
.setup{min-height:100vh;display:flex;align-items:center;justify-content:center;
  background:radial-gradient(circle at 10% 20%,${t.accent2}15 0%,transparent 45%),
             radial-gradient(circle at 90% 80%,${t.accent}12 0%,transparent 45%),var(--bg);padding:2rem}
.card{background:var(--s1);border:1px solid var(--b2);border-radius:var(--radius-lg);padding:2.8rem 2.5rem;
  width:100%;max-width:480px;box-shadow:0 30px 70px var(--shadow);backdrop-filter:blur(10px)}
.logo{font-family:'Rajdhani',sans-serif;font-size:2.4rem;font-weight:700;letter-spacing:.08em;
  background:linear-gradient(135deg,var(--accent),var(--accent2));-webkit-background-clip:text;
  -webkit-text-fill-color:transparent;background-clip:text;margin-bottom:.3rem;text-transform:uppercase}
.tagline{color:var(--t2);font-size:.85rem;margin-bottom:2.2rem;font-weight:500;opacity:0.8}
.tabs{display:flex;gap:.25rem;background:var(--s2);padding:5px;border-radius:var(--radius-md);margin-bottom:1.6rem;border:1px solid var(--b1)}
.tab{flex:1;padding:.55rem .3rem;background:none;border:none;border-radius:7px;color:var(--t2);
  font-family:inherit;font-size:.75rem;font-weight:600;cursor:pointer;transition:all .2s ease;text-align:center;white-space:nowrap}
.tab.on{background:var(--s3);color:var(--accent);box-shadow:0 4px 12px var(--shadow);border:1px solid var(--b1)}
.fg{margin-bottom:1.2rem}
.fl{display:block;font-size:.72rem;font-weight:700;color:var(--t2);text-transform:uppercase;letter-spacing:.06em;margin-bottom:.5rem;opacity:0.9}
.fi{width:100%;background:var(--s2);border:1px solid var(--b2);border-radius:var(--radius-md);
  padding:.7rem 1rem;color:var(--t1);font-family:inherit;font-size:.88rem;outline:none;transition:all .2s ease}
.fi:focus{border-color:var(--accent);box-shadow:0 0 0 4px var(--glow);background:var(--s1)}
.fhint{font-size:.7rem;color:var(--t3);margin-top:.4rem;line-height:1.4}
.btn-primary{width:100%;padding:.85rem;background:linear-gradient(135deg,var(--accent),var(--accent2));
  border:none;border-radius:var(--radius-md);color:#fff;font-family:'Rajdhani',sans-serif;font-size:1.1rem;
  font-weight:700;letter-spacing:.04em;cursor:pointer;transition:all .2s ease;margin-top:.8rem;box-shadow:0 4px 15px ${t.accent}30}
.btn-primary:hover{filter:brightness(1.1);transform:translateY(-1px)}
.btn-primary:disabled{opacity:.4;cursor:not-allowed;transform:none;box-shadow:none}
.err{background:var(--danger)10;border:1px solid var(--danger)25;border-radius:var(--radius-md);padding:.75rem 1rem;color:var(--danger);font-size:.82rem;margin-bottom:1.2rem;font-weight:500}

/* SIDEBAR */
.sidebar{width:230px;flex-shrink:0;background:var(--s1);border-right:1px solid var(--b1);
  display:flex;flex-direction:column;padding:1.5rem 0;overflow-y:auto;overflow-x:hidden}
.s-logo{font-family:'Rajdhani',sans-serif;font-size:1.5rem;font-weight:700;letter-spacing:.08em;
  background:linear-gradient(135deg,var(--accent),var(--accent2));-webkit-background-clip:text;
  -webkit-text-fill-color:transparent;background-clip:text;padding:0 1.2rem;margin-bottom:1.6rem}
.s-sect{font-size:.65rem;font-weight:700;text-transform:uppercase;letter-spacing:.12em;
  color:var(--t3);padding:0 1.2rem;margin:1.1rem 0 .4rem;opacity:0.8}
.nav{display:flex;align-items:center;gap:.65rem;padding:.58rem 1.2rem;color:var(--t2);
  font-size:.85rem;font-weight:500;cursor:pointer;transition:all .2s;border-left:3px solid transparent}
.nav:hover{color:var(--t1);background:var(--hover-bg)}
.nav.on{color:var(--accent);background:linear-gradient(90deg, ${t.accent}10, transparent);border-left-color:var(--accent);font-weight:600}
.nav-icon{font-size:.95rem;width:20px;text-align:center;flex-shrink:0;opacity:0.85}
.nav.on .nav-icon{opacity:1}
.nav-badge{margin-left:auto;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;font-size:.58rem;font-weight:700;
  padding:.15rem .45rem;border-radius:20px;box-shadow:0 2px 6px ${t.accent2}30}

.btn-sm{flex:1;padding:.45rem .5rem;background:var(--s2);border:1px solid var(--b2);border-radius:var(--radius-sm);
  color:var(--t2);font-family:inherit;font-size:.72rem;font-weight:500;cursor:pointer;transition:all .2s;text-align:center}
.btn-sm:hover{background:var(--s3);color:var(--t1);border-color:var(--accent)}
.btn-sm.danger{color:var(--danger);border-color:var(--danger)30}
.btn-sm.danger:hover{background:var(--danger)10;border-color:var(--danger)}

/* CONNECTION CARD - PREMIUM UPDATED */
.conn-card{padding:.75rem .85rem;background:var(--s2);border:1px solid var(--b2);
  border-left:4px solid var(--accent);border-radius:25px;cursor:pointer;transition:all .25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow:0 2px 6px var(--shadow)}
.conn-card:hover{border-color:var(--accent);background:var(--s3);transform:translateY(-2px);box-shadow:0 6px 16px var(--shadow)}
.conn-card-row{display:flex;align-items:center;gap:.6rem}
.conn-card-icon{font-size:1.1rem;flex-shrink:0;color:var(--accent)}
.conn-card-info{flex:1;min-width:0}
.conn-card-label{font-size:.8rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--t1)}
.conn-card-stats{font-size:.65rem;color:var(--t3);margin-top:.15rem}
.conn-card-switch{font-size:.62rem;color:var(--accent);text-align:right;margin-top:.4rem;font-weight:700;text-transform:uppercase;letter-spacing:0.5px}

/* CONTENT */
.header-actions{
    display:flex;
    align-items:center;
    gap:.5rem;
}
.hamburger{

    display:none;
  justify-content:center;
    width:40px;
    height:40px;

    border:none;
    border-radius:10px;

    background:var(--s2);

    color:var(--t1);

    cursor:pointer;

    font-size:20px;

}
    .mobile-menu{
    display:none;
  position:absolute;
  top:70px;
  left:16px;
  width:240px;
  background:var(--s1);
  border:1px solid var(--b1);
  border-radius:12px;
  padding:.6rem;
  display:flex;
  flex-direction:column;
  gap:.4rem;
  z-index:9999;
  box-shadow:0 10px 25px rgba(0,0,0,.35);
}



.menu-btn{
  width:100%;
  border:none;
  background:transparent;
  color:var(--t1);
  padding:.75rem 1rem;
  border-radius:8px;
  cursor:pointer;
  text-align:left;
  font-size:.85rem;
  transition:.2s;
}

.menu-btn:hover{
  background:var(--s2);
}

.menu-btn.danger{
  color:#ff6b6b;
}

.menu-btn.danger:hover{
  background:rgba(255,107,107,.12);
}
.content{flex:1;display:flex;flex-direction:column;overflow:hidden}
.c-header{padding:1.2rem 1.6rem;border-bottom:1px solid var(--b1);display:flex;align-items:center;gap:1rem;flex-shrink:0}
.s-bottom{border-top:1px solid var(--b1);display:flex;flex-direction:column;gap:.5rem}
.s-row{display:flex;gap:.5rem}
.c-title{font-family:'Rajdhani',sans-serif;font-size:1.6rem;font-weight:700;letter-spacing:.02em;margin-right:auto}
.c-count{font-size:.75rem;color:var(--t3);margin-left:.5rem;font-family:inherit;font-weight:500}
.c-search-wrap{position:relative;display:flex;align-items:center}
.c-search{background:var(--s2);border:1px solid var(--b2);border-radius:var(--radius-md);padding:.45rem .875rem .45rem 2.2rem;
  color:var(--t1);font-family:inherit;font-size:.82rem;outline:none;width:210px;transition:all .25s ease}
.c-search:focus{border-color:var(--accent);width:260px;background:var(--s1);box-shadow:0 0 0 0px var(--glow)}

.c-btn{padding:.45rem .85rem;background:var(--s2);border:1px solid var(--b2);border-radius:var(--radius-md);
  color:var(--t2);font-family:inherit;font-size:.78rem;font-weight:500;cursor:pointer;transition:all .2s;white-space:nowrap}
.c-btn:hover{color:var(--t1);border-color:var(--accent)}
.c-btn.active{color:var(--accent);border-color:${t.accent}40;background:${t.accent}12;font-weight:600}
.c-body{flex:1;overflow:hidden;padding:1.2rem 1.6rem;display:flex;gap:1.4rem;min-height:0}

/* CATEGORIES */
.cats{width:auto;flex-shrink:0;overflow-y:auto;overflow-x:hidden;height:0;min-height:100%}
.cat{padding:.48rem .75rem;border-radius:var(--radius-md);font-size:.78rem;font-weight:500;color:var(--t2);cursor:pointer;
  transition:all .15s ease;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  display:flex;align-items:center;gap:.5rem}
.cat:hover{background:var(--s2);color:var(--t1)}
.cat.on{background:${t.accent}12;color:var(--accent);font-weight:600}
.cat-hidden{opacity:.35}

/* CARDS */
.ch-grid{flex:1;display:grid;grid-template-columns:repeat(auto-fill,minmax(155px,1fr));gap:.75rem;align-content:start}
.ch-card{background:var(--s1);border:1px solid var(--b1);border-radius:var(--radius-lg);padding:1rem .8rem;
  cursor:pointer;transition:all .25s cubic-bezier(0.4, 0, 0.2, 1);display:flex;flex-direction:column;align-items:center;gap:.6rem;text-align:center;position:relative}
.ch-card:hover{border-color:var(--b2);background:var(--s2);transform:translateY(-3px);box-shadow:0 12px 24px var(--shadow)}
.ch-card.playing{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent),0 12px 24px var(--glow);background:linear-gradient(180deg, var(--s1), ${t.accent}05)}
.ch-logo{width:46px;height:46px;object-fit:contain;border-radius:8px;background:var(--s2);border:1px solid var(--b1)}
.ch-logo-ph{width:46px;height:46px;background:var(--s3);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;font-weight:bold;color:var(--accent)}
.ch-name{font-size:.75rem;font-weight:600;line-height:1.4;overflow:hidden;text-overflow:ellipsis;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.ch-meta{font-size:.65rem;color:var(--t3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}
.ch-num{font-size:.62rem;color:var(--t3);background:var(--s2);padding:2px 6px;border-radius:4px}
.fav-btn{position:absolute;top:.5rem;right:.5rem;background:none;border:none;cursor:pointer;
  font-size:.9rem;opacity:.3;transition:all .2s;line-height:1;padding:.15rem}
.fav-btn:hover{opacity:1;transform:scale(1.2);color:var(--accent)}
.fav-btn.on{opacity:1;color:var(--accent)}
.live-dot{width:6px;height:6px;border-radius:50%;background:var(--danger);display:inline-block;margin-right:4px;animation:blink 1.5s infinite;box-shadow:0 0 8px var(--danger)}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}

.vod-grid{flex:1;display:grid;grid-template-columns:repeat(auto-fill,minmax(138px,1fr));gap:.9rem;align-content:start}
.vod-card{background:var(--s1);border:1px solid var(--b1);border-radius:var(--radius-lg);overflow:hidden;cursor:pointer;
  transition:all .25s cubic-bezier(0.4, 0, 0.2, 1);position:relative;box-shadow:0 4px 10px var(--shadow)}
.vod-card:hover{border-color:var(--accent);transform:translateY(-4px);box-shadow:0 16px 36px var(--shadow)}
.vod-poster{width:100%;aspect-ratio:2/3;object-fit:cover;background:var(--s2);display:block;transition:transform 0.3s}
.vod-card:hover .vod-poster{transform:scale(1.03)}
.vod-ph{width:100%;aspect-ratio:2/3;background:var(--s2);display:flex;align-items:center;justify-content:center;font-size:2.2rem;color:var(--t3)}
.vod-info{padding:.7rem .8rem}
.vod-title{font-size:.78rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--t1)}
.vod-meta{font-size:.65rem;color:var(--t3);margin-top:.25rem}
.vod-fav{position:absolute;top:.5rem;right:.5rem;background:rgba(0,0,0,.6);backdrop-filter:blur(6px);
  border:1px solid rgba(255,255,255,0.1);border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;
  cursor:pointer;font-size:.75rem;opacity:0;transition:all .2s ease;color:#fff}
.vod-card:hover .vod-fav, .vod-fav.on{opacity:1}
.vod-fav:hover{transform:scale(1.15);background:rgba(0,0,0,0.85);color:var(--accent)}
.resume-bar{position:absolute;bottom:0;left:0;right:0;height:4px;background:var(--s3)}
.resume-fill{height:100%;background:var(--accent);transition:width .3s}
.badge{display:inline-block;padding:.15rem .4rem;background:${t.accent}15;border:1px solid ${t.accent}25;
  border-radius:4px;font-size:.62rem;color:var(--accent);font-weight:700;letter-spacing:.05em;text-transform:uppercase;margin-left:.4rem}

/* CONTINUE WATCHING */
.cw-row{display:flex;gap:.9rem;overflow-x:auto;padding-bottom:.6rem;flex:1}
.cw-row::-webkit-scrollbar{height:4px}
.cw-item{flex-shrink:0;width:145px;background:var(--s1);border:1px solid var(--b1);border-radius:var(--radius-md);overflow:hidden;cursor:pointer;transition:all .2s;position:relative}
.cw-item:hover{border-color:var(--accent);transform:translateY(-2px)}
.cw-poster{width:100%;aspect-ratio:16/9;background:var(--s2);display:flex;align-items:center;justify-content:center;font-size:2rem;object-fit:cover}
.cw-info{padding:.55rem .65rem}
.cw-name{font-size:.72rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cw-time{font-size:.62rem;color:var(--t3);margin-top:.2rem}
.cw-prog-bar{height:3px;background:var(--s3);position:relative}
.cw-prog-fill{height:100%;background:var(--accent)}
.section-block{flex:1;min-height:0}
.section-label{font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--t3);margin-bottom:.8rem;display:flex;align-items:center;gap:.6rem}
.section-label::after{content:'';flex:1;height:1px;background:var(--b1)}

/* PLAYER */
.player-ov{position:fixed;inset:0;background:rgba(0,0,0,.96);z-index:300;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(20px)}
.player-wrap{width:94%;max-width:1140px;background:#000;border-radius:16px;overflow:hidden;
  box-shadow:0 50px 100px rgba(0,0,0,0.8);position:relative;animation:fadeUp .25s cubic-bezier(0.4, 0, 0.2, 1);border:1px solid rgba(255,255,255,0.08)}
@keyframes fadeUp{from{opacity:0;transform:translateY(25px)}to{opacity:1;transform:none}}
.player-video{width:100%;aspect-ratio:16/9;display:block;background:#000}
.player-bar{background:var(--s1);padding:.9rem 1.4rem;display:flex;align-items:center;gap:1rem;border-top:1px solid var(--b1)}
.player-title{font-family:'Rajdhani',sans-serif;font-size:1.25rem;font-weight:700;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;letter-spacing:0.5px}
.player-epg{font-size:.78rem;color:var(--t2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:280px;opacity:0.9}
.player-ctrl{padding:.4rem .9rem;background:var(--s2);border:1px solid var(--b2);border-radius:var(--radius-md);
  color:var(--t2);font-family:inherit;font-size:.78rem;font-weight:500;cursor:pointer;transition:all .2s;white-space:nowrap}
.player-ctrl:hover{color:var(--t1);border-color:var(--accent);background:var(--s3)}
.player-close{padding:.4rem .9rem;background:rgba(255,59,92,0.08);border:1px solid rgba(255,59,92,0.2);border-radius:var(--radius-md);
  color:var(--danger);font-family:inherit;font-size:.78rem;font-weight:600;cursor:pointer;transition:all .2s}
.player-close:hover{background:var(--danger);color:#fff}
.kbd-hint{font-size:.65rem;color:var(--t3);display:flex;gap:.6rem;flex-wrap:wrap;padding:.5rem 1.4rem;background:var(--bg);border-top:1px solid var(--b1);opacity:0.8}
.kbd{display:inline-block;background:var(--s2);border:1px solid var(--b2);border-radius:4px;padding:.1rem .35rem;font-size:.62rem;color:var(--t2);font-weight:600}

/* OSD */
.osd{position:absolute;top:1.5rem;left:1.5rem;background:rgba(0,0,0,.85);backdrop-filter:blur(20px);
  border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:.8rem 1.2rem;display:flex;align-items:center;gap:.9rem;
  max-width:360px;animation:fadeIn .25s ease;pointer-events:none;box-shadow:0 10px 30px rgba(0,0,0,0.5)}
@keyframes fadeIn{from{opacity:0;transform:translateX(-10px)}to{opacity:1;transform:none}}
.osd-logo{width:40px;height:40px;object-fit:contain;border-radius:6px;background:#151515;flex-shrink:0}
.osd-logo-ph{width:40px;height:40px;background:#222;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0;color:var(--accent);font-weight:bold}
.osd-name{font-family:'Rajdhani',sans-serif;font-weight:700;font-size:1.15rem;line-height:1.2;color:#fff}
.osd-epg{font-size:.75rem;color:#ccc;margin-top:.15rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.osd-num{font-size:.68rem;color:var(--accent);font-weight:700;background:${t.accent}25;padding:1px 5px;border-radius:4px}

/* QUICK CH */
.qch{position:absolute;left:1.5rem;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;gap:.35rem;animation:fadeIn .25s ease;pointer-events:none}
.qch-item{background:rgba(0,0,0,.8);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.08);border-radius:10px;
  padding:.55rem .85rem;display:flex;align-items:center;gap:.6rem;min-width:180px;transition:all .2s ease}
.qch-item.active{background:linear-gradient(90deg, ${t.accent}25, transparent);border-color:var(--accent);box-shadow:0 0 15px var(--glow)}
.qch-thumb{width:28px;height:28px;border-radius:4px;object-fit:contain;background:#151515}
.qch-thumb-ph{width:28px;height:28px;border-radius:4px;background:#222;display:flex;align-items:center;justify-content:center;font-size:.75rem;flex-shrink:0;color:var(--accent);font-weight:bold}
.qch-n{font-size:.75rem;font-weight:600;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.qch-num{font-size:.62rem;color:#aaa;margin-left:auto;font-weight:500}

/* EPG GRID */
.epg-outer{flex:1;overflow:auto}
.epg-top{padding:.9rem 1.6rem;display:flex;align-items:center;gap:.9rem;flex-shrink:0;border-bottom:1px solid var(--b1)}
.epg-table{min-width:max-content}
.epg-head-row{display:flex;position:sticky;top:0;z-index:10;background:var(--bg)}
.epg-ch-col{width:170px;flex-shrink:0;border-right:1px solid var(--b1);background:var(--bg)}
.epg-time-slot{width:190px;flex-shrink:0;font-size:.68rem;color:var(--t3);padding:.5rem .8rem;font-weight:700;letter-spacing:.04em;border-right:1px solid var(--b1)}
.epg-row{display:flex;border-bottom:1px solid var(--b1)}
.epg-ch-cell{width:170px;flex-shrink:0;padding:.65rem .85rem;font-size:.78rem;font-weight:600;
  border-right:1px solid var(--b1);display:flex;align-items:center;gap:.6rem;overflow:hidden;background:var(--s1)}
.epg-ch-logo{width:24px;height:24px;object-fit:contain;border-radius:4px;flex-shrink:0}
.epg-ch-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.epg-prog{background:var(--s1);border-right:1px solid var(--b1);padding:.55rem .8rem;width:190px;flex-shrink:0;
  cursor:pointer;transition:all .15s;overflow:hidden}
.epg-prog:hover{background:var(--s2)}
.epg-prog.now{background:${t.accent}08;border-top:2px solid var(--accent)}
.epg-prog-t{font-size:.75rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.epg-prog-s{font-size:.65rem;color:var(--t3);margin-top:4px}

/* GLOBAL SEARCH RESULTS */
.gsearch{flex:1;overflow-y:auto;padding:1.2rem 1.6rem;display:flex;flex-direction:column;gap:1.6rem}
.gsearch-section{display:flex;flex-direction:column;gap:.65rem}
.gsearch-row{display:flex;align-items:center;gap:.9rem;padding:.65rem .9rem;background:var(--s1);border:1px solid var(--b1);
  border-radius:var(--radius-md);cursor:pointer;transition:all .2s cubic-bezier(0.4, 0, 0.2, 1)}
.gsearch-row:hover{border-color:var(--accent);background:var(--s2);transform:translateX(3px)}
.gsearch-logo{width:36px;height:36px;object-fit:contain;border-radius:6px;background:var(--s2);flex-shrink:0}
.gsearch-logo-ph{width:36px;height:36px;background:var(--s3);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:.95rem;flex-shrink:0;color:var(--accent);font-weight:bold}
.gsearch-name{font-size:.88rem;font-weight:600;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gsearch-group{font-size:.7rem;color:var(--t3);margin-left:auto;flex-shrink:0;background:var(--s2);padding:2px 8px;border-radius:4px}

/* DIRECT HLS */
.hls-body{padding:1.6rem;display:flex;flex-direction:column;gap:1.2rem;flex:1}
.hls-row{display:flex;gap:.75rem}
.btn-go{padding:.65rem 1.4rem;background:linear-gradient(135deg,var(--accent),var(--accent2));border:none;border-radius:var(--radius-md);color:#fff;
  font-family:'Rajdhani',sans-serif;font-weight:700;font-size:1rem;cursor:pointer;transition:all .2s;white-space:nowrap;box-shadow:0 4px 12px ${t.accent}20}
.btn-go:hover{filter:brightness(1.1);transform:translateY(-1px)}

/* CONTEXT MENU */
.ctx-menu{position:fixed;background:var(--s2);border:1px solid var(--b2);border-radius:var(--radius-md);
  padding:.4rem;z-index:500;box-shadow:0 15px 35px var(--shadow);min-width:150px;animation:fadeIn .12s ease;backdrop-filter:blur(10px)}
.ctx-item{padding:.5rem .8rem;font-size:.8rem;font-weight:500;color:var(--t1);cursor:pointer;border-radius:6px;transition:all .15s}
.ctx-item:hover{background:var(--b2);color:var(--accent)}
.ctx-item.red{color:var(--danger)}
.ctx-item.red:hover{background:var(--danger)10;color:var(--danger)}

/* THEME PICKER */
.theme-row{display:flex;gap:.5rem;padding:0 1.2rem;margin-bottom:.6rem;flex-wrap:wrap}
.theme-swatch{width:20px;height:20px;border-radius:50%;cursor:pointer;border:2px solid transparent;transition:all .2s;flex-shrink:0;box-shadow:inset 0 0 4px rgba(0,0,0,0.1)}
.theme-swatch.on{border-color:var(--t1);transform:scale(1.25);box-shadow:0 2px 8px var(--shadow)}

/* STATES */
.loading{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1rem;color:var(--t2);font-weight:500}
.spinner{width:36px;height:36px;border:3px solid var(--b2);border-top-color:var(--accent);border-radius:50%;animation:spin .6s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.7rem;color:var(--t2);text-align:center}
.empty-icon{font-size:2.8rem;opacity:.2}
.empty-t{font-size:.95rem;font-weight:600;color:var(--t1)}
.empty-s{font-size:.78rem;color:var(--t3);max-width:280px;line-height:1.6}

/* SCROLLBAR */
::-webkit-scrollbar{width:6px;height:6px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--s3);border-radius:4px}
::-webkit-scrollbar-thumb:hover{background:var(--accent)60}

/* MODAL */
.modal-ov{position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:400;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px)}
.modal{background:var(--s1);border:1px solid var(--b2);border-radius:var(--radius-lg);padding:1.8rem;width:100%;max-width:380px;box-shadow:0 30px 70px var(--shadow)}
.modal-title{font-family:'Rajdhani',sans-serif;font-size:1.3rem;font-weight:700;margin-bottom:1.4rem;letter-spacing:0.5px}
.modal-btns{display:flex;gap:.6rem;justify-content:flex-end}
.btn-cancel{padding:.5rem 1rem;background:var(--s2);border:1px solid var(--b2);border-radius:var(--radius-md);
  color:var(--t2);font-family:inherit;font-size:.82rem;font-weight:500;cursor:pointer;transition:all .2s}
.btn-cancel:hover{background:var(--s3);color:var(--t1)}
.btn-confirm{padding:.5rem 1rem;background:var(--accent);border:none;border-radius:var(--radius-md);
  color:#fff;font-family:'Rajdhani',sans-serif;font-size:.95rem;font-weight:700;cursor:pointer;transition:all .2s}
.btn-confirm:hover{filter:brightness(1.1)}

/* DISCOVER */
.discover-body{flex:1;overflow-y:auto;padding:1.4rem 1.6rem}
.disc-hero{background:var(--s1);border:1px solid var(--b1);border-radius:var(--radius-lg);padding:2rem;margin-bottom:1.8rem;
  display:flex;align-items:flex-end;gap:1.4rem;min-height:200px;position:relative;overflow:hidden;cursor:pointer;transition:all 0.25s ease;box-shadow:0 6px 20px var(--shadow)}
.disc-hero:hover{border-color:var(--accent);box-shadow:0 12px 32px var(--shadow)}
.disc-hero-bg{position:absolute;inset:0;object-fit:cover;width:100%;height:100%;opacity:.15;pointer-events:none;transition:transform 0.5s}
.disc-hero:hover .disc-hero-bg{transform:scale(1.02)}
.disc-hero-info{position:relative;z-index:1;max-width:650px}
.disc-hero-title{font-family:'Rajdhani',sans-serif;font-size:2rem;font-weight:700;line-height:1.1;text-shadow:0 2px 15px rgba(0,0,0,0.5)}
.disc-hero-meta{font-size:.82rem;color:var(--t2);margin:.4rem 0 .8rem;font-weight:500}
.disc-hero-overview{font-size:.82rem;color:var(--t2);line-height:1.6;
  display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;opacity:0.9}
.disc-hero-avail{margin-top:.8rem;font-size:.78rem;color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:0.5px}
.disc-section{margin-bottom:1.8rem}
.disc-row{display:flex;gap:.8rem;overflow-x:auto;padding-bottom:.5rem}
.disc-row::-webkit-scrollbar{height:4px}
.disc-card{flex-shrink:0;width:118px;cursor:pointer;transition:all .25s cubic-bezier(0.4, 0, 0.2, 1);position:relative}
.disc-card:hover{transform:translateY(-4px)}
.disc-poster{width:118px;aspect-ratio:2/3;object-fit:cover;border-radius:var(--radius-md);background:var(--s2);display:block;
  border:1px solid var(--b1);box-shadow:0 4px 10px var(--shadow)}
.disc-card:hover .disc-poster{border-color:var(--accent)}
.disc-poster-ph{width:118px;aspect-ratio:2/3;background:var(--s2);border-radius:var(--radius-md);border:1px solid var(--b1);
  display:flex;align-items:center;justify-content:center;font-size:2.2rem;color:var(--t3)}
.disc-card-title{font-size:.72rem;font-weight:600;margin-top:.45rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--t1)}
.disc-card-meta{font-size:.62rem;color:var(--t3);margin-top:.15rem}
.disc-rating{position:absolute;top:.5rem;left:.5rem;background:rgba(0,0,0,.75);backdrop-filter:blur(6px);
  padding:.18rem .45rem;border-radius:4px;font-size:.62rem;font-weight:700;color:var(--accent);box-shadow:0 2px 5px rgba(0,0,0,0.2)}
.disc-in-lib{position:absolute;bottom:.5rem;right:.5rem;background:var(--accent);border-radius:50%;
  width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:.65rem;font-weight:700;color:#000;box-shadow:0 2px 5px rgba(0,0,0,0.2)}
.disc-key-prompt{display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:1.2rem;flex:1;text-align:center;padding:2.5rem}

/* SERIES DETAIL MODAL */
.series-modal-ov{position:fixed;inset:0;background:rgba(0,0,0,.82);z-index:400;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(12px)}
.series-modal{background:var(--s1);border:1px solid var(--b2);border-radius:20px;width:100%;max-width:680px;max-height:82vh;
  box-shadow:0 35px 85px rgba(0,0,0,0.7);display:flex;flex-direction:column;overflow:hidden;animation:fadeUp .25s cubic-bezier(0.4, 0, 0.2, 1);border:1px solid var(--b1)}
.series-modal-header{display:flex;align-items:flex-start;gap:1.2rem;padding:1.6rem 1.6rem 1rem;flex-shrink:0;border-bottom:1px solid var(--b1)}
.series-modal-poster{width:95px;aspect-ratio:2/3;object-fit:cover;border-radius:8px;background:var(--s2);flex-shrink:0;box-shadow:0 4px 12px var(--shadow)}
.series-modal-poster-ph{width:95px;aspect-ratio:2/3;background:var(--s2);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:2.4rem;flex-shrink:0;color:var(--t3)}
.series-modal-info{flex:1;min-width:0}
.series-modal-title{font-family:'Rajdhani',sans-serif;font-size:1.6rem;font-weight:700;line-height:1.2;margin-bottom:.35rem;letter-spacing:0.3px}
.series-modal-meta{font-size:.82rem;color:var(--t2);margin-bottom:.5rem;font-weight:500}
.series-modal-desc{font-size:.78rem;color:var(--t2);line-height:1.6;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;opacity:0.85}
.series-modal-close{background:none;border:none;color:var(--t3);font-size:1.4rem;cursor:pointer;padding:.2rem .4rem;margin-left:auto;flex-shrink:0;transition:all .15s;line-height:1}
.series-modal-close:hover{color:var(--danger);transform:scale(1.1)}
.series-modal-body{flex:1;overflow-y:auto;padding:1.2rem 1.6rem}
.series-seasons-tabs{display:flex;gap:.3rem;background:var(--s2);padding:5px;border-radius:var(--radius-md);margin-bottom:1.2rem;flex-wrap:wrap;border:1px solid var(--b1)}
.series-season-tab{padding:.45rem .9rem;background:none;border:none;border-radius:6px;color:var(--t2);
  font-family:inherit;font-size:.78rem;font-weight:600;cursor:pointer;transition:all .2s;white-space:nowrap}
.series-season-tab.on{background:var(--s3);color:var(--accent);box-shadow:0 3px 10px var(--shadow)}
.series-ep-list{display:flex;flex-direction:column;gap:.5rem}
.series-ep-item{display:flex;align-items:center;gap:.9rem;padding:.7rem 1rem;background:var(--s2);border:1px solid var(--b1);
  border-radius:var(--radius-md);cursor:pointer;transition:all .15s ease}
.series-ep-item:hover{border-color:var(--accent);background:var(--s3);transform:translateX(2px)}
.series-ep-item.loading{opacity:.5;pointer-events:none}
.series-ep-num{width:30px;height:30px;border-radius:50%;background:${t.accent}15;color:var(--accent);font-size:.75rem;font-weight:700;
  display:flex;align-items:center;justify-content:center;flex-shrink:0}
.series-ep-name{font-size:.85rem;font-weight:600;flex:1}
.series-ep-play{font-size:.95rem;opacity:.4;transition:all .15s;flex-shrink:0;color:var(--accent)}
.series-ep-item:hover .series-ep-play{opacity:1;transform:scale(1.1)}
.series-loading{display:flex;align-items:center;justify-content:center;gap:.7rem;padding:2.5rem;color:var(--t2);font-size:.88rem;font-weight:500}
/* =========================================================
   RESPONSIVE DESIGN
========================================================= */

/* Laptop */
@media (max-width:1200px){
  .sidebar{
    width:250px;
  }
}

/* Tablet */
@media (max-width:992px){

  .app{
    flex-direction:column;
    overflow:hidden;
  }

  .sidebar{
    width:100%;
    height:auto;
    max-height:42vh;
  }

  .content{
    width:100%;
    height:58vh;
  }

  .card{
    max-width:95%;
    padding:2rem;
  }

  .logo{
    font-size:2rem;
  }
}

/* Mobile */
@media (max-width:768px){

  body{
    overflow:auto;
  }

  .setup{
    padding:1rem;
    align-items:center;
    padding-top:2rem;
  }
.header-actions{display:none;}
.hamburger{
        display:flex;
    }

    .c-header{
    position:relative;
  }
.mobile-menu{
display:flex;
        position:absolute;
        top:60px;
        left:10px;
        width:220px;
        background:var(--s1);
        border:1px solid var(--b1);
        border-radius:12px;
        padding:10px;
        z-index:9999;
    }

    .mobile-menu button{
        width:100%;
        margin-bottom:8px;
    }
  .card{
    max-width:95%;
    padding:2rem;
  }

  .logo{
    font-size:1.8rem;
    text-align:center;
  }

  .tagline{
    font-size:.8rem;
    text-align:center;
    line-height:1.5;
  }

  .tabs{
    flex-wrap:wrap;
    gap:.5rem;
  }

  .tab{
    flex:1;
    min-width:120px;
  }

  .fi{
    width:100%;
    font-size:16px;
  }

  .btn-primary{
    width:100%;
    height:48px;
    font-size:1rem;
  }

  .fg{
    margin-bottom:1rem;
  }

  .fl{
    font-size:.82rem;
  }

  .fhint{
    font-size:.72rem;
  }
}

/* Small Phones */
@media (max-width:480px){
.header-actions{display:none;}
  .setup{
    padding:.7rem;
  }

 .card{
    max-width:95%;
    padding:2rem;
  }
  .logo{
    font-size:1.55rem;
  }

  .tagline{
    font-size:.72rem;
  }

  .btn-primary{
    height:46px;
  }

  .tab{
    font-size:.78rem;
    min-width:100%;
  }

  .fi{
    padding:.75rem;
    font-size:16px;
  }

  .conn-card{
    flex-direction:column;
    align-items:flex-start;
    gap:.5rem;
  }

  .conn-card-switch{
    width:100%;
    text-align:center;
  }
    .cats{
        width:140px;
        min-width:140px;
    }

    .cat{
        font-size:.72rem;
        padding:.45rem .55rem;
    }
}
    @media (max-width:768px){

  .c-header{
    padding:.8rem .9rem;
    gap:.6rem;
    flex-wrap:wrap;
    align-items:flex-start;
  }

  .c-header > *{
    min-width:0;
  }

}
 @media (max-width:480px){

  .c-header{
    padding:.7rem .75rem;
    gap:.5rem;
  }

}

/* TERO — cinematic editorial interface */
:root{--bg:#0a0d0b;--s1:#111713;--s2:#18201a;--s3:#202a21;--accent:#c7f36b;--accent2:#78994a;--t1:#eef3e8;--t2:#a0ac9c;--t3:#687468;--b1:rgba(226,242,219,.075);--b2:rgba(226,242,219,.13);--glow:rgba(199,243,107,.14);--shadow:rgba(0,0,0,.48);--hover-bg:rgba(226,242,219,.035);--radius-lg:18px;--radius-md:12px;--radius-sm:8px}
body{background:var(--bg);font-family:'Manrope',sans-serif;color:var(--t1);overflow:hidden;-webkit-font-smoothing:antialiased}
button,input{font:inherit}
.app{height:100dvh;min-height:560px;background:var(--bg);overflow:hidden}
.app-sidebar{width:252px;flex:0 0 252px;display:flex;flex-direction:column;padding:27px 15px 18px;background:linear-gradient(180deg,#111713 0%,#0e130f 100%);border-right:1px solid var(--b1);overflow:hidden}
.brand-lockup{display:flex;align-items:center;gap:12px;padding:0 10px 28px}
.brand-mark{width:40px;height:40px;display:flex;align-items:center;justify-content:center;position:relative;border-radius:13px;background:linear-gradient(140deg,#d8ff83,#a7d957);color:#12190d;font:700 23px 'Space Grotesk',sans-serif;box-shadow:0 6px 22px rgba(199,243,107,.15)}
.brand-mark span{position:absolute;right:7px;top:4px;font-size:17px;color:#456327}
.brand-name{font:700 15px 'Space Grotesk',sans-serif;letter-spacing:.13em;color:var(--t1)}
.brand-name span{color:var(--accent);margin-left:5px}
.brand-caption{font-size:8px;letter-spacing:.16em;color:var(--t3);margin-top:4px;font-weight:700}
.app-nav{flex:1;overflow:auto;scrollbar-width:none}
.app-nav::-webkit-scrollbar{display:none}
.nav-group-title{padding:16px 12px 7px;color:#667367;text-transform:uppercase;font-size:9px;font-weight:800;letter-spacing:.16em}
.app-nav-item{position:relative;display:flex;align-items:center;gap:13px;width:100%;min-height:43px;padding:0 12px;margin:2px 0;border:1px solid transparent;border-radius:11px;background:transparent;color:#9aa598;text-align:left;font-size:12px;font-weight:650;cursor:pointer;transition:color .18s ease,background .18s ease,border-color .18s ease,transform .18s ease}
.app-nav-item:hover{background:rgba(255,255,255,.035);color:var(--t1);transform:translateX(2px)}
.app-nav-item.active{background:linear-gradient(100deg,rgba(199,243,107,.13),rgba(199,243,107,.035));border-color:rgba(199,243,107,.1);color:var(--accent)}
.app-nav-item.active::before{content:'';position:absolute;left:-15px;top:10px;bottom:10px;width:3px;border-radius:0 4px 4px 0;background:var(--accent);box-shadow:0 0 14px rgba(199,243,107,.42)}
.app-nav-icon{width:20px;text-align:center;font:600 19px 'Space Grotesk',sans-serif;color:inherit;line-height:1}
.app-nav-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nav-live-dot{width:6px;height:6px;margin-left:auto;border-radius:50%;background:#f2766a;box-shadow:0 0 10px rgba(242,118,106,.55)}
.sidebar-bottom{padding:16px 4px 0;border-top:1px solid var(--b1)}
.connection-status{display:flex;align-items:center;gap:7px;padding:0 7px 11px;color:#8c9a8a;font-size:8px;font-weight:800;letter-spacing:.12em}
.status-dot{width:6px;height:6px;border-radius:50%;background:#a8d75f;box-shadow:0 0 9px rgba(168,215,95,.52)}
.connection-mini{display:flex;align-items:center;gap:9px;padding:10px 8px;background:rgba(255,255,255,.035);border:1px solid var(--b1);border-radius:12px}
.connection-mini-icon{width:29px;height:29px;flex:0 0 29px;display:grid;place-items:center;border-radius:9px;background:rgba(199,243,107,.12);color:var(--accent);font-size:19px}
.connection-mini-copy{min-width:0;flex:1;display:flex;flex-direction:column;gap:3px}
.connection-mini-copy strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#e3e9dd;font-size:10px;font-weight:700}
.connection-mini-copy span{color:var(--t3);font-size:9px;text-transform:capitalize}
.connection-change{border:0;background:none;color:var(--t3);font-size:15px;cursor:pointer}
.connection-change:hover{color:var(--accent)}
.sidebar-footnote{padding:14px 7px 0;color:#536052;font-size:8px;font-weight:800;letter-spacing:.14em}
.content{min-width:0;background:radial-gradient(ellipse at 80% -10%,rgba(199,243,107,.045),transparent 35%),var(--bg)}
.c-header{position:relative;z-index:4;height:78px;flex:0 0 auto;padding:0 34px;gap:18px;border-bottom:1px solid var(--b1);background:rgba(10,13,11,.82);backdrop-filter:blur(18px)}
.c-header .s-logo{display:none}
.c-title{font:600 21px 'Space Grotesk',sans-serif;letter-spacing:-.045em;color:var(--t1)}
.c-count{display:inline-flex;align-items:center;margin-left:9px;padding:4px 9px;border:1px solid var(--b1);border-radius:20px;background:rgba(255,255,255,.035);font:600 9px 'Manrope',sans-serif;letter-spacing:.02em;color:#9ba899}
.c-search-wrap::before{content:'⌕';position:absolute;left:13px;top:50%;z-index:1;transform:translateY(-55%);color:#859180;font-size:19px;pointer-events:none}
.c-search{width:218px;height:38px;padding:.45rem .85rem .45rem 38px;border:1px solid rgba(226,242,219,.09);border-radius:11px;background:#131914;color:var(--t1);font:500 11px 'Manrope',sans-serif}
.c-search:focus{width:270px;border-color:rgba(199,243,107,.48);background:#151c16;box-shadow:0 0 0 3px rgba(199,243,107,.07)}
.header-actions{gap:8px}
.menu-btn,.c-btn{padding:9px 12px;border:1px solid var(--b2);border-radius:10px;background:rgba(255,255,255,.025);color:#aab5a5;font-size:10px;font-weight:700;transition:all .18s ease}
.menu-btn:hover,.c-btn:hover{border-color:rgba(199,243,107,.38);background:rgba(199,243,107,.07);color:var(--accent)}
.menu-btn.danger{color:#e48a7f}
.hamburger{width:37px;height:37px;border:1px solid var(--b1);border-radius:10px;background:#141a15;color:var(--t1)}
.mobile-menu{top:61px;left:14px;width:235px;padding:8px;border:1px solid var(--b2);border-radius:14px;background:#151b16;box-shadow:0 20px 45px rgba(0,0,0,.45)}
.c-body{padding:26px 32px;gap:22px}
.cats{width:176px;flex:0 0 176px;padding-right:7px}
.cat{min-height:37px;padding:9px 11px;border-radius:10px;color:#8e9a8d;font-size:11px}
.cat:hover{background:#171f19;color:#e9f0e5}
.cat.on{background:rgba(199,243,107,.1);color:var(--accent)}
.ch-grid{grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:11px}
.ch-card{min-height:147px;padding:17px 12px 14px;gap:10px;border-color:rgba(226,242,219,.065);border-radius:15px;background:linear-gradient(145deg,#151b16,#111713);box-shadow:0 7px 18px rgba(0,0,0,.12)}
.ch-card:hover{border-color:rgba(199,243,107,.35);background:linear-gradient(145deg,#1a221b,#141a15);box-shadow:0 15px 34px rgba(0,0,0,.28);transform:translateY(-3px)}
.ch-card.playing{border-color:var(--accent);box-shadow:0 0 0 1px rgba(199,243,107,.24),0 12px 28px rgba(0,0,0,.28)}
.ch-logo,.ch-logo-ph{width:52px;height:52px;border-radius:13px;background:#202820;border-color:rgba(226,242,219,.08)}
.ch-name{max-width:100%;color:#e4ebdf;font-size:11px;font-weight:700}
.ch-meta{color:#98a393;font-size:9px}
.ch-num{background:rgba(199,243,107,.08);color:#bfdc8b;font-size:8px}
.fav-btn{top:9px;right:10px;color:#b8c2b2;font-size:15px;opacity:.62}
.vod-grid{grid-template-columns:repeat(auto-fill,minmax(142px,1fr));gap:15px}
.vod-card{border-color:rgba(226,242,219,.07);border-radius:14px;background:#121813;box-shadow:0 9px 20px rgba(0,0,0,.2)}
.vod-card:hover{border-color:rgba(199,243,107,.45);box-shadow:0 17px 32px rgba(0,0,0,.34);transform:translateY(-4px)}
.vod-poster,.vod-ph{background:#202820}
.vod-info{padding:10px 11px 12px}
.vod-title{color:#e6ece2;font-size:10px;font-weight:700}
.vod-meta{color:#839080;font-size:9px}
.vod-fav{opacity:.8}
.section-label{color:#98a493;font-size:10px;letter-spacing:.13em}
.section-label::after{background:var(--b1)}
.empty{padding:30px}
.empty-icon{color:var(--accent);opacity:.48}
.empty-t{font:600 19px 'Space Grotesk',sans-serif}
.empty-s{max-width:360px;color:#839080;font-size:11px}
.loading{font-size:12px}
.setup{position:relative;isolation:isolate;background:radial-gradient(ellipse at 18% 22%,rgba(199,243,107,.1),transparent 29%),radial-gradient(ellipse at 90% 90%,rgba(90,120,61,.14),transparent 32%),#0a0d0b}
.setup::before{content:'';position:absolute;inset:0;z-index:-1;opacity:.12;background-image:linear-gradient(rgba(226,242,219,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(226,242,219,.07) 1px,transparent 1px);background-size:54px 54px;mask-image:linear-gradient(to bottom,black,transparent 80%)}
.card{max-width:470px;padding:42px;background:linear-gradient(145deg,rgba(22,29,23,.97),rgba(15,20,16,.98));border:1px solid rgba(226,242,219,.12);border-radius:23px;box-shadow:0 36px 100px rgba(0,0,0,.53)}
.logo{font:700 30px 'Space Grotesk',sans-serif;letter-spacing:-.06em;background:linear-gradient(110deg,#eff5e9 5%,#c7f36b 95%);-webkit-background-clip:text;margin-bottom:8px;text-transform:none}
.tagline{margin-bottom:28px;color:#94a08e;font-size:12px;line-height:1.7}
.fl{color:#aeb8a8;font-size:9px;letter-spacing:.12em}
.fi{min-height:43px;background:#0d130e;border-color:rgba(226,242,219,.13);border-radius:10px;color:#edf2e9;font-size:12px}
.fi::placeholder{color:#626e61}
.fi:focus{border-color:rgba(199,243,107,.62);box-shadow:0 0 0 3px rgba(199,243,107,.09);background:#111812}
.fhint{color:#71806e;font-size:10px}
.tabs{background:#0c120d;border-color:var(--b1);border-radius:11px}
.tab{color:#929e8d}
.tab.on{background:#1b241b;color:var(--accent);border-color:rgba(199,243,107,.2)}
.btn-primary,.btn-go{background:linear-gradient(110deg,#d2fb7c,#a9d65a);color:#16200e;border-radius:11px;box-shadow:0 8px 22px rgba(165,211,87,.13);font:700 13px 'Manrope',sans-serif}
.btn-primary:hover,.btn-go:hover{filter:brightness(1.06);box-shadow:0 10px 26px rgba(165,211,87,.2)}
.conn-card{border-left-color:var(--accent);border-radius:14px;background:#171f18}
.player-wrap{border-color:rgba(199,243,107,.16);border-radius:18px}
.player-bar{background:#111713}
.player-title,.modal-title,.series-modal-title{font-family:'Space Grotesk',sans-serif}
.disc-hero{background:linear-gradient(120deg,#172017,#111713);border-color:var(--b1)}
.disc-hero-title{font-family:'Space Grotesk',sans-serif}
.disc-card-title{font-weight:700}
.modal,.series-modal{background:#121914;border-color:var(--b2)}
.series-ep-item:hover{border-color:rgba(199,243,107,.3)}
.epg-top{padding:16px 28px}
.epg-ch-cell,.epg-prog{background:#111713}
.epg-prog.now{background:rgba(199,243,107,.06)}
@media(max-width:1100px){.app-sidebar{width:220px;flex-basis:220px}.c-header{padding-inline:24px}.c-body{padding:22px 23px}.cats{width:155px;flex-basis:155px}}
@media(max-width:900px){.app-sidebar{width:76px;flex-basis:76px;padding:22px 9px 13px}.brand-lockup{justify-content:center;padding:0 0 22px}.brand-copy,.nav-group-title,.app-nav-label,.nav-live-dot,.sidebar-bottom{display:none}.app-nav-item{justify-content:center;min-height:46px;padding:0}.app-nav-icon{font-size:20px}.app-nav-item.active::before{left:-9px}.c-header{padding-inline:20px}.c-body{gap:15px}.cats{width:140px;flex-basis:140px}}
@media(max-width:640px){
  .app{height:100dvh;min-height:0;flex-direction:column;overflow:hidden}
  .app-sidebar{order:2;width:100%;height:70px;flex:0 0 70px;padding:7px 8px calc(7px + env(safe-area-inset-bottom));border-right:0;border-top:1px solid var(--b1);background:rgba(15,20,16,.97);backdrop-filter:blur(18px);overflow-x:auto;overflow-y:hidden}
  .brand-lockup,.sidebar-bottom{display:none}
  .app-nav{display:flex;align-items:stretch;gap:3px;width:max-content;min-width:100%;overflow-x:auto;overflow-y:hidden}
  .app-nav>div{display:flex;flex:0 0 auto;align-items:stretch}
  .nav-group-title{display:none}
  .app-nav-item{display:flex;flex-direction:column;justify-content:center;gap:3px;width:67px;min-height:54px;padding:3px;border:0;border-radius:10px;font-size:8px}
  .app-nav-item:hover{transform:none}
  .app-nav-item.active{background:rgba(199,243,107,.1)}
  .app-nav-item.active::before{left:50%;top:auto;right:auto;bottom:-7px;width:20px;height:2px;transform:translateX(-50%);border-radius:3px 3px 0 0}
  .app-nav-icon{font-size:17px}
  .app-nav-label{max-width:64px;font-size:8px}
  .content{order:1;width:100%;height:auto;min-height:0;flex:1}
  .c-header{height:auto;min-height:67px;padding:12px 14px;gap:10px;align-items:center;flex-wrap:wrap}
  .c-title{font-size:18px}
  .c-count{padding:3px 7px;font-size:8px}
  .c-header .c-search-wrap{order:5;width:100%;flex:1 0 100%;margin-top:2px}
  .c-search,.c-search:focus{width:100%;height:39px}
  .c-body{padding:14px 12px;gap:11px;flex-direction:column}
  .cats{width:100%;height:auto;min-height:0;flex:0 0 auto;display:flex;gap:6px;padding:0 0 4px;overflow-x:auto;overflow-y:hidden}
  .cat{flex:0 0 auto;min-height:33px;margin:0;padding:8px 11px;border:1px solid var(--b1);border-radius:18px;font-size:9px}
  .cat.on{border-color:rgba(199,243,107,.18)}
  .ch-grid{grid-template-columns:repeat(auto-fill,minmax(112px,1fr));gap:8px}
  .ch-card{min-height:122px;padding:14px 8px 10px;border-radius:13px;gap:8px}
  .ch-logo,.ch-logo-ph{width:43px;height:43px;border-radius:11px}
  .ch-name{font-size:9px}
  .fav-btn{top:7px;right:7px;font-size:13px}
  .vod-grid{grid-template-columns:repeat(auto-fill,minmax(106px,1fr));gap:10px}
  .vod-info{padding:8px}
  .vod-title{font-size:9px}
  .mobile-menu{top:55px;left:9px}
  .card{max-width:100%;padding:27px 23px;border-radius:19px}
  .logo{text-align:left;font-size:27px}
  .tagline{text-align:left;font-size:11px}
  .tab{min-width:0}
  .fi{font-size:16px}
  .btn-primary{height:47px}
  .epg-top{padding:12px;flex-wrap:wrap}
  .gsearch{padding:14px}
  .hls-body,.discover-body{padding:14px}
  .disc-hero{padding:20px;min-height:180px}
  .player-wrap{width:100%;border-radius:0}
  .player-bar{padding:10px;gap:7px;flex-wrap:wrap}
  .player-title{font-size:14px}
  .player-ctrl,.player-close{padding:7px;font-size:10px}
}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}

/* DIRECTION 2 — SUNLIT EDITORIAL / BROADCAST MAGAZINE */
:root{--bg:#f4f2eb;--s1:#fffdf7;--s2:#eeece3;--s3:#e4e1d7;--accent:#ef5a43;--accent2:#345b9b;--t1:#202722;--t2:#59635b;--t3:#858c82;--b1:rgba(32,39,34,.09);--b2:rgba(32,39,34,.16);--glow:rgba(239,90,67,.13);--shadow:rgba(57,49,34,.1);--hover-bg:rgba(32,39,34,.035)}
body{background:#f4f2eb;color:#202722}
.app{height:100dvh;min-height:560px;flex-direction:column;background:#f4f2eb;overflow:hidden}
.app-sidebar{position:relative;z-index:10;width:100%;height:116px;flex:0 0 116px;display:flex;flex-direction:row;align-items:center;gap:20px;padding:17px 30px 14px;background:#fbfaf5;border:0;border-bottom:1px solid rgba(32,39,34,.12);overflow:hidden}
.brand-lockup{flex:0 0 auto;gap:11px;padding:0 10px 0 0}
.brand-mark{width:43px;height:43px;border-radius:50% 50% 50% 14%;transform:rotate(-7deg);background:#ef5a43;color:#fff;font:700 23px 'Space Grotesk',sans-serif;box-shadow:0 5px 13px rgba(208,83,59,.18)}
.brand-mark span{right:7px;top:4px;color:#ffdf99}
.brand-name{color:#252d27;font:700 14px 'Space Grotesk',sans-serif;letter-spacing:.12em}
.brand-name span{color:#345b9b}
.brand-caption{color:#8b9086;font-size:8px;letter-spacing:.14em}
.app-nav{display:flex;align-items:center;gap:3px;flex:1;overflow-x:auto;overflow-y:hidden;scrollbar-width:none}
.app-nav::-webkit-scrollbar{display:none}
.app-nav>div{display:contents}
.nav-group-title{display:none}
.app-nav-item{position:relative;display:flex;flex:0 0 auto;align-items:center;justify-content:center;gap:8px;width:auto;min-height:39px;margin:0;padding:0 11px;border:1px solid transparent;border-radius:8px;background:transparent;color:#657067;font-size:10px;font-weight:750;transition:background .15s ease,color .15s ease,transform .15s ease}
.app-nav-item:hover{transform:translateY(-1px);background:#f0eee6;color:#273129}
.app-nav-item.active{background:#ef5a43;border-color:#ef5a43;color:white;box-shadow:0 4px 10px rgba(208,83,59,.16)}
.app-nav-item.active::before{display:none}
.app-nav-icon{width:auto;color:inherit;font:600 16px 'Space Grotesk',sans-serif}
.app-nav-label{white-space:nowrap;font-size:10px}
.nav-live-dot{width:6px;height:6px;margin-left:0;background:#fff;border-radius:50%;box-shadow:0 0 0 3px rgba(255,255,255,.2)}
.sidebar-bottom{display:flex;flex:0 0 auto;align-items:center;padding:0;margin-left:auto;border:0}
.connection-status,.sidebar-footnote{display:none}
.connection-mini{min-width:154px;max-width:204px;padding:7px 8px;background:#f2f0e8;border:1px solid rgba(32,39,34,.08);border-radius:9px}
.connection-mini-icon{width:27px;height:27px;flex-basis:27px;border-radius:8px;background:#dce5f3;color:#345b9b}
.connection-mini-copy strong{color:#303931;font-size:9px}
.connection-mini-copy span{color:#81877d;font-size:8px}
.connection-change{color:#777e74}
.content{min-width:0;min-height:0;flex:1;background:#f4f2eb}
.c-header{position:relative;z-index:4;height:86px;flex:0 0 86px;padding:0 35px;gap:16px;border-bottom:1px solid rgba(32,39,34,.1);background:#f4f2eb;backdrop-filter:none}
.c-header .s-logo{display:none}
.c-title{color:#212a24;font:600 25px 'Space Grotesk',sans-serif;letter-spacing:-.055em}
.c-count{padding:4px 8px;border:1px solid rgba(32,39,34,.11);border-radius:5px;background:#ebe9df;color:#747c71;font:700 8px 'Manrope',sans-serif}
.c-search-wrap::before{color:#345b9b;font-size:18px}
.c-search{width:215px;height:39px;border:1px solid rgba(32,39,34,.15);border-radius:8px;background:#fbfaf5;color:#202722;font:600 10px 'Manrope',sans-serif}
.c-search:focus{width:260px;border-color:#345b9b;background:#fffdf7;box-shadow:0 0 0 3px rgba(52,91,155,.1)}
.header-actions{gap:7px}
.menu-btn,.c-btn{padding:8px 11px;border:1px solid rgba(32,39,34,.15);border-radius:7px;background:#fbfaf5;color:#59635b;font-size:9px;font-weight:750}
.menu-btn:hover,.c-btn:hover{border-color:#345b9b;background:#e8edf5;color:#345b9b}
.menu-btn.danger{color:#cb5545}
.hamburger{border:1px solid rgba(32,39,34,.15);border-radius:8px;background:#fbfaf5;color:#202722}
.mobile-menu{top:55px;left:auto;right:12px;width:226px;border:1px solid rgba(32,39,34,.15);border-radius:10px;background:#fffdf7;box-shadow:0 16px 34px rgba(57,49,34,.16)}
.mobile-menu .menu-btn{color:#303931}
.c-body{padding:26px 35px;gap:22px}
.cats{width:174px;flex:0 0 174px;padding:4px 10px 4px 0;border-right:1px solid rgba(32,39,34,.1)}
.cat{min-height:35px;margin:2px 0;padding:8px 10px;border-radius:7px;color:#687269;font-size:10px}
.cat:hover{background:#eae8df;color:#263029}
.cat.on{background:#dfe7f2;color:#345b9b;font-weight:800}
.ch-grid{grid-template-columns:repeat(auto-fill,minmax(148px,1fr));gap:12px}
.ch-card{min-height:144px;padding:17px 12px 13px;border:1px solid rgba(32,39,34,.09);border-radius:11px;background:#fffdf7;box-shadow:0 3px 8px rgba(57,49,34,.035);transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease}
.ch-card:hover{transform:translateY(-3px);border-color:rgba(239,90,67,.36);background:#fffefa;box-shadow:0 13px 22px rgba(57,49,34,.1)}
.ch-card.playing{border-color:#ef5a43;box-shadow:0 0 0 2px rgba(239,90,67,.13),0 8px 18px rgba(57,49,34,.1)}
.ch-logo,.ch-logo-ph{width:50px;height:50px;border:1px solid rgba(32,39,34,.08);border-radius:9px;background:#f0eee6}
.ch-logo-ph{color:#345b9b}
.ch-name{color:#29312b;font-size:10px;font-weight:750}
.ch-meta{color:#798075;font-size:8px}
.ch-num{background:#f0eee6;color:#6b7468;font-size:8px}
.fav-btn{top:8px;right:9px;color:#969b91;font-size:14px}
.fav-btn.on{color:#ef5a43}
.live-dot{background:#ef5a43;box-shadow:none}
.vod-grid{grid-template-columns:repeat(auto-fill,minmax(136px,1fr));gap:15px}
.vod-card{border:1px solid rgba(32,39,34,.1);border-radius:9px;background:#fffdf7;box-shadow:0 5px 12px rgba(57,49,34,.08)}
.vod-card:hover{border-color:rgba(52,91,155,.42);transform:translateY(-4px);box-shadow:0 15px 24px rgba(57,49,34,.14)}
.vod-poster,.vod-ph{background:#e7e5dc}
.vod-info{padding:9px 10px 11px}
.vod-title{color:#252d27;font-size:10px;font-weight:750}
.vod-meta{color:#838a7f;font-size:8px}
.vod-fav{background:rgba(32,39,34,.72);border-color:rgba(255,255,255,.35)}
.section-label{color:#69736a;font-size:9px;letter-spacing:.14em}
.section-label::after{background:rgba(32,39,34,.12)}
.empty-icon{color:#ef5a43;opacity:.6}
.empty-t{color:#202722;font:600 20px 'Space Grotesk',sans-serif}
.empty-s{color:#767e73;font-size:10px}
.loading{color:#687269}
.spinner{border-color:rgba(32,39,34,.14);border-top-color:#ef5a43}
.setup{isolation:isolate;background:#f4f2eb}
.setup::before{opacity:.34;background-image:radial-gradient(circle at 16% 24%,rgba(239,90,67,.16) 0 1px,transparent 1.5px),radial-gradient(circle at 75% 80%,rgba(52,91,155,.16) 0 1px,transparent 1.5px);background-size:22px 22px,30px 30px;mask-image:radial-gradient(ellipse at center,black,transparent 78%)}
.card{max-width:465px;padding:40px;background:#fffdf7;border:1px solid rgba(32,39,34,.13);border-radius:14px;box-shadow:0 24px 55px rgba(57,49,34,.1)}
.logo{color:#202722;background:none;-webkit-text-fill-color:#202722;font:700 28px 'Space Grotesk',sans-serif;letter-spacing:-.065em;text-transform:none}
.tagline{color:#6c766b;font-size:11px}
.fl{color:#59645b;font-size:9px}
.fi{min-height:43px;border:1px solid rgba(32,39,34,.17);border-radius:7px;background:#f8f6ef;color:#202722;font-size:11px}
.fi::placeholder{color:#979b91}
.fi:focus{border-color:#345b9b;box-shadow:0 0 0 3px rgba(52,91,155,.1);background:#fffdf7}
.fhint{color:#858c82;font-size:9px}
.tabs{border:1px solid rgba(32,39,34,.08);border-radius:8px;background:#f0eee6}
.tab{color:#70796f}
.tab.on{border-color:transparent;background:#345b9b;color:#fff;box-shadow:none}
.btn-primary,.btn-go{background:#ef5a43;color:#fff;border:0;border-radius:7px;box-shadow:0 5px 12px rgba(208,83,59,.15);font:750 11px 'Manrope',sans-serif;letter-spacing:.04em}
.btn-primary:hover,.btn-go:hover{filter:brightness(.96);box-shadow:0 8px 15px rgba(208,83,59,.22)}
.err{background:rgba(239,90,67,.08);border-color:rgba(239,90,67,.23);color:#b94738}
.conn-card{border-left-color:#ef5a43;border-radius:10px;background:#fffdf7;box-shadow:0 4px 12px rgba(57,49,34,.06)}
.player-ov{background:rgba(25,29,25,.96)}
.player-wrap{border:1px solid rgba(255,255,255,.2);border-radius:10px}
.player-bar{background:#fffdf7;border-top-color:rgba(32,39,34,.1)}
.player-title{color:#202722;font-family:'Space Grotesk',sans-serif}
.player-epg{color:#657067}
.player-ctrl{background:#f0eee6;color:#485249;border-color:rgba(32,39,34,.12)}
.kbd-hint{background:#f4f2eb;color:#657067;border-top-color:rgba(32,39,34,.1)}
.kbd{background:#fffdf7;color:#59635b;border-color:rgba(32,39,34,.13)}
.disc-hero{background:#e8e5da;border-color:rgba(32,39,34,.1);box-shadow:0 5px 15px rgba(57,49,34,.05)}
.disc-hero-title,.series-modal-title{font-family:'Space Grotesk',sans-serif;color:#202722}
.disc-hero-meta,.disc-hero-overview{color:#59635b}
.disc-rating{background:#345b9b;color:white}
.disc-in-lib{background:#ef5a43;color:white}
.disc-poster,.disc-poster-ph{border-radius:8px;background:#e6e3d9}
.disc-card-title{color:#28312b;font-weight:750}
.modal,.series-modal{background:#fffdf7;border-color:rgba(32,39,34,.14)}
.modal-title{color:#202722;font-family:'Space Grotesk',sans-serif}
.series-modal-header,.series-ep-item{border-color:rgba(32,39,34,.1)}
.series-modal-meta,.series-modal-desc{color:#667067}
.series-season-tab.on{background:#345b9b;color:#fff}
.series-ep-item:hover{background:#f0eee6;border-color:rgba(52,91,155,.32)}
.epg-top{background:#f4f2eb;border-color:rgba(32,39,34,.1)}
.epg-head-row{background:#f4f2eb}
.epg-ch-cell,.epg-prog{background:#fffdf7;border-color:rgba(32,39,34,.09)}
.epg-prog.now{background:#fff0e9;border-top-color:#ef5a43}
.epg-time-slot,.epg-prog-s{color:#7b8378}
.gsearch-row{background:#fffdf7;border-color:rgba(32,39,34,.09)}
.gsearch-row:hover{border-color:rgba(52,91,155,.4);background:#fdfcf7}
.gsearch-logo,.gsearch-logo-ph{background:#efede4}
.gsearch-name{color:#29312b}
.gsearch-group{background:#efede4;color:#747c71}
.ctx-menu{background:#fffdf7;border-color:rgba(32,39,34,.14)}
.ctx-item{color:#333d35}
@media(max-width:1100px){.app-sidebar{gap:10px;padding-inline:18px}.brand-lockup{gap:8px}.app-nav-item{padding-inline:8px}.app-nav-label{font-size:9px}.connection-mini{min-width:125px;max-width:158px}.c-header{padding-inline:24px}.c-body{padding:22px 24px}}
@media(max-width:900px){.app-sidebar{width:100%;height:98px;flex:0 0 98px;padding:12px 16px;gap:10px}.brand-lockup{gap:8px}.brand-mark{width:37px;height:37px}.brand-caption{font-size:7px}.app-nav{gap:0}.app-nav-item{min-height:36px;padding-inline:6px;gap:5px}.app-nav-icon{font-size:14px}.app-nav-label{font-size:8px}.sidebar-bottom{display:none}.c-header{padding-inline:18px}.cats{width:144px;flex-basis:144px}}
@media(max-width:640px){
  .app{height:100dvh;min-height:0;flex-direction:column}
  .app-sidebar{order:0;width:100%;height:104px;flex:0 0 104px;display:flex;flex-direction:column;align-items:stretch;gap:7px;padding:8px 11px 5px;border:0;border-bottom:1px solid rgba(32,39,34,.12);overflow:hidden}
  .brand-lockup{display:flex;gap:8px;padding:0 3px}
  .brand-mark{width:30px;height:30px;font-size:17px}
  .brand-mark span{right:5px;top:2px;font-size:12px}
  .brand-name{font-size:11px}.brand-caption{margin-top:1px;font-size:6px}
  .app-nav{width:100%;flex:1;gap:3px;overflow-x:auto;overflow-y:hidden}
  .app-nav>div{display:contents}
  .app-nav-item{min-height:34px;flex:0 0 auto;flex-direction:row;gap:5px;padding:0 9px;border-radius:6px;font-size:8px}
  .app-nav-item.active{background:#ef5a43}
  .app-nav-icon{font-size:13px}
  .app-nav-label{font-size:8px}
  .content{order:1;width:100%;height:auto;min-height:0;flex:1}
  .c-header{height:auto;min-height:62px;flex-wrap:wrap;padding:10px 12px;gap:8px}
  .c-title{font-size:18px}
  .c-header .c-search-wrap{order:5;width:100%;flex:1 0 100%;margin-top:0}
  .c-search,.c-search:focus{width:100%;height:36px}
  .header-actions{display:none}
  .hamburger{display:flex;width:34px;height:34px}
  .c-body{padding:12px;gap:10px;flex-direction:column}
  .cats{width:100%;height:auto;min-height:0;flex:0 0 auto;display:flex;gap:5px;padding:0 0 5px;border:0;overflow-x:auto;overflow-y:hidden}
  .cat{flex:0 0 auto;min-height:30px;margin:0;padding:6px 9px;border:1px solid rgba(32,39,34,.11);border-radius:6px;font-size:8px}
  .cat.on{border-color:rgba(52,91,155,.18)}
  .ch-grid{grid-template-columns:repeat(auto-fill,minmax(105px,1fr));gap:7px}
  .ch-card{min-height:116px;padding:13px 7px 9px;border-radius:8px}
  .ch-logo,.ch-logo-ph{width:39px;height:39px;border-radius:7px}
  .ch-name{font-size:8px}
  .fav-btn{top:6px;right:6px;font-size:12px}
  .vod-grid{grid-template-columns:repeat(auto-fill,minmax(102px,1fr));gap:8px}
  .card{max-width:100%;padding:25px 20px;border-radius:12px}
  .logo{text-align:left;font-size:25px}
  .tagline{text-align:left;font-size:10px}
  .tab{min-width:0}
  .fi{font-size:16px}
  .btn-primary{height:45px}
  .epg-top{padding:10px;flex-wrap:wrap}
  .gsearch{padding:12px}
  .hls-body,.discover-body{padding:12px}
  .disc-hero{padding:17px;min-height:165px}
  .player-wrap{width:100%;border-radius:0}
  .player-bar{padding:9px;gap:6px;flex-wrap:wrap}
  .player-title{font-size:13px}
  .player-ctrl,.player-close{padding:6px;font-size:9px}
}

.toolbar-action{display:inline-flex;align-items:center;justify-content:center;gap:8px;width:auto;min-height:36px;padding:5px 12px!important;border:1px solid transparent!important;border-radius:9px!important;font:750 10px 'Manrope',sans-serif!important;letter-spacing:.01em;white-space:nowrap;transition:transform .16s ease,box-shadow .16s ease,background .16s ease,border-color .16s ease,color .16s ease}
.toolbar-action .action-icon{display:grid;width:23px;height:23px;flex:0 0 23px;place-items:center;border-radius:7px;color:#fff;font-size:12px;line-height:1;transition:transform .18s ease,background .18s ease}
.toolbar-action:hover{transform:translateY(-1px);box-shadow:0 5px 12px rgba(57,49,34,.1)}
.toolbar-action:active{transform:translateY(0)}
.toolbar-action:focus-visible{outline:3px solid rgba(52,91,155,.2);outline-offset:2px}
.toolbar-action.action-admin{background:#e9eef7!important;border-color:rgba(52,91,155,.16)!important;color:#345b9b!important}
.toolbar-action.action-admin .action-icon{background:#345b9b}
.toolbar-action.action-admin:hover{background:#dfe7f3!important;border-color:rgba(52,91,155,.3)!important}
.toolbar-action.action-refresh{background:#eaf3ed!important;border-color:rgba(47,113,80,.16)!important;color:#2f7150!important}
.toolbar-action.action-refresh .action-icon{background:#2f7150}
.toolbar-action.action-refresh:hover{background:#dcebe1!important;border-color:rgba(47,113,80,.28)!important}
.toolbar-action.action-refresh:hover .action-icon{transform:rotate(45deg)}
.toolbar-action.action-disconnect{background:#fff0ed!important;border-color:rgba(201,79,63,.2)!important;color:#bd4638!important}
.toolbar-action.action-disconnect .action-icon{background:#ef5a43}
.toolbar-action.action-disconnect:hover{background:#ffe4df!important;border-color:rgba(201,79,63,.34)!important;color:#a93429!important}
.setup-admin-action{min-height:40px;padding:6px 14px!important;box-shadow:0 4px 12px rgba(52,91,155,.12)}
.mobile-menu .toolbar-action{width:100%;justify-content:flex-start;min-height:41px;margin:2px 0;padding:7px 10px!important;text-align:left}
.mobile-menu .toolbar-action.action-admin{color:#345b9b!important}
.mobile-menu .toolbar-action.action-refresh{color:#2f7150!important}
.mobile-menu .toolbar-action.action-disconnect{color:#bd4638!important}
@media(max-width:640px){.mobile-menu .toolbar-action{min-height:43px}.setup-admin-action{min-height:42px}}
`;
}
// ══════════════════════════════════════════════════════════════════
// PLAYER COMPONENT (TiviMate-level keyboard + OSD + PiP + quick-ch)
// ══════════════════════════════════════════════════════════════════
function Player({ item, channelList, epgData, onClose, onFav, isFav, connType }) {
  const videoRef   = useRef(null);
  const hlsRef     = useRef(null);
  const mpegtsRef  = useRef(null);
  const osdTimer   = useRef(null);
  const [osd, setOsd]         = useState(true);
  const [showQCH, setShowQCH] = useState(false);
  const qchTimer = useRef(null);
  const [chIdx, setChIdx]     = useState(() => {
    if (!channelList) return -1;
    return channelList.findIndex(c => c.id === item.id || c.url === item.url);
  });
  const [current, setCurrent] = useState(item);

  const showOSD = useCallback(() => {
    setOsd(true);
    clearTimeout(osdTimer.current);
    osdTimer.current = setTimeout(() => setOsd(false), 3500);
  }, []);

  function destroyPlayers() {
    if (hlsRef.current)    { hlsRef.current.destroy();  hlsRef.current = null; }
    if (mpegtsRef.current) { mpegtsRef.current.destroy(); mpegtsRef.current = null; }
  }

  const [streamErr, setStreamErr] = useState(null);

  const isMixed = location.protocol === "https:" ? (u) => u?.startsWith("http://") : () => false;
  // External IPTV servers don't send CORS headers — always proxy M3U/Xtream streams
  const needsProxy = (u) => isMixed(u) || ((connType === "m3u" || connType === "xtream") && u && !u.startsWith(PROXY));
  // Stream tickets are created through the authenticated TeroDev API proxy.
  const streamProxy = async (u) => {
    if (u?.startsWith(PROXY)) return u;
    const response = await fetch(`${PROXY}/stream-ticket`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Auth-Code": localStorage.getItem("sv-auth-code") || "" },
      body: JSON.stringify({ url: u }),
    });
    const data = await response.json();
    if (!response.ok || !data.url) throw new Error(data.error || "Could not create a stream ticket");
    return `${PROXY.replace(/\/+$/, "")}${data.url}`;
  };

  async function initPlayer(url) {
    const video = videoRef.current;
    if (!video || !url) return;
    setStreamErr(null);
    destroyPlayers();
    video.removeAttribute("src");

    // Native <video> error handler (for direct src= playback)
    video.onerror = () => {
      // Skip if HLS.js or mpegts.js is handling (they have their own error handlers)
      if (hlsRef.current || mpegtsRef.current) return;
      const e = video.error;
      const msgs = { 1: "Playback aborted", 2: "Network error — could not load stream", 3: "Decode error — stream format not supported", 4: "Source not supported — the stream format or URL is invalid" };
      setStreamErr({ icon: "⚠️", title: "Playback Error", body: msgs[e?.code] || "Unknown video error" });
    };

    async function startHls(u) {
      if (window.Hls?.isSupported()) {
        const opts = { enableWorker: false, fragLoadingMaxRetry: 2 };
        if (needsProxy(u)) {
          try { u = await streamProxy(u); }
          catch (e) { setStreamErr({ icon: "⚠️", title: "Relay Error", body: e.message }); return; }
        }
        const hls = new window.Hls(opts);
        hlsRef.current = hls;
        hls.loadSource(u);
        hls.attachMedia(video);
        hls.on(window.Hls.Events.MANIFEST_PARSED, () => video.play().catch(()=>{}));
        hls.on(window.Hls.Events.ERROR, (_, data) => {
          if (!data.fatal) return;
          const code = data.response?.code;
          let title = "Playback Error";
          let body;
          if (code === 404) {
            title = "Stream Not Found (404)";
            body = "The stream URL returned 404. The channel may be offline, or its URL may have changed. Try reconnecting to refresh the channel list.";
          } else if (code === 403) {
            title = "Access Denied (403)";
            body = "The stream server rejected the request. Your credentials may not have access to this channel.";
          } else if (code >= 500) {
            title = `Server Error (${code})`;
            body = "The stream server returned an error. It may be overloaded or temporarily down.";
          } else if (data.type === window.Hls.ErrorTypes.NETWORK_ERROR) {
            title = "Network Error";
            body = "Could not reach the stream server. Check your connection or try again.";
          } else {
            body = `HLS error: ${data.details}${code ? ` (HTTP ${code})` : ""}`;
          }
          setStreamErr({ icon: "⚠️", title, body });
          destroyPlayers();
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        try { video.src = needsProxy(u) ? await streamProxy(u) : u; video.play().catch(()=>{}); }
        catch (e) { setStreamErr({ icon: "⚠️", title: "Relay Error", body: e.message }); }
      }
    }

    async function startMpegts(u) {
      if (needsProxy(u)) {
        try { u = await streamProxy(u); }
        catch (e) { setStreamErr({ icon: "⚠️", title: "Relay Error", body: e.message }); return; }
      }
      if (!window.mpegts?.isSupported()) {
        video.src = u; video.play().catch(()=>{}); return;
      }
      const player = window.mpegts.createPlayer({ type: "mpegts", isLive: true, url: u },
        { enableWorker: false, lazyLoadMaxDuration: 3 * 60, seekType: "range" });
      mpegtsRef.current = player;
      player.on(window.mpegts.Events.ERROR, (errType, errDetail, errInfo) => {
        const code = errInfo?.code;
        let title = "Playback Error";
        let body;
        if (code === 404) {
          title = "Stream Not Found (404)";
          body = "The stream URL returned 404. The channel may be offline or the URL has changed.";
        } else if (code === 403) {
          title = "Access Denied (403)";
          body = "The stream server rejected the request. Your credentials may not have access.";
        } else if (code >= 400 && code < 500) {
          title = `Client Error (${code})`;
          body = `The stream request was rejected with HTTP ${code}.`;
        } else if (code >= 500) {
          title = `Server Error (${code})`;
          body = "The stream server returned an error. It may be overloaded or temporarily down.";
        } else if (errType === "NetworkError") {
          title = "Network Error";
          body = `Could not load the stream. ${errInfo?.msg || "Check your connection or try again."}`;
        } else {
          body = `${errType}: ${errDetail || "Unknown error"}${code ? ` (HTTP ${code})` : ""}`;
        }
        setStreamErr({ icon: "⚠️", title, body });
        destroyPlayers();
      });
      player.attachMediaElement(video);
      player.load();
      player.play().catch(()=>{});
    }

    function loadScript(src, cb) {
      if (document.querySelector(`script[src="${src}"]`)) { cb(); return; }
      const s = document.createElement("script");
      s.src = src; s.onload = cb; document.head.appendChild(s);
    }

    // Direct video files (MP4, MKV, AVI, etc.) — play natively, not via mpegts/HLS
    const fileExt = url.split(/[?#]/)[0].split(".").pop()?.toLowerCase();
    if (["mp4", "mkv", "avi", "mov", "webm", "mp3", "aac"].includes(fileExt)) {
      try { video.src = needsProxy(url) ? await streamProxy(url) : url; video.play().catch(()=>{}); }
      catch (e) { setStreamErr({ icon: "⚠️", title: "Relay Error", body: e.message }); }
      return;
    }

    // Stalker VOD/series items are direct video files served by the portal.
    const isStalkerVod = (current.type === "vod" || current.type === "series")
      && (url.includes("/play/movie.php") || url.includes("/play/live.php") || url.includes("play_token="));
    if (isStalkerVod) {
      if (url.includes(".m3u8")) {
        if (window.Hls) startHls(url);
        else loadScript("https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.4.12/hls.min.js",
                        () => { void startHls(url); });
      } else {
        try { video.src = needsProxy(url) ? await streamProxy(url) : url; video.play().catch(()=>{}); }
        catch (e) { setStreamErr({ icon: "⚠️", title: "Relay Error", body: e.message }); }
      }
      return;
    }

    const needTs  = url.includes("extension=ts") || /\.ts(\?|$)/.test(url)
      || (current.type === "live" && !url.includes(".m3u8"));
    const needHls = !needTs && (url.includes(".m3u8") || url.includes("/live/") || url.includes("/movie/"));

    // For Xtream live streams on HTTPS, proxy raw TS through stream proxy
    // (HLS .m3u8 has IP-bound segment tokens that break with proxied manifests)
    if (needTs && needsProxy(url)) {
      let proxied;
      try { proxied = await streamProxy(url); }
      catch (e) { setStreamErr({ icon: "⚠️", title: "Relay Error", body: e.message }); return; }
      if (window.mpegts) startMpegts(proxied);
      else loadScript("https://cdn.jsdelivr.net/npm/mpegts.js@1.7.3/dist/mpegts.min.js",
                      () => { void startMpegts(proxied); });
      return;
    }

    if (needTs) {
      if (window.mpegts) startMpegts(url);
      else loadScript("https://cdn.jsdelivr.net/npm/mpegts.js@1.7.3/dist/mpegts.min.js",
                      () => startMpegts(url));
    } else if (needHls) {
      if (window.Hls) startHls(url);
      else loadScript("https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.4.12/hls.min.js",
                      () => startHls(url));
    } else {
      try { video.src = needsProxy(url) ? await streamProxy(url) : url; video.play().catch(()=>{}); }
      catch (e) { setStreamErr({ icon: "⚠️", title: "Relay Error", body: e.message }); }
    }
  }

  useEffect(() => {
    void initPlayer(current.url);
    showOSD();
    return () => {
      destroyPlayers();
      clearTimeout(osdTimer.current);
      clearTimeout(qchTimer.current);
    };
  }, [current.url]);

  // Keyboard shortcuts (TiviMate + SFVIP style)
  useEffect(() => {
    function onKey(e) {
      const v = videoRef.current;
      if (!v) return;
      if (e.target.tagName === "INPUT") return;
      switch(e.key) {
        case " ":
        case "k":
          e.preventDefault();
          v.paused ? v.play() : v.pause();
          showOSD(); break;
        case "f":
        case "F":
          document.fullscreenElement ? document.exitFullscreen() : v.requestFullscreen?.();
          break;
        case "m":
        case "M":
          v.muted = !v.muted; showOSD(); break;
        case "ArrowLeft":
          e.preventDefault();
          if (current.type === "live") prevChannel();
          else { v.currentTime = Math.max(0, v.currentTime - 10); showOSD(); }
          break;
        case "ArrowRight":
          e.preventDefault();
          if (current.type === "live") nextChannel();
          else { v.currentTime = Math.min(v.duration||0, v.currentTime + 10); showOSD(); }
          break;
        case "ArrowUp":
          e.preventDefault();
          if (current.type === "live") prevChannel();
          else { v.volume = Math.min(1, v.volume + 0.1); showOSD(); }
          break;
        case "ArrowDown":
          e.preventDefault();
          if (current.type === "live") nextChannel();
          else { v.volume = Math.max(0, v.volume - 0.1); showOSD(); }
          break;
        case "Escape":
          onClose(); break;
        case "p":
        case "P":
          pip(); break;
        default: break;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, chIdx]);

  function prevChannel() {
    if (!channelList || channelList.length === 0) return;
    const i = Math.max(0, (chIdx < 0 ? 0 : chIdx) - 1);
    setChIdx(i); setCurrent(channelList[i]);
    setShowQCH(true);
    clearTimeout(qchTimer.current);
    qchTimer.current = setTimeout(() => setShowQCH(false), 2500);
    showOSD();
  }

  function nextChannel() {
    if (!channelList || channelList.length === 0) return;
    const max = channelList.length - 1;
    const i = Math.min(max, (chIdx < 0 ? 0 : chIdx) + 1);
    setChIdx(i); setCurrent(channelList[i]);
    setShowQCH(true);
    clearTimeout(qchTimer.current);
    qchTimer.current = setTimeout(() => setShowQCH(false), 2500);
    showOSD();
  }

  async function pip() {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await v.requestPictureInPicture?.();
    } catch {}
  }

  const epgNow = getEPGNow(epgData, current.epgId);
  const qchChannels = channelList && chIdx >= 0
    ? channelList.slice(Math.max(0, chIdx-2), Math.min(channelList.length, chIdx+3))
    : [];

  return (
    <div className="player-ov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="player-wrap">
        <div style={{ position:"relative" }}>
          <video ref={videoRef} className="player-video" controls playsInline />
          {streamErr && (
            <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",
              background:"rgba(0,0,0,.88)",padding:"2rem",textAlign:"center"}}>
              <div style={{maxWidth:"400px"}}>
                <div style={{fontSize:"2.2rem",marginBottom:".75rem"}}>{streamErr.icon}</div>
                <div style={{fontSize:".9rem",color:"var(--t1)",fontWeight:600,marginBottom:".5rem"}}>{streamErr.title}</div>
                <div style={{fontSize:".78rem",color:"var(--t2)",lineHeight:1.6}}>{streamErr.body}</div>
              </div>
            </div>
          )}
          {/* OSD */}
          {osd && (
            <div className="osd" onClick={showOSD}>
              {current.logo
                ? <img className="osd-logo" src={current.logo} alt="" onError={e => e.target.style.display="none"} />
                : <div className="osd-logo-ph">{current.type==="live"?"📺":"🎬"}</div>}
              <div>
                {current.num && <div className="osd-num">CH {current.num}</div>}
                <div className="osd-name">{current.name}</div>
                {epgNow && <div className="osd-epg">▶ {epgNow.title}</div>}
              </div>
            </div>
          )}
          {/* Quick channel switcher */}
          {showQCH && channelList && (
            <div className="qch">
              {qchChannels.map((ch, i) => {
                const isActive = ch.id === current.id || ch.url === current.url;
                return (
                  <div key={ch.id||i} className={`qch-item ${isActive?"active":""}`}>
                    {ch.logo
                      ? <img className="qch-thumb" src={ch.logo} alt="" onError={e => e.target.style.display="none"} />
                      : <div className="qch-thumb-ph">📺</div>}
                    <div className="qch-n">{ch.name}</div>
                    {ch.num && <div className="qch-num">{ch.num}</div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="player-bar">
          <div style={{flex:1,overflow:"hidden"}}>
            <div className="player-title">
              {current.name}
              {current.group && <span className="badge">{current.group}</span>}
            </div>
            {epgNow && <div className="player-epg">▶ {epgNow.title}</div>}
          </div>
          {channelList && current.type === "live" && (
            <>
              <button className="player-ctrl" onClick={prevChannel}>◀ Prev</button>
              <button className="player-ctrl" onClick={nextChannel}>Next ▶</button>
            </>
          )}
          <button className="player-ctrl" onClick={pip} title="Picture in Picture">⧉ PiP</button>
          
          <button className="player-close" onClick={onClose}>✕ Close</button>
        </div>
        <div className="kbd-hint">
          <span><span className="kbd">Space</span>Play/Pause</span>
          <span><span className="kbd">F</span>Fullscreen</span>
          <span><span className="kbd">M</span>Mute</span>
          <span><span className="kbd">←→</span>{current.type==="live"?"Channels":"±10s"}</span>
          <span><span className="kbd">↑↓</span>{current.type==="live"?"Channels":"Volume"}</span>
          <span><span className="kbd">P</span>PiP</span>
          <span><span className="kbd">Esc</span>Close</span>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// SETUP
// ══════════════════════════════════════════════════════════════════
function Login({ onLogin }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!code) return;
    setLoading(true); setErr("");
    try {
      const res = await fetch(`${PROXY}/auth/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem("sv-auth-code", code);
        onLogin(!!data.isAdmin);
      } else {
        setErr("Invalid access code");
      }
    } catch {
      setErr("Connection error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="setup">
      <div className="card">
        <div className="logo">Tero Dev. To IPTV</div>
        <div className="tagline">Enter your access code to continue</div>
        {err && <div className="err" style={{background:"rgba(255,59,92,0.1)",color:"#ff3b5c",padding:".8rem",borderRadius:"8px",fontSize:".8rem",marginBottom:"1rem",border:"1px solid rgba(255,59,92,0.2)"}}>⚠ {err}</div>}
        <form onSubmit={handleSubmit}>
          <div className="fg">
            <label className="fl">Access Code</label>
            <input 
              className="fi" 
              type="password" 
              placeholder="••••••" 
              value={code} 
              onChange={e => setCode(e.target.value)} 
              autoFocus
            />
          </div>
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? "Verifying..." : "Login →"}
          </button>
        </form>
      </div>
    </div>
  );
}

function AdminPanel({ onClose }) {
  const [tab, setTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [portals, setPortals] = useState([]);
  const [newUser, setNewUser] = useState({ code: "", label: "", isAdmin: false });
  const [newPortal, setNewPortal] = useState({ name: "", url: "", mac: "", type: "stalker" });
  const authCode = localStorage.getItem("sv-auth-code");

  useEffect(() => {
    fetchData();
  }, [tab]);

  async function fetchData() {
    try {
      const res = await fetch(`${PROXY}/admin/${tab}`, { headers: { "X-Auth-Code": authCode } });
      const data = await res.json();
      if (tab === "users") setUsers(data); else setPortals(data);
    } catch {}
  }

  async function addUser() {
    if (!newUser.code) return;
    await fetch(`${PROXY}/admin/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Auth-Code": authCode },
      body: JSON.stringify(newUser)
    });
    setNewUser({ code: "", label: "", isAdmin: false });
    fetchData();
  }

  async function addPortal() {
    if (!newPortal.name || !newPortal.url) return;
    await fetch(`${PROXY}/admin/portals`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Auth-Code": authCode },
      body: JSON.stringify(newPortal)
    });
    setNewPortal({ name: "", url: "", mac: "", type: "stalker" });
    fetchData();
  }

  async function deleteItem(id) {
    await fetch(`${PROXY}/admin/${tab}/${id}`, {
      method: "DELETE",
      headers: { "X-Auth-Code": authCode }
    });
    fetchData();
  }

  return (
    <div className="setup" style={{zIndex:1000}}>
      <div className="card" style={{maxWidth:"600px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.5rem"}}>
          <div className="logo" style={{fontSize:"1.5rem",marginBottom:0}}>Admin Panel</div>
          <button className="c-btn" onClick={onClose}>Close</button>
        </div>
        <div className="tabs">
          <button className={`tab ${tab==="users"?"on":""}`} onClick={()=>setTab("users")}>Users</button>
          <button className={`tab ${tab==="portals"?"on":""}`} onClick={()=>setTab("portals")}>Portals</button>
        </div>

        {tab === "users" ? (
          <div>
            <div className="fg" style={{display:"flex",gap:".5rem"}}>
              <input className="fi" placeholder="Code" value={newUser.code} onChange={e=>setNewUser({...newUser,code:e.target.value})} />
              <input className="fi" placeholder="Label" value={newUser.label} onChange={e=>setNewUser({...newUser,label:e.target.value})} />
              <button className="btn-primary" style={{width:"120px"}} onClick={addUser}>Add</button>
            </div>
            <div style={{maxHeight:"300px",overflowY:"auto"}}>
              {users.map(u => (
                <div key={u.id} style={{display:"flex",justifyContent:"space-between",padding:".8rem",borderBottom:"1px solid var(--b2)"}}>
                  <div>
                    <div style={{fontSize:".9rem"}}>{u.label} ({u.code})</div>
                    <div style={{fontSize:".7rem",color:"var(--t3)"}}>{u.is_admin ? "Admin" : "User"}</div>
                  </div>
                  <button className="c-btn" style={{color:"var(--danger)"}} onClick={()=>deleteItem(u.id)}>Delete</button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <div className="fg">
              <input className="fi" placeholder="Portal Name" style={{marginBottom:".5rem"}} value={newPortal.name} onChange={e=>setNewPortal({...newPortal,name:e.target.value})} />
              <input className="fi" placeholder="URL (http://...)" style={{marginBottom:".5rem"}} value={newPortal.url} onChange={e=>setNewPortal({...newPortal,url:e.target.value})} />
              <input className="fi" placeholder="MAC (Optional)" style={{marginBottom:".5rem"}} value={newPortal.mac} onChange={e=>setNewPortal({...newPortal,mac:e.target.value})} />
              <button className="btn-primary" onClick={addPortal}>Add Portal</button>
            </div>
            <div style={{maxHeight:"300px",overflowY:"auto"}}>
              {portals.map(p => (
                <div key={p.id} style={{display:"flex",justifyContent:"space-between",padding:".8rem",borderBottom:"1px solid var(--b2)"}}>
                  <div>
                    <div style={{fontSize:".9rem"}}>{p.name}</div>
                    <div style={{fontSize:".7rem",color:"var(--t3)"}}>{p.url}</div>
                  </div>
                  <button className="c-btn" style={{color:"var(--danger)"}} onClick={()=>deleteItem(p.id)}>Delete</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Setup({ onConnect, connections = [], onReconnect, isAdmin }) {
  const [type, setType]     = useState("stalker");
  const [f, setF]           = useState({ server:"", user:"", pass:"", mac:"", url:"", serial:"", deviceId:"", deviceId2:"" });
  const [adminPortals, setAdminPortals] = useState([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [rawText, setRawText] = useState("");
  const [detected, setDetected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr]       = useState("");
  const set = (k,v) => setF(p => ({...p,[k]:v}));

  useEffect(() => {
    fetch(`${PROXY}/portals`, {
      headers: { "X-Auth-Code": localStorage.getItem("sv-auth-code") || "" },
    }).then(r => r.json()).then(setAdminPortals).catch(()=>{});

    // Pre-fill from last active connection (or most recent saved connection)
    try {
      const conns = localStorage.getItem("sv-connections");
      if (conns) {
        const connList = JSON.parse(conns);
        if (!connList?.length) return;
        const acId = localStorage.getItem("sv-activeConn");
        const activeId = acId ? JSON.parse(acId) : null;
        const active = (activeId && connList.find(c => c.id === activeId)) || connList[connList.length - 1];
        if (active?.config) {
          const c = active.config;
          if (c.type) setType(c.type);
          if (c.server) set("server", c.server);
          if (c.user) set("user", c.user);
          if (c.pass) set("pass", c.pass);
          if (c.mac) set("mac", c.mac);
          if (c.url) set("url", c.url);
          if (c.serial) set("serial", c.serial);
          if (c.deviceId) set("deviceId", c.deviceId);
          if (c.deviceId2) set("deviceId2", c.deviceId2);
        }
      }
    } catch {}
  }, []);

  async function connect() {
    setErr(""); setLoading(true);
    try {
       if (type === "stalker") {
        if (!f.server||!f.mac) throw new Error("Portal URL and MAC required");
        const server = f.server.trim().replace(/\/$/,"");
        const hsBody = JSON.stringify({ portal: server, mac: f.mac.trim(), serial:f.serial?.trim()||undefined, deviceId:f.deviceId?.trim()||undefined, deviceId2:(f.deviceId2?.trim()||f.deviceId?.trim())||undefined });
        const hs = await stalkerFetch("/stalker/handshake", { method:"POST", headers:{"Content-Type":"application/json"}, body: hsBody });
        const hsData = await hs.json();
        if (!hs.ok || hsData.error) throw new Error(hsData.error || "Stalker handshake failed");
        // Connection saved by handleConnect in App
        onConnect({ type, server, mac:f.mac.trim(), serial:f.serial.trim()||undefined, deviceId:f.deviceId.trim()||undefined, deviceId2:(f.deviceId2.trim()||f.deviceId.trim())||undefined });
      } else {
        // Connection saved by handleConnect in App
        onConnect({ type:"hls" });
      }
    } catch(e) { setErr(e.message||"Connection failed"); }
    finally { setLoading(false); }
  }

  function normalizeUnicode(t) {
    return t
      // Mathematical Monospace A-Z (U+1D670-U+1D689) and a-z (U+1D68A-U+1D6A3)
      .replace(/[\u{1D670}-\u{1D689}]/gu, c => String.fromCharCode(c.codePointAt(0) - 0x1D670 + 0x41))
      .replace(/[\u{1D68A}-\u{1D6A3}]/gu, c => String.fromCharCode(c.codePointAt(0) - 0x1D68A + 0x61))
      // Mathematical Bold A-Z (U+1D400-U+1D419) and a-z (U+1D41A-U+1D433)
      .replace(/[\u{1D400}-\u{1D419}]/gu, c => String.fromCharCode(c.codePointAt(0) - 0x1D400 + 0x41))
      .replace(/[\u{1D41A}-\u{1D433}]/gu, c => String.fromCharCode(c.codePointAt(0) - 0x1D41A + 0x61))
      // Mathematical Bold Italic A-Z (U+1D468-U+1D481) and a-z (U+1D482-U+1D49B)
      .replace(/[\u{1D468}-\u{1D481}]/gu, c => String.fromCharCode(c.codePointAt(0) - 0x1D468 + 0x41))
      .replace(/[\u{1D482}-\u{1D49B}]/gu, c => String.fromCharCode(c.codePointAt(0) - 0x1D482 + 0x61))
      // Mathematical Sans-Serif A-Z (U+1D5A0-U+1D5B9) and a-z (U+1D5BA-U+1D5D3)
      .replace(/[\u{1D5A0}-\u{1D5B9}]/gu, c => String.fromCharCode(c.codePointAt(0) - 0x1D5A0 + 0x41))
      .replace(/[\u{1D5BA}-\u{1D5D3}]/gu, c => String.fromCharCode(c.codePointAt(0) - 0x1D5BA + 0x61))
      // Mathematical Sans-Serif Bold A-Z (U+1D5D4-U+1D5ED) and a-z (U+1D5EE-U+1D607)
      .replace(/[\u{1D5D4}-\u{1D5ED}]/gu, c => String.fromCharCode(c.codePointAt(0) - 0x1D5D4 + 0x41))
      .replace(/[\u{1D5EE}-\u{1D607}]/gu, c => String.fromCharCode(c.codePointAt(0) - 0x1D5EE + 0x61))
      // Mathematical Italic A-Z (U+1D434-U+1D44D) and a-z (U+1D44E-U+1D467)
      .replace(/[\u{1D434}-\u{1D44D}]/gu, c => String.fromCharCode(c.codePointAt(0) - 0x1D434 + 0x41))
      .replace(/[\u{1D44E}-\u{1D467}]/gu, c => String.fromCharCode(c.codePointAt(0) - 0x1D44E + 0x61))
      // Normalize arrow separators to colon
      .replace(/[\u27A9\u279C\u2794\u2192\u25BA\u21D2\u27F9]/g, ':')
      // Strip box-drawing characters
      .replace(/[\u2560\u2563\u2551\u2557\u2554\u255A\u255D\u256C\u2569\u2566\u251C\u2524\u2502\u2510\u2518\u2514\u250C\u252C\u2534\u253C\u2500\u2550]/g, '')
      // Strip enclosed alphanumerics (regional/circled letters used as decorators)
      .replace(/[\u{1F150}-\u{1F169}\u{1F170}-\u{1F18F}\u{1F190}-\u{1F1AC}]/gu, '')
      // Strip keycap digit sequences (e.g., 1️⃣) and decorators like ❖
      .replace(/[\d]\uFE0F?\u20E3/gu, '')
      .replace(/[\u2756]/g, '');
  }

  function detectFromText(text) {
    // Normalize Unicode-decorated text to plain ASCII before parsing
    text = normalizeUnicode(text);
    const results = [];

    // Detect Stalker portals + MACs + serial + deviceId + deviceId2 by proximity in text
    const portalPattern = /https?:\/\/[^\s"'<>]+\/(?:stalker_portal\/)?c\/?/gi;
    const macPattern = /([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}/g;

    // Split text into blocks (by double newline or portal URL) and pair within each block
    const lines = text.split("\n");
    let blocks = [], cur = [];
    const portalTestRe = /https?:\/\/[^\s"'<>]+\/(?:stalker_portal\/)?c\/?/i;
    for (const line of lines) {
      if (portalTestRe.test(line) && cur.length > 0) { blocks.push(cur.join("\n")); cur = []; }
      cur.push(line);
    }
    if (cur.length) blocks.push(cur.join("\n"));
    if (blocks.length <= 1) blocks = [text]; // fallback: treat as single block

    const usedMacs = new Set();
    for (const block of blocks) {
      const bp = block.match(portalPattern) || [];
      portalPattern.lastIndex = 0;
      const bm = block.match(macPattern) || [];
      macPattern.lastIndex = 0;

      // Extract serial: look for "serial", "sn", "s/n" labels followed by value
      const serialMatch = block.match(/(?:serial(?:\s*(?:number|num|#))?|s\/n|sn)\s*[:=\s]\s*([A-Za-z0-9_-]+)/i);
      const serial = serialMatch ? serialMatch[1] : "";

      // Extract deviceId2: look for "device id 2", "deviceid2", "device_id_2" labels (check this BEFORE deviceId)
      const deviceId2Match = block.match(/(?:device[\s_-]*id[\s_-]*2|deviceid2|device_id_2)\s*[:=\s]\s*([A-Za-z0-9_-]+)/i);
      let deviceId2 = deviceId2Match ? deviceId2Match[1] : "";

      // Extract deviceId: look for "device id", "deviceid", "device_id" labels (excluding "device id 2" variants)
      const deviceIdMatch = block.match(/(?:device[\s_-]*id|deviceid|device_id)(?![\s_-]*2)\s*[:=\s]\s*([A-Za-z0-9_-]+)/i);
      const deviceId = deviceIdMatch ? deviceIdMatch[1] : "";

      // If only one device ID is found, use it for both (common in decorated text where one value is shared)
      if (deviceId && !deviceId2) deviceId2 = deviceId;

      if (bp.length && bm.length) {
        const portal = bp[0].replace(/\/+$/,"");
        const mac = bm[0];
        if (!usedMacs.has(mac)) {
          usedMacs.add(mac);
          results.push({ type:"stalker", server:portal, mac, serial, deviceId, deviceId2, label:`Stalker · ${mac.slice(-5)}` });
        }
      } else if (bm.length) {
        bm.forEach(mac => { if (!usedMacs.has(mac)) { usedMacs.add(mac); results.push({ type:"stalker", server:"", mac, serial, deviceId, deviceId2, label:`MAC · ${mac}` }); } });
      }
    }

 

   

    

    return results;
  }

  const TYPES = [["stalker","Stalker Portal"]];
  const [selectedPortal, setSelectedPortal] = useState(null);
  return (
    <div className="setup">
      <div className="card">
        <div className="logo">Tero Dev. To IPTV</div>
        <div className="tagline">Your personal IPTV client · Connect your own legal service</div>

        {/* Admin Portals */}
        {adminPortals.length > 0 && (
          <div style={{marginBottom:"1.2rem"}}>
            <div className="fl" style={{marginBottom:".5rem"}}>Available Portals</div>
            <div style={{display:"flex",flexDirection:"column",gap:".35rem"}}>
              {adminPortals.map(p => (
                <div key={p.id} style={{
  display:"flex",
  alignItems:"center",
  gap:".6rem",
  padding:".55rem .7rem",
  background: selectedPortal === p.id ? "rgba(59,130,246,.15)" : "var(--s2)",
  border: selectedPortal === p.id
    ? "1px solid var(--accent)"
    : "1px solid var(--b2)",
  borderLeft:`3px solid var(--accent)`,
  borderRadius:"8px",
  cursor:"pointer",
  transition:"all .2s"
}}
                  onClick={() => {
  setSelectedPortal(p.id);
  set("server", p.url);
  if (p.mac) set("mac", p.mac);
  setType(p.type || "stalker");
}}>
                  <span style={{fontSize:"1.1rem"}}>📡</span>
                  <div style={{flex:1,overflow:"hidden"}}>
                    <div style={{fontSize:".82rem",fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</div>
                    <div style={{fontSize:".62rem",color:"var(--t3)"}}>{p.url}</div>
                  </div>
                  <span
  style={{
    fontSize:".7rem",
    color:"var(--accent)",
    fontWeight:600
  }}
>
  {selectedPortal === p.id ? "✓ Selected" : "Select"}
</span>
                </div>
              ))}
            </div>
            {isAdmin && (
  <div style={{borderBottom:"1px solid var(--b2)",margin:"1rem 0 .2rem",position:"relative"}}>
    <span
      style={{
        position:"absolute",
        left:"50%",
        transform:"translate(-50%,-50%)",
        background:"var(--s1)",
        padding:"0 .6rem",
        fontSize:".65rem",
        color:"var(--t3)",
        textTransform:"uppercase",
        letterSpacing:".08em",
        fontWeight:600
      }}>
      or custom connection
    </span>
  </div>
)}
          </div>
        )}

        {err && <div className="err">⚠ {err}</div>}
        {!isAdmin && (<div className="tabs">
          {TYPES.map(([k,label]) => (
            <button key={k} className={`tab on`} onClick={() => {setType(k);setErr("")}}>
              {label}
            </button>
          ))}
        </div>)}
        
        {type==="stalker" &&  isAdmin && (<>
          <div className="fg"><label className="fl">Portal URL</label>
            <input className="fi" placeholder="http://example.com:80" value={f.server} onChange={e=>set("server",e.target.value)} readOnly={!isAdmin} style={!isAdmin ? {opacity:0.6, cursor:"not-allowed"} : {}} /></div>
          <div className="fg"><label className="fl">MAC Address</label>
            <input className="fi" placeholder="00:1A:79:XX:XX:XX" value={f.mac} onChange={e=>set("mac",e.target.value)} readOnly={!isAdmin} style={!isAdmin ? {opacity:0.6, cursor:"not-allowed"} : {}} />
            <div className="fhint">The MAC address registered with your IPTV provider</div></div>
          
          {isAdmin && (
            <div style={{marginTop:".5rem"}}>
              <button type="button" style={{background:"none",border:"none",color:"var(--accent)",fontSize:".72rem",cursor:"pointer",padding:0,fontFamily:"'DM Sans',sans-serif"}}
                onClick={() => setShowAdvanced(!showAdvanced)}>
                {showAdvanced ? "▾ Hide advanced" : "▸ Advanced options"}
              </button>
            </div>
          )}

          {(showAdvanced || !isAdmin) && null /* Hide advanced completely for non-admins if not toggled */}
          
          {isAdmin && showAdvanced && (<>
            <div className="fg"><label className="fl">Serial Number</label>
              <input className="fi" placeholder="Optional — leave blank for auto" value={f.serial} onChange={e=>set("serial",e.target.value)} />
              <div className="fhint">Device serial number (if required by provider)</div></div>
            <div className="fg"><label className="fl">Device ID</label>
              <input className="fi" placeholder="Optional — used for both ID1 and ID2 if ID2 is blank" value={f.deviceId} onChange={e=>set("deviceId",e.target.value)} />
              <div className="fhint">Primary device identifier</div></div>
            <div className="fg"><label className="fl">Device ID 2</label>
              <input className="fi" placeholder="Optional — defaults to Device ID above" value={f.deviceId2} onChange={e=>set("deviceId2",e.target.value)} />
              <div className="fhint">Secondary device identifier (some providers use same value for both)</div></div>
          </>)}
        </>)}
        
        <button className="btn-primary" onClick={connect} disabled={loading || type==="import"} style={type==="import"?{display:"none"}:{}}>
          {loading ? "Connecting…" : "Connect →"}
        </button>
      </div>
    </div>
  );
}

// Connection Manager Removed

// ══════════════════════════════════════════════════════════════════
// CARD HELPERS
// ══════════════════════════════════════════════════════════════════
function FavBtn({ on, onClick, style={} }) {
  return (
    <button className={`fav-btn ${on?"on":""}`} style={style} title={on?"Remove from favorites":"Add to favorites"}
      onClick={e => { e.stopPropagation(); onClick(); }}>
      {on ? "♥" : "♡"}
    </button>
  );
}

// ══════════════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════════════
const NAV = [
  { key:"live", icon:"◉", label:"Live TV", group:"Watch" },
  { key:"vod", icon:"▣", label:"Movies", group:"Watch" },
  { key:"series", icon:"▤", label:"Series", group:"Watch" },
];

export default function App() {
  // ── connection & data
  const [conn, setConn]       = useState(null);
  const [channels, setChannels] = useState([]);
  const [vod, setVod]         = useState([]);
  const [series, setSeries]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // ── series detail modal
  const [seriesDetail, setSeriesDetail] = useState(null); // {item, seasons, activeSeason}
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [episodeLoading, setEpisodeLoading] = useState(null); // episode number being loaded

  // ── ui state
  const [section, setSection] = useState("live");
  const [cat, setCat]         = useState("All");
  const [search, setSearch]   = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 100;
  const [globalQ, setGlobalQ] = useState("");
  const [playing, setPlaying] = useState(null);
  const [ctx, setCtx]         = useState(null); // context menu {x,y,catName}

  // ── theme
  const [themeName, setThemeName] = useState("Dark");

  // ── connections (replaces profiles)
  const [connections, setConnections] = useState([]);
  const [activeConnId, setActiveConnId] = useState(null);
  const [showConnManager, setShowConnManager] = useState(false);

  // ── favorites {live:{}, vod:{}, series:{}}
  const [favs, setFavs] = useState({live:{}, vod:{}, series:{}});

  // ── history [{id,name,url,type,logo,group,position,timestamp}]
  const [history, setHistory] = useState([]);

  // ── hidden cats per section
  const [hiddenCats, setHiddenCats] = useState({live:[], vod:[], series:[]});

  // ── EPG
  const [epgURL, setEpgURL]   = useState("");
  const [epgData, setEpgData] = useState(null);
  const [epgLoading, setEpgLoading] = useState(false);

  // ── Stalker lazy-load
  const [stalkerVodCats,    setStalkerVodCats]    = useState([]); // [{id,title,count}]
  const [stalkerSeriesCats, setStalkerSeriesCats] = useState([]); // [{id,title,count}]
  const [catLoading,        setCatLoading]        = useState(false);
  const fetchingCatRef = useRef(new Set());  // tracks in-progress category fetches
  const [prefetchProgress, setPrefetchProgress] = useState(null); // {done,total} or null

  // ── last synced timestamps
  const [lastSynced, setLastSynced] = useState({}); // {live: timestamp, vod: timestamp, series: timestamp}
  const [autoConnected, setAutoConnected] = useState(false); // true if loaded from IDB cache
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  // ── TMDB
  const [tmdbKey, setTmdbKey] = useState(() => localStorage.getItem("sv-tmdb-key") || "548cb796fc67d6997619a8a0f7e011a5");
  // ── CSS injection
  useEffect(() => {
    const el = document.getElementById("sv-css") || (() => { const s = document.createElement("style"); s.id="sv-css"; document.head.appendChild(s); return s; })();
    el.textContent = genCSS(THEMES[themeName]);
  }, [themeName]);

  // ── load persisted data + auto-connect from IDB
  useEffect(() => {
    (async () => {
      // Check auth
      const savedCode = localStorage.getItem("sv-auth-code");
      if (savedCode) {
        try {
          const res = await fetch(`${PROXY}/auth/verify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: savedCode })
          });
          const data = await res.json();
          if (data.success) {
            setIsAuthorized(true);
            setIsAdmin(!!data.isAdmin);
          } else {
            localStorage.removeItem("sv-auth-code");
          }
        } catch {}
      }

      // Migrate old profile/lastConn data to new connection system
      await migrateToConnections();

      const [th, conns, acId, hc, eq] = await Promise.all([
        db.get("sv-theme","Dark"),
        db.get("sv-connections",[]),
        db.get("sv-activeConn",null),
        db.get("sv-hiddenCats",{live:[],vod:[],series:[]}),
        db.get("sv-epgURL",""),
      ]);
      if (THEME_NAMES.includes(th)) setThemeName(th);
      setConnections(conns);
      setActiveConnId(acId);
      setHiddenCats(hc);
      if (eq) setEpgURL(eq);

      // Load per-connection favs + history
      if (acId) {
        const [fv, hi] = await Promise.all([
          db.get(`sv-favs-${acId}`, {live:{},vod:{},series:{}}),
          db.get(`sv-history-${acId}`, []),
        ]);
        setFavs(fv);
        setHistory(hi);
      }

      // Auto-connect: if we have an active connection + cached content in IDB, skip Setup
      if (acId) {
        try {
          const connObj = conns.find(c => c.id === acId);
          if (connObj) await loadFromCache(acId, connObj);
        } catch {}
      }
    })();
  }, []);

  // ── load cached content from IDB for a connection
  async function loadFromCache(id, connObj) {
    const cachedChannels = await idbCache.get(`content:${id}:live`);
    if (cachedChannels && cachedChannels.length) {
      setAutoConnected(true);
      setConn(connObj.config);
      setChannels(cachedChannels);
      const syncTs = await idbCache.get(`sync:${id}`);
      if (syncTs) setLastSynced(syncTs);
      return true;
    }
    return false;
  }

  // ── migrate old profile/lastConn data to connection system
  async function migrateToConnections() {
    try {
      if (localStorage.getItem("sv-connections")) return; // already migrated
      const saved = localStorage.getItem("sv-lastConn");
      if (!saved) return;
      const lastConn = JSON.parse(saved);
      const cId = connId(lastConn);
      if (!cId) return;
      const color = PROFILE_COLORS[0];
      const label = lastConn.type === "xtream" ? `${lastConn.user} · Xtream`
        : lastConn.type === "stalker" ? `Stalker · ${(lastConn.mac||"").slice(-5)}`
        : lastConn.type === "m3u" ? `M3U · ${(lastConn.url||"").split("/").pop()?.slice(0,20)||"playlist"}`
        : "Direct HLS";
      const connObj = { id: cId, type: lastConn.type, label, color, config: lastConn };
      db.set("sv-connections", [connObj]);
      db.set("sv-activeConn", cId);
      // Migrate favorites: try active profile first, then default
      const ap = localStorage.getItem("sv-activeProfile");
      const activeProfileId = ap ? JSON.parse(ap) : "default";
      const oldFavs = localStorage.getItem(`sv-favs-${activeProfileId}`);
      if (oldFavs) {
        db.set(`sv-favs-${cId}`, JSON.parse(oldFavs));
      } else {
        const defFavs = localStorage.getItem("sv-favs-default");
        if (defFavs) db.set(`sv-favs-${cId}`, JSON.parse(defFavs));
      }
      // Migrate global history to per-connection
      const oldHistory = localStorage.getItem("sv-history");
      if (oldHistory) db.set(`sv-history-${cId}`, JSON.parse(oldHistory));
      // Clean up old keys
      localStorage.removeItem("sv-profiles");
      localStorage.removeItem("sv-activeProfile");
      localStorage.removeItem("sv-lastConn");
      localStorage.removeItem("sv-history");
    } catch {}
  }

  // ── save theme
  useEffect(() => {
    db.set("sv-theme", themeName);
    syncPreferencesToD1({ theme: themeName });
  }, [themeName]);

  // ── load favs + history when active connection changes
  useEffect(() => {
    if (!activeConnId) return;
    db.get(`sv-favs-${activeConnId}`, {live:{},vod:{},series:{}}).then(setFavs);
    db.get(`sv-history-${activeConnId}`, []).then(setHistory);
  }, [activeConnId]);

  // ── persist section to localStorage
  useEffect(() => {
    localStorage.setItem("sv-lastSection", JSON.stringify(section));
  }, [section]);

  // ── connection
  useEffect(() => {
    if (!conn) return;
    // If auto-connected from IDB cache, skip fetching from provider
    if (autoConnected) {
      setAutoConnected(false);
      return;
    }
    if (conn.type === "m3u") {
      setChannels(conn.channels);
      // Save M3U channels to IDB for persistence
      const cId = connId(conn);
      if (cId && conn.channels?.length) {
        idbCache.set(`content:${cId}:live`, conn.channels);
        syncContentToD1(cId, "live", conn.channels);
        idbCache.set(`sync:${cId}`, { ...lastSynced, live: Date.now() });
        setLastSynced(prev => ({ ...prev, live: Date.now() }));
      }
    } else if (conn.type === "xtream") {
      fetchLive();
    } else if (conn.type === "stalker") {
      fetchStalkerChannels();
    }
    // Save connection to D1
    const cId = connId(conn);
    if (cId) {
      syncConnectionToD1(cId, conn.type, conn);
    }
  }, [conn]);

  async function fetchLive(force = false) {
    if (!conn || conn.type !== "xtream") return;
    const cId = connId(conn);
    // Check IDB first (unless force refresh)
    if (!force && cId) {
      const cached = await idbCache.get(`content:${cId}:live`);
      if (cached && cached.length) { setChannels(cached); return; }
    }
    setLoading(true);
    try {
      const api = makeXtreamAPI(conn.server, conn.user, conn.pass);
      const [catData, sd] = await Promise.all([api.getLiveCategories(), api.getLive()]);
      const cm = Object.fromEntries(catData.map(c => [c.category_id, c.category_name]));
      const items = sd.map(s => ({ id:String(s.stream_id), name:s.name, logo:s.stream_icon,
        group:cm[s.category_id]||"Other", url:api.liveURL(s.stream_id), num:s.num, epgId:s.epg_channel_id, type:"live" }));
      setChannels(items);
      // Persist to IDB + D1
      if (cId) {
        idbCache.set(`content:${cId}:live`, items);
        syncContentToD1(cId, "live", items);
        const now = Date.now();
        setLastSynced(prev => { const n = { ...prev, live: now }; idbCache.set(`sync:${cId}`, n); return n; });
      }
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function fetchVOD(force = false, background = false) {
    if (!conn || conn.type !== "xtream") return;
    const cId = connId(conn);
    // Check IDB first (unless force refresh)
    if (!force && cId && !vod.length) {
      const cached = await idbCache.get(`content:${cId}:vod`);
      if (cached && cached.length) { setVod(cached); return; }
    }
    if (!force && vod.length) return;
    if (!background) setLoading(true);
    try {
      const api = makeXtreamAPI(conn.server, conn.user, conn.pass);
      const [catData, sd] = await Promise.all([api.getVODCategories(), api.getVOD()]);
      const cm = Object.fromEntries(catData.map(c => [c.category_id, c.category_name]));
      const items = sd.map(s => ({ id:String(s.stream_id), name:s.name, logo:s.stream_icon,
        group:cm[s.category_id]||"Other", url:api.vodURL(s.stream_id, s.container_extension||"mp4"),
        year:s.year, rating:s.rating, type:"vod" }));
      setVod(items);
      if (cId) {
        idbCache.set(`content:${cId}:vod`, items);
        syncContentToD1(cId, "vod", items);
        const now = Date.now();
        setLastSynced(prev => { const n = { ...prev, vod: now }; idbCache.set(`sync:${cId}`, n); return n; });
      }
    } catch(e) { console.error(e); }
    finally { if (!background) setLoading(false); }
  }

  async function fetchSeries(force = false, background = false) {
    if (!conn || conn.type !== "xtream") return;
    const cId = connId(conn);
    if (!force && cId && !series.length) {
      const cached = await idbCache.get(`content:${cId}:series`);
      if (cached && cached.length) { setSeries(cached); return; }
    }
    if (!force && series.length) return;
    if (!background) setLoading(true);
    try {
      const api = makeXtreamAPI(conn.server, conn.user, conn.pass);
      const [catData, sd] = await Promise.all([api.getSeriesCategories(), api.getSeries()]);
      const cm = Object.fromEntries(catData.map(c => [c.category_id, c.category_name]));
      const items = sd.map(s => ({ id:String(s.series_id), name:s.name, logo:s.cover,
        group:cm[s.category_id]||"Other", year:s.releaseDate?.slice(0,4), rating:s.rating, type:"series" }));
      setSeries(items);
      if (cId) {
        idbCache.set(`content:${cId}:series`, items);
        syncContentToD1(cId, "series", items);
        const now = Date.now();
        setLastSynced(prev => { const n = { ...prev, series: now }; idbCache.set(`sync:${cId}`, n); return n; });
      }
    } catch(e) { console.error(e); }
    finally { if (!background) setLoading(false); }
  }

  async function fetchStalkerChannels(force = false) {
    if (!conn || conn.type !== "stalker") return;
    const cId = connId(conn);
    // Check IDB first (permanent, no TTL)
    if (!force && cId) {
      const cached = await idbCache.get(`content:${cId}:live`);
      if (cached && cached.length) { setChannels(cached); return; }
    }
    setLoading(true);
    try {
      const res = await stalkerFetch(`/stalker/channels?portal=${encodeURIComponent(conn.server)}&mac=${encodeURIComponent(conn.mac)}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const items = (data.channels || []).map(transformStalkerItem);
      setChannels(items);
      // Persist to IDB (permanent) + D1
      if (cId) {
        idbCache.set(`content:${cId}:live`, items);
        syncContentToD1(cId, "live", items);
        const now = Date.now();
        setLastSynced(prev => { const n = { ...prev, live: now }; idbCache.set(`sync:${cId}`, n); return n; });
      }
    } catch(e) { console.error("Stalker channels error:", e); }
    finally { setLoading(false); }
  }

  // ── Load category list for Stalker VOD / Series (permanent IDB cache, no TTL)
  // background=true: don't touch setCat/setLoading (used for pre-fetching on connect)
  async function loadStalkerCats(sec, force = false, background = false) {
    const cId = connId(conn);
    let cats = null;
    // Check IDB first (permanent, no TTL)
    if (!force && cId) {
      try { cats = await idbCache.get(`cats:${cId}:${sec}`); } catch {}
    }
    if (!cats) {
      if (!background) setLoading(true);
      try {
        const res  = await stalkerFetch(`/stalker/${sec}/categories?portal=${encodeURIComponent(conn.server)}&mac=${encodeURIComponent(conn.mac)}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        cats = data.categories || [];
        // Save to IDB (permanent) + D1
        if (cId) {
          idbCache.set(`cats:${cId}:${sec}`, cats);
          syncCategoriesToD1(cId, sec, cats);
        }
      } catch(e) { console.error(`Stalker ${sec} cats:`, e); return; }
      finally { if (!background) setLoading(false); }
    }
    sec === "vod" ? setStalkerVodCats(cats) : setStalkerSeriesCats(cats);
    if (cats.length) {
      if (!background) {
        setCat(cats[0].title);
        loadStalkerCatItems(sec, cats[0].id, cats[0].title);
      }
      // Background prefetch all categories (silent)
      prefetchRemainingStalkerCats(sec, cats, force);
    }
  }

  // ── Load items for one Stalker category (permanent IndexedDB cache, no TTL)
  async function loadStalkerCatItems(sec, catId, catTitle, silent = false, force = false) {
    const refKey = `${sec}-${catId}`;
    if (fetchingCatRef.current.has(refKey)) return;
    fetchingCatRef.current.add(refKey);
    const cId = connId(conn);
    const CACHE_KEY = cId ? `catitems:${cId}:${sec}:${catId}` : `sv-s-${sec}item-${conn.server}-${catId}`;
    const applyItems = (items) => {
      const mapped = items.map(item => ({ ...transformStalkerItem(item), group: catTitle }));
      if (sec === "vod") setVod(prev => [...prev.filter(v => v.group !== catTitle), ...mapped]);
      else setSeries(prev => [...prev.filter(s => s.group !== catTitle), ...mapped]);

    };
    if (!force) {
      try {
        const cached = await idbCache.get(CACHE_KEY);
        // No TTL — permanent cache
        if (cached) {
          const items = cached.items || cached;
          if (items.length) { applyItems(items); fetchingCatRef.current.delete(refKey); return; }
        }
      } catch {}
    }
    if (!silent) setCatLoading(true);
    try {
      const res  = await stalkerFetch(`/stalker/${sec}?portal=${encodeURIComponent(conn.server)}&mac=${encodeURIComponent(conn.mac)}&cat=${catId}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const items = data.items || [];
      applyItems(items);
      // Save transformed items to IDB (permanent)
      idbCache.set(CACHE_KEY, items.map(transformStalkerItem));
    } catch(e) { console.error(`Stalker ${sec} cat items:`, e); }
    finally { if (!silent) setCatLoading(false); fetchingCatRef.current.delete(refKey); }
  }

  // ── Option F: background prefetch remaining categories sequentially
  async function prefetchRemainingStalkerCats(sec, cats, force = false) {
    setPrefetchProgress({ done: 0, total: cats.length });
    let done = 0;
    for (const cat of cats) {
      await loadStalkerCatItems(sec, cat.id, cat.title, true, force);
      done++;
      setPrefetchProgress({ done, total: cats.length });
    }
    setPrefetchProgress(null);
    // Full dataset save is handled by the debounced contentSaveEffect below
  }

  // ── Debounced save: persist vod/series to IDB + D1 when data stabilizes
  const contentSaveTimer = useRef(null);
  useEffect(() => {
    if (!conn) return;
    const cId = connId(conn);
    if (!cId) return;
    clearTimeout(contentSaveTimer.current);
    contentSaveTimer.current = setTimeout(() => {
      if (vod.length) {
        idbCache.set(`content:${cId}:vod`, vod);
        syncContentToD1(cId, "vod", vod);
        setLastSynced(prev => { const n = { ...prev, vod: Date.now() }; idbCache.set(`sync:${cId}`, n); return n; });
      }
      if (series.length) {
        idbCache.set(`content:${cId}:series`, series);
        syncContentToD1(cId, "series", series);
        setLastSynced(prev => { const n = { ...prev, series: Date.now() }; idbCache.set(`sync:${cId}`, n); return n; });
      }
    }, 3000);
    return () => clearTimeout(contentSaveTimer.current);
  }, [vod, series, conn]);

  async function resolveStalkerStream(item) {
    const contentType = item.type || "live";
    const cmd = item._stalkerCmd;
    try {
      const query = new URLSearchParams({
        portal: conn.server,
        mac: conn.mac,
        cmd,
        content_type: contentType,
      });
      const res = await stalkerFetch(`/stalker/stream?${query}`);
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || `Proxy returned ${res.status}`);
      return data.url.startsWith("/") ? `${PROXY.replace(/\/+$/, "")}${data.url}` : data.url;
    } catch(e) { console.error("Stalker stream resolve failed:", e); return null; }
  }

  async function loadEPG(url) {
    if (!url) return;
    setEpgLoading(true);
    try {
      const res = await proxyFetch(url);
      const text = await res.text();
      setEpgData(parseXMLTV(text));
      setEpgURL(url);
      db.set("sv-epgURL", url);
    } catch(e) { console.error("EPG error:", e); }
    finally { setEpgLoading(false); }
  }

  async function loadStalkerEPG() {
    
  }

  function switchSection(nextSection) {
    const target = ["vod", "series"].includes(nextSection) ? nextSection : "live";
    setSection(target); setSearch(""); setPage(1);
    if (target === "vod" || target === "series") {
      setCat(null);
      if (conn?.type === "stalker") loadStalkerCats(target);
    } else {
      setCat("All");
    }
  }

  function refreshCurrentSection() {
    setShowMenu(false);
    if (conn?.type !== "stalker") return;
    if (section === "live") {
      setChannels([]);
      fetchStalkerChannels(true);
    } else if (section === "vod") {
      setVod([]);
      setStalkerVodCats([]);
      loadStalkerCats("vod", true);
    } else if (section === "series") {
      setSeries([]);
      setStalkerSeriesCats([]);
      loadStalkerCats("series", true);
    }
  }

  // ── favorites
  function toggleFav(item) {
    const type = item.type || "live";
    const newFavs = { ...favs, [type]: { ...favs[type] } };
    const key = item.id || item.url;
    if (newFavs[type][key]) delete newFavs[type][key];
    else newFavs[type][key] = { id:item.id, name:item.name, url:item.url, logo:item.logo, group:item.group, type };
    setFavs(newFavs);
    if (activeConnId) {
      db.set(`sv-favs-${activeConnId}`, newFavs);
      syncFavoritesToD1(activeConnId, newFavs);
    }
  }

  function isFav(item) {
    const type = item?.type || "live";
    return !!(item && favs[type]?.[item.id || item.url]);
  }

  // ── history / continue watching
  function addHistory(item) {
    const entry = { ...item, timestamp: Date.now(), position: 0 };
    const newH = [entry, ...history.filter(h => (h.id||h.url) !== (item.id||item.url))].slice(0, 60);
    setHistory(newH);
    if (activeConnId) {
      db.set(`sv-history-${activeConnId}`, newH);
    }
    syncHistoryToD1(newH);
  }

  async function playItem(item) {
    // If this is a series item, open the detail modal instead of playing
    if (item.type === "series") {
      openSeriesDetail(item);
      return;
    }
    if (conn?.type === "stalker" && item._stalkerCmd && !item.url) {
      const resolved = await resolveStalkerStream(item);
      if (!resolved) return;
      const resolved_item = { ...item, url: resolved };
      setPlaying(resolved_item);
      addHistory(resolved_item);
    } else {
      setPlaying(item);
      addHistory(item);
    }
  }

  // ── series detail (seasons/episodes)
  async function openSeriesDetail(item) {
    if (!item || item.type !== "series") return;
    setSeriesLoading(true);
    setSeriesDetail({ item, seasons: [], activeSeason: 0 });

    try {
      if (conn?.type === "stalker") {
        const res = await stalkerFetch(`/stalker/series/${encodeURIComponent(item.id)}/seasons?portal=${encodeURIComponent(conn.server)}&mac=${encodeURIComponent(conn.mac)}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        const seasons = data.seasons || [];
        setSeriesDetail({ item, seasons, activeSeason: 0 });
      } else if (conn?.type === "xtream") {
        const api = makeXtreamAPI(conn.server, conn.user, conn.pass);
        const info = await api.getSeriesInfo(item.id);
        const seasonNums = Object.keys(info.episodes || {}).sort((a,b) => Number(a) - Number(b));
        const seasons = seasonNums.map(sn => ({
          id: `${item.id}:${sn}`,
          name: `Season ${sn}`,
          episodes: (info.episodes[sn] || []).map(ep => ({
            num: ep.episode_num,
            title: ep.title || `Episode ${ep.episode_num}`,
            id: ep.id,
            ext: ep.container_extension || "mp4",
          })),
        }));
        setSeriesDetail({ item, seasons, activeSeason: 0, xtreamInfo: info });
      }
    } catch(e) {
      console.error("Series detail error:", e);
      setSeriesDetail(null);
    } finally {
      setSeriesLoading(false);
    }
  }

  async function playSeriesEpisode(season, episodeNum) {
    if (!seriesDetail) return;
    setEpisodeLoading(episodeNum);
    try {
      if (conn?.type === "stalker") {
        // Resolve series episode stream through the authenticated TeroDev proxy.
        let resolvedUrl = null;
        try {
          const query = new URLSearchParams({ portal: conn.server, mac: conn.mac, cmd: season.cmd, episode: String(episodeNum) });
          const res = await stalkerFetch(`/stalker/series/episode/stream?${query}`);
          const data = await res.json();
          if (!res.ok || !data.url) throw new Error(data.error || `Proxy returned ${res.status}`);
          resolvedUrl = data.url.startsWith("/") ? `${PROXY.replace(/\/+$/, "")}${data.url}` : data.url;
        } catch (e) { throw new Error(e.message || "No stream URL returned for episode"); }
        const epItem = {
          id: `${seriesDetail.item.id}-s${seriesDetail.activeSeason}-e${episodeNum}`,
          name: `${seriesDetail.item.name} - ${season.name} E${episodeNum}`,
          url: resolvedUrl,
          logo: seriesDetail.item.logo,
          type: "vod",
          group: seriesDetail.item.group,
        };
        setPlaying(epItem);
        addHistory(epItem);
      } else if (conn?.type === "xtream") {
        const ep = season.episodes?.find(e => e.num == episodeNum || e.id == episodeNum);
        if (!ep) return;
        const api = makeXtreamAPI(conn.server, conn.user, conn.pass);
        const streamUrl = api.seriesStreamURL(ep.id, ep.ext || "mp4");
        const epItem = {
          id: `${seriesDetail.item.id}-e${ep.id}`,
          name: `${seriesDetail.item.name} - ${season.name} ${ep.title || `E${ep.num}`}`,
          url: streamUrl,
          logo: seriesDetail.item.logo,
          type: "vod",
          group: seriesDetail.item.group,
        };
        setPlaying(epItem);
        addHistory(epItem);
      }
    } catch(e) {
      console.error("Episode play error:", e);
    } finally {
      setEpisodeLoading(null);
    }
  }

  // ── connection management
  function makeConnectionLabel(type, config) {
    if (type === "xtream") return `${config.user} · Xtream`;
    if (type === "stalker") return `Stalker · ${(config.mac||"").slice(-5)}`;
    if (type === "m3u") return `M3U · ${(config.url||"").split("/").pop()?.slice(0,20)||"playlist"}`;
    return "Direct HLS";
  }

  function saveConnection(connConfig) {
    const cId = connId(connConfig);
    if (!cId) return;
    const existing = connections.find(c => c.id === cId);
    if (existing) {
      // Already saved — just activate
      setActiveConnId(cId);
      db.set("sv-activeConn", cId);
      return;
    }
    const usedColors = new Set(connections.map(c => c.color));
    const color = PROFILE_COLORS.find(c => !usedColors.has(c)) || PROFILE_COLORS[connections.length % PROFILE_COLORS.length];
    const connObj = { id: cId, type: connConfig.type, label: makeConnectionLabel(connConfig.type, connConfig), color, config: connConfig };
    const newConns = [...connections, connObj];
    setConnections(newConns);
    setActiveConnId(cId);
    db.set("sv-connections", newConns);
    db.set("sv-activeConn", cId);
  }

  function switchConnection(id) {
  setShowConnManager(false);

  // تنظيف البيانات الحالية
  setChannels([]);
  setVod([]);
  setSeries([]);
  setStalkerVodCats([]);
  setStalkerSeriesCats([]);

  fetchingCatRef.current.clear();
  setPrefetchProgress(null);
  setPlaying(null);
  setCat("All");

  // الرجوع إلى صفحة Setup
  setConn(null);
  setActiveConnId(null);
  db.remove("sv-activeConn"); // إذا موجودة عندك

  return;
}

  function removeConnection(id) {
    const newConns = connections.filter(c => c.id !== id);
    setConnections(newConns);
    db.set("sv-connections", newConns);
    // Clean up localStorage
    localStorage.removeItem(`sv-favs-${id}`);
    localStorage.removeItem(`sv-history-${id}`);
    // Clean up IDB cache
    for (const key of [`content:${id}:live`, `content:${id}:vod`, `content:${id}:series`,
      `cats:${id}:vod`, `cats:${id}:series`, `sync:${id}`]) {
      idbCache.set(key, null);
    }
    // Clean up D1 (cascades: content_items, categories, sync_meta)
    catalogAPI(`connections?id=${id}`, { method: "DELETE" });
  }

  function addNewConnection() {
    setShowConnManager(false);
    disconnect();
  }

  // ── hidden cats
  function toggleHideCat(sec, catName) {
    const arr = hiddenCats[sec] || [];
    const newArr = arr.includes(catName) ? arr.filter(c=>c!==catName) : [...arr, catName];
    const newHc = { ...hiddenCats, [sec]: newArr };
    setHiddenCats(newHc);
    db.set("sv-hiddenCats", newHc);
  }

  function isCatHidden(sec, catName) {
    return (hiddenCats[sec]||[]).includes(catName);
  }

  // ── context menu close
  useEffect(() => {
    const close = () => setCtx(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  useEffect(() => { setPage(1); }, [cat, search, section]);

  function disconnect() {
    // Save live channels to restore them after clearing
    const currentLiveChannels = [...channels];
    
    // Clear almost everything from localStorage
    const keysToKeep = ["sv-auth-code"]; // Keep auth code if you want to stay logged in to the app, but user said "تسجيل خروج" so maybe clear it too?
    // User said "تسجيل خروج" which usually means full logout.
    
    localStorage.clear();
    
    // Restore live channels to state
    setConn(null); 
    setChannels(currentLiveChannels); 
    setVod([]); 
    setSeries([]);
    setStalkerVodCats([]); 
    setStalkerSeriesCats([]);

    fetchingCatRef.current.clear(); 
    setPrefetchProgress(null);
    setSection("live"); 
    setPlaying(null); 
    setCat("All");
    setActiveConnId(null);
    setIsAuthorized(false); // Full logout
    setIsAdmin(false);
  }

  // ── DERIVED DATA
  const getItems = useCallback((sec) => sec==="live"?channels : sec==="vod"?vod : series, [channels, vod, series]);

  const curCatsAll = useMemo(() => {
    if (conn?.type === "stalker" && (section === "vod" || section === "series")) {
      const apiCats = section === "vod" ? stalkerVodCats : stalkerSeriesCats;
      if (apiCats.length) return apiCats.map(c => c.title);
    }
    const items = getItems(section);
    return ["All", ...new Set(items.map(i=>i.group).filter(Boolean))];
  }, [conn, section, stalkerVodCats, stalkerSeriesCats, getItems]);

  const curItemsAll = useMemo(() => {
    if (!cat) return [];
    const items = getItems(section);
    return items.filter(item => {
      const catMatch = cat === "All" || item.group === cat;
      const searchMatch = !search || item.name?.toLowerCase().includes(search.toLowerCase());
      return catMatch && searchMatch;
    });
  }, [getItems, section, cat, search]);

  const favItems = useMemo(() => ({
    live: Object.values(favs.live||{}),
    vod:  Object.values(favs.vod||{}),
    series: Object.values(favs.series||{}),
  }), [favs]);
  const totalFavs = favItems.live.length + favItems.vod.length + favItems.series.length;

  const continueItems = useMemo(() =>
    history.filter(h => h.position > 5 && h.type !== "live").slice(0, 20),
  [history]);

  const historyMap = useMemo(() => {
    const m = new Map();
    for (const h of history) m.set(h.id || h.url, h);
    return m;
  }, [history]);

  // ── global search
  const searchResults = useMemo(() => {
    if (globalQ.length <= 1) return [];
    const q = globalQ.toLowerCase();
    return [...channels, ...vod, ...series].filter(i => i.name?.toLowerCase().includes(q)).slice(0, 80);
  }, [globalQ, channels, vod, series]);

  function handleConnect(connConfig) {
    saveConnection(connConfig);
    setConn(connConfig);
  }

  if (!isAuthorized) return (
    <>
      <style>{genCSS(THEMES[themeName])}</style>
      <Login onLogin={(admin) => { setIsAuthorized(true); setIsAdmin(admin); }} />
    </>
  );

  if (showAdmin && isAdmin) return (
    <>
      <style>{genCSS(THEMES[themeName])}</style>
      <AdminPanel onClose={() => setShowAdmin(false)} />
    </>
  );

  if (!conn) return (
    <>
      <style>{genCSS(THEMES[themeName])}</style>
      <div style={{position:"fixed",top:"1rem",right:"1rem",zIndex:100}}>
        {isAdmin && <button className="c-btn toolbar-action action-admin setup-admin-action" onClick={() => setShowAdmin(true)} title="Open Admin Panel"><span className="action-icon" aria-hidden="true">⚙</span><span>Admin Panel</span></button>}
      </div>
      <Setup onConnect={handleConnect} connections={connections} onReconnect={switchConnection} isAdmin={isAdmin} />
    </>
  );

  const LABEL = {live:"Live TV",vod:"Movies",series:"Series"};
  const activeConnection = connections.find(c => c.id === activeConnId);
  const curCats = curCatsAll;
  const curItems = curItemsAll;
  const totalPages = Math.ceil(curItems.length / PAGE_SIZE);
  const paginatedItems = curItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="app">
      <aside className="app-sidebar" aria-label="Main navigation">
        <div className="brand-lockup">
          <div className="brand-mark">T<span>·</span></div>
          <div className="brand-copy">
            <div className="brand-name">TERO<span>DEV</span></div>
            <div className="brand-caption">PERSONAL STREAMING</div>
          </div>
        </div>

        <nav className="app-nav">
          {NAV.map((item, index) => (
            <div key={item.key}>
              {item.group !== NAV[index - 1]?.group && <div className="nav-group-title">{item.group}</div>}
              <button
                className={`app-nav-item ${section === item.key ? "active" : ""}`}
                onClick={() => { switchSection(item.key); setShowMenu(false); }}
                aria-current={section === item.key ? "page" : undefined}
              >
                <span className="app-nav-icon" aria-hidden="true">{item.icon}</span>
                <span className="app-nav-label">{item.label}</span>
                {item.key === "live" && <span className="nav-live-dot" />}
              </button>
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="connection-status"><span className="status-dot" /> SERVICE CONNECTED</div>
          <div className="connection-mini">
            <div className="connection-mini-icon">⌁</div>
            <div className="connection-mini-copy">
              <strong>{conn?.server?.replace(/^https?:\/\//, "").split("/")[0] || "Your playlist"}</strong>
              <span>{conn?.type === "stalker" ? "Stalker portal" : conn?.type || "Active connection"}</span>
            </div>
            <button className="connection-change" onClick={switchConnection} aria-label="Switch connection" title="Switch connection">↗</button>
          </div>
          <div className="sidebar-footnote">YOUR CONTENT. YOUR SCREEN.</div>
        </div>
      </aside>

      {/* ── CONTENT ── */}
      <div className="content">
        {/* Header */}
        
        <div className="c-header">

  {/* Hamburger */}
  <button
    className="hamburger"
    onClick={() => setShowMenu(!showMenu)}
  >
    ☰
  </button>

  {/* Logo */}
  <div className="s-logo">Tero Dev. To IPTV</div>

  {/* Title */}
  <span className="c-title">
    {LABEL[section]}

    {["live","vod","series"].includes(section) && curItems.length > 0 && (
      <span className="c-count">
        {curItems.length.toLocaleString()} items
      </span>
    )}
  </span>

  {/* Search */}
  {section==="search" && (
    <div className="c-search-wrap">
      <input
        className="c-search"
        placeholder="Search..."
        autoFocus
        value={globalQ}
        onChange={e=>setGlobalQ(e.target.value)}
      />
    </div>
  )}

  { ["live","vod","series"].includes(section) && (
    <div className="c-search-wrap">
      <input
        className="c-search"
        placeholder={`Search ${LABEL[section]}...`}
        value={search}
        onChange={e=>setSearch(e.target.value)}
      />
    </div>
    
  )}
  <div className="header-actions">
          {isAdmin && (
            <button className="menu-btn toolbar-action action-admin" title="Open Admin Panel"
              onClick={() => { setShowAdmin(true); setShowMenu(false); }}>
              <span className="action-icon" aria-hidden="true">⚙</span><span>Admin Panel</span>
            </button>
          )}
          {conn?.type === "stalker" && (
            <button className="menu-btn toolbar-action action-refresh" title={`Refresh ${LABEL[section] || "content"}`}
              onClick={refreshCurrentSection}>
              <span className="action-icon" aria-hidden="true">↻</span><span>Refresh</span>
            </button>
          )}
          {activeConnection && (
            <button className="menu-btn" onClick={() => { switchConnection(); setShowMenu(false); }}>
              🔀 Switch Connection
            </button>
          )}
          <button className="menu-btn toolbar-action action-disconnect danger" title="Disconnect and sign out"
            onClick={() => { disconnect(); setShowMenu(false); }}>
            <span className="action-icon" aria-hidden="true">⏻</span><span>Disconnect</span>
          </button>
        </div>

</div>

{showMenu && (

        <div className="mobile-menu">
          {isAdmin && (
            <button className="menu-btn toolbar-action action-admin" title="Open Admin Panel"
              onClick={() => { setShowAdmin(true); setShowMenu(false); }}>
              <span className="action-icon" aria-hidden="true">⚙</span><span>Admin Panel</span>
            </button>
          )}
          {conn?.type === "stalker" && (
            <button className="menu-btn toolbar-action action-refresh" title={`Refresh ${LABEL[section] || "content"}`}
              onClick={refreshCurrentSection}>
              <span className="action-icon" aria-hidden="true">↻</span><span>Refresh</span>
            </button>
          )}
          {activeConnection && (
            <button className="menu-btn" onClick={() => { switchConnection(); setShowMenu(false); }}>
              🔀 Switch Connection
            </button>
          )}
          <button className="menu-btn toolbar-action action-disconnect danger" title="Disconnect and sign out"
            onClick={() => { disconnect(); setShowMenu(false); }}>
            <span className="action-icon" aria-hidden="true">⏻</span><span>Disconnect</span>
          </button>

        </div>
      )}


        {/* Body */}
        {loading ? (
          <div className="loading"><div className="spinner" /><span>Loading {LABEL[section]}…</span></div>
        ) : section==="discover" ? (
          <DiscoverView tmdbKey={tmdbKey} setTmdbKey={setTmdbKey} vod={vod} series={series} onPlay={playItem} />
        ) : section==="hls" ? (
          <DirectHLSView />
        ) : section==="epg" ? (
          <EPGView channels={channels} epgData={epgData} epgURL={epgURL} setEpgURL={setEpgURL}
            epgLoading={epgLoading} loadEPG={loadEPG} onPlay={playItem} />
        ) : section==="search" ? (
          <GlobalSearch results={searchResults} query={globalQ} onPlay={playItem} toggleFav={toggleFav} isFav={isFav} />
        ) : section==="favs" ? (
          <FavsView favItems={favItems} onPlay={playItem} toggleFav={toggleFav} isFav={isFav} />
        ) : section==="continue" ? (
          <ContinueView items={continueItems} onPlay={playItem} history={history} />
        ) : (
          <div className="c-body">
            {/* Categories sidebar */}
            {curCats.length > 1 && (
              <div className="cats">
                {curCats.map(c => {
                  const hidden = c !== "All" && isCatHidden(section, c);
                  return (
                    <div key={c}
                      className={`cat ${cat===c?"on":""} ${hidden?"cat-hidden":""}`}
                      title={c}
                      onClick={() => {
                        if (hidden) return;
                        setCat(c);
                        if (conn?.type === "stalker" && (section === "vod" || section === "series")) {
                          const apiCats = section === "vod" ? stalkerVodCats : stalkerSeriesCats;
                          const catObj = apiCats.find(sc => sc.title === c);
                          if (catObj) loadStalkerCatItems(section, catObj.id, c);
                        }
                      }}
                      onContextMenu={e => {
                        e.preventDefault();
                        if (c !== "All") setCtx({x:e.clientX, y:e.clientY, sec:section, catName:c});
                      }}>
                      {c}
                    </div>
                  );
                })}
              </div>
            )}

            {cat === null && conn?.type === "stalker" && (section === "vod" || section === "series") ? (
              <div className="empty">
                <div className="empty-icon">📂</div>
                <div className="empty-t">Select a category</div>
                <div className="empty-s">Choose a category from the list above to load content.</div>
              </div>
            ) : catLoading && curItems.length === 0 ? (
              <div className="empty">
                <div className="empty-icon" style={{animation:"spin 1s linear infinite"}}>⏳</div>
                <div className="empty-t">Loading {cat}…</div>
                <div className="empty-s">Fetching items from portal.</div>
              </div>
            ) : curItems.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">{section==="live"?"📺":section==="vod"?"🎬":"📽"}</div>
                <div className="empty-t">No content found</div>
                <div className="empty-s">
                  {section==="vod"
                    ? "No movies were returned. Check the portal connection or choose another category."
                    : section==="series"
                      ? "No series were returned. Check the portal connection or choose another category."
                      : conn.type==="stalker" ? "No channels were returned. Check the portal and MAC address, then refresh." : "Check the playlist connection, then refresh the channel list."}
                </div>
              </div>
            ) : (
              <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"auto",minHeight:0}}>
                {section==="live" ? (
                  <div className="ch-grid">
                    {paginatedItems.map((ch,i) => {
                      const faved = isFav(ch);
                      const epgNow = getEPGNow(epgData, ch.epgId);
                      return (
                        <div key={ch.id||i} className={`ch-card ${playing?.id===ch.id?"playing":""}`}
                          onClick={() => playItem(ch)}>
                          {ch.logo
                            ? <img className="ch-logo" src={ch.logo} alt="" onError={e=>e.target.style.display="none"} />
                            : <div className="ch-logo-ph">📺</div>}
                          <div className="ch-name">{ch.name}</div>
                          {ch.num && <div className="ch-num">CH {ch.num}</div>}
                          {epgNow && <div className="ch-meta">▶ {epgNow.title}</div>}
                          <FavBtn on={faved} onClick={() => toggleFav(ch)} />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="vod-grid">
                    {paginatedItems.map((item,i) => {
                      const faved = isFav(item);
                      const hist = historyMap.get(item.id || item.url);
                      const pct = hist?.position && hist?.duration ? Math.min(100, (hist.position/hist.duration)*100) : 0;
                      return (
                        <div key={item.id||i} className="vod-card" onClick={() => playItem(item)} title={item.name}>
                          {item.logo
                            ? <img className="vod-poster" src={item.logo} alt="" onError={e=>e.target.style.display="none"} />
                            : <div className="vod-ph">{section==="series"?"📽":"🎬"}</div>}
                          {pct > 2 && (
                            <div className="resume-bar"><div className="resume-fill" style={{width:`${pct}%`}} /></div>
                          )}
                          <div className="vod-info">
                            <div className="vod-title">{item.name}</div>
                            <div className="vod-meta">
                              {[item.year, item.rating && `★${parseFloat(item.rating||0).toFixed(1)}`].filter(Boolean).join(" · ")}
                            </div>
                          </div>
                          <button className={`vod-fav ${faved?"on":""}`}
                            onClick={e=>{e.stopPropagation();toggleFav(item);}}>
                            {faved?"♥":"♡"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                {totalPages > 1 && (
                  <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:".5rem",padding:".75rem 0",width:"100%",flexShrink:0}}>
                    <button className="c-btn" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}>← Prev</button>
                    <span style={{fontSize:".75rem",color:"var(--t2)"}}>Page {page} of {totalPages}</span>
                    <button className="c-btn" onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}>Next →</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── PLAYER ── */}
      {playing && (
        <Player item={playing}
          channelList={playing.type==="live" ? channels : null}
          epgData={epgData}
          onClose={() => setPlaying(null)}
          toggleFav={toggleFav}
          onFav={toggleFav}
          isFav={isFav}
          connType={conn?.type}
        />
      )}

      {/* ── CONTEXT MENU ── */}
      {ctx && (
        <div className="ctx-menu" style={{left:ctx.x, top:ctx.y}} onClick={e=>e.stopPropagation()}>
          <div className="ctx-item" onClick={() => {toggleHideCat(ctx.sec, ctx.catName);setCtx(null);}}>
            {isCatHidden(ctx.sec, ctx.catName) ? "👁 Show category" : "🙈 Hide category"}
          </div>
          <div className="ctx-item" onClick={() => {setCat(ctx.catName);setCtx(null);}}>
            📌 Filter to this
          </div>
        </div>
      )}

      {/* ── SERIES DETAIL MODAL ── */}
      {seriesDetail && (
        <div className="series-modal-ov" onClick={() => { if (!seriesLoading) setSeriesDetail(null); }}>
          <div className="series-modal" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="series-modal-header">
              {seriesDetail.item.logo
                ? <img className="series-modal-poster" src={seriesDetail.item.logo} alt="" onError={e => e.target.style.display="none"} />
                : <div className="series-modal-poster-ph">📽</div>}
              <div className="series-modal-info">
                <div className="series-modal-title">{seriesDetail.item.name}</div>
                <div className="series-modal-meta">
                  {[seriesDetail.item.year, seriesDetail.item.rating && `★${parseFloat(seriesDetail.item.rating||0).toFixed(1)}`].filter(Boolean).join(" · ")}
                  {seriesDetail.seasons.length > 0 && ` · ${seriesDetail.seasons.length} Season${seriesDetail.seasons.length > 1 ? "s" : ""}`}
                </div>
                {seriesDetail.item.description && (
                  <div className="series-modal-desc">{seriesDetail.item.description}</div>
                )}
              </div>
              <button className="series-modal-close" onClick={() => setSeriesDetail(null)} title="Close">✕</button>
            </div>
            {/* Body */}
            <div className="series-modal-body">
              {seriesLoading ? (
                <div className="series-loading">
                  <div className="spinner" />
                  <span>Loading seasons…</span>
                </div>
              ) : seriesDetail.seasons.length === 0 ? (
                <div style={{textAlign:"center",padding:"2rem",color:"var(--t2)",fontSize:".85rem"}}>
                  No seasons found for this series.
                </div>
              ) : (
                <>
                  {/* Season tabs */}
                  {seriesDetail.seasons.length > 1 && (
                    <div className="series-seasons-tabs">
                      {seriesDetail.seasons.map((s, idx) => (
                        <button key={s.id || idx}
                          className={`series-season-tab ${seriesDetail.activeSeason === idx ? "on" : ""}`}
                          onClick={() => setSeriesDetail(prev => ({ ...prev, activeSeason: idx }))}>
                          {s.name || `Season ${idx + 1}`}
                        </button>
                      ))}
                    </div>
                  )}
                  {seriesDetail.seasons.length === 1 && (
                    <div style={{fontSize:".8rem",fontWeight:600,color:"var(--t2)",marginBottom:".7rem"}}>
                      {seriesDetail.seasons[0].name || "Season 1"} — {seriesDetail.seasons[0].episodes.length} episode{seriesDetail.seasons[0].episodes.length !== 1 ? "s" : ""}
                    </div>
                  )}
                  {/* Episode list */}
                  <div className="series-ep-list">
                    {(() => {
                      const season = seriesDetail.seasons[seriesDetail.activeSeason];
                      if (!season) return null;
                      const episodes = conn?.type === "xtream"
                        ? season.episodes.map(ep => ({ num: ep.num || ep.id, label: ep.title || `Episode ${ep.num}` }))
                        : season.episodes.map((ep, index) => {
                          const num = typeof ep === "object" ? (ep.num || ep.episode_num || ep.id || index + 1) : ep;
                          return { num, label: typeof ep === "object" ? (ep.title || `Episode ${num}`) : `Episode ${num}` };
                        });
                      return episodes.map(ep => (
                        <div key={ep.num}
                          className={`series-ep-item ${episodeLoading === ep.num ? "loading" : ""}`}
                          onClick={() => playSeriesEpisode(season, ep.num)}>
                          <div className="series-ep-num">{ep.num}</div>
                          <div className="series-ep-name">{ep.label}</div>
                          {episodeLoading === ep.num
                            ? <div className="spinner" style={{width:16,height:16,borderWidth:2}} />
                            : <span className="series-ep-play">▶</span>}
                        </div>
                      ));
                    })()}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Connection Manager Removed */}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// SUB-VIEWS
// ══════════════════════════════════════════════════════════════════
function FavsView({ favItems, onPlay, toggleFav, isFav }) {
  const all = [...favItems.live, ...favItems.vod, ...favItems.series];
  if (!all.length) return (
    <div className="empty">
      <div className="empty-icon">♡</div>
      <div className="empty-t">No favorites yet</div>
      <div className="empty-s">Click the ♡ icon on any channel or movie to add it here.</div>
    </div>
  );
  const groups = [["Live TV", favItems.live], ["Movies", favItems.vod], ["Series", favItems.series]];
  return (
    <div style={{flex:1,overflow:"auto",padding:"1.1rem 1.4rem",display:"flex",flexDirection:"column",gap:"1.5rem"}}>
      {groups.filter(([,items]) => items.length > 0).map(([label, items]) => (
        <div key={label} className="section-block">
          <div className="section-label">{label}</div>
          <div className={label==="Live TV" ? "ch-grid" : "vod-grid"}>
            {items.map((item,i) => label==="Live TV" ? (
              <div key={item.id||i} className="ch-card" onClick={() => onPlay(item)}>
                {item.logo ? <img className="ch-logo" src={item.logo} alt="" /> : <div className="ch-logo-ph">📺</div>}
                <div className="ch-name">{item.name}</div>
                <FavBtn on={true} onClick={() => toggleFav(item)} />
              </div>
            ) : (
              <div key={item.id||i} className="vod-card" onClick={() => onPlay(item)}>
                {item.logo ? <img className="vod-poster" src={item.logo} alt="" /> : <div className="vod-ph">🎬</div>}
                <div className="vod-info"><div className="vod-title">{item.name}</div></div>
                <button className="vod-fav on" onClick={e=>{e.stopPropagation();toggleFav(item);}}>♥</button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ContinueView({ items, onPlay, history }) {
  const recent = history.slice(0, 20);
  if (!recent.length) return (
    <div className="empty">
      <div className="empty-icon">⏯</div>
      <div className="empty-t">Nothing started yet</div>
      <div className="empty-s">Watch some content and it will appear here for easy resuming.</div>
    </div>
  );
  return (
    <div style={{flex:1,overflow:"auto",padding:"1.1rem 1.4rem",display:"flex",flexDirection:"column",gap:"1.5rem"}}>
      {items.length > 0 && (
        <div className="section-block">
          <div className="section-label">Resume Watching</div>
          <div className="cw-row">
            {items.map((item,i) => {
              const pct = item.duration ? Math.min(100,(item.position/item.duration)*100) : 0;
              return (
                <div key={item.id||i} className="cw-item" onClick={()=>onPlay(item)}>
                  {item.logo ? <img className="cw-poster" src={item.logo} alt="" style={{width:"100%",aspectRatio:"16/9",objectFit:"cover"}} /> : <div className="cw-poster">🎬</div>}
                  <div className="cw-prog-bar"><div className="cw-prog-fill" style={{width:`${pct}%`}} /></div>
                  <div className="cw-info">
                    <div className="cw-name">{item.name}</div>
                    <div className="cw-time">{fmtTime(item.position)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className="section-block">
        <div className="section-label">Recently Watched</div>
        <div style={{display:"flex",flexDirection:"column",gap:".4rem"}}>
          {recent.map((item,i) => (
            <div key={item.id||i} style={{display:"flex",alignItems:"center",gap:".75rem",padding:".5rem .75rem",
              background:"var(--s1)",border:"1px solid var(--b1)",borderRadius:"9px",cursor:"pointer",transition:"all .2s"}}
              onClick={()=>onPlay(item)}
              onMouseEnter={e=>e.currentTarget.style.borderColor="var(--b2)"}
              onMouseLeave={e=>e.currentTarget.style.borderColor="var(--b1)"}>
              {item.logo ? <img style={{width:"30px",height:"30px",objectFit:"contain",borderRadius:"4px",background:"var(--s2)",flexShrink:0}} src={item.logo} alt="" /> : <div style={{width:"30px",height:"30px",background:"var(--s2)",borderRadius:"4px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:".75rem",flexShrink:0}}>{item.type==="live"?"📺":"🎬"}</div>}
              <div style={{flex:1,overflow:"hidden"}}>
                <div style={{fontSize:".8rem",fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.name}</div>
                <div style={{fontSize:".65rem",color:"var(--t3)"}}>{item.group} · {new Date(item.timestamp).toLocaleDateString()}</div>
              </div>
              <div style={{fontSize:".65rem",color:"var(--t3)",textTransform:"capitalize",flexShrink:0}}>{item.type}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function GlobalSearch({ results, query, onPlay, toggleFav, isFav }) {
  if (!query || query.length < 2) return (
    <div className="empty">
      <div className="empty-icon">🔍</div>
      <div className="empty-t">Search everything</div>
      <div className="empty-s">Type above to search across Live TV, Movies, and Series simultaneously. Inspired by SFVIP's "All" category.</div>
    </div>
  );
  if (!results.length) return (
    <div className="empty"><div className="empty-icon">🔍</div><div className="empty-t">No results for "{query}"</div></div>
  );
  const byType = { live:results.filter(r=>r.type==="live"), vod:results.filter(r=>r.type==="vod"), series:results.filter(r=>r.type==="series") };
  const ICONS = {live:"📺",vod:"🎬",series:"📽"};
  const LABELS = {live:"Live TV",vod:"Movies",series:"Series"};
  return (
    <div className="gsearch">
      {Object.entries(byType).filter(([,items])=>items.length).map(([type,items]) => (
        <div key={type} className="gsearch-section">
          <div className="section-label">{LABELS[type]} <span style={{fontFamily:"'DM Sans'",fontWeight:400,color:"var(--t3)",textTransform:"none",letterSpacing:0}}>({items.length})</span></div>
          {items.map((item,i) => (
            <div key={item.id||i} className="gsearch-row" onClick={()=>onPlay(item)}>
              {item.logo ? <img className="gsearch-logo" src={item.logo} alt="" onError={e=>e.target.style.display="none"} /> : <div className="gsearch-logo-ph">{ICONS[type]}</div>}
              <div className="gsearch-name">{item.name}</div>
              <div className="gsearch-group">{item.group}</div>
              <button style={{background:"none",border:"none",cursor:"pointer",fontSize:".9rem",color:isFav(item)?"var(--accent)":"var(--t3)",padding:".1rem .2rem",transition:"color .2s"}}
                onClick={e=>{e.stopPropagation();toggleFav(item);}}>
                {isFav(item)?"♥":"♡"}
              </button>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function EPGView({ channels, epgData, epgURL, setEpgURL, epgLoading, loadEPG, onPlay }) {
  const [urlInput, setUrlInput] = useState(epgURL||"");
  const [search, setSearch] = useState("");

  // Build 8-slot time window centred on current hour (recomputes hourly)
  const [epgHour, setEpgHour] = useState(() => new Date().getHours());
  useEffect(() => {
    const id = setInterval(() => setEpgHour(new Date().getHours()), 60000);
    return () => clearInterval(id);
  }, []);
  const slots = useMemo(() => {
    const startH = Math.max(0, epgHour - 1);
    return Array.from({length:8}, (_,i) => {
      const h = startH + i;
      const base = new Date(); base.setHours(h, 0, 0, 0);
      return { label: `${String(h % 24).padStart(2,"0")}:00`, startMs: base.getTime(), endMs: base.getTime() + 3600000 };
    });
  }, [epgHour]);

  const filteredChannels = useMemo(() => {
    if (!search) return channels;
    const q = search.toLowerCase();
    return channels.filter(ch => ch.name?.toLowerCase().includes(q));
  }, [channels, search]);

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div className="epg-top">
        <input className="fi" style={{flex:"1 1 260px",minWidth:0}} placeholder="XMLTV EPG URL (e.g. http://provider.com/epg.xml)" value={urlInput}
          onChange={e=>setUrlInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&loadEPG(urlInput)} />
        <button className="btn-go" onClick={()=>loadEPG(urlInput)} disabled={epgLoading} style={{padding:".4rem .9rem",fontSize:".82rem"}}>
          {epgLoading ? "Loading…" : "Load EPG"}
        </button>
        {channels.length > 0 && (
          <input className="fi" style={{width:"160px"}} placeholder="Filter channels…"
            value={search} onChange={e=>setSearch(e.target.value)} />
        )}
      </div>
      {!channels.length ? (
        <div className="empty"><div className="empty-icon">📋</div><div className="empty-t">No channels loaded</div><div className="empty-s">Connect via Xtream Codes or M3U to populate TV Guide.</div></div>
      ) : !epgData ? (
        <div className="empty">
          <div className="empty-icon">📅</div>
          <div className="empty-t">No EPG data</div>
          <div className="empty-s">Paste your XMLTV EPG URL above and click Load EPG.<br/>Your provider may supply one — check their portal or dashboard.</div>
        </div>
      ) : (
        <div className="epg-outer">
          <div className="epg-table">
            <div className="epg-head-row">
              <div className="epg-ch-col" style={{height:"32px"}} />
              {slots.map(s => <div key={s.label} className="epg-time-slot">{s.label}</div>)}
            </div>
            {filteredChannels.map((ch,i) => {
              const epgCh = epgLookup(epgData, ch);
              const now = Date.now();
              return (
                <div key={ch.id||i} className="epg-row">
                  <div className="epg-ch-cell" onClick={()=>onPlay(ch)} style={{cursor:"pointer"}}>
                    {ch.logo && <img className="epg-ch-logo" src={ch.logo} alt="" onError={e=>e.target.style.display="none"} />}
                    <span className="epg-ch-name" title={ch.name}>{ch.name}</span>
                  </div>
                  {slots.map((s, j) => {
                    const prog = epgCh?.find(p => p.start < s.endMs && p.stop > s.startMs);
                    const isNow = s.startMs <= now && s.endMs > now;
                    return (
                      <div key={j} className={`epg-prog ${isNow?"now":""}`} onClick={()=>onPlay(ch)}
                        title={prog ? `${prog.title}\n${new Date(prog.start).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})} – ${new Date(prog.stop).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}` : ""}>
                        <div className="epg-prog-t">{prog?.title || <span style={{opacity:.35}}>—</span>}</div>
                        <div className="epg-prog-s">{s.label}</div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function DirectHLSView() {
  const [url, setUrl] = useState("");
  const [playing, setPlaying] = useState(null);
  const EXAMPLES = [
    ["Apple HLS Bipbop (Adaptive)", "https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8"],
    ["Big Buck Bunny (MP4)", "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"],
    ["Elephant Dream (MP4)", "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4"],
  ];
  return (
    <div className="hls-body">
      <div style={{fontSize:".84rem",color:"var(--t2)",lineHeight:1.6}}>
        Enter any HLS (.m3u8), DASH, or direct media URL. Great for testing your own streams.
      </div>
      <div className="hls-row">
        <input className="fi" placeholder="https://your-stream.com/live/stream.m3u8"
          value={url} onChange={e=>setUrl(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&url&&setPlaying({name:url.split("/").pop()||"Stream",url,type:"live",group:"Direct"})} />
        <button className="btn-go" onClick={()=>url&&setPlaying({name:url.split("/").pop()||"Stream",url,type:"live",group:"Direct"})}>▶ Play</button>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:".35rem"}}>
        <div style={{fontSize:".7rem",color:"var(--t3)",textTransform:"uppercase",letterSpacing:".08em",fontWeight:600}}>Public test streams</div>
        {EXAMPLES.map(([label,href]) => (
          <div key={label} style={{fontSize:".75rem",color:"var(--accent)",cursor:"pointer",textDecoration:"underline"}}
            onClick={()=>{setUrl(href);setPlaying({name:label,url:href,type:"live",group:"Test"});}}>
            {label}
          </div>
        ))}
      </div>
      {playing && <Player item={playing} onClose={()=>setPlaying(null)} />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// DISCOVER (TMDB)
// ══════════════════════════════════════════════════════════════════
const TMDB_IMG = "https://image.tmdb.org/t/p/";

function normalizeTitle(s) {
  return (s || "").toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
}

function DiscoverView({ tmdbKey, setTmdbKey, vod, series, onPlay }) {
  const [keyInput, setKeyInput]           = useState(tmdbKey);
  const [trending, setTrending]           = useState([]);
  const [popularMovies, setPopularMovies] = useState([]);
  const [popularTV, setPopularTV]         = useState([]);
  const [loading, setLoading]             = useState(false);
  const [err, setErr]                     = useState("");
  const [picker, setPicker]               = useState(null); // { tmdbItem, matches[] }

  useEffect(() => { if (tmdbKey) loadAll(tmdbKey); }, [tmdbKey]);

  async function loadAll(key) {
    setLoading(true); setErr("");
    try {
      const base = "https://api.themoviedb.org/3";
      const [t, pm, ptv] = await Promise.all([
        fetch(`${base}/trending/all/week?api_key=${key}&language=en-US`).then(r => r.json()),
        fetch(`${base}/movie/popular?api_key=${key}&language=en-US`).then(r => r.json()),
        fetch(`${base}/tv/popular?api_key=${key}&language=en-US`).then(r => r.json()),
      ]);
      if (t.success === false) throw new Error(t.status_message || "Invalid API key");
      setTrending(t.results || []);
      setPopularMovies(pm.results || []);
      setPopularTV(ptv.results || []);
    } catch(e) {
      setErr(e.message);
      localStorage.removeItem("sv-tmdb-key");
      setTmdbKey("");
    } finally { setLoading(false); }
  }

  function saveKey() {
    const k = keyInput.trim();
    if (!k) return;
    localStorage.setItem("sv-tmdb-key", k);
    setTmdbKey(k);
  }

  // Return ALL library items that match the TMDB title
  const findAllInLibrary = useCallback((tmdbItem) => {
    const title = normalizeTitle(tmdbItem.title || tmdbItem.name);
    if (!title || title.length < 2) return [];
    return [...vod, ...series].filter(item => {
      const n = normalizeTitle(item.name);
      if (!n) return false;
      if (n === title) return true;
      // partial match only if both names are long enough to avoid false positives
      const minLen = Math.min(n.length, title.length);
      if (minLen >= 6 && (n.includes(title) || title.includes(n))) return true;
      return false;
    });
  }, [vod, series]);

  function handleCardClick(tmdbItem) {
    const matches = findAllInLibrary(tmdbItem);
    if (matches.length === 1) {
      onPlay(matches[0]);
    } else {
      // 0 matches → show "not found"; 2+ matches → show picker
      setPicker({ tmdbItem, matches });
    }
  }

  if (!tmdbKey) {
    return (
      <div className="disc-key-prompt">
        <div style={{fontSize:"2.5rem"}}>✨</div>
        <div style={{fontSize:"1rem",fontWeight:600}}>Discover Trending Content</div>
        <div style={{fontSize:".82rem",color:"var(--t2)",maxWidth:"360px",lineHeight:1.6}}>
          See what's trending on TMDB and find matches in your library.{" "}
          <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener noreferrer"
            style={{color:"var(--accent)"}}>Get a free API key →</a>
        </div>
        {err && <div className="err" style={{maxWidth:"360px"}}>{err}</div>}
        <div style={{display:"flex",gap:".5rem",width:"100%",maxWidth:"380px"}}>
          <input className="fi" placeholder="Paste TMDB v3 API key…" value={keyInput}
            onChange={e=>setKeyInput(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&saveKey()} />
          <button className="btn-go" style={{padding:".62rem .9rem",fontSize:".84rem"}} onClick={saveKey}>Go</button>
        </div>
      </div>
    );
  }

  if (loading) return <div className="loading"><div className="spinner" /><span>Loading trending…</span></div>;

  const hero = trending[0];

  function renderTMDBCard(item, i) {
    const matches = findAllInLibrary(item);
    const inLib   = matches.length > 0;
    const poster  = item.poster_path ? `${TMDB_IMG}w185${item.poster_path}` : null;
    const year    = (item.release_date || item.first_air_date || "").slice(0, 4);
    const rating  = item.vote_average ? item.vote_average.toFixed(1) : null;
    const title   = item.title || item.name || "Unknown";
    return (
      <div key={item.id || i} className="disc-card" onClick={() => handleCardClick(item)} title={title}>
        {poster
          ? <img className="disc-poster" src={poster} alt={title} />
          : <div className="disc-poster-ph">{item.media_type === "tv" ? "📺" : "🎬"}</div>}
        {rating && <div className="disc-rating">★{rating}</div>}
        {inLib && <div className="disc-in-lib" title={`${matches.length} match${matches.length>1?"es":""} in library`}>
          {matches.length > 1 ? matches.length : "▶"}
        </div>}
        <div className="disc-card-title">{title}</div>
        <div className="disc-card-meta">{[year, item.media_type === "tv" ? "TV" : "Film"].filter(Boolean).join(" · ")}</div>
      </div>
    );
  }

  return (
    <div className="discover-body">
      {/* Hero */}
      {hero && (() => {
        const heroMatches = findAllInLibrary(hero);
        return (
          <div className="disc-hero" onClick={() => handleCardClick(hero)}>
            {hero.backdrop_path && (
              <img className="disc-hero-bg" src={`${TMDB_IMG}w1280${hero.backdrop_path}`} alt="" />
            )}
            <div className="disc-hero-info">
              <div className="disc-hero-title">{hero.title || hero.name}</div>
              <div className="disc-hero-meta">
                {[(hero.release_date||hero.first_air_date||"").slice(0,4),
                  hero.vote_average && `★ ${hero.vote_average.toFixed(1)}`,
                  hero.media_type === "tv" ? "TV Series" : "Movie"
                ].filter(Boolean).join(" · ")}
              </div>
              {hero.overview && <div className="disc-hero-overview">{hero.overview}</div>}
              {heroMatches.length > 0 && (
                <div className="disc-hero-avail">
                  {heroMatches.length === 1 ? "▶ In your library — click to play" : `▶ ${heroMatches.length} matches in your library — click to choose`}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Trending This Week */}
      <div className="disc-section">
        <div className="section-label">Trending This Week</div>
        <div className="disc-row">
          {trending.map((item, i) => renderTMDBCard(item, i))}
        </div>
      </div>

      {/* Popular Movies */}
      <div className="disc-section">
        <div className="section-label">Popular Movies</div>
        <div className="disc-row">
          {popularMovies.map((item, i) => renderTMDBCard({...item, media_type:"movie"}, i))}
        </div>
      </div>

      {/* Popular TV */}
      <div className="disc-section">
        <div className="section-label">Popular TV Shows</div>
        <div className="disc-row">
          {popularTV.map((item, i) => renderTMDBCard({...item, media_type:"tv"}, i))}
        </div>
      </div>

      <div style={{display:"flex",justifyContent:"flex-end",paddingTop:".4rem"}}>
        <button className="btn-sm" style={{width:"auto"}}
          onClick={() => { localStorage.removeItem("sv-tmdb-key"); setTmdbKey(""); setKeyInput(""); }}>
          Change API Key
        </button>
      </div>

      {/* Picker / Not-found modal */}
      {picker && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.82)",zIndex:600,
          display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(8px)"}}
          onClick={() => setPicker(null)}>
          <div style={{background:"var(--s1)",border:"1px solid var(--b2)",borderRadius:"14px",
            padding:"1.5rem",width:"100%",maxWidth:"420px",maxHeight:"72vh",overflow:"auto"}}
            onClick={e => e.stopPropagation()}>

            {/* TMDB title + meta */}
            <div style={{display:"flex",gap:"1rem",marginBottom:"1.2rem",alignItems:"flex-start"}}>
              {picker.tmdbItem.poster_path && (
                <img src={`${TMDB_IMG}w92${picker.tmdbItem.poster_path}`}
                  style={{width:54,borderRadius:7,flexShrink:0,border:"1px solid var(--b2)"}} alt="" />
              )}
              <div>
                <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:"1.15rem",lineHeight:1.2}}>
                  {picker.tmdbItem.title || picker.tmdbItem.name}
                </div>
                <div style={{fontSize:".72rem",color:"var(--t2)",marginTop:".25rem"}}>
                  {[(picker.tmdbItem.release_date||picker.tmdbItem.first_air_date||"").slice(0,4),
                    picker.tmdbItem.media_type==="tv" ? "TV Series" : "Movie"
                  ].filter(Boolean).join(" · ")}
                </div>
              </div>
            </div>

            {picker.matches.length === 0 ? (
              <div style={{textAlign:"center",padding:"1.4rem 0"}}>
                <div style={{fontSize:"2rem",marginBottom:".5rem"}}>🔍</div>
                <div style={{fontSize:".9rem",fontWeight:600}}>Not in your library</div>
                <div style={{fontSize:".78rem",color:"var(--t2)",marginTop:".4rem",lineHeight:1.55}}>
                  Load your Movies or Series first — connect via Xtream, M3U, or Stalker, then switch to the Movies/Series tab.
                </div>
              </div>
            ) : (
              <>
                <div style={{fontSize:".68rem",color:"var(--t3)",textTransform:"uppercase",
                  letterSpacing:".1em",fontWeight:700,marginBottom:".6rem"}}>
                  {picker.matches.length} match{picker.matches.length > 1 ? "es" : ""} in your library
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:".4rem"}}>
                  {picker.matches.map((item, i) => (
                    <div key={item.id || i}
                      style={{display:"flex",alignItems:"center",gap:".75rem",padding:".6rem .8rem",
                        background:"var(--s2)",border:"1px solid var(--b2)",borderRadius:"9px",
                        cursor:"pointer",transition:"border-color .15s"}}
                      onClick={() => { onPlay(item); setPicker(null); }}
                      onMouseEnter={e => e.currentTarget.style.borderColor="var(--accent)"}
                      onMouseLeave={e => e.currentTarget.style.borderColor="var(--b2)"}>
                      {item.logo
                        ? <img src={item.logo} style={{width:38,height:38,objectFit:"contain",
                            borderRadius:5,background:"var(--s3)",flexShrink:0}} alt="" />
                        : <div style={{width:38,height:38,background:"var(--s3)",borderRadius:5,
                            display:"flex",alignItems:"center",justifyContent:"center",
                            flexShrink:0,fontSize:".9rem"}}>
                            {item.type === "series" ? "📽" : "🎬"}
                          </div>}
                      <div style={{flex:1,overflow:"hidden"}}>
                        <div style={{fontSize:".82rem",fontWeight:500,overflow:"hidden",
                          textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.name}</div>
                        <div style={{fontSize:".65rem",color:"var(--t3)",marginTop:".15rem"}}>
                          {item.group}{item.year ? ` · ${item.year}` : ""}
                        </div>
                      </div>
                      <div style={{fontSize:".8rem",color:"var(--accent)",flexShrink:0}}>▶</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div style={{marginTop:"1.1rem",textAlign:"right"}}>
              <button className="btn-cancel" onClick={() => setPicker(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
