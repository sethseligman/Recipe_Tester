# Recipe Tester

Recipe development and testing platform for restaurants in the pre-opening phase. **Phase 0** provides authentication only; recipe features begin in Phase 1.

See [ROADMAP.md](./ROADMAP.md) for the full product vision and phases.

## Prerequisites

- **Node.js** 20.19+ or 22.13+ (LTS recommended; Next.js 16 + ESLint may warn on other versions)
- **npm** 10+
- A [Supabase](https://supabase.com) account

## Setup

### 1. Clone and install

```bash
git clone <your-repo-url>
cd Recipe_Tester
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Open **Project Settings → API** and copy:
   - **Project URL**
   - **anon** `public` key (legacy) or your project’s publishable client key

### 3. Environment variables

```bash
cp .env.local.example .env.local
```

Fill in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Supabase Auth settings

In the Supabase dashboard (**Authentication → URL configuration**):

1. Enable **Email** provider (magic link / OTP).
2. Set **Site URL** to `http://localhost:3000`
3. Add **Redirect URLs**:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/**`

**Magic Link email template (PKCE):** In **Authentication → Email Templates → Magic Link**, use a link that sends users to this app’s callback with a token hash (the default `{{ .ConfirmationURL }}` alone often does not work with SSR + PKCE):

```html
<h2>Magic Link</h2>
<p><a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email">Log in to Recipe Tester</a></p>
```

If you use a non-default dev port, add that origin’s `/auth/callback` to Redirect URLs and request a **new** magic link after changing ports.

For production, add your deployed URL and `https://your-domain.com/auth/callback` (and `https://your-domain.com/**` if you use wildcards).

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). If port 3000 is in use, Next.js will pick another port (e.g. 3001)—use whatever the terminal prints.

### 6. Sign in

1. Click **Sign in** and enter your email.
2. Open the magic link from your inbox.
3. You should land on the home page, signed in, with your email in the nav.
4. Use **Sign out** from the user menu to end the session.

## Scripts

| Command        | Description              |
| -------------- | ------------------------ |
| `npm run dev`  | Development server       |
| `npm run build`| Production build         |
| `npm run start`| Run production build     |
| `npm run lint` | ESLint                   |

## What’s next

Foundation (auth, schema, menus, ingredients, versioning) is on `main`. **Current work: Phase A — menu upload + AI parse** — see [ROADMAP.md](./ROADMAP.md). Design decisions: [DECISIONS.md](./DECISIONS.md).
