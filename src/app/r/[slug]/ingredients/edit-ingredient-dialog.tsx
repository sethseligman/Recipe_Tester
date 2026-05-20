"use client"

import { useState, useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import {
  updateIngredient,
  type IngredientFormData,
  type IngredientMatch,
} from "@/app/r/[slug]/ingredients/actions"
import { IngredientNearMatchCallout } from "@/app/r/[slug]/ingredients/ingredient-near-match-callout"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { Tables } from "@/lib/supabase/database.types"

const ingredientFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z
    .string()
    .max(500, "Description must be 500 characters or less"),
})

type IngredientFormValues = z.infer<typeof ingredientFormSchema>

type EditIngredientDialogProps = {
  ingredient: Tables<"ingredients"> | null
  onOpenChange: (open: boolean) => void
  slug: string
}

export function EditIngredientDialog({
  ingredient,
  onOpenChange,
  slug,
}: EditIngredientDialogProps) {
  const open = ingredient !== null
  const [formError, setFormError] = useState<string | null>(null)
  const [nearMatchWarning, setNearMatchWarning] = useState<{
    matches: IngredientMatch[]
    formData: IngredientFormData
  } | null>(null)
  const [isPending, startTransition] = useTransition()

  const form = useForm<IngredientFormValues>({
    resolver: zodResolver(ingredientFormSchema),
    defaultValues: {
      name: ingredient?.name ?? "",
      description: ingredient?.description ?? "",
    },
  })

  function resetState() {
    if (ingredient) {
      form.reset({
        name: ingredient.name,
        description: ingredient.description ?? "",
      })
    }
    setFormError(null)
    setNearMatchWarning(null)
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      resetState()
    }
    onOpenChange(next)
  }

  function submit(values: IngredientFormValues, confirmCreate: boolean) {
    if (!ingredient) return
    setFormError(null)
    startTransition(async () => {
      const result = await updateIngredient({
        ingredientId: ingredient.id,
        slug,
        name: values.name,
        description: values.description,
        confirmCreate,
      })

      if ("warning" in result && result.warning) {
        setNearMatchWarning({
          matches: result.warning.matches,
          formData: result.formData,
        })
        form.reset(result.formData)
        return
      }

      if ("error" in result && result.error) {
        setFormError(result.error)
        toast.error(result.error)
        return
      }

      toast.success("Ingredient updated")
      handleOpenChange(false)
    })
  }

  function handleSubmit(values: IngredientFormValues) {
    submit(values, false)
  }

  function handleSaveAnyway() {
    const values = form.getValues()
    submit(values, true)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit ingredient</DialogTitle>
          <DialogDescription>
            Update the name or description for this ingredient.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
          {formError ? (
            <p className="text-sm text-destructive" role="alert">
              {formError}
            </p>
          ) : null}
          <div className="grid gap-2">
            <Label htmlFor="edit-ingredient-name">Name</Label>
            <Input
              id="edit-ingredient-name"
              disabled={isPending}
              autoFocus
              {...form.register("name")}
            />
            {form.formState.errors.name ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.name.message}
              </p>
            ) : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-ingredient-description">Description (optional)</Label>
            <Textarea
              id="edit-ingredient-description"
              disabled={isPending}
              maxLength={500}
              className="min-h-20"
              {...form.register("description")}
            />
            {form.formState.errors.description ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.description.message}
              </p>
            ) : null}
          </div>
          {nearMatchWarning ? (
            <IngredientNearMatchCallout
              matches={nearMatchWarning.matches}
              isPending={isPending}
              confirmAnywayLabel="Save anyway"
              onUseExisting={() => handleOpenChange(false)}
              onCreateAnyway={handleSaveAnyway}
            />
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            {!nearMatchWarning ? (
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2Icon className="animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            ) : null}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
