import {
  classifyMenuSource,
  extractTextFromPdf,
  isImageMime,
} from "@/lib/menu-parse/extract-text"
import {
  parseMenuFromImage,
  parseMenuFromText,
} from "@/lib/menu-parse/parse-menu"
import type { ParsedMenuTree } from "@/lib/menu-parse/types"

const MENU_UPLOAD_BUCKET = "menu-uploads"

export async function parseMenuFromStorage(
  supabase: {
    storage: {
      from: (bucket: string) => {
        download: (path: string) => Promise<{
          data: Blob | null
          error: { message: string } | null
        }>
      }
    }
  },
  storagePath: string,
  sourceHint?: string
): Promise<ParsedMenuTree> {
  const { data, error } = await supabase.storage
    .from(MENU_UPLOAD_BUCKET)
    .download(storagePath)

  if (error || !data) {
    throw new Error("Could not read your uploaded menu.")
  }

  const buffer = Buffer.from(await data.arrayBuffer())
  const mime = data.type || "application/octet-stream"
  const kind = classifyMenuSource(storagePath, sourceHint)

  if (kind === "text") {
    return parseMenuFromText(buffer.toString("utf-8"))
  }

  if (kind === "pdf") {
    const text = await extractTextFromPdf(buffer)
    return parseMenuFromText(text)
  }

  if (kind === "image" || isImageMime(mime)) {
    return parseMenuFromImage(buffer, mime)
  }

  return parseMenuFromText(buffer.toString("utf-8"))
}
