'use client';

import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserProfilePopover } from '@/components/ui/user-profile-popover';
import { UserBadgesInTable } from '@/components/ui/user-badges-in-table';
import { InviteEmailDialog } from '@/components/invite-email-dialog';
import { InviteLinkDialog } from '@/components/invite-link-dialog';
import { InviteUserDialog } from '@/components/invite-user-dialog';
import {
    UserPlus,
    Shield,
    Crown,
    UserMinus,
    MoreHorizontal,
} from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Loader2, Search } from 'lucide-react';

interface CommunityMembersProps {
    community: any;
    canManageCommunityMembers: boolean;
    canManageCommunityAdmins: boolean;
    canRemoveCommunityAdmins: boolean;
    canInviteCommunityMembers: boolean;
    currentMembersPage: number;
    membersPerPage: number;
    onPageChange: (page: number) => void;
    onAssignModerator: (userId: string) => void;
    onAssignAdmin: (userId: string) => void;
    onRemoveAdmin: (userId: string) => void;
    onRemoveModerator: (userId: string) => void;
    onRemoveUserFromCommunity: (userId: string) => void;
    canKickMember: (memberRole: string, memberUserId: string) => boolean;
    shouldDisableActionButton: (
        memberRole: string,
        memberUserId: string,
    ) => boolean;
    availableOrgMembers: any[];
    onAddMembers: (
        users: { userId: string; role: 'member' | 'moderator' }[],
    ) => Promise<void>;
    isAddingMembers: boolean;
}

export function CommunityMembers({
    community,
    canManageCommunityMembers,
    canManageCommunityAdmins,
    canRemoveCommunityAdmins,
    canInviteCommunityMembers,
    currentMembersPage,
    membersPerPage,
    onPageChange,
    onAssignModerator,
    onAssignAdmin,
    onRemoveAdmin,
    onRemoveModerator,
    onRemoveUserFromCommunity,
    canKickMember,
    shouldDisableActionButton,
    availableOrgMembers,
    onAddMembers,
    isAddingMembers,
}: CommunityMembersProps) {
    const [isInviteEmailDialogOpen, setIsInviteEmailDialogOpen] =
        useState(false);
    const [isAddMembersDialogOpen, setIsAddMembersDialogOpen] = useState(false);
    const [selectedUsersToAdd, setSelectedUsersToAdd] = useState<string[]>([]);
    const [selectedRoleToAdd, setSelectedRoleToAdd] = useState<
        'member' | 'moderator'
    >('member');
    const [memberSearchTerm, setMemberSearchTerm] = useState('');

    return (
        <TabsContent value="members" className="mt-0">
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                        <h2 className="text-xl font-semibold">Members</h2>
                        <p className="text-muted-foreground text-sm">
                            People who are part of this community
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {canInviteCommunityMembers && (
                            <Button
                                variant="outline"
                                onClick={() => setIsInviteEmailDialogOpen(true)}
                            >
                                Invite Members
                            </Button>
                        )}
                        {canManageCommunityMembers && (
                            <Dialog
                                open={isAddMembersDialogOpen}
                                onOpenChange={(open) => {
                                    setIsAddMembersDialogOpen(open);
                                    if (!open) {
                                        setMemberSearchTerm('');
                                        setSelectedUsersToAdd([]);
                                    }
                                }}
                            >
                                <DialogTrigger asChild>
                                    <Button variant="outline">
                                        <UserPlus className="mr-2 h-4 w-4" />
                                        Add Members
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>
                                            Add Organization Members
                                        </DialogTitle>
                                        <DialogDescription>
                                            Add existing organization members to
                                            this community.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <form
                                        onSubmit={async (e) => {
                                            e.preventDefault();
                                            if (!selectedUsersToAdd.length)
                                                return;

                                            try {
                                                await onAddMembers(
                                                    selectedUsersToAdd.map(
                                                        (userId) => ({
                                                            userId,
                                                            role: selectedRoleToAdd,
                                                        }),
                                                    ),
                                                );
                                                setIsAddMembersDialogOpen(
                                                    false,
                                                );
                                                setSelectedUsersToAdd([]);
                                                setSelectedRoleToAdd('member');
                                                setMemberSearchTerm('');
                                            } catch (error) {
                                                // Error handled by parent
                                            }
                                        }}
                                        className="space-y-4"
                                    >
                                        <div className="space-y-2">
                                            <Label htmlFor="member-search">
                                                Search Members
                                            </Label>
                                            <div className="relative">
                                                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                                                <Input
                                                    id="member-search"
                                                    placeholder="Search by name or email..."
                                                    value={memberSearchTerm}
                                                    onChange={(e) =>
                                                        setMemberSearchTerm(
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="pl-10"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="user-select">
                                                Select Members
                                            </Label>
                                            {availableOrgMembers &&
                                                availableOrgMembers.length >
                                                    0 && (
                                                    <div className="mb-2 flex gap-2">
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() =>
                                                                setSelectedUsersToAdd(
                                                                    availableOrgMembers.map(
                                                                        (m) =>
                                                                            m.id,
                                                                    ),
                                                                )
                                                            }
                                                        >
                                                            Select All
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() =>
                                                                setSelectedUsersToAdd(
                                                                    [],
                                                                )
                                                            }
                                                        >
                                                            Clear All
                                                        </Button>
                                                    </div>
                                                )}
                                            <div className="max-h-60 space-y-2 overflow-y-auto rounded-md border p-3">
                                                {availableOrgMembers?.length ===
                                                0 ? (
                                                    <div className="text-muted-foreground py-4 text-center">
                                                        {memberSearchTerm
                                                            ? `No members found matching "${memberSearchTerm}"`
                                                            : 'No available members to add'}
                                                    </div>
                                                ) : (
                                                    availableOrgMembers?.map(
                                                        (
                                                            member: (typeof availableOrgMembers)[number],
                                                        ) => (
                                                            <label
                                                                key={member.id}
                                                                className="hover:bg-muted/50 flex cursor-pointer items-center space-x-3 rounded-md p-2"
                                                            >
                                                                <Checkbox
                                                                    checked={selectedUsersToAdd.includes(
                                                                        member.id,
                                                                    )}
                                                                    onCheckedChange={(
                                                                        checked,
                                                                    ) => {
                                                                        if (
                                                                            checked
                                                                        ) {
                                                                            setSelectedUsersToAdd(
                                                                                (
                                                                                    prev,
                                                                                ) => [
                                                                                    ...prev,
                                                                                    member.id,
                                                                                ],
                                                                            );
                                                                        } else {
                                                                            setSelectedUsersToAdd(
                                                                                (
                                                                                    prev,
                                                                                ) =>
                                                                                    prev.filter(
                                                                                        (
                                                                                            id,
                                                                                        ) =>
                                                                                            id !==
                                                                                            member.id,
                                                                                    ),
                                                                            );
                                                                        }
                                                                    }}
                                                                />
                                                                <div className="flex items-center gap-2">
                                                                    <Avatar className="h-6 w-6">
                                                                        <AvatarImage
                                                                            src={
                                                                                member.image ||
                                                                                undefined
                                                                            }
                                                                            alt={
                                                                                member.name ||
                                                                                'User'
                                                                            }
                                                                        />
                                                                        <AvatarFallback>
                                                                            {member.name
                                                                                ? member.name
                                                                                      .substring(
                                                                                          0,
                                                                                          2,
                                                                                      )
                                                                                      .toUpperCase()
                                                                                : 'U'}
                                                                        </AvatarFallback>
                                                                    </Avatar>
                                                                    <span className="text-sm font-medium">
                                                                        {member.name ||
                                                                            'Unknown User'}
                                                                    </span>
                                                                    <span className="text-muted-foreground text-xs">
                                                                        (
                                                                        {member.email ||
                                                                            'No email'}
                                                                        )
                                                                    </span>
                                                                </div>
                                                            </label>
                                                        ),
                                                    )
                                                )}
                                            </div>
                                            {selectedUsersToAdd.length > 0 && (
                                                <p className="text-muted-foreground text-sm">
                                                    Selected{' '}
                                                    {selectedUsersToAdd.length}{' '}
                                                    member(s)
                                                </p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="role-select">
                                                Role
                                            </Label>
                                            <Select
                                                value={selectedRoleToAdd}
                                                onValueChange={(
                                                    value: string,
                                                ) =>
                                                    setSelectedRoleToAdd(
                                                        value as
                                                            | 'member'
                                                            | 'moderator',
                                                    )
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="member">
                                                        Member
                                                    </SelectItem>
                                                    <SelectItem value="moderator">
                                                        Moderator
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <DialogFooter>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() =>
                                                    setIsAddMembersDialogOpen(
                                                        false,
                                                    )
                                                }
                                                disabled={isAddingMembers}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                type="submit"
                                                disabled={
                                                    isAddingMembers ||
                                                    !selectedUsersToAdd.length ||
                                                    availableOrgMembers?.length ===
                                                        0
                                                }
                                            >
                                                {isAddingMembers ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        Adding...
                                                    </>
                                                ) : (
                                                    <>
                                                        <UserPlus className="mr-2 h-4 w-4" />
                                                        Add{' '}
                                                        {selectedUsersToAdd.length >
                                                        1
                                                            ? `${selectedUsersToAdd.length} Members`
                                                            : 'Member'}
                                                    </>
                                                )}
                                            </Button>
                                        </DialogFooter>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        )}
                    </div>
                </div>

                {community.members && community.members.length > 0 ? (
                    <>
                        <div className="overflow-hidden rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-center">
                                            User
                                        </TableHead>
                                        <TableHead className="text-center">
                                            Badges
                                        </TableHead>
                                        <TableHead className="text-center">
                                            Role
                                        </TableHead>
                                        <TableHead className="text-center">
                                            Joined
                                        </TableHead>
                                        <TableHead className="text-center">
                                            Actions
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {community.members
                                        .sort((a: any, b: any) => {
                                            // Sort by role: admins first, then moderators, then members
                                            const roleOrder = {
                                                admin: 0,
                                                moderator: 1,
                                                member: 2,
                                                follower: 3,
                                            };
                                            return (
                                                roleOrder[
                                                    a.role as keyof typeof roleOrder
                                                ] -
                                                roleOrder[
                                                    b.role as keyof typeof roleOrder
                                                ]
                                            );
                                        })
                                        .slice(
                                            (currentMembersPage - 1) *
                                                membersPerPage,
                                            currentMembersPage * membersPerPage,
                                        )
                                        .map((member: any) => (
                                            <TableRow key={member.userId}>
                                                <TableCell className="text-center">
                                                    <div className="flex items-center justify-center gap-3">
                                                        {member.user?.id ? (
                                                            <UserProfilePopover
                                                                userId={
                                                                    member.user
                                                                        .id
                                                                }
                                                            >
                                                                <Avatar className="cursor-pointer">
                                                                    <AvatarImage
                                                                        src={
                                                                            member
                                                                                .user
                                                                                ?.image ||
                                                                            '/placeholder.svg'
                                                                        }
                                                                    />
                                                                    <AvatarFallback>
                                                                        {member.user?.name
                                                                            ?.substring(
                                                                                0,
                                                                                2,
                                                                            )
                                                                            .toUpperCase() ||
                                                                            'U'}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                            </UserProfilePopover>
                                                        ) : (
                                                            <Avatar>
                                                                <AvatarImage
                                                                    src={
                                                                        member
                                                                            .user
                                                                            ?.image ||
                                                                        '/placeholder.svg'
                                                                    }
                                                                />
                                                                <AvatarFallback>
                                                                    {member.user?.name
                                                                        ?.substring(
                                                                            0,
                                                                            2,
                                                                        )
                                                                        .toUpperCase() ||
                                                                        'U'}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                        )}
                                                        <div>
                                                            {member.user?.id ? (
                                                                <UserProfilePopover
                                                                    userId={
                                                                        member
                                                                            .user
                                                                            .id
                                                                    }
                                                                >
                                                                    <p className="cursor-pointer text-sm font-medium hover:underline">
                                                                        {member
                                                                            .user
                                                                            ?.name ||
                                                                            'Unknown User'}
                                                                    </p>
                                                                </UserProfilePopover>
                                                            ) : (
                                                                <p className="text-sm font-medium">
                                                                    {member.user
                                                                        ?.name ||
                                                                        'Unknown User'}
                                                                </p>
                                                            )}
                                                            <p className="text-muted-foreground text-xs">
                                                                {
                                                                    member.user
                                                                        ?.email
                                                                }
                                                            </p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {member.user?.id && (
                                                        <UserBadgesInTable
                                                            userId={
                                                                member.user.id
                                                            }
                                                        />
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge
                                                        variant={
                                                            member.role ===
                                                            'admin'
                                                                ? 'default'
                                                                : member.role ===
                                                                    'moderator'
                                                                  ? 'secondary'
                                                                  : 'outline'
                                                        }
                                                    >
                                                        {member.role === 'admin'
                                                            ? 'Admin'
                                                            : member.role ===
                                                                'moderator'
                                                              ? 'Moderator'
                                                              : 'Member'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {member.joinedAt
                                                        ? new Date(
                                                              member.joinedAt,
                                                          ).toLocaleDateString()
                                                        : '-'}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {canManageCommunityMembers && (
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger
                                                                asChild
                                                            >
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    disabled={shouldDisableActionButton(
                                                                        member.role,
                                                                        member.userId,
                                                                    )}
                                                                    title={
                                                                        shouldDisableActionButton(
                                                                            member.role,
                                                                            member.userId,
                                                                        )
                                                                            ? member.role ===
                                                                                  'admin' ||
                                                                              member.role ===
                                                                                  'super-admin' ||
                                                                              member.role ===
                                                                                  'org-admin'
                                                                                ? 'Moderators cannot manage admin users'
                                                                                : member.role ===
                                                                                    'moderator'
                                                                                  ? 'Moderators cannot manage other moderators'
                                                                                  : 'You cannot manage this user'
                                                                            : 'Manage user'
                                                                    }
                                                                >
                                                                    <MoreHorizontal className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                {member.role ===
                                                                    'member' && (
                                                                    <>
                                                                        <DropdownMenuItem
                                                                            onClick={() =>
                                                                                onAssignModerator(
                                                                                    member.userId,
                                                                                )
                                                                            }
                                                                        >
                                                                            <Shield className="mr-2 h-4 w-4" />
                                                                            Make
                                                                            Moderator
                                                                        </DropdownMenuItem>
                                                                        {canManageCommunityAdmins && (
                                                                            <DropdownMenuItem
                                                                                onClick={() =>
                                                                                    onAssignAdmin(
                                                                                        member.userId,
                                                                                    )
                                                                                }
                                                                            >
                                                                                <Crown className="mr-2 h-4 w-4" />
                                                                                Make
                                                                                Admin
                                                                            </DropdownMenuItem>
                                                                        )}
                                                                    </>
                                                                )}
                                                                {member.role ===
                                                                    'moderator' && (
                                                                    <DropdownMenuItem
                                                                        onClick={() =>
                                                                            onRemoveModerator(
                                                                                member.userId,
                                                                            )
                                                                        }
                                                                    >
                                                                        <UserMinus className="mr-2 h-4 w-4" />
                                                                        Remove
                                                                        Mod
                                                                    </DropdownMenuItem>
                                                                )}
                                                                {member.role ===
                                                                    'admin' &&
                                                                    canRemoveCommunityAdmins && (
                                                                        <DropdownMenuItem
                                                                            onClick={() =>
                                                                                onRemoveAdmin(
                                                                                    member.userId,
                                                                                )
                                                                            }
                                                                        >
                                                                            <UserMinus className="mr-2 h-4 w-4" />
                                                                            Remove
                                                                            Admin
                                                                        </DropdownMenuItem>
                                                                    )}
                                                                <DropdownMenuSeparator />
                                                                {canKickMember(
                                                                    member.role,
                                                                    member.userId,
                                                                ) && (
                                                                    <DropdownMenuItem
                                                                        onClick={() =>
                                                                            onRemoveUserFromCommunity(
                                                                                member.userId,
                                                                            )
                                                                        }
                                                                        className="text-destructive"
                                                                    >
                                                                        <UserMinus className="mr-2 h-4 w-4" />
                                                                        Kick
                                                                        User
                                                                    </DropdownMenuItem>
                                                                )}

                                                                {/* Show disabled message for actions moderators can't perform */}
                                                                {!canKickMember(
                                                                    member.role,
                                                                    member.userId,
                                                                ) &&
                                                                    shouldDisableActionButton(
                                                                        member.role,
                                                                        member.userId,
                                                                    ) && (
                                                                        <DropdownMenuItem
                                                                            disabled
                                                                            className="text-muted-foreground"
                                                                        >
                                                                            {member.role ===
                                                                            'admin'
                                                                                ? 'Moderators cannot manage admin users'
                                                                                : member.role ===
                                                                                    'moderator'
                                                                                  ? 'Moderators cannot manage other moderators'
                                                                                  : 'You cannot manage this user'}
                                                                        </DropdownMenuItem>
                                                                    )}
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Pagination controls */}
                        {community.members.length > membersPerPage && (
                            <div className="mt-6">
                                <div className="text-muted-foreground mb-2 text-center text-sm">
                                    Showing{' '}
                                    {(currentMembersPage - 1) * membersPerPage +
                                        1}{' '}
                                    to{' '}
                                    {Math.min(
                                        currentMembersPage * membersPerPage,
                                        community.members.length,
                                    )}{' '}
                                    of {community.members.length} members
                                </div>
                                <div className="flex justify-center">
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                onPageChange(
                                                    Math.max(
                                                        currentMembersPage - 1,
                                                        1,
                                                    ),
                                                )
                                            }
                                            disabled={currentMembersPage === 1}
                                        >
                                            Previous
                                        </Button>
                                        <div className="flex items-center gap-1">
                                            {(() => {
                                                const totalPages = Math.ceil(
                                                    community.members.length /
                                                        membersPerPage,
                                                );
                                                const pageNumbers = [];
                                                if (totalPages > 0)
                                                    pageNumbers.push(1);
                                                if (currentMembersPage > 3)
                                                    pageNumbers.push(
                                                        'ellipsis1',
                                                    );
                                                for (
                                                    let i = Math.max(
                                                        2,
                                                        currentMembersPage - 1,
                                                    );
                                                    i <=
                                                    Math.min(
                                                        totalPages - 1,
                                                        currentMembersPage + 1,
                                                    );
                                                    i++
                                                ) {
                                                    if (
                                                        i !== 1 &&
                                                        i !== totalPages
                                                    )
                                                        pageNumbers.push(i);
                                                }
                                                if (
                                                    currentMembersPage <
                                                    totalPages - 2
                                                )
                                                    pageNumbers.push(
                                                        'ellipsis2',
                                                    );
                                                if (totalPages > 1)
                                                    pageNumbers.push(
                                                        totalPages,
                                                    );

                                                return pageNumbers.map(
                                                    (page, index) => {
                                                        if (
                                                            page ===
                                                                'ellipsis1' ||
                                                            page === 'ellipsis2'
                                                        ) {
                                                            return (
                                                                <span
                                                                    key={`ellipsis-${index}`}
                                                                    className="px-2"
                                                                >
                                                                    ...
                                                                </span>
                                                            );
                                                        }
                                                        return (
                                                            <Button
                                                                key={`page-${page}`}
                                                                variant={
                                                                    currentMembersPage ===
                                                                    page
                                                                        ? 'default'
                                                                        : 'outline'
                                                                }
                                                                size="sm"
                                                                className="h-8 w-8 p-0"
                                                                onClick={() =>
                                                                    onPageChange(
                                                                        page as number,
                                                                    )
                                                                }
                                                            >
                                                                {page}
                                                            </Button>
                                                        );
                                                    },
                                                );
                                            })()}
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                onPageChange(
                                                    Math.min(
                                                        currentMembersPage + 1,
                                                        Math.ceil(
                                                            community.members
                                                                .length /
                                                                membersPerPage,
                                                        ),
                                                    ),
                                                )
                                            }
                                            disabled={
                                                currentMembersPage ===
                                                Math.ceil(
                                                    community.members.length /
                                                        membersPerPage,
                                                )
                                            }
                                        >
                                            Next
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <p className="text-muted-foreground">No members found.</p>
                )}
            </div>

            <InviteEmailDialog
                open={isInviteEmailDialogOpen}
                onOpenChange={setIsInviteEmailDialogOpen}
                communityId={community.id}
                communityName={community.name}
                isAdmin={canManageCommunityAdmins}
            />
        </TabsContent>
    );
}
