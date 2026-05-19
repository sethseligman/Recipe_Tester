import { notFound } from "next/navigation"

import { DishDetail } from "@/app/r/[slug]/menus/[menuId]/dishes/[dishId]/dish-detail"
import { createClient } from "@/lib/supabase/server"

type DishWithContext = {
  id: string
  name: string
  menu_description: string | null
  sections: {
    name: string
    menus: {
      id: string
      name: string
    } | null
  } | null
}

export default async function DishDetailPage({
  params,
}: {
  params: Promise<{ slug: string; menuId: string; dishId: string }>
}) {
  const { slug, menuId, dishId } = await params
  const supabase = await createClient()

  const { data: dishRaw } = await supabase
    .from("dishes")
    .select(
      "id, name, menu_description, sections(name, menus(id, name))"
    )
    .eq("id", dishId)
    .single()

  if (!dishRaw) {
    notFound()
  }

  const dish = dishRaw as DishWithContext
  const section = dish.sections
  const menu = section?.menus

  if (!section || !menu || menu.id !== menuId) {
    notFound()
  }

  return (
    <DishDetail
      slug={slug}
      menuId={menuId}
      menuName={menu.name}
      sectionName={section.name}
      dishId={dish.id}
      dishName={dish.name}
      menuDescription={dish.menu_description}
    />
  )
}
