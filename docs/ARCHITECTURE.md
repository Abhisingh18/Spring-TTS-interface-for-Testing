# Architecture

Speech Evaluation Studio (SES) is a research platform for designing listening
studies, running human and automatic evaluation, and tracing every result back to
the exact artefacts that produced it.

This document is the map for the migration from the existing listening-studio
prototype to that platform. It describes where the code is going and — just as
importantly — what already works and is being kept.

## Layers

```
 Browser  ──►  App Router pages & server actions      src/app, src/features
                      │
                      ▼
               API / route handlers                   src/app/api/v1
                      │
                      ▼
               Service layer (business rules)         src/services
                      │
                      ▼
               Repositories (Prisma)                  src/server/db
                      │
                      ▼
               PostgreSQL
```

Anything slow or CPU-bound leaves the request:

```
 API ──► Redis / BullMQ ──► worker ──► FFmpeg ──► object storage
                                          │
                                          ▼
                                    Prisma metadata update
```

Rules that hold across every layer:

- **Authorisation is a server concern.** Hiding a button is presentation; the
  permission check lives in the service layer and runs on every call.
- **The client never names a file.** It addresses an asset id; the server
  resolves it to a bucket and key.
- **Audio bytes never enter Postgres.** Only metadata, checksums and keys.
- **Nothing that has been published is edited in place.** Changes fork a version.

## Directory layout

| Path | Holds |
| --- | --- |
| `src/app` | Routes, layouts, route handlers |
| `src/features/*` | Feature-scoped UI (evaluation, experiments, models, …) |
| `src/components` | Shared presentational components |
| `src/services` | Business rules — the only place that decides anything |
| `src/server` | Prisma client, repositories, auth, storage and audio adapters |
| `src/lib` | Pure helpers with no I/O |
| `src/config` | Branding and runtime configuration |
| `src/types` | Shared types that cross layer boundaries |
| `prisma` | Schema, migrations, seed |
| `workers` | BullMQ processors |
| `docs` | This document and its siblings |

## What the prototype already provides

The prototype is roughly 7 700 lines across 15 routes. It is not scaffolding to
be thrown away — several parts are the production implementation already.

| Prototype | Status | Becomes |
| --- | --- | --- |
| `api/audio/[...clip]/route.ts` | **Keep as-is** — range requests, 206, ETag/304, traversal guard, all verified | `api/v1/audio/assets/[assetId]`, resolving the id through the storage adapter instead of a path |
| `components/Waveform.tsx` | **Keep** the canvas renderer, gradient fill, hover scrub, playhead | Peaks arrive precomputed from the server instead of being decoded per browser |
| `lib/peaks.ts` | **Demote** to a fallback | Server-side peak extraction in the audio worker |
| `components/ClipPlayer.tsx` | **Keep** | `features/audio/AudioPlayer` |
| `store/player.ts` | **Keep** — already a non-reactive transport registry with solo and keep-position | The global audio transport |
| `store/ratings.ts` | **Keep** the optimistic-local-then-sync pattern | Offline-resilient rating queue |
| `components/BlindTest.tsx` | **Refactor** — randomisation currently runs in the browser | Server-side seeded randomisation, session + trial records |
| `lib/results.ts` | **Move** | `services/analytics` |
| `lib/session.ts` | **Replace** | Auth.js, with the name-only flow kept as a guest-evaluator provider |
| `lib/storage/*` | **Supersede** | Prisma; the JSON file driver stays as a no-setup dev fallback |
| `lib/bundle.ts` | **Repurpose** | The portable-bundle importer that seeds a project, experiment, models and samples |
| `components/PairWorkbench.tsx` | **Generalise** | Pair-of-two becomes N models per trial |
| Keyboard map, command palette, print report | **Keep** | Unchanged |

## Gaps the migration has to close

These are the places where the prototype knowingly disagrees with the target
architecture. Listing them is the point of this phase.

1. **Blind randomisation is client-side.** `BlindTest.tsx` shuffles in the
   browser, so the order is neither reproducible nor secret. Must move behind
   the API with a seed stored on the session.
2. **Identity is filename-derived.** `Clip.id` is `folder/basename`. Everything
   becomes a cuid with the filename kept only as metadata.
3. **Criteria are hard-coded.** Naturalness and speaker similarity are literals
   in the rating store. They become rows in a versioned rubric.
4. **No authentication or roles.** A signed name cookie is not RBAC.
5. **No audio processing pipeline.** Metadata comes from the bundle JSON rather
   than from ffprobe, and there is no validation, duplicate detection or
   background processing.
6. **Peaks are decoded in the browser** on every visit.
7. **Everything is single-experiment.** There is no project, experiment, dataset
   or model-version concept yet.

## Deployment shape

One box to start: Next.js, workers, Postgres, Redis and MinIO side by side.
Nothing in the code assumes co-location — the database, queue, storage and
workers are each reached through a URL or an adapter, so they can be split onto
separate hosts without code changes.
