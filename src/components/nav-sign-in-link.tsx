"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function NavSignInLink() {
  const pathname = usePathname()

  if (pathname === "/login") {
    return null
  }

  return (
    <Link
      href="/login"
      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
    >
      Sign in
    </Link>
  )
}
