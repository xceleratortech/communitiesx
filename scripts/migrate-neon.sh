#!/bin/bash

# Check if Neon DB URL is provided
if [ -z "$1" ]; then
  echo "Error: Neon database URL is required"
  echo "Usage: $0 <neon_db_url>"
  echo "Example: $0 postgresql://user:password@ep-cool-rain-123456.us-east-2.aws.neon.tech/neondb"
  exit 1
fi

NEON_DB_URL=$1

# Extract database name from URL
DB_NAME=$(echo $NEON_DB_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

echo "Applying migrations to Neon database: $DB_NAME"
echo "Press Ctrl+C to cancel or Enter to continue..."
read

# Set the DATABASE_URL environment variable temporarily
export DATABASE_URL="$NEON_DB_URL"

# Run Drizzle migrations
echo "Running Drizzle migrations..."
pnpm drizzle-kit push:pg

if [ $? -eq 0 ]; then
  echo "Migrations applied successfully!"
else
  echo "Migration failed!"
  exit 1
fi

echo "Done!" 