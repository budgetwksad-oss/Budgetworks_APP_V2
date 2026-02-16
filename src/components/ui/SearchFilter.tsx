import { useState } from 'react';
import { Search, Filter, X, ChevronDown } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';

export interface FilterOption {
  id: string;
  label: string;
  options: Array<{ value: string; label: string }>;
}

interface SearchFilterProps {
  searchPlaceholder?: string;
  filterOptions?: FilterOption[];
  onSearchChange: (search: string) => void;
  onFilterChange: (filters: Record<string, string>) => void;
}

export function SearchFilter({
  searchPlaceholder = 'Search...',
  filterOptions = [],
  onSearchChange,
  onFilterChange
}: SearchFilterProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    onSearchChange(value);
  };

  const handleFilterChange = (filterId: string, value: string) => {
    const newFilters = { ...activeFilters };
    if (value === '') {
      delete newFilters[filterId];
    } else {
      newFilters[filterId] = value;
    }
    setActiveFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearAllFilters = () => {
    setActiveFilters({});
    setSearchTerm('');
    onSearchChange('');
    onFilterChange({});
  };

  const activeFilterCount = Object.keys(activeFilters).length;
  const hasActiveSearch = searchTerm.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-10 pr-10"
          />
          {hasActiveSearch && (
            <button
              onClick={() => handleSearchChange('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {filterOptions.length > 0 && (
          <Button
            variant="secondary"
            onClick={() => setShowFilters(!showFilters)}
            className="relative"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-2 bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </Button>
        )}

        {(activeFilterCount > 0 || hasActiveSearch) && (
          <Button variant="ghost" onClick={clearAllFilters}>
            <X className="w-4 h-4 mr-2" />
            Clear All
          </Button>
        )}
      </div>

      {showFilters && filterOptions.length > 0 && (
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filterOptions.map((filter) => (
              <div key={filter.id}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {filter.label}
                </label>
                <select
                  value={activeFilters[filter.id] || ''}
                  onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All</option>
                  {filter.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {(activeFilterCount > 0 || hasActiveSearch) && (
        <div className="flex items-center gap-2 flex-wrap">
          {hasActiveSearch && (
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
              <span>Search: "{searchTerm}"</span>
              <button
                onClick={() => handleSearchChange('')}
                className="hover:bg-blue-200 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          {Object.entries(activeFilters).map(([filterId, value]) => {
            const filter = filterOptions.find(f => f.id === filterId);
            const option = filter?.options.find(o => o.value === value);
            if (!filter || !option) return null;

            return (
              <div
                key={filterId}
                className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
              >
                <span>{filter.label}: {option.label}</span>
                <button
                  onClick={() => handleFilterChange(filterId, '')}
                  className="hover:bg-gray-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
