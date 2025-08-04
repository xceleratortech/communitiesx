'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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

const assignmentFormSchema = z.object({
    userId: z.string().min(1, 'Please select a user'),
    note: z.string().optional(),
});

type AssignmentFormData = z.infer<typeof assignmentFormSchema>;

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
    onAssign: (data: AssignmentFormData) => Promise<void>;
    onUnassign: (userId: string) => Promise<void>;
    isSubmitting?: boolean;
}

export function BadgeAssignmentDialog({
    open,
    onOpenChange,
    badge,
    users,
    onAssign,
    onUnassign,
    isSubmitting = false,
}: BadgeAssignmentDialogProps) {
    const [mode, setMode] = useState<'assign' | 'manage'>('manage');

    const form = useForm<AssignmentFormData>({
        resolver: zodResolver(assignmentFormSchema),
        defaultValues: {
            userId: '',
            note: '',
        },
    });

    const assignedUserIds = new Set(
        badge.assignments?.map((a) => a.user.id) || [],
    );
    const availableUsers = users.filter(
        (user) => !assignedUserIds.has(user.id),
    );

    const handleAssign = async (data: AssignmentFormData) => {
        try {
            await onAssign(data);
            form.reset();
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
                                    <Button
                                        onClick={() => setMode('assign')}
                                        size="sm"
                                        variant="outline"
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        Assign Badge
                                    </Button>
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
                                            <Button
                                                onClick={() =>
                                                    setMode('assign')
                                                }
                                                variant="outline"
                                                className="mt-3"
                                            >
                                                <Plus className="mr-2 h-4 w-4" />
                                                Assign Badge
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </ScrollArea>
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

                            <Form {...form}>
                                <form
                                    onSubmit={form.handleSubmit(handleAssign)}
                                    className="space-y-4"
                                >
                                    <FormField
                                        control={form.control}
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
                                        control={form.control}
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
