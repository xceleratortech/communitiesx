# rstart

A modern full-stack boilerplate project built with cutting-edge technologies:

- [Next.js](https://nextjs.org) - React framework for production
- [tRPC](https://trpc.io) - End-to-end typesafe APIs
- [Drizzle ORM](https://orm.drizzle.team/docs) - TypeScript ORM for better database management
- [better-auth](https://better-auth.dev/docs) - Modern authentication solution
- [Tailwind CSS v4](https://tailwindcss.com) - Next-generation utility-first CSS
- Opinionated configurations for [ESLint](https://eslint.org) & [Prettier](https://prettier.io) - Code quality and formatting

## Getting Started

> ⚠️ This project uses pnpm exclusively. Please ensure you have pnpm installed:
>
> ```bash
> curl -fsSL https://get.pnpm.io/install.sh | sh -
> ```

First, install dependencies using pnpm:

```bash
pnpm install
```

Then, run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

For tRPC client support, wrap your app in the `<TRPCProvider>` inside your `ThemeProvider` in `src/app/layout.tsx`.

## Tech Stack Features

### Next.js App Router

The project uses the latest Next.js features including App Router ([Docs](https://nextjs.org/docs/app)) for enhanced routing and server components.

### End-to-end Type Safety

With tRPC, enjoy full type safety from your backend to frontend without any manual type synchronization.

#### Example tRPC Procedure

```ts
// src/server/trpc/router.ts
import { router, publicProcedure } from '@/server/trpc/router';

export const appRouter = router({
    hello: publicProcedure.query(() => 'Hello world'),
});
export type AppRouter = typeof appRouter;
```

#### Why tRPC?

- End-to-end type safety without manual schema syncing or code generation.
- Rapid API development with minimal boilerplate and auto-inferred inputs/outputs.
- Seamless React Query integration for caching and data fetching.

### Modern Database Management

[Drizzle ORM](https://orm.drizzle.team/docs) provides a type-safe and performant way to interact with your database, with features like:

- Type-safe schema declarations
- Migrations management
- Query building
  +#### Why Drizzle ORM?

- End-to-end TypeScript safety from schema to query responses.
- Built-in migration tooling ([drizzle-kit](https://orm.drizzle.team/docs/kit)) for smooth schema evolution.
- Lightweight and performant PostgreSQL integration with minimal overhead.

### Authentication

better-auth provides a modern authentication solution ([Docs](https://better-auth.dev/docs)) with:

- **Server config:** `src/server/auth/server.ts` — main Better Auth setup, including the admin plugin and custom user fields (e.g., `timezone` via `additionalFields`).
- **Client helper:** `src/server/auth/client.ts` — provides React hooks and helpers for authentication, including admin features and type-safe user fields.

#### Example: Server Auth Setup

```ts
// src/server/auth/server.ts
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '@/server/db';
import { nextCookies } from 'better-auth/next-js';
import { admin } from 'better-auth/plugins/admin';
import { sendEmail } from '@/lib/email';
import {
    createVerificationEmail,
    createResetPasswordEmail,
} from '@/lib/email-templates';

export const auth = betterAuth({
    database: drizzleAdapter(db, { provider: 'pg', usePlural: true }),
    plugins: [
        nextCookies(),
        admin({
            defaultRole: 'user',
            impersonationSessionDuration: 60 * 60 * 24,
        }),
    ],
    user: {
        additionalFields: {
            timezone: { type: 'string', required: false, input: true },
        },
    },
    // ...other config
});

// Helper to fetch user session on the server
export async function getUserSession(headers: Headers | null = null) {
    const _headers = headers ?? new Headers();
    return await auth.api.getSession({ headers: _headers });
}
```

#### Example: Client Auth Helper

```ts
// src/server/auth/client.ts
import { createAuthClient } from 'better-auth/react';
import { adminClient, inferAdditionalFields } from 'better-auth/client/plugins';
import type { auth } from './server';

export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_APP_URL,
    plugins: [inferAdditionalFields<typeof auth>(), adminClient()],
});

export const { signIn, signOut, signUp, useSession } = authClient;
```

### Modern Styling with Tailwind CSS v4

Latest version of Tailwind CSS offering:

- Enhanced performance
- Extended utility classes
- Improved developer experience
- Better customization options

### Code Quality and Formatting

Strongly opinionated configurations for consistent code style:

- Custom ESLint configuration with strict TypeScript rules
- Tailored Prettier settings for consistent formatting
- Pre-commit hooks for code quality enforcement
- Project-specific rules for better developer experience
- Integrated VS Code settings for seamless development

#### Git Hooks with Husky

- Uses [Husky](https://typicode.github.io/husky) to manage Git hooks in the `.husky/` directory.
- **Pre-commit hook** runs [lint-staged](https://github.com/okonet/lint-staged) to auto-format and lint your staged files, blocking commits on errors.
- **Commit-msg hook** enforces [Conventional Commits](https://www.conventionalcommits.org/) standards before accepting your message.
- Hooks install automatically via the `prepare` script on `pnpm install`.

#### Editor and Commit Integration

- Ensure your editor runs ESLint and Prettier on save (e.g., enable "Format on Save" in VSCode).
- Recommended VSCode extensions: ESLint, Prettier, EditorConfig.
- Lint or formatting failures will prevent commits; fix issues before staging.

## Project Structure

```plaintext
rstart/
├── src/
│   ├── app/
│   │   ├── layout.tsx       // Main layout and metadata
│   │   ├── api/
│   │   │   └── trpc/
│   │   │       └── [...trpc]/route.ts // Next.js tRPC handler
│   │   ├── page.tsx         // Home page (example)
│   │   └── globals.css      // Global styles
│   ├── components/          // Reusable UI components
│   ├── lib/                 // Utility functions and configurations
│   ├── providers/           // Context providers (ThemeProvider, TRPC Provider)
│   │   ├── theme-provider.tsx
│   │   └── trpc-provider.tsx // tRPC React provider
│   └── server/              // Backend logic
│       ├── db/              // Drizzle ORM (schema, pool, auth adapters)
│       ├── auth/            // Authentication logic
│       └── trpc/            // tRPC router definitions
├── public/                  // Static assets (images, fonts, etc.)
├── .vscode/                // VS Code configuration and settings
├── .github/                // GitHub workflows and templates
├── package.json             // Project manifest and scripts
├── pnpm-lock.yaml           // Locked dependencies for pnpm
├── tsconfig.json            // TypeScript configuration
├── next.config.js           // Next.js configuration
└── tailwind.config.js       // Tailwind CSS configuration
```

## Environment Variables (T3-Style)

This project uses a T3-style environment variable validation system powered by [zod](https://zod.dev/).

- **Validation:** All required environment variables are validated at runtime.
- **Separation:** Server-only and client-exposed (NEXT*PUBLIC*\*) variables are validated separately.
- **Usage:** Import and use the `env` object from `@/lib/env` for type-safe, validated access to your environment variables.

### Adding Environment Variables

1. **Server Variables:**
    - Add your variable to the `serverSchema` in `src/lib/env.ts`.
    - Example: `DATABASE_URL: z.string().url()`
2. **Client Variables:**
    - Add your variable to the `clientSchema`

## Migration Workflow Example

```bash
# Edit your schema in src/server/db/schema.ts
pnpm [drizzle-kit](https://orm.drizzle.team/docs/kit) generate   # generates migration files in ./drizzle
pnpm db:push       # applies migrations to your database
```
