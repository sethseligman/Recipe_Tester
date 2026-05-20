# Recipe Testing Platform — Roadmap & Product Outline (v1 — archived)

**Archived:** May 19, 2026. Superseded by [ROADMAP.md](./ROADMAP.md). Do not use for planning.

---

# Recipe Testing Platform — Roadmap & Product Outline

**Working name:** TBD (display name during build: Recipe Tester)
**First customer:** Crudo Santo (Closter, NJ)
**Built by:** Solo dev using Cursor / Claude Code, with AI pair-programming

---

## 1. Product Vision

A recipe development and testing platform for restaurants in the pre-opening / menu-development phase. Captures the messy work of testing dishes — photos, notes, weights, iterations — and turns it into structured, versioned, reusable recipes that feed line training, recipe cards, and (eventually) costing.

**Wedge:** Existing restaurant software (MarketMan, Margin Edge, MarginEdge, etc.) is built for operations *after* recipes are locked. Nothing serves the pre-opening recipe-testing phase well. Chefs use notebooks, Google Docs, Slack threads, and photo dumps. This is the gap.

**Long-term ambition:** Recipe testing → recipe management → costing → FOH training → menu engineering. Each is its own product. We build them in order, earning each one.

---

## 2. Core Principles

These shape every feature decision. Refer back when scope-creep starts.

1. **Organic in, structured out.** Capture during testing is free-form (photos, voice, typed notes). Structure is applied at the "finalize" step.
2. **Fit the existing workflow, don't replace it.** Chefs weigh, scribble, photograph. The app contains that, doesn't fight it.
3. **Recipes reference recipes.** Sub-recipes are first-class. A leche de tigre is a real thing, used by multiple dishes.
4. **Approved recipes are immutable references.** You can't build a recipe on a foundation that isn't locked. Forces discipline matching how kitchens actually work.
5. **Version everything.** Never overwrite. v1, v2, v3. Promote a version to "approved" when it's the one.
6. **Mobile for capture, desktop for cleanup.** Same app, responsive. Native later if ever.
7. **Build for one restaurant. Generalize only when forced to by a second.** Crudo Santo is the customer until something says otherwise.

---

## 3. Phase Roadmap

### Phase 0 — Foundation (Week 1)

**Goal:** Empty app deployed, auth works, can sign in.

- [ ] Repo set up (Next.js 14+ App Router, TypeScript, Tailwind)
- [ ] Supabase project created (Postgres, Auth, Storage)
- [ ] Supabase client wired up (server + client components)
- [ ] Auth: email magic link sign-in
- [ ] Deployed to Vercel, accessible at a real URL
- [ ] Basic layout: top nav, signed-in/signed-out states
- [ ] Environment variables documented in README

**Definition of done:** You can sign up, sign in, sign out. App is on the internet. Nothing else.

**Cut if needed:** Nothing. This phase doesn't get cut.

---

### Phase 1 — Recipe Book (Weeks 2–3)

**Goal:** Crudo Santo's menu lives in the app. You can create recipes with sub-recipe references. No testing features yet.

#### Data model

Build these tables in Supabase with RLS policies (users can only see/edit data for restaurants they're a member of):

- `restaurants`
- `restaurant_members` (user_id, restaurant_id, role)
- `menus`
- `sections`
- `dishes`
- `components`
- `dish_components` (join table)
- `recipe_versions`
- `recipe_ingredients` (with optional `sub_recipe_version_id`)

#### Features

- [ ] Create a restaurant; user becomes owner
- [ ] Create / rename / archive menus
- [ ] Create sections within a menu, drag to reorder
- [ ] Create dishes within sections, with menu description
- [ ] Create components (reusable across dishes)
- [ ] Link components to dishes (with role: base / protein / garnish / etc)
- [ ] Create a recipe version for a component
  - Title, yield, method (markdown textarea)
  - Ingredient list: name, qty, unit, prep note
  - Add sub-recipe row: only `approved` recipe versions selectable
- [ ] Version control: new version creates a copy, never overwrites
- [ ] Status workflow: draft → testing → approved → archived
- [ ] Cannot approve a recipe if it depends on non-approved sub-recipes (DB constraint + UI prevention)
- [ ] Cannot un-approve a recipe that other approved recipes depend on (with "force un-approve" escape hatch)
- [ ] Recipe view: ingredient list shows sub-recipes inline-expandable
- [ ] Bulk import: paste menu text into a textarea, parses into sections + dish stubs (low-tech, just regex/heuristics for now)

#### Out of scope this phase

- Test sessions
- Photo uploads
- Recipe cards / print view
- Costing
- Anything AI

**Definition of done:** Crudo Santo's full menu from the brief is entered. Leche de tigre exists as a component with an approved v1 recipe. Ceviche references it as a sub-recipe.

**Cut if needed:** Drag-to-reorder, bulk import. Both can be manual.

---

### Phase 2 — Testing Loop (Weeks 4–5)

**Goal:** You can run a test session on a dish or component, capture what happened, and use it to create the next recipe version.

#### Data model additions

- `test_sessions`
- `session_entries` (chronological stream: photo / text / measurement / voice-later)
- Supabase Storage bucket for session photos

#### Features

- [ ] Start a test session from a dish or component page
- [ ] Session is open until you close it; multiple sessions can be open
- [ ] Within a session, add entries:
  - [ ] Photo (camera or upload)
  - [ ] Quick text note
  - [ ] Ingredient + weight measurement (qty + unit)
  - [ ] (Voice note: deferred to Phase 3 unless quick)
- [ ] Entries are timestamped, chronological, captioned
- [ ] Close session with a verdict: keep / iterate / scrap / inconclusive + summary note
- [ ] Session history view: see all sessions for a dish or component
- [ ] "Create new recipe version from this session" action:
  - Pre-fills a new recipe_version draft
  - Pulls measurements from session entries into ingredient list (best-effort)
  - Links the session as the origin of the version
- [ ] Recipe version page shows linked sessions
- [ ] Mobile-friendly capture flow: large buttons, camera-first, minimal typing

#### Out of scope this phase

- AI photo → recipe parsing
- Cross-session comparison views
- Tasting panel / multi-user verdicts

**Definition of done:** You run a real test on leche de tigre at Mykos, capture it in the app on your phone, and turn it into v2 of the recipe.

**Cut if needed:** Voice notes (defer), measurement-to-ingredient auto-fill (manual is fine).

---

### Phase 3 — Recipe Cards & Polish (Weeks 6–7)

**Goal:** The app produces usable output — printable recipe cards, a clean dish view for line training, and a recipe book for the kitchen.

#### Features

- [ ] Recipe card view: clean, printable, single dish
  - Dish name, menu description, plating photo
  - Components listed in build order
  - Each component: ingredient list, method, yield
  - Sub-recipes expanded or cross-referenced
- [ ] Print stylesheet (PDF export via browser print is fine for v1)
- [ ] "Kitchen book" view: full menu, all approved recipes, browsable
- [ ] Plating photo: designate one session photo as the canonical plating shot for a dish
- [ ] Search across recipes and ingredients
- [ ] Recipe diff view: see what changed between v2 and v3
- [ ] "Dependents" view on a recipe: what other recipes reference this one
- [ ] Polish pass on mobile capture UX based on real testing usage

#### Out of scope this phase

- Costing
- Allergens
- FOH materials
- Sharing / collaboration features beyond restaurant members

**Definition of done:** You print a recipe card for the ceviche, hand it to a line cook at training, and it's usable as-is.

**Cut if needed:** Diff view, "dependents" view. Nice-to-haves.

---

### Phase 4 — Costing & Operations (Post-Opening)

**Goal:** Track what dishes actually cost. Becomes useful only once recipes are stable.

- [ ] Ingredient master list (auto-builds from usage in Phase 1–3)
- [ ] Vendor pricing per ingredient (manual entry, CSV import)
- [ ] Yield % per ingredient (whole-to-usable)
- [ ] Recipe costing: sum of ingredient costs × quantities, rolled up through sub-recipes
- [ ] Plate cost vs. menu price, target food cost %
- [ ] Cost drift alerts when ingredient prices change
- [ ] Basic prep list generator from a service forecast

Not scoped in detail yet. Will plan in detail when we get there.

---

### Phase 5 — FOH, Allergens, Training (Post-Opening)

- [ ] Allergen tagging per ingredient, rolled up to recipes and dishes
- [ ] FOH-facing dish description view: ingredients, allergens, prep style, sourcing notes
- [ ] Spec sheets per dish for service training
- [ ] Server quiz / training mode

---

### Phase 6 — Productization

Only triggered if Phase 1–3 succeed at Crudo Santo *and* there's evidence other restaurants want this.

- [ ] Multi-restaurant signup flow
- [ ] Billing (Stripe)
- [ ] Onboarding: menu PDF upload → AI parse → editable structure
- [ ] AI features: photo of handwritten recipe → parsed recipe draft
- [ ] Templates: starter menus, common component libraries
- [ ] Public landing page, marketing site

---

## 4. Tech Stack (Locked)

- **Frontend:** Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui for components
- **Backend:** Supabase (Postgres, Auth, Storage, RLS)
- **Hosting:** Vercel (frontend) + Supabase Cloud
- **State:** React Server Components where possible, `useState` / Zustand only where needed
- **Forms:** `react-hook-form` + `zod`
- **Image handling:** Supabase Storage + Next.js `<Image>`
- **Dev tools:** Cursor or Claude Code, GitHub, Vercel preview deploys per PR

**Why these:** Supabase covers auth + DB + storage + RLS in one piece. Next.js + Vercel deploys in two clicks. shadcn means you don't fight UI components. This stack is boring and proven, which is what you want when shipping solo.

---

## 5. Working Process

### Per-phase rhythm

1. Read the phase goals.
2. Break into smallest possible PRs (one feature each).
3. Build, test on real Crudo Santo data, ship.
4. Move to next item.
5. End of phase: demo to yourself. Does it pass the "definition of done"? If not, finish before moving on.

### Using Cursor / Claude Code

- Keep this `ROADMAP.md` in the repo root. Reference it in prompts.
- Keep a `SCHEMA.md` with the current Supabase schema; update when it changes.
- Keep a `DECISIONS.md` log: every meaningful design choice and why. AI agents reference this to stay consistent.
- For each feature, write a short spec before coding. "Build X that does Y, here's the data model, here's the UX." Then have the AI implement it.
- Commit early, commit often. PR per feature.

### Anti-patterns to avoid

- Building Phase 4 features in Phase 1 because they sound cool.
- Generalizing for "future restaurants" when only Crudo Santo is using it.
- Forcing structure on the testing capture flow.
- Building a master ingredient database before the data builds itself.
- AI features in v1. They're a Phase 6 thing.

---

## 6. Open Questions to Resolve Before Phase 1

- [ ] Final product name
- [ ] Domain
- [ ] Do you want me (Giuseppe / others) to have access from day one, or is it just you until Phase 2?
- [ ] Any constraints from the partners about where data lives / IP ownership, given this might become a product?
- [ ] Will you commit ~5–8 hours/week to building? Sets realistic timeline.

---

## 7. Success Metrics

**Phase 1 success:** Crudo Santo menu fully entered. You stop using Google Docs for recipes.

**Phase 2 success:** You run at least 10 real test sessions in the app. Recipe versions are being created from sessions, not typed from scratch.

**Phase 3 success:** Line cooks at Crudo Santo training reference the app's recipe cards. Giuseppe uses it without complaining.

**Product success (Phase 6 trigger):** Another chef sees yours and asks "can I use that?"

---

*Last updated: May 19, 2026*
