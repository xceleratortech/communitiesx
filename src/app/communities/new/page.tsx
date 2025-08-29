'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { trpc } from '@/providers/trpc-provider';
import { useSession } from '@/server/auth/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { ArrowLeft, Globe, Lock, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useSearchParams } from 'next/navigation';
import { usePermission } from '@/hooks/use-permission';

// Form schema
const formSchema = z.object({
    name: z
        .string()
        .min(3, {
            message: 'Community name must be at least 3 characters.',
        })
        .max(50, {
            message: 'Community name must not exceed 50 characters.',
        }),
    slug: z
        .string()
        .min(3, {
            message: 'Slug must be at least 3 characters.',
        })
        .max(50, {
            message: 'Slug must not exceed 50 characters.',
        })
        .regex(/^[a-z0-9-]+$/, {
            message:
                'Slug can only contain lowercase letters, numbers, and hyphens.',
        }),
    description: z
        .string()
        .max(500, {
            message: 'Description must not exceed 500 characters.',
        })
        .optional(),
    type: z.enum(['public', 'private'], {
        required_error: 'You must select a community type.',
    }),
    postCreationMinRole: z.enum(['member', 'moderator', 'admin']),
    rules: z
        .string()
        .max(2000, {
            message: 'Rules must not exceed 2000 characters.',
        })
        .optional(),
    avatar: z
        .string()
        .url({ message: 'Please enter a valid URL' })
        .or(z.literal(''))
        .optional()
        .nullable(),
    banner: z
        .string()
        .url({ message: 'Please enter a valid URL' })
        .or(z.literal(''))
        .optional()
        .nullable(),
    orgId: z
        .string()
        .trim()
        .min(1, { message: 'Please select an organization.' }),
});

type FormValues = z.infer<typeof formSchema>;

// Separate component that uses useSearchParams
function NewCommunityForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const sessionData = useSession();
    const session = sessionData.data;
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Get user permissions
    const { appRole } = usePermission();

    // Get orgId from URL params if provided
    const orgIdFromUrl = searchParams.get('orgId');

    // Use client-side flag to avoid hydration mismatch
    const [isClient, setIsClient] = useState(false);
    useEffect(() => {
        setIsClient(true);
    }, []);

    // Create community mutation
    const createCommunity = trpc.community.create.useMutation({
        onSuccess: (data) => {
            toast.success('Community created successfully!');
            router.push(`/communities/${data.slug}`);
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to create community');
            setIsSubmitting(false);
        },
    });

    // Fetch organizations for the select
    const { data: organizations, isLoading: isLoadingOrgs } =
        trpc.organizations.getOrganizationsForCommunityCreate.useQuery(
            { userId: session?.user?.id! },
            {
                enabled: !!session?.user?.id,
            },
        );

    // Initialize form with orgId if provided
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            slug: '',
            description: '',
            type: 'public',
            postCreationMinRole: 'member',
            rules: '',
            avatar: '',
            banner: '',
            orgId: orgIdFromUrl || '',
        },
    });

    const selectedOrganization = useMemo(() => {
        const currentOrgId = form.watch('orgId');
        if (!organizations?.length || !currentOrgId) return null;
        return organizations.find((org) => org.id === currentOrgId) || null;
    }, [organizations, form.watch('orgId')]);

    useEffect(() => {
        if (orgIdFromUrl) {
            const currentOrgId = form.getValues('orgId');
            if (currentOrgId !== orgIdFromUrl) {
                form.setValue('orgId', orgIdFromUrl);
            }
        } else if (organizations && organizations.length > 0) {
            const currentOrgId = form.getValues('orgId');
            if (!currentOrgId || currentOrgId === '') {
                form.setValue('orgId', organizations[0].id);

                if (organizations.length === 1 && appRole === 'admin') {
                    toast.success(
                        `Organization automatically set to ${organizations[0].name}`,
                    );
                }
            }
        }
    }, [orgIdFromUrl, organizations, form, appRole]);

    // Handle form submission
    const onSubmit = async (values: FormValues) => {
        if (!session) {
            toast.error('You must be signed in to create a community');
            return;
        }

        setIsSubmitting(true);
        createCommunity.mutate({
            name: values.name,
            slug: values.slug,
            description: values.description || null,
            type: values.type,
            postCreationMinRole: values.postCreationMinRole,
            rules: values.rules || null,
            avatar: values.avatar || null,
            banner: values.banner || null,
            orgId: values.orgId,
        });
    };

    // Handle name change to auto-generate slug
    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const name = e.target.value;
        form.setValue('name', name);

        // Only auto-generate slug if user hasn't manually edited it
        if (
            !form.getValues('slug') ||
            form.getValues('slug') ===
                form
                    .getValues('name')
                    .toLowerCase()
                    .replace(/\s+/g, '-')
                    .replace(/[^a-z0-9-]/g, '')
        ) {
            const slug = name
                .toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^a-z0-9-]/g, '');
            form.setValue('slug', slug);
        }
    };

    // Don't render anything meaningful during SSR to avoid hydration mismatches
    if (!isClient) {
        return <NewCommunityPageSkeleton />;
    }

    if (session === undefined) {
        return <NewCommunityPageSkeleton />;
    }

    if (!session) {
        return (
            <div className="container mx-auto px-4 py-16 text-center">
                <h1 className="mb-4 text-3xl font-bold">
                    Authentication Required
                </h1>
                <p className="text-muted-foreground mb-8">
                    Please sign in to create a new community.
                </p>
                <Button asChild>
                    <Link href="/auth/login">Sign In</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-4xl py-4">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">
                    Create a New Community
                </h1>
                <p className="text-muted-foreground mt-2">
                    Set up your community space where people can gather to
                    discuss and share content
                </p>
            </div>

            <div>
                {organizations && organizations.length === 0 && (
                    <div className="mb-6 rounded-md border border-yellow-200 bg-yellow-50 p-4">
                        <p className="text-sm text-yellow-800">
                            <strong>Note:</strong> You don't have access to any
                            organizations. Communities must be created under an
                            organization. Please contact your administrator to
                            get access to an organization.
                        </p>
                    </div>
                )}

                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-6"
                    >
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Community Name</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Enter community name"
                                            {...field}
                                            onChange={handleNameChange}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="orgId"
                            render={({ field }) => (
                                <FormItem className="w-full">
                                    <FormLabel>Organization</FormLabel>
                                    <FormDescription className="text-muted-foreground">
                                        The community will be created under this
                                        organization.
                                        {appRole === 'admin' ? (
                                            <>
                                                If you have access to multiple
                                                organizations, you can select
                                                which one to use.
                                                {field.value &&
                                                    organizations && (
                                                        <span className="mt-1 block font-medium text-green-700">
                                                            ✓ Selected:{' '}
                                                            {
                                                                selectedOrganization?.name
                                                            }
                                                        </span>
                                                    )}
                                                {organizations &&
                                                    organizations.length >
                                                        1 && (
                                                        <span className="mt-1 block text-xs text-blue-600">
                                                            You can change this
                                                            selection if needed
                                                        </span>
                                                    )}
                                                {organizations &&
                                                    organizations.length ===
                                                        1 && (
                                                        <span className="mt-1 block text-xs text-green-600">
                                                            This is your only
                                                            organization
                                                        </span>
                                                    )}
                                            </>
                                        ) : (
                                            <span className="text-muted-foreground mt-1 block text-xs">
                                                Organization selection is
                                                automatically managed for you.
                                                {organizations &&
                                                    organizations.length ===
                                                        1 && (
                                                        <span className="mt-1 block text-xs text-blue-600">
                                                            Your community will
                                                            be created under{' '}
                                                            {
                                                                selectedOrganization?.name
                                                            }
                                                        </span>
                                                    )}
                                            </span>
                                        )}
                                    </FormDescription>
                                    <FormControl>
                                        <div className="w-full">
                                            {isLoadingOrgs ? (
                                                <div className="border-input bg-background flex h-10 w-full items-center rounded-md border px-3 py-2 text-sm">
                                                    <span className="text-muted-foreground">
                                                        Loading organizations...
                                                    </span>
                                                </div>
                                            ) : organizations &&
                                              organizations.length === 0 ? (
                                                <div className="flex h-10 w-full items-center rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm">
                                                    <span className="text-red-600">
                                                        No organizations
                                                        available
                                                    </span>
                                                </div>
                                            ) : (
                                                <Select
                                                    key={field.value}
                                                    value={field.value}
                                                    onValueChange={
                                                        field.onChange
                                                    }
                                                    disabled={isLoadingOrgs}
                                                >
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue
                                                            placeholder={
                                                                organizations &&
                                                                organizations.length >
                                                                    0
                                                                    ? 'Select organization'
                                                                    : 'No organizations available'
                                                            }
                                                        />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {organizations?.map(
                                                            (org) => (
                                                                <SelectItem
                                                                    key={org.id}
                                                                    value={
                                                                        org.id
                                                                    }
                                                                >
                                                                    {org.name}
                                                                </SelectItem>
                                                            ),
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="slug"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Community URL</FormLabel>
                                    <FormControl>
                                        <div className="flex items-center">
                                            <span className="text-muted-foreground mr-2">
                                                /communities/
                                            </span>
                                            <Input
                                                placeholder="community-url"
                                                {...field}
                                            />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Describe what your community is about"
                                            className="min-h-24 resize-none"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem className="space-y-3">
                                    <FormLabel>Community Type</FormLabel>
                                    <FormControl>
                                        <RadioGroup
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                            className="flex flex-col space-y-3"
                                        >
                                            <div className="flex items-center space-x-3 rounded-md border p-4">
                                                <RadioGroupItem
                                                    value="public"
                                                    id="public"
                                                />
                                                <Label
                                                    htmlFor="public"
                                                    className="flex cursor-pointer items-center gap-2"
                                                >
                                                    <Globe className="h-4 w-4" />
                                                    <div>
                                                        <p className="font-medium">
                                                            Public
                                                        </p>
                                                        <p className="text-muted-foreground text-sm">
                                                            Anyone can view and
                                                            join this community
                                                        </p>
                                                    </div>
                                                </Label>
                                            </div>

                                            <div className="flex items-center space-x-3 rounded-md border p-4">
                                                <RadioGroupItem
                                                    value="private"
                                                    id="private"
                                                />
                                                <Label
                                                    htmlFor="private"
                                                    className="flex cursor-pointer items-center gap-2"
                                                >
                                                    <Lock className="h-4 w-4" />
                                                    <div>
                                                        <p className="font-medium">
                                                            Private
                                                        </p>
                                                        <p className="text-muted-foreground text-sm">
                                                            Only invited members
                                                            can view and join
                                                        </p>
                                                    </div>
                                                </Label>
                                            </div>
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="postCreationMinRole"
                            render={({ field }) => (
                                <FormItem className="space-y-3">
                                    <FormLabel>
                                        Post Creation Permissions
                                    </FormLabel>
                                    <FormControl>
                                        <RadioGroup
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                            className="flex flex-col space-y-3"
                                        >
                                            <div className="flex items-center space-x-3 rounded-md border p-4">
                                                <RadioGroupItem
                                                    value="member"
                                                    id="member"
                                                />
                                                <Label
                                                    htmlFor="member"
                                                    className="flex cursor-pointer flex-col gap-1"
                                                >
                                                    <span className="font-medium">
                                                        All members
                                                    </span>
                                                    <span className="text-muted-foreground text-sm">
                                                        Any community member can
                                                        create posts
                                                    </span>
                                                </Label>
                                            </div>

                                            <div className="flex items-center space-x-3 rounded-md border p-4">
                                                <RadioGroupItem
                                                    value="moderator"
                                                    id="moderator"
                                                />
                                                <Label
                                                    htmlFor="moderator"
                                                    className="flex cursor-pointer flex-col gap-1"
                                                >
                                                    <span className="font-medium">
                                                        Moderators and admins
                                                    </span>
                                                    <span className="text-muted-foreground text-sm">
                                                        Only moderators and
                                                        admins can create posts
                                                    </span>
                                                </Label>
                                            </div>

                                            <div className="flex items-center space-x-3 rounded-md border p-4">
                                                <RadioGroupItem
                                                    value="admin"
                                                    id="admin"
                                                />
                                                <Label
                                                    htmlFor="admin"
                                                    className="flex cursor-pointer flex-col gap-1"
                                                >
                                                    <span className="font-medium">
                                                        Admins only
                                                    </span>
                                                    <span className="text-muted-foreground text-sm">
                                                        Only community admins
                                                        can create posts
                                                    </span>
                                                </Label>
                                            </div>
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="rules"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        Community Rules (Optional)
                                    </FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Enter community rules and guidelines"
                                            className="min-h-32 resize-none"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="avatar"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        Community Avatar URL (Optional)
                                    </FormLabel>
                                    <FormControl>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                placeholder="https://example.com/avatar.png"
                                                {...field}
                                                value={field.value || ''}
                                            />
                                            <ImageIcon className="text-muted-foreground h-5 w-5" />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="banner"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        Community Banner URL (Optional)
                                    </FormLabel>
                                    <FormControl>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                placeholder="https://example.com/banner.png"
                                                {...field}
                                                value={field.value || ''}
                                            />
                                            <ImageIcon className="text-muted-foreground h-5 w-5" />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="space-y-4 pt-4">
                            {/* Only show summary card to super admins */}
                            {appRole === 'admin' &&
                                form.watch('orgId') &&
                                organizations && (
                                    <div className="rounded-md border border-green-200 bg-green-50 p-3">
                                        <p className="text-sm text-green-800">
                                            <strong>
                                                Ready to create community:
                                            </strong>{' '}
                                            Your community will be created under{' '}
                                            <span className="font-medium">
                                                {selectedOrganization?.name}
                                            </span>
                                        </p>
                                    </div>
                                )}

                            <Button
                                type="submit"
                                disabled={
                                    isSubmitting ||
                                    isLoadingOrgs ||
                                    !organizations ||
                                    organizations.length === 0
                                }
                                className="w-full"
                            >
                                {(() => {
                                    if (isSubmitting) return 'Creating...';
                                    if (isLoadingOrgs) return 'Loading...';
                                    if (
                                        !organizations ||
                                        organizations.length === 0
                                    )
                                        return 'No Organizations Available';
                                    if (appRole === 'admin')
                                        return 'Create Community';
                                    return 'Create Community in Your Organization';
                                })()}
                            </Button>
                        </div>
                    </form>
                </Form>
            </div>
        </div>
    );
}

// Main component with Suspense boundary
export default function NewCommunityPage() {
    return (
        <Suspense fallback={<NewCommunityPageSkeleton />}>
            <NewCommunityForm />
        </Suspense>
    );
}

// Skeleton loader for the new community page
function NewCommunityPageSkeleton() {
    return (
        <div className="container mx-auto max-w-4xl py-4">
            <div className="mb-8">
                <Skeleton className="mb-2 h-8 w-64" />
                <Skeleton className="h-4 w-96" />
            </div>
            <div className="space-y-6">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
        </div>
    );
}
