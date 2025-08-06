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

    const isAppAdmin = () =>
        hasPermission('app', data.appRole, '*' as PermissionAction);

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
    ): boolean => {
        // Super admins can perform any community action
        if (isAppAdmin()) return true;

        // Find the user's community membership record (call find only once)
        const record = data.communityRoles.find(
            (c) => c.communityId === communityId,
        );

        // --- ORG ADMIN OVERRIDE LOGIC ---
        // Org admins can perform any community action for communities in their org
        if (data.orgRole === 'admin' && data.userDetails?.orgId && record) {
            // If we have a record and it belongs to the user's org, or if we're org admin
            if (record.orgId === data.userDetails.orgId) {
                // Org admin gets all community admin permissions for their org's communities
                const communityAdminPerms = getAllPermissions('community', [
                    'admin',
                ]);
                const orgPerms = getAllPermissions('org', [data.orgRole]);

                return (
                    communityAdminPerms.includes(action) ||
                    orgPerms.includes(action) ||
                    communityAdminPerms.includes('*') ||
                    orgPerms.includes('*')
                );
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
                return checkCommunityPermission(resourceId, action);

            default:
                return false;
        }
    };

    const getCommunityPermissions = (communityId: string): string[] => {
        if (isAppAdmin()) return ['*'];

        const rec = data.communityRoles.find(
            (c) => c.communityId === communityId,
        );

        // If org admin, check if this community belongs to their org
        if (data.orgRole === 'admin' && data.userDetails?.orgId) {
            // Check if this community belongs to the user's org
            if (rec && rec.orgId === data.userDetails.orgId) {
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
