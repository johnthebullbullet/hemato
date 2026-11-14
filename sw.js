// Hemato HGGB · service worker · cambiar VERSION en cada actualización de la app.
// Los archivos del lector de fotos (carpeta ocr/) van en su propio caché y se descargan una sola vez;
// cambiar OCR_CACHE solo si cambian los modelos o el motor.
const VERSION='hemato-v18';
const OCR_CACHE='hemato-ocr-1';
const FILES=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./ocr/hoja.js','./lote.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(FILES)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==VERSION&&x!==OCR_CACHE).map(x=>caches.delete(x)))));self.clients.claim()});
// Aislamiento entre orígenes: permite que el lector use varios núcleos del dispositivo.
function aislar(r){if(!r||r.status===0||r.type==='opaque')return r;const h=new Headers(r.headers);
 h.set('Cross-Origin-Opener-Policy','same-origin');h.set('Cross-Origin-Embedder-Policy','require-corp');h.set('Cross-Origin-Resource-Policy','same-origin');
 return new Response(r.body,{status:r.status,statusText:r.statusText,headers:h})}
self.addEventListener('fetch',e=>{const req=e.request;if(req.method!=='GET')return;
 const url=new URL(req.url);if(url.origin!==self.location.origin)return;
 const esOCR=/\/ocr\/[^/]+$/.test(url.pathname)&&!/\/ocr\/hoja\.js$/.test(url.pathname);
 if(esOCR){ // primero caché: los modelos pesan ~100 MB
  e.respondWith(caches.open(OCR_CACHE).then(c=>c.match(req,{ignoreSearch:true}).then(hit=>hit?aislar(hit):fetch(req).then(r=>{if(r.ok)c.put(req,r.clone());return aislar(r)}))));return}
 e.respondWith(fetch(req).then(r=>{const cp=r.clone();caches.open(VERSION).then(c=>c.put(req,cp));return aislar(r)})
  .catch(()=>caches.match(req,{ignoreSearch:true}).then(r=>aislar(r||null)||caches.match('./index.html').then(aislar))))});
