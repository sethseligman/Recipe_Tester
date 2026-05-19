"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

export function RestaurantSubNav({ slug }: { slug: string }) {
  const pathname = usePathname()
  const base = `/r/${slug}`

  const menusActive =
    pathname === base || pathname.startsWith(`${base}/menus`)
  const componentsActive = pathname.startsWith(`${base}/components`)

  const linkClass = (active: boolean) =>
    cn(
      "text-sm font-medium transition-colors hover:text-foreground",
      active ? "text-foreground" : "text-muted-foreground"
    )

  return (
    <nav className="mt-2 flex gap-4" aria-label="Restaurant sections">
      <Link href={base} className={linkClass(menusActive)}>
        Menus
      </Link>
      <Link href={`${base}/components`} className={linkClass(componentsActive)}>
        Components
      </Link>
    </nav>
  )
}
