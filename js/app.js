/* Administrasi Wali Kelas - Frontend (app.js). Logika asli dipertahankan; hanya pemanggilan server yang diganti ke gasRun() (lihat gas-client.js). */
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ST=['Hadir','Sakit','Izin','Alpha'],K={Hadir:'h',Sakit:'s',Izin:'i',Alpha:'a'},CL={Hadir:'#22C55E',Sakit:'#38BDF8',Izin:'#F59E0B',Alpha:'#F43F5E'};
const MENU=[['beranda','Beranda','bi-grid'],['profil','Profil Wali Kelas','bi-person-vcard'],['kelas','Data Kelas & Siswa','bi-people'],['absensi','Absensi Harian','bi-calendar-check'],['masalah','Permasalahan Siswa','bi-journal-text'],['rapot','Dokumen Rapot','bi-folder2-open'],['estafet','Download / Upload Data','bi-arrow-left-right'],['pengaturan','Pengaturan','bi-sliders']];
const S={d:null,kid:'',sec:'beranda',tgl:hari(),dr:{},am:{},q:'',bln:hari().slice(0,7),tema:'#6D4AFF',mode:'light',dk:'',tk:'',as:'',user:null,owner:null,adm:null,ver:'',act:Date.now()};

function hari(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function ls(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch(e){}}
function toast(m,e){const t=$('tt');t.textContent=m;t.className='tt on'+(e?' err':'');clearTimeout(S.tm);S.tm=setTimeout(()=>t.className='tt',e?7000:3200)}
function call(fn,args,ok,bad){
  if(fn==='simpanPengaturan'&&S.as&&args[0]&&args[0].kelas_aktif!==undefined){const o=Object.assign({},args[0]);delete o.kelas_aktif;if(!Object.keys(o).length)return;args=[o]}
  gasRun()
  .withSuccessHandler(r=>{if(r&&r.ok){if(r.ver)S.ver=r.ver;ok&&ok(r.data)}else if(r&&r.sesi){sesiHabis(r.msg);bad&&bad(r.msg)}else{const m=(r&&r.msg)||'Gagal memproses';toast(m,1);bad&&bad(m)}})
  .withFailureHandler(e=>{const m=(e&&e.message)||'Koneksi gagal';toast(m,1);bad&&bad(m)})
  .api(S.tk,fn,args,S.as||'',S.ver||'')}
function persist(){if(S.as)return;ls('wk_boot',JSON.stringify(S.d))}
function applyTheme(c,m){S.tema=c;S.mode=m;document.documentElement.style.setProperty('--p',c);document.documentElement.setAttribute('data-theme',m);ls('wk_tema',c);ls('wk_mode',m)}
const bulan=m=>new Date(m+'-01T00:00:00').toLocaleDateString('id-ID',{month:'short',year:'numeric'});
const tglID=t=>t?new Date(t+'T00:00:00').toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'}):'';
const ini=n=>String(n).split(' ').slice(0,2).map(x=>x[0]).join('').toUpperCase();

function init(){
  applyTheme(ls('wk_tema')||'#6D4AFF',ls('wk_mode')||'light');buildNav();nav('beranda');
  window.addEventListener('error',e=>fatal(e.message));
  S.tk=ls('wk_tk')||'';
  if(!S.tk){const m=ls('wk_msg');if(m)ls('wk_msg','');return rAuth('masuk',m||'')}
  mulai();
}
function mulai(){
  $('ld').classList.remove('off');
  try{const c=JSON.parse(ls('wk_boot'));if(c&&c.kelas){setData(c,1);$('ld').classList.add('off')}}catch(e){}
  const wd=setTimeout(()=>fatal('Server tidak merespons dalam 25 detik. Muat ulang; jika berulang, jalankan setupAwal() lagi dari editor lalu buat deployment baru.'),25000);
  call('boot',[S.ver||''],d=>{clearTimeout(wd);if(d.same){S.ver=d.ver;$('ld').classList.add('off');admPra();return}try{S.sj=JSON.stringify(d);setData(d);persist();$('ld').classList.add('off')}catch(e){fatal(e.message+' ('+(e.stack||'').split('\n')[1]+')')}},()=>{clearTimeout(wd);$('ld').classList.add('off')});
}
function fatal(m){const l=$('ld');l.classList.remove('off');l.innerHTML='<div style="text-align:center;max-width:440px;padding:20px"><b style="font-size:18px">Aplikasi gagal dimuat</b><p style="margin:10px 0;color:var(--t2);overflow-wrap:anywhere">'+esc(m)+'</p><button class="bt pr" onclick="try{localStorage.removeItem(\'wk_boot\')}catch(e){}location.reload()">Muat ulang</button></div>'}
function setData(d,lokal){
  S.d=d;if(d.ver)S.ver=d.ver;S.user=d.akun||S.user;S.owner=d.owner||null;cekMenu();if(!S.kid||!d.kelas.some(k=>k.id===S.kid))S.kid=d.kid;{const kk=d.kelas.find(k=>k.id===S.kid),na=d.kelas.find(k=>k.status!=='arsip');if(kk&&kk.status==='arsip'&&na)S.kid=na.id}
  S.am={};d.absensi.forEach(a=>S.am[a[1]+'|'+a[2]]=[a[3],a[4]]);
  if(!lokal&&d.peng&&d.peng.tema)applyTheme(d.peng.tema,d.peng.mode||'light');
  admLokal();loadDraft();renderAll();if(!lokal)admPra();
}
const sis=()=>S.d?S.d.siswa.filter(s=>s.kelas_id===S.kid).sort((a,b)=>a.no_urut-b.no_urut):[];
const nmS=id=>{const s=S.d.siswa.find(x=>x.id===id);return s?s.nama_siswa:'-'};

function buildNav(){
  $('nv').innerHTML=menu().map(m=>{
    if(m[0]==='wali')return `<button class="ni wnx${S.wo?' open':''}" data-s="wali" aria-expanded="${S.wo?'true':'false'}" onclick="toggleWali()"><i class="bi ${m[2]}"></i>${m[1]}<i class="bi bi-chevron-down wcv"></i></button><div class="wsm${S.wo?' open':''}" id="smw">${smHtml()}</div>`;
    const a=m[3]?`toast('Fitur ini segera hadir')`:`nav('${m[0]}')`;
    return `<button class="ni${m[3]?' dis':''}" data-s="${m[0]}" onclick="${a}"><i class="bi ${m[2]}"></i>${m[1]}${m[3]?'<em>Segera</em>':''}</button>`}).join('');
  $('bn').innerHTML=menu().filter(m=>!m[3]).map(m=>`<button data-s="${m[0]}" onclick="nav('${m[0]}')" aria-label="${m[1]}"><i class="bi ${m[2]}"></i>${m[1].split(' ')[0]}</button>`).join('');
}
function nav(s){if(s==='siswa')s='kelas';S.sec=s;document.querySelectorAll('.sec').forEach(e=>e.classList.toggle('on',e.id==='s-'+s));
  document.querySelectorAll('[data-s]').forEach(e=>e.classList.toggle('on',e.dataset.s===s));if(S.d&&s==='kelas'&&!($('ks')||{}).innerHTML)rSiswa();if(s==='admin')muatAdmin();else if(s==='wali'){S.wo=1;sinkSm();rWali();muatAdmin()}else sinkron();aktifWali();window.scrollTo(0,0)}
let gt;function gcari(v){S.q=v.toLowerCase();clearTimeout(gt);gt=setTimeout(()=>{if(S.sec!=='kelas')nav('kelas');rSiswa()},150)}

function renderAll(){if(!S.d)return;rTop();rBeranda();rAbsensi();rMasalah();rTema();rProfil();rRapot();rEstafet();rKelas();rBanner();rAdmin()}
function rTop(){const k=S.d.kelas.find(x=>x.id===S.kid),h=k?`<small>KELAS BINAAN</small><b>${esc(k.nama_kelas)}</b><span>T.A. ${esc(k.tahun_ajaran)}${k.status==='arsip'?' (arsip)':''}</span><i class="bi bi-chevron-right"></i>`:`<small>KELAS BINAAN</small><b>Belum ada kelas</b><span>Buat di Daftar Kelas</span><i class="bi bi-chevron-right"></i>`;
  $('kb').innerHTML=h;$('kbm').innerHTML=h}
function pilihKelas(id){S.kid=id;loadDraft();renderAll();call('simpanPengaturan',[{kelas_aktif:id}])}

function rekap(){const ids=new Set(sis().map(s=>s.id)),r={};
  for(const k in S.am){const p=k.split('|');if(!ids.has(p[0]))continue;const o=r[p[0]]||(r[p[0]]={h:0,t:0});o.t++;if(S.am[k][0]==='Hadir')o.h++}return r}

function sc(l,v,s,ic,t){return `<div class="cd sc"><div class="ic ${t}"><i class="bi ${ic}"></i></div><small>${l}</small><div class="v">${v}</div><small class="mono">${s}</small></div>`}
const ILL_BERANDA=`<svg class="bh-ill" viewBox="0 0 420 250" aria-hidden="true" focusable="false"><circle cx="338" cy="56" r="31" fill="#FDE68A" opacity=".55"/><circle cx="338" cy="56" r="19" fill="#FBBF24"/><g fill="#fff"><g opacity=".95"><ellipse cx="78" cy="58" rx="34" ry="13"/><ellipse cx="102" cy="48" rx="24" ry="13"/><ellipse cx="56" cy="50" rx="20" ry="10"/></g><g opacity=".75"><ellipse cx="262" cy="34" rx="26" ry="10"/><ellipse cx="282" cy="27" rx="17" ry="10"/></g></g><g fill="#fff" opacity=".9"><path d="M392 108l3 8 8 3-8 3-3 8-3-8-8-3 8-3z"/><path d="M52 112l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/></g><ellipse cx="96" cy="264" rx="214" ry="72" fill="#86EFAC"/><ellipse cx="322" cy="270" rx="232" ry="78" fill="#4ADE80"/><path d="M216 212L188 252H268Z" fill="#F1F5F9"/><rect x="116" y="120" width="42" height="86" rx="7" fill="#E2E8F0"/><rect x="272" y="120" width="42" height="86" rx="7" fill="#E2E8F0"/><rect x="148" y="106" width="134" height="102" rx="9" fill="#fff"/><path d="M136 110L215 58l79 52z" style="fill:var(--p)"/><path d="M136 110L215 58l79 52z" fill="#000" opacity=".07"/><rect x="213.5" y="28" width="3" height="34" rx="1.5" fill="#64748B"/><path d="M216.5 30L242 38l-25.500 8z" fill="#F43F5E"/><circle cx="215" cy="92" r="13" fill="#fff"/><circle cx="215" cy="92" r="13" fill="none" stroke="#CBD5E1" stroke-width="2.500"/><path d="M215 85v7l5 3" fill="none" stroke="#475569" stroke-width="2.200" stroke-linecap="round"/><g fill="#BAE6FD"><rect x="162" y="124" width="24" height="28" rx="5"/><rect x="244" y="124" width="24" height="28" rx="5"/><rect x="162" y="162" width="24" height="28" rx="5"/><rect x="244" y="162" width="24" height="28" rx="5"/><rect x="124" y="134" width="26" height="22" rx="5"/><rect x="280" y="134" width="26" height="22" rx="5"/></g><path d="M199 208v-36a16 16 0 0 1 32 0v36z" style="fill:var(--p)"/><circle cx="224" cy="192" r="2.200" fill="#fff"/><rect x="48" y="170" width="10" height="40" rx="4" fill="#A16207"/><circle cx="53" cy="156" r="25" fill="#22C55E"/><circle cx="38" cy="172" r="16" fill="#16A34A"/><circle cx="69" cy="170" r="16" fill="#16A34A"/><rect x="334" y="196" width="66" height="15" rx="4" fill="#F43F5E"/><rect x="340" y="181" width="58" height="15" rx="4" fill="#38BDF8"/><rect x="336" y="166" width="54" height="15" rx="4" fill="#FBBF24"/><path d="M366 132l34 13-34 13-34-13z" fill="#1E293B"/><path d="M349 150v11c11 9 28 9 34 0v-11" fill="#334155"/><path d="M400 145v18" stroke="#FBBF24" stroke-width="2.500" stroke-linecap="round"/></svg>`;
const fmtD=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const sapaWaktu=()=>{const h=new Date().getHours();return h<4?'malam':h<11?'pagi':h<15?'siang':h<18?'sore':'malam'};
/** "Pak Dani" / "Bu Sari": sapaan dari nama profil (gelar di depan dilewati; tanpa tebakan bila jenis kelamin kosong). */
function sapaNama(){const p=(S.d&&S.d.profil)||{},raw=String(p.nama_lengkap||'').split(',')[0].trim();if(!raw)return 'Wali Kelas';
  const w=raw.split(/\s+/),f=w.find(x=>!/\.$/.test(x))||w[0];return (p.jenis_kelamin==='L'?'Pak ':p.jenis_kelamin==='P'?'Bu ':'')+f}
function rBeranda(){
  const ss=sis(),n=ss.length,td=hari(),c={Hadir:0,Sakit:0,Izin:0,Alpha:0};let t=0;
  ss.forEach(s=>{const a=S.am[s.id+'|'+td];if(a&&c[a[0]]!==undefined){c[a[0]]++;t++}});
  const pct=t?Math.round(c.Hadir/t*1000)/10:0,ms=S.d.masalah.filter(m=>m.kelas_id===S.kid);
  const ids=new Set(ss.map(s=>s.id)),mc={Hadir:0,Sakit:0,Izin:0,Alpha:0},bm={},ps={},rr={},d0=new Date(td+'T00:00:00'),bl=td.slice(0,7);let alb=0;
  for(const k in S.am){const p=k.split('|');if(!ids.has(p[0]))continue;const m=p[1].slice(0,7),st=S.am[k][0];bm[m]=bm[m]||0;if(st==='Alpha'){bm[m]++;ps[p[0]]=(ps[p[0]]||0)+1;if(m===bl)alb++}if(m===S.bln&&mc[st]!==undefined){mc[st]++;const o=rr[p[0]]||(rr[p[0]]={h:0,t:0});o.t++;if(st==='Hadir')o.h++}}
  const tot=ST.reduce((a,x)=>a+mc[x],0);let acc=0;
  const g=ST.map(x=>{const a=acc/Math.max(tot,1)*100;acc+=mc[x];return `${CL[x]} ${a}% ${acc/Math.max(tot,1)*100}%`}).join(',');
  const ml=Object.keys(bm).sort().slice(-6);
  const rc=ms.slice().sort((a,b)=>b.tanggal.localeCompare(a.tanggal)).slice(0,5),kl=S.d.kelas.find(k=>k.id===S.kid);
  const akhir=d0.getDay()===0; /* hari kerja Senin-Sabtu, hanya Minggu libur */
  /* titik hari kerja minggu ini (Senin-Sabtu) */
  const sen=new Date(d0);sen.setDate(d0.getDate()-((d0.getDay()+6)%7));
  const mg=['Sen','Sel','Rab','Kam','Jum','Sab'].map((nm,i)=>{const x=new Date(sen);x.setDate(sen.getDate()+i);const k=fmtD(x);return{nm:nm,ok:ss.some(s=>S.am[s.id+'|'+k]),td:k===td}});
  /* peringkat kehadiran bulan yang dipilih */
  const rk=ss.filter(s=>rr[s.id]).map(s=>({s:s,p:Math.round(rr[s.id].h/rr[s.id].t*1000)/10,t:rr[s.id].t})).sort((a,b)=>b.p-a.p||b.t-a.t||a.s.no_urut-b.s.no_urut).slice(0,5);
  const lb=BLN12[+S.bln.slice(5,7)-1]+' '+S.bln.slice(0,4),tglL=d0.toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const info=!kl?'Buat kelas pertama Anda di menu Data Kelas &amp; Siswa.':!n?'Kelas ini belum punya siswa. Tambahkan lewat menu Data Kelas &amp; Siswa.':t?'Absensi hari ini sudah tercatat. Terima kasih sudah teliti!':akhir?'Selamat hari Minggu! Waktunya beristirahat sejenak.':'Satu hari baru bersama siswa-siswa hebat. Isi absensi hari ini lewat menu Absensi Harian.';
  const tile=(ik,cl,v,l,sub)=>`<div class="bh-tile ${cl}"><span class="bh-ib"><i class="bi ${ik}"></i></span><div class="bh-tx"><small>${l}</small><b>${v}</b><span>${sub}</span></div></div>`;
  $('s-beranda').innerHTML=`<div class="bh"><div class="bh-main">
  <div class="bh-hero">${kl?`<span class="bh-chip bh-kls"><i class="bi bi-mortarboard-fill"></i>${esc(kl.nama_kelas)} &bull; T.A. ${esc(kl.tahun_ajaran)}</span>`:''}
    <div class="bh-txt"><h1>Selamat ${sapaWaktu()},<br><em>${esc(sapaNama())}!</em> &#128075;</h1><p>${info}</p>
      <div class="bh-chips"><span class="bh-chip"><i class="bi bi-calendar3"></i>${tglL}</span><span class="bh-chip">${!n?'<i class="bi bi-people"></i>Belum ada siswa':t?`<i class="bi bi-check-circle-fill"></i>Absensi terisi ${t}/${n}`:akhir?'<i class="bi bi-cup-hot"></i>Libur hari Minggu':'<i class="bi bi-clock"></i>Absensi belum diisi'}</span></div></div>${ILL_BERANDA}</div>
  <div class="bh-tiles">${tile('bi-people','t0',n,'Jumlah Siswa',kl?'Siswa di '+esc(kl.nama_kelas):'Belum ada kelas')}${tile('bi-person-x','bh-ta',alb,'Alpha Bulan Ini',BLN12[d0.getMonth()]+' '+d0.getFullYear())}</div>
  <div class="cd bh-c-komp"><div class="hd"><div><h3 style="margin:0">Foto Siswa</h3><small class="sub" style="margin:0;font-size:12px">${n?n+' siswa'+(kl?' &bull; '+esc(kl.nama_kelas):'')+' &bull; geser untuk melihat':'Belum ada siswa'}</small></div><div class="row" style="gap:6px"><button type="button" class="ib" onclick="slGeser(-1)" aria-label="Geser ke kiri"><i class="bi bi-chevron-left"></i></button><button type="button" class="ib" onclick="slGeser(1)" aria-label="Geser ke kanan"><i class="bi bi-chevron-right"></i></button></div></div>
    ${n?`<div class="fsl" id="fsl" tabindex="0" role="region" aria-label="Foto siswa, geser ke kiri atau kanan" onpointerdown="if(event.target.closest('.fk'))S.slp=Date.now()+15000" onpointerup="S.slp=Date.now()+1500" onpointerleave="S.slp=Date.now()+1500" onpointercancel="S.slp=Date.now()+4000" onwheel="S.slp=Date.now()+6000">${ss.map(x=>`<button type="button" class="fk" onclick="detailSiswa('${esc(x.id)}')" title="${esc(x.nama_siswa)}"><span class="fp">${x.foto_id&&String(x.foto_id).startsWith('data:image/jpeg')?`<img alt="Foto ${esc(x.nama_siswa)}" src="${x.foto_id}">`:`<span class="fi">${esc(ini(x.nama_siswa))}</span>`}</span><b>${esc(x.nama_siswa)}</b><small class="mono">No. ${String(x.no_urut).padStart(2,'0')}</small></button>`).join('')}</div>${ss.some(x=>!(x.foto_id&&String(x.foto_id).startsWith('data:image/jpeg')))?'<p class="sub" style="margin:6px 0 0;font-size:12px">Siswa tanpa foto menampilkan inisial. Foto diunggah lewat menu Data Kelas &amp; Siswa.</p>':''}`:'<div class="emp"><i class="bi bi-images"></i>Belum ada siswa di kelas ini.</div>'}</div>
  <div class="cd bh-c-ms"><div class="hd"><h3>Permasalahan Terbaru</h3><button class="bt sf" onclick="nav('masalah')">Lihat semua</button></div>${rc.length?rc.map(m=>`<div class="ms"><div><b>${esc(nmS(m.siswa_id))}</b><p>${esc(m.jenis_masalah)} \u2022 ${tglID(m.tanggal)}</p></div><span class="bd ${m.penyelesaian?'b-h':'b-i'}">${m.penyelesaian?'Selesai':'Tindak lanjut'}</span></div>`).join(''):'<div class="emp"><i class="bi bi-journal-text"></i>Belum ada catatan</div>'}</div>
  </div><aside class="bh-side">
  <div class="cd"><div class="hd" style="margin-bottom:4px"><h3 style="margin:0">Kehadiran Hari Ini</h3><span class="bd b-p">Hari ini</span></div><p class="bh-dt"><i class="bi bi-calendar3"></i><span><b>${d0.toLocaleDateString('id-ID',{weekday:'long'})}</b>, ${d0.getDate()} ${BLN12[d0.getMonth()]} ${d0.getFullYear()}</span></p>
    <div class="bh-ring" style="--v:${pct}"><div><b>${t?pct+'%':'-'}</b><small>${t?'hadir':akhir?'libur':'belum diisi'}</small></div></div>
    <p class="bh-gt">${t?`<b>${c.Hadir} dari ${t}</b> siswa hadir`:akhir?'Hari Minggu, tidak ada absensi':'Absensi hari ini belum diisi'}</p>
    ${t?`<div class="bh-lg">${ST.map(x=>`<span class="bd b-${K[x]}">${c[x]} ${x}</span>`).join('')}</div>`:''}
    <div class="bh-wk">${mg.map(x=>`<div class="bh-d${x.ok?' ok':''}${x.td?' td':''}"><span>${x.ok?'<i class="bi bi-check-lg"></i>':''}</span><small>${x.nm}</small></div>`).join('')}</div></div>
  <div class="cd"><div class="hd" style="margin-bottom:8px"><h3 style="margin:0">Peringkat Kehadiran</h3><input type="month" value="${S.bln}" aria-label="Bulan peringkat" class="pill" style="height:36px;padding:0 8px;font-size:12px;max-width:150px" onchange="S.bln=this.value||S.bln;rBeranda()"></div>
    ${rk.length?rk.map((r,i)=>`<div class="bh-r"><span class="bh-n n${i+1}">${i+1}</span>${av(r.s)}<b class="bh-rn">${esc(r.s.nama_siswa)}</b><span class="mono bh-rp">${r.p}%</span></div>`).join(''):'<div class="emp"><i class="bi bi-trophy"></i>Belum ada data absensi bulan ini</div>'}</div>
  ${barAlpha(ml,bm,ps)}</aside></div>`;
}

function fld(f,x){const r=f.r?' required':'',id='f_'+f.k;let c;
  if(f.t==='select')c=`<select id="${id}"${r}>${f.o.map(o=>{const a=Array.isArray(o)?o:[o,o];return `<option value="${esc(a[0])}"${a[0]==x?' selected':''}>${esc(a[1])}</option>`}).join('')}</select>`;
  else if(f.t==='textarea')c=`<textarea id="${id}" rows="3"${r}>${esc(x)}</textarea>`;
  else c=`<input id="${id}" type="${f.t||'text'}" value="${esc(x)}"${r}${f.p?` pattern="${f.p}" title="${esc(f.h||'')}"`:''}${f.m?' class="mono"':''} placeholder="${esc(f.ph||'')}"${f.i?` inputmode="${f.i}"`:''}>`;
  return `<label class="fl"><span>${esc(f.l)}${f.r?' *':''}</span>${c}</label>`}
function openForm(t,fs,v,save){S.fs=fs;S.sv=save;
  $('md').innerHTML=`<div class="bk" onclick="closeM()"></div><form class="dr" onsubmit="return submitF(event)"><div class="dh"><b>${esc(t)}</b><button type="button" class="ib" aria-label="Tutup" onclick="closeM()"><i class="bi bi-x-lg"></i></button></div><div class="db">${fs.map(f=>fld(f,v[f.k])).join('')}</div><div class="df"><button type="button" class="bt ol" onclick="closeM()">Batal</button><button class="bt pr">Simpan</button></div></form>`;
  $('md').classList.add('on')}
function submitF(e){e.preventDefault();const o={};S.fs.forEach(f=>o[f.k]=$('f_'+f.k).value.trim());S.sv(o);return false}
/** Jendela geser-siswa (Detail/Rekap/Masalah/Rapot): bila jendela sudah terbuka, ganti isi panel SAJA (latar buram & animasi masuk tidak dibuat ulang) agar pindah siswa tidak berkedip; posisi gulir dipertahankan. */
const MD={set h(v){const m=$('md'),od=m.classList.contains('on')&&m.querySelector('.bk')&&m.querySelector('.dr');
  if(!od){m.innerHTML=v;return}
  const t=document.createElement('div');t.innerHTML=v;const nd=t.querySelector('.dr');
  if(!nd){m.innerHTML=v;return}
  const db=od.querySelector('.db'),sc=db?db.scrollTop:0;
  od.className=nd.className;od.innerHTML=nd.innerHTML;
  const nb=od.querySelector('.db');if(nb)nb.scrollTop=sc}};
function closeM(){$('md').classList.remove('on');$('md').innerHTML=''}
function ask(m,fn,lbl){S.ok=fn;$('md').innerHTML=`<div class="bk" onclick="closeM()"></div><div class="dg" role="alertdialog"><p>${esc(m)}</p><div class="row"><button class="bt ol" onclick="closeM()">Batal</button><button class="bt pr" style="background:#BA1A1A" onclick="closeM();S.ok()">${esc(lbl||'Hapus')}</button></div></div>`;$('md').classList.add('on')}

const FS=[{k:'nisn',l:'NISN (10 digit)',r:1,p:'\\d{10}',h:'10 digit angka',m:1,i:'numeric'},{k:'nik',l:'NIK (16 digit, sesuai KK)',p:'\\d{16}',h:'16 digit angka',m:1,i:'numeric'},{k:'nama_siswa',l:'Nama lengkap',r:1},{k:'jenis_kelamin',l:'Jenis kelamin',t:'select',o:[['L','Laki-laki'],['P','Perempuan']]},{k:'tempat_lahir',l:'Tempat lahir'},{k:'tanggal_lahir',l:'Tanggal lahir',t:'date'},{k:'agama',l:'Agama',t:'select',o:['Islam','Kristen','Katolik','Hindu','Buddha','Konghucu']},{k:'alamat',l:'Alamat',t:'textarea'},{k:'nama_ayah',l:'Nama ayah'},{k:'nama_ibu',l:'Nama ibu'},{k:'no_hp_ortu',l:'No. WhatsApp orang tua',t:'tel'}];
function formSiswa(id){if(!S.kid)return toast('Buat kelas terlebih dahulu di Daftar Kelas',1);const s=id&&S.d.siswa.find(x=>x.id===id);
  if(!id&&sis().length>=45)return toast('Kapasitas kelas maksimal 45 siswa',1);
  openForm(id?'Ubah Data Siswa':'Tambah Siswa Baru',FS,s||{},o=>saveSiswa(o,id))}
function saveSiswa(o,id){o.kelas_id=S.kid;if(id)o.id=id;
  if(sis().some(s=>s.nisn===o.nisn&&s.id!==id))return toast('NISN sudah terdaftar di kelas ini',1);
  closeM();const old=id&&S.d.siswa.find(s=>s.id===id),tmp=id||'tmp'+Date.now();let snap;
  if(old){snap={...old};Object.assign(old,o)}else S.d.siswa.push({...o,id:tmp,no_urut:sis().length+1});
  renderAll();
  call('simpanSiswa',[o],r=>{Object.assign(S.d.siswa.find(x=>x.id===tmp),r);persist();renderAll();toast('Data siswa tersimpan')},
    ()=>{if(old)Object.assign(old,snap);else S.d.siswa=S.d.siswa.filter(x=>x.id!==tmp);renderAll()})}
function rSiswa(){const el=$('ks');if(!el)return;const kk=S.d&&S.d.kelas.find(k=>k.id===S.kid);if(!S.d||!kk||kk.status==='arsip'){el.innerHTML='';return}const q=S.q,l=sis().filter(s=>!q||s.nama_siswa.toLowerCase().includes(q)||String(s.nisn).includes(q)).sort((a,b)=>a.no_urut-b.no_urut);
  const lupa=(fn,id,nm,jd)=>`<td><button class="ib" style="width:34px;height:34px;color:var(--p);background:var(--pt)" onclick="${fn}('${esc(id)}')" aria-label="Lihat ${jd} ${esc(nm)}" title="${jd}"><i class="bi bi-search"></i></button></td>`;
  el.innerHTML=`<div class="hd"><div><h2 class="h2">Daftar Siswa</h2><p class="sub" style="margin:0">${klName()} &bull; ${sis().length} siswa${q?` \u2022 hasil pencarian "${esc(q)}"`:''}</p></div><div class="row"><button class="bt ol" onclick="formSiswa()"><i class="bi bi-person-plus"></i>Tambah Manual</button><button class="bt sf" onclick="xlTemplate()"><i class="bi bi-file-earmark-arrow-down"></i>Unduh Template</button><button class="bt pr" onclick="pilihPaket()"><i class="bi bi-file-earmark-arrow-up"></i>Unggah Template</button></div></div>
  <div class="cd tw" style="padding:0">${l.length?`<table><thead><tr><th>No</th><th>NISN</th><th>Nama Siswa</th><th>Absensi</th><th>Masalah<button class="ib" style="display:inline-grid;width:28px;height:28px;margin-left:6px;vertical-align:middle;color:var(--p)" onclick="dlMasalahKelas()" aria-label="Unduh catatan permasalahan semua siswa" title="Unduh catatan semua siswa"><i class="bi bi-download"></i></button></th><th>Rapot</th></tr></thead><tbody>${l.map(s=>{
    return `<tr><td class="mono">${String(s.no_urut).padStart(2,'0')}</td><td class="mono">${esc(s.nisn)}</td><td><div class="who">${av(s)}<button class="nm" onclick="detailSiswa('${esc(s.id)}')">${esc(s.nama_siswa)}</button></div></td>${lupa('rekapSiswa',s.id,s.nama_siswa,'rekap absensi')}${lupa('masalahSiswa',s.id,s.nama_siswa,'permasalahan')}${lupa('rapotSiswa',s.id,s.nama_siswa,'rapot')}</tr>`}).join('')}</tbody></table>`:`<div class="emp"><i class="bi bi-people"></i>${S.d.kelas.length?'Belum ada siswa. Tekan "Unduh Template", isi di Excel, lalu "Unggah Template".':'Buat kelas terlebih dahulu.'}</div>`}</div>`}
function formKelas(){openForm('Kelas Baru',[{k:'nama_kelas',l:'Nama kelas (mis. X-1)',r:1},{k:'tingkat',l:'Tingkat',t:'select',o:['X','XI','XII']},{k:'tahun_ajaran',l:'Tahun ajaran',r:1,p:'\\d{4}/\\d{4}',h:'Contoh: 2026/2027',ph:'2026/2027'},{k:'jurusan',l:'Jurusan (opsional)'}],{},o=>{
  closeM();toast('Membuat kelas\u2026');call('simpanKelas',[o],r=>{S.d.kelas.push(r);persist();pilihKelas(r.id);toast('Kelas dibuat')},()=>rTop())})}

function loadDraft(f){const k=S.kid+S.tgl;if(!f&&S.dk===k)return;S.dk=k;S.dr={};sis().forEach(s=>{const a=S.am[s.id+'|'+S.tgl];S.dr[s.id]=a?[a[0],a[1]]:['','']})}
function setSt(id,st){S.dr[id][0]=st;rAbsensi()}
function semuaHadir(){sis().forEach(s=>S.dr[s.id][0]='Hadir');rAbsensi();toast('Semua siswa ditandai Hadir')}
function rAbsensi(){const ss=sis(),c={Hadir:0,Sakit:0,Izin:0,Alpha:0};ss.forEach(s=>{const x=S.dr[s.id];if(x&&c[x[0]]!==undefined)c[x[0]]++});const ok=ST.reduce((a,x)=>a+c[x],0);
  $('s-absensi').innerHTML=`<div class="hd"><div><h1 class="h1">Absensi Harian</h1><p class="sub" style="margin:0">Hasil tersimpan otomatis masuk ke rekap tiap siswa. Klik nama siswa untuk melihat persentase kehadiran beberapa bulan.</p></div><div class="row"><input type="date" class="pill" value="${S.tgl}" aria-label="Tanggal" onchange="S.tgl=this.value||hari();loadDraft(1);rAbsensi()"><button class="bt ol" onclick="pdfRekap()"><i class="bi bi-filetype-pdf"></i>PDF</button><button class="bt pr" onclick="semuaHadir()"><i class="bi bi-check2-all"></i>Semua Hadir</button></div></div>
  <div class="cd">${ss.length?ss.map(s=>`<div class="ar"><div class="who">${av(s)}<div><button type="button" class="nm" title="Lihat persentase kehadiran beberapa bulan" onclick="rekapRentang('${esc(s.id)}')">${esc(s.nama_siswa)}</button><small class="mono">${esc(s.nisn)}</small></div></div><div class="sg" role="group" aria-label="Status ${esc(s.nama_siswa)}">${ST.map(x=>`<button type="button" class="c-${K[x]}${S.dr[s.id][0]===x?' on':''}" aria-pressed="${S.dr[s.id][0]===x}" aria-label="${x}" title="${x}" onclick="setSt('${esc(s.id)}','${x}')">${x[0]}</button>`).join('')}</div><input placeholder="Keterangan (opsional)" aria-label="Keterangan" value="${esc(S.dr[s.id][1])}" oninput="S.dr['${esc(s.id)}'][1]=this.value"></div>`).join(''):'<div class="emp"><i class="bi bi-calendar-check"></i>Belum ada siswa di kelas ini.</div>'}</div>
  <div class="ft"><div class="row">${ST.map(x=>`<span class="bd b-${K[x]}">${c[x]} ${x}</span>`).join('')}<span class="mono">${ok} / ${ss.length} terdata</span></div><div class="row"><button class="bt ol" style="color:var(--a)" onclick="resetAbsensi()"${ss.length?'':' disabled'}><i class="bi bi-arrow-counterclockwise"></i>Reset Absensi</button><button class="bt pr" onclick="simpanAbs()"${ss.length?'':' disabled'}><i class="bi bi-cloud-check"></i>Simpan &amp; Sinkronkan</button></div></div>`}
function simpanAbs(){const tgl=S.tgl,kid=S.kid,items=sis().filter(s=>S.dr[s.id][0]).map(s=>[s.id,S.dr[s.id][0],S.dr[s.id][1]]);
  if(!items.length)return toast('Belum ada status yang diisi',1);
  items.forEach(i=>S.am[i[0]+'|'+tgl]=[i[1],i[2]]);
  const ids=new Set(items.map(i=>i[0]));S.d.absensi=S.d.absensi.filter(a=>!(a[0]===kid&&a[2]===tgl&&ids.has(a[1])));items.forEach(i=>S.d.absensi.push([kid,i[0],tgl,i[1],i[2]]));
  persist();renderAll();toast('Absensi disimpan ('+items.length+' siswa)');
  kirimAbs(kid,tgl,items,0)}
/** Kirim ke server; bila gagal dicoba sekali lagi otomatis (aman diulang), lalu tampilkan sebab sebenarnya. */
function kirimAbs(kid,tgl,items,ulang){
  call('simpanAbsensi',[kid,tgl,items],()=>toast('Tersinkron ke Google Sheets'),m=>{
    if(!ulang){toast('Sinkron gagal, mencoba lagi\u2026',1);setTimeout(()=>kirimAbs(kid,tgl,items,1),1500)}
    else toast('Gagal sinkron: '+(m||'server tidak merespons')+' \u2014 tekan Simpan lagi untuk mencoba ulang',1)})}

/** Reset absensi: kosongkan semua status dan keterangan kelas ini pada tanggal yang sedang dibuka (mis. terlanjur diisi di hari libur), juga di Google Sheets. */
function resetAbsensi(){const tgl=S.tgl,kid=S.kid,ids=new Set(sis().map(s=>s.id)),
  lama=S.d.absensi.filter(a=>a[0]===kid&&a[2]===tgl&&ids.has(a[1])),draft=sis().some(s=>S.dr[s.id]&&S.dr[s.id][0]);
  if(!lama.length&&!draft)return toast('Tidak ada absensi pada tanggal ini',1);
  const hr=new Date(tgl+'T00:00:00').toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  ask('Reset absensi '+hr+'? Semua status dan keterangan absensi kelas ini pada tanggal tersebut akan dikosongkan'+(lama.length?' dan dihapus dari Google Sheets.':'.'),()=>{
    S.d.absensi=S.d.absensi.filter(a=>!(a[0]===kid&&a[2]===tgl&&ids.has(a[1])));ids.forEach(i=>{delete S.am[i+'|'+tgl]});
    loadDraft(1);persist();renderAll();
    if(!lama.length)return toast('Isian absensi dikosongkan');
    toast('Absensi tanggal ini direset');
    call('resetAbsensi',[kid,tgl],()=>toast('Absensi tanggal ini sudah dihapus dari Google Sheets'),m=>{
      lama.forEach(a=>{S.d.absensi.push(a);S.am[a[1]+'|'+tgl]=[a[3],a[4]]});loadDraft(1);persist();renderAll();toast('Gagal mereset: '+(m||'server tidak merespons'),1)})},'Reset')}
function formMasalah(){if(!sis().length)return toast('Tambahkan siswa terlebih dahulu',1);
  openForm('Catatan Masalah & Pembinaan',[{k:'siswa_id',l:'Siswa binaan',t:'select',o:sis().map(s=>[s.id,s.nama_siswa])},{k:'tanggal',l:'Tanggal kejadian',t:'date',r:1},{k:'jenis_masalah',l:'Jenis permasalahan',r:1,ph:'mis. Terlambat berulang'},{k:'uraian',l:'Kronologi / uraian',t:'textarea',r:1},{k:'penyelesaian',l:'Penyelesaian / penanganan',t:'textarea'}],{tanggal:hari()},saveMasalah)}
function saveMasalah(o){o.kelas_id=S.kid;const tmp='tmp'+Date.now();S.d.masalah.push({...o,id:tmp});closeM();renderAll();
  call('simpanMasalah',[o],r=>{Object.assign(S.d.masalah.find(x=>x.id===tmp),r);persist();renderAll();toast('Catatan tersimpan')},()=>{S.d.masalah=S.d.masalah.filter(x=>x.id!==tmp);renderAll()})}
function hapusM(id){ask('Hapus catatan permasalahan ini?',()=>{const old=S.d.masalah.find(m=>m.id===id);S.d.masalah=S.d.masalah.filter(m=>m.id!==id);renderAll();
  if(!String(id).startsWith('tmp'))call('hapusMasalah',[id],()=>{persist();toast('Catatan dihapus')},()=>{S.d.masalah.push(old);renderAll()})})}
/** Satu kartu catatan permasalahan. o.siswa = tampilkan identitas siswa; o.aksi = tombol ubah / lampiran / hapus. */
function kartuMasalah(m,o){o=o||{};const s=o.siswa?S.d.siswa.find(x=>x.id===m.siswa_id):null,dk=dkM(m),sl=!!m.penyelesaian,i=esc(m.id);
  return `<div class="mn-i"><div class="mn-top">${s?`<div class="who mn-w">${av(s)}<div><b>${esc(s.nama_siswa)}</b><small class="mono">${esc(s.nisn)}</small></div></div>`:''}<div class="mn-m"><span class="bd b-p">${esc(m.jenis_masalah)}</span><span class="mn-d"><i class="bi bi-calendar3"></i>${tglID(m.tanggal)}</span></div></div>
  <div class="mn-r"><span class="bd ${sl?'b-h':'b-i'}">${sl?'Selesai':'Tindak lanjut'}</span>${o.aksi?`<button class="ib" aria-label="Ubah" title="Ubah" onclick="editMasalah('${i}')"><i class="bi bi-pencil"></i></button><button class="ib" aria-label="Unggah dokumen" title="Unggah dokumen" onclick="upDokM('${i}')"><i class="bi bi-paperclip"></i></button><button class="ib" aria-label="Hapus" title="Hapus" onclick="hapusM('${i}')"><i class="bi bi-trash3"></i></button>`:''}</div>
  <p class="mn-t">${esc(m.uraian)}</p><div class="mn-p"><small>Penanganan</small>${sl?`<p>${esc(m.penyelesaian)}</p>`:'<p class="mn-b">Belum ada penanganan.</p>'}</div>
  ${dk.length?`<div class="mn-f">${dk.map(d=>`<span class="mn-k"><button type="button" class="mn-kb" onclick="unduh('${esc(d.id)}')" title="Unduh ${esc(d.nama)}"><i class="bi bi-paperclip"></i><span>${esc(d.nama)}</span><i class="bi bi-download"></i></button>${o.aksi?`<button type="button" class="mn-kx" aria-label="Hapus dokumen ${esc(d.nama)}" title="Hapus dokumen" onclick="hapusDokM('${i}','${esc(d.id)}')"><i class="bi bi-x-lg"></i></button>`:''}</span>`).join('')}</div>`:''}</div>`}
function rMasalahList(){const el=$('ml');if(!el)return;const q=S.mq||'',l=S.d.masalah.filter(m=>m.kelas_id===S.kid&&(!q||(nmS(m.siswa_id)+m.jenis_masalah).toLowerCase().includes(q))&&(!S.md1||m.tanggal>=S.md1)&&(!S.md2||m.tanggal<=S.md2)).sort((a,b)=>b.tanggal.localeCompare(a.tanggal));
  el.innerHTML=l.length?`<div class="mn-list">${l.map(m=>kartuMasalah(m,{siswa:1,aksi:1})).join('')}</div>`:'<div class="cd"><div class="emp"><i class="bi bi-journal-text"></i>Belum ada catatan permasalahan.</div></div>'}
function rMasalah(){
  $('s-masalah').innerHTML=`<div class="hd"><h1 class="h1">Permasalahan Siswa</h1><div class="row"><button class="bt ol" onclick="pdfMasalah()" aria-label="Unduh PDF catatan permasalahan"><i class="bi bi-filetype-pdf"></i>PDF</button><button class="bt pr" onclick="formMasalah()"><i class="bi bi-plus-lg"></i>Tambah Catatan</button></div></div>
  <label class="sr" style="margin-bottom:16px;max-width:none"><i class="bi bi-search"></i><input type="search" placeholder="Cari siswa atau jenis masalah..." aria-label="Cari catatan" value="${esc(S.mq||'')}" oninput="S.mq=this.value.toLowerCase();clearTimeout(S.mt);S.mt=setTimeout(rMasalahList,150)"></label>
  <div class="row" style="margin-bottom:16px"><label class="row">Dari <input type="date" class="pill" value="${S.md1||''}" aria-label="Dari tanggal" onchange="S.md1=this.value;rMasalah()"></label><label class="row">Sampai <input type="date" class="pill" value="${S.md2||''}" aria-label="Sampai tanggal" onchange="S.md2=this.value;rMasalah()"></label>${S.md1||S.md2?'<button class="bt ol" onclick="S.md1=S.md2=\'\';rMasalah()">Reset</button>':''}</div>
  <div id="ml"></div>`;rMasalahList()}
/* ---- unduhan catatan permasalahan (PDF & Excel): dipakai jendela kaca pembesar di Daftar Siswa ---- */
const itemMasalah=m=>{const s=S.d.siswa.find(x=>x.id===m.siswa_id)||{};return{sid:m.siswa_id,nama:s.nama_siswa||'-',nisn:s.nisn||'',no:s.no_urut||0,tgl:m.tanggal,jenis:m.jenis_masalah,uraian:m.uraian,pen:m.penyelesaian||'',sl:!!m.penyelesaian,dok:dkM(m).map(d=>d.nama),dokx:dkM(m)}};
const listMasalah=id=>S.d.masalah.filter(m=>id?m.siswa_id===id:m.kelas_id===S.kid).map(itemMasalah).sort((a,b)=>a.no-b.no||a.tgl.localeCompare(b.tgl));
const ringMasalah=l=>({total:l.length,sl:l.filter(x=>x.sl).length,tl:l.filter(x=>!x.sl).length});
const bersihFile=s=>String(s||'').replace(/[^\w \-]/g,'').trim();
/** Ambil satu berkas lampiran dari Drive lewat server: {nama,mime,b64}, atau null bila gagal. */
const ambilBerkas=id=>new Promise(res=>call('unduhBerkas',[id],d=>res(d),()=>res(null)));
/** Perkecil gambar lampiran (maks 1400 px) dan simpan sebagai JPEG agar PDF tetap ringan. Hasil {url,w,h}, atau null bila bukan gambar yang bisa dibaca. */
const siapGambar=(mime,b64)=>new Promise(res=>{if(!/^image\//.test(mime||''))return res(null);const im=new Image();
  im.onload=()=>{const k=Math.min(1,1400/Math.max(im.naturalWidth,im.naturalHeight)),w=Math.max(1,Math.round(im.naturalWidth*k)),h=Math.max(1,Math.round(im.naturalHeight*k)),cv=document.createElement('canvas');cv.width=w;cv.height=h;
    const x=cv.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,w,h);x.drawImage(im,0,0,w,h);res({url:cv.toDataURL('image/jpeg',.82),w:w,h:h})};
  im.onerror=()=>res(null);im.src='data:'+mime+';base64,'+b64});
/** Tarik semua lampiran catatan (3 sekaligus). Gambar disimpan di it.gbr (untuk dipasang di PDF), berkas lain (mis. PDF) di it.lain. */
async function muatLampiran(items){const jobs=[];items.forEach(it=>{it.lamp=new Array((it.dokx||[]).length);(it.dokx||[]).forEach((d,k)=>jobs.push({it:it,d:d,k:k}))});
  let i=0,n=0;const total=jobs.length;
  const kerja=async()=>{while(i<jobs.length){const j=jobs[i++],b=await ambilBerkas(j.d.id),g=b?await siapGambar(b.mime,b.b64):null;
    j.it.lamp[j.k]=g?{nama:j.d.nama,url:g.url,w:g.w,h:g.h}:{nama:j.d.nama,ket:b?(/pdf/i.test(b.mime||'')?'berkas PDF':'tidak dapat ditampilkan'):'gagal dimuat'};
    toast('Menyiapkan lampiran '+(++n)+' dari '+total+'\u2026')}};
  if(total)await Promise.all([kerja(),kerja(),kerja()]);
  items.forEach(it=>{it.gbr=it.lamp.filter(x=>x&&x.url);it.lain=it.lamp.filter(x=>x&&!x.url)})}
/** PDF rapi: kepala berwarna lalu satu kartu per catatan (tanggal, jenis, status, uraian, penanganan, gambar lampiran asli). Kartu yang panjang otomatis lanjut ke halaman berikutnya. */
function buatPdfMasalah(o){
  const doc=new window.jspdf.jsPDF({unit:'mm',format:'a4'}),A=hexRgb(S.tema),W=[255,255,255],T=[27,23,64],G=[107,104,144],HJ=[22,163,74],HI=[217,119,6],
    t=v=>String(v==null||v===''?'-':v).replace(/[^\x20-\x7e\xa0-\xff]/g,'?'),LM=14,CW=182,PD=4,AW=CW-2*PD,X=LM+PD,BAWAH=280;let y=44;
  const chip=(x,yy,tx,c,kanan)=>{doc.setFont('helvetica','bold');doc.setFontSize(7.5);const w=doc.getTextWidth(tx)+6,xx=kanan?x-w:x;doc.setFillColor(...campur(c,W,.86));doc.roundedRect(xx,yy,w,5.4,2.7,2.7,'F');doc.setTextColor(...c);doc.text(tx,xx+3,yy+3.8);return w};
  const label=(tx,x,yy)=>{doc.setFont('helvetica','bold');doc.setFontSize(7);doc.setTextColor(...G);doc.text(tx,x,yy,{charSpace:.5})};
  const ukur=g=>{const wm=g.w/150*25.4,hm=g.h/150*25.4,k=Math.min(AW/wm,90/hm,1);return[wm*k,hm*k]};
  const potong=(tx,mx)=>{let s=tx;doc.setFontSize(7.5);while(doc.getTextWidth(s)+6>mx&&s.length>6)s=s.slice(0,-2);return s===tx?s:s.replace(/\s+$/,'')+'...'};
  /* satu catatan dipecah jadi blok-blok (teks, tiap gambar, daftar berkas lain) agar bisa dialirkan antar halaman */
  const bloks=it=>{doc.setFont('helvetica','normal');doc.setFontSize(9);
    const U=doc.splitTextToSize(t(it.uraian),AW),P=doc.splitTextToSize(it.pen?t(it.pen):'Belum ada penanganan.',AW),b=[];
    b.push({h:10.4+4.2+U.length*4.2+2.5+4.2+P.length*4.2,draw:yy=>{doc.setFont('helvetica','bold');doc.setFontSize(9.5);doc.setTextColor(...T);const tg=t(tglID(it.tgl));doc.text(tg,X,yy+4);
      const sw=chip(LM+CW-PD,yy,it.sl?'SELESAI':'TINDAK LANJUT',it.sl?HJ:HI,true),jt=potong(t(it.jenis).toUpperCase(),CW-2*PD-doc.getTextWidth(tg)-sw-14);doc.setFontSize(9.5);chip(X+doc.getTextWidth(tg)+4,yy,jt,A,false);
      label('URAIAN',X,yy+10.4);doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(...T);doc.text(U,X,yy+14.6,{lineHeightFactor:1.33});
      const yp=yy+10.4+4.2+U.length*4.2+2.5;label('PENANGANAN',X,yp);doc.setFont('helvetica',it.pen?'normal':'italic');doc.setFontSize(9);doc.setTextColor(...(it.pen?T:G));doc.text(P,X,yp+4.2,{lineHeightFactor:1.33})}});
    const gb=it.gbr||[],ln=it.gbr?it.lain:it.dok.map(n=>({nama:n,ket:''}));
    gb.forEach((g,k)=>{const d=ukur(g);b.push({h:2.5+(k?0:4.5)+d[1]+4.5+1,draw:yy=>{let y2=yy+2.5;if(!k){label('LAMPIRAN',X,y2+3);y2+=4.5}doc.addImage(g.url,'JPEG',X,y2,d[0],d[1],undefined,'FAST');
      doc.setDrawColor(...campur(A,W,.8));doc.setLineWidth(.2);doc.rect(X,y2,d[0],d[1]);doc.setFont('helvetica','italic');doc.setFontSize(7.5);doc.setTextColor(...G);doc.text(t(g.nama),X,y2+d[1]+3.8)}})});
    if(ln.length){const L=ln.map(x=>doc.splitTextToSize('- '+t(x.nama)+(x.ket?' ('+x.ket+')':''),AW)[0]);b.push({h:2.5+4.2+L.length*4.2+1.5,draw:yy=>{label(gb.length?'BERKAS LAIN':'DOKUMEN LAMPIRAN',X,yy+5.5);doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(...T);doc.text(L,X,yy+9.7,{lineHeightFactor:1.33})}})}
    return b};
  const baru=()=>{doc.addPage();y=16};
  const kartu=it=>{const bl=bloks(it);let cur=[],ch=0;
    const flush=()=>{if(!cur.length)return;const H=PD*2-1+ch;doc.setFillColor(...campur(A,W,.96));doc.setDrawColor(...campur(A,W,.84));doc.setLineWidth(.25);doc.roundedRect(LM,y,CW,H,3,3,'FD');let yy=y+PD;cur.forEach(b=>{b.draw(yy);yy+=b.h});y+=H+4;cur=[];ch=0};
    bl.forEach(b=>{if(y+ch+b.h+PD*2-1>BAWAH){if(cur.length){flush();baru();const lj={h:6,draw:yy=>{doc.setFont('helvetica','italic');doc.setFontSize(8);doc.setTextColor(...G);doc.text('Lanjutan: '+t(tglID(it.tgl))+' - '+t(it.jenis).slice(0,60),X,yy+3.5)}};cur.push(lj);ch+=lj.h}else baru()}cur.push(b);ch+=b.h});flush()};
  doc.setFillColor(...A);doc.rect(0,0,210,34,'F');doc.setTextColor(...W);doc.setFont('helvetica','bold');doc.setFontSize(9);doc.text(o.label,14,11,{charSpace:1.2});
  doc.setFontSize(18);doc.text(doc.splitTextToSize(t(o.nama),170)[0],14,21);doc.setFont('helvetica','normal');doc.setFontSize(9);doc.text(doc.splitTextToSize(t(o.sub),180)[0],14,28);
  o.grup.forEach(gr=>{const n=gr.items.length;
    if(gr.head){if(y+15+bloks(gr.items[0])[0].h+PD*2>BAWAH)baru();doc.setFont('helvetica','bold');doc.setFontSize(11);doc.setTextColor(...T);doc.text(t(gr.head.nama),LM,y+4);doc.setFont('helvetica','normal');doc.setFontSize(8.5);doc.setTextColor(...G);doc.text('NISN '+t(gr.head.nisn)+'  |  '+n+' catatan',LM,y+9);
      doc.setDrawColor(...campur(A,W,.6));doc.setLineWidth(.4);doc.line(LM,y+11.5,LM+CW,y+11.5);y+=15}
    gr.items.forEach(kartu);y+=2});
  const np=doc.getNumberOfPages(),tg=new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
  for(let p=1;p<=np;p++){doc.setPage(p);doc.setDrawColor(...campur(A,W,.6));doc.setLineWidth(.3);doc.line(14,288,196,288);doc.setFont('helvetica','normal');doc.setFontSize(7.5);doc.setTextColor(...G);doc.text('Administrasi Wali Kelas  |  dicetak '+tg,14,292.5);doc.text('Halaman '+p+' / '+np,196,292.5,{align:'right'})}
  return doc}
const infoKelas=s=>{const k=S.d.kelas.find(x=>x.id===(s?s.kelas_id:S.kid));return k?k.nama_kelas+'  |  T.A. '+k.tahun_ajaran:''};
async function pdfMasalahS(id){const s=S.d.siswa.find(x=>x.id===id);if(!s)return;const l=listMasalah(id);if(!l.length)return toast('Siswa ini belum punya catatan',1);
  if(!(window.jspdf&&window.jspdf.jsPDF))return toast('Pustaka PDF belum termuat. Coba lagi.',1);if(S.pdfBusy)return;S.pdfBusy=1;
  try{toast('Menyiapkan PDF\u2026');await muatLampiran(l);
    const doc=buatPdfMasalah({label:'CATATAN PERMASALAHAN SISWA',nama:s.nama_siswa,sub:'NISN '+s.nisn+'  |  '+infoKelas(s),grup:[{head:null,items:l}]});
    unduhBlob('Catatan Permasalahan - '+bersihFile(s.nama_siswa)+'.pdf',doc.output('blob'));toast('PDF catatan permasalahan siap diunduh')}
  catch(e){toast('Gagal membuat PDF: '+e.message,1)}finally{S.pdfBusy=0}}
async function pdfMasalah(){const l=listMasalah();if(!l.length)return toast('Belum ada catatan permasalahan',1);
  if(!(window.jspdf&&window.jspdf.jsPDF))return toast('Pustaka PDF belum termuat. Coba lagi.',1);if(S.pdfBusy)return;S.pdfBusy=1;
  try{toast('Menyiapkan PDF\u2026');await muatLampiran(l);
    const grup=[];l.forEach(x=>{let g=grup[grup.length-1];if(!g||g.head.sid!==x.sid)grup.push(g={head:{sid:x.sid,nama:x.nama,nisn:x.nisn},items:[]});g.items.push(x)});
    const doc=buatPdfMasalah({label:'CATATAN PERMASALAHAN SISWA - SELURUH KELAS',nama:'Kelas '+(S.d.kelas.find(k=>k.id===S.kid)||{}).nama_kelas,sub:infoKelas()+'  |  '+grup.length+' siswa memiliki catatan',grup:grup});
    unduhBlob('Catatan Permasalahan - '+bersihFile(kNama())+'.pdf',doc.output('blob'));toast('PDF catatan permasalahan kelas siap diunduh')}
  catch(e){toast('Gagal membuat PDF: '+e.message,1)}finally{S.pdfBusy=0}}
const barisXl=l=>l.map((x,i)=>({No:i+1,Tanggal:tglID(x.tgl),Siswa:x.nama,NISN:x.nisn,'Jenis Permasalahan':x.jenis,Uraian:x.uraian,Penanganan:x.pen||'Belum ada penanganan',Status:x.sl?'Selesai':'Tindak lanjut','Dokumen Lampiran':x.dok.join('; ')}));
const LEBAR_XL={Ringkasan:[22,44],Catatan:[5,14,28,14,30,60,50,14,40],'Per Siswa':[5,28,14,16,14,10]};
function xlMasalah(){const l=listMasalah();if(!l.length)return toast('Belum ada catatan permasalahan',1);const r=ringMasalah(l),ps=[];
  l.forEach(x=>{let p=ps.find(q=>q.sid===x.sid);if(!p)ps.push(p={sid:x.sid,nama:x.nama,nisn:x.nisn,n:0,tl:0,sl:0});p.n++;if(x.sl)p.sl++;else p.tl++});
  xl('Catatan Permasalahan - '+bersihFile(kNama())+'.xlsx',{Ringkasan:[['Kelas',(S.d.kelas.find(k=>k.id===S.kid)||{}).nama_kelas||''],['Tahun ajaran',(S.d.kelas.find(k=>k.id===S.kid)||{}).tahun_ajaran||''],['Total catatan',r.total],['Tindak lanjut',r.tl],['Selesai',r.sl],['Siswa memiliki catatan',ps.length],['Tanggal unduh',tglID(hari())]].map(a=>({Keterangan:a[0],Isi:a[1]})),
    'Per Siswa':ps.map((p,i)=>({No:i+1,Siswa:p.nama,NISN:p.nisn,'Jumlah Catatan':p.n,'Tindak Lanjut':p.tl,Selesai:p.sl})),Catatan:barisXl(l)},LEBAR_XL);toast('Excel catatan permasalahan kelas siap diunduh')}
/** Jendela unduhan catatan permasalahan seluruh siswa di kelas (dari ikon unduh di judul kolom Masalah). */
function dlMasalahKelas(){const l=listMasalah(),r=ringMasalah(l),kl=S.d.kelas.find(k=>k.id===S.kid),sw=new Set(l.map(x=>x.sid)).size,d=r.total?'':' disabled';
  $('md').innerHTML=`<div class="bk" onclick="closeM()"></div><div class="dr"><div class="dh"><b>Unduh Catatan Permasalahan</b><button class="ib" aria-label="Tutup" onclick="closeM()"><i class="bi bi-x-lg"></i></button></div><div class="db"><div class="cd"><div class="who"><span class="av"><i class="bi bi-journal-text"></i></span><div><b>${kl?esc(kl.nama_kelas):'Kelas'}</b><small>${kl?'T.A. '+esc(kl.tahun_ajaran):''}</small></div></div><div class="row" style="margin-top:14px;gap:8px"><span class="bd b-p">${r.total} catatan</span><span class="bd b-i">${r.tl} tindak lanjut</span><span class="bd b-h">${r.sl} selesai</span></div><p class="sub" style="margin:12px 0 0">${r.total?`Catatan dari ${sw} siswa, dikelompokkan per siswa.`:'Belum ada catatan permasalahan di kelas ini.'}</p></div>
  <div class="row"><button class="bt pr"${d} onclick="pdfMasalah()"><i class="bi bi-filetype-pdf"></i>Unduh PDF</button><button class="bt ol"${d} onclick="xlMasalah()"><i class="bi bi-file-earmark-excel"></i>Unduh Excel</button></div></div></div>`;
  $('md').classList.add('on')}

function setTema(c,m,diam){applyTheme(c||S.tema,m||S.mode);clearTimeout(S.tt);S.tt=setTimeout(()=>call('simpanPengaturan',[{tema:S.tema,mode:S.mode}]),600);if(!diam)rTema();rBeranda()}
function rTema(){const sw=['#6D4AFF','#0284C7','#0F766E','#EA580C','#9F1239','#334155'];
  $('s-pengaturan').innerHTML=`<h1 class="h1">Pengaturan Tampilan</h1><p class="sub">Pilihan tersimpan dan langsung tampil saat aplikasi dibuka.</p>
  <div class="cd"><h3>Mode Tampilan</h3><div class="row">${[['light','Terang','bi-sun'],['dark','Gelap','bi-moon-stars']].map(m=>`<button class="ch${S.mode===m[0]?' on':''}" onclick="setTema(null,'${m[0]}')"><i class="bi ${m[2]}"></i>${m[1]}</button>`).join('')}</div></div>
  <div class="cd"><h3>Warna Tema</h3><div class="row">${sw.map(c=>`<button class="swt${S.tema.toLowerCase()===c.toLowerCase()?' on':''}" style="background:${c}" aria-label="Warna ${c}" onclick="setTema('${c}')"></button>`).join('')}<label class="swt cu" title="Warna kustom"><input type="color" value="${S.tema}" aria-label="Warna kustom" oninput="setTema(this.value,null,1)"></label></div></div>${S.user&&S.user.peran==='admin'?'':kartuAkun()}`}

function pilihBerkas(cb){const i=document.createElement('input');i.type='file';i.accept='application/pdf,image/\x2a';
  i.onchange=()=>{const f=i.files[0];if(!f)return;if(f.size>10485760)return toast('Berkas maksimal 10 MB',1);const r=new FileReader();r.onload=()=>cb(f.name,f.type,String(r.result).split(',')[1]);r.readAsDataURL(f)};i.click()}
function unduh(id){toast('Menyiapkan unduhan\u2026');call('unduhBerkas',[id],d=>{const b=Uint8Array.from(atob(d.b64),c=>c.charCodeAt(0)),a=document.createElement('a');a.href=URL.createObjectURL(new Blob([b],{type:d.mime}));a.download=d.nama;document.body.appendChild(a);a.click();a.remove()})}

const FP=[{k:'nama_lengkap',l:'Nama lengkap (beserta gelar)',r:1},{k:'nik',l:'NIK (16 digit)',p:'\\d{16}',h:'16 digit angka',m:1,i:'numeric'},{k:'nip',l:'NIP',m:1,i:'numeric'},{k:'nuptk',l:'NUPTK',m:1,i:'numeric'},{k:'tempat_lahir',l:'Tempat lahir'},{k:'tanggal_lahir',l:'Tanggal lahir',t:'date'},{k:'jenis_kelamin',l:'Jenis kelamin',t:'select',o:[['L','Laki-laki'],['P','Perempuan']]},{k:'agama',l:'Agama',t:'select',o:['Islam','Kristen','Katolik','Hindu','Buddha','Konghucu']},{k:'alamat',l:'Alamat lengkap',t:'textarea'},{k:'no_hp',l:'No. HP / WhatsApp',t:'tel'},{k:'email',l:'Email',t:'email'},{k:'jabatan',l:'Jabatan'},{k:'status_kepegawaian',l:'Status kepegawaian',t:'select',o:['','PNS','PPPK','GTY (Guru Tetap Yayasan)','GTT (Guru Tidak Tetap)','Honorer']},{k:'tmt_pengangkatan',l:'TMT pengangkatan',t:'date'},{k:'sertifikasi',l:'Sertifikasi pendidik',t:'select',o:['','Sudah bersertifikat','Belum bersertifikat']},{k:'pendidikan_terakhir',l:'Pendidikan terakhir',ph:'mis. S1 Sastra Indonesia'}];
function formProfil(){openForm('Ubah Profil Wali Kelas',FP,S.d.profil,o=>{closeM();const old={...S.d.profil};Object.assign(S.d.profil,o);persist();rProfil();
  call('simpanProfil',[o],()=>toast('Profil tersimpan'),()=>{S.d.profil=old;rProfil()})})}
const dokP=()=>{try{return JSON.parse(S.d.profil.dokumen_id_list||'[]')}catch(e){return[]}};
function upProfil(){pilihBerkas((n,m,b)=>{toast('Mengunggah\u2026');call('unggahProfil',[n,m,b],l=>{S.d.profil.dokumen_id_list=JSON.stringify(l);persist();rProfil();toast('Dokumen terunggah')})})}
function hapusDokP(id){ask('Hapus dokumen ini?',()=>call('hapusProfilDok',[id],l=>{S.d.profil.dokumen_id_list=JSON.stringify(l);persist();rProfil();toast('Dokumen dihapus')}))}
const riwL=()=>{try{const a=JSON.parse(S.d.profil.riwayat_pendidikan||'[]');return Array.isArray(a)?a:[]}catch(e){return[]}};
function simpanRiw(l,msg){const old=S.d.profil.riwayat_pendidikan;S.d.profil.riwayat_pendidikan=JSON.stringify(l);persist();rProfil();
  call('simpanRiwayat',[JSON.stringify(l)],()=>toast(msg),()=>{S.d.profil.riwayat_pendidikan=old;rProfil()})}
function formRiwayat(i){const l=riwL(),r=i===undefined?{}:l[i];
  openForm(i===undefined?'Tambah Riwayat Pendidikan':'Ubah Riwayat Pendidikan',[{k:'jenjang',l:'Jenjang',t:'select',o:['SMA/SMK/MA','D3','S1','S2','S3','Profesi (PPG)','Lainnya']},{k:'institusi',l:'Nama institusi / universitas',r:1},{k:'jurusan',l:'Jurusan / program studi'},{k:'tahun',l:'Tahun lulus',i:'numeric',p:'\\d{4}',h:'4 digit tahun'}],r,o=>{closeM();const n=l.slice();if(i===undefined)n.push(o);else n[i]=o;simpanRiw(n,'Riwayat pendidikan tersimpan')})}
function hapusRiw(i){ask('Hapus riwayat pendidikan ini?',()=>{const n=riwL();n.splice(i,1);simpanRiw(n,'Riwayat dihapus')})}
function rProfil(){const p=S.d.profil||{},dl=dokP(),rw=riwL();
  const kvh=a=>`<div class="kv">${a.map(x=>`<div${x[2]==='w'?' class="w"':''}><small>${x[0]}</small><span${x[2]==='mono'?' class="mono"':''}>${esc(x[1]||'-')}</span></div>`).join('')}</div>`;
  const foto=p.foto_id&&String(p.foto_id).startsWith('data:image/jpeg')?`<img alt="" src="${p.foto_id}">`:esc(ini(p.nama_lengkap||'WK'));
  $('s-profil').innerHTML=`<div class="hd"><h1 class="h1">Profil Wali Kelas</h1><div class="row"><button class="bt ol" onclick="pdfProfil()"><i class="bi bi-filetype-pdf"></i>PDF</button><button class="bt pr" onclick="formProfil()"><i class="bi bi-pencil-square"></i>Ubah Profil</button></div></div>
  <div class="cd pfc"><div class="pf"><span class="av">${foto}</span><b>${esc(p.nama_lengkap||'Belum diisi')}</b><small class="mono">${esc(p.jabatan||'')}</small><button class="bt ol" onclick="fotoProfil()"><i class="bi bi-camera"></i>Ganti Foto</button></div>
  <div class="pfr"><h4>Identitas Pribadi</h4>${kvh([['NIK',p.nik,'mono'],['NIP',p.nip,'mono'],['NUPTK',p.nuptk,'mono'],['Tempat, tanggal lahir',(p.tempat_lahir||'-')+', '+(tglID(p.tanggal_lahir)||'-')],['Jenis kelamin',p.jenis_kelamin==='L'?'Laki-laki':p.jenis_kelamin==='P'?'Perempuan':''],['Agama',p.agama],['No. HP / WhatsApp',p.no_hp],['Email',p.email],['Alamat',p.alamat,'w']])}
  <h4>Kepegawaian</h4>${kvh([['Jabatan',p.jabatan],['Status kepegawaian',p.status_kepegawaian],['TMT pengangkatan',tglID(p.tmt_pengangkatan)],['Pendidikan terakhir',p.pendidikan_terakhir],['Sertifikasi pendidik',p.sertifikasi]])}</div></div>
  <div class="cd"><div class="hd"><h3 style="margin:0">Riwayat Pendidikan</h3><button class="bt sf" style="height:36px" onclick="formRiwayat()"><i class="bi bi-plus-lg"></i>Tambah</button></div>${rw.length?`<div class="tw"><table style="min-width:0"><thead><tr><th>Jenjang</th><th>Institusi</th><th>Jurusan / Prodi</th><th>Tahun lulus</th><th></th></tr></thead><tbody>${rw.map((r,i)=>`<tr><td>${esc(r.jenjang)}</td><td>${esc(r.institusi)}</td><td>${esc(r.jurusan||'-')}</td><td class="mono">${esc(r.tahun||'-')}</td><td style="white-space:nowrap;text-align:right"><button class="ib" style="display:inline-grid;width:36px;height:36px" aria-label="Ubah" onclick="formRiwayat(${i})"><i class="bi bi-pencil"></i></button><button class="ib" style="display:inline-grid;width:36px;height:36px" aria-label="Hapus" onclick="hapusRiw(${i})"><i class="bi bi-trash3"></i></button></td></tr>`).join('')}</tbody></table></div>`:'<small>Belum ada riwayat. Tekan Tambah untuk mengisi S1, S2, atau PPG.</small>'}</div>
  <div class="cd"><div class="hd"><h3 style="margin:0">Dokumen Administrasi</h3><button class="bt sf" style="height:36px" onclick="upProfil()"><i class="bi bi-upload"></i>Unggah</button></div>${dl.length?`<div class="dl">${dl.map(d=>`<div class="di"><i class="bi bi-file-earmark-text"></i><span title="${esc(d.nama)}">${esc(d.nama)}</span><button class="ib" aria-label="Unduh" onclick="unduh('${esc(d.id)}')"><i class="bi bi-download"></i></button><button class="ib" aria-label="Hapus" onclick="hapusDokP('${esc(d.id)}')"><i class="bi bi-trash3"></i></button></div>`).join('')}</div>`:'<small>Belum ada dokumen. Unggah SK, ijazah, atau sertifikat (PDF/gambar, maks. 10 MB).</small>'}</div>`}
const rapotDi=(sid,t,sm)=>S.d.rapot.find(r=>r.siswa_id===sid&&r.tingkat===t&&r.semester===sm);
function cell(sid,t,sm){const r=rapotDi(sid,t,sm),u=`upRapot('${esc(sid)}','${t}','${sm}')`;
  return r?`<button class="rb" title="Unduh" aria-label="Unduh rapot ${t} ${sm}" onclick="unduh('${esc(r.file_id)}')"><i class="bi bi-download"></i></button><button class="rb" title="Hapus" aria-label="Hapus rapot ${t} ${sm}" onclick="hapusRapotUI('${esc(r.id)}')"><i class="bi bi-trash3"></i></button>`:`<button class="rb" title="Unggah" aria-label="Unggah rapot ${t} ${sm}" onclick="${u}"><i class="bi bi-upload"></i></button>`}
/** Hapus rapot: berkas Drive dan baris database ikut terhapus; sesudahnya tombol berubah jadi Unggah sehingga bisa diunggah ulang. */
function hapusRapotUI(id){const r=S.d.rapot.find(x=>x.id===id);if(!r)return;const sid=r.siswa_id,dlm=$('md').classList.contains('on');
  ask('Hapus rapot '+r.tingkat+' '+r.semester+' ini? Berkas di Drive dan data di database ikut terhapus. Setelah itu Anda bisa mengunggah rapot yang baru.',()=>call('hapusRapot',[id],()=>{
    S.d.rapot=S.d.rapot.filter(x=>x.id!==id);persist();renderAll();if(dlm)detailSiswa(sid);toast('Rapot dihapus')}))}
function upRapot(sid,t,sm){const k=S.d.kelas.find(x=>x.id===S.kid);
  pilihBerkas((n,m,b)=>{toast('Mengunggah rapot\u2026');call('unggahRapot',[sid,t,sm,k?k.tahun_ajaran:'',n,m,b],r=>{S.d.rapot=S.d.rapot.filter(x=>x.id!==r.id);S.d.rapot.push(r);persist();renderAll();if($('md').classList.contains('on'))detailSiswa(sid);toast('Rapot tersimpan')})})}
function rRapot(){const l=sis(),tot=l.length*6,ada=S.d.rapot.filter(r=>l.some(s=>s.id===r.siswa_id)).length;
  $('s-rapot').innerHTML=`<h1 class="h1">Dokumen Rapot</h1><p class="sub">Arsip rapot kelas X\u2013XII per semester \u2022 ${ada} dari ${tot} berkas terunggah</p>
  <div class="cd tw" style="padding:0">${l.length?`<table style="min-width:760px"><thead><tr><th>Siswa</th>${['X','XI','XII'].map(t=>`<th>${t} Ganjil</th><th>${t} Genap</th>`).join('')}</tr></thead><tbody>${l.map(s=>`<tr><td><div class="who">${av(s)}<b>${esc(s.nama_siswa)}</b></div></td>${['X','XI','XII'].map(t=>`<td>${cell(s.id,t,'Ganjil')}</td><td>${cell(s.id,t,'Genap')}</td>`).join('')}</tr>`).join('')}</tbody></table>`:'<div class="emp"><i class="bi bi-folder2-open"></i>Belum ada siswa di kelas ini.</div>'}</div>`}

function detailSiswa(id,bln){const s=S.d.siswa.find(x=>x.id===id);if(!s)return;bln=bln||S.bln;
  const c={Hadir:0,Sakit:0,Izin:0,Alpha:0},x=[];
  for(const k in S.am){const p=k.split('|');if(p[0]!==id||p[1].slice(0,7)!==bln)continue;const a=S.am[k];if(c[a[0]]!==undefined)c[a[0]]++;if(a[0]!=='Hadir')x.push([p[1],a[0],a[1]])}
  x.sort();const ms=S.d.masalah.filter(m=>m.siswa_id===id).sort((a,b)=>b.tanggal.localeCompare(a.tanggal));
  const kv=[['NISN',s.nisn,'mono'],['NIK',s.nik||'-','mono'],['Jenis kelamin',s.jenis_kelamin==='L'?'Laki-laki':'Perempuan'],['Tempat, tanggal lahir',(s.tempat_lahir||'-')+', '+(tglID(s.tanggal_lahir)||'-')],['Agama',s.agama],['No. WA orang tua',s.no_hp_ortu||'-'],['Ayah',s.nama_ayah||'-'],['Ibu',s.nama_ibu||'-'],['Alamat',s.alamat||'-','w']];
  MD.h=`<div class="bk" onclick="closeM()"></div><div class="dr wide"><div class="dh"><b>Detail Siswa</b><div class="row">${panahSiswa(id,'detailSiswa',1)}<button class="bt ol" onclick="hapusSiswaUI('${esc(id)}')" aria-label="Hapus siswa"><i class="bi bi-trash3"></i></button><button class="bt ol" onclick="pdfSiswa('${esc(id)}')" aria-label="Unduh PDF"><i class="bi bi-filetype-pdf"></i></button><button class="bt sf" onclick="closeM();formSiswa('${esc(id)}')"><i class="bi bi-pencil"></i>Ubah</button><button class="ib" aria-label="Tutup" onclick="closeM()"><i class="bi bi-x-lg"></i></button></div></div><div class="db">
  <div class="cd pfc"><div class="pf">${av(s)}<b>${esc(s.nama_siswa)}</b><small class="mono">${esc(s.nisn)}</small><div class="row" style="gap:8px;justify-content:center;flex-wrap:wrap"><button class="bt ol" onclick="fotoSiswa('${esc(id)}')"><i class="bi bi-camera"></i>${s.foto_id&&String(s.foto_id).startsWith('data:image/jpeg')?'Ganti Foto':'Unggah Foto'}</button>${s.foto_id&&String(s.foto_id).startsWith('data:image/jpeg')?`<button class="bt ol" style="color:#BA1A1A" onclick="hapusFotoSiswa('${esc(id)}')"><i class="bi bi-trash3"></i>Hapus Foto</button>`:''}</div></div><div class="kv">${kv.map(k=>`<div class="${k[2]==='w'?'w':''}"><small>${k[0]}</small><span${k[2]==='mono'?' class="mono"':''}>${esc(k[1])}</span></div>`).join('')}</div></div>
  <div id="kalw">${kalAbsensi(id,bln)}</div>
  <div class="cd"><div class="hd"><h3 style="margin:0">Permasalahan &amp; Penanganan</h3></div>${ms.length?`<div class="mn-list">${ms.map(m=>kartuMasalah(m)).join('')}</div>`:'<small>Belum ada catatan.</small>'}</div>
  <div class="cd"><h3>Riwayat Rapot</h3><div class="tw"><table style="min-width:0"><thead><tr><th>Kelas</th><th>Ganjil</th><th>Genap</th></tr></thead><tbody>${['X','XI','XII'].map(t=>`<tr><td><b>${t}</b></td><td>${cell(id,t,'Ganjil')}</td><td>${cell(id,t,'Genap')}</td></tr>`).join('')}</tbody></table></div></div>${berkasSiswaHtml(s)}</div></div>`;
  $('md').classList.add('on')}

function xl(nama,sheets,lebar){if(typeof XLSX==='undefined')return toast('Pustaka Excel belum termuat. Coba lagi.',1);
  const wb=XLSX.utils.book_new();Object.keys(sheets).forEach(n=>{const ws=XLSX.utils.json_to_sheet(sheets[n]);if(lebar&&lebar[n])ws['!cols']=lebar[n].map(w=>({wch:w}));XLSX.utils.book_append_sheet(wb,ws,n)});XLSX.writeFile(wb,nama)}
function simpanB64(nama,mime,b64){const b=Uint8Array.from(atob(b64),c=>c.charCodeAt(0)),a=document.createElement('a');a.href=URL.createObjectURL(new Blob([b],{type:mime}));a.download=nama;document.body.appendChild(a);a.click();a.remove()}
function pdf(judul,html){toast('Membuat PDF\u2026');call('buatPdf',[judul,html],d=>simpanB64(d.nama,'application/pdf',d.b64))}
const tbh=(h,r)=>`<table><tr>${h.map(x=>`<th>${esc(x)}</th>`).join('')}</tr>${r.map(x=>`<tr>${x.map(c=>`<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table>`;
const kNama=()=>{const k=S.d.kelas.find(x=>x.id===S.kid);return k?k.nama_kelas+' '+k.tahun_ajaran.replace('/','-'):'kelas'};
const FSIS=['nisn','nik','nama_siswa','jenis_kelamin','tempat_lahir','tanggal_lahir','agama','alamat','nama_ayah','nama_ibu','no_hp_ortu'];
function xlSiswa(){xl('Siswa '+kNama()+'.xlsx',{Siswa:sis().map(s=>{const o={No:s.no_urut};FSIS.forEach(k=>o[k]=s[k]);return o})})}
/** Panah geser siswa (sebelumnya / berikutnya) untuk header jendela siswa; fn = nama fungsi pembuka jendela itu. Berhenti di siswa pertama dan terakhir. */
function panahSiswa(id,fn,sep){const l=sis(),i=l.findIndex(x=>x.id===id);if(i<0)return '';const e=esc(id);
  return `<span class="row pg${sep?' pgs':''}" style="gap:6px"><button class="ib" aria-label="Siswa sebelumnya" title="Siswa sebelumnya" onclick="geserSiswa('${fn}',-1,'${e}')"${i<=0?' disabled':''}><i class="bi bi-chevron-left"></i></button><span class="mono rk-n">${i+1} / ${l.length}</span><button class="ib" aria-label="Siswa berikutnya" title="Siswa berikutnya" onclick="geserSiswa('${fn}',1,'${e}')"${i>=l.length-1?' disabled':''}><i class="bi bi-chevron-right"></i></button></span>`}
function geserSiswa(fn,d,id){const l=sis(),j=l.findIndex(x=>x.id===id)+d;if(j<0||j>=l.length)return;if(fn==='rekapSiswa'&&S.rk)return rekapSiswa(l[j].id,S.rk.bln,S.rk.tg);window[fn](l[j].id)}
/** Isi jendela rekap absensi: ringkasan bulan yang sedang dilihat (persentase + diagram donat + legenda) lalu kalender bulan itu. */
function rekapIsi(id,bln,tg){const s=S.d.siswa.find(x=>x.id===id),D=kalData(id,bln),c=D.c,t=ST.reduce((a,x)=>a+c[x],0),p=t?Math.round(c.Hadir/t*1000)/10:null,lb=BLN12[D.m-1]+' '+D.y;let acc=0;
  const g=t?ST.map(x=>{const a=acc/t*100;acc+=c[x];return `${CL[x]} ${a}% ${acc/t*100}%`}).join(','):'';
  return `<div class="cd rk" style="display:flex;gap:20px;align-items:center;justify-content:space-between;flex-wrap:wrap"><div style="min-width:230px;flex:1"><div class="who">${av(s)}<div><b class="rn">${esc(s.nama_siswa)}</b><div class="sub mono" style="margin:2px 0 0;font-size:13px">${esc(s.nisn)}</div></div></div><div class="row" style="margin-top:14px;gap:10px;align-items:center"><span class="sub" style="margin:0">Persentase kehadiran ${lb}</span><span class="bd ${p===null?'b-p':p>=85?'b-h':'b-a'} mono" style="font-size:18px;padding:5px 14px">${p===null?'-':p+'%'}</span><span class="sub" style="margin:0;font-size:12px">${t?'dari '+t+' hari tercatat':'belum ada data absensi'}</span></div></div><div class="row" style="gap:18px;align-items:center;flex-wrap:nowrap"><div class="dn sm" role="img" aria-label="Komposisi kehadiran ${lb}" style="background:${t?`conic-gradient(${g})`:'var(--bd)'}"><div><span>${p===null?'-':p+'%'}<small>hadir</small></span></div></div><div class="lgd" style="flex:none;min-width:150px">${ST.map(x=>`<span><b><i style="background:${CL[x]}"></i>${x}</b><span class="mono">${c[x]} (${t?Math.round(c[x]/t*100):0}%)</span></span>`).join('')}</div></div></div>${kalAbsensi(id,bln,tg||'',1)}`}
/** Jendela rekap absensi satu siswa (ikon kaca pembesar di Daftar Siswa). Panah di header berpindah ke siswa sebelumnya/berikutnya dengan bulan yang sama. */
function rekapSiswa(id,bln,tg){const s=S.d.siswa.find(x=>x.id===id);if(!s)return;
  const l=sis(),i=l.findIndex(x=>x.id===id),b=bln||hari().slice(0,7);S.rk={id:id,bln:b,tg:tg||''};
  MD.h=`<div class="bk" onclick="closeM()"></div><div class="dr wide"><div class="dh"><b>Rekap Absensi</b><div class="row" style="gap:6px">${panahSiswa(id,'rekapSiswa')}<button class="ib" aria-label="Tutup" onclick="closeM()"><i class="bi bi-x-lg"></i></button></div></div><div class="db"><div id="kalw" data-pdf="1">${rekapIsi(id,b,tg||'')}</div></div></div>`;
  $('md').classList.add('on')}
/** Jendela daftar permasalahan satu siswa (dari ikon kaca pembesar kolom Masalah di Daftar Siswa): lihat + unduh PDF/Excel. */
function masalahSiswa(id){const s=S.d.siswa.find(x=>x.id===id);if(!s)return;
  const ms=S.d.masalah.filter(m=>m.siswa_id===id).sort((a,b)=>b.tanggal.localeCompare(a.tanggal)),sl=ms.filter(m=>m.penyelesaian).length,i=esc(id);
  MD.h=`<div class="bk" onclick="closeM()"></div><div class="dr wide"><div class="dh"><b>Permasalahan Siswa</b><div class="row">${panahSiswa(id,'masalahSiswa',ms.length>0)}${ms.length?`<button class="bt ol" style="height:36px" onclick="pdfMasalahS('${i}')" aria-label="Unduh PDF"><i class="bi bi-filetype-pdf"></i><span class="dtx">PDF</span></button>`:''}<button class="ib" aria-label="Tutup" onclick="closeM()"><i class="bi bi-x-lg"></i></button></div></div><div class="db"><div class="cd rk"><div class="who">${av(s)}<div><b class="rn">${esc(s.nama_siswa)}</b><div class="sub mono" style="margin:2px 0 0;font-size:13px">${esc(s.nisn)}</div></div></div><div class="row" style="margin-top:14px;gap:8px"><span class="bd b-p">${ms.length} catatan</span><span class="bd b-i">${ms.length-sl} tindak lanjut</span><span class="bd b-h">${sl} selesai</span></div></div>
  ${ms.length?`<div class="mn-list">${ms.map(m=>kartuMasalah(m)).join('')}</div>`:'<div class="cd"><div class="emp"><i class="bi bi-journal-text"></i>Siswa ini belum punya catatan permasalahan.</div></div>'}</div></div>`;
  $('md').classList.add('on')}
/** Jendela arsip rapot satu siswa (dari ikon kaca pembesar kolom Rapot di Daftar Siswa): lihat dan unduh. */
function rapotSiswa(id){const s=S.d.siswa.find(x=>x.id===id);if(!s)return;
  const ada=S.d.rapot.filter(r=>r.siswa_id===id).length,pp=Math.round(ada/6*100);
  const sel=(t,sm)=>{const r=rapotDi(id,t,sm);return r?`<div class="row" style="gap:10px"><button class="bt sf" style="height:36px" onclick="unduh('${esc(r.file_id)}')" aria-label="Unduh rapot ${t} ${sm}"><i class="bi bi-download"></i>Unduh</button>${r.tahun_ajaran?`<small class="mono">T.A. ${esc(r.tahun_ajaran)}</small>`:''}</div>`:'<div class="row" style="min-height:36px"><span class="bd b-p" style="opacity:.7">Belum diunggah</span></div>'};
  MD.h=`<div class="bk" onclick="closeM()"></div><div class="dr wide"><div class="dh"><b>Dokumen Rapot</b><div class="row" style="gap:6px">${panahSiswa(id,'rapotSiswa')}<button class="ib" aria-label="Tutup" onclick="closeM()"><i class="bi bi-x-lg"></i></button></div></div><div class="db"><div class="cd rk"><div class="who">${av(s)}<div><b class="rn">${esc(s.nama_siswa)}</b><div class="sub mono" style="margin:2px 0 0;font-size:13px">${esc(s.nisn)}</div></div></div><div style="margin-top:14px"><div class="bh-bar"><i style="width:${pp}%"></i></div><small class="sub" style="margin:0">${ada} dari 6 berkas rapot terunggah</small></div></div>
  <div class="cd"><div class="tw"><table style="min-width:0"><thead><tr><th>Kelas</th><th>Ganjil</th><th>Genap</th></tr></thead><tbody>${['X','XI','XII'].map(t=>`<tr><td><b>${t}</b></td><td>${sel(t,'Ganjil')}</td><td>${sel(t,'Genap')}</td></tr>`).join('')}</tbody></table></div><p class="sub" style="margin:12px 0 0;font-size:12px">Untuk mengunggah atau mengganti rapot, buka menu Dokumen Rapot.</p></div></div></div>`;
  $('md').classList.add('on')}
function rekapRows(){const r=[];sis().forEach(s=>{const c={Hadir:0,Sakit:0,Izin:0,Alpha:0};for(const k in S.am){const p=k.split('|');if(p[0]===s.id&&p[1].slice(0,7)===S.bln&&c[S.am[k][0]]!==undefined)c[S.am[k][0]]++}r.push([s.no_urut,s.nisn,s.nama_siswa,c.Hadir,c.Sakit,c.Izin,c.Alpha])});return r}
const HR=['No','NISN','Nama','Hadir','Sakit','Izin','Alpha'];
function pdfRekap(){pdf('Rekap Absensi '+bulan(S.bln)+' - '+kNama(),tbh(HR,rekapRows()))}
async function pdfSiswa(id){const s=S.d.siswa.find(x=>x.id===id);if(!s)return;
  if(!(window.jspdf&&window.jspdf.jsPDF))return toast('Pustaka PDF belum termuat. Coba lagi.',1);
  toast('Membuat PDF biodata (gaya resume)...');
  const NV=navyDari(hexRgb(S.tema)),kl=S.d.kelas.find(k=>k.id===s.kelas_id),foto=await fotoBulat(s.foto_id,s.nama_siswa,NV),ada=v=>v!=null&&String(v).trim()!=='';
  const c={Hadir:0,Sakit:0,Izin:0,Alpha:0};for(const k in S.am){if(k.split('|')[0]!==id)continue;const a=S.am[k];if(c[a[0]]!==undefined)c[a[0]]++}
  const tot=c.Hadir+c.Sakit+c.Izin+c.Alpha,kontak=[['phone',ada(s.no_hp_ortu)?'WA orang tua: '+s.no_hp_ortu:''],['home',s.alamat]].filter(r=>ada(r[1])),
    ring=[kl?'Siswa kelas '+kl.nama_kelas+', T.A. '+kl.tahun_ajaran:'Siswa',ada(s.nisn)?'NISN '+s.nisn:''].filter(Boolean).join('. ')+'.';
  const doc=buatResume({warna:NV,foto:foto,nama:s.nama_siswa,sub:'Siswa'+(kl?' '+kl.nama_kelas:''),ringkas:ring,footer:'Administrasi Wali Kelas',
    samping:[{judul:'KONTAK',ikon:kontak.length?kontak:[['pin','-']]},{judul:'IDENTITAS',kv:[['NISN',s.nisn],['NIK',s.nik]]},
      kl?{judul:'KELAS',kv:[['Kelas',kl.nama_kelas],['Tahun ajaran',kl.tahun_ajaran]].concat(ada(s.no_urut)?[['No. urut',s.no_urut]]:[])}:null,
      {judul:'KEHADIRAN',bar:tot?['Hadir','Sakit','Izin','Alpha'].map(n=>[n,Math.round(c[n]/tot*100),Math.round(c[n]/tot*1000)/10+'%']):null,cat:tot?'dari '+tot+' hari tercatat':'Belum ada data absensi'}],
    seksi:[{judul:'Data Pribadi',ikon:'person',kv:[['Tempat, tanggal lahir',(s.tempat_lahir||'-')+', '+(tglID(s.tanggal_lahir)||'-')],['Jenis kelamin',s.jenis_kelamin==='L'?'Laki-laki':s.jenis_kelamin==='P'?'Perempuan':'-'],['Agama',s.agama]]},
      {judul:'Data Orang Tua',ikon:'home',kv:[['Nama ayah',s.nama_ayah],['Nama ibu',s.nama_ibu]]}]});
  unduhBlob('Biodata Siswa - '+String(s.nama_siswa||'Siswa').replace(/[^\w ]/g,'')+'.pdf',doc.output('blob'));toast('PDF biodata gaya resume siap diunduh')}

let IM=null;
function paketSheets(kid,ref){const k=S.d.kelas.filter(x=>x.id===kid);if(!k.length){toast('Pilih kelas',1);return null}
  const sw=S.d.siswa.filter(s=>s.kelas_id===kid),ids=new Set(sw.map(s=>s.id)),rp=S.d.rapot.filter(r=>ids.has(r.siswa_id));
  const ab=S.d.absensi.filter(a=>a[0]===kid).map(a=>({kelas_id:a[0],siswa_id:a[1],tanggal:a[2],status:a[3],keterangan:a[4]}));
  const pick=(a,ks)=>a.map(o=>{const r={};ks.forEach(c=>r[c]=o[c]==null?'':o[c]);return r});
  return{k:k[0],rp,nama:'Paket_'+k[0].nama_kelas+'_'+k[0].tahun_ajaran.replace('/','-')+'_v1.0',sheets:{
    Kelas:pick(k,['id','nama_kelas','tingkat','tahun_ajaran','jurusan','status']),Siswa:pick(sw,['id','kelas_id','no_urut'].concat(FSIS)),Absensi:ab,
    Permasalahan:pick(S.d.masalah.filter(m=>m.kelas_id===kid),['id','kelas_id','siswa_id','tanggal','jenis_masalah','uraian','penyelesaian']),
    Rapot:rp.map(r=>({siswa_id:r.siswa_id,tingkat:r.tingkat,semester:r.semester,tahun_ajaran:r.tahun_ajaran,catatan:r.catatan,file_ref:ref?r.file_id:''})),
    _meta:[{schema_version:'1.0',exported_at:new Date().toISOString(),jumlah_siswa:sw.length}]}}}
function xlPaket(){const q=paketSheets($('ex_k').value);if(q)xl(q.nama+'.xlsx',q.sheets)}
function unduhBlob(nama,blob){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=nama;document.body.appendChild(a);a.click();a.remove()}
async function zipPaket(){if(typeof JSZip==='undefined'||typeof XLSX==='undefined')return toast('Pustaka belum termuat. Coba lagi.',1);
  const q=paketSheets($('ex_k').value,1);if(!q)return;const zip=new JSZip(),wb=XLSX.utils.book_new();
  Object.keys(q.sheets).forEach(n=>XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(q.sheets[n]),n));
  zip.file(q.nama+'.xlsx',XLSX.write(wb,{type:'array',bookType:'xlsx'}));
  for(let i=0;i<q.rp.length;i++){toast('Mengambil berkas rapot '+(i+1)+' / '+q.rp.length+'\u2026');
    const d=await new Promise(ok=>call('unduhBerkas',[q.rp[i].file_id],ok,()=>ok(null)));
    if(d)zip.file('berkas/'+q.rp[i].file_id+'.'+(d.mime==='application/pdf'?'pdf':d.mime.split('/')[1].replace('jpeg','jpg')),d.b64,{base64:true})}
  unduhBlob(q.nama+'_lengkap.zip',await zip.generateAsync({type:'blob'}));toast('Paket lengkap siap diunduh')}
async function sambungBerkas(r,im){let n=0;
  for(const x of im.rapot){const sid=r.sm&&r.sm[x.siswa_id];if(!sid||!x.file_ref)continue;
    const key=Object.keys(im.zip.files).find(k=>k.startsWith('berkas/'+x.file_ref+'.'));if(!key)continue;
    const ext=key.split('.').pop().toLowerCase(),mime=ext==='pdf'?'application/pdf':'image/'+(ext==='jpg'?'jpeg':ext),b64=await im.zip.file(key).async('base64');
    toast('Mengunggah rapot '+(++n)+'\u2026');await new Promise(ok=>call('unggahRapot',[sid,x.tingkat,x.semester,x.tahun_ajaran,x.catatan||('rapot.'+ext),mime,b64],ok,()=>ok()))}}
function xlTemplate(){if(typeof XLSX==='undefined')return toast('Pustaka Excel belum termuat. Coba lagi.',1);
  const H=['NISN','NIK','Nama Lengkap','Jenis Kelamin (L/P)','Tempat Lahir','Tanggal Lahir (HH/BB/TTTT)','Agama','Alamat','Nama Ayah','Nama Ibu','No WA Orang Tua'],ws=XLSX.utils.aoa_to_sheet([H]);
  for(let r=1;r<=60;r++)for(let c=0;c<H.length;c++)ws[XLSX.utils.encode_cell({r:r,c:c})]={t:'s',v:'',z:'@'};
  ws['!ref']=XLSX.utils.encode_range({s:{r:0,c:0},e:{r:60,c:H.length-1}});ws['!cols']=H.map((h,i)=>({wch:i===7?38:i<2?20:19}));
  const pt=XLSX.utils.aoa_to_sheet([['Petunjuk pengisian template data siswa'],['1. Isi data mulai baris 2 pada sheet Siswa. Satu siswa satu baris. Jangan mengubah judul kolom.'],['2. NISN wajib, 10 digit angka. NIK 16 digit angka (boleh kosong).'],['3. Jenis Kelamin tulis L atau P.'],['4. Tanggal Lahir tulis HH/BB/TTTT, contoh 14/05/2010.'],['5. Maksimal 45 siswa per kelas. Simpan sebagai .xlsx, lalu unggah lewat tombol Unggah Template.'],[''],['Contoh baris: 0087654321 | 3201010101100001 | Budi Santoso | L | Bandung | 14/05/2010 | Islam | Jl. Melati No. 12 | Slamet Santoso | Siti Aminah | 081234567890']]);
  pt['!cols']=[{wch:120}];const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Siswa');XLSX.utils.book_append_sheet(wb,pt,'Petunjuk');XLSX.writeFile(wb,'Template Data Siswa.xlsx')}
function pilihPaket(){const i=document.createElement('input');i.type='file';i.accept='.xlsx,.zip';
  i.onchange=()=>{const f=i.files[0];if(!f)return;if(typeof XLSX==='undefined')return toast('Pustaka Excel belum termuat',1);if(f.size>2e7)return toast('Berkas terlalu besar',1);
    const r=new FileReader();r.onload=()=>{const bad=()=>toast('Berkas tidak dapat dibaca',1);if(/\.zip$/i.test(f.name)){if(typeof JSZip==='undefined')return bad();JSZip.loadAsync(r.result).then(z=>{const n=Object.keys(z.files).find(k=>/\.xlsx$/i.test(k)&&!k.includes('/'));if(!n)return bad();return z.file(n).async('arraybuffer').then(b=>parsePaket(XLSX.read(b,{type:'array'}),z))}).catch(bad)}else{try{parsePaket(XLSX.read(r.result,{type:'array'}))}catch(e){bad()}}};r.readAsArrayBuffer(f)};i.click()}
const AL=[['namaayah','nama_ayah'],['namaibu','nama_ibu'],['namalengkap','nama_siswa'],['namasiswa','nama_siswa'],['nama','nama_siswa'],['nisn','nisn'],['nik','nik'],['jeniskelamin','jenis_kelamin'],['jk','jenis_kelamin'],['tempatlahir','tempat_lahir'],['tanggallahir','tanggal_lahir'],['agama','agama'],['alamat','alamat'],['nowa','no_hp_ortu'],['nohp','no_hp_ortu']];
function petaSiswa(r){const o={};for(const k in r){const n=k.toLowerCase().replace(/[^a-z]/g,''),a=AL.find(x=>n.startsWith(x[0]));if(a&&o[a[1]]===undefined)o[a[1]]=String(r[k]).trim()}return o}
function normTgl(v){v=String(v||'').trim();if(!v)return '';let m=v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if(m)return m[1]+'-'+m[2].padStart(2,'0')+'-'+m[3].padStart(2,'0');
  m=v.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/);if(!m)return null;
  let d=+m[1],o=+m[2],y=m[3];if(o>12&&d<=12){const t=d;d=o;o=t}if(o>12||d>31||d<1||o<1)return null;if(y.length===2)y=(+y>30?'19':'20')+y;
  return y+'-'+String(o).padStart(2,'0')+'-'+String(d).padStart(2,'0')}
function bacaTemplate(wb){const sh=wb.Sheets['Siswa']||wb.Sheets[wb.SheetNames[0]];if(!sh)return null;
  const rows=XLSX.utils.sheet_to_json(sh,{defval:'',raw:false}),ok=[],err=[],seen={};
  rows.forEach((r,i)=>{const o=petaSiswa(r),no=i+2;if(!o.nisn&&!o.nama_siswa&&!o.nik)return;
    o.nisn=String(o.nisn||'').replace(/\D/g,'');if(o.nisn.length>=8&&o.nisn.length<10)o.nisn=o.nisn.padStart(10,'0');
    o.nik=String(o.nik||'').replace(/\D/g,'');
    const j=String(o.jenis_kelamin||'').toLowerCase();o.jenis_kelamin=/^(l|lk|laki)/.test(j)?'L':/^(p|pr|perempuan)/.test(j)?'P':'';
    const t=normTgl(o.tanggal_lahir);let m='';
    if(!/^\d{10}$/.test(o.nisn))m='NISN harus 10 digit angka';else if(o.nik&&!/^\d{16}$/.test(o.nik))m='NIK harus 16 digit angka';
    else if(!o.nama_siswa)m='Nama lengkap kosong';else if(t===null)m='Format tanggal lahir tidak dikenali (pakai HH/BB/TTTT)';
    else if(seen[o.nisn])m='NISN ganda dalam berkas (baris '+seen[o.nisn]+')';
    if(m){err.push({baris:no,nisn:o.nisn||'-',nama:o.nama_siswa||'-',pesan:m});return}
    seen[o.nisn]=no;o.tanggal_lahir=t||'';ok.push(Object.assign(o,{id:'t'+i,kelas_id:'T'}))});
  return{ok:ok,err:err}}
function parsePaket(wb,zip){const g=n=>wb.Sheets[n]?XLSX.utils.sheet_to_json(wb.Sheets[n],{defval:'',raw:false}):null,meta=g('_meta');let p,err=[];
  if(meta&&meta[0]){const sw=g('Siswa');if(!sw||!sw.length||!('nisn' in sw[0]))return toast('Sheet Siswa tidak ditemukan atau kolom tidak sesuai',1);
    if(String(meta[0].schema_version)!=='1.0')return toast('Versi skema '+meta[0].schema_version+' tidak cocok (dibutuhkan 1.0)',1);
    p={kelas:g('Kelas')||[],siswa:sw,absensi:g('Absensi')||[],masalah:g('Permasalahan')||[]};if(!p.kelas.length)return toast('Sheet Kelas kosong',1)}
  else{const k=S.d.kelas.find(x=>x.id===S.kid);if(!k)return toast('Buat kelas terlebih dahulu',1);const t=bacaTemplate(wb);
    if(!t||(!t.ok.length&&!t.err.length))return toast('Tidak ada data siswa di berkas. Pakai template dari tombol Unduh Template.',1);
    err=t.err;p={kelas:[{id:'T',nama_kelas:k.nama_kelas,tingkat:k.tingkat,tahun_ajaran:k.tahun_ajaran,jurusan:k.jurusan}],siswa:t.ok,absensi:[],masalah:[]}}
  const konf=p.siswa.filter(s=>{const kk=p.kelas.find(k=>k.id===s.kelas_id),t=kk&&S.d.kelas.find(x=>x.nama_kelas===kk.nama_kelas&&x.tahun_ajaran===kk.tahun_ajaran);return t&&S.d.siswa.some(x=>x.kelas_id===t.id&&x.nisn===String(s.nisn))});
  IM={p:p,konf:konf,err:err,zip:zip||null,rapot:(meta&&meta[0]?g('Rapot')||[]:[])};showPv()}
function showPv(){S.pvInline=S.sec==='estafet';
  if(S.pvInline)return rEstafet();
  $('md').innerHTML=`<div class="bk" onclick="batalImpor()"></div><div class="dr wide"><div class="dh"><b>Pratinjau Impor Siswa</b><button class="ib" aria-label="Tutup" onclick="batalImpor()"><i class="bi bi-x-lg"></i></button></div><div class="db">${pvHtml()}</div></div>`;$('md').classList.add('on')}
function batalImpor(){IM=null;S.pvInline=false;closeM();rEstafet()}
function jalankanImpor(){const a=document.querySelector('input[name=ak]:checked'),b=$('im'),im=IM;b.disabled=true;toast('Mengimpor data\u2026');
  call('imporPaket',[im.p,a?a.value:'lewati'],async r=>{IM=null;closeM();if(im.zip)await sambungBerkas(r,im);call('boot',[],d=>{setData(d);persist();toast(`Impor selesai: ${r.siswa} siswa baru, ${r.diperbarui} diperbarui, ${r.dilewati} dilewati, ${r.absensi} absensi`)})},()=>{b.disabled=false})}
function pvHtml(){const p=IM.p,n=IM.konf.length,e=IM.err||[],tpl=p.kelas.length===1&&p.kelas[0].id==='T',baru=p.siswa.length-n,sisa=45-sis().length;
  const kartu=tpl?sc('Siswa valid',p.siswa.length,'siap diimpor','bi-people','t1')+sc('Baru',baru,'akan ditambahkan','bi-person-plus','t3')+sc('Sudah ada',n,'NISN sama','bi-exclamation-triangle','t2')+sc('Bermasalah',e.length,'baris dilewati','bi-x-octagon','t0')
    :sc('Kelas',p.kelas.length,'dalam berkas','bi-collection','t0')+sc('Siswa',p.siswa.length,(p.siswa.length-n)+' baru','bi-people','t1')+sc('Absensi',p.absensi.length,'entri','bi-calendar-check','t3')+sc('Konflik NISN',n,'sudah ada','bi-exclamation-triangle','t2');
  return `<div class="cd"><h3>Pratinjau Impor (Dry-run)</h3><div class="g4" style="margin-bottom:16px">${kartu}</div>
  ${e.length?`<div class="tw"><table style="min-width:0"><thead><tr><th>Baris</th><th>NISN</th><th>Nama</th><th>Masalah</th></tr></thead><tbody>${e.slice(0,30).map(x=>`<tr><td class="mono">${x.baris}</td><td class="mono">${esc(x.nisn)}</td><td>${esc(x.nama)}</td><td>${esc(x.pesan)}</td></tr>`).join('')}</tbody></table></div><p class="sub" style="margin:10px 0">Baris bermasalah tidak diimpor. Perbaiki di Excel lalu unggah lagi, atau lanjutkan untuk data yang valid.</p>`:''}
  ${tpl&&baru>sisa?`<p style="color:var(--a);margin:10px 0">Kapasitas kelas 45 siswa: hanya ${Math.max(sisa,0)} siswa baru yang bisa masuk.</p>`:''}
  ${n?`<div class="tw"><table style="min-width:0"><thead><tr><th>NISN</th><th>Nama</th></tr></thead><tbody>${IM.konf.slice(0,20).map(s=>`<tr><td class="mono">${esc(s.nisn)}</td><td>${esc(s.nama_siswa)}</td></tr>`).join('')}</tbody></table></div><div class="row" style="margin:12px 0"><label><input type="radio" name="ak" value="lewati" checked> Lewati yang sudah ada</label><label><input type="radio" name="ak" value="timpa"> Timpa data lama</label></div>`:''}
  <div class="row" style="margin-top:12px"><button class="bt ol" onclick="batalImpor()">Batal</button><button class="bt pr" id="im" onclick="jalankanImpor()"${p.siswa.length?'':' disabled'}><i class="bi bi-check2-circle"></i>Konfirmasi &amp; Impor</button></div></div>`}
function rEstafet(){
  $('s-estafet').innerHTML=`<h1 class="h1">Download / Upload Data Kelas</h1><p class="sub">Estafet data antar wali kelas. Dokumen pribadi guru tidak ikut. Paket .zip menyertakan berkas rapot.</p>
  <div class="g2"><div class="cd"><h3>Unduh Paket Data Kelas</h3><label class="fl"><span>Rombongan belajar</span><select id="ex_k">${S.d.kelas.map(k=>`<option value="${esc(k.id)}"${k.id===S.kid?' selected':''}>${esc(k.nama_kelas)} \u2022 ${esc(k.tahun_ajaran)}${k.status==='arsip'?' (arsip)':''}</option>`).join('')}</select></label><div class="row" style="margin-top:14px"><button class="bt pr" onclick="xlPaket()"><i class="bi bi-download"></i>Paket Data (.xlsx)</button><button class="bt sf" onclick="zipPaket()"><i class="bi bi-file-earmark-zip"></i>Paket Lengkap (.zip)</button></div></div>
  <div class="cd"><h3>Unggah Data</h3><p class="sub" style="margin-bottom:12px">Paket Data Kelas, atau template siswa untuk kelas aktif.</p><div class="row"><button class="bt pr" onclick="pilihPaket()"><i class="bi bi-upload"></i>Pilih Berkas .xlsx / .zip</button><button class="bt ol" onclick="xlTemplate()"><i class="bi bi-file-earmark-excel"></i>Unduh Template Siswa</button></div></div></div>${IM&&S.pvInline?pvHtml():''}`}

const av=s=>s.foto_id&&String(s.foto_id).startsWith('data:image/jpeg')?`<span class="av"><img alt="" src="${s.foto_id}"></span>`:`<span class="av">${esc(ini(s.nama_siswa))}</span>`;
function pilihFoto(cb,z0){const i=document.createElement('input');i.type='file';i.accept='image/\x2a';
  i.onchange=()=>{const f=i.files[0];if(!f)return;const im=new Image();im.onload=()=>{const c=document.createElement('canvas'),z=z0||160,m=Math.min(im.width,im.height);c.width=c.height=z;c.getContext('2d').drawImage(im,(im.width-m)/2,(im.height-m)/2,m,m,0,0,z,z);URL.revokeObjectURL(im.src);cb(c.toDataURL('image/jpeg',z0?.7:.75))};im.onerror=()=>toast('Gambar tidak dapat dibaca',1);im.src=URL.createObjectURL(f)};i.click()}
/** Hapus foto siswa: kolom foto_id di database dikosongkan; sesudahnya tombol jadi "Unggah Foto" sehingga bisa mengunggah foto baru. */
function hapusFotoSiswa(id){const s=S.d.siswa.find(x=>x.id===id);if(!s)return;
  ask('Hapus foto '+s.nama_siswa+'? Foto di database ikut terhapus. Setelah itu Anda bisa mengunggah foto yang baru.',()=>call('hapusFoto',['siswa',id],()=>{s.foto_id='';persist();renderAll();detailSiswa(id);toast('Foto dihapus')}))}
function fotoSiswa(id){pilihFoto(u=>{const s=S.d.siswa.find(x=>x.id===id),old=s.foto_id;s.foto_id=u;renderAll();detailSiswa(id);
  call('simpanFoto',['siswa',id,u],()=>{persist();toast('Foto tersimpan')},()=>{s.foto_id=old;renderAll()})},256)}
function fotoProfil(){pilihFoto(u=>{const old=S.d.profil.foto_id;S.d.profil.foto_id=u;rProfil();
  call('simpanFoto',['profil','',u],()=>{persist();toast('Foto tersimpan')},()=>{S.d.profil.foto_id=old;rProfil()})},256)}
function hexRgb(h){h=String(h||'#6D4AFF').replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');const n=parseInt(h,16);return isNaN(n)?[109,74,255]:[(n>>16)&255,(n>>8)&255,n&255]}
const campur=(a,b,t)=>a.map((v,i)=>Math.round(v*(1-t)+b[i]*t));
function rrPath(x,a,b,w,h,r){x.beginPath();x.moveTo(a+r,b);x.arcTo(a+w,b,a+w,b+h,r);x.arcTo(a+w,b+h,a,b+h,r);x.arcTo(a,b+h,a,b,r);x.arcTo(a,b,a+w,b,r);x.closePath()}
const ikonCache={};
function ikonPng(n,rgb,b){const key=n+rgb.join(',')+(b?'o':'');if(ikonCache[key])return ikonCache[key];
  const c=document.createElement('canvas');c.width=c.height=96;const x=c.getContext('2d'),ac='rgb('+rgb.join(',')+')';
  x.fillStyle=ac;if(b){x.beginPath();x.arc(48,48,48,0,6.3);x.fill();x.translate(48,48);x.scale(.84,.84);x.translate(-48,-48)}else{rrPath(x,0,0,96,96,26);x.fill()}x.strokeStyle='#ffffff';x.fillStyle='#ffffff';x.lineWidth=6;x.lineCap='round';x.lineJoin='round';
  const P=(...a)=>{x.beginPath();a.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]))};
  const I={
    person(){x.beginPath();x.arc(48,35,13,0,6.3);x.fill();x.beginPath();x.moveTo(23,74);x.quadraticCurveTo(48,36,73,74);x.closePath();x.fill()},
    idcard(){rrPath(x,18,28,60,40,6);x.stroke();x.beginPath();x.arc(34,45,6,0,6.3);x.fill();P([46,42],[68,42]);x.stroke();P([46,54],[64,54]);x.stroke()},
    briefcase(){rrPath(x,18,36,60,36,6);x.stroke();P([38,36],[38,26],[58,26],[58,36]);x.stroke();P([18,52],[78,52]);x.stroke()},
    cap(){P([48,26],[80,42],[48,58],[16,42]);x.closePath();x.fill();P([30,52],[30,64]);x.quadraticCurveTo(48,76,66,64);x.lineTo(66,52);x.stroke()},
    calendar(){rrPath(x,20,30,56,44,6);x.stroke();P([20,45],[76,45]);x.stroke();P([36,22],[36,34]);x.stroke();P([60,22],[60,34]);x.stroke()},
    pin(){x.beginPath();x.arc(48,40,19,Math.PI,0);x.lineTo(48,78);x.closePath();x.fill();x.fillStyle=ac;x.beginPath();x.arc(48,40,7,0,6.3);x.fill()},
    phone(){rrPath(x,30,18,36,60,7);x.stroke();P([43,66],[53,66]);x.stroke()},
    mail(){rrPath(x,18,28,60,40,6);x.stroke();P([20,32],[48,52],[76,32]);x.stroke()},
    home(){P([48,24],[78,50],[70,50],[70,74],[26,74],[26,50],[18,50]);x.closePath();x.stroke()},
    star(){x.beginPath();for(let i=0;i<10;i++){const r=i%2?11:26,a=-Math.PI/2+i*Math.PI/5;x.lineTo(48+r*Math.cos(a),50+r*Math.sin(a))}x.closePath();x.fill()}
  };(I[n]||I.person)();return ikonCache[key]=c.toDataURL('image/png')}
function fotoBulat(src,nama,rgb){return new Promise(ok=>{const c=document.createElement('canvas'),z=320;c.width=c.height=z;const x=c.getContext('2d');
  x.beginPath();x.arc(z/2,z/2,z/2,0,6.3);x.closePath();x.save();x.clip();
  if(src&&String(src).startsWith('data:image/jpeg')){const im=new Image();im.onload=()=>{x.drawImage(im,0,0,z,z);x.restore();ok(c.toDataURL('image/png'))};im.onerror=()=>{x.restore();ok(null)};im.src=src;return}
  x.fillStyle='rgb('+campur(rgb,[255,255,255],.82).join(',')+')';x.fillRect(0,0,z,z);x.fillStyle='rgb('+rgb.join(',')+')';x.font='700 115px sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(ini(nama||'WK'),z/2,z/2+8);x.restore();ok(c.toDataURL('image/png'))})}
/** PDF bergaya resume: kolom samping krem (foto, kontak, identitas) + kolom utama (nama, ringkasan, bagian-bagian). Dipakai biodata wali kelas dan siswa. */
const navyDari=a=>campur(a,[14,16,46],.55);
function buatResume(o){
  const doc=new window.jspdf.jsPDF({unit:'mm',format:'a4'}),NV=o.warna,CR=[248,243,238],BZ=[226,210,196],AC=[222,198,178],TX=[36,38,60],GR=[112,108,140],W=[255,255,255],
    t=s=>String(s==null||s===''?'-':s).replace(/[^\x20-\x7e\xa0-\xff]/g,'?'),SX=10,SW=52,RX=80,RW=116,TXT=RX+13,TW=196-TXT;
  let y=0,sy=74;
  const dasar=ft=>{doc.setFillColor(...W);doc.rect(0,0,210,297,'F');doc.setFillColor(...NV);doc.rect(0,279,210,18,'F');doc.setFillColor(...W);doc.rect(70,279,140,10,'F');
    doc.setFillColor(...CR);doc.roundedRect(-14,-14,84,303,10,10,'F');
    if(ft){doc.setFillColor(...NV);doc.roundedRect(7,-14,56,76,14,14,'F');doc.setFillColor(...W);doc.circle(35,33,24,'F');doc.addImage(ft,'PNG',35-22.4,33-22.4,44.8,44.8,'foto','FAST')}};
  /* ---- kolom samping ---- */
  const sIkon=rows=>rows.forEach(r=>{doc.setFont('helvetica','normal');doc.setFontSize(8.6);doc.setTextColor(...TX);const L=doc.splitTextToSize(t(r[1]),SW-10).slice(0,6);
    doc.addImage(ikonPng(r[0],NV,1),'PNG',SX,sy,6.4,6.4,'ik_'+r[0]+'o','FAST');doc.text(L,SX+9,sy+4.2);sy+=Math.max(6.4,L.length*3.9+1.2)+2.6});
  const sKV=rows=>{sy+=1;rows.forEach(r=>{doc.setFont('helvetica','normal');doc.setFontSize(7.2);doc.setTextColor(...GR);doc.text(String(r[0]).toUpperCase(),SX,sy,{charSpace:.4});sy+=3.9;
    doc.setFont('helvetica','bold');doc.setFontSize(9);doc.setTextColor(...TX);const L=doc.splitTextToSize(t(r[1]),SW);doc.text(L,SX,sy);sy+=L.length*4+2.4})};
  const sBar=rows=>{sy+=1.5;rows.forEach(r=>{doc.setFont('helvetica','normal');doc.setFontSize(8.4);doc.setTextColor(...TX);doc.text(r[0],SX,sy);const bx=SX+15,bw=27;
    doc.setFillColor(...campur(NV,W,.85));doc.roundedRect(bx,sy-2.4,bw,2.2,1.1,1.1,'F');if(r[1]>0){doc.setFillColor(...NV);doc.roundedRect(bx,sy-2.4,Math.max(2.2,bw*r[1]/100),2.2,1.1,1.1,'F')}
    doc.text(r[2],SX+SW,sy,{align:'right'});sy+=6.2})};
  /* ---- kolom utama ---- */
  const rBaru=()=>{doc.addPage();dasar(null);y=20};
  const rGaris=()=>{doc.setDrawColor(...BZ);doc.setLineWidth(.3);doc.line(RX,y,196,y);y+=7};
  const rHead=(ik,j)=>{doc.addImage(ikonPng(ik,NV,1),'PNG',RX,y,9,9,'ik_'+ik+'o','FAST');doc.setFont('times','bold');doc.setFontSize(12.5);doc.setTextColor(...NV);doc.text(String(j).toUpperCase(),TXT,y+6.1,{charSpace:.45});y+=13.5};
  const mKV=rows=>{doc.setFont('helvetica','bold');doc.setFontSize(9);return rows.map(r=>{const L=doc.splitTextToSize(t(r[1]),TW-40);return{l:r[0],L:L,h:L.length*4.4+1.6}})};
  const rKV=m=>m.forEach(r=>{doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(...GR);doc.text(r.l,TXT,y);doc.text(':',TXT+37,y);doc.setFont('helvetica','bold');doc.setTextColor(...TX);doc.text(r.L,TXT+40,y);y+=r.h});
  const mTL=items=>items.map(it=>{doc.setFont('helvetica','bold');doc.setFontSize(9.6);const a=doc.splitTextToSize(t(it.h),196-(TXT+7)-22);
    doc.setFont('helvetica','italic');doc.setFontSize(8.8);const b=it.sub?doc.splitTextToSize(t(it.sub),196-(TXT+7)-22):[];return{a:a,b:b,r:it.r,h:a.length*4.3+b.length*3.9+3.8}});
  const rTL=m=>{const x0=TXT+1,tx=TXT+7;let g=[];
    const tulis=()=>{if(!g.length)return;if(g.length>1){doc.setDrawColor(...BZ);doc.setLineWidth(.4);doc.line(x0,g[0].p-1.2,x0,g[g.length-1].p-1.2)}
      g.forEach(e=>{const r=e.r,p=e.p;doc.setFillColor(...NV);doc.circle(x0,p-1.2,1,'F');doc.setFont('helvetica','bold');doc.setFontSize(9.6);doc.setTextColor(...TX);doc.text(r.a,tx,p);
        if(r.r){doc.setFont('helvetica','normal');doc.setFontSize(8.8);doc.text(t(r.r),196,p,{align:'right'})}
        if(r.b.length){doc.setFont('helvetica','italic');doc.setFontSize(8.8);doc.setTextColor(...GR);doc.text(r.b,tx,p+r.a.length*4.3)}});g=[]};
    m.forEach(r=>{if(y+r.h>278){tulis();rBaru();y=24}g.push({r:r,p:y});y+=r.h});tulis()};
  /* ---- gambar halaman 1 ---- */
  dasar(o.foto);
  o.samping.filter(Boolean).forEach((b,i)=>{if(i){sy+=1;doc.setDrawColor(...BZ);doc.setLineWidth(.3);doc.line(SX,sy,SX+SW,sy);sy+=7}
    doc.setFont('times','bold');doc.setFontSize(11.5);doc.setTextColor(...NV);doc.text(b.judul,SX,sy,{charSpace:.55});doc.setDrawColor(...NV);doc.setLineWidth(.7);doc.line(SX,sy+1.9,SX+7,sy+1.9);sy+=(b.ikon?6.4:7);
    if(b.ikon)sIkon(b.ikon);if(b.kv)sKV(b.kv);if(b.bar)sBar(b.bar);
    if(b.cat){doc.setFont('helvetica','italic');doc.setFontSize(7.6);doc.setTextColor(...GR);doc.text(b.cat,SX,sy);sy+=4}});
  let fs=26;const nm=t(o.nama).toUpperCase();doc.setFont('times','bold');while(fs>17&&doc.setFontSize(fs).getTextWidth(nm)>RW)fs--;doc.setFontSize(fs);
  const nl=doc.splitTextToSize(nm,RW);y=27;doc.setTextColor(...NV);doc.text(nl,RX,y);y+=(nl.length-1)*fs*1.15*.3528+6;
  doc.setDrawColor(...AC);doc.setLineWidth(.9);doc.line(RX,y,RX+16,y);doc.setFillColor(...AC);doc.circle(RX+18.4,y,1.1,'F');y+=9;
  doc.setFont('helvetica','normal');doc.setFontSize(10.5);doc.setTextColor(...NV);const sl=doc.splitTextToSize(t(o.sub).toUpperCase(),RW/1.22);doc.text(sl,RX,y,{charSpace:1.7});y+=sl.length*5+3;
  if(o.ringkas){doc.setFontSize(9.2);doc.setTextColor(...TX);const rl=doc.splitTextToSize(t(o.ringkas),RW);doc.text(rl,RX,y,{lineHeightFactor:1.45});y+=rl.length*4.7+2}
  y+=2;doc.setDrawColor(...BZ);doc.setLineWidth(.3);doc.line(RX,y,196,y);doc.setFillColor(...AC);const mx=(RX+196)/2;doc.lines([[2.2,2.2],[-2.2,2.2],[-2.2,-2.2]],mx,y-2.2,[1,1],'F',true);y+=9;
  o.seksi.forEach((s,i)=>{const m=s.kv?mKV(s.kv):null,tl=s.tl&&s.tl.length?mTL(s.tl):null,h=13.5+(m?m.reduce((a,r)=>a+r.h,0):tl?tl[0].h:6)+4;
    if(y+h>276)rBaru();rHead(s.ikon,s.judul);
    if(m)rKV(m);else if(tl)rTL(tl);else{doc.setFont('helvetica','italic');doc.setFontSize(9);doc.setTextColor(...GR);doc.text(s.kosong||'-',TXT,y);y+=6}
    if(i<o.seksi.length-1){y+=1;rGaris()}});
  const n=doc.getNumberOfPages(),tg=new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
  for(let i=1;i<=n;i++){doc.setPage(i);doc.setFont('helvetica','normal');doc.setFontSize(7.2);doc.setTextColor(...W);doc.text(t(o.footer)+'  |  dicetak '+tg,RX,294.3);doc.text('Halaman '+i+' / '+n,196,294.3,{align:'right'})}
  return doc}
const urutThn=l=>l.map((r,i)=>[r,i]).sort((a,b)=>(Number(b[0].tahun)||0)-(Number(a[0].tahun)||0)||a[1]-b[1]).map(x=>x[0]);
async function pdfProfil(){
  if(!(window.jspdf&&window.jspdf.jsPDF))return toast('Pustaka PDF belum termuat. Coba lagi.',1);
  toast('Membuat PDF biodata (gaya resume)...');
  const p=S.d.profil||{},NV=navyDari(hexRgb(S.tema)),kl=S.d.kelas.find(k=>k.id===S.kid),foto=await fotoBulat(p.foto_id,p.nama_lengkap,NV),ada=v=>v!=null&&String(v).trim()!=='';
  const kontak=[['phone',p.no_hp],['mail',p.email],['home',p.alamat]].filter(r=>ada(r[1])),jab=p.jabatan||'Wali Kelas',
    ekstra=[['Pangkat / golongan',p.pangkat_golongan],['Mapel diampu',p.mapel_diampu],['Jam mengajar',p.jam_mengajar],['Tahun masuk sekolah',p.tahun_masuk_sekolah]].filter(r=>ada(r[1])),
    ring=[jab+(kl?' '+kl.nama_kelas+', T.A. '+kl.tahun_ajaran:''),ada(p.status_kepegawaian)?p.status_kepegawaian+(ada(p.tmt_pengangkatan)?', TMT '+tglID(p.tmt_pengangkatan):''):'',ada(p.pendidikan_terakhir)?'Pendidikan terakhir '+p.pendidikan_terakhir:'',ada(p.sertifikasi)?String(p.sertifikasi).toLowerCase().indexOf('sudah')===0?'Sudah bersertifikasi pendidik':'Sertifikasi pendidik: '+p.sertifikasi:''].filter(Boolean).join('. ')+'.';
  const doc=buatResume({warna:NV,foto:foto,nama:p.nama_lengkap||'Belum diisi',sub:jab+(kl?' '+kl.nama_kelas:''),ringkas:ring,footer:'Administrasi Wali Kelas',
    samping:[{judul:'KONTAK',ikon:kontak.length?kontak:[['pin','-']]},{judul:'IDENTITAS',kv:[['NIK',p.nik],['NIP',p.nip],['NUPTK',p.nuptk]]},
      kl?{judul:'KELAS BINAAN',kv:[['Kelas',kl.nama_kelas],['Tahun ajaran',kl.tahun_ajaran]].concat(kl.jurusan?[['Jurusan',kl.jurusan]]:[])}:null],
    seksi:[{judul:'Data Pribadi',ikon:'person',kv:[['Tempat, tanggal lahir',(p.tempat_lahir||'-')+', '+(tglID(p.tanggal_lahir)||'-')],['Jenis kelamin',p.jenis_kelamin==='L'?'Laki-laki':p.jenis_kelamin==='P'?'Perempuan':'-'],['Agama',p.agama]]},
      {judul:'Kepegawaian',ikon:'briefcase',kv:[['Jabatan',p.jabatan],['Status kepegawaian',p.status_kepegawaian],['TMT pengangkatan',tglID(p.tmt_pengangkatan)],['Pendidikan terakhir',p.pendidikan_terakhir],['Sertifikasi pendidik',p.sertifikasi]].concat(ekstra)},
      {judul:'Riwayat Pendidikan',ikon:'cap',tl:urutThn(riwL()).map(r=>({h:[r.jenjang,r.jurusan].filter(ada).join(' - ')||'-',sub:r.institusi,r:r.tahun})),kosong:'Belum ada riwayat pendidikan.'}]});
  unduhBlob('Biodata Wali Kelas - '+String(p.nama_lengkap||'Guru').replace(/[^\w ]/g,'')+'.pdf',doc.output('blob'));toast('PDF biodata gaya resume siap diunduh')}
function editKelas(id){id=id||S.kid;const k=S.d.kelas.find(x=>x.id===id);if(!k)return toast('Belum ada kelas',1);
  openForm('Ubah Kelas',[{k:'nama_kelas',l:'Nama kelas',r:1},{k:'tingkat',l:'Tingkat',t:'select',o:['X','XI','XII']},{k:'tahun_ajaran',l:'Tahun ajaran',r:1,p:'\\d{4}/\\d{4}',h:'Contoh: 2026/2027'},{k:'jurusan',l:'Jurusan'},{k:'status',l:'Status (arsip = kelas lama, tidak bisa dibuka sampai diaktifkan lagi)',t:'select',o:[['aktif','Aktif'],['arsip','Arsip']]}],k,o=>{
    closeM();const old={...k},kid0=S.kid;Object.assign(k,o);let pindah='';
    if(k.status==='arsip'&&S.kid===id){const n=S.d.kelas.find(x=>x.id!==id&&x.status!=='arsip');if(n){S.kid=n.id;pindah=n.id;loadDraft()}}
    const msg=k.status==='arsip'&&old.status!=='arsip'?'Kelas diarsipkan':k.status!=='arsip'&&old.status==='arsip'?'Kelas diaktifkan kembali':'Kelas diperbarui';
    renderAll();call('ubahKelas',[{...o,id}],()=>{persist();if(pindah)call('simpanPengaturan',[{kelas_aktif:pindah}]);toast(msg)},()=>{Object.assign(k,old);S.kid=kid0;loadDraft();renderAll()})})}
function hapusSiswaUI(id){ask('Hapus siswa ini beserta absensi, catatan masalah, dan rapotnya? Tindakan ini tidak dapat dibatalkan.',()=>{
  S.d.siswa=S.d.siswa.filter(s=>s.id!==id);S.d.masalah=S.d.masalah.filter(m=>m.siswa_id!==id);S.d.rapot=S.d.rapot.filter(r=>r.siswa_id!==id);S.d.absensi=S.d.absensi.filter(a=>a[1]!==id);
  for(const k in S.am)if(k.startsWith(id+'|'))delete S.am[k];loadDraft(1);persist();renderAll();
  call('hapusSiswa',[id],()=>toast('Siswa dihapus'),()=>call('boot',[],d=>setData(d)))})}
const bsL=s=>{try{return JSON.parse(s.berkas_id_list||'[]')}catch(e){return[]}};
function berkasSiswaHtml(s){const l=bsL(s);return `<div class="cd"><div class="hd"><h3 style="margin:0">Berkas Siswa</h3><button class="bt sf" onclick="upBerkasS('${esc(s.id)}')"><i class="bi bi-upload"></i>Unggah</button></div>${l.length?l.map(d=>`<div class="ms"><b>${esc(d.nama)}</b><div class="row" style="flex:none"><button class="ib" aria-label="Unduh" onclick="unduh('${esc(d.id)}')"><i class="bi bi-download"></i></button><button class="ib" aria-label="Hapus" onclick="hapusBerkasS('${esc(s.id)}','${esc(d.id)}')"><i class="bi bi-trash3"></i></button></div></div>`).join(''):'<small>Belum ada berkas (KK, akta, surat, dan sejenisnya).</small>'}</div>`}
function upBerkasS(id){pilihBerkas((n,m,b)=>{toast('Mengunggah\u2026');call('unggahBerkasSiswa',[id,n,m,b],l=>{S.d.siswa.find(x=>x.id===id).berkas_id_list=JSON.stringify(l);persist();detailSiswa(id);toast('Berkas tersimpan')})})}
function hapusBerkasS(id,fid){ask('Hapus berkas ini?',()=>call('hapusBerkasSiswa',[id,fid],l=>{S.d.siswa.find(x=>x.id===id).berkas_id_list=JSON.stringify(l);persist();detailSiswa(id);toast('Berkas dihapus')}))}
const fmF=()=>[{k:'siswa_id',l:'Siswa binaan',t:'select',o:sis().map(s=>[s.id,s.nama_siswa])},{k:'tanggal',l:'Tanggal kejadian',t:'date',r:1},{k:'jenis_masalah',l:'Jenis permasalahan',r:1,ph:'mis. Terlambat berulang'},{k:'uraian',l:'Kronologi / uraian',t:'textarea',r:1},{k:'penyelesaian',l:'Penyelesaian / penanganan',t:'textarea'}];
function editMasalah(id){const m=S.d.masalah.find(x=>x.id===id);if(!m)return;
  openForm('Ubah Catatan Masalah',fmF(),m,o=>{closeM();const old={...m};Object.assign(m,o);renderAll();call('ubahMasalah',[{...o,id}],()=>{persist();toast('Catatan diperbarui')},()=>{Object.assign(m,old);renderAll()})})}
const dkM=m=>{try{return JSON.parse(m.dokumen_id_list||'[]')}catch(e){return[]}};
function upDokM(id){pilihBerkas((n,mi,b)=>{toast('Mengunggah\u2026');call('unggahDokMasalah',[id,n,mi,b],l=>{S.d.masalah.find(x=>x.id===id).dokumen_id_list=JSON.stringify(l);persist();rMasalah();toast('Dokumen tersimpan')})})}
function hapusDokM(id,fid){ask('Hapus dokumen ini?',()=>call('hapusDokMasalah',[id,fid],l=>{S.d.masalah.find(x=>x.id===id).dokumen_id_list=JSON.stringify(l);persist();rMasalah()}))}
function barAlpha(ml,bm,ps){const b=S.bm==='s'?Object.keys(ps).sort((a,c)=>ps[c]-ps[a]).slice(0,6).map(id=>[nmS(id),ps[id]]):ml.map(m=>[bulan(m),bm[m]]),mx=Math.max(1,...b.map(x=>x[1]));
  return `<div class="cd"><div class="hd"><h3 style="margin:0">Jumlah Alpha</h3><div class="row"><button class="ch${S.bm==='s'?'':' on'}" onclick="S.bm='b';rBeranda()">Per bulan</button><button class="ch${S.bm==='s'?' on':''}" onclick="S.bm='s';rBeranda()">Per siswa</button></div></div>${b.length?b.map(x=>`<div class="bar"><div><span>${esc(x[0])}</span><b class="mono">${x[1]}</b></div><div class="tr"><i style="width:${x[1]/mx*100}%"></i></div></div>`).join(''):'<div class="emp"><i class="bi bi-bar-chart"></i>Belum ada data absensi</div>'}</div>`}


const klName=()=>{const k=S.d.kelas.find(x=>x.id===S.kid);return k?esc(k.nama_kelas+' - T.A. '+k.tahun_ajaran):'Belum ada kelas'};
function bukaKelas(id){const k0=S.d.kelas.find(x=>x.id===id);if(k0&&k0.status==='arsip')return toast('Kelas arsip tidak bisa dibuka. Aktifkan dulu lewat ikon pensil.',1);S.kid=id;S.q='';const g=$('gq');if(g)g.value='';loadDraft();renderAll();call('simpanPengaturan',[{kelas_aktif:id}])}
function rKelas(){const ks=S.d.kelas,cnt=id=>S.d.siswa.filter(s=>s.kelas_id===id).length;
  $('s-kelas').innerHTML=`<div class="hd"><div><h1 class="h1">Daftar Kelas</h1><p class="sub" style="margin:0">${ks.length} kelas &bull; klik kelas untuk mengganti daftar siswa di bawah</p></div><button class="bt pr" onclick="formKelas()"><i class="bi bi-plus-lg"></i>Tambah Kelas</button></div>
  ${ks.length?`<div class="gk">${ks.map(k=>{const ar=k.status==='arsip',n=cnt(k.id),on=k.id===S.kid&&!ar,i=esc(k.id);
    return `<div class="kc${on?' on':''}${ar?' arsip':''}"${ar?' aria-disabled="true" title="Kelas diarsipkan. Klik ikon pensil untuk mengaktifkan kembali."':` role="button" tabindex="0" onclick="bukaKelas('${i}')" onkeydown="if(event.key==='Enter')bukaKelas('${i}')"`}><div class="kt"><span class="ic t0"><i class="bi bi-people"></i></span><div class="row" style="gap:6px">${on?'<span class="bd b-p">Dipilih</span>':''}<span class="bd ${k.status==='arsip'?'b-i':'b-h'}">${k.status==='arsip'?'Arsip':'Aktif'}</span></div></div><b class="kn">${esc(k.nama_kelas)}</b><small>Tingkat ${esc(k.tingkat||'-')} &bull; T.A. ${esc(k.tahun_ajaran)}${k.jurusan?' &bull; '+esc(k.jurusan):''}</small><div class="kf"><small class="mono">${n} siswa</small><div class="row" style="gap:2px"><button class="ib" aria-label="${ar?'Ubah kelas atau aktifkan kembali':'Ubah kelas'}" title="${ar?'Ubah status kelas':'Ubah kelas'}" onclick="event.stopPropagation();editKelas('${i}')"><i class="bi bi-pencil"></i></button>${ar?'':`<button class="ib" aria-label="Hapus kelas" onclick="event.stopPropagation();hapusKelasUI('${i}')"><i class="bi bi-trash3"></i></button>`}</div></div></div>`}).join('')}</div>`:`<div class="cd emp"><i class="bi bi-people"></i>Belum ada kelas. Tekan "Tambah Kelas" untuk membuat kelas pertama.</div>`}<div id="ks"></div>`;rSiswa()}
function hapusKelasUI(id){const k=S.d.kelas.find(x=>x.id===id);if(!k)return;const n=S.d.siswa.filter(s=>s.kelas_id===id).length;
  ask('Hapus kelas '+k.nama_kelas+' (T.A. '+k.tahun_ajaran+')'+(n?' beserta '+n+' siswa, seluruh absensi, catatan masalah, dan rapotnya':'')+'? Tindakan ini tidak dapat dibatalkan.',()=>{
    const sid=new Set(S.d.siswa.filter(s=>s.kelas_id===id).map(s=>s.id));
    S.d.kelas=S.d.kelas.filter(x=>x.id!==id);S.d.siswa=S.d.siswa.filter(s=>s.kelas_id!==id);S.d.masalah=S.d.masalah.filter(m=>m.kelas_id!==id);S.d.rapot=S.d.rapot.filter(r=>r.kelas_id!==id);S.d.absensi=S.d.absensi.filter(a=>a[0]!==id);
    for(const key in S.am)if(sid.has(key.split('|')[0]))delete S.am[key];
    if(S.kid===id){const na=S.d.kelas.find(k=>k.id!==id&&k.status!=='arsip'),sisa=S.d.kelas.find(k=>k.id!==id);S.kid=na?na.id:(sisa?sisa.id:'')}
    loadDraft(1);persist();renderAll();
    call('hapusKelas',[id,S.kid],()=>toast('Kelas dihapus'),()=>call('boot',[],d=>setData(d)))})}

const HARI7=['Sen','Sel','Rab','Kam','Jum','Sab','Min'];
function geserBulan(b,d){const p=b.split('-').map(Number),t=new Date(p[0],p[1]-1+d,1);return t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')}
function keAbsensi(tg){S.tgl=tg;loadDraft(1);closeM();nav('absensi');rAbsensi()}
const BLN12=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
/** Data satu siswa untuk satu bulan: hitungan status, tiap tanggal, dan daftar keterangan. */
function kalData(id,bln){
  const y=+bln.slice(0,4),m=+bln.slice(5,7),aw=(new Date(y,m-1,1).getDay()+6)%7,jml=new Date(y,m,0).getDate(),c={Hadir:0,Sakit:0,Izin:0,Alpha:0},hs=[],ket=[];
  for(let d=1;d<=jml;d++){const tg=bln+'-'+String(d).padStart(2,'0'),a=S.am[id+'|'+tg],ada=!!(a&&c[a[0]]!==undefined);
    if(ada){c[a[0]]++;if(a[1])ket.push([tg,a[0],a[1]])}
    hs.push({d:d,tg:tg,dow:(aw+d-1)%7,st:ada?a[0]:'',ket:ada?a[1]:''})}
  return{y:y,m:m,aw:aw,jml:jml,c:c,hs:hs,ket:ket}}
/** Ganti isi kartu rekap saja (tanpa menggambar ulang seluruh detail siswa, posisi gulir tetap). */
function kalGo(id,bln,tg){const w=$('kalw');if(!w)return;const m=!!(w.dataset&&w.dataset.pdf==='1');if(m){S.rk=S.rk||{};S.rk.bln=bln;S.rk.tg=tg||''}w.innerHTML=m?rekapIsi(id,bln,tg||''):kalAbsensi(id,bln,tg||'')}
/** Pemilih tanggal bawaan browser: pilih tahun, bulan, tanggal, lalu kalender pindah ke bulan itu. */
function kalPilih(id,v){if(/^\d{4}-\d{2}-\d{2}$/.test(v))kalGo(id,v.slice(0,7),v)}
function kalAbsensi(id,bln,tg0,pdf){
  const D=kalData(id,bln),hr=hari(),i=esc(id),c=D.c,tgp=tg0&&String(tg0).slice(0,7)===bln?tg0:'',pi=tgp?D.hs[+tgp.slice(8)-1]:null;
  let sel='';for(let k=0;k<D.aw;k++)sel+='<div class="kd kx"></div>';
  D.hs.forEach(x=>{const ada=!!x.st,tip=HARI7[x.dow]+', '+tglID(x.tg)+(ada?' - '+x.st+(x.ket?' ('+x.ket+')':''):'');
    sel+=`<div class="kd${x.dow>4?' wk':''}${x.tg===hr?' td':''}${ada?' s-'+K[x.st]:' ke'}${x.tg===tgp?' pk':''}" title="${esc(tip)}" aria-label="${esc(tip)}"><b>${x.d}</b>${ada?`<span class="bd b-${K[x.st]}">${x.st}</span>`:''}</div>`});
  const nilai=tgp||(bln===hr.slice(0,7)?hr:bln+'-01');
  return `<div class="cd"><div class="hd"><h3 style="margin:0">Rekap Absensi</h3><div class="row" style="gap:4px"><input type="date" class="pill" value="${nilai}" aria-label="Pilih tahun, bulan, dan tanggal" onchange="kalPilih('${i}',this.value)">${pdf?`<button class="bt ol" style="height:36px" onclick="pdfKal('${i}','${bln}')" aria-label="Unduh rekap absensi PDF"><i class="bi bi-filetype-pdf"></i>PDF</button>`:''}</div></div>
  <div class="row" style="margin-bottom:12px;gap:8px">${ST.map(t=>`<span class="bd b-${K[t]}">${c[t]} ${t}</span>`).join('')}</div>
  ${pi?`<p class="kpi">${HARI7[pi.dow]}, ${tglID(pi.tg)}: ${pi.st?pi.st+(pi.ket?' - '+esc(pi.ket):''):'tidak ada data absensi'}</p>`:''}
  <div class="kal">${HARI7.map((h,j)=>`<div class="kh${j>4?' wk':''}">${h}</div>`).join('')}${sel}</div>${D.ket.length?`<div class="kl"><h4>Keterangan</h4>${D.ket.map(k=>`<div class="ki"><span class="bd b-${K[k[1]]}">${k[1]}</span><div><small class="mono">${HARI7[(new Date(k[0]+'T00:00:00').getDay()+6)%7]}, ${tglID(k[0])}</small><p>${esc(k[2])}</p></div></div>`).join('')}</div>`:''}<p class="sub" style="margin:10px 0 0;font-size:12px">Pilih tanggal di kotak tanggal untuk pindah ke tahun atau bulan lain. Untuk mengisi atau mengubah absensi, buka menu Absensi Harian.</p></div>`}

/* ---- Persentase kehadiran beberapa bulan (dibuka dari nama siswa di Absensi Harian; tanpa kalender) ---- */
function rentangBln(a,b){const r=[];if(!a||!b||a>b)return r;let x=a;while(x<=b&&r.length<12){r.push(x);x=geserBulan(x,1)}return r}
/** Muat pilihan rentang bulan terakhir user dari penyimpanan browser (tetap ada setelah refresh); nilai tak valid diabaikan. */
function rrMuat(){if(S.rr)return;S.rr={};
  try{const o=JSON.parse(ls('wk_rr')||'{}'),ok=/^\d{4}-(0[1-9]|1[0-2])$/;
    if(o&&ok.test(o.dari)&&ok.test(o.sampai)&&o.dari<=o.sampai&&(+o.sampai.slice(0,4)-+o.dari.slice(0,4))*12+(+o.sampai.slice(5,7)-+o.dari.slice(5,7))<12){S.rr.dari=o.dari;S.rr.sampai=o.sampai}}catch(e){}}
/** Total rentang bulan pilihan user (default 3 bulan terakhir). Disimpan di S.rr agar ikut saat berpindah siswa. */
function rentangData(id){rrMuat();const R=S.rr,nw=hari().slice(0,7),dari=R.dari||geserBulan(nw,-2),sampai=R.sampai||nw,
    rows=rentangBln(dari,sampai).map(m=>({m:m,D:kalData(id,m)})),tot={Hadir:0,Sakit:0,Izin:0,Alpha:0};
  rows.forEach(r=>ST.forEach(x=>tot[x]+=r.D.c[x]));
  const T=ST.reduce((a,x)=>a+tot[x],0),ket=[];rows.forEach(r=>r.D.ket.forEach(k=>ket.push(k)));
  return{dari:dari,sampai:sampai,rows:rows,tot:tot,T:T,p:T?Math.round(tot.Hadir/T*1000)/10:null,ket:ket}}
const gradDn=(c,t)=>{let acc=0;return t?ST.map(x=>{const a=acc/t*100;acc+=c[x];return `${CL[x]} ${a}% ${acc/t*100}%`}).join(','):''};
const blS=m=>BLN12[+m.slice(5,7)-1].slice(0,3)+' '+m.slice(0,4);
const blP=R=>R.dari===R.sampai?blS(R.dari):blS(R.dari)+' \u2013 '+blS(R.sampai);
function rentangIsi(id){
  const s=S.d.siswa.find(x=>x.id===id),R=rentangData(id),c=R.tot,t=R.T,p=R.p,lb=blP(R),i=esc(id);
  return `<div class="cd rk" style="display:flex;gap:20px;align-items:center;justify-content:space-between;flex-wrap:wrap"><div style="min-width:230px;flex:1"><div class="who">${av(s)}<div><b class="rn">${esc(s.nama_siswa)}</b><div class="sub mono" style="margin:2px 0 0;font-size:13px">${esc(s.nisn)}</div></div></div><div class="row" style="margin-top:14px;gap:10px;align-items:center"><span class="sub" style="margin:0">Persentase kehadiran ${lb}</span><span class="bd ${p===null?'b-p':p>=85?'b-h':'b-a'} mono" style="font-size:18px;padding:5px 14px">${p===null?'-':p+'%'}</span><span class="sub" style="margin:0;font-size:12px">${t?'dari '+t+' hari tercatat ('+R.rows.length+' bulan)':'belum ada data absensi'}</span></div></div><div class="row" style="gap:18px;align-items:center;flex-wrap:nowrap"><div class="dn sm" role="img" aria-label="Komposisi kehadiran ${lb}" style="background:${t?`conic-gradient(${gradDn(c,t)})`:'var(--bd)'}"><div><span>${p===null?'-':p+'%'}<small>hadir</small></span></div></div><div class="lgd" style="flex:none;min-width:150px">${ST.map(x=>`<span><b><i style="background:${CL[x]}"></i>${x}</b><span class="mono">${c[x]} (${t?Math.round(c[x]/t*100):0}%)</span></span>`).join('')}</div></div></div>
  <div class="cd"><div class="hd"><h3 style="margin:0">Persentase Kehadiran Beberapa Bulan</h3></div>
  <div class="row rg-f"><label class="rg-l"><small>Dari bulan</small><input type="month" id="rg_d" class="pill" value="${esc(R.dari)}" aria-label="Dari bulan"></label><label class="rg-l"><small>Sampai bulan</small><input type="month" id="rg_s" class="pill" value="${esc(R.sampai)}" aria-label="Sampai bulan"></label><button type="button" class="bt pr" onclick="rentangGo('${i}')"><i class="bi bi-check2"></i>OK</button></div>
  <div class="row" style="margin:14px 0 8px;gap:10px"><span class="sub" style="margin:0">Total ${R.rows.length} bulan</span><span class="bd ${p===null?'b-p':p>=85?'b-h':'b-a'} mono" style="font-size:15px;padding:4px 12px">${p===null?'-':p+'%'}</span><span class="sub" style="margin:0;font-size:12px">${t?'dari '+t+' hari tercatat':'belum ada data absensi'}</span></div>
  <div class="rg-list">${R.rows.map(r=>{const c=r.D.c,t=ST.reduce((a,x)=>a+c[x],0),q=t?Math.round(c.Hadir/t*1000)/10:null,nm=BLN12[+r.m.slice(5,7)-1]+' '+r.m.slice(0,4);
    return `<div class="rg-m"><div class="rg-n">${nm}<small>${t?'dari '+t+' hari tercatat':'belum ada data absensi'}</small><div class="rg-ls">${ST.map(x=>{const v=t?Math.round(c[x]/t*1000)/10:0;return `<div class="rg-s"><span>${x}</span><div class="rg-ln" role="img" aria-label="${x} ${v}%"><i style="width:${v}%;background:${CL[x]}"></i></div><b>${v}%</b></div>`}).join('')}</div></div><div class="row" style="gap:18px;align-items:center;flex-wrap:nowrap"><div class="dn sm" role="img" aria-label="Komposisi kehadiran ${nm}" style="background:${t?`conic-gradient(${gradDn(c,t)})`:'var(--bd)'}"><div><span>${q===null?'-':q+'%'}<small>hadir</small></span></div></div><div class="lgd" style="flex:none;min-width:150px">${ST.map(x=>`<span><b><i style="background:${CL[x]}"></i>${x}</b><span class="mono">${c[x]} (${t?Math.round(c[x]/t*100):0}%)</span></span>`).join('')}</div></div></div>`}).join('')}</div></div>`}
/** Jendela dari nama siswa di Absensi Harian. Panah kiri/kanan berpindah siswa dengan rentang bulan yang sama; PDF mengunduh data siswa yang sedang dibuka. */
function rekapRentang(id){const s=S.d.siswa.find(x=>x.id===id);if(!s)return;rrMuat();const i=esc(id);
  $('md').innerHTML=`<div class="bk" onclick="closeM()"></div><div class="dr wide"><div class="dh"><b>Persentase Kehadiran</b><div class="row" style="gap:6px">${panahSiswa(id,'rekapRentang',1)}<button class="bt ol" style="height:36px" onclick="pdfRentang('${i}')" aria-label="Unduh PDF"><i class="bi bi-filetype-pdf"></i><span class="dtx">PDF</span></button><button class="ib" aria-label="Tutup" onclick="closeM()"><i class="bi bi-x-lg"></i></button></div></div><div class="db"><div id="rrw">${rentangIsi(id)}</div></div></div>`;
  $('md').classList.add('on')}
function rentangGo(id){const d=$('rg_d').value,e=$('rg_s').value;
  if(!d||!e)return toast('Pilih bulan awal dan bulan akhir',1);
  if(d>e)return toast('Bulan awal tidak boleh setelah bulan akhir',1);
  if((+e.slice(0,4)-+d.slice(0,4))*12+(+e.slice(5,7)-+d.slice(5,7))>=12)return toast('Rentang maksimal 12 bulan',1);
  rrMuat();S.rr.dari=d;S.rr.sampai=e;ls('wk_rr',JSON.stringify({dari:d,sampai:e}));$('rrw').innerHTML=rentangIsi(id)}
function pdfRentang(id){
  if(!(window.jspdf&&window.jspdf.jsPDF))return toast('Pustaka PDF belum termuat. Coba lagi.',1);
  const s=S.d.siswa.find(x=>x.id===id);if(!s)return;
  const R=rentangData(id),A=hexRgb(S.tema),W=[255,255,255],T=[27,23,64],G=[107,104,144],doc=new window.jspdf.jsPDF({unit:'mm',format:'a4'}),
    t=v=>String(v==null||v===''?'-':v).replace(/[^\x20-\x7e\xa0-\xff]/g,'?'),kl=S.d.kelas.find(k=>k.id===s.kelas_id),
    SC={Hadir:[34,197,94],Sakit:[2,132,199],Izin:[217,119,6],Alpha:[225,29,72]},lbl=blP(R).replace('\u2013','-'),hn=tg=>HARI7[(new Date(tg+'T00:00:00').getDay()+6)%7],
    all=R.tot,tot=R.T,pct=R.p,wp=pct===null?G:pct>=85?[22,163,74]:SC.Alpha;
  doc.setFillColor(...A);doc.rect(0,0,210,34,'F');
  doc.setTextColor(...W);doc.setFont('helvetica','bold');doc.setFontSize(9);doc.text('PERSENTASE KEHADIRAN SISWA',14,11,{charSpace:1.2});
  doc.setFontSize(18);doc.text(doc.splitTextToSize(t(s.nama_siswa),150)[0],14,21);
  doc.setFont('helvetica','normal');doc.setFontSize(9);doc.text(t('NISN '+s.nisn+(kl?'  |  '+kl.nama_kelas+'  |  T.A. '+kl.tahun_ajaran:'')),14,28);
  doc.setFillColor(...campur(A,W,.94));doc.roundedRect(14,42,182,40,4,4,'F');
  doc.setFont('helvetica','bold');doc.setFontSize(8);doc.setTextColor(...G);doc.text('PERSENTASE KEHADIRAN - '+t(lbl).toUpperCase(),22,52,{charSpace:.6});
  doc.setFontSize(30);doc.setTextColor(...wp);doc.text(pct===null?'-':pct+'%',22,67);
  doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(...G);doc.text(tot?'dari '+tot+' hari tercatat ('+R.rows.length+' bulan)':'belum ada data absensi',22,74);
  doc.addImage(donatPng(all,tot),'PNG',112,46,32,32,'donat','FAST');
  doc.setFont('helvetica','bold');doc.setFontSize(10);doc.setTextColor(...T);doc.text(pct===null?'-':pct+'%',128,62,{align:'center'});doc.setFont('helvetica','normal');doc.setFontSize(6.5);doc.setTextColor(...G);doc.text('hadir',128,65.6,{align:'center'});
  ST.forEach((n,j)=>{const yy=52+j*7;doc.setFillColor(...SC[n]);doc.circle(152,yy-1,1.4,'F');doc.setFont('helvetica','bold');doc.setFontSize(9);doc.setTextColor(...T);doc.text(n,156,yy);
    doc.setFont('helvetica','normal');doc.setFontSize(8.5);doc.setTextColor(...G);doc.text(all[n]+' ('+(tot?Math.round(all[n]/tot*100):0)+'%)',190,yy,{align:'right'})});
  /* tiap bulan: donat + persen di tengah + legenda (sama dengan ringkasan) */
  let y=92;doc.setFont('helvetica','bold');doc.setFontSize(11);doc.setTextColor(...T);doc.text('Rincian per bulan',14,y);y+=6;const bh=32;
  R.rows.forEach((r,j)=>{if(y+bh>282){doc.addPage();y=16}
    const c=r.D.c,n=ST.reduce((a,x)=>a+c[x],0),q=n?Math.round(c.Hadir/n*1000)/10:null;
    doc.setFillColor(...campur(A,W,.94));doc.roundedRect(14,y,182,bh-2,4,4,'F');
    doc.setFont('helvetica','bold');doc.setFontSize(12);doc.setTextColor(...T);doc.text(t(BLN12[+r.m.slice(5,7)-1]+' '+r.m.slice(0,4)),22,y+8.5);
    doc.setFont('helvetica','normal');doc.setFontSize(8.5);doc.setTextColor(...G);doc.text(n?'dari '+n+' hari tercatat':'belum ada data absensi',22,y+13);
    ST.forEach((x,k)=>{const v=n?Math.round(c[x]/n*1000)/10:0,by=y+16.8+k*3.2;
      doc.setFont('helvetica','normal');doc.setFontSize(6.2);doc.setTextColor(...G);doc.text(x,22,by+1.7);
      doc.setFillColor(...campur(A,W,.8));doc.roundedRect(34,by,54,1.9,.95,.95,'F');
      if(v>0){doc.setFillColor(...SC[x]);doc.roundedRect(34,by,Math.max(1.9,54*v/100),1.9,.95,.95,'F')}
      doc.setFont('helvetica','bold');doc.setTextColor(...SC[x]);doc.text(v+'%',91,by+1.7)});
    doc.addImage(donatPng(c,n),'PNG',112,y+2,26,26,'dn'+j,'FAST');
    doc.setFont('helvetica','bold');doc.setFontSize(9);doc.setTextColor(...T);doc.text(q===null?'-':q+'%',125,y+15.5,{align:'center'});doc.setFont('helvetica','normal');doc.setFontSize(6);doc.setTextColor(...G);doc.text('hadir',125,y+18.8,{align:'center'});
    ST.forEach((x,k)=>{const yy=y+8.5+k*5.6;doc.setFillColor(...SC[x]);doc.circle(146,yy-1,1.3,'F');doc.setFont('helvetica','bold');doc.setFontSize(8.5);doc.setTextColor(...T);doc.text(x,150,yy);
      doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(...G);doc.text(c[x]+' ('+(n?Math.round(c[x]/n*100):0)+'%)',190,yy,{align:'right'})});
    y+=bh});
  y+=4;
  /* keterangan */
  if(R.ket.length){if(y>258){doc.addPage();y=16}
    doc.setFont('helvetica','bold');doc.setFontSize(10.5);doc.setTextColor(...A);doc.text('Keterangan',14,y+4);y+=9;
    R.ket.forEach(k=>{const L=doc.splitTextToSize(t(k[2]),170),h=L.length*4.2+9;if(y+h>282){doc.addPage();y=16}
      doc.setFillColor(...campur(SC[k[1]],W,.92));doc.roundedRect(14,y,182,h,2.5,2.5,'F');
      doc.setFont('helvetica','bold');doc.setFontSize(8.5);doc.setTextColor(...SC[k[1]]);doc.text(t(hn(k[0])+', '+tglID(k[0])+'  -  '+k[1]),18,y+5.4);
      doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(...T);doc.text(L,18,y+10.2);y+=h+2.5})}
  else{doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(...G);doc.text('Tidak ada keterangan pada rentang bulan ini.',14,y+4)}
  const n=doc.getNumberOfPages(),tg=new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
  for(let p=1;p<=n;p++){doc.setPage(p);doc.setDrawColor(...campur(A,W,.6));doc.setLineWidth(.3);doc.line(14,288,196,288);doc.setFont('helvetica','normal');doc.setFontSize(7.5);doc.setTextColor(...G);doc.text('Administrasi Wali Kelas  |  dicetak '+tg,14,292.5);doc.text('Halaman '+p+' / '+n,196,292.5,{align:'right'})}
  unduhBlob('Rekap Kehadiran - '+String(s.nama_siswa).replace(/[^\w \-]/g,'')+' '+R.dari+' sd '+R.sampai+'.pdf',doc.output('blob'));toast('PDF persentase kehadiran siap diunduh')}

/** Donat komposisi kehadiran sebagai gambar PNG untuk PDF (warna sama dengan di layar). */
function donatPng(c,t){const z=360,v=document.createElement('canvas');v.width=v.height=z;const x=v.getContext('2d'),w=60,r=z/2-w/2-4;x.lineWidth=w;let a=-Math.PI/2;
  if(!t){x.strokeStyle='#E7E5F2';x.beginPath();x.arc(z/2,z/2,r,0,Math.PI*2);x.stroke()}
  else ST.forEach(n=>{if(!c[n])return;const d=c[n]/t*Math.PI*2;x.strokeStyle=CL[n];x.beginPath();x.arc(z/2,z/2,r,a,a+d);x.stroke();a+=d});
  return v.toDataURL('image/png')}
/** PDF rekap absensi satu siswa: isinya sama dengan jendela rekap (persentase + donat + kalender bulan terpilih + keterangan). */
function pdfKal(id,bln){
  if(!(window.jspdf&&window.jspdf.jsPDF))return toast('Pustaka PDF belum termuat. Coba lagi.',1);
  const s=S.d.siswa.find(x=>x.id===id);if(!s)return;
  const D=kalData(id,bln),A=hexRgb(S.tema),W=[255,255,255],T=[27,23,64],G=[107,104,144],doc=new window.jspdf.jsPDF({unit:'mm',format:'a4'}),
    t=v=>String(v==null||v===''?'-':v).replace(/[^\x20-\x7e\xa0-\xff]/g,'?'),kl=S.d.kelas.find(k=>k.id===s.kelas_id),
    SC={Hadir:[34,197,94],Sakit:[2,132,199],Izin:[217,119,6],Alpha:[225,29,72]},lbl=BLN12[D.m-1]+' '+D.y,hn=tg=>HARI7[(new Date(tg+'T00:00:00').getDay()+6)%7];
  const all=D.c;
  const tot=all.Hadir+all.Sakit+all.Izin+all.Alpha,pct=tot?Math.round(all.Hadir/tot*1000)/10:null,wp=pct===null?G:pct>=85?[22,163,74]:SC.Alpha;
  /* kepala */
  doc.setFillColor(...A);doc.rect(0,0,210,34,'F');
  doc.setTextColor(...W);doc.setFont('helvetica','bold');doc.setFontSize(9);doc.text('REKAP ABSENSI SISWA',14,11,{charSpace:1.2});
  doc.setFontSize(18);doc.text(doc.splitTextToSize(t(s.nama_siswa),150)[0],14,21);
  doc.setFont('helvetica','normal');doc.setFontSize(9);doc.text(t('NISN '+s.nisn+(kl?'  |  '+kl.nama_kelas+'  |  T.A. '+kl.tahun_ajaran:'')),14,28);
  /* ringkasan keseluruhan: persentase + donat + legenda */
  doc.setFillColor(...campur(A,W,.94));doc.roundedRect(14,42,182,40,4,4,'F');
  doc.setFont('helvetica','bold');doc.setFontSize(8);doc.setTextColor(...G);doc.text('PERSENTASE KEHADIRAN - '+t(lbl).toUpperCase(),22,52,{charSpace:.6});
  doc.setFontSize(30);doc.setTextColor(...wp);doc.text(pct===null?'-':pct+'%',22,67);
  doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(...G);doc.text(tot?'dari '+tot+' hari tercatat':'belum ada data absensi',22,74);
  doc.addImage(donatPng(all,tot),'PNG',112,46,32,32,'donat','FAST');
  doc.setFont('helvetica','bold');doc.setFontSize(10);doc.setTextColor(...T);doc.text(pct===null?'-':pct+'%',128,62,{align:'center'});doc.setFont('helvetica','normal');doc.setFontSize(6.5);doc.setTextColor(...G);doc.text('hadir',128,65.6,{align:'center'});
  ST.forEach((n,j)=>{const yy=52+j*7;doc.setFillColor(...SC[n]);doc.circle(152,yy-1,1.4,'F');doc.setFont('helvetica','bold');doc.setFontSize(9);doc.setTextColor(...T);doc.text(n,156,yy);
    doc.setFont('helvetica','normal');doc.setFontSize(8.5);doc.setTextColor(...G);doc.text(all[n]+' ('+(tot?Math.round(all[n]/tot*100):0)+'%)',190,yy,{align:'right'})});
  /* bulan terpilih: nama bulan + hitungan bulan itu */
  doc.setFont('helvetica','bold');doc.setFontSize(11);doc.setTextColor(...T);doc.text(lbl,14,92);let cx=14+doc.getTextWidth(lbl)+6;
  ST.forEach(n=>{const tx=D.c[n]+' '+n.toUpperCase();doc.setFontSize(7.5);const w=doc.getTextWidth(tx)+6;doc.setFillColor(...campur(SC[n],W,.86));doc.roundedRect(cx,88.2,w,5.6,2.8,2.8,'F');doc.setTextColor(...SC[n]);doc.text(tx,cx+3,92);cx+=w+2.4});
  /* kalender */
  const x0=14,cw=26,ch=18;let y=99;
  HARI7.forEach((h,j)=>{doc.setFont('helvetica','bold');doc.setFontSize(8);doc.setTextColor(...(j>4?SC.Alpha:G));doc.text(h.toUpperCase(),x0+j*cw+(cw-1.2)/2,y+4,{align:'center'})});y+=7;
  D.hs.forEach(x=>{const idx=D.aw+x.d-1,cx2=x0+(idx%7)*cw,cy=y+Math.floor(idx/7)*ch,ada=!!x.st,mx=cx2+(cw-1.2)/2;
    doc.setLineWidth(.25);doc.setDrawColor(...(ada?campur(SC[x.st],W,.5):campur(A,W,.82)));doc.setFillColor(...(ada?campur(SC[x.st],W,.88):x.dow>4?campur(A,W,.95):W));
    doc.roundedRect(cx2,cy,cw-1.2,ch-1.2,2,2,'FD');doc.setFont('helvetica','bold');
    if(ada){doc.setFontSize(10);doc.setTextColor(...SC[x.st]);doc.text(String(x.d),cx2+2.6,cy+6);doc.setFontSize(7);doc.text(x.st.toUpperCase(),mx,cy+ch-5,{align:'center'})}
    else{doc.setFontSize(13);doc.setTextColor(...T);doc.text(String(x.d),mx,cy+(ch-1.2)/2+2,{align:'center'})}});
  y+=Math.ceil((D.aw+D.jml)/7)*ch+4;
  /* keterangan */
  if(D.ket.length){if(y>258){doc.addPage();y=16}
    doc.setFont('helvetica','bold');doc.setFontSize(10.5);doc.setTextColor(...A);doc.text('Keterangan',14,y+4);y+=9;
    D.ket.forEach(k=>{const L=doc.splitTextToSize(t(k[2]),170),h=L.length*4.2+9;if(y+h>282){doc.addPage();y=16}
      doc.setFillColor(...campur(SC[k[1]],W,.92));doc.roundedRect(14,y,182,h,2.5,2.5,'F');
      doc.setFont('helvetica','bold');doc.setFontSize(8.5);doc.setTextColor(...SC[k[1]]);doc.text(t(hn(k[0])+', '+tglID(k[0])+'  -  '+k[1]),18,y+5.4);
      doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(...T);doc.text(L,18,y+10.2);y+=h+2.5})}
  else{doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(...G);doc.text('Tidak ada keterangan pada bulan ini.',14,y+4)}
  const n=doc.getNumberOfPages(),tg=new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
  for(let p=1;p<=n;p++){doc.setPage(p);doc.setDrawColor(...campur(A,W,.6));doc.setLineWidth(.3);doc.line(14,288,196,288);doc.setFont('helvetica','normal');doc.setFontSize(7.5);doc.setTextColor(...G);doc.text('Administrasi Wali Kelas  |  dicetak '+tg,14,292.5);doc.text('Halaman '+p+' / '+n,196,292.5,{align:'right'})}
  unduhBlob('Rekap Absensi - '+String(s.nama_siswa).replace(/[^\w \-]/g,'')+' '+bln+'.pdf',doc.output('blob'));toast('PDF rekap absensi siap diunduh')}

/* ---- Slider foto siswa di Beranda: berputar terus otomatis (foto diulang agar tak berujung), panah & geser jari tetap bisa; berhenti hanya saat kursor/jari tepat di atas foto atau nama siswa ---- */
function slSiap(e){const a=[].slice.call(e.children);e.dataset.i='1';if(!a.length){e.dataset.w=0;return}
  const w=a[a.length-1].offsetLeft+a[a.length-1].offsetWidth+10-a[0].offsetLeft;e.dataset.w=w;
  if(!(window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches)){
    for(let j=1,k=Math.ceil(e.clientWidth/w)+2;j<k;j++)a.forEach(x=>{const c=x.cloneNode(true);c.tabIndex=-1;c.setAttribute('aria-hidden','true');c.removeAttribute('title');e.appendChild(c)});
    e.scrollLeft=w;S.slx=w}}
function slGeser(d){const e=$('fsl');if(!e||!e.firstElementChild)return;S.slp=Date.now()+2500;e.scrollBy({left:d*(e.firstElementChild.offsetWidth+10)*2,behavior:'smooth'})}
(function(){if(window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches)return;let last=0;
  function f(t){const dt=Math.min(t-last,64);last=t;const e=$('fsl');
    if(e&&e.clientWidth>0&&S.sec==='beranda'&&!document.hidden){
      if(!e.dataset.i)slSiap(e);const w=+e.dataset.w;
      if(w>0){
        if(e.scrollLeft>=2*w)e.scrollLeft-=w;else if(e.scrollLeft<w-1)e.scrollLeft+=w;
        if(Date.now()<(S.slp||0)||e.querySelector('.fk:hover,.fk:focus-visible'))S.slx=e.scrollLeft;
        else{if(Math.abs(e.scrollLeft-S.slx)>2)S.slx=e.scrollLeft;S.slx+=.035*dt;e.scrollLeft=S.slx}}}
    requestAnimationFrame(f)}
  requestAnimationFrame(f)})();

/* ---- Sinkron otomatis dengan database: data yang diubah langsung di Google Sheets ikut tampil di aplikasi (saat tab dibuka kembali, saat jendela difokuskan, saat pindah menu, dan tiap 20 detik). Ditunda bila sedang membuka jendela atau mengetik, agar isian tidak hilang. ---- */
let SYN=0;
function sinkron(){
  if(SYN||document.hidden||!S.d||!S.sj||!S.tk||Date.now()-(S.syt||0)<15000)return;
  const a=document.activeElement;
  if($('md').classList.contains('on')||(a&&a.matches&&a.matches('textarea,input:not([type=date]):not([type=month]):not([type=checkbox]):not([type=radio]):not([type=file]):not([type=button]):not([type=submit]):not([type=color]):not([type=range])')))return;
  SYN=1;S.syt=Date.now();
  gasRun().withSuccessHandler(r=>{SYN=0;if(r&&r.sesi)return sesiHabis(r.msg);
    if(!(r&&r.ok)||$('md').classList.contains('on'))return;
    const d=r.data;if(d.same){S.ver=d.ver;return}const j=JSON.stringify(d);if(j===S.sj)return;
    const bersih=sis().every(s=>{const x=S.dr&&S.dr[s.id],y=S.am[s.id+'|'+S.tgl];return !x||(y?x[0]===y[0]&&x[1]===y[1]:!x[0]&&!x[1])});
    if(bersih)S.dk='';S.sj=j;setData(d);persist()})
  .withFailureHandler(()=>{SYN=0}).api(S.tk,'boot',[S.ver||''],S.as||'',S.ver||'')}
document.addEventListener('visibilitychange',()=>{if(!document.hidden){sinkron();sinkAdmin(1)}});
window.addEventListener('focus',()=>{sinkron();sinkAdmin(1)});
/* Polling hemat kuota: hanya tab terlihat; 20 dtk saat aktif, 120 dtk saat diam, berhenti setelah 10 menit tanpa interaksi. Kembali aktif seketika begitu ada sentuhan. Balasan "sama" hanya ~100 byte. */
['pointerdown','keydown','touchstart'].forEach(e=>window.addEventListener(e,()=>{const idle=Date.now()-S.act>120000;S.act=Date.now();if(idle)sinkron()},{passive:true}));
function jadwal(){clearTimeout(S.pt);S.pt=setTimeout(()=>{if(Date.now()-S.act<600000)sinkron();jadwal()},Date.now()-S.act>120000?120000:20000)}
jadwal();

/* ===== Multi-pengguna: masuk/daftar, sesi, banner & panel admin ===== */
const ADMIN_M=['admin','Admin Sekolah','bi-shield-lock'],WALI_M=['wali','Wali Kelas','bi-people-fill'],TK=['X','XI','XII'];
/** Admin murni: hanya Admin Sekolah, Profil, dan Pengaturan. Saat admin membuka data seorang wali kelas (S.as terisi), menu lengkap tampil agar bisa berpindah halaman. */
const menu=()=>{if(!S.user||S.user.peran!=='admin')return MENU;if(S.as)return MENU.concat([WALI_M,ADMIN_M]);return [ADMIN_M,WALI_M].concat(MENU.filter(m=>m[0]==='pengaturan'))};
/* Dropdown Wali Kelas (X / XI / XII): murni sisi klien, tanpa panggilan server; pilihan terakhir diingat */
S.wt=(['X','XI','XII','L'].indexOf(ls('wk_wt'))>=0)?ls('wk_wt'):'X';
function smHtml(){return TK.concat(S.nL?['L']:[]).map(t=>`<button class="ni wsi${S.sec==='wali'&&S.wt===t?' on':''}" data-t="${t}" onclick="pilihTingkat('${t}')"><i class="bi bi-dot"></i>${t==='L'?'Tanpa kelas':'Kelas '+t}</button>`).join('')}
function sinkSm(){const b=document.querySelector('#nv .wnx'),m=$('smw');if(b){b.classList.toggle('open',!!S.wo);b.setAttribute('aria-expanded',S.wo?'true':'false')}if(m)m.classList.toggle('open',!!S.wo)}
function toggleWali(){S.wo=!S.wo;sinkSm()}
function aktifWali(){document.querySelectorAll('#smw [data-t]').forEach(e=>e.classList.toggle('on',S.sec==='wali'&&e.dataset.t===S.wt))}
function pilihTingkat(t){S.wt=t;S.wo=1;ls('wk_wt',t);if(S.sec==='wali'){rWali();aktifWali();sinkSm();window.scrollTo(0,0)}else nav('wali')}
if(!$('s-wali')){const x=document.createElement('section');x.id='s-wali';x.className='sec';$('s-admin').after(x)}
function aktifNav(){document.querySelectorAll('[data-s]').forEach(e=>e.classList.toggle('on',e.dataset.s===S.sec));aktifWali()}
function cekMenu(){const am=!!(S.user&&S.user.peran==='admin'&&!S.as),p=(S.user?S.user.peran:'')+(am?'m':'');
  document.body.classList.toggle('am',am);
  if(S.np!==p){S.np=p;buildNav();aktifNav()}
  if(am&&['admin','profil','pengaturan'].indexOf(S.sec)<0)nav('admin');
  if(S.user&&S.user.peran!=='admin'&&S.sec==='admin')nav('beranda')}
function authErr(m){const x=$('a_err');if(x)x.innerHTML=m?`<div class="au-e" role="alert">${esc(m)}</div>`:''}
function rAuth(mode,msg){
  if(mode==='lupa')return rLupa(msg);
  const d=mode==='daftar',tab=(k,l)=>`<button type="button" class="${mode===k?'on':''}" onclick="rAuth('${k}')">${l}</button>`;
  $('au').innerHTML=`<div class="cd au-c"><div class="au-h"><span class="lg"><i class="bi bi-mortarboard-fill"></i></span><div><b style="font-size:18px">Wali Kelas</b><small style="display:block;color:var(--t2)">Sistem Administrasi Guru</small></div></div>
  <div class="au-t">${tab('masuk','Masuk')}${tab('daftar','Daftar')}</div>
  <form class="au-f" onsubmit="return doAuth(event,'${mode}')"><div id="a_err">${msg?`<div class="au-e" role="alert">${esc(msg)}</div>`:''}</div>
  ${d?`<label class="fl"><span>Nama lengkap *</span><input id="a_nama" required maxlength="80" autocomplete="name"></label><label class="fl"><span>Email *</span><input id="a_email" type="email" required maxlength="120" autocomplete="email"></label>`:''}
  <label class="fl"><span>${d?'Username *':'Username atau email *'}</span><input id="a_user" required maxlength="${d?30:120}"${d?' pattern="[A-Za-z0-9._]{3,30}" title="3-30 karakter: huruf, angka, titik, atau garis bawah"':''} autocomplete="username" autocapitalize="none" spellcheck="false"></label>
  <label class="fl"><span>Password *</span><input id="a_pw" type="password" required${d?' minlength="8"':''} maxlength="72" autocomplete="${d?'new-password':'current-password'}"></label>
  ${d?'':'<div style="text-align:right;margin-top:-6px"><button type="button" class="nm" style="color:var(--p);font-size:13px" onclick="rAuth(\'lupa\')">Lupa password?</button></div>'}
  ${d?`<label class="fl"><span>Ulangi password *</span><input id="a_pw2" type="password" required minlength="8" maxlength="72" autocomplete="new-password"></label>`:''}
  <button class="bt pr" id="a_go" style="justify-content:center">${d?'Daftar &amp; Masuk':'Masuk'}</button></form>
  <p class="sub" style="margin:14px 0 0;font-size:12px;text-align:center">${d?'Password minimal 8 karakter. Lupa password? Pilih tab Masuk lalu klik Lupa password.':'Belum punya akun? Pilih tab Daftar.'}</p></div>`;
  $('au').classList.add('on');$('ld').classList.add('off');const f=$(d?'a_nama':'a_user');if(f)f.focus()}
/** Layar Lupa password: password sementara dikirim ke email akun (berlaku 30 menit), tinggal disalin lalu dipakai masuk. */
function rLupa(msg){
  $('au').innerHTML=`<div class="cd au-c"><div class="au-h"><span class="lg"><i class="bi bi-mortarboard-fill"></i></span><div><b style="font-size:18px">Wali Kelas</b><small style="display:block;color:var(--t2)">Lupa Password</small></div></div>
  <form class="au-f" onsubmit="return doLupa(event)"><div id="a_err">${msg?`<div class="au-e" role="alert">${esc(msg)}</div>`:''}</div>
  <p class="sub" style="margin:0;font-size:13px">Masukkan username atau email akun Anda. Password sementara akan dikirim ke email yang terdaftar. Salin lalu pakai untuk masuk.</p>
  <label class="fl"><span>Username atau email *</span><input id="a_user" required maxlength="120" autocomplete="username" autocapitalize="none" spellcheck="false"></label>
  <button class="bt pr" id="a_go" style="justify-content:center"><i class="bi bi-envelope"></i>Kirim Password Sementara</button>
  <button type="button" class="bt ol" style="justify-content:center" onclick="rAuth('masuk')">Kembali ke Masuk</button></form></div>`;
  $('au').classList.add('on');$('ld').classList.add('off');const f=$('a_user');if(f)f.focus()}
function doLupa(e){e.preventDefault();const b=$('a_go'),u=$('a_user').value;b.disabled=true;authErr('');
  gasRun().withSuccessHandler(r=>{b.disabled=false;
    if(r&&r.ok){const f=document.querySelector('.au-f');if(f)f.innerHTML='<div class="au-e" role="status" style="background:var(--hb);color:var(--h)">'+esc(r.data.pesan)+'</div><button type="button" class="bt pr" style="justify-content:center" onclick="rAuth(\'masuk\')">Kembali ke Masuk</button>'}
    else authErr((r&&r.msg)||'Gagal memproses')})
  .withFailureHandler(x=>{b.disabled=false;authErr((x&&x.message)||'Koneksi gagal. Coba lagi.')}).lupaPassword(u);return false}
function doAuth(e,mode){
  e.preventDefault();const v=id=>{const x=$(id);return x?x.value:''},b=$('a_go'),pw=v('a_pw');
  if(mode==='daftar'&&pw!==v('a_pw2')){authErr('Konfirmasi password tidak sama.');return false}
  b.disabled=true;authErr('');
  const g=gasRun().withSuccessHandler(r=>{
    if(r&&r.ok){ls('wk_tk',r.data.token);ls('wk_boot','');S.tk=r.data.token;S.user=r.data.user;S.as='';S.adm=null;S.ver='';SH=0;$('au').classList.remove('on');$('au').innerHTML='';
      if(r.data.boot){S.sj=JSON.stringify(r.data.boot);setData(r.data.boot);persist();$('ld').classList.add('off');jadwal()}else mulai()}
    else{b.disabled=false;authErr((r&&r.msg)||'Gagal memproses')}})
  .withFailureHandler(x=>{b.disabled=false;authErr((x&&x.message)||'Koneksi gagal. Coba lagi.')});
  if(mode==='daftar')g.daftar({nama:v('a_nama'),email:v('a_email'),username:v('a_user'),password:pw});else g.masuk(v('a_user'),pw);
  return false}
/** Keluar/sesi habis TANPA memuat ulang halaman (memuat ulang Apps Script lambat dan menampilkan layar putih): bersihkan keadaan lalu tampilkan layar masuk seketika. */
function resetKlien(msg){clearTimeout(S.pt);ls('wk_tk','');ls('wk_boot','');ls('wk_adm','');ADMB=0;
  Object.assign(S,{pf:0,d:null,tk:'',as:'',user:null,owner:null,adm:null,sj:'',ver:'',kid:'',dk:'',np:undefined,q:'',dr:{},am:{}});
  document.querySelectorAll('.sec').forEach(e=>{e.innerHTML=''});closeM();
  const b=$('bnr');if(b)b.innerHTML='';const w=$('wu');if(w){w.innerHTML='';w.className='wu'};const g=$('gq');if(g)g.value='';
  buildNav();nav('beranda');rAuth('masuk',msg||'')}
function keluar(){SH=0;resetKlien('')}
let SH=0;function sesiHabis(m){if(SH)return;SH=1;resetKlien(m||'Sesi berakhir. Silakan masuk kembali.')}
function kartuAkun(){const u=S.user;if(!u)return'';
  return `<div class="cd"><h3>Akun</h3><div class="kv"><div><small>Nama</small>${esc(u.nama)}</div><div><small>Username</small><span class="mono">${esc(u.username)}</span></div><div><small>Email</small>${esc(u.email)}</div><div><small>Peran</small>${u.peran==='admin'?'Admin Sekolah':'Wali Kelas'}</div><div><small>Versi server</small><span class="mono">${esc((S.d&&S.d.v)||'lama (belum diperbarui)')}</span></div></div>
  <div class="row" style="margin-top:14px"><button class="bt ol" onclick="formPw()"><i class="bi bi-key"></i>Ganti Password</button><button class="bt ol" onclick="keluar()"><i class="bi bi-box-arrow-right"></i>Keluar</button></div></div>`}
function formPw(){openForm('Ganti Password',[{k:'lama',l:'Password lama',t:'password',r:1},{k:'baru',l:'Password baru (min. 8 karakter)',t:'password',r:1},{k:'ulang',l:'Ulangi password baru',t:'password',r:1}],{},o=>{
  if(o.baru!==o.ulang)return toast('Konfirmasi password tidak sama',1);
  call('gantiPassword',[o.lama,o.baru],d=>{S.tk=d.token;ls('wk_tk',d.token);closeM();toast('Password berhasil diganti')})})}
/* banner penanda saat admin membuka data wali kelas lain + nama akun di bilah atas */
function rBanner(){const el=$('bnr'),w=$('wu'),o=S.owner,u=S.user,v=!!(S.as&&o&&u&&o.id!==u.id);
  if(el)el.innerHTML=v?`<div class="bnr"><span><i class="bi bi-eye-fill"></i> Anda sedang membuka data <b>${esc(o.nama)}</b> (@${esc(o.username)}). Perubahan langsung tersimpan di data beliau, jadi koordinasikan dahulu.</span><button class="bt sf" onclick="bukaData('${esc(u.id)}')"><i class="bi bi-arrow-left"></i>Kembali ke data saya</button></div>`:'';
  if(w){w.className='wu'+(v?' vw':'');w.innerHTML=u?`<span title="@${esc(u.username)}">${v?'Data: '+esc(o.nama):esc(u.nama)}</span><button class="ib" onclick="keluar()" aria-label="Keluar" title="Keluar"><i class="bi bi-box-arrow-right"></i></button>`:''}}
function bukaData(id,kid){const a=S.adm&&S.adm.akun&&S.adm.akun.find(x=>x.id===id);
  const prev=S.as;S.as=S.user&&id===S.user.id?'':id;S.kid='';S.dk='';S.dr={};S.ver='';$('ld').classList.remove('off');
  call('boot',[],d=>{S.sj=JSON.stringify(d);setData(d);persist();if(kid&&S.d.kelas.some(k=>k.id===kid&&k.status!=='arsip')){S.kid=kid;loadDraft();renderAll()}nav(S.as?(kid?'kelas':'beranda'):(S.from||'admin'));$('ld').classList.add('off');toast(S.as?'Membuka data '+(a?a.nama:'wali kelas'):'Kembali ke data Anda')},()=>{S.as=prev;$('ld').classList.add('off')})}
/* panel admin */
/** Rekap satu bulan. segar=1: tampilkan data lama dulu (bila ada) lalu ganti begitu data terbaru tiba. */
function muatRekap(b,paksa,segar){S.adm=S.adm||{};S.adm.rk=S.adm.rk||{};if(!paksa&&!segar&&S.adm.rk[b])return;call('rekapSekolah',[paksa?1:0,b],r=>{S.adm.rk[b]=r;rAdmin()})}
/** Bulan yang sedang dipakai halaman admin: bulan utama + bulan pilihan tiap kartu (Alpha terbanyak). */
function bulanAdm(){const a=S.adm||{},s=[a.bln||hari().slice(0,7)];Object.keys(a.ba||{}).forEach(k=>{if(s.indexOf(a.ba[k])<0)s.push(a.ba[k])});return s}
/** Data panel admin: SATU eksekusi server (adminBoot = daftar akun + rekap) dengan sidik jari versi, sehingga sinkron senyap hanya mengirim {same:true}
 *  bila tak ada yang berubah. Salinan terakhir disimpan di perangkat (wk_adm) dan diambil lebih dulu di latar setelah masuk (admPra), jadi halaman
 *  Admin Sekolah dan Wali Kelas tampil seketika dari memori, lalu disegarkan senyap. */
let ADMB=0,_as;
const jamSkr=()=>new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
function admSimpan(){clearTimeout(_as);_as=setTimeout(()=>{try{const a=S.adm;if(!a||!a.akun||!S.user)return;const rk={};Object.keys(a.rk||{}).sort().slice(-6).forEach(k=>{rk[k]=a.rk[k]});ls('wk_adm',JSON.stringify({u:S.user.id,akun:a.akun,rk:rk,vr:a.vr||''}))}catch(e){}},400)}
function admLokal(){if(!S.user||S.user.peran!=='admin'||(S.adm&&S.adm.akun))return;
  try{const c=JSON.parse(ls('wk_adm')||'null');if(c&&c.u===S.user.id&&c.akun)S.adm=Object.assign(S.adm||{},{akun:c.akun,rk:c.rk||{},vr:c.vr||''})}catch(e){}}
function admPra(){if(S.pf||!S.user||S.user.peran!=='admin'||S.as)return;S.pf=1;setTimeout(()=>{if(S.user&&S.user.peran==='admin')admTarik(0,1)},300)}
function admTarik(paksa,rekap,fin){
  const a=(S.adm=S.adm||{}),bl=rekap?bulanAdm():[];
  const sel=(ok,m)=>{ADMB=0;if(!ok&&(!a.akun||(rekap&&!Object.keys(a.rk||{}).length))){a.err=m||'Gagal memuat data';rAdmin()}if(fin)fin(ok,m)};
  ADMB=rekap?2:1;
  if(a.lama)return admLama(paksa,bl,rekap,sel);
  gasRun().withSuccessHandler(r=>{
    if(r&&r.sesi){ADMB=0;return sesiHabis(r.msg)}
    if(r&&r.ok){const d=r.data||{};a.vr=d.ver||a.vr||'';a.err='';let ubah=false;
      if(!d.same){const s0=JSON.stringify([a.akun,a.rk]);if(d.akun)a.akun=d.akun;a.rk=a.rk||{};Object.keys(d.rk||{}).forEach(b=>{a.rk[b]=d.rk[b]});ubah=JSON.stringify([a.akun,a.rk])!==s0;if(ubah)admSimpan()}
      ADMB=0;if(ubah)rAdmin();if(fin)fin(true);return}
    if(r&&/Perintah tidak dikenal/.test(r.msg||'')){a.lama=1;return admLama(paksa,bl,rekap,sel)} /* server belum diperbarui: pakai dua panggilan lama */
    sel(false,(r&&r.msg)||'Gagal memproses')})
  .withFailureHandler(e=>sel(false,(e&&e.message)||'Koneksi gagal. Coba lagi.'))
  .api(S.tk,'adminBoot',[paksa,bl,rekap?1:0,paksa?'':(a.vr||'')],'',S.ver||'')}
function admLama(paksa,bl,rekap,sel){const a=S.adm;let sisa=1+bl.length,ubah=false;a.rk=a.rk||{};
  const x=()=>{if(--sisa>0)return;if(ubah){admSimpan();rAdmin()}sel(true)};
  diam('daftarAkun',[paksa===2?2:0],d=>{if(JSON.stringify(d)!==JSON.stringify(a.akun)){a.akun=d;ubah=true}},x);
  bl.forEach(b=>diam('rekapSekolah',[paksa?(paksa===2?2:1):0,b],d=>{if(JSON.stringify(d)!==JSON.stringify(a.rk[b])){a.rk[b]=d;ubah=true}},x))}
function diam(fn,args,ok,fin){gasRun().withSuccessHandler(r=>{try{if(r&&r.sesi)return sesiHabis(r.msg);if(r&&r.ok)ok(r.data)}finally{fin()}}).withFailureHandler(()=>fin()).api(S.tk,fn,args,'',S.ver||'')}
/** paksa: 0 = tampil seketika dari memori lalu cek senyap; 1 = tarik ulang setelah aksi admin; 2 = tombol Muat ulang (server memeriksa Sheets ke Drive; tombol berputar lalu muncul "Data diperbarui"). */
function muatAdmin(paksa){if(!S.user||S.user.peran!=='admin')return;const a=(S.adm=S.adm||{}),wali=S.sec==='wali',siap=a.akun&&(!wali||Object.keys(a.rk||{}).length);
  if(!paksa){if(siap)return sinkAdmin();if(ADMB&&(ADMB===2||!wali))return;return admTarik(0,wali)}
  if(paksa===2){if(a.busy)return;a.busy=true;rAdmin();return admTarik(2,true,(ok,m)=>{a.busy=false;rAdmin();if(ok)toast('Data diperbarui pukul '+jamSkr());else toast(m||'Gagal memuat data',1)})}
  admTarik(1,wali)}
/** Sinkron senyap: tanpa toast dan tanpa kedip; digambar ulang HANYA bila datanya berubah. Ditunda saat jendela terbuka atau admin sedang memilih/mengetik di halaman ini. */
function sinkAdmin(paksa){
  if(ADMB||document.hidden||(S.sec!=='admin'&&S.sec!=='wali')||S.as||!S.tk||!S.user||S.user.peran!=='admin'||!S.adm||!S.adm.akun)return;
  if(!paksa&&Date.now()-(S.adm.st||0)<(S.sec==='wali'?25000:8000))return;
  const a=document.activeElement;
  if($('md').classList.contains('on')||(a&&a.closest&&a.closest('#s-admin,#s-wali')&&a.matches('input,select,textarea')))return;
  S.adm.st=Date.now();admTarik(0,S.sec==='wali')}
setInterval(()=>{if(Date.now()-S.act<600000)sinkAdmin()},15000);
const tglJam=t=>t?String(t).slice(0,16):'-';
function admBln(v){if(!/^\d{4}-\d{2}$/.test(v||''))return;S.adm=S.adm||{};S.adm.bln=v;S.adm.ba={};rAdmin();admTarik(1,true)}
/** Pilihan bulan khusus bagian "Alpha terbanyak" pada satu kartu guru (data bulan itu ditarik sekali lalu disimpan). */
function admBlA(id,v){if(!/^\d{4}-\d{2}$/.test(v||''))return;S.adm=S.adm||{};S.adm.ba=S.adm.ba||{};S.adm.ba[id]=v;rAdmin();admTarik(1,true)}
/** Tingkat sebuah kelas: dari field tingkat (X/XI/XII); cadangan dari awal nama kelas (mis. "XII TM 1", "X-1", "11 A"). */
function tgk(r){const t=String(r.tingkat||'').toUpperCase().trim();if(t==='X'||t==='XI'||t==='XII')return t;
  const m=/^\s*(XII|XI|X)(?![A-Z])/i.exec(r.nama_kelas||'');if(m)return m[1].toUpperCase();
  const n=/^\s*(10|11|12)(?!\d)/.exec(r.nama_kelas||'');return n?({10:'X',11:'XI',12:'XII'})[n[1]]:''}
const gfIb=(ic,t,fn,x)=>`<button class="ib" style="display:inline-grid;width:36px;height:36px${x||''}" title="${t}" aria-label="${t}" onclick="${fn}"><i class="bi ${ic}"></i></button>`;
const gfPc=(h,t)=>t?Math.round(1000*h/t)/10:null,gfWp=p=>p===null?'':p>=85?'gf-ok':'gf-bad';
/** Konteks bersama Admin Sekolah & Wali Kelas: semua dibaca dari memori (S.adm), tanpa panggilan server. */
function gfCtx(){const a=S.adm||{},RK=a.rk||{},pil=a.bln||hari().slice(0,7),g={};let bl=pil;
  if(!RK[bl]){const ks=Object.keys(RK).sort();if(ks.length)bl=ks[ks.length-1]} /* data bulan pilihan belum tiba: tampilkan bulan terbaru yang ada (label jujur), jangan kosong */
  const R=RK[bl];(R||[]).forEach(r=>{(g[r.akun_id]=g[r.akun_id]||[]).push(r)});
  return {RK:RK,BA:a.ba||{},PW:a.pw||{},bl:bl,pil:pil,R:R,lb:blS(bl),me:S.user.id,g:g}}
/** Kartu satu akun. f.saring(r) memilih kelas yang ikut dihitung (Wali Kelas: hanya kelas aktif pada tingkat terpilih). */
function gfKartu(a,f){
  const RK=f.RK,BA=f.BA,bl=f.bl,R=f.R,lb=f.lb,PW=f.PW,sar=f.saring||(()=>true),
    s=a.id===f.me,adm=a.peran==='admin',ok=a.status==='aktif',
    rs=(f.g[a.id]||[]).filter(sar).sort((x,y)=>String(y.tahun_ajaran).localeCompare(String(x.tahun_ajaran))||String(x.nama_kelas).localeCompare(String(y.nama_kelas))),
    sw=rs.reduce((t,r)=>t+r.siswa,0),hd=rs.reduce((t,r)=>t+r.hadirBln,0),tb=rs.reduce((t,r)=>t+r.totBln,0),hi=rs.reduce((t,r)=>t+r.hariIni,0),p=gfPc(hd,tb),
    kl=rs.filter(r=>r.status!=='arsip'),ks=rs.slice().sort((x,y)=>(x.status==='arsip')-(y.status==='arsip')),
    mA=BA[a.id]||bl,RA=RK[mA],ra=(RA||[]).filter(r=>r.akun_id===a.id&&sar(r)),tbA=ra.reduce((t,r)=>t+r.totBln,0),tp=[];
  ra.forEach(r=>(r.topAlpha||[]).forEach(t=>tp.push({n:t.nama,c:t.n,k:r.nama_kelas})));tp.sort((x,y)=>y.c-x.c);
  const alfa=!RA?'<small>Memuat...</small>':!ra.length?'<small>Belum punya kelas.</small>':tp.length?tp.slice(0,3).map(t=>`<div class="gf-a"><span>${esc(t.n)}${ra.length>1?` <small>(${esc(t.k)})</small>`:''}</span><b class="mono">${t.c}x</b></div>`).join(''):`<small>${tbA?'Tidak ada alpha di bulan ini.':'Belum ada data absensi di bulan ini.'}</small>`;
  const bk=ks.length?`<div class="gf-kls" aria-label="Kelas binaan">${ks.slice(0,2).map(r=>`<span class="gf-kl${r.status==='arsip'?' gf-off':''}"${r.status==='arsip'?' title="Kelas diarsipkan"':''}>${esc(r.nama_kelas)}</span>`).join('')}${ks.length>2?`<span class="gf-kl gf-more">+${ks.length-2}</span>`:''}</div>`:'';
  const aksi=s?'':gfIb('bi-key','Reset password',`akReset('${a.id}')`)+gfIb(ok?'bi-person-slash':'bi-person-check',ok?'Nonaktifkan':'Aktifkan',`akStatus('${a.id}','${ok?'nonaktif':'aktif'}')`)+gfIb(adm?'bi-person-down':'bi-shield-plus',adm?'Jadikan Wali Kelas':'Jadikan Admin',`akPeran('${a.id}','${adm?'guru':'admin'}')`)+gfIb('bi-trash','Hapus akun',`akHapus('${a.id}')`,';color:#BA1A1A');
  return `<div class="gf-c"><div class="gf-h"><span class="gf-ic"><i class="bi bi-folder2-open"></i></span><div class="gf-n"><b>${esc(a.nama)}</b><small class="mono">@${esc(a.username)}</small><small>${esc(a.email)}</small></div>${bk}</div>
    <div class="gf-b">${s?'<span class="bd b-p">Anda</span>':''}<span class="bd ${adm?'b-p':'b-s'}">${adm?'Admin':'Wali Kelas'}</span><span class="bd ${ok?'b-h':'b-a'}">${ok?'Aktif':'Nonaktif'}</span></div>
    <div class="gf-s"><div><b>${R?kl.length:'-'}</b><small>Kelas</small></div><div><b>${R?sw:'-'}</b><small>Siswa</small></div><div><b class="${gfWp(p)}">${R&&p!==null?p+'%':'-'}</b><small>Hadir ${esc(lb)}</small></div></div>
    ${R&&sw?`<p class="gf-hi"><i class="bi bi-calendar-check"></i>Absensi hari ini <b>${hi}/${sw}</b> siswa</p>`:''}
    <div class="gf-l"><div class="gf-lh"><h4>Alpha terbanyak</h4><input type="month" class="pill gf-m" value="${esc(mA)}" aria-label="Pilih bulan alpha terbanyak" onchange="admBlA('${a.id}',this.value)"></div>${alfa}</div>
    ${s?'<small style="color:var(--t2)">Ini akun admin Anda.</small>':`<button class="bt pr" style="justify-content:center" onclick="S.from=S.sec;bukaData('${a.id}')"><i class="bi bi-box-arrow-in-right"></i>Buka Kelas</button>`}
    <div class="gf-f"><div><small style="color:var(--t2)">Password</small><br>${PW[a.id]?`<b class="mono" style="font-size:13px;user-select:all">${esc(PW[a.id])}</b> <small style="color:var(--t2)">(sementara)</small>`:'<small>terenkripsi</small>'}<br><small style="color:var(--t2)">Masuk terakhir ${esc(tglJam(a.last_login))}</small></div><div class="row" style="gap:2px;flex-wrap:nowrap">${aksi}</div></div></div>`}
const gfBar=bl=>`<div class="row" style="margin-bottom:16px"><label class="row" style="gap:8px">Bulan<input type="month" class="pill" value="${esc(bl)}" aria-label="Bulan rekap" onchange="admBln(this.value)"></label><button class="bt ol" onclick="muatAdmin(2)"${S.adm&&S.adm.busy?' disabled':''}><i class="bi bi-arrow-clockwise${S.adm&&S.adm.busy?' spin':''}"></i>${S.adm&&S.adm.busy?'Memuat...':'Muat ulang'}</button></div>`;
const gfSkel=j=>`<h1 class="h1">${j}</h1><div class="gf" aria-busy="true" aria-label="Memuat"><div class="skc"></div><div class="skc"></div><div class="skc"></div></div>`;
const gfGagal=m=>`<div class="cd"><div class="emp"><i class="bi bi-wifi-off"></i>${esc(m)}<br><button class="bt ol" style="margin-top:12px" onclick="S.adm.err='';muatAdmin(2)">Coba lagi</button></div></div>`;
const gfMuat=j=>`<h1 class="h1">${j}</h1><div class="cd"><div class="emp"><i class="bi bi-hourglass-split"></i>Memuat data akun...</div></div>`;
/** Admin Sekolah: hanya akun admin. Daftar wali kelas ada di menu Wali Kelas (per tingkat X / XI / XII). */
function rAdmin(){rAdmin1();if(S.sec==='wali')rWali()}
function rAdmin1(){const el=$('s-admin');if(!el)return;
  if(!S.user||S.user.peran!=='admin'){el.innerHTML='';return}
  const A=S.adm&&S.adm.akun,H='<h1 class="h1">Admin Sekolah</h1>';
  if(!A){const er=S.adm&&S.adm.err;el.innerHTML=H+kartuAkun()+(er?gfGagal(er):'<div class="akg" aria-busy="true"><div class="skc"></div></div>');return}
  const me=S.user.id,PW=(S.adm&&S.adm.pw)||{},lain=A.filter(a=>a.id!==me).sort((x,y)=>String(y.created_at||'').localeCompare(String(x.created_at||''))); /* pendaftar terbaru di atas */
  const baris=a=>{const adm=a.peran==='admin',ok=a.status==='aktif',
    aksi=gfIb('bi-key','Reset password',`akReset('${a.id}')`)+gfIb(ok?'bi-person-slash':'bi-person-check',ok?'Nonaktifkan':'Aktifkan',`akStatus('${a.id}','${ok?'nonaktif':'aktif'}')`)+gfIb(adm?'bi-person-down':'bi-shield-plus',adm?'Jadikan Wali Kelas':'Jadikan Admin',`akPeran('${a.id}','${adm?'guru':'admin'}')`)+gfIb('bi-trash','Hapus akun',`akHapus('${a.id}')`,';color:#BA1A1A');
    return `<div class="cd"><div class="kv"><div><small>Nama</small>${esc(a.nama)}</div><div><small>Username</small><span class="mono">${esc(a.username)}</span></div><div><small>Email</small>${esc(a.email)}</div><div><small>Peran</small>${adm?'Admin Sekolah':'Wali Kelas'}</div><div><small>Status</small>${ok?'Aktif':'Nonaktif'}</div><div><small>Kelas / Siswa</small>${a.kelas||0} kelas, ${a.siswa||0} siswa</div><div><small>Masuk terakhir</small>${esc(tglJam(a.last_login))}</div>${PW[a.id]?`<div><small>Password sementara</small><b class="mono" style="user-select:all">${esc(PW[a.id])}</b></div>`:''}</div><div class="row" style="margin-top:14px;gap:4px">${aksi}</div></div>`};
  el.innerHTML=H+`<p class="sub">Akun Anda dan semua wali kelas yang mendaftar. Pendaftaran terbuka, jadi hapus akun yang tidak dikenal. Daftar wali kelas per tingkat ada di menu Wali Kelas.</p>${kartuAkun()}
  <h2 class="h2" style="margin:8px 0 12px">Akun Terdaftar (${lain.length})</h2>${lain.length?`<div class="akg">${lain.map(baris).join('')}</div>`:'<div class="cd"><div class="emp"><i class="bi bi-person-plus"></i>Belum ada wali kelas yang mendaftar.</div></div>'}`}
/** Wali Kelas: wali kelas dikelompokkan menurut tingkat kelas aktif yang dibinanya. Pindah X/XI/XII hanya menyaring data di memori (seketika). */
function rWali(){const el=$('s-wali');if(!el)return;
  if(!S.user||S.user.peran!=='admin'){el.innerHTML='';return}
  const A=S.adm&&S.adm.akun,f=gfCtx();if(!A||!f.R){const er=S.adm&&S.adm.err;el.innerHTML=er?'<h1 class="h1">Wali Kelas</h1>'+gfGagal(er):gfSkel('Wali Kelas');return}
  const ak={X:{},XI:{},XII:{}};f.R.forEach(r=>{if(r.status==='arsip')return;const t=tgk(r);if(ak[t])ak[t][r.akun_id]=1});
  const nm=(a,b)=>String(a.nama).localeCompare(String(b.nama)),per={};TK.forEach(t=>per[t]=A.filter(a=>ak[t][a.id]).sort(nm));
  per.L=A.filter(a=>a.peran!=='admin'&&!TK.some(t=>ak[t][a.id])).sort(nm);
  if((S.nL||0)!==per.L.length){S.nL=per.L.length;const sm=$('smw');if(sm){sm.innerHTML=smHtml();aktifWali()}}
  const tabs=TK.concat(per.L.length?['L']:[]);if(tabs.indexOf(S.wt)<0)S.wt='X';
  const t=S.wt,daf=per[t],sar=t==='L'?null:r=>r.status!=='arsip'&&tgk(r)===t;
  const tab=x=>`<button class="wtb${x===t?' on':''}" aria-pressed="${x===t}" onclick="pilihTingkat('${x}')">${x==='L'?'Tanpa kelas':'Kelas '+x}<span>${per[x].length}</span></button>`;
  const ket=t==='L'?'Akun wali kelas yang belum membina kelas aktif. Tinjau, atau hapus bila tidak dikenal.':`Wali kelas yang membina Kelas ${t}. Tombol Buka Kelas membuka data wali kelas dalam mode dapat-diedit, jadi koordinasikan dengan beliau.`;
  el.innerHTML=`<h1 class="h1">Wali Kelas ${t==='L'?'(Tanpa Kelas)':t}</h1><p class="sub">${ket}</p>
  <div class="wts" role="tablist" aria-label="Tingkat kelas">${tabs.map(tab).join('')}</div>
  ${gfBar(f.pil)}${daf.length?`<div class="gf">${daf.map(a=>gfKartu(a,Object.assign({},f,{saring:sar||(()=>true)}))).join('')}</div>`:`<div class="cd"><div class="emp"><i class="bi bi-person-x"></i>Belum ada wali kelas yang membina Kelas ${esc(t)}.</div></div>`}`}
const akNama=id=>{const a=S.adm&&S.adm.akun&&S.adm.akun.find(x=>x.id===id);return a?a.nama+' (@'+a.username+')':'akun ini'};
function akStatus(id,st){call('ubahStatusAkun',[id,st],()=>{toast(st==='aktif'?'Akun diaktifkan':'Akun dinonaktifkan');muatAdmin(1)})}
function akPeran(id,p){ask((p==='admin'?'Jadikan ':'Kembalikan ')+akNama(id)+(p==='admin'?' sebagai Admin? Ia akan bisa melihat dan mengubah data semua wali kelas.':' menjadi Wali Kelas biasa?'),()=>call('ubahPeranAkun',[id,p],()=>{toast('Peran diubah');muatAdmin(1)}),'Ya, ubah')}
function akReset(id){ask('Reset password '+akNama(id)+'? Password lama tidak berlaku lagi dan perangkatnya akan keluar otomatis.',()=>call('resetPasswordAkun',[id],d=>{
  S.adm=S.adm||{};S.adm.pw=S.adm.pw||{};S.adm.pw[id]=d.pw;rAdmin(); /* tampil di kolom Password selama halaman ini terbuka (hanya di memori admin) */
  $('md').innerHTML=`<div class="bk" onclick="closeM()"></div><div class="dg" role="dialog"><p>Password sementara untuk <b>${esc(akNama(id))}</b>:</p><p class="mono" style="font-size:22px;font-weight:700;letter-spacing:.04em;user-select:all">${esc(d.pw)}</p><p>Catat dan sampaikan langsung kepada yang bersangkutan, lalu minta ia menggantinya di Pengaturan. Password ini hanya ditampilkan sekali.</p><div class="row"><button class="bt pr" onclick="closeM()">Selesai</button></div></div>`;$('md').classList.add('on')}),'Reset')}
function akHapus(id){const a=S.adm&&S.adm.akun&&S.adm.akun.find(x=>x.id===id),isi=a&&(a.kelas||a.siswa)?` beserta ${a.kelas} kelas dan ${a.siswa} siswanya (absensi, catatan, rapot, dan berkas Drive)`:'';
  ask('Hapus akun '+akNama(id)+isi+'? Tindakan ini tidak dapat dibatalkan.',()=>call('hapusAkun',[id],()=>{if(S.as===id)bukaData(S.user.id);toast('Akun dihapus');muatAdmin(1)}))}


init();
