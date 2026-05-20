import type { Database } from "@/lib/supabase/database.types"

export type UnitType = Database["public"]["Enums"]["unit_type"]

export const UNIT_TYPE_VALUES: UnitType[] = [
  "g",
  "kg",
  "ml",
  "l",
  "tsp",
  "tbsp",
  "cup",
  "fl_oz",
  "oz",
  "lb",
  "each",
  "pinch",
]

export function formatUnitLabel(unit: string): string {
  if (unit === "fl_oz") return "fl oz"
  return unit
}
