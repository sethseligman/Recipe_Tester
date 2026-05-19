"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Loader2Icon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"

export function LoginForm() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null)

  useEffect(() => {
    if (searchParams.get("error") === "auth_callback_failed") {
      toast.error("Sign-in failed. Please try again.")
    }
  }, [searchParams])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    setIsSubmitting(false)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success("Check your email for the magic link")
    setSubmittedEmail(email)
  }

  if (submittedEmail) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <p className="text-sm font-medium tracking-tight text-muted-foreground">
            Recipe Tester
          </p>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            We sent a magic link to{" "}
            <span className="font-medium text-foreground">{submittedEmail}</span>
            . Click the link in that email to sign in.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => setSubmittedEmail(null)}
          >
            Use a different email
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <p className="text-sm font-medium tracking-tight text-muted-foreground">
          Recipe Tester
        </p>
        <CardTitle>Sign in to Recipe Tester</CardTitle>
        <CardDescription>
          Enter your email and we&apos;ll send you a magic link.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? (
              <>
                <Loader2Icon className="animate-spin" />
                Sending…
              </>
            ) : (
              "Send magic link"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
