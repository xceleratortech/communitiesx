#!/bin/bash

echo "🚀 Running user and community creation script..."
echo "📋 This will create users in organization: uPRiR4TKD06IkHejPFx8N"
echo "🏘️  And create private communities with assigned users"
echo "📧 Welcome emails will be sent to all new users with their credentials"
echo ""

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "❌ Error: .env.local file not found!"
    echo "Please create .env.local with your database configuration"
    exit 1
fi

# Run the script
pnpm dlx tsx --env-file .env.local scripts/create-users-and-communities.ts

echo ""
echo "✅ Script execution completed!" 