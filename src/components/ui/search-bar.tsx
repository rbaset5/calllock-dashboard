"use client";

import * as React from "react";
import { Mic, Search, X, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  city?: string | null;
}

interface SearchBarProps {
  className?: string;
  placeholder?: string;
}

export function SearchBar({ className, placeholder = "Search by name or city..." }: SearchBarProps) {
  const router = useRouter();
  const [isRecording, setIsRecording] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [results, setResults] = React.useState<Customer[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [showResults, setShowResults] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Debounce search
  React.useEffect(() => {
    if (!searchQuery.trim()) {
      setResults([]);
      setShowResults(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(`/api/customers?search=${encodeURIComponent(searchQuery)}`);
        if (response.ok) {
          const data = await response.json();
          setResults(data.customers || []);
          setShowResults(true);
        }
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Close results on click outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMicClick = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Speech recognition not supported in this browser");
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      return;
    }

    try {
      setIsRecording(true);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        alert("Speech recognition not supported");
        setIsRecording(false);
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSearchQuery(transcript);
        setIsRecording(false);
        stream.getTracks().forEach(track => track.stop());
      };

      recognition.onerror = () => {
        setIsRecording(false);
        stream.getTracks().forEach(track => track.stop());
      };

      recognition.onend = () => {
        setIsRecording(false);
        stream.getTracks().forEach(track => track.stop());
      };

      recognition.start();

      setTimeout(() => {
        if (isRecording) {
          recognition.stop();
        }
      }, 10000);

    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Could not access microphone. Please check permissions.");
      setIsRecording(false);
    }
  };

  const handleSelectCustomer = (customer: Customer) => {
    setShowResults(false);
    setSearchQuery("");
    router.push(`/customers/${customer.id}`);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setResults([]);
    setShowResults(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {/* Search Input */}
      <div className="relative flex items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
        <div className="pl-4">
          <Search size={18} className="text-muted-foreground" />
        </div>
        <input
          ref={inputRef}
          type="text"
          placeholder={isRecording ? "Listening..." : placeholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          className="flex-1 px-3 py-3 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground text-sm"
        />
        <div className="pr-2 flex items-center gap-1">
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X size={16} className="text-muted-foreground" />
            </button>
          )}
          <button
            onClick={handleMicClick}
            className={cn(
              "p-2 rounded-lg transition-colors",
              isRecording
                ? "bg-red-100 dark:bg-red-900/30 animate-pulse"
                : "hover:bg-gray-100 dark:hover:bg-gray-700"
            )}
          >
            <Mic
              size={18}
              className={isRecording ? "text-red-500" : "text-muted-foreground"}
            />
          </button>
        </div>
      </div>

      {/* Results Dropdown */}
      {showResults && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg z-50 max-h-64 overflow-y-auto">
          {results.map((customer) => (
            <button
              key={customer.id}
              onClick={() => handleSelectCustomer(customer)}
              className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
            >
              <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <User size={16} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {customer.name}
                </p>
                {customer.address && (
                  <p className="text-xs text-muted-foreground truncate">
                    {customer.address}
                  </p>
                )}
              </div>
              {customer.phone && (
                <span className="text-xs text-muted-foreground">
                  {customer.phone}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {showResults && results.length === 0 && searchQuery && !isSearching && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg z-50 p-4">
          <p className="text-sm text-muted-foreground text-center">
            No customers found for &quot;{searchQuery}&quot;
          </p>
        </div>
      )}

      {/* Loading indicator */}
      {isSearching && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg z-50 p-4">
          <p className="text-sm text-muted-foreground text-center">
            Searching...
          </p>
        </div>
      )}
    </div>
  );
}
