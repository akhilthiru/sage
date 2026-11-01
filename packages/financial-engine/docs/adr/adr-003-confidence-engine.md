# ADR-003: Confidence Engine Design

**Status:** Accepted  
**Date:** 2024-12-19  
**Deciders:** Sage Development Team  
**Priority:** HIGH

---

## Context

Financial predictions inherently involve uncertainty. Users need to understand:
- How reliable is this prediction?
- What data would make it more accurate?
- Should I trust this recommendation?

We need a systematic way to calculate and communicate prediction confidence.

---

## Decision

**We will implement a deterministic confidence scoring engine that calculates reliability based on data quality factors.**

The confidence engine will:
1. **Calculate confidence scores (0-100)** for all predictions
2. **Identify factors** affecting confidence (positive and negative)
3. **Suggest improvements** to increase confidence
4. **Use deterministic rules** (no ML, no randomness)
5. **Be transparent** about calculation methodology

---

## Rationale

### Why Confidence Scores Matter

**1. Transparency**
```typescript
// Without confidence
"You can save ₹15,000/month for your house goal"
User: "Can I really? How sure are you?"

// With confidence
"You can save ₹15,000/month for your house goal"
Confidence: 75% (High)
Based on:
  ✅ Profile 85% complete
  ✅ Stable income for 6 months
  ⚠️ Limited expense history (2 months)

User: "I understand. I should track expenses longer."
```

**2. Trust Building**
```typescript
// Low confidence = honest uncertainty
Confidence: 35% (Low)
"I don't have enough information for reliable guidance.
Please provide:
  - 6+ months of expense history
  - Emergency fund target
  - Income stability information"

// Better than false confidence
Confidence: 95% (Very High) // Based on 2 weeks of data
"You can definitely achieve this goal!" // User loses money
```

**3. Data Quality Feedback**
```typescript
// Guides users to improve data
Confidence: 60% (Medium)

Confidence would increase to 85%+ with:
  - Link bank account for accurate spending data
  - Complete emergency fund information
  - Track income for 3+ months
```

---

## Design Principles

### Principle 1: Deterministic Calculation

```typescript
// ✅ DETERMINISTIC: Same factors = same score
function calculateConfidence(factors: ConfidenceFactor[]): number {
  const baseScore = 50;
  const totalImpact = factors.reduce((sum, f) => sum + f.impact, 0);
  return clamp(baseScore + totalImpact, 0, 100);
}

// ❌ NON-DETERMINISTIC: ML model
async function calculateConfidence(data: Data): Promise<number> {
  const model = await loadModel();
  return model.predict(data); // Changes with model updates
}
```

---

### Principle 2: Explainable Factors

```typescript
// ✅ EXPLAINABLE: Clear factors
{
  score: 75,
  factors: [
    { name: 'Profile Completeness', impact: +20, reason: 'Profile 85% complete' },
    { name: 'Income Stability', impact: +10, reason: 'Stable income for 6 months' },
    { name: 'Expense History', impact: -10, reason: 'Only 2 months of data' }
  ]
}

// ❌ BLACK BOX: Cannot explain
{
  score: 75,
  factors: 'Neural network prediction'
}
```

---

### Principle 3: Actionable Improvements

```typescript
// ✅ ACTIONABLE: User knows what to do
improvements: [
  'Track expenses for 6+ months',
  'Link bank account for accurate data',
  'Complete emergency fund information'
]

// ❌ VAGUE: User doesn't know what to do
improvements: [
  'Improve data quality',
  'Provide more information'
]
```

---

## Confidence Factors

### Factor Categories

**1. Data Quality (40% weight)**
- Profile completeness
- Data recency
- Expense history length

**2. Income Stability (25% weight)**
- Income consistency
- Income history length
- Income source stability

**3. Financial Health (25% weight)**
- Emergency fund status
- Debt-to-income ratio
- Savings rate

**4. Prediction-Specific (10% weight)**
- Goal timeline (for goal predictions)
- Purchase size (for purchase predictions)
- Loan amount (for loan predictions)

---

### Factor Calculation

```typescript
// Profile Completeness (-20 to +20)
function calculateProfileCompleteness(score: number): ConfidenceFactor {
  let impact: number;
  if (score >= 90) impact = +20;
  else if (score >= 70) impact = +10;
  else if (score >= 50) impact = 0;
  else if (score >= 30) impact = -10;
  else impact = -20;
  
  return {
    name: 'Profile Completeness',
    impact,
    reason: `Profile ${score}% complete`,
    category: 'data_quality'
  };
}

// Income Stability (-15 to +15)
function calculateIncomeStability(
  stability: 'STABLE' | 'VARIABLE' | 'UNKNOWN'
): ConfidenceFactor {
  const impacts = {
    STABLE: +15,
    VARIABLE: -10,
    UNKNOWN: -15
  };
  
  return {
    name: 'Income Stability',
    impact: impacts[stability],
    reason: `Income is ${stability.toLowerCase()}`,
    category: 'income'
  };
}

// Emergency Fund (-15 to +15)
function calculateEmergencyFundStatus(
  status: 'MET' | 'NOT_MET' | 'UNKNOWN'
): ConfidenceFactor {
  const impacts = {
    MET: +15,
    NOT_MET: -10,
    UNKNOWN: -15
  };
  
  return {
    name: 'Emergency Fund',
    impact: impacts[status],
    reason: `Emergency fund ${status === 'MET' ? 'adequate' : 'insufficient'}`,
    category: 'financial_health'
  };
}
```

---

## Confidence Levels

```typescript
type ConfidenceLevel = 'very_low' | 'low' | 'medium' | 'high' | 'very_high';

function getConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= 90) return 'very_high';
  if (score >= 70) return 'high';
  if (score >= 50) return 'medium';
  if (score >= 30) return 'low';
  return 'very_low';
}

// Level descriptions
const LEVEL_DESCRIPTIONS = {
  very_high: 'Strong data, stable situation, high reliability',
  high: 'Good data, minor uncertainties, reliable',
  medium: 'Adequate data, some uncertainties, reasonable estimate',
  low: 'Limited data, significant uncertainties, rough estimate',
  very_low: 'Insufficient data, high uncertainty, unreliable'
};
```

---

## User Communication

### Display Format

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

// Example output
{
  score: 75,
  level: 'high',
  emoji: '👍',
  message: "I'm confident in this recommendation",
  factors: {
    positive: [
      '✅ Profile 85% complete',
      '✅ Stable income for 6 months',
      '✅ Emergency fund adequate'
    ],
    negative: [
      '⚠️ Limited expense history (2 months)'
    ]
  },
  improvements: [
    'Track expenses for 6+ months to increase confidence to 90%+',
    'Link bank account for accurate spending data'
  ]
}
```

---

## Alternatives Considered

### Alternative 1: Machine Learning Confidence

```typescript
// Train ML model on historical predictions
async function calculateConfidence(data: Data): Promise<number> {
  const model = await loadModel();
  const features = extractFeatures(data);
  return model.predict(features);
}
```

**Rejected because:**
- Non-deterministic (model updates change scores)
- Not explainable (black box)
- Requires training data (don't have yet)
- Adds complexity
- V1 doesn't need ML

**Deferred to:** V2 (for accuracy calibration)

---

### Alternative 2: Simple Binary Confidence

```typescript
// Just "confident" or "not confident"
function calculateConfidence(data: Data): 'confident' | 'not_confident' {
  return data.profileComplete && data.incomeStable 
    ? 'confident' 
    : 'not_confident';
}
```

**Rejected because:**
- Too coarse (loses nuance)
- No gradation (75% vs 80% matters)
- Less actionable (what improves it?)
- Doesn't guide users

---

### Alternative 3: No Confidence Scores

```typescript
// Just provide predictions without confidence
function projectGoalTimeline(goal: Goal): Timeline {
  return { monthsRemaining: 24 };
  // No indication of reliability
}
```

**Rejected because:**
- Misleading (implies certainty)
- Reduces trust (users can't assess reliability)
- No feedback loop (users don't know to improve data)
- Violates transparency principle

---

## Consequences

### Positive

✅ **Transparent**
- Users understand reliability
- Clear factors affecting confidence
- Actionable improvements

✅ **Deterministic**
- Same data = same confidence
- Reproducible
- Testable

✅ **Educational**
- Teaches users about data quality
- Guides data collection
- Improves over time

✅ **Honest**
- Acknowledges uncertainty
- Builds trust
- Reduces overconfidence

### Negative

⚠️ **May Reduce Engagement**
- Low confidence might discourage users
- "I don't know" is less satisfying than prediction

**Mitigation:** Frame as opportunity to improve, not failure

⚠️ **Complexity**
- More complex than simple predictions
- Requires explanation

**Mitigation:** Clear UI, progressive disclosure

⚠️ **Calibration Needed**
- Factor weights may need tuning
- Thresholds may need adjustment

**Mitigation:** Monitor and adjust based on feedback

---

## Implementation Guidelines

### DO

```typescript
// ✅ Calculate confidence for all predictions
export function projectGoalTimeline(input: Input): Result {
  const timeline = calculateTimeline(input);
  const confidence = calculateConfidence({
    predictionType: 'GOAL',
    profileCompleteness: input.profileCompleteness,
    incomeStability: input.incomeStability,
    // ... other factors
  });
  
  return {
    ...timeline,
    confidence
  };
}

// ✅ Provide actionable improvements
function generateImprovements(factors: ConfidenceFactor[]): string[] {
  const improvements: string[] = [];
  
  const profileFactor = factors.find(f => f.name === 'Profile Completeness');
  if (profileFactor && profileFactor.impact < 10) {
    improvements.push('Complete your financial profile');
  }
  
  return improvements;
}
```

### DON'T

```typescript
// ❌ Don't hide low confidence
if (confidence < 50) {
  return { ...result }; // Hiding confidence
}

// ❌ Don't fake confidence
const confidence = Math.max(70, calculatedConfidence); // Artificially inflating

// ❌ Don't use vague factors
factors: [
  { name: 'Data', impact: -10, reason: 'Bad data' } // Too vague
]
```

---

## Validation Strategy

### How to Validate Confidence Scores

**1. Consistency Check**
```typescript
test('confidence is consistent', () => {
  const input = { /* ... */ };
  
  const conf1 = calculateConfidence(input);
  const conf2 = calculateConfidence(input);
  
  expect(conf1.score).toBe(conf2.score);
});
```

**2. Range Check**
```typescript
test('confidence is in valid range', () => {
  const confidence = calculateConfidence(input);
  
  expect(confidence.score).toBeGreaterThanOrEqual(0);
  expect(confidence.score).toBeLessThanOrEqual(100);
});
```

**3. Factor Sum Check**
```typescript
test('factors sum correctly', () => {
  const confidence = calculateConfidence(input);
  
  const totalImpact = confidence.factors.reduce((sum, f) => sum + f.impact, 0);
  const expectedScore = clamp(50 + totalImpact, 0, 100);
  
  expect(confidence.score).toBe(expectedScore);
});
```

**4. Improvement Relevance**
```typescript
test('improvements are relevant to low factors', () => {
  const confidence = calculateConfidence({
    profileCompleteness: 30, // Low
    incomeStability: 'STABLE'
  });
  
  expect(confidence.improvements).toContain('Complete your financial profile');
});
```

---

## Monitoring

### Metrics to Track

**1. Confidence Distribution**
```typescript
// Track distribution of confidence scores
{
  very_high: 15%, // 90-100
  high: 25%,      // 70-89
  medium: 35%,    // 50-69
  low: 20%,       // 30-49
  very_low: 5%    // 0-29
}
```

**2. Factor Impact**
```typescript
// Which factors most affect confidence?
{
  'Profile Completeness': -12.5, // Average impact
  'Income Stability': +8.3,
  'Emergency Fund': -5.2
}
```

**3. Improvement Adoption**
```typescript
// Do users act on improvements?
{
  'Complete profile': 45%, // Adoption rate
  'Track expenses': 30%,
  'Link bank account': 60%
}
```

---

## Future Enhancements

### V2: Calibration

**Track actual outcomes vs predictions:**
```typescript
interface ConfidenceCalibration {
  predictedConfidence: number;
  actualAccuracy: number;
}

// If confidence = 80%, predictions should be accurate 80% of time
// Adjust factor weights to calibrate
```

### V2: Historical Accuracy

**Factor in past prediction accuracy:**
```typescript
function calculateConfidence(input: Input): ConfidenceScore {
  const baseConfidence = calculateBaseConfidence(input);
  
  // Adjust based on user's historical accuracy
  const historicalAccuracy = getUserHistoricalAccuracy(input.userId);
  const adjustment = (historicalAccuracy - 50) * 0.2; // -10 to +10
  
  return baseConfidence + adjustment;
}
```

---

## Related Decisions

- ADR-001: Pure Functions Only
- ADR-002: Deterministic Calculations

---

## References

- [Confidence Intervals](https://en.wikipedia.org/wiki/Confidence_interval)
- [Prediction Uncertainty](https://en.wikipedia.org/wiki/Uncertainty_quantification)
- [Calibration (Statistics)](https://en.wikipedia.org/wiki/Calibration_(statistics))

---

**Status:** Accepted  
**Review Date:** After 6 months of usage data  
**Last Updated:** 2024-12-19
