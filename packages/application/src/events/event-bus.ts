import { DomainEvent } from './domain-events';

export interface IEventPublisher {
  publish(event: DomainEvent): Promise<void>;
}

export type EventHandler<T extends DomainEvent = DomainEvent> = (event: T) => Promise<void> | void;

export interface IEventSubscriber {
  subscribe<T extends DomainEvent>(
    eventType: string,
    handler: EventHandler<T>
  ): () => void;
}

export class InProcessEventBus implements IEventPublisher, IEventSubscriber {
  private handlers = new Map<string, EventHandler<any>[]>();

  subscribe<T extends DomainEvent>(
    eventType: string,
    handler: EventHandler<T>
  ): () => void {
    const existing = this.handlers.get(eventType) ?? [];
    existing.push(handler);
    this.handlers.set(eventType, existing);

    // Return unsubscribe function
    return () => {
      const current = this.handlers.get(eventType);
      if (current) {
        this.handlers.set(
          eventType,
          current.filter((h) => h !== handler)
        );
      }
    };
  }

  async publish(event: DomainEvent): Promise<void> {
    const list = this.handlers.get(event.eventType) ?? [];
    await Promise.all(
      list.map(async (handler) => {
        try {
          await handler(event);
        } catch (error) {
          // Log error but do not disrupt other handlers or the caller
          console.error(`[InProcessEventBus] Error handling ${event.eventType}:`, error);
        }
      })
    );
  }

  clear(): void {
    this.handlers.clear();
  }

  listenerCount(eventType: string): number {
    return (this.handlers.get(eventType) ?? []).length;
  }
}
