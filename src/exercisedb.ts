/**
 * exercisedb core: six read-only calls against the YMove
 * exercise API.
 *
 * Shared rules, as documented:
 * - Base URL `https://exercise-api.ymove.app/api/v2`. Every
 *   request carries the header `X-API-Key: <key>`, the key
 *   read from env `YMOVE_API_KEY`; when the key is absent the
 *   call fails with `YMOVE_API_KEY is not set` before any
 *   request is made.
 * - A successful call returns the upstream JSON body as text,
 *   passed through unchanged.
 * - A non-2xx upstream response fails with
 *   `upstream error: HTTP <status> from ymove-api`; a throwing
 *   fetch fails with `upstream unreachable: ymove-api`.
 * - Optional arguments are sent only when provided. Query
 *   values are URL-encoded; arrays are sent as repeated query
 *   params.
 * - Validation runs before any request: a missing required
 *   argument fails with
 *   `<tool>: missing required argument: <name>` and a
 *   wrong-typed argument with
 *   `<tool>: argument <name> has the wrong type`.
 * - Upstream access goes through the injectable fetch in
 *   deps, so tests run against a fake fetch only.
 */
import type {
  ExerciseDeps,
  FetchFn,
  FetchResponseLike,
  GenerateProgramArgs,
  GenerateWorkoutArgs,
  GetExerciseArgs,
  SearchExercisesArgs,
} from "./types.js";

export const VERSION = "0.1.0";

export const BASE_URL = "https://exercise-api.ymove.app/api/v2";

/* ------------------------------------------------------------------ */
/* Validation helpers                                                  */
/* ------------------------------------------------------------------ */

function missing(tool: string, name: string): Error {
  return new Error(`${tool}: missing required argument: ${name}`);
}

function wrongType(tool: string, name: string): Error {
  return new Error(`${tool}: argument ${name} has the wrong type`);
}

function checkString(
  tool: string,
  args: Record<string, unknown>,
  name: string,
  required: boolean,
): void {
  const v = args[name];
  if (v === undefined) {
    if (required) throw missing(tool, name);
    return;
  }
  if (typeof v !== "string") throw wrongType(tool, name);
}

function checkBoolean(
  tool: string,
  args: Record<string, unknown>,
  name: string,
): void {
  const v = args[name];
  if (v === undefined) return;
  if (typeof v !== "boolean") throw wrongType(tool, name);
}

function checkInteger(
  tool: string,
  args: Record<string, unknown>,
  name: string,
): void {
  const v = args[name];
  if (v === undefined) return;
  if (typeof v !== "number" || !Number.isInteger(v)) throw wrongType(tool, name);
}

function checkStringArray(
  tool: string,
  args: Record<string, unknown>,
  name: string,
): void {
  const v = args[name];
  if (v === undefined) return;
  if (!Array.isArray(v) || v.some((x) => typeof x !== "string")) {
    throw wrongType(tool, name);
  }
}

/* ------------------------------------------------------------------ */
/* Fetch helper                                                        */
/* ------------------------------------------------------------------ */

async function defaultFetch(
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
): Promise<FetchResponseLike> {
  return fetch(url, init);
}

function fetchFn(deps: ExerciseDeps): FetchFn {
  return deps.fetchFn ?? defaultFetch;
}

/**
 * Run one GET against the API and return the body text
 * unchanged. The API key is checked before any request.
 */
async function callApi(deps: ExerciseDeps, path: string): Promise<string> {
  const env = deps.env ?? process.env;
  const key = env.YMOVE_API_KEY;
  if (!key) throw new Error("YMOVE_API_KEY is not set");
  let res: FetchResponseLike;
  try {
    res = await fetchFn(deps)(`${BASE_URL}${path}`, {
      method: "GET",
      headers: { "X-API-Key": key },
    });
  } catch {
    throw new Error("upstream unreachable: ymove-api");
  }
  if (!res.ok) {
    throw new Error(`upstream error: HTTP ${res.status} from ymove-api`);
  }
  return res.text();
}

/** Build an encoded query string from the provided params, in order. */
function queryString(
  pairs: Array<[string, string | number | boolean | string[] | undefined]>,
): string {
  const params = new URLSearchParams();
  for (const [name, value] of pairs) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) params.append(name, item);
    } else {
      params.append(name, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/* ------------------------------------------------------------------ */
/* 1. search_exercises                                                 */
/* ------------------------------------------------------------------ */

export async function searchExercises(
  args: SearchExercisesArgs = {},
  deps: ExerciseDeps = {},
): Promise<string> {
  const tool = "search_exercises";
  const a = args as unknown as Record<string, unknown>;
  checkString(tool, a, "search", false);
  checkString(tool, a, "muscleGroup", false);
  checkString(tool, a, "exerciseType", false);
  checkString(tool, a, "equipment", false);
  checkString(tool, a, "difficulty", false);
  checkBoolean(tool, a, "hasVideo");
  checkInteger(tool, a, "page");
  checkInteger(tool, a, "pageSize");
  const qs = queryString([
    ["search", args.search],
    ["muscleGroup", args.muscleGroup],
    ["exerciseType", args.exerciseType],
    ["equipment", args.equipment],
    ["difficulty", args.difficulty],
    ["hasVideo", args.hasVideo],
    ["page", args.page],
    ["pageSize", args.pageSize],
  ]);
  return callApi(deps, `/exercises${qs}`);
}

/* ------------------------------------------------------------------ */
/* 2. get_exercise                                                     */
/* ------------------------------------------------------------------ */

export async function getExercise(
  args: GetExerciseArgs,
  deps: ExerciseDeps = {},
): Promise<string> {
  const tool = "get_exercise";
  const a = (args ?? {}) as unknown as Record<string, unknown>;
  checkString(tool, a, "id", true);
  return callApi(deps, `/exercises/${encodeURIComponent(args.id)}`);
}

/* ------------------------------------------------------------------ */
/* 3. generate_workout                                                 */
/* ------------------------------------------------------------------ */

export async function generateWorkout(
  args: GenerateWorkoutArgs,
  deps: ExerciseDeps = {},
): Promise<string> {
  const tool = "generate_workout";
  const a = (args ?? {}) as unknown as Record<string, unknown>;
  if (a.muscleGroup === undefined) throw missing(tool, "muscleGroup");
  let muscleGroup: string[];
  if (typeof a.muscleGroup === "string") {
    // Pinned: a single string is wrapped into a one-element array.
    muscleGroup = [a.muscleGroup];
  } else if (
    Array.isArray(a.muscleGroup) &&
    a.muscleGroup.every((x) => typeof x === "string")
  ) {
    muscleGroup = a.muscleGroup as string[];
  } else {
    throw wrongType(tool, "muscleGroup");
  }
  checkStringArray(tool, a, "equipment");
  checkStringArray(tool, a, "exerciseType");
  checkString(tool, a, "difficulty", false);
  checkInteger(tool, a, "exerciseCount");
  checkString(tool, a, "structure", false);
  checkInteger(tool, a, "rounds");
  checkBoolean(tool, a, "includeWarmup");
  checkInteger(tool, a, "warmupCount");
  checkBoolean(tool, a, "includeCooldown");
  checkInteger(tool, a, "cooldownCount");
  const qs = queryString([
    ["muscleGroup", muscleGroup],
    ["equipment", args.equipment],
    ["exerciseType", args.exerciseType],
    ["difficulty", args.difficulty],
    ["exerciseCount", args.exerciseCount],
    ["structure", args.structure],
    ["rounds", args.rounds],
    ["includeWarmup", args.includeWarmup],
    ["warmupCount", args.warmupCount],
    ["includeCooldown", args.includeCooldown],
    ["cooldownCount", args.cooldownCount],
  ]);
  return callApi(deps, `/workouts/generate${qs}`);
}

/* ------------------------------------------------------------------ */
/* 4. generate_program                                                 */
/* ------------------------------------------------------------------ */

export async function generateProgram(
  args: GenerateProgramArgs = {},
  deps: ExerciseDeps = {},
): Promise<string> {
  const tool = "generate_program";
  const a = args as unknown as Record<string, unknown>;
  checkString(tool, a, "goal", false);
  checkString(tool, a, "difficulty", false);
  checkInteger(tool, a, "daysPerWeek");
  checkInteger(tool, a, "weeks");
  checkString(tool, a, "equipment", false);
  checkBoolean(tool, a, "includeWarmup");
  checkInteger(tool, a, "warmupCount");
  checkBoolean(tool, a, "includeCooldown");
  checkInteger(tool, a, "cooldownCount");
  const qs = queryString([
    ["goal", args.goal],
    ["difficulty", args.difficulty],
    ["daysPerWeek", args.daysPerWeek],
    ["weeks", args.weeks],
    ["equipment", args.equipment],
    ["includeWarmup", args.includeWarmup],
    ["warmupCount", args.warmupCount],
    ["includeCooldown", args.includeCooldown],
    ["cooldownCount", args.cooldownCount],
  ]);
  return callApi(deps, `/programs/generate${qs}`);
}

/* ------------------------------------------------------------------ */
/* 5. list_muscle_groups                                               */
/* ------------------------------------------------------------------ */

export async function listMuscleGroups(
  _args: Record<string, unknown> = {},
  deps: ExerciseDeps = {},
): Promise<string> {
  return callApi(deps, "/exercises/muscle-groups");
}

/* ------------------------------------------------------------------ */
/* 6. list_exercise_types                                              */
/* ------------------------------------------------------------------ */

export async function listExerciseTypes(
  _args: Record<string, unknown> = {},
  deps: ExerciseDeps = {},
): Promise<string> {
  return callApi(deps, "/exercises/exercise-types");
}
