import { z } from "zod"

/** Lowercase URL slug from a display name (restaurant name, etc.). */
export function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

export const slugSchema = z
  .string()
  .min(1, "URL slug is required")
  .max(60)
  .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers, and hyphens only")
