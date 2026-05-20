"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { isRecipeVersionStatus } from "@/lib/recipe-versions/status"
import { UNIT_TYPE_VALUES } from "@/lib/recipe-versions/units"
import { createClient } from "@/lib/supabase/server"

const createRecipeVersionSchema = z.object({
  componentId: z.string().uuid(),
  slug: z.string().min(1),
})

const updateRecipeVersionSchema = z
  .object({
    versionId: z.string().uuid(),
    slug: z.string().min(1),
    componentId: z.string().uuid(),
    title: z.string().max(100).optional().nullable(),
    yieldAmount: z.number().positive("Yield must be positive").optional().nullable(),
    yieldUnit: z.enum(UNIT_TYPE_VALUES).optional().nullable(),
    method: z.string().max(10000).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.yieldAmount != null && data.yieldUnit == null) {
      ctx.addIssue({
        code: "custom",
        message: "Yield unit is required when yield amount is set",
        path: ["yieldUnit"],
      })
    }
  })

const changeStatusSchema = z.object({
  versionId: z.string().uuid(),
  slug: z.string().min(1),
  componentId: z.string().uuid(),
  newStatus: z.enum(["draft", "testing", "approved", "archived"]),
})

const forceUnapproveSchema = z.object({
  versionId: z.string().uuid(),
  slug: z.string().min(1),
  componentId: z.string().uuid(),
  newStatus: z.enum(["draft", "testing", "archived"]),
})

function componentPath(slug: string, componentId: string) {
  return `/r/${slug}/components/${componentId}`
}

function versionPath(slug: string, componentId: string, versionId: string) {
  return `/r/${slug}/components/${componentId}/versions/${versionId}`
}

function revalidateVersionRoutes(
  slug: string,
  componentId: string,
  versionId: string
) {
  revalidatePath(componentPath(slug, componentId))
  revalidatePath(versionPath(slug, componentId, versionId))
}

async function assertVersionAccess(versionId: string): Promise<
  | { error: string }
  | {
      userId: string
      version: {
        id: string
        component_id: string
        restaurant_id: string
        status: string
        version_number: number
      }
    }
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "You must be signed in." }
  }

  const { data: version, error: versionError } = await supabase
    .from("recipe_versions")
    .select("id, component_id, restaurant_id, status, version_number")
    .eq("id", versionId)
    .single()

  if (versionError || !version) {
    return { error: "Recipe version not found." }
  }

  return { userId: user.id, version }
}

async function assertComponentAccess(componentId: string): Promise<
  | { error: string }
  | { userId: string; restaurantId: string }
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "You must be signed in." }
  }

  const { data: component, error: componentError } = await supabase
    .from("components")
    .select("restaurant_id")
    .eq("id", componentId)
    .single()

  if (componentError || !component) {
    return { error: "Component not found." }
  }

  return { userId: user.id, restaurantId: component.restaurant_id }
}

function parseStatusChangeError(message: string | undefined):
  | { error: "has_dependents"; message: string; dependentCount?: number }
  | { error: "unapproved_subs"; message: string }
  | null {
  if (!message) return null
  if (message.includes("Cannot un-approve")) {
    const match = message.match(/Cannot un-approve:\s*(\d+)/)
    return {
      error: "has_dependents",
      message,
      dependentCount: match ? Number.parseInt(match[1]!, 10) : undefined,
    }
  }
  if (message.includes("Sub-recipe references must")) {
    return { error: "unapproved_subs", message }
  }
  return null
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (value == null) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export async function createRecipeVersion(
  input: z.infer<typeof createRecipeVersionSchema>
): Promise<{ error?: string; versionId?: string }> {
  const parsed = createRecipeVersionSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const { componentId, slug } = parsed.data
  const access = await assertComponentAccess(componentId)
  if ("error" in access) {
    return { error: access.error }
  }

  const supabase = await createClient()

  const { data: maxRow } = await supabase
    .from("recipe_versions")
    .select("version_number")
    .eq("component_id", componentId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextVersionNumber = (maxRow?.version_number ?? 0) + 1

  const { data, error } = await supabase
    .from("recipe_versions")
    .insert({
      component_id: componentId,
      restaurant_id: access.restaurantId,
      version_number: nextVersionNumber,
      status: "draft",
      created_by: access.userId,
    })
    .select("id")
    .single()

  if (error) {
    throw error
  }

  revalidatePath(componentPath(slug, componentId))
  return { versionId: data.id }
}

export async function updateRecipeVersion(
  input: z.infer<typeof updateRecipeVersionSchema>
): Promise<{ error?: string }> {
  const parsed = updateRecipeVersionSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const { versionId, slug, componentId, title, yieldAmount, yieldUnit, method } =
    parsed.data

  const access = await assertVersionAccess(versionId)
  if ("error" in access) {
    return { error: access.error }
  }

  if (access.version.component_id !== componentId) {
    return { error: "Recipe version not found." }
  }

  if (
    access.version.status === "approved" ||
    access.version.status === "archived"
  ) {
    return { error: "immutable" }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("recipe_versions")
    .update({
      title: normalizeOptionalText(title ?? null),
      yield_amount: yieldAmount ?? null,
      yield_unit: yieldUnit ?? null,
      method: normalizeOptionalText(method ?? null),
    })
    .eq("id", versionId)

  if (error) {
    throw error
  }

  revalidateVersionRoutes(slug, componentId, versionId)
  return {}
}

export type ChangeRecipeVersionStatusResult =
  | { ok: true }
  | { error: "has_dependents"; message: string; dependentCount?: number }
  | { error: "unapproved_subs"; message: string }
  | { error: "generic"; message: string }

export async function changeRecipeVersionStatus(
  input: z.infer<typeof changeStatusSchema>
): Promise<ChangeRecipeVersionStatusResult> {
  const parsed = changeStatusSchema.safeParse(input)
  if (!parsed.success) {
    return {
      error: "generic",
      message: parsed.error.issues[0]?.message ?? "Invalid input",
    }
  }

  const { versionId, slug, componentId, newStatus } = parsed.data

  if (!isRecipeVersionStatus(newStatus)) {
    return { error: "generic", message: "Invalid status." }
  }

  const access = await assertVersionAccess(versionId)
  if ("error" in access) {
    return { error: "generic", message: access.error }
  }

  if (access.version.component_id !== componentId) {
    return { error: "generic", message: "Recipe version not found." }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("recipe_versions")
    .update({ status: newStatus })
    .eq("id", versionId)

  if (error) {
    const parsedError = parseStatusChangeError(error.message)
    if (parsedError) {
      return parsedError
    }
    throw error
  }

  revalidateVersionRoutes(slug, componentId, versionId)
  return { ok: true }
}

export async function forceUnapproveRecipeVersion(
  input: z.infer<typeof forceUnapproveSchema>
): Promise<{ error?: string }> {
  const parsed = forceUnapproveSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const { versionId, slug, componentId, newStatus } = parsed.data

  const access = await assertVersionAccess(versionId)
  if ("error" in access) {
    return { error: access.error }
  }

  if (access.version.component_id !== componentId) {
    return { error: "Recipe version not found." }
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc("force_unapprove_recipe_version", {
    version_id: versionId,
    new_status: newStatus,
  })

  if (error) {
    const parsedError = parseStatusChangeError(error.message)
    if (parsedError?.error === "unapproved_subs") {
      return { error: parsedError.message }
    }
    throw error
  }

  revalidateVersionRoutes(slug, componentId, versionId)
  return {}
}
