# Users and Communities Creation Script

This script creates users in a specific organization and then creates private communities with assigned users.

## Overview

The script performs the following operations:

1. **Creates Users**: Creates 70+ users in the organization with ID `3C2eDJhYHhIdsv_5PeeRB`
2. **Creates Communities**: Creates 20 private communities
3. **Assigns Users**: Assigns users to their respective communities as members

## Configuration

### Organization ID

- **Target Organization**: `uPRiR4TKD06IkHejPFx8N`
- **Default Password**: `Password@1234` (for all users)

### Communities Created

The script creates the following private communities:

1. **Aasta** (3 members)
2. **AXORY AI** (2 members)
3. **BarkBites** (4 members)
4. **BUDDY BOT** (6 members)
5. **ScrapSaver** (6 members)
6. **FairGig** (5 members)
7. **Foxnut Fusion** (3 members)
8. **Green Wing Rubbers** (5 members)
9. **Happy Age** (6 members)
10. **K V Foods** (4 members)
11. **Krishi Bhoomi AI** (5 members)
12. **LOOP KICKS** (5 members)
13. **MY SUBTRACK** (5 members)
14. **Narrow** (4 members)
15. **Numble.ai** (2 members)
16. **OZY** (6 members)
17. **Planiva** (6 members)
18. **ReSilix** (3 members)
19. **SHEILD** (6 members)
20. **UpStart** (5 members)

## Usage

### Method 1: Using npm script

```bash
pnpm create:users-communities
```

### Method 2: Using shell script

```bash
./scripts/create-users-and-communities.sh
```

### Method 3: Direct execution

```bash
pnpm dlx tsx --env-file .env.local scripts/create-users-and-communities.ts
```

## Prerequisites

1. **Environment Setup**: Ensure `.env.local` file exists with proper database configuration
2. **Database Connection**: Database should be accessible
3. **Organization**: The target organization (`uPRiR4TKD06IkHejPFx8N`) must exist in the database
4. **Email Configuration**: Ensure SMTP settings are configured in `.env.local`:
    ```
    SMTP_HOST=your-smtp-host
    SMTP_PORT=587
    SMTP_USER=your-smtp-username
    SMTP_PASS=your-smtp-password
    DEFAULT_EMAIL_FROM=noreply@yourdomain.com
    NEXT_PUBLIC_APP_URL=https://your-platform-url.com
    ```

## Features

### User Creation

- Creates users with email verification enabled
- Sets default password for all users
- Assigns users to the specified organization
- Handles duplicate users gracefully (skips if already exists)
- Sends welcome emails with login credentials to all new users

### Community Creation

- Creates private communities with `post_creation_min_role = 'member'`
- Generates URL-friendly slugs from community names
- Sets organization ID for all communities
- Handles duplicate communities gracefully

### User Assignment

- Assigns users to communities as members
- Sets membership type as 'member' (not follower)
- Sets status as 'active'
- Handles duplicate memberships gracefully

## Output

The script provides detailed console output showing:

- ✅ Organization verification
- 👤 User creation progress
- 📧 Email sending progress
- 🏘️ Community creation progress
- 👥 User assignment to communities
- 📊 Summary statistics

## Error Handling

- **Duplicate Users**: Script skips existing users and continues
- **Duplicate Communities**: Script skips existing communities and continues
- **Duplicate Memberships**: Script skips existing memberships
- **Missing Organization**: Script exits with error if organization not found
- **Database Errors**: Script catches and reports database errors
- **Email Errors**: Script continues even if email sending fails

## Security Notes

- All users are created with the same default password (`Password@1234`)
- Users should change their password after first login
- Email verification is enabled by default
- All communities are created as private
- Welcome emails are sent with TiE branding and platform access link

## Customization

To modify the script:

1. **Change Organization ID**: Update `ORG_ID` constant in the script
2. **Change Default Password**: Update `DEFAULT_PASSWORD` constant
3. **Add/Remove Users**: Modify the `userData` object
4. **Add/Remove Communities**: Modify the `communityData` object
5. **Change User Roles**: Modify the `addUserToCommunity` function calls
6. **Modify Email Template**: Update the `createWelcomeEmail` function
7. **Change Platform URL**: Update `NEXT_PUBLIC_APP_URL` environment variable

## Troubleshooting

### Common Issues

1. **Organization not found**
    - Ensure the organization ID exists in the database
    - Check the organization ID in the script

2. **Database connection errors**
    - Verify `.env.local` configuration
    - Check database accessibility

3. **Permission errors**
    - Ensure database user has proper permissions
    - Check if tables exist and are accessible

4. **Email sending errors**
    - Verify SMTP configuration in `.env.local`
    - Check `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` environment variables
    - Ensure `DEFAULT_EMAIL_FROM` is set correctly

### Logs

The script provides detailed logging for troubleshooting:

- User creation status
- Email sending status
- Community creation status
- Membership assignment status
- Error messages with context

## Post-Execution

After running the script:

1. **Verify Users**: Check that all users were created successfully
2. **Verify Communities**: Check that all communities were created
3. **Verify Memberships**: Check that users are properly assigned to communities
4. **Check Emails**: Verify that welcome emails were sent to users
5. **Test Login**: Try logging in with some users using the default password
6. **Change Passwords**: Encourage users to change their passwords

## Data Structure

### User Data Format

```typescript
{
  "User Name": "user@email.com",
  // ... more users
}
```

### Community Data Format

```typescript
{
  "Community Name": [
    { "name": "User Name", "email": "user@email.com" },
    // ... more members
  ]
}
```
