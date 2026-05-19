import Link from "next/link"
import { notFound } from "next/navigation"

import { createClient } from "@/lib/supabase/server"

export default async function DishDetailPlaceholderPage({
  params,
}: {
  params: Promise<{ slug: string; menuId: string; dishId: string }>
}) {
  const { slug, menuId, dishId } = await params
  const supabase = await createClient()

  const { data: dish } = await supabase
    .from("dishes")
    .select("name")
    .eq("id", dishId)
    .single()

  if (!dish) {
    notFound()
  }

  return (
    <div>
      <p className="mb-4 text-sm">
        <Link
          href={`/r/${slug}/menus/${menuId}`}
          className="text-primary hover:underline"
        >
          ← Back to menu
        </Link>
      </p>
      <h1 className="text-2xl font-semibold tracking-tight">{dish.name}</h1>
      <p className="mt-2 text-muted-foreground">
        Dish details and menu description editing are coming in the next step.
      </p>
    </div>
  )
}
