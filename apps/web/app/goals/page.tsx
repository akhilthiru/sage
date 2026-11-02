import { getCurrentUser } from '@/lib/auth';
import { goalService } from '@/lib/services';
import { GoalsManager } from './goals-manager';

export const metadata = {
  title: 'Financial Goals — Sage CFO',
  description: 'Manage and project your financial targets with deterministic timelines.',
};

export default async function GoalsPage() {
  const user = await getCurrentUser();
  const response = await goalService.listGoals({ userId: user.id });

  return (
    <div className="py-4">
      <GoalsManager initialGoals={response.goals} />
    </div>
  );
}
