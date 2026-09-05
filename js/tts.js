/* ============================================================
   Bible Commentaries - TTS engine
   Web Speech API wrapper: chapter queueing, per-entry highlight,
   pause/resume, voice/rate/pitch, keyboard control.
   ============================================================ */
'use strict';

const TTS = (()=>{
  const synth = window.speechSynthesis;
  let voices = [];
  let queue = [];            // [{text, el}]
  let idx = -1;              // current utterance index in queue
  let speaking = false;
  let paused = false;
  let jumpFlag = false;
  let onActive = null;       // (el, idx, total) => void
  let onEndAll = null;
  let onState = null;        // (state, label) => void

  function loadVoices(){
    const v = synth.getVoices();
    if (v && v.length){ voices = v; populateSelect(); return true; }
    return false;
  }
  function populateSelect(){
    const sel = document.getElementById('ttsVoice');
    if (!sel || !voices.length) return;
    const prev = sel.dataset.saved;
    sel.innerHTML = '';
    const en = voices.filter(x=>/^en/i.test(x.lang));
    const group = en.length ? en : voices;
    group.forEach((v,i)=>{
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = `${v.name} (${v.lang})`;
      sel.appendChild(opt);
    });
    if (prev && group[prev]) sel.value = prev;
  }

  function getVoice(){
    const sel = document.getElementById('ttsVoice');
    if (sel && sel.value!=='' && voices[+sel.value]) return voices[+sel.value];
    return null;
  }

  function say(text){
    if (!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    const v = getVoice();
    if (v) u.voice = v;
    u.lang = (v && v.lang) || 'en-US';
    u.rate  = +document.getElementById('ttsRate').value || 1;
    u.pitch = +document.getElementById('ttsPitch').value || 1;
    u.onstart = ()=>{ speaking = true; paused=false; flash(idx); emit('speaking'); };
    u.onend = ()=>{ speaking=false; advance(); };
    u.onerror = ()=>{ speaking=false; advance(); };
    u.onboundary = e=>{ if (jumpFlag) return; const p = idx>=0 ? Math.max(0,e.charIndex||0)/Math.max(1,u.text.length) : 0; emit('progress',p); };
    synth.speak(u);
  }

  function start(fromIdx){
    if (!synth || !queue.length) return;
    cancelInternal();
    idx = fromIdx;
    jumpFlag = false;
    paused = false;
    say(queue[idx].text);
  }
  function advance(){
    if (idx < 0) return;
    if (idx < queue.length-1){ idx++; say(queue[idx].text); }
    else { stopInternal(); if (onEndAll) onEndAll(); }
  }
  function pause(){
    if (!synth || !speaking || paused) return;
    try { synth.pause(); paused = true; emit('paused'); } catch(e){}
  }
  function resume(){
    if (!synth || !paused) return;
    try { synth.resume(); paused = false; emit('speaking'); } catch(e){}
  }
  function togglePause(){
    if (paused) resume(); else pause();
  }
  function cancelInternal(){
    try { synth.cancel(); } catch(e){}
    speaking=false; paused=false;
  }
  function stopInternal(){
    cancelInternal();
    const oldIdx = idx;
    idx = -1;
    clearFlash(oldIdx);
    emit('idle');
  }
  function stop(){ stopInternal(); }

  function skip(dir){
    if (!queue.length || idx<0) return;
    jumpFlag = true;
    idx = dir>0 ? Math.min(queue.length-1, idx+1) : Math.max(0, idx-1);
    jumpFlag = false;
    start(idx);
  }

  function flash(i){
    clearFlash(-1);
    queue.forEach((q,k)=>{ if (q.el) q.el.classList.toggle('active', k===i); });
    if (i>=0 && onActive && queue[i] && queue[i].el){
      onActive(queue[i].el, i, queue.length);
    }
  }
  function clearFlash(i){
    queue.forEach((q,k)=>{ if (q.el && k!==i) q.el.classList.remove('active'); });
  }

  function emit(type, extra){
    if (onState) onState(type, extra);
  }

  /* Public API */
  return {
    init(){
      if (!('speechSynthesis' in window)) return;
      loadVoices();
      if (synth.onvoiceschanged !== undefined){
        synth.onvoiceschanged = ()=>{ loadVoices(); };
      }
      const sel = document.getElementById('ttsVoice');
      if (sel) sel.addEventListener('change',()=>{ sel.dataset.saved = sel.value; });
    },
    setQueue(q){ queue = q; idx=-1; speaking=false; paused=false; clearFlash(-1); },
    startFrom(i){ start(i); },
    start(){ start(idx>=0&&idx<queue.length ? idx : 0); },
    pause, resume, togglePause, stop, skip,
    get speaking(){ return speaking; },
    get paused(){ return paused; },
    get index(){ return idx; },
    get total(){ return queue.length; },
    get hasVoices(){ return voices.length>0; },
    supported(){ return 'speechSynthesis' in window; },
    attachHandlers(h){ if (h.onActive) onActive=h.onActive; if (h.onEndAll) onEndAll=h.onEndAll; if (h.onState) onState=h.onState; }
  };
})();