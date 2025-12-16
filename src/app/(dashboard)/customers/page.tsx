'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Customer } from '@/types/database';
import { CustomersResponse } from '@/app/api/customers/route';
import { CustomerSearch, CustomerCard } from '@/components/customers';
import { Button } from '@/components/ui/button';
import { RefreshCw, Users } from 'lucide-react';

// Alphabet quick-jump index component
function AlphabetIndex({
  letters,
  onLetterClick,
}: {
  letters: string[];
  onLetterClick: (letter: string) => void;
}) {
  return (
    <div className="fixed right-1 top-1/2 -translate-y-1/2 flex flex-col items-center z-20 lg:hidden">
      {letters.map((letter) => (
        <button
          key={letter}
          onClick={() => onLetterClick(letter)}
          className="w-6 h-5 text-[10px] font-semibold text-navy-600 hover:bg-navy-100 rounded flex items-center justify-center"
        >
          {letter}
        </button>
      ))}
    </div>
  );
}

export default function CustomersPage() {
  const [data, setData] = useState<CustomersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const fetchCustomers = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);

      // Fetch with alphabetical sorting when not searching
      const url = search
        ? `/api/customers?search=${encodeURIComponent(search)}`
        : '/api/customers?sort=alphabetical';

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch customers');

      const result: CustomersResponse = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, []);

  // Group customers alphabetically
  const groupedCustomers = useMemo(() => {
    if (!data?.customers || search) return null;

    const groups: Record<string, Customer[]> = {};

    for (const customer of data.customers) {
      const firstLetter = customer.name.trim().charAt(0).toUpperCase();
      const key = /^[A-Z]$/.test(firstLetter) ? firstLetter : '#';

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(customer);
    }

    // Sort keys alphabetically with # at the end
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (a === '#') return 1;
      if (b === '#') return -1;
      return a.localeCompare(b);
    });

    return { groups, sortedKeys };
  }, [data?.customers, search]);

  const handleLetterClick = (letter: string) => {
    const element = document.getElementById(`section-${letter}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (loading) {
    return (
      <div className="cl-page-container">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-navy-100 rounded w-48" />
          <div className="h-12 bg-navy-100 rounded" />
          <div className="h-24 bg-navy-100 rounded" />
          <div className="h-24 bg-navy-100 rounded" />
          <div className="h-24 bg-navy-100 rounded" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { customers, total } = data;
  const hasCustomers = customers.length > 0;

  return (
    <div className="cl-page-container space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="cl-heading-page">Customers</h1>
          <p className="text-sm text-navy-400">
            {total} customer{total !== 1 ? 's' : ''} on file
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fetchCustomers(true)}
          disabled={refreshing}
          aria-label="Refresh customers"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Search */}
      <CustomerSearch
        value={search}
        onChange={handleSearchChange}
      />

      {/* Customers List */}
      {hasCustomers ? (
        <>
          {/* Alphabet Index - only show when not searching */}
          {!search && groupedCustomers && (
            <AlphabetIndex
              letters={groupedCustomers.sortedKeys}
              onLetterClick={handleLetterClick}
            />
          )}

          <div className="space-y-4 pr-7 lg:pr-0">
            {search || !groupedCustomers ? (
              // Flat list when searching
              <>
                <h2 className="cl-heading-section">
                  Search Results
                </h2>
                <div className="space-y-3">
                  {customers.map((customer) => (
                    <CustomerCard key={customer.id} customer={customer} />
                  ))}
                </div>
              </>
            ) : (
              // Grouped list with sticky headers
              groupedCustomers.sortedKeys.map((letter) => (
                <div key={letter} id={`section-${letter}`}>
                  {/* Sticky section header */}
                  <h2 className="sticky top-0 bg-navy-50 py-2 text-sm font-semibold text-navy-700 border-b border-navy-200 z-10 -mx-4 px-4 lg:-mx-6 lg:px-6">
                    {letter}
                  </h2>
                  <div className="space-y-3 pt-3">
                    {groupedCustomers.groups[letter].map((customer) => (
                      <CustomerCard key={customer.id} customer={customer} />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <div className="bg-white rounded-xl border border-navy-200 p-8 text-center">
          <Users className="w-12 h-12 text-navy-200 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-navy-800 mb-2">
            {search ? 'No customers found' : 'No customers yet'}
          </h3>
          <p className="text-navy-400">
            {search
              ? 'Try a different search term'
              : 'Customers will appear here after completing jobs'}
          </p>
        </div>
      )}
    </div>
  );
}
