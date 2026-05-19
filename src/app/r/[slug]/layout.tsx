import Link from "next/link"
import { notFound, redirect } from "next/navigation"

import { RestaurantSubNav } from "@/components/restaurant-sub-nav"
import { createClient } from "@/lib/supabase/server"
import type { Tables } from "@/lib/supabase/database.types"

export default async function RestaurantLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("*")
    .eq("slug", slug)
    .single()

  if (!restaurant) {
    notFound()
  }

  const typedRestaurant = restaurant as Tables<"restaurants">

  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b bg-muted/30">
        <div className="container mx-auto max-w-5xl px-4 py-3">
          <Link
            href={`/r/${slug}`}
            className="text-base font-semibold tracking-tight hover:underline"
          >
            {typedRestaurant.name}
          </Link>
          <RestaurantSubNav slug={slug} />
        </div>
      </div>
      <div className="container mx-auto flex max-w-5xl flex-1 flex-col px-4 py-6">
        {children}
      </div>
    </div>
  )
}
