import Link from "next/link"

import { NavSignInLink } from "@/components/nav-sign-in-link"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { createClient } from "@/lib/supabase/server"

export async function SiteNav() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Recipe Tester
        </Link>
        <nav>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="max-w-[240px] truncate">
                  {user.email}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <form action="/auth/signout" method="post" className="w-full">
                    <button
                      type="submit"
                      className="w-full cursor-default px-2 py-1.5 text-left text-sm outline-none"
                    >
                      Sign out
                    </button>
                  </form>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <NavSignInLink />
          )}
        </nav>
      </div>
    </header>
  )
}
