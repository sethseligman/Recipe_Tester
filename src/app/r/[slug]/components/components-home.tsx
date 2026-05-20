"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon, MoreVerticalIcon } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import {
  archiveComponent,
  createComponent,
  updateComponent,
} from "@/app/r/[slug]/components/actions"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { Tables } from "@/lib/supabase/database.types"

const componentFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z
    .string()
    .max(500, "Description must be 500 characters or less"),
})

type ComponentFormValues = z.infer<typeof componentFormSchema>

type ComponentsHomeProps = {
  slug: string
  restaurantId: string
  components: Tables<"components">[]
}

function ComponentFormDialog({
  open,
  onOpenChange,
  title,
  description,
  defaultValues,
  submitLabel,
  successMessage,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  defaultValues?: { name: string; description: string }
  submitLabel: string
  successMessage: string
  onSubmit: (values: ComponentFormValues) => Promise<{ error?: string }>
}) {
  const [formError, setFormError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const form = useForm<ComponentFormValues>({
    resolver: zodResolver(componentFormSchema),
    defaultValues: defaultValues ?? { name: "", description: "" },
  })

  function handleOpenChange(next: boolean) {
    if (!next) {
      form.reset(defaultValues ?? { name: "", description: "" })
      setFormError(null)
    }
    onOpenChange(next)
  }

  function handleSubmit(values: ComponentFormValues) {
    setFormError(null)
    startTransition(async () => {
      const result = await onSubmit(values)
      if (result.error) {
        setFormError(result.error)
        toast.error(result.error)
        return
      }
      toast.success(successMessage)
      handleOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
          {formError ? (
            <p className="text-sm text-destructive" role="alert">
              {formError}
            </p>
          ) : null}
          <div className="grid gap-2">
            <Label htmlFor="component-name">Name</Label>
            <Input
              id="component-name"
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
            <Label htmlFor="component-description">Description (optional)</Label>
            <Textarea
              id="component-description"
              placeholder="What is this component? e.g. 'Citrus marinade base for ceviches'"
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
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2Icon className="animate-spin" />
                  Saving…
                </>
              ) : (
                submitLabel
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function ComponentsHome({
  slug,
  restaurantId,
  components,
}: ComponentsHomeProps) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Tables<"components"> | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<Tables<"components"> | null>(
    null
  )
  const [isArchiving, startArchiveTransition] = useTransition()

  async function handleCreate(values: ComponentFormValues) {
    const result = await createComponent({
      restaurantId,
      name: values.name,
      description: values.description,
      slug,
    })
    if (result.error) {
      return { error: result.error }
    }
    if (result.componentId) {
      router.push(`/r/${slug}/components/${result.componentId}`)
    }
    return {}
  }

  function handleArchive() {
    if (!archiveTarget) return
    startArchiveTransition(async () => {
      const result = await archiveComponent({
        componentId: archiveTarget.id,
        slug,
      })
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Component archived")
      setArchiveTarget(null)
    })
  }

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Components</h1>
        <Button
          className="w-full sm:w-auto"
          onClick={() => setCreateOpen(true)}
        >
          New component
        </Button>
      </div>

      {components.length === 0 ? (
        <Card className="mt-8">
          <CardHeader className="text-center">
            <CardTitle>No components yet</CardTitle>
            <CardDescription>
              Components are reusable recipe building blocks, such as leche de
              tigre or a house dressing.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-6">
            <Button
              className="w-full sm:w-auto"
              onClick={() => setCreateOpen(true)}
            >
              Create your first component
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ul className="mt-6 divide-y rounded-lg border">
          {components.map((component) => (
            <li key={component.id} className="relative flex items-stretch">
              <Link
                href={`/r/${slug}/components/${component.id}`}
                className="flex min-w-0 flex-1 flex-col gap-0.5 px-3 py-3 pr-12 transition-colors hover:bg-muted/40"
              >
                <span className="font-medium">{component.name}</span>
                {component.description ? (
                  <span className="truncate text-sm text-muted-foreground">
                    {component.description}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    No recipes yet
                  </span>
                )}
              </Link>
              <div className="absolute top-2 right-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Component actions for ${component.name}`}
                      onClick={(event) => event.preventDefault()}
                    >
                      <MoreVerticalIcon className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onSelect={() => setEditTarget(component)}
                    >
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => setArchiveTarget(component)}
                    >
                      Archive
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ComponentFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="New component"
        description="Name a reusable building block for your recipes."
        submitLabel="Create component"
        successMessage="Component created"
        onSubmit={handleCreate}
      />

      <ComponentFormDialog
        key={editTarget?.id ?? "edit-closed"}
        open={editTarget !== null}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null)
        }}
        title="Edit component"
        description="Update the name and description for this component."
        defaultValues={
          editTarget
            ? {
                name: editTarget.name,
                description: editTarget.description ?? "",
              }
            : undefined
        }
        submitLabel="Save"
        successMessage="Component updated"
        onSubmit={async (values) => {
          if (!editTarget) return { error: "No component selected" }
          return updateComponent({
            componentId: editTarget.id,
            name: values.name,
            description: values.description,
            slug,
          })
        }}
      />

      <Dialog
        open={archiveTarget !== null}
        onOpenChange={(open) => {
          if (!open) setArchiveTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive component?</DialogTitle>
            <DialogDescription>
              Archive {archiveTarget?.name}? Linked dishes will keep their
              links, but you cannot add it to new dishes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isArchiving}
              onClick={() => setArchiveTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isArchiving}
              onClick={handleArchive}
            >
              {isArchiving ? (
                <>
                  <Loader2Icon className="animate-spin" />
                  Archiving…
                </>
              ) : (
                "Archive"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
