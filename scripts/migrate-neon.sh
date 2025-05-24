#!/bin/bash

# Exit on error
set -e

echo "🚀 Applying schema migrations to Neon database..."

# Check if DATABASE_URL is set and contains 'neon'
if [[ -z "${DATABASE_URL}" || ! "${DATABASE_URL}" =~ neon ]]; then
  echo "❌ Error: DATABASE_URL environment variable must be set to your Neon database URL"
  echo "Example: export DATABASE_URL=postgresql://user:password@ep-something.us-east-2.aws.neon.tech/neondb?sslmode=require"
  exit 1
fi

# Run the schema push
echo "🔄 Pushing schema to Neon..."
npx drizzle-kit push

echo "✅ Schema migrations applied successfully!" 