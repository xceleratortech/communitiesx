'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuCheckboxItem,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    ChevronDown,
    ChevronRight,
    Filter,
    X,
    Building,
    Users,
    User,
    Tag,
    Clock,
} from 'lucide-react';
import { DateFilter, type DateFilterState } from './date-filter';

// Types based on your existing code
type UserCommunity = {
    id: number;
    name: string;
    slug: string;
    avatar?: string | null;
    userRole?: 'admin' | 'moderator' | 'member' | 'follower';
};

type PostTag = {
    id: number;
    name: string;
    color?: string;
};

type FilterState = {
    communities: number[];
    tags: number[];
    showOrgOnly: boolean;
    showMyPosts: boolean;
    dateFilter: DateFilterState;
};

interface PostsFilterProps {
    userCommunities: UserCommunity[];
    availableTags: PostTag[];
    onFilterChange: (filters: FilterState) => void;
    onDateFilterChange: (dateFilter: DateFilterState) => void;
    isLoading?: boolean;
}

export function PostsFilter({
    userCommunities,
    availableTags,
    onFilterChange,
    onDateFilterChange,
    isLoading = false,
}: PostsFilterProps) {
    const [filters, setFilters] = useState<FilterState>({
        communities: [],
        tags: [],
        showOrgOnly: false,
        showMyPosts: false,
        dateFilter: { type: 'all' },
    });

    const [isOpen, setIsOpen] = useState(false);

    // Update parent when filters change
    useEffect(() => {
        onFilterChange(filters);
    }, [filters, onFilterChange]);

    const handleCommunityToggle = (communityId: number) => {
        setFilters((prev) => ({
            ...prev,
            communities: prev.communities.includes(communityId)
                ? prev.communities.filter((id) => id !== communityId)
                : [...prev.communities, communityId],
        }));
    };

    const handleTagToggle = (tagId: number) => {
        setFilters((prev) => ({
            ...prev,
            tags: prev.tags.includes(tagId)
                ? prev.tags.filter((id) => id !== tagId)
                : [...prev.tags, tagId],
        }));
    };

    const handleOrgToggle = () => {
        setFilters((prev) => ({
            ...prev,
            showOrgOnly: !prev.showOrgOnly,
            showMyPosts: false, // Clear My Posts when All Posts is selected
        }));
    };

    const handleMyPostsToggle = () => {
        setFilters((prev) => ({
            ...prev,
            showMyPosts: !prev.showMyPosts,
            showOrgOnly: false, // Clear All Posts when My Posts is selected
        }));
    };

    const handleDateFilterChange = (filter: DateFilterState) => {
        setFilters((prev) => ({
            ...prev,
            dateFilter: filter,
        }));
        // Also call the parent's date filter change handler
        onDateFilterChange(filter);
    };

    const clearAllFilters = () => {
        const clearedFilters: FilterState = {
            communities: [],
            tags: [],
            showOrgOnly: false,
            showMyPosts: false,
            dateFilter: { type: 'all' },
        };
        setFilters(clearedFilters);
        // Also call the parent's date filter change handler
        onDateFilterChange(clearedFilters.dateFilter);
    };

    const getActiveFiltersCount = () => {
        return (
            filters.communities.length +
            filters.tags.length +
            (filters.showOrgOnly ? 1 : 0) +
            (filters.showMyPosts ? 1 : 0) +
            (filters.dateFilter.type !== 'all' ? 1 : 0)
        );
    };

    const getSelectedCommunities = () => {
        return userCommunities.filter((community) =>
            filters.communities.includes(community.id),
        );
    };

    const getSelectedTags = () => {
        return availableTags.filter((tag) => filters.tags.includes(tag.id));
    };

    const removeCommunityFilter = (communityId: number) => {
        handleCommunityToggle(communityId);
    };

    const removeTagFilter = (tagId: number) => {
        handleTagToggle(tagId);
    };

    return (
        <div className="space-y-3">
            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="outline"
                            className="h-9 border-dashed bg-transparent"
                            disabled={isLoading}
                        >
                            <Filter className="mr-2 h-4 w-4" />
                            Filters
                            {getActiveFiltersCount() > 0 && (
                                <Badge
                                    variant="secondary"
                                    className="flex h-5 w-5 items-center justify-center"
                                >
                                    {getActiveFiltersCount()}
                                </Badge>
                            )}
                            <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-64" align="end">
                        {/* Organization Filter */}
                        <DropdownMenuItem
                            onClick={handleOrgToggle}
                            className="flex items-center space-x-2 py-2"
                        >
                            <Building className="h-4 w-4" />
                            <span>All Posts</span>
                            {filters.showOrgOnly && (
                                <Badge
                                    variant="secondary"
                                    className="ml-2 text-xs"
                                >
                                    Active
                                </Badge>
                            )}
                        </DropdownMenuItem>

                        {/* My Posts Filter */}
                        <DropdownMenuItem
                            onClick={handleMyPostsToggle}
                            className="flex items-center space-x-2 py-2"
                        >
                            <User className="h-4 w-4" />
                            <span>My Posts</span>
                            {filters.showMyPosts && (
                                <Badge
                                    variant="secondary"
                                    className="ml-2 text-xs"
                                >
                                    Active
                                </Badge>
                            )}
                        </DropdownMenuItem>

                        {/* Communities Filter */}
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="flex w-full items-center justify-between py-2">
                                <div className="flex items-center space-x-2">
                                    <Users className="h-4 w-4" />
                                    <span>Communities</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                    {filters.communities.length > 0 && (
                                        <Badge
                                            variant="secondary"
                                            className="text-xs"
                                        >
                                            {filters.communities.length}
                                        </Badge>
                                    )}
                                    {/* <ChevronRight className="h-4 w-4" /> */}
                                </div>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="w-56">
                                {userCommunities.length > 0 ? (
                                    userCommunities.map((community) => (
                                        <DropdownMenuCheckboxItem
                                            key={community.id}
                                            checked={filters.communities.includes(
                                                community.id,
                                            )}
                                            onCheckedChange={() =>
                                                handleCommunityToggle(
                                                    community.id,
                                                )
                                            }
                                            className="flex items-center space-x-2 py-2"
                                        >
                                            <Avatar className="h-5 w-5">
                                                <AvatarImage
                                                    src={
                                                        community.avatar ||
                                                        undefined
                                                    }
                                                />
                                                <AvatarFallback className="text-xs">
                                                    {community.name
                                                        .substring(0, 2)
                                                        .toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="flex-1 truncate">
                                                {community.name}
                                            </span>
                                        </DropdownMenuCheckboxItem>
                                    ))
                                ) : (
                                    <DropdownMenuItem disabled>
                                        No communities found
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>

                        {/* Tags Filter */}
                        {/* <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="flex w-full items-center justify-between py-2">
                                <div className="flex items-center space-x-2">
                                    <Tag className="h-4 w-4" />
                                    <span>Tags</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                    {filters.tags.length > 0 && (
                                        <Badge
                                            variant="secondary"
                                            className="text-xs"
                                        >
                                            {filters.tags.length}
                                        </Badge>
                                    )}
                                </div>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="max-h-64 w-56 overflow-y-auto">
                                {availableTags.length > 0 ? (
                                    availableTags.map((tag) => (
                                        <DropdownMenuCheckboxItem
                                            key={tag.id}
                                            checked={filters.tags.includes(
                                                tag.id,
                                            )}
                                            onCheckedChange={() =>
                                                handleTagToggle(tag.id)
                                            }
                                            className="flex items-center space-x-2 py-2"
                                        >
                                            <div
                                                className="h-3 w-3 flex-shrink-0 rounded-full"
                                                style={{
                                                    backgroundColor:
                                                        tag.color || '#6b7280',
                                                }}
                                            />
                                            <span className="flex-1">
                                                {tag.name}
                                            </span>
                                        </DropdownMenuCheckboxItem>
                                    ))
                                ) : (
                                    <DropdownMenuItem disabled>
                                        No tags found
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuSubContent>
                        </DropdownMenuSub> */}

                        <DateFilter
                            value={filters.dateFilter}
                            onChange={handleDateFilterChange}
                            disabled={isLoading}
                        />

                        {getActiveFiltersCount() > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearAllFilters}
                                className="h-9 px-2"
                            >
                                <X className="mr-1 h-4 w-4" />
                                Clear all
                            </Button>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Clear all filters button */}
                {getActiveFiltersCount() > 0 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearAllFilters}
                        className="h-9 px-2"
                    >
                        <X className="mr-1 h-4 w-4" />
                        Clear all
                    </Button>
                )}
            </div>

            {/* Active Filters Display */}
            {getActiveFiltersCount() > 0 && (
                <div className="flex flex-wrap gap-2">
                    {filters.showOrgOnly && (
                        <Badge variant="secondary" className="gap-1">
                            <Building className="h-3 w-3" />
                            Organization Only
                            <button
                                onClick={handleOrgToggle}
                                className="ml-1 rounded-full p-0.5 hover:bg-gray-200"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    )}

                    {filters.showMyPosts && (
                        <Badge variant="secondary" className="gap-1">
                            <Users className="h-3 w-3" />
                            My Posts
                            <button
                                onClick={handleMyPostsToggle}
                                className="ml-1 rounded-full p-0.5 hover:bg-gray-200"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    )}

                    {getSelectedCommunities().map((community) => (
                        <Badge
                            key={community.id}
                            variant="secondary"
                            className="gap-1"
                        >
                            <Avatar className="h-3 w-3">
                                <AvatarImage
                                    src={community.avatar || undefined}
                                />
                                <AvatarFallback className="text-xs">
                                    {community.name
                                        .substring(0, 1)
                                        .toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            {community.name}
                            <button
                                onClick={() =>
                                    removeCommunityFilter(community.id)
                                }
                                className="ml-1 rounded-full p-0.5 hover:bg-gray-200"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    ))}

                    {getSelectedTags().map((tag) => (
                        <Badge
                            key={tag.id}
                            variant="secondary"
                            className="gap-1"
                        >
                            <div
                                className="h-2 w-2 rounded-full"
                                style={{
                                    backgroundColor: tag.color || '#6b7280',
                                }}
                            />
                            {tag.name}
                            <button
                                onClick={() => removeTagFilter(tag.id)}
                                className="ml-1 rounded-full p-0.5 hover:bg-gray-200"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    ))}

                    {/* Date Filter Badge */}
                    {filters.dateFilter.type !== 'all' && (
                        <Badge variant="secondary" className="gap-1">
                            <Clock className="h-3 w-3" />
                            {filters.dateFilter.type === 'today' && 'Today'}
                            {filters.dateFilter.type === 'week' && 'Last Week'}
                            {filters.dateFilter.type === 'month' &&
                                'Last Month'}
                            {filters.dateFilter.type === 'custom' &&
                                'Custom Range'}
                            <button
                                onClick={() =>
                                    handleDateFilterChange({ type: 'all' })
                                }
                                className="ml-1 rounded-full p-0.5 hover:bg-gray-200"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    )}
                </div>
            )}
        </div>
    );
}
