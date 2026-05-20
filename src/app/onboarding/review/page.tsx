import Link from "next/link"
import { redirect } from "next/navigation"
import { ChevronLeftIcon } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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

  const sourceLabel =
    source === "paste" ? "Pasted text" : "Uploaded file"

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-6">
          <Link
            href="/onboarding/upload"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeftIcon className="size-4" />
            Back to upload
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Review your menu</CardTitle>
            <CardDescription>
              Phase A, chunk 2: AI parsing and an editable menu tree come next.
              Your upload is stored and ready.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm">
            <dl className="grid gap-2 rounded-lg border bg-muted/30 p-4">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Restaurant</dt>
                <dd className="font-medium text-right">{decodeURIComponent(name)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">URL</dt>
                <dd className="font-mono text-right">/r/{decodeURIComponent(slug)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Source</dt>
                <dd className="text-right">{sourceLabel}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Upload ID</dt>
                <dd className="font-mono text-xs text-right break-all">{uploadId}</dd>
              </div>
            </dl>
            <p className="text-muted-foreground">
              Next step: parse this menu with the Anthropic API, show an editable
              tree of menus → sections → dishes, then confirm to create your
              restaurant.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
