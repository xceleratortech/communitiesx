'use client';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface CommunityDialogsProps {
    isLeaveCommunityDialogOpen: boolean;
    isRemoveModeratorDialogOpen: boolean;
    isRemoveUserDialogOpen: boolean;
    onLeaveCommunityDialogChange: (open: boolean) => void;
    onRemoveModeratorDialogChange: (open: boolean) => void;
    onRemoveUserDialogChange: (open: boolean) => void;
    onConfirmLeaveCommunity: () => void;
    onConfirmRemoveModerator: () => void;
    onConfirmRemoveUser: () => void;
}

export function CommunityDialogs({
    isLeaveCommunityDialogOpen,
    isRemoveModeratorDialogOpen,
    isRemoveUserDialogOpen,
    onLeaveCommunityDialogChange,
    onRemoveModeratorDialogChange,
    onRemoveUserDialogChange,
    onConfirmLeaveCommunity,
    onConfirmRemoveModerator,
    onConfirmRemoveUser,
}: CommunityDialogsProps) {
    return (
        <>
            {/* Leave Community Alert Dialog */}
            <AlertDialog
                open={isLeaveCommunityDialogOpen}
                onOpenChange={onLeaveCommunityDialogChange}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Leave Community</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to leave this community? You
                            will no longer have access to member-only content.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={onConfirmLeaveCommunity}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Leave Community
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Remove Moderator Alert Dialog */}
            <AlertDialog
                open={isRemoveModeratorDialogOpen}
                onOpenChange={onRemoveModeratorDialogChange}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove Moderator</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove this user's
                            moderator role? They will remain a member of the
                            community but will no longer have moderation
                            privileges.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={onConfirmRemoveModerator}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Remove Moderator
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Remove User Alert Dialog */}
            <AlertDialog
                open={isRemoveUserDialogOpen}
                onOpenChange={onRemoveUserDialogChange}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove User</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove this user from the
                            community? They will lose access to all community
                            content and will need to rejoin to access it again.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={onConfirmRemoveUser}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Remove User
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
