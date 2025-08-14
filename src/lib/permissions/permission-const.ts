import { admin } from 'better-auth/plugins';

export const PERMISSIONS = {
    EDIT_COMMUNITY: 'edit_community',
    DELETE_COMMUNITY: 'delete_community',
    CREATE_COMMUNITY: 'create_community',
    VIEW_COMMUNITY: 'view_community',
    MANAGE_ORG_MEMBERS: 'manage_org_members',
    INVITE_ORG_MEMBERS: 'invite_org_members',

    MANAGE_COMMUNITY_MEMBERS: 'manage_community_members',
    INVITE_COMMUNITY_MEMBERS: 'invite_community_members',
    REMOVE_COMMUNITY_CREATOR: 'remove_community_creator',
    ASSIGN_COMMUNITY_ADMIN: 'assign_community_admin',

    VIEW_ORG: 'view_org',
    UPDATE_ORG: 'update_org',
    DELETE_ORG: 'delete_org',

    CREATE_POST: 'create_post',
    EDIT_POST: 'edit_post',
    DELETE_POST: 'delete_post',
    VIEW_POST: 'view_post',

    CREATE_TAG: 'create_tag',
    EDIT_TAG: 'edit_tag',
    DELETE_TAG: 'delete_tag',
    VIEW_TAG: 'view_tag',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
