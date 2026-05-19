import { notFound } from "next/navigation"

import { createClient } from "@/lib/supabase/server"

export default async function MenuDetailPlaceholderPage({
  params,
}: {
  params: Promise<{ slug: string; menuId: string }>
}) {
  const { slug, menuId } = await params
  const supabase = await createClient()

  const { data: menu } = await supabase
    .from("menus")
    .select("name")
    .eq("id", menuId)
    .single()

  if (!menu) {
    notFound()
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{menu.name}</h1>
      <p className="mt-2 text-muted-foreground">
        Sections and dishes are coming in the next step.
      </p>
      <p className="mt-4 text-sm">
        <a href={`/r/${slug}`} className="text-primary hover:underline">
          ← Back to menus
        </a>
      </p>
    </div>
  )
}
