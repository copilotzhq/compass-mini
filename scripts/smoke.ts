// Two people and the four agents in one room, over the public HTTP API.
// Run the server first (npm run dev), then: npm run smoke
import { createCopilotzClient } from "@copilotz/copilotz/client";
import { createCoreClient } from "@copilotz/copilotz/core/client";

const baseUrl = process.env.API ?? "http://localhost:3000/api";
const person = (name: string) => {
  const client = createCopilotzClient({
    baseUrl,
    getRequestHeaders: () => ({ "x-compass-user": name }),
  });
  return { client, core: createCoreClient(client) };
};
const ana = person("Ana");
const ben = person("Ben");

type Message = Awaited<
  ReturnType<typeof ana.core.threads.messages>
>["data"][number];

const text = (message: Message) =>
  (Array.isArray(message.content) ? message.content : [message.content])
    .map((part) =>
      typeof part === "string"
        ? part
        : String((part as { value?: unknown })?.value ?? "")
    )
    .join("");

const isAgent = (message: Message) =>
  (message.sender as { participantType?: string } | undefined)
    ?.participantType === "agent";

async function agentReplies(threadId: string, count: number) {
  for (let attempt = 0; attempt < 120; attempt++) {
    const page = await ana.core.threads.messages(threadId);
    if (page.data.filter(isAgent).length >= count) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for ${count} agent replies.`);
}

// Ana opens a room with the whole team and asks North.
const opened = await ana.core.threads.send({
  externalThreadId: `launch-${Date.now()}`,
  participantIds: ["north", "east", "south", "west"],
  recipientIds: ["north"],
  content:
    "North, we're launching an open-source library next week. Docs first or a launch video first? Two sentences.",
}, { idempotencyKey: crypto.randomUUID() });
const { threadId } = await ana.client.operations.result(
  opened.operationId,
) as { threadId: string };
await agentReplies(threadId, 1);

// Ben joins the same room and asks West.
const asked = await ben.core.threads.send({
  threadId,
  recipientIds: ["west"],
  content: "West, what does that choice really turn on? One sentence.",
}, { idempotencyKey: crypto.randomUUID() });
await ben.client.operations.result(asked.operationId);
await agentReplies(threadId, 2);

// Both people read the same room.
for (const [name, viewer] of [["Ana", ana], ["Ben", ben]] as const) {
  const { data } = await viewer.core.threads.messages(threadId);
  console.log(`\n${name} sees ${data.length} messages:`);
  for (const message of data) {
    const sender = message.sender as { name?: string } | undefined;
    console.log(`  ${sender?.name ?? "?"}: ${text(message).slice(0, 200)}`);
  }
}
