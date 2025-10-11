# rstart - Project Rules & Documentation

## Project Overview

rstart is a modern full-stack boilerplate designed to streamline web application development with a focus on type safety, developer experience, and scalability. It integrates the latest technologies in the React ecosystem with an opinionated structure that follows best practices.

## Project Rules

To maintain consistency and quality throughout the project lifecycle, all team members must adhere to the following rules:

### Code Organization Rules

1. **File Structure Enforcement**:
    - All server-side code MUST be located in the `src/server/` directory
    - All client components MUST be placed in appropriate directories under `src/app/`
    - Shared utilities MUST go in `src/lib/`
    - Context providers MUST be in `src/providers/`

2. **Naming Conventions**:
    - Use PascalCase for React components: `UserProfile.tsx`
    - Use camelCase for utilities and hooks: `useFormattedDate.ts`
    - Use kebab-case for CSS files: `button-styles.css`
    - Prefix custom hooks with "use": `useAuthentication.ts`

3. **Module Boundaries**:
    - No direct imports from `src/server/` in client components
    - Access server functionality ONLY through tRPC procedures

### Development Process Rules

1. **Branch Management**:
    - Feature branches must follow pattern: `feature/feature-name`
    - Bug fixes must follow pattern: `fix/issue-description`
    - Always rebase on main before creating a pull request

2. **Commit Guidelines**:
    - Follow Conventional Commits format: `feat: add user authentication`
    - Include issue number when applicable: `fix: resolve login redirect issue (#123)`
    - Keep commits focused on single logical changes

3. **Code Quality Requirements**:
    - All code MUST pass linting before commit (enforced by husky)
    - Unit tests MUST be written for critical business logic
    - Authentication-related changes MUST undergo security review

    > **⚠️ Type Safety Callout:**
    >
    > - **Avoid using the `any` type.** Always strive for explicit, safe types to maintain type safety across the codebase.
    > - **Avoid using `new type` declarations when the type can be inferred.** Prefer type inference to reduce redundancy and improve maintainability.

### API Development Rules

1. **tRPC Implementation**:
    - All procedures MUST be properly typed with Zod schemas for inputs
    - Public procedures MUST be explicit about their exposure
    - Protected procedures MUST include proper session validation
    - Procedures MUST be organized by domain/feature in the router

2. **Database Practices**:
    - Schema changes MUST be done through migrations
    - Foreign keys MUST be properly defined with references
    - Indexes MUST be created for frequently queried fields
    - Sensitive data MUST NEVER be stored in plaintext

### Security Rules

1. **Authentication**:
    - NEVER bypass authentication for protected routes
    - ALWAYS validate user permissions for admin actions
    - NEVER expose sensitive tokens in client-side code
    - Implement proper CSRF protection for all form submissions

2. **Data Handling**:
    - ALWAYS sanitize user inputs server-side
    - NEVER trust client-side validation alone
    - Use content security policies to prevent XSS

3. **HTML Content Security**:
    - **NEVER use `dangerouslySetInnerHTML` directly**
    - **ALWAYS use the `SafeHtml` component for rendering user-generated HTML content**
    - **ALWAYS sanitize HTML content server-side before storing in database**
    - Use the `sanitizeHtml()` function from `@/lib/sanitize` for server-side sanitization
    - Use the `SafeHtml` component from `@/lib/sanitize` for client-side rendering

### Performance Rules

1. **Frontend Optimization**:
    - Implement proper code-splitting for larger components
    - Optimize images and assets before deployment
    - Use React Server Components where possible to reduce client bundle

2. **Backend Optimization**:
    - Implement proper database indexing
    - Cache expensive query results
    - Use connection pooling for database connections

## Tech Stack

The project combines the following technologies:

- **Next.js 15+** - React framework with App Router for advanced server/client component architecture
- **tRPC** - End-to-end typesafe APIs without schemas or code generation
- **Drizzle ORM** - Lightweight TypeScript ORM with optimal PostgreSQL integration
- **better-auth** - Modern authentication with support for email/password and admin features
- **Tailwind CSS v4** - Utility-first CSS framework with enhanced features
- **TypeScript** - Full type safety across the entire application
- **ESLint & Prettier** - Code quality and formatting enforced via pre-commit hooks
- **pnpm** - Fast, disk space efficient package manager (required for this project)

## Project Structure

```
rstart/
├── src/
│   ├── app/                 # Next.js App Router pages and API routes
│   │   ├── api/
│   │   │   ├── auth/        # Auth API endpoints
│   │   │   └── trpc/        # tRPC API handler
│   │   ├── layout.tsx       # Root layout with providers
│   │   ├── page.tsx         # Home page
│   │   └── globals.css      # Global styles
│   ├── lib/                 # Utility functions and shared code
│   ├── providers/           # React context providers
│   │   ├── theme-provider.tsx  # Theme management
│   │   └── trpc-provider.tsx   # tRPC client setup
│   └── server/              # Server-side code
│       ├── auth/            # Authentication configuration
│       │   ├── client.ts    # Client-side auth hooks
│       │   └── server.ts    # Server-side auth setup
│       ├── db/              # Database schema and connection
│       │   ├── auth-schema.ts  # Authentication tables schema
│       │   ├── index.ts     # Database connection setup
│       │   └── schema.ts    # Application data schema
│       └── trpc/            # tRPC router and procedures
│           └── router.ts    # API endpoint definitions
├── drizzle/                 # Database migrations
├── public/                  # Static assets
└── [config files]           # Various configuration files
```

## Core Features

### 1. Type-Safe APIs with tRPC

The project uses tRPC to create end-to-end typesafe APIs without manual schema definition or code generation.

#### Procedure Definition

API endpoints are defined in `src/server/trpc/router.ts`:

```typescript
// Define a procedure
export const appRouter = router({
    hello: publicProcedure.query(() => 'Hello world'),
    // Add your additional procedures here
});
```

#### Client Usage

Use the tRPC client hooks in your components:

```typescript
'use client';
import { trpc } from '@/providers/trpc-provider';

export function MyComponent() {
    const hello = trpc.hello.useQuery();
    return <div>{hello.data}</div>;
}
```

### 2. Database Management with Drizzle ORM

#### Schema Definition

Define your database schema in `src/server/db/schema.ts`:

```typescript
import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    createdAt: timestamp('created_at').notNull(),
    // Add more fields as needed
});
```

#### Database Operations

Use the Drizzle ORM instance to perform database operations:

```typescript
import { db } from '@/server/db';
import { users } from '@/server/db/schema';
import { eq } from 'drizzle-orm';

// Example query
const getUser = async (id: number) => {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
};
```

#### Migration Workflow

```bash
# Edit your schema in src/server/db/schema.ts
pnpm db:generate  # Generates migration files in ./drizzle
pnpm db:push      # Applies migrations to your database
```

### 3. Authentication with better-auth

The project uses better-auth for authentication with email/password support, Google OAuth, and OTP (One-Time Password) authentication.

#### Server Configuration

Authentication is configured in `src/server/auth/server.ts`:

```typescript
// Server-side authentication setup
export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: 'pg',
        usePlural: true,
    }),
    plugins: [
        nextCookies(),
        admin({
            defaultRole: 'user',
            impersonationSessionDuration: 60 * 60 * 24,
        }),
        emailOTP({
            otpLength: 6,
            expiresIn: 300, // 5 minutes
            allowedAttempts: 3,
            disableSignUp: true, // Only for existing users
            async sendVerificationOTP({ email, otp, type }) {
                const { subject, html } = createOTPEmail(email, otp, type);
                await sendEmail({ to: email, subject, html });
            },
        }),
    ],
    // Additional configuration
});
```

#### Authentication Methods

The platform supports three authentication methods:

1. **Email/Password**: Traditional username/password authentication
2. **Google OAuth**: Social login via Google accounts
3. **OTP (One-Time Password)**: Passwordless authentication via email

#### OTP Authentication Features

- **6-digit codes** sent to user's registered email
- **5-minute expiration** for security
- **3 attempt limit** before requiring a new OTP
- **Existing users only** (no automatic registration)
- **Professional email templates** with CommunityX branding

#### Client Usage

Use authentication hooks in your components:

```typescript
'use client';
import { useSession, signIn, signOut } from '@/server/auth/client';

export function AuthComponent() {
    const session = useSession();

    if (!session.data) {
        return (
            <div>
                <button onClick={() => signIn.email({ email, password })}>
                    Sign In with Password
                </button>
                <button onClick={() => signIn.social({ provider: 'google' })}>
                    Sign In with Google
                </button>
                <button onClick={() => signIn.emailOtp({ email, otp })}>
                    Sign In with OTP
                </button>
            </div>
        );
    }

    return (
        <div>
            <p>Signed in as {session.data.user.email}</p>
            <button onClick={() => signOut()}>Sign Out</button>
        </div>
    );
}
```

#### OTP Authentication Flow

1. **User enters email** on login page
2. **Clicks "Sign in with OTP"** button
3. **System sends 6-digit code** to user's email
4. **User enters OTP** in the verification form
5. **System validates OTP** and signs user in
6. **User is redirected** to their intended destination

## Best Practices

### Adding New Features

#### 1. Adding a New API Endpoint

1. Define your procedure in the router:

```typescript
// src/server/trpc/router.ts
export const appRouter = router({
    existing: publicProcedure.query(...),

    // Add your new procedure
    newFeature: publicProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
            // Implementation
            return { result: `Feature ${input.id}` };
        }),
});
```

2. Use the procedure in your component:

```typescript
const result = trpc.newFeature.useQuery({ id: 1 });
```

#### 2. Adding a New Database Model

1. Define the schema in `src/server/db/schema.ts`:

```typescript
export const products = pgTable('products', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    price: decimal('price').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
});
```

2. Generate and apply migrations:

```bash
pnpm db:generate
pnpm db:push
```

3. Use the model in your code:

```typescript
import { products } from '@/server/db/schema';

// In a tRPC procedure or API route
const allProducts = await db.select().from(products);
```

#### 3. Adding Authentication to a Route

1. Get the user session in your tRPC procedure:

```typescript
import { getUserSession } from '@/server/auth/server';

const protectedRouter = router({
    protectedRoute: publicProcedure.query(async ({ ctx }) => {
        const session = await getUserSession();

        if (!session || !session.user) {
            throw new Error('Unauthorized');
        }

        // Proceed with authenticated logic
        return { user: session.user };
    }),
});
```

### Project Organization

1. **Component Structure**:
    - Reusable UI components go in `src/components/`
    - Page-specific components should live within their page directory

2. **Server Logic**:
    - Keep all server-related code in the `src/server/` directory
    - Database models in `src/server/db/schema.ts`
    - API routes using tRPC procedures in `src/server/trpc/router.ts`

3. **Client Logic**:
    - Page components in `src/app/` using the App Router
    - Shared providers in `src/providers/`
    - Utility functions in `src/lib/`

## Development Workflow

### Environment Setup

1. Install dependencies:

```bash
pnpm install
```

2. Set up environment variables in `.env`:

```
DATABASE_URL=postgresql://user:password@localhost:5432/your_db
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

3. Run development server:

```bash
pnpm dev
```

### Code Quality

The project enforces code quality standards with ESLint and Prettier:

- Pre-commit hooks (using Husky) ensure code formatting before commits
- Run `pnpm lint` to check for code quality issues
- Run `pnpm format` to automatically format code

### Database Management

- Modify schemas in `src/server/db/schema.ts`
- Generate migrations with `pnpm db:generate`
- Apply migrations with `pnpm db:push`

#### Recent Schema Changes

**User Profiles Table (user_profiles)**

- **Table:** `user_profiles`
- **Purpose:** Stores user profile information in a flexible JSON structure
- **Key Fields:**
    - `id`: Primary key (serial)
    - `userId`: Foreign key to users table (unique)
    - `metadata`: JSONB column containing profile data (phone, experiences, education, skills, etc.)
    - `createdAt` & `updatedAt`: Timestamps
- **Data Type:** Uses `jsonb` for optimal JSON storage and querying in PostgreSQL
- **Migration:** Migration `0025_famous_redwing.sql` converts metadata from `text` to `jsonb`

## Deployment Considerations

1. **Database Setup**:
    - Ensure your PostgreSQL database is properly set up
    - Run migrations on deployment with `pnpm db:push`

2. **Environment Variables**:
    - Set all required environment variables in your deployment platform
    - Ensure `NEXT_PUBLIC_APP_URL` is set to your production URL

3. **Build and Start**:
    - Build the application with `pnpm build`
    - Start the production server with `pnpm start`

## Extending the Project

### Adding New Authentication Providers

Update the auth configuration in `src/server/auth/server.ts` to add additional providers:

```typescript
export const auth = betterAuth({
    // Existing config
    oauth: {
        providers: [
            {
                id: 'github',
                name: 'GitHub',
                clientId: process.env.GITHUB_CLIENT_ID!,
                clientSecret: process.env.GITHUB_CLIENT_SECRET!,
            },
            // Add more providers
        ],
    },
});
```

### Implementing Role-Based Access Control

Leverage better-auth's admin plugin for role-based access:

```typescript
// Check user role in a protected route
const protectedRouter = router({
    adminRoute: publicProcedure.query(async () => {
        const session = await getUserSession();

        if (!session?.user || session.user.role !== 'admin') {
            throw new Error('Unauthorized: Admin access required');
        }

        // Admin-only logic
        return { status: 'Admin access granted' };
    }),
});
```

### Adding Background Jobs

For background job processing, consider adding a task queue like BullMQ:

1. Install the dependency:

```bash
pnpm add bullmq
```

2. Create a jobs directory:

```
src/server/jobs/
```

3. Implement job processing with Redis as the backend

## Conclusion

This documentation provides a comprehensive overview of the rstart project structure, features, and best practices. The project combines modern technologies with an opinionated setup to provide a robust foundation for full-stack web application development.

For questions or improvements to this documentation, please contribute to the project repository.
