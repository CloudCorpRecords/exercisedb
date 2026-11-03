#!/usr/bin/env node
/**
 * exercisedb CLI.
 *
 *   exercisedb search_exercises '<json>'   (and the other five
 *   exercisedb get_exercise '<json>'        tool names likewise)
 *   exercisedb mcp
 *   exercisedb --version
 *
 * Each tool subcommand takes one JSON argument string with the
 * tool's arguments and prints the upstream JSON body unchanged.
 * Exit codes: 0 success, 1 runtime error, 2 usage error.
 */
import {
  generateProgram,
  generateWorkout,
  getExercise,
  listExerciseTypes,
  listMuscleGroups,
  searchExercises,
  VERSION,
} from "./exercisedb.js";

const TOOL_NAMES = [
  "search_exercises",
  "get_exercise",
  "generate_workout",
  "generate_program",
  "list_muscle_groups",
  "list_exercise_types",
] as const;

function usage(): never {
  console.error(`Usage:
  exercisedb <tool> '<json-args>'     one of: ${TOOL_NAMES.join(", ")}
  exercisedb mcp
  exercisedb --version`);
  process.exit(2);
}

async function runTool(name: string, args: Record<string, unknown>): Promise<string> {
  switch (name) {
    case "search_exercises":
      return searchExercises(args as never);
    case "get_exercise":
      return getExercise(args as never);
    case "generate_workout":
      return generateWorkout(args as never);
    case "generate_program":
      return generateProgram(args as never);
    case "list_muscle_groups":
      return listMuscleGroups(args);
    case "list_exercise_types":
      return listExerciseTypes(args);
    default:
      usage();
  }
}

async function main(): Promise<void> {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === "--version" || cmd === "-v") {
    console.log(VERSION);
    return;
  }
  if (cmd === "mcp") {
    if (rest.length !== 0) usage();
    await import("./mcp.js");
    return;
  }
  if (!(TOOL_NAMES as readonly string[]).includes(cmd ?? "")) usage();
  if (rest.length > 1) usage();
  let args: Record<string, unknown> = {};
  if (rest.length === 1) {
    try {
      const parsed: unknown = JSON.parse(rest[0]);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) usage();
      args = parsed as Record<string, unknown>;
    } catch {
      console.error("error: argument must be a JSON object string");
      process.exit(2);
    }
  }
  try {
    const out = await runTool(cmd, args);
    console.log(out);
  } catch (err) {
    console.error(`error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

void main();
