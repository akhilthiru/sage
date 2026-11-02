import { describe, it, expect, vi } from 'vitest';
import {
  InProcessEventBus,
  GoalCreatedEvent,
  UserOnboardingCompletedEvent,
  IncomeUpdatedEvent,
  ExpenseRecordedEvent,
  DebtRecordedEvent,
  DebtPaymentRecordedEvent,
  AllocationGeneratedEvent,
  SimulationCompletedEvent,
  MessageSentEvent,
  GoalUpdatedEvent,
  GoalCompletedEvent,
  GoalDeletedEvent,
  ExpenseUpdatedEvent,
  ExpenseDeletedEvent,
  DebtPaidOffEvent,
} from '../../src/events';

describe('InProcessEventBus & Domain Events', () => {
  it('should instantiate domain events with unique IDs and timestamps', () => {
    const e1 = new GoalCreatedEvent('g1', 'u1', 50000, new Date(), 'HIGH');
    const e2 = new GoalCreatedEvent('g2', 'u1', 100000, new Date(), 'LOW');
    expect(e1.eventId).toBeDefined();
    expect(e2.eventId).toBeDefined();
    expect(e1.eventId).not.toBe(e2.eventId);
    expect(e1.eventType).toBe('GoalCreatedEvent');
    expect(e1.timestamp).toBeInstanceOf(Date);
  });

  it('should subscribe and receive published events', async () => {
    const bus = new InProcessEventBus();
    const handler = vi.fn();

    const unsubscribe = bus.subscribe<GoalCreatedEvent>('GoalCreatedEvent', handler);
    expect(bus.listenerCount('GoalCreatedEvent')).toBe(1);

    const event = new GoalCreatedEvent('g1', 'u1', 50000, new Date(), 'HIGH');
    await bus.publish(event);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(event);

    // Unsubscribe
    unsubscribe();
    expect(bus.listenerCount('GoalCreatedEvent')).toBe(0);

    await bus.publish(event);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should not throw if a handler throws an error', async () => {
    const bus = new InProcessEventBus();
    const failingHandler = vi.fn().mockRejectedValue(new Error('Handler crashed'));
    const goodHandler = vi.fn();

    bus.subscribe('GoalCreatedEvent', failingHandler);
    bus.subscribe('GoalCreatedEvent', goodHandler);

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const event = new GoalCreatedEvent('g1', 'u1', 50000, new Date(), 'HIGH');

    await expect(bus.publish(event)).resolves.not.toThrow();
    expect(failingHandler).toHaveBeenCalledTimes(1);
    expect(goodHandler).toHaveBeenCalledTimes(1);
    consoleSpy.mockRestore();
  });

  it('should clear all handlers', () => {
    const bus = new InProcessEventBus();
    bus.subscribe('GoalCreatedEvent', () => {});
    bus.subscribe('IncomeUpdatedEvent', () => {});
    expect(bus.listenerCount('GoalCreatedEvent')).toBe(1);

    bus.clear();
    expect(bus.listenerCount('GoalCreatedEvent')).toBe(0);
    expect(bus.listenerCount('IncomeUpdatedEvent')).toBe(0);
  });

  it('should instantiate other event types properly', () => {
    expect(new UserOnboardingCompletedEvent('u1', 50000).eventType).toBe('UserOnboardingCompletedEvent');
    expect(new IncomeUpdatedEvent('u1', 40000, 50000).eventType).toBe('IncomeUpdatedEvent');
    expect(new ExpenseRecordedEvent('e1', 'u1', 1000, 'Food').eventType).toBe('ExpenseRecordedEvent');
    expect(new DebtRecordedEvent('d1', 'u1', 200000, 10).eventType).toBe('DebtRecordedEvent');
    expect(new DebtPaymentRecordedEvent('p1', 'd1', 'u1', 5000, 195000, false).eventType).toBe('DebtPaymentRecordedEvent');
    expect(new AllocationGeneratedEvent('a1', 'u1', 25000, 15000, 10000).eventType).toBe('AllocationGeneratedEvent');
    expect(new SimulationCompletedEvent('s1', 'u1', 'PURCHASE').eventType).toBe('SimulationCompletedEvent');
    expect(new MessageSentEvent('m1', 'c1', 'u1', 'USER').eventType).toBe('MessageSentEvent');
    expect(new GoalUpdatedEvent('g1', 'u1', { name: 'New' }).eventType).toBe('GoalUpdatedEvent');
    expect(new GoalCompletedEvent('g1', 'u1').eventType).toBe('GoalCompletedEvent');
    expect(new GoalDeletedEvent('g1', 'u1').eventType).toBe('GoalDeletedEvent');
    expect(new ExpenseUpdatedEvent('e1', 'u1', { amount: 500 }).eventType).toBe('ExpenseUpdatedEvent');
    expect(new ExpenseDeletedEvent('e1', 'u1').eventType).toBe('ExpenseDeletedEvent');
    expect(new DebtPaidOffEvent('d1', 'u1').eventType).toBe('DebtPaidOffEvent');
  });
});
