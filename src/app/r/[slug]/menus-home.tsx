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
  archiveMenu,
  createMenu,
  renameMenu,
} from "@/app/r/[slug]/actions"
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

const menuNameSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
})

type MenuNameFormValues = z.infer<typeof menuNameSchema>

export type MenuListItem = Tables<"menus"> & {
  sectionCount: number
}

type MenusHomeProps = {
  slug: string
  restaurantId: string
  menus: MenuListItem[]
}

function MenuNameDialog({
  open,
  onOpenChange,
  title,
  description,
  defaultName,
  submitLabel,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  defaultName?: string
  submitLabel: string
  onSubmit: (name: string) => Promise<{ error?: string }>
}) {
  const [formError, setFormError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const form = useForm<MenuNameFormValues>({
    resolver: zodResolver(menuNameSchema),
    defaultValues: { name: defaultName ?? "" },
  })

  function handleOpenChange(next: boolean) {
    if (!next) {
      form.reset({ name: defaultName ?? "" })
      setFormError(null)
    }
    onOpenChange(next)
  }

  function handleSubmit(values: MenuNameFormValues) {
    setFormError(null)
    startTransition(async () => {
      const result = await onSubmit(values.name)
      if (result.error) {
        setFormError(result.error)
        toast.error(result.error)
        return
      }
      toast.success(
        submitLabel === "Create menu" ? "Menu created" : "Menu renamed"
      )
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
            <Label htmlFor="menu-name">Menu name</Label>
            <Input
              id="menu-name"
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

export function MenusHome({ slug, restaurantId, menus }: MenusHomeProps) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)
  const [renameTarget, setRenameTarget] = useState<MenuListItem | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<MenuListItem | null>(null)
  const [isArchiving, startArchiveTransition] = useTransition()

  async function handleCreate(name: string) {
    const result = await createMenu({ restaurantId, name, slug })
    if (result.error) {
      return { error: result.error }
    }
    if (result.menuId) {
      router.push(`/r/${slug}/menus/${result.menuId}`)
    }
    return {}
  }

  function handleArchive() {
    if (!archiveTarget) return
    startArchiveTransition(async () => {
      const result = await archiveMenu({
        menuId: archiveTarget.id,
        slug,
      })
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Menu archived")
      setArchiveTarget(null)
    })
  }

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Menus</h1>
        <Button
          className="w-full sm:w-auto"
          onClick={() => setCreateOpen(true)}
        >
          New menu
        </Button>
      </div>

      {menus.length === 0 ? (
        <Card className="mt-8">
          <CardHeader className="text-center">
            <CardTitle>No menus yet</CardTitle>
            <CardDescription>
              Create a menu to organize sections and dishes.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-6">
            <Button className="w-full sm:w-auto" onClick={() => setCreateOpen(true)}>
              Create your first menu
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {menus.map((menu) => (
            <Card key={menu.id} className="relative overflow-hidden">
              <Link
                href={`/r/${slug}/menus/${menu.id}`}
                className="block transition-colors hover:bg-muted/40"
              >
                <CardHeader>
                  <CardTitle className="pr-8">{menu.name}</CardTitle>
                  <CardDescription>
                    {menu.sectionCount === 1
                      ? "1 section"
                      : `${menu.sectionCount} sections`}
                  </CardDescription>
                </CardHeader>
              </Link>
              <div className="absolute top-3 right-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Menu actions for ${menu.name}`}
                      onClick={(event) => event.preventDefault()}
                    >
                      <MoreVerticalIcon className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onSelect={() => setRenameTarget(menu)}
                    >
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => setArchiveTarget(menu)}
                    >
                      Archive
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </Card>
          ))}
        </div>
      )}

      <MenuNameDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="New menu"
        description="Give this menu a name, such as Dinner or Lunch."
        submitLabel="Create menu"
        onSubmit={handleCreate}
      />

      <MenuNameDialog
        key={renameTarget?.id ?? "rename-closed"}
        open={renameTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRenameTarget(null)
        }}
        title="Rename menu"
        description="Update the name shown on this menu."
        defaultName={renameTarget?.name}
        submitLabel="Save"
        onSubmit={async (name) => {
          if (!renameTarget) return { error: "No menu selected" }
          return renameMenu({
            menuId: renameTarget.id,
            name,
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
            <DialogTitle>Archive menu?</DialogTitle>
            <DialogDescription>
              Archive {archiveTarget?.name}? You can find archived menus later.
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
