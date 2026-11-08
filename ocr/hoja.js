/* Hemato HGGB · interpretación de la hoja de enfermería leída por OCR.
   Entrada: [{box:[[x,y]x4],text,score}]. Salida: valores por campo con marca de duda. */
(function(root){
'use strict';
const nrm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toUpperCase();
// filas impresas de la hoja (etiqueta → clave)
const FILAS=[
 [/^HORA\b/,'hora'],[/^FRE\.?\s*CARD/,'fc'],[/^PA\s*SIST/,'pa'],[/^PAM\b/,'pam'],[/^F\.?\s*RESP/,'fr'],
 [/^T\.?\s*AXIL/,'t'],[/^T\.?\s*CENTR/,'tc'],[/^PVC\b/,'x'],[/^PAP\s*SIST/,'x'],[/^PAP\.?\s*MED/,'x'],[/^PCP\b/,'x'],[/^GC\s*\/?\s*I/,'x'],[/^RVS/,'x'],
 [/^MRO\b|MMV.?BIO/,'o2'],[/^F[I1L]O\s*2$|^FIO2/,'fio2'],[/^SAT\s*[O0]\s*2/,'sat'],[/^GCS/,'gcs'],[/^EVA/,'eva'],[/^HGT$/,'hgt'],[/^DOSIS/,'x'],
 [/^AGUA\s*SONDA/,'oral'],[/^AGUA\s*END/,'x'],[/^TOTAL\s*INGRESO/,'ting'],[/^DIURESIS/,'diu'],[/^DEPOSICION/,'dep'],[/^SNG/,'x'],[/^DRENAJE/,'x'],[/^PERDIDAS/,'x'],[/^TOTAL\s*EGRESO/,'teg'],[/^TOTAL$/,'tot']];
function geo(o){const xs=o.box.map(p=>p[0]),ys=o.box.map(p=>p[1]);return {x0:Math.min(...xs),x1:Math.max(...xs),y0:Math.min(...ys),y1:Math.max(...ys),xc:(Math.min(...xs)+Math.max(...xs))/2,yc:(Math.min(...ys)+Math.max(...ys))/2}}
function filaDe(t){const u=nrm(t).trim();for(const [re,k] of FILAS)if(re.test(u))return k;return null}
const dig=s=>(String(s).match(/\d/g)||[]).join('');
// ---------- lectura de cada tipo de valor ----------
const LEE={
 hora(t){const d=dig(t);if(/^0?8/.test(d))return '08';if(/^12/.test(d))return '12';if(/^16/.test(d))return '16';if(/^20/.test(d))return '20';if(/^(24|00)/.test(d))return '24';if(/^0?4/.test(d))return '04';return null},
 fc(t){if(/\//.test(t))return null;const d=dig(t);if(!d)return null;let v=+d.slice(0,3);if(d.length>=3&&v>=30&&v<=220)return {v,d:d.length>3&&!/^\d{3}\D/.test(t)};v=+d.slice(0,2);return v>=30&&v<=220?{v,d:d.length>2}:null},
 pa(t,ctx){let c=[];const m=t.match(/(\d{2,3})\s*[\/|1lI]\s*(\d{2,3})/);
  const s=dig(t);if(t.includes('/')){const p=t.split('/');const a=+dig(p[0]),b=+dig(p[1]);if(a&&b)c.push([a,b,0])}
  for(let i=2;i<=3&&i<s.length;i++){const a=+s.slice(0,i),r=s.slice(i);c.push([a,+r,r.length>3?2:1]);if(r.length===3&&/[17]/.test(r[0]))c.push([a,+r.slice(1),1])}
  c=c.filter(([a,b])=>a>=60&&a<=230&&b>=25&&b<=140&&a>b);if(!c.length)return null;
  const pam=ctx&&ctx.pam;if(pam){c.sort((x,y)=>Math.abs((x[0]+2*x[1])/3-pam)-Math.abs((y[0]+2*y[1])/3-pam)||x[2]-y[2]);const k=c[0];const err=Math.abs((k[0]+2*k[1])/3-pam);return {v:k[0]+'/'+k[1],s:k[0],dd:k[1],d:err>6||k[2]>1}}
  c.sort((x,y)=>x[2]-y[2]);return {v:c[0][0]+'/'+c[0][1],s:c[0][0],dd:c[0][1],d:c[0][2]>0||c.length>1}},
 pam(t){const d=dig(t);if(!d)return null;const v=+d;if(v>=40&&v<=160)return {v,d:false};if(d.length===3){const a=+(d[0]+d[2]);if(a>=40&&a<=160)return {v:a,d:true}}return null},
 fr(t){const d=dig(t);const v=+d.slice(0,2);return d&&v>=6&&v<=60?{v,d:d.length>2}:null},
 t(t){const m=t.match(/(3\d|4[0-2])\s*[.,]\s*(\d)/);if(m)return {v:+(m[1]+'.'+m[2]),d:false};const d=dig(t);
  if(/^(3[4-9]|4[0-2])$/.test(d))return {v:+d,d:false};if(/^(3[4-9]|4[0-2])\d$/.test(d))return {v:+(d.slice(0,2)+'.'+d[2]),d:!/[.,]/.test(t)};return null},
 fio2(t){const d=dig(t);if(/^100/.test(d))return {v:100,d:false};let v=+d.slice(0,2);if(d.length>=2&&v>=21&&v<=99)return {v,d:!(d.length===2||/%/.test(t)||/^\d\d[.,]?1$/.test(d))&&d.length>2&&!/^21/.test(d)};
  if(/^2/.test(d)||/^2[iIl!|]/.test(t.trim()))return {v:21,d:true};return null},
 sat(t){const d=dig(t);if(/^100/.test(d))return {v:100,d:false};const v=+d.slice(0,2);return d.length>=2&&v>=60&&v<=99?{v,d:false}:null},
 eva(t){const u=t.trim();if(/^[0oO°()]+\.?$/.test(u))return {v:0,d:false};const d=dig(u);if(d&&+d<=10)return {v:+d,d:false};return null},
 gcs(t){const d=dig(t);if(d&&+d>=3&&+d<=15)return {v:+d,d:false};return null},
 hgt(t){const d=dig(t);const v=+d.slice(0,3);return d&&v>=30&&v<=600?{v,d:false}:null},
 diu(t){const d=dig(t);return d&&+d>0&&+d<=5000?{v:+d,d:false}:null},
 oral(t){return LEE.diu(t)},ting(t){return LEE.diu(t)},teg(t){return LEE.diu(t)},
 dep(t){return /N|\+/i.test(t)?{v:t.trim(),d:false}:null},
 tc(t){return LEE.t(t)},o2(){return null},tot(){return null},x(){return null}};
// ---------- signos vitales y egresos: filas por etiqueta, columnas por posición ----------
function hojaSV(items){
 const G=items.map(o=>({...o,...geo(o)}));
 const labels=G.filter(o=>filaDe(o.text)).map(o=>({k:filaDe(o.text),y:o.yc,x1:o.x1}));
 if(labels.filter(l=>l.k!=='x').length<3)return null;
 labels.sort((a,b)=>a.y-b.y);
 const lx=Math.max(...labels.map(l=>l.x1));const mh=medianH(labels,G);
 const gaps=labels.slice(1).map((l,i)=>l.y-labels[i].y).sort((a,b)=>a-b),mg=gaps[Math.floor(gaps.length/2)]||30;
 const bloques=[];labels.forEach((l,i)=>{if(!i||l.y-labels[i-1].y>2.5*mg)bloques.push({labels:[],y0:l.y,y1:l.y});const B=bloques[bloques.length-1];B.labels.push(l);B.y1=l.y});
 const V=G.filter(o=>!filaDe(o.text)&&o.x0>lx-10&&/\d|^[oO()]+\.?$/.test(o.text));
 // columnas: agrupar por x
 const xs=V.map(v=>v.xc).sort((a,b)=>a-b);const cols=[];xs.forEach(x=>{const c=cols.find(c=>Math.abs(c.x-x)<70);if(c){c.n++;c.x=(c.x*(c.n-1)+x)/c.n}else cols.push({x,n:1})});
 const out=[];
 cols.sort((a,b)=>a.x-b.x).forEach(col=>{const vals=V.filter(v=>Math.abs(v.xc-col.x)<70).sort((a,b)=>a.yc-b.yc);if(vals.length<2)return;
  // desplazamiento vertical por bloque de filas (foto inclinada o curva): el que mejor calza contenido y posición
  const asg={};
  bloques.forEach(B=>{const vb=vals.filter(v=>v.yc>B.y0-70&&v.yc<B.y1+70);if(!vb.length)return;const LB=B.labels;
   let best=null;for(let s=-90;s<=90;s+=2){let cost=0;const used={};
    vb.forEach(v=>{let bc=1e9,bk=null;LB.forEach((l,i)=>{const c=costo(l,v,Math.abs(v.yc-(l.y+s)));if(c<bc){bc=c;bk=i}});cost+=bc+(used[bk]?30:0);used[bk]=1});
    if(B.ref!=null)cost+=0.4*Math.abs(s-B.ref);
    if(!best||cost<best.cost)best={s,cost}}
   if(B.ref==null&&vb.length>=2)B.ref=best.s;
   vb.forEach(v=>{let bc=1e9,bk=null;LB.forEach((l,i)=>{const c=costo(l,v,Math.abs(v.yc-(l.y+best.s)));if(c<bc){bc=c;bk=i}});
    const k=LB[bk].k,tall=(v.y1-v.y0)>2.4*mh;if(!asg[k]||asg[k].c>bc)asg[k]={v,c:bc,tall}})});
  const c={x:col.x,hora:null,f:{}};
  if(asg.hora)c.hora=LEE.hora(asg.hora.v.text);
  const raw=k=>asg[k]?asg[k].v.text:null;
  const pam=asg.pam?LEE.pam(asg.pam.v.text):null;
  ['fc','pam','fr','t','tc','fio2','sat','eva','gcs','hgt','diu','dep','oral'].forEach(k=>{if(!asg[k])return;const r=LEE[k](asg[k].v.text,{});c.f[k]={raw:raw(k),v:r&&!asg[k].tall?r.v:null,d:!r||r.d||asg[k].tall||asg[k].v.score<0.8,box:asg[k].v.box}});
  if(asg.pa){const r=LEE.pa(asg.pa.v.text,{pam:pam&&!pam.d?pam.v:null});c.f.pa={raw:raw('pa'),v:r?r.v:null,d:!r||r.d||asg.pa.v.score<0.8,box:asg.pa.v.box}}
  if(c.f.tc&&!c.f.t){c.f.t=c.f.tc}delete c.f.tc;
  if(!c.f.t&&asg.fr){const r=LEE.t(asg.fr.v.text);if(r){c.f.t={raw:asg.fr.v.text,v:r.v,d:true,nota:'escrita en la fila de FR',box:asg.fr.v.box};delete c.f.fr}}
  if(c.f.fr&&c.f.fr.v!=null&&c.f.fr.v>=34&&!c.f.t){const r=LEE.t(c.f.fr.raw);if(r){c.f.t={raw:c.f.fr.raw,v:r.v,d:true,nota:'escrita en la fila de FR',box:c.f.fr.box};delete c.f.fr}}
  if(!c.f.eva&&asg.gcs){const r=LEE.eva(asg.gcs.v.text);if(r&&r.v===0){c.f.eva={raw:asg.gcs.v.text,v:0,d:true,nota:'escrita en la fila de GCS',box:asg.gcs.v.box};delete c.f.gcs}}
  // PAM y PA deben calzar
  if(c.f.pa&&c.f.pa.v&&c.f.pam&&c.f.pam.v){const [s,d]=c.f.pa.v.split('/').map(Number),calc=Math.round((s+2*d)/3);if(Math.abs(calc-c.f.pam.v)>6){c.f.pa.d=true;c.f.pam.d=true;c.f.pam.nota='no calza con PA (calculada '+calc+')'}}
  if(c.f.pa&&c.f.pa.v&&(!c.f.pam||c.f.pam.v==null)){const [s,d]=c.f.pa.v.split('/').map(Number);c.f.pam={raw:null,v:Math.round((s+2*d)/3),d:c.f.pa.d,nota:'calculada'}}
  if(Object.keys(c.f).length)out.push(c)});
 return out.length?out:null}
function costo(l,v,dy){const f=LEE[l.k]&&LEE[l.k](v.text,{});let c=dy+(f?0:22)+(l.k==='x'?15:0);if(l.k==='pa'&&/\d\s*\/\s*\d/.test(v.text))c-=12;if(l.k!=='pa'&&/\d\s*\/\s*\d/.test(v.text))c+=12;return c}
function medianH(labels,G){const h=G.filter(o=>filaDe(o.text)).map(o=>o.y1-o.y0).sort((a,b)=>a-b);return h[Math.floor(h.length/2)]||30}
// ---------- balance hídrico escrito a mano ----------
function hojaBH(items){const R=[];
 items.forEach(o=>{const t=o.text.replace(/\s+/g,'');const m=t.match(/[BbPp8ß][HhN](?=[^a-z]|$)/);if(!m)return;
  let r=t.slice(m.index+2).replace(/^[:=;.,：]+/,'');let signo=null;
  if(/^[(（]?[-−–—一][)）]?/.test(r)){signo='-';r=r.replace(/^[(（]?[-−–—一][)）]?/,'')}
  else if(/^[(（]?\+[)）]?/.test(r)){signo='+';r=r.replace(/^[(（]?\+[)）]?/,'')}
  else if(/^[(（].?[)）]?(?=\d)/.test(r)){r=r.replace(/^[(（].?[)）]?/,'')}
  else if(/^[OoQ0GΘ⊖θ@]\d/.test(r)&&!/^0[.,]/.test(r)){signo='-?';r=r.slice(1)}
  r=r.replace(/^[=:]+/,'');let num=(r.match(/^[\d.,]+/)||[''])[0];const resto=r.slice(num.length);
  num=num.replace(/[.,](?=\d{3}(\D|$))/g,'').replace(/[.,]+$/,'');
  let h24=/24/.test(resto)||/24\s*h/i.test(t);
  if(num.length>4&&/24$/.test(num)&&/^[hHVvUuyYs)\]]/.test(resto||'h')){num=num.slice(0,-2);h24=true}
  if(!num)return;const largo=num.length>5;if(largo)num=num.slice(0,4);if(+num>20000)return;
  R.push({raw:o.text,v:+num,signo:signo==='-?'?'-':signo,dudaSigno:signo===null||signo==='-?',d:o.score<0.8||largo,largo,h24,box:o.box})});
 // los dos BH de 12 h suman el de 24 h: deducir signos
 const t24=R.find(x=>x.h24),p12=R.filter(x=>!x.h24);
 if(t24&&p12.length===2){const sol=[];for(const a of [1,-1])for(const b of [1,-1])for(const c of [1,-1]){if(Math.abs(a*p12[0].v+b*p12[1].v-c*t24.v)<=5)sol.push([a,b,c])}
  const comp=(x,sg)=>!x.signo||x.dudaSigno||(x.signo==='-'?-1:1)===sg;
  let ok=sol.filter(([a,b,c])=>comp(p12[0],a)&&comp(p12[1],b)&&comp(t24,c));
  if(ok.length>1){const ag=x=>[[p12[0],x[0]],[p12[1],x[1]],[t24,x[2]]].filter(([y,sg])=>y.signo&&(y.signo==='-'?-1:1)===sg).length;const mx=Math.max(...ok.map(ag));const top=ok.filter(x=>ag(x)===mx);if(mx>0&&top.length===1)ok=top}
  if(ok.length===1){const [a,b,c]=ok[0];[[p12[0],a],[p12[1],b],[t24,c]].forEach(([x,sg])=>{x.signo=sg<0?'-':'+';x.dudaSigno=false;x.cuadra=true})}
  else if(sol.length===0)R.forEach(x=>x.noCuadra=true)}
 return R}
// ---------- hoja de HGT ----------
function hojaHGT(items){const R=[];items.forEach(o=>{const m=o.text.replace(/\s/g,'').match(/(\d{2,3})(m[gq]|rg|mg|my|ng|M)/i);if(m&&+m[1]>=30&&+m[1]<=600)R.push({raw:o.text,v:+m[1],y:geo(o).yc})});R.sort((a,b)=>a.y-b.y);return R}
function interpretar(items){
 const sv=hojaSV(items),bh=hojaBH(items),hgt=hojaHGT(items);
 return {sv,bh,hgt,vacio:!sv&&!bh.length&&hgt.length<2}}
const api={interpretar,hojaSV,hojaBH,hojaHGT,LEE,filaDe};
root.HematoHoja=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
