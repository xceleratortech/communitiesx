'use client';

import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    FormField,
    FormItem,
    FormLabel,
    FormControl,
    FormMessage,
} from '@/components/ui/form';
import { ProfilePictureUpload } from './ProfilePictureUpload';
import type { UserProfileMetadata } from '@/types/models';

interface BasicInformationProps {
    userName?: string;
    userEmail?: string;
    currentImageUrl?: string | null;
    isRequired?: boolean;
    onProfilePictureUpdate?: (imageUrl: string) => void;
}

export function BasicInformation({
    userName,
    userEmail,
    currentImageUrl,
    isRequired,
    onProfilePictureUpdate,
}: BasicInformationProps) {
    const form = useFormContext<UserProfileMetadata>();

    return (
        <section className="space-y-3">
            <h2 className="text-lg font-medium">Basic Information</h2>

            {/* Profile Picture Upload */}
            <div className="mb-6 flex justify-center">
                <ProfilePictureUpload
                    currentImageUrl={currentImageUrl}
                    userName={userName}
                    onImageUpdate={(imageUrl) => {
                        // Handle image update if needed
                        if (onProfilePictureUpdate) {
                            onProfilePictureUpdate(imageUrl);
                        }
                    }}
                />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                    <Label className="text-sm font-medium">Name</Label>
                    <Input
                        placeholder="Your name"
                        className="text-sm"
                        value={userName || ''}
                        disabled
                    />
                </div>

                <FormField<UserProfileMetadata>
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-sm font-medium">
                                Phone Number
                                {isRequired && (
                                    <span className="ml-1 text-red-500">*</span>
                                )}
                            </FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="Enter your phone number"
                                    className="text-sm"
                                    {...field}
                                    value={(field.value as string) || ''}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField<UserProfileMetadata>
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-sm font-medium">
                                Location
                                {isRequired && (
                                    <span className="ml-1 text-red-500">*</span>
                                )}
                            </FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="e.g., Bangalore, India"
                                    className="text-sm"
                                    {...field}
                                    value={(field.value as string) || ''}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <Label className="text-sm font-medium">Email</Label>
                    <Input
                        placeholder="Your email"
                        className="text-sm"
                        value={userEmail || ''}
                        disabled
                    />
                </div>
                <FormField<UserProfileMetadata>
                    control={form.control}
                    name="linkedinUsername"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-sm font-medium">
                                LinkedIn Username
                                {isRequired && (
                                    <span className="ml-1 text-red-500">*</span>
                                )}
                            </FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="e.g., johndoe or linkedin.com/in/johndoe"
                                    className="text-sm"
                                    {...field}
                                    value={(field.value as string) || ''}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
        </section>
    );
}
