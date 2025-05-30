'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose,
} from '@/components/ui/dialog';
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { trpc } from '@/providers/trpc-provider';
import { Copy } from 'lucide-react';
import type { inferProcedureOutput } from '@trpc/server';
import type { AppRouter } from '@/server/trpc/routers';

interface InviteLinkDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    communityId: number;
    isAdmin: boolean;
}

// Define the type for the createInviteLink procedure output
type CreateInviteLinkOutput = inferProcedureOutput<
    AppRouter['community']['createInviteLink']
>;

export function InviteLinkDialog({
    open,
    onOpenChange,
    communityId,
    isAdmin,
}: InviteLinkDialogProps) {
    const [form, setForm] = useState({
        role: 'member' as 'member' | 'moderator',
        expiresInDays: '7',
    });

    const [generatedLink, setGeneratedLink] = useState<string | null>(null);

    const createInviteLinkMutation =
        trpc.community.createInviteLink.useMutation({
            onSuccess: (data: CreateInviteLinkOutput) => {
                const fullLink = `${window.location.origin}${data.inviteLink}`;
                setGeneratedLink(fullLink);
                toast.success('Invite link created successfully');
            },
            onError: (error) => {
                toast.error(error.message || 'Failed to create invite link');
            },
        });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createInviteLinkMutation.mutate({
            communityId,
            role: form.role,
            expiresInDays: parseInt(form.expiresInDays),
        });
    };

    const handleCopyLink = () => {
        if (generatedLink) {
            navigator.clipboard.writeText(generatedLink);
            toast.success('Link copied to clipboard');
        }
    };

    const handleReset = () => {
        setGeneratedLink(null);
        setForm({
            role: 'member',
            expiresInDays: '7',
        });
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(isOpen) => {
                if (!isOpen) {
                    handleReset();
                }
                onOpenChange(isOpen);
            }}
        >
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Create Invite Link</DialogTitle>
                    <DialogDescription>
                        Generate an invite link to share with others
                    </DialogDescription>
                    <DialogClose className="absolute top-4 right-4" />
                </DialogHeader>

                {generatedLink ? (
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Your invite link</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    value={generatedLink}
                                    readOnly
                                    className="flex-1"
                                />
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={handleCopyLink}
                                    title="Copy to clipboard"
                                >
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                            <p className="text-muted-foreground mt-2 text-sm">
                                Share this link with people you want to invite
                                to the community
                            </p>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={handleReset}>
                                Create Another Link
                            </Button>
                            <Button onClick={() => onOpenChange(false)}>
                                Done
                            </Button>
                        </DialogFooter>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4 py-4">
                        {/* Role selection */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="invite-role" className="text-right">
                                Role
                            </Label>
                            <Select
                                value={form.role}
                                onValueChange={(role) =>
                                    setForm({
                                        ...form,
                                        role: role as 'member' | 'moderator',
                                    })
                                }
                                disabled={!isAdmin}
                            >
                                <SelectTrigger
                                    id="invite-role"
                                    className="col-span-3"
                                >
                                    <SelectValue placeholder="Select a role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="member">
                                        Member
                                    </SelectItem>
                                    {isAdmin && (
                                        <SelectItem value="moderator">
                                            Moderator
                                        </SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                            {!isAdmin && (
                                <p className="text-muted-foreground col-span-4 text-right text-xs">
                                    Only admins can create moderator invites
                                </p>
                            )}
                        </div>

                        {/* Expiration */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="expires-in" className="text-right">
                                Expires in
                            </Label>
                            <Select
                                value={form.expiresInDays}
                                onValueChange={(days) =>
                                    setForm({ ...form, expiresInDays: days })
                                }
                            >
                                <SelectTrigger
                                    id="expires-in"
                                    className="col-span-3"
                                >
                                    <SelectValue placeholder="Select expiration" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">1 day</SelectItem>
                                    <SelectItem value="3">3 days</SelectItem>
                                    <SelectItem value="7">7 days</SelectItem>
                                    <SelectItem value="14">14 days</SelectItem>
                                    <SelectItem value="30">30 days</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <DialogFooter>
                            <Button
                                type="submit"
                                disabled={createInviteLinkMutation.isPending}
                            >
                                {createInviteLinkMutation.isPending
                                    ? 'Creating...'
                                    : 'Create Link'}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
