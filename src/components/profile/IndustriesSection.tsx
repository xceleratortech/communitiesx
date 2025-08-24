'use client';

import React from 'react';
import { useFormContext } from 'react-hook-form';
import {
    FormField,
    FormItem,
    FormControl,
    FormMessage,
} from '@/components/ui/form';
import { IndustriesCombobox } from './IndustriesCombobox';
import type { UserProfileMetadata } from '@/types/models';

interface IndustriesSectionProps {
    isRequired?: boolean;
}

export function IndustriesSection({ isRequired }: IndustriesSectionProps) {
    const form = useFormContext<UserProfileMetadata>();

    return (
        <section className="space-y-3">
            <h2 className="text-sm font-medium">
                Industries
                {isRequired && <span className="ml-1 text-red-500">*</span>}
            </h2>
            <FormField<UserProfileMetadata>
                control={form.control}
                name="industries"
                render={({ field }) => (
                    <FormItem>
                        <FormControl>
                            <IndustriesCombobox
                                value={field.value as string[]}
                                onChange={field.onChange}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </section>
    );
}
