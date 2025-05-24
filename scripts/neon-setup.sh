#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting Neon database setup..."

# Load environment variables from .env file
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
  echo "✅ Loaded environment variables from .env file"
else
  echo "❌ .env file not found!"
  exit 1
fi

# Check if DATABASE_URL is set and contains 'neon'
if [[ -z "${DATABASE_URL}" || ! "${DATABASE_URL}" =~ neon ]]; then
  echo "❌ Error: DATABASE_URL environment variable must be set to your Neon database URL in .env file"
  echo "Example: DATABASE_URL=postgresql://user:password@ep-something.us-east-1.aws.neon.tech/neondb?sslmode=require"
  exit 1
fi

# Run schema migrations
echo "⏳ Running schema migrations..."
./scripts/migrate-neon.sh

# Seed the database
echo "⏳ Seeding the database..."
./scripts/seed-neon.sh

echo "✅ Neon database setup complete!" 