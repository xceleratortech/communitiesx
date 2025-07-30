require('dotenv').config();
const { hashPassword } = require('better-auth/crypto');
const { Pool } = require('pg');
const { nanoid } = require('nanoid');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function createRajani() {
    try {
        console.log('🔗 Connecting to database...');

        // Check if user already exists
        const existingUser = await pool.query(
            'SELECT id, email FROM users WHERE email = $1',
            ['rajani@xcelerator.co.in'],
        );

        if (existingUser.rows.length > 0) {
            console.log(
                '❌ User with email rajani@xcelerator.co.in already exists!',
            );
            return;
        }

        // Hash the password
        console.log('🔐 Hashing password...');
        const hashedPassword = await hashPassword('password123');

        // Create the user
        const userId = `user-${nanoid()}`;
        const now = new Date();

        console.log('👤 Creating Rajani user...');
        await pool.query(
            `INSERT INTO users (
                id, name, email, email_verified, org_id, role, app_role, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
                userId,
                'Rajani',
                'rajani@xcelerator.co.in',
                true,
                'Jtvh6bHMDj4pDOEU8gaA0',
                'admin',
                'user',
                now,
                now,
            ],
        );

        // Create the account
        const accountId = `account-${nanoid()}`;
        console.log('🔑 Creating account with password...');
        await pool.query(
            `INSERT INTO accounts (
                id, account_id, provider_id, user_id, password, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [accountId, userId, 'credential', userId, hashedPassword, now, now],
        );

        console.log('✅ Rajani user created successfully!');
        console.log('�� Email: rajani@xcelerator.co.in');
        console.log('�� Password: password123');
        console.log('👤 User ID:', userId);
    } catch (error) {
        console.error('❌ Error creating Rajani:', error);
    } finally {
        await pool.end();
    }
}

createRajani();
