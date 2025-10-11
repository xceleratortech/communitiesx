-- SQL script to create a super admin user in Neon database console
-- Run this in your Neon database SQL editor

-- First, let's check if we have any organizations to work with
SELECT id, name, slug FROM orgs LIMIT 5;

-- If no organizations exist, create one first
-- Uncomment the following lines if you need to create an organization:
/*
INSERT INTO orgs (id, name, slug, created_at, allow_cross_org_dm) 
VALUES (
    'org-' || gen_random_uuid()::text,
    'Xcelerator',
    'xcelerator',
    NOW(),
    false
);
*/

-- Now create the super admin user
-- Using the first Xcelerator organization ID

-- Step 1: Create the user record
INSERT INTO users (
    id,
    name,
    email,
    email_verified,
    org_id,
    role,
    app_role,
    created_at,
    updated_at
) VALUES (
    'admin-' || gen_random_uuid()::text,
    'Sujan Admin',
    'sujan@xcelerator.co.in',
    true,
    'org-935fb015-1621-4514-afcf-8cf8c759ec27', -- Xcelerator organization
    'admin',
    'admin',
    NOW(),
    NOW()
) RETURNING id;

-- Step 2: Create the account record with hashed password
-- The password 'password123' needs to be hashed using better-auth's hashPassword function
-- Since we can't run Node.js in the database console, we'll use a bcrypt hash
-- This is the bcrypt hash for 'password123' with salt rounds 12
INSERT INTO accounts (
    id,
    account_id,
    provider_id,
    user_id,
    password,
    created_at,
    updated_at
) VALUES (
    'account-' || gen_random_uuid()::text,
    (SELECT id FROM users WHERE email = 'sujan@xcelerator.co.in'),
    'credential',
    (SELECT id FROM users WHERE email = 'sujan@xcelerator.co.in'),
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8i', -- hash for 'password123'
    NOW(),
    NOW()
);

-- Verify the user was created successfully
SELECT 
    u.id,
    u.name,
    u.email,
    u.role,
    u.app_role,
    u.email_verified,
    o.name as organization_name,
    u.created_at
FROM users u
LEFT JOIN orgs o ON u.org_id = o.id
WHERE u.email = 'sujan@xcelerator.co.in';

-- Verify the account was created
SELECT 
    a.id,
    a.user_id,
    a.provider_id,
    a.account_id,
    a.created_at
FROM accounts a
WHERE a.user_id = (SELECT id FROM users WHERE email = 'sujan@xcelerator.co.in'); 