"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"

const updateDishDescriptionSchema = z.object({
  dishId: z.string().uuid(),
  slug: z.string().min(1),
  menuId: z.string().uuid(),
  menuDescription: z.string().max(500, "Description must be 500 characters or less"),
})

function dishDetailPath(slug: string, menuId: string, dishId: string) {
  return `/r/${slug}/menus/${menuId}/dishes/${dishId}`
}

function menuDetailPath(slug: string, menuId: string) {
  return `/r/${slug}/menus/${menuId}`
}

export async function updateDishDescription(
  input: z.infer<typeof updateDishDescriptionSchema>
): Promise<{ error?: string }> {
  const parsed = updateDishDescriptionSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const { dishId, menuDescription, slug, menuId } = parsed.data
  const supabase = await createClient()

  const trimmed = menuDescription.trim()
  const { error } = await supabase
    .from("dishes")
    .update({ menu_description: trimmed.length > 0 ? trimmed : null })
    .eq("id", dishId)

  if (error) {
    throw error
  }

  revalidatePath(dishDetailPath(slug, menuId, dishId))
  revalidatePath(menuDetailPath(slug, menuId))
  return {}
}

const dishRouteSchema = z.object({
  dishId: z.string().uuid(),
  slug: z.string().min(1),
  menuId: z.string().uuid(),
})

const linkDishComponentSchema = dishRouteSchema.extend({
  componentId: z.string().uuid(),
  role: z
    .string()
    .max(50, "Role must be 50 characters or less")
    .optional()
    .nullable(),
})

const dishComponentIdSchema = dishRouteSchema.extend({
  dishComponentId: z.string().uuid(),
})

const updateDishComponentRoleSchema = dishComponentIdSchema.extend({
  role: z
    .string()
    .max(50, "Role must be 50 characters or less")
    .optional()
    .nullable(),
})

function revalidateDishRoutes(slug: string, menuId: string, dishId: string) {
  revalidatePath(dishDetailPath(slug, menuId, dishId))
  revalidatePath(menuDetailPath(slug, menuId))
}

export async function linkDishComponent(
  input: z.infer<typeof linkDishComponentSchema>
): Promise<{ error?: string }> {
  const parsed = linkDishComponentSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const { dishId, componentId, role, slug, menuId } = parsed.data
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from("dish_components")
    .select("id")
    .eq("dish_id", dishId)
    .eq("component_id", componentId)
    .maybeSingle()

  if (existing) {
    return { error: "This component is already linked to this dish." }
  }

  const { data: dish } = await supabase
    .from("dishes")
    .select("restaurant_id")
    .eq("id", dishId)
    .single()

  if (!dish) {
    return { error: "Dish not found" }
  }

  const { data: maxRow } = await supabase
    .from("dish_components")
    .select("position")
    .eq("dish_id", dishId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextPosition = (maxRow?.position ?? -1) + 1
  const trimmedRole = role?.trim()

  const { error } = await supabase.from("dish_components").insert({
    dish_id: dishId,
    component_id: componentId,
    restaurant_id: dish.restaurant_id,
    role: trimmedRole && trimmedRole.length > 0 ? trimmedRole : null,
    position: nextPosition,
  })

  if (error) {
    throw error
  }

  revalidateDishRoutes(slug, menuId, dishId)
  return {}
}

export async function unlinkDishComponent(
  input: z.infer<typeof dishComponentIdSchema>
): Promise<{ error?: string }> {
  const parsed = dishComponentIdSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const { dishComponentId, dishId, slug, menuId } = parsed.data
  const supabase = await createClient()

  const { error } = await supabase
    .from("dish_components")
    .delete()
    .eq("id", dishComponentId)
    .eq("dish_id", dishId)

  if (error) {
    throw error
  }

  revalidateDishRoutes(slug, menuId, dishId)
  return {}
}

export async function updateDishComponentRole(
  input: z.infer<typeof updateDishComponentRoleSchema>
): Promise<{ error?: string }> {
  const parsed = updateDishComponentRoleSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const { dishComponentId, dishId, role, slug, menuId } = parsed.data
  const supabase = await createClient()
  const trimmedRole = role?.trim()

  const { error } = await supabase
    .from("dish_components")
    .update({
      role: trimmedRole && trimmedRole.length > 0 ? trimmedRole : null,
    })
    .eq("id", dishComponentId)
    .eq("dish_id", dishId)

  if (error) {
    throw error
  }

  revalidateDishRoutes(slug, menuId, dishId)
  return {}
}
