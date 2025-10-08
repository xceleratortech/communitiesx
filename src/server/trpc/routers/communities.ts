import { router } from '../trpc';
import { discoveryProcedures } from './communities-discovery';
import { membershipProcedures } from './communities-membership';
import { roleProcedures } from './communities-roles';
import { tagProcedures } from './communities-tags';
import { notificationProcedures } from './communities-notifications';
import { orgMemberProcedures } from './communities-org-members';

export const communitiesRouter = router({
    // Discovery procedures
    search: discoveryProcedures.search,
    getAll: discoveryProcedures.getAll,
    getById: discoveryProcedures.getById,
    getBySlug: discoveryProcedures.getBySlug,

    // Membership procedures
    joinCommunity: membershipProcedures.joinCommunity,
    leaveCommunity: membershipProcedures.leaveCommunity,
    getPendingRequests: membershipProcedures.getPendingRequests,
    approveRequest: membershipProcedures.approveRequest,
    rejectRequest: membershipProcedures.rejectRequest,
    getUserPendingRequests: membershipProcedures.getUserPendingRequests,
    cancelPendingRequest: membershipProcedures.cancelPendingRequest,
    getUserCommunities: membershipProcedures.getUserCommunities,
    getUserPostableCommunities: membershipProcedures.getUserPostableCommunities,
    removeUserFromCommunity: membershipProcedures.removeUserFromCommunity,

    // Role management procedures
    assignModerator: roleProcedures.assignModerator,
    assignAdmin: roleProcedures.assignAdmin,
    removeModerator: roleProcedures.removeModerator,
    removeAdmin: roleProcedures.removeAdmin,

    // Tag management procedures
    createTag: tagProcedures.createTag,
    editTag: tagProcedures.editTag,
    deleteTag: tagProcedures.deleteTag,

    // Notification procedures
    disableCommunityNotifications:
        notificationProcedures.disableCommunityNotifications,
    enableCommunityNotifications:
        notificationProcedures.enableCommunityNotifications,
    getCommunityNotificationStatus:
        notificationProcedures.getCommunityNotificationStatus,

    // Organization member procedures
    getOrgMembersNotInCommunity:
        orgMemberProcedures.getOrgMembersNotInCommunity,
    addOrgMembersToCommunity: orgMemberProcedures.addOrgMembersToCommunity,
});
