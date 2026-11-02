import * as React from 'react';
import Link from 'next/link';
import { Sparkles, Shield, Cpu, Lock } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-slate-800/80 bg-slate-950/40 py-8 text-xs text-slate-500">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-600/20 text-emerald-400">
            <Sparkles className="h-3 w-3" />
          </div>
          <span className="font-semibold text-slate-300">Sage Personal CFO</span>
          <span>—</span>
          <span>AI Explains, Engine Calculates</span>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Shield className="h-3.5 w-3.5 text-emerald-400" />
            <span>Deterministic Math</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <Lock className="h-3.5 w-3.5 text-cyan-400" />
            <span>Encrypted Persistence</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <Cpu className="h-3.5 w-3.5 text-purple-400" />
            <span>Modular Monolith</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
