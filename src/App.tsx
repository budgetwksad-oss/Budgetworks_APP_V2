import { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import { Login } from './pages/auth/Login';
import { Signup } from './pages/auth/Signup';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { CustomerPortal } from './pages/portals/CustomerPortal';
import { CrewPortal } from './pages/portals/CrewPortal';
import { AdminPortal } from './pages/portals/AdminPortal';
import { Home } from './pages/public/Home';
import { Services } from './pages/public/Services';
import { About } from './pages/public/About';
import { Contact } from './pages/public/Contact';
import { PublicQuoteForm } from './pages/public/PublicQuoteForm';
import { QuoteSuccess } from './pages/public/QuoteSuccess';
import { QuoteMagicLink } from './pages/public/QuoteMagicLink';
import { InvoiceMagicLink } from './pages/public/InvoiceMagicLink';
import { KeyboardShortcuts } from './components/ui/KeyboardShortcuts';

type AuthView = 'login' | 'signup' | 'forgot-password';
type PublicPage = 'home' | 'services' | 'about' | 'contact' | 'quote' | 'quote-success';

function App() {
  const { user, profile, loading } = useAuth();
  const [authView, setAuthView] = useState<AuthView>('login');
  const [publicPage, setPublicPage] = useState<PublicPage>('home');
  const [showAuth, setShowAuth] = useState(false);
  const [magicLinkToken, setMagicLinkToken] = useState<string | null>(null);
  const [invoiceToken, setInvoiceToken] = useState<string | null>(null);

  useEffect(() => {
    const pathname = window.location.pathname;
    if (pathname.startsWith('/q/')) {
      const token = pathname.split('/q/')[1];
      if (token) setMagicLinkToken(token);
    } else if (pathname.startsWith('/i/')) {
      const token = pathname.split('/i/')[1];
      if (token) setInvoiceToken(token);
    }
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
    const navigateTo = (page: PublicPage) => {
      setPublicPage(page);
      setMagicLinkToken(null);
    };
    const goToHome = () => {
      setPublicPage('home');
      setMagicLinkToken(null);
      setShowAuth(false);
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

    if (showAuth) {
      if (authView === 'signup') {
        return <Signup onSwitchToLogin={() => setAuthView('login')} />;
      }

      if (authView === 'forgot-password') {
        return <ForgotPassword onSwitchToLogin={() => setAuthView('login')} />;
      }

      return (
        <Login
          onSwitchToSignup={() => setAuthView('signup')}
          onSwitchToForgotPassword={() => setAuthView('forgot-password')}
        />
      );
    }

    switch (publicPage) {
      case 'services':
        return <Services onNavigate={navigateTo} onLogin={goToLogin} />;
      case 'about':
        return <About onNavigate={navigateTo} onLogin={goToLogin} />;
      case 'contact':
        return <Contact onNavigate={navigateTo} onLogin={goToLogin} />;
      case 'quote':
        return <PublicQuoteForm onNavigate={navigateTo} onLogin={goToLogin} onSignup={goToSignup} />;
      case 'quote-success':
        return <QuoteSuccess onNavigate={navigateTo} onLogin={goToLogin} />;
      default:
        return <Home onNavigate={navigateTo} onLogin={goToLogin} />;
    }
  }

  const renderPortal = () => {
    switch (profile.role) {
      case 'customer':
        return <CustomerPortal />;
      case 'crew':
        return <CrewPortal />;
      case 'admin':
        return <AdminPortal />;
      default:
        return (
          <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Role</h2>
              <p className="text-gray-600">Please contact support for assistance.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <>
      {renderPortal()}
      <KeyboardShortcuts />
    </>
  );
}

export default App;
