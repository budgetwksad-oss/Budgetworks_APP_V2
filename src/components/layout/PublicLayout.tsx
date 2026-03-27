import { ReactNode } from 'react';
import { PublicPage } from '../../types/public';
import { PublicNavbar } from './PublicNavbar';
import { Footer } from './Footer';


interface PublicLayoutProps {
  children: ReactNode;
  currentPage?: PublicPage;
  onNavigate?: (page: PublicPage) => void;
}

function noop() {}

export function PublicLayout({ children, currentPage = 'home', onNavigate = noop }: PublicLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <PublicNavbar currentPage={currentPage} onNavigate={onNavigate} />
      <main className="flex-1">{children}</main>
      <Footer onNavigate={onNavigate} />
    </div>
  );
}
