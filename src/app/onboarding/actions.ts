"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"

const createRestaurantSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  slug: z
    .string()
    .min(1, "URL slug is required")
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers, and hyphens only"),
})

export type CreateRestaurantInput = z.infer<typeof createRestaurantSchema>

export async function createRestaurant(
  input: CreateRestaurantInput
): Promise<{ error?: string }> {
  const parsed = createRestaurantSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("Not authenticated")
  }

  const { name, slug } = parsed.data

  const { error } = await supabase.from("restaurants").insert({
    name,
    slug,
    created_by: user.id,
  })

  if (error) {
    if (error.code === "23505") {
      return { error: "That URL is already taken." }
    }
    throw error
  }

  revalidatePath("/")
  redirect(`/r/${slug}`)
}
