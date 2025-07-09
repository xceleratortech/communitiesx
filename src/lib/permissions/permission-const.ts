import { admin } from 'better-auth/plugins';

export const PERMISSIONS = {
    app: {
        admin: ['*'] as const,
        user: [] as const,
    },
    org: {
        admin: [
            'create_community',
            'edit_community',
            'delete_community',
            'view_community',

            'add_member',
            'remove_member',
            'manage_org_members',
            'manage_community_members',

            'create_post',
            'edit_post',
            'delete_post',
            'view_post',
        ],
        member: [
            'view_community',

            'create_post',
            'edit_post',
            'delete_post',
            'view_post',
        ],
    },
    community: {
        admin: [
            'edit_community',

            'add_member',
            'remove_member',
            'manage_community_members',

            'create_post',
            'edit_post',
            'delete_post',
            'view_post',
        ],
        moderator: [
            'edit_community',

            'add_member',
            'remove_member',
            'manage_community_members',

            'create_post',
            'edit_post',
            'delete_post',
            'view_post',
        ],
        member: [
            'view_community',

            'create_post',
            'edit_post',
            'delete_post',
            'view_post',
        ],
    },
};

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
