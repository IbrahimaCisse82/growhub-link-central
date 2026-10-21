import { beforeEach, describe, expect, it, vi } from "vitest";

const createSignedUrl = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { storage: { from: () => ({ createSignedUrl }) } },
}));

import { extractPathFromUrl, isPrivateBucket, resolveStorageUrl } from "@/lib/storageSignedUrl";

const OLD_PUBLIC = "https://abc.supabase.co/storage/v1/object/public/message-attachments/u1/1700-photo.png";

describe("storageSignedUrl", () => {
  beforeEach(() => {
    createSignedUrl.mockReset();
    createSignedUrl.mockResolvedValue({ data: { signedUrl: "https://signed/ok" }, error: null });
  });

  it("traite les pièces jointes et les ressources comme privées", () => {
    expect(isPrivateBucket("message-attachments")).toBe(true);
    expect(isPrivateBucket("resources")).toBe(true);
    expect(isPrivateBucket("avatars")).toBe(false);
  });

  it("extrait le chemin d'une ancienne URL publique", () => {
    expect(extractPathFromUrl("message-attachments", OLD_PUBLIC)).toBe("u1/1700-photo.png");
    expect(extractPathFromUrl("resources", "https://abc.supabase.co/storage/v1/object/public/resources/resources/17.pdf")).toBe("resources/17.pdf");
  });

  it("signe un chemin et une ancienne URL publique", async () => {
    await expect(resolveStorageUrl("message-attachments", OLD_PUBLIC)).resolves.toBe("https://signed/ok");
    expect(createSignedUrl).toHaveBeenCalledWith("u1/1700-photo.png", 3600);
    await expect(resolveStorageUrl("resources", "resources/17.pdf")).resolves.toBe("https://signed/ok");
  });

  it("ouvre tel quel un lien externe saisi à la main", async () => {
    await expect(resolveStorageUrl("resources", "https://exemple.org/guide.pdf")).resolves.toBe("https://exemple.org/guide.pdf");
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it("renvoie null si la signature est refusée", async () => {
    createSignedUrl.mockResolvedValue({ data: null, error: new Error("denied") });
    await expect(resolveStorageUrl("resources", "resources/17.pdf")).resolves.toBeNull();
  });
});
