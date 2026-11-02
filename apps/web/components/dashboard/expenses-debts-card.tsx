import * as React from 'react';
import { CreditCard, Receipt, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import type { ExpenseSummaryDTO, DebtSummaryDTO } from '@sage/application';

interface ExpensesDebtsCardProps {
  expenses: {
    readonly recent: ExpenseSummaryDTO[];
    readonly monthlyTotal: number;
    readonly byCategory: Record<string, number>;
  };
  debts: {
    readonly active: DebtSummaryDTO[];
    readonly totalBalance: number;
    readonly totalMonthlyPayment: number;
  };
}

export function ExpensesDebtsCard({ expenses, debts }: ExpensesDebtsCardProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Expenses Summary */}
      <Card className="glass-panel border-slate-800">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-950 text-emerald-400 flex items-center justify-center border border-emerald-800/60">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-sm text-slate-200">Recurring Expenses</CardTitle>
              <span className="text-xs text-slate-400">
                {formatCurrency(expenses.monthlyTotal)} / month total
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {expenses.recent.slice(0, 3).map((exp) => (
            <div
              key={exp.id}
              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/60 text-xs"
            >
              <div className="space-y-0.5">
                <span className="font-medium text-slate-200 block capitalize">{exp.category.toLowerCase().replace(/_/g, ' ')}</span>
                <span className="text-[10px] text-slate-500">{exp.isRecurring ? 'Recurring' : 'One-time'}</span>
              </div>
              <span className="font-semibold text-white">{formatCurrency(exp.amount)}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Debts Summary */}
      <Card className="glass-panel border-slate-800">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-950 text-amber-400 flex items-center justify-center border border-amber-800/60">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-sm text-slate-200">Active Debts & EMIs</CardTitle>
              <span className="text-xs text-slate-400">
                {formatCurrency(debts.totalMonthlyPayment)} / month total EMI
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {debts.active.length === 0 ? (
            <div className="text-center py-4 text-xs text-slate-500">
              🎉 No active debt obligations!
            </div>
          ) : (
            debts.active.map((debt) => (
              <div
                key={debt.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/60 text-xs"
              >
                <div className="space-y-0.5">
                  <span className="font-medium text-slate-200 block">{debt.name}</span>
                  <span className="text-[10px] text-slate-500">
                    Bal: {formatCurrency(debt.currentBalance)} • {debt.status}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-amber-400 block">
                    {formatCurrency(debt.monthlyPayment)}/mo
                  </span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
