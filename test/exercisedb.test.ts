import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  generateProgram,
  generateWorkout,
  getExercise,
  listExerciseTypes,
  listMuscleGroups,
  searchExercises,
} from "../src/exercisedb.js";
import type { ExerciseDeps, FetchFn } from "../src/types.js";

/**
 * Every test runs against an injected fake fetch and a fixed
 * fake environment carrying a test API key: no live network,
 * no live call is made or claimed.
 */

const ENV = { YMOVE_API_KEY: "test-key-123" };

interface Captured {
  url: string;
  init?: { method?: string; headers?: Record<string, string>; body?: string };
}

function makeFetch(
  body: unknown = { ok: true },
  status = 200,
  captured: Captured[] = [],
): FetchFn {
  return async (url, init) => {
    captured.push({ url, init });
    return {
      ok: status >= 200 && status < 300,
      status,
      text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
    };
  };
}

function deps(fetchFn: FetchFn, env: Record<string, string | undefined> = ENV): ExerciseDeps {
  return { fetchFn, env };
}

/* ------------------------------------------------------------------ */

describe("API key gating", () => {
  it("fails with the pinned message and makes no request when the key is absent", async () => {
    const captured: Captured[] = [];
    await assert.rejects(
      () => searchExercises({}, deps(makeFetch({}, 200, captured), {})),
      { message: "YMOVE_API_KEY is not set" },
    );
    assert.equal(captured.length, 0);
  });

  it("gates the no-argument tools too", async () => {
    const captured: Captured[] = [];
    await assert.rejects(
      () => listMuscleGroups({}, deps(makeFetch({}, 200, captured), {})),
      { message: "YMOVE_API_KEY is not set" },
    );
    assert.equal(captured.length, 0);
  });

  it("sends the key as the X-API-Key header on a GET", async () => {
    const captured: Captured[] = [];
    await listExerciseTypes({}, deps(makeFetch([], 200, captured)));
    assert.equal(captured.length, 1);
    assert.equal(captured[0].init?.method, "GET");
    assert.equal(captured[0].init?.headers?.["X-API-Key"], "test-key-123");
  });
});

describe("search_exercises", () => {
  it("passes the upstream JSON body through unchanged", async () => {
    const raw = '{"data":[{"id":"bench-press"}],"total":1413}';
    const out = await searchExercises({}, deps(makeFetch(raw)));
    assert.equal(out, raw);
  });

  it("sends only the provided params, URL-encoded, to GET /exercises", async () => {
    const captured: Captured[] = [];
    await searchExercises(
      {
        search: "bench press & fly",
        muscleGroup: "chest",
        hasVideo: true,
        page: 2,
        pageSize: 20,
      },
      deps(makeFetch({}, 200, captured)),
    );
    const url = new URL(captured[0].url);
    assert.equal(
      `${url.origin}${url.pathname}`,
      "https://exercise-api.ymove.app/api/v2/exercises",
    );
    assert.equal(url.searchParams.get("search"), "bench press & fly");
    assert.equal(url.searchParams.get("muscleGroup"), "chest");
    assert.equal(url.searchParams.get("hasVideo"), "true");
    assert.equal(url.searchParams.get("page"), "2");
    assert.equal(url.searchParams.get("pageSize"), "20");
    assert.equal(url.searchParams.get("difficulty"), null);
    assert.equal(url.searchParams.get("equipment"), null);
    assert.equal(url.searchParams.get("exerciseType"), null);
    assert.ok(captured[0].url.includes("search=bench+press+%26+fly"));
  });

  it("sends no query string when no argument is provided", async () => {
    const captured: Captured[] = [];
    await searchExercises({}, deps(makeFetch({}, 200, captured)));
    assert.equal(captured[0].url, "https://exercise-api.ymove.app/api/v2/exercises");
  });

  it("rejects a wrong-typed argument with the pinned sentence", async () => {
    await assert.rejects(
      () => searchExercises({ page: "2" } as never, deps(makeFetch())),
      { message: "search_exercises: argument page has the wrong type" },
    );
    await assert.rejects(
      () => searchExercises({ hasVideo: "yes" } as never, deps(makeFetch())),
      { message: "search_exercises: argument hasVideo has the wrong type" },
    );
  });
});

describe("get_exercise", () => {
  it("fetches GET /exercises/<id>", async () => {
    const captured: Captured[] = [];
    await getExercise({ id: "barbell-squat" }, deps(makeFetch({}, 200, captured)));
    assert.equal(
      captured[0].url,
      "https://exercise-api.ymove.app/api/v2/exercises/barbell-squat",
    );
  });

  it("requires id with the pinned missing-argument sentence", async () => {
    await assert.rejects(
      () => getExercise({} as never, deps(makeFetch())),
      { message: "get_exercise: missing required argument: id" },
    );
  });

  it("rejects a wrong-typed id with the pinned sentence", async () => {
    await assert.rejects(
      () => getExercise({ id: 42 } as never, deps(makeFetch())),
      { message: "get_exercise: argument id has the wrong type" },
    );
  });
});

describe("generate_workout", () => {
  it("requires muscleGroup with the pinned missing-argument sentence", async () => {
    await assert.rejects(
      () => generateWorkout({} as never, deps(makeFetch())),
      { message: "generate_workout: missing required argument: muscleGroup" },
    );
  });

  it("wraps a single muscleGroup string into a one-element array param", async () => {
    const captured: Captured[] = [];
    await generateWorkout(
      { muscleGroup: "chest" },
      deps(makeFetch({}, 200, captured)),
    );
    const url = new URL(captured[0].url);
    assert.equal(
      `${url.origin}${url.pathname}`,
      "https://exercise-api.ymove.app/api/v2/workouts/generate",
    );
    assert.deepEqual(url.searchParams.getAll("muscleGroup"), ["chest"]);
  });

  it("sends arrays as repeated query params", async () => {
    const captured: Captured[] = [];
    await generateWorkout(
      {
        muscleGroup: ["chest", "triceps"],
        equipment: ["dumbbell", "bench"],
        exerciseType: ["strength"],
        difficulty: "intermediate",
        exerciseCount: 8,
        includeWarmup: true,
        warmupCount: 2,
      },
      deps(makeFetch({}, 200, captured)),
    );
    const url = new URL(captured[0].url);
    assert.deepEqual(url.searchParams.getAll("muscleGroup"), ["chest", "triceps"]);
    assert.deepEqual(url.searchParams.getAll("equipment"), ["dumbbell", "bench"]);
    assert.deepEqual(url.searchParams.getAll("exerciseType"), ["strength"]);
    assert.equal(url.searchParams.get("difficulty"), "intermediate");
    assert.equal(url.searchParams.get("exerciseCount"), "8");
    assert.equal(url.searchParams.get("includeWarmup"), "true");
    assert.equal(url.searchParams.get("warmupCount"), "2");
    assert.equal(url.searchParams.get("rounds"), null);
    assert.equal(url.searchParams.get("structure"), null);
    // Repeated params really repeat in the raw query string.
    assert.equal(captured[0].url.split("muscleGroup=").length - 1, 2);
    assert.equal(captured[0].url.split("equipment=").length - 1, 2);
  });

  it("rejects wrong-typed muscleGroup and array members with the pinned sentence", async () => {
    await assert.rejects(
      () => generateWorkout({ muscleGroup: 5 } as never, deps(makeFetch())),
      { message: "generate_workout: argument muscleGroup has the wrong type" },
    );
    await assert.rejects(
      () =>
        generateWorkout(
          { muscleGroup: ["chest", 3] } as never,
          deps(makeFetch()),
        ),
      { message: "generate_workout: argument muscleGroup has the wrong type" },
    );
    await assert.rejects(
      () =>
        generateWorkout(
          { muscleGroup: ["chest"], equipment: "dumbbell" } as never,
          deps(makeFetch()),
        ),
      { message: "generate_workout: argument equipment has the wrong type" },
    );
  });

  it("rejects a non-integer count with the pinned sentence", async () => {
    await assert.rejects(
      () =>
        generateWorkout(
          { muscleGroup: ["chest"], exerciseCount: 2.5 },
          deps(makeFetch()),
        ),
      { message: "generate_workout: argument exerciseCount has the wrong type" },
    );
  });
});

describe("generate_program", () => {
  it("sends the provided params to GET /programs/generate", async () => {
    const captured: Captured[] = [];
    await generateProgram(
      { goal: "hypertrophy", daysPerWeek: 4, weeks: 8, equipment: "full gym" },
      deps(makeFetch({}, 200, captured)),
    );
    const url = new URL(captured[0].url);
    assert.equal(
      `${url.origin}${url.pathname}`,
      "https://exercise-api.ymove.app/api/v2/programs/generate",
    );
    assert.equal(url.searchParams.get("goal"), "hypertrophy");
    assert.equal(url.searchParams.get("daysPerWeek"), "4");
    assert.equal(url.searchParams.get("weeks"), "8");
    assert.equal(url.searchParams.get("equipment"), "full gym");
    assert.equal(url.searchParams.get("difficulty"), null);
  });

  it("rejects a wrong-typed argument with the pinned sentence", async () => {
    await assert.rejects(
      () => generateProgram({ weeks: "8" } as never, deps(makeFetch())),
      { message: "generate_program: argument weeks has the wrong type" },
    );
  });
});

describe("list tools", () => {
  it("list_muscle_groups fetches GET /exercises/muscle-groups", async () => {
    const captured: Captured[] = [];
    const out = await listMuscleGroups({}, deps(makeFetch('[{"name":"chest","count":210}]', 200, captured)));
    assert.equal(
      captured[0].url,
      "https://exercise-api.ymove.app/api/v2/exercises/muscle-groups",
    );
    assert.equal(out, '[{"name":"chest","count":210}]');
  });

  it("list_exercise_types fetches GET /exercises/exercise-types", async () => {
    const captured: Captured[] = [];
    await listExerciseTypes({}, deps(makeFetch([], 200, captured)));
    assert.equal(
      captured[0].url,
      "https://exercise-api.ymove.app/api/v2/exercises/exercise-types",
    );
  });
});

describe("upstream error mapping", () => {
  it("maps a non-2xx response to the pinned error form", async () => {
    await assert.rejects(
      () => searchExercises({}, deps(makeFetch("nope", 503))),
      { message: "upstream error: HTTP 503 from ymove-api" },
    );
    await assert.rejects(
      () => getExercise({ id: "missing" }, deps(makeFetch("nope", 404))),
      { message: "upstream error: HTTP 404 from ymove-api" },
    );
  });

  it("maps a throwing fetch to upstream unreachable", async () => {
    const throwing: FetchFn = async () => {
      throw new Error("socket hang up");
    };
    await assert.rejects(() => listMuscleGroups({}, deps(throwing)), {
      message: "upstream unreachable: ymove-api",
    });
  });

  it("validates before any request is made", async () => {
    const captured: Captured[] = [];
    await assert.rejects(
      () => getExercise({} as never, deps(makeFetch({}, 200, captured))),
      { message: "get_exercise: missing required argument: id" },
    );
    assert.equal(captured.length, 0);
  });
});
