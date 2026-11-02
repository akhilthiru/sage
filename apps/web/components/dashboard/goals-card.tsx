import * as React from 'react';
import Link from 'next/link';
import { Target, ArrowRight, CheckCircle2, Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/lib/utils';
import type { GoalSummaryDTO } from '@sage/application';

interface GoalsCardProps {
  goals: GoalSummaryDTO[];
  summary: {
    totalGoals: number;
    onTrack: number;
    atRisk: number;
    totalProgress: number;
  };
}

export function GoalsCard({ goals, summary }: GoalsCardProps) {
  return (
    <Card className="glass-panel border-slate-800">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base text-slate-200">Active Goals ({goals.length})</CardTitle>
          <p className="text-xs text-slate-400">
            {summary.onTrack} on track • {summary.atRisk} require attention
          </p>
        </div>
        <Link href="/goals">
          <Button size="sm" variant="ghost" className="text-xs text-emerald-400 hover:text-emerald-300">
            View All
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        {goals.length === 0 ? (
          <div className="text-center py-6 space-y-2">
            <p className="text-xs text-slate-400">No active goals found.</p>
            <Link href="/goals">
              <Button size="sm">Create First Goal</Button>
            </Link>
          </div>
        ) : (
          goals.slice(0, 3).map((goal) => {
            const progress = goal.progressPercentage;
            const isCompleted = goal.status === 'COMPLETED';
            return (
              <div
                key={goal.id}
                className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2.5 transition-all hover:border-slate-700"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-slate-200">{goal.name}</span>
                  <Badge variant={isCompleted ? 'success' : 'sage'} className="text-[10px]">
                    {goal.status}
                  </Badge>
                </div>

                <Progress value={progress} />

                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>
                    {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                  </span>
                  <span className="font-semibold text-slate-300">{Math.round(progress)}%</span>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
