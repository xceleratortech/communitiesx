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

// User Profile Types
export interface UserProfileMetadata {
    // Basic contact information
    phoneNumber?: string;
    location?: string;

    // Professional information
    experiences?: Experience[];
    educations?: Education[];
    certifications?: Certification[];
    skills?: Skill[];
    achievements?: Achievement[];

    // Personal information
    interests?: string[];

    // Professional information
    industries?: string[];

    // Additional fields for future extensibility
    [key: string]: any;
}

export interface Experience {
    id: string;
    title: string;
    company: string;
    location?: string;
    startDate: string; // ISO date string
    endDate?: string; // ISO date string, null for current position
    description?: string;
    isCurrent?: boolean;
}

export interface Education {
    id: string;
    degree: string;
    institution: string;
    fieldOfStudy: string;
    startDate: string; // ISO date string
    endDate?: string; // ISO date string
    gpa?: number;
    description?: string;
}

export interface Certification {
    id: string;
    name: string;
    issuingOrganization: string;
    issueDate: string; // ISO date string
    expiryDate?: string; // ISO date string
    credentialId?: string;
    credentialUrl?: string;
    description?: string;
}

export interface Skill {
    id: string;
    name: string;
    level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    category?: string; // e.g., 'programming', 'design', 'management'
    yearsOfExperience?: number;
}

export interface Achievement {
    id: string;
    title: string;
    description?: string;
    date: string; // ISO date string
    category?: string; // e.g., 'work', 'academic', 'personal'
    evidence?: string; // URL or reference to proof
}

// Helper types for profile operations
export type CreateProfileData = Partial<UserProfileMetadata>;
export type UpdateProfileData = Partial<UserProfileMetadata>;
