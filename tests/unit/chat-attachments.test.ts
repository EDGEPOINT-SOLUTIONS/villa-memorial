import { describe, expect, it } from "vitest";
import {
  CHAT_ATTACHMENT_MAX_BYTES,
  CHAT_THREAD_ATTACHMENT_MAX_BYTES,
  chatAttachmentExtension,
  chatAttachmentMime,
  chatAttachmentRefusal,
  chatThreadTotalIssue,
  formatChatBytes,
  threadAttachmentBytes,
} from "@/lib/chat-attachments";

/**
 * The attachment ALLOW-LIST and the two size rules — the pure functions the composer and
 * the store share. A refused file has to explain itself in the same words in both places,
 * which is why the rule (not the route) owns the sentence.
 */

const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

describe("chatAttachmentMime — the allow-list", () => {
  it("accepts the board's five families", () => {
    expect(chatAttachmentMime("a.pdf", "application/pdf")).toBe("application/pdf");
    expect(chatAttachmentMime("a.xlsx", XLSX)).toBe(XLSX);
    expect(chatAttachmentMime("a.docx", DOCX)).toBe(DOCX);
    expect(chatAttachmentMime("a.png", "image/png")).toBe("image/png");
    expect(chatAttachmentMime("a.jpg", "image/jpeg")).toBe("image/jpeg");
    expect(chatAttachmentMime("a.JPEG", "image/jpeg")).toBe("image/jpeg");
    expect(chatAttachmentMime("a.webp", "image/webp")).toBe("image/webp");
  });

  it("trusts the extension for a generic phone content type", () => {
    expect(chatAttachmentMime("scan.pdf", "application/octet-stream")).toBe("application/pdf");
    expect(chatAttachmentMime("scan.pdf", "")).toBe("application/pdf");
  });

  it("refuses an extension off the list and a type that does not match", () => {
    expect(chatAttachmentMime("a.exe", "application/octet-stream")).toBeNull();
    expect(chatAttachmentMime("a.txt", "text/plain")).toBeNull();
    expect(chatAttachmentMime("noextension", "application/pdf")).toBeNull();
    // A .pdf that claims to be an image is refused; the extension decides the family.
    expect(chatAttachmentMime("a.pdf", "image/png")).toBeNull();
  });

  it("reads the lower-cased extension", () => {
    expect(chatAttachmentExtension("Report.Final.docx")).toBe("docx");
    expect(chatAttachmentExtension("noext")).toBeNull();
  });
});

describe("chatAttachmentRefusal — one sentence per refusal", () => {
  it("passes a well-typed file at the limit", () => {
    expect(
      chatAttachmentRefusal({
        name: "a.pdf",
        mime: "application/pdf",
        size: CHAT_ATTACHMENT_MAX_BYTES,
      }),
    ).toBeNull();
  });

  it("names an unsupported file and what this place takes", () => {
    const message = chatAttachmentRefusal({ name: "virus.exe", mime: null, size: 10 });
    expect(message).toContain("virus.exe");
    expect(message).toContain("docx");
  });

  it("names the file and the cap when it is too large", () => {
    const message = chatAttachmentRefusal({
      name: "big.pdf",
      mime: "application/pdf",
      size: CHAT_ATTACHMENT_MAX_BYTES + 1,
    });
    expect(message).toContain("big.pdf");
    expect(message).toContain("10.0 MB");
  });

  it("refuses an empty file", () => {
    expect(
      chatAttachmentRefusal({ name: "empty.pdf", mime: "application/pdf", size: 0 }),
    ).toContain("empty");
  });

  it("refuses a thread that is over its total", () => {
    expect(chatThreadTotalIssue(CHAT_THREAD_ATTACHMENT_MAX_BYTES)).toBeNull();
    expect(chatThreadTotalIssue(CHAT_THREAD_ATTACHMENT_MAX_BYTES + 1)).toContain("50.0 MB");
  });
});

describe("formatChatBytes and threadAttachmentBytes", () => {
  it("formats bytes the same way everywhere", () => {
    expect(formatChatBytes(615)).toBe("615 B");
    expect(formatChatBytes(24 * 1024)).toBe("24 KB");
    expect(formatChatBytes(1.2 * 1024 * 1024)).toBe("1.2 MB");
  });

  it("sums every attachment on a thread", () => {
    const total = threadAttachmentBytes([
      { attachments: [{ size: 100 }, { size: 200 }] },
      { attachments: [{ size: 300 }] },
      { attachments: [] },
    ]);
    expect(total).toBe(600);
  });
});
