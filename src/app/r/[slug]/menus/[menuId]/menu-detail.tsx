"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  ChevronDownIcon,
  ChevronUpIcon,
  Loader2Icon,
  MoreVerticalIcon,
  PencilIcon,
} from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { renameMenu } from "@/app/r/[slug]/actions"
import {
  archiveDish,
  createDish,
  createSection,
  deleteSection,
  moveSection,
  renameDish,
  renameSection,
} from "@/app/r/[slug]/menus/[menuId]/actions"
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
import type { Tables } from "@/lib/supabase/database.types"

const nameSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
})

type NameFormValues = z.infer<typeof nameSchema>

export type DishListItem = Pick<
  Tables<"dishes">,
  "id" | "name" | "menu_description" | "position"
>

export type SectionWithDishes = Tables<"sections"> & {
  dishes: DishListItem[]
}

type MenuDetailProps = {
  slug: string
  menuId: string
  menuName: string
  sections: SectionWithDishes[]
}

function NameDialog({
  open,
  onOpenChange,
  title,
  description,
  defaultName,
  submitLabel,
  successMessage,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  defaultName?: string
  submitLabel: string
  successMessage: string
  onSubmit: (name: string) => Promise<{ error?: string }>
}) {
  const [formError, setFormError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const form = useForm<NameFormValues>({
    resolver: zodResolver(nameSchema),
    defaultValues: { name: defaultName ?? "" },
  })

  function handleOpenChange(next: boolean) {
    if (!next) {
      form.reset({ name: defaultName ?? "" })
      setFormError(null)
    }
    onOpenChange(next)
  }

  function handleSubmit(values: NameFormValues) {
    setFormError(null)
    startTransition(async () => {
      const result = await onSubmit(values.name)
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
            <Label htmlFor="item-name">Name</Label>
            <Input
              id="item-name"
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

function SectionCard({
  slug,
  menuId,
  section,
  sectionIndex,
  sectionCount,
}: {
  slug: string
  menuId: string
  section: SectionWithDishes
  sectionIndex: number
  sectionCount: number
}) {
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [newDishOpen, setNewDishOpen] = useState(false)
  const [renameDishTarget, setRenameDishTarget] = useState<DishListItem | null>(
    null
  )
  const [archiveDishTarget, setArchiveDishTarget] = useState<DishListItem | null>(
    null
  )
  const [isMoving, startMoveTransition] = useTransition()
  const [isDeleting, startDeleteTransition] = useTransition()
  const [isArchivingDish, startArchiveDishTransition] = useTransition()

  const route = { slug, menuId, sectionId: section.id }

  function handleMove(direction: "up" | "down") {
    startMoveTransition(async () => {
      const result = await moveSection({ ...route, direction })
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Section moved")
    })
  }

  function handleDelete() {
    startDeleteTransition(async () => {
      const result = await deleteSection(route)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Section deleted")
      setDeleteOpen(false)
    })
  }

  function handleArchiveDish() {
    if (!archiveDishTarget) return
    startArchiveDishTransition(async () => {
      const result = await archiveDish({
        dishId: archiveDishTarget.id,
        slug,
        menuId,
      })
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Dish archived")
      setArchiveDishTarget(null)
    })
  }

  return (
  <>
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <CardTitle className="truncate">{section.name}</CardTitle>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Rename ${section.name}`}
              onClick={() => setRenameOpen(true)}
            >
              <PencilIcon className="size-4" />
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              disabled={sectionIndex === 0 || isMoving}
              aria-label="Move section up"
              onClick={() => handleMove("up")}
            >
              <ChevronUpIcon className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              disabled={sectionIndex === sectionCount - 1 || isMoving}
              aria-label="Move section down"
              onClick={() => handleMove("down")}
            >
              <ChevronDownIcon className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeleteOpen(true)}
            >
              Delete
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {section.dishes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No dishes in this section yet.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {section.dishes.map((dish) => (
              <li key={dish.id} className="relative flex items-stretch">
                <Link
                  href={`/r/${slug}/menus/${menuId}/dishes/${dish.id}`}
                  className="flex min-w-0 flex-1 flex-col gap-0.5 px-3 py-3 pr-12 transition-colors hover:bg-muted/40"
                >
                  <span className="font-medium">{dish.name}</span>
                  {dish.menu_description ? (
                    <span className="truncate text-sm text-muted-foreground">
                      {dish.menu_description}
                    </span>
                  ) : null}
                </Link>
                <div className="absolute top-2 right-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Dish actions for ${dish.name}`}
                        onClick={(event) => event.preventDefault()}
                      >
                        <MoreVerticalIcon className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onSelect={() => setRenameDishTarget(dish)}
                      >
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => setArchiveDishTarget(dish)}
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
        <Button
          type="button"
          variant="outline"
          className="mt-2 w-full sm:w-auto"
          onClick={() => setNewDishOpen(true)}
        >
          New dish
        </Button>
      </CardContent>
    </Card>

    <NameDialog
      key={`rename-section-${section.id}`}
      open={renameOpen}
      onOpenChange={setRenameOpen}
      title="Rename section"
      description="Update the section name on this menu."
      defaultName={section.name}
      submitLabel="Save"
      successMessage="Section renamed"
      onSubmit={(name) => renameSection({ ...route, name })}
    />

    <NameDialog
      open={newDishOpen}
      onOpenChange={setNewDishOpen}
      title="New dish"
      description="Add a dish to this section. You can add a menu description on the dish page."
      submitLabel="Create dish"
      successMessage="Dish created"
      onSubmit={(name) =>
        createDish({ sectionId: section.id, name, slug, menuId })
      }
    />

    <NameDialog
      key={renameDishTarget?.id ?? "rename-dish-closed"}
      open={renameDishTarget !== null}
      onOpenChange={(open) => {
        if (!open) setRenameDishTarget(null)
      }}
      title="Rename dish"
      description="Update the dish name."
      defaultName={renameDishTarget?.name}
      submitLabel="Save"
      successMessage="Dish renamed"
      onSubmit={async (name) => {
        if (!renameDishTarget) return { error: "No dish selected" }
        return renameDish({
          dishId: renameDishTarget.id,
          name,
          slug,
          menuId,
        })
      }}
    />

    <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete section?</DialogTitle>
          <DialogDescription>
            Delete {section.name} and all its dishes? This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isDeleting}
            onClick={() => setDeleteOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isDeleting}
            onClick={handleDelete}
          >
            {isDeleting ? (
              <>
                <Loader2Icon className="animate-spin" />
                Deleting…
              </>
            ) : (
              "Delete section"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog
      open={archiveDishTarget !== null}
      onOpenChange={(open) => {
        if (!open) setArchiveDishTarget(null)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Archive dish?</DialogTitle>
          <DialogDescription>
            Archive {archiveDishTarget?.name}? It will be hidden from this menu.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isArchivingDish}
            onClick={() => setArchiveDishTarget(null)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isArchivingDish}
            onClick={handleArchiveDish}
          >
            {isArchivingDish ? (
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

export function MenuDetail({
  slug,
  menuId,
  menuName,
  sections,
}: MenuDetailProps) {
  const [renameMenuOpen, setRenameMenuOpen] = useState(false)
  const [newSectionOpen, setNewSectionOpen] = useState(false)

  return (
    <>
      <p className="mb-4 text-sm">
        <Link href={`/r/${slug}`} className="text-primary hover:underline">
          ← Menus
        </Link>
      </p>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="truncate text-2xl font-semibold tracking-tight">
            {menuName}
          </h1>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Rename menu"
            onClick={() => setRenameMenuOpen(true)}
          >
            <PencilIcon className="size-4" />
          </Button>
        </div>
        <Button
          className="w-full sm:w-auto"
          onClick={() => setNewSectionOpen(true)}
        >
          New section
        </Button>
      </div>

      {sections.length === 0 ? (
        <Card className="mt-8">
          <CardHeader className="text-center">
            <CardTitle>No sections yet</CardTitle>
            <CardDescription>
              Add sections to group dishes on this menu.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-6">
            <Button
              className="w-full sm:w-auto"
              onClick={() => setNewSectionOpen(true)}
            >
              Create your first section
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 flex flex-col gap-6">
          {sections.map((section, index) => (
            <SectionCard
              key={section.id}
              slug={slug}
              menuId={menuId}
              section={section}
              sectionIndex={index}
              sectionCount={sections.length}
            />
          ))}
        </div>
      )}

      <NameDialog
        key={menuId}
        open={renameMenuOpen}
        onOpenChange={setRenameMenuOpen}
        title="Rename menu"
        description="Update the name shown on the menus list."
        defaultName={menuName}
        submitLabel="Save"
        successMessage="Menu renamed"
        onSubmit={(name) => renameMenu({ menuId, name, slug })}
      />

      <NameDialog
        open={newSectionOpen}
        onOpenChange={setNewSectionOpen}
        title="New section"
        description="Sections group dishes, such as Crudos or Ceviches."
        submitLabel="Create section"
        successMessage="Section created"
        onSubmit={(name) => createSection({ menuId, name, slug })}
      />
    </>
  )
}
