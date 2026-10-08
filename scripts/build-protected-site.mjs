import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const out = path.join(root, '_protected_site');
const password = process.env.SITE_PASSWORD || '';
const iterations = 310000;

if (password.length < 12) {
  console.error('SITE_PASSWORD must exist and be at least 12 characters.');
  process.exit(2);
}

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const globalSalt = crypto.randomBytes(16);
const key = crypto.pbkdf2Sync(password, globalSalt, iterations, 32, 'sha256');

const textExtensions = new Set(['.css', '.js', '.json']);
const dataMap = {};

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return [full];
  });
}

const dataDir = path.join(root, 'data');
if (fs.existsSync(dataDir)) {
  for (const file of walk(dataDir)) {
    if (path.extname(file) !== '.json') continue;
    const rel = '/' + path.relative(root, file).split(path.sep).join('/');
    try {
      dataMap[rel] = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      dataMap[rel] = fs.readFileSync(file, 'utf8');
    }
  }
}

function inlineCss(file, seen = new Set()) {
  const full = path.resolve(root, file);
  if (seen.has(full)) return '';
  seen.add(full);
  let css = fs.readFileSync(full, 'utf8');
  css = css.replace(/@import\s+(?:url\()?["']([^"')]+)["']\)?\s*;/g, (all, href) => {
    if (/^(https?:|data:|\/\/)/i.test(href)) return all;
    const nested = path.resolve(path.dirname(full), href);
    if (!fs.existsSync(nested)) return all;
    return inlineCss(path.relative(root, nested), seen);
  });
  return css;
}

function escapeScript(text) {
  return text.replace(/<\/script/gi, '<\\/script');
}

function dataShim() {
  const payload = JSON.stringify(dataMap).replace(/</g, '\\u003c');
  return `<script>
  (() => {
    const protectedData = ${payload};
    const nativeFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      try {
        const raw = typeof input === 'string' ? input : input?.url;
        const url = new URL(raw, location.href);
        const key = url.pathname;
        if (Object.prototype.hasOwnProperty.call(protectedData, key)) {
          const value = protectedData[key];
          const body = typeof value === 'string' ? value : JSON.stringify(value);
          return new Response(body, {status: 200, headers: {'Content-Type': 'application/json; charset=utf-8'}});
        }
      } catch {}
      return nativeFetch(input, init);
    };
  })();
  </script>`;
}

function lockControl() {
  return `<button id="travelLockButton" type="button" aria-label="Khóa TravelLog" style="position:fixed;right:14px;bottom:78px;z-index:99999;border:1px solid rgba(148,163,184,.4);border-radius:999px;background:rgba(15,23,42,.86);color:#fff;padding:8px 11px;font:700 11px system-ui;box-shadow:0 8px 24px rgba(15,23,42,.18);backdrop-filter:blur(12px);cursor:pointer">🔒 Khóa</button><script>document.getElementById('travelLockButton')?.addEventListener('click',()=>{sessionStorage.removeItem('travellog-site-key');location.replace('/')});<\/script>`;
}

function bundleHtml(file) {
  let html = fs.readFileSync(file, 'utf8');

  html = html.replace(/<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi, (all, href) => {
    if (/^(https?:|data:|\/\/)/i.test(href)) return all;
    const clean = href.split('?')[0].replace(/^\.\//, '');
    const target = path.resolve(path.dirname(file), clean);
    if (!fs.existsSync(target) || path.extname(target) !== '.css') return all;
    return '<style>\n' + inlineCss(path.relative(root, target)) + '\n</style>';
  });

  html = html.replace(/<script\b([^>]*)\bsrc=["']([^"']+)["']([^>]*)><\/script>/gi, (all, a, src, b) => {
    if (/^(https?:|data:|\/\/)/i.test(src)) return all;
    const clean = src.split('?')[0].replace(/^\.\//, '');
    const target = path.resolve(path.dirname(file), clean);
    if (!fs.existsSync(target) || path.extname(target) !== '.js') return all;
    return '<script' + a.replace(/\s*defer\s*/gi, ' ') + b + '>\n' + escapeScript(fs.readFileSync(target, 'utf8')) + '\n<\/script>';
  });

  html = html.replace(/<link\b[^>]*rel=["']manifest["'][^>]*>/gi, '');
  html = html.replace(/<script>[\s\S]*?serviceWorker\.register\([\s\S]*?<\/script>/gi, match => match);

  const shim = dataShim();
  html = html.replace(/<head>/i, '<head><meta name="robots" content="noindex,nofollow">');
  html = html.replace(/<body([^>]*)>/i, '<body$1>' + shim);
  html = html.replace(/<\/body>/i, lockControl() + '</body>');
  return html;
}

function encryptHtml(plain, title = 'TravelLog') {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([ciphertext, tag]).toString('base64');

  const saltB64 = globalSalt.toString('base64');
  const ivB64 = iv.toString('base64');

  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#f6f8fc">
<meta name="robots" content="noindex,nofollow">
<title>${title} · Locked</title>
<style>
:root{color-scheme:light dark;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(circle at 50% 15%,#eaf2ff 0,#f7f9fc 42%,#eef2f7 100%);color:#172033;padding:22px}
.lock{width:min(420px,100%);background:rgba(255,255,255,.92);border:1px solid #dfe6f1;border-radius:22px;padding:28px;box-shadow:0 24px 70px rgba(42,63,96,.14);backdrop-filter:blur(18px)}
.brand{display:flex;align-items:center;gap:10px;font-size:13px;font-weight:850}.mark{width:34px;height:34px;border-radius:11px;display:grid;place-items:center;background:#2563eb;color:#fff}
h1{font-size:24px;letter-spacing:-.035em;margin:24px 0 7px}p{margin:0;color:#64748b;font-size:12px;line-height:1.6}
form{display:grid;gap:10px;margin-top:22px}label{font-size:10px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:.05em}
.row{display:flex;gap:8px}input{min-width:0;flex:1;height:44px;border:1px solid #cfd9e8;border-radius:11px;background:#fff;color:#111827;padding:0 13px;font:600 13px system-ui;outline:none}input:focus{border-color:#7aa2ef;box-shadow:0 0 0 3px rgba(37,99,235,.12)}
button{height:44px;border:0;border-radius:11px;padding:0 16px;background:#2563eb;color:#fff;font:800 12px system-ui;cursor:pointer}
.msg{min-height:18px;margin-top:10px;font-size:11px;color:#b91c1c}.note{margin-top:17px;padding-top:15px;border-top:1px solid #e6ebf2;font-size:10.5px;color:#7b8799}
@media(prefers-color-scheme:dark){body{background:radial-gradient(circle at 50% 15%,#18243c 0,#0b1220 50%,#070c14 100%);color:#e5edf8}.lock{background:rgba(15,23,42,.92);border-color:#28364c}.mark{background:#3b82f6}p,.note{color:#94a3b8}label{color:#aab7c8}input{background:#0b1220;border-color:#334155;color:#f8fafc}.note{border-color:#263347}}
</style>
</head>
<body>
<main class="lock">
  <div class="brand"><span class="mark">✈</span>TravelLog</div>
  <h1>Nhập password để mở</h1>
  <p>Toàn bộ nội dung chuyến đi được mã hóa. Khóa giải mã chỉ tồn tại trong phiên trình duyệt này.</p>
  <form id="unlockForm">
    <label for="sitePassword">Password</label>
    <div class="row"><input id="sitePassword" type="password" autocomplete="current-password" autofocus><button type="submit">Mở khóa</button></div>
  </form>
  <div class="msg" id="message"></div>
  <div class="note">Đóng tab/browser để kết thúc phiên. Password không được lưu trong source hoặc gửi đến server.</div>
</main>
<script>
(() => {
  const SALT = '${saltB64}', IV = '${ivB64}', DATA = '${payload}', ITER = ${iterations};
  const sessionKey = 'travellog-site-key';
  const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const toB64 = a => btoa(String.fromCharCode(...new Uint8Array(a)));
  async function derive(password){
    const base = await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
    return crypto.subtle.deriveKey({name:'PBKDF2',salt:b64(SALT),iterations:ITER,hash:'SHA-256'},base,{name:'AES-GCM',length:256},true,['decrypt']);
  }
  async function decrypt(key){
    const plain = await crypto.subtle.decrypt({name:'AES-GCM',iv:b64(IV),tagLength:128},key,b64(DATA));
    return new TextDecoder().decode(plain);
  }
  async function openWithKey(key, remember=true){
    const html = await decrypt(key);
    if(remember){const raw=await crypto.subtle.exportKey('raw',key);sessionStorage.setItem(sessionKey,toB64(raw));}
    document.open();document.write(html);document.close();
  }
  async function auto(){
    const saved=sessionStorage.getItem(sessionKey); if(!saved)return;
    try{const key=await crypto.subtle.importKey('raw',b64(saved),{name:'AES-GCM'},true,['decrypt']);await openWithKey(key,false)}
    catch{sessionStorage.removeItem(sessionKey)}
  }
  document.getElementById('unlockForm').addEventListener('submit',async e=>{
    e.preventDefault();const input=document.getElementById('sitePassword'),msg=document.getElementById('message');
    msg.textContent='Đang mở khóa…';
    try{const key=await derive(input.value);await openWithKey(key,true)}
    catch{msg.textContent='Password không đúng.';input.select()}
  });
  auto();
})();
</script>
</body>
</html>`;
}

const htmlFiles = fs.readdirSync(root)
  .filter(name => name.endsWith('.html') && fs.statSync(path.join(root, name)).isFile());

for (const name of htmlFiles) {
  const bundled = bundleHtml(path.join(root, name));
  fs.writeFileSync(path.join(out, name), encryptHtml(bundled, path.basename(name, '.html')));
}

const routeMap = { flights: 'flights.html', hotels: 'hotels.html', sim: 'sim.html' };
for (const [dir, target] of Object.entries(routeMap)) {
  const routeDir = path.join(out, dir);
  fs.mkdirSync(routeDir, { recursive: true });
  fs.writeFileSync(path.join(routeDir, 'index.html'),
    '<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><script>location.replace("../' + target + '")<\/script>');
}

for (const file of ['CNAME', '.nojekyll', 'icon.svg']) {
  const src = path.join(root, file);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(out, file));
}

fs.writeFileSync(path.join(out, 'sw.js'), `
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const keys=await caches.keys();await Promise.all(keys.map(k=>caches.delete(k)));
  await self.registration.unregister();
  const clientsList=await self.clients.matchAll({type:'window'});clientsList.forEach(c=>c.navigate(c.url));
})()));
`);

fs.writeFileSync(path.join(out, '404.html'),
  '<!doctype html><meta charset="utf-8"><script>location.replace("/")<\/script>');

console.log('Protected site built:', htmlFiles.length, 'encrypted HTML pages.');
