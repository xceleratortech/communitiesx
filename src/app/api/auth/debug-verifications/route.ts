import { NextResponse } from 'next/server';
import { db } from '@/server/db';
import { verifications } from '@/server/db/auth-schema';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const email = url.searchParams.get('email');

        if (!email) {
            return NextResponse.json(
                { error: 'Email parameter is required' },
                { status: 400 },
            );
        }

        // Get all verification records for this email
        const allVerifications = await db.query.verifications.findMany({
            where: eq(verifications.identifier, email),
        });

        // Process and return the verification records
        const processedVerifications = allVerifications.map((verification) => {
            try {
                const parsedValue = JSON.parse(verification.value);
                return {
                    id: verification.id,
                    identifier: verification.identifier,
                    parsedValue,
                    expiresAt: verification.expiresAt,
                    createdAt: verification.createdAt,
                    updatedAt: verification.updatedAt,
                };
            } catch (e) {
                return {
                    id: verification.id,
                    identifier: verification.identifier,
                    value: verification.value,
                    parseError: 'Failed to parse JSON value',
                    expiresAt: verification.expiresAt,
                    createdAt: verification.createdAt,
                    updatedAt: verification.updatedAt,
                };
            }
        });

        return NextResponse.json({
            email,
            count: allVerifications.length,
            verifications: processedVerifications,
        });
    } catch (error) {
        console.error('Error fetching verification records:', error);
        return NextResponse.json(
            { error: 'Failed to fetch verification records' },
            { status: 500 },
        );
    }
}
