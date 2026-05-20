"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"

const componentFieldsSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z
    .string()
    .max(500, "Description must be 500 characters or less"),
})

const createComponentSchema = componentFieldsSchema.extend({
  restaurantId: z.string().uuid(),
  slug: z.string().min(1),
})

const componentIdSchema = z.object({
  componentId: z.string().uuid(),
  slug: z.string().min(1),
})

const updateComponentSchema = componentIdSchema.merge(componentFieldsSchema)

function componentsPath(slug: string) {
  return `/r/${slug}/components`
}

function componentDetailPath(slug: string, componentId: string) {
  return `/r/${slug}/components/${componentId}`
}

function normalizeDescription(description: string): string | null {
  const trimmed = description.trim()
  return trimmed.length > 0 ? trimmed : null
}

export async function createComponent(
  input: z.infer<typeof createComponentSchema>
): Promise<{ error?: string; componentId?: string }> {
  const parsed = createComponentSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const { restaurantId, name, description, slug } = parsed.data
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("components")
    .insert({
      restaurant_id: restaurantId,
      name,
      description: normalizeDescription(description),
    })
    .select("id")
    .single()

  if (error) {
    throw error
  }

  revalidatePath(componentsPath(slug))
  return { componentId: data.id }
}

export async function updateComponent(
  input: z.infer<typeof updateComponentSchema>
): Promise<{ error?: string }> {
  const parsed = updateComponentSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const { componentId, name, description, slug } = parsed.data
  const supabase = await createClient()

  const { error } = await supabase
    .from("components")
    .update({
      name,
      description: normalizeDescription(description),
    })
    .eq("id", componentId)

  if (error) {
    throw error
  }

  revalidatePath(componentsPath(slug))
  revalidatePath(componentDetailPath(slug, componentId))
  return {}
}

export async function archiveComponent(
  input: z.infer<typeof componentIdSchema>
): Promise<{ error?: string }> {
  const parsed = componentIdSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const { componentId, slug } = parsed.data
  const supabase = await createClient()

  const { error } = await supabase
    .from("components")
    .update({ is_archived: true })
    .eq("id", componentId)

  if (error) {
    throw error
  }

  revalidatePath(componentsPath(slug))
  revalidatePath(componentDetailPath(slug, componentId))
  return {}
}
