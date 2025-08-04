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

interface CreateTagDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    communityId: number;
}

export function CreateTagDialog({
    open,
    onOpenChange,
    communityId,
}: CreateTagDialogProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    const utils = trpc.useUtils();
    const createTagMutation = trpc.communities.createTag.useMutation({
        onSuccess: () => {
            utils.communities.invalidate();
            setName('');
            setDescription('');
            onOpenChange(false);
        },
    });

    const handleSubmit = async () => {
        if (!name.trim()) return;

        createTagMutation.mutate({
            communityId,
            name: name.trim(),
            description: description.trim(),
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create Tag</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <Input
                        placeholder="Tag name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                    <Input
                        placeholder="Description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </div>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!name.trim() || createTagMutation.isPending}
                    >
                        {createTagMutation.isPending ? 'Creating...' : 'Create'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
