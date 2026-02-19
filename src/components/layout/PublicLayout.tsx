import { ReactNode } from 'react';
import { PublicNavbar } from './PublicNavbar';
import { Footer } from './Footer';

type PublicPage = 'home' | 'services' | 'about' | 'contact' | 'quote' | 'quote-success' | 'moving' | 'junk-removal' | 'light-demo';

interface PublicLayoutProps {
  children: ReactNode;
  currentPage: PublicPage;
  onNavigate: (page: PublicPage) => void;
  onLogin: () => void;
}

export function PublicLayout({ children, currentPage, onNavigate, onLogin }: PublicLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <PublicNavbar currentPage={currentPage} onNavigate={onNavigate} onLogin={onLogin} />
      <main className="flex-1">{children}</main>
      <Footer onNavigate={onNavigate} onLogin={onLogin} />
    </div>
  );
}
