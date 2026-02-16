import { useState } from 'react';
import { X, Menu, ChevronDown, ChevronRight } from 'lucide-react';

export interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  badge?: number;
  children?: MenuItem[];
}

export interface MenuSection {
  title?: string;
  items: MenuItem[];
}

interface SidebarProps {
  sections: MenuSection[];
  activeItemId: string;
  logo?: React.ReactNode;
  onClose?: () => void;
}

export function Sidebar({ sections, activeItemId, logo, onClose }: SidebarProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const renderMenuItem = (item: MenuItem, depth: number = 0) => {
    const isActive = activeItemId === item.id;
    const isExpanded = expandedItems.has(item.id);
    const hasChildren = item.children && item.children.length > 0;

    return (
      <div key={item.id}>
        <button
          onClick={() => {
            if (hasChildren) {
              toggleExpanded(item.id);
            } else if (item.onClick) {
              item.onClick();
              onClose?.();
            }
          }}
          className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium transition-colors ${
            depth > 0 ? 'pl-8' : ''
          } ${
            isActive
              ? 'bg-orange-50 text-orange-600 border-r-2 border-orange-600'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-3">
            <item.icon className={`w-5 h-5 ${isActive ? 'text-orange-600' : 'text-gray-500'}`} />
            <span>{item.label}</span>
          </div>
          <div className="flex items-center gap-2">
            {item.badge !== undefined && item.badge > 0 && (
              <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            )}
            {hasChildren && (
              isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-400" />
              )
            )}
          </div>
        </button>
        {hasChildren && isExpanded && (
          <div className="bg-gray-50">
            {item.children!.map(child => renderMenuItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        {logo}
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        {sections.map((section, index) => (
          <div key={index} className="mb-6">
            {section.title && (
              <h3 className="px-4 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {section.title}
              </h3>
            )}
            <div className="space-y-1">
              {section.items.map(item => renderMenuItem(item))}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}

export function MobileSidebarOverlay({ isOpen, onClose, children }: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="fixed inset-y-0 left-0 w-64 z-50">
        {children}
      </div>
    </div>
  );
}

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
    >
      <Menu className="w-6 h-6 text-gray-700" />
    </button>
  );
}
