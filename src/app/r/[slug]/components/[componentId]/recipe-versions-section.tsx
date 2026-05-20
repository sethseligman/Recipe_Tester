"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { ChevronRightIcon, Loader2Icon } from "lucide-react"
import { toast } from "sonner"

import { createRecipeVersion } from "@/app/r/[slug]/components/[componentId]/versions/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatRelativeDate } from "@/lib/format-relative-date"
import {
  computeCurrentVersionId,
  statusBadgeClassName,
  statusLabel,
  type RecipeVersionRow,
} from "@/lib/recipe-versions/status"
import { cn } from "@/lib/utils"

type RecipeVersionsSectionProps = {
  slug: string
  componentId: string
  versions: RecipeVersionRow[]
}

export function RecipeVersionsSection({
  slug,
  componentId,
  versions,
}: RecipeVersionsSectionProps) {
  const router = useRouter()
  const [isCreating, startCreateTransition] = useTransition()
  const currentVersionId = computeCurrentVersionId(versions)

  function handleCreateVersion() {
    startCreateTransition(async () => {
      const result = await createRecipeVersion({ componentId, slug })
      if (result.error) {
        toast.error(result.error)
        return
      }
      if (result.versionId) {
        router.push(
          `/r/${slug}/components/${componentId}/versions/${result.versionId}`
        )
      }
    })
  }

  return (
    <section className="mt-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold tracking-tight">Recipe versions</h2>
        <Button
          className="w-full sm:w-auto"
          disabled={isCreating}
          onClick={handleCreateVersion}
        >
          {isCreating ? (
            <>
              <Loader2Icon className="animate-spin" />
              Creating…
            </>
          ) : (
            "New version"
          )}
        </Button>
      </div>

      {versions.length === 0 ? (
        <Card className="mt-6">
          <CardHeader className="text-center">
            <CardTitle className="text-base font-medium">
              No recipe versions yet
            </CardTitle>
            <CardDescription>
              Create a draft to start writing this recipe.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-6">
            <Button
              className="w-full sm:w-auto"
              disabled={isCreating}
              onClick={handleCreateVersion}
            >
              Create first version
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ul className="mt-6 divide-y rounded-lg border">
          {versions.map((version) => {
            const isCurrent = version.id === currentVersionId
            const displayTitle = version.title?.trim() || "Untitled draft"
            const titleIsPlaceholder = !version.title?.trim()

            return (
              <li key={version.id}>
                <Link
                  href={`/r/${slug}/components/${componentId}/versions/${version.id}`}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 transition-colors hover:bg-muted/40",
                    isCurrent && "border-l-2 border-l-primary bg-primary/5"
                  )}
                >
                  <Badge
                    variant="secondary"
                    className="min-w-10 justify-center px-2 text-sm font-semibold"
                  >
                    v{version.version_number}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          titleIsPlaceholder && "text-muted-foreground"
                        )}
                      >
                        {displayTitle}
                      </span>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                          statusBadgeClassName(version.status)
                        )}
                      >
                        {statusLabel(version.status)}
                      </span>
                      {isCurrent ? (
                        <Badge variant="outline" className="text-xs">
                          Current
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      created {formatRelativeDate(version.created_at)}
                    </p>
                  </div>
                  <ChevronRightIcon className="size-5 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
