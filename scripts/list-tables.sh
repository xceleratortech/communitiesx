#!/bin/bash

# Check if Neon DB URL is provided
if [ -z "$1" ]; then
  echo "Error: Neon database URL is required"
  echo "Usage: $0 <neon_db_url>"
  exit 1
fi

NEON_DB_URL=$1

# Extract database name from URL
DB_NAME=$(echo $NEON_DB_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

echo "Listing tables in Neon database: $DB_NAME"

# List all tables in the database
psql "$NEON_DB_URL" -c "\dt"

echo "Done!" 