import JSZip from "jszip";
import type { ObsidianVault } from "@/lib/obsidian-vault";

export async function downloadObsidianVault(vault: ObsidianVault): Promise<void> {
  const zip = new JSZip();

  for (const file of vault.files) {
    zip.file(file.path, file.content);
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${vault.vaultName}.zip`;
  anchor.click();
  URL.revokeObjectURL(url);
}
