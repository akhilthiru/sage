import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import type { AllocationDTO } from '@sage/application';

interface WaterfallCardProps {
  allocation: AllocationDTO;
}

export function WaterfallCard({ allocation }: WaterfallCardProps) {
  const totalIncome = allocation.monthlyIncome || 1;
  const breakdown = allocation.breakdown || {
    fixedExpenses: 0,
    variableExpenses: 0,
    debtPayments: 0,
    emergencyFund: 0,
    goalContributions: 0,
    discretionary: 0,
  };

  const essentialAmount = breakdown.fixedExpenses + breakdown.variableExpenses;
  const debtAmount = breakdown.debtPayments;
  const emergencyFundAmount = breakdown.emergencyFund;
  const goalsAmount = breakdown.goalContributions;
  const discretionaryAmount = breakdown.discretionary;

  const pEssential = Math.round((essentialAmount / totalIncome) * 100);
  const pDebt = Math.round((debtAmount / totalIncome) * 100);
  const pEmergency = Math.round((emergencyFundAmount / totalIncome) * 100);
  const pGoals = Math.round((goalsAmount / totalIncome) * 100);
  const pFree = Math.round((discretionaryAmount / totalIncome) * 100);

  const categories = [
    { label: 'Essential Needs', amount: essentialAmount, pct: pEssential, color: 'bg-emerald-500' },
    { label: 'Debt Payments', amount: debtAmount, pct: pDebt, color: 'bg-amber-500' },
    { label: 'Emergency Fund', amount: emergencyFundAmount, pct: pEmergency, color: 'bg-teal-400' },
    { label: 'Goal Savings', amount: goalsAmount, pct: pGoals, color: 'bg-blue-500' },
    { label: 'Free Cash', amount: discretionaryAmount, pct: pFree, color: 'bg-cyan-400' },
  ];

  return (
    <Card className="glass-panel border-slate-800">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base text-slate-200">Monthly Waterfall Allocation</CardTitle>
          <p className="text-xs text-slate-400">Deterministic cash flow priority distribution</p>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-400 block">Total Income</span>
          <span className="text-lg font-bold text-white">{formatCurrency(allocation.monthlyIncome)}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Visual Multi-Segment Bar */}
        <div className="space-y-1.5">
          <div className="w-full h-3.5 bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
            <div style={{ width: `${pEssential}%` }} className="bg-emerald-500 h-full transition-all duration-300" title={`Needs: ${pEssential}%`} />
            <div style={{ width: `${pDebt}%` }} className="bg-amber-500 h-full transition-all duration-300" title={`Debts: ${pDebt}%`} />
            <div style={{ width: `${pEmergency}%` }} className="bg-teal-400 h-full transition-all duration-300" title={`Emergency: ${pEmergency}%`} />
            <div style={{ width: `${pGoals}%` }} className="bg-blue-500 h-full transition-all duration-300" title={`Goals: ${pGoals}%`} />
            <div style={{ width: `${pFree}%` }} className="bg-cyan-400 h-full transition-all duration-300" title={`Free: ${pFree}%`} />
          </div>
        </div>

        {/* Breakdown Items Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {categories.map((cat) => (
            <div key={cat.label} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${cat.color}`} />
                <span className="text-xs text-slate-400 truncate">{cat.label}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-bold text-white">{formatCurrency(cat.amount)}</span>
                <span className="text-[11px] text-slate-500 font-semibold">{cat.pct}%</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
