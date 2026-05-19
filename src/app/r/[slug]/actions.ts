"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"

const menuNameSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
})

const createMenuSchema = menuNameSchema.extend({
  restaurantId: z.string().uuid(),
  slug: z.string().min(1),
})

const menuIdSchema = z.object({
  menuId: z.string().uuid(),
  slug: z.string().min(1),
})

const renameMenuSchema = menuIdSchema.extend({
  name: z.string().min(1, "Name is required").max(100),
})

export async function createMenu(
  input: z.infer<typeof createMenuSchema>
): Promise<{ error?: string; menuId?: string }> {
  const parsed = createMenuSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const { restaurantId, name, slug } = parsed.data
  const supabase = await createClient()

  const { data: maxRow } = await supabase
    .from("menus")
    .select("position")
    .eq("restaurant_id", restaurantId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextPosition = (maxRow?.position ?? -1) + 1

  const { data, error } = await supabase
    .from("menus")
    .insert({
      restaurant_id: restaurantId,
      name,
      position: nextPosition,
    })
    .select("id")
    .single()

  if (error) {
    throw error
  }

  revalidatePath(`/r/${slug}`)
  return { menuId: data.id }
}

export async function renameMenu(
  input: z.infer<typeof renameMenuSchema>
): Promise<{ error?: string }> {
  const parsed = renameMenuSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const { menuId, name, slug } = parsed.data
  const supabase = await createClient()

  const { error } = await supabase
    .from("menus")
    .update({ name })
    .eq("id", menuId)

  if (error) {
    throw error
  }

  revalidatePath(`/r/${slug}`)
  revalidatePath(`/r/${slug}/menus/${menuId}`)
  return {}
}

export async function archiveMenu(
  input: z.infer<typeof menuIdSchema>
): Promise<{ error?: string }> {
  const parsed = menuIdSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const { menuId, slug } = parsed.data
  const supabase = await createClient()

  const { error } = await supabase
    .from("menus")
    .update({ is_archived: true })
    .eq("id", menuId)

  if (error) {
    throw error
  }

  revalidatePath(`/r/${slug}`)
  return {}
}
