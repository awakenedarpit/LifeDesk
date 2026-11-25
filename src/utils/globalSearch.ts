import { CalendarEvent, Task, Transaction } from '../types';

export type GlobalSearchResultKind = 'task' | 'event' | 'transaction';
export type GlobalSearchFilter = 'all' | GlobalSearchResultKind;

export interface GlobalSearchResultItem {
  id: string;
  kind: GlobalSearchResultKind;
  title: string;
  subtitle: string;
  meta: string;
  amountSign?: 'positive' | 'negative' | 'neutral';
  targetTab: 'tasks' | 'calendar' | 'money';
  score: number;
}

export interface GlobalSearchResults {
  query: string;
  tasks: GlobalSearchResultItem[];
  events: GlobalSearchResultItem[];
  transactions: GlobalSearchResultItem[];
  items: GlobalSearchResultItem[];
  totalCount: number;
  countsByKind: {
    all: number;
    task: number;
    event: number;
    transaction: number;
  };
}

export interface GlobalSearchInput {
  query: string;
  tasks: Task[];
  events: CalendarEvent[];
  transactions: Transaction[];
  filter?: GlobalSearchFilter;
  limitPerGroup?: number;
}

const normalize = (value: unknown): string =>
  typeof value === 'string'
    ? value.trim().toLowerCase()
    : value !== null && value !== undefined
      ? String(value).trim().toLowerCase()
      : '';

const tokenize = (query: string): string[] =>
  query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

const computeMatchScore = (
  tokens: string[],
  primaryText: string,
  secondaryTexts: Array<string | undefined | null>
): number => {
  if (tokens.length === 0) return 0;

  const primary = normalize(primaryText);
  const combined = [primary, ...secondaryTexts.map(normalize)].filter(Boolean).join(' ');

  if (!tokens.every((token) => combined.includes(token))) {
    return 0;
  }

  let score = 10;
  const fullQuery = tokens.join(' ');
  if (primary === fullQuery) {
    score += 50;
  } else if (primary.startsWith(fullQuery)) {
    score += 35;
  } else if (tokens.every((token) => primary.includes(token))) {
    score += 20;
  }

  return score;
};

const formatShortDate = (rawDate: string | undefined): string => {
  if (!rawDate) return '';
  const datePart = rawDate.split('T')[0];
  if (!datePart) return '';
  const parsed = new Date(`${datePart}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return datePart;
  return parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const formatInrAmount = (amount: number): string =>
  `₹${Math.abs(amount).toLocaleString('en-IN')}`;

export function searchGlobalEntities({
  query,
  tasks,
  events,
  transactions,
  filter = 'all',
  limitPerGroup = 5,
}: GlobalSearchInput): GlobalSearchResults {
  const trimmedQuery = query.trim();
  const tokens = tokenize(trimmedQuery);

  if (tokens.length === 0) {
    return {
      query: '',
      tasks: [],
      events: [],
      transactions: [],
      items: [],
      totalCount: 0,
      countsByKind: { all: 0, task: 0, event: 0, transaction: 0 },
    };
  }

  const matchedTasks: GlobalSearchResultItem[] = [];
  for (const task of tasks) {
    const score = computeMatchScore(tokens, task.name, [
      task.description,
      task.category,
      task.priority,
      task.status,
      task.notes,
      task.teamName,
      ...(task.tags || []),
    ]);
    if (score > 0) {
      const dueLabel = formatShortDate(task.deadline);
      matchedTasks.push({
        id: task.id,
        kind: 'task',
        title: task.name,
        subtitle: `${task.category} • ${task.priority} • ${task.status}`,
        meta: dueLabel ? `Due ${dueLabel}` : task.status,
        targetTab: 'tasks',
        score,
      });
    }
  }
  matchedTasks.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));

  const matchedEvents: GlobalSearchResultItem[] = [];
  for (const evt of events) {
    const score = computeMatchScore(tokens, evt.title, [
      evt.description,
      evt.category,
      evt.type,
      evt.startDate,
    ]);
    if (score > 0) {
      const dateLabel = formatShortDate(evt.startDate);
      const timeLabel = evt.startTime ? ` • ${evt.startTime}` : '';
      matchedEvents.push({
        id: evt.id,
        kind: 'event',
        title: evt.title,
        subtitle: `${evt.category || evt.type}${evt.description ? ` • ${evt.description}` : ''}`,
        meta: `${dateLabel}${timeLabel}`.trim(),
        targetTab: 'calendar',
        score,
      });
    }
  }
  matchedEvents.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));

  const matchedTransactions: GlobalSearchResultItem[] = [];
  for (const tx of transactions) {
    const channel =
      tx.type === 'transfer'
        ? `${tx.transferFrom || 'UPI'} → ${tx.transferTo || 'Cash'}`
        : tx.type === 'income'
          ? tx.destination || 'UPI'
          : tx.paymentSource || 'UPI';

    const score = computeMatchScore(tokens, tx.description, [
      tx.category,
      tx.type,
      tx.paymentSource,
      tx.destination,
      tx.transferFrom,
      tx.transferTo,
      tx.notes,
      tx.date,
      String(tx.amount),
    ]);
    if (score > 0) {
      const prefix = tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : '';
      const dateLabel = formatShortDate(tx.date);
      matchedTransactions.push({
        id: tx.id,
        kind: 'transaction',
        title: tx.description,
        subtitle: `${tx.category} • ${channel}${dateLabel ? ` • ${dateLabel}` : ''}`,
        meta: `${prefix}${formatInrAmount(tx.amount)}`,
        amountSign:
          tx.type === 'income'
            ? 'positive'
            : tx.type === 'expense'
              ? 'negative'
              : 'neutral',
        targetTab: 'money',
        score,
      });
    }
  }
  matchedTransactions.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));

  const countsByKind = {
    all: matchedTasks.length + matchedEvents.length + matchedTransactions.length,
    task: matchedTasks.length,
    event: matchedEvents.length,
    transaction: matchedTransactions.length,
  };

  const limitedTasks =
    filter === 'all' || filter === 'task' ? matchedTasks.slice(0, limitPerGroup) : [];
  const limitedEvents =
    filter === 'all' || filter === 'event' ? matchedEvents.slice(0, limitPerGroup) : [];
  const limitedTransactions =
    filter === 'all' || filter === 'transaction'
      ? matchedTransactions.slice(0, limitPerGroup)
      : [];
  const items = [...limitedTasks, ...limitedEvents, ...limitedTransactions];

  return {
    query: trimmedQuery,
    tasks: limitedTasks,
    events: limitedEvents,
    transactions: limitedTransactions,
    items,
    totalCount:
      filter === 'all'
        ? countsByKind.all
        : filter === 'task'
          ? countsByKind.task
          : filter === 'event'
            ? countsByKind.event
            : countsByKind.transaction,
    countsByKind,
  };
}
