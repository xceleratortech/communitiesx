'use client';

import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, MoreHorizontal, Calendar } from 'lucide-react';
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
import { CreateTagDialog } from '@/components/create-tag-dialog';
import { EditTagDialog } from '@/components/edit-tag-dialog';
import { DeleteTagDialog } from '@/components/delete-tag-dialog';
import { useState } from 'react';

interface CommunityTagsProps {
    community: any;
    canCreateTag: boolean;
    canEditTag: boolean;
    canDeleteTag: boolean;
}

export function CommunityTags({
    community,
    canCreateTag,
    canEditTag,
    canDeleteTag,
}: CommunityTagsProps) {
    const [createTagDialogOpen, setCreateTagDialogOpen] = useState(false);
    const [editTagDialogOpen, setEditTagDialogOpen] = useState(false);
    const [deleteTagDialogOpen, setDeleteTagDialogOpen] = useState(false);
    const [selectedTag, setSelectedTag] = useState<any>(null);

    const handleEditTag = (tag: any) => {
        setSelectedTag(tag);
        setEditTagDialogOpen(true);
    };

    const handleDeleteTag = (tag: any) => {
        setSelectedTag(tag);
        setDeleteTagDialogOpen(true);
    };

    return (
        <TabsContent value="tags" className="mt-0 space-y-6">
            {community.tags && community.tags.length > 0 ? (
                <div>
                    <div className="mb-4 flex items-center justify-between">
                        <div className="flex flex-col">
                            <h2 className="text-xl font-semibold">Tags</h2>
                            <p className="text-muted-foreground text-sm">
                                Manage tags for this community
                            </p>
                        </div>
                        {canCreateTag && (
                            <Button
                                variant="outline"
                                onClick={() => setCreateTagDialogOpen(true)}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Create Tag
                            </Button>
                        )}
                    </div>

                    <div className="overflow-hidden rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {community.tags.map((tag: any) => (
                                    <TableRow key={tag.id}>
                                        <TableCell>{tag.name}</TableCell>
                                        <TableCell>{tag.description}</TableCell>
                                        <TableCell className="text-right">
                                            {(canEditTag || canDeleteTag) && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger
                                                        asChild
                                                    >
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                        >
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        {canEditTag && (
                                                            <DropdownMenuItem
                                                                onClick={() =>
                                                                    handleEditTag(
                                                                        tag,
                                                                    )
                                                                }
                                                            >
                                                                <Edit className="mr-2 h-4 w-4" />
                                                                Edit Tag
                                                            </DropdownMenuItem>
                                                        )}
                                                        <DropdownMenuSeparator />
                                                        {canDeleteTag && (
                                                            <DropdownMenuItem
                                                                onClick={() =>
                                                                    handleDeleteTag(
                                                                        tag,
                                                                    )
                                                                }
                                                                className="text-destructive"
                                                            >
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                Delete Tag
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
                </div>
            ) : (
                <div className="py-12 text-center">
                    <Calendar className="text-muted-foreground mx-auto mb-4 h-12 w-12 opacity-50" />
                    <p className="text-muted-foreground">No tags yet.</p>
                    {canCreateTag && (
                        <Button
                            onClick={() => setCreateTagDialogOpen(true)}
                            className="mt-4"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Create Tag
                        </Button>
                    )}
                </div>
            )}

            <CreateTagDialog
                open={createTagDialogOpen}
                onOpenChange={setCreateTagDialogOpen}
                communityId={community.id}
            />

            <EditTagDialog
                open={editTagDialogOpen}
                onOpenChange={setEditTagDialogOpen}
                tag={selectedTag}
            />

            <DeleteTagDialog
                open={deleteTagDialogOpen}
                onOpenChange={setDeleteTagDialogOpen}
                tag={selectedTag}
            />
        </TabsContent>
    );
}
