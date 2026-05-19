import { Suspense } from "react"
import { redirect } from "next/navigation"

import {
  Card,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"

import { LoginForm } from "./login-form"

export default async function LoginPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect("/")
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <Suspense
        fallback={
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <p className="text-sm font-medium tracking-tight text-muted-foreground">
                Recipe Tester
              </p>
              <CardTitle>Sign in to Recipe Tester</CardTitle>
            </CardHeader>
          </Card>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  )
}
