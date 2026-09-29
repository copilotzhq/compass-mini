import { useState } from "react";
import { CopilotzChat } from "@copilotz/chat-adapter";
import type { AgentOption, ChatConfig } from "@copilotz/chat-ui";

/** A single-letter avatar in the agent's color, as an inline SVG. */
const mark = (letter: string, color: string) =>
  `data:image/svg+xml,${
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#070d1c"/><circle cx="16" cy="16" r="14.5" fill="none" stroke="${color}" stroke-width="2"/><text x="16" y="21.5" text-anchor="middle" font-family="system-ui,sans-serif" font-size="15" font-weight="700" fill="${color}">${letter}</text></svg>`,
    )
  }`;

const agent = (
  id: string,
  name: string,
  description: string,
  color: string,
): AgentOption => ({
  id,
  name,
  description,
  color,
  avatarUrl: mark(name[0], color),
});

const TEAM: AgentOption[] = [
  agent("north", "North", "Holds the destination. Owns the decision.", "#19f0e4"),
  agent("east", "East", "Builds the smallest real version.", "#ffb547"),
  agent("south", "South", "Takes every claim to reality.", "#ff5f7e"),
  agent("west", "West", "Finds the question it turns on.", "#9d8cff"),
];
const TEAM_IDS = TEAM.map((agent) => agent.id);

const CONFIG: ChatConfig = {
  branding: {
    title: "Compass Mini",
    subtitle: "People and four agents, one room",
  },
  agentSelector: { enabled: true, mode: "multi" },
  features: { spaces: { enabled: false } },
  ui: { theme: "dark" },
  labels: { inputPlaceholder: "Message the room…" },
};
const NAME_KEY = "compass-mini.name";

function storedName(): string | null {
  try {
    return localStorage.getItem(NAME_KEY);
  } catch {
    return null;
  }
}

export function App() {
  const [name, setName] = useState(storedName);
  const [target, setTarget] = useState<string | null>("north");

  if (!name) {
    return (
      <Join
        onJoin={(chosen) => {
          try {
            localStorage.setItem(NAME_KEY, chosen);
          } catch {
            // The name still works for this tab.
          }
          setName(chosen);
        }}
      />
    );
  }

  return (
    <CopilotzChat
      userId={name}
      userName={name}
      baseUrl="/api"
      config={CONFIG}
      getRequestHeaders={() => ({ "x-compass-user": name })}
      agentOptions={TEAM}
      participantIds={TEAM_IDS}
      targetAgentId={target}
      onTargetAgentChange={setTarget}
      suggestions={[
        "North, what should we decide first?",
        "West, what is the real question here?",
        "East, what is the smallest version we could ship this week?",
        "South, check whether this claim holds: …",
      ]}
      onLogout={() => {
        try {
          localStorage.removeItem(NAME_KEY);
        } catch {
          // Nothing stored.
        }
        setName(null);
      }}
    />
  );
}

function Join({ onJoin }: { onJoin: (name: string) => void }) {
  const [value, setValue] = useState("");
  const trimmed = value.trim();
  return (
    <main className="join">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (trimmed) onJoin(trimmed);
        }}
      >
        <h1>Compass Mini</h1>
        <p>
          North, East, South and West work in shared rooms with everyone who
          joins. Pick a name to come in.
        </p>
        <input
          autoFocus
          maxLength={40}
          placeholder="Your name"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        <button type="submit" disabled={!trimmed}>Join</button>
        <small>Demo sign-in: anyone can use any name.</small>
      </form>
    </main>
  );
}
