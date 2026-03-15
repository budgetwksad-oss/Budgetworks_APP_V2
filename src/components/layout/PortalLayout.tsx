import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Truck, LogOut } from 'lucide-react';
import { Sidebar, MobileSidebarOverlay, MobileMenuButton, MenuSection } from './Sidebar';
import { NotificationCenter } from '../ui/NotificationCenter';

interface PortalLayoutProps {
  children: React.ReactNode;
  portalName: string;
  sidebarSections?: MenuSection[];
  activeItemId?: string;
  breadcrumbs?: { label: string; onClick?: () => void }[];
}

export function PortalLayout({
  children,
  portalName,
  sidebarSections,
  activeItemId,
  breadcrumbs,
}: PortalLayoutProps) {
  const { profile, signOut } = useAuth();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const logo = (
    <div className="flex items-center gap-3">
      <div className="bg-orange-600 p-2 rounded-lg">
        <Truck className="w-6 h-6 text-white" />
      </div>
      <div>
        <h1 className="text-lg font-bold text-gray-900">BudgetWorks</h1>
      </div>
    </div>
  );

  if (sidebarSections) {
    return (
      <div className="flex h-screen bg-gray-50">
        <div className="hidden lg:block w-64 flex-shrink-0">
          <Sidebar
            sections={sidebarSections}
            activeItemId={activeItemId || ''}
            logo={logo}
          />
        </div>

        <MobileSidebarOverlay
          isOpen={isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
        >
          <Sidebar
            sections={sidebarSections}
            activeItemId={activeItemId || ''}
            logo={logo}
            onClose={() => setIsMobileSidebarOpen(false)}
          />
        </MobileSidebarOverlay>

        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <MobileMenuButton onClick={() => setIsMobileSidebarOpen(true)} />
                {breadcrumbs && breadcrumbs.length > 0 ? (
                  <nav className="flex items-center gap-2 text-sm">
                    {breadcrumbs.map((crumb, index) => (
                      <div key={index} className="flex items-center gap-2">
                        {index > 0 && <span className="text-gray-400">/</span>}
                        {crumb.onClick ? (
                          <button
                            onClick={crumb.onClick}
                            className="text-gray-600 hover:text-gray-900 font-medium"
                          >
                            {crumb.label}
                          </button>
                        ) : (
                          <span className="text-gray-900 font-semibold">{crumb.label}</span>
                        )}
                      </div>
                    ))}
                  </nav>
                ) : (
                  <h2 className="text-xl font-semibold text-gray-900">{portalName}</h2>
                )}
              </div>

              <div className="flex items-center gap-4">
                <NotificationCenter />
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">{profile?.full_name}</p>
                  <p className="text-xs text-gray-500 capitalize">{profile?.role}</p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={signOut}
                  className="flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                </Button>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-black text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="bg-orange-600 p-2 rounded-lg">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">BudgetWorks</h1>
                <p className="text-xs text-gray-400">{portalName}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium">{profile?.full_name}</p>
                <p className="text-xs text-gray-400 capitalize">{profile?.role}</p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={signOut}
                className="flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
