# exercisedb — Build Report (Batch 21)

Rebuild of the YMove Exercise MCP server (npm `ymove-exercise-mcp`,
registry record `app.ymove/exercise-api`) from the firsthand spec in
`specs-batch21/exercisedb.md`. Built 2026-10-27.

## Identity

- npm: `@reneturcios/exercisedb` @ 0.1.0, bin `exercisedb` → `dist/cli.js`
- MCP Registry name: `io.github.CloudCorpRecords/exercisedb`
  (matches `package.json` `mcpName`, `server.json` `name`, and
  the Dockerfile `io.modelcontextprotocol.server.name` label)
- server.json description (86 chars, verified):
  "YMove exercise video API: search exercises, generate workouts
  and multi-week programs."
- server.json: npm package entry carries `"version": "0.1.0"`;
  the OCI entry (`ghcr.io/cloudcorprecords/exercisedb:0.1.0`)
  carries **no** `version` field.

## Files (19-file factory set, per TEMPLATE.md §2)

package.json, server.json, Dockerfile, tsconfig.json
(byte-identical to builds/swissreg/tsconfig.json, verified
with `cmp`), .gitignore, package-lock.json, README.md (fresh
prose), LICENSE (MIT, © 2026 Rene Turcios), CHANGELOG.md
(single 0.1.0 entry dated 2026-10-27), src/index.ts,
src/cli.ts, src/mcp.ts, src/types.ts, src/exercisedb.ts
(core), test/exercisedb.test.ts, and the four workflows under
.github/workflows/ (publish-container adapted:
IMAGE ghcr.io/cloudcorprecords/exercisedb, smoke assertion on
server name `exercisedb`). Plus this BUILD-REPORT.md.

## Implementation

- `src/mcp.ts`: low-level `Server` API
  (`sdk/server/index.js` + `StdioServerTransport`), explicit
  JSON-schema literals for all 6 tools (search_exercises,
  get_exercise, generate_workout, generate_program,
  list_muscle_groups, list_exercise_types); no McpServer/zod.
  Tool descriptions are the fixture's descriptions; input
  schemas deep-equal the fixture's, including the
  `muscleGroup` `anyOf` shape on generate_workout and
  `required` present only where non-empty.
- `src/exercisedb.ts`: base URL
  `https://exercise-api.ymove.app/api/v2`; every request is a
  GET carrying header `X-API-Key` from env `YMOVE_API_KEY`,
  and a missing key fails with `YMOVE_API_KEY is not set`
  before any request. Upstream JSON is returned as text,
  passed through unchanged; a non-2xx response fails with
  `upstream error: HTTP <status> from ymove-api` and a
  throwing fetch with `upstream unreachable: ymove-api`.
  Optional arguments are sent only when provided, values are
  URL-encoded via `URLSearchParams`, and arrays are sent as
  repeated query params. Validation runs before any request
  with the pinned sentences `<tool>: missing required
  argument: <name>` and `<tool>: argument <name> has the
  wrong type`; generate_workout's `muscleGroup` accepts a
  single string and wraps it into a one-element array. The 6
  wires: `GET /exercises`, `GET /exercises/<id>`,
  `GET /workouts/generate`, `GET /programs/generate`,
  `GET /exercises/muscle-groups`,
  `GET /exercises/exercise-types`. The REST-only params
  (`hasVideoWhite`, `hasVideoGym`, `videoTag`,
  `includeVideos`, `excludeVideos`) are not exposed.
  Upstream access goes through an injectable fetch.
- CLI: one subcommand per tool taking a JSON argument
  string, `mcp`, `--version`; unknown subcommand → usage on
  stderr, exit 2; runtime (isError) failures exit 1
  (verified: a keyless `list_muscle_groups` call prints
  `error: YMOVE_API_KEY is not set` and exits 1).

## Verification (all real, run 2026-10-27)

- `npm run build` (tsc): exit 0. `npx tsc --noEmit`: exit 0.
- `npm test`: **22 tests, 22 pass, 0 fail** — fake fetch and
  fake env only, no live call. Covers API-key gating (no key
  → pinned message, zero requests made; key sent as the
  `X-API-Key` header), upstream JSON passed through
  unchanged, query construction for search (only provided
  params, URL-encoding), get_exercise wire and its
  missing/wrong-type sentences, generate_workout's
  repeated array params and the muscleGroup string wrap,
  generate_program's wire, both list wires, non-2xx and
  throwing-fetch error mapping, and validation running
  before any request.
- `node dist/cli.js --version`: `0.1.0`; unknown command:
  usage on stderr, exit 2.
- Parity: `python3 harness/parity.py --original
  harness/fixtures/ymove-exercise-mcp-tools-original.json
  --rebuild "stdio:node builds/exercisedb/dist/cli.js mcp"
  --out builds/exercisedb/parity-out` →
  **verdict=PASS parity_pct=100.0, 6/6 tools identical,
  no schema diffs**.
- Lockfile: Route 3 only — clean temp dir with package.json
  alone, `npm install --package-lock-only --ignore-scripts
  --offline`; parses, name `@reneturcios/exercisedb`,
  **128 package entries**. Dependencies installed in the
  build dir with `npm install --offline --ignore-scripts`
  (exit 0, no proxy fallback needed).

## Gap notes / deviations (spec's gaps, verbatim)

- MCP argument names are the wrapped REST API's documented
  parameter names (OpenAPI, read firsthand); the npm README
  pins the six tools and their filter semantics but does not
  print the MCP schemas themselves, so the name mirroring is
  a documented reconstruction.
- Documented API behaviour not reproduced as logic: video
  URLs expire after 48 hours (an upstream property; the
  rebuild passes responses through and stores nothing).
- No live call was made; behaviour is proven against fake
  fetch only.
- server.json description (86 chars, measured): "YMove
  exercise video API: search exercises, generate workouts
  and multi-week programs."
- No push, no publish.
