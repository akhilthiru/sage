import type { Simulation, Prisma, SimulationType } from '@prisma/client';
import { BaseRepository } from './base.repository';
import type {
  ISimulationRepository,
  CreateSimulationData,
} from '../types/repository.types';
import type { Result } from '../errors/database-error';
import type { TransactionClient } from '../client';

export class SimulationRepository
  extends BaseRepository
  implements ISimulationRepository
{
  async create(
    data: CreateSimulationData,
    tx?: TransactionClient
  ): Promise<Result<Simulation>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      return client.simulation.create({
        data: {
          userId: data.userId,
          type: data.type,
          parameters: data.parameters as Prisma.InputJsonValue,
          results: data.results as Prisma.InputJsonValue,
          title: data.title ?? null,
          description: data.description ?? null,
        },
      });
    }, 'Failed to record simulation result');
  }

  async findById(id: string, tx?: TransactionClient): Promise<Result<Simulation | null>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      return client.simulation.findUnique({
        where: { id },
      });
    }, `Failed to find simulation by id: ${id}`);
  }

  async findByUserId(userId: string, tx?: TransactionClient): Promise<Result<Simulation[]>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      return client.simulation.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
    }, `Failed to find simulations for user: ${userId}`);
  }

  async findByType(
    userId: string,
    type: SimulationType,
    tx?: TransactionClient
  ): Promise<Result<Simulation[]>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      return client.simulation.findMany({
        where: { userId, type },
        orderBy: { createdAt: 'desc' },
      });
    }, `Failed to find simulations of type ${type} for user: ${userId}`);
  }

  async findRecent(
    userId: string,
    limit: number,
    tx?: TransactionClient
  ): Promise<Result<Simulation[]>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      return client.simulation.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
    }, `Failed to find recent simulations for user: ${userId}`);
  }

  async delete(id: string, tx?: TransactionClient): Promise<Result<Simulation>> {
    return this.safeCall(async () => {
      const client = this.getClient(tx);
      return client.simulation.delete({
        where: { id },
      });
    }, `Failed to delete simulation: ${id}`);
  }
}
