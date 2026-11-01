# Sage: User Journeys

## Overview

This document details complete user flows through Sage, documenting user actions, system responses, screens, and expected outcomes for each key journey.

---

## Journey 1: New User Onboarding

**Goal:** Get user from signup to first value in under 2 minutes

**Preconditions:**
- User has email address
- User wants financial guidance

### Flow Steps

#### Step 1: Sign Up
**User Actions:**
- Clicks "Get Started" on landing page
- Chooses sign-up method (email/Google/Apple)
- Enters credentials

**System Actions:**
- Validates email uniqueness
- Creates Clerk user account
- Triggers webhook to create User entity
- Redirects to onboarding

**Screen:** Sign-up modal
**Data Collected:** Email, name (optional)
**Validation:** Valid email format, unique email
**Error Handling:** Show inline errors, suggest login if email exists

#### Step 2: Welcome & Context
**User Actions:**
- Reads welcome message
- Clicks "Start"

**System Actions:**
- Displays onboarding progress (Step 1/4)
- Initializes empty FinancialProfile

**Screen:** Welcome screen
**Expected Outcome:** User understands what to expect

#### Step 3: Monthly Income
**User Actions:**
- Enters monthly income amount
- Selects income frequency (monthly/annual)
- Clicks "Continue"

**System Actions:**
- Validates income > 0
- Normalizes to monthly if annual
- Saves to FinancialProfile
- Updates progress (Step 2/4)

**Screen:** Income input screen
**Data Collected:** `monthlyIncome`, `incomeFrequency`
**Validation:** Amount between ₹10,000 - ₹10,00,000
**Error Handling:** Show range validation errors

#### Step 4: Current Savings
**User Actions:**
- Enters current savings amount
- Clicks "Continue"

**System Actions:**
- Validates savings >= 0
- Saves to FinancialProfile
- Updates progress (Step 3/4)

**Screen:** Savings input screen
**Data Collected:** `currentSavings`
**Validation:** Amount >= 0
**Error Handling:** Allow zero, suggest minimum emergency fund

#### Step 5: Primary Goal
**User Actions:**
- Selects goal type from list
- Clicks "Continue"

**System Actions:**
- Saves primaryGoal to FinancialProfile
- Updates progress (Step 4/4)

**Screen:** Goal selection screen
**Data Collected:** `primaryGoal`
**Options:** Emergency Fund, House, Car, Vacation, Wedding, Education, Retirement, Custom

#### Step 6: Loan Information (Optional)
**User Actions:**
- Enters existing loan amount (or skips)
- Clicks "Finish"

**System Actions:**
- Creates Debt entity if amount > 0
- Calculates CFO Understanding Score
- Generates initial allocation
- Redirects to dashboard

**Screen:** Loan input screen
**Data Collected:** Debt amount (optional)
**Validation:** Amount >= 0

#### Step 7: Results
**User Actions:**
- Views allocation recommendation
- Explores dashboard

**System Actions:**
- Displays allocation breakdown
- Shows CFO Understanding Score (40-50%)
- Highlights next steps
- Tracks onboarding completion event

**Screen:** Dashboard with allocation card
**Expected Outcome:** User sees immediate value, understands their financial situation

### Success Criteria
- ✅ Completion time < 2 minutes
- ✅ 90%+ completion rate
- ✅ User receives allocation recommendation
- ✅ CFO Understanding Score displayed
- ✅ Clear next actions shown

### Analytics Events
- `onboarding_started`
- `onboarding_step_completed` (with step number)
- `onboarding_completed`
- `time_to_completion` (duration metric)

---

## Journey 2: Create Goal

**Goal:** Allow user to create and track a financial goal

**Preconditions:**
- User is authenticated
- User has FinancialProfile

### Flow Steps

#### Step 1: Initiate Goal Creation
**User Actions:**
- Clicks "Add Goal" button on dashboard
- Or clicks "Create Goal" in goals section

**System Actions:**
- Opens goal creation form
- Pre-fills suggested goals based on profile

**Screen:** Goals dashboard → Goal creation modal

#### Step 2: Select Goal Type
**User Actions:**
- Selects goal type from cards
- Or chooses "Custom Goal"

**System Actions:**
- Shows goal type-specific form
- Pre-fills typical amounts for goal type

**Screen:** Goal type selection
**Options:** Emergency Fund, House, Car, Vacation, Wedding, Education, Retirement, Custom

#### Step 3: Enter Goal Details
**User Actions:**
- Enters goal name
- Enters target amount
- Selects target date
- Sets priority (High/Medium/Low)
- Optionally adds description

**System Actions:**
- Validates all inputs
- Shows real-time feasibility preview
- Calculates required monthly contribution

**Screen:** Goal details form
**Data Collected:** `name`, `targetAmount`, `targetDate`, `priority`, `description`
**Validation:**
- Name: 1-100 characters
- Amount: ₹1,000 - ₹10,00,00,000
- Date: At least 1 month in future

#### Step 4: Review Feasibility
**User Actions:**
- Reviews feasibility analysis
- Adjusts amount/date if needed
- Clicks "Create Goal"

**System Actions:**
- Runs feasibility calculation
- Calculates monthly required
- Checks against available surplus
- Generates confidence score
- Identifies potential conflicts with other goals

**Screen:** Feasibility preview
**Displayed:**
- Monthly required: ₹X
- Feasibility: Yes/No/Maybe
- Confidence: X%
- Impact on other goals
- Recommendations

#### Step 5: Goal Created
**User Actions:**
- Views goal on dashboard
- Optionally sets up milestones

**System Actions:**
- Creates Goal entity
- Recalculates allocation
- Updates dashboard
- Triggers `goal_created` event

**Screen:** Goals dashboard with new goal
**Expected Outcome:** Goal visible, feasibility clear, next steps shown

### Feasibility Scenarios

**Scenario A: Feasible Goal**
- Required monthly < Available surplus
- Confidence: 80-100%
- Message: "This goal is achievable! You need to save ₹X per month."

**Scenario B: Tight but Possible**
- Required monthly = 80-100% of surplus
- Confidence: 50-79%
- Message: "This goal is tight but possible. Consider extending timeline or reducing amount."

**Scenario C: Not Feasible**
- Required monthly > Available surplus
- Confidence: 0-49%
- Message: "This goal needs adjustment. Here are your options:"
  - Extend timeline by X months
  - Reduce amount by ₹Y
  - Increase income or reduce expenses

### Success Criteria
- ✅ Goal created in < 1 minute
- ✅ Feasibility clearly communicated
- ✅ User understands monthly requirement
- ✅ Allocation updated automatically

### Analytics Events
- `goal_creation_started`
- `goal_type_selected`
- `goal_created`
- `goal_feasibility_checked`

---

## Journey 3: Daily Check-in

**Goal:** User checks financial status and gets insights

**Preconditions:**
- User is authenticated
- User has active goals and allocation

### Flow Steps

#### Step 1: Open Dashboard
**User Actions:**
- Opens Sage app
- Views dashboard

**System Actions:**
- Loads user's financial data
- Calculates health score
- Generates daily insights
- Shows progress updates

**Screen:** Main dashboard
**Load Time:** < 1 second

#### Step 2: Review Health Score
**User Actions:**
- Views financial health score
- Clicks for breakdown

**System Actions:**
- Displays score components:
  - Emergency fund status (25%)
  - Debt-to-income ratio (25%)
  - Savings rate (25%)
  - Goal progress (25%)
- Shows score trend

**Screen:** Health score card
**Displayed:** Score 0-100, trend, components

#### Step 3: Review Insights
**User Actions:**
- Reads personalized insights
- Takes action on recommendations

**System Actions:**
- Generates insights based on:
  - Upcoming goal milestones
  - Budget variances
  - Optimization opportunities
  - Potential issues

**Screen:** Insights list
**Insight Types:**
- Achievements (milestone reached)
- Warnings (goal off-track)
- Opportunities (extra savings available)
- Reminders (debt payment due)

#### Step 4: Quick Actions
**User Actions:**
- Uses quick action buttons
- Updates progress
- Asks AI question

**System Actions:**
- Provides shortcuts to common tasks
- Updates data in real-time

**Screen:** Quick actions section
**Actions Available:**
- Ask AI CFO
- Log transaction
- Update goal progress
- Run simulation
- View allocation

### Success Criteria
- ✅ Dashboard loads in < 1 second
- ✅ Insights are relevant and actionable
- ✅ User can complete common tasks quickly
- ✅ Progress is visible

### Analytics Events
- `dashboard_viewed`
- `health_score_checked`
- `insight_clicked`
- `quick_action_used`

---

## Journey 4: AI CFO Chat

**Goal:** User asks financial question and receives personalized answer

**Preconditions:**
- User is authenticated
- User has FinancialProfile

### Flow Steps

#### Step 1: Open Chat
**User Actions:**
- Clicks "Ask AI CFO" button
- Or navigates to chat section

**System Actions:**
- Opens chat interface
- Loads recent conversations
- Shows suggested questions

**Screen:** Chat interface
**Suggested Questions:**
- "Can I afford [item]?"
- "When can I achieve [goal]?"
- "How should I use my bonus?"
- "Am I saving enough?"

#### Step 2: Ask Question
**User Actions:**
- Types question
- Sends message

**System Actions:**
- Creates/continues Conversation
- Creates Message (role: USER)
- Shows typing indicator
- Extracts intent from question

**Screen:** Chat with user message
**Processing:** Intent extraction via LLM

#### Step 3: Intent Processing
**System Actions:**
- LLM extracts intent type and parameters
- Examples:
  - "Can I afford ₹50,000 laptop?" → `{type: 'affordability', amount: 50000, item: 'laptop'}`
  - "When can I buy a house?" → `{type: 'goal-progress', goalType: 'house'}`
  - "How should I allocate my bonus?" → `{type: 'allocation-advice', amount: bonus}`

**Processing Time:** < 500ms

#### Step 4: Execute Calculation
**System Actions:**
- Routes to appropriate financial engine
- Retrieves user's financial data
- Runs deterministic calculation
- Generates structured results

**Example (Affordability):**
```typescript
Input: { purchaseAmount: 50000, item: 'laptop' }
Calculation:
  - Monthly surplus: ₹20,000
  - Emergency fund: ₹1,50,000 (below ₹2,10,000 target)
  - Active goals: House (₹15,000/month)
Output: {
  canAffordFromSavings: false,
  canAffordWithLoan: true,
  recommendedApproach: 'save-first',
  timeline: 3 months,
  impact: { emergencyFund: -50000 }
}
```

**Processing Time:** < 100ms

#### Step 5: Generate Response
**System Actions:**
- LLM generates natural language explanation
- Uses calculation results as context
- Includes reasoning and recommendations
- Streams response to user

**Screen:** Chat with AI response
**Response Format:**
```
Based on your ₹80,000 monthly income and ₹60,000 expenses, 
you have ₹20,000 surplus.

Buying from savings:
❌ Would reduce emergency fund to ₹1,00,000 (below recommended)
⚠️ Not recommended

Saving first:
✅ Save ₹20,000/month for 3 months
✅ No impact on emergency fund or house goal
✅ Recommended approach

Would you like to see how a loan would compare?
```

**Processing Time:** < 3 seconds total

#### Step 6: Follow-up
**User Actions:**
- Asks follow-up question
- Requests alternative scenario
- Ends conversation

**System Actions:**
- Maintains conversation context
- References previous calculations
- Updates conversation timestamp

**Screen:** Continued chat
**Context Maintained:** Previous 10 messages

### Question Types Handled

**1. Affordability Questions**
- "Can I afford [item] for ₹[amount]?"
- "Should I buy [item]?"
- Intent: `affordability`
- Engine: Purchase Simulation

**2. Goal Questions**
- "When can I [goal]?"
- "Am I on track for [goal]?"
- Intent: `goal-progress`
- Engine: Goal Projection

**3. Allocation Questions**
- "How should I allocate my [income/bonus]?"
- "Where should I invest?"
- Intent: `allocation-advice`
- Engine: Allocation

**4. Planning Questions**
- "What should I prioritize?"
- "How can I save more?"
- Intent: `financial-planning`
- Engine: Multiple engines

**5. Explanation Questions**
- "Why did you recommend [X]?"
- "How did you calculate [Y]?"
- Intent: `explanation`
- Engine: None (explains previous calculation)

### Success Criteria
- ✅ Response time < 3 seconds
- ✅ Answer uses actual user data
- ✅ No hallucinated information
- ✅ Reasoning is transparent
- ✅ Recommendations are actionable

### Analytics Events
- `chat_opened`
- `message_sent`
- `intent_extracted`
- `calculation_executed`
- `response_generated`
- `follow_up_asked`

---

## Journey 5: Can I Afford This?

**Goal:** User checks if they can afford a purchase

**Preconditions:**
- User is authenticated
- User has FinancialProfile with income and expenses

### Flow Steps

#### Step 1: Initiate Check
**User Actions:**
- Clicks "Affordability Checker" in simulator section
- Or asks in chat: "Can I afford ₹X?"

**System Actions:**
- Opens affordability simulator
- Pre-fills user's financial context

**Screen:** Affordability simulator

#### Step 2: Enter Purchase Details
**User Actions:**
- Enters purchase amount
- Optionally enters item name
- Clicks "Check Affordability"

**System Actions:**
- Validates amount > 0
- Retrieves user's financial data
- Runs simulation

**Screen:** Purchase input form
**Data Collected:** `amount`, `item` (optional)

#### Step 3: Run Simulation
**System Actions:**
- Calculates current monthly surplus
- Checks emergency fund status
- Analyzes impact on goals
- Generates 3 scenarios:
  1. Buy from savings now
  2. Take loan/EMI
  3. Save first, then buy

**Processing:** Purchase Simulation Engine
**Time:** < 2 seconds

#### Step 4: View Results
**User Actions:**
- Reviews all scenarios
- Compares options
- Selects preferred approach

**System Actions:**
- Displays scenario comparison
- Highlights recommended option
- Shows impact visualization

**Screen:** Scenario comparison
**Displayed:**

**Scenario 1: Buy from Savings**
- Remaining savings: ₹X
- Emergency fund impact: -₹Y
- Goal delays: Z months
- Recommendation: ✅/❌

**Scenario 2: Loan/EMI**
- EMI: ₹X/month for Y months
- Total cost: ₹Z (including interest)
- Goal delays: W months
- Recommendation: ✅/❌

**Scenario 3: Save First**
- Timeline: X months
- No goal delays
- No emergency fund impact
- Recommendation: ✅

#### Step 5: Take Action
**User Actions:**
- Saves simulation for reference
- Asks AI for more details
- Makes decision

**System Actions:**
- Stores Simulation entity
- Links to conversation if from chat
- Updates user's decision history

**Screen:** Results with action buttons

### Simulation Logic

**Input:**
```typescript
{
  purchaseAmount: 50000,
  currentSavings: 200000,
  emergencyFundTarget: 210000,
  currentEmergencyFund: 150000,
  monthlyIncome: 80000,
  monthlyExpenses: 60000,
  activeGoals: [
    { id: 'goal1', monthlyContribution: 15000 }
  ]
}
```

**Calculations:**
```typescript
monthlySurplus = income - expenses = 20000
availableForPurchase = currentSavings - emergencyFundTarget = -10000

// Scenario 1: Buy from savings
newSavings = 200000 - 50000 = 150000
newEmergencyFund = 150000 (unchanged, already below target)
impact = "Emergency fund ₹60,000 below target"
recommendation = false

// Scenario 2: Loan (assume 12% interest, 12 months)
emi = calculateEMI(50000, 12, 12) = ₹4,442
newSurplus = 20000 - 4442 = 15,558
goalImpact = "House goal delayed by 2 months"
recommendation = true (if emi < 25% of surplus)

// Scenario 3: Save first
monthsToSave = 50000 / 20000 = 2.5 months
recommendation = true (best option)
```

### Success Criteria
- ✅ All scenarios calculated accurately
- ✅ Recommendation is clear
- ✅ Impact is quantified
- ✅ User can make informed decision

### Analytics Events
- `affordability_check_started`
- `simulation_run`
- `scenario_selected`
- `simulation_saved`

---

## Journey 6: Loan Simulation

**Goal:** User evaluates loan feasibility and impact

**Preconditions:**
- User is authenticated
- User has FinancialProfile

### Flow Steps

#### Step 1: Open Loan Calculator
**User Actions:**
- Clicks "Loan Calculator" in simulator section
- Or asks in chat about loan

**System Actions:**
- Opens loan simulator
- Shows input form

**Screen:** Loan calculator

#### Step 2: Enter Loan Details
**User Actions:**
- Enters loan amount
- Enters interest rate
- Selects tenure (months/years)
- Optionally enters down payment

**System Actions:**
- Validates inputs
- Shows real-time EMI preview

**Screen:** Loan input form
**Data Collected:**
- `loanAmount`: ₹10,000 - ₹10,00,00,000
- `interestRate`: 1% - 50%
- `tenure`: 1 - 360 months
- `downPayment`: Optional

#### Step 3: Calculate EMI
**System Actions:**
- Calculates EMI using formula:
  ```
  EMI = P × r × (1 + r)^n / ((1 + r)^n - 1)
  where:
    P = Principal (loan amount - down payment)
    r = Monthly interest rate (annual rate / 12 / 100)
    n = Tenure in months
  ```
- Generates amortization schedule
- Calculates total interest

**Processing:** Loan Simulation Engine
**Time:** < 100ms

#### Step 4: View Results
**User Actions:**
- Reviews EMI breakdown
- Checks affordability
- Views amortization schedule

**System Actions:**
- Displays comprehensive results
- Checks against user's income
- Calculates debt-to-income ratio
- Shows impact on goals

**Screen:** Loan results
**Displayed:**

**EMI Breakdown:**
- Monthly EMI: ₹X
- Total amount payable: ₹Y
- Total interest: ₹Z
- Tenure: N months

**Affordability:**
- Your monthly income: ₹A
- Current EMI commitments: ₹B
- New total EMI: ₹C
- Debt-to-income ratio: X%
- Affordable: ✅/❌ (if ratio < 40%)

**Impact on Goals:**
- Available surplus: ₹X → ₹Y
- House goal: Delayed by Z months
- Emergency fund: Impact assessment

**Amortization Schedule:**
| Month | EMI | Principal | Interest | Balance |
|-------|-----|-----------|----------|---------|
| 1     | ... | ...       | ...      | ...     |

#### Step 5: Explore Scenarios
**User Actions:**
- Adjusts tenure
- Changes down payment
- Compares different rates

**System Actions:**
- Recalculates instantly
- Updates all displays
- Shows comparison

**Screen:** Interactive calculator

#### Step 6: Make Decision
**User Actions:**
- Saves simulation
- Asks AI for advice
- Creates debt entry if proceeding

**System Actions:**
- Stores simulation
- Provides recommendations
- Optionally creates Debt entity

**Screen:** Results with actions

### Loan Affordability Rules

**Debt-to-Income Ratio:**
- < 30%: ✅ Comfortable
- 30-40%: ⚠️ Manageable
- > 40%: ❌ Risky

**Recommendations:**
- If ratio > 40%: Suggest larger down payment or longer tenure
- If emergency fund < 3 months: Warn about risk
- If high-priority goals delayed > 6 months: Suggest alternatives

### Success Criteria
- ✅ EMI calculated accurately
- ✅ Affordability clearly indicated
- ✅ Impact on goals quantified
- ✅ User understands total cost

### Analytics Events
- `loan_calculator_opened`
- `loan_details_entered`
- `emi_calculated`
- `amortization_viewed`
- `loan_simulation_saved`

---

## Cross-Journey Patterns

### Error Handling
**All Journeys:**
- Inline validation errors
- Clear error messages
- Suggested fixes
- No data loss on error

### Loading States
**All Journeys:**
- Skeleton screens for data loading
- Progress indicators for calculations
- Optimistic UI updates where safe

### Mobile Optimization
**All Journeys:**
- Touch-friendly inputs
- Simplified navigation
- Responsive layouts
- Thumb-zone optimization

### Accessibility
**All Journeys:**
- Keyboard navigation
- Screen reader support
- High contrast mode
- Clear focus indicators

---

## Success Metrics Summary

| Journey | Time Target | Completion Rate | User Satisfaction |
|---------|-------------|-----------------|-------------------|
| Onboarding | < 2 min | 90%+ | 80%+ |
| Create Goal | < 1 min | 85%+ | 85%+ |
| Daily Check-in | < 30 sec | 70%+ (daily) | 75%+ |
| AI Chat | < 3 sec response | 80%+ | 85%+ |
| Affordability | < 1 min | 75%+ | 80%+ |
| Loan Simulation | < 2 min | 70%+ | 80%+ |

---

## Conclusion

These user journeys provide:
- ✅ Complete step-by-step flows
- ✅ User and system actions
- ✅ Screen references
- ✅ Data requirements
- ✅ Validation rules
- ✅ Error handling
- ✅ Success criteria
- ✅ Analytics events

All journeys designed for:
- **Speed** - Quick value delivery
- **Clarity** - Clear outcomes
- **Guidance** - Actionable recommendations
- **Trust** - Transparent calculations
