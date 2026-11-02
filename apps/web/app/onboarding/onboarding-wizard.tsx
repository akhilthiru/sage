'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Shield,
  Compass,
  Home,
  Car,
  Plane,
  GraduationCap,
  Heart,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { submitOnboarding, type OnboardingFormInput } from '@/app/actions/onboarding.actions';

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = React.useState<number>(1);
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Form State
  const [income, setIncome] = React.useState<number>(80000);
  const [savings, setSavings] = React.useState<number>(150000);
  const [emergencyMonths, setEmergencyMonths] = React.useState<number>(3);
  const [riskTolerance, setRiskTolerance] = React.useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');

  // Primary Goal State
  const [selectedGoalCategory, setSelectedGoalCategory] = React.useState<
    'HOUSING' | 'VEHICLE' | 'VACATION' | 'EDUCATION' | 'WEDDING' | 'EMERGENCY_FUND'
  >('HOUSING');
  const [goalName, setGoalName] = React.useState<string>('House Down Payment');
  const [goalAmount, setGoalAmount] = React.useState<number>(500000);
  const [goalMonths, setGoalMonths] = React.useState<number>(12);

  const goalTemplates = [
    {
      id: 'HOUSING',
      label: 'House Down Payment',
      category: 'HOUSING' as const,
      icon: Home,
      defaultAmount: 500000,
      defaultMonths: 24,
    },
    {
      id: 'VEHICLE',
      label: 'Buy a Vehicle',
      category: 'VEHICLE' as const,
      icon: Car,
      defaultAmount: 300000,
      defaultMonths: 12,
    },
    {
      id: 'VACATION',
      label: 'Dream Vacation',
      category: 'VACATION' as const,
      icon: Plane,
      defaultAmount: 150000,
      defaultMonths: 6,
    },
    {
      id: 'EDUCATION',
      label: 'Higher Education',
      category: 'EDUCATION' as const,
      icon: GraduationCap,
      defaultAmount: 400000,
      defaultMonths: 18,
    },
    {
      id: 'WEDDING',
      label: 'Wedding Celebration',
      category: 'WEDDING' as const,
      icon: Heart,
      defaultAmount: 600000,
      defaultMonths: 15,
    },
    {
      id: 'EMERGENCY_FUND',
      label: 'Safety Cushion',
      category: 'EMERGENCY_FUND' as const,
      icon: Shield,
      defaultAmount: 250000,
      defaultMonths: 9,
    },
  ];

  const handleSelectGoal = (template: typeof goalTemplates[number]) => {
    setSelectedGoalCategory(template.category);
    setGoalName(template.label);
    setGoalAmount(template.defaultAmount);
    setGoalMonths(template.defaultMonths);
  };

  const handleNext = () => {
    setErrorMessage(null);
    if (step === 1 && (!income || income <= 0)) {
      setErrorMessage('Please enter a valid monthly income greater than 0.');
      return;
    }
    if (step < 4) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setErrorMessage(null);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    const payload: OnboardingFormInput = {
      monthlyIncome: income,
      currentSavings: savings,
      emergencyFundTarget: income * emergencyMonths,
      riskTolerance,
      goal: {
        name: goalName,
        category: selectedGoalCategory,
        targetAmount: goalAmount,
        targetMonths: goalMonths,
      },
    };

    const res = await submitOnboarding(payload);
    setIsSubmitting(false);

    if (res.success) {
      router.push('/dashboard');
    } else {
      setErrorMessage(res.error ?? 'Failed to complete profile');
    }
  };

  const progressPercent = (step / 4) * 100;

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-4">
      {/* Header & Step progress */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-semibold tracking-wider uppercase text-emerald-400">
            Step {step} of 4
          </span>
          <span>{Math.round(progressPercent)}% Completed</span>
        </div>
        <Progress value={progressPercent} />
      </div>

      <Card className="border-slate-800 shadow-glass">
        <CardContent className="pt-8 pb-8 px-6 sm:px-10 space-y-8">
          {/* STEP 1: MONTHLY INCOME */}
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-950 text-emerald-400 flex items-center justify-center border border-emerald-800/60">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-bold text-white">What is your monthly take-home income?</h2>
                <p className="text-xs text-slate-400">
                  Include all primary salary and recurring income after taxes.
                </p>
              </div>

              <div className="space-y-4">
                <Input
                  label="Monthly Net Income (₹)"
                  type="number"
                  prefixSymbol="₹"
                  value={income || ''}
                  onChange={(e) => setIncome(Number(e.target.value))}
                  placeholder="80,000"
                />

                <div className="space-y-2">
                  <span className="text-xs text-slate-400">Quick Select:</span>
                  <div className="flex flex-wrap gap-2">
                    {[40000, 60000, 80000, 120000, 180000, 250000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setIncome(amt)}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                          income === amt
                            ? 'border-emerald-500 bg-emerald-950/60 text-emerald-300 font-semibold'
                            : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        ₹{amt.toLocaleString('en-IN')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: SAVINGS & EMERGENCY TARGET */}
          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-teal-950 text-teal-400 flex items-center justify-center border border-teal-800/60">
                  <Shield className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-bold text-white">Current Savings & Emergency Fund</h2>
                <p className="text-xs text-slate-400">
                  Your safety net protects your long-term goals from unexpected shocks.
                </p>
              </div>

              <div className="space-y-5">
                <Input
                  label="Current Liquid Savings (Savings Accounts, FDs) (₹)"
                  type="number"
                  prefixSymbol="₹"
                  value={savings || ''}
                  onChange={(e) => setSavings(Number(e.target.value))}
                  placeholder="1,50,000"
                />

                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-300">
                    Emergency Fund Target (Months of Income)
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[3, 6, 9].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setEmergencyMonths(m)}
                        className={`p-3 rounded-xl border text-center transition-all ${
                          emergencyMonths === m
                            ? 'border-emerald-500 bg-emerald-950/60 text-emerald-300'
                            : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="text-sm font-bold">{m} Months</div>
                        <div className="text-[11px] opacity-80">
                          ₹{(income * m).toLocaleString('en-IN')}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: RISK TOLERANCE */}
          {step === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-cyan-950 text-cyan-400 flex items-center justify-center border border-cyan-800/60">
                  <Compass className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-bold text-white">Financial Risk Appetite</h2>
                <p className="text-xs text-slate-400">
                  How aggressive should your discretionary surplus investments be?
                </p>
              </div>

              <div className="space-y-3">
                {[
                  {
                    id: 'LOW' as const,
                    title: 'Conservative (Safety First)',
                    desc: 'Prioritize fixed deposits, debt payoff, and emergency liquidity before equity exposure.',
                  },
                  {
                    id: 'MEDIUM' as const,
                    title: 'Moderate (Balanced Growth)',
                    desc: 'Balanced 50/30/20 allocation with index funds and steady goal contributions.',
                  },
                  {
                    id: 'HIGH' as const,
                    title: 'Aggressive (Wealth Acceleration)',
                    desc: 'Higher equity and market allocation for accelerated long-term wealth compounding.',
                  },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setRiskTolerance(item.id)}
                    className={`w-full p-4 rounded-xl border text-left transition-all ${
                      riskTolerance === item.id
                        ? 'border-emerald-500 bg-emerald-950/50 text-white shadow-glow-sm'
                        : 'border-slate-800 bg-slate-900/30 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-semibold text-sm text-slate-200 flex items-center justify-between">
                      {item.title}
                      {riskTolerance === item.id && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: PRIMARY FINANCIAL GOAL */}
          {step === 4 && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-purple-950 text-purple-400 flex items-center justify-center border border-purple-800/60">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-bold text-white">What is your primary financial goal?</h2>
                <p className="text-xs text-slate-400">
                  Sage will calculate monthly contributions and verify feasibility deterministically.
                </p>
              </div>

              {/* Goal Category Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {goalTemplates.map((template) => {
                  const Icon = template.icon;
                  const isSelected = selectedGoalCategory === template.category;
                  return (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => handleSelectGoal(template)}
                      className={`p-3.5 rounded-xl border flex flex-col items-center gap-2 text-center transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-950/60 text-emerald-300 font-semibold'
                          : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs">{template.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Goal Details Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <Input
                  label="Goal Name"
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                  placeholder="e.g. House Down Payment"
                />
                <Input
                  label="Target Amount (₹)"
                  type="number"
                  prefixSymbol="₹"
                  value={goalAmount || ''}
                  onChange={(e) => setGoalAmount(Number(e.target.value))}
                  placeholder="5,00,000"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-300">
                  Target Timeline: {goalMonths} Months
                </label>
                <input
                  type="range"
                  min="3"
                  max="60"
                  step="1"
                  value={goalMonths}
                  onChange={(e) => setGoalMonths(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>3 Months</span>
                  <span>1 Year</span>
                  <span>3 Years</span>
                  <span>5 Years</span>
                </div>
              </div>
            </div>
          )}

          {/* Inline Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs font-medium">
              {errorMessage}
            </div>
          )}

          {/* Action Navigation Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800/80">
            {step > 1 ? (
              <Button type="button" variant="outline" onClick={handleBack} disabled={isSubmitting}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            ) : (
              <div />
            )}

            <Button
              type="button"
              onClick={handleNext}
              isLoading={isSubmitting}
              className="px-6 shadow-glow-sm"
            >
              {step === 4 ? 'Complete Onboarding' : 'Continue'}
              {step < 4 && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
