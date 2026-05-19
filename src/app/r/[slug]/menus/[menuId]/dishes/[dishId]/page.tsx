import { notFound } from "next/navigation"

import { DishDetail } from "@/app/r/[slug]/menus/[menuId]/dishes/[dishId]/dish-detail"
import type {
  ComponentOption,
  LinkedComponentRow,
} from "@/app/r/[slug]/menus/[menuId]/dishes/[dishId]/dish-components-section"
import { createClient } from "@/lib/supabase/server"

type DishComponentRow = {
  id: string
  role: string | null
  position: number
  components: {
    id: string
    name: string
    is_archived: boolean
  } | null
}

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
  dish_components: DishComponentRow[] | null
}

export default async function DishDetailPage({
  params,
}: {
  params: Promise<{ slug: string; menuId: string; dishId: string }>
}) {
  const { slug, menuId, dishId } = await params
  const supabase = await createClient()

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id")
    .eq("slug", slug)
    .single()

  if (!restaurant) {
    notFound()
  }

  const { data: dishRaw } = await supabase
    .from("dishes")
    .select(
      `id, name, menu_description,
      sections(name, menus(id, name)),
      dish_components(id, role, position, components(id, name, is_archived))`
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

  const linkedComponents: LinkedComponentRow[] = (dish.dish_components ?? [])
    .filter((row) => row.components !== null)
    .sort((a, b) => a.position - b.position)
    .map((row) => ({
      id: row.id,
      role: row.role,
      position: row.position,
      component: row.components!,
    }))

  const { data: availableRaw } = await supabase
    .from("components")
    .select("id, name")
    .eq("restaurant_id", restaurant.id)
    .eq("is_archived", false)
    .order("name", { ascending: true })

  const availableComponents: ComponentOption[] = availableRaw ?? []

  return (
    <DishDetail
      slug={slug}
      menuId={menuId}
      menuName={menu.name}
      sectionName={section.name}
      dishId={dish.id}
      dishName={dish.name}
      menuDescription={dish.menu_description}
      linkedComponents={linkedComponents}
      availableComponents={availableComponents}
    />
  )
}
