/**
 * TechBrief TTS — ปุ่ม "ฟังข่าวนี้" สำหรับ Detail View
 * ใช้ Web Speech API (ฟรี, ไม่ต้อง API Key)
 */
(function(){

/* ───────── CSS ───────── */
var css = document.createElement('style');
css.textContent = `
.tts-bar{display:flex;align-items:center;gap:12px;margin:20px 0 10px;padding:14px 18px;
  background:#f0efeb;border:1px solid #e0dfd8;border-radius:8px}
.tts-btn{display:inline-flex;align-items:center;gap:8px;padding:8px 18px;
  background:#c8230e;color:#fff;border:none;border-radius:6px;cursor:pointer;
  font-family:var(--sans,'Sarabun',sans-serif);font-size:13.5px;font-weight:700;
  transition:background .2s,transform .1s}
.tts-btn:hover{background:#a01d0b;transform:scale(1.02)}
.tts-btn:active{transform:scale(0.98)}
.tts-btn.playing{background:#1a5aaa}
.tts-btn.paused{background:#e8a020;color:#0f0f0e}
.tts-icon{font-size:16px}
.tts-speed{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:#4a4a47;
  font-family:var(--sans,'Sarabun',sans-serif)}
.tts-speed select{padding:4px 8px;border:1px solid #ccc;border-radius:4px;font-size:12px;
  font-family:inherit;background:#fff;cursor:pointer}
.tts-progress{flex:1;height:4px;background:#e0dfd8;border-radius:2px;overflow:hidden;min-width:60px}
.tts-progress-bar{height:100%;background:#c8230e;border-radius:2px;width:0%;transition:width .3s}
.tts-time{font-size:11px;color:#4a4a47;font-family:var(--sans,'Sarabun',sans-serif);min-width:40px;text-align:right}
.tts-note{font-size:11px;color:rgba(0,0,0,.35);margin-top:6px}
`;
document.head.appendChild(css);

/* ───────── STATE ───────── */
var synth = window.speechSynthesis;
var utterance = null;
var isPlaying = false;
var isPaused = false;
var chunks = [];
var currentChunk = 0;
var totalChunks = 0;

/* ───────── HELPERS ───────── */
function getArticleText(){
  var inner = document.querySelector('.detail-inner');
  if(!inner) return '';
  var headline = inner.querySelector('.detail-headline');
  var sections = inner.querySelectorAll('.detail-section p');
  var text = '';
  if(headline) text += headline.textContent + '。 ';
  sections.forEach(function(p){ text += p.textContent + ' '; });
  return text.trim();
}

// Split text into chunks (speechSynthesis has ~200 char limit on some browsers)
function splitText(text, maxLen){
  var result = [];
  // Split by sentences first
  var sentences = text.split(/(?<=[。\.\!\?])\s*/);
  var current = '';
  sentences.forEach(function(s){
    if((current + s).length > maxLen && current.length > 0){
      result.push(current.trim());
      current = s + ' ';
    } else {
      current += s + ' ';
    }
  });
  if(current.trim()) result.push(current.trim());
  return result;
}

function getThaiVoice(){
  var voices = synth.getVoices();
  // Prefer Thai voice
  var thai = voices.filter(function(v){ return v.lang.startsWith('th'); });
  if(thai.length > 0) return thai[0];
  // Fallback to any available
  return voices[0] || null;
}

/* ───────── PLAYBACK ───────── */
function speakChunk(idx, rate){
  if(idx >= chunks.length){
    stopSpeaking();
    updateUI('stopped');
    return;
  }
  currentChunk = idx;
  utterance = new SpeechSynthesisUtterance(chunks[idx]);
  var voice = getThaiVoice();
  if(voice) utterance.voice = voice;
  utterance.lang = 'th-TH';
  utterance.rate = rate || 1;
  utterance.pitch = 1;

  utterance.onend = function(){
    currentChunk++;
    updateProgress();
    if(isPlaying && !isPaused){
      speakChunk(currentChunk, rate);
    }
  };

  utterance.onerror = function(){
    currentChunk++;
    if(isPlaying) speakChunk(currentChunk, rate);
  };

  synth.speak(utterance);
  updateProgress();
}

function startSpeaking(){
  var text = getArticleText();
  if(!text) return;

  synth.cancel();
  var speedSel = document.getElementById('tts-speed');
  var rate = speedSel ? parseFloat(speedSel.value) : 1;

  chunks = splitText(text, 180);
  totalChunks = chunks.length;
  currentChunk = 0;
  isPlaying = true;
  isPaused = false;

  speakChunk(0, rate);
  updateUI('playing');
}

function pauseSpeaking(){
  if(synth.speaking){
    synth.pause();
    isPaused = true;
    updateUI('paused');
  }
}

function resumeSpeaking(){
  if(isPaused){
    synth.resume();
    isPaused = false;
    updateUI('playing');
  }
}

function stopSpeaking(){
  synth.cancel();
  isPlaying = false;
  isPaused = false;
  currentChunk = 0;
  updateUI('stopped');
}

/* ───────── UI ───────── */
function updateUI(state){
  var btn = document.getElementById('tts-btn');
  if(!btn) return;
  if(state === 'playing'){
    btn.className = 'tts-btn playing';
    btn.innerHTML = '<span class="tts-icon">⏸</span> หยุดชั่วคราว';
  } else if(state === 'paused'){
    btn.className = 'tts-btn paused';
    btn.innerHTML = '<span class="tts-icon">▶</span> ฟังต่อ';
  } else {
    btn.className = 'tts-btn';
    btn.innerHTML = '<span class="tts-icon">🔊</span> ฟังข่าวนี้';
    // Reset progress
    var bar = document.getElementById('tts-progress-bar');
    if(bar) bar.style.width = '0%';
    var time = document.getElementById('tts-time');
    if(time) time.textContent = '';
  }
}

function updateProgress(){
  var bar = document.getElementById('tts-progress-bar');
  if(bar && totalChunks > 0){
    var pct = Math.round((currentChunk / totalChunks) * 100);
    bar.style.width = pct + '%';
  }
  var time = document.getElementById('tts-time');
  if(time && totalChunks > 0){
    time.textContent = currentChunk + '/' + totalChunks;
  }
}

function handleClick(){
  if(!isPlaying){
    startSpeaking();
  } else if(isPaused){
    resumeSpeaking();
  } else {
    pauseSpeaking();
  }
}

function handleStop(){
  stopSpeaking();
}

/* ───────── INJECT TTS BAR ───────── */
function injectTTSBar(){
  // Remove existing bar if any
  var existing = document.getElementById('tts-bar');
  if(existing) existing.remove();

  var detailInner = document.querySelector('.detail-inner');
  if(!detailInner) return;

  // Find the hero SVG and insert after it
  var heroSvg = detailInner.querySelector('.detail-hero-svg');
  var insertAfter = heroSvg || detailInner.querySelector('.detail-headline');
  if(!insertAfter) return;

  var bar = document.createElement('div');
  bar.id = 'tts-bar';
  bar.className = 'tts-bar';
  bar.innerHTML =
    '<button id="tts-btn" class="tts-btn" onclick="window.__ttsClick()"><span class="tts-icon">🔊</span> ฟังข่าวนี้</button>' +
    '<button class="tts-btn" style="background:#4a4a47;padding:8px 12px" onclick="window.__ttsStop()"><span class="tts-icon">⏹</span></button>' +
    '<div class="tts-speed"><label>ความเร็ว</label>' +
      '<select id="tts-speed" onchange="window.__ttsSpeedChange()">' +
        '<option value="0.7">0.7x ช้า</option>' +
        '<option value="0.85">0.85x</option>' +
        '<option value="1" selected>1x ปกติ</option>' +
        '<option value="1.2">1.2x</option>' +
        '<option value="1.5">1.5x เร็ว</option>' +
      '</select>' +
    '</div>' +
    '<div class="tts-progress"><div id="tts-progress-bar" class="tts-progress-bar"></div></div>' +
    '<span id="tts-time" class="tts-time"></span>';

  insertAfter.parentNode.insertBefore(bar, insertAfter.nextSibling);
}

/* ───────── GLOBAL HANDLERS ───────── */
window.__ttsClick = handleClick;
window.__ttsStop = handleStop;
window.__ttsSpeedChange = function(){
  if(isPlaying){
    var rate = parseFloat(document.getElementById('tts-speed').value);
    synth.cancel();
    isPaused = false;
    speakChunk(currentChunk, rate);
  }
};

/* ───────── HOOK INTO showDetail ───────── */
var origShow = window.showDetail;
if(origShow){
  window.showDetail = function(id){
    // Stop any playing audio
    stopSpeaking();
    origShow(id);
    setTimeout(injectTTSBar, 100);
  };
}

// Also stop when going back
var origIndex = window.showIndex;
if(origIndex){
  window.showIndex = function(){
    stopSpeaking();
    origIndex();
  };
}

// Load voices (needed for some browsers)
if(synth.onvoiceschanged !== undefined){
  synth.onvoiceschanged = function(){};
}

})();
