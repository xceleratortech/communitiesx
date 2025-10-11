'use client';

import { TabsContent } from '@/components/ui/tabs';

interface CommunityOverviewProps {
    community: any;
}

export function CommunityOverview({ community }: CommunityOverviewProps) {
    return (
        <TabsContent value="about" className="mt-0">
            <div className="space-y-6">
                <div>
                    <h2 className="mb-2 text-xl font-semibold">Overview</h2>
                    <p className="text-muted-foreground">
                        {community.description || 'No description provided.'}
                    </p>
                </div>

                <div>
                    <h3 className="mb-3 font-semibold">Rules</h3>
                    {community.rules ? (
                        <div className="text-sm leading-relaxed whitespace-pre-line">
                            {community.rules}
                        </div>
                    ) : (
                        <p className="text-muted-foreground text-sm">
                            No rules have been set for this community.
                        </p>
                    )}
                </div>
            </div>
        </TabsContent>
    );
}
