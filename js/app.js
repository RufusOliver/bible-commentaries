/* ============================================================
   Bible Commentaries - application core
   Library / books / reader navigation, search, settings,
   TTS wiring and keyboard shortcuts.
   ============================================================ */
'use strict';

/* ---------------- state ---------------- */
const S = {
  commentary: null,
  manifest:   null,
  book:       null,
  bookData:   null,
  chapter:    1,
  query:      null,     // null = no search active
  settings:   { theme:'dark', font:'serif', size:1.06, lh:1.72 }
};

/* ---------------- helpers ---------------- */
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let toastTm;
function toast(msg){
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTm);
  toastTm = setTimeout(()=>t.classList.remove('show'), 2600);
}
function show(id){
  document.querySelectorAll('.view-section').forEach(s=>s.classList.add('hidden'));
  $(id).classList.remove('hidden');
}
function scrollTopAnim(targetY){
  const y = targetY || 0;
  try { window.scrollTo({ top:y, behavior:'smooth' }); }
  catch(e){ window.scrollTo(0,y); }
}

/* ---------------- progress bar ---------------- */
let progIp = null;
function setProgress(p){
  const bar = $('loadingBar');
  bar.style.width = p + '%';
  bar.classList.toggle('show', p>0 && p<100);
  if (p>=100) bar.classList.add('show');
}
function withProgress(promise){
  let pct = 0;
  clearInterval(progIp);
  progIp = setInterval(()=>{ pct = Math.min(78, pct+7); setProgress(pct); }, 260);
  return promise.finally(()=>{
    clearInterval(progIp);
    setProgress(100);
    setTimeout(()=>setProgress(0), 420);
  });
}

/* ================= LIBRARY ================= */
function renderLibrary(){
  show('library');
  $('searchBox').classList.add('hide');
  $('searchBox').value = '';
  S.query = null;
  S.commentary = S.manifest = S.book = S.bookData = null;
  stopTTS();
  $('footer').style.display = 'block';

  const root = $('library');
  root.innerHTML = `
    <div class="lib-head page">
      <h2>The Public-Domain Library</h2>
      <p>Every work here is in the <b>public domain</b> \u2014 free of copyright as of 2025 \u2014 the accumulated wisdom of the church across the centuries: Reformation and Victorian classics, the Catholic Douay tradition and the Eastern Fathers, and the great early-church histories. Read quietly, or press play and have the commentators <i>read aloud to you</i> with the built-in text-to-speech engine.</p>
      <div class="stats">
        <span><b>${COMMENTARIES.length}</b> works</span>
        <span><b>Protestant \u00b7 Catholic \u00b7 Orthodox \u00b7 Church Fathers \u00b7 History</b></span>
        <span><b>200+ books &amp; church volumes</b></span>
        <span><b>$0</b> \u2014 all free, forever</span>
      </div>
    </div>
    <div class="page grid" id="libGrid"></div>`;

  const grid = $('libGrid');
  COMMENTARIES.forEach(c => grid.appendChild(card(c)));

  idbOpen().catch(()=>{ /* private mode: no cache, still works */ });

  const warm = ['matthew-henry','john-gill','treasury-of-david','adam-clarke','jamieson-fausset-brown','keil-delitzsch'];
  warm.forEach(cid => {
    fetchJSON('m:'+cid, manifestURL(cid))
      .then(m => { const el = grid.querySelector(`[data-id="${cid}"]`); if (el) uiMem(el, m); })
      .catch(()=>{});
  });
}

function card(c){
  const el = document.createElement('div');
  el.className = 'card';
  el.dataset.id = c.id;
  el.tabIndex = 0;
  el.setAttribute('role','button');
  el.setAttribute('aria-label','Open '+c.title);
  el.innerHTML = `
    <div class="c-title">${esc(c.title)}</div>
    <div class="c-author">${esc(c.author)} \u00b7 ${c.year}</div>
    <div class="c-desc">${c.desc}</div>
    <div class="c-meta">
      <span class="badge gold">${esc(c.tradition[0])}</span>
      <span class="badge">${c.tradition.slice(1).join(' \u00b7 ')||'classic'}</span>
      <span class="badge book-count">…</span>
    </div>
    <div class="mini-bar"><i></i></div>`;
  if ((c.provider||'ocd') !== 'ocd'){
    const ov = BOOK_OVERRIDES[c.id];
    const bc = el.querySelector('.book-count');
    if (bc) bc.textContent = ov ? ov.length+' books' : 'full text';
  }
  el.addEventListener('click', ()=>openCommentary(c.id, el));
  el.addEventListener('keydown', e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); openCommentary(c.id, el); } });
  return el;
}

function uiMem(el, m){
  if (!el || !m) return;
  const books = (m.books||[]).filter(b=>b.entry_count || b.status);
  const n = m.books ? m.books.length : 0;
  const total = m.stats ? m.stats.total_entries : 0;
  const bc = el.querySelector('.book-count');
  if (bc){
    if (total) bc.textContent = total.toLocaleString()+' notes';
    else bc.textContent = (n||'?')+' books';
  }
  const bar = el.querySelector('.mini-bar i');
  if (bar) bar.style.width = '38%';
}

async function openCommentary(cid, cardEl){
  const c = COMMENTARIES.find(x=>x.id===cid);
  if (!c) return;
  document.querySelectorAll('.card').forEach(g=>g.classList.add('loading'));
  stopTTS();
  try{
    const isOcd = (c.provider||'ocd')==='ocd';
    let m = null;
    if (isOcd){
      try { m = await withProgress(fetchJSON('m:'+cid, manifestURL(cid))); }
      catch(err){ /* no manifest */ }
    }
    if (!m || !(m.books||[]).length){
      const ov = BOOK_OVERRIDES[cid];
      if (!ov) throw new Error('No book list');
      m = { books: ov.map(b=>({ name:b.name, file:b.f, chapter_count:b.ch, status:isOcd?'partial':undefined })), stats:{ total_entries: 0 } };
    }
    S.commentary = c;
    S.manifest = m;
    renderBooks();
  }catch(err){
    toast('Could not load the book list \u2014 check your connection.');
  }finally{
    document.querySelectorAll('.card').forEach(g=>g.classList.remove('loading'));
  }
}

/* ================= BOOKS ================= */
function renderBooks(){
  show('books');
  const c = S.commentary;
  const m = S.manifest;
  if (!c || !m) { renderLibrary(); return; }

  let books = (m.books||[])
    .map(b => ({ name:b.name, f:b.file, count:b.entry_count, status:b.status, ch:b.chapter_count }))
    .filter(b=>b.f || b.name);
  const total = m.stats ? m.stats.total_entries : books.reduce((a,b)=>a+(b.count||0),0);
  if (c.id === 'treasury-of-david') books = [{ name:'Psalms', f:'psalms.json', count:total, status:'partial', ch:150 }];
  const bookRank = n => (CATHOLIC_ORDER.has(n) ? CATHOLIC_ORDER.get(n) : (BOOK_IDX.get(n) ?? 200));
  books.sort((a,b)=> bookRank(a.name)-bookRank(b.name));

  const root = $('books');
  root.innerHTML = `
    <div class="page">
      <div class="crumb"><a data-act="lib">Library</a><span class="sep">/</span><b>${esc(c.title)}</b></div>
      <div class="books-title">
        <h2>${esc(c.author)} \u2014 ${esc(c.title)}</h2>
        <span class="src">${total ? total.toLocaleString()+' notes across '+books.length+' books' : books.length+' books'} \u00b7 ${esc(c.era)} \u00b7 public domain \u00b7 tap a book to begin</span>
      </div>
      <div class="book-list"></div>
    </div>`;

  const bl = root.querySelector('.book-list');
  books.forEach(b=>{
    const chip = document.createElement('div');
    chip.className = 'book-chip' + (b.status==='partial' ? ' partial' : '');
    chip.tabIndex = 0;
    chip.setAttribute('role','button');
    chip.innerHTML = `<div class="bc-name">${esc(b.name)}</div>` +
      (b.count ? `<div class="bc-count">${b.count} notes</div>` : `<div class="bc-count">full text</div>`);
    chip.addEventListener('click', ()=>openBook(b));
    chip.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); openBook(b); } });
    bl.appendChild(chip);
  });

  root.querySelector('[data-act="lib"]').addEventListener('click', renderLibrary);
}

async function openBook(b){
  S.query = null;
  S.chapter = 1;
  $('searchBox').value = '';
  stopTTS();
  try{
    const bd = await withProgress(fetchBook(S.commentary.id, b));
    S.book = b;
    const sectionIndex = (S.manifest.books||[]).findIndex(x=>x.name===b.name);
    S.bookData = normalizeBook(bd, b.ch, { provider:S.commentary.provider||'ocd', bookName:b.name, sectionIndex });
    const firstCovered = S.bookData.chapters.findIndex(cd=>cd.entries.length || cd.intro.length);
    S.chapter = firstCovered>=0 ? firstCovered+1 : 1;
    $('footer').style.display = 'none';
    prepareReaderShell();
    show('reader');
    renderReader();
  }catch(err){
    toast('Could not open '+b.name+' \u2014 check internet.');
  }
}

/* ================= READER ================= */
function prepareReaderShell(){
  const r = $('reader');
  r.innerHTML = `
    <div class="page">
      <div class="crumb">
        <a data-act="lib">Library</a><span class="sep">/</span>
        <a data-act="books">${esc(S.commentary.author)}</a><span class="sep">/</span>
        <b id="crumbBook">${esc(S.book.name)}</b>
      </div>
      <div class="reader-toolbar" id="toolbar">
        <label for="chSel">Chapter</label>
        <select class="sel" id="chSel" aria-label="Chapter"></select>
        <label for="passSel">Passage</label>
        <select class="sel" id="passSel" aria-label="Commentary passage"></select>
        <button class="navBtn" id="chPrev" title="Previous chapter">&#8592;</button>
        <button class="navBtn" id="chNext" title="Next chapter">&#8594;</button>
        <span style="flex:1"></span>
        <button class="navBtn pri" id="readChBtn" title="Read this chapter aloud">&#9654;&nbsp;Read chapter</button>
      </div>
      <h2 class="chapter-title" id="chapterTitle"></h2>
      <div class="chapter-sub" id="chapterSub"></div>
      <div id="content"></div>
      <div class="nears" id="nearbox"></div>
    </div>`;
  r.querySelector('[data-act="lib"]').addEventListener('click', renderLibrary);
  r.querySelector('[data-act="books"]').addEventListener('click', renderBooks);
}

function chapterCount(){
  return S.bookData ? S.bookData.chapters.length : 0;
}
function chapterEntries(ch){
  const chd = S.bookData.chapters[ch-1];
  if (!chd) return { intro:[], entries:[] };
  return chd;
}

function renderReader(){
  const b = S.book;
  const ch = S.chapter;
  const { intro, entries } = chapterEntries(ch);

  $('chapterTitle').innerHTML = `${esc(b.name)} <i style="font-weight:400;color:inherit">${ch}</i>`;

  /* chapter selector */
  const cs = $('chSel');
  const maxCh = chapterCount();
  cs.innerHTML = '';
  for (let i=1;i<=maxCh;i++) cs.appendChild(new Option(String(i), String(i)));
  cs.value = String(ch);
  $('chPrev').disabled = ch<=1;
  $('chNext').disabled = ch>=maxCh;

  /* passage jumper */
  const ps = $('passSel');
  ps.innerHTML = '';
  if (intro.length) intro.forEach((e,i)=>ps.appendChild(new Option('Introduction', 'i'+i)));
  entries.forEach((e,i)=>ps.appendChild(new Option(verseLabel(e), 'e'+i)));
  if (!intro.length && !entries.length) ps.appendChild(new Option('No notes', 'none'));

  /* content */
  let html = '';
  if (entries.length){
    const hasVerses = entries.some(e=>endVerse(e)>0);
    $('chapterSub').textContent = hasVerses
      ? `${entries.length} passage${entries.length>1?'s':''} \u00b7 covering verses 1\u2013${Math.max(...entries.map(endVerse))}`
      : `${entries.length} section${entries.length>1?'s':''} in chapter ${ch}`;
  } else {
    const firstCovered = S.bookData.chapters.findIndex(cd=>cd.entries.length || cd.intro.length);
    $('chapterSub').textContent = 'No dedicated note for this chapter';
    html += `<div class="empty-note"><b>No separate note for this chapter.</b> Classic commentaries often group several chapters under one heading. See the <b>Nearby notes</b> panel below, or open an adjacent chapter.${firstCovered>=0?` Notes resume at chapter <b>${firstCovered+1}</b>.`:''}</div>`;
  }
  intro.forEach(e => html += entryHtml(e, true));
  entries.forEach(e => html += entryHtml(e, false));
  $('content').innerHTML = html;

  bindEntries();
  bindRefChips();
  buildNearby(intro, entries, ch);
  wireToolbar();
  checkSearchOverride();
  stopTTS();
}

function endVerse(e){
  const m = /^(\d+)(?:-(\d+))?/.exec(e.verse_range||'');
  return m ? parseInt(m[2]||m[1],10) : 0;
}
function verseLabel(e){
  if (!e.verse_range) return e.title || 'Section';
  if (e.verse_range==='intro') return 'Introduction';
  return 'vv. '+e.verse_range;
}
function paragraphs(t){
  const raw = String(t||'').trim();
  if (!raw) return '<p class="nothing">(no commentary text)</p>';
  return raw.split(/\n{2,}/).map(block=>{
    const inner = esc(block).replace(/\n/g,'<br>');
    return `<p>${inner}</p>`;
  }).join('');
}

function entryHtml(e, isIntro){
  const hasText = e.commentary_text && e.commentary_text.trim().length>0;
  const words = e.verse_text ? `<div class="words">${esc(e.verse_text)}</div>` : '';
  const refs = (e.cross_references && e.cross_references.length)
    ? `<div class="refs"><span>Refs \u00b7</span>${e.cross_references.slice(0,14).map(r=>`<button class="ref-chip" data-ref="${esc(r)}">${esc(r)}</button>`).join('')}</div>` : '';
  return `<article class="entry ${isIntro?'entry-intro':''}" data-hastext="${hasText?1:0}">
    <div class="entry-head">
      <span class="entry-ref">${verseLabel(e)}</span>
      ${e.word_count?`<span class="entry-count">${e.word_count} words</span>`:''}
      ${hasText?`<button class="inline-read navBtn" title="Read this note aloud">&#9654; Read</button>`:''}
    </div>
    ${words}
    <div class="com-text">${paragraphs(e.commentary_text)}</div>
    ${refs}
  </article>`;
}

function bindEntries(){
  document.querySelectorAll('#content .inline-read').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const entry = btn.closest('.entry');
      const all = readableEntries();
      const i = all.indexOf(entry);
      if (i>=0) startTTSFrom(i);
    });
  });
}
function bindRefChips(){
  document.querySelectorAll('.ref-chip').forEach(chip=>{
    chip.addEventListener('click', ()=>{
      const ref = chip.dataset.ref || '';
      let m = /^(\d?[A-Za-z\u2013]+)\.?(\d+)\.(\d+)/.exec(ref);
      if (!m) m = /^([A-Za-z\u2013]+)\s+(\d+)(?::(\d+))?/.exec(ref);
      if (!m) return;
      const bookName = refBookName(m[1]) || (BOOK_IDX.has(m[1]) ? m[1] : null);
      const ch = +m[2];
      if (!bookName) { toast('Reference not in this book set.'); return; }
      if (S.book.name !== bookName){
        // Jump to that book's matching chapter is heavy (books may not be loaded);
        // politely inform and offer to jump within this book when possible.
        toast('Reference points to '+bookName+' '+ch+' \u2014 switch books to follow it.');
        return;
      }
      S.chapter = Math.min(ch, chapterCount());
      renderReader();
      scrollTopAnim(0);
      toast('Jumped to '+bookName+' '+ch);
    });
  });
}

/* nearby notes panel */
function buildNearby(intro, entries, ch){
  const box = $('nearbox');
  if (!box) return;
  const all = [];
  S.bookData.chapters.forEach(cd=>{
    cd.intro.forEach(e=>all.push({e, ch:cd.ch, kind:'intro'}));
    cd.entries.forEach(e=>all.push({e, ch:cd.ch, kind:'entry'}));
  });
  const hits = [];
  for (let off=0; off<=4 && hits.length<18; off++){
    for (const d of all){
      if (d.ch === ch-off || d.ch === ch+off) hits.push(d);
    }
  }
  if (!hits.length){ box.innerHTML=''; return; }
  box.innerHTML = `<div class="nearbox">
    <h4>Nearby notes</h4>
    <div class="near-list">${hits.map(d=>{
      const here = d.ch===ch;
      const label = verseLabel(d.e);
      return `<button class="near-chip${here?' here':''}" data-ch="${d.ch}">${d.ch} \u00b7 ${esc(label)}</button>`;
    }).join('')}</div>
  </div>`;
  box.querySelectorAll('.near-chip').forEach(chip=>{
    chip.addEventListener('click', ()=>{
      S.chapter = +chip.dataset.ch;
      renderReader();
      scrollTopAnim(0);
    });
  });
}

/* search override: restrict which entries display */
function checkSearchOverride(){
  const q = S.query;
  if (!q){ document.querySelectorAll('#content .entry').forEach(e=>e.style.display=''); return; }
  const needle = q.toLowerCase();
  let hits = 0;
  document.querySelectorAll('#content .entry').forEach(e=>{
    const txt = e.innerText.toLowerCase();
    const ok = txt.includes(needle);
    e.style.display = ok ? '' : 'none';
    if (ok){
      hits++;
      markHits(e, needle);
    }
  });
  S.hits = hits;
  const sub = $('chapterSub');
  if (hits===0){
    sub.innerHTML = `No matches for \u201c${esc(q)}\u201d in ${esc(S.book.name)} ${S.chapter}.`;
  } else {
    sub.innerHTML = `${hits} matching passage${hits>1?'s':''} for \u201c${esc(q)}\u201d in ${esc(S.book.name)} ${S.chapter}.`;
  }
}
function markHits(el, needle){
  el.querySelectorAll('.com-text p').forEach(p=>{
    const txt = p.textContent;
    if (!txt.toLowerCase().includes(needle)) return;
    const parts = txt.split(new RegExp('('+needle.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','i'));
    p.innerHTML = parts.map(part=>part.toLowerCase()===needle ? `<mark>${esc(part)}</mark>` : esc(part)).join('');
  });
}

/* toolbar wiring (event delegation style) */
function wireToolbar(){
  const cs = $('chSel'), ps = $('passSel');
  cs.onchange = ()=>{ S.chapter = +cs.value; stopTTS(); renderReader(); scrollTopAnim(0); };
  ps.onchange = ()=>{
    const v = ps.value;
    if (v.startsWith('i')){ scrollToEntry('entry-intro'); }
    else if (v.startsWith('e')){ const idx=+v.slice(1); scrollToEntry(`.entry:not(.entry-intro)`, idx); }
  };
  $('chPrev').onclick = ()=>{ S.chapter--; stopTTS(); renderReader(); scrollTopAnim(0); };
  $('chNext').onclick = ()=>{ S.chapter++; stopTTS(); renderReader(); scrollTopAnim(0); };
  $('readChBtn').onclick = ()=>startTTSFrom(0);
}
function scrollToEntry(sel, idx=0){
  const els = document.querySelectorAll('#content '+sel);
  if (els[idx]){ els[idx].scrollIntoView({behavior:'smooth', block:'start'}); }
}

/* ================= SEARCH ================= */
function bindSearch(){
  const box = $('searchBox');
  box.addEventListener('input', ()=>{
    const q = box.value.trim();
    if (!S.book || !S.bookData){ S.query = q||null; return; }
    if (q.length < 2 && S.query){ S.query=null; renderReader(); return; }
    S.query = q.length>=2 ? q : null;
    renderReader();
  });
  box.addEventListener('keydown', e=>{
    if (e.key==='Escape'){ box.value=''; S.query=null; renderReader(); }
  });
}
function enterSearchMode(){
  $('searchBox').classList.remove('hide');
  $('searchBox').focus();
}

/* ================= TTS wiring ================= */
function readableEntries(){
  return Array.from(document.querySelectorAll('#content .entry')).filter(e=>e.dataset.hastext==='1');
}
function startTTSFrom(i){
  const els = readableEntries();
  if (!els.length){ toast('No readable text in this chapter.'); return; }
  const queue = els.map(el=>({ text: cleanTTS(el.querySelector('.com-text').innerText), el }));
  TTS.setQueue(queue);
  TTS.startFrom(i);
  $('ttsBar').classList.remove('dim');
  setStatus('Speaking');
}
function stopTTS(){
  TTS.stop();
  $('ttsBar').classList.add('dim');
  setStatus('Ready');
  $('ttsProgress').style.width = '0';
}
function cleanTTS(t){
  return String(t||'')
    .replace(/[“”]/g,'"').replace(/[‘’]/g,"'")
    .replace(/[—–]/g,' - ')
    .replace(/\s+/g,' ').trim();
}
function setStatus(s){
  const el = $('ttsStatus');
  if (el) el.textContent = s;
}

function wireTTS(){
  if (!TTS.supported()){
    const bar = $('ttsBar');
    bar.querySelectorAll('button,select,input').forEach(x=>x.disabled=true);
    setStatus('TTS unsupported');
    return;
  }
  TTS.init();
  TTS.attachHandlers({
    onActive(el, i, total){
      el.scrollIntoView({ behavior:'smooth', block:'center' });
      setStatus(`Reading ${i+1}/${total}`);
      $('ttsProgress').style.width = ((i+1)/total*100) + '%';
    },
    onEndAll(){
      $('ttsBar').classList.add('dim');
      setStatus('Finished');
      toast('Finished reading '+S.book.name+' '+S.chapter+'.');
    },
    onState(type){
      if (type==='speaking') setStatus('Speaking');
      else if (type==='paused') setStatus('Paused');
      else if (type==='idle'){ $('ttsBar').classList.add('dim'); setStatus('Ready'); }
    }
  });
  $('ttsPlay').addEventListener('click', ()=>{
    if (TTS.speaking){ TTS.skip(1); }
    else startTTSFrom(0);
  });
  $('ttsPause').addEventListener('click', ()=>TTS.togglePause());
  $('ttsStop').addEventListener('click', ()=>stopTTS());
}

/* ================= EXPORT ================= */
function wireExport(){
  $('ttsExport').addEventListener('click', ()=>{
    if (!S.book){ toast('Open a commentary first.'); return; }
    const chd = chapterEntries(S.chapter);
    const lines = [];
    lines.push(`${S.commentary.author} - ${S.commentary.title}`);
    lines.push(`${S.book.name} ${S.chapter} (public domain)`);
    lines.push(new Date().toISOString().slice(0,10));
    lines.push('='.repeat(48));
    chd.intro.forEach(e=>{ lines.push(''); lines.push(`INTRODUCTION`); lines.push(e.commentary_text||''); });
    chd.entries.forEach(e=>{
      lines.push(''); lines.push(`${verseLabel(e)}${e.verse_text?'\n'+e.verse_text:''}`);
      lines.push(e.commentary_text||'');
      if (e.cross_references&&e.cross_references.length) lines.push('Refs: '+e.cross_references.join(', '));
    });
    const blob = new Blob([lines.join('\n')], {type:'text/plain;charset=utf-8'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${S.book.name}-${S.chapter}-${S.commentary.id}.txt`;
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href), 4000);
    toast('Chapter exported as text.');
  });
}

/* ================= SETTINGS ================= */
function buildSettings(){
  const body = $('settingsBody');
  const th = ['dark','light','sepia'];
  body.innerHTML = `
    <div class="set-row"><div class="lbl">Theme<div class="sub">Tint of the reading surface</div></div>
      <div class="theme-chips">${th.map(t=>`<button class="theme-chip th-${t}${S.settings.theme===t?' active':''}" data-th="${t}" title="${t} theme" aria-label="${t} theme"></button>`).join('')}</div></div>
    <div class="set-row"><div class="lbl">Font<div class="sub">Body type for commentary text</div></div>
      <select class="sel" id="setFont">
        <option value="serif">Serif (book)</option>
        <option value="sans">Sans (screen)</option>
      </select></div>
    <div class="set-row"><div class="lbl">Text size<div class="sub">Base font size, rem</div></div>
      <input type="range" id="setSize" min="0.9" max="1.4" step="0.04" value="${S.settings.size}"></div>
    <div class="set-row"><div class="lbl">Line height<div class="sub">Vertical spacing between lines</div></div>
      <input type="range" id="setLh" min="1.4" max="2.2" step="0.05" value="${S.settings.lh}"></div>`;
  body.querySelectorAll('.theme-chip').forEach(b=>b.addEventListener('click',()=>{
    S.settings.theme = b.dataset.th;
    body.querySelectorAll('.theme-chip').forEach(x=>x.classList.toggle('active',x===b));
    applySettings();
  }));
  $('setFont').value = S.settings.font;
  $('setFont').addEventListener('change', e=>{ S.settings.font=e.target.value; applySettings(); });
  $('setSize').addEventListener('input', e=>{ S.settings.size=+e.target.value; applySettings(); });
  $('setLh').addEventListener('input', e=>{ S.settings.lh=+e.target.value; applySettings(); });
}
function applySettings(){
  const s = S.settings;
  document.body.classList.remove('theme-dark','theme-light','theme-sepia','font-sans');
  document.body.classList.add('theme-'+s.theme);
  if (s.font==='sans') document.body.classList.add('font-sans');
  document.documentElement.style.setProperty('--fs-body', s.size+'rem');
  document.documentElement.style.setProperty('--lh', s.lh);
  try { localStorage.setItem('bc-settings', JSON.stringify(s)); } catch(e){}
}

/* ================= ABOUT ================= */
function buildAbout(){
  $('aboutBody').innerHTML = `
    <h4>What is this?</h4>
    <p>A study library of <span class="pd">public-domain Christian writing</span> about Scripture and the church \u2014 commentaries on the Bible from the Reformation to the Victorian age, the Catholic Douay tradition and the Eastern Fathers, and the great early-church histories. Every note here can be <b>read aloud</b> with your browser\u2019s built-in text-to-speech voices (no account, no internet required once loaded).</p>
    <h4>Public domain as of 2025</h4>
    <p>Everything in the library is free of copyright in the United States as of 2025 \u2014 either published before 1930 (long-expired terms) or bearing expired renewal; the European rule of author\u2019s death + 70 years also places nearly all of it beyond copyright worldwide. No permission is needed to read, copy, or study any of these texts.</p>
    <h4>Sources &amp; license</h4>
    <p>Text is drawn from public-domain datasets, each explicitly licensed for reuse:</p>
    <ul>
      <li><a href="https://github.com/OpenChristianData/open-christian-data" target="_blank" rel="noopener">Open Christian Data</a> (CC0) \u2014 the commentaries, the scripture-linked Church Fathers (Theophylact, Chrysostom), and the church histories (Eusebius, Socrates, Sozomen, Schaff)</li>
      <li>Matthew Henry (1706), John Gill (1748), John Wesley (1765), Adam Clarke (1831), Albert Barnes (1834), John Calvin, Jamieson\u2013Fausset\u2013Brown (1871), Keil &amp; Delitzsch (1878), Spurgeon\u2019s <i>Treasury of David</i> (1870), Lightfoot (1875), A. T. Robertson (1930)</li>
      <li><a href="https://github.com/ronaldoscotti/catholic-bible" target="_blank" rel="noopener">catholic-bible</a> (public domain) \u2014 George Leo Haydock\u2019s Catholic commentary on the whole Bible, deuterocanon included</li>
      <li><a href="https://github.com/AlvaroBalbin/catena" target="_blank" rel="noopener">Catena Aurea dataset</a> (public domain) \u2014 St. Thomas Aquinas on the four Gospels, trans. J. H. Newman (1841\u201345)</li>
    </ul>
    <p>Companion verse quotations use the Berean Standard Bible (CC0). All original works predate current copyright and are in the <span class="pd">public domain</span>.</p>
    <h4>Privacy</h4>
    <p>No trackers, no accounts, no analytics. Loading a work requires fetching its public dataset from GitHub raw / jsDelivr CDN; afterwards, read it offline from your browser\u2019s local cache.</p>
    <h4>Text-to-speech</h4>
    <p>Voice selection uses your system\u2019s installed <b>speechSynthesis</b> voices. On Windows you likely have natural neural voices (e.g. \u201cMicrosoft Guy Natural\u201d) \u2014 pick one in the player above for the best result.</p>`;
}

/* ================= OVERLAYS / boot ================= */
function wireOverlays(){
  $('settingsBtn').addEventListener('click', ()=>{ buildSettings(); $('settingsOverlay').classList.add('open'); });
  $('aboutBtn').addEventListener('click', ()=>{ buildAbout(); $('aboutOverlay').classList.add('open'); });
  document.querySelectorAll('.xbtn').forEach(b=>{
    b.addEventListener('click', ()=>$(b.dataset.close).classList.remove('open'));
  });
  document.querySelectorAll('.overlay').forEach(ov=>{
    ov.addEventListener('click', e=>{ if (e.target===ov) ov.classList.remove('open'); });
  });
  document.addEventListener('keydown', e=>{ if (e.key==='Escape') document.querySelectorAll('.overlay.open').forEach(o=>o.classList.remove('open')); });
}

function wireKeyboard(){
  document.addEventListener('keydown', e=>{
    const inInput = /INPUT|SELECT|TEXTAREA/.test(e.target.tagName) || e.target.isContentEditable;
    if (e.key==='f' && !inInput && S.book){ e.preventDefault(); enterSearchMode(); return; }
    if (inInput) return;
    const overlayOpen = document.querySelector('.overlay.open');
    if (overlayOpen) return;
    if (e.key === ' '){ e.preventDefault(); if (TTS.speaking || !TTS.paused) TTS.togglePause(); return; }
  });
}

/* parse OSIS-style ref into canonical book name */
function refBookName(osis){
  const map = {
    Gen:'Genesis', Exod:'Exodus', Lev:'Leviticus', Num:'Numbers', Deut:'Deuteronomy', Josh:'Joshua',
    Judg:'Judges', Ruth:'Ruth', '1Sam':'1 Samuel', '2Sam':'2 Samuel', '1Kgs':'1 Kings', '2Kgs':'2 Kings',
    '1Chr':'1 Chronicles', '2Chr':'2 Chronicles', Ezra:'Ezra', Neh:'Nehemiah', Esth:'Esther', Job:'Job',
    Ps:'Psalms', Prov:'Proverbs', Eccl:'Ecclesiastes', Song:'Song of Solomon', Isa:'Isaiah', Jer:'Jeremiah',
    Lam:'Lamentations', Ezek:'Ezekiel', Dan:'Daniel', Hos:'Hosea', Joel:'Joel', Amos:'Amos', Obad:'Obadiah',
    Jonah:'Jonah', Mic:'Micah', Nah:'Nahum', Hab:'Habakkuk', Zeph:'Zephaniah', Hag:'Haggai', Zech:'Zechariah',
    Mal:'Malachi', Matt:'Matthew', Mark:'Mark', Luke:'Luke', John:'John', Acts:'Acts', Rom:'Romans',
    '1Cor':'1 Corinthians', '2Cor':'2 Corinthians', Gal:'Galatians', Eph:'Ephesians', Phil:'Philippians',
    Col:'Colossians', '1Thess':'1 Thessalonians', '2Thess':'2 Thessalonians', '1Tim':'1 Timothy',
    '2Tim':'2 Timothy', Titus:'Titus', Phlm:'Philemon', Heb:'Hebrews', Jas:'James', '1Pet':'1 Peter',
    '2Pet':'2 Peter', '1John':'1 John', '2John':'2 John', '3John':'3 John', Jude:'Jude', Rev:'Revelation'
  };
  return map[osis] || null;
}

/* ---------------- boot ---------------- */
function boot(){
  try {
    const saved = JSON.parse(localStorage.getItem('bc-settings')||'null');
    if (saved && saved.theme) Object.assign(S.settings, saved);
  } catch(e){}
  wireOverlays();
  wireTTS();
  wireExport();
  wireKeyboard();
  bindSearch();
  applySettings();
  renderLibrary();

  $('homeBtn').addEventListener('click', renderLibrary);
  $('homeBtn').addEventListener('keydown', e=>{ if(e.key==='Enter') renderLibrary(); });

  /* keyboard shortcuts inside reader are attached here because the toolbar
     is re-rendered; global handlers live in wireKeyboard */
  document.addEventListener('keydown', e=>{
    if (!S.book || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
    if (e.key==='ArrowLeft' && S.chapter>1){ S.chapter--; stopTTS(); renderReader(); scrollTopAnim(0); }
    else if (e.key==='ArrowRight' && S.chapter<chapterCount()){ S.chapter++; stopTTS(); renderReader(); scrollTopAnim(0); }
  });
}

document.addEventListener('DOMContentLoaded', boot);