import { NextResponse } from 'next/server';
import { WorkspaceRepository } from '@/shared/api/workspaceRepository';

export async function GET() {
    try {
        const settings = await WorkspaceRepository.getSecuritySettings();
        return NextResponse.json({
            settings: {
                kanban_view_enabled: settings?.kanban_view_enabled ?? true,
                rsvp_registration_enabled: settings?.rsvp_registration_enabled ?? true,
                rsvp_qr_enabled: settings?.rsvp_qr_enabled ?? true,
                showcase_projects_enabled: settings?.showcase_projects_enabled ?? false,
            }
        });
    } catch {
        return NextResponse.json({
            settings: {
                kanban_view_enabled: true,
                rsvp_registration_enabled: true,
                rsvp_qr_enabled: true,
                showcase_projects_enabled: false,
            }
        });
    }
}
