import { router } from '../trpc';
import {
    posts,
    comments,
    users,
    communities,
    tags,
    attachments,
} from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { savedProcedures } from './community-saved';
import { reactionProcedures } from './community-reactions';
import { commentProcedures } from './community-comments';
import { inviteProcedures } from './community-invites';
import { postProcedures } from './community-posts';
import { queryProcedures } from './community-queries';
import { managementProcedures } from './community-management';
import { statsProcedures } from './community-stats';
import { pollProcedures } from './community-polls';
import _ from 'lodash';

// Helper function to check if user is SuperAdmin
function isSuperAdmin(session: any): boolean {
    return session?.user?.appRole === 'admin';
}

// Reusable helper to fetch community IDs for an organization
async function getCommunityIdsForOrg(orgId: string): Promise<number[]> {
    const orgCommunities = await db.query.communities.findMany({
        where: eq(communities.orgId, orgId),
        columns: { id: true },
    });
    return orgCommunities.map((community) => community.id);
}

// Define types for the responses based on schema
type UserType = typeof users.$inferSelect;
type PostType = typeof posts.$inferSelect;
type CommentType = typeof comments.$inferSelect;

type UserWithOrg = UserType & {
    organization?: {
        id: string;
        name: string;
    };
};

type PostWithAuthor = PostType & {
    author: UserWithOrg | null;
};

type CommentWithAuthor = CommentType & {
    author: UserType | null;
    replies?: CommentWithAuthor[]; // Add replies array for nesting
};

type PostWithAuthorAndComments = PostType & {
    author: UserType | null;
    comments: CommentWithAuthor[];
    community?: typeof communities.$inferSelect | null;
    tags: (typeof tags.$inferSelect)[];
    attachments: (typeof attachments.$inferSelect)[];
};

type PostWithSource = PostWithAuthor & {
    source: {
        type: string;
        orgId?: string;
        communityId?: number;
        reason: string;
    };
    community?: typeof communities.$inferSelect | null;
    comments?: CommentType[];
};

export const communityRouter = router({
    // Post management procedures
    createPost: postProcedures.createPost,
    editPost: postProcedures.editPost,
    deletePost: postProcedures.deletePost,

    // Query procedures
    getPosts: queryProcedures.getPosts,
    getRelevantPosts: queryProcedures.getRelevantPosts,
    getAllRelevantPosts: queryProcedures.getAllRelevantPosts,
    getMemberCommunityPosts: queryProcedures.getMemberCommunityPosts,
    getForMePosts: queryProcedures.getForMePosts,
    getPost: queryProcedures.getPost,

    // Comment procedures
    createComment: commentProcedures.createComment,
    updateComment: commentProcedures.updateComment,
    deleteComment: commentProcedures.deleteComment,

    // Community management procedures
    create: managementProcedures.create,
    updateCommunity: managementProcedures.updateCommunity,
    getAdmins: managementProcedures.getAdmins,

    // Invite procedures
    createInviteLink: inviteProcedures.createInviteLink,
    getInviteInfo: inviteProcedures.getInviteInfo,
    joinViaInvite: inviteProcedures.joinViaInvite,

    // Stats and search procedures
    getStats: statsProcedures.getStats,
    searchRelevantPost: statsProcedures.searchRelevantPost,
    inviteUsersByEmail: statsProcedures.inviteUsersByEmail,

    // Reaction procedures
    likePost: reactionProcedures.likePost,
    unlikePost: reactionProcedures.unlikePost,
    getUserReactions: reactionProcedures.getUserReactions,
    getPostLikeCounts: reactionProcedures.getPostLikeCounts,

    // Saved post procedures
    savePost: savedProcedures.savePost,
    unsavePost: savedProcedures.unsavePost,
    getSavedPosts: savedProcedures.getSavedPosts,
    getUserSavedMap: savedProcedures.getUserSavedMap,

    // Comment helpful vote procedures
    getCommentHelpfulCounts: commentProcedures.getCommentHelpfulCounts,
    getUserHelpfulVotes: commentProcedures.getUserHelpfulVotes,
    toggleCommentHelpful: commentProcedures.toggleCommentHelpful,

    // Poll procedures
    createPoll: pollProcedures.createPoll,
    votePoll: pollProcedures.votePoll,
    getPollResults: pollProcedures.getPollResults,
    closePoll: pollProcedures.closePoll,
});
