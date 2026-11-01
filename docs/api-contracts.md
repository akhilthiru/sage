# Sage: API Contracts

## Overview

This document defines all API contracts for Sage, including REST endpoints and Next.js Server Actions. All contracts specify request/response formats, validation schemas, authentication requirements, and error handling.

**Architecture:** Next.js 14+ with Server Actions for most operations, REST endpoints for webhooks and streaming.

---

## REST API Endpoints

### 1. Webhooks

#### POST /api/webhooks/clerk

**Purpose:** Sync user data from Clerk authentication service

**Authentication:** Webhook signature verification (Clerk secret)

**Request Headers:**
```typescript
{
  'svix-id': string;
  'svix-timestamp': string;
  'svix-signature': string;
  'content-type': 'application/json';
}
```

**Request Body:**
```typescript
interface ClerkWebhookPayload {
  type: 'user.created' | 'user.updated' | 'user.deleted';
  data: {
    id: string; // Clerk user ID
    email_addresses: Array<{
      email_address: string;
      id: string;
    }>;
    first_name: string | null;
    last_name: string | null;
    image_url: string | null;
    created_at: number; // Unix timestamp
    updated_at: number; // Unix timestamp
  };
}
```

**Response (Success):**
```typescript
{
  success: true;
  userId?: string; // Internal user ID (for user.created)
}
```
**Status Code:** 200

**Response (Error):**
```typescript
{
  success: false;
  error: string;
}
```
**Status Codes:** 400 (Invalid signature), 500 (Server error)

**Processing Logic:**
- `user.created`: Create User entity in database
- `user.updated`: Update User entity fields
- `user.deleted`: Soft delete User entity (set deletedAt)

**Rate Limiting:** None (trusted webhook)

---

#### POST /api/webhooks/stripe

**Purpose:** Handle Stripe payment events (future implementation)

**Authentication:** Webhook signature verification (Stripe secret)

**Request Headers:**
```typescript
{
  'stripe-signature': string;
  'content-type': 'application/json';
}
```

**Request Body:**
```typescript
interface StripeWebhookPayload {
  type: string; // e.g., 'payment_intent.succeeded'
  data: {
    object: any; // Stripe object
  };
}
```

**Response:**
```typescript
{
  received: true;
}
```
**Status Code:** 200

**Note:** Full implementation deferred to post-MVP

---

### 2. Health Check

#### GET /api/health

**Purpose:** Service health check for monitoring

**Authentication:** None

**Response:**
```typescript
{
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string; // ISO 8601
  version: string;
  services: {
    database: 'up' | 'down';
    clerk: 'up' | 'down';
    openai: 'up' | 'down';
  };
}
```

**Status Codes:** 
- 200: Healthy
- 503: Unhealthy

---

### 3. Chat Streaming

#### POST /api/chat

**Purpose:** Stream AI chat responses

**Authentication:** Required (Clerk session)

**Request Headers:**
```typescript
{
  'Authorization': 'Bearer <clerk_session_token>';
  'Content-Type': 'application/json';
}
```

**Request Body:**
```typescript
{
  conversationId?: string; // Optional, creates new if not provided
  message: string;
  context?: {
    goalId?: string;
    simulationId?: string;
  };
}
```

**Validation (Zod):**
```typescript
const ChatRequestSchema = z.object({
  conversationId: z.string().cuid().optional(),
  message: z.string().min(1).max(1000),
  context: z.object({
    goalId: z.string().cuid().optional(),
    simulationId: z.string().cuid().optional()
  }).optional()
});
```

**Response:** Server-Sent Events (SSE) stream

**Stream Events:**
```typescript
// Event 1: Message created
data: {"type":"message","messageId":"msg_123"}

// Event 2: Content chunks
data: {"type":"content","delta":"Based on your"}
data: {"type":"content","delta":" financial profile..."}

// Event 3: Metadata (calculations)
data: {"type":"metadata","data":{"intent":"affordability","calculation":{...}}}

// Event 4: Complete
data: {"type":"done"}
```

**Error Response:**
```typescript
{
  error: string;
  code: 'UNAUTHORIZED' | 'INVALID_INPUT' | 'RATE_LIMITED' | 'SERVER_ERROR';
}
```

**Rate Limiting:** 20 requests per minute per user

---

## Server Actions (Next.js)

Server Actions are TypeScript functions called directly from React components. They run on the server and provide type-safe API contracts.

### Authentication Pattern

All Server Actions use this authentication pattern:

```typescript
import { auth } from '@clerk/nextjs';

async function serverAction() {
  const { userId } = auth();
  
  if (!userId) {
    throw new Error('Unauthorized');
  }
  
  // Action logic...
}
```

---

## Onboarding Actions

### createProfile

**Purpose:** Create initial financial profile during onboarding

**Function Signature:**
```typescript
async function createProfile(
  data: ProfileInput
): Promise<Result<ProfileResult, ProfileError>>
```

**Input Type:**
```typescript
interface ProfileInput {
  monthlyIncome: number;
  incomeFrequency: 'MONTHLY' | 'ANNUAL' | 'WEEKLY' | 'BIWEEKLY';
  currentSavings: number;
  emergencyFundTarget?: number;
  currentEmergencyFund?: number;
  primaryGoal?: string;
  riskTolerance: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
}
```

**Validation Schema (Zod):**
```typescript
const ProfileInputSchema = z.object({
  monthlyIncome: z.number().positive().min(10000).max(10000000),
  incomeFrequency: z.enum(['MONTHLY', 'ANNUAL', 'WEEKLY', 'BIWEEKLY']),
  currentSavings: z.number().nonnegative().max(100000000),
  emergencyFundTarget: z.number().nonnegative().optional(),
  currentEmergencyFund: z.number().nonnegative().optional(),
  primaryGoal: z.string().max(200).optional(),
  riskTolerance: z.enum(['CONSERVATIVE', 'MODERATE', 'AGGRESSIVE'])
});
```

**Success Response:**
```typescript
interface ProfileResult {
  success: true;
  profile: {
    id: string;
    userId: string;
    monthlyIncome: number;
    currentSavings: number;
    cfoUnderstandingScore: number;
    createdAt: string;
  };
}
```

**Error Response:**
```typescript
interface ProfileError {
  success: false;
  error: string;
  code: 'VALIDATION_ERROR' | 'ALREADY_EXISTS' | 'SERVER_ERROR';
  details?: Record<string, string[]>; // Field-level errors
}
```

**Business Rules:**
- One profile per user
- Understanding score calculated automatically
- Emergency fund target defaults to 6 months of expenses if not provided

---

### updateProfile

**Purpose:** Update existing financial profile

**Function Signature:**
```typescript
async function updateProfile(
  userId: string,
  data: ProfileUpdate
): Promise<Result<ProfileResult, ProfileError>>
```

**Input Type:**
```typescript
interface ProfileUpdate {
  monthlyIncome?: number;
  otherIncome?: number;
  incomeFrequency?: 'MONTHLY' | 'ANNUAL' | 'WEEKLY' | 'BIWEEKLY';
  currentSavings?: number;
  emergencyFundTarget?: number;
  currentEmergencyFund?: number;
  primaryGoal?: string;
  riskTolerance?: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
}
```

**Validation:** Same as ProfileInput but all fields optional

**Side Effects:**
- Recalculates understanding score
- Triggers allocation recalculation
- Updates goal feasibility scores

---

### calculateUnderstandingScore

**Purpose:** Calculate profile completeness score

**Function Signature:**
```typescript
async function calculateUnderstandingScore(
  userId: string
): Promise<number>
```

**Response:** Number (0-100)

**Calculation Logic:** See domain-model.md FinancialProfile section

---

## Goal Actions

### createGoal

**Purpose:** Create a new financial goal

**Function Signature:**
```typescript
async function createGoal(
  data: GoalInput
): Promise<Result<GoalResult, GoalError>>
```

**Input Type:**
```typescript
interface GoalInput {
  name: string;
  description?: string;
  type: GoalType;
  targetAmount: number;
  currentAmount?: number;
  targetDate: string; // ISO 8601 date
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  milestones?: MilestoneInput[];
}

interface MilestoneInput {
  name: string;
  targetAmount: number;
  targetDate: string;
}

enum GoalType {
  EMERGENCY_FUND = 'EMERGENCY_FUND',
  HOUSE = 'HOUSE',
  CAR = 'CAR',
  VACATION = 'VACATION',
  WEDDING = 'WEDDING',
  EDUCATION = 'EDUCATION',
  RETIREMENT = 'RETIREMENT',
  CUSTOM = 'CUSTOM'
}
```

**Validation Schema:**
```typescript
const GoalInputSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  type: z.nativeEnum(GoalType),
  targetAmount: z.number().min(1000).max(1000000000),
  currentAmount: z.number().nonnegative().default(0),
  targetDate: z.string().datetime(),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  milestones: z.array(z.object({
    name: z.string().min(1).max(100),
    targetAmount: z.number().positive(),
    targetDate: z.string().datetime()
  })).optional()
}).refine(
  data => new Date(data.targetDate) > new Date(),
  { message: 'Target date must be in the future' }
).refine(
  data => !data.currentAmount || data.currentAmount < data.targetAmount,
  { message: 'Current amount must be less than target amount' }
);
```

**Success Response:**
```typescript
interface GoalResult {
  success: true;
  goal: {
    id: string;
    name: string;
    type: GoalType;
    targetAmount: number;
    currentAmount: number;
    targetDate: string;
    status: 'ACTIVE';
    isFeasible: boolean;
    feasibilityScore: number;
    monthlyContribution: number;
    createdAt: string;
  };
  feasibility: FeasibilityResult;
}
```

**Error Response:**
```typescript
interface GoalError {
  success: false;
  error: string;
  code: 'VALIDATION_ERROR' | 'DUPLICATE_EMERGENCY_FUND' | 'SERVER_ERROR';
}
```

**Side Effects:**
- Runs feasibility calculation
- Updates allocation
- Creates milestones if provided

---

### updateGoal

**Purpose:** Update existing goal

**Function Signature:**
```typescript
async function updateGoal(
  goalId: string,
  data: GoalUpdate
): Promise<Result<GoalResult, GoalError>>
```

**Input Type:**
```typescript
interface GoalUpdate {
  name?: string;
  description?: string;
  targetAmount?: number;
  currentAmount?: number;
  targetDate?: string;
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
  status?: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
}
```

**Side Effects:**
- Recalculates feasibility
- Updates allocation if amounts/dates changed

---

### deleteGoal

**Purpose:** Soft delete a goal

**Function Signature:**
```typescript
async function deleteGoal(
  goalId: string
): Promise<Result<{ success: true }, GoalError>>
```

**Side Effects:**
- Sets deletedAt timestamp
- Updates allocation
- Preserves historical data

---

### getGoals

**Purpose:** Retrieve user's goals with optional filtering

**Function Signature:**
```typescript
async function getGoals(
  userId: string,
  filters?: GoalFilters
): Promise<Goal[]>
```

**Input Type:**
```typescript
interface GoalFilters {
  status?: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  type?: GoalType;
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
}
```

**Response:** Array of Goal objects

---

### calculateGoalFeasibility

**Purpose:** Calculate if goal is achievable

**Function Signature:**
```typescript
async function calculateGoalFeasibility(
  goalId: string
): Promise<FeasibilityResult>
```

**Response:**
```typescript
interface FeasibilityResult {
  isFeasible: boolean;
  feasibilityScore: number; // 0-100
  requiredMonthly: number;
  availableMonthly: number;
  utilizationRatio: number;
  projectedCompletionDate: string;
  delayMonths: number;
  recommendations: string[];
  confidence: ConfidenceScore;
}

interface ConfidenceScore {
  value: number; // 0-100
  factors: Array<{
    name: string;
    impact: number; // -50 to +50
    reason: string;
  }>;
}
```

---

## Allocation Actions

### calculateAllocation

**Purpose:** Calculate monthly allocation recommendation

**Function Signature:**
```typescript
async function calculateAllocation(
  userId: string
): Promise<AllocationResult>
```

**Response:**
```typescript
interface AllocationResult {
  allocation: {
    essentialExpenses: number;
    debtPayments: number;
    emergencyFund: number;
    goalSavings: number;
    investments: number;
    discretionary: number;
    totalIncome: number;
    totalAllocated: number;
  };
  breakdown: {
    goals: Array<{
      goalId: string;
      goalName: string;
      allocation: number;
    }>;
    debts: Array<{
      debtId: string;
      debtName: string;
      payment: number;
    }>;
  };
  warnings?: Array<{
    type: 'INCOME_INSUFFICIENT' | 'HIGH_ESSENTIAL_RATIO' | 'NO_EMERGENCY_FUND';
    message: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
  }>;
}
```

---

### saveAllocation

**Purpose:** Save allocation snapshot for a month

**Function Signature:**
```typescript
async function saveAllocation(
  userId: string,
  allocation: Allocation
): Promise<Result<{ success: true }, AllocationError>>
```

**Input Type:**
```typescript
interface Allocation {
  month: number; // 1-12
  year: number;
  essentialExpenses: number;
  debtPayments: number;
  emergencyFund: number;
  goalSavings: number;
  investments: number;
  discretionary: number;
  totalIncome: number;
  totalAllocated: number;
}
```

**Validation:**
- Total allocated should equal total income
- All amounts must be non-negative
- Month must be 1-12

---

### getAllocation

**Purpose:** Retrieve allocation for specific month

**Function Signature:**
```typescript
async function getAllocation(
  userId: string,
  month: number,
  year: number
): Promise<Allocation | null>
```

---

## Simulation Actions

### simulatePurchase

**Purpose:** Run purchase affordability simulation

**Function Signature:**
```typescript
async function simulatePurchase(
  userId: string,
  params: PurchaseParams
): Promise<SimulationResult>
```

**Input Type:**
```typescript
interface PurchaseParams {
  purchaseAmount: number;
  item?: string;
}
```

**Validation:**
```typescript
const PurchaseParamsSchema = z.object({
  purchaseAmount: z.number().positive().max(100000000),
  item: z.string().max(100).optional()
});
```

**Response:**
```typescript
interface SimulationResult {
  id: string; // Simulation ID
  type: 'PURCHASE_AFFORDABILITY';
  canAfford: boolean;
  confidence: number;
  scenarios: Array<{
    type: 'BUY_FROM_SAVINGS' | 'LOAN_EMI' | 'SAVE_FIRST';
    isViable: boolean;
    immediateImpact: {
      newSavings: number;
      newEmergencyFund: number;
    };
    monthlyImpact: number;
    totalCost: number;
    timeline: number; // months
    pros: string[];
    cons: string[];
    recommendation: boolean;
  }>;
  recommended: 'BUY_FROM_SAVINGS' | 'LOAN_EMI' | 'SAVE_FIRST' | 'NONE';
  createdAt: string;
}
```

---

### simulateLoan

**Purpose:** Run loan feasibility simulation

**Function Signature:**
```typescript
async function simulateLoan(
  userId: string,
  params: LoanParams
): Promise<LoanSimulationResult>
```

**Input Type:**
```typescript
interface LoanParams {
  loanAmount: number;
  interestRate: number; // Annual percentage
  tenure: number; // Months
  downPayment?: number;
}
```

**Validation:**
```typescript
const LoanParamsSchema = z.object({
  loanAmount: z.number().min(10000).max(1000000000),
  interestRate: z.number().min(0).max(50),
  tenure: z.number().int().min(1).max(360),
  downPayment: z.number().nonnegative().optional()
}).refine(
  data => !data.downPayment || data.downPayment < data.loanAmount,
  { message: 'Down payment must be less than loan amount' }
);
```

**Response:**
```typescript
interface LoanSimulationResult {
  id: string;
  type: 'LOAN_FEASIBILITY';
  emi: number;
  totalPayable: number;
  totalInterest: number;
  affordability: 'COMFORTABLE' | 'MANAGEABLE' | 'RISKY' | 'UNAFFORDABLE';
  debtToIncomeRatio: number; // Percentage
  monthlySurplus: number;
  amortizationSchedule: Array<{
    month: number;
    emi: number;
    principal: number;
    interest: number;
    balance: number;
  }>;
  goalImpacts: Array<{
    goalId: string;
    goalName: string;
    delayMonths: number;
  }>;
  recommendations: string[];
  createdAt: string;
}
```

---

### simulateGoalChange

**Purpose:** Simulate changes to goal parameters

**Function Signature:**
```typescript
async function simulateGoalChange(
  goalId: string,
  params: GoalChangeParams
): Promise<GoalSimulationResult>
```

**Input Type:**
```typescript
interface GoalChangeParams {
  newTargetAmount?: number;
  newTargetDate?: string;
  newMonthlyContribution?: number;
}
```

**Response:**
```typescript
interface GoalSimulationResult {
  id: string;
  type: 'GOAL_TIMELINE';
  original: {
    targetAmount: number;
    targetDate: string;
    monthlyContribution: number;
    isFeasible: boolean;
  };
  simulated: {
    targetAmount: number;
    targetDate: string;
    monthlyContribution: number;
    isFeasible: boolean;
    feasibilityScore: number;
  };
  comparison: {
    amountDifference: number;
    monthsDifference: number;
    contributionDifference: number;
    feasibilityChange: number;
  };
  recommendations: string[];
  createdAt: string;
}
```

---

## Chat Actions

### sendMessage

**Purpose:** Send message in AI chat conversation

**Function Signature:**
```typescript
async function sendMessage(
  conversationId: string,
  message: string
): Promise<MessageResult>
```

**Input Validation:**
```typescript
const MessageSchema = z.object({
  conversationId: z.string().cuid(),
  message: z.string().min(1).max(1000)
});
```

**Response:**
```typescript
interface MessageResult {
  success: true;
  message: {
    id: string;
    conversationId: string;
    role: 'USER';
    content: string;
    createdAt: string;
  };
  assistantMessageId: string; // ID for streaming response
}
```

**Note:** Actual AI response delivered via streaming endpoint

---

### getConversations

**Purpose:** Retrieve user's chat conversations

**Function Signature:**
```typescript
async function getConversations(
  userId: string
): Promise<Conversation[]>
```

**Response:**
```typescript
interface Conversation {
  id: string;
  userId: string;
  title: string | null;
  messageCount: number;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
}
```

---

### getMessages

**Purpose:** Retrieve messages in a conversation

**Function Signature:**
```typescript
async function getMessages(
  conversationId: string
): Promise<Message[]>
```

**Response:**
```typescript
interface Message {
  id: string;
  conversationId: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  metadata?: {
    intent?: {
      type: string;
      parameters: Record<string, any>;
    };
    calculations?: {
      input: Record<string, any>;
      output: Record<string, any>;
      formula?: string;
    };
    confidence?: number;
  };
  createdAt: string;
}
```

---

## Expense Actions

### createExpense

**Purpose:** Add a new expense

**Function Signature:**
```typescript
async function createExpense(
  data: ExpenseInput
): Promise<Result<ExpenseResult, ExpenseError>>
```

**Input Type:**
```typescript
interface ExpenseInput {
  name: string;
  amount: number;
  category: ExpenseCategory;
  frequency: Frequency;
  isEssential: boolean;
  startDate?: string;
  endDate?: string;
}

enum ExpenseCategory {
  RENT = 'RENT',
  UTILITIES = 'UTILITIES',
  GROCERIES = 'GROCERIES',
  TRANSPORTATION = 'TRANSPORTATION',
  HEALTHCARE = 'HEALTHCARE',
  INSURANCE = 'INSURANCE',
  ENTERTAINMENT = 'ENTERTAINMENT',
  DINING = 'DINING',
  SHOPPING = 'SHOPPING',
  EDUCATION = 'EDUCATION',
  OTHER = 'OTHER'
}

enum Frequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  BIWEEKLY = 'BIWEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  ANNUAL = 'ANNUAL',
  ONE_TIME = 'ONE_TIME'
}
```

**Validation:**
```typescript
const ExpenseInputSchema = z.object({
  name: z.string().min(1).max(100),
  amount: z.number().positive().max(10000000),
  category: z.nativeEnum(ExpenseCategory),
  frequency: z.nativeEnum(Frequency),
  isEssential: z.boolean(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
}).refine(
  data => !data.endDate || !data.startDate || new Date(data.endDate) > new Date(data.startDate),
  { message: 'End date must be after start date' }
);
```

**Side Effects:**
- Recalculates allocation
- Updates goal feasibility

---

## Debt Actions

### createDebt

**Purpose:** Add a new debt/loan

**Function Signature:**
```typescript
async function createDebt(
  data: DebtInput
): Promise<Result<DebtResult, DebtError>>
```

**Input Type:**
```typescript
interface DebtInput {
  name: string;
  type: DebtType;
  principalAmount: number;
  currentBalance: number;
  interestRate: number;
  monthlyPayment: number;
  minimumPayment: number;
  startDate: string;
  endDate?: string;
}

enum DebtType {
  HOME_LOAN = 'HOME_LOAN',
  CAR_LOAN = 'CAR_LOAN',
  PERSONAL_LOAN = 'PERSONAL_LOAN',
  EDUCATION_LOAN = 'EDUCATION_LOAN',
  CREDIT_CARD = 'CREDIT_CARD',
  OTHER = 'OTHER'
}
```

**Validation:**
```typescript
const DebtInputSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.nativeEnum(DebtType),
  principalAmount: z.number().min(10000).max(1000000000),
  currentBalance: z.number().nonnegative(),
  interestRate: z.number().min(0).max(50),
  monthlyPayment: z.number().positive(),
  minimumPayment: z.number().positive(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional()
}).refine(
  data => data.currentBalance <= data.principalAmount,
  { message: 'Current balance cannot exceed principal' }
).refine(
  data => data.monthlyPayment >= data.minimumPayment,
  { message: 'Monthly payment must be >= minimum payment' }
);
```

**Side Effects:**
- Recalculates allocation
- Updates debt-to-income ratio

---

## Error Handling

### Standard Error Response

All Server Actions return a `Result<T, E>` type:

```typescript
type Result<T, E> = 
  | { success: true } & T
  | { success: false; error: string; code: string } & E;
```

### Error Codes

```typescript
enum ErrorCode {
  // Authentication
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  
  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  
  // Business Logic
  DUPLICATE_EMERGENCY_FUND = 'DUPLICATE_EMERGENCY_FUND',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  GOAL_NOT_FEASIBLE = 'GOAL_NOT_FEASIBLE',
  
  // System
  NOT_FOUND = 'NOT_FOUND',
  SERVER_ERROR = 'SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  RATE_LIMITED = 'RATE_LIMITED'
}
```

### Error Response Format

```typescript
interface ErrorResponse {
  success: false;
  error: string; // Human-readable message
  code: ErrorCode;
  details?: Record<string, string[]>; // Field-level validation errors
  timestamp: string;
}
```

---

## Rate Limiting

### Limits by Action Type

| Action Type | Limit | Window |
|-------------|-------|--------|
| Chat messages | 20 | 1 minute |
| Simulations | 30 | 1 minute |
| Profile updates | 10 | 1 minute |
| Goal operations | 20 | 1 minute |
| General reads | 100 | 1 minute |

### Rate Limit Response

```typescript
{
  success: false;
  error: 'Rate limit exceeded',
  code: 'RATE_LIMITED',
  retryAfter: 45 // seconds
}
```

---

## Caching Strategy

### Cache Headers (REST)

```typescript
// Health endpoint
'Cache-Control': 'no-cache'

// Webhooks
'Cache-Control': 'no-store'
```

### Server Action Caching

Server Actions use Next.js revalidation:

```typescript
// Read operations - cache for 60 seconds
export const revalidate = 60;

// Write operations - no cache
export const revalidate = 0;
```

---

## Type Safety

All contracts use TypeScript with strict mode:

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### Zod Validation

All inputs validated with Zod schemas:

```typescript
import { z } from 'zod';

const schema = z.object({
  // Schema definition
});

type InferredType = z.infer<typeof schema>;
```

---

## Testing Contracts

### Example Test Structure

```typescript
describe('createGoal', () => {
  it('should create goal with valid input', async () => {
    const input: GoalInput = {
      name: 'House Down Payment',
      type: 'HOUSE',
      targetAmount: 500000,
      targetDate: '2026-12-31',
      priority: 'HIGH'
    };
    
    const result = await createGoal(input);
    
    expect(result.success).toBe(true);
    expect(result.goal.isFeasible).toBeDefined();
  });
  
  it('should reject invalid target date', async () => {
    const input: GoalInput = {
      name: 'Invalid Goal',
      type: 'CUSTOM',
      targetAmount: 100000,
      targetDate: '2020-01-01', // Past date
      priority: 'LOW'
    };
    
    const result = await createGoal(input);
    
    expect(result.success).toBe(false);
    expect(result.code).toBe('VALIDATION_ERROR');
  });
});
```

---

## API Versioning

**Current Version:** v1 (implicit)

**Future Versioning Strategy:**
- REST endpoints: `/api/v2/...`
- Server Actions: Separate files (`actions/v2/...`)
- Maintain backward compatibility for 6 months

---

## Conclusion

This API contract specification provides:

✅ **Complete REST endpoint definitions** with request/response formats  
✅ **All Server Action signatures** with TypeScript types  
✅ **Validation schemas** using Zod  
✅ **Error handling** patterns and codes  
✅ **Rate limiting** specifications  
✅ **Authentication** requirements  
✅ **Type safety** with strict TypeScript  

All contracts are:
- **Type-safe** - Full TypeScript support
- **Validated** - Zod schemas for runtime validation
- **Documented** - Clear input/output specifications
- **Testable** - Example test structures provided
- **Consistent** - Standard error handling across all endpoints

This serves as the complete API contract specification for implementing Sage's backend layer.
