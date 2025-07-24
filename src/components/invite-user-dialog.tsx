import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { trpc } from '@/providers/trpc-provider';
import { toast } from 'sonner';

export function InviteUserDialog({
    orgs,
    children,
}: {
    orgs: any[];
    children: React.ReactNode;
}) {
    const [open, setOpen] = useState(false);
    const [inviteUser, setInviteUser] = useState({
        email: '',
        role: 'user' as 'admin' | 'user',
        orgId: '',
    });
    const inviteUserMutation = trpc.admin.inviteUser.useMutation({
        onSuccess: () => {
            setOpen(false);
            setInviteUser({ email: '', role: 'user', orgId: '' });
            toast.success('Invitation sent!');
        },
        onError: (err) => {
            toast.error('Failed to send invite', { description: err.message });
        },
    });
    function handleInviteUser(e: React.FormEvent) {
        e.preventDefault();
        inviteUserMutation.mutate(inviteUser);
    }
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Invite User</DialogTitle>
                    <DialogDescription>
                        Send an invitation email to a new user. Fill in the
                        details and click Invite.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleInviteUser} className="space-y-4">
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="invite-email">Email</Label>
                        <Input
                            id="invite-email"
                            type="email"
                            value={inviteUser.email}
                            onChange={(e) =>
                                setInviteUser({
                                    ...inviteUser,
                                    email: e.target.value,
                                })
                            }
                            placeholder="user@example.com"
                            required
                        />
                        <p className="text-muted-foreground mt-1 text-xs">
                            The email address of the user to invite.
                        </p>
                    </div>
                    <div className="flex w-full flex-col gap-2">
                        <Label htmlFor="invite-role">Role</Label>
                        <Select
                            value={inviteUser.role}
                            onValueChange={(value: string) =>
                                setInviteUser({
                                    ...inviteUser,
                                    role: value as 'admin' | 'user',
                                })
                            }
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="user">User</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-muted-foreground mt-1 text-xs">
                            The role for the invited user.
                        </p>
                    </div>
                    <div className="flex w-full flex-col gap-2">
                        <Label htmlFor="invite-org">Organization</Label>
                        <Select
                            value={inviteUser.orgId}
                            onValueChange={(value: string) =>
                                setInviteUser({ ...inviteUser, orgId: value })
                            }
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select organization" />
                            </SelectTrigger>
                            <SelectContent>
                                {orgs?.map((org) => (
                                    <SelectItem key={org.id} value={org.id}>
                                        {org.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-muted-foreground mt-1 text-xs">
                            The organization the user will join.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                            disabled={inviteUserMutation.isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={inviteUserMutation.isPending}
                        >
                            {inviteUserMutation.isPending
                                ? 'Inviting...'
                                : 'Invite User'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
