"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import { parseMenuFromStorage } from "@/lib/menu-parse/parse-from-storage"
import {
  parsedMenuTreeSchema,
  treeToDraft,
  type DraftMenuTree,
} from "@/lib/menu-parse/types"
import { slugSchema } from "@/lib/slugify"
import { createClient } from "@/lib/supabase/server"

const parseInputSchema = z.object({
  storagePath: z.string().min(1),
  source: z.enum(["file", "paste"]).optional(),
})

const confirmInputSchema = z.object({
  name: z.string().min(1).max(100),
  slug: slugSchema,
  tree: parsedMenuTreeSchema,
})

function formatDbError(error: { message: string; hint?: string | null; code?: string }) {
  const hint = error.hint ? ` (${error.hint})` : ""
  return `${error.message}${hint}`
}

async function assertUploadAccess(storagePath: string): Promise<
  | { error: string }
  | { userId: string }
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "You must be signed in." }
  }

  if (!storagePath.startsWith(`${user.id}/`)) {
    return { error: "Invalid upload." }
  }

  return { userId: user.id }
}

export async function parseUploadedMenu(
  input: z.infer<typeof parseInputSchema>
): Promise<{ error?: string; tree?: DraftMenuTree }> {
  const parsed = parseInputSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const access = await assertUploadAccess(parsed.data.storagePath)
  if ("error" in access) {
    return { error: access.error }
  }

  const supabase = await createClient()

  try {
    const tree = await parseMenuFromStorage(
      supabase,
      parsed.data.storagePath,
      parsed.data.source
    )
    return { tree: treeToDraft(tree) }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not parse menu."
    return { error: message }
  }
}

export async function confirmMenuImport(
  input: z.infer<typeof confirmInputSchema>
): Promise<{ error?: string }> {
  const parsed = confirmInputSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid menu data" }
  }

  const { name, slug, tree } = parsed.data

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "You must be signed in." }
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return { error: "Your session expired. Sign in again and retry." }
  }

  const { data: existingMember } = await supabase
    .from("restaurant_members")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle()

  if (existingMember) {
    return { error: "You already belong to a restaurant." }
  }

  // Match createRestaurant: insert without .select() so RETURNING does not run
  // against "members read restaurants" before handle_new_restaurant adds ownership.
  const { error: restaurantError } = await supabase.from("restaurants").insert({
    name: name.trim(),
    slug,
    created_by: user.id,
  })

  if (restaurantError) {
    if (restaurantError.code === "23505") {
      return { error: "That URL is already taken. Choose a different slug." }
    }
    return { error: formatDbError(restaurantError) }
  }

  const { data: restaurant, error: restaurantFetchError } = await supabase
    .from("restaurants")
    .select("id")
    .eq("slug", slug)
    .single()

  if (restaurantFetchError || !restaurant) {
    return {
      error: restaurantFetchError
        ? formatDbError(restaurantFetchError)
        : "Restaurant was created but could not be loaded. Try signing in again.",
    }
  }

  const restaurantId = restaurant.id

  try {
    for (let menuIndex = 0; menuIndex < tree.menus.length; menuIndex++) {
      const menu = tree.menus[menuIndex]!
      const { data: menuRow, error: menuError } = await supabase
        .from("menus")
        .insert({
          restaurant_id: restaurantId,
          name: menu.name,
          position: menuIndex,
        })
        .select("id")
        .single()

      if (menuError) {
        throw menuError
      }

      for (let sectionIndex = 0; sectionIndex < menu.sections.length; sectionIndex++) {
        const section = menu.sections[sectionIndex]!
        const { data: sectionRow, error: sectionError } = await supabase
          .from("sections")
          .insert({
            menu_id: menuRow.id,
            restaurant_id: restaurantId,
            name: section.name,
            position: sectionIndex,
          })
          .select("id")
          .single()

        if (sectionError) {
          throw sectionError
        }

        const dishes = section.dishes.filter((d) => d.name.trim().length > 0)
        if (dishes.length === 0) {
          continue
        }

        const { error: dishesError } = await supabase.from("dishes").insert(
          dishes.map((dish, dishIndex) => ({
            section_id: sectionRow.id,
            restaurant_id: restaurantId,
            name: dish.name,
            menu_description: dish.menu_description,
            position: dishIndex,
          }))
        )

        if (dishesError) {
          throw dishesError
        }
      }
    }
  } catch (err) {
    const message =
      err && typeof err === "object" && "message" in err
        ? formatDbError(err as { message: string; hint?: string | null; code?: string })
        : "Could not save menu data."
    return { error: message }
  }

  revalidatePath("/")
  redirect(`/r/${slug}`)
}
