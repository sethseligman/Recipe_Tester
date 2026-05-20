# Recipe Tester — Roadmap

**Status:** v2 (current). **Last updated:** May 19, 2026. **Working name:** Recipe Tester. Final product name TBD. **First customer:** Crudo Santo (Closter, NJ). **Built by:** Solo dev with AI pair-programming (Cursor / Claude Code).

*v1 roadmap: [ROADMAP-v1-archived.md](./ROADMAP-v1-archived.md)*

---

## 1. Product Vision

A menu and recipe development platform for restaurants in the pre-opening and iteration phase. Meets chefs where their work actually happens — a photo of a handwritten sheet, a paste from a doc, a snap of a printed menu — and absorbs that into structured, versioned, collaborative recipes. A dashboard, not a database, is the front door.

**The wedge:** Other tools (Meez, MarketMan, MarginEdge) treat recipe entry as structured data the chef must produce. This tool inverts that: capture is loose, structure is applied with AI assistance and human review. The chef writes the way they already write. The app does the conversion.

**Long-term ambition:** menu development → testing loop → recipe cards → costing → FOH training → menu engineering. Each is its own product. We build them in order, earning each one.

---

## 2. Why this rewrite

The v1 roadmap centered the *schema* in the chef's experience: components, recipe versions, sub-recipe references, status transitions. The model is structurally clean and supports a SaaS future, but it's not how a chef thinks about their work.

A chef thinks: "I have a menu. I work on dishes. The dishes have recipes. Sometimes a recipe reuses another (the leche de tigre). I iterate until it's right; if something changes meaningfully, it's Adobo 2.0."

A chef does NOT think: "I have components. Each component has a list of recipe_versions in draft / testing / approved / archived status. I'm editing v3."

v2 keeps the model that supports versioning, sub-recipes, and immutability of approved work — but pushes it to the background. The chef sees recipes, dishes, and a dashboard of the work. The mechanisms are invisible until invoked.

The other shift: AI-assisted capture (menu upload, recipe upload) moves from "Phase 6, someday" to **the wedge**. Without it, the app is a fancier Google Doc. With it, the app meets the chef's actual workflow on day one.

---

## 3. What stays, what changes, what's new

**Stays — real foundation, no rework needed:**

- Auth (magic link), Supabase, Next.js 16, RLS policies
- Restaurants / menus / sections / dishes schema and CRUD
- Ingredients master table + canonical `unit_type` enum
- Approval triggers, sub-recipe constraints, force-unapprove escape hatch
- Versioning machinery (kept; pushed to background)

**Changes — UI re-centering:**

- "Components" disappears from the main navigation. A leche de tigre is a recipe that happens to be used by other recipes. Filterable as "used as a sub-recipe," not a top-level concept.
- "Recipe versions" stops being a noun the chef sees. Editing a recipe edits the recipe; history is automatic. Explicit forking ("Save as Adobo 2.0") is a deliberate act with a clear name.
- Dish detail page becomes the recipe page, not a list of component links.
- Onboarding stops creating a blank restaurant. It starts with "upload your menu."

**New — the real product:**

- Menu upload + parse + review (Phase A)
- Recipe capture from photo / upload / paste + parse + review (Phase B)
- Dashboard-as-home (Phase C)
- Comments, sign-off, activity feed (Phase C)

---

## 4. Core Principles (revised)

1. **The app comes to the chef.** Capture matches the existing workflow — paper, photos, voice, paste. Structure is applied at review, not at entry.
2. **Recipes are first-class. Versions are history.** The chef edits "Adobo," not "Adobo v3." Versions exist for compare / rollback / fork but aren't the primary unit of interaction.
3. **The dashboard is the front door.** Home shows the state of the work, not the menu hierarchy. Hierarchy is for organization, not navigation.
4. **Approved recipes are immutable references.** (Unchanged from v1. The rule survives; the UI hides the machinery.)
5. **Sub-recipes are emergent, not declared.** A recipe becomes a base recipe by being referenced. There's no separate "components" registration step.
6. **AI assists, the chef approves.** Every parse — menu, recipe, ingredient — gets a human review before it becomes data.
7. **Collaboration is a pillar, not an add-on.** Sous chef posts, head chef signs off, the kitchen sees the same state. Phase C, not Phase 8.
8. **Build for one restaurant until forced to generalize.** Crudo Santo is the customer until something says otherwise.

---

## 5. Current Build State

The following is already on `main` and working. v2 builds on top of it; nothing gets thrown away.

- Auth: magic link sign-in, sign-out, session refresh via `src/proxy.ts`
- Restaurants, menus, sections, dishes — full CRUD with archive/restore
- Sub-nav: Menus / Components / Ingredients *(Components tab removed in Phase B)*
- Components library + dish-component linking *(schema kept; UI re-homed under the dish in Phase B)*
- Recipe versions UI on the component detail page *(functional but mis-centered; replaced in Phase B)*
- Ingredients master UI with near-match warnings, `unit_type` dropdown
- Full schema: Phase 1a + ingredients/units follow-up
- RLS policies on all tables; approval triggers; force-unapprove function

**Do not build (v1 tail — superseded by v2):**

- Component-centric `recipe_ingredients` UI (v1 Phase 1c Chunks C/D)
- Further polish on the Components tab / version list as primary recipe UX

---

## 6. Phase Roadmap (v2)

### Phase A — Menu Upload (the new front door)

**Goal:** A new user signs in, uploads a menu (PDF, image, or pasted text), reviews the AI-parsed result, and lands in their app with a real restaurant + menus + sections + dishes in place. Time from sign-in to populated app: under 5 minutes for a typical menu.

- [x] Rewrite onboarding: replace "create blank restaurant" with "upload your menu" as the primary flow
- [x] Upload UI: drag-and-drop or file picker for PDF/image; paste-text alternative; restaurant name + slug entered alongside
- [x] Supabase Storage bucket for menu uploads (private, RLS-restricted per-user path until restaurant exists)
- [ ] Server-side parser:
  - PDF → text extraction (pdf-parse or equivalent)
  - Image → vision pass (Anthropic API)
  - LLM with structured-output prompt returning JSON: `{ restaurant: {name, slug}, menus: [{ name, sections: [{ name, dishes: [{ name, menu_description }] }] }] }`
- [ ] Review UI: editable tree of the parsed structure; user fixes mis-parses, adds/removes/reorders, then confirms
- [ ] Confirm → transactional insert; restaurant created with current user as owner
- [ ] Existing-user variant: "Upload a menu" available from inside the app for new menu versions
- [ ] Fallback: "Start blank" creates an empty restaurant (the current onboarding flow, kept as backup)

**Definition of done:** Take a real printed menu (PDF or photo), upload it, get a recognizable restaurant scaffold in under 5 minutes with at most light editing.

**Cut if needed:** Reorder in the review UI. Manual reordering after-the-fact is fine.

---

### Phase B — Recipe Capture & UI Re-center (the wedge)

**Goal:** From a dish detail page, capture a recipe by photo / upload / paste / typing. AI parses into structured form: ingredients matched against the master list with qty / unit / prep_note, method as markdown. User reviews, edits, approves. The dish has a recipe.

This phase also does the **UI re-center**: dish page becomes the recipe page, the Components tab disappears, recipe versions stop being the primary noun.

- [ ] Remove Components tab from the main sub-nav
- [ ] Redesign dish detail page: recipe lives here, not a list of component links
- [ ] "Add recipe" action on a dish opens the capture flow with source choices:
  - Take photo (mobile camera)
  - Upload image / PDF / doc
  - Paste text
  - Start blank (type from scratch)
- [ ] Server-side recipe parser:
  - Image/PDF → OCR + LLM (or vision + LLM)
  - JSON output: `{ title?, yield_amount?, yield_unit?, ingredients: [{ candidate_name, qty, unit, prep_note? }], method }`
  - Each parsed ingredient fuzzy-matched against the restaurant's master ingredients list; top-3 suggestions surfaced in review
- [ ] Review UI:
  - Title, yield amount + unit dropdown
  - Ingredients table: parsed candidate name + suggested match (top 3) with "use this match" / "create new" actions; qty + unit dropdown + optional prep_note
  - Method as markdown textarea, pre-filled with parser output
  - Source photo/doc visible alongside the review (so the chef can cross-check)
  - Confirm → recipe created on the dish
- [ ] Sub-recipe references in the review UI: a recipe can reference another recipe in place of an ingredient row (e.g., "200g of leche de tigre")
- [ ] Background versioning: every save creates a snapshot; chef sees the recipe with a small "History" link, not "v1, v2, v3"
- [ ] Explicit fork: "Save as new version" — names the fork explicitly ("Adobo 2.0"). Old version archived but reachable.
- [ ] Status workflow remains in the data layer; surfaced in UI as a single "Mark approved" / "Approved" badge with un-approve as a less-prominent action

**Definition of done:** Take a handwritten recipe sheet, photograph it on phone, upload, get a parsed draft, fix it in about two minutes, save. The recipe lives on the dish. Sub-recipes (leche de tigre referenced inside a ceviche) work.

**Cut if needed:** Voice capture (defer to Phase D). Fork UX polish (basic version is fine).

---

### Phase C — Dashboard & Collaboration

**Goal:** Home stops being the menu tree. It's a dashboard that shows the state of the work and surfaces what needs attention. Sous chef and head chef talk inside the app instead of in Slack.

- [ ] Dashboard at `/r/[slug]` (replaces current menus-list home):
  - "Awaiting your review" — recipes/dishes a collaborator marked ready
  - "In progress" — recently-edited drafts or testing-status recipes
  - "Recently approved"
  - "Activity" — chronological feed of comments, sign-offs, edits
  - "Menu progress" — percentage of dishes with approved recipes, per menu
- [ ] Comments on recipes: thread per recipe; sous chef writes "ready for review," head chef replies / signs off
- [ ] @mentions in comments → in-app notification stripe
- [ ] Sign-off flow: "Mark ready for review" by author → visible on reviewer's dashboard
- [ ] Activity is derived from comments + status changes + edits (no separate "post" entity needed)
- [ ] Realtime updates via Supabase Realtime (optional polish; periodic refresh acceptable for v1)
- [ ] Member invite UI (replaces the manual SQL workaround for adding collaborators)

**Definition of done:** Giuseppe signs in, works on the char dish, marks it ready. You see it on your dashboard, sign off, dish moves to "Recently approved." Both of you used the dashboard, not the menu hierarchy, to navigate the work.

**Cut if needed:** Realtime (polling is fine). Mentions notification stripe (visible-in-dashboard suffices).

---

### Phase D — Testing Sessions

**Goal:** Same scope as v1's Phase 2 — capture during testing — but now lives alongside the recipe flow rather than competing with it.

- [ ] Start a test session from a dish or recipe
- [ ] Session entries: photos, quick notes, ingredient + weight measurements; voice notes if quick
- [ ] Close session with verdict: keep / iterate / scrap / inconclusive + summary note
- [ ] "Save this session's notes as the next iteration of [recipe]" feeds into the Phase B capture flow
- [ ] Designate one session photo as the canonical plating shot for a dish

**Definition of done:** Run a real test on leche de tigre at Mykos, capture in the app on your phone, turn it into the next iteration of the recipe. Photos and notes link to the recipe permanently.

---

### Phase E — Recipe Cards & Kitchen Output

(Same scope as v1's Phase 3.)

- [ ] Printable single-dish recipe card
- [ ] Full-menu / kitchen-book view
- [ ] Plating photo on dish card
- [ ] Search across recipes and ingredients
- [ ] Diff view between versions (now that history is preserved automatically)

**Definition of done:** Print a recipe card for the ceviche, hand it to a line cook at training, usable as-is.

---

### Phase F — Costing & Operations

(v1's Phase 4. Becomes useful only once recipes are stable.)

- [ ] Vendor pricing per ingredient, manual entry + CSV import
- [ ] Yield % per ingredient (whole-to-usable)
- [ ] Recipe costing rolled up through sub-recipes
- [ ] Plate cost vs. menu price, target food cost %
- [ ] Cost drift alerts when ingredient prices change
- [ ] Basic prep list generator from a service forecast

---

### Phase G — FOH, Allergens, Training

(v1's Phase 5.)

- [ ] Allergen tagging per ingredient, rolled up to recipes and dishes
- [ ] FOH dish description view (ingredients, allergens, prep style, sourcing notes)
- [ ] Spec sheets per dish
- [ ] Server quiz / training mode

---

### Phase H — Productization

Only triggered if Phases A–E ship for Crudo Santo *and* other chefs ask to use it.

- [ ] Multi-restaurant signup
- [ ] Billing (Stripe)
- [ ] Marketing site, onboarding refinement
- [ ] Templates: starter menus, common base-recipe libraries

---

## 7. Tech Stack

Unchanged from v1 foundation, plus AI/parsing dependencies for Phase A and B.

- Next.js 16 (App Router), React 19, TypeScript strict
- Tailwind v4, shadcn/ui (radix-nova preset, neutral base)
- Supabase: Postgres, Auth (magic link), Storage, RLS, Realtime (Phase C)
- @supabase/ssr, `src/proxy.ts` for session refresh
- react-hook-form + zod for forms; Sonner toasts
- date-fns, react-markdown
- **New for v2:** Anthropic API for menu/recipe parsing; `pdf-parse` (or equivalent) for PDF text extraction; vision endpoints for images

---

## 8. Working Process

- **Phase A first.** Nothing else moves until a chef can sign in and upload a menu.
- **Phase B second.** The UI re-center happens inside Phase B, not as a separate cleanup phase.
- Sub-prompts per chunk, same rhythm as v1: build → review → commit → push.
- The roadmap is a tool, not scripture. If reality argues with it, the roadmap loses.

### Anti-patterns

- Building Phase F (costing) features in Phase A because they sound cool.
- Centering the schema in the UI. The model exists to support the chef, not the other way around.
- Deferring AI parsing as "too risky." The parser IS the product. v1 deferring it was a mistake.
- Treating collaboration as polish. The kitchen is a team; the app should reflect that.
- Generalizing for "future restaurants" while Crudo Santo is still the only customer.
- Finishing v1 Phase 1c component-centric ingredient/sub-recipe UI when Phase B supersedes it.

---

## 9. Open Questions

- Final product name
- Custom domain
- Giuseppe's access level — owner-equivalent, admin, member? (Phase C question; can defer)
- Where uploaded photos live long-term. Supabase Storage is fine for v1; scale question for Phase H.
- Which LLM / vision API for parsing — Anthropic is the default; revisit if cost or quality dictates.
- Dish ↔ recipe linkage in schema: bridge via auto-component per dish vs. add `dish_id` on recipes (decide in Phase B planning).

---

## 10. Success Metrics

- **Phase A success:** Crudo Santo's full menu uploaded from a PDF or image. You stop typing dish names by hand.
- **Phase B success:** A handwritten recipe becomes a structured recipe in under three minutes. The chef stops keeping recipes in Google Docs.
- **Phase C success:** You and Giuseppe stop messaging about recipes in Slack. The dashboard tells you both what's outstanding.
- **Phase D success:** 10+ real testing sessions captured in the app. Each one produces or updates a recipe.
- **Phase E success:** A line cook at training uses the printed card from the app. Doesn't ask "what's the latest version?"
- **Product success (Phase H trigger):** Another chef sees yours and asks if they can use it.
