import { type Conversation, type Message, Prisma } from '@prisma/client';
import { BaseRepository } from './base.repository';
import type {
  IConversationRepository,
  CreateConversationData,
  UpdateConversationData,
  CreateMessageData,
  ConversationWithMessages,
} from '../types/repository.types';
import type { Result } from '../errors/database-error';
import type { TransactionClient } from '../client';

export class ConversationRepository
  extends BaseRepository
  implements IConversationRepository
{
  async create(
    data: CreateConversationData,
    tx?: TransactionClient
  ): Promise<Result<Conversation>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      return client.conversation.create({
        data: {
          userId: data.userId,
          title: data.title ?? null,
        },
      });
    }, 'Failed to create conversation');
  }

  async createMessage(
    data: CreateMessageData,
    tx?: TransactionClient
  ): Promise<Result<Message>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      return client.message.create({
        data: {
          conversationId: data.conversationId,
          role: data.role,
          content: data.content,
          metadata: (data.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        },
      });
    }, 'Failed to create message');
  }

  async findById(id: string, tx?: TransactionClient): Promise<Result<Conversation | null>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      return client.conversation.findUnique({
        where: { id },
      });
    }, `Failed to find conversation by id: ${id}`);
  }

  async findByUserId(userId: string, tx?: TransactionClient): Promise<Result<Conversation[]>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      return client.conversation.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
      });
    }, `Failed to find conversations for user: ${userId}`);
  }

  async findWithMessages(
    id: string,
    tx?: TransactionClient
  ): Promise<Result<ConversationWithMessages | null>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      return client.conversation.findUnique({
        where: { id },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });
    }, `Failed to find conversation with messages: ${id}`);
  }

  async update(
    id: string,
    data: UpdateConversationData,
    tx?: TransactionClient
  ): Promise<Result<Conversation>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      return client.conversation.update({
        where: { id },
        data: {
          ...(data.title !== undefined ? { title: data.title } : {}),
        },
      });
    }, `Failed to update conversation: ${id}`);
  }

  async delete(id: string, tx?: TransactionClient): Promise<Result<Conversation>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      return client.conversation.delete({
        where: { id },
      });
    }, `Failed to delete conversation: ${id}`);
  }
}
