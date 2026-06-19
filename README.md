# Golf Round Journal

Read-only GitHub Pages dashboard for golf round statistics.

The live dashboard reads committed CSV files from `data/rounds.csv` and `data/holes.csv`.
It does not write data, use localStorage, or register a service worker. Round and hole data
are produced by the Codex + Obsidian workflow, then copied here unchanged.

Live site:

```text
https://cfitz1109.github.io/golf-round-journal/
```

## Data Source

The app expects these files:

```text
data/rounds.csv
data/holes.csv
```

The Obsidian vault copies use the exact same schema and should stay byte-identical after
each publish:

```text
/Users/colinfitzgerald/Documents/Synced Vault/04 Wikis/Golf/Data/rounds.csv
/Users/colinfitzgerald/Documents/Synced Vault/04 Wikis/Golf/Data/holes.csv
```

There is no transform step between Obsidian and this repo. Publishing is a plain file copy
from the vault to `data/`, then validation, commit, and push.

## Canonical `rounds.csv` Schema

```csv
date,course,tees,holes,nine,score,front_9,back_9,sg_total,sg_t2g,sg_ott,sg_app,sg_wedge,sg_arg,sg_sand,sg_putting,gir,fairways,putts,penalties,summary
```

Rules:

- `date`: ISO `YYYY-MM-DD`.
- `course`: exact canonical string. Falmouth is always exactly `Falmouth Country Club`.
- `holes`: `9` or `18`.
- `nine`: `front`, `back`, or blank. Blank for 18-hole rounds.
- `gir` and `fairways`: `made/total` strings such as `9/18` and `6/14`. Blank if unknown.
- `sg_*`: signed decimals or blank if unavailable. Never write `N/A`.
- `score`, `front_9`, `back_9`, `putts`, and `penalties`: integers or blank where not applicable.
- `summary`: one short dashboard-facing line. Full thoughts live in the Obsidian round note.

## Canonical `holes.csv` Schema

```csv
date,course,tees,round_score,hole,par,score,to_par,fairway,gir,putts,penalties
```

Rules:

- `date`, `course`, and `tees` must exactly match the parent round row.
- The join key is `date + course + tees`.
- `hole`, `par`, `score`, `putts`, and `penalties`: integers.
- `to_par`: integer or blank. The dashboard can derive it.
- `fairway`: `TRUE`, `FALSE`, or blank. Blank means not applicable. Par-3 fairways must be blank.
- `gir`: `TRUE` or `FALSE`.
- Never use old `Y/N` values.

If two rounds are played at the same course and tees on the same date, make the `tees`
values distinct, for example `Blue (R1)` and `Blue (R2)`, so the join key stays unique.

## Round-Add Workflow

For every new scored round:

1. Create the narrative round note in Obsidian.
2. Append one row to the vault `rounds.csv` using the canonical dashboard schema above.
3. Append one row per scored hole to the vault `holes.csv` using the canonical dashboard schema above.
4. Copy the vault CSVs directly into this repo:

   ```bash
   cp "/Users/colinfitzgerald/Documents/Synced Vault/04 Wikis/Golf/Data/rounds.csv" data/rounds.csv
   cp "/Users/colinfitzgerald/Documents/Synced Vault/04 Wikis/Golf/Data/holes.csv" data/holes.csv
   ```

5. Validate:

   ```bash
   node scripts/validate-dashboard-csvs.js
   ```

6. If validation passes, commit and push:

   ```bash
   git add data/rounds.csv data/holes.csv
   git commit -m "Add latest golf round data"
   git push
   ```

If validation fails, report the failures and do not push.

## Validation Checks

`scripts/validate-dashboard-csvs.js` enforces:

- Exact canonical headers.
- No orphan hole rows.
- Every round has exactly `holes` hole rows.
- No duplicate `date + course + tees` round keys.
- `fairway` and `gir` values are only `TRUE`, `FALSE`, or blank.
- Par-3 fairways are blank.
- Numeric columns do not contain non-numeric text.
- 18-hole rounds have blank `nine`.
- Falmouth course names use `Falmouth Country Club`.

Historical note: the 2026-04-18 Portland backfill has only 16 available hole rows for
an 18-hole round because the original source data is incomplete. The validator warns for
pre-2026-06-19 incomplete historical rounds, but fails for newly added rounds from
2026-06-19 forward. To enforce the hole-count rule for all historical data too, run:

```bash
node scripts/validate-dashboard-csvs.js --strict
```

You can also validate arbitrary CSV paths:

```bash
node scripts/validate-dashboard-csvs.js /path/to/rounds.csv /path/to/holes.csv
```

## Running Locally

```bash
python3 -m http.server 5173
```

Then open:

```text
http://127.0.0.1:5173
```

## Notes

- `index.html`, `app.js`, and `styles.css` expect the canonical dashboard schema.
- Do not reintroduce browser writes, localStorage, or service worker registration.
- The dashboard uses cache-busted fetches for CSV reads, so new pushed data should appear on reload.
