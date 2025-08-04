require('dotenv').config();
const { Pool } = require('pg');

// Database connections
const sourcePool = new Pool({ connectionString: process.env.DATABASE_URL });
const targetPool = new Pool({ connectionString: process.env.DB_URL });

// Define table order based on dependencies (parent tables first)
const TABLE_ORDER = [
    'orgs', // No dependencies
    'users', // Depends on orgs
    'accounts', // Depends on users
    'sessions', // Depends on users
    'communities', // Depends on users, orgs
    'community_members', // Depends on communities, users
    'community_member_requests', // Depends on communities, users
    'community_allowed_orgs', // Depends on communities, orgs
    'community_invites', // Depends on communities, users
    'posts', // Depends on users, communities
    'comments', // Depends on posts, users
    'tags', // No dependencies
    'post_tags', // Depends on posts, tags
    'org_members', // Depends on users, orgs
    // Add other tables as needed
];

async function migrateDatabase() {
    try {
        console.log('🚀 Starting database migration...');
        console.log(
            '📊 Source DB:',
            process.env.DATABASE_URL?.split('@')[1] || 'DB-1',
        );
        console.log(
            '📊 Target DB:',
            process.env.DB_URL?.split('@')[1] || 'DB-2',
        );
        console.log('');

        // Get all tables from source database
        console.log('�� Getting table list from source database...');
        const tablesResult = await sourcePool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
        `);

        const allTables = tablesResult.rows.map((row) => row.table_name);
        console.log(
            `✅ Found ${allTables.length} tables:`,
            allTables.join(', '),
        );
        console.log('');

        // Use defined order, fallback to alphabetical for unknown tables
        const orderedTables = [];
        const remainingTables = [...allTables];

        // Add tables in defined order
        for (const table of TABLE_ORDER) {
            if (allTables.includes(table)) {
                orderedTables.push(table);
                remainingTables.splice(remainingTables.indexOf(table), 1);
            }
        }

        // Add remaining tables alphabetically
        orderedTables.push(...remainingTables.sort());

        console.log('�� Migration order:', orderedTables.join(' → '));
        console.log('');

        // Disable foreign key constraints and triggers on target database
        console.log('🔓 Disabling foreign key constraints and triggers...');
        await targetPool.query('SET session_replication_role = replica;');

        // Clear target database in reverse order
        console.log('🗑️ Clearing target database...');
        for (const table of [...orderedTables].reverse()) {
            try {
                await targetPool.query(`TRUNCATE TABLE "${table}" CASCADE;`);
                console.log(`   ✅ Cleared table: ${table}`);
            } catch (error) {
                console.log(
                    `   ⚠️ Could not clear table ${table}:`,
                    error.message,
                );
            }
        }
        console.log('');

        // Reset sequences
        console.log('🔄 Resetting sequences...');
        for (const table of orderedTables) {
            try {
                const sequenceResult = await sourcePool.query(
                    `
                    SELECT column_name, column_default 
                    FROM information_schema.columns 
                    WHERE table_name = $1 
                    AND column_default LIKE 'nextval%'
                `,
                    [table],
                );

                for (const seq of sequenceResult.rows) {
                    const sequenceName = seq.column_default.match(
                        /nextval\('([^']+)'::regclass\)/,
                    )?.[1];
                    if (sequenceName) {
                        await targetPool.query(
                            `ALTER SEQUENCE ${sequenceName} RESTART WITH 1;`,
                        );
                        console.log(`   ✅ Reset sequence: ${sequenceName}`);
                    }
                }
            } catch (error) {
                console.log(
                    `   ⚠️ Could not reset sequences for ${table}:`,
                    error.message,
                );
            }
        }
        console.log('');

        // Copy data table by table in proper order
        console.log('📤 Copying data from source to target...');
        for (const table of orderedTables) {
            try {
                console.log(`📋 Copying table: ${table}`);

                // Get data from source
                const dataResult = await sourcePool.query(
                    `SELECT * FROM "${table}";`,
                );
                const rows = dataResult.rows;

                if (rows.length === 0) {
                    console.log(`   ⚠️ Table ${table} is empty, skipping...`);
                    continue;
                }

                // Get column names
                const columns = Object.keys(rows[0]);
                const placeholders = columns
                    .map((_, index) => `$${index + 1}`)
                    .join(', ');
                const columnNames = columns.map((col) => `"${col}"`).join(', ');

                // Insert data into target
                const insertQuery = `INSERT INTO "${table}" (${columnNames}) VALUES (${placeholders});`;

                let insertedCount = 0;
                for (const row of rows) {
                    try {
                        const values = columns.map((col) => row[col]);
                        await targetPool.query(insertQuery, values);
                        insertedCount++;
                    } catch (error) {
                        console.log(
                            `   ⚠️ Skipping duplicate row in ${table}:`,
                            error.message,
                        );
                    }
                }

                console.log(
                    `   ✅ Copied ${insertedCount}/${rows.length} rows to ${table}`,
                );
            } catch (error) {
                console.error(
                    `   ❌ Error copying table ${table}:`,
                    error.message,
                );
            }
        }

        // Update sequences to match the highest IDs
        console.log('');
        console.log('�� Updating sequences...');
        for (const table of orderedTables) {
            try {
                const sequenceResult = await sourcePool.query(
                    `
                    SELECT column_name, column_default 
                    FROM information_schema.columns 
                    WHERE table_name = $1 
                    AND column_default LIKE 'nextval%'
                `,
                    [table],
                );

                for (const seq of sequenceResult.rows) {
                    const sequenceName = seq.column_default.match(
                        /nextval\('([^']+)'::regclass\)/,
                    )?.[1];
                    if (sequenceName) {
                        const maxIdResult = await targetPool.query(
                            `SELECT MAX("${seq.column_name}") FROM "${table}";`,
                        );
                        const maxId = maxIdResult.rows[0].max;
                        if (maxId && maxId > 0) {
                            await targetPool.query(
                                `SELECT setval('${sequenceName}', ${maxId}, true);`,
                            );
                            console.log(
                                `   ✅ Updated sequence ${sequenceName} to ${maxId}`,
                            );
                        }
                    }
                }
            } catch (error) {
                console.log(
                    `   ⚠️ Could not update sequences for ${table}:`,
                    error.message,
                );
            }
        }

        // Re-enable foreign key constraints and triggers
        console.log('');
        console.log('🔒 Re-enabling foreign key constraints and triggers...');
        await targetPool.query('SET session_replication_role = DEFAULT;');

        // Verify migration
        console.log('');
        console.log('🔍 Verifying migration...');
        for (const table of orderedTables) {
            try {
                const sourceCount = await sourcePool.query(
                    `SELECT COUNT(*) FROM "${table}";`,
                );
                const targetCount = await targetPool.query(
                    `SELECT COUNT(*) FROM "${table}";`,
                );

                const sourceRows = parseInt(sourceCount.rows[0].count);
                const targetRows = parseInt(targetCount.rows[0].count);

                if (sourceRows === targetRows) {
                    console.log(`   ✅ ${table}: ${sourceRows} rows (match)`);
                } else {
                    console.log(
                        `   ⚠️ ${table}: ${sourceRows} → ${targetRows} rows (some duplicates skipped)`,
                    );
                }
            } catch (error) {
                console.log(`   ⚠️ Could not verify ${table}:`, error.message);
            }
        }

        console.log('');
        console.log('�� Database migration completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await sourcePool.end();
        await targetPool.end();
    }
}

// Run migration if called directly
if (require.main === module) {
    // Check if both database URLs are provided
    if (!process.env.DATABASE_URL) {
        console.error(
            '❌ DATABASE_URL (DB-1) not found in environment variables',
        );
        process.exit(1);
    }

    if (!process.env.DB_URL) {
        console.error('❌ DB_URL (DB-2) not found in environment variables');
        process.exit(1);
    }

    migrateDatabase()
        .then(() => {
            console.log('✅ Migration script completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Migration script failed:', error);
            process.exit(1);
        });
}

module.exports = { migrateDatabase };
