// Shared model types for the app

export interface Community {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    type: string;
    rules: string | null;
    banner: string | null;
    avatar: string | null;
    postCreationMinRole: 'member' | 'moderator' | 'admin'; // Minimum role required to create posts
    orgId?: string | null; // Optional for org-independent communities
    createdBy: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    members?: Array<OrgMember>;
    posts?: any[];
    creator?: {
        id: string;
        name: string;
        email: string;
    };
}

export interface Org {
    id: string;
    name: string;
    slug: string;
    createdAt: string | Date;
    allowCrossOrgDM: boolean;
}

export interface OrgMember {
    userId: string;
    orgId: string;
    role: 'admin' | 'moderator' | 'user';
    status: 'active' | 'pending';
    joinedAt: string | Date;
    updatedAt: string | Date;
}

export interface CommunityAllowedOrg {
    communityId: number;
    orgId: string;
    permissions: 'view' | 'join';
    addedAt: string | Date;
    addedBy: string;
}
