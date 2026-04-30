export async function compressCaptureImage(fileOrBlob: Blob | File, maxWidth = 1920, quality = 0.8): Promise<Blob> {
  if (!fileOrBlob.type.startsWith("image/") || fileOrBlob.type === "image/svg+xml") return fileOrBlob;
  try {
    const bitmap = await createCaptureBitmap(fileOrBlob);
    try {
      const scale = bitmap.width > maxWidth ? maxWidth / bitmap.width : 1;
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) return fileOrBlob;
      context.drawImage(bitmap, 0, 0, width, height);
      const compressed = await canvasToBlob(canvas, quality);
      return compressed.size > 0 && compressed.size < fileOrBlob.size ? compressed : fileOrBlob;
    } finally {
      bitmap.close();
    }
  } catch {
    return fileOrBlob;
  }
}

export async function compressCaptureFile(file: File, maxWidth = 1920, quality = 0.8): Promise<File> {
  const compressed = await compressCaptureImage(file, maxWidth, quality);
  if (compressed === file) return file;
  return new File([compressed], normalizedJpegName(file.name), { type: "image/jpeg", lastModified: file.lastModified });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Image compression failed."));
    }, "image/jpeg", quality);
  });
}

async function createCaptureBitmap(fileOrBlob: Blob | File) {
  try {
    return await createImageBitmap(fileOrBlob, { imageOrientation: "from-image" });
  } catch {
    return createImageBitmap(fileOrBlob);
  }
}

function normalizedJpegName(name: string) {
  return name.replace(/\.[a-z0-9]+$/i, ".jpg") || "capture.jpg";
}
