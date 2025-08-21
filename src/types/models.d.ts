// Shared model types for the app
import type { z } from 'zod';
import type { ResumeProfileSchema } from '../lib/services/resume-parser';

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

// User Profile Types - Derived from Zod schema for single source of truth
export type UserProfileMetadata = z.infer<typeof ResumeProfileSchema>;

export type Experience = NonNullable<
    UserProfileMetadata['experiences']
>[number];
export type Education = NonNullable<UserProfileMetadata['educations']>[number];
export type Certification = NonNullable<
    UserProfileMetadata['certifications']
>[number];
export type Skill = NonNullable<UserProfileMetadata['skills']>[number];
export type Achievement = NonNullable<
    UserProfileMetadata['achievements']
>[number];

// Helper types for profile operations
export type CreateProfileData = Partial<UserProfileMetadata>;
export type UpdateProfileData = Partial<UserProfileMetadata>;
