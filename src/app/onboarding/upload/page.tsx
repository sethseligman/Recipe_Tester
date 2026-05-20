import { redirect } from "next/navigation"

import { MenuUploadForm } from "@/app/onboarding/upload/menu-upload-form"
import { createClient } from "@/lib/supabase/server"

export default async function OnboardingUploadPage() {
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
      <MenuUploadForm />
    </div>
  )
}
