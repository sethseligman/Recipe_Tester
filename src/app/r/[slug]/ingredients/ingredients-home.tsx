"use client"

import { useState, useTransition } from "react"
import { Loader2Icon, MoreVerticalIcon } from "lucide-react"
import { toast } from "sonner"

import { deleteIngredient } from "@/app/r/[slug]/ingredients/actions"
import { EditIngredientDialog } from "@/app/r/[slug]/ingredients/edit-ingredient-dialog"
import { NewIngredientDialog } from "@/app/r/[slug]/ingredients/new-ingredient-dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Tables } from "@/lib/supabase/database.types"

type IngredientsHomeProps = {
  slug: string
  restaurantId: string
  ingredients: Tables<"ingredients">[]
}

export function IngredientsHome({
  slug,
  restaurantId,
  ingredients,
}: IngredientsHomeProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Tables<"ingredients"> | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Tables<"ingredients"> | null>(
    null
  )
  const [deleteError, setDeleteError] = useState<{
    usageCount: number
  } | null>(null)
  const [isDeleting, startDeleteTransition] = useTransition()

  function handleDeleteOpenChange(open: boolean) {
    if (!open) {
      setDeleteTarget(null)
      setDeleteError(null)
    }
  }

  function handleDelete() {
    if (!deleteTarget) return
    startDeleteTransition(async () => {
      const result = await deleteIngredient({
        ingredientId: deleteTarget.id,
        slug,
      })
      if (result.error === "in_use" && result.usageCount !== undefined) {
        setDeleteError({ usageCount: result.usageCount })
        return
      }
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Ingredient deleted")
      handleDeleteOpenChange(false)
    })
  }

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Ingredients</h1>
        <Button
          className="w-full sm:w-auto"
          onClick={() => setCreateOpen(true)}
        >
          New ingredient
        </Button>
      </div>

      {ingredients.length === 0 ? (
        <Card className="mt-8">
          <CardHeader className="text-center">
            <CardTitle>No ingredients yet</CardTitle>
            <CardDescription>
              Ingredients are reusable across all your recipes. Add salt once,
              use it everywhere.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-6">
            <Button
              className="w-full sm:w-auto"
              onClick={() => setCreateOpen(true)}
            >
              Create your first ingredient
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ul className="mt-6 divide-y rounded-lg border">
          {ingredients.map((ingredient) => (
            <li
              key={ingredient.id}
              className="relative flex items-start gap-3 px-3 py-3 pr-12"
            >
              <div className="min-w-0 flex-1">
                <p className="font-normal">{ingredient.name}</p>
                {ingredient.description ? (
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {ingredient.description}
                  </p>
                ) : null}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="absolute top-2 right-2"
                    aria-label={`Ingredient actions for ${ingredient.name}`}
                  >
                    <MoreVerticalIcon className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setEditTarget(ingredient)}>
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => {
                      setDeleteError(null)
                      setDeleteTarget(ingredient)
                    }}
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          ))}
        </ul>
      )}

      <NewIngredientDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        restaurantId={restaurantId}
        slug={slug}
      />

      <EditIngredientDialog
        key={editTarget?.id ?? "edit-closed"}
        ingredient={editTarget}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null)
        }}
        slug={slug}
      />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={handleDeleteOpenChange}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {deleteTarget?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteError ? (
                <span className="text-destructive">
                  This ingredient is used in {deleteError.usageCount} recipe
                  {deleteError.usageCount === 1 ? "" : "s"}. Remove it from those
                  recipes before deleting.
                </span>
              ) : (
                <>
                  This can&apos;t be undone. You can only delete ingredients that
                  aren&apos;t used in any recipe.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            {!deleteError ? (
              <AlertDialogAction
                variant="destructive"
                disabled={isDeleting}
                onClick={(event) => {
                  event.preventDefault()
                  handleDelete()
                }}
              >
                {isDeleting ? (
                  <>
                    <Loader2Icon className="animate-spin" />
                    Deleting…
                  </>
                ) : (
                  "Delete"
                )}
              </AlertDialogAction>
            ) : null}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
