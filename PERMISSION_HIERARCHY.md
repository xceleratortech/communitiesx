# Permission Hierarchy and Override System

## Overview

The permission system implements a hierarchical role-based access control (RBAC) system with proper override capabilities. The hierarchy ensures that higher-level administrators can override lower-level permissions within their scope.

## Role Hierarchy (Top to Bottom)

### 1. SuperAdmin (appRole=admin)

- **Scope**: Global (entire application)
- **Permissions**: All permissions (`*`)
- **Override Capability**: Can override any role in any context
- **Database Field**: `users.app_role = 'admin'`

### 2. OrgAdmin (orgRole=admin)

- **Scope**: Organization-wide
- **Permissions**: All org permissions + community admin permissions for their org's communities
- **Override Capability**: Can override CommunityAdmin, CommunityModerator, and CommunityMember for communities in their organization
- **Database Field**: `users.role = 'admin'`

### 3. CommunityAdmin (community role=admin)

- **Scope**: Specific community
- **Permissions**: All community management permissions
- **Override Capability**: Can override CommunityModerator and CommunityMember within their community
- **Database Field**: `community_members.role = 'admin'`

### 4. CommunityModerator (community role=moderator)

- **Scope**: Specific community
- **Permissions**: Limited community management permissions
- **Override Capability**: Can override CommunityMember within their community
- **Database Field**: `community_members.role = 'moderator'`

### 5. CommunityMember (community role=member)

- **Scope**: Specific community
- **Permissions**: Basic community access permissions
- **Override Capability**: None
- **Database Field**: `community_members.role = 'member'`

## Permission Contexts

### App Context (`app`)

- **SuperAdmin**: `['*']` (all permissions)
- **User**: `[]` (no special permissions)

### Organization Context (`org`)

- **Admin**: All org management permissions + community permissions
- **Member**: Basic org viewing permissions

### Community Context (`community`)

- **Admin**: Full community management
- **Moderator**: Limited community management
- **Member**: Basic community access

## Override Logic Implementation

### Client-Side (usePermission hook)

```typescript
const checkCommunityPermission = (
    communityId: string,
    action: PermissionAction,
): boolean => {
    // 1. SuperAdmin override - can do anything
    if (isAppAdmin()) return true;

    // 2. OrgAdmin override - can do community admin actions for their org's communities
    if (data.orgRole === 'admin' && data.userDetails?.orgId) {
        const record = data.communityRoles.find(
            (c) => c.communityId === communityId,
        );
        if (record && record.orgId === data.userDetails.orgId) {
            const communityAdminPerms = getAllPermissions('community', [
                'admin',
            ]);
            const orgPerms = getAllPermissions('org', [data.orgRole]);
            return (
                communityAdminPerms.includes(action) ||
                orgPerms.includes(action)
            );
        }
    }

    // 3. Regular permission check
    const record = data.communityRoles.find(
        (c) => c.communityId === communityId,
    );
    if (record) {
        const communityPerms = getAllPermissions('community', [record.role]);
        const orgPerms = getAllPermissions('org', [data.orgRole]);
        return communityPerms.includes(action) || orgPerms.includes(action);
    }

    return false;
};
```

### Server-Side (ServerPermissions class)

```typescript
async checkCommunityPermission(communityId: string, action: PermissionAction): Promise<boolean> {
    // 1. SuperAdmin override
    if (this.isAppAdmin()) return true;

    // 2. OrgAdmin override
    if (this.permissionData.orgRole === 'admin' && this.permissionData.userDetails?.orgId) {
        const rec = this.permissionData.communityRoles.find(c => c.communityId === communityId);
        if (rec && rec.orgId === this.permissionData.userDetails.orgId) {
            const allowed = new Set<string>([
                ...getAllPermissions('community', ['admin']),
                ...getAllPermissions('org', [this.permissionData.orgRole]),
            ]);
            return allowed.has('*') || allowed.has(action);
        }
    }

    // 3. Regular permission check
    const rec = this.permissionData.communityRoles.find(c => c.communityId === communityId);
    if (rec) {
        const allowed = new Set<string>([
            ...getAllPermissions('community', [rec.role]),
            ...getAllPermissions('org', [this.permissionData.orgRole]),
        ]);
        return allowed.has('*') || allowed.has(action);
    }

    return false;
}
```

## Key Features

### 1. Proper Hierarchy Enforcement

- SuperAdmin > OrgAdmin > CommunityAdmin > CommunityModerator > CommunityMember
- Each level can override permissions of levels below them

### 2. Scope-Based Overrides

- OrgAdmin can only override community permissions for communities in their organization
- CommunityAdmin can only override permissions within their specific community

### 3. Consistent Client/Server Logic

- Both client-side and server-side implement the same override logic
- Server-side includes additional database validation for security

### 4. Permission Inheritance

- Lower roles inherit permissions from higher roles in their context
- OrgAdmin inherits community admin permissions for their org's communities

## Usage Examples

### Checking Permissions

```typescript
// Client-side
const { checkPermission } = usePermission();
const canEditCommunity = checkPermission(
    'community',
    'edit_community',
    communityId,
);

// Server-side
const permissions = await ServerPermissions.fromUserId(userId);
const canEditCommunity = await permissions.checkCommunityPermission(
    communityId,
    'edit_community',
);
```

### Role Override Checks

```typescript
// Check if a role can override another
const canOverride = canOverrideRole('community', userRole, targetRole);

// Get effective role considering hierarchy
const effectiveRole = getEffectiveRole('community', userRole, orgRole);
```

## Security Considerations

1. **Server-Side Validation**: All permission checks are validated server-side
2. **Database Constraints**: Role assignments are constrained by database rules
3. **Audit Trail**: All permission changes should be logged
4. **Scope Isolation**: Users can only override permissions within their scope

## Testing the Hierarchy

To test that the hierarchy is working correctly:

1. **SuperAdmin Test**: SuperAdmin should be able to perform any action
2. **OrgAdmin Test**: OrgAdmin should be able to override CommunityAdmin for their org's communities
3. **CommunityAdmin Test**: CommunityAdmin should be able to override lower roles in their community
4. **Scope Test**: Users should not be able to override permissions outside their scope

## Future Enhancements

1. **Permission Auditing**: Log all permission changes and overrides
2. **Temporary Overrides**: Allow temporary permission overrides with expiration
3. **Permission Delegation**: Allow users to delegate specific permissions
4. **Role Templates**: Predefined role templates for common scenarios
