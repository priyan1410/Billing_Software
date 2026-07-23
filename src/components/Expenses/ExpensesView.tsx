import React, { useState, useEffect } from 'react';
import { Wallet, Plus, Trash2 } from 'lucide-react';
import { Expense } from '../../types';
import { formatDateDDMMYYYY, formatDateTimeDDMMYYYY } from '../../utils/dateUtils';

const getTodayString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const ExpensesView: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [category, setCategory] = useState('Raw Material');
  const [customCategory, setCustomCategory] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(getTodayString);
  const [paidTo, setPaidTo] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    try {
      if ((window as any).electronAPI) {
        const res = await (window as any).electronAPI.getExpenses();
        if (res && res.success && Array.isArray(res.data)) {
          setExpenses(res.data);
        }
      }
    } catch (err: any) {
      console.error('loadExpenses error:', err.message);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) {
      setErrMsg('Please fill in description and amount.');
      return;
    }
    const finalCategory = category === 'Custom' ? customCategory.trim() : category;
    if (!finalCategory) {
      setErrMsg('Please specify or enter a custom category name.');
      return;
    }
    setErrMsg('');
    setSaving(true);

    try {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      const fullDateTimeStr = `${expenseDate}T${timeStr}`;

      const payload = {
        category: finalCategory,
        description,
        amount: Number(amount),
        expense_date: expenseDate,
        createdAt: fullDateTimeStr,
        created_at: fullDateTimeStr,
        paid_to: paidTo,
        payment_mode: paymentMode
      };

      if ((window as any).electronAPI) {
        const res = await (window as any).electronAPI.addExpense(payload);
        if (res && res.success) {
          setDescription('');
          setAmount('');
          setPaidTo('');
          setCustomCategory('');
          setCategory('Raw Material');
          await loadExpenses();
        } else {
          setErrMsg(res?.message || 'Failed to save expense. Please try again.');
        }
      }
    } catch (err: any) {
      setErrMsg('Error saving expense: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExpense = async (id: number) => {
    if (!confirm('Are you sure you want to delete this expense entry?')) return;
    try {
      if ((window as any).electronAPI) {
        const res = await (window as any).electronAPI.deleteExpense(id);
        if (res && res.success) await loadExpenses();
      }
    } catch (err: any) {
      console.error('deleteExpense error:', err.message);
    }
  };

  const totalExpenseSum = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 select-none">
      {/* Log Expense Form Left */}
      <div className="bg-olive-900 border border-gold-500/20 rounded-2xl p-5 h-fit">
        <h3 className="text-base font-bold text-gold-500 flex items-center gap-2 mb-4">
          <Wallet className="w-5 h-5" /> Log Daily Expense
        </h3>

        <form onSubmit={handleAddExpense} className="space-y-3.5">
          <div>
            <label className="text-xs text-olive-300 block mb-1">Expense Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 bg-olive-950 border border-gold-500/20 rounded-lg text-xs text-white outline-none"
            >
              <option value="Raw Material">Raw Material (Chicken, Rice, Meat)</option>
              <option value="Utilities">Utilities (Electricity, Gas, Water)</option>
              <option value="Staff Salary">Staff Salary & Daily Wages</option>
              <option value="Maintenance">Maintenance & Repairs</option>
              <option value="Packaging">Packaging & Takeaway Boxes</option>
              <option value="Misc">Miscellaneous Expenses</option>
              <option value="Custom">+ Add Custom Category...</option>
            </select>
            {category === 'Custom' && (
              <div className="mt-2">
                <input
                  type="text"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="Enter custom category name (e.g., Marketing, Rent)"
                  className="w-full px-3 py-2 bg-olive-950 border border-gold-500/30 rounded-lg text-xs text-white placeholder-olive-300 outline-none focus:border-gold-500"
                  required
                />
              </div>
            )}
          </div>

          <div>
            <label className="text-xs text-olive-300 block mb-1">Description / Particulars</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., 50kg Basmati Rice Sack"
              className="w-full px-3 py-2 bg-olive-950 border border-gold-500/20 rounded-lg text-xs text-white placeholder-olive-300 outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-olive-300 block mb-1">Amount (₹)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 bg-olive-950 border border-gold-500/20 rounded-lg text-xs text-white placeholder-olive-300 outline-none font-bold text-rose-400"
                required
              />
            </div>
            <div>
              <label className="text-xs text-olive-300 block mb-1">Expense Date</label>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full px-3 py-2 bg-olive-950 border border-gold-500/20 rounded-lg text-xs text-white outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-olive-300 block mb-1">Paid To / Supplier</label>
              <input
                type="text"
                value={paidTo}
                onChange={(e) => setPaidTo(e.target.value)}
                placeholder="Vendor name"
                className="w-full px-3 py-2 bg-olive-950 border border-gold-500/20 rounded-lg text-xs text-white outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-olive-300 block mb-1">Payment Mode</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full px-3 py-2 bg-olive-950 border border-gold-500/20 rounded-lg text-xs text-white outline-none"
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI / GPay</option>
                <option value="Card">Bank Card</option>
              </select>
            </div>
          </div>

          {errMsg && (
            <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{errMsg}</p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-gradient-to-r from-gold-500 to-gold-dark text-olive-950 font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md hover:scale-[1.02] transition-transform mt-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
          >
            <Plus className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Expense Entry'}
          </button>
        </form>
      </div>

      {/* Expense Ledger Table Right */}
      <div className="lg:col-span-2 bg-olive-900 border border-gold-500/20 rounded-2xl p-5 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-bold text-gold-500">Expenses Financial Ledger</h3>
          <span className="text-xs text-rose-400 font-extrabold px-3 py-1 bg-rose-500/10 border border-rose-500/30 rounded-lg">
            Total Logged: ₹{totalExpenseSum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-xs">
            <thead className="bg-olive-800 text-olive-300 font-semibold border-b border-gold-500/20">
              <tr>
                <th className="p-3">Category</th>
                <th className="p-3">Description</th>
                <th className="p-3">Vendor / Paid To</th>
                <th className="p-3">Date & Time</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gold-500/10">
              {expenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-olive-800/40 transition-colors">
                  <td className="p-3">
                    <span className="px-2 py-0.5 bg-gold-500/10 text-gold-400 border border-gold-500/30 rounded-md font-semibold text-[10px]">
                      {exp.category}
                    </span>
                  </td>
                  <td className="p-3 font-semibold text-white">{exp.description}</td>
                  <td className="p-3 text-olive-300">{exp.paidTo || '-'}</td>
                  <td className="p-3 text-olive-300">
                    {formatDateTimeDDMMYYYY(exp.createdAt || (exp as any).created_at || exp.expenseDate || (exp as any).expense_date)}
                  </td>
                  <td className="p-3 font-bold text-rose-400">₹{Number(exp.amount).toFixed(2)}</td>
                  <td className="p-3">
                    <button
                      onClick={() => handleDeleteExpense(exp.id)}
                      className="p-1 text-rose-500 hover:bg-rose-500/20 rounded transition-colors"
                      title="Delete Entry"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
