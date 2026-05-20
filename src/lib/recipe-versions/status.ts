import type { Tables } from "@/lib/supabase/database.types"

export type RecipeVersionStatus =
  | "draft"
  | "testing"
  | "approved"
  | "archived"

/** Status targets allowed for force_unapprove_recipe_version RPC */
export type ForceUnapproveTargetStatus = Exclude<
  RecipeVersionStatus,
  "approved"
>

export const RECIPE_VERSION_STATUSES: RecipeVersionStatus[] = [
  "draft",
  "testing",
  "approved",
  "archived",
]

export type RecipeVersionRow = Tables<"recipe_versions">

export function isRecipeVersionStatus(value: string): value is RecipeVersionStatus {
  return RECIPE_VERSION_STATUSES.includes(value as RecipeVersionStatus)
}

export function statusBadgeClassName(status: string): string {
  switch (status) {
    case "draft":
      return "bg-muted text-muted-foreground"
    case "testing":
      return "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200"
    case "approved":
      return "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200"
    case "archived":
      return "bg-muted text-muted-foreground line-through"
    default:
      return "bg-muted text-muted-foreground"
  }
}

export function statusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

export type StatusTransition = {
  label: string
  newStatus: RecipeVersionStatus
  confirmTitle: string
  confirmDescription: string
}

export function getStatusTransitions(
  current: RecipeVersionStatus
): StatusTransition[] {
  switch (current) {
    case "draft":
      return [
        {
          label: "Mark as testing",
          newStatus: "testing",
          confirmTitle: "Mark as testing?",
          confirmDescription:
            "Move this version into testing. You can still edit the recipe while it is in testing.",
        },
        {
          label: "Mark as approved",
          newStatus: "approved",
          confirmTitle: "Approve this version?",
          confirmDescription:
            "Approve this version? Approved versions become immutable references and can be used as sub-recipes elsewhere.",
        },
        {
          label: "Archive",
          newStatus: "archived",
          confirmTitle: "Archive this version?",
          confirmDescription:
            "Archive this version? It will be hidden from the active versions list.",
        },
      ]
    case "testing":
      return [
        {
          label: "Back to draft",
          newStatus: "draft",
          confirmTitle: "Move back to draft?",
          confirmDescription:
            "Return this version to draft so you can keep editing freely.",
        },
        {
          label: "Mark as approved",
          newStatus: "approved",
          confirmTitle: "Approve this version?",
          confirmDescription:
            "Approve this version? Approved versions become immutable references and can be used as sub-recipes elsewhere.",
        },
        {
          label: "Archive",
          newStatus: "archived",
          confirmTitle: "Archive this version?",
          confirmDescription:
            "Archive this version? It will be hidden from the active versions list.",
        },
      ]
    case "approved":
      return [
        {
          label: "Back to testing",
          newStatus: "testing",
          confirmTitle: "Un-approve this version?",
          confirmDescription:
            "Un-approve this version? It will become editable again. Other recipes that reference this version may need to be reviewed.",
        },
        {
          label: "Back to draft",
          newStatus: "draft",
          confirmTitle: "Un-approve this version?",
          confirmDescription:
            "Un-approve this version? It will become editable again. Other recipes that reference this version may need to be reviewed.",
        },
        {
          label: "Archive",
          newStatus: "archived",
          confirmTitle: "Archive this version?",
          confirmDescription:
            "Archive this version? It will be hidden from the active versions list.",
        },
      ]
    case "archived":
      return [
        {
          label: "Restore to draft",
          newStatus: "draft",
          confirmTitle: "Restore to draft?",
          confirmDescription: "Restore this version to draft so you can edit it again.",
        },
      ]
  }
}

export function computeCurrentVersionId(
  versions: Pick<RecipeVersionRow, "id" | "status" | "approved_at" | "created_at">[]
): string | null {
  const approved = versions.filter((v) => v.status === "approved")
  if (approved.length === 0) {
    return null
  }
  if (approved.length === 1) {
    return approved[0]!.id
  }
  const sorted = [...approved].sort((a, b) => {
    const aTime = a.approved_at ?? a.created_at
    const bTime = b.approved_at ?? b.created_at
    return bTime.localeCompare(aTime)
  })
  return sorted[0]!.id
}

export function isVersionEditable(status: string): boolean {
  return status === "draft" || status === "testing"
}
