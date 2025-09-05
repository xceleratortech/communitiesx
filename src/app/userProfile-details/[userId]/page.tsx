'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { trpc } from '@/providers/trpc-provider';
import { useSession } from '@/server/auth/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Building, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { UserBadgeDisplay } from '@/components/ui/user-badge-display';
import type { UserProfileMetadata } from '@/types/models';
import { ProfileSkeleton } from '@/components/profile';

export default function UserProfilePage() {
    const params = useParams();
    const userId = params.userId as string;
    const { data: session } = useSession();
    const router = useRouter();

    // Get user details
    const { data: userData, isLoading: isLoadingUser } =
        trpc.users.getUserProfile.useQuery({ userId }, { enabled: !!userId });

    // Get user's profile metadata
    const { data: userProfile, isLoading: isLoadingProfile } =
        trpc.profiles.getProfileByUserId.useQuery(
            { userId },
            { enabled: !!userId },
        );

    // Get mutual communities
    const { data: mutualCommunities, isLoading: isLoadingCommunities } =
        trpc.users.getMutualCommunities.useQuery(
            { userId },
            { enabled: !!userId && !!session?.user },
        );

    // Function to get initials from name
    const getInitials = (name: string) => {
        if (!name) return '?';
        return name
            .split(' ')
            .map((part) => part[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    };

    // Handle community click
    const handleCommunityClick = (slug: string) => {
        router.push(`/communities/${slug}`);
    };

    if (isLoadingUser || isLoadingProfile) {
        return (
            <div className="mx-auto max-w-4xl space-y-6 p-4">
                <ProfileSkeleton />
            </div>
        );
    }

    if (!userData) {
        return (
            <div className="mx-auto max-w-4xl space-y-6 p-4">
                <div className="text-center">
                    <h1 className="text-2xl font-bold">User Not Found</h1>
                    <p className="text-muted-foreground mt-2">
                        The user you're looking for doesn't exist or has been
                        removed.
                    </p>
                    <Button
                        onClick={() => router.back()}
                        className="mt-4"
                        variant="outline"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Go Back
                    </Button>
                </div>
            </div>
        );
    }

    // Prepare profile metadata for display
    const profileMetadata: UserProfileMetadata = userProfile?.metadata || {
        phoneNumber: '',
        location: '',
        linkedinUsername: '',
        experiences: [],
        educations: [],
        certifications: [],
        skills: [],
        achievements: [],
        interests: [],
        industries: [],
    };

    return (
        <div className="mx-auto max-w-4xl space-y-4 p-4">
            {/* Header */}
            <div className="mb-6 flex items-center space-x-4">
                <Button
                    onClick={() => router.back()}
                    variant="ghost"
                    size="sm"
                    className="mr-2"
                >
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <Avatar className="h-16 w-16">
                    <AvatarImage src={userData.image || undefined} />
                    <AvatarFallback className="text-lg">
                        {getInitials(userData.name || '')}
                    </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold">{userData.name}</h1>
                    <p className="text-muted-foreground">{userData.email}</p>
                    {userData.orgName && (
                        <div className="text-muted-foreground mt-1 flex items-center text-sm">
                            <Building className="mr-1 h-4 w-4" />
                            {userData.orgName}
                        </div>
                    )}
                </div>
            </div>

            {/* Profile Information - Read Only */}
            <div className="space-y-6">
                {/* Basic Information */}
                <Card>
                    <CardHeader>
                        <CardTitle>Basic Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <div>
                                <label className="text-muted-foreground text-sm font-medium">
                                    Name
                                </label>
                                <p className="text-sm">
                                    {userData.name || 'Not provided'}
                                </p>
                            </div>
                            <div>
                                <label className="text-muted-foreground text-sm font-medium">
                                    Email
                                </label>
                                <p className="text-sm">
                                    {userData.email || 'Not provided'}
                                </p>
                            </div>
                            <div>
                                <label className="text-muted-foreground text-sm font-medium">
                                    Phone
                                </label>
                                <p className="text-sm">
                                    {profileMetadata.phoneNumber ||
                                        'Not provided'}
                                </p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <label className="text-muted-foreground text-sm font-medium">
                                    Location
                                </label>
                                <p className="text-sm">
                                    {profileMetadata.location || 'Not provided'}
                                </p>
                            </div>
                            <div>
                                <label className="text-muted-foreground text-sm font-medium">
                                    LinkedIn
                                </label>
                                <p className="text-sm">
                                    {profileMetadata.linkedinUsername ? (
                                        <a
                                            href={`https://linkedin.com/in/${profileMetadata.linkedinUsername}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:underline"
                                        >
                                            @{profileMetadata.linkedinUsername}
                                        </a>
                                    ) : (
                                        'Not provided'
                                    )}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Experience */}
                {profileMetadata.experiences &&
                    profileMetadata.experiences.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Experience</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {profileMetadata.experiences.map(
                                        (exp, index) => (
                                            <div
                                                key={index}
                                                className="border-muted border-l-2 pl-4"
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <h4 className="font-medium">
                                                            {exp.title}
                                                        </h4>
                                                        <p className="text-muted-foreground text-sm">
                                                            {exp.company}
                                                        </p>
                                                        <p className="text-muted-foreground text-xs">
                                                            {exp.startDate} -{' '}
                                                            {exp.isCurrent
                                                                ? 'Present'
                                                                : exp.endDate ||
                                                                  'Present'}
                                                        </p>
                                                    </div>
                                                    {exp.isCurrent && (
                                                        <Badge variant="secondary">
                                                            Current
                                                        </Badge>
                                                    )}
                                                </div>
                                                {exp.description && (
                                                    <p className="mt-2 text-sm">
                                                        {exp.description}
                                                    </p>
                                                )}
                                            </div>
                                        ),
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                {/* Education */}
                {profileMetadata.educations &&
                    profileMetadata.educations.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Education</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {profileMetadata.educations.map(
                                        (edu, index) => (
                                            <div
                                                key={index}
                                                className="border-muted border-l-2 pl-4"
                                            >
                                                <h4 className="font-medium">
                                                    {edu.degree}
                                                </h4>
                                                <p className="text-muted-foreground text-sm">
                                                    {edu.institution}
                                                </p>
                                                <p className="text-muted-foreground text-xs">
                                                    {edu.startDate} -{' '}
                                                    {edu.endDate || 'Present'}
                                                </p>
                                                {edu.description && (
                                                    <p className="mt-2 text-sm">
                                                        {edu.description}
                                                    </p>
                                                )}
                                            </div>
                                        ),
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                {/* Skills */}
                {profileMetadata.skills &&
                    profileMetadata.skills.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Skills</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2">
                                    {profileMetadata.skills.map(
                                        (skill, index) => (
                                            <Badge
                                                key={index}
                                                variant="outline"
                                            >
                                                {skill.name}
                                            </Badge>
                                        ),
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                {/* Interests */}
                {profileMetadata.interests &&
                    profileMetadata.interests.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Interests</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2">
                                    {profileMetadata.interests.map(
                                        (interest, index) => (
                                            <Badge
                                                key={index}
                                                variant="outline"
                                            >
                                                {interest}
                                            </Badge>
                                        ),
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                {/* Industries */}
                {profileMetadata.industries &&
                    profileMetadata.industries.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Industries</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2">
                                    {profileMetadata.industries.map(
                                        (industry, index) => (
                                            <Badge
                                                key={index}
                                                variant="outline"
                                            >
                                                {industry}
                                            </Badge>
                                        ),
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                {/* Achievements */}
                {profileMetadata.achievements &&
                    profileMetadata.achievements.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Achievements</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {profileMetadata.achievements.map(
                                        (achievement, index) => (
                                            <div
                                                key={index}
                                                className="flex items-start space-x-2"
                                            >
                                                <div className="bg-primary mt-1 h-2 w-2 rounded-full" />
                                                <div>
                                                    <p className="text-sm font-medium">
                                                        {achievement.title}
                                                    </p>
                                                    {achievement.description && (
                                                        <p className="text-muted-foreground text-xs">
                                                            {
                                                                achievement.description
                                                            }
                                                        </p>
                                                    )}
                                                    <p className="text-muted-foreground text-xs">
                                                        {achievement.date}
                                                    </p>
                                                </div>
                                            </div>
                                        ),
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                {/* Certifications */}
                {profileMetadata.certifications &&
                    profileMetadata.certifications.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Certifications</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {profileMetadata.certifications.map(
                                        (cert, index) => (
                                            <div
                                                key={index}
                                                className="border-muted border-l-2 pl-4"
                                            >
                                                <h4 className="font-medium">
                                                    {cert.name}
                                                </h4>
                                                <p className="text-muted-foreground text-sm">
                                                    {cert.issuingOrganization}
                                                </p>
                                                <p className="text-muted-foreground text-xs">
                                                    Issued: {cert.issueDate}
                                                </p>
                                                {cert.expiryDate && (
                                                    <p className="text-muted-foreground text-xs">
                                                        Expires:{' '}
                                                        {cert.expiryDate}
                                                    </p>
                                                )}
                                                {cert.description && (
                                                    <p className="mt-2 text-sm">
                                                        {cert.description}
                                                    </p>
                                                )}
                                            </div>
                                        ),
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}
            </div>

            {/* User badges */}
            {userData.badges && userData.badges.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Badges</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <UserBadgeDisplay
                            badges={userData.badges}
                            compact={false}
                            maxDisplay={12}
                        />
                    </CardContent>
                </Card>
            )}

            {/* Mutual communities */}
            {mutualCommunities && mutualCommunities.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">
                            Mutual Communities
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoadingCommunities ? (
                            <div className="space-y-2">
                                <Skeleton className="h-6 w-32" />
                                <Skeleton className="h-6 w-24" />
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {mutualCommunities.map((community) => (
                                    <Badge
                                        key={community.id}
                                        variant="outline"
                                        className="hover:bg-accent cursor-pointer"
                                        onClick={() =>
                                            handleCommunityClick(community.slug)
                                        }
                                    >
                                        {community.name}
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
