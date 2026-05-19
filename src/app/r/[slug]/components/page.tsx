import { notFound } from "next/navigation"

import { ComponentsHome } from "@/app/r/[slug]/components/components-home"
import { createClient } from "@/lib/supabase/server"

export default async function ComponentsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id")
    .eq("slug", slug)
    .single()

  if (!restaurant) {
    notFound()
  }

  const { data: components } = await supabase
    .from("components")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .eq("is_archived", false)
    .order("name", { ascending: true })

  return (
    <ComponentsHome
      slug={slug}
      restaurantId={restaurant.id}
      components={components ?? []}
    />
  )
}
