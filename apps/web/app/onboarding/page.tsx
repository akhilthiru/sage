import { OnboardingWizard } from './onboarding-wizard';

export const metadata = {
  title: '2-Minute Onboarding — Sage CFO',
  description: 'Quickly set up your personal financial profile and baseline allocation.',
};

export default function OnboardingPage() {
  return (
    <div className="py-6">
      <div className="text-center max-w-xl mx-auto space-y-2 mb-8">
        <h1 className="text-3xl font-extrabold text-white">2-Minute Quick Setup</h1>
        <p className="text-sm text-slate-400">
          Answer 4 simple questions to establish your baseline budget waterfall and goal timeline.
        </p>
      </div>
      <OnboardingWizard />
    </div>
  );
}
