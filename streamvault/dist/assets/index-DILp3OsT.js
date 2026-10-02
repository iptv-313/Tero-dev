import{n as e,r as t,t as n}from"./react-EV4rRv3L.js";(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),t.credentials=e.crossOrigin===`use-credentials`?`include`:e.crossOrigin===`anonymous`?`omit`:`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var r=e(),i=t(),a=n(),o=`http://localhost:3001`,s=o;async function c(e,t={}){let n=new Headers(t.headers||{});return n.set(`X-Auth-Code`,localStorage.getItem(`sv-auth-code`)||``),fetch(`${o}${e}`,{...t,headers:n})}var l={Dark:{bg:`#f4f2eb`,s1:`#fffdf7`,s2:`#eeece3`,s3:`#e4e1d7`,accent:`#ef5a43`,accent2:`#345b9b`,t1:`#202722`,t2:`#59635b`,t3:`#858c82`}},u=Object.keys(l),d=[`#ef5a43`];function f(){let e=localStorage.getItem(`sv-guest-id`);return e||(e=crypto.randomUUID?.()||Math.random().toString(36).slice(2)+Date.now().toString(36),localStorage.setItem(`sv-guest-id`,e)),e}var p=f(),m={async get(e,t=null){try{if(window.storage){let n=await window.storage.get(e);return n?JSON.parse(n.value):t}let n=localStorage.getItem(e);return n===null?t:JSON.parse(n)}catch{return t}},async set(e,t){try{window.storage?await window.storage.set(e,JSON.stringify(t)):localStorage.setItem(e,JSON.stringify(t))}catch{}}},h=(()=>{let e;function t(){return e||(e=new Promise(e=>{let t=indexedDB.open(`sv-stalker-cache`,1);t.onupgradeneeded=()=>t.result.createObjectStore(`c`),t.onsuccess=()=>e(t.result),t.onerror=()=>e(null)}),e)}return{async get(e){let n=await t();return n?new Promise(t=>{let r=n.transaction(`c`,`readonly`).objectStore(`c`).get(e);r.onsuccess=()=>t(r.result??null),r.onerror=()=>t(null)}):null},async set(e,n){let r=await t();if(r)return new Promise(t=>{let i=r.transaction(`c`,`readwrite`);i.objectStore(`c`).put(n,e),i.oncomplete=()=>t(),i.onerror=()=>t()})}}})();function g(e){return e?e.type===`stalker`?`stalker:${e.server}:${e.mac}`:e.type===`xtream`?`xtream:${e.server}:${e.user}`:e.type===`m3u`?`m3u:${e.url}`:`hls`:null}function _(e,t={}){let{method:n=`GET`,body:r}=t,i={"X-Guest-Id":p};return r&&(i[`Content-Type`]=`application/json`),fetch(`${s}/api/catalog/${e}`,{method:n,headers:i,body:r?JSON.stringify(r):void 0}).then(e=>e.json()).catch(()=>null)}function v(e,t,n){_(`content`,{method:`PUT`,body:{connectionId:e,type:t,items:n.map(e=>({id:e.id,name:e.name,logo:e.logo,group:e.group,url:e.url,num:e.num,epgId:e.epgId,year:e.year,rating:e.rating,stalkerCmd:e._stalkerCmd||e.stalkerCmd}))}})}function y(e,t,n){_(`categories`,{method:`PUT`,body:{connectionId:e,section:t,categories:n}})}function b(e,t,n){let{channels:r,...i}=n;_(`connections`,{method:`PUT`,body:{id:e,type:t,config:i}})}function x(e,t){_(`favorites`,{method:`PUT`,body:{profileId:e,favorites:t}})}function S(e){_(`history`,{method:`PUT`,body:{history:e}})}function C(e){_(`preferences`,{method:`PUT`,body:{preferences:e}})}async function w(){try{if(await h.get(`sv-migrated-v2`))return;for(let e=0;e<localStorage.length;e++){let t=localStorage.key(e);if(t?.startsWith(`sv-s-`)&&t.includes(`cats-`))try{let{cats:e}=JSON.parse(localStorage.getItem(t));if(e){let n=t.match(/^sv-s-(vod|series)cats-(.+)$/);n&&await h.set(`cats-ls:${n[2]}:${n[1]}`,e)}}catch{}}for(let e=0;e<localStorage.length;e++){let t=localStorage.key(e);if(t?.startsWith(`sv-stalker-channels-`))try{let e=JSON.parse(localStorage.getItem(t));if(e){let n=t.replace(`sv-stalker-channels-`,``);await h.set(`channels-ls:${n}`,e)}}catch{}}await h.set(`sv-migrated-v2`,!0)}catch{}}w();function T(e){let t=new DOMParser().parseFromString(e,`text/xml`),n={};return t.querySelectorAll(`programme`).forEach(e=>{let t=e.getAttribute(`channel`)?.toLowerCase().trim();if(!t)return;let r=E(e.getAttribute(`start`)),i=E(e.getAttribute(`stop`));n[t]||(n[t]=[]),n[t].push({title:e.querySelector(`title`)?.textContent||``,start:r,stop:i})}),n}function E(e){if(!e)return 0;let t=e.match(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);return t?new Date(`${t[1]}-${t[2]}-${t[3]}T${t[4]}:${t[5]}:${t[6]}Z`).getTime():0}function D(e,t){if(!e||!t)return null;let n=e[t.toLowerCase().trim()]||e[t]||[],r=Date.now();return n.find(e=>e.start<=r&&e.stop>r)||null}function ee(e,t){if(!e)return null;let n=t.epgId?.toLowerCase().trim();return n&&e[n]||t.epgId&&e[t.epgId]||t.id&&e[t.id]||null}function O(e){if(!e)return`0:00`;let t=Math.floor(e/3600),n=Math.floor(e%3600/60),r=Math.floor(e%60);return t>0?`${t}:${String(n).padStart(2,`0`)}:${String(r).padStart(2,`0`)}`:`${n}:${String(r).padStart(2,`0`)}`}async function k(e){let t=`/proxy?url=${encodeURIComponent(e)}`,n=await fetch(`${s}${t}`).catch(()=>null);return n?.ok||(n=await fetch(`${o}${t}`)),n}function te(e,t,n){let r=`${e}/player_api.php?username=${t}&password=${n}`;return{auth:()=>k(r).then(e=>e.json()),getLiveCategories:()=>k(`${r}&action=get_live_categories`).then(e=>e.json()),getLive:()=>k(`${r}&action=get_live_streams`).then(e=>e.json()),liveURL:r=>`${e}/live/${t}/${n}/${r}.ts`}}function A(e){if(e._stalkerCmd!==void 0)return e;let t=(e.url||``).replace(/^ffmpeg\s+/,``).trim(),n=t.startsWith(`http`)&&!t.includes(`localhost`);return{...e,_stalkerCmd:e.url,url:n?t:null}}function j(e){let t=e.bg===`#ffffff`||e.bg===`#f8f9fc`,n=t?`rgba(0,0,0,0.06)`:`rgba(255,255,255,0.04)`,r=t?`rgba(0,0,0,0.1)`:`rgba(255,255,255,0.08)`;return`
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Rajdhani:wght@600;700&family=Space+Grotesk:wght@500;600;700&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

:root{
  --bg:${e.bg};--s1:${e.s1};--s2:${e.s2};--s3:${e.s3};
  --b1:${n};--b2:${r};
  --accent:${e.accent};--accent2:${e.accent2};
  --glow:${e.accent}22;
  --t1:${e.t1};--t2:${e.t2};--t3:${e.t3};
  --danger:#ff3b5c;--ok:#00e699;
  --shadow:${t?`rgba(0,0,0,0.04)`:`rgba(0,0,0,0.4)`};
  --hover-bg:${t?`rgba(0,0,0,0.03)`:`rgba(255,255,255,0.02)`};
  --radius-lg: 16px;--radius-md: 10px;--radius-sm: 6px;
}

body{background:var(--bg);font-family:'Plus Jakarta Sans',sans-serif;color:var(--t1);overflow:hidden;overflow-y:auto;-webkit-font-smoothing:antialiased}
.app{display:flex;height:100vh;overflow:hidden;background:var(--bg)}

/* SETUP */
.setup{min-height:100vh;display:flex;align-items:center;justify-content:center;
  background:radial-gradient(circle at 10% 20%,${e.accent2}15 0%,transparent 45%),
             radial-gradient(circle at 90% 80%,${e.accent}12 0%,transparent 45%),var(--bg);padding:2rem}
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
  font-weight:700;letter-spacing:.04em;cursor:pointer;transition:all .2s ease;margin-top:.8rem;box-shadow:0 4px 15px ${e.accent}30}
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
.nav.on{color:var(--accent);background:linear-gradient(90deg, ${e.accent}10, transparent);border-left-color:var(--accent);font-weight:600}
.nav-icon{font-size:.95rem;width:20px;text-align:center;flex-shrink:0;opacity:0.85}
.nav.on .nav-icon{opacity:1}
.nav-badge{margin-left:auto;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;font-size:.58rem;font-weight:700;
  padding:.15rem .45rem;border-radius:20px;box-shadow:0 2px 6px ${e.accent2}30}

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
.c-btn.active{color:var(--accent);border-color:${e.accent}40;background:${e.accent}12;font-weight:600}
.c-body{flex:1;overflow:hidden;padding:1.2rem 1.6rem;display:flex;gap:1.4rem;min-height:0}

/* CATEGORIES */
.cats{width:auto;flex-shrink:0;overflow-y:auto;overflow-x:hidden;height:0;min-height:100%}
.cat{padding:.48rem .75rem;border-radius:var(--radius-md);font-size:.78rem;font-weight:500;color:var(--t2);cursor:pointer;
  transition:all .15s ease;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  display:flex;align-items:center;gap:.5rem}
.cat:hover{background:var(--s2);color:var(--t1)}
.cat.on{background:${e.accent}12;color:var(--accent);font-weight:600}
.cat-hidden{opacity:.35}

/* CARDS */
.ch-grid{flex:1;display:grid;grid-template-columns:repeat(auto-fill,minmax(155px,1fr));gap:.75rem;align-content:start}
.ch-card{background:var(--s1);border:1px solid var(--b1);border-radius:var(--radius-lg);padding:1rem .8rem;
  cursor:pointer;transition:all .25s cubic-bezier(0.4, 0, 0.2, 1);display:flex;flex-direction:column;align-items:center;gap:.6rem;text-align:center;position:relative}
.ch-card:hover{border-color:var(--b2);background:var(--s2);transform:translateY(-3px);box-shadow:0 12px 24px var(--shadow)}
.ch-card.playing{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent),0 12px 24px var(--glow);background:linear-gradient(180deg, var(--s1), ${e.accent}05)}
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
.badge{display:inline-block;padding:.15rem .4rem;background:${e.accent}15;border:1px solid ${e.accent}25;
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
.osd-num{font-size:.68rem;color:var(--accent);font-weight:700;background:${e.accent}25;padding:1px 5px;border-radius:4px}

/* QUICK CH */
.qch{position:absolute;left:1.5rem;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;gap:.35rem;animation:fadeIn .25s ease;pointer-events:none}
.qch-item{background:rgba(0,0,0,.8);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.08);border-radius:10px;
  padding:.55rem .85rem;display:flex;align-items:center;gap:.6rem;min-width:180px;transition:all .2s ease}
.qch-item.active{background:linear-gradient(90deg, ${e.accent}25, transparent);border-color:var(--accent);box-shadow:0 0 15px var(--glow)}
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
.epg-prog.now{background:${e.accent}08;border-top:2px solid var(--accent)}
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
  font-family:'Rajdhani',sans-serif;font-weight:700;font-size:1rem;cursor:pointer;transition:all .2s;white-space:nowrap;box-shadow:0 4px 12px ${e.accent}20}
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
.series-ep-num{width:30px;height:30px;border-radius:50%;background:${e.accent}15;color:var(--accent);font-size:.75rem;font-weight:700;
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
`}function ne({item:e,channelList:t,epgData:n,onClose:r,onFav:s,isFav:c,connType:l}){let u=(0,i.useRef)(null),d=(0,i.useRef)(null),f=(0,i.useRef)(null),p=(0,i.useRef)(null),[m,h]=(0,i.useState)(!0),[g,_]=(0,i.useState)(!1),v=(0,i.useRef)(null),[y,b]=(0,i.useState)(()=>t?t.findIndex(t=>t.id===e.id||t.url===e.url):-1),[x,S]=(0,i.useState)(e),C=(0,i.useCallback)(()=>{h(!0),clearTimeout(p.current),p.current=setTimeout(()=>h(!1),3500)},[]);function w(){d.current&&=(d.current.destroy(),null),f.current&&=(f.current.destroy(),null)}let[T,E]=(0,i.useState)(null),ee=location.protocol===`https:`?e=>e?.startsWith(`http://`):()=>!1,O=e=>ee(e)||(l===`m3u`||l===`xtream`)&&e&&!e.startsWith(o),k=async e=>{if(e?.startsWith(o))return e;let t=await fetch(`${o}/stream-ticket`,{method:`POST`,headers:{"Content-Type":`application/json`,"X-Auth-Code":localStorage.getItem(`sv-auth-code`)||``},body:JSON.stringify({url:e})}),n=await t.json();if(!t.ok||!n.url)throw Error(n.error||`Could not create a stream ticket`);return`${o.replace(/\/+$/,``)}${n.url}`};async function te(e){let t=u.current;if(!t||!e)return;E(null),w(),t.removeAttribute(`src`),t.onerror=()=>{if(d.current||f.current)return;let e=t.error;E({icon:`⚠️`,title:`Playback Error`,body:{1:`Playback aborted`,2:`Network error — could not load stream`,3:`Decode error — stream format not supported`,4:`Source not supported — the stream format or URL is invalid`}[e?.code]||`Unknown video error`})};async function n(e){if(window.Hls?.isSupported()){let n={enableWorker:!1,fragLoadingMaxRetry:2};if(O(e))try{e=await k(e)}catch(e){E({icon:`⚠️`,title:`Relay Error`,body:e.message});return}let r=new window.Hls(n);d.current=r,r.loadSource(e),r.attachMedia(t),r.on(window.Hls.Events.MANIFEST_PARSED,()=>t.play().catch(()=>{})),r.on(window.Hls.Events.ERROR,(e,t)=>{if(!t.fatal)return;let n=t.response?.code,r=`Playback Error`,i;n===404?(r=`Stream Not Found (404)`,i=`The stream URL returned 404. The channel may be offline, or its URL may have changed. Try reconnecting to refresh the channel list.`):n===403?(r=`Access Denied (403)`,i=`The stream server rejected the request. Your credentials may not have access to this channel.`):n>=500?(r=`Server Error (${n})`,i=`The stream server returned an error. It may be overloaded or temporarily down.`):t.type===window.Hls.ErrorTypes.NETWORK_ERROR?(r=`Network Error`,i=`Could not reach the stream server. Check your connection or try again.`):i=`HLS error: ${t.details}${n?` (HTTP ${n})`:``}`,E({icon:`⚠️`,title:r,body:i}),w()})}else if(t.canPlayType(`application/vnd.apple.mpegurl`))try{t.src=O(e)?await k(e):e,t.play().catch(()=>{})}catch(e){E({icon:`⚠️`,title:`Relay Error`,body:e.message})}}async function r(e){if(O(e))try{e=await k(e)}catch(e){E({icon:`⚠️`,title:`Relay Error`,body:e.message});return}if(!window.mpegts?.isSupported()){t.src=e,t.play().catch(()=>{});return}let n=window.mpegts.createPlayer({type:`mpegts`,isLive:!0,url:e},{enableWorker:!1,lazyLoadMaxDuration:180,seekType:`range`});f.current=n,n.on(window.mpegts.Events.ERROR,(e,t,n)=>{let r=n?.code,i=`Playback Error`,a;r===404?(i=`Stream Not Found (404)`,a=`The stream URL returned 404. The channel may be offline or the URL has changed.`):r===403?(i=`Access Denied (403)`,a=`The stream server rejected the request. Your credentials may not have access.`):r>=400&&r<500?(i=`Client Error (${r})`,a=`The stream request was rejected with HTTP ${r}.`):r>=500?(i=`Server Error (${r})`,a=`The stream server returned an error. It may be overloaded or temporarily down.`):e===`NetworkError`?(i=`Network Error`,a=`Could not load the stream. ${n?.msg||`Check your connection or try again.`}`):a=`${e}: ${t||`Unknown error`}${r?` (HTTP ${r})`:``}`,E({icon:`⚠️`,title:i,body:a}),w()}),n.attachMediaElement(t),n.load(),n.play().catch(()=>{})}function i(e,t){if(document.querySelector(`script[src="${e}"]`)){t();return}let n=document.createElement(`script`);n.src=e,n.onload=t,document.head.appendChild(n)}let a=e.split(/[?#]/)[0].split(`.`).pop()?.toLowerCase();if([`mp4`,`mkv`,`avi`,`mov`,`webm`,`mp3`,`aac`].includes(a)){try{t.src=O(e)?await k(e):e,t.play().catch(()=>{})}catch(e){E({icon:`⚠️`,title:`Relay Error`,body:e.message})}return}if((x.type===`vod`||x.type===`series`)&&(e.includes(`/play/movie.php`)||e.includes(`/play/live.php`)||e.includes(`play_token=`))){if(e.includes(`.m3u8`))window.Hls?n(e):i(`https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.4.12/hls.min.js`,()=>{n(e)});else try{t.src=O(e)?await k(e):e,t.play().catch(()=>{})}catch(e){E({icon:`⚠️`,title:`Relay Error`,body:e.message})}return}let o=e.includes(`extension=ts`)||/\.ts(\?|$)/.test(e)||x.type===`live`&&!e.includes(`.m3u8`),s=!o&&(e.includes(`.m3u8`)||e.includes(`/live/`)||e.includes(`/movie/`));if(o&&O(e)){let t;try{t=await k(e)}catch(e){E({icon:`⚠️`,title:`Relay Error`,body:e.message});return}window.mpegts?r(t):i(`https://cdn.jsdelivr.net/npm/mpegts.js@1.7.3/dist/mpegts.min.js`,()=>{r(t)});return}if(o)window.mpegts?r(e):i(`https://cdn.jsdelivr.net/npm/mpegts.js@1.7.3/dist/mpegts.min.js`,()=>r(e));else if(s)window.Hls?n(e):i(`https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.4.12/hls.min.js`,()=>n(e));else try{t.src=O(e)?await k(e):e,t.play().catch(()=>{})}catch(e){E({icon:`⚠️`,title:`Relay Error`,body:e.message})}}(0,i.useEffect)(()=>(te(x.url),C(),()=>{w(),clearTimeout(p.current),clearTimeout(v.current)}),[x.url]),(0,i.useEffect)(()=>{function e(e){let t=u.current;if(t&&e.target.tagName!==`INPUT`)switch(e.key){case` `:case`k`:e.preventDefault(),t.paused?t.play():t.pause(),C();break;case`f`:case`F`:document.fullscreenElement?document.exitFullscreen():t.requestFullscreen?.();break;case`m`:case`M`:t.muted=!t.muted,C();break;case`ArrowLeft`:e.preventDefault(),x.type===`live`?A():(t.currentTime=Math.max(0,t.currentTime-10),C());break;case`ArrowRight`:e.preventDefault(),x.type===`live`?j():(t.currentTime=Math.min(t.duration||0,t.currentTime+10),C());break;case`ArrowUp`:e.preventDefault(),x.type===`live`?A():(t.volume=Math.min(1,t.volume+.1),C());break;case`ArrowDown`:e.preventDefault(),x.type===`live`?j():(t.volume=Math.max(0,t.volume-.1),C());break;case`Escape`:r();break;case`p`:case`P`:ne()}}return window.addEventListener(`keydown`,e),()=>window.removeEventListener(`keydown`,e)},[x,y]);function A(){if(!t||t.length===0)return;let e=Math.max(0,(y<0?0:y)-1);b(e),S(t[e]),_(!0),clearTimeout(v.current),v.current=setTimeout(()=>_(!1),2500),C()}function j(){if(!t||t.length===0)return;let e=t.length-1,n=Math.min(e,(y<0?0:y)+1);b(n),S(t[n]),_(!0),clearTimeout(v.current),v.current=setTimeout(()=>_(!1),2500),C()}async function ne(){let e=u.current;if(e)try{document.pictureInPictureElement?await document.exitPictureInPicture():await e.requestPictureInPicture?.()}catch{}}let M=D(n,x.epgId),re=t&&y>=0?t.slice(Math.max(0,y-2),Math.min(t.length,y+3)):[];return(0,a.jsx)(`div`,{className:`player-ov`,onClick:e=>e.target===e.currentTarget&&r(),children:(0,a.jsxs)(`div`,{className:`player-wrap`,children:[(0,a.jsxs)(`div`,{style:{position:`relative`},children:[(0,a.jsx)(`video`,{ref:u,className:`player-video`,controls:!0,playsInline:!0}),T&&(0,a.jsx)(`div`,{style:{position:`absolute`,inset:0,display:`flex`,alignItems:`center`,justifyContent:`center`,background:`rgba(0,0,0,.88)`,padding:`2rem`,textAlign:`center`},children:(0,a.jsxs)(`div`,{style:{maxWidth:`400px`},children:[(0,a.jsx)(`div`,{style:{fontSize:`2.2rem`,marginBottom:`.75rem`},children:T.icon}),(0,a.jsx)(`div`,{style:{fontSize:`.9rem`,color:`var(--t1)`,fontWeight:600,marginBottom:`.5rem`},children:T.title}),(0,a.jsx)(`div`,{style:{fontSize:`.78rem`,color:`var(--t2)`,lineHeight:1.6},children:T.body})]})}),m&&(0,a.jsxs)(`div`,{className:`osd`,onClick:C,children:[x.logo?(0,a.jsx)(`img`,{className:`osd-logo`,src:x.logo,alt:``,onError:e=>e.target.style.display=`none`}):(0,a.jsx)(`div`,{className:`osd-logo-ph`,children:x.type===`live`?`📺`:`🎬`}),(0,a.jsxs)(`div`,{children:[x.num&&(0,a.jsxs)(`div`,{className:`osd-num`,children:[`CH `,x.num]}),(0,a.jsx)(`div`,{className:`osd-name`,children:x.name}),M&&(0,a.jsxs)(`div`,{className:`osd-epg`,children:[`▶ `,M.title]})]})]}),g&&t&&(0,a.jsx)(`div`,{className:`qch`,children:re.map((e,t)=>{let n=e.id===x.id||e.url===x.url;return(0,a.jsxs)(`div`,{className:`qch-item ${n?`active`:``}`,children:[e.logo?(0,a.jsx)(`img`,{className:`qch-thumb`,src:e.logo,alt:``,onError:e=>e.target.style.display=`none`}):(0,a.jsx)(`div`,{className:`qch-thumb-ph`,children:`📺`}),(0,a.jsx)(`div`,{className:`qch-n`,children:e.name}),e.num&&(0,a.jsx)(`div`,{className:`qch-num`,children:e.num})]},e.id||t)})})]}),(0,a.jsxs)(`div`,{className:`player-bar`,children:[(0,a.jsxs)(`div`,{style:{flex:1,overflow:`hidden`},children:[(0,a.jsxs)(`div`,{className:`player-title`,children:[x.name,x.group&&(0,a.jsx)(`span`,{className:`badge`,children:x.group})]}),M&&(0,a.jsxs)(`div`,{className:`player-epg`,children:[`▶ `,M.title]})]}),t&&x.type===`live`&&(0,a.jsxs)(a.Fragment,{children:[(0,a.jsx)(`button`,{className:`player-ctrl`,onClick:A,children:`◀ Prev`}),(0,a.jsx)(`button`,{className:`player-ctrl`,onClick:j,children:`Next ▶`})]}),(0,a.jsx)(`button`,{className:`player-ctrl`,onClick:ne,title:`Picture in Picture`,children:`⧉ PiP`}),(0,a.jsx)(`button`,{className:`player-close`,onClick:r,children:`✕ Close`})]}),(0,a.jsxs)(`div`,{className:`kbd-hint`,children:[(0,a.jsxs)(`span`,{children:[(0,a.jsx)(`span`,{className:`kbd`,children:`Space`}),`Play/Pause`]}),(0,a.jsxs)(`span`,{children:[(0,a.jsx)(`span`,{className:`kbd`,children:`F`}),`Fullscreen`]}),(0,a.jsxs)(`span`,{children:[(0,a.jsx)(`span`,{className:`kbd`,children:`M`}),`Mute`]}),(0,a.jsxs)(`span`,{children:[(0,a.jsx)(`span`,{className:`kbd`,children:`←→`}),x.type===`live`?`Channels`:`±10s`]}),(0,a.jsxs)(`span`,{children:[(0,a.jsx)(`span`,{className:`kbd`,children:`↑↓`}),x.type===`live`?`Channels`:`Volume`]}),(0,a.jsxs)(`span`,{children:[(0,a.jsx)(`span`,{className:`kbd`,children:`P`}),`PiP`]}),(0,a.jsxs)(`span`,{children:[(0,a.jsx)(`span`,{className:`kbd`,children:`Esc`}),`Close`]})]})]})})}function M({onLogin:e}){let[t,n]=(0,i.useState)(``),[r,s]=(0,i.useState)(!1),[c,l]=(0,i.useState)(``);async function u(n){if(n.preventDefault(),t){s(!0),l(``);try{let n=await(await fetch(`${o}/auth/verify`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({code:t})})).json();n.success?(localStorage.setItem(`sv-auth-code`,t),e(!!n.isAdmin)):l(`Invalid access code`)}catch{l(`Connection error`)}finally{s(!1)}}}return(0,a.jsx)(`div`,{className:`setup`,children:(0,a.jsxs)(`div`,{className:`card`,children:[(0,a.jsx)(`div`,{className:`logo`,children:`Tero Dev. To IPTV`}),(0,a.jsx)(`div`,{className:`tagline`,children:`Enter your access code to continue`}),c&&(0,a.jsxs)(`div`,{className:`err`,style:{background:`rgba(255,59,92,0.1)`,color:`#ff3b5c`,padding:`.8rem`,borderRadius:`8px`,fontSize:`.8rem`,marginBottom:`1rem`,border:`1px solid rgba(255,59,92,0.2)`},children:[`⚠ `,c]}),(0,a.jsxs)(`form`,{onSubmit:u,children:[(0,a.jsxs)(`div`,{className:`fg`,children:[(0,a.jsx)(`label`,{className:`fl`,children:`Access Code`}),(0,a.jsx)(`input`,{className:`fi`,type:`password`,placeholder:`••••••`,value:t,onChange:e=>n(e.target.value),autoFocus:!0})]}),(0,a.jsx)(`button`,{className:`btn-primary`,type:`submit`,disabled:r,children:r?`Verifying...`:`Login →`})]})]})})}function re({onClose:e}){let[t,n]=(0,i.useState)(`users`),[r,s]=(0,i.useState)([]),[c,l]=(0,i.useState)([]),[u,d]=(0,i.useState)({code:``,label:``,isAdmin:!1}),[f,p]=(0,i.useState)({name:``,url:``,mac:``,type:`stalker`}),m=localStorage.getItem(`sv-auth-code`);(0,i.useEffect)(()=>{h()},[t]);async function h(){try{let e=await(await fetch(`${o}/admin/${t}`,{headers:{"X-Auth-Code":m}})).json();t===`users`?s(e):l(e)}catch{}}async function g(){u.code&&(await fetch(`${o}/admin/users`,{method:`POST`,headers:{"Content-Type":`application/json`,"X-Auth-Code":m},body:JSON.stringify(u)}),d({code:``,label:``,isAdmin:!1}),h())}async function _(){f.name&&f.url&&(await fetch(`${o}/admin/portals`,{method:`POST`,headers:{"Content-Type":`application/json`,"X-Auth-Code":m},body:JSON.stringify(f)}),p({name:``,url:``,mac:``,type:`stalker`}),h())}async function v(e){await fetch(`${o}/admin/${t}/${e}`,{method:`DELETE`,headers:{"X-Auth-Code":m}}),h()}return(0,a.jsx)(`div`,{className:`setup`,style:{zIndex:1e3},children:(0,a.jsxs)(`div`,{className:`card`,style:{maxWidth:`600px`},children:[(0,a.jsxs)(`div`,{style:{display:`flex`,justifyContent:`space-between`,alignItems:`center`,marginBottom:`1.5rem`},children:[(0,a.jsx)(`div`,{className:`logo`,style:{fontSize:`1.5rem`,marginBottom:0},children:`Admin Panel`}),(0,a.jsx)(`button`,{className:`c-btn`,onClick:e,children:`Close`})]}),(0,a.jsxs)(`div`,{className:`tabs`,children:[(0,a.jsx)(`button`,{className:`tab ${t===`users`?`on`:``}`,onClick:()=>n(`users`),children:`Users`}),(0,a.jsx)(`button`,{className:`tab ${t===`portals`?`on`:``}`,onClick:()=>n(`portals`),children:`Portals`})]}),t===`users`?(0,a.jsxs)(`div`,{children:[(0,a.jsxs)(`div`,{className:`fg`,style:{display:`flex`,gap:`.5rem`},children:[(0,a.jsx)(`input`,{className:`fi`,placeholder:`Code`,value:u.code,onChange:e=>d({...u,code:e.target.value})}),(0,a.jsx)(`input`,{className:`fi`,placeholder:`Label`,value:u.label,onChange:e=>d({...u,label:e.target.value})}),(0,a.jsx)(`button`,{className:`btn-primary`,style:{width:`120px`},onClick:g,children:`Add`})]}),(0,a.jsx)(`div`,{style:{maxHeight:`300px`,overflowY:`auto`},children:r.map(e=>(0,a.jsxs)(`div`,{style:{display:`flex`,justifyContent:`space-between`,padding:`.8rem`,borderBottom:`1px solid var(--b2)`},children:[(0,a.jsxs)(`div`,{children:[(0,a.jsxs)(`div`,{style:{fontSize:`.9rem`},children:[e.label,` (`,e.code,`)`]}),(0,a.jsx)(`div`,{style:{fontSize:`.7rem`,color:`var(--t3)`},children:e.is_admin?`Admin`:`User`})]}),(0,a.jsx)(`button`,{className:`c-btn`,style:{color:`var(--danger)`},onClick:()=>v(e.id),children:`Delete`})]},e.id))})]}):(0,a.jsxs)(`div`,{children:[(0,a.jsxs)(`div`,{className:`fg`,children:[(0,a.jsx)(`input`,{className:`fi`,placeholder:`Portal Name`,style:{marginBottom:`.5rem`},value:f.name,onChange:e=>p({...f,name:e.target.value})}),(0,a.jsx)(`input`,{className:`fi`,placeholder:`URL (http://...)`,style:{marginBottom:`.5rem`},value:f.url,onChange:e=>p({...f,url:e.target.value})}),(0,a.jsx)(`input`,{className:`fi`,placeholder:`MAC (Optional)`,style:{marginBottom:`.5rem`},value:f.mac,onChange:e=>p({...f,mac:e.target.value})}),(0,a.jsx)(`button`,{className:`btn-primary`,onClick:_,children:`Add Portal`})]}),(0,a.jsx)(`div`,{style:{maxHeight:`300px`,overflowY:`auto`},children:c.map(e=>(0,a.jsxs)(`div`,{style:{display:`flex`,justifyContent:`space-between`,padding:`.8rem`,borderBottom:`1px solid var(--b2)`},children:[(0,a.jsxs)(`div`,{children:[(0,a.jsx)(`div`,{style:{fontSize:`.9rem`},children:e.name}),(0,a.jsx)(`div`,{style:{fontSize:`.7rem`,color:`var(--t3)`},children:e.url})]}),(0,a.jsx)(`button`,{className:`c-btn`,style:{color:`var(--danger)`},onClick:()=>v(e.id),children:`Delete`})]},e.id))})]})]})})}function ie({onConnect:e,connections:t=[],onReconnect:n,isAdmin:r}){let[s,l]=(0,i.useState)(`stalker`),[u,d]=(0,i.useState)({server:``,user:``,pass:``,mac:``,url:``,serial:``,deviceId:``,deviceId2:``}),[f,p]=(0,i.useState)([]),[m,h]=(0,i.useState)(!1),[g,_]=(0,i.useState)(``),[v,y]=(0,i.useState)([]),[b,x]=(0,i.useState)(!1),[S,C]=(0,i.useState)(``),w=(e,t)=>d(n=>({...n,[e]:t}));(0,i.useEffect)(()=>{fetch(`${o}/portals`,{headers:{"X-Auth-Code":localStorage.getItem(`sv-auth-code`)||``}}).then(e=>e.json()).then(p).catch(()=>{});try{let e=localStorage.getItem(`sv-connections`);if(e){let t=JSON.parse(e);if(!t?.length)return;let n=localStorage.getItem(`sv-activeConn`),r=n?JSON.parse(n):null,i=r&&t.find(e=>e.id===r)||t[t.length-1];if(i?.config){let e=i.config;e.type&&l(e.type),e.server&&w(`server`,e.server),e.user&&w(`user`,e.user),e.pass&&w(`pass`,e.pass),e.mac&&w(`mac`,e.mac),e.url&&w(`url`,e.url),e.serial&&w(`serial`,e.serial),e.deviceId&&w(`deviceId`,e.deviceId),e.deviceId2&&w(`deviceId2`,e.deviceId2)}}}catch{}},[]);async function T(){C(``),x(!0);try{if(s===`stalker`){if(!u.server||!u.mac)throw Error(`Portal URL and MAC required`);let t=u.server.trim().replace(/\/$/,``),n=await c(`/stalker/handshake`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({portal:t,mac:u.mac.trim(),serial:u.serial?.trim()||void 0,deviceId:u.deviceId?.trim()||void 0,deviceId2:u.deviceId2?.trim()||u.deviceId?.trim()||void 0})}),r=await n.json();if(!n.ok||r.error)throw Error(r.error||`Stalker handshake failed`);e({type:s,server:t,mac:u.mac.trim(),serial:u.serial.trim()||void 0,deviceId:u.deviceId.trim()||void 0,deviceId2:u.deviceId2.trim()||u.deviceId.trim()||void 0})}else e({type:`hls`})}catch(e){C(e.message||`Connection failed`)}finally{x(!1)}}let E=[[`stalker`,`Stalker Portal`]],[D,ee]=(0,i.useState)(null);return(0,a.jsx)(`div`,{className:`setup`,children:(0,a.jsxs)(`div`,{className:`card`,children:[(0,a.jsx)(`div`,{className:`logo`,children:`Tero Dev. To IPTV`}),(0,a.jsx)(`div`,{className:`tagline`,children:`Your personal IPTV client · Connect your own legal service`}),f.length>0&&(0,a.jsxs)(`div`,{style:{marginBottom:`1.2rem`},children:[(0,a.jsx)(`div`,{className:`fl`,style:{marginBottom:`.5rem`},children:`Available Portals`}),(0,a.jsx)(`div`,{style:{display:`flex`,flexDirection:`column`,gap:`.35rem`},children:f.map(e=>(0,a.jsxs)(`div`,{style:{display:`flex`,alignItems:`center`,gap:`.6rem`,padding:`.55rem .7rem`,background:D===e.id?`rgba(59,130,246,.15)`:`var(--s2)`,border:D===e.id?`1px solid var(--accent)`:`1px solid var(--b2)`,borderLeft:`3px solid var(--accent)`,borderRadius:`8px`,cursor:`pointer`,transition:`all .2s`},onClick:()=>{ee(e.id),w(`server`,e.url),e.mac&&w(`mac`,e.mac),l(e.type||`stalker`)},children:[(0,a.jsx)(`span`,{style:{fontSize:`1.1rem`},children:`📡`}),(0,a.jsxs)(`div`,{style:{flex:1,overflow:`hidden`},children:[(0,a.jsx)(`div`,{style:{fontSize:`.82rem`,fontWeight:500,overflow:`hidden`,textOverflow:`ellipsis`,whiteSpace:`nowrap`},children:e.name}),(0,a.jsx)(`div`,{style:{fontSize:`.62rem`,color:`var(--t3)`},children:e.url})]}),(0,a.jsx)(`span`,{style:{fontSize:`.7rem`,color:`var(--accent)`,fontWeight:600},children:D===e.id?`✓ Selected`:`Select`})]},e.id))}),r&&(0,a.jsx)(`div`,{style:{borderBottom:`1px solid var(--b2)`,margin:`1rem 0 .2rem`,position:`relative`},children:(0,a.jsx)(`span`,{style:{position:`absolute`,left:`50%`,transform:`translate(-50%,-50%)`,background:`var(--s1)`,padding:`0 .6rem`,fontSize:`.65rem`,color:`var(--t3)`,textTransform:`uppercase`,letterSpacing:`.08em`,fontWeight:600},children:`or custom connection`})})]}),S&&(0,a.jsxs)(`div`,{className:`err`,children:[`⚠ `,S]}),!r&&(0,a.jsx)(`div`,{className:`tabs`,children:E.map(([e,t])=>(0,a.jsx)(`button`,{className:`tab on`,onClick:()=>{l(e),C(``)},children:t},e))}),s===`stalker`&&r&&(0,a.jsxs)(a.Fragment,{children:[(0,a.jsxs)(`div`,{className:`fg`,children:[(0,a.jsx)(`label`,{className:`fl`,children:`Portal URL`}),(0,a.jsx)(`input`,{className:`fi`,placeholder:`http://example.com:80`,value:u.server,onChange:e=>w(`server`,e.target.value),readOnly:!r,style:r?{}:{opacity:.6,cursor:`not-allowed`}})]}),(0,a.jsxs)(`div`,{className:`fg`,children:[(0,a.jsx)(`label`,{className:`fl`,children:`MAC Address`}),(0,a.jsx)(`input`,{className:`fi`,placeholder:`00:1A:79:XX:XX:XX`,value:u.mac,onChange:e=>w(`mac`,e.target.value),readOnly:!r,style:r?{}:{opacity:.6,cursor:`not-allowed`}}),(0,a.jsx)(`div`,{className:`fhint`,children:`The MAC address registered with your IPTV provider`})]}),r&&(0,a.jsx)(`div`,{style:{marginTop:`.5rem`},children:(0,a.jsx)(`button`,{type:`button`,style:{background:`none`,border:`none`,color:`var(--accent)`,fontSize:`.72rem`,cursor:`pointer`,padding:0,fontFamily:`'DM Sans',sans-serif`},onClick:()=>h(!m),children:m?`▾ Hide advanced`:`▸ Advanced options`})}),(m||!r)&&null,r&&m&&(0,a.jsxs)(a.Fragment,{children:[(0,a.jsxs)(`div`,{className:`fg`,children:[(0,a.jsx)(`label`,{className:`fl`,children:`Serial Number`}),(0,a.jsx)(`input`,{className:`fi`,placeholder:`Optional — leave blank for auto`,value:u.serial,onChange:e=>w(`serial`,e.target.value)}),(0,a.jsx)(`div`,{className:`fhint`,children:`Device serial number (if required by provider)`})]}),(0,a.jsxs)(`div`,{className:`fg`,children:[(0,a.jsx)(`label`,{className:`fl`,children:`Device ID`}),(0,a.jsx)(`input`,{className:`fi`,placeholder:`Optional — used for both ID1 and ID2 if ID2 is blank`,value:u.deviceId,onChange:e=>w(`deviceId`,e.target.value)}),(0,a.jsx)(`div`,{className:`fhint`,children:`Primary device identifier`})]}),(0,a.jsxs)(`div`,{className:`fg`,children:[(0,a.jsx)(`label`,{className:`fl`,children:`Device ID 2`}),(0,a.jsx)(`input`,{className:`fi`,placeholder:`Optional — defaults to Device ID above`,value:u.deviceId2,onChange:e=>w(`deviceId2`,e.target.value)}),(0,a.jsx)(`div`,{className:`fhint`,children:`Secondary device identifier (some providers use same value for both)`})]})]})]}),(0,a.jsx)(`button`,{className:`btn-primary`,onClick:T,disabled:b||s===`import`,style:s===`import`?{display:`none`}:{},children:b?`Connecting…`:`Connect →`})]})})}function ae({on:e,onClick:t,style:n={}}){return(0,a.jsx)(`button`,{className:`fav-btn ${e?`on`:``}`,style:n,title:e?`Remove from favorites`:`Add to favorites`,onClick:e=>{e.stopPropagation(),t()},children:e?`♥`:`♡`})}var oe=[{key:`live`,icon:`◉`,label:`Live TV`,group:`Watch`},{key:`vod`,icon:`▣`,label:`Movies`,group:`Watch`},{key:`series`,icon:`▤`,label:`Series`,group:`Watch`}];function N(){let[e,t]=(0,i.useState)(null),[n,r]=(0,i.useState)([]),[s,f]=(0,i.useState)([]),[p,_]=(0,i.useState)([]),[w,E]=(0,i.useState)(!1),[ee,O]=(0,i.useState)(!1),[N,P]=(0,i.useState)(null),[fe,me]=(0,i.useState)(!1),[he,ge]=(0,i.useState)(null),[F,_e]=(0,i.useState)(`live`),[I,L]=(0,i.useState)(`All`),[R,ve]=(0,i.useState)(``),[z,ye]=(0,i.useState)(1),[B,be]=(0,i.useState)(``),[xe,V]=(0,i.useState)(null),[H,Se]=(0,i.useState)(null),[U,Ce]=(0,i.useState)(`Dark`),[W,we]=(0,i.useState)([]),[G,K]=(0,i.useState)(null),[Te,Ee]=(0,i.useState)(!1),[q,De]=(0,i.useState)({live:{},vod:{},series:{}}),[J,Oe]=(0,i.useState)([]),[ke,Ae]=(0,i.useState)({live:[],vod:[],series:[]}),[je,Me]=(0,i.useState)(``),[Ne,Pe]=(0,i.useState)(null),[Fe,Ie]=(0,i.useState)(!1),[Le,Re]=(0,i.useState)([]),[ze,Be]=(0,i.useState)([]),[Ve,He]=(0,i.useState)(!1),Y=(0,i.useRef)(new Set),[Ue,We]=(0,i.useState)(null),[Ge,X]=(0,i.useState)({}),[Ke,qe]=(0,i.useState)(!1),[Je,Ye]=(0,i.useState)(!1),[Xe,Ze]=(0,i.useState)(!1),[Qe,$e]=(0,i.useState)(!1),[et,tt]=(0,i.useState)(()=>localStorage.getItem(`sv-tmdb-key`)||`548cb796fc67d6997619a8a0f7e011a5`);(0,i.useEffect)(()=>{let e=document.getElementById(`sv-css`)||(()=>{let e=document.createElement(`style`);return e.id=`sv-css`,document.head.appendChild(e),e})();e.textContent=j(l[U])},[U]),(0,i.useEffect)(()=>{(async()=>{let e=localStorage.getItem(`sv-auth-code`);if(e)try{let t=await(await fetch(`${o}/auth/verify`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({code:e})})).json();t.success?(Ye(!0),Ze(!!t.isAdmin)):localStorage.removeItem(`sv-auth-code`)}catch{}await rt();let[t,n,r,i,a]=await Promise.all([m.get(`sv-theme`,`Dark`),m.get(`sv-connections`,[]),m.get(`sv-activeConn`,null),m.get(`sv-hiddenCats`,{live:[],vod:[],series:[]}),m.get(`sv-epgURL`,``)]);if(u.includes(t)&&Ce(t),we(n),K(r),Ae(i),a&&Me(a),r){let[e,t]=await Promise.all([m.get(`sv-favs-${r}`,{live:{},vod:{},series:{}}),m.get(`sv-history-${r}`,[])]);De(e),Oe(t)}if(r)try{let e=n.find(e=>e.id===r);e&&await nt(r,e)}catch{}})()},[]);async function nt(e,n){let i=await h.get(`content:${e}:live`);if(i&&i.length){qe(!0),t(n.config),r(i);let a=await h.get(`sync:${e}`);return a&&X(a),!0}return!1}async function rt(){try{if(localStorage.getItem(`sv-connections`))return;let e=localStorage.getItem(`sv-lastConn`);if(!e)return;let t=JSON.parse(e),n=g(t);if(!n)return;let r=d[0],i=t.type===`xtream`?`${t.user} · Xtream`:t.type===`stalker`?`Stalker · ${(t.mac||``).slice(-5)}`:t.type===`m3u`?`M3U · ${(t.url||``).split(`/`).pop()?.slice(0,20)||`playlist`}`:`Direct HLS`,a={id:n,type:t.type,label:i,color:r,config:t};m.set(`sv-connections`,[a]),m.set(`sv-activeConn`,n);let o=localStorage.getItem(`sv-activeProfile`),s=o?JSON.parse(o):`default`,c=localStorage.getItem(`sv-favs-${s}`);if(c)m.set(`sv-favs-${n}`,JSON.parse(c));else{let e=localStorage.getItem(`sv-favs-default`);e&&m.set(`sv-favs-${n}`,JSON.parse(e))}let l=localStorage.getItem(`sv-history`);l&&m.set(`sv-history-${n}`,JSON.parse(l)),localStorage.removeItem(`sv-profiles`),localStorage.removeItem(`sv-activeProfile`),localStorage.removeItem(`sv-lastConn`),localStorage.removeItem(`sv-history`)}catch{}}(0,i.useEffect)(()=>{m.set(`sv-theme`,U),C({theme:U})},[U]),(0,i.useEffect)(()=>{G&&(m.get(`sv-favs-${G}`,{live:{},vod:{},series:{}}).then(De),m.get(`sv-history-${G}`,[]).then(Oe))},[G]),(0,i.useEffect)(()=>{localStorage.setItem(`sv-lastSection`,JSON.stringify(F))},[F]),(0,i.useEffect)(()=>{if(!e)return;if(Ke){qe(!1);return}if(e.type===`m3u`){r(e.channels);let t=g(e);t&&e.channels?.length&&(h.set(`content:${t}:live`,e.channels),v(t,`live`,e.channels),h.set(`sync:${t}`,{...Ge,live:Date.now()}),X(e=>({...e,live:Date.now()})))}else e.type===`xtream`?it():e.type===`stalker`&&at();let t=g(e);t&&b(t,e.type,e)},[e]);async function it(t=!1){if(!e||e.type!==`xtream`)return;let n=g(e);if(!t&&n){let e=await h.get(`content:${n}:live`);if(e&&e.length){r(e);return}}E(!0);try{let t=te(e.server,e.user,e.pass),[i,a]=await Promise.all([t.getLiveCategories(),t.getLive()]),o=Object.fromEntries(i.map(e=>[e.category_id,e.category_name])),s=a.map(e=>({id:String(e.stream_id),name:e.name,logo:e.stream_icon,group:o[e.category_id]||`Other`,url:t.liveURL(e.stream_id),num:e.num,epgId:e.epg_channel_id,type:`live`}));if(r(s),n){h.set(`content:${n}:live`,s),v(n,`live`,s);let e=Date.now();X(t=>{let r={...t,live:e};return h.set(`sync:${n}`,r),r})}}catch(e){console.error(e)}finally{E(!1)}}async function at(t=!1){if(!e||e.type!==`stalker`)return;let n=g(e);if(!t&&n){let e=await h.get(`content:${n}:live`);if(e&&e.length){r(e);return}}E(!0);try{let t=await(await c(`/stalker/channels?portal=${encodeURIComponent(e.server)}&mac=${encodeURIComponent(e.mac)}`)).json();if(t.error)throw Error(t.error);let i=(t.channels||[]).map(A);if(r(i),n){h.set(`content:${n}:live`,i),v(n,`live`,i);let e=Date.now();X(t=>{let r={...t,live:e};return h.set(`sync:${n}`,r),r})}}catch(e){console.error(`Stalker channels error:`,e)}finally{E(!1)}}async function ot(t,n=!1,r=!1){let i=g(e),a=null;if(!n&&i)try{a=await h.get(`cats:${i}:${t}`)}catch{}if(!a){r||E(!0);try{let n=await(await c(`/stalker/${t}/categories?portal=${encodeURIComponent(e.server)}&mac=${encodeURIComponent(e.mac)}`)).json();if(n.error)throw Error(n.error);a=n.categories||[],i&&(h.set(`cats:${i}:${t}`,a),y(i,t,a))}catch(e){console.error(`Stalker ${t} cats:`,e);return}finally{r||E(!1)}}t===`vod`?Re(a):Be(a),a.length&&(r||(L(a[0].title),st(t,a[0].id,a[0].title)),ct(t,a,n))}async function st(t,n,r,i=!1,a=!1){let o=`${t}-${n}`;if(Y.current.has(o))return;Y.current.add(o);let s=g(e),l=s?`catitems:${s}:${t}:${n}`:`sv-s-${t}item-${e.server}-${n}`,u=e=>{let n=e.map(e=>({...A(e),group:r}));t===`vod`?f(e=>[...e.filter(e=>e.group!==r),...n]):_(e=>[...e.filter(e=>e.group!==r),...n])};if(!a)try{let e=await h.get(l);if(e){let t=e.items||e;if(t.length){u(t),Y.current.delete(o);return}}}catch{}i||He(!0);try{let r=await(await c(`/stalker/${t}?portal=${encodeURIComponent(e.server)}&mac=${encodeURIComponent(e.mac)}&cat=${n}`)).json();if(r.error)throw Error(r.error);let i=r.items||[];u(i),h.set(l,i.map(A))}catch(e){console.error(`Stalker ${t} cat items:`,e)}finally{i||He(!1),Y.current.delete(o)}}async function ct(e,t,n=!1){We({done:0,total:t.length});let r=0;for(let i of t)await st(e,i.id,i.title,!0,n),r++,We({done:r,total:t.length});We(null)}let lt=(0,i.useRef)(null);(0,i.useEffect)(()=>{if(!e)return;let t=g(e);if(t)return clearTimeout(lt.current),lt.current=setTimeout(()=>{s.length&&(h.set(`content:${t}:vod`,s),v(t,`vod`,s),X(e=>{let n={...e,vod:Date.now()};return h.set(`sync:${t}`,n),n})),p.length&&(h.set(`content:${t}:series`,p),v(t,`series`,p),X(e=>{let n={...e,series:Date.now()};return h.set(`sync:${t}`,n),n}))},3e3),()=>clearTimeout(lt.current)},[s,p,e]);async function ut(t){let n=t.type||`live`,r=t._stalkerCmd;try{let t=await c(`/stalker/stream?${new URLSearchParams({portal:e.server,mac:e.mac,cmd:r,content_type:n})}`),i=await t.json();if(!t.ok||!i.url)throw Error(i.error||`Proxy returned ${t.status}`);return i.url.startsWith(`/`)?`${o.replace(/\/+$/,``)}${i.url}`:i.url}catch(e){return console.error(`Stalker stream resolve failed:`,e),null}}async function dt(e){if(e){Ie(!0);try{let t=await(await k(e)).text();Pe(T(t)),Me(e),m.set(`sv-epgURL`,e)}catch(e){console.error(`EPG error:`,e)}finally{Ie(!1)}}}function ft(t){let n=[`vod`,`series`].includes(t)?t:`live`;_e(n),ve(``),ye(1),n===`vod`||n===`series`?(L(null),e?.type===`stalker`&&ot(n)):L(`All`)}function pt(){O(!1),e?.type===`stalker`&&(F===`live`?(r([]),at(!0)):F===`vod`?(f([]),Re([]),ot(`vod`,!0)):F===`series`&&(_([]),Be([]),ot(`series`,!0)))}function Z(e){let t=e.type||`live`,n={...q,[t]:{...q[t]}},r=e.id||e.url;n[t][r]?delete n[t][r]:n[t][r]={id:e.id,name:e.name,url:e.url,logo:e.logo,group:e.group,type:t},De(n),G&&(m.set(`sv-favs-${G}`,n),x(G,n))}function mt(e){let t=e?.type||`live`;return!!(e&&q[t]?.[e.id||e.url])}function ht(e){let t=[{...e,timestamp:Date.now(),position:0},...J.filter(t=>(t.id||t.url)!==(e.id||e.url))].slice(0,60);Oe(t),G&&m.set(`sv-history-${G}`,t),S(t)}async function Q(t){if(t.type===`series`){gt(t);return}if(e?.type===`stalker`&&t._stalkerCmd&&!t.url){let e=await ut(t);if(!e)return;let n={...t,url:e};V(n),ht(n)}else V(t),ht(t)}async function gt(t){if(t&&t.type===`series`){me(!0),P({item:t,seasons:[],activeSeason:0});try{if(e?.type===`stalker`){let n=await(await c(`/stalker/series/${encodeURIComponent(t.id)}/seasons?portal=${encodeURIComponent(e.server)}&mac=${encodeURIComponent(e.mac)}`)).json();if(n.error)throw Error(n.error);let r=n.seasons||[];P({item:t,seasons:r,activeSeason:0})}else if(e?.type===`xtream`){let n=await te(e.server,e.user,e.pass).getSeriesInfo(t.id),r=Object.keys(n.episodes||{}).sort((e,t)=>Number(e)-Number(t)).map(e=>({id:`${t.id}:${e}`,name:`Season ${e}`,episodes:(n.episodes[e]||[]).map(e=>({num:e.episode_num,title:e.title||`Episode ${e.episode_num}`,id:e.id,ext:e.container_extension||`mp4`}))}));P({item:t,seasons:r,activeSeason:0,xtreamInfo:n})}}catch(e){console.error(`Series detail error:`,e),P(null)}finally{me(!1)}}}async function _t(t,n){if(N){ge(n);try{if(e?.type===`stalker`){let r=null;try{let i=await c(`/stalker/series/episode/stream?${new URLSearchParams({portal:e.server,mac:e.mac,cmd:t.cmd,episode:String(n)})}`),a=await i.json();if(!i.ok||!a.url)throw Error(a.error||`Proxy returned ${i.status}`);r=a.url.startsWith(`/`)?`${o.replace(/\/+$/,``)}${a.url}`:a.url}catch(e){throw Error(e.message||`No stream URL returned for episode`)}let i={id:`${N.item.id}-s${N.activeSeason}-e${n}`,name:`${N.item.name} - ${t.name} E${n}`,url:r,logo:N.item.logo,type:`vod`,group:N.item.group};V(i),ht(i)}else if(e?.type===`xtream`){let r=t.episodes?.find(e=>e.num==n||e.id==n);if(!r)return;let i=te(e.server,e.user,e.pass).seriesStreamURL(r.id,r.ext||`mp4`),a={id:`${N.item.id}-e${r.id}`,name:`${N.item.name} - ${t.name} ${r.title||`E${r.num}`}`,url:i,logo:N.item.logo,type:`vod`,group:N.item.group};V(a),ht(a)}}catch(e){console.error(`Episode play error:`,e)}finally{ge(null)}}}function vt(e,t){return e===`xtream`?`${t.user} · Xtream`:e===`stalker`?`Stalker · ${(t.mac||``).slice(-5)}`:e===`m3u`?`M3U · ${(t.url||``).split(`/`).pop()?.slice(0,20)||`playlist`}`:`Direct HLS`}function yt(e){let t=g(e);if(!t)return;if(W.find(e=>e.id===t)){K(t),m.set(`sv-activeConn`,t);return}let n=new Set(W.map(e=>e.color)),r=d.find(e=>!n.has(e))||d[W.length%d.length],i={id:t,type:e.type,label:vt(e.type,e),color:r,config:e},a=[...W,i];we(a),K(t),m.set(`sv-connections`,a),m.set(`sv-activeConn`,t)}function bt(e){Ee(!1),r([]),f([]),_([]),Re([]),Be([]),Y.current.clear(),We(null),V(null),L(`All`),t(null),K(null),m.remove(`sv-activeConn`)}function xt(e,t){let n=ke[e]||[],r=n.includes(t)?n.filter(e=>e!==t):[...n,t],i={...ke,[e]:r};Ae(i),m.set(`sv-hiddenCats`,i)}function St(e,t){return(ke[e]||[]).includes(t)}(0,i.useEffect)(()=>{let e=()=>Se(null);return window.addEventListener(`click`,e),()=>window.removeEventListener(`click`,e)},[]),(0,i.useEffect)(()=>{ye(1)},[I,R,F]);function Ct(){let e=[...n];localStorage.clear(),t(null),r(e),f([]),_([]),Re([]),Be([]),Y.current.clear(),We(null),_e(`live`),V(null),L(`All`),K(null),Ye(!1),Ze(!1)}let wt=(0,i.useCallback)(e=>e===`live`?n:e===`vod`?s:p,[n,s,p]),Tt=(0,i.useMemo)(()=>{if(e?.type===`stalker`&&(F===`vod`||F===`series`)){let e=F===`vod`?Le:ze;if(e.length)return e.map(e=>e.title)}let t=wt(F);return[`All`,...new Set(t.map(e=>e.group).filter(Boolean))]},[e,F,Le,ze,wt]),Et=(0,i.useMemo)(()=>I?wt(F).filter(e=>{let t=I===`All`||e.group===I,n=!R||e.name?.toLowerCase().includes(R.toLowerCase());return t&&n}):[],[wt,F,I,R]),Dt=(0,i.useMemo)(()=>({live:Object.values(q.live||{}),vod:Object.values(q.vod||{}),series:Object.values(q.series||{})}),[q]);Dt.live.length+Dt.vod.length+Dt.series.length;let Ot=(0,i.useMemo)(()=>J.filter(e=>e.position>5&&e.type!==`live`).slice(0,20),[J]),kt=(0,i.useMemo)(()=>{let e=new Map;for(let t of J)e.set(t.id||t.url,t);return e},[J]),At=(0,i.useMemo)(()=>{if(B.length<=1)return[];let e=B.toLowerCase();return[...n,...s,...p].filter(t=>t.name?.toLowerCase().includes(e)).slice(0,80)},[B,n,s,p]);function jt(e){yt(e),t(e)}if(!Je)return(0,a.jsxs)(a.Fragment,{children:[(0,a.jsx)(`style`,{children:j(l[U])}),(0,a.jsx)(M,{onLogin:e=>{Ye(!0),Ze(e)}})]});if(Qe&&Xe)return(0,a.jsxs)(a.Fragment,{children:[(0,a.jsx)(`style`,{children:j(l[U])}),(0,a.jsx)(re,{onClose:()=>$e(!1)})]});if(!e)return(0,a.jsxs)(a.Fragment,{children:[(0,a.jsx)(`style`,{children:j(l[U])}),(0,a.jsx)(`div`,{style:{position:`fixed`,top:`1rem`,right:`1rem`,zIndex:100},children:Xe&&(0,a.jsxs)(`button`,{className:`c-btn toolbar-action action-admin setup-admin-action`,onClick:()=>$e(!0),title:`Open Admin Panel`,children:[(0,a.jsx)(`span`,{className:`action-icon`,"aria-hidden":`true`,children:`⚙`}),(0,a.jsx)(`span`,{children:`Admin Panel`})]})}),(0,a.jsx)(ie,{onConnect:jt,connections:W,onReconnect:bt,isAdmin:Xe})]});let Mt={live:`Live TV`,vod:`Movies`,series:`Series`},Nt=W.find(e=>e.id===G),Pt=Tt,$=Et,Ft=Math.ceil($.length/100),It=$.slice((z-1)*100,z*100);return(0,a.jsxs)(`div`,{className:`app`,children:[(0,a.jsxs)(`aside`,{className:`app-sidebar`,"aria-label":`Main navigation`,children:[(0,a.jsxs)(`div`,{className:`brand-lockup`,children:[(0,a.jsxs)(`div`,{className:`brand-mark`,children:[`T`,(0,a.jsx)(`span`,{children:`·`})]}),(0,a.jsxs)(`div`,{className:`brand-copy`,children:[(0,a.jsxs)(`div`,{className:`brand-name`,children:[`TERO`,(0,a.jsx)(`span`,{children:`DEV`})]}),(0,a.jsx)(`div`,{className:`brand-caption`,children:`PERSONAL STREAMING`})]})]}),(0,a.jsx)(`nav`,{className:`app-nav`,children:oe.map((e,t)=>(0,a.jsxs)(`div`,{children:[e.group!==oe[t-1]?.group&&(0,a.jsx)(`div`,{className:`nav-group-title`,children:e.group}),(0,a.jsxs)(`button`,{className:`app-nav-item ${F===e.key?`active`:``}`,onClick:()=>{ft(e.key),O(!1)},"aria-current":F===e.key?`page`:void 0,children:[(0,a.jsx)(`span`,{className:`app-nav-icon`,"aria-hidden":`true`,children:e.icon}),(0,a.jsx)(`span`,{className:`app-nav-label`,children:e.label}),e.key===`live`&&(0,a.jsx)(`span`,{className:`nav-live-dot`})]})]},e.key))}),(0,a.jsxs)(`div`,{className:`sidebar-bottom`,children:[(0,a.jsxs)(`div`,{className:`connection-status`,children:[(0,a.jsx)(`span`,{className:`status-dot`}),` SERVICE CONNECTED`]}),(0,a.jsxs)(`div`,{className:`connection-mini`,children:[(0,a.jsx)(`div`,{className:`connection-mini-icon`,children:`⌁`}),(0,a.jsxs)(`div`,{className:`connection-mini-copy`,children:[(0,a.jsx)(`strong`,{children:e?.server?.replace(/^https?:\/\//,``).split(`/`)[0]||`Your playlist`}),(0,a.jsx)(`span`,{children:e?.type===`stalker`?`Stalker portal`:e?.type||`Active connection`})]}),(0,a.jsx)(`button`,{className:`connection-change`,onClick:bt,"aria-label":`Switch connection`,title:`Switch connection`,children:`↗`})]}),(0,a.jsx)(`div`,{className:`sidebar-footnote`,children:`YOUR CONTENT. YOUR SCREEN.`})]})]}),(0,a.jsxs)(`div`,{className:`content`,children:[(0,a.jsxs)(`div`,{className:`c-header`,children:[(0,a.jsx)(`button`,{className:`hamburger`,onClick:()=>O(!ee),children:`☰`}),(0,a.jsx)(`div`,{className:`s-logo`,children:`Tero Dev. To IPTV`}),(0,a.jsxs)(`span`,{className:`c-title`,children:[Mt[F],[`live`,`vod`,`series`].includes(F)&&$.length>0&&(0,a.jsxs)(`span`,{className:`c-count`,children:[$.length.toLocaleString(),` items`]})]}),F===`search`&&(0,a.jsx)(`div`,{className:`c-search-wrap`,children:(0,a.jsx)(`input`,{className:`c-search`,placeholder:`Search...`,autoFocus:!0,value:B,onChange:e=>be(e.target.value)})}),[`live`,`vod`,`series`].includes(F)&&(0,a.jsx)(`div`,{className:`c-search-wrap`,children:(0,a.jsx)(`input`,{className:`c-search`,placeholder:`Search ${Mt[F]}...`,value:R,onChange:e=>ve(e.target.value)})}),(0,a.jsxs)(`div`,{className:`header-actions`,children:[Xe&&(0,a.jsxs)(`button`,{className:`menu-btn toolbar-action action-admin`,title:`Open Admin Panel`,onClick:()=>{$e(!0),O(!1)},children:[(0,a.jsx)(`span`,{className:`action-icon`,"aria-hidden":`true`,children:`⚙`}),(0,a.jsx)(`span`,{children:`Admin Panel`})]}),e?.type===`stalker`&&(0,a.jsxs)(`button`,{className:`menu-btn toolbar-action action-refresh`,title:`Refresh ${Mt[F]||`content`}`,onClick:pt,children:[(0,a.jsx)(`span`,{className:`action-icon`,"aria-hidden":`true`,children:`↻`}),(0,a.jsx)(`span`,{children:`Refresh`})]}),Nt&&(0,a.jsx)(`button`,{className:`menu-btn`,onClick:()=>{bt(),O(!1)},children:`🔀 Switch Connection`}),(0,a.jsxs)(`button`,{className:`menu-btn toolbar-action action-disconnect danger`,title:`Disconnect and sign out`,onClick:()=>{Ct(),O(!1)},children:[(0,a.jsx)(`span`,{className:`action-icon`,"aria-hidden":`true`,children:`⏻`}),(0,a.jsx)(`span`,{children:`Disconnect`})]})]})]}),ee&&(0,a.jsxs)(`div`,{className:`mobile-menu`,children:[Xe&&(0,a.jsxs)(`button`,{className:`menu-btn toolbar-action action-admin`,title:`Open Admin Panel`,onClick:()=>{$e(!0),O(!1)},children:[(0,a.jsx)(`span`,{className:`action-icon`,"aria-hidden":`true`,children:`⚙`}),(0,a.jsx)(`span`,{children:`Admin Panel`})]}),e?.type===`stalker`&&(0,a.jsxs)(`button`,{className:`menu-btn toolbar-action action-refresh`,title:`Refresh ${Mt[F]||`content`}`,onClick:pt,children:[(0,a.jsx)(`span`,{className:`action-icon`,"aria-hidden":`true`,children:`↻`}),(0,a.jsx)(`span`,{children:`Refresh`})]}),Nt&&(0,a.jsx)(`button`,{className:`menu-btn`,onClick:()=>{bt(),O(!1)},children:`🔀 Switch Connection`}),(0,a.jsxs)(`button`,{className:`menu-btn toolbar-action action-disconnect danger`,title:`Disconnect and sign out`,onClick:()=>{Ct(),O(!1)},children:[(0,a.jsx)(`span`,{className:`action-icon`,"aria-hidden":`true`,children:`⏻`}),(0,a.jsx)(`span`,{children:`Disconnect`})]})]}),w?(0,a.jsxs)(`div`,{className:`loading`,children:[(0,a.jsx)(`div`,{className:`spinner`}),(0,a.jsxs)(`span`,{children:[`Loading `,Mt[F],`…`]})]}):F===`discover`?(0,a.jsx)(pe,{tmdbKey:et,setTmdbKey:tt,vod:s,series:p,onPlay:Q}):F===`hls`?(0,a.jsx)(de,{}):F===`epg`?(0,a.jsx)(ue,{channels:n,epgData:Ne,epgURL:je,setEpgURL:Me,epgLoading:Fe,loadEPG:dt,onPlay:Q}):F===`search`?(0,a.jsx)(le,{results:At,query:B,onPlay:Q,toggleFav:Z,isFav:mt}):F===`favs`?(0,a.jsx)(se,{favItems:Dt,onPlay:Q,toggleFav:Z,isFav:mt}):F===`continue`?(0,a.jsx)(ce,{items:Ot,onPlay:Q,history:J}):(0,a.jsxs)(`div`,{className:`c-body`,children:[Pt.length>1&&(0,a.jsx)(`div`,{className:`cats`,children:Pt.map(t=>{let n=t!==`All`&&St(F,t);return(0,a.jsx)(`div`,{className:`cat ${I===t?`on`:``} ${n?`cat-hidden`:``}`,title:t,onClick:()=>{if(!n&&(L(t),e?.type===`stalker`&&(F===`vod`||F===`series`))){let e=(F===`vod`?Le:ze).find(e=>e.title===t);e&&st(F,e.id,t)}},onContextMenu:e=>{e.preventDefault(),t!==`All`&&Se({x:e.clientX,y:e.clientY,sec:F,catName:t})},children:t},t)})}),I===null&&e?.type===`stalker`&&(F===`vod`||F===`series`)?(0,a.jsxs)(`div`,{className:`empty`,children:[(0,a.jsx)(`div`,{className:`empty-icon`,children:`📂`}),(0,a.jsx)(`div`,{className:`empty-t`,children:`Select a category`}),(0,a.jsx)(`div`,{className:`empty-s`,children:`Choose a category from the list above to load content.`})]}):Ve&&$.length===0?(0,a.jsxs)(`div`,{className:`empty`,children:[(0,a.jsx)(`div`,{className:`empty-icon`,style:{animation:`spin 1s linear infinite`},children:`⏳`}),(0,a.jsxs)(`div`,{className:`empty-t`,children:[`Loading `,I,`…`]}),(0,a.jsx)(`div`,{className:`empty-s`,children:`Fetching items from portal.`})]}):$.length===0?(0,a.jsxs)(`div`,{className:`empty`,children:[(0,a.jsx)(`div`,{className:`empty-icon`,children:F===`live`?`📺`:F===`vod`?`🎬`:`📽`}),(0,a.jsx)(`div`,{className:`empty-t`,children:`No content found`}),(0,a.jsx)(`div`,{className:`empty-s`,children:F===`vod`?`No movies were returned. Check the portal connection or choose another category.`:F===`series`?`No series were returned. Check the portal connection or choose another category.`:e.type===`stalker`?`No channels were returned. Check the portal and MAC address, then refresh.`:`Check the playlist connection, then refresh the channel list.`})]}):(0,a.jsxs)(`div`,{style:{flex:1,display:`flex`,flexDirection:`column`,overflow:`auto`,minHeight:0},children:[F===`live`?(0,a.jsx)(`div`,{className:`ch-grid`,children:It.map((e,t)=>{let n=mt(e),r=D(Ne,e.epgId);return(0,a.jsxs)(`div`,{className:`ch-card ${xe?.id===e.id?`playing`:``}`,onClick:()=>Q(e),children:[e.logo?(0,a.jsx)(`img`,{className:`ch-logo`,src:e.logo,alt:``,onError:e=>e.target.style.display=`none`}):(0,a.jsx)(`div`,{className:`ch-logo-ph`,children:`📺`}),(0,a.jsx)(`div`,{className:`ch-name`,children:e.name}),e.num&&(0,a.jsxs)(`div`,{className:`ch-num`,children:[`CH `,e.num]}),r&&(0,a.jsxs)(`div`,{className:`ch-meta`,children:[`▶ `,r.title]}),(0,a.jsx)(ae,{on:n,onClick:()=>Z(e)})]},e.id||t)})}):(0,a.jsx)(`div`,{className:`vod-grid`,children:It.map((e,t)=>{let n=mt(e),r=kt.get(e.id||e.url),i=r?.position&&r?.duration?Math.min(100,r.position/r.duration*100):0;return(0,a.jsxs)(`div`,{className:`vod-card`,onClick:()=>Q(e),title:e.name,children:[e.logo?(0,a.jsx)(`img`,{className:`vod-poster`,src:e.logo,alt:``,onError:e=>e.target.style.display=`none`}):(0,a.jsx)(`div`,{className:`vod-ph`,children:F===`series`?`📽`:`🎬`}),i>2&&(0,a.jsx)(`div`,{className:`resume-bar`,children:(0,a.jsx)(`div`,{className:`resume-fill`,style:{width:`${i}%`}})}),(0,a.jsxs)(`div`,{className:`vod-info`,children:[(0,a.jsx)(`div`,{className:`vod-title`,children:e.name}),(0,a.jsx)(`div`,{className:`vod-meta`,children:[e.year,e.rating&&`★${parseFloat(e.rating||0).toFixed(1)}`].filter(Boolean).join(` · `)})]}),(0,a.jsx)(`button`,{className:`vod-fav ${n?`on`:``}`,onClick:t=>{t.stopPropagation(),Z(e)},children:n?`♥`:`♡`})]},e.id||t)})}),Ft>1&&(0,a.jsxs)(`div`,{style:{display:`flex`,alignItems:`center`,justifyContent:`center`,gap:`.5rem`,padding:`.75rem 0`,width:`100%`,flexShrink:0},children:[(0,a.jsx)(`button`,{className:`c-btn`,onClick:()=>ye(e=>Math.max(1,e-1)),disabled:z===1,children:`← Prev`}),(0,a.jsxs)(`span`,{style:{fontSize:`.75rem`,color:`var(--t2)`},children:[`Page `,z,` of `,Ft]}),(0,a.jsx)(`button`,{className:`c-btn`,onClick:()=>ye(e=>Math.min(Ft,e+1)),disabled:z===Ft,children:`Next →`})]})]})]})]}),xe&&(0,a.jsx)(ne,{item:xe,channelList:xe.type===`live`?n:null,epgData:Ne,onClose:()=>V(null),toggleFav:Z,onFav:Z,isFav:mt,connType:e?.type}),H&&(0,a.jsxs)(`div`,{className:`ctx-menu`,style:{left:H.x,top:H.y},onClick:e=>e.stopPropagation(),children:[(0,a.jsx)(`div`,{className:`ctx-item`,onClick:()=>{xt(H.sec,H.catName),Se(null)},children:St(H.sec,H.catName)?`👁 Show category`:`🙈 Hide category`}),(0,a.jsx)(`div`,{className:`ctx-item`,onClick:()=>{L(H.catName),Se(null)},children:`📌 Filter to this`})]}),N&&(0,a.jsx)(`div`,{className:`series-modal-ov`,onClick:()=>{fe||P(null)},children:(0,a.jsxs)(`div`,{className:`series-modal`,onClick:e=>e.stopPropagation(),children:[(0,a.jsxs)(`div`,{className:`series-modal-header`,children:[N.item.logo?(0,a.jsx)(`img`,{className:`series-modal-poster`,src:N.item.logo,alt:``,onError:e=>e.target.style.display=`none`}):(0,a.jsx)(`div`,{className:`series-modal-poster-ph`,children:`📽`}),(0,a.jsxs)(`div`,{className:`series-modal-info`,children:[(0,a.jsx)(`div`,{className:`series-modal-title`,children:N.item.name}),(0,a.jsxs)(`div`,{className:`series-modal-meta`,children:[[N.item.year,N.item.rating&&`★${parseFloat(N.item.rating||0).toFixed(1)}`].filter(Boolean).join(` · `),N.seasons.length>0&&` · ${N.seasons.length} Season${N.seasons.length>1?`s`:``}`]}),N.item.description&&(0,a.jsx)(`div`,{className:`series-modal-desc`,children:N.item.description})]}),(0,a.jsx)(`button`,{className:`series-modal-close`,onClick:()=>P(null),title:`Close`,children:`✕`})]}),(0,a.jsx)(`div`,{className:`series-modal-body`,children:fe?(0,a.jsxs)(`div`,{className:`series-loading`,children:[(0,a.jsx)(`div`,{className:`spinner`}),(0,a.jsx)(`span`,{children:`Loading seasons…`})]}):N.seasons.length===0?(0,a.jsx)(`div`,{style:{textAlign:`center`,padding:`2rem`,color:`var(--t2)`,fontSize:`.85rem`},children:`No seasons found for this series.`}):(0,a.jsxs)(a.Fragment,{children:[N.seasons.length>1&&(0,a.jsx)(`div`,{className:`series-seasons-tabs`,children:N.seasons.map((e,t)=>(0,a.jsx)(`button`,{className:`series-season-tab ${N.activeSeason===t?`on`:``}`,onClick:()=>P(e=>({...e,activeSeason:t})),children:e.name||`Season ${t+1}`},e.id||t))}),N.seasons.length===1&&(0,a.jsxs)(`div`,{style:{fontSize:`.8rem`,fontWeight:600,color:`var(--t2)`,marginBottom:`.7rem`},children:[N.seasons[0].name||`Season 1`,` — `,N.seasons[0].episodes.length,` episode`,N.seasons[0].episodes.length===1?``:`s`]}),(0,a.jsx)(`div`,{className:`series-ep-list`,children:(()=>{let t=N.seasons[N.activeSeason];return t?(e?.type===`xtream`?t.episodes.map(e=>({num:e.num||e.id,label:e.title||`Episode ${e.num}`})):t.episodes.map((e,t)=>{let n=typeof e==`object`?e.num||e.episode_num||e.id||t+1:e;return{num:n,label:typeof e==`object`&&e.title||`Episode ${n}`}})).map(e=>(0,a.jsxs)(`div`,{className:`series-ep-item ${he===e.num?`loading`:``}`,onClick:()=>_t(t,e.num),children:[(0,a.jsx)(`div`,{className:`series-ep-num`,children:e.num}),(0,a.jsx)(`div`,{className:`series-ep-name`,children:e.label}),he===e.num?(0,a.jsx)(`div`,{className:`spinner`,style:{width:16,height:16,borderWidth:2}}):(0,a.jsx)(`span`,{className:`series-ep-play`,children:`▶`})]},e.num)):null})()})]})})]})})]})}function se({favItems:e,onPlay:t,toggleFav:n,isFav:r}){if(![...e.live,...e.vod,...e.series].length)return(0,a.jsxs)(`div`,{className:`empty`,children:[(0,a.jsx)(`div`,{className:`empty-icon`,children:`♡`}),(0,a.jsx)(`div`,{className:`empty-t`,children:`No favorites yet`}),(0,a.jsx)(`div`,{className:`empty-s`,children:`Click the ♡ icon on any channel or movie to add it here.`})]});let i=[[`Live TV`,e.live],[`Movies`,e.vod],[`Series`,e.series]];return(0,a.jsx)(`div`,{style:{flex:1,overflow:`auto`,padding:`1.1rem 1.4rem`,display:`flex`,flexDirection:`column`,gap:`1.5rem`},children:i.filter(([,e])=>e.length>0).map(([e,r])=>(0,a.jsxs)(`div`,{className:`section-block`,children:[(0,a.jsx)(`div`,{className:`section-label`,children:e}),(0,a.jsx)(`div`,{className:e===`Live TV`?`ch-grid`:`vod-grid`,children:r.map((r,i)=>e===`Live TV`?(0,a.jsxs)(`div`,{className:`ch-card`,onClick:()=>t(r),children:[r.logo?(0,a.jsx)(`img`,{className:`ch-logo`,src:r.logo,alt:``}):(0,a.jsx)(`div`,{className:`ch-logo-ph`,children:`📺`}),(0,a.jsx)(`div`,{className:`ch-name`,children:r.name}),(0,a.jsx)(ae,{on:!0,onClick:()=>n(r)})]},r.id||i):(0,a.jsxs)(`div`,{className:`vod-card`,onClick:()=>t(r),children:[r.logo?(0,a.jsx)(`img`,{className:`vod-poster`,src:r.logo,alt:``}):(0,a.jsx)(`div`,{className:`vod-ph`,children:`🎬`}),(0,a.jsx)(`div`,{className:`vod-info`,children:(0,a.jsx)(`div`,{className:`vod-title`,children:r.name})}),(0,a.jsx)(`button`,{className:`vod-fav on`,onClick:e=>{e.stopPropagation(),n(r)},children:`♥`})]},r.id||i))})]},e))})}function ce({items:e,onPlay:t,history:n}){let r=n.slice(0,20);return r.length?(0,a.jsxs)(`div`,{style:{flex:1,overflow:`auto`,padding:`1.1rem 1.4rem`,display:`flex`,flexDirection:`column`,gap:`1.5rem`},children:[e.length>0&&(0,a.jsxs)(`div`,{className:`section-block`,children:[(0,a.jsx)(`div`,{className:`section-label`,children:`Resume Watching`}),(0,a.jsx)(`div`,{className:`cw-row`,children:e.map((e,n)=>{let r=e.duration?Math.min(100,e.position/e.duration*100):0;return(0,a.jsxs)(`div`,{className:`cw-item`,onClick:()=>t(e),children:[e.logo?(0,a.jsx)(`img`,{className:`cw-poster`,src:e.logo,alt:``,style:{width:`100%`,aspectRatio:`16/9`,objectFit:`cover`}}):(0,a.jsx)(`div`,{className:`cw-poster`,children:`🎬`}),(0,a.jsx)(`div`,{className:`cw-prog-bar`,children:(0,a.jsx)(`div`,{className:`cw-prog-fill`,style:{width:`${r}%`}})}),(0,a.jsxs)(`div`,{className:`cw-info`,children:[(0,a.jsx)(`div`,{className:`cw-name`,children:e.name}),(0,a.jsx)(`div`,{className:`cw-time`,children:O(e.position)})]})]},e.id||n)})})]}),(0,a.jsxs)(`div`,{className:`section-block`,children:[(0,a.jsx)(`div`,{className:`section-label`,children:`Recently Watched`}),(0,a.jsx)(`div`,{style:{display:`flex`,flexDirection:`column`,gap:`.4rem`},children:r.map((e,n)=>(0,a.jsxs)(`div`,{style:{display:`flex`,alignItems:`center`,gap:`.75rem`,padding:`.5rem .75rem`,background:`var(--s1)`,border:`1px solid var(--b1)`,borderRadius:`9px`,cursor:`pointer`,transition:`all .2s`},onClick:()=>t(e),onMouseEnter:e=>e.currentTarget.style.borderColor=`var(--b2)`,onMouseLeave:e=>e.currentTarget.style.borderColor=`var(--b1)`,children:[e.logo?(0,a.jsx)(`img`,{style:{width:`30px`,height:`30px`,objectFit:`contain`,borderRadius:`4px`,background:`var(--s2)`,flexShrink:0},src:e.logo,alt:``}):(0,a.jsx)(`div`,{style:{width:`30px`,height:`30px`,background:`var(--s2)`,borderRadius:`4px`,display:`flex`,alignItems:`center`,justifyContent:`center`,fontSize:`.75rem`,flexShrink:0},children:e.type===`live`?`📺`:`🎬`}),(0,a.jsxs)(`div`,{style:{flex:1,overflow:`hidden`},children:[(0,a.jsx)(`div`,{style:{fontSize:`.8rem`,fontWeight:500,overflow:`hidden`,textOverflow:`ellipsis`,whiteSpace:`nowrap`},children:e.name}),(0,a.jsxs)(`div`,{style:{fontSize:`.65rem`,color:`var(--t3)`},children:[e.group,` · `,new Date(e.timestamp).toLocaleDateString()]})]}),(0,a.jsx)(`div`,{style:{fontSize:`.65rem`,color:`var(--t3)`,textTransform:`capitalize`,flexShrink:0},children:e.type})]},e.id||n))})]})]}):(0,a.jsxs)(`div`,{className:`empty`,children:[(0,a.jsx)(`div`,{className:`empty-icon`,children:`⏯`}),(0,a.jsx)(`div`,{className:`empty-t`,children:`Nothing started yet`}),(0,a.jsx)(`div`,{className:`empty-s`,children:`Watch some content and it will appear here for easy resuming.`})]})}function le({results:e,query:t,onPlay:n,toggleFav:r,isFav:i}){if(!t||t.length<2)return(0,a.jsxs)(`div`,{className:`empty`,children:[(0,a.jsx)(`div`,{className:`empty-icon`,children:`🔍`}),(0,a.jsx)(`div`,{className:`empty-t`,children:`Search everything`}),(0,a.jsx)(`div`,{className:`empty-s`,children:`Type above to search across Live TV, Movies, and Series simultaneously. Inspired by SFVIP's "All" category.`})]});if(!e.length)return(0,a.jsxs)(`div`,{className:`empty`,children:[(0,a.jsx)(`div`,{className:`empty-icon`,children:`🔍`}),(0,a.jsxs)(`div`,{className:`empty-t`,children:[`No results for "`,t,`"`]})]});let o={live:e.filter(e=>e.type===`live`),vod:e.filter(e=>e.type===`vod`),series:e.filter(e=>e.type===`series`)},s={live:`📺`,vod:`🎬`,series:`📽`},c={live:`Live TV`,vod:`Movies`,series:`Series`};return(0,a.jsx)(`div`,{className:`gsearch`,children:Object.entries(o).filter(([,e])=>e.length).map(([e,t])=>(0,a.jsxs)(`div`,{className:`gsearch-section`,children:[(0,a.jsxs)(`div`,{className:`section-label`,children:[c[e],` `,(0,a.jsxs)(`span`,{style:{fontFamily:`'DM Sans'`,fontWeight:400,color:`var(--t3)`,textTransform:`none`,letterSpacing:0},children:[`(`,t.length,`)`]})]}),t.map((t,o)=>(0,a.jsxs)(`div`,{className:`gsearch-row`,onClick:()=>n(t),children:[t.logo?(0,a.jsx)(`img`,{className:`gsearch-logo`,src:t.logo,alt:``,onError:e=>e.target.style.display=`none`}):(0,a.jsx)(`div`,{className:`gsearch-logo-ph`,children:s[e]}),(0,a.jsx)(`div`,{className:`gsearch-name`,children:t.name}),(0,a.jsx)(`div`,{className:`gsearch-group`,children:t.group}),(0,a.jsx)(`button`,{style:{background:`none`,border:`none`,cursor:`pointer`,fontSize:`.9rem`,color:i(t)?`var(--accent)`:`var(--t3)`,padding:`.1rem .2rem`,transition:`color .2s`},onClick:e=>{e.stopPropagation(),r(t)},children:i(t)?`♥`:`♡`})]},t.id||o))]},e))})}function ue({channels:e,epgData:t,epgURL:n,setEpgURL:r,epgLoading:o,loadEPG:s,onPlay:c}){let[l,u]=(0,i.useState)(n||``),[d,f]=(0,i.useState)(``),[p,m]=(0,i.useState)(()=>new Date().getHours());(0,i.useEffect)(()=>{let e=setInterval(()=>m(new Date().getHours()),6e4);return()=>clearInterval(e)},[]);let h=(0,i.useMemo)(()=>{let e=Math.max(0,p-1);return Array.from({length:8},(t,n)=>{let r=e+n,i=new Date;return i.setHours(r,0,0,0),{label:`${String(r%24).padStart(2,`0`)}:00`,startMs:i.getTime(),endMs:i.getTime()+36e5}})},[p]),g=(0,i.useMemo)(()=>{if(!d)return e;let t=d.toLowerCase();return e.filter(e=>e.name?.toLowerCase().includes(t))},[e,d]);return(0,a.jsxs)(`div`,{style:{flex:1,display:`flex`,flexDirection:`column`,overflow:`hidden`},children:[(0,a.jsxs)(`div`,{className:`epg-top`,children:[(0,a.jsx)(`input`,{className:`fi`,style:{flex:`1 1 260px`,minWidth:0},placeholder:`XMLTV EPG URL (e.g. http://provider.com/epg.xml)`,value:l,onChange:e=>u(e.target.value),onKeyDown:e=>e.key===`Enter`&&s(l)}),(0,a.jsx)(`button`,{className:`btn-go`,onClick:()=>s(l),disabled:o,style:{padding:`.4rem .9rem`,fontSize:`.82rem`},children:o?`Loading…`:`Load EPG`}),e.length>0&&(0,a.jsx)(`input`,{className:`fi`,style:{width:`160px`},placeholder:`Filter channels…`,value:d,onChange:e=>f(e.target.value)})]}),e.length?t?(0,a.jsx)(`div`,{className:`epg-outer`,children:(0,a.jsxs)(`div`,{className:`epg-table`,children:[(0,a.jsxs)(`div`,{className:`epg-head-row`,children:[(0,a.jsx)(`div`,{className:`epg-ch-col`,style:{height:`32px`}}),h.map(e=>(0,a.jsx)(`div`,{className:`epg-time-slot`,children:e.label},e.label))]}),g.map((e,n)=>{let r=ee(t,e),i=Date.now();return(0,a.jsxs)(`div`,{className:`epg-row`,children:[(0,a.jsxs)(`div`,{className:`epg-ch-cell`,onClick:()=>c(e),style:{cursor:`pointer`},children:[e.logo&&(0,a.jsx)(`img`,{className:`epg-ch-logo`,src:e.logo,alt:``,onError:e=>e.target.style.display=`none`}),(0,a.jsx)(`span`,{className:`epg-ch-name`,title:e.name,children:e.name})]}),h.map((t,n)=>{let o=r?.find(e=>e.start<t.endMs&&e.stop>t.startMs),s=t.startMs<=i&&t.endMs>i;return(0,a.jsxs)(`div`,{className:`epg-prog ${s?`now`:``}`,onClick:()=>c(e),title:o?`${o.title}\n${new Date(o.start).toLocaleTimeString([],{hour:`2-digit`,minute:`2-digit`})} – ${new Date(o.stop).toLocaleTimeString([],{hour:`2-digit`,minute:`2-digit`})}`:``,children:[(0,a.jsx)(`div`,{className:`epg-prog-t`,children:o?.title||(0,a.jsx)(`span`,{style:{opacity:.35},children:`—`})}),(0,a.jsx)(`div`,{className:`epg-prog-s`,children:t.label})]},n)})]},e.id||n)})]})}):(0,a.jsxs)(`div`,{className:`empty`,children:[(0,a.jsx)(`div`,{className:`empty-icon`,children:`📅`}),(0,a.jsx)(`div`,{className:`empty-t`,children:`No EPG data`}),(0,a.jsxs)(`div`,{className:`empty-s`,children:[`Paste your XMLTV EPG URL above and click Load EPG.`,(0,a.jsx)(`br`,{}),`Your provider may supply one — check their portal or dashboard.`]})]}):(0,a.jsxs)(`div`,{className:`empty`,children:[(0,a.jsx)(`div`,{className:`empty-icon`,children:`📋`}),(0,a.jsx)(`div`,{className:`empty-t`,children:`No channels loaded`}),(0,a.jsx)(`div`,{className:`empty-s`,children:`Connect via Xtream Codes or M3U to populate TV Guide.`})]})]})}function de(){let[e,t]=(0,i.useState)(``),[n,r]=(0,i.useState)(null);return(0,a.jsxs)(`div`,{className:`hls-body`,children:[(0,a.jsx)(`div`,{style:{fontSize:`.84rem`,color:`var(--t2)`,lineHeight:1.6},children:`Enter any HLS (.m3u8), DASH, or direct media URL. Great for testing your own streams.`}),(0,a.jsxs)(`div`,{className:`hls-row`,children:[(0,a.jsx)(`input`,{className:`fi`,placeholder:`https://your-stream.com/live/stream.m3u8`,value:e,onChange:e=>t(e.target.value),onKeyDown:t=>t.key===`Enter`&&e&&r({name:e.split(`/`).pop()||`Stream`,url:e,type:`live`,group:`Direct`})}),(0,a.jsx)(`button`,{className:`btn-go`,onClick:()=>e&&r({name:e.split(`/`).pop()||`Stream`,url:e,type:`live`,group:`Direct`}),children:`▶ Play`})]}),(0,a.jsxs)(`div`,{style:{display:`flex`,flexDirection:`column`,gap:`.35rem`},children:[(0,a.jsx)(`div`,{style:{fontSize:`.7rem`,color:`var(--t3)`,textTransform:`uppercase`,letterSpacing:`.08em`,fontWeight:600},children:`Public test streams`}),[[`Apple HLS Bipbop (Adaptive)`,`https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8`],[`Big Buck Bunny (MP4)`,`https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4`],[`Elephant Dream (MP4)`,`https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4`]].map(([e,n])=>(0,a.jsx)(`div`,{style:{fontSize:`.75rem`,color:`var(--accent)`,cursor:`pointer`,textDecoration:`underline`},onClick:()=>{t(n),r({name:e,url:n,type:`live`,group:`Test`})},children:e},e))]}),n&&(0,a.jsx)(ne,{item:n,onClose:()=>r(null)})]})}var P=`https://image.tmdb.org/t/p/`;function fe(e){return(e||``).toLowerCase().replace(/[^a-z0-9 ]/g,``).replace(/\s+/g,` `).trim()}function pe({tmdbKey:e,setTmdbKey:t,vod:n,series:r,onPlay:o}){let[s,c]=(0,i.useState)(e),[l,u]=(0,i.useState)([]),[d,f]=(0,i.useState)([]),[p,m]=(0,i.useState)([]),[h,g]=(0,i.useState)(!1),[_,v]=(0,i.useState)(``),[y,b]=(0,i.useState)(null);(0,i.useEffect)(()=>{e&&x(e)},[e]);async function x(e){g(!0),v(``);try{let t=`https://api.themoviedb.org/3`,[n,r,i]=await Promise.all([fetch(`${t}/trending/all/week?api_key=${e}&language=en-US`).then(e=>e.json()),fetch(`${t}/movie/popular?api_key=${e}&language=en-US`).then(e=>e.json()),fetch(`${t}/tv/popular?api_key=${e}&language=en-US`).then(e=>e.json())]);if(n.success===!1)throw Error(n.status_message||`Invalid API key`);u(n.results||[]),f(r.results||[]),m(i.results||[])}catch(e){v(e.message),localStorage.removeItem(`sv-tmdb-key`),t(``)}finally{g(!1)}}function S(){let e=s.trim();e&&(localStorage.setItem(`sv-tmdb-key`,e),t(e))}let C=(0,i.useCallback)(e=>{let t=fe(e.title||e.name);return!t||t.length<2?[]:[...n,...r].filter(e=>{let n=fe(e.name);return n?!!(n===t||Math.min(n.length,t.length)>=6&&(n.includes(t)||t.includes(n))):!1})},[n,r]);function w(e){let t=C(e);t.length===1?o(t[0]):b({tmdbItem:e,matches:t})}if(!e)return(0,a.jsxs)(`div`,{className:`disc-key-prompt`,children:[(0,a.jsx)(`div`,{style:{fontSize:`2.5rem`},children:`✨`}),(0,a.jsx)(`div`,{style:{fontSize:`1rem`,fontWeight:600},children:`Discover Trending Content`}),(0,a.jsxs)(`div`,{style:{fontSize:`.82rem`,color:`var(--t2)`,maxWidth:`360px`,lineHeight:1.6},children:[`See what's trending on TMDB and find matches in your library.`,` `,(0,a.jsx)(`a`,{href:`https://www.themoviedb.org/settings/api`,target:`_blank`,rel:`noopener noreferrer`,style:{color:`var(--accent)`},children:`Get a free API key →`})]}),_&&(0,a.jsx)(`div`,{className:`err`,style:{maxWidth:`360px`},children:_}),(0,a.jsxs)(`div`,{style:{display:`flex`,gap:`.5rem`,width:`100%`,maxWidth:`380px`},children:[(0,a.jsx)(`input`,{className:`fi`,placeholder:`Paste TMDB v3 API key…`,value:s,onChange:e=>c(e.target.value),onKeyDown:e=>e.key===`Enter`&&S()}),(0,a.jsx)(`button`,{className:`btn-go`,style:{padding:`.62rem .9rem`,fontSize:`.84rem`},onClick:S,children:`Go`})]})]});if(h)return(0,a.jsxs)(`div`,{className:`loading`,children:[(0,a.jsx)(`div`,{className:`spinner`}),(0,a.jsx)(`span`,{children:`Loading trending…`})]});let T=l[0];function E(e,t){let n=C(e),r=n.length>0,i=e.poster_path?`${P}w185${e.poster_path}`:null,o=(e.release_date||e.first_air_date||``).slice(0,4),s=e.vote_average?e.vote_average.toFixed(1):null,c=e.title||e.name||`Unknown`;return(0,a.jsxs)(`div`,{className:`disc-card`,onClick:()=>w(e),title:c,children:[i?(0,a.jsx)(`img`,{className:`disc-poster`,src:i,alt:c}):(0,a.jsx)(`div`,{className:`disc-poster-ph`,children:e.media_type===`tv`?`📺`:`🎬`}),s&&(0,a.jsxs)(`div`,{className:`disc-rating`,children:[`★`,s]}),r&&(0,a.jsx)(`div`,{className:`disc-in-lib`,title:`${n.length} match${n.length>1?`es`:``} in library`,children:n.length>1?n.length:`▶`}),(0,a.jsx)(`div`,{className:`disc-card-title`,children:c}),(0,a.jsx)(`div`,{className:`disc-card-meta`,children:[o,e.media_type===`tv`?`TV`:`Film`].filter(Boolean).join(` · `)})]},e.id||t)}return(0,a.jsxs)(`div`,{className:`discover-body`,children:[T&&(()=>{let e=C(T);return(0,a.jsxs)(`div`,{className:`disc-hero`,onClick:()=>w(T),children:[T.backdrop_path&&(0,a.jsx)(`img`,{className:`disc-hero-bg`,src:`${P}w1280${T.backdrop_path}`,alt:``}),(0,a.jsxs)(`div`,{className:`disc-hero-info`,children:[(0,a.jsx)(`div`,{className:`disc-hero-title`,children:T.title||T.name}),(0,a.jsx)(`div`,{className:`disc-hero-meta`,children:[(T.release_date||T.first_air_date||``).slice(0,4),T.vote_average&&`★ ${T.vote_average.toFixed(1)}`,T.media_type===`tv`?`TV Series`:`Movie`].filter(Boolean).join(` · `)}),T.overview&&(0,a.jsx)(`div`,{className:`disc-hero-overview`,children:T.overview}),e.length>0&&(0,a.jsx)(`div`,{className:`disc-hero-avail`,children:e.length===1?`▶ In your library — click to play`:`▶ ${e.length} matches in your library — click to choose`})]})]})})(),(0,a.jsxs)(`div`,{className:`disc-section`,children:[(0,a.jsx)(`div`,{className:`section-label`,children:`Trending This Week`}),(0,a.jsx)(`div`,{className:`disc-row`,children:l.map((e,t)=>E(e,t))})]}),(0,a.jsxs)(`div`,{className:`disc-section`,children:[(0,a.jsx)(`div`,{className:`section-label`,children:`Popular Movies`}),(0,a.jsx)(`div`,{className:`disc-row`,children:d.map((e,t)=>E({...e,media_type:`movie`},t))})]}),(0,a.jsxs)(`div`,{className:`disc-section`,children:[(0,a.jsx)(`div`,{className:`section-label`,children:`Popular TV Shows`}),(0,a.jsx)(`div`,{className:`disc-row`,children:p.map((e,t)=>E({...e,media_type:`tv`},t))})]}),(0,a.jsx)(`div`,{style:{display:`flex`,justifyContent:`flex-end`,paddingTop:`.4rem`},children:(0,a.jsx)(`button`,{className:`btn-sm`,style:{width:`auto`},onClick:()=>{localStorage.removeItem(`sv-tmdb-key`),t(``),c(``)},children:`Change API Key`})}),y&&(0,a.jsx)(`div`,{style:{position:`fixed`,inset:0,background:`rgba(0,0,0,.82)`,zIndex:600,display:`flex`,alignItems:`center`,justifyContent:`center`,backdropFilter:`blur(8px)`},onClick:()=>b(null),children:(0,a.jsxs)(`div`,{style:{background:`var(--s1)`,border:`1px solid var(--b2)`,borderRadius:`14px`,padding:`1.5rem`,width:`100%`,maxWidth:`420px`,maxHeight:`72vh`,overflow:`auto`},onClick:e=>e.stopPropagation(),children:[(0,a.jsxs)(`div`,{style:{display:`flex`,gap:`1rem`,marginBottom:`1.2rem`,alignItems:`flex-start`},children:[y.tmdbItem.poster_path&&(0,a.jsx)(`img`,{src:`${P}w92${y.tmdbItem.poster_path}`,style:{width:54,borderRadius:7,flexShrink:0,border:`1px solid var(--b2)`},alt:``}),(0,a.jsxs)(`div`,{children:[(0,a.jsx)(`div`,{style:{fontFamily:`'Rajdhani',sans-serif`,fontWeight:700,fontSize:`1.15rem`,lineHeight:1.2},children:y.tmdbItem.title||y.tmdbItem.name}),(0,a.jsx)(`div`,{style:{fontSize:`.72rem`,color:`var(--t2)`,marginTop:`.25rem`},children:[(y.tmdbItem.release_date||y.tmdbItem.first_air_date||``).slice(0,4),y.tmdbItem.media_type===`tv`?`TV Series`:`Movie`].filter(Boolean).join(` · `)})]})]}),y.matches.length===0?(0,a.jsxs)(`div`,{style:{textAlign:`center`,padding:`1.4rem 0`},children:[(0,a.jsx)(`div`,{style:{fontSize:`2rem`,marginBottom:`.5rem`},children:`🔍`}),(0,a.jsx)(`div`,{style:{fontSize:`.9rem`,fontWeight:600},children:`Not in your library`}),(0,a.jsx)(`div`,{style:{fontSize:`.78rem`,color:`var(--t2)`,marginTop:`.4rem`,lineHeight:1.55},children:`Load your Movies or Series first — connect via Xtream, M3U, or Stalker, then switch to the Movies/Series tab.`})]}):(0,a.jsxs)(a.Fragment,{children:[(0,a.jsxs)(`div`,{style:{fontSize:`.68rem`,color:`var(--t3)`,textTransform:`uppercase`,letterSpacing:`.1em`,fontWeight:700,marginBottom:`.6rem`},children:[y.matches.length,` match`,y.matches.length>1?`es`:``,` in your library`]}),(0,a.jsx)(`div`,{style:{display:`flex`,flexDirection:`column`,gap:`.4rem`},children:y.matches.map((e,t)=>(0,a.jsxs)(`div`,{style:{display:`flex`,alignItems:`center`,gap:`.75rem`,padding:`.6rem .8rem`,background:`var(--s2)`,border:`1px solid var(--b2)`,borderRadius:`9px`,cursor:`pointer`,transition:`border-color .15s`},onClick:()=>{o(e),b(null)},onMouseEnter:e=>e.currentTarget.style.borderColor=`var(--accent)`,onMouseLeave:e=>e.currentTarget.style.borderColor=`var(--b2)`,children:[e.logo?(0,a.jsx)(`img`,{src:e.logo,style:{width:38,height:38,objectFit:`contain`,borderRadius:5,background:`var(--s3)`,flexShrink:0},alt:``}):(0,a.jsx)(`div`,{style:{width:38,height:38,background:`var(--s3)`,borderRadius:5,display:`flex`,alignItems:`center`,justifyContent:`center`,flexShrink:0,fontSize:`.9rem`},children:e.type===`series`?`📽`:`🎬`}),(0,a.jsxs)(`div`,{style:{flex:1,overflow:`hidden`},children:[(0,a.jsx)(`div`,{style:{fontSize:`.82rem`,fontWeight:500,overflow:`hidden`,textOverflow:`ellipsis`,whiteSpace:`nowrap`},children:e.name}),(0,a.jsxs)(`div`,{style:{fontSize:`.65rem`,color:`var(--t3)`,marginTop:`.15rem`},children:[e.group,e.year?` · ${e.year}`:``]})]}),(0,a.jsx)(`div`,{style:{fontSize:`.8rem`,color:`var(--accent)`,flexShrink:0},children:`▶`})]},e.id||t))})]}),(0,a.jsx)(`div`,{style:{marginTop:`1.1rem`,textAlign:`right`},children:(0,a.jsx)(`button`,{className:`btn-cancel`,onClick:()=>b(null),children:`Close`})})]})})]})}(0,r.createRoot)(document.getElementById(`root`)).render((0,a.jsx)(i.StrictMode,{children:(0,a.jsx)(N,{})}));