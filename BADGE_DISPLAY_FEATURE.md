# Badge Display Feature

## Overview

This feature displays user badges next to their names in the community members table. Badges are created and assigned by organization admins and are visible to all community members.

## Implementation Details

### Components Added

1. **UserBadgesInTable** (`src/components/ui/user-badges-in-table.tsx`)
    - A specialized component for displaying user badges in table format
    - Uses compact display mode to fit within table cells
    - Shows up to 2 badges with tooltips for additional information
    - Includes loading state while fetching badge data

### Database Schema

The feature uses the existing badge system:

- `user_badges` table: Stores badge definitions (name, description, icon, color, org_id)
- `user_badge_assignments` table: Links users to badges with assignment metadata

### API Integration

- Uses the existing `getUserBadges` tRPC procedure from the badges router
- Fetches badges for each user individually to optimize performance
- Includes badge metadata (name, description, icon, color) and assignment info

### UI Changes

1. **Community Members Table** (`src/app/communities/[slug]/page.tsx`)
    - Added "Badges" column between "User" and "Role" columns
    - Displays badges using the `UserBadgesInTable` component
    - Only shows badges for users with valid user IDs

2. **Organization Members Table** (`src/app/organization/[slug]/page.tsx`)
    - Added "Badges" column between "Name" and "Email" columns
    - Displays badges using the `UserBadgesInTable` component
    - Shows badges for all organization members

### Badge Display Features

- **Compact Mode**: Shows badges as small pills with icon and name, optimized for table display
- **Multiple Badge Handling**: Shows first 2 badges, then a dropdown button for additional badges
- **Popover Details**: Click dropdown to see all badges with full details (name, description, notes, assigned by)
- **Tooltip Information**: Hover over individual badges for quick info
- **Color Coding**: Badges use their assigned colors for visual distinction
- **Loading State**: Shows skeleton loader while fetching badge data
- **Empty State**: Shows "N/A" when user has no badges assigned
- **Responsive Design**: Badge pills adapt to available space in table cells
- **Centered Layout**: All table headers and cells are center-aligned for better visual consistency

## Usage

1. **Organization Admins** can create badges in the admin dashboard
2. **Organization Admins** can assign badges to users in their organization
3. **Community Members** can see badges next to user names in the community members tab
4. **Organization Members** can see badges next to user names in the organization members tab
5. **Badges are organization-specific** and only visible within the same organization

## Example Badge Types

- **Mentor**: For experienced community members who help others
- **Contributor**: For active community contributors
- **Moderator**: For community moderators (can be assigned by org admins)
- **Expert**: For subject matter experts in specific areas

## Technical Notes

- Badges are fetched individually per user to avoid performance issues with large member lists
- The component uses React Query for caching and automatic refetching
- Badge assignments are tied to organization membership
- The feature respects existing permission systems

## Multiple Badge Strategy

The system is designed to handle users with multiple badges efficiently:

1. **Table Display**: Shows first 2 badges directly in the table
2. **Dropdown for More**: If user has more than 2 badges, shows a "..." button
3. **Popover Details**: Clicking the dropdown shows all badges with full details
4. **Responsive Design**: Adapts to different screen sizes and badge counts
5. **Performance**: Only fetches badge data when needed, with proper caching

This approach ensures:

- Tables remain readable even with many badges
- Users can still see all badge information when needed
- The interface scales well as organizations assign more badges
- Consistent experience across different badge counts
