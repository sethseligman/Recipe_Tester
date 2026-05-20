import Link from "next/link"
import { redirect } from "next/navigation"
import { ChevronLeftIcon } from "lucide-react"

import { OnboardingForm } from "@/app/onboarding/onboarding-form"
import { createClient } from "@/lib/supabase/server"

export default async function OnboardingBlankPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: memberships } = await supabase
    .from("restaurant_members")
    .select("restaurants(slug)")
    .eq("user_id", user.id)
    .limit(1)

  const slug = memberships?.[0]?.restaurants?.slug
  if (slug) {
    redirect(`/r/${slug}`)
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="mb-6 w-full max-w-md">
        <Link
          href="/onboarding"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeftIcon className="size-4" />
          Back
        </Link>
      </div>
      <OnboardingForm />
    </div>
  )
}
