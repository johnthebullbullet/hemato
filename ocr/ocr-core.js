/* Hemato HGGB · motor OCR (PaddleOCR PP-OCRv6: detector tiny + reconocedor medium)
   Réplica en JavaScript del flujo de RapidOCR (Python) con OpenCV.js, Clipper y ONNX Runtime Web.
   Sin internet: todo corre en el dispositivo. */
(function(root){
'use strict';
function HematoOCRCore(cv,ort,ClipperLib){
 const P={limitSide:736,thresh:0.3,boxThresh:0.5,maxCand:1000,unclip:1.6,minSize:3,recH:48,recW:320,batch:6,textScore:0.3,maxSide:2000,minSide:30,whRatio:8,minHeight:30};
 let det=null,rec=null,chars=null;
 async function load(detBytes,recBytes,dictText){
  const opt={executionProviders:['wasm'],graphOptimizationLevel:'all'};
  det=await ort.InferenceSession.create(detBytes,opt);
  rec=await ort.InferenceSession.create(recBytes,opt);
  const L=dictText.replace(/\r/g,'').split('\n');if(L.length&&L[L.length-1]==='')L.pop();
  chars=['blank',...L,' '];
 }
 // ---------- utilidades ----------
 function resizeMat(src,w,h,interp){const d=new cv.Mat();cv.resize(src,d,new cv.Size(w,h),0,0,interp===undefined?cv.INTER_LINEAR:interp);return d}
 function toCHW(mat,mean,std){ // mat BGR uint8 → Float32 CHW normalizado (x/255-mean)/std
  const h=mat.rows,w=mat.cols,d=mat.data,o=new Float32Array(3*h*w),hw=h*w;
  for(let i=0;i<hw;i++){for(let c=0;c<3;c++){o[c*hw+i]=(d[i*3+c]/255-mean)/std}}return o}
 function dist(a,b){return Math.hypot(a[0]-b[0],a[1]-b[1])}
 function polyArea(p){let s=0;for(let i=0;i<p.length;i++){const j=(i+1)%p.length;s+=p[i][0]*p[j][1]-p[j][0]*p[i][1]}return Math.abs(s)/2}
 function polyLen(p){let s=0;for(let i=0;i<p.length;i++)s+=dist(p[i],p[(i+1)%p.length]);return s}
 function rectPoints(rr){const p=cv.RotatedRect.points(rr);return p.map(q=>[q.x,q.y])}
 function miniBox(pts){ // pts: [[x,y],...] float
  const m=cv.matFromArray(pts.length,1,cv.CV_32FC2,pts.flat());const rr=cv.minAreaRect(m);m.delete();
  const p=rectPoints(rr).sort((a,b)=>a[0]-b[0]);
  let i1,i2,i3,i4;if(p[1][1]>p[0][1]){i1=0;i4=1}else{i1=1;i4=0}if(p[3][1]>p[2][1]){i2=2;i3=3}else{i2=3;i3=2}
  return {box:[p[i1],p[i2],p[i3],p[i4]],sside:Math.min(rr.size.width,rr.size.height)}}
 function boxScoreFast(pred,W,H,box){
  const xs=box.map(b=>b[0]),ys=box.map(b=>b[1]);
  const cl=(v,a,b)=>Math.min(Math.max(v,a),b);
  const xmin=cl(Math.floor(Math.min(...xs)),0,W-1),xmax=cl(Math.ceil(Math.max(...xs)),0,W-1),ymin=cl(Math.floor(Math.min(...ys)),0,H-1),ymax=cl(Math.ceil(Math.max(...ys)),0,H-1);
  const mw=xmax-xmin+1,mh=ymax-ymin+1;const mask=cv.Mat.zeros(mh,mw,cv.CV_8UC1);
  const pts=cv.matFromArray(4,1,cv.CV_32SC2,box.flatMap(b=>[Math.trunc(b[0]-xmin),Math.trunc(b[1]-ymin)]));
  const mv=new cv.MatVector();mv.push_back(pts);cv.fillPoly(mask,mv,new cv.Scalar(1));
  let s=0,n=0;const md=mask.data;
  for(let y=0;y<mh;y++)for(let x=0;x<mw;x++){if(md[y*mw+x]){s+=pred[(ymin+y)*W+(xmin+x)];n++}}
  mask.delete();pts.delete();mv.delete();return n?s/n:0}
 function unclip(box){
  const d=polyArea(box)*P.unclip/polyLen(box);
  const co=new ClipperLib.ClipperOffset();
  co.AddPath(box.map(p=>({X:Math.trunc(p[0]),Y:Math.trunc(p[1])})),ClipperLib.JoinType.jtRound,ClipperLib.EndType.etClosedPolygon);
  const sol=new ClipperLib.Paths();co.Execute(sol,d);
  if(!sol.length)return null;return sol[0].map(q=>[q.X,q.Y])}
 function orderClockwise(pts){
  const xs=[...pts].map((p,i)=>[p,i]).sort((a,b)=>a[0][0]-b[0][0]||a[1]-b[1]).map(x=>x[0]);
  const left=[xs[0],xs[1]].sort((a,b)=>a[1]-b[1]),right=[xs[2],xs[3]].sort((a,b)=>a[1]-b[1]);
  return [left[0],right[0],right[1],left[1]]}
 // ---------- detección ----------
 async function detect(img){
  const h=img.rows,w=img.cols;let ratio=1;
  if(Math.min(h,w)<P.limitSide)ratio=h<w?P.limitSide/h:P.limitSide/w;
  let rh=Math.trunc(h*ratio),rw=Math.trunc(w*ratio);rh=Math.round(rh/32)*32;rw=Math.round(rw/32)*32;
  const rs=resizeMat(img,rw,rh);const t=new ort.Tensor('float32',toCHW(rs,0.5,0.5),[1,3,rh,rw]);rs.delete();
  const out=await det.run({[det.inputNames[0]]:t});const pr=out[det.outputNames[0]];
  const H=pr.dims[2],W=pr.dims[3],pred=pr.data;
  const seg=new cv.Mat(H,W,cv.CV_8UC1);const sd=seg.data;for(let i=0;i<H*W;i++)sd[i]=pred[i]>P.thresh?1:0;
  const k=cv.Mat.ones(2,2,cv.CV_8U);const dil=new cv.Mat();cv.dilate(seg,dil,k);seg.delete();k.delete();
  const bin=new cv.Mat();dil.convertTo(bin,cv.CV_8U,255);dil.delete();
  const cs=new cv.MatVector(),hi=new cv.Mat();cv.findContours(bin,cs,hi,cv.RETR_LIST,cv.CHAIN_APPROX_SIMPLE);bin.delete();hi.delete();
  const boxes=[],scores=[];const n=Math.min(cs.size(),P.maxCand);
  for(let i=0;i<n;i++){const c=cs.get(i);const d=c.data32S;const pts=[];for(let j=0;j<d.length;j+=2)pts.push([d[j],d[j+1]]);c.delete();
   let r=miniBox(pts);if(r.sside<P.minSize)continue;
   const sc=boxScoreFast(pred,W,H,r.box);if(P.boxThresh>sc)continue;
   const ex=unclip(r.box);if(!ex)continue;r=miniBox(ex);if(r.sside<P.minSize+2)continue;
   const b=r.box.map(p=>[Math.min(Math.max(Math.round(p[0]/W*w),0),w),Math.min(Math.max(Math.round(p[1]/H*h),0),h)]);
   boxes.push(b);scores.push(sc)}
  cs.delete();
  const fb=[],fs=[];boxes.forEach((b,i)=>{let o=orderClockwise(b).map(p=>[Math.trunc(Math.min(Math.max(p[0],0),w-1)),Math.trunc(Math.min(Math.max(p[1],0),h-1))]);
   if(Math.trunc(dist(o[0],o[1]))<=3||Math.trunc(dist(o[0],o[3]))<=3)return;fb.push(o);fs.push(scores[i])});
  // orden: por y estable, líneas por dy>=10, luego x
  const idx=fb.map((b,i)=>i).sort((a,b)=>fb[a][0][1]-fb[b][0][1]||a-b);
  let line=0;const lid=[];idx.forEach((ix,k)=>{if(k>0&&fb[ix][0][1]-fb[idx[k-1]][0][1]>=10)line++;lid.push(line)});
  const ord=idx.map((ix,k)=>({ix,l:lid[k],x:fb[ix][0][0],k})).sort((a,b)=>a.l-b.l||a.x-b.x||a.k-b.k).map(o=>o.ix);
  return ord.map(i=>fb[i])}
 function cropBox(img,b){
  const cw=Math.trunc(Math.max(dist(b[0],b[1]),dist(b[2],b[3]))),ch=Math.trunc(Math.max(dist(b[0],b[3]),dist(b[1],b[2])));
  const s=cv.matFromArray(4,1,cv.CV_32FC2,b.flat()),d=cv.matFromArray(4,1,cv.CV_32FC2,[0,0,cw,0,cw,ch,0,ch]);
  const M=cv.getPerspectiveTransform(s,d);const o=new cv.Mat();cv.warpPerspective(img,o,M,new cv.Size(cw,ch),cv.INTER_CUBIC,cv.BORDER_REPLICATE);
  s.delete();d.delete();M.delete();
  if(o.rows/o.cols>=1.5){const r=new cv.Mat();cv.rotate(o,r,cv.ROTATE_90_COUNTERCLOCKWISE);o.delete();return r}
  return o}
 // ---------- reconocimiento ----------
 async function recognize(crops){
  const n=crops.length,res=new Array(n).fill(null).map(()=>['',0]);
  const wr=crops.map(c=>c.cols/c.rows);
  const ind=wr.map((r,i)=>i).sort((a,b)=>wr[a]-wr[b]||a-b);
  for(let b0=0;b0<n;b0+=P.batch){const b1=Math.min(n,b0+P.batch);let maxR=P.recW/P.recH;
   for(let i=b0;i<b1;i++){maxR=Math.max(maxR,wr[ind[i]])}
   const IW=Math.trunc(P.recH*maxR),bs=b1-b0,buf=new Float32Array(bs*3*P.recH*IW);
   for(let i=b0;i<b1;i++){const c=crops[ind[i]];const ratio=c.cols/c.rows;let rw=Math.ceil(P.recH*ratio)>IW?IW:Math.ceil(P.recH*ratio);
    const rs=resizeMat(c,rw,P.recH);const d=rs.data,off=(i-b0)*3*P.recH*IW;
    for(let y=0;y<P.recH;y++)for(let x=0;x<rw;x++)for(let ch=0;ch<3;ch++)buf[off+ch*P.recH*IW+y*IW+x]=(d[(y*rw+x)*3+ch]/255-0.5)/0.5;
    rs.delete()}
   const out=await rec.run({[rec.inputNames[0]]:new ort.Tensor('float32',buf,[bs,3,P.recH,IW])});const pr=out[rec.outputNames[0]];
   const T=pr.dims[1],C=pr.dims[2],pd=pr.data;
   for(let bi=0;bi<bs;bi++){let txt='',conf=[],prev=-1;
    for(let t=0;t<T;t++){let mi=0,mv=-Infinity;const o=(bi*T+t)*C;for(let c=0;c<C;c++){const v=pd[o+c];if(v>mv){mv=v;mi=c}}
     if(mi!==prev&&mi!==0){txt+=chars[mi]||'';conf.push(Math.round(mv*1e5)/1e5)}prev=mi}
    const sc=conf.length?conf.reduce((a,b)=>a+b,0)/conf.length:0;res[ind[b0+bi]]=[txt,Math.round(sc*1e5)/1e5]}}
  return res}
 // ---------- flujo completo ----------
 // rgba: Uint8ClampedArray (w*h*4). Devuelve [{box,text,score}] en coordenadas de la imagen original.
 async function run(rgba,w,h,rot){
  const src=new cv.Mat(h,w,cv.CV_8UC4);src.data.set(rgba);let img=new cv.Mat();cv.cvtColor(src,img,cv.COLOR_RGBA2BGR);src.delete();
  if(rot===90||rot===270){const t=new cv.Mat();cv.rotate(img,t,rot===90?cv.ROTATE_90_COUNTERCLOCKWISE:cv.ROTATE_90_CLOCKWISE);img.delete();img=t;const tmp=w;w=h;h=tmp}
  let rh=1,rw=1;
  if(Math.max(h,w)>P.maxSide){const r=h>w?P.maxSide/h:P.maxSide/w;let nh=Math.round(Math.trunc(h*r)/32)*32,nw=Math.round(Math.trunc(w*r)/32)*32;const t=resizeMat(img,nw,nh);img.delete();img=t;rh=h/nh;rw=w/nw}
  const boxes=await detect(img);
  const crops=boxes.map(b=>cropBox(img,b));img.delete();
  const rr=crops.length?await recognize(crops):[];crops.forEach(c=>c.delete());
  const out=[];boxes.forEach((b,i)=>{const [t,s]=rr[i];if(!t||s<P.textScore)return;out.push({box:b.map(p=>[p[0]*rw,p[1]*rh]),text:t,score:s})});
  return out}
 return {load,run,P}
}
root.HematoOCRCore=HematoOCRCore;
if(typeof module!=='undefined')module.exports=HematoOCRCore;
})(typeof window!=='undefined'?window:globalThis);
