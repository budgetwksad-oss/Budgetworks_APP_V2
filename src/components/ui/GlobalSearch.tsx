import { useState, useEffect, useRef } from 'react';
import { Search, X, User, Briefcase, FileText, DollarSign, Users as UsersIcon, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface SearchResult {
  id: string;
  type: 'customer' | 'job' | 'quote' | 'invoice' | 'crew';
  title: string;
  subtitle: string;
  metadata?: string;
  onClick: () => void;
}

interface GlobalSearchProps {
  onNavigate?: (page: string, id?: string) => void;
}

export function GlobalSearch({ onNavigate }: GlobalSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }

      if (e.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
        setResults([]);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const debounce = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(debounce);
  }, [query]);

  const performSearch = async (searchQuery: string) => {
    setLoading(true);
    const searchResults: SearchResult[] = [];

    try {
      const lowerQuery = searchQuery.toLowerCase();

      const [customersRes, jobsRes, quotesRes, invoicesRes, crewRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, email, phone, role')
          .or(`full_name.ilike.%${lowerQuery}%,email.ilike.%${lowerQuery}%,phone.ilike.%${lowerQuery}%`)
          .eq('role', 'customer')
          .limit(5),

        supabase
          .from('jobs')
          .select(`
            id,
            status,
            scheduled_date,
            profiles!customer_id (full_name),
            service_requests!service_request_id (service_type, location_address)
          `)
          .limit(5),

        supabase
          .from('quotes')
          .select(`
            id,
            quote_number,
            total_amount,
            status,
            profiles!customer_id (full_name)
          `)
          .or(`quote_number.ilike.%${lowerQuery}%`)
          .limit(5),

        supabase
          .from('invoices')
          .select(`
            id,
            invoice_number,
            total,
            status,
            profiles!customer_id (full_name)
          `)
          .or(`invoice_number.ilike.%${lowerQuery}%`)
          .limit(5),

        supabase
          .from('profiles')
          .select('id, full_name, email, phone, role')
          .or(`full_name.ilike.%${lowerQuery}%,email.ilike.%${lowerQuery}%`)
          .eq('role', 'crew')
          .limit(5)
      ]);

      if (customersRes.data) {
        customersRes.data.forEach(customer => {
          searchResults.push({
            id: customer.id,
            type: 'customer',
            title: customer.full_name || 'Unknown Customer',
            subtitle: customer.email || '',
            metadata: customer.phone || '',
            onClick: () => {
              onNavigate?.('customers', customer.id);
              setIsOpen(false);
              setQuery('');
            }
          });
        });
      }

      if (jobsRes.data) {
        jobsRes.data.forEach((job: any) => {
          const customerName = job.profiles?.full_name || 'Unknown';
          const serviceType = job.service_requests?.service_type || 'Service';
          const location = job.service_requests?.location_address || '';

          if (
            customerName.toLowerCase().includes(lowerQuery) ||
            serviceType.toLowerCase().includes(lowerQuery) ||
            location.toLowerCase().includes(lowerQuery)
          ) {
            searchResults.push({
              id: job.id,
              type: 'job',
              title: `${serviceType.replace('_', ' ')} - ${customerName}`,
              subtitle: job.status,
              metadata: job.scheduled_date || '',
              onClick: () => {
                onNavigate?.('jobs', job.id);
                setIsOpen(false);
                setQuery('');
              }
            });
          }
        });
      }

      if (quotesRes.data) {
        quotesRes.data.forEach((quote: any) => {
          searchResults.push({
            id: quote.id,
            type: 'quote',
            title: quote.quote_number,
            subtitle: `${quote.profiles?.full_name || 'Unknown'} - $${quote.total_amount}`,
            metadata: quote.status,
            onClick: () => {
              onNavigate?.('quotes', quote.id);
              setIsOpen(false);
              setQuery('');
            }
          });
        });
      }

      if (invoicesRes.data) {
        invoicesRes.data.forEach((invoice: any) => {
          searchResults.push({
            id: invoice.id,
            type: 'invoice',
            title: invoice.invoice_number,
            subtitle: `${invoice.profiles?.full_name || 'Unknown'} - $${invoice.total}`,
            metadata: invoice.status,
            onClick: () => {
              onNavigate?.('invoices', invoice.id);
              setIsOpen(false);
              setQuery('');
            }
          });
        });
      }

      if (crewRes.data) {
        crewRes.data.forEach(crew => {
          searchResults.push({
            id: crew.id,
            type: 'crew',
            title: crew.full_name || 'Unknown Crew Member',
            subtitle: crew.email || '',
            metadata: crew.phone || '',
            onClick: () => {
              onNavigate?.('crew', crew.id);
              setIsOpen(false);
              setQuery('');
            }
          });
        });
      }

      setResults(searchResults);
      setSelectedIndex(0);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      results[selectedIndex].onClick();
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'customer':
        return <User className="w-5 h-5 text-blue-600" />;
      case 'job':
        return <Briefcase className="w-5 h-5 text-green-600" />;
      case 'quote':
        return <FileText className="w-5 h-5 text-orange-600" />;
      case 'invoice':
        return <DollarSign className="w-5 h-5 text-red-600" />;
      case 'crew':
        return <UsersIcon className="w-5 h-5 text-purple-600" />;
      default:
        return <Search className="w-5 h-5 text-gray-600" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'customer':
        return 'Customer';
      case 'job':
        return 'Job';
      case 'quote':
        return 'Quote';
      case 'invoice':
        return 'Invoice';
      case 'crew':
        return 'Crew';
      default:
        return type;
    }
  };

  return (
    <>
      <button
        onClick={() => {
          setIsOpen(true);
          setTimeout(() => inputRef.current?.focus(), 100);
        }}
        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
      >
        <Search className="w-4 h-4" />
        <span>Search...</span>
        <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold text-gray-600 bg-white border border-gray-300 rounded">
          <span>⌘K</span>
        </kbd>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center pt-20">
          <div
            ref={searchRef}
            className="bg-white rounded-lg shadow-2xl w-full max-w-2xl mx-4 overflow-hidden animate-in fade-in duration-200"
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
              <Search className="w-5 h-5 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search customers, jobs, quotes, invoices..."
                className="flex-1 outline-none text-gray-900 placeholder-gray-400"
              />
              {query && (
                <button
                  onClick={() => {
                    setQuery('');
                    setResults([]);
                    inputRef.current?.focus();
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-sm text-gray-500">Searching...</p>
                </div>
              ) : results.length > 0 ? (
                <div className="py-2">
                  {results.map((result, index) => (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={result.onClick}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                        index === selectedIndex
                          ? 'bg-blue-50 border-l-4 border-blue-600'
                          : 'hover:bg-gray-50 border-l-4 border-transparent'
                      }`}
                    >
                      <div className="flex-shrink-0">
                        {getIcon(result.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900 truncate">
                            {result.title}
                          </span>
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                            {getTypeLabel(result.type)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 truncate">{result.subtitle}</p>
                        {result.metadata && (
                          <p className="text-xs text-gray-400 mt-1">{result.metadata}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : query.length >= 2 ? (
                <div className="p-8 text-center">
                  <Search className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">No results found for "{query}"</p>
                </div>
              ) : (
                <div className="p-8 text-center">
                  <Clock className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">Start typing to search...</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Search across customers, jobs, quotes, invoices, and crew
                  </p>
                </div>
              )}
            </div>

            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <kbd className="px-2 py-0.5 bg-white border border-gray-300 rounded">↑↓</kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-2 py-0.5 bg-white border border-gray-300 rounded">↵</kbd>
                  Select
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-2 py-0.5 bg-white border border-gray-300 rounded">ESC</kbd>
                  Close
                </span>
              </div>
              <span>{results.length} result{results.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
