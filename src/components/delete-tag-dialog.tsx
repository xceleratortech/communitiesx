'use client';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { TabsContent } from '@/components/ui/tabs';
import { useState, useEffect } from 'react';
import { trpc } from '@/providers/trpc-provider';
import { MoreHorizontal, Plus, Calendar, Edit, Trash2 } from 'lucide-react';

interface DeleteTagDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    tag?: { id: number; name: string };
}

export function DeleteTagDialog({
    open,
    onOpenChange,
    tag,
}: DeleteTagDialogProps) {
    const utils = trpc.useUtils();
    const deleteTagMutation = trpc.communities.deleteTag.useMutation({
        onSuccess: () => {
            utils.communities.invalidate();
            onOpenChange(false);
        },
    });

    const handleDelete = async () => {
        if (!tag) return;

        deleteTagMutation.mutate({ tagId: tag.id });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Delete Tag</DialogTitle>
                </DialogHeader>
                <p>
                    Are you sure you want to delete the tag "{tag?.name}"? This
                    action cannot be undone.
                </p>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={deleteTagMutation.isPending}
                    >
                        {deleteTagMutation.isPending ? 'Deleting...' : 'Delete'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
