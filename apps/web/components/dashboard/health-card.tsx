import * as React from 'react';
import { ShieldCheck, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { FinancialHealthDTO } from '@sage/application';

interface HealthCardProps {
  health: FinancialHealthDTO;
}

export function HealthCard({ health }: HealthCardProps) {
  const { score, status, grade, factors, recommendations } = health;

  const statusVariant =
    status === 'EXCELLENT' || status === 'GOOD'
      ? 'success'
      : status === 'FAIR'
      ? 'warning'
      : 'error';

  return (
    <Card className="glass-panel border-slate-800">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base text-slate-200">Financial Health Score</CardTitle>
          <p className="text-xs text-slate-400">Deterministic composite score across 4 key financial pillars</p>
        </div>
        <Badge variant={statusVariant} className="text-xs uppercase">
          Grade {grade} • {status}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Big score meter */}
        <div className="flex items-center gap-6">
          <div className="relative flex items-center justify-center w-24 h-24 rounded-2xl bg-slate-950 border border-slate-800 shadow-glow-sm">
            <span className="text-4xl font-extrabold bg-gradient-to-tr from-emerald-400 to-teal-200 bg-clip-text text-transparent">
              {score}
            </span>
            <span className="absolute bottom-1.5 text-[9px] uppercase tracking-wider text-slate-500 font-semibold">
              / 100
            </span>
          </div>

          <div className="flex-1 grid grid-cols-2 gap-3 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-slate-400 block text-[11px]">Savings Rate</span>
              <span className="font-semibold text-emerald-400 text-sm">
                {Math.round(factors.savingsRate * 100)}%
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-slate-400 block text-[11px]">Debt-to-Income</span>
              <span className="font-semibold text-teal-400 text-sm">
                {Math.round(factors.debtToIncome * 100)}%
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-slate-400 block text-[11px]">Emergency Runway</span>
              <span className="font-semibold text-cyan-400 text-sm">
                {factors.emergencyFund > 0 ? `${factors.emergencyFund.toFixed(1)} mo` : 'Building'}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-slate-400 block text-[11px]">Income Stability</span>
              <span className="font-semibold text-purple-400 text-sm">
                {Math.round(factors.incomeStability * 100)}%
              </span>
            </div>
          </div>
        </div>

        {/* AI Recommendations */}
        {recommendations.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              CFO Insights:
            </span>
            <ul className="space-y-1.5">
              {recommendations.slice(0, 2).map((rec, idx) => (
                <li key={idx} className="text-xs text-slate-400 flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
