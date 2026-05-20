"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { Loader2Icon, PlusIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"

import {
  confirmMenuImport,
  parseUploadedMenu,
} from "@/app/onboarding/review/actions"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  draftToParsed,
  type DraftMenuTree,
} from "@/lib/menu-parse/types"

type MenuReviewProps = {
  storagePath: string
  source: "file" | "paste"
  initialName: string
  initialSlug: string
  initialTree: DraftMenuTree | null
  initialParseError: string | null
}

export function MenuReview({
  storagePath,
  source,
  initialName,
  initialSlug,
  initialTree,
  initialParseError,
}: MenuReviewProps) {
  const [name, setName] = useState(initialName)
  const [slug, setSlug] = useState(initialSlug)
  const [tree, setTree] = useState<DraftMenuTree | null>(initialTree)
  const [parseError, setParseError] = useState<string | null>(initialParseError)
  const [isParsing, startParseTransition] = useTransition()
  const [isConfirming, startConfirmTransition] = useTransition()

  function runParse() {
    setParseError(null)
    startParseTransition(async () => {
      const result = await parseUploadedMenu({ storagePath, source })
      if (result.error) {
        setParseError(result.error)
        setTree(null)
        toast.error(result.error)
        return
      }
      if (result.tree) {
        setTree(result.tree)
        setParseError(null)
      }
    })
  }

  function updateMenuName(menuId: string, menuName: string) {
    setTree((prev) =>
      prev
        ? {
            menus: prev.menus.map((m) =>
              m.id === menuId ? { ...m, name: menuName } : m
            ),
          }
        : prev
    )
  }

  function updateSectionName(
    menuId: string,
    sectionId: string,
    name: string
  ) {
    setTree((prev) =>
      prev
        ? {
            menus: prev.menus.map((m) =>
              m.id === menuId
                ? {
                    ...m,
                    sections: m.sections.map((s) =>
                      s.id === sectionId ? { ...s, name } : s
                    ),
                  }
                : m
            ),
          }
        : prev
    )
  }

  function addSection(menuId: string) {
    setTree((prev) =>
      prev
        ? {
            menus: prev.menus.map((m) =>
              m.id === menuId
                ? {
                    ...m,
                    sections: [
                      ...m.sections,
                      {
                        id: crypto.randomUUID(),
                        name: "New section",
                        dishes: [
                          {
                            id: crypto.randomUUID(),
                            name: "New dish",
                            menu_description: null,
                          },
                        ],
                      },
                    ],
                  }
                : m
            ),
          }
        : prev
    )
  }

  function removeSection(menuId: string, sectionId: string) {
    setTree((prev) =>
      prev
        ? {
            menus: prev.menus.map((m) =>
              m.id === menuId
                ? {
                    ...m,
                    sections: m.sections.filter((s) => s.id !== sectionId),
                  }
                : m
            ),
          }
        : prev
    )
  }

  function addDish(menuId: string, sectionId: string) {
    setTree((prev) =>
      prev
        ? {
            menus: prev.menus.map((m) =>
              m.id === menuId
                ? {
                    ...m,
                    sections: m.sections.map((s) =>
                      s.id === sectionId
                        ? {
                            ...s,
                            dishes: [
                              ...s.dishes,
                              {
                                id: crypto.randomUUID(),
                                name: "New dish",
                                menu_description: null,
                              },
                            ],
                          }
                        : s
                    ),
                  }
                : m
            ),
          }
        : prev
    )
  }

  function updateDish(
    menuId: string,
    sectionId: string,
    dishId: string,
    patch: { name?: string; menu_description?: string | null }
  ) {
    setTree((prev) =>
      prev
        ? {
            menus: prev.menus.map((m) =>
              m.id === menuId
                ? {
                    ...m,
                    sections: m.sections.map((s) =>
                      s.id === sectionId
                        ? {
                            ...s,
                            dishes: s.dishes.map((d) =>
                              d.id === dishId ? { ...d, ...patch } : d
                            ),
                          }
                        : s
                    ),
                  }
                : m
            ),
          }
        : prev
    )
  }

  function removeDish(menuId: string, sectionId: string, dishId: string) {
    setTree((prev) =>
      prev
        ? {
            menus: prev.menus.map((m) =>
              m.id === menuId
                ? {
                    ...m,
                    sections: m.sections.map((s) =>
                      s.id === sectionId
                        ? {
                            ...s,
                            dishes: s.dishes.filter((d) => d.id !== dishId),
                          }
                        : s
                    ),
                  }
                : m
            ),
          }
        : prev
    )
  }

  function handleConfirm() {
    if (!tree) return
    const parsed = draftToParsed(tree)
    if (parsed.menus.length === 0) {
      toast.error("Add at least one menu.")
      return
    }

    startConfirmTransition(async () => {
      const result = await confirmMenuImport({
        name,
        slug,
        tree: parsed,
      })
      if (result?.error) {
        toast.error(result.error)
      }
    })
  }

  const busy = isParsing || isConfirming

  return (
    <div className="w-full max-w-3xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Review your menu
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Fix anything the parser got wrong, then create your restaurant.
          </p>
        </div>
        <Link
          href="/onboarding/upload"
          className="text-sm text-muted-foreground hover:text-foreground hover:underline"
        >
          Back to upload
        </Link>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Restaurant</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="review-name">Name</Label>
            <Input
              id="review-name"
              value={name}
              disabled={busy}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="review-slug">URL slug</Label>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <span className="shrink-0">/r/</span>
              <Input
                id="review-slug"
                value={slug}
                disabled={busy}
                onChange={(e) => setSlug(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {isParsing ? (
        <Card>
          <CardContent className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2Icon className="size-5 animate-spin" />
            Parsing your menu…
          </CardContent>
        </Card>
      ) : null}

      {parseError && !tree ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-10">
            <p className="text-center text-sm text-destructive">{parseError}</p>
            <Button type="button" variant="outline" onClick={runParse}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {tree ? (
        <div className="flex flex-col gap-6">
          {tree.menus.map((menu) => (
            <Card key={menu.id}>
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="grid flex-1 gap-2">
                    <Label>Menu name</Label>
                    <Input
                      value={menu.name}
                      disabled={busy}
                      onChange={(e) =>
                        updateMenuName(menu.id, e.target.value)
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => addSection(menu.id)}
                  >
                    <PlusIcon className="size-4" />
                    Add section
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-6">
                {menu.sections.map((section) => (
                  <div
                    key={section.id}
                    className="rounded-lg border bg-muted/20 p-4"
                  >
                    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="grid flex-1 gap-2">
                        <Label className="text-xs text-muted-foreground">
                          Section
                        </Label>
                        <Input
                          value={section.name}
                          disabled={busy}
                          onChange={(e) =>
                            updateSectionName(
                              menu.id,
                              section.id,
                              e.target.value
                            )
                          }
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          onClick={() => addDish(menu.id, section.id)}
                        >
                          <PlusIcon className="size-4" />
                          Dish
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          disabled={busy || menu.sections.length <= 1}
                          aria-label="Remove section"
                          onClick={() => removeSection(menu.id, section.id)}
                        >
                          <Trash2Icon className="size-4" />
                        </Button>
                      </div>
                    </div>
                    <ul className="flex flex-col gap-3">
                      {section.dishes.map((dish) => (
                        <li
                          key={dish.id}
                          className="grid gap-2 rounded-md border bg-background p-3"
                        >
                          <div className="flex gap-2">
                            <Input
                              value={dish.name}
                              placeholder="Dish name"
                              disabled={busy}
                              className="flex-1"
                              onChange={(e) =>
                                updateDish(menu.id, section.id, dish.id, {
                                  name: e.target.value,
                                })
                              }
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              disabled={busy || section.dishes.length <= 1}
                              aria-label="Remove dish"
                              onClick={() =>
                                removeDish(menu.id, section.id, dish.id)
                              }
                            >
                              <Trash2Icon className="size-4" />
                            </Button>
                          </div>
                          <Textarea
                            value={dish.menu_description ?? ""}
                            placeholder="Menu description (optional)"
                            disabled={busy}
                            rows={2}
                            className="text-sm"
                            onChange={(e) =>
                              updateDish(menu.id, section.id, dish.id, {
                                menu_description: e.target.value || null,
                              })
                            }
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={runParse}
            >
              Re-parse from file
            </Button>
            <Button
              type="button"
              disabled={busy}
              className="w-full sm:w-auto"
              onClick={handleConfirm}
            >
              {isConfirming ? (
                <>
                  <Loader2Icon className="animate-spin" />
                  Creating restaurant…
                </>
              ) : (
                "Create restaurant"
              )}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
