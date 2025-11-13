'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Globe, MessageSquare, Shield } from 'lucide-react';

interface CommunityTabsProps {
    activeTab: string;
    onTabChange: (value: string) => void;
    canManageCommunityMembers?: boolean;
    pendingRequestsCount?: number;
    children: React.ReactNode;
}

export function CommunityTabs({
    activeTab,
    onTabChange,
    canManageCommunityMembers = false,
    pendingRequestsCount = 0,
    children,
}: CommunityTabsProps) {
    return (
        <Tabs
            defaultValue="posts"
            className="w-full"
            onValueChange={onTabChange}
        >
            <div className="border-border border-b">
                <TabsList className="h-auto w-auto justify-start border-0 bg-transparent p-0">
                    <TabsTrigger
                        value="about"
                        className="data-[state=active]:border-primary flex items-center gap-2 rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                    >
                        <Globe className="h-4 w-4 sm:hidden" />
                        <span className="hidden sm:inline">Overview</span>
                    </TabsTrigger>
                    <TabsTrigger
                        value="posts"
                        className="data-[state=active]:border-primary flex items-center gap-2 rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                    >
                        <MessageSquare className="h-4 w-4 sm:hidden" />
                        <span className="hidden sm:inline">Posts</span>
                    </TabsTrigger>
                    {canManageCommunityMembers && (
                        <TabsTrigger
                            value="manage"
                            className="data-[state=active]:border-primary relative flex items-center gap-2 rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                        >
                            <Shield className="h-4 w-4 sm:hidden" />
                            <span className="hidden sm:inline">Manage</span>
                            {pendingRequestsCount > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                                    {pendingRequestsCount}
                                </span>
                            )}
                        </TabsTrigger>
                    )}
                </TabsList>
            </div>

            <div className="mt-6">{children}</div>
        </Tabs>
    );
}
