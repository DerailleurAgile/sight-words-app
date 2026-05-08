# ⭐ Dagny's Words ⭐
### Sight Word Flash Card App
*(c) 2026 CR Chapman*

A dyslexia-friendly sight word flashcard app with text-to-speech, phonetic spelling, and customisable word lists.

**[▶ Try it live](https://derailleuragile.github.io/sight-words-app/)**

---

## Running Locally

Because the app loads its default word list from an external file (`defaults.txt`), it must be served over HTTP — it cannot simply be opened as a file in your browser. Browsers block this kind of local file access by default for security reasons (the same rule that prevents websites from reading files on your computer).

The easiest way to run it is with Python's built-in HTTP server:

1. Open a terminal and navigate to your project folder:
   ```bash
   cd path/to/dagny-words
   ```

2. Start the server:
   ```bash
   python -m http.server 8000
   ```

3. Open your browser and go to:
   ```
   http://localhost:8000
   ```

To stop the server, press `Ctrl+C` in the terminal.

> **Note:** Python 3 is required. Check your version with `python --version`. On some systems you may need to use `python3` instead of `python`.

---

## Features

- **Randomised flashcards** — words are shuffled into a fresh deck each session
- **Dyslexia-friendly fonts** — choose from OpenDyslexic, Atkinson Hyperlegible, Lexend, and more
- **Read Aloud** — text-to-speech reads each word as it appears
- **Spell It** — after reading the word, each letter is sounded out individually
- **Phonetic pronunciation** — common irregular words are pronounced as they sound (e.g. "the" → "thuh")
- **Custom word lists** — load any `.txt` file of words, one per line
- **Persistent settings** — font, speed, voice, and word list are remembered across sessions

---

## Using the App

### Navigation
| Key | Action |
|---|---|
| `Space` or `→` | Next word |
| `←` | Previous word |
| `R` | Reshuffle deck |
| `S` | Replay speech for current word |

You can also use the on-screen **‹** and **›** buttons.

### Read Aloud
Click **🔊 Read Aloud** to toggle text-to-speech on or off. When on, the current word is spoken automatically each time a new card appears.

Use the **Voice** dropdown to choose a voice and the **Speed** slider to adjust reading pace.

### Spell It
Click **🔤 Spell It** to have each letter sounded out after the word is read. Only available when Read Aloud is on.

### Session Size
Use the **Words per session** dropdown to control how many words are drawn from the list per shuffle. Useful for shorter focused practice runs.

### Font & Size
Use the **Font** and **Size** controls to find the most comfortable display for your reader. Each font includes a note about its design intent.

---

## Word Lists

### Default List
The app loads its built-in word list from `defaults.txt` in the project folder — one word per line. You can edit this file directly to change the default set.

### Custom Word Lists
1. Click **✏️ Edit Words** to open the word editor
2. Either type words directly (one per line) or click **📂 Load from file** to import a `.txt` file
3. Click **Save** to apply your changes

Your custom list is remembered across sessions. To go back to the default list, click **↩ Restore Defaults** inside the editor.

---

## Project Files

```
dagny-words/
├── index.html       # App structure and UI
├── script.js        # App logic
├── styles.css       # Styling
└── defaults.txt     # Default word list (one word per line)
```