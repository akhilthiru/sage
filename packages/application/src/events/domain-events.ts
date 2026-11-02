import { randomUUID } from 'crypto';

/**
 * Base Domain Event
 */
export abstract class DomainEvent {
  readonly eventId: string;
  readonly timestamp: Date;
  abstract readonly eventType: string;

  constructor() {
    this.eventId = randomUUID();
    this.timestamp = new Date();
  }
}

// User & Profile Events
export class UserOnboardingCompletedEvent extends DomainEvent {
  readonly eventType = 'UserOnboardingCompletedEvent';
  constructor(
    public readonly userId: string,
    public readonly monthlyIncome: number
  ) {
    super();
  }
}

export class IncomeUpdatedEvent extends DomainEvent {
  readonly eventType = 'IncomeUpdatedEvent';
  constructor(
    public readonly userId: string,
    public readonly oldIncome: number,
    public readonly newIncome: number
  ) {
    super();
  }
}

// Goal Events
export class GoalCreatedEvent extends DomainEvent {
  readonly eventType = 'GoalCreatedEvent';
  constructor(
    public readonly goalId: string,
    public readonly userId: string,
    public readonly targetAmount: number,
    public readonly targetDate: Date,
    public readonly priority: string
  ) {
    super();
  }
}

export class GoalUpdatedEvent extends DomainEvent {
  readonly eventType = 'GoalUpdatedEvent';
  constructor(
    public readonly goalId: string,
    public readonly userId: string,
    public readonly changes: Record<string, unknown>
  ) {
    super();
  }
}

export class GoalCompletedEvent extends DomainEvent {
  readonly eventType = 'GoalCompletedEvent';
  constructor(
    public readonly goalId: string,
    public readonly userId: string
  ) {
    super();
  }
}

export class GoalDeletedEvent extends DomainEvent {
  readonly eventType = 'GoalDeletedEvent';
  constructor(
    public readonly goalId: string,
    public readonly userId: string
  ) {
    super();
  }
}

// Expense Events
export class ExpenseRecordedEvent extends DomainEvent {
  readonly eventType = 'ExpenseRecordedEvent';
  constructor(
    public readonly expenseId: string,
    public readonly userId: string,
    public readonly amount: number,
    public readonly category: string
  ) {
    super();
  }
}

export class ExpenseUpdatedEvent extends DomainEvent {
  readonly eventType = 'ExpenseUpdatedEvent';
  constructor(
    public readonly expenseId: string,
    public readonly userId: string,
    public readonly changes: Record<string, unknown>
  ) {
    super();
  }
}

export class ExpenseDeletedEvent extends DomainEvent {
  readonly eventType = 'ExpenseDeletedEvent';
  constructor(
    public readonly expenseId: string,
    public readonly userId: string
  ) {
    super();
  }
}

// Debt Events
export class DebtRecordedEvent extends DomainEvent {
  readonly eventType = 'DebtRecordedEvent';
  constructor(
    public readonly debtId: string,
    public readonly userId: string,
    public readonly principal: number,
    public readonly interestRate: number
  ) {
    super();
  }
}

export class DebtPaymentRecordedEvent extends DomainEvent {
  readonly eventType = 'DebtPaymentRecordedEvent';
  constructor(
    public readonly paymentId: string,
    public readonly debtId: string,
    public readonly userId: string,
    public readonly amount: number,
    public readonly remainingBalance: number,
    public readonly isPaidOff: boolean
  ) {
    super();
  }
}

export class DebtPaidOffEvent extends DomainEvent {
  readonly eventType = 'DebtPaidOffEvent';
  constructor(
    public readonly debtId: string,
    public readonly userId: string
  ) {
    super();
  }
}

// Allocation Events
export class AllocationGeneratedEvent extends DomainEvent {
  readonly eventType = 'AllocationGeneratedEvent';
  constructor(
    public readonly allocationId: string,
    public readonly userId: string,
    public readonly needs: number,
    public readonly wants: number,
    public readonly savings: number
  ) {
    super();
  }
}

// Simulation Events
export class SimulationCompletedEvent extends DomainEvent {
  readonly eventType = 'SimulationCompletedEvent';
  constructor(
    public readonly simulationId: string,
    public readonly userId: string,
    public readonly simulationType: string
  ) {
    super();
  }
}

// Conversation Events
export class MessageSentEvent extends DomainEvent {
  readonly eventType = 'MessageSentEvent';
  constructor(
    public readonly messageId: string,
    public readonly conversationId: string,
    public readonly userId: string,
    public readonly role: string
  ) {
    super();
  }
}
