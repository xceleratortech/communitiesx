'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
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
import { Loading } from '@/components/ui/loading';
import { usePermission } from '@/hooks/use-permission';
import { PERMISSIONS } from '@/lib/permissions/permission-const';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

const formSchema = z.object({
    name: z.string().min(3).max(50),
    slug: z
        .string()
        .min(3)
        .max(50)
        .regex(/^[a-z0-9-]+$/),
    description: z.string().max(500).optional(),
    type: z.enum(['public', 'private']),
    rules: z.string().max(2000).optional(),
    avatar: z.string().url().optional().nullable(),
    banner: z.string().url().optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

export default function EditCommunityPage() {
    const params = useParams();
    const slug = params.slug as string | undefined;
    const shouldFetch = !!slug && typeof slug === 'string';
    const router = useRouter();
    const sessionData = useSession();
    const session = sessionData.data;
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isClient, setIsClient] = useState(false);
    useEffect(() => {
        setIsClient(true);
    }, []);

    // Fetch community data
    const { data: community, isLoading } = trpc.communities.getBySlug.useQuery(
        { slug: slug || '' },
        { enabled: shouldFetch },
    );

    // Update mutation
    const updateCommunity = trpc.community.updateCommunity.useMutation({
        onSuccess: () => {
            toast.success('Community updated successfully!');
            router.push(`/communities/${slug}`);
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to update community');
            setIsSubmitting(false);
        },
    });

    // Form setup
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: community?.name || '',
            slug: community?.slug || '',
            description: community?.description || '',
            type:
                community?.type === 'public' || community?.type === 'private'
                    ? community.type
                    : 'public',
            rules: community?.rules || '',
            avatar: community?.avatar || '',
            banner: community?.banner || '',
        },
        values: community
            ? {
                  name: community.name || '',
                  slug: community.slug || '',
                  description: community.description || '',
                  type:
                      community.type === 'public' ||
                      community.type === 'private'
                          ? community.type
                          : 'public',
                  rules: community.rules || '',
                  avatar: community.avatar || '',
                  banner: community.banner || '',
              }
            : undefined,
    });

    // Handle form submit
    const onSubmit = async (values: FormValues) => {
        if (!session || !community) return;
        setIsSubmitting(true);
        updateCommunity.mutate({
            communityId: community.id,
            name: values.name,
            description: values.description || null,
            rules: values.rules || null,
            avatar: values.avatar || null,
            banner: values.banner || null,
        });
    };

    // Handle name change to auto-generate slug
    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const name = e.target.value;
        form.setValue('name', name);
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

    if (!isClient) {
        return <Loading message="Initializing..." />;
    }

    if (isLoading) {
        return <Loading message="Loading community..." />;
    }

    if (false) {
        return (
            <div className="container mx-auto px-4 py-8">
                <Skeleton className="h-10 w-full" />
            </div>
        );
    }
    if (!session) {
        return (
            <div className="container mx-auto px-4 py-16 text-center">
                <h1 className="mb-4 text-3xl font-bold">
                    Authentication Required
                </h1>
                <p className="text-muted-foreground mb-8">
                    Please sign in to edit this community.
                </p>
                <Button asChild>
                    <Link href="/auth/login">Sign In</Link>
                </Button>
            </div>
        );
    }
    if (!community) {
        return (
            <div className="container mx-auto px-4 py-16 text-center">
                <h1 className="mb-4 text-3xl font-bold">Community Not Found</h1>
                <Button asChild>
                    <Link href="/communities">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Communities
                    </Link>
                </Button>
            </div>
        );
    }

    const { checkCommunityPermission, isAppAdmin } = usePermission();

    // Check if user has permission to edit this community
    const canEditCommunity =
        isAppAdmin() ||
        (community?.id &&
            checkCommunityPermission(
                community.id.toString(),
                PERMISSIONS.EDIT_COMMUNITY,
            ));

    if (!canEditCommunity) {
        return (
            <div className="container mx-auto px-4 py-16 text-center">
                <h1 className="mb-4 text-3xl font-bold">Access Denied</h1>
                <p className="text-muted-foreground mb-8">
                    You do not have permission to edit this community.
                </p>
                <Button asChild>
                    <Link href={`/communities/${slug}`}>Back to Community</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-4xl py-4">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">
                    Edit {community.name}
                </h1>
                <p className="text-muted-foreground mt-2">
                    Update your community details below
                </p>
            </div>

            <div>
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
                                                disabled
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
                                                            Anyone can view,
                                                            post, and comment
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
                                                            Only approved
                                                            members can view and
                                                            post
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

                        <div className="pt-4">
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full"
                            >
                                {isSubmitting
                                    ? 'Updating...'
                                    : 'Update Community'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </div>
        </div>
    );
}

// Skeleton loader for the new community page
function NewCommunityPageSkeleton() {
    return (
        <div className="container mx-auto px-4 py-8 md:px-6">
            <div className="mb-8">
                <Skeleton className="mb-2 h-8 w-64" />
                <Skeleton className="h-4 w-96" />
            </div>

            <div className="mx-auto max-w-2xl">
                <div className="space-y-6">
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-4 w-48" />
                    </div>

                    <div className="space-y-2">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-4 w-72" />
                    </div>

                    <div className="space-y-2">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-4 w-60" />
                    </div>

                    <div className="space-y-3">
                        <Skeleton className="h-5 w-32" />
                        <div className="space-y-3">
                            <Skeleton className="h-20 w-full" />
                            <Skeleton className="h-20 w-full" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-4 w-56" />
                    </div>

                    <div className="space-y-2">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-4 w-56" />
                    </div>

                    <div className="space-y-2">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-4 w-56" />
                    </div>

                    <div className="pt-4">
                        <Skeleton className="h-10 w-full" />
                    </div>
                </div>
            </div>
        </div>
    );
}
