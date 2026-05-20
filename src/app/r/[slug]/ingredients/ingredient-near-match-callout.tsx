"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import type { IngredientMatch } from "@/app/r/[slug]/ingredients/actions"

type IngredientNearMatchCalloutProps = {
  matches: IngredientMatch[]
  isPending: boolean
  confirmAnywayLabel?: string
  onUseExisting: (match: IngredientMatch) => void
  onCreateAnyway: () => void
}

export function IngredientNearMatchCallout({
  matches,
  isPending,
  confirmAnywayLabel = "Create anyway",
  onUseExisting,
  onCreateAnyway,
}: IngredientNearMatchCalloutProps) {
  return (
    <Alert className="border-amber-500/50 bg-amber-50 text-amber-950 dark:bg-amber-950/30 dark:text-amber-50">
      <AlertTitle>Looks similar to existing ingredient(s):</AlertTitle>
      <AlertDescription className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {matches.map((match) => (
            <Button
              key={match.id}
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              className="border-amber-600/40 bg-background hover:bg-amber-100 dark:hover:bg-amber-900/40"
              onClick={() => onUseExisting(match)}
            >
              {match.name}
            </Button>
          ))}
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="w-fit"
          disabled={isPending}
          onClick={onCreateAnyway}
        >
          {confirmAnywayLabel}
        </Button>
      </AlertDescription>
    </Alert>
  )
}
