"use client"

import { useState, useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import {
  createIngredient,
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

const ingredientFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z
    .string()
    .max(500, "Description must be 500 characters or less"),
})

type IngredientFormValues = z.infer<typeof ingredientFormSchema>

type NewIngredientDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  restaurantId: string
  slug: string
}

export function NewIngredientDialog({
  open,
  onOpenChange,
  restaurantId,
  slug,
}: NewIngredientDialogProps) {
  const [formError, setFormError] = useState<string | null>(null)
  const [nearMatchWarning, setNearMatchWarning] = useState<{
    matches: IngredientMatch[]
    formData: IngredientFormData
  } | null>(null)
  const [isPending, startTransition] = useTransition()

  const form = useForm<IngredientFormValues>({
    resolver: zodResolver(ingredientFormSchema),
    defaultValues: { name: "", description: "" },
  })

  function resetState() {
    form.reset({ name: "", description: "" })
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
    setFormError(null)
    startTransition(async () => {
      const result = await createIngredient({
        restaurantId,
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

      toast.success("Ingredient created")
      handleOpenChange(false)
    })
  }

  function handleSubmit(values: IngredientFormValues) {
    submit(values, false)
  }

  function handleCreateAnyway() {
    const values = form.getValues()
    submit(values, true)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New ingredient</DialogTitle>
          <DialogDescription>
            Add an ingredient to your restaurant&apos;s master list. Recipes will
            reference this entry.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
          {formError ? (
            <p className="text-sm text-destructive" role="alert">
              {formError}
            </p>
          ) : null}
          <div className="grid gap-2">
            <Label htmlFor="new-ingredient-name">Name</Label>
            <Input
              id="new-ingredient-name"
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
            <Label htmlFor="new-ingredient-description">Description (optional)</Label>
            <Textarea
              id="new-ingredient-description"
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
              onUseExisting={() => handleOpenChange(false)}
              onCreateAnyway={handleCreateAnyway}
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
                    Creating…
                  </>
                ) : (
                  "Create ingredient"
                )}
              </Button>
            ) : null}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
