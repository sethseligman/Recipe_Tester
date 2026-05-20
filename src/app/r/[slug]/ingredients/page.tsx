import { notFound } from "next/navigation"

import { IngredientsHome } from "@/app/r/[slug]/ingredients/ingredients-home"
import { createClient } from "@/lib/supabase/server"

export default async function IngredientsPage({
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

  const { data: ingredients } = await supabase
    .from("ingredients")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .order("name_normalized", { ascending: true })

  return (
    <IngredientsHome
      slug={slug}
      restaurantId={restaurant.id}
      ingredients={ingredients ?? []}
    />
  )
}
