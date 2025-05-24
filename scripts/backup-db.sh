#!/bin/bash

# Database connection details
DB_NAME="community_dev"
DB_USER="postgres"
DB_PASSWORD="password"
DB_HOST="localhost"
DB_PORT="5433"

# Backup filename with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="db_backup_$TIMESTAMP.sql"

echo "Creating database backup..."
PGPASSWORD="$DB_PASSWORD" pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -F p > $BACKUP_FILE

if [ $? -eq 0 ]; then
  echo "Backup completed successfully: $BACKUP_FILE"
  echo "File size: $(du -h $BACKUP_FILE | cut -f1)"
else
  echo "Backup failed!"
  exit 1
fi

echo "Done!" 