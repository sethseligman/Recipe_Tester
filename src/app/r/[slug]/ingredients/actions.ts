"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { findNearMatches } from "@/lib/ingredients/near-match"
import { createClient } from "@/lib/supabase/server"

const ingredientFieldsSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z
    .string()
    .max(500, "Description must be 500 characters or less"),
})

const createIngredientSchema = ingredientFieldsSchema.extend({
  restaurantId: z.string().uuid(),
  slug: z.string().min(1),
  confirmCreate: z.boolean().optional(),
})

const updateIngredientSchema = ingredientFieldsSchema.extend({
  ingredientId: z.string().uuid(),
  slug: z.string().min(1),
  confirmCreate: z.boolean().optional(),
})

const deleteIngredientSchema = z.object({
  ingredientId: z.string().uuid(),
  slug: z.string().min(1),
})

export type IngredientMatch = { id: string; name: string }

export type IngredientFormData = {
  name: string
  description: string
}

function ingredientsPath(slug: string) {
  return `/r/${slug}/ingredients`
}

function normalizeDescription(description: string): string | null {
  const trimmed = description.trim()
  return trimmed.length > 0 ? trimmed : null
}

function isUniqueViolation(error: { code?: string }): boolean {
  return error.code === "23505"
}

async function loadRestaurantIngredients(restaurantId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("ingredients")
    .select("id, name, name_normalized")
    .eq("restaurant_id", restaurantId)

  if (error) {
    throw error
  }

  return data ?? []
}

export async function createIngredient(
  input: z.infer<typeof createIngredientSchema>
): Promise<
  | { error: string }
  | { warning: { matches: IngredientMatch[] }; formData: IngredientFormData }
  | { id: string; name: string }
> {
  const parsed = createIngredientSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const { restaurantId, name, description, slug, confirmCreate } = parsed.data
  const formData: IngredientFormData = { name, description }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "You must be signed in." }
  }

  if (!confirmCreate) {
    const allIngredients = await loadRestaurantIngredients(restaurantId)
    const matches = findNearMatches(allIngredients, name).map(({ id, name: matchName }) => ({
      id,
      name: matchName,
    }))
    if (matches.length > 0) {
      return { warning: { matches }, formData }
    }
  }

  const { data, error } = await supabase
    .from("ingredients")
    .insert({
      restaurant_id: restaurantId,
      name: name.trim(),
      description: normalizeDescription(description),
      created_by: user.id,
    })
    .select("id, name")
    .single()

  if (error) {
    if (isUniqueViolation(error)) {
      return { error: "An ingredient with this name already exists." }
    }
    throw error
  }

  revalidatePath(ingredientsPath(slug))
  return { id: data.id, name: data.name }
}

export async function updateIngredient(
  input: z.infer<typeof updateIngredientSchema>
): Promise<
  | { error: string }
  | { warning: { matches: IngredientMatch[] }; formData: IngredientFormData }
  | Record<string, never>
> {
  const parsed = updateIngredientSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const { ingredientId, name, description, slug, confirmCreate } = parsed.data
  const formData: IngredientFormData = { name, description }

  const supabase = await createClient()
  const { data: existing, error: existingError } = await supabase
    .from("ingredients")
    .select("restaurant_id")
    .eq("id", ingredientId)
    .single()

  if (existingError || !existing) {
    return { error: "Ingredient not found." }
  }

  if (!confirmCreate) {
    const allIngredients = await loadRestaurantIngredients(existing.restaurant_id)
    const matches = findNearMatches(allIngredients, name, ingredientId).map(
      ({ id, name: matchName }) => ({
        id,
        name: matchName,
      })
    )
    if (matches.length > 0) {
      return { warning: { matches }, formData }
    }
  }

  const { error } = await supabase
    .from("ingredients")
    .update({
      name: name.trim(),
      description: normalizeDescription(description),
    })
    .eq("id", ingredientId)

  if (error) {
    if (isUniqueViolation(error)) {
      return { error: "An ingredient with this name already exists." }
    }
    throw error
  }

  revalidatePath(ingredientsPath(slug))
  return {}
}

export async function deleteIngredient(
  input: z.infer<typeof deleteIngredientSchema>
): Promise<{ error?: string; usageCount?: number }> {
  const parsed = deleteIngredientSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const { ingredientId, slug } = parsed.data
  const supabase = await createClient()

  const { data: existing, error: existingError } = await supabase
    .from("ingredients")
    .select("restaurant_id, name")
    .eq("id", ingredientId)
    .single()

  if (existingError || !existing) {
    return { error: "Ingredient not found." }
  }

  const { count, error: countError } = await supabase
    .from("recipe_ingredients")
    .select("*", { count: "exact", head: true })
    .eq("ingredient_id", ingredientId)

  if (countError) {
    throw countError
  }

  if ((count ?? 0) > 0) {
    return { error: "in_use", usageCount: count ?? 0 }
  }

  const { error } = await supabase
    .from("ingredients")
    .delete()
    .eq("id", ingredientId)

  if (error) {
    throw error
  }

  revalidatePath(ingredientsPath(slug))
  return {}
}
