'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Share2, CheckCircle } from 'lucide-react';
import { trpc } from '@/providers/trpc-provider';
import { CommunitySelector } from '@/components/share-target/community-selector';
import { ContentReview } from '@/components/share-target/content-review';

interface SharedData {
    title?: string;
    text?: string;
    url?: string;
}

interface Community {
    id: number;
    name: string;
    slug: string;
    organization?: {
        id: string;
        name: string;
        createdAt: Date;
        slug: string;
        allowCrossOrgDM: boolean;
    } | null;
}

type WizardStep = 'communities' | 'content' | 'creating' | 'success';

export default function ShareTargetPage() {
    const router = useRouter();
    const [sharedData, setSharedData] = useState<SharedData>({});
    const [currentStep, setCurrentStep] = useState<WizardStep>('communities');
    const [selectedCommunities, setSelectedCommunities] = useState<number[]>(
        [],
    );
    const [error, setError] = useState<string | null>(null);

    // tRPC mutations and queries
    const createPostMutation = trpc.community.createPost.useMutation();
    const { data: communities } =
        trpc.communities.getUserPostableCommunities.useQuery();

    useEffect(() => {
        // Handle shared data from Web Share Target API
        const handleSharedData = () => {
            if (typeof window !== 'undefined' && 'navigator' in window) {
                // Check if we have shared data in URL parameters (for non-PWA sharing)
                const urlParams = new URLSearchParams(window.location.search);
                const title = urlParams.get('title');
                const text = urlParams.get('text');
                const url = urlParams.get('url');

                if (title || text || url) {
                    setSharedData({
                        title: title || '',
                        text: text || '',
                        url: url || '',
                    });
                }
            }
        };

        // Listen for service worker messages
        const handleServiceWorkerMessage = (event: MessageEvent) => {
            if (event.data && event.data.type === 'SHARE_TARGET_DATA') {
                const data = event.data.data;
                setSharedData({
                    title: data.title || '',
                    text: data.text || '',
                    url: data.url || '',
                });
            }
        };

        handleSharedData();

        // Check service worker status and listen for messages
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener(
                'message',
                handleServiceWorkerMessage,
            );

            // Check if service worker is ready and request shared data
            navigator.serviceWorker.ready
                .then((registration) => {
                    // Try to get shared data directly from service worker
                    if (registration.active) {
                        registration.active.postMessage({
                            type: 'GET_SHARED_DATA',
                        });
                    }

                    // Also try after a delay in case of timing issues
                    setTimeout(() => {
                        if (registration.active) {
                            registration.active.postMessage({
                                type: 'GET_SHARED_DATA',
                            });
                        }
                    }, 1000);
                })
                .catch(() => {
                    // Service worker error - silently handle
                });
        }

        return () => {
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.removeEventListener(
                    'message',
                    handleServiceWorkerMessage,
                );
            }
        };
    }, []);

    const handleCommunitySelection = (communityIds: number[]) => {
        setSelectedCommunities(communityIds);
    };

    const handleNextToContent = () => {
        setCurrentStep('content');
    };

    const handleBackToCommunities = () => {
        setCurrentStep('communities');
    };

    const handleCreatePost = async (title: string, content: string) => {
        if (selectedCommunities.length === 0) {
            setError('Please select at least one community');
            return;
        }

        setCurrentStep('creating');
        setError(null);

        try {
            // Create posts for each selected community
            const postPromises = selectedCommunities.map((communityId) =>
                createPostMutation.mutateAsync({
                    title,
                    content,
                    communityId,
                }),
            );

            await Promise.all(postPromises);
            setCurrentStep('success');
        } catch (err) {
            console.error('Error creating posts:', err);
            setError('Failed to create posts. Please try again.');
            setCurrentStep('content');
        }
    };

    const handleFinish = () => {
        router.push('/posts');
    };

    const renderStep = () => {
        switch (currentStep) {
            case 'communities':
                return (
                    <CommunitySelector
                        selectedCommunities={selectedCommunities}
                        onSelectionChange={handleCommunitySelection}
                        onNext={handleNextToContent}
                    />
                );

            case 'content':
                // Get community details for display
                const selectedCommunityDetails =
                    communities?.filter((c) =>
                        selectedCommunities.includes(c.id),
                    ) || [];

                return (
                    <ContentReview
                        sharedData={sharedData}
                        selectedCommunities={
                            selectedCommunityDetails as Community[]
                        }
                        onBack={handleBackToCommunities}
                        onNext={handleCreatePost}
                    />
                );

            case 'creating':
                return (
                    <div className="py-8 text-center">
                        <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin" />
                        <h2 className="mb-2 text-xl font-semibold">
                            Creating Posts...
                        </h2>
                        <p className="text-muted-foreground">
                            Please wait while we create your posts in the
                            selected communities.
                        </p>
                    </div>
                );

            case 'success':
                return (
                    <div className="py-8 text-center">
                        <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-500" />
                        <h2 className="mb-2 text-xl font-semibold">
                            Posts Created Successfully!
                        </h2>
                        <p className="text-muted-foreground mb-6">
                            Your content has been shared to{' '}
                            {selectedCommunities.length} community
                            {selectedCommunities.length !== 1 ? 'ies' : ''}.
                        </p>
                        <Button onClick={handleFinish} className="w-full">
                            View Posts
                        </Button>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="bg-background min-h-screen p-4">
            <div className="mx-auto max-w-2xl space-y-6">
                <div className="text-center">
                    <Share2 className="text-primary mx-auto h-12 w-12" />
                    <h1 className="mt-4 text-2xl font-bold">Share Content</h1>
                    <p className="text-muted-foreground">
                        Share content from other apps to your communities
                    </p>
                </div>

                {/* Progress Indicator */}
                <div className="mb-8 flex items-start justify-center space-x-8">
                    <div
                        className={`flex flex-col items-center space-y-2 ${currentStep === 'communities' ? 'text-primary' : currentStep === 'content' || currentStep === 'creating' || currentStep === 'success' ? 'text-green-600' : 'text-muted-foreground'}`}
                    >
                        <div
                            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${currentStep === 'communities' ? 'bg-primary text-primary-foreground' : currentStep === 'content' || currentStep === 'creating' || currentStep === 'success' ? 'bg-green-100 text-green-600' : 'bg-muted'}`}
                        >
                            1
                        </div>
                        <span className="text-center text-sm">
                            Select Communities
                        </span>
                    </div>
                    <div className="flex items-center">
                        <div
                            className={`h-1 w-8 ${currentStep === 'content' || currentStep === 'creating' || currentStep === 'success' ? 'bg-green-600' : 'bg-muted'}`}
                        />
                    </div>
                    <div
                        className={`flex flex-col items-center space-y-2 ${currentStep === 'content' ? 'text-primary' : currentStep === 'creating' || currentStep === 'success' ? 'text-green-600' : 'text-muted-foreground'}`}
                    >
                        <div
                            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${currentStep === 'content' ? 'bg-primary text-primary-foreground' : currentStep === 'creating' || currentStep === 'success' ? 'bg-green-100 text-green-600' : 'bg-muted'}`}
                        >
                            2
                        </div>
                        <span className="text-center text-sm">
                            Review Content
                        </span>
                    </div>
                    <div className="flex items-center">
                        <div
                            className={`h-1 w-8 ${currentStep === 'success' ? 'bg-green-600' : 'bg-muted'}`}
                        />
                    </div>
                    <div
                        className={`flex flex-col items-center space-y-2 ${currentStep === 'success' ? 'text-green-600' : 'text-muted-foreground'}`}
                    >
                        <div
                            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${currentStep === 'success' ? 'bg-green-100 text-green-600' : 'bg-muted'}`}
                        >
                            3
                        </div>
                        <span className="text-center text-sm">Complete</span>
                    </div>
                </div>

                {error && (
                    <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {/* <Card>
                    <CardContent className="p-6">{renderStep()}</CardContent>
                </Card> */}
                {renderStep()}
            </div>
        </div>
    );
}
