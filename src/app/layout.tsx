import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ôn thi AI — Phần I',
  description: 'Ôn thi AI design patterns, RAG, prompt engineering, agent architecture, observability & bảo mật',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="min-h-screen">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
            <a href="/" className="font-bold text-lg text-slate-800 hover:text-blue-600 transition-colors">
              Ôn thi AI
            </a>
            <nav className="flex items-center gap-4 text-sm">
              <a href="/exam" className="text-slate-600 hover:text-blue-600 transition-colors">Thi thử</a>
              <a href="/practice" className="text-slate-600 hover:text-blue-600 transition-colors">Luyện tập</a>
              <a href="/results" className="text-slate-600 hover:text-blue-600 transition-colors">Kết quả</a>
            </nav>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
