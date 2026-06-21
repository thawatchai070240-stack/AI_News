/**
 * TechBrief Language Switcher
 * ปุ่มเปลี่ยนภาษา ขับเคลื่อนด้วย Google Translate (ฟรี)
 * เพิ่มภาษาใหม่: แค่เพิ่ม object ใน LANGS แล้วเพิ่มโค้ดใน includedLanguages
 */
(function(){

/* ───────── CONFIG: เพิ่มภาษาที่นี่ ───────── */
var LANGS = [
  { code:'th', label:'ไทย',     flag:'🇹🇭' },   // ต้นฉบับ
  { code:'en', label:'EN',      flag:'🇬🇧' }
  // เพิ่มทีหลังได้เลย เช่น:
  // { code:'vi', label:'VI', flag:'🇻🇳' },
  // { code:'id', label:'ID', flag:'🇮🇩' }
];
// โค้ดภาษาปลายทางที่ให้ Google โหลด (คั่นด้วย comma) — เพิ่ม vi,id ทีหลังตรงนี้
var INCLUDED = 'en';
var PAGE_LANG = 'th';

/* ───────── CSS ───────── */
var css = document.createElement('style');
css.textContent = `
/* ซ่อน UI ของ Google Translate ที่ไม่ต้องการ */
.goog-te-banner-frame{display:none!important}
.goog-te-gadget{display:none!important}
#google_translate_element{display:none!important}
body{top:0!important;position:static!important}
.goog-tooltip,.goog-tooltip:hover{display:none!important}
.goog-text-highlight{background:none!important;box-shadow:none!important}

/* ปุ่มสลับภาษาของเราเอง */
.lang-switch{position:fixed;top:10px;right:14px;z-index:10000;display:flex;gap:4px;
  background:rgba(15,15,14,.92);backdrop-filter:blur(6px);padding:4px;border-radius:8px;
  box-shadow:0 4px 16px rgba(0,0,0,.25);font-family:'Sarabun',sans-serif}
.lang-switch button{border:none;background:transparent;color:rgba(255,255,255,.55);
  font-size:12.5px;font-weight:700;padding:5px 11px;border-radius:6px;cursor:pointer;
  display:flex;align-items:center;gap:5px;transition:background .15s,color .15s;font-family:inherit}
.lang-switch button:hover{color:#fff;background:rgba(255,255,255,.1)}
.lang-switch button.lang-active{background:var(--accent,#c8230e);color:#fff}
@media(max-width:520px){.lang-switch{top:8px;right:8px}.lang-switch button{padding:5px 9px;font-size:12px}}
`;
document.head.appendChild(css);

/* ───────── Google Translate element (ซ่อนไว้) ───────── */
var gtEl = document.createElement('div');
gtEl.id = 'google_translate_element';
document.body.appendChild(gtEl);

window.googleTranslateElementInit = function(){
  new google.translate.TranslateElement({
    pageLanguage: PAGE_LANG,
    includedLanguages: INCLUDED,
    autoDisplay: false
  }, 'google_translate_element');
};

var gtScript = document.createElement('script');
gtScript.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
document.head.appendChild(gtScript);

/* ───────── อ่านภาษาปัจจุบันจาก cookie ───────── */
function currentLang(){
  var m = document.cookie.match(/googtrans=\/[a-z]+\/([a-z]+)/);
  return (m && m[1]) ? m[1] : PAGE_LANG;
}

/* ───────── ตั้งค่า cookie ภาษา ───────── */
function setCookie(name, val){
  var host = location.hostname;
  document.cookie = name + '=' + val + ';path=/';
  document.cookie = name + '=' + val + ';path=/;domain=' + host;
  // domain แบบมี dot นำหน้า (สำหรับ subdomain เช่น github.io)
  var parts = host.split('.');
  if(parts.length > 2){
    document.cookie = name + '=' + val + ';path=/;domain=.' + parts.slice(-2).join('.');
  }
}
function clearCookie(name){
  var exp = ';expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
  var host = location.hostname;
  document.cookie = name + '=' + exp;
  document.cookie = name + '=' + exp + ';domain=' + host;
  var parts = host.split('.');
  if(parts.length > 2){
    document.cookie = name + '=' + exp + ';domain=.' + parts.slice(-2).join('.');
  }
}

/* ───────── สลับภาษา ───────── */
function switchTo(code){
  if(code === PAGE_LANG){
    clearCookie('googtrans');
  } else {
    setCookie('googtrans', '/' + PAGE_LANG + '/' + code);
  }
  location.reload();
}

/* ───────── สร้างปุ่ม ───────── */
function buildSwitcher(){
  var cur = currentLang();
  var box = document.createElement('div');
  box.className = 'lang-switch notranslate';
  box.setAttribute('translate', 'no');
  LANGS.forEach(function(l){
    var btn = document.createElement('button');
    btn.innerHTML = '<span>' + l.flag + '</span>' + l.label;
    if(l.code === cur) btn.className = 'lang-active';
    btn.onclick = function(){ if(l.code !== currentLang()) switchTo(l.code); };
    box.appendChild(btn);
  });
  document.body.appendChild(box);
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', buildSwitcher);
} else {
  buildSwitcher();
}

})();
