'use client';

import { Button } from '@/components/ui/button';
import { Plus, ChevronRight } from 'lucide-react';
import { CreateTagDialog } from '@/components/create-tag-dialog';
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import Link from 'next/link';

interface CommunityTagsSidebarProps {
    community: any;
    canCreateTag: boolean;
    canEditTag?: boolean;
    canDeleteTag?: boolean;
}

export function CommunityTagsSidebar({
    community,
    canCreateTag,
}: CommunityTagsSidebarProps) {
    const [createTagDialogOpen, setCreateTagDialogOpen] = useState(false);

    // Use backend-computed post counts per tag when available
    const getTagPostCount = (tag: any) => {
        return typeof tag.postCount === 'number' ? tag.postCount : 0;
    };

    return (
        <Card className="h-fit p-4">
            <h3 className="mb-4 font-semibold">Tags</h3>

            {community.tags && community.tags.length > 0 ? (
                <div className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent max-h-[220px] space-y-0 overflow-y-auto lg:max-h-none">
                    {community.tags.map((tag: any, index: number) => (
                        <Link
                            key={tag.id}
                            href={`/communities/${community.slug}?tag=${tag.id}`}
                            className="block"
                        >
                            <div
                                className={`hover:bg-accent flex items-center justify-between border-b py-3 transition-colors ${index === community.tags.length - 1 ? 'border-b-0' : ''}`}
                            >
                                <div className="flex min-w-0 flex-1 items-center gap-3">
                                    {/* Circular icon with target symbol */}
                                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center">
                                        <div
                                            className="relative h-6 w-6 rounded-full border-2"
                                            style={{
                                                borderColor:
                                                    tag.color || '#e5e7eb',
                                            }}
                                        >
                                            <div
                                                className="absolute top-1/2 left-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                                                style={{
                                                    backgroundColor:
                                                        tag.color || '#9ca3af',
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex min-w-0 flex-1 flex-col">
                                        <span className="truncate text-sm font-medium">
                                            {tag.name}
                                        </span>
                                        <div className="text-muted-foreground flex items-center gap-1 text-xs">
                                            {tag.description && (
                                                <>
                                                    <span className="truncate">
                                                        {tag.description}
                                                    </span>
                                                    <span className="flex-shrink-0">
                                                        | {getTagPostCount(tag)}{' '}
                                                        posts
                                                    </span>
                                                </>
                                            )}
                                            {!tag.description && (
                                                <span>
                                                    {getTagPostCount(tag)} posts
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <ChevronRight className="text-muted-foreground h-4 w-4 flex-shrink-0" />
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <p className="text-muted-foreground py-8 text-center text-sm">
                    No tags yet.
                </p>
            )}

            {canCreateTag && (
                <Button
                    onClick={() => setCreateTagDialogOpen(true)}
                    className="mt-6 w-full"
                    variant="outline"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Tags
                </Button>
            )}

            <CreateTagDialog
                open={createTagDialogOpen}
                onOpenChange={setCreateTagDialogOpen}
                communityId={community.id}
            />
        </Card>
    );
}
