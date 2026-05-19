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
