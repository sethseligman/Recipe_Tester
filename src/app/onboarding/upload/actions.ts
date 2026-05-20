"use server"

import { redirect } from "next/navigation"
import { z } from "zod"

import { slugSchema } from "@/lib/slugify"
import { createClient } from "@/lib/supabase/server"

const MENU_UPLOAD_BUCKET = "menu-uploads"

const MAX_FILE_BYTES = 50 * 1024 * 1024

const allowedMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "text/plain",
])

const submitMenuUploadSchema = z.object({
  name: z.string().min(1, "Restaurant name is required").max(100),
  slug: slugSchema,
  source: z.enum(["file", "paste"]),
})

export async function submitMenuUpload(
  formData: FormData
): Promise<{ error?: string }> {
  const parsed = submitMenuUploadSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    source: formData.get("source"),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const { name, slug, source } = parsed.data

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "You must be signed in." }
  }

  const uploadId = crypto.randomUUID()
  let storagePath: string

  if (source === "file") {
    const file = formData.get("file")
    if (!(file instanceof File) || file.size === 0) {
      return { error: "Choose a PDF or image to upload." }
    }
    if (file.size > MAX_FILE_BYTES) {
      return { error: "File must be 50 MB or smaller." }
    }
    const mime =
      file.type ||
      (file.name.endsWith(".pdf") ? "application/pdf" : "application/octet-stream")
    if (!allowedMimeTypes.has(mime)) {
      return {
        error: "Upload a PDF or image (JPEG, PNG, WebP, or HEIC).",
      }
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120)
    storagePath = `${user.id}/${uploadId}/${safeName}`

    const { error: uploadError } = await supabase.storage
      .from(MENU_UPLOAD_BUCKET)
      .upload(storagePath, file, {
        contentType: mime,
        upsert: false,
      })

    if (uploadError) {
      if (uploadError.message.includes("Bucket not found")) {
        return {
          error:
            "Menu storage is not configured yet. Apply the menu-uploads migration or create the bucket in Supabase.",
        }
      }
      throw uploadError
    }
  } else {
    const pastedText = String(formData.get("pastedText") ?? "").trim()
    if (!pastedText) {
      return { error: "Paste your menu text or switch to file upload." }
    }

    storagePath = `${user.id}/${uploadId}/menu.txt`
    const { error: uploadError } = await supabase.storage
      .from(MENU_UPLOAD_BUCKET)
      .upload(storagePath, pastedText, {
        contentType: "text/plain",
        upsert: false,
      })

    if (uploadError) {
      if (uploadError.message.includes("Bucket not found")) {
        return {
          error:
            "Menu storage is not configured yet. Apply the menu-uploads migration or create the bucket in Supabase.",
        }
      }
      throw uploadError
    }
  }

  const params = new URLSearchParams({
    uploadId,
    storagePath,
    name,
    slug,
    source,
  })

  redirect(`/onboarding/review?${params.toString()}`)
}
