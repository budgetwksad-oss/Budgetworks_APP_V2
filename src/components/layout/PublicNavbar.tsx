import { useState, useRef, useEffect } from 'react';
import { Menu, X, Truck, ChevronDown, Package, Zap } from 'lucide-react';

type PublicPage = 'home' | 'services' | 'about' | 'contact' | 'quote' | 'moving' | 'junk-removal' | 'light-demo';

interface PublicNavbarProps {
  currentPage: PublicPage;
  onNavigate: (page: PublicPage) => void;
  onLogin: () => void;
}

const serviceItems: { id: PublicPage; label: string; description: string; icon: React.ReactNode }[] = [
  {
    id: 'moving',
    label: 'Moving',
    description: 'Local & long-distance moving',
    icon: <Truck className="w-4 h-4 text-orange-500" />,
  },
  {
    id: 'junk-removal',
    label: 'Junk Removal',
    description: 'Fast, responsible hauling',
    icon: <Package className="w-4 h-4 text-orange-500" />,
  },
  {
    id: 'light-demo',
    label: 'Light Demo',
    description: 'Demolition & cleanouts',
    icon: <Zap className="w-4 h-4 text-orange-500" />,
  },
];

export function PublicNavbar({ currentPage, onNavigate, onLogin }: PublicNavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isServicesActive = ['services', 'moving', 'junk-removal', 'light-demo'].includes(currentPage);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setServicesOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div
            className="cursor-pointer"
            onClick={() => onNavigate('home')}
          >
            <img
              src="/Main_logo.webp"
              alt="BudgetWorks"
              className="h-16 w-auto object-contain"
            />
          </div>

          <div className="hidden md:flex items-center space-x-8">
            <button
              onClick={() => onNavigate('home')}
              className={`text-base font-medium transition-colors ${
                currentPage === 'home' ? 'text-orange-500' : 'text-gray-700 hover:text-orange-500'
              }`}
            >
              Home
            </button>

            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setServicesOpen(!servicesOpen)}
                className={`flex items-center gap-1 text-base font-medium transition-colors ${
                  isServicesActive ? 'text-orange-500' : 'text-gray-700 hover:text-orange-500'
                }`}
              >
                Services
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${servicesOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {servicesOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-64 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
                  <div className="p-1">
                    {serviceItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          onNavigate(item.id);
                          setServicesOpen(false);
                        }}
                        className={`w-full flex items-start gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                          currentPage === item.id ? 'bg-orange-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="mt-0.5">{item.icon}</div>
                        <div>
                          <p className={`font-medium text-sm ${currentPage === item.id ? 'text-orange-500' : 'text-gray-900'}`}>
                            {item.label}
                          </p>
                          <p className="text-xs text-gray-500">{item.description}</p>
                        </div>
                      </button>
                    ))}
                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <button
                        onClick={() => {
                          onNavigate('services');
                          setServicesOpen(false);
                        }}
                        className="w-full text-center px-4 py-2.5 text-sm font-medium text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                      >
                        View all services →
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => onNavigate('about')}
              className={`text-base font-medium transition-colors ${
                currentPage === 'about' ? 'text-orange-500' : 'text-gray-700 hover:text-orange-500'
              }`}
            >
              About
            </button>

            <button
              onClick={() => onNavigate('contact')}
              className={`text-base font-medium transition-colors ${
                currentPage === 'contact' ? 'text-orange-500' : 'text-gray-700 hover:text-orange-500'
              }`}
            >
              Contact
            </button>

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
          <div className="px-4 py-4 space-y-1">
            <button
              onClick={() => { onNavigate('home'); setMobileMenuOpen(false); }}
              className={`block w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
                currentPage === 'home' ? 'bg-orange-50 text-orange-500' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Home
            </button>

            <div>
              <button
                onClick={() => setMobileServicesOpen(!mobileServicesOpen)}
                className={`flex items-center justify-between w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
                  isServicesActive ? 'bg-orange-50 text-orange-500' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                Services
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${mobileServicesOpen ? 'rotate-180' : ''}`} />
              </button>

              {mobileServicesOpen && (
                <div className="ml-4 mt-1 space-y-1 border-l-2 border-orange-100 pl-4">
                  {serviceItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => { onNavigate(item.id); setMobileMenuOpen(false); setMobileServicesOpen(false); }}
                      className={`flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        currentPage === item.id ? 'bg-orange-50 text-orange-500' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {item.icon}
                      {item.label}
                    </button>
                  ))}
                  <button
                    onClick={() => { onNavigate('services'); setMobileMenuOpen(false); setMobileServicesOpen(false); }}
                    className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-orange-500 hover:bg-orange-50 transition-colors"
                  >
                    All services →
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => { onNavigate('about'); setMobileMenuOpen(false); }}
              className={`block w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
                currentPage === 'about' ? 'bg-orange-50 text-orange-500' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              About
            </button>

            <button
              onClick={() => { onNavigate('contact'); setMobileMenuOpen(false); }}
              className={`block w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
                currentPage === 'contact' ? 'bg-orange-50 text-orange-500' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Contact
            </button>

            <div className="pt-2">
              <button
                onClick={() => { onNavigate('quote'); setMobileMenuOpen(false); }}
                className="block w-full bg-orange-500 text-white px-4 py-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors text-center"
              >
                Get Quote
              </button>
            </div>
            <button
              onClick={() => { onLogin(); setMobileMenuOpen(false); }}
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
