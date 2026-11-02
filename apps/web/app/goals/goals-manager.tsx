'use client';

import * as React from 'react';
import {
  Target,
  Plus,
  Trash2,
  Calendar,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/lib/utils';
import {
  createGoalAction,
  updateGoalProgressAction,
  deleteGoalAction,
} from '@/app/actions/goal.actions';
import type { GoalDTO } from '@sage/application';

interface GoalsManagerProps {
  initialGoals: GoalDTO[];
}

export function GoalsManager({ initialGoals }: GoalsManagerProps) {
  const [goals, setGoals] = React.useState<GoalDTO[]>(initialGoals);
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // New Goal Form State
  const [name, setName] = React.useState('');
  const [category, setCategory] = React.useState('HOUSING');
  const [targetAmount, setTargetAmount] = React.useState<number>(500000);
  const [currentAmount, setCurrentAmount] = React.useState<number>(0);
  const [months, setMonths] = React.useState<number>(12);
  const [priority, setPriority] = React.useState<'HIGH' | 'MEDIUM' | 'LOW'>('MEDIUM');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Goal name is required');
      return;
    }
    if (!targetAmount || targetAmount <= 0) {
      setErrorMsg('Target amount must be greater than zero');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const now = new Date();
    const targetDate = new Date(now.getFullYear(), now.getMonth() + months, 1);

    const res = await createGoalAction({
      name,
      category,
      targetAmount,
      currentAmount,
      targetDate: targetDate.toISOString(),
      priority,
    });

    setIsSubmitting(false);

    if (res.success && res.data) {
      setGoals([...goals, res.data.goal]);
      setShowCreateModal(false);
      setName('');
    } else {
      setErrorMsg(res.error ?? 'Failed to create goal');
    }
  };

  const handleAddFunds = async (goalId: string, amount: number) => {
    const res = await updateGoalProgressAction(goalId, amount);
    if (res.success && res.data) {
      setGoals(goals.map((g) => (g.id === goalId ? res.data.goal : g)));
    }
  };

  const handleDelete = async (goalId: string) => {
    if (!confirm('Are you sure you want to remove this goal?')) return;
    const res = await deleteGoalAction(goalId);
    if (res.success) {
      setGoals(goals.filter((g) => g.id !== goalId));
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2">
            <Target className="w-7 h-7 text-emerald-400" />
            Financial Goals
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Track and project target dates with deterministic waterfall calculations.
          </p>
        </div>

        <Button onClick={() => setShowCreateModal(true)} className="shadow-glow-sm">
          <Plus className="w-4 h-4 mr-2" />
          Create New Goal
        </Button>
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {goals.map((goal) => {
          const progress = goal.progressPercentage;
          const isDone = goal.currentAmount >= goal.targetAmount;

          return (
            <Card key={goal.id} className="glass-panel border-slate-800 flex flex-col justify-between">
              <CardHeader className="pb-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <CardTitle className="text-base text-white">{goal.name}</CardTitle>
                    <span className="text-[11px] text-slate-400 block capitalize">
                      {goal.category.toLowerCase().replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge variant={isDone ? 'success' : 'sage'} className="text-[10px]">
                      {goal.feasibility}
                    </Badge>
                    <button
                      type="button"
                      onClick={() => handleDelete(goal.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors"
                      title="Delete goal"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>
                      {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                    </span>
                    <span className="font-semibold text-white">{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} />
                </div>

                {/* Sub-metrics */}
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-800/80">
                  <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/60">
                    <span className="text-slate-400 block text-[10px]">Required Monthly</span>
                    <span className="font-bold text-emerald-400">
                      {formatCurrency(goal.monthlySavingsRequired)}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/60">
                    <span className="text-slate-400 block text-[10px]">Target Date</span>
                    <span className="font-bold text-slate-200">
                      {new Date(goal.targetDate).toLocaleDateString('en-US', {
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                {/* Quick Add Funds */}
                {!isDone && (
                  <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-800/60">
                    <span className="text-[11px] text-slate-400">Contribute:</span>
                    <div className="flex gap-1.5">
                      {[5000, 10000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => handleAddFunds(goal.id, amt)}
                          className="text-[10px] px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-emerald-400 hover:border-emerald-800/60 transition-all"
                        >
                          +{formatCurrency(amt)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* CREATE GOAL MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <Card className="w-full max-w-lg border-slate-800 shadow-2xl bg-slate-900">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-800">
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-emerald-400" />
                Add New Financial Goal
              </CardTitle>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleCreate} className="space-y-4">
                <Input
                  label="Goal Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Wedding Savings, House Down Payment"
                  required
                />

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-300">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full h-11 rounded-xl border border-slate-800 bg-slate-950/60 px-3 text-sm text-slate-100 focus-visible:outline-none focus-visible:border-primary-500"
                    >
                      <option value="HOUSING">Housing</option>
                      <option value="VEHICLE">Vehicle</option>
                      <option value="VACATION">Vacation</option>
                      <option value="EDUCATION">Education</option>
                      <option value="WEDDING">Wedding</option>
                      <option value="EMERGENCY_FUND">Emergency Fund</option>
                      <option value="RETIREMENT">Retirement</option>
                      <option value="CUSTOM">Custom</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-300">Priority</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                      className="w-full h-11 rounded-xl border border-slate-800 bg-slate-950/60 px-3 text-sm text-slate-100 focus-visible:outline-none focus-visible:border-primary-500"
                    >
                      <option value="HIGH">High Priority</option>
                      <option value="MEDIUM">Medium Priority</option>
                      <option value="LOW">Low Priority</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Target Amount (₹)"
                    type="number"
                    prefixSymbol="₹"
                    value={targetAmount || ''}
                    onChange={(e) => setTargetAmount(Number(e.target.value))}
                    required
                  />

                  <Input
                    label="Initial Saved (₹)"
                    type="number"
                    prefixSymbol="₹"
                    value={currentAmount || ''}
                    onChange={(e) => setCurrentAmount(Number(e.target.value))}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-300">
                    Target Timeline: {months} Months
                  </label>
                  <input
                    type="range"
                    min="2"
                    max="60"
                    step="1"
                    value={months}
                    onChange={(e) => setMonths(Number(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>2 Months</span>
                    <span>1 Year</span>
                    <span>3 Years</span>
                    <span>5 Years</span>
                  </div>
                </div>

                {errorMsg && <p className="text-xs text-rose-400 font-medium">{errorMsg}</p>}

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateModal(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" isLoading={isSubmitting}>
                    Save Goal
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
