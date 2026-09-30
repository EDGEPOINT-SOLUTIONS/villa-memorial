import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  familyImageDir,
  familyImageUrl,
  isFamilyImageSlot,
  readFamilyImage,
  removeFamilyImage,
  writeFamilyImage,
} from "@/lib/family-image-store";

/**
 * The private family image store (plan §6.9, D10).
 *
 * The account picture and the Remembering portrait are private data under the
 * Data Privacy Act, so they can never sit in the public media store. This guard
 * pins the store's own rules: a picture is written and read under ONE user's key,
 * a stranger's read returns null, an unsupported type or an empty body is
 * refused, and removing a picture really removes it.
 */
let dir: string;
const OWNER = "00000000-0000-4000-8000-0000000000aa";
const STRANGER = "00000000-0000-4000-8000-0000000000bb";

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "family-images-"));
  process.env.FAMILY_IMAGE_DIR = dir;
});

afterEach(async () => {
  delete process.env.FAMILY_IMAGE_DIR;
  await fs.rm(dir, { recursive: true, force: true });
});

describe("the family image store", () => {
  it("honours FAMILY_IMAGE_DIR and recognises only the two slots", () => {
    expect(familyImageDir()).toBe(dir);
    expect(isFamilyImageSlot("avatar")).toBe(true);
    expect(isFamilyImageSlot("portrait")).toBe(true);
    expect(isFamilyImageSlot("other")).toBe(false);
  });

  it("writes and reads a picture under the owner's own key", async () => {
    const bytes = Buffer.from([0xff, 0xd8, 0xff, 0xdb]);
    const { updated_at } = await writeFamilyImage(OWNER, "portrait", bytes, "image/jpeg");
    expect(updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    const stored = await readFamilyImage(OWNER, "portrait");
    expect(stored).not.toBeNull();
    expect(stored!.mime).toBe("image/jpeg");
    expect(stored!.size).toBe(bytes.byteLength);
    expect(await fs.readFile(stored!.path)).toEqual(bytes);
    expect(familyImageUrl("portrait", stored!.updated_at)).toContain("?v=");
  });

  it("never lets another family read the picture", async () => {
    await writeFamilyImage(OWNER, "avatar", Buffer.from([1, 2, 3, 4]), "image/png");
    expect(await readFamilyImage(STRANGER, "avatar")).toBeNull();
  });

  it("refuses an unsupported type and an empty body", async () => {
    await expect(
      writeFamilyImage(OWNER, "avatar", Buffer.from([1]), "application/pdf"),
    ).rejects.toThrow();
    await expect(writeFamilyImage(OWNER, "avatar", Buffer.alloc(0), "image/png")).rejects.toThrow();
  });

  it("replaces a picture without leaving the old file behind", async () => {
    const first = await writeFamilyImage(OWNER, "avatar", Buffer.from([1, 2, 3]), "image/png");
    const firstPath = (await readFamilyImage(OWNER, "avatar"))!.path;
    const second = await writeFamilyImage(OWNER, "avatar", Buffer.from([9, 9]), "image/jpeg");
    expect(first.updated_at).not.toBe(second.updated_at);
    const stored = await readFamilyImage(OWNER, "avatar");
    expect(stored!.mime).toBe("image/jpeg");
    await expect(fs.stat(firstPath)).rejects.toThrow();
  });

  it("removes a picture on request", async () => {
    await writeFamilyImage(OWNER, "portrait", Buffer.from([5, 5, 5]), "image/webp");
    expect(await removeFamilyImage(OWNER, "portrait")).toBe(true);
    expect(await readFamilyImage(OWNER, "portrait")).toBeNull();
    expect(await removeFamilyImage(OWNER, "portrait")).toBe(false);
  });
});
