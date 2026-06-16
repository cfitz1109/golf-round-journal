# Golf Round Journal

Installable mobile web app for capturing post-round stats, swing feels, and practice notes.

## What It Does Now

- Saves rounds and practice sessions in browser local storage on each device.
- Tracks score, front/back, fairways, GIR, putts, penalties, and strokes gained categories.
- Stores lightweight post-round thoughts: swing feels, what worked, leaks, and practice priority.
- Supports optional hole-level CSV input for future home-course and par-category analysis.
- Shows a mobile-first latest-round recall view, basic trends, generated insights, and drilldowns.
- Backs up/restores JSON so the data is not trapped in one browser.
- Installs to an iPhone home screen as a Progressive Web App when served over HTTPS.

## Running Locally

```bash
python3 -m http.server 5173
```

Then open:

```text
http://127.0.0.1:5173
```

Use the `Demo` button to load generic sample data. Real round and practice data should be added manually or restored from a private backup JSON.

## Phone Setup

Recommended hosting path:

1. Push only the app source files to a public GitHub repo.
2. Enable GitHub Pages from the `main` branch root.
3. Open the GitHub Pages URL on iPhone Safari.
4. Use Share -> Add to Home Screen.
5. Use Backup on the original device and Restore on the phone to move private data.

Data is stored locally per browser/device. Back up periodically to iCloud Drive, Files, or another durable location.

## Hole Detail Format

Paste one row per hole:

```csv
hole,par,score,fw,gir,putts,penalties
1,4,4,yes,yes,2,0
2,3,3,,yes,2,0
3,4,7,no,no,1,1
```

Fairway and GIR accept values like `yes`, `no`, `hit`, `miss`, `true`, and `false`.

## Next Phase

- Add image/OCR-assisted extraction from 18Birdies screenshots.
- Add editable saved rounds instead of append-only entries.
- Add richer strokes gained trend charts by rolling window.
- Add course-specific hole pages once more rounds are logged.
- Add optional private cloud sync if manual backup/restore becomes too much friction.
