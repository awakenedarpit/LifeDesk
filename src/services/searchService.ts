import {
  GlobalSearchFilter,
  GlobalSearchInput,
  GlobalSearchResultItem,
  GlobalSearchResultKind,
  GlobalSearchResults,
  searchGlobalEntities,
} from '../utils/globalSearch';

export type {
  GlobalSearchFilter,
  GlobalSearchInput,
  GlobalSearchResultItem,
  GlobalSearchResultKind,
  GlobalSearchResults,
};

/**
 * Search service filtering user data across Tasks, Calendar Events, and Financial Transactions.
 */
export const searchService = {
  searchUserWorkspace(input: GlobalSearchInput): GlobalSearchResults {
    return searchGlobalEntities(input);
  },
};
