# Validation Strategy

**Package**: `@sage/application`  
**Version**: 1.0.0  
**Last Updated**: 2024

---

## Table of Contents

1. [Overview](#overview)
2. [Validation Types](#validation-types)
3. [Validation Layers](#validation-layers)
4. [Input Validation](#input-validation)
5. [Business Validation](#business-validation)
6. [Financial Validation](#financial-validation)
7. [Authorization Validation](#authorization-validation)
8. [Validation Execution Order](#validation-execution-order)
9. [Error Handling](#error-handling)

---

## Overview

Validation ensures data integrity and business rule compliance across the system. Different types of validation occur at different layers.

**Principle**: **Fail Fast**

Validate as early as possible to provide immediate feedback and prevent invalid data from propagating.

---

## Validation Types

### 1. **Input Validation**

**What**: Data shape, type, format, required fields

**Where**: Presentation Layer (UX) + Application Layer (enforcement)

**Examples**:
- Field is required
- Email format is valid
- Number is positive
- Date is in correct format
- String length is within bounds

---

### 2. **Business Validation**

**What**: Domain rules, state transitions, constraints

**Where**: Application Layer + Financial Engine

**Examples**:
- Goal target date must be in future
- Cannot delete a completed goal
- Cannot update a deleted expense
- Debt payment cannot exceed remaining balance

---

### 3. **Financial Validation**

**What**: Financial calculations, feasibility, constraints

**Where**: Financial Engine

**Examples**:
- Monthly savings required is achievable
- Debt-to-income ratio is within limits
- Allocation percentages sum to 100%
- Interest rate is reasonable

---

### 4. **Authorization Validation**

**What**: User permissions, resource ownership

**Where**: Application Layer

**Examples**:
- User owns the goal they're updating
- User has access to the conversation
- User is authenticated

---

## Validation Layers

### Layer 1: Presentation (Client-Side)

**Purpose**: Immediate UX feedback

**Responsibility**: 
- ✅ Display validation errors to user
- ✅ Prevent form submission with invalid data
- ✅ Provide real-time feedback

**NOT Responsible For**:
- ❌ Enforcing validation (can be bypassed)
- ❌ Business rule validation
- ❌ Authorization

**Example**:
```typescript
// apps/web/components/forms/CreateGoalForm.tsx
'use client';

export function CreateGoalForm() {
  const [errors, setErrors] = useState({});

  function validateForm(data: FormData) {
    const errors: Record<string, string> = {};

    // Input validation (UX only)
    if (!data.get('name')) {
      errors.name = 'Goal name is required';
    }

    const targetAmount = Number(data.get('targetAmount'));
    if (targetAmount <= 0) {
      errors.targetAmount = 'Amount must be positive';
    }

    const targetDate = new Date(data.get('targetDate') as string);
    if (targetDate <= new Date()) {
      errors.targetDate = 'Target date must be in future';
    }

    return errors;
  }

  async function handleSubmit(formData: FormData) {
    // Client-side validation
    const validationErrors = validateForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    // Submit to server (will be validated again)
    const result = await createGoalAction(formData);
  }

  return <form onSubmit={handleSubmit}>{/* fields */}</form>;
}
```

---

### Layer 2: API Routes / Server Actions

**Purpose**: Parse and authenticate

**Responsibility**:
- ✅ Verify authentication
- ✅ Parse request data
- ✅ Basic type checking

**NOT Responsible For**:
- ❌ Business validation
- ❌ Financial validation

**Example**:
```typescript
// apps/web/actions/goals.ts
'use server';

export async function createGoalAction(formData: FormData) {
  // 1. Authentication
  const { userId } = auth();
  if (!userId) {
    return { success: false, error: { code: 'UNAUTHORIZED' } };
  }

  // 2. Parse input (basic validation)
  const request: CreateGoalRequest = {
    userId,
    name: formData.get('name') as string,
    targetAmount: Number(formData.get('targetAmount')),
    targetDate: new Date(formData.get('targetDate') as string),
    priority: formData.get('priority') as 'HIGH' | 'MEDIUM' | 'LOW',
    category: formData.get('category') as string,
  };

  // 3. Delegate to Application Layer (will validate)
  const goalService = new GoalService(dependencies);
  return await goalService.createGoal(request);
}
```

---

### Layer 3: Application Layer

**Purpose**: Enforce all validation rules

**Responsibility**:
- ✅ Input validation (enforce)
- ✅ Business validation
- ✅ Authorization validation
- ✅ Coordinate Financial Engine validation

**Example**:
```typescript
// packages/application/src/services/goals/GoalService.ts
export class GoalService {
  async createGoal(request: CreateGoalRequest): Promise<CreateGoalResponse> {
    // 1. Input validation
    this.validateInput(request);

    // 2. Authorization validation
    await this.validateAuthorization(request.userId);

    // 3. Business validation
    await this.validateBusinessRules(request);

    // 4. Financial validation (via Financial Engine)
    const feasibility = this.financialEngine.calculateGoalFeasibility({
      targetAmount: request.targetAmount,
      targetDate: request.targetDate,
      monthlyIncome: profile.monthlyIncome,
    });

    if (feasibility === 'INFEASIBLE') {
      throw new ValidationError('Goal is not financially feasible');
    }

    // Proceed with creation...
  }

  private validateInput(request: CreateGoalRequest): void {
    if (!request.name || request.name.trim().length === 0) {
      throw new ValidationError('Goal name is required');
    }

    if (request.name.length > 100) {
      throw new ValidationError('Goal name must be 100 characters or less');
    }

    if (request.targetAmount <= 0) {
      throw new ValidationError('Target amount must be positive');
    }

    if (request.targetDate <= new Date()) {
      throw new ValidationError('Target date must be in future');
    }

    const validPriorities = ['HIGH', 'MEDIUM', 'LOW'];
    if (!validPriorities.includes(request.priority)) {
      throw new ValidationError('Invalid priority');
    }
  }

  private async validateAuthorization(userId: string): Promise<void> {
    const profile = await this.financialProfileRepository.findByUserId(userId);
    if (!profile) {
      throw new NotFoundError('Financial profile not found');
    }
  }

  private async validateBusinessRules(request: CreateGoalRequest): Promise<void> {
    // Check for duplicate goal names
    const existingGoals = await this.goalRepository.findActiveByUserId(
      request.userId
    );

    const duplicate = existingGoals.find(
      (g) => g.name.toLowerCase() === request.name.toLowerCase()
    );

    if (duplicate) {
      throw new ValidationError('A goal with this name already exists');
    }

    // Enforce max active goals
    if (existingGoals.length >= 10) {
      throw new ValidationError('Maximum 10 active goals allowed');
    }
  }
}
```

---

### Layer 4: Financial Engine

**Purpose**: Validate financial calculations and constraints

**Responsibility**:
- ✅ Financial feasibility
- ✅ Calculation constraints
- ✅ Return validation results

**Example**:
```typescript
// packages/financial-engine/src/goals/calculateGoalFeasibility.ts
export function calculateGoalFeasibility(
  input: GoalFeasibilityInput
): GoalFeasibilityResult {
  const { targetAmount, targetDate, monthlyIncome, expenses, debts } = input;

  // Calculate required monthly savings
  const monthsToGoal = differenceInMonths(targetDate, new Date());
  if (monthsToGoal <= 0) {
    return { feasibility: 'INFEASIBLE', reason: 'Target date must be in future' };
  }

  const monthlySavingsRequired = targetAmount / monthsToGoal;

  // Calculate available savings
  const fixedExpenses = sumExpenses(expenses);
  const debtPayments = sumDebtPayments(debts);
  const availableForSavings = monthlyIncome - fixedExpenses - debtPayments;

  // Determine feasibility
  if (monthlySavingsRequired > availableForSavings) {
    return {
      feasibility: 'INFEASIBLE',
      reason: 'Required savings exceed available income',
      monthlySavingsRequired,
      availableForSavings,
    };
  }

  if (monthlySavingsRequired > availableForSavings * 0.8) {
    return {
      feasibility: 'STRETCH',
      reason: 'Requires 80%+ of available income',
      monthlySavingsRequired,
      availableForSavings,
    };
  }

  return {
    feasibility: 'FEASIBLE',
    monthlySavingsRequired,
    availableForSavings,
  };
}
```

---

## Input Validation

### Rules

1. **Required Fields**
   - All required fields must be present
   - Non-empty strings
   - Non-null values

2. **Data Types**
   - Numbers are valid numbers
   - Dates are valid dates
   - Enums match allowed values

3. **Format**
   - Email format
   - Phone number format
   - Currency format

4. **Constraints**
   - String length (min/max)
   - Number range (min/max)
   - Date range

### Implementation

**Validator Utility**:
```typescript
// packages/application/src/validators/inputValidators.ts
export class InputValidator {
  static validateRequired(value: unknown, fieldName: string): void {
    if (value === null || value === undefined || value === '') {
      throw new ValidationError(`${fieldName} is required`);
    }
  }

  static validateString(
    value: string,
    fieldName: string,
    options?: { minLength?: number; maxLength?: number }
  ): void {
    this.validateRequired(value, fieldName);

    if (options?.minLength && value.length < options.minLength) {
      throw new ValidationError(
        `${fieldName} must be at least ${options.minLength} characters`
      );
    }

    if (options?.maxLength && value.length > options.maxLength) {
      throw new ValidationError(
        `${fieldName} must be at most ${options.maxLength} characters`
      );
    }
  }

  static validateNumber(
    value: number,
    fieldName: string,
    options?: { min?: number; max?: number }
  ): void {
    this.validateRequired(value, fieldName);

    if (isNaN(value)) {
      throw new ValidationError(`${fieldName} must be a valid number`);
    }

    if (options?.min !== undefined && value < options.min) {
      throw new ValidationError(`${fieldName} must be at least ${options.min}`);
    }

    if (options?.max !== undefined && value > options.max) {
      throw new ValidationError(`${fieldName} must be at most ${options.max}`);
    }
  }

  static validateDate(
    value: Date,
    fieldName: string,
    options?: { min?: Date; max?: Date }
  ): void {
    this.validateRequired(value, fieldName);

    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new ValidationError(`${fieldName} must be a valid date`);
    }

    if (options?.min && value < options.min) {
      throw new ValidationError(`${fieldName} must be after ${options.min}`);
    }

    if (options?.max && value > options.max) {
      throw new ValidationError(`${fieldName} must be before ${options.max}`);
    }
  }

  static validateEnum<T>(
    value: T,
    fieldName: string,
    allowedValues: T[]
  ): void {
    this.validateRequired(value, fieldName);

    if (!allowedValues.includes(value)) {
      throw new ValidationError(
        `${fieldName} must be one of: ${allowedValues.join(', ')}`
      );
    }
  }
}
```

**Usage**:
```typescript
private validateInput(request: CreateGoalRequest): void {
  InputValidator.validateString(request.name, 'name', {
    minLength: 1,
    maxLength: 100,
  });

  InputValidator.validateNumber(request.targetAmount, 'targetAmount', {
    min: 1,
  });

  InputValidator.validateDate(request.targetDate, 'targetDate', {
    min: new Date(),
  });

  InputValidator.validateEnum(request.priority, 'priority', [
    'HIGH',
    'MEDIUM',
    'LOW',
  ]);
}
```

---

## Business Validation

### Rules

1. **State Transitions**
   - Goal can only be completed if active
   - Deleted resources cannot be updated
   - Status changes follow valid paths

2. **Domain Invariants**
   - No duplicate goal names per user
   - Max 10 active goals per user
   - Debt payment cannot exceed balance

3. **Referential Integrity**
   - User exists
   - Goal exists
   - User owns resource

### Implementation

```typescript
// packages/application/src/validators/businessValidators.ts
export class BusinessValidator {
  static async validateGoalOwnership(
    goalId: string,
    userId: string,
    goalRepository: IGoalRepository
  ): Promise<void> {
    const goal = await goalRepository.findById(goalId);

    if (!goal) {
      throw new NotFoundError('Goal not found');
    }

    if (goal.userId !== userId) {
      throw new AuthorizationError('You do not own this goal');
    }

    if (goal.deletedAt) {
      throw new ValidationError('Cannot modify deleted goal');
    }
  }

  static async validateUniqueGoalName(
    name: string,
    userId: string,
    goalRepository: IGoalRepository,
    excludeGoalId?: string
  ): Promise<void> {
    const existingGoals = await goalRepository.findActiveByUserId(userId);

    const duplicate = existingGoals.find(
      (g) =>
        g.name.toLowerCase() === name.toLowerCase() &&
        g.id !== excludeGoalId
    );

    if (duplicate) {
      throw new ValidationError('A goal with this name already exists');
    }
  }

  static validateGoalStatusTransition(
    currentStatus: string,
    newStatus: string
  ): void {
    const validTransitions: Record<string, string[]> = {
      ACTIVE: ['COMPLETED', 'ABANDONED'],
      COMPLETED: [],
      ABANDONED: ['ACTIVE'],
    };

    const allowed = validTransitions[currentStatus] || [];

    if (!allowed.includes(newStatus)) {
      throw new ValidationError(
        `Cannot transition from ${currentStatus} to ${newStatus}`
      );
    }
  }

  static async validateMaxActiveGoals(
    userId: string,
    goalRepository: IGoalRepository,
    maxGoals: number = 10
  ): Promise<void> {
    const activeGoals = await goalRepository.findActiveByUserId(userId);

    if (activeGoals.length >= maxGoals) {
      throw new ValidationError(`Maximum ${maxGoals} active goals allowed`);
    }
  }
}
```

---

## Financial Validation

### Rules

1. **Feasibility**
   - Goal is achievable with current income
   - Loan is affordable
   - Purchase doesn't exceed savings

2. **Constraints**
   - Interest rate is reasonable (0-100%)
   - Allocation percentages sum to 100%
   - Debt-to-income ratio < 50%

3. **Calculations**
   - Monthly payment is positive
   - Total interest is calculated correctly
   - Timeline is realistic

### Implementation

Financial validation is performed by the Financial Engine and results are checked by the Application Layer:

```typescript
// In Application Layer
async createGoal(request: CreateGoalRequest): Promise<CreateGoalResponse> {
  // ... other validation

  // Financial validation
  const profile = await this.financialProfileRepository.findByUserId(
    request.userId
  );
  const expenses = await this.expenseRepository.findByUserId(request.userId);
  const debts = await this.debtRepository.findActiveByUserId(request.userId);

  const feasibility = this.financialEngine.calculateGoalFeasibility({
    targetAmount: request.targetAmount,
    targetDate: request.targetDate,
    monthlyIncome: profile.monthlyIncome,
    expenses,
    debts,
  });

  // Check result
  if (feasibility.feasibility === 'INFEASIBLE') {
    throw new ValidationError(
      `Goal is not financially feasible: ${feasibility.reason}`
    );
  }

  // Warn if stretch
  if (feasibility.feasibility === 'STRETCH') {
    // Could return warning in response
    console.warn(`Goal is a stretch: ${feasibility.reason}`);
  }

  // Proceed...
}
```

---

## Authorization Validation

### Rules

1. **Authentication**
   - User is logged in
   - Session is valid

2. **Resource Ownership**
   - User owns the goal
   - User owns the expense
   - User owns the conversation

3. **Permissions**
   - User can perform action
   - User has required role (if applicable)

### Implementation

```typescript
// packages/application/src/validators/authorizationValidators.ts
export class AuthorizationValidator {
  static async validateUserOwnsGoal(
    goalId: string,
    userId: string,
    goalRepository: IGoalRepository
  ): Promise<void> {
    const goal = await goalRepository.findById(goalId);

    if (!goal) {
      throw new NotFoundError('Goal not found');
    }

    if (goal.userId !== userId) {
      throw new AuthorizationError('Access denied');
    }
  }

  static async validateUserOwnsExpense(
    expenseId: string,
    userId: string,
    expenseRepository: IExpenseRepository
  ): Promise<void> {
    const expense = await expenseRepository.findById(expenseId);

    if (!expense) {
      throw new NotFoundError('Expense not found');
    }

    if (expense.userId !== userId) {
      throw new AuthorizationError('Access denied');
    }
  }

  static async validateUserHasProfile(
    userId: string,
    profileRepository: IFinancialProfileRepository
  ): Promise<void> {
    const profile = await profileRepository.findByUserId(userId);

    if (!profile) {
      throw new NotFoundError('Financial profile not found. Please complete onboarding.');
    }
  }
}
```

---

## Validation Execution Order

### Order of Validation

```
1. Authentication (API Layer)
   ↓
2. Input Validation (Application Layer)
   ↓
3. Authorization Validation (Application Layer)
   ↓
4. Business Validation (Application Layer)
   ↓
5. Financial Validation (Financial Engine → Application Layer)
   ↓
6. Execute Operation
```

### Example: CreateGoalUseCase

```typescript
async createGoal(request: CreateGoalRequest): Promise<CreateGoalResponse> {
  // 1. Input validation (fail fast)
  this.validateInput(request);

  // 2. Authorization validation
  await AuthorizationValidator.validateUserHasProfile(
    request.userId,
    this.financialProfileRepository
  );

  // 3. Business validation
  await BusinessValidator.validateUniqueGoalName(
    request.name,
    request.userId,
    this.goalRepository
  );

  await BusinessValidator.validateMaxActiveGoals(
    request.userId,
    this.goalRepository
  );

  // 4. Financial validation
  const profile = await this.financialProfileRepository.findByUserId(
    request.userId
  );
  const expenses = await this.expenseRepository.findByUserId(request.userId);
  const debts = await this.debtRepository.findActiveByUserId(request.userId);

  const feasibility = this.financialEngine.calculateGoalFeasibility({
    targetAmount: request.targetAmount,
    targetDate: request.targetDate,
    monthlyIncome: profile.monthlyIncome,
    expenses,
    debts,
  });

  if (feasibility.feasibility === 'INFEASIBLE') {
    throw new ValidationError(
      `Goal is not financially feasible: ${feasibility.reason}`
    );
  }

  // 5. Execute operation
  return await this.executeCreateGoal(request, feasibility);
}
```

---

## Error Handling

### Validation Errors

```typescript
// packages/application/src/errors/ValidationError.ts
export class ValidationError extends Error {
  public readonly code = 'VALIDATION_ERROR';
  public readonly statusCode = 400;
  public readonly validationErrors?: Record<string, string>;

  constructor(message: string, validationErrors?: Record<string, string>) {
    super(message);
    this.name = 'ValidationError';
    this.validationErrors = validationErrors;
  }
}
```

### Multiple Validation Errors

```typescript
// Collect all validation errors before throwing
function validateCreateGoalRequest(request: CreateGoalRequest): void {
  const errors: Record<string, string> = {};

  if (!request.name || request.name.trim().length === 0) {
    errors.name = 'Goal name is required';
  } else if (request.name.length > 100) {
    errors.name = 'Goal name must be 100 characters or less';
  }

  if (request.targetAmount <= 0) {
    errors.targetAmount = 'Target amount must be positive';
  }

  if (request.targetDate <= new Date()) {
    errors.targetDate = 'Target date must be in future';
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors);
  }
}
```

### Error Response

```typescript
// API Layer
export async function createGoalAction(formData: FormData) {
  try {
    const goalService = new GoalService(dependencies);
    const result = await goalService.createGoal(request);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof ValidationError) {
      return {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          validationErrors: error.validationErrors,
        },
      };
    }

    // Other errors...
  }
}
```

---

## Summary

### Validation Distribution

| Validation Type | Layer | Enforced By |
|----------------|-------|-------------|
| **Input** | Presentation (UX) | Client-side validation |
| **Input** | Application (enforcement) | InputValidator |
| **Business** | Application | BusinessValidator |
| **Financial** | Financial Engine | Calculation functions |
| **Authorization** | Application | AuthorizationValidator |

### Key Principles

1. **Fail Fast**: Validate early, provide immediate feedback
2. **Layered Defense**: Validate at multiple layers
3. **Clear Errors**: Provide actionable error messages
4. **Separation**: Different validators for different concerns
5. **Reusable**: Validators are reusable across use cases

### Validation Flow

```
User Input
    ↓
Client Validation (UX feedback)
    ↓
Server Action (Authentication)
    ↓
Application Layer:
  - Input Validation
  - Authorization Validation
  - Business Validation
  - Financial Validation
    ↓
Execute Operation
```

### Benefits

- ✅ **Data Integrity**: Invalid data never reaches database
- ✅ **User Experience**: Immediate feedback on errors
- ✅ **Security**: Authorization enforced at application layer
- ✅ **Maintainability**: Centralized validation logic
- ✅ **Testability**: Validators can be tested independently

---

**Next**: Define transaction orchestration strategy.
