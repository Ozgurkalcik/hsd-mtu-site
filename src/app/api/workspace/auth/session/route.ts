import { NextResponse } from 'next/server';
import { getWorkspaceSession } from '../../authHelper';

export async function GET() {
    const session = await getWorkspaceSession();

    if (!session) {
        return NextResponse.json({
            authenticated: false,
            user: null,
            permissions: null
        });
    }

    return NextResponse.json({
        authenticated: true,
        user: session.member,
        permissions: session.permissions
    });
}
