import { readFileSync } from "node:fs";
import {
  defineAgent,
  definePromptInstructionResource,
} from "@copilotz/copilotz/core";

const markdown = (name: string) =>
  readFileSync(new URL(`../agents/${name}.md`, import.meta.url), "utf8")
    .trim();

/** One model for every agent; swap it with COMPASS_MODEL. */
const models = {
  generate: [{
    connection: "openai",
    model: process.env.COMPASS_MODEL ?? "gpt-5.4-mini",
  }],
};

/** Portable tools every agent may use. Installing a tool never grants it. */
const tools = ["get_current_time", "web_search", "fetch_text"];

const TEAM = ["north", "east", "south", "west"] as const;
const teammates = (self: string) => TEAM.filter((id) => id !== self);

export const agents = {
  north: defineAgent({
    id: "north",
    name: "North",
    role:
      "To hold the destination and carry the work to a named decision. Authority is over what we do, never over what is true.",
    description:
      "Ask North when the work needs its objective set, a decision owned, or a disagreement between agents resolved.",
    instructions: markdown("north"),
    models,
    capabilities: { tools, agents: teammates("north") },
  }),
  east: defineAgent({
    id: "east",
    name: "East",
    role:
      "To make the smallest real version and let the result decide. Owns the calls inside the work.",
    description:
      "Ask East when the fastest way to know is to build it, or when a bold idea deserves its strongest version before anyone judges it.",
    instructions: markdown("east"),
    models,
    capabilities: { tools, agents: teammates("east") },
  }),
  south: defineAgent({
    id: "south",
    name: "South",
    role: "To take claims to real contact and report what actually held.",
    description:
      "Ask South when something load-bearing has not met reality yet: to check it, measure it, or find what would have to be true for it to hold.",
    instructions: markdown("south"),
    models,
    capabilities: { tools, agents: teammates("south") },
  }),
  west: defineAgent({
    id: "west",
    name: "West",
    role:
      "To find the question a tangle actually turns on and recommend — never decide.",
    description:
      "Ask West when a consequential call is genuinely tangled: positions talking past each other, competing models, or a crux nobody has named.",
    instructions: markdown("west"),
    models,
    capabilities: { tools, agents: teammates("west") },
  }),
};

/** The values and room rules every agent shares. */
export const sharedInstructions = definePromptInstructionResource({
  id: "compass-mini.shared",
  type: "prompt_instruction",
  instructions: markdown("shared"),
});
