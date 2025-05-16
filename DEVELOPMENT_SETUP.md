# rstart - Development Environment Setup

This guide will walk you through the process of setting up your local development environment for the rstart project. Following these steps will ensure you have all necessary tools and configurations to run, develop, and contribute effectively.

## 1. Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Node.js**: We recommend using the latest LTS version. You can download it from [nodejs.org](https://nodejs.org/).
- **pnpm**: This project uses pnpm as its package manager for speed and efficiency. If you don't have pnpm, install it globally:
    ```bash
    curl -fsSL https://get.pnpm.io/install.sh | sh -
    ```
    Alternatively, if you have Node.js already, you can use `corepack enable` (available in Node.js 16.13+) and then `corepack prepare pnpm@latest --activate`.
- **Git**: For version control. Download from [git-scm.com](https://git-scm.com/).
- **PostgreSQL**: A running instance of PostgreSQL is required for the database. You can install it locally or use Docker.

## 2. Getting Started

1.  **Clone the Repository**:

    ```bash
    git clone <repository-url> # Replace <repository-url> with the actual Git URL
    cd rstart
    ```

2.  **Install Dependencies**:
    This command will install all project dependencies defined in `package.json` and `pnpm-lock.yaml`.
    ```bash
    pnpm install
    ```
    This will also set up Husky pre-commit hooks.

## 3. Environment Configuration

The project requires environment variables for database connections and application URLs.

1.  **Create `.env` File**:
    Copy the example environment file (if one exists) or create a new `.env` file in the project root.

    ```bash
    cp .env.example .env # If .env.example exists
    # Otherwise, create .env and add the following:
    ```

2.  **Set Environment Variables**:
    Add the following necessary variables to your `.env` file:

    ```env
    DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE_NAME"
    NEXT_PUBLIC_APP_URL="http://localhost:3000"

    # Example for a local PostgreSQL setup:
    # DATABASE_URL="postgresql://postgres:mysecretpassword@localhost:5432/rstart_dev"
    ```

    - Replace `USER`, `PASSWORD`, `HOST`, `PORT`, and `DATABASE_NAME` with your actual PostgreSQL credentials and database details.
    - `NEXT_PUBLIC_APP_URL` is used by Next.js and better-auth for constructing absolute URLs.

    The project uses Zod for environment variable validation (see `src/lib/env.ts`). The application will not start if required variables are missing or invalid.

## 4. Database Setup

This project uses Drizzle ORM for database interactions and migrations.

1.  **Ensure PostgreSQL is Running**:
    Make sure your PostgreSQL server is running and accessible with the credentials provided in your `.env` file. You'll also need to have created the database specified in `DATABASE_URL`.

2.  **Run Database Migrations**:
    To apply the latest database schema changes, run:

    ```bash
    pnpm db:push
    ```

    This command pushes the schema defined in `src/server/db/schema.ts` and `src/server/db/auth-schema.ts` to your database.

    If you make changes to the Drizzle schema files (`src/server/db/schema.ts` or `src/server/db/auth-schema.ts`), you'll need to generate migration files first:

    ```bash
    pnpm db:generate
    ```

    Then apply them:

    ```bash
    pnpm db:push
    ```

## 5. Running the Development Server

Once dependencies are installed and the environment is configured, you can start the Next.js development server:

```bash
pnpm dev
```

This will start the application, typically on `http://localhost:3000`. Open this URL in your browser to see the application running. The server will automatically reload if you make changes to the code.

## 6. Code Quality and Formatting

The project is equipped with ESLint for linting and Prettier for code formatting to maintain code consistency. These are enforced by Husky pre-commit hooks.

- **Pre-commit Hooks**: Husky is configured to run `lint-staged` before each commit. This will automatically lint and format your staged files. If linting errors are found or formatting changes are needed, the commit may be aborted. Fix the issues and try committing again.
- **Manual Linting**: To manually check for linting errors across the project:
    ```bash
    pnpm lint
    ```
- **Manual Formatting**: To manually format all project files according to Prettier rules:
    ```bash
    pnpm format
    ```

## 7. Editor/IDE Setup (Recommended)

For the best development experience, configure your editor to integrate with ESLint and Prettier.

### Visual Studio Code (VSCode)

1.  **Install Recommended Extensions**:

    - **ESLint** (by Microsoft, id: `dbaeumer.vscode-eslint`): Integrates ESLint into VSCode.
    - **Prettier - Code formatter** (by Prettier, id: `esbenp.prettier-vscode`): Formats code using Prettier.
    - **Tailwind CSS IntelliSense** (by Tailwind Labs, id: `bradlc.vscode-tailwindcss`): Provides autocompletion, linting, and syntax highlighting for Tailwind CSS.
    - **EditorConfig for VS Code** (by EditorConfig, id: `EditorConfig.EditorConfig`): Helps maintain consistent coding styles.

2.  **Configure Settings**:
    Consider adding these to your VSCode `settings.json` (User or Workspace) to enable format on save:
    ```json
    {
        "editor.formatOnSave": true,
        "editor.defaultFormatter": "esbenp.prettier-vscode", // Set Prettier as default
        "[typescript]": {
            "editor.defaultFormatter": "esbenp.prettier-vscode"
        },
        "[typescriptreact]": {
            "editor.defaultFormatter": "esbenp.prettier-vscode"
        },
        "[javascript]": {
            "editor.defaultFormatter": "esbenp.prettier-vscode"
        },
        "[javascriptreact]": {
            "editor.defaultFormatter": "esbenp.prettier-vscode"
        },
        "[json]": {
            "editor.defaultFormatter": "esbenp.prettier-vscode"
        },
        "eslint.validate": [
            "javascript",
            "javascriptreact",
            "typescript",
            "typescriptreact"
        ]
    }
    ```
    This ensures that your code is automatically formatted by Prettier and validated by ESLint when you save a file.

## 8. Troubleshooting

- **Environment Variable Issues**: If the application fails to start due to environment variable errors, double-check your `.env` file for typos and ensure all required variables are present and correctly formatted. Consult `src/lib/env.ts` for the schema.
- **Database Connection Errors**: Verify that your PostgreSQL server is running, accessible, and that the credentials in `DATABASE_URL` are correct. Ensure the specified database exists and the user has the necessary permissions.
- **Husky Hook Failures**: If pre-commit hooks fail, review the error messages. They typically indicate linting or formatting issues that need to be resolved.

## 9. Next Steps

With your development environment set up, you're ready to start developing!
Refer to the `DOCUMENTATION.md` file for a deeper understanding of the project's architecture, core features, best practices for adding new features, and project rules.

Happy coding!
