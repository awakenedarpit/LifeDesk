import React, { useEffect, useId } from 'react';
import {
  GlobalSearchFilter,
  GlobalSearchResultItem,
  GlobalSearchResultKind,
} from '../services/searchService';
import { useGlobalSearch } from '../hooks/useGlobalSearch';

interface GlobalSearchBarProps {
  variant?: 'desktop' | 'mobile';
  autoFocus?: boolean;
  onCloseMobile?: () => void;
}

const KIND_META: Record<
  GlobalSearchResultKind,
  { heading: string; icon: string; badgeClass: string }
> = {
  task: {
    heading: 'Tasks',
    icon: 'check_box',
    badgeClass: 'bg-surface-container text-primary-ink border-outline-variant',
  },
  event: {
    heading: 'Calendar Events',
    icon: 'calendar_month',
    badgeClass: 'bg-surface-container-low text-on-surface border-outline-variant',
  },
  transaction: {
    heading: 'Transactions',
    icon: 'account_balance_wallet',
    badgeClass: 'bg-surface-container text-primary-ink border-outline-variant',
  },
};

const FILTER_OPTIONS: { id: GlobalSearchFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'task', label: 'Tasks' },
  { id: 'event', label: 'Events' },
  { id: 'transaction', label: 'Money' },
];

export const GlobalSearchBar: React.FC<GlobalSearchBarProps> = ({
  variant = 'desktop',
  autoFocus = false,
  onCloseMobile,
}) => {
  const {
    query,
    setQuery,
    filter,
    setFilter,
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
  } = useGlobalSearch({
    limitPerGroup: 4,
    enableKeyboardShortcuts: variant === 'desktop',
    onSelectComplete: onCloseMobile,
  });

  const listboxId = useId();

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus, inputRef]);

  const renderGroup = (kind: GlobalSearchResultKind, items: GlobalSearchResultItem[]) => {
    if (items.length === 0) return null;
    const meta = KIND_META[kind];

    return (
      <div key={kind} className="py-1.5">
        <div className="px-3 py-1 flex items-center justify-between">
          <span className="font-label-xs text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">
            {meta.heading}
          </span>
          <span className="font-label-xs text-[10px] text-on-surface-variant tabular-nums">
            {items.length}
          </span>
        </div>
        <div className="flex flex-col gap-0.5 px-1.5">
          {items.map((item) => {
            const flatIdx = results.items.findIndex(
              (entry) => entry.kind === item.kind && entry.id === item.id
            );
            const isHighlighted = flatIdx === activeIndex;
            const optionId = `${listboxId}-${item.kind}-${item.id}`;

            return (
              <button
                key={`${item.kind}-${item.id}`}
                id={optionId}
                role="option"
                aria-selected={isHighlighted}
                type="button"
                onMouseEnter={() => {
                  if (flatIdx >= 0) setActiveIndex(flatIdx);
                }}
                onClick={() => selectResult(item)}
                className={`w-full text-left px-2.5 py-2 rounded-xl flex items-center gap-2.5 transition-colors ${
                  isHighlighted
                    ? 'bg-surface-container text-on-surface'
                    : 'hover:bg-surface-container-low text-on-surface'
                }`}
              >
                <span
                  className={`w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 ${meta.badgeClass}`}
                >
                  <span className="material-symbols-outlined text-[17px]">{meta.icon}</span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-body-sm text-sm font-semibold text-on-surface truncate">
                    {item.title}
                  </p>
                  <p className="font-label-xs text-[11px] text-on-surface-variant truncate">
                    {item.subtitle}
                  </p>
                </div>
                {item.meta && (
                  <span
                    className={`font-label-xs text-[11px] font-bold flex-shrink-0 tabular-nums ${
                      item.amountSign === 'positive'
                        ? 'text-primary-ink'
                        : item.amountSign === 'negative'
                          ? 'text-on-surface'
                          : 'text-on-surface-variant'
                    }`}
                  >
                    {item.meta}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const activeOption =
    showDropdown && results.items[activeIndex]
      ? `${listboxId}-${results.items[activeIndex].kind}-${results.items[activeIndex].id}`
      : undefined;

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="flex items-center gap-2 h-10 px-3 rounded-xl bg-surface-container-low border border-outline-variant focus-within:bg-surface-container-lowest focus-within:border-primary-deep transition-colors">
        <span className="material-symbols-outlined text-[18px] text-on-surface-variant flex-shrink-0">
          search
        </span>
        <input
          ref={inputRef}
          type="text"
          inputMode="search"
          role="combobox"
          aria-label="Search tasks, events, and transactions"
          aria-expanded={showDropdown}
          aria-controls={listboxId}
          aria-activedescendant={activeOption}
          aria-autocomplete="list"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search tasks, events, transactions..."
          className="w-full min-w-0 bg-transparent text-sm text-on-surface placeholder:text-on-surface-variant/75 outline-none"
        />
        {query ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => clearSearch(true)}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors flex-shrink-0"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        ) : variant === 'desktop' ? (
          <kbd className="hidden xl:inline-flex items-center justify-center px-1.5 py-0.5 rounded-md bg-surface-container-lowest border border-outline-variant text-[10px] font-mono font-semibold text-on-surface-variant flex-shrink-0">
            /
          </kbd>
        ) : (
          onCloseMobile && (
            <button
              type="button"
              aria-label="Close search"
              onClick={onCloseMobile}
              className="w-6 h-6 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-on-surface flex-shrink-0"
            >
              <span className="material-symbols-outlined text-[17px]">close</span>
            </button>
          )
        )}
      </div>

      {showDropdown && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Global search results"
          className="absolute left-0 right-0 mt-2 bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Scope Filter Tabs */}
          {results.countsByKind.all > 0 && (
            <div
              role="tablist"
              aria-label="Filter search results"
              className="grid grid-cols-4 gap-1 p-1.5 bg-surface-container-low border-b border-outline-variant"
            >
              {FILTER_OPTIONS.map((opt) => {
                const count = results.countsByKind[opt.id];
                const isSelected = filter === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => setFilter(opt.id)}
                    className={`h-7 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-colors ${
                      isSelected
                        ? 'bg-surface-container-lowest text-primary-ink border border-outline-variant shadow-xs'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <span>{opt.label}</span>
                    <span className="text-[10px] opacity-80 tabular-nums">({count})</span>
                  </button>
                );
              })}
            </div>
          )}

          {results.totalCount > 0 ? (
            <div className="max-h-88 overflow-y-auto divide-y divide-outline-variant/60">
              {renderGroup('task', results.tasks)}
              {renderGroup('event', results.events)}
              {renderGroup('transaction', results.transactions)}
            </div>
          ) : (
            <div className="px-4 py-6 text-center">
              <span className="material-symbols-outlined text-2xl text-on-surface-variant mb-1">
                search_off
              </span>
              <p className="font-body-sm text-sm font-semibold text-on-surface">
                No matching results
              </p>
              <p className="font-label-xs text-xs text-on-surface-variant mt-0.5">
                No {filter === 'all' ? 'tasks, calendar events, or transactions' : `${filter}s`} match &ldquo;{results.query}&rdquo;.
              </p>
            </div>
          )}

          {results.totalCount > 0 && (
            <div className="px-3 py-2 bg-surface-container-low border-t border-outline-variant flex items-center justify-between text-[11px] text-on-surface-variant">
              <span className="tabular-nums">
                {results.totalCount} {results.totalCount === 1 ? 'match' : 'matches'}
              </span>
              <span className="hidden sm:inline">Use ↑↓ to navigate • Enter to open</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
