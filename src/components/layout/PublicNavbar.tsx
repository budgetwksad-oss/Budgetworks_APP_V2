import { useState } from 'react';
import { Menu, X, Truck } from 'lucide-react';

type PublicPage = 'home' | 'services' | 'about' | 'contact' | 'quote';

interface PublicNavbarProps {
  currentPage: PublicPage;
  onNavigate: (page: PublicPage) => void;
  onLogin: () => void;
}

export function PublicNavbar({ currentPage, onNavigate, onLogin }: PublicNavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'home' as PublicPage, label: 'Home' },
    { id: 'services' as PublicPage, label: 'Services' },
    { id: 'about' as PublicPage, label: 'About' },
    { id: 'contact' as PublicPage, label: 'Contact' },
  ];

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div
            className="flex items-center space-x-3 cursor-pointer group"
            onClick={() => onNavigate('home')}
          >
            <div className="bg-orange-500 p-2 rounded-lg group-hover:bg-orange-600 transition-colors">
              <Truck className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-black">
                Budget<span className="text-orange-500">Works</span>
              </h1>
              <p className="text-xs text-gray-600 -mt-1">Halifax Moving & Hauling</p>
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`text-base font-medium transition-colors ${
                  currentPage === item.id
                    ? 'text-orange-500'
                    : 'text-gray-700 hover:text-orange-500'
                }`}
              >
                {item.label}
              </button>
            ))}
            <button
              onClick={() => onNavigate('quote')}
              className="bg-orange-500 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-orange-600 transition-all transform hover:scale-105 shadow-lg shadow-orange-500/30"
            >
              Get Quote
            </button>
            <button
              onClick={onLogin}
              className="text-gray-700 hover:text-orange-500 font-medium transition-colors"
            >
              Login
            </button>
          </div>

          <button
            className="md:hidden text-gray-700"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200 shadow-lg">
          <div className="px-4 py-4 space-y-3">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`block w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
                  currentPage === item.id
                    ? 'bg-orange-50 text-orange-500'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {item.label}
              </button>
            ))}
            <button
              onClick={() => {
                onNavigate('quote');
                setMobileMenuOpen(false);
              }}
              className="block w-full bg-orange-500 text-white px-4 py-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors text-center"
            >
              Get Quote
            </button>
            <button
              onClick={() => {
                onLogin();
                setMobileMenuOpen(false);
              }}
              className="block w-full text-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors text-center"
            >
              Login
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
