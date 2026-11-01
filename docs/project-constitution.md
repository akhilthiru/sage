# Sage: Project Constitution

## Purpose of This Document

This constitution serves as the foundational rulebook for Sage. All decisions, features, and implementations must align with these principles. When in doubt, refer to this document.

## Core Principles

### 1. User Value First

**Rule:** Every feature must provide measurable user value within 2 minutes.

**Application:**
- No feature ships without a clear answer to: "How does this help users make better financial decisions?"
- Long onboarding flows are forbidden
- Data collection must be progressive, not upfront
- Users should never feel like they're doing work for the app

**Examples:**
- ✅ Quick goal setup that immediately shows feasibility
- ❌ 20-field form before showing any value
- ✅ "Based on your income, here's what I recommend"
- ❌ "Please import 6 months of transactions first"

### 2. AI as Advisor, Not Oracle

**Rule:** The AI explains and guides. The engine calculates and decides.

**Application:**
- Financial calculations must be deterministic
- LLMs explain results, they don't generate financial data
- All recommendations must be traceable to logic
- Never hallucinate financial information

**Architecture:**
```
User Question
    ↓
Financial Engine (deterministic calculations)
    ↓
Simulation Engine (scenario modeling)
    ↓
LLM Layer (natural language explanation)
    ↓
User Answer
```

**Examples:**
- ✅ Engine calculates affordability, LLM explains why
- ❌ LLM generates budget recommendations from thin air
- ✅ "Based on your ₹80k income and ₹20k expenses, you can save ₹60k"
- ❌ "You should probably save around ₹50k" (no basis)

### 3. Simplicity Over Features

**Rule:** Solve one problem exceptionally well before adding new features.

**Application:**
- MVP focuses on core decision-making
- No feature creep
- Each feature must pass the "Is this essential?" test
- Remove features that don't drive core value

**Decision Framework:**
```
New Feature Proposal
    ↓
Does it help users make better financial decisions? → No → Reject
    ↓ Yes
Can existing features solve this? → Yes → Reject
    ↓ No
Does it add complexity? → Yes → Defer
    ↓ No
Ship it
```

### 4. Progressive Enhancement

**Rule:** The app should work with minimal data and improve as data increases.

**Application:**
- Minimum viable input: Income, savings, one goal
- Each additional data point improves recommendations
- Show users what's missing and why it matters
- Never block core functionality on complete data

**Data Collection Strategy:**
```
Day 1: Income, savings, primary goal → Basic recommendations
Week 1: Rent, major expenses → Better allocation
Week 2: Investments → Portfolio optimization
Week 3: All expenses → Detailed planning
Month 1: Complete profile → Full CFO capabilities
```

### 5. Transparency and Trust

**Rule:** Users must understand why the AI recommends what it recommends.

**Application:**
- All recommendations include explanations
- Show the math behind decisions
- Display confidence levels
- Admit when data is insufficient
- Never hide complexity behind "AI magic"

**Examples:**
- ✅ "You can afford this because: Income ₹80k - Expenses ₹45k - Savings goal ₹20k = ₹15k available"
- ❌ "Yes, you can afford this" (no explanation)
- ✅ "Confidence: 70% (missing investment data)"
- ❌ Showing 100% confidence when data is incomplete

### 6. Privacy and Security

**Rule:** User financial data is sacred and must be protected absolutely.

**Application:**
- End-to-end encryption for sensitive data
- No selling of user data, ever
- Minimal data collection
- Clear privacy policy
- User owns their data
- Easy data export and deletion

**Non-Negotiables:**
- Never share individual user data with third parties
- Never use user data to train models without explicit consent
- Never sell user data for advertising
- Always allow users to delete their data completely

### 7. Speed and Performance

**Rule:** The app must feel instant.

**Application:**
- Page loads: < 1 second
- AI responses: < 3 seconds
- Simulations: < 2 seconds
- No loading spinners for basic operations

**Technical Requirements:**
- Optimize database queries
- Cache frequently accessed data
- Use streaming for AI responses
- Implement optimistic UI updates

### 8. Accessibility

**Rule:** Financial guidance should be available to everyone.

**Application:**
- Mobile-first design
- Works on low-end devices
- Works on slow networks
- Simple language (no financial jargon)
- Multi-language support (future)

### 9. Maintainability

**Rule:** Code should be easy to understand and modify.

**Application:**
- Clear folder structure
- Strong typing (TypeScript)
- Comprehensive documentation
- Testable architecture
- Modular design

**Developer Experience:**
- New developer should understand codebase in 1 day
- New feature should take hours, not days
- Bug fixes should be straightforward
- No "magic" code that only one person understands

### 10. Continuous Learning

**Rule:** The product should improve based on user behavior and feedback.

**Application:**
- Track user interactions
- Measure feature usage
- Collect feedback regularly
- Iterate based on data
- A/B test major changes

## Decision-Making Framework

### When Adding Features

Ask these questions in order:

1. **Does this help users make better financial decisions?**
   - No → Reject immediately
   - Yes → Continue

2. **Can we solve this with existing features?**
   - Yes → Reject, improve existing
   - No → Continue

3. **Does this align with our core principles?**
   - No → Reject
   - Yes → Continue

4. **What's the complexity cost?**
   - High → Defer or simplify
   - Low → Continue

5. **What's the user value?**
   - Low → Defer
   - High → Build

### When Making Technical Decisions

Ask these questions:

1. **Does this improve user experience?**
2. **Does this improve developer experience?**
3. **Does this improve system reliability?**
4. **What's the maintenance cost?**
5. **What's the migration path if we need to change later?**

Choose the option that maximizes user value while minimizing complexity.

## Non-Negotiable Rules

### What We Will Never Do

1. **Sell user data** - User privacy is absolute
2. **Invent financial information** - AI must never hallucinate data
3. **Require long onboarding** - Value within 2 minutes, always
4. **Hide behind complexity** - Always explain recommendations
5. **Sacrifice security** - Financial data must be protected
6. **Build features users don't need** - User value over feature count
7. **Compromise on performance** - App must feel instant
8. **Use dark patterns** - Honest, transparent UX only

### What We Will Always Do

1. **Put users first** - Every decision prioritizes user value
2. **Be transparent** - Explain how and why
3. **Protect privacy** - User data is sacred
4. **Stay simple** - Solve core problems exceptionally well
5. **Move fast** - Ship, learn, iterate
6. **Maintain quality** - No technical debt shortcuts
7. **Document everything** - Code, decisions, architecture
8. **Listen to users** - Build what they need, not what we think is cool

## Conflict Resolution

When principles conflict, use this priority order:

1. **User Value** - Does this help users?
2. **User Trust** - Does this maintain trust?
3. **Simplicity** - Does this keep things simple?
4. **Performance** - Does this keep things fast?
5. **Maintainability** - Can we sustain this?

Example: If a feature would provide value but compromise privacy → Reject (Trust > Value in this case)

## Amendment Process

This constitution can be amended, but only through:

1. Clear documentation of why the change is needed
2. Team consensus
3. Validation that the change aligns with product vision
4. Update of all affected documentation

## Conclusion

This constitution exists to keep Sage focused on its mission: helping people make better financial decisions through AI-powered guidance.

When in doubt, ask: "Does this help our users make better financial decisions?"

If yes, and it aligns with these principles, build it.

If no, don't.

It's that simple.
