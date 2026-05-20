import Link from "next/link"
import { notFound } from "next/navigation"

import { createClient } from "@/lib/supabase/server"

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
        <p className="mt-2 max-w-prose text-sm text-muted-foreground whitespace-pre-wrap">
          {component.description}
        </p>
      ) : null}
      <p className="mt-6 text-muted-foreground">
        Recipe versions and ingredients are coming in the next step.
      </p>
    </div>
  )
}
