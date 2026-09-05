# Christian Classics — Public Domain Library with TTS

A study library of **public-domain Christian classics** — the church's accumulated
teaching on Scripture **and** its early history: Protestant commentaries (Matthew
Henry, John Gill, Spurgeon, Calvin, Adam Clarke, Albert Barnes, Wesley, Ryle,
Luther, Jamieson–Fausset–Brown, Keil & Delitzsch, Lightfoot, Robertson), the
Catholic tradition (Haydock, Aquinas' *Catena Aurea*), the Church Elders on
Scripture (Augustine — the Tractates on John and Expositions on the Psalms —
Origen, Jerome, Ephrem the Syrian, Gregory the Great's *Moralia in Job*,
Gregory of Nyssa, Ambrose of Milan, the *Glossa Ordinaria*, Bede, Cyril of
Alexandria, Theodoret, Theodore of Mopsuestia, Cassiodorus, Didymus the Blind,
Chrysostom, Theophylact of Ohrid, Oecumenius, Ambrosiaster, Hilary, Andrew of
Caesarea, Victorinus, Primasius, Apringius, Diodore, Severian, Pseudo-Chrysostom),
and the great church histories (Eusebius, Socrates, Sozomen, Schaff) — with a
built-in **text-to-speech** player so every page can be read aloud.

> This is a library of *classic Christian writing*, not the text of scripture.
> All works are **public domain — free of copyright as of 2025** (US: published
> before 1930). No copyright, no accounts, no trackers.

## Features

- **48 works** across traditions: Protestant · Catholic · Orthodox · Church Elders ·
  Church history, covering the whole Bible (deuterocanon included) plus multi-volume histories
- **Library / book / chapter / passage** navigation with nearby-note cross-reference panel
- **Built-in TTS** (Web Speech API): play, pause/resume, stop, per-note **Read** buttons,
  voice/speed/pitch selection, live passage highlighting, and listen-as-you-read
- **Search** within the current book (press `F`), with match highlighting
- **Read-aloud from anytime** — click ▶ on any note to start there
- **Offline support**: books and book lists are cached in IndexedDB after first load
- **Settings**: dark / light / sepia themes, serif or sans type, text size, line height
- **Keyboard shortcuts**: `Space` ↔ play/pause, `←`/`→` chapter, `F` search, `Esc` close
- **Export** any chapter to a plain-text file (⤓ Text in the player)
- Accessibility: keyboard navigation, focus outlines, ARIA labels, high-contrast themes

## Run

No build step. Serve the folder statically and open index.html:

```bash
cd bible-commentaries
python -m http.server 8080     # or: npx serve .
# open http://localhost:8080
```

You can also open `index.html` directly from disk; only the dataset fetch needs
network (and that is cached afterward for offline reading).

**Recommended voices:** Windows ships natural neural voices (e.g. *Microsoft Ava
Natural*, *Guy Natural*). Pick one in the player for the best listening experience.

## Data & licensing

- Commentaries & church histories: [Open Christian Data](https://github.com/OpenChristianData/open-christian-data)
  project — CC0 / Public Domain Mark, digitised from classic pre-1930 editions.
- Haydock Catholic Commentary: the [catholic-bible](https://github.com/ronaldoscotti/catholic-bible)
  dataset (public domain), served from jsDelivr CDN.
- Catena Aurea (Aquinas, tr. Newman): the [catena dataset](https://github.com/AlvaroBalbin/catena) (public domain).
- Companion verse quotations: Berean Standard Bible (CC0).
- TTS: your browser's built-in `speechSynthesis` voices; no external service.

## Project layout

```
index.html        app shell
styles.css        all styling + themes
js/app.js         navigation, rendering, search, settings, keyboard
js/data.js        work/book metadata, provider dispatch, IndexedDB cache, fetching
js/tts.js         Web Speech API engine
```

## Thank-you note

This project is a small dedication of study to the many faithful commentators and
church historians — Henry, Gill, Wesley, Clarke, Barnes, Calvin, Spurgeon, Ryle,
Luther, Lightfoot, Robertson, Haydock, Aquinas, Augustine, Origen, Jerome, Ephrem,
Bede, Cyril, Theodoret, Theodore, Cassiodorus, Didymus, Gregory the Great,
Gregory of Nyssa, Ambrose, Chrysostom, Theophylact, Oecumenius, Ambrosiaster,
Hilary, Andrew, Victorinus, Primasius, Apringius, Diodore, Severian, the
medieval Glossators, Eusebius, Socrates, Sozomen, and Schaff — whose
public-domain labors continue to teach the church.
*Soli Deo Gloria.*