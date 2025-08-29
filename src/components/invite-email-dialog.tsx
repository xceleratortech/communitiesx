'use client';

import { useState, useRef, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { trpc } from '@/providers/trpc-provider';
import { Mail, Upload, CheckCircle, Loader2 } from 'lucide-react';
import { inferProcedureOutput } from '@trpc/server';
import { AppRouter } from '@/server/trpc/routers';
import { validatePostCreationMinRole } from '@/lib/utils';

interface InviteEmailDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    communityId: number;
    communityName: string;
    isAdmin: boolean;
}

type InviteEmailOutput = inferProcedureOutput<
    AppRouter['community']['inviteUsersByEmail']
>;

export function InviteEmailDialog({
    open,
    onOpenChange,
    communityId,
    communityName,
    isAdmin,
}: InviteEmailDialogProps) {
    const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');
    const [form, setForm] = useState({
        email: '',
        role: validatePostCreationMinRole('member'),
        senderName: '',
    });

    const [bulkEmails, setBulkEmails] = useState('');
    const [parsedEmails, setParsedEmails] = useState<string[]>([]);
    const [invalidEmails, setInvalidEmails] = useState<string[]>([]);
    const [isPreviewMode, setIsPreviewMode] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const inviteUserMutation = trpc.community.inviteUsersByEmail.useMutation({
        onSuccess: (data) => {
            toast.success(
                `Invitation${form.email ? '' : 's'} sent successfully`,
            );
            handleReset();
            onOpenChange(false);
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to send invitations');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (activeTab === 'single') {
            if (!form.email) {
                toast.error('Please enter an email address');
                return;
            }

            inviteUserMutation.mutate({
                communityId,
                emails: [form.email],
                role: form.role,
                senderName: form.senderName.trim() || undefined,
            });
        } else {
            if (parsedEmails.length === 0) {
                toast.error('Please enter at least one valid email address');
                return;
            }

            inviteUserMutation.mutate({
                communityId,
                emails: parsedEmails,
                role: form.role,
                senderName: form.senderName.trim() || undefined,
            });
        }
    };

    const handleBulkEmailsChange = (value: string) => {
        setBulkEmails(value);

        // Parse and validate emails
        const emails = value
            .split(/[\s,;]+/)
            .map((e) => e.trim())
            .filter((e) => e);

        const valid: string[] = [];
        const invalid: string[] = [];

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        emails.forEach((email) => {
            if (emailRegex.test(email)) {
                valid.push(email);
            } else if (email) {
                invalid.push(email);
            }
        });

        setParsedEmails(valid);
        setInvalidEmails(invalid);
    };

    const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            handleBulkEmailsChange(text);

            // Reset the file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        } catch (error) {
            toast.error('Failed to read the file');
        }
    };

    const handleReset = () => {
        setForm({
            email: '',
            role: 'member',
            senderName: '',
        });
        setBulkEmails('');
        setParsedEmails([]);
        setInvalidEmails([]);
        setIsPreviewMode(false);
        setActiveTab('single');
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
                    <DialogTitle>Invite Members</DialogTitle>
                    <DialogDescription>
                        Send email invitations to join {communityName}
                    </DialogDescription>
                    <DialogClose className="absolute top-4 right-4" />
                </DialogHeader>

                <Tabs
                    value={activeTab}
                    onValueChange={(value) =>
                        setActiveTab(value as 'single' | 'bulk')
                    }
                    className="w-full"
                >
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="single">Single Invite</TabsTrigger>
                        <TabsTrigger value="bulk">Bulk Invite</TabsTrigger>
                    </TabsList>

                    <TabsContent value="single" className="mt-4">
                        <form className="space-y-4">
                            {/* Email */}
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label
                                    htmlFor="invite-email"
                                    className="text-right"
                                >
                                    Email
                                </Label>
                                <Input
                                    id="invite-email"
                                    type="email"
                                    placeholder="user@example.com"
                                    value={form.email}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            email: e.target.value,
                                        })
                                    }
                                    className="col-span-3"
                                />
                            </div>

                            {/* Role selection */}
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label
                                    htmlFor="invite-role"
                                    className="text-right"
                                >
                                    Role
                                </Label>
                                <Select
                                    value={form.role}
                                    onValueChange={(role) =>
                                        setForm({
                                            ...form,
                                            role: role as
                                                | 'member'
                                                | 'moderator'
                                                | 'admin',
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
                                        {isAdmin && (
                                            <SelectItem value="admin">
                                                Admin
                                            </SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>

                            {!isAdmin && (
                                <p className="text-muted-foreground text-center text-xs">
                                    Only admins can invite moderators and admin
                                    users
                                </p>
                            )}

                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label
                                    htmlFor="sender-name"
                                    className="text-right"
                                >
                                    Sender Name
                                </Label>
                                <Input
                                    id="sender-name"
                                    type="text"
                                    placeholder="Optional custom sender name"
                                    value={form.senderName}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            senderName: e.target.value,
                                        })
                                    }
                                    className="col-span-3"
                                />
                            </div>
                            <p className="text-muted-foreground text-center text-xs">
                                Leave empty to use default community name
                            </p>

                            <div className="rounded-md border border-blue-100 bg-blue-50 p-3">
                                <p className="text-sm text-blue-800">
                                    <strong>Note:</strong> Invited users will
                                    need to verify their email address before
                                    they can sign in. If they encounter any
                                    issues, they can use the "Verify Email Now"
                                    button on the login page.
                                </p>
                            </div>
                        </form>
                    </TabsContent>

                    <TabsContent value="bulk" className="mt-4">
                        {isPreviewMode ? (
                            <div className="space-y-4">
                                <div className="mt-4 flex items-center justify-between">
                                    <div>
                                        <span className="text-sm">
                                            {parsedEmails.length} valid email
                                            {parsedEmails.length !== 1
                                                ? 's'
                                                : ''}
                                        </span>
                                        {invalidEmails.length > 0 && (
                                            <span className="text-destructive ml-4 text-sm">
                                                {invalidEmails.length} invalid
                                                email
                                                {invalidEmails.length !== 1
                                                    ? 's'
                                                    : ''}
                                            </span>
                                        )}
                                    </div>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            setIsPreviewMode(!isPreviewMode)
                                        }
                                    >
                                        {isPreviewMode ? 'Hide' : 'Preview'}
                                    </Button>
                                </div>

                                {isPreviewMode && (
                                    <div className="mt-4 max-h-[150px] overflow-y-auto rounded-md border p-2">
                                        {parsedEmails.map((email, i) => (
                                            <div
                                                key={i}
                                                className="flex items-center px-2 py-1 text-sm"
                                            >
                                                <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                                                {email}
                                            </div>
                                        ))}
                                        {invalidEmails.map((email, i) => (
                                            <div
                                                key={i}
                                                className="text-destructive flex items-center px-2 py-1 text-sm"
                                            >
                                                <span className="text-destructive mr-2 h-4 w-4">
                                                    ✗
                                                </span>
                                                {email}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="mt-4 rounded-md border border-blue-100 bg-blue-50 p-3">
                                    <p className="text-sm text-blue-800">
                                        <strong>Note:</strong> Invited users
                                        will need to verify their email address
                                        before they can sign in. If they
                                        encounter any issues, they can use the
                                        "Verify Email Now" button on the login
                                        page.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <Label
                                        htmlFor="bulk-emails"
                                        className="mb-2 block"
                                    >
                                        Enter Emails
                                    </Label>
                                    <Textarea
                                        id="bulk-emails"
                                        placeholder="Enter emails separated by commas, spaces, or new lines"
                                        value={bulkEmails}
                                        onChange={(e) =>
                                            handleBulkEmailsChange(
                                                e.target.value,
                                            )
                                        }
                                        className="min-h-[120px]"
                                    />
                                    <p className="text-muted-foreground mt-1 text-xs">
                                        Enter one email per line, or separate
                                        with commas or spaces
                                    </p>
                                </div>

                                <div>
                                    <Label
                                        htmlFor="csv-upload"
                                        className="mb-2 block"
                                    >
                                        Or Upload CSV File
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            id="csv-upload"
                                            type="file"
                                            accept=".csv,.txt"
                                            onChange={handleFileUpload}
                                            ref={fileInputRef}
                                            className="flex-1"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            onClick={() =>
                                                fileInputRef.current?.click()
                                            }
                                        >
                                            <Upload className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex justify-between">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            if (
                                                parsedEmails.length === 0 &&
                                                bulkEmails.trim() === ''
                                            ) {
                                                toast.error(
                                                    'Please enter at least one email address',
                                                );
                                                return;
                                            }
                                            setIsPreviewMode(true);
                                        }}
                                        disabled={bulkEmails.trim() === ''}
                                    >
                                        Preview ({parsedEmails.length})
                                    </Button>
                                </div>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>

                <DialogFooter>
                    <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={
                            inviteUserMutation.isPending ||
                            (activeTab === 'single' && !form.email) ||
                            (activeTab === 'bulk' && parsedEmails.length === 0)
                        }
                    >
                        {inviteUserMutation.isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Sending...
                            </>
                        ) : (
                            <>
                                <Mail className="mr-2 h-4 w-4" />
                                Send Invite
                                {activeTab === 'bulk' && parsedEmails.length > 1
                                    ? 's'
                                    : ''}
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
