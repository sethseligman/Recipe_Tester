# Recipe Tester — Database Schema

Applied in Phase 1a via `supabase/migrations/20260519224149_initial_schema.sql`, with follow-up in `20260520004540_ingredients_master_and_units.sql`. Regenerate TypeScript types after any schema change: `npx supabase gen types typescript --linked 2>/dev/null > src/lib/supabase/database.types.ts`.

## Enums

### `unit_type`

Canonical units for recipe ingredient quantities. Adding a value requires a migration.

| Value | Typical use |
|-------|-------------|
| `g` | Grams (metric mass) |
| `kg` | Kilograms |
| `ml` | Milliliters (metric volume) |
| `l` | Liters |
| `tsp` | Teaspoon |
| `tbsp` | Tablespoon |
| `cup` | Cup |
| `fl_oz` | Fluid ounce |
| `oz` | Ounce (mass) |
| `lb` | Pound |
| `each` | Count / whole item |
| `pinch` | Small imprecise amount |

## Tables

### `restaurants`

Top-level tenant. Creating a row auto-adds the creator as `owner` in `restaurant_members`.

| Column | Type | Notes |
|--------|------|--------|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `name` | `text` | Required |
| `slug` | `text` | Unique, optional |
| `created_by` | `uuid` | FK → `auth.users`, nullable |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | Auto-updated by trigger |

### `restaurant_members`

Links Supabase Auth users to restaurants with a role.

| Column | Type | Notes |
|--------|------|--------|
| `id` | `uuid` | PK |
| `restaurant_id` | `uuid` | FK → `restaurants`, cascade delete |
| `user_id` | `uuid` | FK → `auth.users`, cascade delete |
| `role` | `text` | `owner` \| `admin` \| `member`, default `member` |
| `created_at` | `timestamptz` | |

Unique on `(restaurant_id, user_id)`.

### `menus`

Named menu within a restaurant (e.g. dinner, lunch).

| Column | Type | Notes |
|--------|------|--------|
| `id` | `uuid` | PK |
| `restaurant_id` | `uuid` | FK → `restaurants` |
| `name` | `text` | Required |
| `position` | `int` | Sort order, default 0 |
| `is_archived` | `boolean` | Default false |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

### `sections`

Menu section (e.g. Raw Bar, Mains). `restaurant_id` denormalized from parent menu.

| Column | Type | Notes |
|--------|------|--------|
| `id` | `uuid` | PK |
| `menu_id` | `uuid` | FK → `menus` |
| `restaurant_id` | `uuid` | FK → `restaurants`, auto-set from menu |
| `name` | `text` | Required |
| `position` | `int` | Default 0 |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

### `dishes`

Sellable dish on the menu. `restaurant_id` auto-set from section.

| Column | Type | Notes |
|--------|------|--------|
| `id` | `uuid` | PK |
| `section_id` | `uuid` | FK → `sections` |
| `restaurant_id` | `uuid` | FK → `restaurants`, auto-set |
| `name` | `text` | Required |
| `menu_description` | `text` | Customer-facing copy |
| `position` | `int` | Default 0 |
| `plating_photo_url` | `text` | Optional |
| `is_archived` | `boolean` | Default false |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

### `components`

Reusable recipe building block (e.g. leche de tigre), shared across dishes.

| Column | Type | Notes |
|--------|------|--------|
| `id` | `uuid` | PK |
| `restaurant_id` | `uuid` | FK → `restaurants` |
| `name` | `text` | Required |
| `description` | `text` | Optional |
| `is_archived` | `boolean` | Default false |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

### `ingredients`

Restaurant-scoped master list of ingredients. Chefs share one canonical name per restaurant; duplicates are blocked by normalized name.

| Column | Type | Notes |
|--------|------|--------|
| `id` | `uuid` | PK |
| `restaurant_id` | `uuid` | FK → `restaurants` |
| `name` | `text` | Required display name |
| `name_normalized` | `text` | **Generated (stored):** `lower(regexp_replace(trim(name), '\s+', ' ', 'g'))` — used for dedupe |
| `description` | `text` | Optional |
| `created_by` | `uuid` | FK → `auth.users`, nullable |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | Auto-updated by trigger |

Unique on `(restaurant_id, name_normalized)`.

### `dish_components`

Join table: which components belong to which dish, with optional role (base, protein, garnish, etc.).

| Column | Type | Notes |
|--------|------|--------|
| `id` | `uuid` | PK |
| `dish_id` | `uuid` | FK → `dishes` |
| `component_id` | `uuid` | FK → `components` |
| `restaurant_id` | `uuid` | FK → `restaurants`, auto-set from dish |
| `role` | `text` | Optional label |
| `position` | `int` | Default 0 |
| `created_at` | `timestamptz` | |

### `recipe_versions`

Versioned recipe for a component. Never overwrite — new row per version. Status workflow: `draft` → `testing` → `approved` → `archived`.

| Column | Type | Notes |
|--------|------|--------|
| `id` | `uuid` | PK |
| `component_id` | `uuid` | FK → `components` |
| `restaurant_id` | `uuid` | FK → `restaurants`, auto-set from component |
| `version_number` | `int` | Unique per component |
| `title` | `text` | Optional |
| `yield_amount` | `numeric` | Optional |
| `yield_unit` | `text` | Optional |
| `method` | `text` | Markdown method |
| `status` | `text` | `draft` \| `testing` \| `approved` \| `archived` |
| `created_by` | `uuid` | FK → `auth.users`, nullable |
| `approved_at` | `timestamptz` | Set when status becomes `approved` |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

Unique on `(component_id, version_number)`.

### `recipe_ingredients`

Ingredient line or sub-recipe reference on a recipe version. Each row is **either** a master-list ingredient **or** a sub-recipe — not both (XOR check). Every row requires `qty` and `unit`.

| Column | Type | Notes |
|--------|------|--------|
| `id` | `uuid` | PK |
| `recipe_version_id` | `uuid` | FK → `recipe_versions` |
| `restaurant_id` | `uuid` | FK → `restaurants`, auto-set from version |
| `position` | `int` | Default 0 |
| `ingredient_id` | `uuid` | FK → `ingredients`, set when not a sub-recipe |
| `sub_recipe_version_id` | `uuid` | FK → `recipe_versions`, must be `approved` |
| `qty` | `numeric` | Required |
| `unit` | `unit_type` | Required; canonical enum |
| `prep_note` | `text` | Optional |
| `created_at` | `timestamptz` | |

## Triggers and constraints

| Name | Purpose |
|------|---------|
| `set_updated_at` | Sets `updated_at = now()` on update (restaurants, menus, sections, dishes, components, ingredients, recipe_versions). |
| `trg_sections_restaurant` / `trg_dishes_restaurant` / `trg_dish_components_restaurant` / `trg_recipe_versions_restaurant` / `trg_recipe_ingredients_restaurant` | BEFORE INSERT/UPDATE: copy `restaurant_id` from parent row so denormalized column stays correct. |
| `handle_new_restaurant` | AFTER INSERT on `restaurants`: insert creator as `owner` in `restaurant_members`. |
| `check_sub_recipe_approved` | BEFORE INSERT/UPDATE on `recipe_ingredients`: `sub_recipe_version_id` must reference a version with `status = 'approved'`. |
| `check_unapprove_dependencies` | BEFORE UPDATE on `recipe_versions`: block leaving `approved` if other approved recipes depend on this version; sets `approved_at` when approving. |
| `force_unapprove_recipe_version(version_id, new_status)` | Security-definer escape hatch: sets `app.force_unapprove` and changes status to `draft`, `testing`, or `archived`. |
| `recipe_ingredients_xor_check` | `(ingredient_id IS NOT NULL AND sub_recipe_version_id IS NULL) OR (ingredient_id IS NULL AND sub_recipe_version_id IS NOT NULL)`. |
| `recipe_ingredients_qty_required` | `qty IS NOT NULL AND unit IS NOT NULL` on every row. |
| `check_ingredient_same_restaurant` | BEFORE INSERT/UPDATE on `recipe_ingredients`: `ingredient_id` must belong to the same restaurant as the parent recipe version. |
| `check_sub_recipe_same_restaurant` | BEFORE INSERT/UPDATE on `recipe_ingredients`: `sub_recipe_version_id` must belong to the same restaurant as the parent recipe version. |

**Migration note:** `is_restaurant_member()` is created after `restaurant_members` exists (function body references that table).

## RLS policies

RLS is enabled on all ten tables. Pattern:

- **`is_restaurant_member(restaurant_id)`** — helper function (security definer) used in most policies.
- **Child tables** — `USING` / `WITH CHECK` on denormalized `restaurant_id` for uniform member access on menus, sections, dishes, components, ingredients, dish_components, recipe_versions, recipe_ingredients.
- **`restaurants`** — members can SELECT/UPDATE their restaurants; any authenticated user can INSERT (creator becomes owner via trigger).
- **`restaurant_members`** — members can SELECT; only `owner`/`admin` can INSERT/UPDATE/DELETE membership rows.

All policies target the `authenticated` role.

## Helper functions

| Function | Purpose |
|----------|---------|
| `is_restaurant_member(rid uuid)` | Returns whether `auth.uid()` is a member of the restaurant. |
| `force_unapprove_recipe_version(version_id, new_status)` | Callable override for un-approve when dependents exist. |
