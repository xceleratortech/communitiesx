'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import { trpc } from '@/providers/trpc-provider';
import { toast } from 'sonner';
import { BadgeFormDialog } from '@/components/ui/badge-form-dialog';
import { BadgeCard } from '@/components/ui/badge-card';
import { BadgeAssignmentDialog } from '@/components/ui/badge-assignment-dialog';
import { usePermission } from '@/hooks/use-permission';

interface BadgeManagementProps {
    orgId: string;
}

export function BadgeManagement({ orgId }: BadgeManagementProps) {
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [editingBadge, setEditingBadge] = useState<any>(null);
    const [managingBadge, setManagingBadge] = useState<any>(null);

    const { checkOrgPermission, isAppAdmin } = usePermission();

    // Super admins can perform all badge operations
    const canCreateBadge = isAppAdmin() || checkOrgPermission('create_badge');
    const canEditBadge = isAppAdmin() || checkOrgPermission('edit_badge');
    const canDeleteBadge = isAppAdmin() || checkOrgPermission('delete_badge');
    const canAssignBadge = isAppAdmin() || checkOrgPermission('assign_badge');

    // TRPC Queries
    const {
        data: badges = [],
        isLoading: isLoadingBadges,
        refetch: refetchBadges,
    } = trpc.badges.getBadges.useQuery({ orgId });

    const { data: users = [], isLoading: isLoadingUsers } =
        trpc.badges.getOrgUsers.useQuery({ orgId });

    // TRPC Mutations
    const createBadgeMutation = trpc.badges.createBadge.useMutation({
        onSuccess: () => {
            toast.success('Badge created successfully');
            refetchBadges();
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to create badge');
        },
    });

    const updateBadgeMutation = trpc.badges.updateBadge.useMutation({
        onSuccess: () => {
            toast.success('Badge updated successfully');
            refetchBadges();
            setEditingBadge(null);
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to update badge');
        },
    });

    const deleteBadgeMutation = trpc.badges.deleteBadge.useMutation({
        onSuccess: () => {
            toast.success('Badge deleted successfully');
            refetchBadges();
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to delete badge');
        },
    });

    const assignBadgeMutation = trpc.badges.assignBadge.useMutation({
        onSuccess: () => {
            toast.success('Badge assigned successfully');
            refetchBadges();
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to assign badge');
        },
    });

    const unassignBadgeMutation = trpc.badges.unassignBadge.useMutation({
        onSuccess: () => {
            toast.success('Badge unassigned successfully');
            refetchBadges();
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to unassign badge');
        },
    });

    const handleCreateBadge = async (data: any) => {
        await createBadgeMutation.mutateAsync({
            ...data,
            orgId,
        });
    };

    const handleUpdateBadge = async (data: any) => {
        if (!editingBadge) return;
        await updateBadgeMutation.mutateAsync({
            badgeId: editingBadge.id,
            ...data,
        });
    };

    const handleDeleteBadge = (badgeId: number) => {
        deleteBadgeMutation.mutate({ badgeId });
    };

    const handleAssignBadge = async (data: {
        userId: string;
        note?: string;
    }) => {
        if (!managingBadge) return;
        await assignBadgeMutation.mutateAsync({
            badgeId: managingBadge.id,
            ...data,
        });
    };

    const handleUnassignBadge = async (userId: string) => {
        if (!managingBadge) return;
        await unassignBadgeMutation.mutateAsync({
            badgeId: managingBadge.id,
            userId,
        });
    };

    if (isLoadingBadges) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Badge Management</h2>
                    <p className="text-muted-foreground">
                        Create and manage badges for your organization members.
                    </p>
                </div>
                {canCreateBadge && (
                    <Button onClick={() => setShowCreateDialog(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Badge
                    </Button>
                )}
            </div>

            {/* Badges Grid */}
            {badges.length > 0 ? (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {badges.map((badge: any) => (
                        <BadgeCard
                            key={badge.id}
                            badge={badge}
                            onEdit={() => setEditingBadge(badge)}
                            onDelete={() => handleDeleteBadge(badge.id)}
                            onManageUsers={() => setManagingBadge(badge)}
                            canEdit={canEditBadge}
                            canDelete={canDeleteBadge}
                        />
                    ))}
                </div>
            ) : (
                <div className="py-12 text-center">
                    <div className="mx-auto max-w-md">
                        <h3 className="mb-2 text-lg font-medium text-gray-900">
                            No badges created yet
                        </h3>
                        <p className="mb-6 text-gray-600">
                            Create your first badge to recognize and reward your
                            organization members.
                        </p>
                        {canCreateBadge && (
                            <Button onClick={() => setShowCreateDialog(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                Create Your First Badge
                            </Button>
                        )}
                    </div>
                </div>
            )}

            {/* Create Badge Dialog */}
            <BadgeFormDialog
                open={showCreateDialog}
                onOpenChange={setShowCreateDialog}
                onSubmit={handleCreateBadge}
                isSubmitting={createBadgeMutation.isPending}
            />

            {/* Edit Badge Dialog */}
            <BadgeFormDialog
                open={!!editingBadge}
                onOpenChange={(open) => !open && setEditingBadge(null)}
                badge={editingBadge}
                onSubmit={handleUpdateBadge}
                isSubmitting={updateBadgeMutation.isPending}
            />

            {/* Badge Assignment Dialog */}
            {managingBadge && (
                <BadgeAssignmentDialog
                    open={!!managingBadge}
                    onOpenChange={(open) => !open && setManagingBadge(null)}
                    badge={managingBadge}
                    users={users}
                    onAssign={handleAssignBadge}
                    onUnassign={handleUnassignBadge}
                    isSubmitting={
                        assignBadgeMutation.isPending ||
                        unassignBadgeMutation.isPending
                    }
                />
            )}
        </div>
    );
}
