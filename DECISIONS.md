# Design decisions

Log of meaningful design choices. AI agents and contributors should read this alongside [ROADMAP.md](./ROADMAP.md) to stay consistent.

---

## Product & domain

- **Auth method:** Magic link only, no passwords (Phase 0).
- **Multi-tenant from day one** even with one customer (`restaurants` table from Phase 1).
- **Mobile-first responsive;** no native apps in v1.
- **Approved sub-recipes only** — recipes can only reference `recipe_versions` with `status='approved'`.
- **Organic capture during testing,** structure applied at finalize step.
- **Never overwrite recipes** — always create new versions.
- **App display name is "Recipe Tester" through the build phase,** matching the project folder name. The npm package name remains `recipe-tester`. Final product name TBD — do not propose name changes without being asked.

## Stack & auth implementation

- **Middleware uses Next.js 16 `proxy.ts` naming convention** (renamed from `middleware.ts` in Phase 0).
- **Using supabase-js v2 anon key + `getUser()` pattern.** The newer publishable key + `getClaims()` pattern is backward-compatible; we’ll migrate in a future phase if there’s a reason.
- **Sign-out is a POST route, not GET,** to prevent accidental sign-outs via link prefetching.

## Deployment

- **Vercel deploy deferred until end of Phase 1 minimum.** Local-only development through schema and CRUD work. A production environment adds variables (prod URL, prod Supabase redirect URLs, prod env vars) with no payoff during foundation work. Revisit when there’s a reason to show the app to someone outside the dev environment.

## Database (Phase 1a)

- **Schema management:** Supabase CLI migrations checked into `supabase/migrations/`. Never edit applied migrations — add new ones.
- **Denormalized `restaurant_id` on every table.** Auto-populated by BEFORE INSERT triggers from the parent row. RLS policies use this column uniformly.
- **Approval rules enforced at the DB layer via triggers,** not application code. Sub-recipes must be approved; un-approving with dependents requires `force_unapprove_recipe_version()`.
- **TypeScript types** in `src/lib/supabase/database.types.ts` are generated. Regenerate with `npx supabase gen types typescript --linked` after any schema change.
- **`handle_new_restaurant` trigger no-ops when `auth.uid()` is null.** Dashboard-created restaurants (SQL editor as postgres) do not auto-get an owner row — caller must insert `restaurant_members` manually. Authenticated app calls always have `auth.uid()` and behave normally.

## Database (Phase 1a follow-up — ingredients & units)

- **Ingredients are first-class restaurant-scoped rows** (`ingredients` table). `recipe_ingredients` references `ingredients.id`; free-text ingredient names are not allowed. Two chefs writing recipes for the same restaurant share one master list.
- **Ingredient name uniqueness:** case-insensitive, whitespace-normalized via the generated `name_normalized` column with a unique index. UI will surface near-matches when chefs try to create a new ingredient.
- **Units are a fixed enum (`unit_type`):** `g`, `kg`, `ml`, `l`, `tsp`, `tbsp`, `cup`, `fl_oz`, `oz`, `lb`, `each`, `pinch`. No free-text units. Adding a unit requires a migration.
- **Cross-restaurant guards:** ingredients and sub-recipes referenced from `recipe_ingredients` must belong to the same restaurant as the parent recipe. Enforced by triggers.
- **`method` (recipe instructions) remains free-form markdown** — explicitly not normalized in v1. `prep_note` remains free text with UI suggestion list to come in Phase 1c.

---

*Add new entries at the bottom with date and short rationale when decisions change.*
