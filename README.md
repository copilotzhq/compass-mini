# Compass Mini

A shared room where people and four AI agents work together. Everyone who joins
sees the same conversation, talks to any agent by name, and watches the agents
ask each other for help in the open.

Built on [Copilotz](https://jsr.io/@copilotz/copilotz), in about 500 lines of
TypeScript.

| Agent | Role |
| --- | --- |
| **North** | Holds the destination and owns the decision. |
| **East** | Builds the smallest real version. |
| **South** | Takes every claim to reality and checks it. |
| **West** | Finds the question it really turns on. |

## Run it

You need Node 24 and an OpenAI API key.

```sh
git clone https://github.com/copilotzhq/compass-mini.git
cd compass-mini
npm install
cp .env.example .env    # then set OPENAI_API_KEY
npm run build
npm start
```

Open <http://localhost:3000>, pick a name, and start a room. Open a private
window, join under another name, and open the same room: both of you are in it.

Try asking North to decide something "with the team's input". North asks the
others in parallel, in the room, and decides after they answer.

There is no database to set up. Conversations are stored in `.data/`, so they
survive a restart. Set `DATABASE_URL` to a Postgres URL to use Postgres instead.

## Develop

Run the server and the web app in two terminals:

```sh
npm run dev       # API on :3000, restarts on change
npm run dev:web   # web app on :5173 with hot reload
```

Then open <http://localhost:5173>. With the server running, `npm run smoke`
puts two people and the agents in one room over the HTTP API and prints what
each person sees. `npm run typecheck` checks the server and the web app.

## What's inside

```text
agents/            What each agent is like, in plain Markdown
  shared.md        The values and room rules every agent shares
server/
  app.ts           The whole backend: one createCopilotz() call and its policy
  agents.ts        The four agents, their model and the tools they may use
  room-titles.ts   Names each room from its first message
  main.ts          Serves the API and the web app on one port
web/src/App.tsx    Join screen and the chat, using @copilotz/chat-adapter
scripts/smoke.ts   Two people, one room, over the public API
```

## How it works

Copilotz does the heavy lifting. `server/app.ts` composes:

- **Rooms and people.** Core keeps threads, participants and messages. People
  and agents are both participants, so a room is simply a thread with several
  of each.
- **Agents that work together.** Each agent may ask the other three, because
  its `capabilities.agents` grant says so. An `ask` is a public message in the
  room, and the answer is another one.
- **Tools, only when granted.** Agents may use the clock, web search and fetch
  a page. Installing a tool never grants it; each agent lists what it may use.
- **An HTTP API and live updates.** `serverPlugin` serves `/api`, and the chat
  UI follows each room live, so everyone sees new messages without refreshing.
- **Durability.** Every message and model call is recorded as an event before
  it is acted on. Restart the server mid-conversation and the room is intact.

## Make it yours

- **Change the agents.** Edit the Markdown in `agents/`, or their roles, model
  and tools in `server/agents.ts`. Set `COMPASS_MODEL` to use another OpenAI
  model.
- **Use real sign-in.** The join screen is a demo: anyone can type any name.
  Replace `personFrom` in `server/app.ts` with your authentication. Everything
  downstream only sees the `actor` it returns.
- **Private rooms or teams.** `authorize` in `server/app.ts` currently lets
  everyone who joined read and post in every room. Narrow it there.
- **Add behavior.** `server/room-titles.ts` is a complete example: a
  Processor that reacts to an event, calls the model and saves the result.

## License

MIT
