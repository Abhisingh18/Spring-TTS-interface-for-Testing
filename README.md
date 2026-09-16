# Spring Lab Listening Studio

A Next.js + TypeScript listening bench for the portable voice-conversion bundle
(`portable_listening_bundle_16khz`): 10 Arabic source–target pairs × 10 models × 120 WAV clips,
all at 16 kHz.

It replaces the bundle's static `listen.html` with waveform players, keyboard-driven A/B
listening, per-model scoring, a blind test, and CSV/JSON export.

## Run it

```sh
npm install
npm run dev     # http://localhost:3000
```

Production:

```sh
npm run build
npm run start
```

## Where the audio comes from

Two modes, picked automatically by [`src/lib/bundle.ts`](src/lib/bundle.ts):

| Mode | When | How clips are served |
| --- | --- | --- |
| **Local bundle** | `BUNDLE_DIR` is set and nothing has been synced | `/api/audio/…` streams WAVs out of the bundle folder with HTTP range support — nothing is copied |
| **Vendored** | `public/audio/` exists (after `npm run sync:bundle`) | `/audio/…` as ordinary static assets, cached immutably — this is what a deployment uses |
| **External** | `NEXT_PUBLIC_AUDIO_BASE_URL` is set | that origin + the bundle path, for hosting the WAVs on a CDN or blob store |

The JSON is resolved the same way: `BUNDLE_DIR`, then the vendored `data/` folder, then a
`portable_listening_bundle_16khz` folder sitting next to the app.

## Deploying to Vercel

The app cannot read `F:\…` from a server, so the bundle has to travel with it. One command does
that:

```sh
npm run sync:bundle        # or: npm run sync:bundle -- "D:\path\to\bundle"
```

It copies the two JSON files into `data/` and all 120 WAVs into `public/audio/` (~47 MB),
skipping anything already current. Both folders are meant to be committed.

Then either:

```sh
git init && git add -A && git commit -m "Spring Lab Listening Studio"
git remote add origin <your repo> && git push -u origin main
# import the repo at vercel.com/new — no build settings to change
```

or straight from this folder:

```sh
npx vercel        # preview
npx vercel --prod
```

`BUNDLE_DIR` is absent on Vercel, so the app falls back to the vendored copies automatically. The
pair pages are prerendered at build time and the WAVs are static CDN assets, so listening never
touches a serverless function.

Two variables are worth setting there:

- **`DATABASE_URL`** — attach a Postgres database (Storage → Create in the Vercel dashboard) so
  submissions survive. Without it the app falls back to a JSON file, which a serverless
  filesystem throws away between invocations.
- **`SESSION_SECRET`** — any long random string, so session cookies cannot be forged.

Add `ADMIN_PASSCODE` too if the link is going somewhere public.

**If the deployment is too large**, host the WAVs elsewhere (Vercel Blob, S3, R2, any static
host), delete `public/audio/`, and set `NEXT_PUBLIC_AUDIO_BASE_URL` to that origin — the paths
underneath stay identical (`audio/01_MSA-MSA/seedvc.wav`).

## Pages

| Route | What it does |
| --- | --- |
| `/` | Landing page — what the study is, and the name-only sign-in |
| `/pairs` | Pair grid, model legend, bundle stats |
| `/pairs/[slug]` | The workbench: references, transcripts, 10 model players, scoring |
| `/blind-test` | Unlabelled trials drawn at random, revealed only in the summary |
| `/results` | Your own scores, coverage by pair, written feedback, CSV/JSON export |
| `/admin` | Everyone's scores: model ranking, pair matrix, participants, feedback, JSON/PDF/CSV export |
| `/data` | Provenance: checksums, resampling, sizes, every clip in one table |

## Participants and shared results

Sign-in is a name and nothing else — no password, no email. The name is stored in a signed,
http-only cookie and labels that person's scores. Scores save as you click and are mirrored to
the server, so the `/admin` page adds up across everyone taking part. Someone who has not signed
in can still listen and score; those scores stay in their browser and a banner says so.

### Where submissions are stored

| Driver | When | Notes |
| --- | --- | --- |
| **JSON file** | default | `.data/listening-sessions.json` — no setup, git-ignored, fine for a local or single-server study |
| **Postgres** | `DATABASE_URL` or `POSTGRES_URL` is set | any provider (Vercel Postgres/Neon, Supabase, Railway); tables are created on first use |

Serverless filesystems are read-only and ephemeral, so **a Vercel deployment needs the Postgres
driver**: attach a database in the Vercel dashboard and it injects the connection string — no
code change.

### Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` / `POSTGRES_URL` | switches the store to Postgres |
| `SESSION_SECRET` | signs the session cookie — set any long random string in production |
| `ADMIN_PASSCODE` | protects `/admin` and the exports; leave unset to keep them open |
| `DATA_FILE` | override the JSON store path |

### Exports

- **JSON** — one click, the full dump: participants, every score, all feedback, plus the pair and
  model reference lists.
- **CSV** — the same scores flattened, one row per participant × pair × model.
- **PDF** — `/admin/report` renders an A4 report and opens the print dialog; choose *Save as
  PDF*. This goes through the browser on purpose: it is the only route that renders Arabic,
  Devanagari and Latin names correctly in one document, which a PDF library would not.

## The workbench

- **Waveforms** — each clip is decoded once with the Web Audio API and drawn to a canvas; click
  or drag to seek.
- **Solo** — starting one clip pauses the others, so you never compare two things at once.
- **Keep position** — the next clip starts at the same moment as the one you just heard, which is
  the fastest way to A/B a specific word.
- **Hide names** — grade without seeing which model produced which clip.
- **Length drift** — each model card shows how far its duration strays from the source; over
  0.5 s is highlighted, since that usually means the content itself moved.
- **Scores** — naturalness and speaker similarity, 1–5, saved to `localStorage` under
  `vc-listening-studio.ratings`. Click the selected score again to clear it.

### Keyboard

| Key | Action |
| --- | --- |
| `1` … `0` | Play/pause model 1–10 (bundle order, unaffected by sorting) |
| `Q` / `W` | Source reference / target reference |
| `Space` | Pause or resume what is playing |
| `←` / `→` | Seek 2 s |
| `R` | Restart the playing clip |
| `L` | Loop · `K` keep position |
| `[` / `]` | Previous / next pair |
| `?` | Shortcut list |

## Layout

```
scripts/sync-bundle.mjs            vendors the bundle into data/ + public/audio/
data/                              bundle JSON, committed (created by the script)
public/audio/                      120 WAVs, committed (created by the script)
src/
  app/
    api/audio/[...clip]/route.ts   range-capable WAV streaming from BUNDLE_DIR
    pairs/[slug]/page.tsx          the workbench (statically generated per pair)
    blind-test/ results/ data/     evaluation, aggregation, provenance
  components/                      players, waveform canvas, tables, chrome
  lib/
    bundle.ts                      reads + normalises the bundle JSON (server only)
    peaks.ts                       decode + peak extraction, memoised per URL
    types.ts palette.ts format.ts results.ts
  store/
    player.ts                      transport state + non-reactive player registry
    ratings.ts                     persisted scores, blind trials, CSV export
```

Scores live only in the browser that made them — export from `/results` before switching
machines or clearing site data.
