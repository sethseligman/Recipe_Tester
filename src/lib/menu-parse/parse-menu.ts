import Anthropic from "@anthropic-ai/sdk"

import {
  parsedMenuTreeSchema,
  type ParsedMenuTree,
} from "@/lib/menu-parse/types"

const MENU_PARSE_MODEL = "claude-sonnet-4-20250514"

const SYSTEM_PROMPT = `You extract restaurant menu structure from raw menu text or descriptions.
Return ONLY valid JSON matching this shape (no markdown fences):
{
  "menus": [
    {
      "name": "Dinner",
      "sections": [
        {
          "name": "Raw Bar",
          "dishes": [
            { "name": "Oysters", "menu_description": "Optional guest-facing description" }
          ]
        }
      ]
    }
  ]
}
Rules:
- Use one menu unless the source clearly has multiple (e.g. Lunch and Dinner).
- Section names are categories (Raw Bar, Mains, Desserts).
- Dish names are individual items; put marketing copy in menu_description when present.
- Omit empty sections. Every section needs at least one dish.
- If the menu is a single list without sections, use one section named "Menu".`

function extractJsonObject(raw: string): string {
  const trimmed = raw.trim()
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence?.[1]) {
    return fence[1].trim()
  }
  const start = trimmed.indexOf("{")
  const end = trimmed.lastIndexOf("}")
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1)
  }
  return trimmed
}

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to .env.local to parse menus."
    )
  }
  return new Anthropic({ apiKey })
}

async function parseMenuText(menuText: string): Promise<ParsedMenuTree> {
  const client = getClient()
  const message = await client.messages.create({
    model: MENU_PARSE_MODEL,
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Parse this menu into the JSON structure:\n\n${menuText.slice(0, 120_000)}`,
      },
    ],
  })

  const textBlock = message.content.find((block) => block.type === "text")
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Menu parser returned no text.")
  }

  let json: unknown
  try {
    json = JSON.parse(extractJsonObject(textBlock.text))
  } catch {
    throw new Error("Menu parser returned invalid JSON. Try again or edit manually.")
  }

  const parsed = parsedMenuTreeSchema.safeParse(json)
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[0]?.message ?? "Menu structure did not match expected shape."
    )
  }

  return parsed.data
}

export async function parseMenuFromText(menuText: string): Promise<ParsedMenuTree> {
  const trimmed = menuText.trim()
  if (!trimmed) {
    throw new Error("Menu content is empty.")
  }
  return parseMenuText(trimmed)
}

type ImageMediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif"

function toImageMediaType(mime: string): ImageMediaType {
  if (mime === "image/png") return "image/png"
  if (mime === "image/webp") return "image/webp"
  if (mime === "image/gif") return "image/gif"
  return "image/jpeg"
}

export async function parseMenuFromImage(
  buffer: Buffer,
  mime: string
): Promise<ParsedMenuTree> {
  const client = getClient()
  const base64 = buffer.toString("base64")
  const mediaType = toImageMediaType(mime)

  const message = await client.messages.create({
    model: MENU_PARSE_MODEL,
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: base64,
            },
          },
          {
            type: "text",
            text: "Parse this menu image into the JSON structure described in the system prompt.",
          },
        ],
      },
    ],
  })

  const textBlock = message.content.find((block) => block.type === "text")
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Menu parser returned no text.")
  }

  let json: unknown
  try {
    json = JSON.parse(extractJsonObject(textBlock.text))
  } catch {
    throw new Error("Menu parser returned invalid JSON. Try again or paste the menu text.")
  }

  const parsed = parsedMenuTreeSchema.safeParse(json)
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[0]?.message ?? "Menu structure did not match expected shape."
    )
  }

  return parsed.data
}
