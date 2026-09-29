// Names a room from its first human message, in the background.
//
// This is also the smallest example of extending Copilotz: a durable
// Processor reacts to an event, calls the model through the same `callLlm`
// Action the agents use, and writes to a Collection. It runs at least once,
// so each step carries a stable operation key.
import { definePlugin, defineProcessor } from "@copilotz/copilotz/plugins";
import type { ContentRef } from "@copilotz/copilotz/content";

type Row = Readonly<{ [key: string]: unknown }>;
type Part = { kind?: unknown; assetId?: unknown; value?: unknown };
type ContentReader = {
  resolve(ref: ContentRef): Promise<{ text?: string }>;
};

const model = () => ({
  connection: "openai",
  model: process.env.COMPASS_MODEL ?? "gpt-5.4-mini",
});

/** Stored text arrives as asset references; read their text through the runtime. */
async function textOf(content: unknown, reader: ContentReader): Promise<string> {
  const parts = Array.isArray(content) ? content : [content];
  const texts = await Promise.all(parts.map(async (part) => {
    if (typeof part === "string") return part;
    const item = part as Part | null;
    if (typeof item?.value === "string") return item.value;
    if (item?.kind === "text" && typeof item.assetId === "string") {
      return (await reader.resolve(item as unknown as ContentRef)).text ?? "";
    }
    return "";
  }));
  return texts.join("").trim();
}

/** One text entry for an Action's content input. */
const text = (value: string) => ({
  kind: "text",
  role: "body",
  mediaType: "text/plain; charset=utf-8",
  value,
});

/** A short, plain title: one line, no quotes or trailing punctuation. */
function cleanTitle(value: string): string {
  return value.split("\n")[0]
    .replace(/^["'“”‘’\s]+|["'“”‘’.\s]+$/g, "")
    .slice(0, 60);
}

const nameRoom = defineProcessor({
  id: "compass-mini.room-title",
  on: [{ eventType: "message.created" }],
  // A title must never delay or fail the conversation it names.
  settlement: "detached",
  async handle(event, context) {
    const messageId = event.durable ? event.subject?.id : undefined;
    if (!messageId) return;
    // Core's collections and the LLM Action, narrowed to what this uses.
    const collections = context.collections as unknown as {
      [name: string]: {
        get(input: { id: string }): Promise<Row | null>;
        update(
          input: { id: string; set: Row },
          options?: { operationKey?: string },
        ): Promise<unknown>;
      };
    };
    const actions = context.actions as unknown as {
      callLlm(
        input: unknown,
        options: { operationKey: string },
      ): Promise<{ content?: unknown }>;
    };

    const message = await collections.message.get({ id: messageId });
    if (!message || typeof message.threadId !== "string") return;
    const thread = await collections.thread.get({ id: message.threadId });
    if (!thread || (typeof thread.name === "string" && thread.name.trim())) {
      return;
    }
    const sender = typeof message.senderId === "string"
      ? await collections.participant.get({ id: message.senderId })
      : null;
    if (sender?.participantType !== "human") return;

    if (!Array.isArray(message.content) || !message.content.length) return;

    const output = await actions.callLlm({
      models: [model()],
      mode: "generate",
      request: {
        messages: [
          {
            role: "system",
            content: [text(
              "You title chat rooms. You never answer or discuss the message; you only name it.",
            )],
          },
          {
            role: "user",
            // The stored message content is reused as-is; no copy is made.
            content: [
              text("A room starts with this message:\n\n"),
              ...message.content,
              text(
                "\n\nGive the room a title of 2 to 5 words, in the message's language. Reply with the title only.",
              ),
            ],
          },
        ],
      },
    }, { operationKey: "room-title" });
    const name = cleanTitle(await textOf(output?.content, context.content));
    if (!name) return;

    await collections.thread.update(
      { id: message.threadId, set: { name } },
      { operationKey: "room-title" },
    );
  },
});

export const roomTitlesPlugin = definePlugin({
  id: "compass-mini.room-titles",
  version: "1.0.0",
  processors: { nameRoom },
});
