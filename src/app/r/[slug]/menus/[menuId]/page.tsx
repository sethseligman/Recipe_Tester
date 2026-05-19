import { notFound } from "next/navigation"

import { MenuDetail, type SectionWithDishes } from "@/app/r/[slug]/menus/[menuId]/menu-detail"
import { createClient } from "@/lib/supabase/server"
import type { Tables } from "@/lib/supabase/database.types"

type DishRow = Pick<
  Tables<"dishes">,
  "id" | "name" | "menu_description" | "position" | "is_archived"
>

type SectionRow = Tables<"sections"> & {
  dishes: DishRow[] | null
}

export default async function MenuDetailPage({
  params,
}: {
  params: Promise<{ slug: string; menuId: string }>
}) {
  const { slug, menuId } = await params
  const supabase = await createClient()

  const { data: menu } = await supabase
    .from("menus")
    .select("id, name")
    .eq("id", menuId)
    .single()

  if (!menu) {
    notFound()
  }

  const { data: sectionsRaw } = await supabase
    .from("sections")
    .select("*, dishes(id, name, menu_description, position, is_archived)")
    .eq("menu_id", menuId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true })

  const sections: SectionWithDishes[] = ((sectionsRaw ?? []) as SectionRow[]).map(
    (section) => ({
      ...section,
      dishes: (section.dishes ?? [])
        .filter((dish) => !dish.is_archived)
        .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name)),
    })
  )

  return (
    <MenuDetail
      slug={slug}
      menuId={menuId}
      menuName={menu.name}
      sections={sections}
    />
  )
}
