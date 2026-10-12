import { NextResponse } from 'next/server';
import { WorkspaceRepository } from '@/shared/api/workspaceRepository';
import { getWorkspaceSession } from '../authHelper';

export async function GET() {
    try {
        const settings = await WorkspaceRepository.getSecuritySettings();
        const projects = await WorkspaceRepository.getCommunityProjects();
        return NextResponse.json({
            projects,
            is_enabled: settings.showcase_projects_enabled !== false
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Projeler alınamadı.' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getWorkspaceSession();
        if (!session) {
            return NextResponse.json({ error: 'Proje eklemek için oturum açmalısınız.' }, { status: 401 });
        }

        const body = await req.json();
        const { title, description, github_url, demo_url, tech_stack, contributors } = body;

        if (!title || !description) {
            return NextResponse.json({ error: 'Proje adı ve açıklama zorunludur.' }, { status: 400 });
        }

        const project = await WorkspaceRepository.createCommunityProject({
            title,
            description,
            github_url: github_url || undefined,
            demo_url: demo_url || undefined,
            tech_stack: Array.isArray(tech_stack) ? tech_stack : (tech_stack ? tech_stack.split(',').map((s: string) => s.trim()) : []),
            contributors: Array.isArray(contributors) ? contributors : (contributors ? contributors.split(',').map((s: string) => s.trim()) : [session.member.display_name]),
            is_active: true
        });

        return NextResponse.json({ success: true, project });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Proje eklenemedi.' }, { status: 500 });
    }
}
