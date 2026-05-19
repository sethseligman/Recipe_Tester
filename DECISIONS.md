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

---

*Add new entries at the bottom with date and short rationale when decisions change.*
