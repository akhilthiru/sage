import {
  type IExpenseRepository,
  type TransactionClient,
  type Expense,
  type ExpenseCategory as DbExpenseCategory,
  type Frequency as DbFrequency,
  prisma,
} from '@sage/database';
import {
  type ExpenseDTO,
  type RecordExpenseRequest,
  type RecordExpenseResponse,
  type UpdateExpenseRequest,
  type UpdateExpenseResponse,
  type DeleteExpenseRequest,
  type DeleteExpenseResponse,
  type ListExpensesRequest,
  type ListExpensesResponse,
  type ExpenseFrequency,
  RecordExpenseSchema,
  UpdateExpenseSchema,
  DeleteExpenseSchema,
  ListExpensesSchema,
  validateWithZod,
} from '../dtos';
import {
  NotFoundError,
  AuthorizationError,
  DatabaseOperationError,
} from '../errors';
import {
  ExpenseRecordedEvent,
  ExpenseUpdatedEvent,
  ExpenseDeletedEvent,
  type IEventPublisher,
} from '../events';
import { AllocationService } from './allocation.service';

export function mapExpenseToDTO(expense: Expense): ExpenseDTO {
  return {
    id: expense.id,
    userId: expense.userId,
    amount: Number(expense.amount),
    category: expense.category,
    description: expense.name,
    date: expense.startDate,
    isRecurring: expense.frequency !== 'ONE_TIME',
    frequency: (expense.frequency === 'ONE_TIME' ? null : expense.frequency) as ExpenseFrequency | null,
    createdAt: expense.createdAt,
    updatedAt: expense.updatedAt,
  };
}

export class ExpenseService {
  constructor(
    private readonly expenseRepo: IExpenseRepository,
    private readonly allocationService: AllocationService,
    private readonly eventPublisher?: IEventPublisher,
    private readonly prismaClient: typeof prisma = prisma
  ) {}

  async recordExpense(
    request: RecordExpenseRequest,
    existingTx?: TransactionClient
  ): Promise<RecordExpenseResponse> {
    const validated = validateWithZod(RecordExpenseSchema, request);
    const { userId, amount, category, description, date, isRecurring, frequency } = validated;

    // Map category to DB enum
    let dbCategory: DbExpenseCategory = 'OTHER';
    const validCategories: DbExpenseCategory[] = [
      'RENT',
      'UTILITIES',
      'GROCERIES',
      'TRANSPORTATION',
      'HEALTHCARE',
      'INSURANCE',
      'ENTERTAINMENT',
      'DINING',
      'SHOPPING',
      'EDUCATION',
      'OTHER',
    ];
    const upperCat = category.toUpperCase() as DbExpenseCategory;
    if (validCategories.includes(upperCat)) {
      dbCategory = upperCat;
    }

    // Determine essential vs discretionary
    const essentialCategories: DbExpenseCategory[] = [
      'RENT',
      'UTILITIES',
      'GROCERIES',
      'HEALTHCARE',
      'INSURANCE',
    ];
    const isEssential = essentialCategories.includes(dbCategory);

    // Map frequency
    let dbFrequency: DbFrequency = 'ONE_TIME';
    if (isRecurring) {
      dbFrequency = (frequency as DbFrequency) ?? 'MONTHLY';
    }

    const executeWork = async (tx: TransactionClient): Promise<RecordExpenseResponse> => {
      const createRes = await this.expenseRepo.create(
        {
          userId,
          name: description ?? category,
          amount,
          category: dbCategory,
          frequency: dbFrequency,
          isEssential,
          isActive: true,
          startDate: date,
        },
        tx
      );

      if (!createRes.success) {
        throw new DatabaseOperationError('Failed to record expense', createRes.error);
      }

      const allocRes = await this.allocationService.generateAllocation({ userId }, tx);

      return {
        expense: mapExpenseToDTO(createRes.data),
        allocation: allocRes.allocation,
      };
    };

    let result: RecordExpenseResponse;
    if (existingTx) {
      result = await executeWork(existingTx);
    } else {
      result = await this.prismaClient.$transaction(async (tx) => {
        return await executeWork(tx);
      });
    }

    if (this.eventPublisher) {
      await this.eventPublisher.publish(
        new ExpenseRecordedEvent(result.expense.id, userId, amount, category)
      );
    }

    return result;
  }

  async updateExpense(
    request: UpdateExpenseRequest,
    existingTx?: TransactionClient
  ): Promise<UpdateExpenseResponse> {
    const validated = validateWithZod(UpdateExpenseSchema, request);
    const { userId, expenseId, amount, category, description, frequency } = validated;

    const expenseRes = await this.expenseRepo.findById(expenseId, existingTx);
    if (!expenseRes.success || !expenseRes.data) {
      throw new NotFoundError(`Expense with ID ${expenseId} not found`, 'Expense', expenseId);
    }
    if (expenseRes.data.userId !== userId) {
      throw new AuthorizationError('You do not own this expense');
    }

    let dbCategory: DbExpenseCategory | undefined = undefined;
    if (category) {
      const upperCat = category.toUpperCase() as DbExpenseCategory;
      const validCategories: DbExpenseCategory[] = [
        'RENT',
        'UTILITIES',
        'GROCERIES',
        'TRANSPORTATION',
        'HEALTHCARE',
        'INSURANCE',
        'ENTERTAINMENT',
        'DINING',
        'SHOPPING',
        'EDUCATION',
        'OTHER',
      ];
      if (validCategories.includes(upperCat)) {
        dbCategory = upperCat;
      }
    }

    const executeWork = async (tx: TransactionClient): Promise<UpdateExpenseResponse> => {
      const updateRes = await this.expenseRepo.update(
        expenseId,
        {
          name: description ?? undefined,
          amount,
          category: dbCategory,
          frequency: frequency as DbFrequency | undefined,
        },
        tx
      );

      if (!updateRes.success) {
        throw new DatabaseOperationError('Failed to update expense', updateRes.error);
      }

      const allocRes = await this.allocationService.generateAllocation({ userId }, tx);

      return {
        expense: mapExpenseToDTO(updateRes.data),
        allocation: allocRes.allocation,
      };
    };

    let result: UpdateExpenseResponse;
    if (existingTx) {
      result = await executeWork(existingTx);
    } else {
      result = await this.prismaClient.$transaction(async (tx) => {
        return await executeWork(tx);
      });
    }

    if (this.eventPublisher) {
      await this.eventPublisher.publish(
        new ExpenseUpdatedEvent(expenseId, userId, { amount, category, description })
      );
    }

    return result;
  }

  async deleteExpense(
    request: DeleteExpenseRequest,
    existingTx?: TransactionClient
  ): Promise<DeleteExpenseResponse> {
    const validated = validateWithZod(DeleteExpenseSchema, request);
    const { userId, expenseId } = validated;

    const expenseRes = await this.expenseRepo.findById(expenseId, existingTx);
    if (!expenseRes.success || !expenseRes.data) {
      throw new NotFoundError(`Expense with ID ${expenseId} not found`, 'Expense', expenseId);
    }
    if (expenseRes.data.userId !== userId) {
      throw new AuthorizationError('You do not own this expense');
    }

    const executeWork = async (tx: TransactionClient): Promise<DeleteExpenseResponse> => {
      const deleteRes = await this.expenseRepo.softDelete(expenseId, tx);
      if (!deleteRes.success) {
        throw new DatabaseOperationError('Failed to delete expense', deleteRes.error);
      }

      const allocRes = await this.allocationService.generateAllocation({ userId }, tx);

      return {
        expenseId,
        deletedAt: new Date(),
        allocation: allocRes.allocation,
      };
    };

    let result: DeleteExpenseResponse;
    if (existingTx) {
      result = await executeWork(existingTx);
    } else {
      result = await this.prismaClient.$transaction(async (tx) => {
        return await executeWork(tx);
      });
    }

    if (this.eventPublisher) {
      await this.eventPublisher.publish(new ExpenseDeletedEvent(expenseId, userId));
    }

    return result;
  }

  async listExpenses(
    request: ListExpensesRequest,
    tx?: TransactionClient
  ): Promise<ListExpensesResponse> {
    const validated = validateWithZod(ListExpensesSchema, request);
    const { userId, category, isRecurring, page = 1, limit = 50 } = validated;

    const findRes = await this.expenseRepo.findMany(
      {
        userId,
        deleted: false,
      },
      { page, pageSize: limit },
      tx
    );

    if (!findRes.success) {
      throw new DatabaseOperationError('Failed to list expenses', findRes.error);
    }

    let items = findRes.data.data;
    if (category) {
      items = items.filter((e) => e.category.toLowerCase() === category.toLowerCase());
    }
    if (isRecurring !== undefined) {
      items = items.filter((e) => (e.frequency !== 'ONE_TIME') === isRecurring);
    }

    const dtos = items.map((e) => mapExpenseToDTO(e));

    let totalAmount = 0;
    const byCategory: Record<string, number> = {};

    for (const d of dtos) {
      totalAmount += d.amount;
      byCategory[d.category] = (byCategory[d.category] ?? 0) + d.amount;
    }

    return {
      expenses: dtos,
      summary: {
        totalExpenses: dtos.length,
        totalAmount,
        byCategory,
      },
      pagination: {
        page: findRes.data.page,
        limit: findRes.data.pageSize,
        total: findRes.data.total,
        totalPages: findRes.data.totalPages,
      },
    };
  }
}
