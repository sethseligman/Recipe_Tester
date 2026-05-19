import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"

import { Providers } from "@/components/providers"
import { SiteNav } from "@/components/site-nav"

import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Recipe Tester",
  description: "Recipe development and testing for restaurants",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col font-sans">
        <Providers>
          <SiteNav />
          <main className="flex flex-1 flex-col">{children}</main>
        </Providers>
      </body>
    </html>
  )
}
