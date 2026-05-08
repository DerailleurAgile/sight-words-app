// ── Word list, utilities, render, navigation, font functions, etc.
const DEFAULTS = [
  "the","this","here","looks","said","have","come","some","there","they",
  "where","were","what","who","would","could","should","want","like",
  "little","pretty","very","once","upon","your","their","again","around",
  "because","before","every","found","goes","know","made","many","only",
  "right","show","those","through","together","which","write","always","two","one",
  "a", "and", "I", "is", "it", "to", "for", "you", "that", "was", "are", "be", "with", 
  "his", "he", "as", "at", "on", "but", "had", "not", "she", "can", "do", "we", "when", 
  "an", "if", "up", "so"
];

let autoSpeak  = false;
let autoSpell  = false;
let voices     = [];
let chosenVoice = null;

// ── Speech ────────────────────────────────────────────────────────────────────
function loadVoices() {
  const sel = document.getElementById('voiceSel');
  if (!sel) return;
  const all = speechSynthesis.getVoices();
  sel.innerHTML = '<option value="">Default</option>';
  voices.forEach((v, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = `${v.name} (${v.lang})`;
    sel.appendChild(opt);
  });
}

loadVoices();
if (speechSynthesis.onvoiceschanged !== undefined) {
  speechSynthesis.onvoiceschanged = loadVoices;
}

function applyVoice() {
  const idx = document.getElementById('voiceSel').value;
  chosenVoice = idx === '' ? null : voices[parseInt(idx)];
}

function updateSpeedLabel() {
  const v = parseFloat(document.getElementById('speedSel').value).toFixed(2);
  document.getElementById('speedVal').textContent = `${v}×`;
}

function speakWord(word) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();

  const rate = parseFloat(document.getElementById('speedSel').value);
  const PHONETIC = { a:'ate', e:'ee', i:'eye', o:'owe', u:'you', y:'why', j:'jate', z:'zed' };

  function makeUtt(text, r, pitch) {
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate  = r;
    utt.pitch = pitch;
    if (chosenVoice) utt.voice = chosenVoice;
    return utt;
  }

  // Queue the whole word first
  speechSynthesis.speak(makeUtt(word.toLowerCase(), rate, 1.1));

  if (autoSpell) {
    // Brief pause then each letter — all queued upfront, no onend chaining needed
    speechSynthesis.speak(makeUtt('.', rate, 1.0));
    word.toLowerCase().replace(/[^a-z]/g, '').split('').forEach(letter => {
      speechSynthesis.speak(makeUtt(PHONETIC[letter] || letter, Math.max(rate * 1.35, 0.5), 1.0));
    });
  }
}

function toggleSpell() {
  autoSpell = !autoSpell;
  const btn = document.getElementById('spellToggle');
  btn.textContent = autoSpell ? '🔤 Spell It: On' : '🔤 Spell It: Off';
  btn.classList.toggle('active', autoSpell);
  if (autoSpeak) speakWord(deck[idx]);
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
}

let words      = [...DEFAULTS];
let deck       = [];
let idx        = 0;
let randomCaps = false;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatWord(word) {
  if (randomCaps && Math.random() > 0.5) {
    return word.charAt(0).toUpperCase() + word.slice(1);
  }
  if (word === 'I') return "I";
  return word.toLowerCase();
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
}

function updateCaps() {
  randomCaps = document.getElementById('capsSel').value === 'random';
  const el = document.getElementById('wordEl');
  el.textContent = formatWord(deck[idx]);
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
  reshuffle();
  toggleEditor();
}

// ── NEW: LOAD FROM FILE LOGIC ───────────────────────────────────────────────
function loadFromFile(event) {
  const file = event.target.files[0];
  if (!file) return;

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

function init() {
  const limit = document.getElementById('sessionSel').value;
  const count = limit === 'all' ? words.length : parseInt(limit);
  deck = shuffle(words).slice(0, count);
  idx  = 0;
  document.getElementById('wordEl').textContent     = formatWord(deck[0]);
  document.getElementById('countBadge').textContent = `1 / ${deck.length}`;
  document.getElementById('speedVal').textContent   = '1.00×';
  buildDots();
  applyFont();

  // Start with Read Aloud on
  autoSpeak = true;
  document.getElementById('speechToggle').textContent = '🔊 Read Aloud: On';
  document.getElementById('speechToggle').classList.add('active');
  document.getElementById('speechSettings').classList.add('visible');
  document.getElementById('replayBtn').classList.add('visible');

  // Start with Spell It on
  autoSpell = true;
  const spellBtn = document.getElementById('spellToggle');
  spellBtn.style.display = '';
  spellBtn.textContent = '🔤 Spell It: On';
  spellBtn.classList.add('active');

  speakWord(deck[0]);
}

init();