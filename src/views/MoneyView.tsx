import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { Transaction, PaymentSource, IncomeDestination, ExpenseCategory } from '../types';

export const MoneyView: React.FC = () => {
  const {
    availableMoney,
    balances,
    monthExpenses,
    cardSpending,
    transactions,
    editTransaction,
    deleteTransaction,
    openModal,
  } = useApp();

  const [txToDelete, setTxToDelete] = useState<string | null>(null);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income' | 'transfer'>('all');

  const formatRupee = (val: number) => `₹${val.toLocaleString('en-IN')}`;

  const filteredTransactions = transactions.filter((tx) => {
    if (filterType === 'all') return true;
    return tx.type === filterType;
  });

  return (
    <div className="flex flex-col w-full gap-3 sm:gap-4 lg:gap-5">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-headline-lg-mobile sm:font-headline-lg text-headline-lg-mobile sm:text-headline-lg text-on-surface font-bold tracking-tight">
            Treasury &amp; Ledger
          </h1>
          <p className="font-body-sm text-xs sm:text-sm text-on-surface-variant">
            Multi-source financial manager: Liquid funds (UPI + Cash) vs Card spending.
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto flex-wrap">
          <button
            onClick={() => openModal('expense')}
            className="h-10 px-3.5 bg-primary text-on-primary rounded-xl font-label-md text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm hover:bg-primary-container active:scale-95 transition-all flex-1 sm:flex-initial justify-center"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>Expense</span>
          </button>
          <button
            onClick={() => openModal('income')}
            className="h-10 px-3.5 bg-surface-container-high text-on-surface rounded-xl font-label-md text-xs sm:text-sm font-bold flex items-center gap-1.5 hover:bg-surface-container active:scale-95 transition-all flex-1 sm:flex-initial justify-center"
          >
            <span className="material-symbols-outlined text-[18px]">savings</span>
            <span>Income</span>
          </button>
          <button
            onClick={() => openModal('transfer')}
            className="h-10 px-3 bg-surface-container-high text-on-surface rounded-xl font-label-md text-xs sm:text-sm font-bold flex items-center gap-1.5 hover:bg-surface-container active:scale-95 transition-all"
            title="Transfer between UPI and Cash"
          >
            <span className="material-symbols-outlined text-[18px]">sync_alt</span>
            <span className="hidden sm:inline">Transfer</span>
          </button>
          <button
            onClick={() => openModal('balance')}
            className="h-10 px-3 bg-surface-container-high text-on-surface rounded-xl font-label-md text-xs sm:text-sm font-bold flex items-center gap-1.5 hover:bg-surface-container active:scale-95 transition-all"
            title="Calibrate Balances"
          >
            <span className="material-symbols-outlined text-[18px]">tune</span>
            <span className="hidden sm:inline">Calibrate</span>
          </button>
        </div>
      </div>

      {/* Security Notice */}
      <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container flex items-center gap-2.5 text-xs text-on-surface-variant">
        <span className="material-symbols-outlined text-primary text-[18px] flex-shrink-0">shield</span>
        <span>
          <strong className="text-on-surface">Zero-Credential Financial Safety:</strong> LifeDesk never connects to banks, never requires login passwords, and never asks for UPI PINs or OTPs. All balance calibration is entirely student-managed.
        </span>
      </div>

      {/* Main Balances Breakdown Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
        {/* Liquid Total */}
        <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm border border-surface-container flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[19px]">account_balance_wallet</span>
            </span>
            <span className="font-label-xs text-[10px] bg-primary-fixed text-on-primary-fixed-variant px-2 py-0.5 rounded-full font-bold">
              Liquid
            </span>
          </div>
          <div>
            <span className="font-label-xs text-[10px] text-on-surface-variant block uppercase font-bold tracking-wider">
              Available Money
            </span>
            <span className="font-currency-stat text-xl sm:text-2xl text-on-surface font-extrabold leading-tight block mt-0.5 truncate">
              {formatRupee(availableMoney)}
            </span>
            <span className="text-[10px] text-on-surface-variant block mt-0.5">
              Strictly UPI + Cash
            </span>
          </div>
        </div>

        {/* UPI Balance */}
        <div 
          onClick={() => openModal('balance')}
          className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm border border-surface-container flex flex-col justify-between cursor-pointer hover:border-primary/40 transition-colors"
          title="Click to calibrate UPI"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="w-8 h-8 rounded-xl bg-surface-container-high text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[19px]">phone_android</span>
            </span>
            <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
              tune
            </span>
          </div>
          <div>
            <span className="font-label-xs text-[10px] text-on-surface-variant block uppercase font-bold tracking-wider">
              UPI Balance
            </span>
            <span className="font-currency-stat text-xl sm:text-2xl text-on-surface font-extrabold leading-tight block mt-0.5 truncate">
              {formatRupee(balances.upiBalance)}
            </span>
            <span className="text-[10px] text-on-surface-variant block mt-0.5">
              Digital / Netbanking
            </span>
          </div>
        </div>

        {/* Cash Balance */}
        <div 
          onClick={() => openModal('balance')}
          className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm border border-surface-container flex flex-col justify-between cursor-pointer hover:border-primary/40 transition-colors"
          title="Click to calibrate Cash in Wallet"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="w-8 h-8 rounded-xl bg-surface-container-high text-secondary flex items-center justify-center">
              <span className="material-symbols-outlined text-[19px]">payments</span>
            </span>
            <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
              tune
            </span>
          </div>
          <div>
            <span className="font-label-xs text-[10px] text-on-surface-variant block uppercase font-bold tracking-wider">
              Physical Cash
            </span>
            <span className="font-currency-stat text-xl sm:text-2xl text-on-surface font-extrabold leading-tight block mt-0.5 truncate">
              {formatRupee(balances.cashBalance)}
            </span>
            <span className="text-[10px] text-on-surface-variant block mt-0.5">
              Wallet cash-in-hand
            </span>
          </div>
        </div>

        {/* Card Spending */}
        <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm border border-surface-container flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="w-8 h-8 rounded-xl bg-surface-container-high text-on-surface flex items-center justify-center">
              <span className="material-symbols-outlined text-[19px]">credit_card</span>
            </span>
            <span className="font-label-xs text-[10px] bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full font-bold">
              Card
            </span>
          </div>
          <div>
            <span className="font-label-xs text-[10px] text-on-surface-variant block uppercase font-bold tracking-wider">
              Card Spending
            </span>
            <span className="font-currency-stat text-xl sm:text-2xl text-on-surface font-extrabold leading-tight block mt-0.5 truncate">
              {formatRupee(cardSpending)}
            </span>
            <span className="text-[10px] text-secondary font-semibold block mt-0.5">
              No debit to liquid cash
            </span>
          </div>
        </div>
      </div>

      {/* Transaction Ledger Section */}
      <div className="bg-surface-container-lowest rounded-2xl border border-surface-container shadow-sm p-4 sm:p-5 flex flex-col gap-4">
        {/* Ledger Header & Filter Tabs */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-surface-container">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]">receipt_long</span>
            <h2 className="font-title-sm text-base sm:text-lg text-on-surface font-bold">
              Transaction Ledger
            </h2>
            <span className="font-label-xs text-xs px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-bold">
              {filteredTransactions.length}
            </span>
          </div>

          {/* Filter Pills */}
          <div className="flex bg-surface-container-low p-1 rounded-xl border border-surface-container self-stretch sm:self-auto overflow-x-auto scrollbar-none">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'expense', label: 'Expenses' },
                { id: 'income', label: 'Income' },
                { id: 'transfer', label: 'Transfers' },
              ] as { id: 'all' | 'expense' | 'income' | 'transfer'; label: string }[]
            ).map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterType(f.id)}
                className={`flex-1 sm:flex-initial px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  filterType === f.id
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Responsive Ledger Presentation: Desktop Table & Mobile Cards */}
        {filteredTransactions.length === 0 ? (
          <div className="py-12 text-center text-on-surface-variant">
            <span className="material-symbols-outlined text-4xl text-primary mb-2">payments</span>
            <p className="font-bold text-sm">No transactions found</p>
            <p className="text-xs text-on-surface-variant mt-1">Log an expense, deposit income, or record a transfer.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View (>= sm) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-surface-container text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                    <th className="pb-3 pl-1">Description</th>
                    <th className="pb-3">Type</th>
                    <th className="pb-3">Account / Method</th>
                    <th className="pb-3">Category</th>
                    <th className="pb-3">Date &amp; Time</th>
                    <th className="pb-3 text-right">Amount</th>
                    <th className="pb-3 text-right pr-1">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container">
                  {filteredTransactions.map((tx) => {
                    const isIncome = tx.type === 'income';
                    const isTransfer = tx.type === 'transfer';
                    const isZero = tx.amount === 0;

                    let accountText: string = tx.paymentSource || 'UPI';
                    if (isIncome) accountText = `To ${tx.destination || 'UPI'}`;
                    if (isTransfer) accountText = `${tx.transferFrom || 'UPI'} → ${tx.transferTo || 'Cash'}`;

                    return (
                      <tr key={tx.id} className="hover:bg-surface-container-low/50 transition-colors">
                        <td className="py-3 pl-1 font-semibold text-on-surface">
                          {tx.description}
                          {tx.notes && (
                            <span className="block text-[11px] text-on-surface-variant font-normal">{tx.notes}</span>
                          )}
                        </td>
                        <td className="py-3">
                          <span
                            className={`font-label-xs text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              isIncome
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : isTransfer
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                : 'bg-surface-container-high text-on-surface'
                            }`}
                          >
                            {tx.type}
                          </span>
                        </td>
                        <td className="py-3 text-xs text-on-surface-variant font-medium">
                          {accountText}
                        </td>
                        <td className="py-3 text-xs text-on-surface-variant">
                          {tx.category}
                        </td>
                        <td className="py-3 text-xs text-on-surface-variant">
                          {tx.date} {tx.time && `• ${tx.time}`}
                        </td>
                        <td className="py-3 text-right font-bold text-sm">
                          <span
                            className={
                              isZero
                                ? 'text-primary'
                                : isIncome
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : isTransfer
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-on-surface'
                            }
                          >
                            {isZero ? '₹0' : `${isIncome ? '+' : isTransfer ? '⇄ ' : '-'}${formatRupee(tx.amount)}`}
                          </span>
                        </td>
                        <td className="py-3 text-right pr-1">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => setEditingTx(tx)}
                              className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
                              title="Edit transaction"
                            >
                              <span className="material-symbols-outlined text-[17px]">edit</span>
                            </button>
                            <button
                              onClick={() => setTxToDelete(tx.id)}
                              className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error-container/20 transition-colors"
                              title="Delete transaction"
                            >
                              <span className="material-symbols-outlined text-[17px]">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View (< sm) */}
            <div className="flex sm:hidden flex-col gap-2">
              {filteredTransactions.map((tx) => {
                const isIncome = tx.type === 'income';
                const isTransfer = tx.type === 'transfer';
                const isZero = tx.amount === 0;

                let icon = 'receipt';
                if (tx.category === 'Food') icon = 'restaurant';
                else if (tx.category === 'Travel') icon = 'directions_bus';
                else if (tx.category === 'Study Material') icon = 'menu_book';
                else if (isIncome) icon = 'savings';
                else if (isTransfer) icon = 'sync_alt';

                return (
                  <div
                    key={tx.id}
                    className="p-3 rounded-xl bg-surface-container-low border border-surface-container flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-surface-container-high text-primary flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-[20px]">{icon}</span>
                      </div>
                      <div className="truncate">
                        <span className="font-title-sm text-sm text-on-surface font-bold block truncate">
                          {tx.description}
                        </span>
                        <span className="text-[11px] text-on-surface-variant block truncate">
                          {tx.category} • {tx.paymentSource || tx.destination || 'Transfer'} • {tx.date}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="text-right">
                        <span
                          className={`font-title-sm text-sm font-bold block ${
                            isZero
                              ? 'text-primary'
                              : isIncome
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : isTransfer
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-on-surface'
                          }`}
                        >
                          {isZero ? '₹0' : `${isIncome ? '+' : isTransfer ? '⇄ ' : '-'}${formatRupee(tx.amount)}`}
                        </span>
                        <span className="font-label-xs text-[10px] text-on-surface-variant uppercase font-bold">
                          {tx.type}
                        </span>
                      </div>

                      <button
                        onClick={() => setEditingTx(tx)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
                        title="Edit transaction"
                      >
                        <span className="material-symbols-outlined text-[17px]">edit</span>
                      </button>
                      <button
                        onClick={() => setTxToDelete(tx.id)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error-container/20 transition-colors"
                        title="Delete transaction"
                      >
                        <span className="material-symbols-outlined text-[17px]">delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Edit Transaction Modal */}
      {editingTx && (
        <div className="fixed inset-0 z-50 bg-inverse-surface/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-surface-container-lowest border border-surface-container-high w-full max-w-md rounded-2xl p-5 shadow-2xl flex flex-col gap-3.5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container">
              <h3 className="font-headline-md text-base sm:text-lg text-on-surface font-bold">
                Edit Transaction
              </h3>
              <button
                className="w-8 h-8 rounded-full text-on-surface-variant hover:text-on-surface flex items-center justify-center"
                onClick={() => setEditingTx(null)}
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                editTransaction(editingTx.id, editingTx);
                setEditingTx(null);
              }}
              className="flex flex-col gap-3"
            >
              <div>
                <label className="font-label-xs text-xs text-on-surface-variant uppercase font-bold block mb-1">
                  Description
                </label>
                <input
                  required
                  type="text"
                  value={editingTx.description}
                  onChange={(e) => setEditingTx({ ...editingTx, description: e.target.value })}
                  className="w-full h-10 px-3 bg-surface-container-low rounded-xl text-on-surface text-sm outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-label-xs text-xs text-on-surface-variant uppercase font-bold block mb-1">
                    Amount (₹)
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="any"
                    value={editingTx.amount}
                    onChange={(e) => setEditingTx({ ...editingTx, amount: Number(e.target.value) || 0 })}
                    className="w-full h-10 px-3 bg-surface-container-low rounded-xl text-on-surface text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="font-label-xs text-xs text-on-surface-variant uppercase font-bold block mb-1">
                    Date
                  </label>
                  <input
                    required
                    type="date"
                    value={editingTx.date}
                    onChange={(e) => setEditingTx({ ...editingTx, date: e.target.value })}
                    className="w-full h-10 px-2 bg-surface-container-low rounded-xl text-on-surface text-xs outline-none"
                  />
                </div>
              </div>

              {editingTx.type === 'expense' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-label-xs text-xs text-on-surface-variant uppercase font-bold block mb-1">
                      Payment Source
                    </label>
                    <select
                      value={editingTx.paymentSource || 'UPI'}
                      onChange={(e) => setEditingTx({ ...editingTx, paymentSource: e.target.value as PaymentSource })}
                      className="w-full h-10 px-2.5 bg-surface-container-low rounded-xl text-on-surface text-xs font-semibold outline-none"
                    >
                      <option value="UPI">UPI (Liquid debit)</option>
                      <option value="Cash">Cash (Liquid debit)</option>
                      <option value="Card">Card (No liquid debit)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-label-xs text-xs text-on-surface-variant uppercase font-bold block mb-1">
                      Category
                    </label>
                    <input
                      type="text"
                      value={editingTx.category}
                      onChange={(e) => setEditingTx({ ...editingTx, category: e.target.value as ExpenseCategory })}
                      className="w-full h-10 px-3 bg-surface-container-low rounded-xl text-on-surface text-xs outline-none"
                    />
                  </div>
                </div>
              )}

              {editingTx.type === 'income' && (
                <div>
                  <label className="font-label-xs text-xs text-on-surface-variant uppercase font-bold block mb-1">
                    Destination Account
                  </label>
                  <select
                    value={editingTx.destination || 'UPI'}
                    onChange={(e) => setEditingTx({ ...editingTx, destination: e.target.value as IncomeDestination })}
                    className="w-full h-10 px-2.5 bg-surface-container-low rounded-xl text-on-surface text-xs font-semibold outline-none"
                  >
                    <option value="UPI">UPI Account</option>
                    <option value="Cash">Physical Cash</option>
                  </select>
                </div>
              )}

              {editingTx.type === 'transfer' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-label-xs text-xs text-on-surface-variant uppercase font-bold block mb-1">
                      Transfer From
                    </label>
                    <select
                      value={editingTx.transferFrom || 'UPI'}
                      onChange={(e) => setEditingTx({ ...editingTx, transferFrom: e.target.value as 'UPI' | 'Cash' })}
                      className="w-full h-10 px-2.5 bg-surface-container-low rounded-xl text-on-surface text-xs font-semibold outline-none"
                    >
                      <option value="UPI">UPI</option>
                      <option value="Cash">Cash</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-label-xs text-xs text-on-surface-variant uppercase font-bold block mb-1">
                      Transfer To
                    </label>
                    <select
                      value={editingTx.transferTo || 'Cash'}
                      onChange={(e) => setEditingTx({ ...editingTx, transferTo: e.target.value as 'UPI' | 'Cash' })}
                      className="w-full h-10 px-2.5 bg-surface-container-low rounded-xl text-on-surface text-xs font-semibold outline-none"
                    >
                      <option value="UPI">UPI</option>
                      <option value="Cash">Cash</option>
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="font-label-xs text-xs text-on-surface-variant uppercase font-bold block mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={editingTx.notes || ''}
                  onChange={(e) => setEditingTx({ ...editingTx, notes: e.target.value })}
                  placeholder="Optional notes"
                  className="w-full h-10 px-3 bg-surface-container-low rounded-xl text-on-surface text-xs outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTx(null)}
                  className="flex-1 h-10 rounded-xl bg-surface-container-high text-on-surface text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 h-10 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={txToDelete !== null}
        title="Delete Transaction?"
        message="Are you sure you want to remove this ledger entry? If it affected your balances, you can calibrate them under the Calibrate button."
        onCancel={() => setTxToDelete(null)}
        onConfirm={() => {
          if (txToDelete) {
            deleteTransaction(txToDelete);
            setTxToDelete(null);
          }
        }}
      />
    </div>
  );
};
