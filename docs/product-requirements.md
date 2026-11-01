# Sage: Product Requirements Document (PRD)

## Document Overview

**Version:** 1.0  
**Last Updated:** June 2026  
**Status:** Foundation Document  
**Owner:** Product & Engineering

## Product Summary

Sage is an AI-powered Personal CFO that helps users make better financial decisions through intelligent guidance, simulation, and progressive learning.

## Success Criteria

### MVP Success Metrics

**User Activation:**
- 80% of users complete initial setup within 2 minutes
- 70% of users ask their first question within first session
- 60% of users return within 7 days

**User Engagement:**
- Average 3+ questions per week
- Average session length: 5+ minutes
- 70% weekly active users (of monthly actives)

**User Value:**
- 80% of users report feeling more confident in financial decisions
- 50% of users achieve a goal milestone within 3 months
- NPS score: 40+

**Technical Performance:**
- Page load time: < 1 second
- AI response time: < 3 seconds
- 99.5% uptime
- Zero data breaches

## User Personas

### Primary Persona: Aspiring Achiever

**Demographics:**
- Age: 25-35
- Income: ₹50,000 - ₹1,50,000/month
- Location: Urban India
- Education: College graduate
- Tech-savvy: High

**Financial Situation:**
- Has regular income
- Has some savings (₹50k - ₹5L)
- May have education loan or personal loan
- Wants to achieve goals (house, car, travel)
- Lacks financial clarity

**Pain Points:**
- "I don't know if I'm saving enough"
- "Should I buy this or wait?"
- "Can I afford a car loan?"
- "Am I on track for my goals?"
- "What should I prioritize financially?"

**Goals:**
- Financial security
- Achieve life goals
- Make smart financial decisions
- Build wealth over time

**User Journey with Sage:**
1. Signs up in 2 minutes
2. Gets immediate allocation recommendation
3. Asks "Can I afford X?" questions
4. Gradually adds more financial data
5. Relies on Sage for all financial decisions

### Secondary Persona: Financial Beginner

**Demographics:**
- Age: 22-28
- Income: ₹30,000 - ₹60,000/month
- First job or early career
- Limited financial knowledge

**Financial Situation:**
- New to managing money
- Minimal savings
- No investments
- Overwhelmed by financial advice

**Pain Points:**
- "I don't know where to start"
- "Financial planning seems complicated"
- "I don't understand investing"
- "How much should I save?"

**Goals:**
- Learn financial basics
- Start saving systematically
- Build emergency fund
- Avoid financial mistakes

## MVP Feature Requirements

### Feature 1: Quick Onboarding

**User Story:**  
As a new user, I want to get personalized financial guidance within 2 minutes so that I immediately see value.

**Requirements:**

**Must Have:**
- Collect only 4 essential inputs:
  1. Monthly income (₹)
  2. Current savings (₹)
  3. Primary financial goal (dropdown)
  4. Existing loans (₹)
- Show immediate allocation recommendation
- Display CFO Understanding Score
- Allow skipping optional fields

**Input Validation:**
- Income: ₹10,000 - ₹10,00,000/month
- Savings: ₹0 - ₹1,00,00,000
- Loans: ₹0 - ₹1,00,00,000

**Output:**
- Monthly allocation breakdown
- Goal feasibility assessment
- Next steps recommendation

**Success Criteria:**
- 90% completion rate
- < 2 minutes average time
- Zero mandatory fields beyond the 4 essentials

**UI/UX:**
- Single-page flow
- Progress indicator
- Conversational tone
- Mobile-optimized

---

### Feature 2: Financial Profile

**User Story:**  
As a user, I want to maintain my financial profile so that the AI understands my complete financial situation.

**Requirements:**

**Profile Sections:**

1. **Income**
   - Monthly salary (required)
   - Other income sources (optional)
   - Income frequency (monthly/annual)

2. **Expenses**
   - Rent/EMI (optional, prompted in week 1)
   - Utilities (optional)
   - Groceries (optional)
   - Transportation (optional)
   - Other expenses (optional)

3. **Assets**
   - Savings account balance
   - Fixed deposits
   - Stocks/Mutual funds
   - Real estate
   - Other assets

4. **Liabilities**
   - Home loan
   - Car loan
   - Personal loan
   - Credit card debt
   - Education loan

5. **Goals**
   - Goal name
   - Target amount
   - Target date
   - Priority (high/medium/low)
   - Current progress

**Progressive Disclosure:**
- Week 1: Income, savings, primary goal
- Week 2: Rent and major expenses
- Week 3: Investments and assets
- Week 4: Detailed expense categories

**CFO Understanding Score:**
```
Score = (Filled Fields / Total Relevant Fields) × 100

Levels:
- 0-30%: Basic Understanding
- 31-60%: Good Understanding
- 61-85%: Strong Understanding
- 86-100%: Complete Understanding
```

**Success Criteria:**
- 70% of users reach "Good Understanding" within 2 weeks
- 40% of users reach "Strong Understanding" within 1 month

---

### Feature 3: Goal Management

**User Story:**  
As a user, I want to set and track financial goals so that I can work towards what matters to me.

**Requirements:**

**Goal Types:**
1. Emergency Fund
2. House Down Payment
3. Car Purchase
4. Vacation
5. Wedding
6. Education
7. Retirement
8. Custom Goal

**Goal Attributes:**
- Name (required)
- Target amount (required)
- Target date (required)
- Priority (required): High/Medium/Low
- Current savings towards goal (optional)
- Monthly contribution (calculated)

**Goal Feasibility Engine:**

```typescript
interface GoalFeasibility {
  isAchievable: boolean;
  confidence: number; // 0-100
  monthlyRequired: number;
  timeline: number; // months
  recommendations: string[];
  risks: string[];
}
```

**Feasibility Calculation:**
```
Available Monthly = Income - Essential Expenses - Existing Commitments
Required Monthly = (Goal Amount - Current Savings) / Months Until Target
Feasibility = Available Monthly >= Required Monthly

If not feasible:
- Suggest extended timeline
- Suggest reduced goal amount
- Suggest expense optimization
- Suggest income increase
```

**Goal Dashboard:**
- Visual progress bars
- Timeline to completion
- Monthly contribution amount
- Feasibility status
- Recommendations

**Success Criteria:**
- 80% of users set at least one goal
- 50% of users set multiple goals
- 60% of users update goal progress monthly

---

### Feature 4: Smart Allocation Engine

**User Story:**  
As a user, I want personalized allocation recommendations so that I know how to distribute my income optimally.

**Requirements:**

**Allocation Categories:**
1. Essential Expenses (rent, utilities, groceries)
2. Debt Repayment (loans, credit cards)
3. Emergency Fund (until 6 months of expenses)
4. Goal Savings (towards specific goals)
5. Investments (long-term wealth)
6. Discretionary Spending (lifestyle)

**Allocation Algorithm:**

```
Priority Order:
1. Essential Expenses (must cover)
2. Minimum Debt Payments (must cover)
3. Emergency Fund (until 6 months saved)
4. High-Priority Goals
5. Additional Debt Repayment
6. Medium-Priority Goals
7. Investments
8. Low-Priority Goals
9. Discretionary Spending

Allocation Logic:
- If Income < Essential + Debt: Flag critical situation
- Emergency Fund: 10-20% until target reached
- High-Priority Goals: 15-30% of remaining
- Investments: 10-20% of remaining
- Discretionary: Remaining amount
```

**Output Format:**

```
Monthly Allocation (₹80,000 income)

Essential Expenses:     ₹35,000 (44%)
Debt Repayment:         ₹10,000 (13%)
Emergency Fund:         ₹10,000 (13%)
House Goal:             ₹15,000 (19%)
Investments:            ₹5,000  (6%)
Discretionary:          ₹5,000  (6%)

Recommendations:
- Emergency fund will be complete in 8 months
- House goal on track for 2028
- Consider increasing investment allocation
```

**Success Criteria:**
- 100% of users receive allocation on signup
- 70% of users follow allocation recommendations
- 50% of users update allocation monthly

---

### Feature 5: Decision Simulator

**User Story:**  
As a user, I want to simulate financial decisions so that I understand their impact before committing.

**Requirements:**

**Simulation Types:**

1. **Purchase Affordability**
   - Input: Purchase amount
   - Output: Can afford? Impact on goals? Recommendations?

2. **Loan Feasibility**
   - Input: Loan amount, interest rate, tenure
   - Output: EMI affordable? Impact on goals? Alternatives?

3. **Goal Timeline**
   - Input: Modified goal amount or date
   - Output: New monthly requirement? Feasibility?

4. **Income Change**
   - Input: New income amount
   - Output: New allocation? Goal timeline changes?

5. **Expense Change**
   - Input: New expense or expense reduction
   - Output: Impact on savings? Goal timelines?

**Simulation Engine:**

```typescript
interface SimulationInput {
  type: 'purchase' | 'loan' | 'goal' | 'income' | 'expense';
  amount: number;
  duration?: number; // for loans
  interestRate?: number; // for loans
}

interface SimulationResult {
  canAfford: boolean;
  confidence: number;
  impact: {
    monthlyCashFlow: number;
    emergencyFund: number;
    goals: GoalImpact[];
    investments: number;
  };
  recommendations: string[];
  alternatives: Alternative[];
}
```

**Example Simulation:**

```
Question: "Can I buy a ₹80,000 laptop?"

Analysis:
- Current monthly surplus: ₹20,000
- Emergency fund: ₹1,50,000 (target: ₹2,10,000)
- Active goals: House (₹15,000/month)

Scenario 1: Buy from savings
- Impact: Emergency fund drops to ₹70,000
- Risk: Below 3-month threshold
- Recommendation: Not recommended

Scenario 2: Buy with monthly payment
- EMI: ₹7,000/month for 12 months
- Impact: House goal delayed by 3 months
- Recommendation: Acceptable if necessary

Scenario 3: Save and buy
- Timeline: 4 months
- Impact: No goal delays
- Recommendation: Best option
```

**Success Criteria:**
- 60% of users run at least one simulation per month
- 80% of users find simulations helpful
- 50% of users change decisions based on simulations

---

### Feature 6: AI CFO Chat

**User Story:**  
As a user, I want to ask financial questions in natural language so that I get personalized guidance.

**Requirements:**

**Supported Question Types:**

1. **Affordability Questions**
   - "Can I afford a ₹50,000 vacation?"
   - "Should I buy this ₹30,000 phone?"

2. **Goal Questions**
   - "When can I buy a house?"
   - "Am I saving enough for retirement?"
   - "How can I achieve my goals faster?"

3. **Allocation Questions**
   - "How should I use my bonus?"
   - "Where should I invest this month?"
   - "Should I pay off debt or save?"

4. **Planning Questions**
   - "What should I prioritize financially?"
   - "How can I save more?"
   - "Am I on the right track?"

5. **Explanation Questions**
   - "Why did you recommend this allocation?"
   - "How did you calculate this?"
   - "What if I change X?"

**Chat Behavior:**

**Must Do:**
- Provide specific, actionable answers
- Show calculations and reasoning
- Admit when data is insufficient
- Ask clarifying questions when needed
- Reference user's actual financial data

**Must Not Do:**
- Invent financial data
- Give generic advice
- Provide investment recommendations (regulatory)
- Make guarantees about future returns
- Use complex financial jargon

**Response Format:**

```
User: "Can I afford a ₹2,00,000 car?"

AI Response:
Based on your financial profile:

Income: ₹80,000/month
Current Savings: ₹3,00,000
Monthly Surplus: ₹20,000

Option 1: Buy with savings
- Remaining savings: ₹1,00,000
- Risk: Below emergency fund target
- Recommendation: ❌ Not recommended

Option 2: Car loan
- Down payment: ₹60,000 (20%)
- Loan: ₹1,40,000 @ 9% for 3 years
- EMI: ₹4,500/month
- Impact: House goal delayed by 2 months
- Recommendation: ✅ Feasible

Option 3: Save for 10 months
- Save ₹20,000/month
- Buy in April 2027
- Impact: No goal delays
- Recommendation: ✅ Best option

My recommendation: Save for 10 months if not urgent. If needed now, take the loan with 20% down payment.

Would you like to see how this affects your other goals?
```

**Success Criteria:**
- < 3 second response time
- 80% answer accuracy
- 70% user satisfaction with answers
- 60% of users use chat weekly

---

### Feature 7: Dashboard

**User Story:**  
As a user, I want a clear overview of my financial health so that I know where I stand.

**Requirements:**

**Dashboard Sections:**

1. **Financial Health Score**
   ```
   Score Components:
   - Emergency Fund Status (25%)
   - Debt-to-Income Ratio (25%)
   - Savings Rate (25%)
   - Goal Progress (25%)
   
   Score: 0-100
   - 0-40: Needs Attention
   - 41-70: Good
   - 71-90: Excellent
   - 91-100: Outstanding
   ```

2. **CFO Understanding**
   - Percentage complete
   - What's known
   - What's missing
   - Impact of completing profile

3. **This Month**
   - Income
   - Planned allocation
   - Actual spending (if tracked)
   - Remaining budget

4. **Goals Overview**
   - Active goals with progress
   - On-track / off-track status
   - Next milestones

5. **Quick Actions**
   - Ask a question
   - Run a simulation
   - Update profile
   - Add transaction

6. **Insights**
   - Personalized recommendations
   - Upcoming milestones
   - Potential issues
   - Opportunities

**Success Criteria:**
- Dashboard loads in < 1 second
- All metrics update in real-time
- 80% of users check dashboard weekly

---

## Non-Functional Requirements

### Performance

**Response Times:**
- Page load: < 1 second
- AI response: < 3 seconds
- Simulation: < 2 seconds
- Database queries: < 100ms

**Scalability:**
- Support 10,000 concurrent users
- Handle 100 requests/second
- Database: 1M+ user records

### Security

**Authentication:**
- Clerk-based authentication
- Email/password and social login
- Multi-factor authentication (future)

**Data Protection:**
- Encryption at rest (AES-256)
- Encryption in transit (TLS 1.3)
- No plain-text storage of sensitive data
- Regular security audits

**Privacy:**
- GDPR compliant
- User data export
- User data deletion
- Clear privacy policy
- No data selling

### Reliability

**Uptime:**
- 99.5% uptime SLA
- < 1 hour downtime per month
- Automated failover

**Data Integrity:**
- Daily backups
- Point-in-time recovery
- Transaction consistency

### Accessibility

**Device Support:**
- Mobile (iOS, Android)
- Desktop (Chrome, Safari, Firefox, Edge)
- Tablet

**Network:**
- Works on 3G networks
- Offline mode (future)
- Progressive Web App

**Internationalization:**
- English (MVP)
- Hindi (Phase 2)
- Regional languages (future)

### Monitoring

**Analytics:**
- PostHog for product analytics
- User behavior tracking
- Feature usage metrics
- Error tracking

**Logging:**
- Application logs
- Error logs
- Audit logs
- Performance logs

---

## Out of Scope for MVP

The following are explicitly **NOT** included in MVP:

### Features
- Bank account integration
- Automatic transaction import
- Bill payment
- Investment execution
- Credit score integration
- Tax planning
- Insurance recommendations
- Multi-user accounts (family)
- Cryptocurrency
- Stock trading

### Technical
- Microservices architecture
- Kubernetes
- Multi-region deployment
- Mobile native apps
- Offline mode
- Real-time collaboration

### Business
- Paid plans
- Affiliate partnerships
- Financial product marketplace
- Human advisor access

These may be added in future phases based on user feedback and business priorities.

---

## Success Criteria Summary

**MVP is successful if:**

1. **User Activation:** 70% of signups complete onboarding
2. **User Engagement:** 60% weekly active users
3. **User Value:** 50% achieve a goal milestone in 3 months
4. **User Satisfaction:** NPS > 40
5. **Technical Performance:** < 3s AI responses, 99.5% uptime
6. **User Retention:** 50% 30-day retention

**MVP fails if:**

1. < 40% onboarding completion
2. < 30% weekly active users
3. NPS < 20
4. > 5s AI responses
5. < 95% uptime
6. < 20% 30-day retention

---

## Appendix: User Flows

### Flow 1: New User Onboarding

```
1. User signs up (email/social)
2. Welcome screen: "Let's understand your finances"
3. Question 1: "What's your monthly income?"
4. Question 2: "How much do you have in savings?"
5. Question 3: "What's your biggest financial goal?"
6. Question 4: "Do you have any loans?"
7. Processing: "Creating your financial plan..."
8. Results: 
   - Your monthly allocation
   - Your goal feasibility
   - Your CFO understanding: 40%
9. CTA: "Ask me anything about your finances"
```

### Flow 2: Asking a Question

```
1. User opens chat
2. User types: "Can I afford a ₹50,000 vacation?"
3. AI analyzes financial profile
4. AI runs simulation
5. AI presents:
   - Direct answer (Yes/No/Maybe)
   - Reasoning
   - Impact on goals
   - Recommendations
6. User can:
   - Ask follow-up
   - Run different scenario
   - Update profile
```

### Flow 3: Setting a Goal

```
1. User clicks "Add Goal"
2. Select goal type or create custom
3. Enter goal details:
   - Name
   - Amount
   - Target date
   - Priority
4. System calculates:
   - Monthly required
   - Feasibility
   - Impact on other goals
5. Show results:
   - "You need to save ₹X/month"
   - "This is feasible/not feasible"
   - "Impact: Y"
6. User confirms or adjusts
7. Goal added to dashboard
```

---

## Revision History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | June 2026 | Initial PRD | Product Team |
