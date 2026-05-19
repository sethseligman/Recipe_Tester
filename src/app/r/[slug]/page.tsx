import { notFound } from "next/navigation"

import { MenusHome, type MenuListItem } from "@/app/r/[slug]/menus-home"
import { createClient } from "@/lib/supabase/server"
import type { Tables } from "@/lib/supabase/database.types"

type MenuRowWithSections = Tables<"menus"> & {
  sections: { count: number }[]
}

export default async function RestaurantHomePage({
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

  const { data: menusRaw } = await supabase
    .from("menus")
    .select("*, sections(count)")
    .eq("restaurant_id", restaurant.id)
    .eq("is_archived", false)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true })

  const menus: MenuListItem[] = ((menusRaw ?? []) as MenuRowWithSections[]).map(
    (menu) => ({
      ...menu,
      sectionCount: menu.sections[0]?.count ?? 0,
    })
  )

  return (
    <MenusHome slug={slug} restaurantId={restaurant.id} menus={menus} />
  )
}
