import { describe, it, expect } from 'vitest';
import type { Simulation } from '@prisma/client';
import { SimulationRepository } from '../../src/repositories/simulation.repository';
import { prismaMock, txMock } from '../mocks/prisma.mock';

describe('SimulationRepository Unit Tests', () => {
  const repository = new SimulationRepository(prismaMock as unknown as never);

  const mockSimulation: Simulation = {
    id: 'sim_123',
    userId: 'user_123',
    type: 'PURCHASE_AFFORDABILITY',
    parameters: { itemCost: 500000, currentSavings: 100000 },
    results: { isAffordable: true, delayMonths: 4 },
    title: 'Car Purchase Simulation',
    description: 'Evaluating feasibility of buying a car',
    createdAt: new Date('2026-01-01'),
  };

  describe('create', () => {
    it('should create simulation snapshot with json parameters and results', async () => {
      prismaMock.simulation.create.mockResolvedValueOnce(mockSimulation);

      const result = await repository.create({
        userId: 'user_123',
        type: 'PURCHASE_AFFORDABILITY',
        parameters: { itemCost: 500000, currentSavings: 100000 },
        results: { isAffordable: true, delayMonths: 4 },
        title: 'Car Purchase Simulation',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockSimulation);
      }
      expect(prismaMock.simulation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user_123',
          type: 'PURCHASE_AFFORDABILITY',
          title: 'Car Purchase Simulation',
        }),
      });
    });
  });

  describe('findById, findByUserId, findByType & findRecent', () => {
    it('should find simulation by id', async () => {
      prismaMock.simulation.findUnique.mockResolvedValueOnce(mockSimulation);

      const result = await repository.findById('sim_123');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockSimulation);
      }
    });

    it('should find simulations by type', async () => {
      prismaMock.simulation.findMany.mockResolvedValueOnce([mockSimulation]);

      const result = await repository.findByType('user_123', 'PURCHASE_AFFORDABILITY');
      expect(result.success).toBe(true);
      expect(prismaMock.simulation.findMany).toHaveBeenCalledWith({
        where: { userId: 'user_123', type: 'PURCHASE_AFFORDABILITY' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should find recent simulations for user with take limit', async () => {
      prismaMock.simulation.findMany.mockResolvedValueOnce([mockSimulation]);

      const result = await repository.findRecent('user_123', 5);
      expect(result.success).toBe(true);
      expect(prismaMock.simulation.findMany).toHaveBeenCalledWith({
        where: { userId: 'user_123' },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });
    });
  });

  describe('delete', () => {
    it('should delete simulation record', async () => {
      prismaMock.simulation.delete.mockResolvedValueOnce(mockSimulation);

      const result = await repository.delete('sim_123');
      expect(result.success).toBe(true);
      expect(prismaMock.simulation.delete).toHaveBeenCalledWith({
        where: { id: 'sim_123' },
      });
    });
  });
});
