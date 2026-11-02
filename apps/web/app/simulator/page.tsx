import { SimulatorView } from './simulator-view';

export const metadata = {
  title: 'Financial Simulators — Sage CFO',
  description: 'Simulate purchase affordability and loan EMI scenarios deterministically.',
};

export default function SimulatorPage() {
  return (
    <div className="py-4">
      <SimulatorView />
    </div>
  );
}
