"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { ChevronDownIcon, Loader2Icon } from "lucide-react"
import { useForm } from "react-hook-form"
import Markdown from "react-markdown"
import { toast } from "sonner"
import { z } from "zod"

import {
  changeRecipeVersionStatus,
  forceUnapproveRecipeVersion,
  updateRecipeVersion,
} from "@/app/r/[slug]/components/[componentId]/versions/actions"
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
import { Textarea } from "@/components/ui/textarea"
import { formatRelativeDate } from "@/lib/format-relative-date"
import {
  getStatusTransitions,
  isVersionEditable,
  statusBadgeClassName,
  statusLabel,
  type ForceUnapproveTargetStatus,
  type RecipeVersionStatus,
  type StatusTransition,
} from "@/lib/recipe-versions/status"
import {
  formatUnitLabel,
  UNIT_TYPE_VALUES,
  type UnitType,
} from "@/lib/recipe-versions/units"
import type { Tables } from "@/lib/supabase/database.types"

const versionFormSchema = z
  .object({
    title: z.string().max(100),
    yieldAmount: z.string(),
    yieldUnit: z.string(),
    method: z.string().max(10000),
  })
  .superRefine((data, ctx) => {
    const amountRaw = data.yieldAmount.trim()
    if (amountRaw === "") {
      return
    }
    const amount = Number(amountRaw)
    if (Number.isNaN(amount) || amount <= 0) {
      ctx.addIssue({
        code: "custom",
        message: "Yield must be a positive number",
        path: ["yieldAmount"],
      })
      return
    }
    if (!data.yieldUnit || data.yieldUnit === "__none__") {
      ctx.addIssue({
        code: "custom",
        message: "Yield unit is required when yield amount is set",
        path: ["yieldUnit"],
      })
    }
  })

type VersionFormValues = z.infer<typeof versionFormSchema>

export type VersionWithComponent = Tables<"recipe_versions"> & {
  components: {
    id: string
    name: string
    description: string | null
  }
}

type VersionDetailProps = {
  slug: string
  componentId: string
  version: VersionWithComponent
}

function toFormValues(version: VersionWithComponent): VersionFormValues {
  return {
    title: version.title ?? "",
    yieldAmount:
      version.yield_amount != null ? String(version.yield_amount) : "",
    yieldUnit: version.yield_unit ?? "__none__",
    method: version.method ?? "",
  }
}

function parseYieldForSubmit(values: VersionFormValues) {
  const amountRaw = values.yieldAmount.trim()
  if (amountRaw === "") {
    return { yieldAmount: null as number | null, yieldUnit: null as UnitType | null }
  }
  const unit =
    values.yieldUnit && values.yieldUnit !== "__none__"
      ? (values.yieldUnit as UnitType)
      : null
  return {
    yieldAmount: Number(amountRaw),
    yieldUnit: unit,
  }
}

export function VersionDetail({ slug, componentId, version }: VersionDetailProps) {
  const router = useRouter()
  const editable = isVersionEditable(version.status)
  const transitions = getStatusTransitions(version.status as RecipeVersionStatus)

  const [pendingTransition, setPendingTransition] =
    useState<StatusTransition | null>(null)
  const [forceDialogOpen, setForceDialogOpen] = useState(false)
  const [forceTargetStatus, setForceTargetStatus] =
    useState<ForceUnapproveTargetStatus | null>(null)
  const [dependentCount, setDependentCount] = useState<number | undefined>()
  const [statusError, setStatusError] = useState<string | null>(null)

  const [isSaving, startSaveTransition] = useTransition()
  const [isChangingStatus, startStatusTransition] = useTransition()
  const [isForceUnapproving, startForceTransition] = useTransition()

  const form = useForm<VersionFormValues>({
    resolver: zodResolver(versionFormSchema),
    defaultValues: toFormValues(version),
  })

  const { isDirty } = form.formState

  function handleSave(values: VersionFormValues) {
    const { yieldAmount, yieldUnit } = parseYieldForSubmit(values)
    startSaveTransition(async () => {
      const result = await updateRecipeVersion({
        versionId: version.id,
        slug,
        componentId,
        title: values.title,
        yieldAmount,
        yieldUnit,
        method: values.method,
      })
      if (result.error === "immutable") {
        toast.error("Approved recipes cannot be edited.")
        router.refresh()
        return
      }
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Recipe saved")
      form.reset(values)
      router.refresh()
    })
  }

  function handleCancel() {
    form.reset(toFormValues(version))
  }

  function runStatusChange(newStatus: RecipeVersionStatus) {
    setStatusError(null)
    startStatusTransition(async () => {
      const result = await changeRecipeVersionStatus({
        versionId: version.id,
        slug,
        componentId,
        newStatus,
      })

      if ("error" in result) {
        if (result.error === "has_dependents") {
          setDependentCount(result.dependentCount)
          if (newStatus === "approved") return
          setForceTargetStatus(newStatus)
          setForceDialogOpen(true)
          setPendingTransition(null)
          return
        }
        if (result.error === "unapproved_subs" || result.error === "generic") {
          setStatusError(result.message)
          toast.error(result.message)
          setPendingTransition(null)
          return
        }
      }

      if ("ok" in result && result.ok) {
        toast.success(`Status updated to ${statusLabel(newStatus)}`)
        setPendingTransition(null)
        router.refresh()
      }
    })
  }

  function handleForceUnapprove() {
    if (!forceTargetStatus) return
    startForceTransition(async () => {
      const result = await forceUnapproveRecipeVersion({
        versionId: version.id,
        slug,
        componentId,
        newStatus: forceTargetStatus,
      })
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(`Status updated to ${statusLabel(forceTargetStatus)}`)
      setForceDialogOpen(false)
      setForceTargetStatus(null)
      router.refresh()
    })
  }

  const componentPath = `/r/${slug}/components/${componentId}`
  const displayTitle = version.title?.trim()

  return (
    <div>
      <nav
        aria-label="Breadcrumb"
        className="mb-6 flex flex-wrap items-center gap-1 text-sm text-muted-foreground"
      >
        <Link
          href={`/r/${slug}/components`}
          className="hover:text-foreground hover:underline"
        >
          Components
        </Link>
        <span>/</span>
        <Link href={componentPath} className="hover:text-foreground hover:underline">
          {version.components.name}
        </Link>
        <span>/</span>
        <span className="text-foreground">v{version.version_number}</span>
      </nav>

      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-3xl font-semibold tracking-tight">
              v{version.version_number}
            </span>
            {displayTitle ? (
              <span className="text-2xl font-medium">{displayTitle}</span>
            ) : (
              <span className="text-2xl text-muted-foreground">Untitled draft</span>
            )}
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClassName(version.status)}`}
            >
              {statusLabel(version.status)}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Created {formatRelativeDate(version.created_at)}
            {version.approved_at
              ? ` · Approved ${formatRelativeDate(version.approved_at)}`
              : null}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full sm:w-auto">
              Change status
              <ChevronDownIcon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {transitions.map((transition) => (
              <DropdownMenuItem
                key={transition.newStatus + transition.label}
                onSelect={() => setPendingTransition(transition)}
              >
                {transition.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {statusError ? (
        <p className="mt-4 text-sm text-destructive" role="alert">
          {statusError}
        </p>
      ) : null}

      {editable ? (
        <form
          onSubmit={form.handleSubmit(handleSave)}
          className="mt-8 flex max-w-2xl flex-col gap-6"
        >
          <div className="grid gap-2">
            <Label htmlFor="version-title">Title</Label>
            <Input
              id="version-title"
              placeholder="e.g. 'After Mykos refinement'"
              disabled={isSaving}
              {...form.register("title")}
            />
            {form.formState.errors.title ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.title.message}
              </p>
            ) : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="yield-amount">Yield amount</Label>
              <Input
                id="yield-amount"
                type="number"
                min="0"
                step="any"
                disabled={isSaving}
                {...form.register("yieldAmount")}
              />
              {form.formState.errors.yieldAmount ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.yieldAmount.message}
                </p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="yield-unit">Yield unit</Label>
              <Select
                value={form.watch("yieldUnit") || "__none__"}
                onValueChange={(value) =>
                  form.setValue("yieldUnit", value, { shouldDirty: true })
                }
                disabled={isSaving}
              >
                <SelectTrigger id="yield-unit" className="w-full">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No unit</SelectItem>
                  {UNIT_TYPE_VALUES.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {formatUnitLabel(unit)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.yieldUnit ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.yieldUnit.message}
                </p>
              ) : null}
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="version-method">Method</Label>
            <Textarea
              id="version-method"
              className="min-h-48 font-mono text-sm"
              disabled={isSaving}
              {...form.register("method")}
            />
            <p className="text-xs text-muted-foreground">Markdown supported</p>
            {form.formState.errors.method ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.method.message}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="submit" disabled={!isDirty || isSaving}>
              {isSaving ? (
                <>
                  <Loader2Icon className="animate-spin" />
                  Saving…
                </>
              ) : (
                "Save changes"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!isDirty || isSaving}
              onClick={handleCancel}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="mt-8 max-w-2xl">
          <p className="rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            Approved recipes are immutable. Change status to draft to edit, or
            create a new version.
          </p>
          <div className="mt-6 flex flex-col gap-4">
            {displayTitle ? (
              <h2 className="text-xl font-semibold">{displayTitle}</h2>
            ) : null}
            {version.yield_amount != null && version.yield_unit ? (
              <p className="text-sm">
                <span className="font-medium">Yield:</span> {version.yield_amount}{" "}
                {formatUnitLabel(version.yield_unit)}
              </p>
            ) : null}
            <div>
              <p className="mb-2 text-sm font-medium">Method</p>
              {version.method?.trim() ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <Markdown>{version.method}</Markdown>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No method written</p>
              )}
            </div>
          </div>
        </div>
      )}

      <AlertDialog
        open={pendingTransition !== null}
        onOpenChange={(open) => {
          if (!open) setPendingTransition(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingTransition?.confirmTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingTransition?.confirmDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isChangingStatus}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isChangingStatus}
              onClick={(event) => {
                event.preventDefault()
                if (pendingTransition) {
                  runStatusChange(pendingTransition.newStatus)
                }
              }}
            >
              {isChangingStatus ? (
                <>
                  <Loader2Icon className="animate-spin" />
                  Updating…
                </>
              ) : (
                "Confirm"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={forceDialogOpen} onOpenChange={setForceDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Force un-approve?</AlertDialogTitle>
            <AlertDialogDescription>
              {dependentCount != null
                ? `${dependentCount} approved recipe(s) depend on this version. Un-approving requires confirming you understand other recipes may break. Continue with force un-approve?`
                : "Approved recipe(s) depend on this version. Continue with force un-approve?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isForceUnapproving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={isForceUnapproving}
              onClick={(event) => {
                event.preventDefault()
                handleForceUnapprove()
              }}
            >
              {isForceUnapproving ? (
                <>
                  <Loader2Icon className="animate-spin" />
                  Forcing…
                </>
              ) : (
                "Force un-approve"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
