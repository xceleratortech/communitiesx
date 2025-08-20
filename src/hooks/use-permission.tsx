'use client';

import { useEffect, useState } from 'react';
import { trpc } from '@/providers/trpc-provider';
import {
    getAllPermissions,
    hasPermission,
    PermissionAction,
    PermissionContext,
} from '@/lib/permissions/permission';
import { isOrgAdminForCommunity } from '@/lib/utils';

interface CommunityRoleRecord {
    communityId: string;
    role: string;
    orgId: string | null;
}

interface UserDetails {
    id: string;
    name: string;
    email: string;
    role: string;
    orgId: string | null;
}

interface PermissionData {
    appRole: string | null;
    orgRole: string | null;
    communityRoles: CommunityRoleRecord[];
    userDetails: UserDetails | null;
    isLoading: boolean;
    error: string | null;
}

export function usePermission() {
    const [data, setData] = useState<PermissionData>({
        appRole: null,
        orgRole: null,
        communityRoles: [],
        userDetails: null,
        isLoading: true,
        error: null,
    });

    const {
        data: fetched,
        isLoading,
        error,
    } = trpc.users.getPermissions.useQuery();

    useEffect(() => {
        if (fetched) {
            setData({
                appRole: fetched.appRole ?? null,
                orgRole: fetched.orgRole ?? null,
                communityRoles: fetched.communityRoles ?? [],
                userDetails: fetched.userDetails ?? null,
                isLoading: false,
                error: null,
            });
        }
        if (error) {
            setData((prev) => ({
                ...prev,
                isLoading: false,
                error: error.message,
            }));
        }
    }, [fetched, error]);

    const isAppAdmin = () => data.appRole === 'admin';

    const checkAppPermission = (action: PermissionAction) =>
        isAppAdmin() || hasPermission('app', data.appRole, action);

    const checkOrgPermission = (action: PermissionAction) => {
        // Super admins can perform any org action
        if (isAppAdmin()) return true;

        return hasPermission('org', data.orgRole, action);
    };

    const checkCommunityPermission = (
        communityId: string,
        action: PermissionAction,
        communityOrgId?: string | null, // Add community orgId parameter
    ): boolean => {
        // Super admins can perform any community action
        if (isAppAdmin()) return true;

        // Find the user's community membership record
        const record = data.communityRoles.find(
            (c) => c.communityId === communityId,
        );

        // --- ORG ADMIN OVERRIDE LOGIC ---
        // If user is org admin, grant community admin permissions
        // BUT only if the community belongs to their organization
        if (data.orgRole === 'admin' && data.userDetails?.orgId) {
            // If communityOrgId is provided, check if it matches user's orgId
            if (communityOrgId !== undefined) {
                if (communityOrgId === data.userDetails.orgId) {
                    // Community belongs to org admin's organization - grant community admin permissions
                    const communityAdminPerms = getAllPermissions('community', [
                        'admin',
                    ]);
                    return (
                        communityAdminPerms.includes(action) ||
                        communityAdminPerms.includes('*')
                    );
                }
                // Community doesn't belong to org admin's organization - fall through to regular checks
            } else {
                // No communityOrgId provided - assume org admin has access to their org's communities
                // This maintains backward compatibility but server will validate properly
                const communityAdminPerms = getAllPermissions('community', [
                    'admin',
                ]);
                const hasAdminPermission =
                    communityAdminPerms.includes(action) ||
                    communityAdminPerms.includes('*');

                if (hasAdminPermission) return true;
            }
        }

        // Regular permission check using the found record
        if (record) {
            const communityPerms = getAllPermissions('community', [
                record.role,
            ]);
            const orgPerms = getAllPermissions('org', [data.orgRole]);

            return (
                communityPerms.includes(action) ||
                orgPerms.includes(action) ||
                communityPerms.includes('*') ||
                orgPerms.includes('*')
            );
        }

        return false;
    };

    const checkPermission = (
        context: PermissionContext,
        action: PermissionAction,
        resourceId?: string,
        resourceOrgId?: string | null,
    ): boolean => {
        switch (context) {
            case 'app':
                return checkAppPermission(action);

            case 'org':
                return checkOrgPermission(action);

            case 'community':
                if (!resourceId) return false;
                return checkCommunityPermission(
                    resourceId,
                    action,
                    resourceOrgId,
                );

            default:
                return false;
        }
    };

    const getCommunityPermissions = (
        communityId: string,
        communityOrgId?: string | null,
    ): string[] => {
        if (isAppAdmin()) return ['*'];

        const rec = data.communityRoles.find(
            (c) => c.communityId === communityId,
        );

        // If org admin, grant community admin permissions
        // But only if the community belongs to their organization
        if (data.orgRole === 'admin' && data.userDetails?.orgId) {
            // Only grant permissions if community belongs to org admin's organization
            if (
                communityOrgId !== undefined &&
                communityOrgId !== data.userDetails.orgId
            ) {
                // Community doesn't belong to org admin's organization - skip org admin privileges
            } else {
                const orgPermissions = getAllPermissions('org', [data.orgRole]);
                const communityAdminPermissions = getAllPermissions(
                    'community',
                    ['admin'],
                );
                const memberPermissions = rec
                    ? getAllPermissions('community', [rec.role])
                    : [];

                const allPermissions = new Set([
                    ...orgPermissions,
                    ...communityAdminPermissions,
                    ...memberPermissions,
                ]);

                return [...allPermissions];
            }
        }

        // Regular user - only their explicit permissions
        if (!rec) return [];

        const union = new Set([
            ...getAllPermissions('community', [rec.role]),
            ...getAllPermissions('org', [data.orgRole]),
        ]);
        return [...union];
    };

    return {
        ...data,
        isAppAdmin,
        checkPermission,
        checkAppPermission,
        checkOrgPermission,
        checkCommunityPermission,
        getCommunityRole: (communityId: string) =>
            data.communityRoles.find((c) => c.communityId === communityId)
                ?.role ?? null,
        getCommunityPermissions,
    };
}
