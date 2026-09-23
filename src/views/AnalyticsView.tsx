import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';

export const AnalyticsView: React.FC = () => {
  const { transactions, monthExpenses, cardSpending, availableMoney, balances } = useApp();

  const formatRupee = (val: number) => `₹${val.toLocaleString('en-IN')}`;

  // 1. Transaction filters
  const expenseTxs = useMemo(() => transactions.filter((t) => t.type === 'expense'), [transactions]);
  const incomeTxs = useMemo(() => transactions.filter((t) => t.type === 'income'), [transactions]);
  const transferTxs = useMemo(() => transactions.filter((t) => t.type === 'transfer'), [transactions]);

  // 2. Payment source spending calculations (real data)
  const upiExpenses = useMemo(() => {
    return expenseTxs
      .filter((t) => (t.paymentSource || '').toUpperCase() === 'UPI')
      .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  }, [expenseTxs]);

  const cashExpenses = useMemo(() => {
    return expenseTxs
      .filter((t) => (t.paymentSource || '').toUpperCase() === 'CASH')
      .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  }, [expenseTxs]);

  const cardExpenses = useMemo(() => {
    return expenseTxs
      .filter((t) => (t.paymentSource || '').toUpperCase() === 'CARD')
      .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  }, [expenseTxs]);

  const totalIncome = useMemo(() => {
    return incomeTxs.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  }, [incomeTxs]);

  const totalTransfers = useMemo(() => {
    return transferTxs.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  }, [transferTxs]);

  const grandTotalSpending = upiExpenses + cashExpenses + cardExpenses || 1;

  const upiPercent = Math.round((upiExpenses / grandTotalSpending) * 100);
  const cashPercent = Math.round((cashExpenses / grandTotalSpending) * 100);
  const cardPercent = Math.max(0, 100 - upiPercent - cashPercent);

  // 3. Category breakdown from real transactions
  const categoryList = useMemo(() => {
    const categoryMap: Record<string, number> = {};
    expenseTxs.forEach((t) => {
      const cat = t.category || 'Other';
      categoryMap[cat] = (categoryMap[cat] || 0) + (Number(t.amount) || 0);
    });

    return Object.entries(categoryMap)
      .map(([cat, amt]) => ({
        category: cat,
        amount: amt,
        percent: Math.round((amt / grandTotalSpending) * 100),
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenseTxs, grandTotalSpending]);

  // 4. Dynamic Weekly spending rhythm from real transactions (Last 7 Days)
  const weekDays = useMemo(() => {
    const days: { day: string; fullDate: string; amount: number }[] = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = dayNames[d.getDay()];

      const dayAmount = expenseTxs
        .filter((t) => t.date === dateStr)
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      days.push({ day: dayName, fullDate: dateStr, amount: dayAmount });
    }
    return days;
  }, [expenseTxs]);

  const maxWeekly = Math.max(...weekDays.map((w) => w.amount), 1);

  // 5. Average Daily Spend for current month
  const now = new Date();
  const daysInMonthElapsed = Math.max(1, now.getDate());
  const avgDailySpend = Math.round(monthExpenses / daysInMonthElapsed);

  return (
    <div className="flex flex-col w-full gap-3 sm:gap-4 lg:gap-5">
      {/* Title */}
      <div>
        <h1 className="font-headline-lg-mobile sm:font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-on-surface font-bold tracking-tight">
          Financial Analytics
        </h1>
        <p className="font-body-sm text-xs sm:text-sm text-on-surface-variant">
          Live spending patterns, account velocity, and multi-source cashflow derived from your ledger.
        </p>
      </div>

      {/* Top KPI Cards (Real Data: Outflow, Liquid Runway, Average Daily Spend, Income & Transfers) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3.5">
        <div className="bg-surface-container-lowest rounded-2xl p-4 border border-surface-container shadow-sm flex flex-col justify-between">
          <span className="font-label-xs text-xs text-on-surface-variant uppercase font-bold tracking-wider">
            Total Monthly Outflow
          </span>
          <span className="font-currency-stat text-2xl text-on-surface font-extrabold mt-1">
            {formatRupee(monthExpenses)}
          </span>
          <span className="text-xs text-on-surface-variant mt-0.5">
            Liquid: {formatRupee(Math.max(0, monthExpenses - cardSpending))} • Card: {formatRupee(cardSpending)}
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
            {formatRupee(avgDailySpend)}
          </span>
          <span className="text-xs text-on-surface-variant font-medium mt-0.5 flex items-center gap-1">
            Day {daysInMonthElapsed} of current month
          </span>
        </div>
      </div>

      {/* Cashflow Summary: Income vs Transfers */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
        <div className="bg-surface-container-lowest rounded-2xl p-3.5 sm:p-4 border border-surface-container shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-[20px]">savings</span>
          </div>
          <div>
            <span className="font-label-xs text-[10px] text-on-surface-variant uppercase font-bold tracking-wide block">
              Total Inflow (Income)
            </span>
            <span className="text-base sm:text-lg text-emerald-600 dark:text-emerald-400 font-extrabold">
              +{formatRupee(totalIncome)}
            </span>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl p-3.5 sm:p-4 border border-surface-container shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-[20px]">sync_alt</span>
          </div>
          <div>
            <span className="font-label-xs text-[10px] text-on-surface-variant uppercase font-bold tracking-wide block">
              Internal Transfers
            </span>
            <span className="text-base sm:text-lg text-on-surface font-extrabold">
              {formatRupee(totalTransfers)}
            </span>
          </div>
        </div>
      </div>

      {/* Weekly Spending Velocity Chart (Dynamic Real Data from Transactions) */}
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
            const heightPct = Math.max(8, Math.round((item.amount / maxWeekly) * 85));
            const isHighest = item.amount === maxWeekly && item.amount > 0;

            return (
              <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full gap-1.5 group select-none">
                {/* Amount tooltip */}
                <span className="text-[10px] font-bold text-on-surface-variant opacity-80 group-hover:opacity-100 group-hover:text-primary transition-opacity font-mono">
                  {item.amount > 0 ? `₹${item.amount}` : '₹0'}
                </span>

                {/* Vertical Bar */}
                <div className="w-full max-w-[36px] bg-surface-container-low rounded-t-xl overflow-hidden flex flex-col justify-end h-full">
                  <div
                    className={`w-full rounded-t-xl transition-all duration-300 group-hover:brightness-110 ${
                      item.amount === 0
                        ? 'bg-surface-container-high h-2'
                        : isHighest
                        ? 'bg-primary'
                        : 'bg-primary/50'
                    }`}
                    style={{ height: item.amount === 0 ? '4px' : `${heightPct}%` }}
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

      {/* Multi-Source Payment Method Distribution (UPI, Cash, Card) */}
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

      {/* Category Spending Breakdown List (Derived from real transactions) */}
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
