import { Truck, Mail, Phone, MapPin } from 'lucide-react';
import { PublicPage } from '../../types/public';


interface FooterProps {
  onNavigate: (page: PublicPage) => void;
  onLogin: () => void;
}

export function Footer({ onNavigate, onLogin }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-orange-500 p-2 rounded-lg">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold">
                Budget<span className="text-orange-500">Works</span>
              </h3>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              Fast, reliable moving, hauling, and junk removal services in Halifax and Nova Scotia.
              Quick quotes, honest rates, and dependable service.
            </p>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => onNavigate('home')}
                  className="text-gray-400 hover:text-orange-500 transition-colors text-sm"
                >
                  Home
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('services')}
                  className="text-gray-400 hover:text-orange-500 transition-colors text-sm"
                >
                  Services
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('about')}
                  className="text-gray-400 hover:text-orange-500 transition-colors text-sm"
                >
                  About
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('contact')}
                  className="text-gray-400 hover:text-orange-500 transition-colors text-sm"
                >
                  Contact
                </button>
              </li>
              <li>
                <button
                  onClick={onLogin}
                  className="text-gray-400 hover:text-orange-500 transition-colors text-sm"
                >
                  Customer Login
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">Our Services</h4>
            <ul className="space-y-2">
              <li className="text-gray-400 text-sm">Residential Moving</li>
              <li className="text-gray-400 text-sm">Commercial Moving</li>
              <li className="text-gray-400 text-sm">Junk Removal</li>
              <li className="text-gray-400 text-sm">Estate Cleanouts</li>
              <li className="text-gray-400 text-sm">Light Demolition</li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">Contact Info</h4>
            <ul className="space-y-3">
              <li className="flex items-start space-x-3 text-gray-400 text-sm">
                <MapPin className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <span>Halifax, Nova Scotia</span>
              </li>
              <li className="flex items-start space-x-3 text-gray-400 text-sm">
                <Phone className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <a href="tel:+19025551234" className="hover:text-orange-500 transition-colors">
                  (902) 555-1234
                </a>
              </li>
              <li className="flex items-start space-x-3 text-gray-400 text-sm">
                <Mail className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <a
                  href="mailto:info@budgetworks.ca"
                  className="hover:text-orange-500 transition-colors"
                >
                  info@budgetworks.ca
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-gray-400 text-sm">
            &copy; {currentYear} BudgetWorks Halifax. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => onNavigate('terms')}
              className="text-gray-400 hover:text-orange-500 transition-colors text-sm"
            >
              Terms of Service
            </button>
            <button
              onClick={() => onNavigate('privacy')}
              className="text-gray-400 hover:text-orange-500 transition-colors text-sm"
            >
              Privacy Policy
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
