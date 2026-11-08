/* Hemato HGGB · lector de fotos en segundo plano. Todo local, sin internet una vez descargado. */
'use strict';
let core=null,listo=null;
const base=self.location.href.replace(/[^/]*$/,'');
function msg(o){self.postMessage(o)}
async function bajar(nombre,etiqueta){
 const r=await fetch(base+nombre);if(!r.ok)throw new Error('No se pudo descargar '+nombre+' ('+r.status+')');
 const tot=+r.headers.get('content-length')||0;if(!r.body||!tot)return new Uint8Array(await r.arrayBuffer());
 const rd=r.body.getReader(),partes=[];let n=0,ult=0;
 for(;;){const {done,value}=await rd.read();if(done)break;partes.push(value);n+=value.length;
  if(n-ult>2e6){ult=n;msg({tipo:'avance',texto:`${etiqueta}: ${Math.round(n/1e6)} de ${Math.round(tot/1e6)} MB`})}}
 const o=new Uint8Array(n);let p=0;for(const x of partes){o.set(x,p);p+=x.length}return o}
async function iniciar(){
 msg({tipo:'avance',texto:'Cargando motor…'});
 importScripts(base+'ort.wasm.min.js',base+'clipper.js',base+'opencv.js',base+'ocr-core.js');
 // OpenCV.js se inicializa solo; no usar await sobre el módulo (su then() se resuelve a sí mismo)
 const cv=self.cv;for(let i=0;!cv.Mat&&i<1200;i++)await new Promise(r=>setTimeout(r,50));
 if(!cv.Mat)throw new Error('OpenCV no se inicializó');
 ort.env.wasm.wasmPaths=base;
 const nucleos=Math.max(1,Math.min(8,(self.navigator&&navigator.hardwareConcurrency)||1));
 ort.env.wasm.numThreads=self.crossOriginIsolated?nucleos:1;
 const det=await bajar('det.onnx','Detector');
 const rec=await bajar('rec.onnx','Reconocedor (77 MB, solo la primera vez)');
 const dic=new TextDecoder().decode(await bajar('dict.txt','Diccionario'));
 msg({tipo:'avance',texto:'Preparando modelos…'});
 core=HematoOCRCore(cv,ort,ClipperLib);await core.load(det,rec,dic);
 msg({tipo:'listo',hilos:ort.env.wasm.numThreads})}
self.onmessage=async e=>{const d=e.data;
 try{
  if(!listo)listo=iniciar();await listo;
  if(d.tipo==='preparar')return;
  if(d.tipo==='leer'){msg({tipo:'avance',texto:d.rot?`Probando la foto girada ${d.rot}°…`:'Leyendo la foto…'});
   const t0=Date.now();const r=await core.run(new Uint8ClampedArray(d.rgba),d.w,d.h,d.rot||0);
   msg({tipo:'resultado',id:d.id,rot:d.rot||0,items:r,ms:Date.now()-t0})}
 }catch(err){listo=null;msg({tipo:'error',texto:String(err&&err.message||err)})}};
