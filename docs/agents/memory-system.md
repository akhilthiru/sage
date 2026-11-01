# Sage: Memory System Design

**Agent Memory Architecture**

---

## Overview

The Sage CFO Agent uses a multi-layered memory system to provide personalized, context-aware financial guidance.

**Memory Layers:**
1. **Session Memory** - Current conversation context
2. **User Profile Memory** - Persistent user preferences and patterns
3. **Financial Memory** - Financial data and history
4. **Long-term Memory** - Historical interactions and learnings

---

## Memory Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Agent Request                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  Memory Retrieval                            │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Session    │  │    Profile   │  │  Financial   │     │
│  │   Memory     │  │    Memory    │  │   Memory     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Long-term Memory                         │  │
│  │         (Conversation History + Learnings)            │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                Context Assembly                              │
│         (Combine memories into prompt context)               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Agent Response                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. Session Memory

**Purpose:** Track context within a single conversation.

**Lifetime:** Duration of conversation (cleared when conversation ends)

**Storage:** In-memory (Redis for distributed systems)

### What is Stored

```typescript
interface SessionMemory {
  conversationId: string;
  userId: string;
  startedAt: Date;
  lastMessageAt: Date;
  
  // Conversation context
  messages: Message[];
  currentTopic: string;
  discussedTopics: string[];
  
  // Intent tracking
  lastIntent: Intent;
  intentHistory: Intent[];
  
  // Tool usage
  toolsUsed: ToolUsage[];
  calculationsPerformed: Calculation[];
  
  // User state
  pendingActions: Action[];
  clarificationsNeeded: string[];
  
  // Temporary data
  scratchpad: Record<string, any>;
}
```

### Example

```typescript
{
  conversationId: "conv_abc123",
  userId: "user_xyz789",
  startedAt: "2024-12-19T10:00:00Z",
  lastMessageAt: "2024-12-19T10:05:30Z",
  
  messages: [
    {
      role: "user",
      content: "Can I afford a ₹30,000 laptop?",
      timestamp: "2024-12-19T10:00:00Z"
    },
    {
      role: "assistant",
      content: "Based on your finances...",
      timestamp: "2024-12-19T10:00:15Z",
      metadata: {
        intent: "PURCHASE_AFFORDABILITY",
        toolsUsed: ["simulatePurchase"],
        confidence: 85
      }
    },
    {
      role: "user",
      content: "What about a ₹50,000 phone?",
      timestamp: "2024-12-19T10:05:00Z"
    }
  ],
  
  currentTopic: "purchase_affordability",
  discussedTopics: ["laptop_purchase", "phone_purchase"],
  
  lastIntent: {
    type: "PURCHASE_AFFORDABILITY",
    parameters: { amount: 50000, item: "phone" }
  },
  
  toolsUsed: [
    {
      tool: "simulatePurchase",
      parameters: { amount: 30000 },
      result: { /* ... */ },
      timestamp: "2024-12-19T10:00:10Z"
    }
  ],
  
  scratchpad: {
    comparisonMode: true,
    items: ["laptop", "phone"]
  }
}
```

### Usage in Prompts

```typescript
function buildPromptContext(sessionMemory: SessionMemory): string {
  return `
Current conversation:
- Topic: ${sessionMemory.currentTopic}
- Previous topics: ${sessionMemory.discussedTopics.join(", ")}

Recent messages:
${sessionMemory.messages.slice(-5).map(m => 
  `${m.role}: ${m.content}`
).join("\n")}

User is currently asking about: ${sessionMemory.lastIntent.type}
`;
}
```

### Session Memory Operations

**Create:**
```typescript
async function createSession(userId: string): Promise<SessionMemory> {
  return {
    conversationId: generateId(),
    userId,
    startedAt: new Date(),
    lastMessageAt: new Date(),
    messages: [],
    currentTopic: "onboarding",
    discussedTopics: [],
    // ... initialize other fields
  };
}
```

**Update:**
```typescript
async function addMessage(
  conversationId: string,
  message: Message
): Promise<void> {
  const session = await getSession(conversationId);
  session.messages.push(message);
  session.lastMessageAt = new Date();
  
  // Update topic if changed
  if (message.metadata?.intent) {
    session.currentTopic = message.metadata.intent;
    if (!session.discussedTopics.includes(session.currentTopic)) {
      session.discussedTopics.push(session.currentTopic);
    }
  }
  
  await saveSession(session);
}
```

**Clear:**
```typescript
async function endSession(conversationId: string): Promise<void> {
  const session = await getSession(conversationId);
  
  // Archive to long-term memory
  await archiveConversation(session);
  
  // Clear session memory
  await deleteSession(conversationId);
}
```

---

## 2. User Profile Memory

**Purpose:** Store persistent user preferences and patterns.

**Lifetime:** Permanent (until user deletes account)

**Storage:** PostgreSQL database

### What is Stored

```typescript
interface UserProfileMemory {
  userId: string;
  
  // Communication preferences
  communicationStyle: "concise" | "detailed" | "balanced";
  preferredLanguage: "en" | "hi" | "mixed";
  explanationDepth: "simple" | "moderate" | "technical";
  
  // Financial preferences
  riskTolerance: "conservative" | "moderate" | "aggressive";
  goalPriorities: string[]; // Ordered list of goal IDs
  spendingStyle: "frugal" | "balanced" | "liberal";
  
  // Behavioral patterns
  decisionSpeed: "quick" | "deliberate" | "very_careful";
  feedbackPattern: "frequent" | "occasional" | "rare";
  engagementLevel: "high" | "medium" | "low";
  
  // Learning data
  commonQuestions: string[];
  frequentTopics: string[];
  preferredTools: string[];
  
  // Metadata
  profileCompleteness: number; // 0-100
  lastUpdated: Date;
  interactionCount: number;
}
```

### Example

```typescript
{
  userId: "user_xyz789",
  
  communicationStyle: "concise",
  preferredLanguage: "en",
  explanationDepth: "moderate",
  
  riskTolerance: "moderate",
  goalPriorities: ["goal_house", "goal_car", "goal_vacation"],
  spendingStyle: "balanced",
  
  decisionSpeed: "deliberate",
  feedbackPattern: "occasional",
  engagementLevel: "high",
  
  commonQuestions: [
    "Can I afford X?",
    "Am I on track for my house goal?",
    "How much should I save?"
  ],
  frequentTopics: [
    "purchase_affordability",
    "goal_projection",
    "allocation"
  ],
  preferredTools: [
    "simulatePurchase",
    "projectGoalTimeline",
    "calculateAllocation"
  ],
  
  profileCompleteness: 85,
  lastUpdated: "2024-12-19T10:00:00Z",
  interactionCount: 47
}
```

### Learning from Interactions

**Communication Style:**
```typescript
async function learnCommunicationStyle(
  userId: string,
  interaction: Interaction
): Promise<void> {
  const profile = await getUserProfile(userId);
  
  // User asked for shorter response
  if (interaction.feedback?.includes("too long")) {
    profile.communicationStyle = "concise";
  }
  
  // User asked follow-up questions (needed more detail)
  if (interaction.followUpQuestions > 2) {
    profile.communicationStyle = "detailed";
  }
  
  // User took action immediately (right amount of detail)
  if (interaction.actionTaken && interaction.followUpQuestions === 0) {
    // Keep current style
  }
  
  await saveUserProfile(profile);
}
```

**Risk Tolerance:**
```typescript
async function learnRiskTolerance(
  userId: string,
  decisions: Decision[]
): Promise<void> {
  const profile = await getUserProfile(userId);
  
  // Analyze decision patterns
  const conservativeChoices = decisions.filter(d => 
    d.option === "save_first" || d.option === "avoid_loan"
  ).length;
  
  const aggressiveChoices = decisions.filter(d => 
    d.option === "buy_now" || d.option === "take_loan"
  ).length;
  
  if (conservativeChoices > aggressiveChoices * 2) {
    profile.riskTolerance = "conservative";
  } else if (aggressiveChoices > conservativeChoices * 2) {
    profile.riskTolerance = "aggressive";
  } else {
    profile.riskTolerance = "moderate";
  }
  
  await saveUserProfile(profile);
}
```

### Usage in Prompts

```typescript
function buildUserContext(profile: UserProfileMemory): string {
  return `
User preferences:
- Communication: ${profile.communicationStyle} responses
- Risk tolerance: ${profile.riskTolerance}
- Top priority: ${profile.goalPriorities[0]}

Behavioral patterns:
- Decision style: ${profile.decisionSpeed}
- Engagement: ${profile.engagementLevel}

Adapt your response accordingly.
`;
}
```

---

## 3. Financial Memory

**Purpose:** Store user's financial data and history.

**Lifetime:** Permanent (until user deletes)

**Storage:** PostgreSQL database (encrypted)

### What is Stored

```typescript
interface FinancialMemory {
  userId: string;
  
  // Current state
  currentProfile: FinancialProfile;
  activeGoals: Goal[];
  activeExpenses: Expense[];
  activeDebts: Debt[];
  
  // Historical data
  incomeHistory: IncomeRecord[];
  expenseHistory: ExpenseRecord[];
  savingsHistory: SavingsRecord[];
  allocationHistory: Allocation[];
  
  // Calculations
  recentCalculations: Calculation[];
  simulationHistory: Simulation[];
  
  // Patterns
  spendingPatterns: SpendingPattern[];
  savingsPatterns: SavingsPattern[];
  
  // Metadata
  dataCompleteness: number; // 0-100
  lastCalculated: Date;
  lastUpdated: Date;
}
```

### Example

```typescript
{
  userId: "user_xyz789",
  
  currentProfile: {
    monthlyIncome: 80000,
    currentSavings: 200000,
    emergencyFundTarget: 240000,
    currentEmergencyFund: 150000,
    cfoUnderstandingScore: 85
  },
  
  activeGoals: [
    {
      id: "goal_house",
      name: "House Down Payment",
      targetAmount: 500000,
      currentAmount: 150000,
      targetDate: "2026-12-31",
      isFeasible: true,
      feasibilityScore: 78
    }
  ],
  
  incomeHistory: [
    { month: 11, year: 2024, amount: 80000 },
    { month: 10, year: 2024, amount: 80000 },
    { month: 9, year: 2024, amount: 75000 }
  ],
  
  spendingPatterns: [
    {
      category: "groceries",
      averageMonthly: 8000,
      trend: "stable",
      variance: 500
    }
  ],
  
  recentCalculations: [
    {
      type: "allocation",
      input: { /* ... */ },
      output: { /* ... */ },
      timestamp: "2024-12-19T10:00:00Z"
    }
  ],
  
  dataCompleteness: 75,
  lastCalculated: "2024-12-19T10:00:00Z",
  lastUpdated: "2024-12-19T09:30:00Z"
}
```

### Pattern Detection

**Income Stability:**
```typescript
function detectIncomeStability(history: IncomeRecord[]): IncomeStability {
  const amounts = history.map(h => h.amount);
  const average = mean(amounts);
  const variance = standardDeviation(amounts);
  
  if (variance / average < 0.05) {
    return { stability: "very_stable", confidence: 95 };
  } else if (variance / average < 0.15) {
    return { stability: "stable", confidence: 80 };
  } else if (variance / average < 0.30) {
    return { stability: "variable", confidence: 60 };
  } else {
    return { stability: "highly_variable", confidence: 40 };
  }
}
```

**Spending Patterns:**
```typescript
function detectSpendingPatterns(
  expenses: ExpenseRecord[]
): SpendingPattern[] {
  const byCategory = groupBy(expenses, 'category');
  
  return Object.entries(byCategory).map(([category, records]) => {
    const amounts = records.map(r => r.amount);
    
    return {
      category,
      averageMonthly: mean(amounts),
      trend: detectTrend(amounts),
      variance: standardDeviation(amounts),
      seasonality: detectSeasonality(records)
    };
  });
}
```

### Usage in Prompts

```typescript
function buildFinancialContext(memory: FinancialMemory): string {
  const incomeStability = detectIncomeStability(memory.incomeHistory);
  
  return `
Current financial situation:
- Monthly income: ₹${memory.currentProfile.monthlyIncome} (${incomeStability.stability})
- Savings: ₹${memory.currentProfile.currentSavings}
- Emergency fund: ₹${memory.currentProfile.currentEmergencyFund} / ₹${memory.currentProfile.emergencyFundTarget}

Active goals (${memory.activeGoals.length}):
${memory.activeGoals.map(g => 
  `- ${g.name}: ₹${g.currentAmount} / ₹${g.targetAmount} (${g.feasibilityScore}% feasible)`
).join("\n")}

Spending patterns:
${memory.spendingPatterns.map(p => 
  `- ${p.category}: ₹${p.averageMonthly}/month (${p.trend})`
).join("\n")}
`;
}
```

---

## 4. Long-term Memory

**Purpose:** Store historical interactions and learnings.

**Lifetime:** Permanent (with periodic archival)

**Storage:** PostgreSQL (conversations) + Vector database (embeddings)

### What is Stored

```typescript
interface LongTermMemory {
  userId: string;
  
  // Conversation history
  conversations: ConversationSummary[];
  
  // Key learnings
  userInsights: Insight[];
  successfulStrategies: Strategy[];
  failedApproaches: Approach[];
  
  // Milestones
  achievements: Achievement[];
  challenges: Challenge[];
  
  // Embeddings for semantic search
  conversationEmbeddings: Embedding[];
  
  // Metadata
  totalConversations: number;
  totalMessages: number;
  memberSince: Date;
}
```

### Conversation Summary

```typescript
interface ConversationSummary {
  conversationId: string;
  userId: string;
  startedAt: Date;
  endedAt: Date;
  messageCount: number;
  
  // Summary
  mainTopics: string[];
  intentsDiscussed: string[];
  decisionsM ade: Decision[];
  
  // Outcomes
  actionsTaken: Action[];
  goalsCreated: string[];
  insightsGained: string[];
  
  // Quality
  userSatisfaction: number; // 0-100
  conversationQuality: number; // 0-100
  
  // Embedding for semantic search
  embedding: number[];
}
```

### Example

```typescript
{
  conversationId: "conv_abc123",
  userId: "user_xyz789",
  startedAt: "2024-12-19T10:00:00Z",
  endedAt: "2024-12-19T10:15:00Z",
  messageCount: 8,
  
  mainTopics: ["purchase_affordability", "goal_impact"],
  intentsDiscussed: ["PURCHASE_AFFORDABILITY", "GOAL_PROJECTION"],
  
  decisionsM ade: [
    {
      decision: "buy_laptop_from_savings",
      amount: 30000,
      rationale: "Emergency fund safe, minimal goal impact"
    }
  ],
  
  actionsTaken: [
    {
      action: "purchased_laptop",
      amount: 30000,
      timestamp: "2024-12-19T10:14:00Z"
    }
  ],
  
  goalsCreated: [],
  insightsGained: [
    "User prefers buying from savings over loans",
    "User values emergency fund security"
  ],
  
  userSatisfaction: 90,
  conversationQuality: 85,
  
  embedding: [0.123, -0.456, 0.789, /* ... 1536 dimensions */]
}
```

### Semantic Search

**Find Similar Conversations:**
```typescript
async function findSimilarConversations(
  query: string,
  userId: string,
  limit: number = 5
): Promise<ConversationSummary[]> {
  // Generate embedding for query
  const queryEmbedding = await generateEmbedding(query);
  
  // Search vector database
  const results = await vectorDB.search({
    vector: queryEmbedding,
    filter: { userId },
    limit
  });
  
  return results.map(r => r.conversation);
}
```

**Usage:**
```typescript
// User asks: "Can I afford a car?"
const similarConversations = await findSimilarConversations(
  "Can I afford a car?",
  userId
);

// Found: Previous conversation about buying a laptop
// Context: "Last time you asked about a ₹30,000 laptop, 
//           you decided to buy from savings. Similar situation?"
```

### Learning Extraction

**Extract Insights:**
```typescript
async function extractInsights(
  conversation: Conversation
): Promise<Insight[]> {
  const insights: Insight[] = [];
  
  // Analyze decisions
  const decisions = conversation.messages.filter(m => 
    m.metadata?.decision
  );
  
  if (decisions.length > 0) {
    const pattern = analyzeDecisionPattern(decisions);
    insights.push({
      type: "decision_pattern",
      description: pattern,
      confidence: 80
    });
  }
  
  // Analyze preferences
  const preferences = extractPreferences(conversation);
  insights.push(...preferences);
  
  return insights;
}
```

---

## Memory Retrieval Strategy

### Context Assembly

```typescript
async function assembleContext(
  userId: string,
  conversationId: string,
  currentMessage: string
): Promise<Context> {
  // 1. Get session memory (fast)
  const session = await getSession(conversationId);
  
  // 2. Get user profile (fast)
  const profile = await getUserProfile(userId);
  
  // 3. Get financial memory (fast)
  const financial = await getFinancialMemory(userId);
  
  // 4. Search long-term memory (slower, semantic search)
  const relevant = await findSimilarConversations(
    currentMessage,
    userId,
    3
  );
  
  return {
    session,
    profile,
    financial,
    relevant,
    timestamp: new Date()
  };
}
```

### Context Prioritization

**Priority Order:**
1. **Session Memory** (highest) - Current conversation context
2. **Financial Memory** (high) - Current financial state
3. **User Profile** (medium) - Preferences and patterns
4. **Long-term Memory** (low) - Historical context

**Token Budget:**
```typescript
const TOKEN_BUDGET = {
  system: 500,        // System prompt
  session: 1000,      // Recent messages
  financial: 800,     // Current financial state
  profile: 300,       // User preferences
  longTerm: 400,      // Historical context
  response: 2000      // Agent response
  // Total: ~5000 tokens
};
```

### Context Compression

**For Long Conversations:**
```typescript
function compressSessionMemory(session: SessionMemory): string {
  // Keep only last 10 messages
  const recentMessages = session.messages.slice(-10);
  
  // Summarize older messages
  const olderMessages = session.messages.slice(0, -10);
  const summary = summarizeMessages(olderMessages);
  
  return `
Previous conversation summary:
${summary}

Recent messages:
${recentMessages.map(m => `${m.role}: ${m.content}`).join("\n")}
`;
}
```

---

## Memory Updates

### After Each Interaction

```typescript
async function updateMemories(
  userId: string,
  conversationId: string,
  interaction: Interaction
): Promise<void> {
  // 1. Update session memory
  await addMessage(conversationId, interaction.message);
  
  // 2. Update user profile (if patterns detected)
  if (interaction.feedback) {
    await learnCommunicationStyle(userId, interaction);
  }
  
  // 3. Update financial memory (if data changed)
  if (interaction.dataUpdates) {
    await updateFinancialMemory(userId, interaction.dataUpdates);
  }
  
  // 4. Store in long-term memory (async)
  await queueForArchival(conversationId, interaction);
}
```

### Periodic Maintenance

```typescript
// Run daily
async function maintainMemories(): Promise<void> {
  // 1. Archive old sessions
  await archiveOldSessions(30); // > 30 days
  
  // 2. Update user profiles
  await recalculateUserProfiles();
  
  // 3. Detect new patterns
  await detectNewPatterns();
  
  // 4. Clean up stale data
  await cleanupStaleData(90); // > 90 days
}
```

---

## Privacy and Security

### Data Encryption

**Sensitive Fields:**
```typescript
const ENCRYPTED_FIELDS = [
  'monthlyIncome',
  'currentSavings',
  'targetAmount',
  'currentAmount',
  'principalAmount',
  'currentBalance'
];
```

**Encryption:**
```typescript
async function encryptFinancialData(
  data: FinancialMemory
): Promise<EncryptedFinancialMemory> {
  const encrypted = { ...data };
  
  for (const field of ENCRYPTED_FIELDS) {
    if (encrypted[field] !== undefined) {
      encrypted[field] = await encrypt(encrypted[field]);
    }
  }
  
  return encrypted;
}
```

### Data Retention

**Policy:**
- Active sessions: Until conversation ends
- User profiles: Until account deletion
- Financial data: Until account deletion
- Conversation history: 1 year (then archived)
- Archived conversations: 3 years (then deleted)

**Implementation:**
```typescript
async function enforceRetentionPolicy(): Promise<void> {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  
  // Archive old conversations
  await db.conversation.updateMany({
    where: {
      endedAt: { lt: oneYearAgo },
      archived: false
    },
    data: { archived: true }
  });
  
  const threeYearsAgo = new Date();
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
  
  // Delete very old archived conversations
  await db.conversation.deleteMany({
    where: {
      endedAt: { lt: threeYearsAgo },
      archived: true
    }
  });
}
```

### User Data Export

```typescript
async function exportUserMemories(userId: string): Promise<UserDataExport> {
  return {
    profile: await getUserProfile(userId),
    financial: await getFinancialMemory(userId),
    conversations: await getAllConversations(userId),
    insights: await getUserInsights(userId),
    exportedAt: new Date()
  };
}
```

### User Data Deletion

```typescript
async function deleteUserMemories(userId: string): Promise<void> {
  await db.$transaction([
    // Soft delete all memories
    db.userProfile.update({ 
      where: { userId }, 
      data: { deletedAt: new Date() } 
    }),
    db.conversation.updateMany({ 
      where: { userId }, 
      data: { deletedAt: new Date() } 
    }),
    db.financialMemory.update({ 
      where: { userId }, 
      data: { deletedAt: new Date() } 
    })
  ]);
}
```

---

## Quick Reference

**Memory Layers:**
1. Session Memory - Current conversation (in-memory/Redis)
2. User Profile Memory - Preferences and patterns (PostgreSQL)
3. Financial Memory - Financial data and history (PostgreSQL encrypted)
4. Long-term Memory - Historical interactions (PostgreSQL + Vector DB)

**Context Assembly:**
1. Session (1000 tokens)
2. Financial (800 tokens)
3. Profile (300 tokens)
4. Long-term (400 tokens)

**Updates:**
- After each interaction
- Daily maintenance
- Periodic pattern detection

**Privacy:**
- Encrypt sensitive fields
- Retention policy (1-3 years)
- User export/deletion

---

**Document Version:** 1.0  
**Last Updated:** 2024-12-19  
**Purpose:** Memory system architecture  
**Audience:** AI developers, system architects  
**Related:** cfo-agent.md, tool-specifications.md
