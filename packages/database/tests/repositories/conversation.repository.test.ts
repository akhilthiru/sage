import { describe, it, expect } from 'vitest';
import type { Conversation, Message } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { ConversationRepository } from '../../src/repositories/conversation.repository';
import { prismaMock, txMock } from '../mocks/prisma.mock';

describe('ConversationRepository Unit Tests', () => {
  const repository = new ConversationRepository(prismaMock as unknown as never);

  const mockConversation: Conversation = {
    id: 'conv_123',
    userId: 'user_123',
    title: 'Financial Planning Chat',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const mockMessage: Message = {
    id: 'msg_123',
    conversationId: 'conv_123',
    role: 'USER',
    content: 'Can I afford to buy a car worth 1500000?',
    metadata: { intent: 'purchase_simulation' },
    createdAt: new Date('2026-01-01'),
  };

  describe('create & createMessage', () => {
    it('should create a conversation', async () => {
      prismaMock.conversation.create.mockResolvedValueOnce(mockConversation);

      const result = await repository.create({
        userId: 'user_123',
        title: 'Financial Planning Chat',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockConversation);
      }
      expect(prismaMock.conversation.create).toHaveBeenCalledWith({
        data: {
          userId: 'user_123',
          title: 'Financial Planning Chat',
        },
      });
    });

    it('should create a message linked to conversation with metadata', async () => {
      prismaMock.message.create.mockResolvedValueOnce(mockMessage);

      const result = await repository.createMessage({
        conversationId: 'conv_123',
        role: 'USER',
        content: 'Can I afford to buy a car worth 1500000?',
        metadata: { intent: 'purchase_simulation' },
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockMessage);
      }
      expect(prismaMock.message.create).toHaveBeenCalledWith({
        data: {
          conversationId: 'conv_123',
          role: 'USER',
          content: 'Can I afford to buy a car worth 1500000?',
          metadata: { intent: 'purchase_simulation' },
        },
      });
    });
  });

  describe('findById, findByUserId & findWithMessages', () => {
    it('should find conversation by id', async () => {
      prismaMock.conversation.findUnique.mockResolvedValueOnce(mockConversation);

      const result = await repository.findById('conv_123');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockConversation);
      }
    });

    it('should find conversation with messages in chronological order', async () => {
      const convWithMessages = { ...mockConversation, messages: [mockMessage] };
      prismaMock.conversation.findUnique.mockResolvedValueOnce(convWithMessages);

      const result = await repository.findWithMessages('conv_123');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data?.messages).toHaveLength(1);
      }
      expect(prismaMock.conversation.findUnique).toHaveBeenCalledWith({
        where: { id: 'conv_123' },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });
    });
  });

  describe('update & delete', () => {
    it('should update conversation title', async () => {
      prismaMock.conversation.update.mockResolvedValueOnce({
        ...mockConversation,
        title: 'Updated Title',
      });

      const result = await repository.update('conv_123', { title: 'Updated Title' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe('Updated Title');
      }
    });

    it('should delete conversation', async () => {
      prismaMock.conversation.delete.mockResolvedValueOnce(mockConversation);

      const result = await repository.delete('conv_123');
      expect(result.success).toBe(true);
      expect(prismaMock.conversation.delete).toHaveBeenCalledWith({
        where: { id: 'conv_123' },
      });
    });
  });
});
