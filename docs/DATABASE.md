# Database

PostgreSQL via Prisma. The schema is `prisma/schema.prisma`; it validates
against the stable Prisma 6 CLI (`npx prisma validate`).

## Entity map

```
User ──< UserRole >── Role ──< RolePermission >── Permission
  │
  └──< Project
         ├──< Experiment ──┬──< ExperimentModel    >── ModelVersion ──> Model
         │                 ├──< ExperimentDataset  >── DatasetVersion ──> Dataset
         │                 ├──< ExperimentEvaluator >── User
         │                 ├──> RubricVersion ──< EvaluationCriterion
         │                 └──< EvaluationSession ──< EvaluationTrial
         │                                               ├──< Rating ──> EvaluationCriterion
         │                                               ├──< Comment
         │                                               └──< Annotation
         ├──< Model   ──< ModelVersion   ──< Sample
         └──< Dataset ──< DatasetVersion ──< Sample
                                              ├──> AudioAsset (source / reference / generated)
                                              └──< MetricResult ──> MetricDefinition

ProcessingJob   AuditLog   Export   Notification   SystemSetting
```

## Invariants the schema enforces

| Rule | How |
| --- | --- |
| A model version is written once | `@@unique([modelId, version])` |
| A dataset version is written once | `@@unique([datasetId, version])` |
| The same audio is stored once | `@@unique([sha256])` on `AudioAsset` — this is what makes duplicate detection a database guarantee rather than a check that can be skipped |
| One storage object per asset | `@@unique([bucket, objectKey])` |
| One score per criterion per trial | `@@unique([trialId, criterionId])` |
| A sample appears once in a session | `@@unique([sessionId, sampleId])` |
| Trial order has no gaps or ties | `@@unique([sessionId, order])` |
| One session per evaluator per experiment | `@@unique([experimentId, evaluatorId])` |
| One metric value per sample per metric | `@@unique([sampleId, metricId])` |
| A role grant is not duplicated | `@@unique([userId, roleId, scopeId])` |

### Why `UserRole.scopeId` exists

A role is either organization-wide or scoped to a project. The obvious model is
a nullable `projectId`, but Postgres treats `NULL`s as distinct in a unique
index, so nothing would stop the same organization-wide grant being inserted
twice. `scopeId` carries the project id or the literal `"ORG"`, which makes the
uniqueness real. `projectId` remains as the actual foreign key.

## Indexes

Beyond the unique constraints, indexes cover the columns the UI filters and
sorts on: `status` and `task` on projects/experiments/models, `experimentId`,
`modelVersionId`, `datasetVersionId`, `speakerId`, `sourceLanguage`, `status`
and `createdAt` on samples, `trialId`/`criterionId` on ratings, and
`entityType + entityId` plus `timestamp` on audit logs.

## Versioning and immutability

`Model`, `Dataset` and `Rubric` are names; `ModelVersion`, `DatasetVersion` and
`RubricVersion` are the things evaluations actually reference. An experiment
points at versions, never at the parent.

`Experiment` carries `version`, `parentId` and a frozen `provenance` JSON
snapshot written at publish time. Editing a completed experiment forks a new
row rather than mutating history, so a published number still resolves to the
run that produced it.

## Migration

```sh
docker compose up -d
npx prisma migrate dev --name init
npx prisma db seed
```

Migrations are checked in. `prisma migrate deploy` runs them in production.
