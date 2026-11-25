import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  GlobalSearchFilter,
  GlobalSearchResultItem,
  searchService,
} from '../services/searchService';

export interface UseGlobalSearchOptions {
  limitPerGroup?: number;
  enableKeyboardShortcuts?: boolean;
  onSelectComplete?: () => void;
}

export function useGlobalSearch({
  limitPerGroup = 4,
  enableKeyboardShortcuts = true,
  onSelectComplete,
}: UseGlobalSearchOptions = {}) {
  const { tasks, events, transactions, setActiveTab } = useApp();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<GlobalSearchFilter>('all');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(
    () =>
      searchService.searchUserWorkspace({
        query,
        tasks,
        events,
        transactions,
        filter,
        limitPerGroup,
      }),
    [query, tasks, events, transactions, filter, limitPerGroup]
  );

  const hasQuery = query.trim().length > 0;
  const showDropdown = isOpen && hasQuery;

  // Reset highlighted row when query, filter, or item count updates
  useEffect(() => {
    setActiveIndex(0);
  }, [results.query, filter, results.items.length]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global keyboard shortcuts: '/' or Ctrl/Cmd+K focuses the search input
  useEffect(() => {
    if (!enableKeyboardShortcuts) return;

    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingTarget =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      const isCmdK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
      const isSlash =
        !isTypingTarget &&
        event.key === '/' &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey;

      if (isCmdK || isSlash) {
        if (inputRef.current && inputRef.current.offsetParent !== null) {
          event.preventDefault();
          inputRef.current.focus();
          setIsOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [enableKeyboardShortcuts]);

  const selectResult = useCallback(
    (item: GlobalSearchResultItem) => {
      setActiveTab(item.targetTab);
      setQuery('');
      setFilter('all');
      setIsOpen(false);
      inputRef.current?.blur();
      onSelectComplete?.();
    },
    [setActiveTab, onSelectComplete]
  );

  const clearSearch = useCallback((refocus = true) => {
    setQuery('');
    setFilter('all');
    setActiveIndex(0);
    if (refocus) {
      inputRef.current?.focus();
    }
  }, []);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (query) {
          setQuery('');
          setFilter('all');
          setIsOpen(false);
        } else {
          setIsOpen(false);
          inputRef.current?.blur();
          onSelectComplete?.();
        }
        return;
      }

      if (!showDropdown || results.items.length === 0) return;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((prev) => (prev + 1) % results.items.length);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((prev) => (prev - 1 + results.items.length) % results.items.length);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        const chosen = results.items[activeIndex] || results.items[0];
        if (chosen) {
          selectResult(chosen);
        }
      }
    },
    [query, showDropdown, results.items, activeIndex, selectResult, onSelectComplete]
  );

  return {
    query,
    setQuery,
    filter,
    setFilter,
    isOpen,
    setIsOpen,
    showDropdown,
    activeIndex,
    setActiveIndex,
    results,
    containerRef,
    inputRef,
    selectResult,
    clearSearch,
    handleKeyDown,
  };
}
