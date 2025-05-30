import { NextResponse } from 'next/server';
import { db } from '@/server/db';
import { verifications } from '@/server/db/auth-schema';
import { eq } from 'drizzle-orm';

// Helper function to verify the invitation token
async function verifyInvitation(token: string | null, email: string | null) {
    console.log(`Verifying invitation: token=${token}, email=${email}`);

    if (!token || !email) {
        console.log('Missing token or email');
        return { error: 'Missing token or email', status: 400 };
    }

    try {
        // Query all verification records for this email
        const allVerifications = await db.query.verifications.findMany({
            where: eq(verifications.identifier, email),
        });

        console.log(
            `Found ${allVerifications.length} verification records for email:`,
            email,
        );

        if (!allVerifications.length) {
            console.log('No verification found for email:', email);
            return { error: 'No invitation found for this email', status: 400 };
        }

        // Try to find a matching token in any of the verification records
        let matchedVerification = null;
        let parsedValue = null;

        for (const verification of allVerifications) {
            try {
                console.log('Checking verification record:', verification.id);
                const parsed = JSON.parse(verification.value);
                console.log('Parsed value:', parsed);

                if (parsed.token === token) {
                    console.log('Token match found!');
                    matchedVerification = verification;
                    parsedValue = parsed;
                    break;
                }
            } catch (e) {
                console.error('Error parsing verification value:', e);
                // Continue checking other records
            }
        }

        if (!matchedVerification || !parsedValue) {
            console.log('No matching token found in any verification record');
            return { error: 'Invalid token', status: 400 };
        }

        // Check if token is expired
        const now = new Date();
        if (
            matchedVerification.expiresAt &&
            new Date(matchedVerification.expiresAt) < now
        ) {
            console.log('Token expired:', matchedVerification.expiresAt);
            return { error: 'Token has expired', status: 400 };
        }

        // Return success with organization data
        const response = {
            valid: true,
            orgId: parsedValue.orgId,
            role: parsedValue.role || 'user',
        };
        console.log('Verification successful:', response);
        return { data: response, status: 200 };
    } catch (error) {
        console.error('Error verifying invitation:', error);
        return { error: 'Failed to verify invitation', status: 500 };
    }
}

export async function GET(request: Request) {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    const email = url.searchParams.get('email');

    const result = await verifyInvitation(token, email);

    if (result.error) {
        return NextResponse.json(
            { error: result.error },
            { status: result.status },
        );
    }

    return NextResponse.json(result.data);
}

export async function POST(request: Request) {
    const body = await request.json();
    const { token, email } = body;

    const result = await verifyInvitation(token, email);

    if (result.error) {
        return NextResponse.json(
            { error: result.error },
            { status: result.status },
        );
    }

    return NextResponse.json(result.data);
}
