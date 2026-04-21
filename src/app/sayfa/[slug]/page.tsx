import { notFound } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import CustomPageView from '@/views/custom-page';

interface PageProps {
    params: {
        slug: string;
    };
}

export default async function CustomPage({ params }: PageProps) {
    const { slug } = await params;

    // Supabase Server Client oluştur
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll: () => cookieStore.getAll(),
                setAll: () => {}, // Server Component'lerde read-only
            },
        }
    );

    // Veritabanından veriyi çek
    const { data: pageData, error } = await supabase
        .from('custom_pages')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();

    // Veri yoksa veya aktif değilse 404 göster
    if (error || !pageData) {
        notFound();
    }

    return (
        <CustomPageView data={pageData} />
    );
}

// Meta etiketlerini ayarlama (SEO)
export async function generateMetadata({ params }: PageProps) {
    const { slug } = await params;

    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll: () => cookieStore.getAll(),
                setAll: () => {}, 
            },
        }
    );

    const { data } = await supabase
        .from('custom_pages')
        .select('title, description')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();

    if (!data) return { title: 'Sayfa Bulunamadı' };

    return {
        title: `${data.title} | HSD-MTU`,
        description: data.description ? data.description.substring(0, 160) : 'Huawei Student Developers MTU Özel Sayfası',
    };
}
