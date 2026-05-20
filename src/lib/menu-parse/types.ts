import { z } from "zod"

export const parsedDishSchema = z.object({
  name: z.string().min(1).max(200),
  menu_description: z.string().max(2000).optional().nullable(),
})

export const parsedSectionSchema = z.object({
  name: z.string().min(1).max(200),
  dishes: z.array(parsedDishSchema),
})

export const parsedMenuSchema = z.object({
  name: z.string().min(1).max(200),
  sections: z.array(parsedSectionSchema),
})

export const parsedMenuTreeSchema = z.object({
  menus: z.array(parsedMenuSchema).min(1),
})

export type ParsedDish = z.infer<typeof parsedDishSchema>
export type ParsedSection = z.infer<typeof parsedSectionSchema>
export type ParsedMenu = z.infer<typeof parsedMenuSchema>
export type ParsedMenuTree = z.infer<typeof parsedMenuTreeSchema>

/** Client-editable tree with stable keys for React lists. */
export type DraftDish = {
  id: string
  name: string
  menu_description: string | null
}
export type DraftSection = {
  id: string
  name: string
  dishes: DraftDish[]
}
export type DraftMenu = {
  id: string
  name: string
  sections: DraftSection[]
}
export type DraftMenuTree = { menus: DraftMenu[] }

export function treeToDraft(tree: ParsedMenuTree): DraftMenuTree {
  return {
    menus: tree.menus.map((menu) => ({
      ...menu,
      id: crypto.randomUUID(),
      sections: menu.sections.map((section) => ({
        ...section,
        id: crypto.randomUUID(),
        dishes: section.dishes.map((dish) => ({
          id: crypto.randomUUID(),
          name: dish.name,
          menu_description: dish.menu_description ?? null,
        })),
      })),
    })),
  }
}

export function draftToParsed(tree: DraftMenuTree): ParsedMenuTree {
  const menus = tree.menus
    .map((menu) => ({
      name: menu.name.trim(),
      sections: menu.sections
        .map((section) => ({
          name: section.name.trim(),
          dishes: section.dishes
            .filter((d) => d.name.trim().length > 0)
            .map((dish) => ({
              name: dish.name.trim(),
              menu_description: dish.menu_description?.trim() || null,
            })),
        }))
        .filter((s) => s.name.length > 0 && s.dishes.length > 0),
    }))
    .filter((m) => m.name.length > 0 && m.sections.length > 0)

  return { menus }
}
