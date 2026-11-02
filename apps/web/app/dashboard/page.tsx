import Link from 'next/link';
import {
  Calculator,
  Target,
  PlusCircle,
  Sparkles,
  TrendingUp,
  CreditCard,
} from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { dashboardService } from '@/lib/services';
import { Button } from '@/components/ui/button';
import { HealthCard } from '@/components/dashboard/health-card';
import { WaterfallCard } from '@/components/dashboard/waterfall-card';
import { GoalsCard } from '@/components/dashboard/goals-card';
import { ExpensesDebtsCard } from '@/components/dashboard/expenses-debts-card';

export const metadata = {
  title: 'Financial Cockpit — Sage CFO',
  description: 'Your aggregated real-time financial health and allocation cockpit.',
};

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const response = await dashboardService.getDashboard({ userId: user.id });
  const { dashboard } = response;

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Welcome & Quick Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Welcome back, {user.firstName}! 👋
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Your personal CFO cockpit is updated with deterministic engine allocations.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/simulator">
            <Button size="sm" variant="outline" className="border-slate-700 hover:border-slate-500">
              <Calculator className="w-4 h-4 mr-1.5 text-emerald-400" />
              Can I Afford This?
            </Button>
          </Link>
          <Link href="/goals">
            <Button size="sm" variant="secondary">
              <Target className="w-4 h-4 mr-1.5 text-purple-400" />
              New Goal
            </Button>
          </Link>
          <Link href="/onboarding">
            <Button size="sm" variant="ghost">
              Update Profile
            </Button>
          </Link>
        </div>
      </div>

      {/* Row 1: Health Score & Waterfall Allocation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <HealthCard health={dashboard.financialHealth} />
        </div>
        <div className="lg:col-span-2">
          <WaterfallCard allocation={dashboard.allocation} />
        </div>
      </div>

      {/* Row 2: Goals Card */}
      <div>
        <GoalsCard goals={dashboard.goals.active} summary={dashboard.goals.summary} />
      </div>

      {/* Row 3: Expenses and Debts */}
      <div>
        <ExpensesDebtsCard expenses={dashboard.expenses} debts={dashboard.debts} />
      </div>
    </div>
  );
}
