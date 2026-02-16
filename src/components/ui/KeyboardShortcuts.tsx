import { useEffect, useState } from 'react';
import { X, Keyboard, Command } from 'lucide-react';

interface Shortcut {
  keys: string[];
  description: string;
  category: string;
}

const shortcuts: Shortcut[] = [
  {
    keys: ['⌘', 'K'],
    description: 'Open global search',
    category: 'Navigation'
  },
  {
    keys: ['ESC'],
    description: 'Close modals and dialogs',
    category: 'Navigation'
  },
  {
    keys: ['?'],
    description: 'Show keyboard shortcuts',
    category: 'Help'
  },
  {
    keys: ['Tab'],
    description: 'Navigate between form fields',
    category: 'Forms'
  },
  {
    keys: ['Enter'],
    description: 'Submit forms or confirm actions',
    category: 'Forms'
  },
  {
    keys: ['↑', '↓'],
    description: 'Navigate search results',
    category: 'Search'
  },
  {
    keys: ['Enter'],
    description: 'Select search result',
    category: 'Search'
  }
];

export function KeyboardShortcuts() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          setIsOpen(true);
        }
      }

      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const categories = Array.from(new Set(shortcuts.map(s => s.category)));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Keyboard className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Keyboard Shortcuts</h2>
              <p className="text-sm text-gray-600">Master these shortcuts to work faster</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {categories.map(category => (
            <div key={category} className="mb-6 last:mb-0">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                {category}
              </h3>
              <div className="space-y-3">
                {shortcuts
                  .filter(s => s.category === category)
                  .map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <span className="text-gray-700">{shortcut.description}</span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, i) => (
                          <div key={i} className="flex items-center">
                            {i > 0 && (
                              <span className="text-gray-400 mx-1">+</span>
                            )}
                            <kbd className="px-3 py-1.5 text-sm font-semibold text-gray-900 bg-white border border-gray-300 rounded shadow-sm min-w-[2.5rem] text-center">
                              {key === '⌘' ? (
                                <Command className="w-4 h-4 inline" />
                              ) : (
                                key
                              )}
                            </kbd>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-600">
            Press <kbd className="px-2 py-1 text-xs font-semibold bg-white border border-gray-300 rounded">?</kbd> to toggle this dialog
          </p>
        </div>
      </div>
    </div>
  );
}
