#!/bin/bash

# Check if backup file is provided
if [ -z "$1" ]; then
  echo "Usage: $0 <backup_file.sql> <neon_db_url>"
  echo "Example: $0 db_backup_20240523_123456.sql postgresql://user:password@ep-cool-rain-123456.us-east-2.aws.neon.tech/neondb"
  exit 1
fi

BACKUP_FILE=$1

# Check if Neon DB URL is provided
if [ -z "$2" ]; then
  echo "Error: Neon database URL is required"
  echo "Usage: $0 <backup_file.sql> <neon_db_url>"
  exit 1
fi

NEON_DB_URL=$2

# Extract database name from URL
DB_NAME=$(echo $NEON_DB_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

echo "Restoring backup to Neon database: $DB_NAME"
echo "This will overwrite existing data. Press Ctrl+C to cancel or Enter to continue..."
read

# Apply the backup to Neon
echo "Applying backup to Neon database..."
psql "$NEON_DB_URL" < $BACKUP_FILE

if [ $? -eq 0 ]; then
  echo "Restore completed successfully!"
else
  echo "Restore failed!"
  exit 1
fi

echo "Done!" 