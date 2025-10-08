export interface User {
    id: string;
    name: string;
    email: string;
    image?: string | null;
}

export interface CommunityMember {
    userId: string;
    communityId: number;
    role: string;
    membershipType: 'member';
    status: string;
    joinedAt: string | Date;
    updatedAt: string | Date;
    user?: User;
}

export interface Community {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    type: string;
    rules: string | null;
    banner: string | null;
    avatar: string | null;
    postCreationMinRole: string;
    orgId?: string | null;
    createdBy: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    members?: CommunityMember[];
    posts?: any[];
    creator?: User;
}

export interface OrgMember {
    id: string;
    name: string;
    email: string;
    image?: string | null;
    role?: string;
    status?: string;
    joinedAt?: string | Date;
    updatedAt?: string | Date;
}

export interface CommunityMemberRequest {
    id: number;
    userId: string;
    communityId: number;
    requestType: 'join';
    status: 'pending' | 'approved' | 'rejected';
    message?: string | null;
    requestedAt: string | Date;
    reviewedAt?: string | Date | null;
    reviewedBy?: string | null;
}

export interface CommunityInvite {
    id: number;
    communityId: number;
    email?: string | null;
    code: string;
    role: 'member' | 'moderator';
    createdBy: string;
    createdAt: string | Date;
    expiresAt: string | Date;
    usedAt?: string | Date | null;
    usedBy?: string | null;
}

export interface CommunityAllowedOrg {
    communityId: number;
    orgId: string;
    permissions: 'view' | 'join';
    addedAt: string | Date;
    addedBy: string;
}

export interface Tag {
    id: number;
    name: string;
    description?: string | null;
    color?: string | null;
    communityId: number;
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface Post {
    id: number;
    title: string;
    content: string;
    authorId: string;
    communityId?: number | null;
    orgId?: string | null;
    isDeleted: boolean;
    createdAt: string | Date;
    updatedAt: string | Date;
    author?: User;
    tags?: Tag[];
}
