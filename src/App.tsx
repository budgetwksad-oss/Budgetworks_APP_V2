import { useState } from 'react';
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
import { KeyboardShortcuts } from './components/ui/KeyboardShortcuts';

type AuthView = 'login' | 'signup' | 'forgot-password';
type PublicPage = 'home' | 'services' | 'about' | 'contact' | 'quote' | 'quote-success';

function App() {
  const { user, profile, loading } = useAuth();
  const [authView, setAuthView] = useState<AuthView>('login');
  const [publicPage, setPublicPage] = useState<PublicPage>('home');
  const [showAuth, setShowAuth] = useState(false);

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

  if (!user || !profile) {
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

    const navigateTo = (page: PublicPage) => setPublicPage(page);
    const goToLogin = () => {
      setAuthView('login');
      setShowAuth(true);
    };
    const goToSignup = () => {
      setAuthView('signup');
      setShowAuth(true);
    };

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
