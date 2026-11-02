'use client';

import * as React from 'react';
import {
  Calculator,
  ShoppingBag,
  CreditCard,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Clock,
  ArrowRight,
  TrendingDown,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import {
  runPurchaseSimulationAction,
  runLoanSimulationAction,
} from '@/app/actions/simulation.actions';
import type { SimulatePurchaseResponse, SimulateLoanResponse } from '@sage/application';

export function SimulatorView() {
  const [activeTab, setActiveTab] = React.useState<'PURCHASE' | 'LOAN'>('PURCHASE');

  // Purchase Form State
  const [purchaseName, setPurchaseName] = React.useState('MacBook Pro M3 Max');
  const [purchaseAmount, setPurchaseAmount] = React.useState(250000);
  const [isSimulatingPurchase, setIsSimulatingPurchase] = React.useState(false);
  const [purchaseResult, setPurchaseResult] = React.useState<SimulatePurchaseResponse | null>(null);
  const [purchaseError, setPurchaseError] = React.useState<string | null>(null);

  // Loan Form State
  const [loanAmount, setLoanAmount] = React.useState(500000);
  const [interestRate, setInterestRate] = React.useState(10.5);
  const [termMonths, setTermMonths] = React.useState(36);
  const [purpose, setPurpose] = React.useState('Car / Auto Loan');
  const [isSimulatingLoan, setIsSimulatingLoan] = React.useState(false);
  const [loanResult, setLoanResult] = React.useState<SimulateLoanResponse | null>(null);
  const [loanError, setLoanError] = React.useState<string | null>(null);

  // Run initial purchase simulation on mount
  React.useEffect(() => {
    handleRunPurchase(purchaseName, purchaseAmount);
  }, []);

  const handleRunPurchase = async (name: string, amt: number) => {
    if (!amt || amt <= 0) return;
    setIsSimulatingPurchase(true);
    setPurchaseError(null);
    const res = await runPurchaseSimulationAction({ name, amount: amt });
    setIsSimulatingPurchase(false);
    if (res.success && res.data) {
      setPurchaseResult(res.data);
    } else {
      setPurchaseError(res.error ?? 'Simulation failed');
    }
  };

  const handleRunLoan = async () => {
    if (!loanAmount || loanAmount <= 0) return;
    setIsSimulatingLoan(true);
    setLoanError(null);
    const res = await runLoanSimulationAction({
      loanAmount,
      interestRate,
      termMonths,
      purpose,
    });
    setIsSimulatingLoan(false);
    if (res.success && res.data) {
      setLoanResult(res.data);
    } else {
      setLoanError(res.error ?? 'Loan simulation failed');
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header and Tab Selector */}
      <div className="space-y-4 text-center">
        <h1 className="text-3xl font-extrabold text-white">Financial Decision Simulators</h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
          Test financial commitments before you make them. Deterministically evaluate cash flow,
          emergency runway depletion, and goal delays.
        </p>

        <div className="inline-flex p-1 rounded-2xl bg-slate-900 border border-slate-800 shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTab('PURCHASE')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'PURCHASE'
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/80 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            Can I Afford This?
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('LOAN');
              if (!loanResult) handleRunLoan();
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'LOAN'
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/80 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Loan Feasibility & EMI
          </button>
        </div>
      </div>

      {/* TAB 1: PURCHASE SIMULATOR */}
      {activeTab === 'PURCHASE' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-fade-in">
          {/* Controls */}
          <div className="md:col-span-5 space-y-4">
            <Card className="glass-panel border-slate-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-slate-200">Purchase Parameters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  label="Item / Purchase Description"
                  value={purchaseName}
                  onChange={(e) => setPurchaseName(e.target.value)}
                  placeholder="e.g. iPhone 16 Pro Max"
                />

                <Input
                  label="Purchase Cost (₹)"
                  type="number"
                  prefixSymbol="₹"
                  value={purchaseAmount || ''}
                  onChange={(e) => setPurchaseAmount(Number(e.target.value))}
                  placeholder="1,30,000"
                />

                <div className="space-y-1.5">
                  <span className="text-xs text-slate-400">Popular Quick Scenarios:</span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { name: 'iPhone 16 Pro', amt: 134900 },
                      { name: 'MacBook Pro', amt: 250000 },
                      { name: 'Japan Trip', amt: 200000 },
                      { name: 'Home Theater', amt: 85000 },
                    ].map((item) => (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => {
                          setPurchaseName(item.name);
                          setPurchaseAmount(item.amt);
                          handleRunPurchase(item.name, item.amt);
                        }}
                        className="text-[11px] px-2.5 py-1 rounded-lg border border-slate-800 bg-slate-950/60 text-slate-400 hover:text-emerald-400 hover:border-emerald-800/60 transition-all"
                      >
                        {item.name} ({formatCurrency(item.amt)})
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  className="w-full mt-2"
                  onClick={() => handleRunPurchase(purchaseName, purchaseAmount)}
                  isLoading={isSimulatingPurchase}
                >
                  <Calculator className="w-4 h-4 mr-2" />
                  Evaluate Affordability
                </Button>

                {purchaseError && (
                  <p className="text-xs text-rose-400 font-medium">{purchaseError}</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Results Display */}
          <div className="md:col-span-7 space-y-4">
            {purchaseResult && (
              <Card className="glass-panel border-slate-800">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 uppercase tracking-wider block">
                      CFO Verdict
                    </span>
                    <CardTitle className="text-lg text-white">{purchaseName}</CardTitle>
                  </div>
                  <Badge
                    variant={purchaseResult.canAfford ? 'success' : 'warning'}
                    className="text-xs uppercase px-3 py-1 font-bold"
                  >
                    {purchaseResult.canAfford ? 'Affordable' : 'Risky / Stretch'}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Recommendation banner */}
                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-300 leading-relaxed">
                    <span className="font-semibold text-emerald-400 block mb-1">
                      💡 Analysis:
                    </span>
                    {purchaseResult.recommendation}
                  </div>

                  {/* Impact Metrics */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                      <span className="text-slate-400 text-[11px] block">Savings Impact</span>
                      <span className="text-sm font-bold text-rose-400">
                        -{formatCurrency(purchaseResult.impact.savingsReduction)}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                      <span className="text-slate-400 text-[11px] block">Runway Recovery</span>
                      <span className="text-sm font-bold text-emerald-400">
                        {purchaseResult.impact.monthsToRecover} Months
                      </span>
                    </div>
                  </div>

                  {/* Goal Delays */}
                  {purchaseResult.impact.goalDelays.length > 0 ? (
                    <div className="space-y-2 pt-2 border-t border-slate-800/80">
                      <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Impact on Active Goals:
                      </span>
                      <div className="space-y-1.5">
                        {purchaseResult.impact.goalDelays.map((gd) => (
                          <div
                            key={gd.goalId}
                            className="flex items-center justify-between text-xs p-2 rounded-lg bg-amber-950/20 border border-amber-800/30 text-slate-300"
                          >
                            <span>{gd.goalName}</span>
                            <span className="text-amber-400 font-semibold">
                              Delayed by {gd.delayMonths} mo
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-emerald-400 flex items-center gap-1.5 pt-2 border-t border-slate-800/80">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Zero delay to existing goals!</span>
                    </div>
                  )}

                  {/* Alternatives */}
                  {purchaseResult.alternatives.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                      <span className="text-xs font-medium text-slate-400">
                        Smart Alternatives:
                      </span>
                      <ul className="space-y-1 text-xs text-slate-400">
                        {purchaseResult.alternatives.map((alt, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-emerald-400 font-bold">•</span>
                            <span>{alt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: LOAN SIMULATOR */}
      {activeTab === 'LOAN' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-fade-in">
          {/* Controls */}
          <div className="md:col-span-5 space-y-4">
            <Card className="glass-panel border-slate-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-slate-200">Loan & EMI Parameters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  label="Loan Purpose"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g. Car Loan, Home Improvement"
                />

                <Input
                  label="Principal Amount (₹)"
                  type="number"
                  prefixSymbol="₹"
                  value={loanAmount || ''}
                  onChange={(e) => setLoanAmount(Number(e.target.value))}
                  placeholder="5,00,000"
                />

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Interest Rate (%)"
                    type="number"
                    step="0.1"
                    value={interestRate || ''}
                    onChange={(e) => setInterestRate(Number(e.target.value))}
                    placeholder="10.5"
                  />
                  <Input
                    label="Tenure (Months)"
                    type="number"
                    value={termMonths || ''}
                    onChange={(e) => setTermMonths(Number(e.target.value))}
                    placeholder="36"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-slate-400">Tenure Presets:</span>
                  <div className="flex gap-2">
                    {[12, 24, 36, 60].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setTermMonths(m)}
                        className={`text-xs px-2.5 py-1 rounded-lg border ${
                          termMonths === m
                            ? 'border-emerald-500 bg-emerald-950/60 text-emerald-300 font-semibold'
                            : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-white'
                        }`}
                      >
                        {m} Mo ({Math.round(m / 12)}y)
                      </button>
                    ))}
                  </div>
                </div>

                <Button className="w-full mt-2" onClick={handleRunLoan} isLoading={isSimulatingLoan}>
                  <Calculator className="w-4 h-4 mr-2" />
                  Calculate EMI & Impact
                </Button>

                {loanError && <p className="text-xs text-rose-400 font-medium">{loanError}</p>}
              </CardContent>
            </Card>
          </div>

          {/* Results Display */}
          <div className="md:col-span-7 space-y-4">
            {loanResult && (
              <Card className="glass-panel border-slate-800">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 uppercase tracking-wider block">
                      Deterministic EMI Breakdown
                    </span>
                    <CardTitle className="text-lg text-white">{purpose}</CardTitle>
                  </div>
                  <Badge
                    variant={
                      loanResult.affordability === 'AFFORDABLE'
                        ? 'success'
                        : loanResult.affordability === 'TIGHT'
                        ? 'warning'
                        : 'error'
                    }
                    className="text-xs uppercase px-3 py-1 font-bold"
                  >
                    {loanResult.affordability}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Big EMI Highlight */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between shadow-glow-sm">
                    <div>
                      <span className="text-xs text-slate-400 block">Monthly EMI Obligation</span>
                      <span className="text-3xl font-extrabold text-emerald-400">
                        {formatCurrency(loanResult.monthlyPayment)}
                      </span>
                      <span className="text-[11px] text-slate-500 block">for {termMonths} months</span>
                    </div>
                    <div className="text-right space-y-1">
                      <span className="text-xs text-slate-400 block">Total Interest</span>
                      <span className="text-sm font-semibold text-amber-400">
                        {formatCurrency(loanResult.totalInterest)}
                      </span>
                      <span className="text-[11px] text-slate-500 block">
                        Total Cost: {formatCurrency(loanResult.totalCost)}
                      </span>
                    </div>
                  </div>

                  {/* Recommendation */}
                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-300 leading-relaxed">
                    <span className="font-semibold text-emerald-400 block mb-1">
                      💡 CFO Recommendation:
                    </span>
                    {loanResult.recommendation}
                  </div>

                  {/* Impact on Debt-to-income */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                      <span className="text-slate-400 text-[11px] block">New DTI Ratio</span>
                      <span className="text-sm font-bold text-teal-400">
                        {Math.round(loanResult.impact.debtToIncomeRatio * 100)}%
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                      <span className="text-slate-400 text-[11px] block">Updated Free Cash</span>
                      <span className="text-sm font-bold text-cyan-400">
                        {formatCurrency(loanResult.impact.newAllocation.breakdown.discretionary)}/mo
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
