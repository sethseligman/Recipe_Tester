import { notFound } from "next/navigation"

import {
  VersionDetail,
  type VersionWithComponent,
} from "@/app/r/[slug]/components/[componentId]/versions/[versionId]/version-detail"
import { createClient } from "@/lib/supabase/server"

export default async function RecipeVersionDetailPage({
  params,
}: {
  params: Promise<{ slug: string; componentId: string; versionId: string }>
}) {
  const { slug, componentId, versionId } = await params
  const supabase = await createClient()

  const { data: versionRaw } = await supabase
    .from("recipe_versions")
    .select("*, components(id, name, description)")
    .eq("id", versionId)
    .single()

  if (!versionRaw) {
    notFound()
  }

  const version = versionRaw as VersionWithComponent

  if (version.component_id !== componentId) {
    notFound()
  }

  return (
    <VersionDetail
      key={`${version.id}-${version.updated_at}`}
      slug={slug}
      componentId={componentId}
      version={version}
    />
  )
}
