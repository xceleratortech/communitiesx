#!/bin/bash

# Script to create a super admin user
# Make sure you have your DATABASE_URL environment variable set

echo "🚀 Creating Super Admin User..."
echo "📧 Email: sujan@xcelerator.co.in"
echo "🔑 Password: password123"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL environment variable is not set!"
    echo "Please set your Neon database URL:"
    echo "export DATABASE_URL='your-neon-database-url-here'"
    exit 1
fi

# Run the Node.js script
echo "🔗 Connecting to database..."
node scripts/create-super-admin.js

echo ""
echo "✅ Script completed!" 