import test from 'node:test';
import assert from 'node:assert/strict';
import { searchGlobalEntities } from './globalSearch';
import { CalendarEvent, Task, Transaction } from '../types';

const sampleTasks: Task[] = [
  {
    id: 't1',
    name: 'Neural Networks Lab Report',
    description: 'Backprop derivation and Jupyter notebook plots',
    category: 'Practical',
    deadline: '2026-11-26T18:00:00Z',
    priority: 'Urgent',
    status: 'In Progress',
    tags: ['ML', 'Python'],
    createdAt: '2026-11-20T10:00:00Z',
  },
  {
    id: 't2',
    name: 'OS Scheduling Assignment',
    description: 'Round robin simulator in C++',
    category: 'Assignment',
    deadline: '2026-11-27T21:00:00Z',
    priority: 'High',
    status: 'Not Started',
    tags: ['Systems'],
    createdAt: '2026-11-21T10:00:00Z',
  },
];

const sampleEvents: CalendarEvent[] = [
  {
    id: 'e1',
    title: 'AI Study Group',
    description: 'Library Room 204',
    category: 'Academic',
    startDate: '2026-11-25',
    startTime: '16:00',
    type: 'event',
  },
  {
    id: 'e2',
    title: 'Hackathon Demo Pitch',
    description: 'Main Auditorium',
    category: 'Hackathon',
    startDate: '2026-11-28',
    startTime: '11:00',
    type: 'hackathon',
  },
];

const sampleTransactions: Transaction[] = [
  {
    id: 'tx1',
    type: 'income',
    amount: 12000,
    description: 'Monthly Stipend',
    category: 'Stipend',
    date: '2026-11-25',
    destination: 'UPI',
    status: 'Settled',
  },
  {
    id: 'tx2',
    type: 'expense',
    amount: 1450,
    description: 'Campus Mess & Coffee',
    category: 'Food',
    date: '2026-11-25',
    paymentSource: 'UPI',
    status: 'Settled',
  },
  {
    id: 'tx3',
    type: 'transfer',
    amount: 500,
    description: 'ATM Cash Withdrawal',
    category: 'Transfer',
    date: '2026-11-24',
    transferFrom: 'UPI',
    transferTo: 'Cash',
    status: 'Settled',
  },
];

test('empty or whitespace query returns empty groups', () => {
  const res = searchGlobalEntities({
    query: '   ',
    tasks: sampleTasks,
    events: sampleEvents,
    transactions: sampleTransactions,
  });
  assert.equal(res.totalCount, 0);
  assert.equal(res.items.length, 0);
});

test('multi-word case-insensitive query matches task title and secondary fields', () => {
  const res = searchGlobalEntities({
    query: 'neural python',
    tasks: sampleTasks,
    events: sampleEvents,
    transactions: sampleTransactions,
  });
  assert.equal(res.tasks.length, 1);
  assert.equal(res.tasks[0].id, 't1');
  assert.equal(res.tasks[0].targetTab, 'tasks');
  assert.equal(res.events.length, 0);
  assert.equal(res.transactions.length, 0);
});

test('matches calendar events by description or title', () => {
  const res = searchGlobalEntities({
    query: 'library',
    tasks: sampleTasks,
    events: sampleEvents,
    transactions: sampleTransactions,
  });
  assert.equal(res.events.length, 1);
  assert.equal(res.events[0].title, 'AI Study Group');
  assert.equal(res.events[0].targetTab, 'calendar');
});

test('matches transactions by keyword, payment channel, or amount', () => {
  const byMess = searchGlobalEntities({
    query: 'mess',
    tasks: sampleTasks,
    events: sampleEvents,
    transactions: sampleTransactions,
  });
  assert.equal(byMess.transactions.length, 1);
  assert.equal(byMess.transactions[0].amountSign, 'negative');
  assert.match(byMess.transactions[0].meta, /1,450/);
  assert.equal(byMess.transactions[0].targetTab, 'money');

  const byChannel = searchGlobalEntities({
    query: 'upi',
    tasks: sampleTasks,
    events: sampleEvents,
    transactions: sampleTransactions,
  });
  assert.equal(byChannel.transactions.length, 3);
});

test('ranks exact/prefix title matches above secondary field matches', () => {
  const tasks: Task[] = [
    { ...sampleTasks[1], id: 't-desc', name: 'Final Exam Prep', description: 'Study AI notes' },
    { ...sampleTasks[0], id: 't-prefix', name: 'AI Ethics Essay', description: 'Drafting' },
  ];
  const res = searchGlobalEntities({
    query: 'ai',
    tasks,
    events: [],
    transactions: [],
  });
  assert.equal(res.tasks[0].id, 't-prefix');
  assert.equal(res.tasks[1].id, 't-desc');
});

test('respects limitPerGroup while reporting totalCount', () => {
  const manyTasks: Task[] = Array.from({ length: 8 }, (_, idx) => ({
    ...sampleTasks[0],
    id: `t-${idx}`,
    name: `Lab Experiment ${idx + 1}`,
  }));
  const res = searchGlobalEntities({
    query: 'lab',
    tasks: manyTasks,
    events: [],
    transactions: [],
    limitPerGroup: 3,
  });
  assert.equal(res.tasks.length, 3);
  assert.equal(res.totalCount, 8);
});

test('filters results by entity kind while preserving countsByKind', () => {
  const tasks: Task[] = [
    { ...sampleTasks[0], id: 't-ai', name: 'AI Neural Lab' },
  ];
  const events: CalendarEvent[] = [
    { ...sampleEvents[0], id: 'e-ai', title: 'AI Study Group' },
  ];
  const transactions: Transaction[] = [
    { ...sampleTransactions[1], id: 'tx-ai', description: 'AI GPU Credits' },
  ];

  const txOnly = searchGlobalEntities({
    query: 'ai',
    tasks,
    events,
    transactions,
    filter: 'transaction',
  });

  assert.equal(txOnly.tasks.length, 0);
  assert.equal(txOnly.events.length, 0);
  assert.equal(txOnly.transactions.length, 1);
  assert.equal(txOnly.totalCount, 1);
  assert.deepEqual(txOnly.countsByKind, {
    all: 3,
    task: 1,
    event: 1,
    transaction: 1,
  });
});
