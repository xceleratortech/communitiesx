# Neon Database Migration Guide

This guide explains how to migrate your local PostgreSQL database to Neon for production deployment.

## Prerequisites

1. A Neon account and project set up
2. Your Neon database connection string
3. Local PostgreSQL database with your development data

## Migration Steps

### 1. Set up your Neon connection

Export your Neon database URL as an environment variable:

```bash
export DATABASE_URL="postgresql://user:password@ep-something.region.aws.neon.tech/neondb?sslmode=require"
```

### 2. Apply Schema Migrations

First, apply the schema migrations to create the necessary tables in your Neon database:

```bash
./scripts/migrate-neon.sh
```

This script uses Drizzle to push your schema definitions to the Neon database.

### 3. Seed the Database

After the schema is created, seed the database with data:

```bash
./scripts/seed-neon.sh
```

This script will:

1. Clear any existing data in the database
2. Insert organizations, users, accounts, sessions, posts, comments, and reactions from the backup

## Troubleshooting

### Connection Issues

If you encounter connection issues with Neon:

1. Verify your DATABASE_URL is correct
2. Ensure your IP is allowed in Neon's IP access controls
3. Check that SSL/TLS is properly configured (Neon requires SSL)
4. Try updating your system's CA certificates:
    ```bash
    sudo update-ca-certificates
    ```

### Schema Conflicts

If you encounter schema conflicts:

1. You may need to drop the existing tables first
2. Ensure your local schema matches what you're trying to deploy

## Additional Resources

- [Neon Documentation](https://neon.tech/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)
