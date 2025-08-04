'use client';

import { useState } from 'react';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { MoreHorizontal, Edit, Trash2, Users } from 'lucide-react';

interface BadgeCardProps {
    badge: {
        id: number;
        name: string;
        description?: string | null;
        icon?: string | null;
        color: string;
        assignments?: Array<{
            user: {
                id: string;
                name: string | null;
                email: string;
            };
        }>;
    };
    onEdit: () => void;
    onDelete: () => void;
    onManageUsers: () => void;
    canEdit?: boolean;
    canDelete?: boolean;
}

export function BadgeCard({
    badge,
    onEdit,
    onDelete,
    onManageUsers,
    canEdit = false,
    canDelete = false,
}: BadgeCardProps) {
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const assignmentCount = badge.assignments?.length || 0;

    return (
        <>
            <Card className="relative">
                <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            {badge.icon && (
                                <div
                                    className="flex h-10 w-10 items-center justify-center rounded-full text-lg font-semibold text-white"
                                    style={{ backgroundColor: badge.color }}
                                >
                                    {badge.icon}
                                </div>
                            )}
                            <div>
                                <CardTitle className="text-lg">
                                    {badge.name}
                                </CardTitle>
                                {badge.description && (
                                    <CardDescription className="mt-1">
                                        {badge.description}
                                    </CardDescription>
                                )}
                            </div>
                        </div>

                        {(canEdit || canDelete) && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    {canEdit && (
                                        <DropdownMenuItem onClick={onEdit}>
                                            <Edit className="mr-2 h-4 w-4" />
                                            Edit Badge
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem onClick={onManageUsers}>
                                        <Users className="mr-2 h-4 w-4" />
                                        Manage Users
                                    </DropdownMenuItem>
                                    {canDelete && (
                                        <DropdownMenuItem
                                            onClick={() =>
                                                setShowDeleteDialog(true)
                                            }
                                            className="text-red-600"
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Delete Badge
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </CardHeader>

                <CardContent>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Badge
                                variant="secondary"
                                style={{
                                    backgroundColor: `${badge.color}20`,
                                    color: badge.color,
                                    borderColor: badge.color,
                                }}
                            >
                                {assignmentCount}{' '}
                                {assignmentCount === 1 ? 'user' : 'users'}
                            </Badge>
                        </div>
                    </div>
                </CardContent>

                <CardFooter className="pt-3">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onManageUsers}
                        className="w-full"
                    >
                        <Users className="mr-2 h-4 w-4" />
                        Manage Users
                    </Button>
                </CardFooter>
            </Card>

            <AlertDialog
                open={showDeleteDialog}
                onOpenChange={setShowDeleteDialog}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Badge</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{badge.name}"? This
                            action cannot be undone and will remove the badge
                            from all users who have it assigned.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={onDelete}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
