'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

// --- Types ---
interface MediumItem {
    title: string;
    pubDate: string;
    link: string;
    guid: string;
    author: string;
    thumbnail: string;
    description: string;
    content: string;
    categories: string[];
}

interface MediumFeed {
    status: string;
    feed: {
        url: string;
        title: string;
        link: string;
        author: string;
        description: string;
        image: string;
    };
    items: MediumItem[];
}

// --- Icons ---
const Icons = {
    MediumLogo: () => (
        <svg viewBox="0 0 1043.63 592.71" className="w-8 h-8 text-black fill-current">
            <g data-name="Layer 2">
                <g data-name="Layer 1">
                    <path d="M588.67 296.36c0 163.67-131.78 296.35-294.33 296.35S0 460 0 296.36 131.78 0 294.34 0s294.33 132.69 294.33 296.36M911.56 296.36c0 154.06-65.89 279-147.17 279s-147.17-124.94-147.17-279 65.88-279 147.16-279 147.17 124.9 147.17 279M1043.63 296.36c0 138-23.17 249.94-51.76 249.94s-51.75-111.91-51.75-249.94 23.17-249.94 51.75-249.94 51.76 111.9 51.76 249.94" />
                </g>
            </g>
        </svg>
    ),
    ArrowUpRight: () => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <line x1="7" y1="17" x2="17" y2="7" />
            <polyline points="7 7 17 7 17 17" />
        </svg>
    )
};

const RSS_URL = 'https://medium.com/feed/@huaweidevgroups44';
const API_URL = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(RSS_URL)}`;

export default function Articles() {
    const [articles, setArticles] = useState<MediumItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchArticles = async () => {
            try {
                const response = await fetch(API_URL);
                const data: MediumFeed = await response.json();

                if (data.status === 'ok') {
                    setArticles(data.items.slice(0, 3));
                } else {
                    throw new Error('Failed to fetch Medium feed');
                }
            } catch (err) {
                console.error("Error fetching articles:", err);
                setError('Yazılar yüklenirken bir hata oluştu.');
            } finally {
                setLoading(false);
            }
        };

        fetchArticles();
    }, []);

    const getArticleImage = (item: MediumItem) => {
        if (item.thumbnail && item.thumbnail.startsWith('http')) return item.thumbnail;
        const div = document.createElement('div');
        div.innerHTML = item.content;
        const img = div.querySelector('img');
        return img ? img.src : 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=2070&auto=format&fit=crop';
    };

    const getSnippet = (htmlContent: string) => {
        const div = document.createElement('div');
        div.innerHTML = htmlContent;
        const text = div.textContent || div.innerText || '';
        return text.slice(0, 120) + '...';
    };

    const calculateReadTime = (content: string) => {
        const wordsPerMinute = 200;
        const div = document.createElement('div');
        div.innerHTML = content;
        const text = div.textContent || div.innerText || '';
        const noOfWords = text.split(/\s/g).length;
        const minutes = Math.ceil(noOfWords / wordsPerMinute);
        return `${minutes} min read`;
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
    };

    return (
        <section id="yazilarimiz" className="relative py-24 bg-white text-black font-sans border-t border-gray-100">
            <div className="container mx-auto px-4 max-w-6xl">

                {/* Header */}
                <div className="flex items-center gap-4 mb-12 pb-6 border-b border-gray-200">
                    <div className="p-3 bg-gray-100 rounded-full">
                        <Icons.MediumLogo />
                    </div>
                    <div>
                        <h2 className="text-3xl font-serif font-bold tracking-tight text-gray-900">
                            Yazılarımız
                        </h2>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-black"></div>
                    </div>
                ) : error ? (
                    <div className="text-center text-red-500 py-10">
                        {error}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {articles.map((article, index) => {
                            const imageUrl = getArticleImage(article);
                            const snippet = getSnippet(article.content);
                            const readTime = calculateReadTime(article.content);

                            return (
                                <motion.a
                                    key={article.guid}
                                    href={article.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: index * 0.1 }}
                                    className="group flex flex-col h-full bg-white rounded-xl overflow-hidden hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 border border-transparent hover:border-gray-100"
                                >
                                    {/* Image */}
                                    <div className="aspect-[1.6/1] w-full overflow-hidden relative">
                                        <img
                                            src={imageUrl}
                                            alt={article.title}
                                            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />
                                    </div>

                                    {/* Content */}
                                    <div className="flex flex-col flex-1 p-6">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="w-6 h-6 rounded-full bg-gray-100 overflow-hidden ring-1 ring-gray-100">
                                                <img src="/images/hsd-white-logo.jpg" alt={article.author} className="w-full h-full object-cover" />
                                            </div>
                                            <span className="text-xs font-semibold text-gray-900 uppercase tracking-wide">{article.author}</span>
                                        </div>

                                        <h3 className="text-xl font-bold font-serif leading-snug mb-3 text-gray-900 group-hover:text-gray-700 transition-colors">
                                            {article.title}
                                        </h3>

                                        <p className="text-gray-500 text-sm leading-relaxed mb-6 line-clamp-3 font-serif">
                                            {snippet}
                                        </p>

                                        <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-100">
                                            <div className="flex items-center gap-3 text-xs text-gray-500 font-medium">
                                                <span>{formatDate(article.pubDate)}</span>
                                                <span className="w-1 h-1 rounded-full bg-gray-300" />
                                                <span>{readTime}</span>
                                            </div>
                                            <div className="text-gray-400 group-hover:text-black transition-colors transform group-hover:translate-x-1 duration-300">
                                                <Icons.ArrowUpRight />
                                            </div>
                                        </div>
                                    </div>
                                </motion.a>
                            );
                        })}
                    </div>
                )}

                {/* Bottom CTA */}
                <div className="mt-16 text-center">
                    <a
                        href={RSS_URL.replace('/feed', '')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-gray-300 text-gray-700 font-medium hover:border-black hover:text-black transition-all duration-300 text-sm"
                    >
                        Tüm Yazıları Oku
                        <Icons.ArrowUpRight />
                    </a>
                </div>
            </div>
        </section>
    );
}
