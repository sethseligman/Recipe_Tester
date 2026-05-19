"use client"

import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { createRestaurant } from "@/app/onboarding/actions"
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

const onboardingSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  slug: z
    .string()
    .min(1, "URL slug is required")
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers, and hyphens only"),
})

type OnboardingFormValues = z.infer<typeof onboardingSchema>

function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

export function OnboardingForm() {
  const [slugManual, setSlugManual] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: { name: "", slug: "" },
  })

  const nameValue = form.watch("name")
  const { isSubmitting } = form.formState

  useEffect(() => {
    if (!slugManual) {
      form.setValue("slug", slugifyName(nameValue), { shouldValidate: true })
    }
  }, [nameValue, slugManual, form])

  async function onSubmit(values: OnboardingFormValues) {
    setFormError(null)
    const result = await createRestaurant(values)
    if (result?.error) {
      setFormError(result.error)
      toast.error(result.error)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Set up your restaurant</CardTitle>
        <CardDescription>
          You can add menus and team members after.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {formError ? (
            <p className="text-sm text-destructive" role="alert">
              {formError}
            </p>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="name">Restaurant name</Label>
            <Input
              id="name"
              autoComplete="organization"
              disabled={isSubmitting}
              {...form.register("name")}
            />
            {form.formState.errors.name ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.name.message}
              </p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="slug">URL slug</Label>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <span className="shrink-0">/r/</span>
              <Input
                id="slug"
                className="flex-1"
                disabled={isSubmitting}
                {...form.register("slug", {
                  onChange: (event) => {
                    const value = event.target.value
                    if (value === "") {
                      setSlugManual(false)
                    } else {
                      setSlugManual(true)
                    }
                  },
                })}
              />
            </div>
            {form.formState.errors.slug ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.slug.message}
              </p>
            ) : null}
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? (
              <>
                <Loader2Icon className="animate-spin" />
                Creating…
              </>
            ) : (
              "Create restaurant"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
