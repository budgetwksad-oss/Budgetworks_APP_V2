import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './contexts/AuthContext';
import { Login } from './pages/auth/Login';
import { Signup } from './pages/auth/Signup';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { ResetPassword } from './pages/auth/ResetPassword';
import { CustomerPortal } from './pages/portals/CustomerPortal';
import { Home } from './pages/public/Home';
import { Services } from './pages/public/Services';
import { About } from './pages/public/About';
import { Contact } from './pages/public/Contact';
import { QuoteWizard } from './pages/public/QuoteWizard';
import { QuoteSuccess } from './pages/public/QuoteSuccess';
import { QuoteMagicLink } from './pages/public/QuoteMagicLink';
import { InvoiceMagicLink } from './pages/public/InvoiceMagicLink';
import { Moving } from './pages/public/Moving';
import { JunkRemoval } from './pages/public/JunkRemoval';
import { LightDemo } from './pages/public/LightDemo';
import { TermsOfService } from './pages/public/TermsOfService';
import { PrivacyPolicy } from './pages/public/PrivacyPolicy';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { PublicPage } from './types/public';

type AuthView = 'login' | 'signup' | 'forgot-password' | 'reset-password';

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
  const { user, profile, loading } = useAuth();
  const [authView, setAuthView] = useState<AuthView>(() => {
    if (window.location.pathname === '/reset-password') return 'reset-password';
    return 'login';
  });
  const [publicPage, setPublicPage] = useState<PublicPage>(() => {
    const page = pathnameToPage(window.location.pathname);
    return page ?? 'home';
  });
  const [showAuth, setShowAuth] = useState(false);
  const [magicLinkToken, setMagicLinkToken] = useState<string | null>(() => {
    const pathname = window.location.pathname;
    if (pathname.startsWith('/q/')) return pathname.split('/q/')[1] || null;
    return null;
  });
  const [invoiceToken, setInvoiceToken] = useState<string | null>(() => {
    const pathname = window.location.pathname;
    if (pathname.startsWith('/i/')) return pathname.split('/i/')[1] || null;
    return null;
  });

  const navigate = useCallback((path: string) => {
    window.history.pushState({}, '', path);
    if (path === '/reset-password') {
      setAuthView('reset-password');
      setShowAuth(true);
      return;
    }
    const page = pathnameToPage(path);
    if (page) {
      setPublicPage(page);
      setShowAuth(false);
      setMagicLinkToken(null);
    }
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
    setMagicLinkToken(null);
  }, []);

  useEffect(() => {
    const onPopState = () => {
      const pathname = window.location.pathname;
      if (pathname === '/reset-password') {
        setAuthView('reset-password');
        setShowAuth(true);
        return;
      }
      if (pathname.startsWith('/q/')) {
        const token = pathname.split('/q/')[1];
        if (token) { setMagicLinkToken(token); return; }
      }
      if (pathname.startsWith('/i/')) {
        const token = pathname.split('/i/')[1];
        if (token) { setInvoiceToken(token); return; }
      }
      const page = pathnameToPage(pathname);
      if (page) {
        setPublicPage(page);
        setShowAuth(false);
        setMagicLinkToken(null);
        setInvoiceToken(null);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white to-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (invoiceToken) {
    const goHome = () => {
      setInvoiceToken(null);
      setShowAuth(false);
      navigate('/');
    };
    const goLogin = () => {
      setInvoiceToken(null);
      setAuthView('login');
      setShowAuth(true);
    };
    return (
      <InvoiceMagicLink
        token={invoiceToken}
        onLogin={goLogin}
        onNavigateHome={goHome}
      />
    );
  }

  if (!user || !profile) {
    const goToLogin = () => {
      setAuthView('login');
      setShowAuth(true);
      setMagicLinkToken(null);
    };
    const goToSignup = () => {
      setAuthView('signup');
      setShowAuth(true);
    };
    const goToHome = () => {
      setPublicPage('home');
      setMagicLinkToken(null);
      setShowAuth(false);
      navigate('/');
    };

    if (magicLinkToken) {
      return (
        <QuoteMagicLink
          token={magicLinkToken}
          onLogin={goToLogin}
          onNavigateHome={goToHome}
        />
      );
    }

    if (authView === 'reset-password') {
      return <ResetPassword onSwitchToLogin={() => { setAuthView('login'); navigate('/'); }} onGoHome={goToHome} />;
    }

    if (showAuth) {
      if (authView === 'signup') {
        return <Signup onSwitchToLogin={() => setAuthView('login')} onGoHome={goToHome} />;
      }

      if (authView === 'forgot-password') {
        return <ForgotPassword onSwitchToLogin={() => setAuthView('login')} onGoHome={goToHome} />;
      }

      return (
        <Login
          onSwitchToSignup={() => setAuthView('signup')}
          onSwitchToForgotPassword={() => setAuthView('forgot-password')}
          onGoHome={goToHome}
        />
      );
    }

    switch (publicPage) {
      case 'moving':
        return <Moving onNavigate={navigateTo} onLogin={goToLogin} />;
      case 'junk-removal':
        return <JunkRemoval onNavigate={navigateTo} onLogin={goToLogin} />;
      case 'light-demo':
        return <LightDemo onNavigate={navigateTo} onLogin={goToLogin} />;
      case 'services':
        return <Services onNavigate={navigateTo} onLogin={goToLogin} />;
      case 'about':
        return <About onNavigate={navigateTo} onLogin={goToLogin} />;
      case 'contact':
        return <Contact onNavigate={navigateTo} onLogin={goToLogin} />;
      case 'quote':
        return <QuoteWizard onNavigate={navigateTo} onLogin={goToLogin} onSignup={goToSignup} />;
      case 'quote-success':
        return <QuoteSuccess onNavigate={navigateTo} onLogin={goToLogin} />;
      case 'terms':
        return <TermsOfService onNavigate={navigateTo} onLogin={goToLogin} />;
      case 'privacy':
        return <PrivacyPolicy onNavigate={navigateTo} onLogin={goToLogin} />;
      default:
        return <Home onNavigate={navigateTo} onLogin={goToLogin} onSignup={goToSignup} />;
    }
  }

  const { signOut } = useAuth();

  const renderPortal = () => {
    if (profile.role === 'customer') {
      return <CustomerPortal />;
    }

    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10">
            <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0-6v2m0-6V5m6 14a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Customer Portal Only</h2>
            <p className="text-gray-600 mb-6">
              This app is for customers only. Admin and crew portals are available as separate applications.
            </p>
            <button
              onClick={signOut}
              className="w-full py-2.5 px-4 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <ErrorBoundary>
      {renderPortal()}
    </ErrorBoundary>
  );
}

export default App;
