"use client"

import Link from "next/link"
import { useEffect, useRef, useState, useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { ChevronLeftIcon, FileUpIcon, Loader2Icon } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { submitMenuUpload } from "@/app/onboarding/upload/actions"
import { slugifyName, slugSchema } from "@/lib/slugify"
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
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

const menuUploadSchema = z.object({
  name: z.string().min(1, "Restaurant name is required").max(100),
  slug: slugSchema,
  pastedText: z.string(),
})

type MenuUploadFormValues = z.infer<typeof menuUploadSchema>
type SourceMode = "file" | "paste"

export function MenuUploadForm() {
  const [sourceMode, setSourceMode] = useState<SourceMode>("file")
  const [slugManual, setSlugManual] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()

  const form = useForm<MenuUploadFormValues>({
    resolver: zodResolver(menuUploadSchema),
    defaultValues: { name: "", slug: "", pastedText: "" },
  })

  const nameValue = form.watch("name")
  const { isSubmitting } = form.formState
  const busy = isPending || isSubmitting

  useEffect(() => {
    if (!slugManual) {
      form.setValue("slug", slugifyName(nameValue), { shouldValidate: true })
    }
  }, [nameValue, slugManual, form])

  function handleFileSelect(file: File | null) {
    setSelectedFile(file)
    setFormError(null)
  }

  function onSubmit(values: MenuUploadFormValues) {
    setFormError(null)

    if (sourceMode === "file" && !selectedFile) {
      setFormError("Choose a PDF or image to upload.")
      return
    }
    if (sourceMode === "paste" && !values.pastedText.trim()) {
      setFormError("Paste your menu text or switch to file upload.")
      return
    }

    const body = new FormData()
    body.set("name", values.name)
    body.set("slug", values.slug)
    body.set("source", sourceMode)
    if (sourceMode === "file" && selectedFile) {
      body.set("file", selectedFile)
    } else {
      body.set("pastedText", values.pastedText)
    }

    startTransition(async () => {
      const result = await submitMenuUpload(body)
      if (result?.error) {
        setFormError(result.error)
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="w-full max-w-lg">
      <div className="mb-6">
        <Link
          href="/onboarding"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeftIcon className="size-4" />
          Back
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload your menu</CardTitle>
          <CardDescription>
            We&apos;ll parse your menu into sections and dishes. You&apos;ll review
            everything before it&apos;s saved.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
            {formError ? (
              <p className="text-sm text-destructive" role="alert">
                {formError}
              </p>
            ) : null}

            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="upload-name">Restaurant name</Label>
                <Input
                  id="upload-name"
                  autoComplete="organization"
                  disabled={busy}
                  {...form.register("name")}
                />
                {form.formState.errors.name ? (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.name.message}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="upload-slug">URL slug</Label>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <span className="shrink-0">/r/</span>
                  <Input
                    id="upload-slug"
                    className="flex-1"
                    disabled={busy}
                    {...form.register("slug", {
                      onChange: (event) => {
                        const value = event.target.value
                        setSlugManual(value !== "")
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
            </div>

            <div className="grid gap-2">
              <Label>Menu source</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={sourceMode === "file" ? "default" : "outline"}
                  size="sm"
                  disabled={busy}
                  onClick={() => setSourceMode("file")}
                >
                  File
                </Button>
                <Button
                  type="button"
                  variant={sourceMode === "paste" ? "default" : "outline"}
                  size="sm"
                  disabled={busy}
                  onClick={() => setSourceMode("paste")}
                >
                  Paste text
                </Button>
              </div>
            </div>

            {sourceMode === "file" ? (
              <div className="grid gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp,image/heic,.pdf,.jpg,.jpeg,.png,.webp,.heic"
                  className="sr-only"
                  disabled={busy}
                  onChange={(event) => {
                    handleFileSelect(event.target.files?.[0] ?? null)
                  }}
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(event) => {
                    event.preventDefault()
                    setDragActive(true)
                  }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={(event) => {
                    event.preventDefault()
                    setDragActive(false)
                    const file = event.dataTransfer.files?.[0]
                    if (file) {
                      handleFileSelect(file)
                      if (fileInputRef.current) {
                        const dt = new DataTransfer()
                        dt.items.add(file)
                        fileInputRef.current.files = dt.files
                      }
                    }
                  }}
                  className={cn(
                    "flex min-h-32 flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center transition-colors",
                    dragActive && "border-primary bg-primary/5",
                    selectedFile && "border-solid"
                  )}
                >
                  <FileUpIcon className="size-8 text-muted-foreground" />
                  {selectedFile ? (
                    <>
                      <p className="text-sm font-medium">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Tap to choose a different file
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium">
                        Drop a PDF or image, or tap to browse
                      </p>
                      <p className="text-xs text-muted-foreground">
                        PDF, JPEG, PNG, WebP, or HEIC — up to 50 MB
                      </p>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="grid gap-2">
                <Label htmlFor="pasted-menu">Menu text</Label>
                <Textarea
                  id="pasted-menu"
                  disabled={busy}
                  placeholder="Paste your full menu here — sections, dish names, descriptions…"
                  className="min-h-40 font-mono text-sm"
                  {...form.register("pastedText")}
                />
              </div>
            )}

            <Button type="submit" disabled={busy} className="w-full">
              {busy ? (
                <>
                  <Loader2Icon className="animate-spin" />
                  Uploading…
                </>
              ) : (
                "Continue to review"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
