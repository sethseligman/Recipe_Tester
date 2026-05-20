const IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
])

function mimeFromPath(path: string): string {
  const lower = path.toLowerCase()
  if (lower.endsWith(".pdf")) return "application/pdf"
  if (lower.endsWith(".png")) return "image/png"
  if (lower.endsWith(".webp")) return "image/webp"
  if (lower.endsWith(".heic")) return "image/heic"
  if (lower.endsWith(".txt")) return "text/plain"
  return "image/jpeg"
}

export type MenuSourceKind = "text" | "pdf" | "image"

export function classifyMenuSource(
  storagePath: string,
  sourceHint?: string
): MenuSourceKind {
  if (sourceHint === "paste" || storagePath.endsWith(".txt")) {
    return "text"
  }
  const mime = mimeFromPath(storagePath)
  if (mime === "application/pdf") return "pdf"
  if (IMAGE_MIME.has(mime)) return "image"
  return "text"
}

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse")
  const parser = new PDFParse({ data: buffer })
  try {
    const result = await parser.getText()
    const text = result.text?.trim() ?? ""
    if (!text) {
      throw new Error(
        "Could not extract text from this PDF. Try a photo or paste the menu text."
      )
    }
    return text
  } finally {
    await parser.destroy()
  }
}

export async function loadMenuBytes(
  download: () => Promise<{ data: Blob | null; error: Error | null }>
): Promise<{ buffer: Buffer; mime: string; path: string }> {
  const { data, error } = await download()
  if (error || !data) {
    throw new Error("Could not read your uploaded menu.")
  }
  const arrayBuffer = await data.arrayBuffer()
  return {
    buffer: Buffer.from(arrayBuffer),
    mime: data.type || "application/octet-stream",
    path: "",
  }
}

export function isImageMime(mime: string): boolean {
  return IMAGE_MIME.has(mime) || mime.startsWith("image/")
}
