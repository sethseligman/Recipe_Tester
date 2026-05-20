import levenshtein from "fast-levenshtein"

export type IngredientRow = {
  id: string
  name: string
  name_normalized: string | null
}

export type NearMatch = {
  id: string
  name: string
  distance: number
}

export function normalizeIngredientName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ")
}

function isSubstringNearMatch(candidate: string, existing: string): boolean {
  if (candidate === existing) {
    return false
  }
  return candidate.includes(existing) || existing.includes(candidate)
}

function isNearMatch(candidate: string, existing: string): boolean {
  if (candidate === existing) {
    return false
  }
  const distance = levenshtein.get(candidate, existing)
  if (distance <= 2) {
    return true
  }
  return isSubstringNearMatch(candidate, existing)
}

export function findNearMatches(
  ingredients: IngredientRow[],
  candidateName: string,
  excludeId?: string
): NearMatch[] {
  const candidate = normalizeIngredientName(candidateName)
  if (!candidate) {
    return []
  }

  const hasExactMatch = ingredients.some((ingredient) => {
    if (excludeId && ingredient.id === excludeId) {
      return false
    }
    const existing =
      ingredient.name_normalized ?? normalizeIngredientName(ingredient.name)
    return candidate === existing
  })

  if (hasExactMatch) {
    return []
  }

  const matches: NearMatch[] = []

  for (const ingredient of ingredients) {
    if (excludeId && ingredient.id === excludeId) {
      continue
    }

    const existing = ingredient.name_normalized ?? normalizeIngredientName(ingredient.name)

    if (!isNearMatch(candidate, existing)) {
      continue
    }

    matches.push({
      id: ingredient.id,
      name: ingredient.name,
      distance: levenshtein.get(candidate, existing),
    })
  }

  return matches.sort((a, b) => a.distance - b.distance).slice(0, 3)
}
