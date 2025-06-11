'use client';

import { useState, useEffect } from 'react';
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
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
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
    rules: z
        .string()
        .max(2000, {
            message: 'Rules must not exceed 2000 characters.',
        })
        .optional(),
    avatar: z
        .string()
        .url({ message: 'Please enter a valid URL' })
        .optional()
        .nullable(),
    banner: z
        .string()
        .url({ message: 'Please enter a valid URL' })
        .optional()
        .nullable(),
});

type FormValues = z.infer<typeof formSchema>;

export default function NewCommunityPage() {
    const router = useRouter();
    const sessionData = useSession();
    const session = sessionData.data;
    const [isSubmitting, setIsSubmitting] = useState(false);

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

    // Initialize form
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            slug: '',
            description: '',
            type: 'public',
            rules: '',
            avatar: '',
            banner: '',
        },
    });

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
            rules: values.rules || null,
            avatar: values.avatar || null,
            banner: values.banner || null,
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
        <div className="container mx-auto px-4 py-8 md:px-6">
            <div className="mb-8">
                <Button variant="ghost" size="sm" asChild className="mb-4">
                    <Link href="/communities">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Communities
                    </Link>
                </Button>
                <h1 className="text-center text-3xl font-bold tracking-tight">
                    Create a New Community
                </h1>
                <p className="text-muted-foreground mt-2 text-center">
                    Set up your community space where people can gather to
                    discuss and share content
                </p>
            </div>

            <Card className="mx-auto max-w-2xl">
                <CardHeader>
                    <CardTitle>Community Details</CardTitle>
                    <CardDescription>
                        Fill out the information below to create your community
                    </CardDescription>
                </CardHeader>
                <CardContent>
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
                                        <FormDescription>
                                            This is how your community will
                                            appear to others
                                        </FormDescription>
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
                                        <FormDescription>
                                            This will be the URL of your
                                            community. Only lowercase letters,
                                            numbers, and hyphens.
                                        </FormDescription>
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
                                        <FormDescription>
                                            A brief description to help people
                                            understand what your community is
                                            about
                                        </FormDescription>
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
                                                                post, and
                                                                comment
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
                                                                members can view
                                                                and post
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
                                        <FormDescription>
                                            Set guidelines for your community
                                            members to follow
                                        </FormDescription>
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
                                        <FormDescription>
                                            URL to an image for your community
                                            avatar
                                        </FormDescription>
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
                                        <FormDescription>
                                            URL to an image for your community
                                            banner
                                        </FormDescription>
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
                                        ? 'Creating...'
                                        : 'Create Community'}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}

// Skeleton loader for the new community page
function NewCommunityPageSkeleton() {
    return (
        <div className="container mx-auto px-4 py-8 md:px-6">
            <div className="mb-8">
                <Skeleton className="mb-4 h-9 w-36" />
                <Skeleton className="mb-2 h-8 w-64" />
                <Skeleton className="h-4 w-96" />
            </div>

            <Card className="mx-auto max-w-2xl">
                <CardHeader>
                    <Skeleton className="mb-2 h-6 w-40" />
                    <Skeleton className="h-4 w-60" />
                </CardHeader>
                <CardContent>
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
                </CardContent>
            </Card>
        </div>
    );
}
