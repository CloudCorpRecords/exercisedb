# exercisedb

An MCP server and CLI over the YMove exercise API, which
catalogues more than 1,400 exercises with video. Six tools
cover the everyday questions a training app or an agent asks
of that catalogue: find exercises that fit a filter, open one
exercise in full, have a workout generated for a set of
muscle groups, have a whole multi-week program generated, and
read the two vocabularies (muscle groups and exercise types)
the filters draw from, each with its exercise counts.

Whatever the API answers comes back exactly as it answered:
each tool returns a single text item carrying the upstream
JSON, unchanged. Nothing is reshaped, cached or stored, which
also means the API's own properties carry through — exercise
video URLs, for instance, are signed by the upstream service
and expire after 48 hours.

The six tools:

- `search_exercises` — filter the catalogue by free text,
  muscle group, exercise type, equipment and difficulty, keep
  only exercises that have video, and page through the
  results. Every argument is optional.
- `get_exercise` — one exercise by its ID or slug: video
  URLs, instructions and the muscles it works.
- `generate_workout` — a structured workout with sets, reps
  and rest times. `muscleGroup` is required; it takes an array
  of muscle groups, and a single string is accepted and
  treated as a one-element array. Equipment, exercise types,
  difficulty, exercise count, structure, rounds and warmup /
  cooldown blocks are all tunable.
- `generate_program` — a multi-week training program with
  periodization, shaped by goal, difficulty, days per week,
  number of weeks and available equipment.
- `list_muscle_groups` — every muscle group in the catalogue,
  with its exercise count.
- `list_exercise_types` — every exercise type, with counts.

Arguments that the REST API documents but the tool set does
not expose are deliberately left out: the search tool has no
white-background / gym-video or video-tag filters and no
include / exclude video-list switches.

## Configuration

The API is keyed. Set your YMove key before running:

```bash
export YMOVE_API_KEY="..."
```

Every request carries the key as the `X-API-Key` header. A
call made without the key fails with `YMOVE_API_KEY is not
set` before any request leaves the process. Validation also
runs before any request: a missing required argument reports
`<tool>: missing required argument: <name>` and a
wrong-typed one reports
`<tool>: argument <name> has the wrong type`. An upstream
failure is reported as `upstream error: HTTP <status> from
ymove-api`, or `upstream unreachable: ymove-api` when the
API cannot be reached at all.

## CLI

Each tool is a subcommand taking one JSON argument string:

```bash
npx @reneturcios/exercisedb search_exercises '{"muscleGroup":"chest","hasVideo":true}'
npx @reneturcios/exercisedb get_exercise '{"id":"barbell-squat"}'
npx @reneturcios/exercisedb generate_workout '{"muscleGroup":["chest","triceps"],"exerciseCount":8}'
npx @reneturcios/exercisedb generate_program '{"goal":"strength","weeks":6,"daysPerWeek":3}'
npx @reneturcios/exercisedb list_muscle_groups '{}'
npx @reneturcios/exercisedb --version
```

Output is the upstream JSON body, unchanged. Exit codes:
`0` on success, `1` on a runtime error (including a
validation, API-key or upstream failure), `2` on a usage
error.

## MCP server

```bash
npx -y @reneturcios/exercisedb mcp
```

MCP client config:

```json
{
  "mcpServers": {
    "exercisedb": {
      "command": "npx",
      "args": ["-y", "@reneturcios/exercisedb", "mcp"],
      "env": { "YMOVE_API_KEY": "..." }
    }
  }
}
```

## Docker

```bash
docker run -i -e YMOVE_API_KEY="..." ghcr.io/cloudcorprecords/exercisedb
docker run --rm -e YMOVE_API_KEY="..." ghcr.io/cloudcorprecords/exercisedb list_exercise_types '{}'
```

## Development

```bash
npm install
npm run build   # tsc -> dist/
npm test        # tsx --test test/*.test.ts (fake fetch only, no network)
npm run dev     # run the CLI from source
```

## License

MIT — Copyright (c) 2026 Rene Turcios
