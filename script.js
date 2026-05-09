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

// ── Word list ─────────────────────────────────────────────────────────────────
// const DEFAULTS = [
//   "the","this","here","looks","said","have","come","some","there","they",
//   "where","were","what","who","would","could","should","want","like",
//   "little","pretty","very","once","upon","your","their","again","around",
//   "because","before","every","found","goes","know","made","many","only",
//   "right","show","those","through","together","which","write","always","two","one",
//   "a", "and", "I", "is", "it", "to", "for", "you", "that", "was", "are", "be", "with", 
//   "his", "he", "as", "at", "on", "but", "had", "not", "she", "can", "do", "we", "when", 
//   "an", "if", "up", "so"
// ];

let DEFAULTS = [];
async function fetchDefaults() {
  try {
    const res = await fetch('defaults.txt');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    return text.split(/[\n,]+/).map(w => w.trim()).filter(Boolean);
  } catch(e) {
    console.warn('Could not load defaults.txt:', e);
    return ['there','is','no','default', 'words', 'text','file','please','replace','it']; // minimal fallback
  }
}

const WORD_PHONETICS = {
  'the':    'thah',
  'a':      'uh',
  'are':    'ahre',
  'an':     'anne',
  'were':   'wur',
  'where':  'wair',
  'there':  'there',
  'their':  'there',
  'here':   'heer',
  'have':   'have',
  'come':   'kuhm',
  'some':   'sum',
  'said':   'sed',
  'been':   'bin',
  'does':   'duz',
  'done':   'dun',
  'once':   'wons',
  'one':    'one',
  'two':    'too',
  'would':  'wood',
  'could':  'kood',
  'should': 'shood',
  'your':   'yore',
  'who':    'hoo',
  'because': 'bee-cuz',
  'will':    'wil',
};

// ── Global Variables ──────────────────────────────────────────────────────────
let autoSpeak  = false;
let autoSpell  = false;
let voices     = [];
let chosenVoice = null;
let currentWordListName = '';
const spellSpeedMultiplier = parseFloat(document.getElementById('spellSpeedSel').value);

// ── Speech ────────────────────────────────────────────────────────────────────
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
  // Restore saved voice after dropdown is populated
  try {
    const s = JSON.parse(localStorage.getItem('dagny-settings'));

    console.log('s:', s);
    console.log('voiceIdx raw value:', s?.voiceIdx, '| type:', typeof s?.voiceIdx);

    if (s && s.voiceIdx !== '' && s.voiceIdx !== null && s.voiceIdx !== undefined) {
      console.log('Restoring saved voice index:', s.voiceIdx);
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

  const rate   = parseFloat(document.getElementById('speedSel').value);
  const spoken = WORD_PHONETICS[word.toLowerCase()] || word.toLowerCase(); // ← phonetic sub
  const PHONETIC = { a:'eigh', e:'ee', i:'eye', o:'owe', u:'you', y:'why', j:'jay', z:'zed' };

  function makeUtt(text, r, pitch) {
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate  = r;
    utt.pitch = pitch;
    if (chosenVoice) utt.voice = chosenVoice;
    return utt;
  }

  speechSynthesis.speak(makeUtt(spoken, rate, 1.1)); // ← uses phonetic form

  if (autoSpell) {
    speechSynthesis.speak(makeUtt('.', rate, 1.0));
    word.toLowerCase().replace(/[^a-z]/g, '').split('').forEach(letter => { // ← original word
      speechSynthesis.speak(makeUtt(PHONETIC[letter] || letter, Math.max(rate * spellSpeedMultiplier, 0.5), 1.0));
    });

    // Repeat the word at the end of the spelling for reinforcement
    speechSynthesis.speak(makeUtt(spoken, rate, 1.1));   
  }
}

function toggleSpell() {
  autoSpell = !autoSpell;
  const btn = document.getElementById('spellToggle');
  btn.textContent = autoSpell ? '🔤 Spell It: On' : '🔤 Spell It: Off';
  btn.classList.toggle('active', autoSpell);
  if (autoSpeak) speakWord(deck[idx]);
  saveSettings();
}

function toggleSpeech() {
  autoSpeak = !autoSpeak;
  const btn = document.getElementById('speechToggle');
  btn.textContent = autoSpeak ? '🔊 Read Aloud: On' : '🔇 Read Aloud: Off';
  btn.classList.toggle('active', autoSpeak);
  document.getElementById('speechSettings').classList.toggle('visible', autoSpeak);
  document.getElementById('replayBtn').classList.toggle('visible', autoSpeak);
  const spellBtn = document.getElementById('spellToggle');
  spellBtn.style.display = autoSpeak ? '' : 'none';
  if (!autoSpeak) {
    autoSpell = false;
    spellBtn.textContent = '🔤 Spell It: Off';
    spellBtn.classList.remove('active');
  }
  if (autoSpeak) speakWord(deck[idx]);
  else speechSynthesis.cancel();
  saveSettings();
}

let words      = [...DEFAULTS];
let deck       = [];
let idx        = 0;
let capsMode = 'off'

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
  const raw = document.getElementById('wordArea').value;
  const parsed = raw.split(/[\n,]+/).map(w => w.trim()).filter(Boolean);
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
  document.getElementById('wordArea').value = words.join('\n');
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
    font:      document.getElementById('fontSel').value,
    fontSize:  document.getElementById('sizeSel').value,
    session:   document.getElementById('sessionSel').value,
    caps:      document.getElementById('capsSel').value,
    speed:     document.getElementById('speedSel').value,
    voiceIdx:  voices.length > 0 ? document.getElementById('voiceSel').value : existingVoiceIdx,
    autoSpeak,
    autoSpell,
    wordList:     [...words], // Store the current word list in settings for persistence
    wordListName: currentWordListName, // Store the name of the currently loaded word list
    spellSpeed: document.getElementById('spellSpeedSel').value,
  };
  localStorage.setItem('dagny-settings', JSON.stringify(settings));
  console.log('Saved settings:', settings);
}

function loadSettings() {
  let s;
  try { s = JSON.parse(localStorage.getItem('dagny-settings')); } catch(e) {}
  if (!s) return null;
  if (s.font)     document.getElementById('fontSel').value     = s.font;
  if (s.fontSize) document.getElementById('sizeSel').value     = s.fontSize;
  if (s.session)  document.getElementById('sessionSel').value  = s.session;
  if (s.caps)     document.getElementById('capsSel').value     = s.caps;
  if (s.speed)    document.getElementById('speedSel').value    = s.speed;
  if (s.spellSpeed) document.getElementById('spellSpeedSel').value = s.spellSpeed;
  // if (s.voiceIdx) document.getElementById('voiceSel').value    = s.voiceIdx;

  console.log('Loaded settings:', s);

  return s;
}

// ── LOAD FROM FILE LOGIC ──────────────────────────────────────────────────────
function loadFromFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  currentWordListName = file.name; // NEW! Store the name of the currently loaded word list

  const reader = new FileReader();
  reader.onload = function(e) {
    const content = e.target.result;
    // Splits by newline or commas, then cleans it up
    const parsed = content.split(/[\n,]+/).map(w => w.trim()).filter(Boolean);
    
    if (parsed.length > 0) {
      // Put them in the textarea so user can see/edit before "Saving"
      document.getElementById('wordArea').value = parsed.join('\n');
      // Reset the file input so the same file can be uploaded again if needed
      event.target.value = '';
    } else {
      alert("We couldn't find any words in that file!");
    }
  };
  reader.readAsText(file);
}

document.addEventListener('keydown', e => {
  if (document.activeElement.tagName === 'TEXTAREA') return;
  if (e.code === 'Space' || e.code === 'ArrowRight') { e.preventDefault(); next(); }
  if (e.code === 'ArrowLeft') { e.preventDefault(); prev(); }
  if (e.code === 'KeyR') { e.preventDefault(); reshuffle(); }
  if (e.code === 'KeyS') { e.preventDefault(); if (autoSpeak) speakWord(deck[idx]); }
});

async function init() {
  
  DEFAULTS = await fetchDefaults();
  words = [...DEFAULTS];
  
  const saved = loadSettings();
  capsMode = document.getElementById('capsSel').value;
  
  if (saved?.wordList?.length) {           
    words = saved.wordList;
    currentWordListName = saved.wordListName || '';
  }
  updateWordListLabel();

  // Restore or default autoSpeak on
  const wantSpeak = saved ? saved.autoSpeak !== false : true;
  const wantSpell = saved ? saved.autoSpell === true  : true;

  if (wantSpeak) {
    autoSpeak = true;
    document.getElementById('speechToggle').textContent = '🔊 Read Aloud: On';
    document.getElementById('speechToggle').classList.add('active');
    document.getElementById('speechSettings').classList.add('visible');
    document.getElementById('replayBtn').classList.add('visible');
    const spellBtn = document.getElementById('spellToggle');
    spellBtn.style.display = '';
    if (wantSpell) {
      autoSpell = true;
      spellBtn.textContent = '🔤 Spell It: On';
      spellBtn.classList.add('active');
    }
  }

  const limit = document.getElementById('sessionSel').value;
  const count = limit === 'all' ? words.length : parseInt(limit);
  deck = shuffle(words).slice(0, count);
  idx  = 0;
  
  document.getElementById('wordEl').textContent     = formatWord(deck[0]);
  document.getElementById('countBadge').textContent = `1 / ${deck.length}`;
  document.getElementById('speedVal').textContent   =
    parseFloat(document.getElementById('speedSel').value).toFixed(2) + '×';
  document.getElementById('spellSpeedVal').textContent =
    parseFloat(document.getElementById('spellSpeedSel').value).toFixed(2) + '×';
  
  buildDots();
  applyFont();
  speakWord(deck[0]);
}

init();