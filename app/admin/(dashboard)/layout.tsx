import './admin.css'
import AdminSidebar from './components/AdminSidebar'
import AdminAuthGuard from './components/AdminAuthGuard'

export const metadata = {
    title: 'HSDMTU Admin Panel',
    description: 'HSD Malatya Turgut Özal Topluluğu Yönetim Paneli',
    robots: { index: false, follow: false },
}

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <AdminAuthGuard>
            <div className="admin-shell">
                <AdminSidebar />
                <main className="admin-main">
                    {children}
                </main>
            </div>
        </AdminAuthGuard>
    )
}
