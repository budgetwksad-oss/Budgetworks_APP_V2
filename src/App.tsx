import { useState, useEffect, useCallback } from 'react';
import { Home } from './pages/public/Home';
import { Services } from './pages/public/Services';
import { About } from './pages/public/About';
import { Contact } from './pages/public/Contact';
import { QuoteWizard } from './pages/public/QuoteWizard';
import { QuoteSuccess } from './pages/public/QuoteSuccess';
import { Moving } from './pages/public/Moving';
import { JunkRemoval } from './pages/public/JunkRemoval';
import { LightDemo } from './pages/public/LightDemo';
import { TermsOfService } from './pages/public/TermsOfService';
import { PrivacyPolicy } from './pages/public/PrivacyPolicy';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { PublicPage } from './types/public';

function pathnameToPage(pathname: string): PublicPage | null {
  switch (pathname) {
    case '/': return 'home';
    case '/services': return 'services';
    case '/about': return 'about';
    case '/contact': return 'contact';
    case '/quote': return 'quote';
    case '/quote-success': return 'quote-success';
    case '/moving': return 'moving';
    case '/junk-removal': return 'junk-removal';
    case '/light-demo': return 'light-demo';
    case '/terms': return 'terms';
    case '/privacy': return 'privacy';
    default: return null;
  }
}

function App() {
  const [publicPage, setPublicPage] = useState<PublicPage>(() => {
    const page = pathnameToPage(window.location.pathname);
    return page ?? 'home';
  });

  const navigate = useCallback((path: string) => {
    window.history.pushState({}, '', path);
    const page = pathnameToPage(path);
    if (page) setPublicPage(page);
  }, []);

  const navigateTo = useCallback((page: PublicPage) => {
    const pathMap: Record<PublicPage, string> = {
      home: '/',
      services: '/services',
      about: '/about',
      contact: '/contact',
      quote: '/quote',
      'quote-success': '/quote-success',
      moving: '/moving',
      'junk-removal': '/junk-removal',
      'light-demo': '/light-demo',
      terms: '/terms',
      privacy: '/privacy',
    };
    const path = pathMap[page] ?? '/';
    window.history.pushState({}, '', path);
    setPublicPage(page);
  }, []);

  useEffect(() => {
    const onPopState = () => {
      const page = pathnameToPage(window.location.pathname);
      if (page) setPublicPage(page);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  switch (publicPage) {
    case 'moving':
      return <Moving onNavigate={navigateTo} />;
    case 'junk-removal':
      return <JunkRemoval onNavigate={navigateTo} />;
    case 'light-demo':
      return <LightDemo onNavigate={navigateTo} />;
    case 'services':
      return <Services onNavigate={navigateTo} />;
    case 'about':
      return <About onNavigate={navigateTo} />;
    case 'contact':
      return <Contact onNavigate={navigateTo} />;
    case 'quote':
      return <QuoteWizard onNavigate={navigateTo} />;
    case 'quote-success':
      return <QuoteSuccess onNavigate={navigateTo} />;
    case 'terms':
      return <TermsOfService onNavigate={navigateTo} />;
    case 'privacy':
      return <PrivacyPolicy onNavigate={navigateTo} />;
    default:
      return <Home onNavigate={navigateTo} />;
  }
}

function AppWithBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

export default AppWithBoundary;
