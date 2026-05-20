import { formatDistanceToNow } from "date-fns"

export function formatRelativeDate(isoDate: string): string {
  return formatDistanceToNow(new Date(isoDate), { addSuffix: true })
}
