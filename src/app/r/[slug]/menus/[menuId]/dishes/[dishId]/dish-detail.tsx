"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { ChevronRightIcon, Loader2Icon, PencilIcon } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import {
  archiveDish,
  renameDish,
} from "@/app/r/[slug]/menus/[menuId]/actions"
import { updateDishDescription } from "@/app/r/[slug]/menus/[menuId]/dishes/[dishId]/actions"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const nameSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
})

type NameFormValues = z.infer<typeof nameSchema>

type DishDetailProps = {
  slug: string
  menuId: string
  menuName: string
  sectionName: string
  dishId: string
  dishName: string
  menuDescription: string | null
}

export function DishDetail({
  slug,
  menuId,
  menuName,
  sectionName,
  dishId,
  dishName,
  menuDescription,
}: DishDetailProps) {
  const router = useRouter()
  const menuPath = `/r/${slug}/menus/${menuId}`

  const [renameOpen, setRenameOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [savedDescription, setSavedDescription] = useState(
    menuDescription ?? ""
  )
  const [draftDescription, setDraftDescription] = useState(
    menuDescription ?? ""
  )
  const [isSavingDescription, startSaveDescription] = useTransition()
  const [isArchiving, startArchive] = useTransition()

  const descriptionDirty = draftDescription !== savedDescription

  const renameForm = useForm<NameFormValues>({
    resolver: zodResolver(nameSchema),
    defaultValues: { name: dishName },
  })
  const [renameError, setRenameError] = useState<string | null>(null)
  const [isRenaming, startRename] = useTransition()

  function handleRenameOpenChange(open: boolean) {
    if (!open) {
      renameForm.reset({ name: dishName })
      setRenameError(null)
    }
    setRenameOpen(open)
  }

  function handleRenameSubmit(values: NameFormValues) {
    setRenameError(null)
    startRename(async () => {
      const result = await renameDish({
        dishId,
        name: values.name,
        slug,
        menuId,
      })
      if (result.error) {
        setRenameError(result.error)
        toast.error(result.error)
        return
      }
      toast.success("Dish renamed")
      handleRenameOpenChange(false)
      router.refresh()
    })
  }

  function handleCancelDescription() {
    setDraftDescription(savedDescription)
  }

  function handleSaveDescription() {
    if (draftDescription.length > 500) {
      toast.error("Description must be 500 characters or less")
      return
    }
    startSaveDescription(async () => {
      const result = await updateDishDescription({
        dishId,
        menuDescription: draftDescription,
        slug,
        menuId,
      })
      if (result.error) {
        toast.error(result.error)
        return
      }
      const trimmed = draftDescription.trim()
      setSavedDescription(trimmed)
      setDraftDescription(trimmed)
      toast.success("Menu description saved")
      router.refresh()
    })
  }

  function handleArchive() {
    startArchive(async () => {
      const result = await archiveDish({ dishId, slug, menuId })
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Dish archived")
      router.push(menuPath)
    })
  }

  return (
    <>
      <nav
        aria-label="Breadcrumb"
        className="mb-6 flex flex-wrap items-center gap-1 text-sm text-muted-foreground"
      >
        <Link href={menuPath} className="hover:text-foreground hover:underline">
          {menuName}
        </Link>
        <ChevronRightIcon className="size-4 shrink-0" aria-hidden />
        <Link href={menuPath} className="hover:text-foreground hover:underline">
          {sectionName}
        </Link>
        <ChevronRightIcon className="size-4 shrink-0" aria-hidden />
        <span className="text-foreground">{dishName}</span>
      </nav>

      <div className="flex min-w-0 items-center gap-2">
        <h1 className="truncate text-2xl font-semibold tracking-tight">
          {dishName}
        </h1>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Rename dish"
          onClick={() => setRenameOpen(true)}
        >
          <PencilIcon className="size-4" />
        </Button>
      </div>

      <div className="mt-8">
        <Label htmlFor="menu-description" className="text-base font-medium">
          Menu description
        </Label>
        <p className="mt-1 text-sm text-muted-foreground">
          Guest-facing copy for this dish on the menu.
        </p>
        <Textarea
          id="menu-description"
          className="mt-3 min-h-28"
          value={draftDescription}
          disabled={isSavingDescription}
          maxLength={500}
          onChange={(event) => setDraftDescription(event.target.value)}
        />
        <p className="mt-1 text-right text-xs text-muted-foreground">
          {draftDescription.length}/500
        </p>
        {descriptionDirty ? (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              className="w-full sm:w-auto"
              disabled={isSavingDescription}
              onClick={handleSaveDescription}
            >
              {isSavingDescription ? (
                <>
                  <Loader2Icon className="animate-spin" />
                  Saving…
                </>
              ) : (
                "Save"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              disabled={isSavingDescription}
              onClick={handleCancelDescription}
            >
              Cancel
            </Button>
          </div>
        ) : null}
      </div>

      <Card className="mt-10">
        <CardHeader>
          <CardTitle>Components</CardTitle>
          <CardDescription>
            Components and recipes come in the next phase.
          </CardDescription>
        </CardHeader>
        <CardContent />
      </Card>

      <div className="mt-10 border-t pt-8">
        <Button
          type="button"
          variant="ghost"
          className="h-auto p-0 text-destructive hover:bg-transparent hover:text-destructive"
          onClick={() => setArchiveOpen(true)}
        >
          Archive dish
        </Button>
      </div>

      <Dialog open={renameOpen} onOpenChange={handleRenameOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename dish</DialogTitle>
            <DialogDescription>Update the dish name.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={renameForm.handleSubmit(handleRenameSubmit)}
            className="flex flex-col gap-4"
          >
            {renameError ? (
              <p className="text-sm text-destructive" role="alert">
                {renameError}
              </p>
            ) : null}
            <div className="grid gap-2">
              <Label htmlFor="dish-name">Name</Label>
              <Input
                id="dish-name"
                disabled={isRenaming}
                autoFocus
                {...renameForm.register("name")}
              />
              {renameForm.formState.errors.name ? (
                <p className="text-sm text-destructive">
                  {renameForm.formState.errors.name.message}
                </p>
              ) : null}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={isRenaming}
                onClick={() => handleRenameOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isRenaming}>
                {isRenaming ? (
                  <>
                    <Loader2Icon className="animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive dish?</DialogTitle>
            <DialogDescription>
              Archive {dishName}? It will be hidden from this menu.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isArchiving}
              onClick={() => setArchiveOpen(false)}
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
