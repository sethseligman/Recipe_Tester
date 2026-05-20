import Link from "next/link"
import { FileUpIcon, PenLineIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function OnboardingChoice() {
  return (
    <div className="flex w-full max-w-lg flex-col gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome to Recipe Tester
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Start with your menu — we&apos;ll turn it into dishes you can build recipes
          on.
        </p>
      </div>

      <Card className="border-primary/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileUpIcon className="size-5 text-primary" />
            <CardTitle className="text-lg">Upload your menu</CardTitle>
          </div>
          <CardDescription>
            PDF, photo, or pasted text. You&apos;ll review what we parse before
            anything is saved.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/onboarding/upload">Upload a menu</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <PenLineIcon className="size-5 text-muted-foreground" />
            <CardTitle className="text-lg">Start blank</CardTitle>
          </div>
          <CardDescription>
            Create an empty restaurant and add menus by hand — same as before.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="w-full">
            <Link href="/onboarding/blank">Create empty restaurant</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
