/**
 * exercisedb MCP server. Tools: search_exercises, get_exercise,
 * generate_workout, generate_program, list_muscle_groups,
 * list_exercise_types.
 *
 * Why the low-level Server instead of McpServer: the
 * high-level helper converts zod schemas to JSON Schema and
 * injects keys that are not in this tool set's documented
 * spec ("$schema" and "additionalProperties"), which breaks
 * exact tool-list/schema parity with the spec. This file
 * serves tools/list with the spec's exact input schemas as
 * explicit literals, and the core validates every tools/call
 * argument set itself.
 *
 * Every tool returns a single text item carrying the upstream
 * JSON unchanged; validation, API-key and upstream failures
 * come back as isError results carrying the documented error
 * strings.
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import {
  generateProgram,
  generateWorkout,
  getExercise,
  listExerciseTypes,
  listMuscleGroups,
  searchExercises,
  VERSION,
} from "./exercisedb.js";

const TOOLS = [
  {
    name: "search_exercises",
    description:
      "Search and filter 1,413+ exercises by muscle group, equipment, difficulty, type",
    inputSchema: {
      type: "object" as const,
      properties: {
        difficulty: { description: "Difficulty filter.", type: "string" },
        equipment: { description: "Equipment filter.", type: "string" },
        exerciseType: { description: "Exercise type filter.", type: "string" },
        hasVideo: { description: "Only exercises with video.", type: "boolean" },
        muscleGroup: { description: "Muscle group filter.", type: "string" },
        page: { description: "Page number.", type: "integer" },
        pageSize: { description: "Results per page.", type: "integer" },
        search: { description: "Free-text search.", type: "string" },
      },
    },
  },
  {
    name: "get_exercise",
    description:
      "Get detailed exercise info with video URLs, instructions, muscles",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: {
          description: "An exercise ID or slug; the endpoint accepts both.",
          type: "string",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "generate_workout",
    description: "Generate a structured workout with sets, reps, and rest times",
    inputSchema: {
      type: "object" as const,
      properties: {
        cooldownCount: {
          description: "Number of cooldown exercises.",
          type: "integer",
        },
        difficulty: { description: "Difficulty.", type: "string" },
        equipment: {
          description: "Available equipment.",
          items: { type: "string" },
          type: "array",
        },
        exerciseCount: { description: "Number of exercises.", type: "integer" },
        exerciseType: {
          description: "Exercise types.",
          items: { type: "string" },
          type: "array",
        },
        includeCooldown: { description: "Include a cooldown.", type: "boolean" },
        includeWarmup: { description: "Include a warmup.", type: "boolean" },
        muscleGroup: {
          anyOf: [
            { type: "string" },
            { items: { type: "string" }, type: "array" },
          ],
          description:
            "Target muscle groups; a single string is wrapped into a one-element array.",
        },
        rounds: { description: "Number of rounds.", type: "integer" },
        structure: { description: "Workout structure.", type: "string" },
        warmupCount: {
          description: "Number of warmup exercises.",
          type: "integer",
        },
      },
      required: ["muscleGroup"],
    },
  },
  {
    name: "generate_program",
    description: "Generate a multi-week training program with periodization",
    inputSchema: {
      type: "object" as const,
      properties: {
        cooldownCount: {
          description: "Number of cooldown exercises.",
          type: "integer",
        },
        daysPerWeek: {
          description: "Training days per week.",
          type: "integer",
        },
        difficulty: { description: "Difficulty.", type: "string" },
        equipment: { description: "Available equipment.", type: "string" },
        goal: { description: "Program goal.", type: "string" },
        includeCooldown: { description: "Include cooldowns.", type: "boolean" },
        includeWarmup: { description: "Include warmups.", type: "boolean" },
        warmupCount: {
          description: "Number of warmup exercises.",
          type: "integer",
        },
        weeks: { description: "Program length in weeks.", type: "integer" },
      },
    },
  },
  {
    name: "list_muscle_groups",
    description: "List all muscle groups with exercise counts",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "list_exercise_types",
    description: "List all exercise types with counts",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
];

function textResult(text: string) {
  return {
    content: [{ type: "text" as const, text }],
  };
}

function errorResult(err: unknown) {
  return {
    content: [
      { type: "text" as const, text: err instanceof Error ? err.message : String(err) },
    ],
    isError: true,
  };
}

const server = new Server(
  { name: "exercisedb", version: VERSION },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const a = (args ?? {}) as Record<string, unknown>;
  try {
    let out: string;
    switch (name) {
      case "search_exercises":
        out = await searchExercises(a as never);
        break;
      case "get_exercise":
        out = await getExercise(a as never);
        break;
      case "generate_workout":
        out = await generateWorkout(a as never);
        break;
      case "generate_program":
        out = await generateProgram(a as never);
        break;
      case "list_muscle_groups":
        out = await listMuscleGroups(a);
        break;
      case "list_exercise_types":
        out = await listExerciseTypes(a);
        break;
      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
    return textResult(out);
  } catch (err) {
    if (err instanceof McpError) throw err;
    return errorResult(err);
  }
});

async function main(): Promise<void> {
  await server.connect(new StdioServerTransport());
}

void main();
