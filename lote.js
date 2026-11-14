/* Hemato HGGB · carga en lote: cabeceras, notas, huellas, combinación del día y novedades.
   Lógica pura (sin DOM): se prueba en Node y se usa en la app. Sin internet, sin IA: solo reglas. */
(function(root){
'use strict';
const nrm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
const cap=s=>s?s.charAt(0).toUpperCase()+s.slice(1):s;
const dot=s=>{s=String(s||'').trim();return !s?'':(/[.?!:»"]$/.test(s)?s:s+'.')};
const pad=n=>String(n).padStart(2,'0');
// ───────── fechas ─────────
function iso(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
function addDays(f,n){const d=new Date(f+'T12:00');d.setDate(d.getDate()+n);return iso(d)}
function diasEntre(a,b){return Math.round((new Date(b+'T12:00')-new Date(a+'T12:00'))/86400000)}
function dm(f){const p=f.split('-');return p[2]+'/'+p[1]}
// "hoy 14/11", "ayer 13/11", "el 10/11" según la fecha de hoy
function rel(f,hoy){const n=diasEntre(f,hoy);return n===0?'hoy '+dm(f):n===1?'ayer '+dm(f):'el '+dm(f)}
function fechaDe(txt,anioRef){ // dd/mm/aaaa, dd-mm-aa, dd.mm
 const m=String(txt).match(/\b(\d{1,2})[\/.\-](\d{1,2})(?:[\/.\-](\d{2,4}))?\b/);if(!m)return null;
 let y=m[3]?+m[3]:anioRef||new Date().getFullYear();if(y<100)y+=2000;const d=+m[1],mo=+m[2];if(d<1||d>31||mo<1||mo>12)return null;
 return y+'-'+pad(mo)+'-'+pad(d)}
// ───────── huellas (SHA-256 síncrono) ─────────
const K=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
function sha256(str){const b=new TextEncoder().encode(str),l=b.length,nb=((l+9+63)>>6)<<6,m=new Uint8Array(nb);m.set(b);m[l]=0x80;const dv=new DataView(m.buffer);dv.setUint32(nb-4,l*8);
 let h=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];const w=new Uint32Array(64);const r=(x,n)=>(x>>>n)|(x<<(32-n));
 for(let o=0;o<nb;o+=64){for(let i=0;i<16;i++)w[i]=dv.getUint32(o+i*4);for(let i=16;i<64;i++){const s0=r(w[i-15],7)^r(w[i-15],18)^(w[i-15]>>>3),s1=r(w[i-2],17)^r(w[i-2],19)^(w[i-2]>>>10);w[i]=(w[i-16]+s0+w[i-7]+s1)|0}
  let [a,bb,c,d,e,f,g,hh]=h;for(let i=0;i<64;i++){const S1=r(e,6)^r(e,11)^r(e,25),ch=(e&f)^(~e&g),t1=(hh+S1+ch+K[i]+w[i])|0,S0=r(a,2)^r(a,13)^r(a,22),mj=(a&bb)^(a&c)^(bb&c),t2=(S0+mj)|0;hh=g;g=f;f=e;e=(d+t1)|0;d=c;c=bb;bb=a;a=(t1+t2)|0}
  h=[h[0]+a,h[1]+bb,h[2]+c,h[3]+d,h[4]+e,h[5]+f,h[6]+g,h[7]+hh].map(x=>x|0)}
 return h.map(x=>(x>>>0).toString(16).padStart(8,'0')).join('')}
const SAL='hemato-hggb|';
const PARTICULAS=new Set(['de','del','la','las','los','y','da','van','von','san','mc']);
function tokensNombre(n){return nrm(n).replace(/[^a-zñ\s]/g,' ').split(/\s+/).filter(t=>t.length>=2&&!PARTICULAS.has(t))}
function huellaTokens(n){return [...new Set(tokensNombre(n).map(t=>sha256(SAL+'t|'+t).slice(0,16)))]}
function normRut(r){return String(r||'').toUpperCase().replace(/[^0-9K]/g,'').replace(/^0+/,'')}
function huellaRut(r){const n=normRut(r);return n.length>=7?sha256(SAL+'r|'+n).slice(0,20):null}
function iniciales(n){return tokensNombre(n).map(t=>t[0].toUpperCase()).join('')}
// ¿las iniciales guardadas en la app calzan con el nombre del documento? (tolerante: orden y letras faltantes)
function inicialesCompat(docNombre,appNombre){const d=iniciales(docNombre),a=String(appNombre||'').toUpperCase().replace(/[^A-ZÑ]/g,'');
 if(a.length<2||d.length<2)return false;let i=0;for(const c of d){if(c===a[i])i++}if(i>=Math.min(a.length,3))return true;
 const sa=new Set(a);return [...d].filter(c=>sa.has(c)).length>=Math.min(3,a.length)}
// ───────── cabecera de un documento o nota ─────────
function cabecera(t){const r={};const T=String(t||'');
 let m=T.match(/Paciente\s*:?\s*([^\n]+?)\s*[-–]\s*RUN\s*:?\s*([\dkK.\-]+)/i);if(m){r.nombre=m[1].trim();r.run=m[2]}
 if(!r.run){m=T.match(/\b(?:RUN|RUT)\s*:?\s*(\d{1,2}\.?\d{3}\.?\d{3}\s*-\s*[\dkK])/i);if(m)r.run=m[1]}
 if(!r.nombre){m=T.match(/(?:Nombre(?: del paciente)?|Paciente)\s*:\s*([A-ZÁÉÍÓÚÑa-záéíóúñ ,]{5,60})/);if(m)r.nombre=m[1].replace(/\s+(RUN|RUT|Edad|Ficha).*$/i,'').trim()}
 m=T.match(/(?:Sala\s*\/?\s*)?Cama\s*:?\s*(\d{1,2})\s*[-–.\/ ]\s*(\d)\b/i)||T.match(/\bSala\s*:?\s*(\d{1,2})\s*[-–. ]?\s*Cama\s*:?\s*(\d)\b/i);if(m)r.cama=(+m[1])+'-'+m[2];
 m=T.match(/Fecha(?:\s+(?:y\s+hora|de\s+(?:la\s+)?(?:evoluci[oó]n|atenci[oó]n|registro)))?\s*:?\s*(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4})(?:\s*(?:a las|-|,|hora:?)?\s*(\d{1,2}):(\d{2}))?/i);
 if(m){r.fecha=fechaDe(m[1]);if(m[2])r.hora=pad(m[2])+':'+m[3]}
 if(!r.hora){m=T.match(/\bHora\s*:?\s*(\d{1,2}):(\d{2})/i);if(m)r.hora=pad(m[1])+':'+m[2]}
 return r}
// ───────── partir un texto en notas ─────────
const MARCA=/^\s*(CMR|C\.?M\.?R\.?|HEMATOLOG[IÍ]A|COMENTARIO|EVOLUCI[OÓ]N(?: M[EÉ]DICA)?|CONTROL M[EÉ]DICO(?: RESIDENTE)?)\s*:?\s*$/i;
const HORA_SOLA=/^\s*(\d{1,2})[:.](\d{2})\s*(h|hrs|horas)?\s*$/i;
function partirNotas(text){const L=String(text||'').replace(/\r/g,'').split('\n');const out=[];let cur={lineas:[],marca:null};
 const cerrar=()=>{const t=cur.lineas.join('\n').trim();if(t)out.push({texto:t,marca:cur.marca,hora:cur.hora||null});cur={lineas:[],marca:null}};
 L.forEach((l,i)=>{const tl=l.trim();
  if(MARCA.test(tl)){cerrar();cur.marca=tl.toUpperCase();return}
  const hm=tl.match(HORA_SOLA);if(hm&&cur.lineas.some(x=>x.trim())){cerrar();cur.hora=pad(hm[1])+':'+hm[2];return}
  if(/^\s*Paciente\s*:?.+RUN/i.test(tl)&&cur.lineas.filter(x=>x.trim()).length>3){cerrar()}
  cur.lineas.push(l)});
 cerrar();return out}
// ───────── frases ─────────
const ENC_PLAN=/^\s*(plan(?:es)?|problemas y planes)\s*:?\s*$/i,ENC_IND=/^\s*indicaciones\b/i,ENC_DX=/^\s*diagn[oó]sticos?\s*:?\s*$/i,ENC_EF=/^\s*(al\s+)?ex[aá]men\s+f[ií]sico\s*:?/i;
const INFORME=/^\s*-?\s*((?:angio\s*-?\s*)?(?:tac|tc|tac?\s*de\s+\w+)|angiotac|angio\s*tc|rx\b|radiograf[ií]a|ecograf[ií]a|eco\b|ecocardiograma|ecocardio|rm\b|resonancia|pet|ecg|electrocardiograma|lba|hemocultivos?|hc\b|urocultivo|cultivo|biopsia|mielograma|medulograma|estudio medular|cmf|citometr[ií]a)[^:]{0,60}:\s*(.*)$/i;
function frases(texto){const L=String(texto||'').replace(/\r/g,'').split('\n');const F=[];let bloque=null,inf=null;
 for(let i=0;i<L.length;i++){let l=L[i].trim();if(!l||l==='´'||l==='`'){inf=null;if(bloque==='plan'||bloque==='ind'||bloque==='dx'||bloque==='ef')bloque=null;continue}
  if(ENC_DX.test(l)){bloque='dx';inf=null;continue}
  if(ENC_PLAN.test(l)||/^\s*plan(?:es)?\s*:\s*\S/i.test(l)){bloque='plan';inf=null;const r=l.replace(/^\s*plan(?:es)?\s*:\s*/i,'');if(r&&r!==l&&!ENC_PLAN.test(l))F.push({t:r,bloque:'plan'});continue}
  if(ENC_IND.test(l)){bloque='ind';inf=null;const r=l.replace(/^\s*indicaciones\s*:?\s*/i,'');if(r)F.push({t:r,bloque:'ind'});continue}
  if(ENC_EF.test(l)){bloque='ef';inf=null;const r=l.replace(ENC_EF,'').replace(/^\s*:\s*/,'');if(r)F.push({t:r,bloque:'ef'});continue}
  if(bloque==='dx'&&!/^\s*-|^\s*\*|^\s*\d+[.)-]|^[A-ZÁÉÍÓÚ]/.test(l))bloque=null;
  if(bloque==='ef'&&/^(paciente|plan|pendiente|en suma|se )/i.test(l))bloque=null;
  if(bloque==='plan'||bloque==='ind'||bloque==='dx'||bloque==='ef'){F.push({t:l.replace(/^\s*[-•*]\s*/,''),bloque});continue}
  const mi=l.match(INFORME);if(mi&&!/^\s*-?\s*(hc|hemocultivos?)\s*\(\d\)/i.test(l)){inf={t:l,bloque:'inf'};F.push(inf);continue}
  if(inf&&!/^(plan|pendiente|indicaciones|en suma|en conclusi|paciente|se )/i.test(l)){inf.t+=' '+l;continue}
  inf=null;
  // una línea puede traer varias frases
  l.split(/(?<!\b(?:Obs|obs|Sd|sd|Dr|Dra|aprox|Aprox|vs|etc|Tto|tto|Hx|Ej|ej|Lab|lab|Dg|dg|Esp|esp))(?<=[a-zñáéíóú0-9)%\]])\.\s+(?=[A-ZÁÉÍÓÚÑ(])/).forEach(s=>{if(s.trim())F.push({t:s.trim(),bloque:null})})}
 return F}
// ───────── abreviaturas y nombres de exámenes ─────────
function normAbrev(s){return s
 .replace(/\bangio\s*-?\s*tac?\b(\s+de)?/ig,'AngioTC$1').replace(/\btac\b/ig,'TC').replace(/\brx\s*(de\s*)?(t[oó]rax|tx)\b/ig,'Rx de tórax').replace(/\brx\b/g,'Rx')
 .replace(/\bt[oó]rax\b/g,'tórax').replace(/\bport[aá]til\b/ig,'portátil').replace(/\bhemocultivos?\b/ig,'HC').replace(/\bgsa\b/ig,'GSA').replace(/\bfio2\b/ig,'FiO₂').replace(/\bsat\s*o2\b/ig,'SatO₂')
 .replace(/\bhrs?\b\.?/ig,'h').replace(/\bpdte\.?\b/ig,'pendiente').replace(/\batb\b/ig,'ATB').replace(/\bvni\b/ig,'VMNI').replace(/\bcnaf\b/ig,'CNAF').replace(/\bpcr\b/ig,'PCR').replace(/\bpct\b/ig,'PCT')
 .replace(/\s{2,}/g,' ').trim()}
const ESPEC=[[/cx\s*tx|cirug[ií]a\s+de\s+t[oó]rax|cirujano de t[oó]rax/i,'cirugía de tórax'],[/coloprocto/i,'coloproctología'],[/\buro(log[ií]a)?\b/i,'urología'],[/infecto(log[ií]a)?/i,'infectología'],[/gastro(enterolog[ií]a)?/i,'gastroenterología'],
 [/\bneuro(log[ií]a)?\b/i,'neurología'],[/neurocirug/i,'neurocirugía'],[/cardio(log[ií]a)?/i,'cardiología'],[/nefro(log[ií]a)?/i,'nefrología'],[/broncopulmonar|bronco\b/i,'broncopulmonar'],[/\bccpp\b|cuidados paliativos|paliativos/i,'CCPP'],
 [/endocrino(log[ií]a)?/i,'endocrinología'],[/dermato(log[ií]a)?/i,'dermatología'],[/oftalmo(log[ií]a)?/i,'oftalmología'],[/otorrino|orl\b/i,'otorrinolaringología'],[/psiquiatr/i,'psiquiatría'],[/trauma(tolog[ií]a)?/i,'traumatología'],
 [/\buci\b|intensivo/i,'UCI'],[/kine(siolog[ií]a)?|\bknt\b/i,'kinesiología'],[/nutri(ci[oó]n|olog)/i,'nutrición'],[/cirug[ií]a(\s+general)?|\bcx\b/i,'cirugía'],[/ginec/i,'ginecología'],[/maxilo/i,'cirugía maxilofacial'],[/hemato(log[ií]a)?/i,'hematología'],[/radiolog[ií]a intervenc|\bri\b/i,'radiología intervencional']];
function especialidad(s){for(const [re,n] of ESPEC)if(re.test(s))return n;return null}
// ───────── sistema de una frase ─────────
const SIS=[
 ['dig',/deposici|diarrea|v[oó]mit|n[aá]usea|ayuno|\bnpt|sng\b|sny\b|tolerancia oral|disfagia|abdomen|abdominal|melena|hematemesis|hda\b|hdb\b|[ií]leo/i],
 ['resp',/insuf\w*\.?\s+resp|fio|cnaf|vmni|cpap|bipap|naricera|\bcn\b|venturi|mmv\b|\bo2\b|disnea|taquipn|desatur|sat\s*o|spo2|pafi|p\/f|gsa\b|crep|sibil|derrame|\bsep\b|pleur|neumot|insuficiencia respiratoria|falla respiratoria|ventilator|wob/i],
 ['inf',/fiebre|febril|afebril|\bhc\b|hemocult|urocult|cultivo|\batb\b|antibi|antif[uú]ng|\bpcr\b|\bpct\b|procalc|\blba\b|infect|meropenem|cefepime|vancomic|pip.?tazo|piperacil|ceftriax|amika|voricon|anfotericin|caspofung|micafung|aciclovir|ganciclovir|neumon|sepsis|absceso|bacteriemia|bacteremia/i],
 ['hem',/\bhb\b|\bplt\b|plaquet|transfu|\btx\b de|\bgr\b|\bpfc\b|neutrop|\bran\b|\bgb\b|blastos|sangrad|coagul|fibrin[oó]geno|neupogen|filgrastim|g-?csf/i],
 ['qt',/\bqt\b|quimio|ciclo\b|inducci[oó]n|consolidaci[oó]n|\bit\b|intratecal|ven\/aza|azacitid|venetoclax|bortezomib|lenalidom|rituximab|ciclofosf|citarabin|daunorrub|idarrub|atra\b|metotrexato|linfoglobulina|ciclosporina/i],
 ['hd',/\bpa\b\s*\d|\bpam\b|hipotens|\bdva\b|noradren|taquicard|bradicard|perfus|lactato|shock|\bfc\b\s*\d|hemodin/i],
 ['ren',/diuresis|\bcrea|creatinin|\bbh\b|balance|furosemida|\btsr\b|di[aá]lisis|hiperkal|hipokal|hiponat|hipernat|\bk\b\s*\d|\bna\b\s*\d|foley|sonda (urinaria|foley)/i],
 ['neu',/l[uú]cid|vigil|confus|delirium|agitad|somnol|cefalea|convuls|glasgow|\bgcs\b|focal|alucinac|desorient|dolor\b/i]];
function sistemaDe(s){for(const [k,re] of SIS)if(re.test(s))return k;return 'otro'}
// ───────── reescritura de frases (reglas) ─────────
const STD_DESCARTE=/^(paciente\s+)?(hemodin[aá]micamente estable|hdn estable|hemodinamia estable|afebril|sin apremio( respiratorio)?|intercambio gaseoso conservado|bien perfundid[oa]|l[uú]cid[oa]|vigil|orientad[oa]|despiert[oa]( actualmente)?|responde [oó]rdenes( simples?)?|sin sangrado|tranquil[oa]|cooperador[a]?|sin dolor|normoc[aá]rdic[oa]|normotens[oa]|en buenas condiciones|estable)[\s,.y]*(sin cambios)?\.?$/i;
const SV_LINEA=/^(csv|signos vitales|sv)\s*:|^\s*(pa|fc|fr|t°|sat|spo2|pam)\s*[:\s]\s*\d/i;
const EF_LINEA=/^(mal perfundido|bien perfundido|crt\b|yugulares|crepit|sibilanc|mp\s*\(|abdomen|eeii|ee\.?ii|edema|rr2t|congestivo|en malas condiciones|en regulares condiciones|taquipneico|taquipneica)/i;
function horaANumero(h){if(!h)return null;const m=String(h).match(/(\d{1,2}):?(\d{2})?/);return m?+m[1]+(+(m[2]||0))/60:null}
// fecha de un evento descrito como relativo dentro de una nota escrita en fecha f, hora h
function cuandoRel(s,f,h){const t=nrm(s);let m;
 if((m=t.match(/hace\s+(\d+)\s*(h|hr|hrs|hora|horas)\b/))){const hh=horaANumero(h);if(hh!=null&&hh-(+m[1])<0)return addDays(f,-1);return f}
 if(/\banoche\b/.test(t)){const hh=horaANumero(h);return hh!=null&&hh>=18?f:addDays(f,-1)}
 if(/\bayer\b/.test(t))return addDays(f,-1);
 if(/\bmanana\b(?!\s*(am|en la manana))/.test(t)&&!/esta manana|en la manana/.test(t))return addDays(f,1);
 if(/\bhoy\b|esta manana|madrugada|\bam\b/.test(t))return f;
 return null}
// reemplaza hoy/ayer/mañana/anoche/hace N h por la fecha explícita relativa a "hoy"
function fechasRelativas(s,f,h,hoy){let out=s;
 out=out.replace(/\bpor hoy\b/gi,x=>f===hoy?x:'durante el '+dm(f));
 out=out.replace(/\b(anoche)\b(?!\s+\d)/gi,()=>{const d=cuandoRel('anoche',f,h);return diasEntre(d,hoy)===1?'anoche '+dm(d):'la noche del '+dm(d)});
 out=out.replace(/\bhace\s+(\d+)\s*(h|hr|hrs|horas?)\b/gi,(x)=>rel(cuandoRel(x,f,h),hoy));
 out=out.replace(/\b(hoy|ayer)\b(?!\s+\d{1,2}\/\d{1,2})/gi,(x)=>{const d=x.toLowerCase()==='hoy'?f:addDays(f,-1);return rel(d,hoy)});
 out=out.replace(/\bma[ñn]ana\b(?!\s+\d)/gi,(x,o,str)=>{const antes=str.slice(Math.max(0,o-6),o).toLowerCase();if(/esta |la $/.test(antes))return x;return rel(addDays(f,1),hoy)});
 // fechas ya explícitas "hoy 12/11" escritas otro día → corregir
 out=out.replace(/\b(hoy|ayer)\s+(\d{1,2})\/(\d{1,2})\b/gi,(x,w,d,mo)=>{const y=+hoy.slice(0,4);const fx=y+'-'+pad(mo)+'-'+pad(d);return rel(fx,hoy)});
 return out}
function temp(s){const m=s.match(/\b(3[89]|4[0-2])(?:[.,](\d))?\s*°?\s*c?\b/i);return m?m[1]+(m[2]?','+m[2]:''):null}
function reescribir(fr,ctx){let s=fr.t.trim().replace(/^\s*[-•*]\s*/,'');const f=ctx.fecha,h=ctx.hora,hoy=ctx.hoy,a=ctx.sexo==='f'?'a':'o';ctx=ctx||{};
 if(!s)return null;
 if(fr.bloque==='ef')return {sys:'ef',txt:s,descartar:true,motivo:'examen físico de otra evaluación'};
 if(fr.bloque==='dx')return {sys:'dx',txt:dot(cap(normAbrev(s))),tipo:'dx'};
 if(fr.bloque==='plan')return {sys:'pp',txt:dot(cap(normAbrev(fechasRelativas(s,f,h,hoy)))),tipo:'pp'};
 if(fr.bloque==='ind'){if(/^sin cambios/i.test(s))return null;return {sys:'ind',txt:normAbrev(s),tipo:'ind'}}
 if(SV_LINEA.test(s))return {sys:'hd',txt:s,descartar:true,motivo:'signos vitales de otra evaluación'};
 if(EF_LINEA.test(s)&&fr.bloque!=='inf')return {sys:'ef',txt:s,descartar:true,motivo:'examen físico de otra evaluación'};
 if(STD_DESCARTE.test(s.trim())||s.split(/,|\sy\s/).every(x=>!x.trim()||STD_DESCARTE.test(x.trim())||/^(responde [oó]rdenes|afebril|sin sangrado)/i.test(x.trim())))return {sys:sistemaDe(s),txt:s,descartar:true,motivo:'ya lo dicen tus líneas estándar'};
 if(/^(se\s+)?(revisa|eval[uú]a)\s+(a\s+)?paciente\s+que\s+/i.test(s))s=s.replace(/^(se\s+)?(revisa|eval[uú]a)\s+(a\s+)?paciente\s+que\s+/i,'');
 let m;
 if((m=s.match(/^paciente\s+(grave|cr[ií]tic[oa]|de cuidado|en beg|en reg|en meg)\.?$/i)))return {sys:'cond',txt:dot(cap(s)),tipo:'cond',clave:'cond'};
 // informe de imagen o examen
 if(fr.bloque==='inf'&&(m=s.match(INFORME))){const nombre=normAbrev(s.slice(0,s.indexOf(':')).replace(/^\s*-\s*/,'')).trim();let cuerpo=s.slice(s.indexOf(':')+1).trim().replace(/^["«]|["»]$/g,'');
  const fx=(nombre.match(/\((\d{1,2}\/\d{1,2})\)/)||[])[1];const n2=nombre.replace(/\s*\(\d{1,2}\/\d{1,2}\)\s*/,' ').trim();
  return {sys:/ecg|electrocard/i.test(n2)?'hd':/hc|cultivo|lba/i.test(n2)?'inf':'est',txt:`Se recupera informe de ${n2}${fx?' '+fx:''}: «${cuerpo.replace(/\.$/,'')}».`,tipo:'informe',clave:claveExamen(n2)}}
 // resultado de GSA / laboratorio "se rescata resultado"
 if(/^(se\s+)?(rescat|recuper)\w*\s+(el\s+)?resultado/i.test(s)){const c=s.replace(/^(se\s+)?(rescat|recuper)\w*\s+(el\s+)?resultados?\s+(de\s+)?/i,'');return {sys:sistemaDe(c),txt:dot('Se recupera resultado de '+normAbrev(c)),tipo:'informe',clave:claveExamen(c)}}
 // fiebre
 if(/fiebre|febril|peak|\bt°?\s*(m[aá]x)?\s*3[89]/i.test(s)&&!/afebril/i.test(s)&&temp(s)){const T=temp(s);const d=cuandoRel(s,f,h)||(horaANumero((s.match(/(\d{1,2})[:.]?(\d{2})?\s*(am|hrs?|h)\b/i)||[])[0])<8?f:f);
  const hx=s.match(/(?:a las|alrededor de las|~)?\s*\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|hrs?|h)\b/i);let hEv=hx?(+hx[1])+(hx[3]&&/pm/i.test(hx[3])&&+hx[1]<12?12:0):null;
  const hN=horaANumero(h);let dEv=d;if(hEv!=null&&hN!=null&&hEv>hN+0.5)dEv=addDays(f,-1);
  if(ctx.sinFecha&&hEv!=null&&!/ayer|anoche/i.test(s))dEv=hEv<12?hoy:addDays(hoy,-1);
  const noche=/anoche|madrugada/i.test(s)||(hEv!=null&&(hEv>=20||hEv<8));
  let resto=s.replace(/.*?(fiebre|febril|peak febril)[^,;.]*?(3[89]|4[0-2])([.,]\d)?\s*°?\s*c?/i,'').replace(/^\s*(a las|alrededor de las)\s*\d{1,2}([:.]\d{2})?\s*(am|pm|hrs?|h)?/i,'').replace(/^[\s,;:.-]+/,'').trim();
  resto=normAbrev(fechasRelativas(resto,f,h,hoy)).replace(/\btoman\b/i,'toman');
  const tarde=hEv!=null?hEv>=18:/anoche/i.test(s);
  const cuando=noche&&diasEntre(dEv,hoy)<=1?('Anoche '+dm(tarde?dEv:addDays(dEv,-1))):cap(rel(dEv,hoy));
  return {sys:'inf',txt:dot(`${cuando}: fiebre hasta ${T} °C${resto?', '+resto.replace(/^se\s/i,'se '):''}`),tipo:'fiebre'}}
 // interconsulta
 if((m=s.match(/\b(evaluad[oa]|valorad[oa]|vist[oa]|revisad[oa]|en seguimiento)\s+por\s+([^,:;.]+?)(?:\s+(hoy|ayer|anoche|esta ma[ñn]ana|durante la visita)\b|[,:;.]|\s+(quien|quienes|que)\b|$)(.*)/i))&&especialidad(m[2])){
  const esp=especialidad(m[2]);let resto=(m[5]||'').replace(/^[\s,:;.-]+/,'').replace(/^(quien(es)?|que)\s+/i,'');const d=cuandoRel(m[3]||s,f,h)||f;
  const seg=/en seguimiento/i.test(m[1]);resto=normAbrev(fechasRelativas(resto,f,h,hoy));
  return {sys:'est',txt:dot(seg?`En seguimiento por ${esp}${resto?', '+resto:''}`:`Evaluad${a} por ${esp} ${rel(d,hoy)}${resto?', '+resto:''}`),tipo:'ic'}}
 if((m=s.match(/^(?:se\s+)?(?:discute\s+(?:caso\s+)?con|ic\s+(?:a|por|con))\s+([^,:;.]+?)(?:[,:;.]|\s+y\s+)(.*)$/i))&&especialidad(m[1])){const esp=especialidad(m[1]);let resto=normAbrev(fechasRelativas(m[2].trim(),f,h,hoy)).replace(/^(y\s+)?tras evaluar(lo|la)?\s*(a\s+|al\s+)?(paciente)?,?\s*/i,'');
  return {sys:'est',txt:dot(`Evaluad${a} por ${esp} ${rel(f,hoy)}${resto?', '+resto:''}`),tipo:'ic'}}
 if((m=s.match(/^([A-Za-zÁÉÍÓÚáéíóú .]+?)\s+(indica|indican|sugiere|sugieren|concluye|concluyen|recomienda|recomiendan)\s+(.*)$/i))&&especialidad(m[1])&&m[1].split(' ').length<=4){
  return {sys:'est',txt:dot(`Evaluad${a} por ${especialidad(m[1])} ${rel(f,hoy)}, ${m[2].toLowerCase()} ${normAbrev(fechasRelativas(m[3],f,h,hoy))}`),tipo:'ic'}}
 // procedimiento hecho por un equipo: "Cirugía de Tórax retiró SEP hace 1 hora"
 if((m=s.match(/^([A-Za-zÁÉÍÓÚáéíóú .]+?)\s+(retir[oó]|retiran|instal[oó]|instalan|realiz[oó]|realizan|coloc[oó]|colocan|drena|drenaron)\s+(.+?)(?:\s+(hace\s+\d+\s*\w+|hoy|ayer|anoche))?\.?$/i))&&especialidad(m[1])){
  const acc={retir:'Retiro',insta:'Instalación',reali:'Realización',coloc:'Instalación',dren:'Drenaje'}[Object.keys({retir:1,insta:1,reali:1,coloc:1,dren:1}).find(k=>nrm(m[2]).startsWith(k))];
  const d=cuandoRel(m[4]||s,f,h)||f;return {sys:'est',txt:dot(`${acc} de ${normAbrev(m[3])} por ${especialidad(m[1])} ${rel(d,hoy)}`),tipo:'proc'}}
 if((m=s.match(/^se\s+(instala|retira|realiza|coloca|drena)\s+(.+)$/i))){const acc={instala:'Instalación',retira:'Retiro',realiza:'Realización',coloca:'Instalación',drena:'Drenaje'}[m[1].toLowerCase()];const d=cuandoRel(s,f,h)||f;
  let obj=normAbrev(fechasRelativas(m[2],f,h,hoy)).replace(/\s+(hoy|ayer)\s+\d{1,2}\/\d{1,2}/,'').replace(/\.$/,'');let cola='';const mc=obj.match(/,?\s+(sin (incidentes|complicaciones)|bajo \w+.*)$/i);if(mc){cola=', '+mc[1];obj=obj.slice(0,mc.index)}
  return {sys:'est',txt:dot(`${acc} de ${obj} ${rel(d,hoy)}${cola}`),tipo:'proc'}}
 // pendiente
 if((m=s.match(/^(?:\(p\)|pendientes?|pdte\.?|queda pendiente|a la espera de|en espera de|se solicita|se solicitan|solicito|se deja orden(?: para)?)\s*:?\s*(.+)$/i))){const c=normAbrev(fechasRelativas(m[1],f,h,hoy));
  return {sys:'est',txt:dot('(P) '+cap(c)),tipo:'pend',clave:claveExamen(c)}}
 // soporte ventilatorio / O2 (el más reciente reemplaza a los anteriores)
 if(/\b(cnaf|vmni|vni|cpap|bipap|venturi|mmv|naricera)\b/i.test(s)){const sop=soporte(s);if(sop)return {sys:'resp',txt:sop,tipo:'soporte',clave:'soporte'}}
 if((m=s.match(/\b(?:pafi|p\/f)\s*:?\s*(\d{2,3})/i))&&!/\b(cnaf|vmni|cpap)\b/i.test(s))return {sys:'resp',txt:`PaFi ${m[1]}.`,tipo:'pafi',clave:'pafi'};
 // diuresis de otra evaluación
 if((m=s.match(/diuresis[^\d]{0,25}(\d[\d.]*)\s*(cc|ml)?\s*(?:en|\/)\s*(\d{1,2})\s*(h|hrs?|horas)/i)))return {sys:'ren',txt:`Diuresis ${m[1].replace(/\./g,'')} mL/${m[3]}h.`,tipo:'diuresis'};
 // techo terapéutico / AET
 if(/techo terap|\baet\b|adecuaci[oó]n del esfuerzo/i.test(s))return {sys:'otro',txt:dot(cap(normAbrev(s.replace(/^\*\s*/,'')))),tipo:'techo'};
 // conclusión diagnóstica → propuesta de diagnóstico
 if((m=s.match(/^(?:en suma|en conclusi[oó]n|en resumen)\s*,?\s*(?:paciente\s+)?(?:impresiona\s+)?(?:cursando\s+(?:con\s+)?)?(.+)$/i))){return {sys:'dx',txt:dot(cap(normAbrev(m[1].replace(/^(impresiona\s+)?cursando\s+(con\s+)?/i,'')))),tipo:'dxconc'}}
 // transfusión
 if((m=s.match(/(?:se\s+)?(?:transfunde|transfundi[oó]|recibe|recibi[oó]|se\s+indica\s+tx\s+de|tx\s+de)\s*(\d+)\s*u?\s*(?:de\s+)?(gr|grd|gl[oó]bulos rojos|plt|plaquetas|pfc|plasma|crio\w*)/i))){
  const prod={gr:'GR',grd:'GR',plt:'PLT',plaquetas:'PLT',pfc:'PFC',plasma:'PFC'}[nrm(m[2]).split(' ')[0]]||(/crio/i.test(m[2])?'crioprecipitado':/rojos/i.test(m[2])?'GR':m[2]);
  const por=(s.match(/por\s+(hb|plt|plaquetas)\s*(?:de\s*)?([\d.,]+\s*k?)/i)||[]);const d=cuandoRel(s,f,h)||f;
  return {sys:'hem',txt:dot(`${cap(rel(d,hoy))} recibe ${m[1]}U de ${prod}${por[1]?' por '+(nrm(por[1]).startsWith('pl')?'PLT':'Hb')+' '+por[2].trim():''}`),tipo:'tx'}}
 // algo programado para el día siguiente → pendiente
 if((m=s.match(/^ma[ñn]ana\s*:?\s*(.+)$/i))){const c=normAbrev(m[1]).replace(/\.$/,'');return {sys:'est',txt:dot('(P) '+cap(c)+' '+rel(addDays(f,1),hoy)),tipo:'pend',clave:claveExamen(c)}}
 // laboratorio en línea
 if(/^(lab(oratorio)?|ex[aá]menes|en ex[aá]menes destacan|destacan)\b\s*:?/i.test(s)||(s.match(/\b[A-Za-z]{2,6}\s*:?\s*\d+[.,]?\d*/g)||[]).length>=4)return {sys:'lab',txt:normAbrev(s.replace(/^(lab(oratorio)?|en ex[aá]menes destacan|destacan)\s*:?\s*/i,'')),tipo:'lab'};
 // texto libre: se ubica por sistema y se ordena el formato
 let t=normAbrev(fechasRelativas(s,f,h,hoy)).replace(/^dejo\b/i,'Se deja').replace(/^solicito\b/i,'Se solicita').replace(/^indico\b/i,'Se indica').replace(/^inicio\b(?= \w)/i,'Se inicia');
 return {sys:sistemaDe(s),txt:dot(cap(t)),tipo:'texto',textual:true}}
function soporte(s){const t=s;let m,partes=[];
 const fio=(t.match(/fio2?\s*:?\s*(\d{2,3})\s*%?/i)||[])[1],flu=(t.match(/(?:v\s*:?\s*|flujo\s*:?\s*|a\s+)?(\d{1,3})\s*(?:l|lt|lts|litros)\s*\/?\s*(?:min|x\s*min|')?/i)||[])[1],peep=(t.match(/(?:peep|cpap)\s*:?\s*(\d{1,2})\s*(?:cm\s*h2o|cmh2o)?/i)||(t.match(/(\d{1,2})\s*cm\s*h2o/i)))||[];
 if(/\b(vmni|vni|cpap|bipap)\b/i.test(t)){const modo=/cpap/i.test(t)?'CPAP':/bipap/i.test(t)?'BiPAP':'';partes.push(`En VMNI${modo?' '+modo:''}${peep[1]?' '+peep[1]+' cmH₂O':''}${fio?', FiO₂ '+fio+' %':''}`)}
 else if(/cnaf/i.test(t))partes.push(`En CNAF${flu?' '+flu+' L/min':''}${fio?', FiO₂ '+fio+' %':''}`);
 else if(/venturi|mmv/i.test(t))partes.push(`Con O₂ por MMV${fio?' al '+fio+' %':''}${flu?' ('+flu+' L/min)':''}`);
 else if(/naricera|\bcn\b/i.test(t))partes.push(`Con O₂ por CN${flu?' a '+flu+' L/min':''}`);
 if(!partes.length)return null;
 if((m=t.match(/\b(?:pafi|p\/f)\s*:?\s*(\d{2,3})/i)))partes.push('PaFi '+m[1]);
 if(/buena respuesta/i.test(t))partes[0]+=', con buena respuesta clínica';
 if(/mala respuesta/i.test(t))partes[0]+=', con mala respuesta';
 return partes.map(dot).join(' ')}
function claveExamen(s){const t=nrm(s);
 if(/angio\s*-?\s*t/.test(t))return 'angiotc';if(/\btc\b|\btac\b/.test(t))return 'tc';if(/\brx\b|radiograf/.test(t))return 'rx';if(/\bgsa\b|gases/.test(t))return 'gsa';
 if(/\bhc\b|hemocult/.test(t))return 'hc';if(/\blba\b/.test(t))return 'lba';if(/eco\s*card|ecocardio/.test(t))return 'ecocardio';if(/ecograf|\beco\b/.test(t))return 'eco';if(/\brm\b|resonancia/.test(t))return 'rm';
 if(/cultivo/.test(t))return 'cultivo';if(/biopsia/.test(t))return 'biopsia';if(/mielograma|medular|cmf/.test(t))return 'medula';return null}
// ───────── reglas del usuario ─────────
function escRe(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
function aplicarReglas(txt,reglas){let t=txt,usadas=[];(reglas||[]).forEach(r=>{if(!r||!r.de)return;
 const re=new RegExp(escRe(r.de).replace(/\\\s+|\s+/g,'\\s+'),'i');if(re.test(t)){usadas.push(r.id);if(r.a==='')t='';else t=t.replace(re,r.a)}});return {txt:t,usadas}}
// ───────── novedades de una nota ─────────
function extraerNovedades(nota,ctx){const F=frases(nota.texto);const items=[];
 F.forEach(fr=>{let r=null;try{r=reescribir(fr,{...ctx,fecha:nota.fecha||ctx.hoy,hora:nota.hora,sinFecha:!!nota.sinFecha})}catch(e){r={sys:'otro',txt:fr.t,tipo:'texto',textual:true,error:String(e)}}
  if(!r)return;r.orig=fr.t;r.fuente=nota.fuente||'';r.fecha=nota.fecha;r.hora=nota.hora;
  if(r.txt&&ctx.reglas){const a=aplicarReglas(r.txt,ctx.reglas);if(a.usadas.length){r.txt=a.txt;r.reglas=a.usadas;if(!a.txt){r.descartar=true;r.motivo='regla tuya'}}}
  items.push(r)});
 return items}
// lo más reciente reemplaza; pendientes se cierran cuando llega su resultado; duplicados fuera
function similares(a,b){const ta=new Set(nrm(a).split(/\W+/).filter(x=>x.length>4)),tb=nrm(b).split(/\W+/).filter(x=>x.length>4);if(!tb.length)return false;return tb.filter(x=>ta.has(x)).length/tb.length>=0.6}
function depurar(items){const out=[];const visto=new Set();
 const ultimoDe={};items.forEach((it,i)=>{if(it.clave&&(it.tipo==='soporte'||it.tipo==='pafi'))ultimoDe[it.clave]=i});
 // los planes e indicaciones válidos son los de la última nota que los trae
 const ultNotaPP=Math.max(-1,...items.map((it,i)=>it.tipo==='pp'?i:-1)),notaPP=ultNotaPP>=0?items[ultNotaPP].fuente+'|'+items[ultNotaPP].hora:null;
 const ultNotaInd=Math.max(-1,...items.map((it,i)=>it.tipo==='ind'?i:-1)),notaInd=ultNotaInd>=0?items[ultNotaInd].fuente+'|'+items[ultNotaInd].hora:null;
 const lastSopPF=Math.max(-1,...items.map((it,i)=>it.tipo==='soporte'&&/pafi/i.test(it.txt)?i:-1));
 const lastConc=Math.max(-1,...items.map((it,i)=>it.tipo==='dxconc'?i:-1));const infVisto={};
 items.forEach((it,i)=>{
  if(it.descartar){out.push(it);return}
  if(it.tipo==='pafi'&&i<lastSopPF){it.descartar=true;it.motivo='reemplazado por un dato más reciente'}
  if(it.tipo==='dxconc'&&i!==lastConc){it.descartar=true;it.motivo='conclusión de una evaluación anterior'}
  if(it.tipo==='informe'&&it.clave){if(infVisto[it.clave]&&similares(infVisto[it.clave],it.txt)){it.descartar=true;it.motivo='informe repetido'}else infVisto[it.clave]=it.txt}
  if((it.tipo==='soporte'||it.tipo==='pafi')&&ultimoDe[it.clave]!==i){it.descartar=true;it.motivo='reemplazado por un dato más reciente'}
  if(it.tipo==='pp'&&(it.fuente+'|'+it.hora)!==notaPP){it.descartar=true;it.motivo='plan de una evaluación anterior'}
  if(it.tipo==='ind'&&(it.fuente+'|'+it.hora)!==notaInd){it.descartar=true;it.motivo='indicación de una evaluación anterior'}
  if(it.tipo==='pend'&&it.clave&&items.slice(i+1).some(x=>x.tipo==='informe'&&x.clave===it.clave||(x.clave&&x.clave===it.clave&&x.tipo==='informe'))){it.descartar=true;it.motivo='ya llegó el resultado'}
  if(it.tipo==='pend'&&it.clave==='angiotc'&&items.slice(i+1).some(x=>x.tipo==='informe'&&/angio/i.test(x.txt))){it.descartar=true;it.motivo='ya llegó el resultado'}
  const k=nrm(it.txt).replace(/[^a-z0-9]/g,'');if(!it.descartar&&visto.has(k)){it.descartar=true;it.motivo='duplicado'}
  if(!it.descartar)visto.add(k);out.push(it)});
 // si hay PaFi suelta y un soporte, se unen
 const sop=out.find(x=>x.tipo==='soporte'&&!x.descartar),pf=out.find(x=>x.tipo==='pafi'&&!x.descartar);
 if(sop&&pf&&!/pafi/i.test(sop.txt)){sop.txt+=' '+pf.txt;pf.descartar=true;pf.motivo='unido al soporte ventilatorio'}
 return out}
// ───────── combinación del día ─────────
function marcaTiempo(n){return (n.fecha||'0000-00-00')+'T'+(n.hora||(n.posterior?'99:99':'00:00'))}
function esCompleta(sep,texto){if(!sep||!sep.dx||!sep.dx.trim())return false;const t=String(texto||'');
 if(!/^\s*diagn[oó]sticos?\b/im.test(t))return false;
 const ind=/^\s*-?\s*(reposo|r[eé]gimen)\b/im.test(sep.ind||'')||/^\s*(REPOSO|R[EÉ]GIMEN)\b/m.test(t);
 const probs=(sep.pp||'').split('\n').filter(l=>/^\s*\d{1,2}\s*[.)-]/.test(l)).length;
 return ind||probs>=2}
// notas: [{texto,fecha,hora,fuente}] ; separar: función de la app (texto→{dx,pp,ind,narr,ef,ex})
function combinar(notas,ctx,separar){const N=[...notas].sort((a,b)=>marcaTiempo(a)<marcaTiempo(b)?-1:marcaTiempo(a)>marcaTiempo(b)?1:(a.orden||0)-(b.orden||0));
 N.forEach(n=>{try{n.sep=separar(n.texto)}catch(e){n.sep=null;n.err=String(e)}});
 let bi=-1;for(let i=N.length-1;i>=0;i--){if(esCompleta(N[i].sep,N[i].texto)){bi=i;break}}
 const base=bi>=0?N[bi]:null;const despues=N.filter((n,i)=>i>bi);const antes=N.filter((n,i)=>i<bi);
 let items=[];despues.forEach(n=>{items.push(...extraerNovedades(n,ctx))});
 // diagnósticos de otras notas que no están en la base → propuesta
 const refDx=base?base.sep.dx:(ctx.dxActual||'');if(refDx){const baseDx=nrm(refDx);items.forEach(it=>{if(it.tipo==='dx'){const tk=nrm(it.txt).replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(x=>x.length>3);const hit=tk.filter(x=>baseDx.includes(x)).length;if(tk.length&&hit/tk.length>=0.6){it.descartar=true;it.motivo='ya está en los diagnósticos'}}})}
 items=depurar(items);
 return {base,antes,despues,items,errores:N.filter(n=>n.err).map(n=>({fuente:n.fuente,error:n.err}))}}
// ───────── asociación documento → paciente ─────────
function asociar(doc,pacientes){const hr=doc.run?huellaRut(doc.run):null,ht=doc.nombre?huellaTokens(doc.nombre):[];
 if(hr){const p=pacientes.find(p=>p.hue&&p.hue.r&&p.hue.r.includes(hr));if(p)return {pid:p.id,motivo:'RUT',seguro:true}}
 if(ht.length){const sc=pacientes.map(p=>({p,n:(p.hue&&p.hue.t||[]).filter(x=>ht.includes(x)).length})).filter(x=>x.n>=2).sort((a,b)=>b.n-a.n);
  if(sc.length&&(sc.length===1||sc[0].n>sc[1].n))return {pid:sc[0].p.id,motivo:'nombre ('+sc[0].n+' palabras)',seguro:true}}
 if(doc.cama){const p=pacientes.find(p=>p.cama===doc.cama);if(p){if(!doc.nombre||inicialesCompat(doc.nombre,p.nombre))return {pid:p.id,motivo:'cama'+(doc.nombre?' + iniciales':''),seguro:!!doc.nombre};
   return {pid:p.id,motivo:'misma cama, iniciales distintas',seguro:false}}}
 if(doc.nombre){const c=pacientes.filter(p=>inicialesCompat(doc.nombre,p.nombre));if(c.length===1)return {pid:c[0].id,motivo:'iniciales',seguro:false}}
 return {pid:null,motivo:'sin coincidencia',seguro:false}}

// ───────── Excel (.xlsx) sin librerías: zip + XML ─────────
async function unzip(buf){const u=new Uint8Array(buf),dv=new DataView(u.buffer,u.byteOffset,u.byteLength);let e=-1;
 for(let i=u.length-22;i>=Math.max(0,u.length-70000);i--){if(dv.getUint32(i,true)===0x06054b50){e=i;break}}if(e<0)throw new Error('no es un archivo .xlsx válido');
 const n=dv.getUint16(e+10,true);let p=dv.getUint32(e+16,true);const out={};
 for(let k=0;k<n;k++){if(dv.getUint32(p,true)!==0x02014b50)break;const met=dv.getUint16(p+10,true),csz=dv.getUint32(p+20,true),nl=dv.getUint16(p+28,true),xl=dv.getUint16(p+30,true),cl=dv.getUint16(p+32,true),off=dv.getUint32(p+42,true);
  const nombre=new TextDecoder().decode(u.subarray(p+46,p+46+nl));p+=46+nl+xl+cl;
  const lnl=dv.getUint16(off+26,true),lxl=dv.getUint16(off+28,true),d0=off+30+lnl+lxl;const data=u.subarray(d0,d0+csz);
  out[nombre]={met,data}}
 return {async leer(nombre){const f=out[nombre];if(!f)return null;if(f.met===0)return new TextDecoder().decode(f.data);
  const ds=new DecompressionStream('deflate-raw');const r=new Blob([f.data]).stream().pipeThrough(ds);return await new Response(r).text()},nombres:Object.keys(out)}}
function xmlTxt(s){return String(s).replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&#(\d+);/g,(m,n)=>String.fromCharCode(+n)).replace(/&#x([0-9a-f]+);/gi,(m,n)=>String.fromCharCode(parseInt(n,16))).replace(/&amp;/g,'&')}
function textoSi(x){const t=[];x.replace(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g,(m,v)=>{t.push(xmlTxt(v))});return t.join('')}
function colIdx(ref){const m=ref.match(/^([A-Z]+)/);let n=0;for(const c of m[1])n=n*26+(c.charCodeAt(0)-64);return n-1}
async function xlsxHojas(buf){const z=await unzip(buf);const wb=await z.leer('xl/workbook.xml');if(!wb)throw new Error('no es un Excel (.xlsx)');
 const rels=(await z.leer('xl/_rels/workbook.xml.rels'))||'';const R={};rels.replace(/<Relationship\b[^>]*>/g,m=>{const id=(m.match(/Id="([^"]+)"/)||[])[1],t=(m.match(/Target="([^"]+)"/)||[])[1];if(id&&t)R[id]=t.replace(/^\/?xl\//,'').replace(/^\//,'')});
 const ssx=(await z.leer('xl/sharedStrings.xml'))||'';const SS=[];ssx.replace(/<si>([\s\S]*?)<\/si>/g,(m,x)=>{SS.push(textoSi(x))});
 const hojas=[];const re=/<sheet\b[^>]*>/g;let m;
 while((m=re.exec(wb))){const nombre=xmlTxt((m[0].match(/name="([^"]*)"/)||[])[1]||'');const rid=(m[0].match(/r:id="([^"]+)"/)||m[0].match(/\bid="([^"]+)"/)||[])[1];
  const ruta='xl/'+(R[rid]||'');const x=await z.leer(ruta);if(!x)continue;const filas=[];
  x.replace(/<row\b[^>]*?(?:\/>|>([\s\S]*?)<\/row>)/g,(rm,inner,o)=>{const rr=+((rm.match(/\br="(\d+)"/)||[])[1]||filas.length+1)-1;const fila=[];
   (inner||'').replace(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g,(cm,at,ci)=>{const ref=(at.match(/\br="([A-Z]+\d+)"/)||[])[1];if(!ref)return;const t=(at.match(/\bt="([^"]+)"/)||[])[1];let v='';
    if(t==='s'){const k=+((ci||'').match(/<v>([\s\S]*?)<\/v>/)||[])[1];v=SS[k]||''}else if(t==='inlineStr'){v=textoSi(ci||'')}else{const vv=((ci||'').match(/<v>([\s\S]*?)<\/v>/)||[])[1];v=vv!=null?xmlTxt(vv):''}
    fila[colIdx(ref)]=v});filas[rr]=fila});
  hojas.push({nombre,filas:Array.from(filas,f=>f||[])})}
 return hojas}
function serialAFecha(n){const d=new Date(Date.UTC(1899,11,30)+Math.round(+n)*86400000);return d.getUTCFullYear()+'-'+pad(d.getUTCMonth()+1)+'-'+pad(d.getUTCDate())}
function celdaFecha(v,anioRef){if(v==null||v==='')return null;if(/^\d{4,5}(\.\d+)?$/.test(String(v).trim())&&+v>20000&&+v<80000)return serialAFecha(v);return fechaDe(v,anioRef)}
function hojaFecha(nombre,hoy){const y=+(hoy||iso(new Date())).slice(0,4);const f=fechaDe(String(nombre).replace(/[_ ]/g,'-'),y);if(!f)return null;
 // sin año: si queda en el futuro, era del año anterior
 if(!/\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}/.test(nombre)&&hoy&&diasEntre(hoy,f)>30)return (y-1)+f.slice(4);return f}
function hojaDelDia(hojas,hoy){const c=hojas.map((h,i)=>({i,f:hojaFecha(h.nombre,hoy)})).filter(x=>x.f&&x.f<=hoy).sort((a,b)=>a.f<b.f?1:-1);return c.length?c[0].i:hojas.length-1}
// ───────── bloques de la entrega de turno ─────────
const ENT_CAMPOS=[[/^sala/,'cama'],[/^nombre/,'nombre'],[/^ru[nt]\b/,'run'],[/^edad/,'edad'],[/^fn\b|^fecha de nac|^f\.?\s*nac/,'fn'],[/^ficha/,'ficha'],[/^domicilio/,'domicilio'],[/^f\.?\s*ingreso|^fecha (de )?ingreso/,'fingreso'],[/inicio.*quimio|inicio.*qt/,'fqt'],[/^dia.*quimio|^dia.*qt|^d[ií]a qt/,'diaqt']];
const ENT_FILAS=[[/^antecedentes/,'ANTECEDENTES'],[/^diagnosticos?/,'DIAGNOSTICOS'],[/^tratamiento/,'TRATAMIENTO'],[/^examenes/,'EXAMENES'],[/^planes?/,'PLANES'],[/^comentarios?/,'COMENTARIOS'],[/^pendientes?/,'PENDIENTES'],[/^transfusiones?/,'TRANSFUSIONES']];
function entregaBloques(filas,hoy){const B=[];const y=+(hoy||iso(new Date())).slice(0,4);let cur=null;
 for(let r=0;r<filas.length;r++){const f=filas[r]||[];const ix=f.findIndex(c=>/^\s*sala\s*:?\s*$/i.test(c||''));
  if(ix>=0&&f.some(c=>/^\s*nombre\s*$/i.test(c||''))){const cols={};f.forEach((c,i)=>{const t=nrm(c).trim();const k=(ENT_CAMPOS.find(([re])=>re.test(t))||[])[1];if(k&&!(k in cols))cols[k]=i});
   const v=filas[r+1]||[];cur={fila:r+1,cama:null,campos:{},atb:[],atbTexto:'',extra:[]};B.push(cur);
   for(const k in cols){const val=v[cols[k]];if(val==null||String(val).trim()==='')continue;cur[k]=String(val).trim()}
   if(cur.cama){const m=cur.cama.match(/(\d{1,2})\s*[-–.\/ ]\s*(\d)/);cur.cama=m?(+m[1])+'-'+m[2]:cur.cama}
   cur.fingreso=celdaFecha(cur.fingreso,y);cur.fqt=celdaFecha(cur.fqt,y);if(cur.diaqt!=null){const d=String(cur.diaqt).match(/-?\d+/);cur.diaqt=d?+d[0]:null}
   r++;continue}
  if(!cur)continue;
  const li=f.findIndex(c=>c&&ENT_FILAS.some(([re])=>re.test(nrm(c).trim())));
  f.forEach((c,i)=>{if(c&&/^\s*atb\s*:/i.test(c)){cur.atbTexto=String(c).trim();cur.atb=leerATB(c)}});
  if(li<0)continue;const lab=ENT_FILAS.find(([re])=>re.test(nrm(f[li]).trim()))[1];
  const val=f.slice(li+1).filter(c=>c!=null&&String(c).trim()!=='').join('\n').trim();
  f.slice(0,li).forEach(c=>{if(c&&String(c).trim()&&!/^\s*atb\s*:/i.test(c))cur.extra.push(String(c).trim())});
  if(val)cur.campos[lab]=(cur.campos[lab]?cur.campos[lab]+'\n':'')+val}
 return B}
function leerATB(t){const s=String(t).replace(/^\s*atb\s*:\s*/i,'').trim();if(!s||/^no\b|^sin\b|^-$/i.test(s))return [];const out=[];
 s.split(/[,;+\n]|\s+y\s+/).forEach(p=>{const m=p.match(/([A-Za-zÁÉÍÓÚáéíóúñÑ\-\/ ]{3,}?)\s*\(\s*(\d{1,2})\s*\/\s*(\d{1,2})\s*\)/);if(m)out.push({farmaco:m[1].trim(),a:+m[2],b:+m[3]});else if(p.trim())out.push({farmaco:p.trim(),a:null,b:null})});return out}
function lineasCelda(t){return String(t||'').split(/\n|;\s*|(?<=\.)\s+(?=[A-ZÁÉÍÓÚÑ])/).map(x=>x.replace(/^\s*[-•*\d]+[.)-]?\s+/,'').trim()).filter(Boolean)}
function yaEsta(txt,ref){if(!ref)return false;const R=nrm(ref);const tk=nrm(txt).replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(x=>x.length>3);if(!tk.length)return R.includes(nrm(txt).trim());return tk.filter(x=>R.includes(x)).length/tk.length>=0.6}
// ctx: {hoy, fechaHoja, sexo, reglas, dx, pp, ind, arr, qtDia, qtEsq, cama, fingreso}
function entregaItems(b,ctx){const hoy=ctx.hoy,fh=ctx.fechaHoja||addDays(hoy,-1),delta=Math.max(0,diasEntre(fh,hoy));const fuente='Entrega '+dm(fh);const it=[];
 const aviso=t=>it.push({sys:'aviso',tipo:'aviso',txt:t,fuente,fecha:fh});
 if(b.cama&&ctx.cama&&b.cama!==ctx.cama)aviso(`La entrega la ubica en cama ${b.cama}; en la app está en ${ctx.cama}.`);
 if(b.fingreso&&ctx.fingreso&&b.fingreso!==ctx.fingreso)aviso(`Fecha de ingreso en la entrega ${dm(b.fingreso)}; en la app ${dm(ctx.fingreso)}.`);
 if(b.diaqt!=null){const dq=b.diaqt+delta;if(ctx.qtDia!=null&&ctx.qtDia!==''&&+ctx.qtDia!==dq)aviso(`Día de QT: según la entrega hoy sería +${dq}${b.fqt?' (inicio '+dm(b.fqt)+')':''}; en la app +${ctx.qtDia}.`);else if(ctx.qtDia==null||ctx.qtDia==='')it.push({sys:'qt',tipo:'qtdia',txt:`Día +${dq} de QT según la entrega${b.fqt?' (inicio '+dm(b.fqt)+')':''}.`,valor:dq,fuente,fecha:fh,estado0:'prop'})}
 const ind=ctx.ind||'';
 b.atb.forEach(x=>{if(x.a==null)return;const a2=Math.min(x.a+delta,x.b);const L=ind.split('\n').find(l=>nrm(l).includes(nrm(x.farmaco).split(' ')[0]));
  if(!L){aviso(`La entrega lista ${x.farmaco} (${a2}/${x.b}), que no está en las indicaciones.`);return}
  const n=(L.match(/\((\d{1,2})\)\s*$/)||[])[1];if(n&&+n!==a2)aviso(`${x.farmaco}: según la entrega hoy sería (${a2}/${x.b}); en indicaciones (${n}).`)});
 lineasCelda(b.campos.DIAGNOSTICOS).forEach(l=>{if(!yaEsta(l,ctx.dx))it.push({sys:'dx',tipo:'dx',txt:dot(cap(normAbrev(l))),fuente,fecha:fh})});
 if(b.campos.TRATAMIENTO&&!yaEsta(b.campos.TRATAMIENTO,(ctx.qtEsq||'')+' '+(ctx.dx||'')))aviso(`Tratamiento según la entrega: «${b.campos.TRATAMIENTO.replace(/\n/g,' · ')}».`);
 if(b.campos.EXAMENES)it.push({sys:'lab',tipo:'lab',txt:/^\s*\d{1,2}[\/.]\d{1,2}/.test(b.campos.EXAMENES)?`Según entrega: ${b.campos.EXAMENES.replace(/\n/g,' · ')}`:`Según entrega ${dm(fh)}: ${b.campos.EXAMENES.replace(/\n/g,' · ')}`,fuente,fecha:fh,estado0:'prop'});
 lineasCelda(b.campos.PLANES).forEach(l=>{if(!yaEsta(l,ctx.pp))it.push({sys:'pp',tipo:'pp',txt:dot(cap(normAbrev(fechasRelativas(l,fh>=hoy?addDays(hoy,-1):fh,null,hoy)))),fuente,fecha:fh})});
 const fRef=fh>=hoy?addDays(hoy,-1):fh;
 if(b.campos.COMENTARIOS){const nota={texto:b.campos.COMENTARIOS,fecha:fRef,hora:null,sinFecha:diasEntre(fRef,hoy)===1,fuente};extraerNovedades(nota,{hoy,sexo:ctx.sexo,reglas:ctx.reglas}).forEach(x=>{x.fuente=fuente;it.push(x)})}
 lineasCelda(b.campos.PENDIENTES).forEach(l=>{const c=normAbrev(fechasRelativas(l.replace(/^\(p\)\s*/i,'').replace(/^pendientes?\s*:?\s*/i,''),fh>=hoy?addDays(hoy,-1):fh,null,hoy));if(yaEsta(c,ctx.arr))return;it.push({sys:'est',tipo:'pend',txt:dot('(P) '+cap(c)),fuente,fecha:fh,clave:claveExamen(c)})});
 if(b.campos.TRANSFUSIONES&&!/^(no|sin|-|estandar)$/i.test(b.campos.TRANSFUSIONES.trim()))it.push({sys:'hem',tipo:'tx',txt:`Transfusiones según entrega: ${b.campos.TRANSFUSIONES.replace(/\n/g,' · ')}.`.replace(/\.\.$/,'.'),fuente,fecha:fh,estado0:'prop'});
 return depurar(it.map(x=>({...x,orig:x.orig||x.txt})))}
// ───────── informe enmascarado ─────────
const ESTRUCTURA=new Set(['evolucion','medica','fecha','hora','cama','sala','paciente','run','rut','diagnosticos','diagnostico','planes','plan','problemas','y','indicaciones','reposo','regimen','examen','fisico','examenes','imagenes','comentario','cmr','hematologia','pendiente','pendientes','servicio','unidad','medico','profesional','emision','pagina','documento','registro','clinico','electronico','al','de','del','la','el','en','por','con','sin','oxigeno','control','residente','sos','adicionales','evolucion','o','hospital','nombre','social','edad','ficha','ingreso','alta','firma','hoy','ayer','anoche','afebril','neutropenico','neutropenica']);
function enmascarar(linea){return String(linea).split(/(\s+)/).map(w=>{if(/^\s+$/.test(w))return w;const base=nrm(w).replace(/[^a-z]/g,'');if(base&&ESTRUCTURA.has(base))return w;return w.replace(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g,c=>c===c.toUpperCase()?'X':'x').replace(/\d/g,'9')}).join('')}
const api={xlsxHojas,hojaFecha,hojaDelDia,entregaBloques,entregaItems,leerATB,similares,yaEsta,cabecera,partirNotas,frases,reescribir,extraerNovedades,depurar,combinar,asociar,huellaTokens,huellaRut,iniciales,inicialesCompat,fechasRelativas,rel,addDays,diasEntre,aplicarReglas,enmascarar,sistemaDe,normAbrev,sha256,esCompleta};
root.HematoLote=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
