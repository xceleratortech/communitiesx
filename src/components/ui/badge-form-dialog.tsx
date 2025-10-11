'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const badgeFormSchema = z.object({
    name: z
        .string()
        .min(1, 'Name is required')
        .max(50, 'Name must be 50 characters or less'),
    description: z.string().optional(),
    icon: z.string().optional(),
    color: z
        .string()
        .regex(/^#[0-9A-F]{6}$/i, 'Color must be a valid hex color'),
});

type BadgeFormData = z.infer<typeof badgeFormSchema>;

interface Badge {
    id: number;
    name: string;
    description?: string | null;
    icon?: string | null;
    color: string;
    orgId: string;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}

interface BadgeFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    badge?: Badge | null;
    onSubmit: (data: BadgeFormData) => Promise<void>;
    isSubmitting?: boolean;
}

const commonColors = [
    '#3B82F6', // Blue
    '#EF4444', // Red
    '#10B981', // Green
    '#F59E0B', // Yellow
    '#8B5CF6', // Purple
    '#F97316', // Orange
    '#06B6D4', // Cyan
    '#EC4899', // Pink
    '#84CC16', // Lime
    '#6366F1', // Indigo
];

export function BadgeFormDialog({
    open,
    onOpenChange,
    badge,
    onSubmit,
    isSubmitting = false,
}: BadgeFormDialogProps) {
    const [selectedColor, setSelectedColor] = useState(
        badge?.color || '#3B82F6',
    );

    const form = useForm<BadgeFormData>({
        resolver: zodResolver(badgeFormSchema),
        defaultValues: {
            name: badge?.name || '',
            description: badge?.description || '',
            icon: badge?.icon || '',
            color: badge?.color || '#3B82F6',
        },
    });

    const handleSubmit = async (data: BadgeFormData) => {
        try {
            await onSubmit(data);
            form.reset();
            onOpenChange(false);
        } catch (error) {
            // Error handling is done in the parent component
        }
    };

    const handleColorSelect = (color: string) => {
        setSelectedColor(color);
        form.setValue('color', color);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>
                        {badge ? 'Edit Badge' : 'Create New Badge'}
                    </DialogTitle>
                    <DialogDescription>
                        {badge
                            ? 'Update the badge details below.'
                            : 'Create a new badge for your organization.'}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(handleSubmit)}
                        className="space-y-4"
                    >
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Badge name"
                                            {...field}
                                        />
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
                                            placeholder="Badge description (optional)"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="icon"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Icon</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Icon name or emoji (optional)"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Enter an emoji or icon name (e.g., 🏆,
                                        ⭐, 🎯)
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="color"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Color</FormLabel>
                                    <FormControl>
                                        <div className="space-y-2">
                                            <div className="flex flex-wrap gap-2">
                                                {commonColors.map((color) => (
                                                    <button
                                                        key={color}
                                                        type="button"
                                                        className={`h-8 w-8 rounded-full border-2 ${
                                                            selectedColor ===
                                                            color
                                                                ? 'border-gray-800'
                                                                : 'border-gray-300'
                                                        }`}
                                                        style={{
                                                            backgroundColor:
                                                                color,
                                                        }}
                                                        onClick={() =>
                                                            handleColorSelect(
                                                                color,
                                                            )
                                                        }
                                                    />
                                                ))}
                                            </div>
                                            <Input
                                                placeholder="#3B82F6"
                                                {...field}
                                                onChange={(e) => {
                                                    field.onChange(e);
                                                    setSelectedColor(
                                                        e.target.value,
                                                    );
                                                }}
                                            />
                                        </div>
                                    </FormControl>
                                    <FormDescription>
                                        Choose a color or enter a custom hex
                                        color
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                {badge ? 'Update Badge' : 'Create Badge'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
