import { redirect } from "next/navigation"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle>Welcome to Recipe Tester</CardTitle>
          <CardDescription>
            You&apos;re signed in as{" "}
            <span className="font-medium text-foreground">{user.email}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Phase 0 complete. Phase 1 features coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
