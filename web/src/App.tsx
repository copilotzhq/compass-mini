import { useState } from "react";
import { CopilotzChat } from "@copilotz/chat-adapter";
import type { AgentOption } from "@copilotz/chat-ui";

const TEAM: AgentOption[] = [
  {
    id: "north",
    name: "North",
    description: "Holds the destination. Owns the decision.",
    color: "#19f0e4",
  },
  {
    id: "east",
    name: "East",
    description: "Builds the smallest real version.",
    color: "#ffb547",
  },
  {
    id: "south",
    name: "South",
    description: "Takes every claim to reality.",
    color: "#ff5f7e",
  },
  {
    id: "west",
    name: "West",
    description: "Finds the question it turns on.",
    color: "#9d8cff",
  },
];
const TEAM_IDS = TEAM.map((agent) => agent.id);
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
