'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Plus, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const singleAssignmentFormSchema = z.object({
    userId: z.string().min(1, 'Please select a user'),
    note: z.string().optional(),
});

const bulkAssignmentFormSchema = z.object({
    note: z.string().optional(),
});

type SingleAssignmentFormData = z.infer<typeof singleAssignmentFormSchema>;
type BulkAssignmentFormData = z.infer<typeof bulkAssignmentFormSchema>;

interface User {
    id: string;
    name: string | null;
    email: string;
    image?: string | null;
    badgeAssignments?: Array<{
        badge: {
            id: number;
            name: string;
            color: string;
            icon?: string | null;
        };
    }>;
}

interface BadgeData {
    id: number;
    name: string;
    description?: string | null;
    icon?: string | null;
    color: string;
    assignments?: Array<{
        user: User;
        assignedAt: Date;
        note?: string | null;
        assignedBy: {
            id: string;
            name: string | null;
            email: string;
        };
    }>;
}

interface BadgeAssignmentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    badge: BadgeData;
    users: User[];
    onAssign: (data: SingleAssignmentFormData) => Promise<void>;
    onAssignBulk: (data: { userIds: string[]; note?: string }) => Promise<void>;
    onUnassign: (userId: string) => Promise<void>;
    isSubmitting?: boolean;
}

export function BadgeAssignmentDialog({
    open,
    onOpenChange,
    badge,
    users,
    onAssign,
    onAssignBulk,
    onUnassign,
    isSubmitting = false,
}: BadgeAssignmentDialogProps) {
    const [mode, setMode] = useState<'assign' | 'assignBulk' | 'manage'>(
        'manage',
    );
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

    const singleForm = useForm<SingleAssignmentFormData>({
        resolver: zodResolver(singleAssignmentFormSchema),
        defaultValues: {
            userId: '',
            note: '',
        },
    });

    const bulkForm = useForm<BulkAssignmentFormData>({
        resolver: zodResolver(bulkAssignmentFormSchema),
        defaultValues: {
            note: '',
        },
    });

    const assignedUserIds = new Set(
        badge.assignments?.map((a) => a.user.id) || [],
    );
    const availableUsers = users.filter(
        (user) => !assignedUserIds.has(user.id),
    );

    const handleAssign = async (data: SingleAssignmentFormData) => {
        try {
            await onAssign(data);
            singleForm.reset();
            setMode('manage');
        } catch (error) {
            // Error handling is done in the parent component
        }
    };

    const handleAssignBulk = async (data: BulkAssignmentFormData) => {
        try {
            await onAssignBulk({
                userIds: selectedUserIds,
                note: data.note,
            });
            setSelectedUserIds([]);
            bulkForm.reset();
            setMode('manage');
        } catch (error) {
            // Error handling is done in the parent component
        }
    };

    const handleUnassign = async (userId: string) => {
        try {
            await onUnassign(userId);
        } catch (error) {
            // Error handling is done in the parent component
        }
    };

    const handleUserSelect = (userId: string, checked: boolean) => {
        if (checked) {
            setSelectedUserIds((prev) => [...prev, userId]);
        } else {
            setSelectedUserIds((prev) => prev.filter((id) => id !== userId));
        }
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedUserIds(availableUsers.map((user) => user.id));
        } else {
            setSelectedUserIds([]);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[80vh] sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                        {badge.icon && (
                            <div
                                className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold text-white"
                                style={{ backgroundColor: badge.color }}
                            >
                                {badge.icon}
                            </div>
                        )}
                        Manage "{badge.name}" Badge
                    </DialogTitle>
                    <DialogDescription>
                        Assign or remove this badge from users in your
                        organization.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {mode === 'manage' ? (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-medium">
                                    Assigned Users (
                                    {badge.assignments?.length || 0})
                                </h3>
                                {availableUsers.length > 0 && (
                                    <div className="flex gap-2">
                                        <Button
                                            onClick={() =>
                                                setMode('assignBulk')
                                            }
                                            size="sm"
                                            variant="outline"
                                        >
                                            <Plus className="mr-2 h-4 w-4" />
                                            Assign to Multiple
                                        </Button>
                                        <Button
                                            onClick={() => setMode('assign')}
                                            size="sm"
                                            variant="outline"
                                        >
                                            <Plus className="mr-2 h-4 w-4" />
                                            Assign to One
                                        </Button>
                                    </div>
                                )}
                            </div>

                            <ScrollArea className="h-[300px] w-full">
                                {badge.assignments &&
                                badge.assignments.length > 0 ? (
                                    <div className="space-y-2">
                                        {badge.assignments.map((assignment) => (
                                            <div
                                                key={assignment.user.id}
                                                className="flex items-center justify-between rounded-lg border p-3"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarImage
                                                            src={
                                                                assignment.user
                                                                    .image ||
                                                                undefined
                                                            }
                                                        />
                                                        <AvatarFallback>
                                                            {assignment.user
                                                                .name?.[0] ||
                                                                assignment.user
                                                                    .email[0]}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-medium">
                                                            {assignment.user
                                                                .name ||
                                                                assignment.user
                                                                    .email}
                                                        </p>
                                                        <p className="text-muted-foreground text-sm">
                                                            {
                                                                assignment.user
                                                                    .email
                                                            }
                                                        </p>
                                                        {assignment.note && (
                                                            <p className="text-muted-foreground mt-1 text-xs">
                                                                Note:{' '}
                                                                {
                                                                    assignment.note
                                                                }
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <Button
                                                    onClick={() =>
                                                        handleUnassign(
                                                            assignment.user.id,
                                                        )
                                                    }
                                                    variant="ghost"
                                                    size="sm"
                                                    disabled={isSubmitting}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-8 text-center">
                                        <p className="text-muted-foreground">
                                            No users have this badge assigned
                                            yet.
                                        </p>
                                        {availableUsers.length > 0 && (
                                            <div className="mt-3 flex gap-2">
                                                <Button
                                                    onClick={() =>
                                                        setMode('assignBulk')
                                                    }
                                                    variant="outline"
                                                >
                                                    <Plus className="mr-2 h-4 w-4" />
                                                    Assign to Multiple
                                                </Button>
                                                <Button
                                                    onClick={() =>
                                                        setMode('assign')
                                                    }
                                                    variant="outline"
                                                >
                                                    <Plus className="mr-2 h-4 w-4" />
                                                    Assign to One
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </ScrollArea>
                        </div>
                    ) : mode === 'assignBulk' ? (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-medium">
                                    Assign Badge to Multiple Users
                                </h3>
                                <Button
                                    onClick={() => setMode('manage')}
                                    size="sm"
                                    variant="ghost"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="select-all"
                                            checked={
                                                selectedUserIds.length ===
                                                    availableUsers.length &&
                                                availableUsers.length > 0
                                            }
                                            onCheckedChange={handleSelectAll}
                                        />
                                        <label
                                            htmlFor="select-all"
                                            className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                        >
                                            Select All ({selectedUserIds.length}
                                            /{availableUsers.length})
                                        </label>
                                    </div>
                                </div>

                                <ScrollArea className="h-[300px] w-full">
                                    <div className="space-y-2">
                                        {availableUsers.map((user) => (
                                            <div
                                                key={user.id}
                                                className="flex items-center space-x-3 rounded-lg border p-3"
                                            >
                                                <Checkbox
                                                    id={`user-${user.id}`}
                                                    checked={selectedUserIds.includes(
                                                        user.id,
                                                    )}
                                                    onCheckedChange={(
                                                        checked,
                                                    ) =>
                                                        handleUserSelect(
                                                            user.id,
                                                            checked as boolean,
                                                        )
                                                    }
                                                />
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage
                                                        src={
                                                            user.image ||
                                                            undefined
                                                        }
                                                    />
                                                    <AvatarFallback>
                                                        {user.name?.[0] ||
                                                            user.email[0]}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1">
                                                    <p className="font-medium">
                                                        {user.name ||
                                                            user.email}
                                                    </p>
                                                    <p className="text-muted-foreground text-sm">
                                                        {user.email}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>

                                <Form {...bulkForm}>
                                    <form
                                        onSubmit={bulkForm.handleSubmit(
                                            handleAssignBulk,
                                        )}
                                        className="space-y-4"
                                    >
                                        <FormField
                                            control={bulkForm.control}
                                            name="note"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>
                                                        Note (Optional)
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Textarea
                                                            placeholder="Add a note about why this badge is being assigned..."
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <div className="flex gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() =>
                                                    setMode('manage')
                                                }
                                                disabled={isSubmitting}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                type="submit"
                                                disabled={
                                                    isSubmitting ||
                                                    selectedUserIds.length === 0
                                                }
                                            >
                                                {isSubmitting && (
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                )}
                                                Assign to{' '}
                                                {selectedUserIds.length} User
                                                {selectedUserIds.length !== 1
                                                    ? 's'
                                                    : ''}
                                            </Button>
                                        </div>
                                    </form>
                                </Form>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-medium">
                                    Assign Badge to User
                                </h3>
                                <Button
                                    onClick={() => setMode('manage')}
                                    size="sm"
                                    variant="ghost"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>

                            <Form {...singleForm}>
                                <form
                                    onSubmit={singleForm.handleSubmit(
                                        handleAssign,
                                    )}
                                    className="space-y-4"
                                >
                                    <FormField
                                        control={singleForm.control}
                                        name="userId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    Select User
                                                </FormLabel>
                                                <Select
                                                    onValueChange={
                                                        field.onChange
                                                    }
                                                    defaultValue={field.value}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Choose a user to assign the badge to" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {availableUsers.map(
                                                            (user) => (
                                                                <SelectItem
                                                                    key={
                                                                        user.id
                                                                    }
                                                                    value={
                                                                        user.id
                                                                    }
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        <Avatar className="h-6 w-6">
                                                                            <AvatarImage
                                                                                src={
                                                                                    user.image ||
                                                                                    undefined
                                                                                }
                                                                            />
                                                                            <AvatarFallback className="text-xs">
                                                                                {user
                                                                                    .name?.[0] ||
                                                                                    user
                                                                                        .email[0]}
                                                                            </AvatarFallback>
                                                                        </Avatar>
                                                                        <span>
                                                                            {user.name ||
                                                                                user.email}
                                                                        </span>
                                                                    </div>
                                                                </SelectItem>
                                                            ),
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={singleForm.control}
                                        name="note"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    Note (Optional)
                                                </FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Add a note about why this badge is being assigned..."
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setMode('manage')}
                                            disabled={isSubmitting}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting && (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            )}
                                            Assign Badge
                                        </Button>
                                    </div>
                                </form>
                            </Form>
                        </div>
                    )}
                </div>

                {mode === 'manage' && (
                    <DialogFooter>
                        <Button onClick={() => onOpenChange(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
}
