import { mkdirSync } from "node:fs";
import { createCopilotz } from "@copilotz/copilotz";
import { corePlugin } from "@copilotz/copilotz/core";
import { coreHttpPlugin } from "@copilotz/copilotz/core/server";
import { defineServerFacade, serverPlugin } from "@copilotz/copilotz/server";
import { builtInToolsPlugin } from "@copilotz/copilotz/tools/builtin";
import { webToolsPlugin } from "@copilotz/copilotz/tools/web";
import { agents, sharedInstructions } from "./agents.ts";
import { roomTitlesPlugin } from "./room-titles.ts";

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) throw new Error("Set OPENAI_API_KEY (see .env.example).");

/**
 * Demo sign-in: the browser sends the name a person picked. Replace this with
 * your real authentication; everything downstream only sees `actor`.
 */
function personFrom(request: Request) {
  const name = request.headers.get("x-compass-user")?.trim();
  if (!name || name.length > 40) return null;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug ? { id: `person-${slug}`, name } : null;
}

/** The thread a request acts on, from the route or the JSON body. */
async function requestedThread(
  request: Request,
  params: Readonly<Record<string, string>>,
): Promise<string | undefined> {
  if (params.id) return params.id;
  if (request.method !== "POST") return undefined;
  const body = await request.json().catch(() => null) as
    | { threadId?: unknown }
    | null;
  return typeof body?.threadId === "string" ? body.threadId : undefined;
}

const server = defineServerFacade({
  authenticate(request) {
    const actor = personFrom(request);
    if (!actor) {
      return Response.json(
        { error: { code: "unauthorized", message: "Pick a name to join." } },
        { status: 401 },
      );
    }
    return { actor };
  },
  // One shared workspace: everyone who joined sees every room and may post
  // in it. Narrow these two lines to model private rooms or teams.
  async authorize(request, { params }) {
    const threadId = await requestedThread(request, params);
    return {
      collections: { thread: {}, message: {}, participant: {} },
      ...(threadId
        ? { actionMetadata: { coreConversationAccess: { threadId } } }
        : {}),
    };
  },
});

/** Postgres when DATABASE_URL is set; otherwise PGlite on local disk. */
function databaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  mkdirSync(".data", { recursive: true });
  return "file://./.data/compass";
}

export function createApp() {
  return createCopilotz({
    namespace: "compass-mini",
    database: { url: databaseUrl() },
    plugins: [
      corePlugin,
      coreHttpPlugin,
      serverPlugin,
      builtInToolsPlugin,
      webToolsPlugin,
      roomTitlesPlugin,
    ],
    // A background Processor (like the room titles) fails without touching the
    // conversation, so nothing else reports it. This logs why.
    onDeliveryDiagnostic(diagnostic) {
      if (diagnostic.phase === "worker_handler_settled" && diagnostic.error) {
        console.error(
          `${diagnostic.consumerId} ${diagnostic.status}: ${diagnostic.error.name}: ${diagnostic.error.message}`,
        );
      }
    },
    resources: {
      agents,
      promptInstructions: { shared: sharedInstructions },
      llmConnections: {
        openai: { provider: "openai", auth: { apiKey } },
      },
      server: { default: server },
    },
  });
}
