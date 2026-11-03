# Changelog

## 0.1.0 (2026-10-27)

- Initial release: six MCP tools and matching CLI subcommands
  over the YMove exercise API — `search_exercises` (filter the
  exercise catalogue by text, muscle group, type, equipment,
  difficulty and video availability, with paging),
  `get_exercise` (one exercise by ID or slug, with video URLs
  and instructions), `generate_workout` (a structured workout
  with sets, reps and rest times; `muscleGroup` is required and
  a single string is wrapped into a one-element array),
  `generate_program` (a multi-week program with
  periodization), `list_muscle_groups` and
  `list_exercise_types` (the catalogue's vocabularies with
  counts).
- Every request carries the `YMOVE_API_KEY` environment
  variable as the `X-API-Key` header; a call made without the
  key fails before any request. Upstream JSON is passed
  through unchanged, and upstream failures are reported as
  `upstream error: HTTP <status> from ymove-api` or
  `upstream unreachable: ymove-api`.
