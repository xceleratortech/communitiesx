import { NextResponse } from 'next/server';
import { db } from '@/server/db';
import { users } from '@/server/db/auth-schema';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email } = body;

        if (!email) {
            return NextResponse.json(
                { error: 'Email is required' },
                { status: 400 },
            );
        }

        // Find the user by email
        const user = await db.query.users.findFirst({
            where: eq(users.email, email),
        });

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 },
            );
        }

        // Update the user to set emailVerified to true
        await db
            .update(users)
            .set({ emailVerified: true })
            .where(eq(users.email, email));

        return NextResponse.json({
            success: true,
            message: 'Email verified successfully',
        });
    } catch (error) {
        console.error('Error verifying email:', error);
        return NextResponse.json(
            { error: 'Failed to verify email' },
            { status: 500 },
        );
    }
}
