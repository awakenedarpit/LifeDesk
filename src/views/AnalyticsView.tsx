import React from 'react';
import { useApp } from '../context/AppContext';

export const AnalyticsView: React.FC = () => {
  const { transactions, monthExpenses, cardSpending, availableMoney, balances } = useApp();

  const formatRupee = (val: number) => `₹${val.toLocaleString('en-IN')}`;

  // 1. Payment source calculations
  const expenseTxs = transactions.filter((t) => t.type === 'expense');
  const upiExpenses = expenseTxs.filter((t) => t.paymentSource === 'UPI').reduce((acc, t) => acc + t.amount, 0);
  const cashExpenses = expenseTxs.filter((t) => t.paymentSource === 'Cash').reduce((acc, t) => acc + t.amount, 0);
  const cardExpenses = expenseTxs.filter((t) => t.paymentSource === 'Card').reduce((acc, t) => acc + t.amount, 0);
  const grandTotalSpending = upiExpenses + cashExpenses + cardExpenses || 1;

  const upiPercent = Math.round((upiExpenses / grandTotalSpending) * 100);
  const cashPercent = Math.round((cashExpenses / grandTotalSpending) * 100);
  const cardPercent = Math.max(0, 100 - upiPercent - cashPercent);

  // 2. Category breakdown
  const categoryMap: Record<string, number> = {};
  expenseTxs.forEach((t) => {
    categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
  });

  const categoryList = Object.entries(categoryMap)
    .map(([cat, amt]) => ({
      category: cat,
      amount: amt,
      percent: Math.round((amt / grandTotalSpending) * 100),
    }))
    .sort((a, b) => b.amount - a.amount);

  // 3. Weekly spending rhythm (Mon to Sun)
  const weekDays = [
    { day: 'Mon', amount: 320 },
    { day: 'Tue', amount: 650 },
    { day: 'Wed', amount: 180 },
    { day: 'Thu', amount: 480 },
    { day: 'Fri', amount: 920 },
    { day: 'Sat', amount: 1450 },
    { day: 'Sun', amount: 600 },
  ];
  const maxWeekly = Math.max(...weekDays.map((w) => w.amount), 1);

  return (
    <div className="flex flex-col w-full gap-3 sm:gap-4 lg:gap-5">
      {/* Title */}
      <div>
        <h1 className="font-headline-lg-mobile sm:font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-on-surface font-bold tracking-tight">
          Financial Analytics
        </h1>
        <p className="font-body-sm text-xs sm:text-sm text-on-surface-variant">
          Monitor spending patterns, account velocity, and multi-source cashflow.
        </p>
      </div>

      {/* Top 3 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3.5">
        <div className="bg-surface-container-lowest rounded-2xl p-4 border border-surface-container shadow-sm flex flex-col justify-between">
          <span className="font-label-xs text-xs text-on-surface-variant uppercase font-bold tracking-wider">
            Total Monthly Outflow
          </span>
          <span className="font-currency-stat text-2xl text-on-surface font-extrabold mt-1">
            {formatRupee(monthExpenses + cardSpending)}
          </span>
          <span className="text-xs text-on-surface-variant mt-0.5">
            Liquid: {formatRupee(monthExpenses)} • Card: {formatRupee(cardSpending)}
          </span>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl p-4 border border-surface-container shadow-sm flex flex-col justify-between">
          <span className="font-label-xs text-xs text-on-surface-variant uppercase font-bold tracking-wider">
            Current Liquid Runway
          </span>
          <span className="font-currency-stat text-2xl text-on-surface font-extrabold mt-1">
            {formatRupee(availableMoney)}
          </span>
          <span className="text-xs text-on-surface-variant mt-0.5">
            UPI: {formatRupee(balances.upiBalance)} • Cash: {formatRupee(balances.cashBalance)}
          </span>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl p-4 border border-surface-container shadow-sm flex flex-col justify-between">
          <span className="font-label-xs text-xs text-on-surface-variant uppercase font-bold tracking-wider">
            Average Daily Spend
          </span>
          <span className="font-currency-stat text-2xl text-on-surface font-extrabold mt-1">
            ₹245
          </span>
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 flex items-center gap-1">
            <span className="material-symbols-outlined text-[15px]">trending_down</span> 12% below semester target
          </span>
        </div>
      </div>

      {/* Weekly Spending Velocity Chart (Responsive SVG/Flex with zero horizontal overflow) */}
      <div className="bg-surface-container-lowest rounded-2xl border border-surface-container p-4 sm:p-5 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-title-sm text-base text-on-surface font-bold">
              Weekly Spending Rhythm
            </h2>
            <p className="text-xs text-on-surface-variant">Daily student expenditure across all payment channels.</p>
          </div>
          <span className="font-label-xs text-xs px-2.5 py-1 rounded-full bg-surface-container-high text-primary font-bold">
            Last 7 Days
          </span>
        </div>

        {/* Responsive Bar Container */}
        <div className="h-44 sm:h-52 w-full flex items-end justify-between gap-2 sm:gap-4 pt-6 pb-2 border-b border-surface-container">
          {weekDays.map((item, idx) => {
            const heightPct = Math.round((item.amount / maxWeekly) * 85);
            const isHighest = item.amount === maxWeekly;

            return (
              <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full gap-1.5 group select-none">
                {/* Amount tooltip */}
                <span className="text-[10px] font-bold text-on-surface-variant opacity-80 group-hover:opacity-100 group-hover:text-primary transition-opacity font-mono">
                  ₹{item.amount}
                </span>

                {/* Vertical Bar */}
                <div className="w-full max-w-[36px] bg-surface-container-low rounded-t-xl overflow-hidden flex flex-col justify-end h-full">
                  <div
                    className={`w-full rounded-t-xl transition-all duration-300 group-hover:brightness-110 ${
                      isHighest
                        ? 'bg-primary'
                        : 'bg-primary/50'
                    }`}
                    style={{ height: `${heightPct}%` }}
                  />
                </div>

                {/* Day Label */}
                <span className={`text-[11px] font-bold mt-1 ${isHighest ? 'text-primary' : 'text-on-surface-variant'}`}>
                  {item.day}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Multi-Source Payment Method Distribution */}
      <div className="bg-surface-container-lowest rounded-2xl border border-surface-container p-4 sm:p-5 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-title-sm text-base text-on-surface font-bold">
              Payment Source Distribution
            </h2>
            <p className="text-xs text-on-surface-variant">Liquid outflows (UPI &amp; Cash) vs Card billed separately.</p>
          </div>
        </div>

        {/* Multi-Segment Stacked Progress Bar */}
        <div className="h-4 rounded-full bg-surface-container overflow-hidden flex w-full">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${upiPercent}%` }}
            title={`UPI: ${upiPercent}%`}
          />
          <div
            className="h-full bg-secondary transition-all duration-300"
            style={{ width: `${cashPercent}%` }}
            title={`Cash: ${cashPercent}%`}
          />
          <div
            className="h-full bg-tertiary transition-all duration-300"
            style={{ width: `${cardPercent}%` }}
            title={`Card: ${cardPercent}%`}
          />
        </div>

        {/* Legend */}
        <div className="grid grid-cols-3 gap-2 pt-1 text-center">
          <div className="p-2.5 rounded-xl bg-surface-container-low border border-surface-container flex flex-col items-center">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-primary" />
              <span className="text-xs font-bold text-on-surface">UPI ({upiPercent}%)</span>
            </div>
            <span className="text-xs font-bold text-on-surface-variant">{formatRupee(upiExpenses)}</span>
          </div>

          <div className="p-2.5 rounded-xl bg-surface-container-low border border-surface-container flex flex-col items-center">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-secondary" />
              <span className="text-xs font-bold text-on-surface">Cash ({cashPercent}%)</span>
            </div>
            <span className="text-xs font-bold text-on-surface-variant">{formatRupee(cashExpenses)}</span>
          </div>

          <div className="p-2.5 rounded-xl bg-surface-container-low border border-surface-container flex flex-col items-center">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-tertiary" />
              <span className="text-xs font-bold text-on-surface">Card ({cardPercent}%)</span>
            </div>
            <span className="text-xs font-bold text-on-surface-variant">{formatRupee(cardExpenses)}</span>
          </div>
        </div>
      </div>

      {/* Category Spending Breakdown List */}
      <div className="bg-surface-container-lowest rounded-2xl border border-surface-container p-4 sm:p-5 shadow-sm flex flex-col gap-3.5">
        <h2 className="font-title-sm text-base text-on-surface font-bold">
          Category Outflow Breakdown
        </h2>

        {categoryList.length === 0 ? (
          <p className="text-xs text-on-surface-variant py-4 text-center">No categorized expenses recorded yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {categoryList.map((item) => (
              <div key={item.category} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-on-surface">{item.category}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-on-surface-variant">{item.percent}%</span>
                    <span className="font-bold text-on-surface">{formatRupee(item.amount)}</span>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-surface-container overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
