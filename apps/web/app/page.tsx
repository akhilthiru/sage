import Link from 'next/link';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Target,
  Calculator,
  Compass,
  CheckCircle2,
  PieChart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function HomePage() {
  return (
    <div className="space-y-20 py-8">
      {/* Hero Section */}
      <section className="relative text-center space-y-8 max-w-4xl mx-auto pt-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-800/60 bg-emerald-950/40 text-emerald-400 text-xs font-medium">
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          <span>Core Principle: AI Explains, Engine Calculates</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
          Your Personal CFO.{' '}
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
            Always Available. Always Learning.
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Sage combines deterministic mathematical precision with empathetic AI
          guidance. Get personalized budget waterfalls, goal timelines, and purchase
          affordability simulations in minutes.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Link href="/onboarding">
            <Button size="lg" className="h-13 px-8 text-base shadow-glow-sm">
              <Compass className="w-5 h-5 mr-2" />
              Start 2-Minute Onboarding
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button size="lg" variant="secondary" className="h-13 px-7 text-base">
              <TrendingUp className="w-5 h-5 mr-2 text-emerald-400" />
              View Dashboard Cockpit
            </Button>
          </Link>
        </div>

        {/* Trust Badges */}
        <div className="pt-8 flex flex-wrap justify-center items-center gap-8 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Zero AI Math Hallucination</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-400" />
            <span>Bank-Grade Encryption</span>
          </div>
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-cyan-400" />
            <span>Dynamic Waterfall Allocation</span>
          </div>
        </div>
      </section>

      {/* Cockpit Sneak Peek Card */}
      <section className="relative rounded-3xl p-1 bg-gradient-to-b from-slate-700/40 via-slate-850/60 to-slate-900 border border-slate-800 shadow-2xl">
        <div className="rounded-[22px] bg-slate-950/90 p-6 sm:p-10 backdrop-blur-2xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2 p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Financial Health Score
              </span>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-extrabold text-emerald-400">82</span>
                <span className="text-xs font-semibold text-emerald-400/90">/ 100 • Excellent</span>
              </div>
              <p className="text-xs text-slate-400">
                Runway: 4.5 months • DTI Ratio: 12% • Savings Rate: 31%
              </p>
            </div>

            <div className="space-y-2 p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Monthly Waterfall
              </span>
              <div className="text-2xl font-bold text-white">
                ₹80,000 <span className="text-xs font-normal text-slate-400">Net Income</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex">
                <div className="bg-emerald-500 h-full w-[50%]" title="Needs 50%" />
                <div className="bg-amber-500 h-full w-[13%]" title="Debt 13%" />
                <div className="bg-teal-400 h-full w-[8%]" title="Emergency 8%" />
                <div className="bg-blue-500 h-full w-[19%]" title="Goals 19%" />
                <div className="bg-purple-500 h-full w-[10%]" title="Free 10%" />
              </div>
              <p className="text-xs text-slate-400">Needs 50% • Goals 19% • Debt 13% • Free 10%</p>
            </div>

            <div className="space-y-2 p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Primary Goal Feasibility
              </span>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white">🏠 House Down Payment</span>
                <Badge variant="success">On Track</Badge>
              </div>
              <div className="text-xs text-slate-400">
                ₹3,00,000 / ₹5,00,000 (60%) • 8 months remaining
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4 Feature Pillars */}
      <section className="space-y-8">
        <div className="text-center space-y-3">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            Engineered for Total Financial Clarity
          </h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto">
            Everything your personal CFO does is backed by deterministic equations,
            immutable audit trails, and instant insights.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="glass-panel-hover border-slate-800">
            <CardContent className="pt-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-950 text-emerald-400 flex items-center justify-center border border-emerald-800/60">
                <Compass className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-white text-base">2-Minute Onboarding</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Answer 4 simple questions. No bank logins needed. Get your instant
                financial baseline immediately.
              </p>
            </CardContent>
          </Card>

          <Card className="glass-panel-hover border-slate-800">
            <CardContent className="pt-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-teal-950 text-teal-400 flex items-center justify-center border border-teal-800/60">
                <PieChart className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-white text-base">Waterfall Allocation</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Smart priority algorithm streams your income into Needs, Debts,
                Emergency Fund, Goals, and Free Cash automatically.
              </p>
            </CardContent>
          </Card>

          <Card className="glass-panel-hover border-slate-800">
            <CardContent className="pt-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-950 text-cyan-400 flex items-center justify-center border border-cyan-800/60">
                <Calculator className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-white text-base">Decision Simulators</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                "Can I afford this iPhone or car?" Compare Cash vs Loan impacts and
                protect your emergency fund runway.
              </p>
            </CardContent>
          </Card>

          <Card className="glass-panel-hover border-slate-800">
            <CardContent className="pt-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-950 text-purple-400 flex items-center justify-center border border-purple-800/60">
                <Target className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-white text-base">Goal Timelines</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Continuous feasibility recalculation. Know exactly which month you will
                reach your target down payment or vacation fund.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="text-center p-10 rounded-3xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-teal-950/60 border border-emerald-800/30 space-y-5">
        <h2 className="text-2xl sm:text-3xl font-bold text-white">
          Take control of your financial destiny today.
        </h2>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          Start your financial profile now. It takes less than two minutes.
        </p>
        <Link href="/onboarding" className="inline-block">
          <Button size="lg" className="h-12 px-8">
            Get Started Now
          </Button>
        </Link>
      </section>
    </div>
  );
}
