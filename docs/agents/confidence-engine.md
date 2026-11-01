# Sage: Confidence Engine

**Prediction Reliability Scoring System**

---

## Overview

The Confidence Engine calculates reliability scores (0-100) for all financial predictions and recommendations. This helps users understand the certainty of guidance and identifies what data would improve accuracy.

**Purpose:** Acknowledge uncertainty transparently and build user trust through honesty.

---

## Core Principle

**Always communicate confidence. Never pretend certainty when uncertainty exists.**

```
Every prediction must include:
1. Confidence score (0-100)
2. Factors affecting confidence
3. What would increase confidence
```

---

## Confidence Calculation

### Base Formula

```typescript
function calculateConfidence(factors: ConfidenceFactor[]): ConfidenceScore {
  const baseConfidence = 50; // Neutral starting point
  
  const totalImpact = factors.reduce((sum, factor) => sum + factor.impact, 0);
  
  const confidence = Math.max(0, Math.min(100, baseConfidence + totalImpact));
  
  return {
    score: confidence,
    level: getConfidenceLevel(confidence),
    factors,
    summary: generateSummary(confidence, factors)
  };
}
```

### Confidence Levels

```typescript
function getConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= 90) return "very_high";
  if (score >= 70) return "high";
  if (score >= 50) return "medium";
  if (score >= 30) return "low";
  return "very_low";
}
```

**Level Descriptions:**
- **Very High (90-100):** Strong data, stable situation, high reliability
- **High (70-89):** Good data, minor uncertainties, reliable
- **Medium (50-69):** Adequate data, some uncertainties, reasonable estimate
- **Low (30-49):** Limited data, significant uncertainties, rough estimate
- **Very Low (0-29):** Insufficient data, high uncertainty, unreliable

---

## Confidence Factors

### 1. Profile Completeness

**Impact:** -20 to +20

```typescript
function calculateProfileCompleteness(profile: FinancialProfile): ConfidenceFactor {
  const score = profile.cfoUnderstandingScore; // 0-100
  
  let impact: number;
  if (score >= 90) impact = +20;
  else if (score >= 70) impact = +10;
  else if (score >= 50) impact = 0;
  else if (score >= 30) impact = -10;
  else impact = -20;
  
  return {
    name: "Profile Completeness",
    impact,
    reason: `Profile ${score}% complete`,
    category: "data_quality"
  };
}
```

**What Increases:**
- All required fields filled (+10)
- All important fields filled (+5)
- Optional fields filled (+5)

**What Decreases:**
- Missing required fields (-20)
- Missing important fields (-10)

### 2. Income Stability

**Impact:** -15 to +15

```typescript
function calculateIncomeStability(history: IncomeRecord[]): ConfidenceFactor {
  if (history.length < 3) {
    return {
      name: "Income Stability",
      impact: -15,
      reason: "Limited income history (< 3 months)",
      category: "data_quality"
    };
  }
  
  const amounts = history.map(h => h.amount);
  const average = mean(amounts);
  const variance = standardDeviation(amounts) / average;
  
  let impact: number;
  if (variance < 0.05) impact = +15;      // Very stable
  else if (variance < 0.15) impact = +10; // Stable
  else if (variance < 0.30) impact = 0;   // Variable
  else impact = -15;                      // Highly variable
  
  return {
    name: "Income Stability",
    impact,
    reason: `Income ${variance < 0.15 ? 'stable' : 'variable'} over ${history.length} months`,
    category: "income"
  };
}
```

**What Increases:**
- 6+ months of stable income (+15)
- Consistent income source (+10)
- Documented income (+5)

**What Decreases:**
- Variable income (-15)
- < 3 months history (-15)
- Undocumented income (-10)

### 3. Emergency Fund Status

**Impact:** -15 to +15

```typescript
function calculateEmergencyFundStatus(
  current: number,
  target: number,
  monthlyExpenses: number
): ConfidenceFactor {
  const months = current / monthlyExpenses;
  
  let impact: number;
  if (months >= 6) impact = +15;          // 6+ months
  else if (months >= 3) impact = +10;     // 3-6 months
  else if (months >= 1) impact = 0;       // 1-3 months
  else impact = -15;                      // < 1 month
  
  return {
    name: "Emergency Fund",
    impact,
    reason: `Emergency fund covers ${months.toFixed(1)} months`,
    category: "financial_health"
  };
}
```

**What Increases:**
- Emergency fund >= 6 months (+15)
- Emergency fund >= target (+10)
- Growing emergency fund (+5)

**What Decreases:**
- Emergency fund < 3 months (-15)
- No emergency fund (-20)
- Declining emergency fund (-10)

### 4. Debt Load

**Impact:** -15 to +10

```typescript
function calculateDebtLoad(
  debts: Debt[],
  monthlyIncome: number
): ConfidenceFactor {
  const totalDebtPayments = debts.reduce((sum, d) => sum + d.monthlyPayment, 0);
  const debtToIncomeRatio = totalDebtPayments / monthlyIncome;
  
  let impact: number;
  if (debtToIncomeRatio === 0) impact = +10;      // No debt
  else if (debtToIncomeRatio <= 0.20) impact = +5; // Low debt
  else if (debtToIncomeRatio <= 0.30) impact = 0;  // Moderate debt
  else if (debtToIncomeRatio <= 0.40) impact = -10; // High debt
  else impact = -15;                               // Very high debt
  
  return {
    name: "Debt Load",
    impact,
    reason: `Debt-to-income ratio: ${(debtToIncomeRatio * 100).toFixed(1)}%`,
    category: "financial_health"
  };
}
```

**What Increases:**
- No debt (+10)
- Low debt-to-income (<20%) (+5)
- Decreasing debt (+5)

**What Decreases:**
- High debt-to-income (>40%) (-15)
- Increasing debt (-10)
- Multiple high-interest debts (-10)

### 5. Goal Timeline

**Impact:** -10 to +10

```typescript
function calculateGoalTimeline(goal: Goal): ConfidenceFactor {
  const monthsRemaining = monthsBetween(new Date(), new Date(goal.targetDate));
  
  let impact: number;
  if (monthsRemaining > 24) impact = -10;     // Very long term
  else if (monthsRemaining > 12) impact = 0;  // Long term
  else if (monthsRemaining > 6) impact = +5;  // Medium term
  else if (monthsRemaining > 3) impact = +10; // Short term
  else impact = -5;                           // Very short term
  
  return {
    name: "Goal Timeline",
    impact,
    reason: `${monthsRemaining} months until target date`,
    category: "goal"
  };
}
```

**What Increases:**
- Medium-term goals (6-12 months) (+10)
- Realistic timeline (+5)
- Clear milestones (+5)

**What Decreases:**
- Very long-term goals (>24 months) (-10)
- Very short-term goals (<3 months) (-5)
- Unrealistic timeline (-15)

### 6. Spending History

**Impact:** -10 to +10

```typescript
function calculateSpendingHistory(expenses: ExpenseRecord[]): ConfidenceFactor {
  const monthsOfData = getMonthsOfData(expenses);
  
  let impact: number;
  if (monthsOfData >= 6) impact = +10;      // 6+ months
  else if (monthsOfData >= 3) impact = +5;  // 3-6 months
  else if (monthsOfData >= 1) impact = 0;   // 1-3 months
  else impact = -10;                        // < 1 month
  
  return {
    name: "Spending History",
    impact,
    reason: `${monthsOfData} months of expense data`,
    category: "data_quality"
  };
}
```

**What Increases:**
- 6+ months of expense data (+10)
- Linked bank account (+10)
- Categorized expenses (+5)

**What Decreases:**
- < 3 months of data (-10)
- No expense tracking (-15)
- Manual entry only (-5)

### 7. Data Recency

**Impact:** -10 to +5

```typescript
function calculateDataRecency(lastUpdated: Date): ConfidenceFactor {
  const daysOld = daysBetween(lastUpdated, new Date());
  
  let impact: number;
  if (daysOld <= 7) impact = +5;          // Updated this week
  else if (daysOld <= 30) impact = 0;     // Updated this month
  else if (daysOld <= 90) impact = -5;    // Updated this quarter
  else impact = -10;                      // Stale data
  
  return {
    name: "Data Recency",
    impact,
    reason: `Last updated ${daysOld} days ago`,
    category: "data_quality"
  };
}
```

**What Increases:**
- Updated within 7 days (+5)
- Real-time bank sync (+10)
- Automatic updates (+5)

**What Decreases:**
- Updated > 90 days ago (-10)
- Manual updates only (-5)
- Inconsistent updates (-5)

---

## Scenario-Specific Confidence

### Purchase Affordability Confidence

```typescript
function calculatePurchaseConfidence(
  profile: FinancialProfile,
  amount: number,
  history: FinancialHistory
): ConfidenceScore {
  const factors = [
    calculateProfileCompleteness(profile),
    calculateIncomeStability(history.income),
    calculateEmergencyFundStatus(
      profile.currentEmergencyFund,
      profile.emergencyFundTarget,
      calculateMonthlyExpenses(history.expenses)
    ),
    calculateSpendingHistory(history.expenses),
    calculateDataRecency(profile.updatedAt)
  ];
  
  // Additional factor: Purchase size relative to income
  const purchaseImpact = amount / profile.monthlyIncome;
  if (purchaseImpact < 0.5) {
    factors.push({
      name: "Purchase Size",
      impact: +5,
      reason: "Small purchase relative to income",
      category: "purchase"
    });
  } else if (purchaseImpact > 2) {
    factors.push({
      name: "Purchase Size",
      impact: -10,
      reason: "Large purchase relative to income",
      category: "purchase"
    });
  }
  
  return calculateConfidence(factors);
}
```

### Goal Projection Confidence

```typescript
function calculateGoalConfidence(
  goal: Goal,
  profile: FinancialProfile,
  history: FinancialHistory
): ConfidenceScore {
  const factors = [
    calculateProfileCompleteness(profile),
    calculateIncomeStability(history.income),
    calculateEmergencyFundStatus(
      profile.currentEmergencyFund,
      profile.emergencyFundTarget,
      calculateMonthlyExpenses(history.expenses)
    ),
    calculateGoalTimeline(goal),
    calculateSpendingHistory(history.expenses)
  ];
  
  // Additional factor: Goal feasibility
  const feasibility = calculateGoalFeasibility(goal, profile);
  if (feasibility.feasibilityScore >= 80) {
    factors.push({
      name: "Goal Feasibility",
      impact: +10,
      reason: "Goal is highly feasible",
      category: "goal"
    });
  } else if (feasibility.feasibilityScore < 50) {
    factors.push({
      name: "Goal Feasibility",
      impact: -10,
      reason: "Goal feasibility is uncertain",
      category: "goal"
    });
  }
  
  return calculateConfidence(factors);
}
```

### Loan Affordability Confidence

```typescript
function calculateLoanConfidence(
  loanAmount: number,
  profile: FinancialProfile,
  debts: Debt[],
  history: FinancialHistory
): ConfidenceScore {
  const factors = [
    calculateProfileCompleteness(profile),
    calculateIncomeStability(history.income),
    calculateEmergencyFundStatus(
      profile.currentEmergencyFund,
      profile.emergencyFundTarget,
      calculateMonthlyExpenses(history.expenses)
    ),
    calculateDebtLoad(debts, profile.monthlyIncome)
  ];
  
  // Additional factor: New debt impact
  const newEMI = calculateEMI(loanAmount, 12, 60).emi;
  const newDebtToIncome = (sumDebtPayments(debts) + newEMI) / profile.monthlyIncome;
  
  if (newDebtToIncome <= 0.30) {
    factors.push({
      name: "New Debt Impact",
      impact: +5,
      reason: "New debt-to-income ratio comfortable",
      category: "debt"
    });
  } else if (newDebtToIncome > 0.40) {
    factors.push({
      name: "New Debt Impact",
      impact: -15,
      reason: "New debt-to-income ratio too high",
      category: "debt"
    });
  }
  
  return calculateConfidence(factors);
}
```

---

## Confidence Communication

### User-Facing Format

```typescript
interface ConfidenceDisplay {
  score: number;
  level: string;
  emoji: string;
  message: string;
  factors: {
    positive: string[];
    negative: string[];
  };
  improvements: string[];
}

function formatConfidenceForUser(confidence: ConfidenceScore): ConfidenceDisplay {
  const positive = confidence.factors
    .filter(f => f.impact > 0)
    .map(f => `✅ ${f.reason}`);
  
  const negative = confidence.factors
    .filter(f => f.impact < 0)
    .map(f => `⚠️ ${f.reason}`);
  
  const improvements = generateImprovements(confidence.factors);
  
  return {
    score: confidence.score,
    level: confidence.level,
    emoji: getConfidenceEmoji(confidence.level),
    message: getConfidenceMessage(confidence.level),
    factors: { positive, negative },
    improvements
  };
}

function getConfidenceEmoji(level: ConfidenceLevel): string {
  const emojis = {
    very_high: "💪",
    high: "👍",
    medium: "🤔",
    low: "⚠️",
    very_low: "❌"
  };
  return emojis[level];
}

function getConfidenceMessage(level: ConfidenceLevel): string {
  const messages = {
    very_high: "I'm very confident in this recommendation",
    high: "I'm confident in this recommendation",
    medium: "This is a reasonable estimate",
    low: "This is a rough estimate with limited data",
    very_low: "I don't have enough information for reliable guidance"
  };
  return messages[level];
}
```

### Example Output

```
Confidence: 75% 👍

I'm confident in this recommendation.

Based on:
✅ Profile 85% complete
✅ Stable income for 6 months
✅ Emergency fund covers 5 months
⚠️ Limited expense history (2 months)

Confidence would increase to 90%+ with:
- 6+ months of expense history
- Linked bank account for accurate spending data
```

---

## Improvement Suggestions

### Generate Improvements

```typescript
function generateImprovements(factors: ConfidenceFactor[]): string[] {
  const improvements: string[] = [];
  
  // Profile completeness
  const profileFactor = factors.find(f => f.name === "Profile Completeness");
  if (profileFactor && profileFactor.impact < 10) {
    improvements.push("Complete your financial profile (add missing income, savings, or goal information)");
  }
  
  // Income stability
  const incomeFactor = factors.find(f => f.name === "Income Stability");
  if (incomeFactor && incomeFactor.impact < 0) {
    improvements.push("Track income for 6+ months to establish stability pattern");
  }
  
  // Emergency fund
  const emergencyFactor = factors.find(f => f.name === "Emergency Fund");
  if (emergencyFactor && emergencyFactor.impact < 0) {
    improvements.push("Build emergency fund to 6 months of expenses");
  }
  
  // Spending history
  const spendingFactor = factors.find(f => f.name === "Spending History");
  if (spendingFactor && spendingFactor.impact < 5) {
    improvements.push("Track expenses for 6+ months or link bank account");
  }
  
  // Debt load
  const debtFactor = factors.find(f => f.name === "Debt Load");
  if (debtFactor && debtFactor.impact < 0) {
    improvements.push("Reduce debt-to-income ratio below 30%");
  }
  
  return improvements;
}
```

---

## Confidence Thresholds

### Action Recommendations

```typescript
function shouldRecommendAction(confidence: number): boolean {
  return confidence >= 60; // Only recommend if medium+ confidence
}

function shouldShowWarning(confidence: number): boolean {
  return confidence < 50; // Warn if low confidence
}

function shouldBlockAction(confidence: number): boolean {
  return confidence < 30; // Block if very low confidence
}
```

### Example Usage

```typescript
const confidence = calculatePurchaseConfidence(profile, amount, history);

if (shouldBlockAction(confidence.score)) {
  return `I don't have enough information to provide reliable guidance on this purchase.

${formatConfidenceForUser(confidence)}

Please provide:
${confidence.improvements.join("\n")}

Once I have this information, I can give you accurate guidance.`;
}

if (shouldShowWarning(confidence.score)) {
  return `⚠️ Note: This is a rough estimate with limited data.

${formatConfidenceForUser(confidence)}

For more accurate guidance, consider:
${confidence.improvements.join("\n")}

With that said, here's my current assessment...`;
}

// Proceed with recommendation
return `${recommendation}

${formatConfidenceForUser(confidence)}`;
```

---

## Confidence Tracking

### Store Confidence History

```typescript
interface ConfidenceRecord {
  userId: string;
  predictionType: string;
  confidence: number;
  factors: ConfidenceFactor[];
  actualOutcome?: boolean;
  timestamp: Date;
}

async function trackConfidence(
  userId: string,
  predictionType: string,
  confidence: ConfidenceScore
): Promise<void> {
  await db.confidenceRecord.create({
    data: {
      userId,
      predictionType,
      confidence: confidence.score,
      factors: confidence.factors,
      timestamp: new Date()
    }
  });
}
```

### Calibration Analysis

```typescript
async function analyzeConfidenceCalibration(
  userId: string
): Promise<CalibrationReport> {
  const records = await db.confidenceRecord.findMany({
    where: { userId, actualOutcome: { not: null } }
  });
  
  // Group by confidence buckets
  const buckets = {
    "90-100": { predicted: 0, correct: 0 },
    "70-89": { predicted: 0, correct: 0 },
    "50-69": { predicted: 0, correct: 0 },
    "30-49": { predicted: 0, correct: 0 },
    "0-29": { predicted: 0, correct: 0 }
  };
  
  for (const record of records) {
    const bucket = getConfidenceBucket(record.confidence);
    buckets[bucket].predicted++;
    if (record.actualOutcome) {
      buckets[bucket].correct++;
    }
  }
  
  return {
    buckets,
    overallAccuracy: records.filter(r => r.actualOutcome).length / records.length,
    calibrationScore: calculateCalibrationScore(buckets)
  };
}
```

---

## Quick Reference

**Confidence Levels:**
- Very High: 90-100 (💪)
- High: 70-89 (👍)
- Medium: 50-69 (🤔)
- Low: 30-49 (⚠️)
- Very Low: 0-29 (❌)

**Key Factors:**
1. Profile Completeness (-20 to +20)
2. Income Stability (-15 to +15)
3. Emergency Fund (-15 to +15)
4. Debt Load (-15 to +10)
5. Goal Timeline (-10 to +10)
6. Spending History (-10 to +10)
7. Data Recency (-10 to +5)

**Always Include:**
- Confidence score
- Positive factors
- Negative factors
- Improvement suggestions

**Thresholds:**
- Recommend: >= 60
- Warn: < 50
- Block: < 30

---

**Document Version:** 1.0  
**Last Updated:** 2024-12-19  
**Purpose:** Confidence calculation specification  
**Audience:** AI developers, data scientists  
**Related:** cfo-agent.md, tool-specifications.md
