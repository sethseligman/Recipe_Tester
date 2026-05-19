"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { Loader2Icon, MoreVerticalIcon } from "lucide-react"
import { toast } from "sonner"

import {
  linkDishComponent,
  unlinkDishComponent,
  updateDishComponentRole,
} from "@/app/r/[slug]/menus/[menuId]/dishes/[dishId]/actions"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const ROLE_SUGGESTIONS = [
  "base",
  "protein",
  "garnish",
  "sauce",
  "accompaniment",
] as const

export type LinkedComponentRow = {
  id: string
  role: string | null
  position: number
  component: {
    id: string
    name: string
    is_archived: boolean
  }
}

export type ComponentOption = {
  id: string
  name: string
}

type DishComponentsSectionProps = {
  slug: string
  menuId: string
  dishId: string
  linked: LinkedComponentRow[]
  availableComponents: ComponentOption[]
}

export function DishComponentsSection({
  slug,
  menuId,
  dishId,
  linked,
  availableComponents,
}: DishComponentsSectionProps) {
  const [linkOpen, setLinkOpen] = useState(false)
  const [selectedComponentId, setSelectedComponentId] = useState<string>("")
  const [linkRole, setLinkRole] = useState("")
  const [unlinkTarget, setUnlinkTarget] = useState<LinkedComponentRow | null>(
    null
  )
  const [editRoleTarget, setEditRoleTarget] = useState<LinkedComponentRow | null>(
    null
  )
  const [editRole, setEditRole] = useState("")
  const [isLinking, startLink] = useTransition()
  const [isUnlinking, startUnlink] = useTransition()
  const [isUpdatingRole, startUpdateRole] = useTransition()

  const linkedIds = new Set(linked.map((row) => row.component.id))
  const linkableComponents = availableComponents.filter(
    (c) => !linkedIds.has(c.id)
  )

  const route = { dishId, slug, menuId }

  function handleLinkOpenChange(open: boolean) {
    if (!open) {
      setSelectedComponentId("")
      setLinkRole("")
    }
    setLinkOpen(open)
  }

  function handleLink() {
    if (!selectedComponentId) {
      toast.error("Choose a component")
      return
    }
    startLink(async () => {
      const result = await linkDishComponent({
        ...route,
        componentId: selectedComponentId,
        role: linkRole || null,
      })
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Component linked")
      handleLinkOpenChange(false)
    })
  }

  function handleUnlink() {
    if (!unlinkTarget) return
    startUnlink(async () => {
      const result = await unlinkDishComponent({
        ...route,
        dishComponentId: unlinkTarget.id,
      })
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Component removed")
      setUnlinkTarget(null)
    })
  }

  function handleUpdateRole() {
    if (!editRoleTarget) return
    startUpdateRole(async () => {
      const result = await updateDishComponentRole({
        ...route,
        dishComponentId: editRoleTarget.id,
        role: editRole || null,
      })
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Role updated")
      setEditRoleTarget(null)
    })
  }

  return (
    <Card className="mt-10">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Components</CardTitle>
          <CardDescription>
            Reusable recipe building blocks that make up this dish.
          </CardDescription>
        </div>
        <Button
          type="button"
          className="w-full shrink-0 sm:w-auto"
          disabled={linkableComponents.length === 0}
          onClick={() => setLinkOpen(true)}
        >
          Link component
        </Button>
      </CardHeader>
      <CardContent>
        {linked.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No components linked yet. Link an existing component or create one
            from the{" "}
            <Link
              href={`/r/${slug}/components`}
              className="text-primary hover:underline"
            >
              components library
            </Link>
            .
          </p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {linked.map((row) => (
              <li
                key={row.id}
                className="relative flex items-center gap-3 px-3 py-3 pr-12"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/r/${slug}/components/${row.component.id}`}
                    className="font-medium hover:underline"
                  >
                    {row.component.name}
                  </Link>
                  {row.component.is_archived ? (
                    <span className="ml-2 text-xs text-muted-foreground">
                      (archived)
                    </span>
                  ) : null}
                  {row.role ? (
                    <p className="text-sm text-muted-foreground">{row.role}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">No role set</p>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="absolute top-2 right-2"
                      aria-label={`Actions for ${row.component.name}`}
                    >
                      <MoreVerticalIcon className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onSelect={() => {
                        setEditRoleTarget(row)
                        setEditRole(row.role ?? "")
                      }}
                    >
                      Edit role
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => setUnlinkTarget(row)}
                    >
                      Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog open={linkOpen} onOpenChange={handleLinkOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link component</DialogTitle>
            <DialogDescription>
              Choose a component from your library to attach to this dish.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="link-component">Component</Label>
              <Select
                value={selectedComponentId}
                onValueChange={setSelectedComponentId}
                disabled={isLinking}
              >
                <SelectTrigger id="link-component" className="w-full">
                  <SelectValue placeholder="Select a component" />
                </SelectTrigger>
                <SelectContent>
                  {linkableComponents.map((component) => (
                    <SelectItem key={component.id} value={component.id}>
                      {component.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="link-role">Role (optional)</Label>
              <Input
                id="link-role"
                list="role-suggestions"
                placeholder="e.g. base, protein, garnish"
                value={linkRole}
                disabled={isLinking}
                onChange={(event) => setLinkRole(event.target.value)}
              />
              <datalist id="role-suggestions">
                {ROLE_SUGGESTIONS.map((role) => (
                  <option key={role} value={role} />
                ))}
              </datalist>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isLinking}
              onClick={() => handleLinkOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="button" disabled={isLinking} onClick={handleLink}>
              {isLinking ? (
                <>
                  <Loader2Icon className="animate-spin" />
                  Linking…
                </>
              ) : (
                "Link"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editRoleTarget !== null}
        onOpenChange={(open) => {
          if (!open) setEditRoleTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit role</DialogTitle>
            <DialogDescription>
              Role for {editRoleTarget?.component.name} on this dish.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="edit-role">Role</Label>
            <Input
              id="edit-role"
              list="role-suggestions-edit"
              value={editRole}
              disabled={isUpdatingRole}
              onChange={(event) => setEditRole(event.target.value)}
            />
            <datalist id="role-suggestions-edit">
              {ROLE_SUGGESTIONS.map((role) => (
                <option key={role} value={role} />
              ))}
            </datalist>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isUpdatingRole}
              onClick={() => setEditRoleTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isUpdatingRole}
              onClick={handleUpdateRole}
            >
              {isUpdatingRole ? (
                <>
                  <Loader2Icon className="animate-spin" />
                  Saving…
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={unlinkTarget !== null}
        onOpenChange={(open) => {
          if (!open) setUnlinkTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove component?</DialogTitle>
            <DialogDescription>
              Remove {unlinkTarget?.component.name} from this dish? The
              component itself will stay in your library.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isUnlinking}
              onClick={() => setUnlinkTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isUnlinking}
              onClick={handleUnlink}
            >
              {isUnlinking ? (
                <>
                  <Loader2Icon className="animate-spin" />
                  Removing…
                </>
              ) : (
                "Remove"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
