# Database Migration Scripts

This directory contains scripts to help migrate your local database to Neon DB for production.

## Prerequisites

- PostgreSQL client tools installed (`pg_dump`, `psql`)
- Access to both your local database and Neon DB

## Scripts

### 1. Backup Local Database

```bash
./backup-db.sh
```

This script creates a backup of your local PostgreSQL database. The backup file will be named `db_backup_TIMESTAMP.sql`.

### 2. Apply Schema Migrations to Neon DB

```bash
./migrate-neon.sh <neon_db_url>
```

Example:

```bash
./migrate-neon.sh "postgresql://user:password@ep-cool-rain-123456.us-east-2.aws.neon.tech/neondb"
```

This script applies your Drizzle schema migrations to your Neon database.

### 3. Restore Data to Neon DB

```bash
./restore-to-neon.sh <backup_file.sql> <neon_db_url>
```

Example:

```bash
./restore-to-neon.sh db_backup_20240523_123456.sql "postgresql://user:password@ep-cool-rain-123456.us-east-2.aws.neon.tech/neondb"
```

This script restores your local database backup to your Neon database.

## Migration Process

To migrate your local database to Neon:

1. Create a backup of your local database:

    ```bash
    ./backup-db.sh
    ```

2. Apply schema migrations to your Neon database:

    ```bash
    ./migrate-neon.sh <neon_db_url>
    ```

3. Restore your data to Neon:

    ```bash
    ./restore-to-neon.sh <backup_file.sql> <neon_db_url>
    ```

4. Update your `.env` file to use the Neon database URL for production.

## Notes

- Make sure your Neon database URL includes the correct credentials and database name.
- The restore process will overwrite any existing data in your Neon database.
- Always test the migration process on a staging environment before applying to production.
- Keep your database credentials secure and never commit them to version control.
