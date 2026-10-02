import { describe, expect, it } from "vitest";
import {
  chatThreadIdFor,
  chatViewerCanAccess,
  foldChatEvents,
  foldChatThread,
  isChatThreadId,
  newThreadView,
  sortThreadsByActivity,
  type ChatEvent,
  type ChatThreadSeed,
} from "@/lib/chat";

/**
 * The chat FOLD — the pure half of the durable thread store (`data/villa-admin-plan/
 * report.md` §9.6: "per-message state appended as events … never overwritten"). These run
 * without a filesystem, so the rules a store and a view share are pinned here rather than
 * through an HTTP round trip.
 */

const SEED: ChatThreadSeed = {
  id: "family-demo",
  kind: "family",
  participant_id: "demo-person",
  participant_name: "Marites",
  subject: "Santos family",
  created_at: "2026-10-01T00:00:00Z",
  messages: [
    {
      id: "m1",
      author: "participant",
      author_name: "Marites",
      body: "Here is the application.",
      at: "2026-10-01T01:00:00Z",
      state: "read",
      attachments: [],
    },
    {
      id: "m2",
      author: "office",
      author_name: "Ada",
      body: "Received.",
      at: "2026-10-01T02:00:00Z",
      state: "delivered",
      attachments: [
        { id: "a".repeat(64), name: "schedule.xlsx", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", size: 1000 },
      ],
    },
  ],
};

function posted(over: Partial<{ id: string; at: string; author: "office" | "participant" }> = {}): ChatEvent {
  return {
    kind: "message_posted",
    at: over.at ?? "2026-10-01T03:00:00Z",
    thread: SEED.id,
    state: "sent",
    message: {
      id: over.id ?? "m3",
      author: over.author ?? "participant",
      author_name: over.author === "office" ? "Ada" : "Marites",
      body: "Thank you!",
      at: over.at ?? "2026-10-01T03:00:00Z",
      attachments: [],
    },
  };
}

describe("foldChatEvents — append-only state", () => {
  it("projects the newest state and keeps every earlier one in the trail", () => {
    const events: ChatEvent[] = [
      posted(),
      { kind: "message_state", at: "2026-10-01T03:01:00Z", thread: SEED.id, message_id: "m3", state: "delivered" },
      { kind: "message_state", at: "2026-10-01T03:02:00Z", thread: SEED.id, message_id: "m3", state: "read" },
    ];
    const fold = foldChatEvents(events);
    expect(fold.messages.map((m) => m.id)).toEqual(["m3"]);
    expect(fold.states.m3).toBe("read");
    // Never overwritten: the sending → sent → delivered → read history stays.
    expect(fold.trails.m3).toEqual(["sent", "delivered", "read"]);
  });

  it("remembers a thread opened without a seed record", () => {
    const events: ChatEvent[] = [
      {
        kind: "thread_opened",
        at: "2026-10-02T00:00:00Z",
        thread: "family-new",
        open: {
          kind: "family",
          participant_id: "new-person",
          participant_name: "New Family",
          subject: "New Family",
        },
      },
    ];
    expect(foldChatEvents(events).opened).toMatchObject({
      kind: "family",
      participant_id: "new-person",
      subject: "New Family",
      created_at: "2026-10-02T00:00:00Z",
    });
  });
});

describe("foldChatThread — seed + journal into one view", () => {
  it("merges seed and journal in time order and applies a journal state to a seed message", () => {
    const events: ChatEvent[] = [
      { kind: "message_state", at: "2026-10-01T02:05:00Z", thread: SEED.id, message_id: "m2", state: "read" },
      posted(),
    ];
    const view = foldChatThread(SEED, events);
    expect(view.messages.map((m) => m.id)).toEqual(["m1", "m2", "m3"]);
    expect(view.messages.find((m) => m.id === "m2")?.state).toBe("read");
    expect(view.messages.find((m) => m.id === "m2")?.state_trail).toEqual(["delivered", "read"]);
    expect(view.message_count).toBe(3);
  });

  it("counts unread per side and totals the attachments", () => {
    const view = foldChatThread(SEED, [posted()]);
    // m1 is read; the new m3 is a participant message still unread by the office.
    expect(view.unread_for_office).toBe(1);
    // m2 (office) is delivered — read by the family? delivered counts as unread.
    expect(view.unread_for_participant).toBe(1);
    expect(view.attachment_count).toBe(1);
    expect(view.attachment_bytes).toBe(1000);
    expect(view.last_message_preview).toBe("Thank you!");
    expect(view.last_message_author).toBe("participant");
  });

  it("previews an attachment-only message by its file", () => {
    const view = foldChatThread(SEED, [
      {
        kind: "message_posted",
        at: "2026-10-01T04:00:00Z",
        thread: SEED.id,
        state: "sent",
        message: {
          id: "m4",
          author: "office",
          author_name: "Ada",
          body: "",
          at: "2026-10-01T04:00:00Z",
          attachments: [{ id: "b".repeat(64), name: "id.png", mime: "image/png", size: 12 }],
        },
      },
    ]);
    expect(view.last_message_preview).toBe("Sent id.png");
  });

  it("builds an empty thread for a brand-new conversation", () => {
    const view = newThreadView({
      id: "agent-new",
      kind: "agent",
      participant_id: "new-agent",
      participant_name: "New Agent",
      subject: "New Agent",
      created_at: "2026-10-02T00:00:00Z",
    });
    expect(view.messages).toEqual([]);
    expect(view.message_count).toBe(0);
    expect(view.last_message_at).toBeNull();
    expect(view.last_message_preview).toBe("No messages yet");
  });
});

describe("thread ids and access", () => {
  it("derives a filename-safe id and refuses a path-shaped one", () => {
    expect(chatThreadIdFor("family", "00000000-0000-4000-8000-000000000014")).toBe(
      "family-00000000-0000-4000-8000-000000000014",
    );
    expect(isChatThreadId("family-abc-123")).toBe(true);
    expect(isChatThreadId("../evil")).toBe(false);
    expect(isChatThreadId("Family_ABC")).toBe(false);
  });

  it("lets the office read every thread and a participant only their own", () => {
    const view = foldChatThread(SEED, []);
    expect(chatViewerCanAccess(view, { role: "office" })).toBe(true);
    expect(chatViewerCanAccess(view, { role: "family", userId: "demo-person" })).toBe(true);
    expect(chatViewerCanAccess(view, { role: "family", userId: "someone-else" })).toBe(false);
    // An agent cannot open a family thread even when the id matches.
    expect(chatViewerCanAccess(view, { role: "agent", agentId: "demo-person" })).toBe(false);
  });
});

describe("sortThreadsByActivity", () => {
  it("puts the newest conversation first", () => {
    const a = foldChatThread({ ...SEED, id: "a", subject: "A" }, []);
    const b = foldChatThread(
      {
        ...SEED,
        id: "b",
        subject: "B",
        messages: [
          {
            id: "b1",
            author: "participant",
            author_name: "Marites",
            body: "Later",
            at: "2026-10-02T05:00:00Z",
            state: "read",
            attachments: [],
          },
        ],
      },
      [],
    );
    expect(sortThreadsByActivity([a, b]).map((t) => t.id)).toEqual(["b", "a"]);
  });
});
