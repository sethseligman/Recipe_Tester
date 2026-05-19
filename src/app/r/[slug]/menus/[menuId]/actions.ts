"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"

const nameSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
})

const createSectionSchema = nameSchema.extend({
  menuId: z.string().uuid(),
  slug: z.string().min(1),
})

const sectionIdSchema = z.object({
  sectionId: z.string().uuid(),
  slug: z.string().min(1),
  menuId: z.string().uuid(),
})

const renameSectionSchema = sectionIdSchema.extend({
  name: z.string().min(1, "Name is required").max(100),
})

const moveSectionSchema = sectionIdSchema.extend({
  direction: z.enum(["up", "down"]),
})

const createDishSchema = nameSchema.extend({
  sectionId: z.string().uuid(),
  slug: z.string().min(1),
  menuId: z.string().uuid(),
})

const dishIdSchema = z.object({
  dishId: z.string().uuid(),
  slug: z.string().min(1),
  menuId: z.string().uuid(),
})

const renameDishSchema = dishIdSchema.extend({
  name: z.string().min(1, "Name is required").max(100),
})

function menuDetailPath(slug: string, menuId: string) {
  return `/r/${slug}/menus/${menuId}`
}

function revalidateMenu(slug: string, menuId: string) {
  revalidatePath(menuDetailPath(slug, menuId))
  revalidatePath(`/r/${slug}`)
}

export async function createSection(
  input: z.infer<typeof createSectionSchema>
): Promise<{ error?: string }> {
  const parsed = createSectionSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const { menuId, name, slug } = parsed.data
  const supabase = await createClient()

  const { data: menu } = await supabase
    .from("menus")
    .select("restaurant_id")
    .eq("id", menuId)
    .single()

  if (!menu) {
    return { error: "Menu not found" }
  }

  const { data: maxRow } = await supabase
    .from("sections")
    .select("position")
    .eq("menu_id", menuId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextPosition = (maxRow?.position ?? -1) + 1

  const { error } = await supabase.from("sections").insert({
    menu_id: menuId,
    restaurant_id: menu.restaurant_id,
    name,
    position: nextPosition,
  })

  if (error) {
    throw error
  }

  revalidateMenu(slug, menuId)
  return {}
}

export async function renameSection(
  input: z.infer<typeof renameSectionSchema>
): Promise<{ error?: string }> {
  const parsed = renameSectionSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const { sectionId, name, slug, menuId } = parsed.data
  const supabase = await createClient()

  const { error } = await supabase
    .from("sections")
    .update({ name })
    .eq("id", sectionId)

  if (error) {
    throw error
  }

  revalidateMenu(slug, menuId)
  return {}
}

export async function deleteSection(
  input: z.infer<typeof sectionIdSchema>
): Promise<{ error?: string }> {
  const parsed = sectionIdSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const { sectionId, slug, menuId } = parsed.data
  const supabase = await createClient()

  const { error } = await supabase.from("sections").delete().eq("id", sectionId)

  if (error) {
    throw error
  }

  revalidateMenu(slug, menuId)
  return {}
}

export async function moveSection(
  input: z.infer<typeof moveSectionSchema>
): Promise<{ error?: string }> {
  const parsed = moveSectionSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const { sectionId, direction, slug, menuId } = parsed.data
  const supabase = await createClient()

  const { data: current } = await supabase
    .from("sections")
    .select("id, menu_id, position")
    .eq("id", sectionId)
    .single()

  if (!current) {
    return { error: "Section not found" }
  }

  const { data: sections } = await supabase
    .from("sections")
    .select("id, position")
    .eq("menu_id", current.menu_id)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true })

  if (!sections?.length) {
    return { error: "Section not found" }
  }

  const index = sections.findIndex((s) => s.id === sectionId)
  if (index < 0) {
    return { error: "Section not found" }
  }

  const neighborIndex = direction === "up" ? index - 1 : index + 1
  const neighbor = sections[neighborIndex]
  if (!neighbor) {
    return { error: "Cannot move section further" }
  }

  const { error: err1 } = await supabase
    .from("sections")
    .update({ position: neighbor.position })
    .eq("id", current.id)

  if (err1) {
    throw err1
  }

  const { error: err2 } = await supabase
    .from("sections")
    .update({ position: current.position })
    .eq("id", neighbor.id)

  if (err2) {
    throw err2
  }

  revalidateMenu(slug, menuId)
  return {}
}

export async function createDish(
  input: z.infer<typeof createDishSchema>
): Promise<{ error?: string }> {
  const parsed = createDishSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const { sectionId, name, slug, menuId } = parsed.data
  const supabase = await createClient()

  const { data: section } = await supabase
    .from("sections")
    .select("restaurant_id")
    .eq("id", sectionId)
    .single()

  if (!section) {
    return { error: "Section not found" }
  }

  const { data: maxRow } = await supabase
    .from("dishes")
    .select("position")
    .eq("section_id", sectionId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextPosition = (maxRow?.position ?? -1) + 1

  const { error } = await supabase.from("dishes").insert({
    section_id: sectionId,
    restaurant_id: section.restaurant_id,
    name,
    position: nextPosition,
  })

  if (error) {
    throw error
  }

  revalidatePath(menuDetailPath(slug, menuId))
  return {}
}

export async function renameDish(
  input: z.infer<typeof renameDishSchema>
): Promise<{ error?: string }> {
  const parsed = renameDishSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const { dishId, name, slug, menuId } = parsed.data
  const supabase = await createClient()

  const { error } = await supabase
    .from("dishes")
    .update({ name })
    .eq("id", dishId)

  if (error) {
    throw error
  }

  revalidatePath(menuDetailPath(slug, menuId))
  return {}
}

export async function archiveDish(
  input: z.infer<typeof dishIdSchema>
): Promise<{ error?: string }> {
  const parsed = dishIdSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const { dishId, slug, menuId } = parsed.data
  const supabase = await createClient()

  const { error } = await supabase
    .from("dishes")
    .update({ is_archived: true })
    .eq("id", dishId)

  if (error) {
    throw error
  }

  revalidatePath(menuDetailPath(slug, menuId))
  return {}
}
