import Link from "next/link"
import { notFound } from "next/navigation"

import { RecipeVersionsSection } from "@/app/r/[slug]/components/[componentId]/recipe-versions-section"
import { createClient } from "@/lib/supabase/server"
import type { Tables } from "@/lib/supabase/database.types"

export default async function ComponentDetailPage({
  params,
}: {
  params: Promise<{ slug: string; componentId: string }>
}) {
  const { slug, componentId } = await params
  const supabase = await createClient()

  const { data: component } = await supabase
    .from("components")
    .select("id, name, description")
    .eq("id", componentId)
    .single()

  if (!component) {
    notFound()
  }

  const { data: versions } = await supabase
    .from("recipe_versions")
    .select("*")
    .eq("component_id", componentId)
    .order("version_number", { ascending: false })

  return (
    <div>
      <p className="mb-4 text-sm">
        <Link
          href={`/r/${slug}/components`}
          className="text-primary hover:underline"
        >
          ← Components
        </Link>
      </p>
      <h1 className="text-2xl font-semibold tracking-tight">{component.name}</h1>
      {component.description ? (
        <p className="mt-2 max-w-prose text-sm whitespace-pre-wrap text-muted-foreground">
          {component.description}
        </p>
      ) : null}
      <RecipeVersionsSection
        slug={slug}
        componentId={componentId}
        versions={(versions ?? []) as Tables<"recipe_versions">[]}
      />
    </div>
  )
}
