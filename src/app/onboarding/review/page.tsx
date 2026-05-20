import { redirect } from "next/navigation"

import { MenuReview } from "@/app/onboarding/review/menu-review"
import { parseMenuFromStorage } from "@/lib/menu-parse/parse-from-storage"
import { treeToDraft, type DraftMenuTree } from "@/lib/menu-parse/types"
import { createClient } from "@/lib/supabase/server"

type ReviewPageProps = {
  searchParams: Promise<{
    uploadId?: string
    storagePath?: string
    name?: string
    slug?: string
    source?: string
  }>
}

export default async function OnboardingReviewPage({ searchParams }: ReviewPageProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: memberships } = await supabase
    .from("restaurant_members")
    .select("restaurants(slug)")
    .eq("user_id", user.id)
    .limit(1)

  const existingSlug = memberships?.[0]?.restaurants?.slug
  if (existingSlug) {
    redirect(`/r/${existingSlug}`)
  }

  const params = await searchParams
  const { uploadId, storagePath, name, slug, source } = params

  if (!uploadId || !storagePath || !name || !slug) {
    redirect("/onboarding/upload")
  }

  if (!storagePath.startsWith(`${user.id}/`)) {
    redirect("/onboarding/upload")
  }

  const sourceMode = source === "paste" ? "paste" : "file"

  let initialTree: DraftMenuTree | null = null
  let initialParseError: string | null = null

  try {
    const parsed = await parseMenuFromStorage(
      supabase,
      storagePath,
      sourceMode
    )
    initialTree = treeToDraft(parsed)
  } catch (err) {
    initialParseError =
      err instanceof Error ? err.message : "Could not parse menu."
  }

  return (
    <div className="flex flex-1 flex-col items-center px-4 py-12">
      <MenuReview
        storagePath={storagePath}
        source={sourceMode}
        initialName={decodeURIComponent(name)}
        initialSlug={decodeURIComponent(slug)}
        initialTree={initialTree}
        initialParseError={initialParseError}
      />
    </div>
  )
}
