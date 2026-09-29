import { serve } from "@hono/node-server";
import { createApp } from "./app.ts";

const app = await createApp();
const port = Number(process.env.PORT ?? 3000);

const listener = serve({ fetch: app.fetch, port }, () => {
  console.log(`Compass Mini API on http://localhost:${port}/api`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    listener.close();
    void app.close().finally(() => process.exit(0));
  });
}
