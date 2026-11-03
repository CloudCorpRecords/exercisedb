/**
 * exercisedb types.
 *
 * Six tools wrapping the YMove exercise API. Every tool
 * answers with the upstream JSON body passed through
 * unchanged, as a single string; failures are Errors carrying
 * the pinned error strings.
 */

export interface SearchExercisesArgs {
  search?: string;
  muscleGroup?: string;
  exerciseType?: string;
  equipment?: string;
  difficulty?: string;
  hasVideo?: boolean;
  page?: number;
  pageSize?: number;
}

export interface GetExerciseArgs {
  id: string;
}

export interface GenerateWorkoutArgs {
  muscleGroup: string | string[];
  equipment?: string[];
  exerciseType?: string[];
  difficulty?: string;
  exerciseCount?: number;
  structure?: string;
  rounds?: number;
  includeWarmup?: boolean;
  warmupCount?: number;
  includeCooldown?: boolean;
  cooldownCount?: number;
}

export interface GenerateProgramArgs {
  goal?: string;
  difficulty?: string;
  daysPerWeek?: number;
  weeks?: number;
  equipment?: string;
  includeWarmup?: boolean;
  warmupCount?: number;
  includeCooldown?: boolean;
  cooldownCount?: number;
}

/** The minimal slice of a fetch Response this client relies on. */
export interface FetchResponseLike {
  ok: boolean;
  status: number;
  text(): Promise<string>;
}

/** Injectable fetch, so tests never touch the live network. */
export type FetchFn = (
  url: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  },
) => Promise<FetchResponseLike>;

/** Runtime dependencies for the core, all injectable in tests. */
export interface ExerciseDeps {
  /** Fetch implementation. Defaults to the global fetch. */
  fetchFn?: FetchFn;
  /** Environment (YMOVE_API_KEY). Defaults to process.env. */
  env?: Record<string, string | undefined>;
}
