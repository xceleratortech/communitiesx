require('dotenv').config();
const { hashPassword } = require('better-auth/crypto');
const { Pool } = require('pg');
const { nanoid } = require('nanoid');

// Database connection - replace with your Neon database URL
const DATABASE_URL = process.env.DATABASE_URL || 'your-neon-database-url-here';

async function createSuperAdmin() {
    const pool = new Pool({
        connectionString: DATABASE_URL,
    });

    try {
        console.log('🔗 Connecting to database...');

        // First, check if user already exists
        const existingUser = await pool.query(
            'SELECT id, email FROM users WHERE email = $1',
            ['sujan@xcelerator.co.in'],
        );

        if (existingUser.rows.length > 0) {
            console.log(
                '❌ User with email sujan@xcelerator.co.in already exists!',
            );
            console.log('User ID:', existingUser.rows[0].id);
            return;
        }

        // Get or create an organization
        let orgId;
        const orgResult = await pool.query(
            'SELECT id, name FROM orgs WHERE name = $1',
            ['Xcelerator'],
        );

        if (orgResult.rows.length === 0) {
            console.log('🏢 No Xcelerator organization found. Creating one...');
            orgId = `org-${nanoid()}`;
            await pool.query(
                'INSERT INTO orgs (id, name, slug, created_at, allow_cross_org_dm) VALUES ($1, $2, $3, $4, $5)',
                [orgId, 'Xcelerator', 'xcelerator', new Date(), false],
            );
            console.log('✅ Created organization:', orgId);
        } else {
            orgId = orgResult.rows[0].id;
            console.log('🏢 Using existing Xcelerator organization:', orgId);
        }

        // Hash the password
        console.log('🔐 Hashing password...');
        const hashedPassword = await hashPassword('password123');
        console.log('✅ Password hashed successfully');

        // Create the user
        const userId = `admin-${nanoid()}`;
        const now = new Date();

        console.log('👤 Creating super admin user...');
        await pool.query(
            `INSERT INTO users (
                id, name, email, email_verified, org_id, role, app_role, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
                userId,
                'Sujan Admin',
                'sujan@xcelerator.co.in',
                true,
                orgId,
                'admin',
                'admin',
                now,
                now,
            ],
        );

        // Create the account with password
        const accountId = `account-${nanoid()}`;
        console.log('🔑 Creating account with password...');
        await pool.query(
            `INSERT INTO accounts (
                id, account_id, provider_id, user_id, password, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [accountId, userId, 'credential', userId, hashedPassword, now, now],
        );

        console.log('✅ Super admin user created successfully!');
        console.log('📧 Email: sujan@xcelerator.co.in');
        console.log('🔑 Password: password123');
        console.log('👤 User ID:', userId);
        console.log('🏢 Organization ID:', orgId);
        console.log('🔐 Account ID:', accountId);

        // Verify the creation
        const verifyUser = await pool.query(
            `SELECT u.id, u.name, u.email, u.role, u.app_role, u.email_verified, o.name as org_name
             FROM users u 
             LEFT JOIN orgs o ON u.org_id = o.id 
             WHERE u.email = $1`,
            ['sujan@xcelerator.co.in'],
        );

        if (verifyUser.rows.length > 0) {
            const user = verifyUser.rows[0];
            console.log('\n📋 User Details:');
            console.log('   Name:', user.name);
            console.log('   Email:', user.email);
            console.log('   Role:', user.role);
            console.log('   App Role:', user.app_role);
            console.log('   Email Verified:', user.email_verified);
            console.log('   Organization:', user.org_name);
        }
    } catch (error) {
        console.error('❌ Error creating super admin:', error);
    } finally {
        await pool.end();
    }
}

// Run the script
if (require.main === module) {
    createSuperAdmin();
}

module.exports = { createSuperAdmin };
