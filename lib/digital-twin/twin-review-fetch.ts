import type { SlateDropPickerFile } from "@/lib/slatedrop/file-picker-types";

export async function fetchSlateDropFileAsBlob(pickerFile: SlateDropPickerFile): Promise<File> {
  const response = await fetch(
    `/api/slatedrop/download?fileId=${encodeURIComponent(pickerFile.id)}`,
    { cache: "no-store" },
  );
  if (!response.ok) throw new Error(`Could not load ${pickerFile.name} from SlateDrop`);
  const blob = await response.blob();
  return new File([blob], pickerFile.name, {
    type: pickerFile.type || blob.type || "application/octet-stream",
  });
}
