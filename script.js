// ╔══════════════════════════════════════════════════════════════════╗
// ║                                                                  ║
// ║                    ⭐ DAGNY'S WORDS  ⭐                         ║
// ║                   Sight Word Flash Card App                      ║
// ║                     (c) 2026 CR Chapman                          ║
// ║                                                                  ║
// ║   Features:                                                      ║
// ║   • Randomised sight word flashcards                             ║
// ║   • Dyslexia-friendly font selection                             ║
// ║   • Text-to-speech read aloud                                    ║
// ║   • Letter-by-letter phonetic spelling                           ║
// ║   • Load word lists from .txt files                              ║
// ║   • Settings persisted in localStorage                           ║
// ║                                                                  ║
// ║   Keyboard shortcuts:                                            ║
// ║   SPACE / → — next word                                          ║
// ║   ←         — previous word                                      ║
// ║   R         — reshuffle deck                                     ║
// ║   S         — replay speech                                      ║
// ║                                                                  ║
// ╚══════════════════════════════════════════════════════════════════╝

// ── Word lists ────────────────────────────────────────────────────────────────
let DEFAULTS = [];

async function fetchDefaults() {
  try {
    const res = await fetch('defaults.txt');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    return parseWords(text);
  } catch(e) {
    console.warn('Could not load defaults.txt:', e);
    return ['there','is','no','default','words','text','file','please','replace','it'];
  }
}

function parseWords(raw) {
  return raw.split(/[\n,]+/).map(w => w.trim()).filter(Boolean);
}

// ── Phonetic maps ─────────────────────────────────────────────────────────────
const PHONETIC = { a:'eigh', e:'ee', i:'eye', o:'owe', u:'you', y:'why', j:'jay', z:'zed' };

const WORD_PHONETICS = {
  'the':     'thah',
  'a':       'uh',
  'are':     'ahre',
  'an':      'anne',
  'were':    'wur',
  'where':   'wair',
  'there':   'there',
  'their':   'there',
  'here':    'heer',
  'have':    'have',
  'come':    'kuhm',
  'some':    'sum',
  'said':    'sed',
  'been':    'bin',
  'does':    'duz',
  'done':    'dun',
  'once':    'wons',
  'one':     'one',
  'two':     'too',
  'would':   'wood',
  'could':   'kood',
  'should':  'shood',
  'your':    'yore',
  'who':     'hoo',
  'because': 'bee-cuz',
  'will':    'wil',
};

// ── Global state ──────────────────────────────────────────────────────────────
let autoSpeak  = false;
let autoSpell  = false;
let voices     = [];
let chosenVoice = null;
let currentWordListName = '';
let words   = [...DEFAULTS];
let deck    = [];
let idx     = 0;
let capsMode = 'off';

// ── Voice loading ─────────────────────────────────────────────────────────────
function loadVoices() {
  const sel = document.getElementById('voiceSel');
  if (!sel) return;
  const all = speechSynthesis.getVoices();
  voices = all.filter(v => v.lang.startsWith('en'));
  sel.innerHTML = '<option value="">Default</option>';
  voices.forEach((v, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = `${v.name} (${v.lang})`;
    sel.appendChild(opt);
  });
  try {
    const s = JSON.parse(localStorage.getItem('dagny-settings'));
    if (s && s.voiceIdx !== '' && s.voiceIdx !== null && s.voiceIdx !== undefined) {
      sel.value = s.voiceIdx;
      chosenVoice = voices[parseInt(s.voiceIdx)] || null;
    }
  } catch(e) {}
}

loadVoices();
if (speechSynthesis.onvoiceschanged !== undefined) {
  speechSynthesis.onvoiceschanged = loadVoices;
}

function applyVoice() {
  const idx = document.getElementById('voiceSel').value;
  chosenVoice = idx === '' ? null : voices[parseInt(idx)];
  saveSettings();
}

// ── Speech UI state ───────────────────────────────────────────────────────────
// Single source of truth for all speech/spell button and panel visibility state.
// Call this whenever autoSpeak or autoSpell changes.
function setSpeechUI(speak, spell) {
  const speechBtn  = document.getElementById('speechToggle');
  const spellBtn   = document.getElementById('spellToggle');
  const replayBtn  = document.getElementById('replayBtn');
  const speechPane = document.getElementById('speechSettings');

  // ── Read Aloud button
  speechBtn.textContent = speak ? '🔊 Read Aloud: On' : '🔇 Read Aloud: Off';
  speechBtn.classList.toggle('active', speak);

  // ── Speech settings panel and replay button
  speechPane.classList.toggle('visible', speak);
  replayBtn.classList.toggle('visible', speak);

  // ── Spell It button — only shown when Read Aloud is on
  spellBtn.style.display = speak ? '' : 'none';
  spellBtn.textContent   = (speak && spell) ? '🔤 Spell It: On' : '🔤 Spell It: Off';
  spellBtn.classList.toggle('active', speak && spell);
}

// ── Speech controls ───────────────────────────────────────────────────────────
function toggleSpeech() {
  autoSpeak = !autoSpeak;
  if (!autoSpeak) autoSpell = false; // spell requires speech
  setSpeechUI(autoSpeak, autoSpell);
  if (autoSpeak) speakWord(deck[idx]);
  else speechSynthesis.cancel();
  saveSettings();
}

function toggleSpell() {
  autoSpell = !autoSpell;
  setSpeechUI(autoSpeak, autoSpell);
  if (autoSpeak) speakWord(deck[idx]);
  saveSettings();
}

function updateSpeedLabel() {
  const v = parseFloat(document.getElementById('speedSel').value).toFixed(2);
  document.getElementById('speedVal').textContent = `${v}×`;
  saveSettings();
}

function updateSpellSpeedLabel() {
  const v = parseFloat(document.getElementById('spellSpeedSel').value).toFixed(2);
  document.getElementById('spellSpeedVal').textContent = `${v}×`;
  saveSettings();
}

function speakWord(word) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();

  const rate               = parseFloat(document.getElementById('speedSel').value);
  const spellSpeedMultiplier = parseFloat(document.getElementById('spellSpeedSel').value);
  const spoken             = WORD_PHONETICS[word.toLowerCase()] || word.toLowerCase();

  function makeUtt(text, r, pitch) {
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate  = r;
    utt.pitch = pitch;
    if (chosenVoice) utt.voice = chosenVoice;
    return utt;
  }

  speechSynthesis.speak(makeUtt(spoken, rate, 1.1));

  if (autoSpell) {
    speechSynthesis.speak(makeUtt('.', rate, 1.0));
    word.toLowerCase().replace(/[^a-z]/g, '').split('').forEach(letter => {
      speechSynthesis.speak(makeUtt(PHONETIC[letter] || letter, Math.max(rate * spellSpeedMultiplier, 0.5), 1.0));
    });
    // Repeat the word at the end for reinforcement
    speechSynthesis.speak(makeUtt(spoken, rate, 1.1));
  }
}

// ── Deck and display ──────────────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatWord(word) {
  switch (capsMode) {
    case 'first':  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    case 'all':    return word.toUpperCase();
    case 'random': return Math.random() > 0.5
                     ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                     : word.toLowerCase();
    default:       return word === 'I' ? 'I' : word.toLowerCase();
  }
}

function buildDots() {
  const c = document.getElementById('dots');
  c.innerHTML = '';
  deck.forEach((_, i) => {
    const d = document.createElement('div');
    d.className = 'dot' + (i < idx ? ' seen' : i === idx ? ' now' : '');
    c.appendChild(d);
  });
}

function showWord() {
  const el = document.getElementById('wordEl');
  el.classList.add('out');
  setTimeout(() => {
    el.textContent = formatWord(deck[idx]);
    el.classList.remove('out');
    document.getElementById('countBadge').textContent = `${idx + 1} / ${deck.length}`;
    buildDots();
    if (autoSpeak) speakWord(deck[idx]);
  }, 120);
}

function next() {
  if (idx < deck.length - 1) idx++;
  else idx = 0;
  showWord();
}

function prev() {
  if (idx > 0) idx--;
  else idx = deck.length - 1;
  showWord();
}

function reshuffle() {
  const limit = document.getElementById('sessionSel').value;
  const count = limit === 'all' ? words.length : parseInt(limit);
  deck = shuffle(words).slice(0, count);
  idx  = 0;
  showWord();
}

function updateSession() {
  saveSettings();
  reshuffle();
}

// ── Font ──────────────────────────────────────────────────────────────────────
const FONT_NOTES = {
  'OpenDyslexic':  '★ Weighted bottoms reduce letter-flipping',
  'Atkinson':      'Designed for low-vision readers',
  'Lexend':        'Engineered to reduce visual stress',
  'Nunito':        'Rounded, friendly letterforms',
  'Merriweather':  'Strong serif — high contrast strokes',
  'Courier Prime': 'Fixed-width — each letter takes equal space',
  'Comic Sans MS': 'Asymmetric letterforms — familiar for assessment',
  'Arial':         'Standard sans-serif baseline',
  'Baloo 2':       'Playful display font',
};

function applyFont() {
  const sel  = document.getElementById('fontSel');
  const opt  = sel.options[sel.selectedIndex];
  const css  = opt.getAttribute('data-css');
  const name = opt.value;
  const size = document.getElementById('sizeSel').value;

  document.getElementById('wordEl').style.fontFamily = css;
  document.getElementById('wordEl').style.fontSize   = size + 'px';
  document.getElementById('sizeVal').textContent      = size + 'px';
  document.getElementById('fontBadge').textContent    = name;
  document.getElementById('fontNote').textContent     = FONT_NOTES[name] || '';
  saveSettings();
}

function updateCaps() {
  capsMode = document.getElementById('capsSel').value;
  document.getElementById('wordEl').textContent = formatWord(deck[idx]);
  saveSettings();
}

// ── Panel and editor ──────────────────────────────────────────────────────────
function togglePanel() {
  document.getElementById('controlPanel').classList.toggle('collapsed');
}

function toggleEditor() {
  const sec = document.getElementById('editorSection');
  const open = sec.classList.toggle('open');
  document.getElementById('editToggle').textContent = open ? '✕ Close' : '✏️ Edit Words';
  if (open) document.getElementById('wordArea').value = words.join('\n');
}

function saveWords() {
  const raw    = document.getElementById('wordArea').value;
  const parsed = parseWords(raw);
  if (!parsed.length) return;
  words = parsed;
  saveSettings();
  updateWordListLabel();
  reshuffle();
  toggleEditor();
}

function restoreDefaults() {
  words = [...DEFAULTS];
  currentWordListName = '';
  saveSettings();
  updateWordListLabel();
  reshuffle();
  toggleEditor();
}

function updateWordListLabel() {
  const el = document.getElementById('wordListLabel');
  if (!el) return;
  el.textContent = currentWordListName ? `📂 ${currentWordListName}` : '';
}

// ── Settings persistence ──────────────────────────────────────────────────────
function saveSettings() {
  let existingVoiceIdx = '';
  if (voices.length === 0) {
    try {
      existingVoiceIdx = JSON.parse(localStorage.getItem('dagny-settings'))?.voiceIdx ?? '';
    } catch(e) {}
  }

  const settings = {
    font:         document.getElementById('fontSel').value,
    fontSize:     document.getElementById('sizeSel').value,
    session:      document.getElementById('sessionSel').value,
    caps:         document.getElementById('capsSel').value,
    speed:        document.getElementById('speedSel').value,
    spellSpeed:   document.getElementById('spellSpeedSel').value,
    voiceIdx:     voices.length > 0 ? document.getElementById('voiceSel').value : existingVoiceIdx,
    autoSpeak,
    autoSpell,
    wordList:     [...words],
    wordListName: currentWordListName,
  };
  localStorage.setItem('dagny-settings', JSON.stringify(settings));
}

function loadSettings() {
  let s;
  try { s = JSON.parse(localStorage.getItem('dagny-settings')); } catch(e) {}
  if (!s) return null;
  if (s.font)       document.getElementById('fontSel').value       = s.font;
  if (s.fontSize)   document.getElementById('sizeSel').value       = s.fontSize;
  if (s.session)    document.getElementById('sessionSel').value    = s.session;
  if (s.caps)       document.getElementById('capsSel').value       = s.caps;
  if (s.speed)      document.getElementById('speedSel').value      = s.speed;
  if (s.spellSpeed) document.getElementById('spellSpeedSel').value = s.spellSpeed;
  return s;
}

// ── File loading ──────────────────────────────────────────────────────────────
function loadFromFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  currentWordListName = file.name;

  const reader = new FileReader();
  reader.onload = function(e) {
    const parsed = parseWords(e.target.result);
    if (parsed.length > 0) {
      document.getElementById('wordArea').value = parsed.join('\n');
      event.target.value = '';
    } else {
      alert("We couldn't find any words in that file!");
    }
  };
  reader.readAsText(file);
}

// ── Keyboard shortcuts ────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (document.activeElement.tagName === 'TEXTAREA') return;
  if (e.code === 'Space' || e.code === 'ArrowRight') { e.preventDefault(); next(); }
  if (e.code === 'ArrowLeft')  { e.preventDefault(); prev(); }
  if (e.code === 'KeyR')       { e.preventDefault(); reshuffle(); }
  if (e.code === 'KeyS')       { e.preventDefault(); if (autoSpeak) speakWord(deck[idx]); }
});

// ── Init helpers ──────────────────────────────────────────────────────────────
function restoreWordList(saved) {
  if (saved?.wordList?.length) {
    words = saved.wordList;
    currentWordListName = saved.wordListName || '';
  }
  updateWordListLabel();
}

function restoreSpeechState(saved) {
  autoSpeak = saved ? saved.autoSpeak !== false : true;
  autoSpell = saved ? saved.autoSpell === true  : false;
  setSpeechUI(autoSpeak, autoSpell);
}

function buildDeck() {
  const limit = document.getElementById('sessionSel').value;
  const count = limit === 'all' ? words.length : parseInt(limit);
  deck = shuffle(words).slice(0, count);
  idx  = 0;
}

function updateLabels() {
  document.getElementById('wordEl').textContent      = formatWord(deck[0]);
  document.getElementById('countBadge').textContent  = `1 / ${deck.length}`;
  document.getElementById('speedVal').textContent    =
    parseFloat(document.getElementById('speedSel').value).toFixed(2) + '×';
  document.getElementById('spellSpeedVal').textContent =
    parseFloat(document.getElementById('spellSpeedSel').value).toFixed(2) + '×';
}

// ── Entry point ───────────────────────────────────────────────────────────────
async function init() {
  DEFAULTS      = await fetchDefaults();
  words         = [...DEFAULTS];

  const saved   = loadSettings();
  capsMode      = document.getElementById('capsSel').value;

  restoreWordList(saved);
  restoreSpeechState(saved);
  buildDeck();
  updateLabels();
  buildDots();
  applyFont();
  speakWord(deck[0]);
}

init();