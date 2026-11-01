# Sage: UI Wireframes

## Overview

This document provides low-fidelity wireframes for all key screens in Sage. Each wireframe includes:
- ASCII diagram showing layout structure
- Component hierarchy and descriptions
- Information architecture
- User interactions
- State variations
- Responsive behavior notes

**Design Principles:**
- Mobile-first design
- Clean, minimal interface
- Clear visual hierarchy
- Accessible (WCAG 2.1 AA)
- Fast loading with skeleton states

---

## Screen 1: Landing Page

### Desktop Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  [Logo: Sage]                    [Features] [Pricing] [Sign In] │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│                    Your AI-Powered Personal CFO                   │
│                                                                   │
│           Get personalized financial guidance in minutes          │
│                                                                   │
│                    [Get Started - It's Free]                      │
│                                                                   │
│                    ┌─────────────────────┐                        │
│                    │  Hero Illustration  │                        │
│                    │   (Dashboard preview)│                        │
│                    └─────────────────────┘                        │
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐   │
│  │  [Icon]   │  │  [Icon]   │  │  [Icon]   │  │  [Icon]   │   │
│  │ 2-Minute  │  │   Smart   │  │    AI     │  │  Privacy  │   │
│  │ Onboarding│  │ Allocation│  │   Chat    │  │   First   │   │
│  │           │  │           │  │           │  │           │   │
│  │ Get value │  │ Automatic │  │ Ask any   │  │ Your data │   │
│  │ instantly │  │ budgeting │  │ question  │  │ is secure │   │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘   │
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│                   How Sage Works                                  │
│                                                                   │
│  1. Quick Setup → 2. Get Allocation → 3. Track Progress          │
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│                    [Start Your Journey]                           │
│                                                                   │
│  Footer: [About] [Privacy] [Terms] [Contact]                     │
└─────────────────────────────────────────────────────────────────┘
```

### Mobile Layout

```
┌──────────────────────┐
│ [☰]  Sage    [Sign In]│
├──────────────────────┤
│                      │
│  Your AI-Powered     │
│  Personal CFO        │
│                      │
│  Get personalized    │
│  financial guidance  │
│                      │
│ [Get Started Free]   │
│                      │
│  ┌────────────────┐  │
│  │ Hero Image     │  │
│  └────────────────┘  │
│                      │
│  ┌────────────────┐  │
│  │ [Icon]         │  │
│  │ 2-Min Setup    │  │
│  └────────────────┘  │
│                      │
│  ┌────────────────┐  │
│  │ [Icon]         │  │
│  │ Smart Budget   │  │
│  └────────────────┘  │
│                      │
│  [Learn More]        │
└──────────────────────┘
```

### Component Hierarchy

```
LandingPage
├── Header
│   ├── Logo
│   ├── Navigation
│   │   ├── FeaturesLink
│   │   ├── PricingLink
│   │   └── SignInButton
│   └── MobileMenu (mobile only)
├── HeroSection
│   ├── Headline (h1)
│   ├── Subheadline (p)
│   ├── CTAButton
│   └── HeroImage
├── FeaturesSection
│   └── FeatureCard[] (4 cards)
│       ├── Icon
│       ├── Title
│       └── Description
├── HowItWorksSection
│   ├── SectionTitle
│   └── Step[] (3 steps)
├── CTASection
│   └── CTAButton
└── Footer
    └── FooterLink[]
```

### User Interactions

1. **Click "Get Started"** → Navigate to sign-up
2. **Click "Sign In"** → Navigate to login
3. **Click feature cards** → Scroll to details (optional)
4. **Mobile menu** → Slide-in navigation

### State Variations

- **Loading:** Skeleton for hero image
- **Hover:** Button color changes, card elevation
- **Mobile:** Hamburger menu, stacked layout

### Data Requirements

- Static content (no API calls)
- Marketing copy
- Feature descriptions

---

## Screen 2: Sign Up / Sign In

### Layout

```
┌─────────────────────────────────────┐
│          [← Back to Home]           │
│                                     │
│         ┌─────────────────┐         │
│         │   [Sage Logo]   │         │
│         └─────────────────┘         │
│                                     │
│      Welcome to Your Financial      │
│             Journey                 │
│                                     │
│  ┌───────────────────────────────┐  │
│  │                               │  │
│  │  [Continue with Google]       │  │
│  │                               │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │                               │  │
│  │  [Continue with Apple]        │  │
│  │                               │  │
│  └───────────────────────────────┘  │
│                                     │
│         ─── or ───                  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ Email                         │  │
│  │ [email@example.com        ]   │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │                               │  │
│  │  [Continue with Email]        │  │
│  │                               │  │
│  └───────────────────────────────┘  │
│                                     │
│  Already have an account? [Sign In]│
│                                     │
│  By continuing, you agree to our   │
│  [Terms] and [Privacy Policy]      │
└─────────────────────────────────────┘
```

### Component Hierarchy

```
AuthPage
├── BackButton
├── Logo
├── Headline
├── SocialAuthButtons
│   ├── GoogleButton
│   └── AppleButton
├── Divider ("or")
├── EmailForm
│   ├── EmailInput
│   └── ContinueButton
├── ToggleAuthLink (Sign In/Sign Up)
└── LegalText
    ├── TermsLink
    └── PrivacyLink
```

### User Interactions

1. **Click Google/Apple** → OAuth flow
2. **Enter email + Continue** → Email verification flow
3. **Click "Sign In"** → Toggle to sign-in mode
4. **Click "Back"** → Return to landing page

### State Variations

- **Loading:** Button shows spinner
- **Error:** Inline error message below input
- **Success:** Redirect to onboarding

### Responsive Behavior

- Mobile: Full-screen modal
- Desktop: Centered card (max-width: 400px)

---

## Screen 3: Onboarding Flow

### Step 1: Welcome

```
┌─────────────────────────────────────┐
│  [Progress: ●○○○]          [Skip]   │
├─────────────────────────────────────┤
│                                     │
│         Welcome to Sage! 👋         │
│                                     │
│  Let's set up your financial        │
│  profile in under 2 minutes.        │
│                                     │
│  We'll ask you 4 quick questions:   │
│                                     │
│  ✓ Your monthly income              │
│  ✓ Current savings                  │
│  ✓ Primary financial goal           │
│  ✓ Existing loans (optional)        │
│                                     │
│  Your data is private and secure.   │
│  We never share your information.   │
│                                     │
│  ┌───────────────────────────────┐  │
│  │                               │  │
│  │      [Let's Get Started]      │  │
│  │                               │  │
│  └───────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

### Step 2: Monthly Income

```
┌─────────────────────────────────────┐
│  [Progress: ●●○○]          [Skip]   │
├─────────────────────────────────────┤
│                                     │
│    What's your monthly income?      │
│                                     │
│  This helps us create your          │
│  personalized budget.               │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ Monthly Income                │  │
│  │ ₹ [80,000              ]      │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ Frequency                     │  │
│  │ [Monthly ▼]                   │  │
│  └───────────────────────────────┘  │
│                                     │
│  💡 Include all sources of income   │
│                                     │
│  ┌───────────────────────────────┐  │
│  │                               │  │
│  │         [Continue]            │  │
│  │                               │  │
│  └───────────────────────────────┘  │
│                                     │
│            [← Back]                 │
└─────────────────────────────────────┘
```

### Step 3: Current Savings

```
┌─────────────────────────────────────┐
│  [Progress: ●●●○]          [Skip]   │
├─────────────────────────────────────┤
│                                     │
│   How much do you have saved?       │
│                                     │
│  Include all savings accounts,      │
│  FDs, and liquid investments.       │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ Current Savings               │  │
│  │ ₹ [2,00,000            ]      │  │
│  └───────────────────────────────┘  │
│                                     │
│  💡 This helps us assess your       │
│     financial health                │
│                                     │
│  ┌───────────────────────────────┐  │
│  │                               │  │
│  │         [Continue]            │  │
│  │                               │  │
│  └───────────────────────────────┘  │
│                                     │
│            [← Back]                 │
└─────────────────────────────────────┘
```

### Step 4: Primary Goal

```
┌─────────────────────────────────────┐
│  [Progress: ●●●●]          [Done]   │
├─────────────────────────────────────┤
│                                     │
│   What's your primary goal?         │
│                                     │
│  ┌─────────────┐  ┌─────────────┐  │
│  │   [🏠]      │  │   [🚗]      │  │
│  │   House     │  │    Car      │  │
│  └─────────────┘  └─────────────┘  │
│                                     │
│  ┌─────────────┐  ┌─────────────┐  │
│  │   [✈️]      │  │   [💍]      │  │
│  │  Vacation   │  │  Wedding    │  │
│  └─────────────┘  └─────────────┘  │
│                                     │
│  ┌─────────────┐  ┌─────────────┐  │
│  │   [🎓]      │  │   [🛡️]      │  │
│  │ Education   │  │  Emergency  │  │
│  └─────────────┘  └─────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │        [Custom Goal]          │  │
│  └───────────────────────────────┘  │
│                                     │
│            [← Back]                 │
└─────────────────────────────────────┘
```

### Component Hierarchy

```
OnboardingFlow
├── ProgressIndicator
├── SkipButton
├── StepContent
│   ├── WelcomeStep
│   │   ├── Headline
│   │   ├── Description
│   │   ├── BulletList
│   │   └── CTAButton
│   ├── IncomeStep
│   │   ├── Question
│   │   ├── InputField (currency)
│   │   ├── FrequencySelect
│   │   ├── HelpText
│   │   └── ContinueButton
│   ├── SavingsStep
│   │   └── [Similar to IncomeStep]
│   └── GoalStep
│       ├── Question
│       ├── GoalGrid
│       │   └── GoalCard[]
│       └── CustomGoalButton
├── BackButton
└── NavigationButtons
```

### User Interactions

1. **Click Continue** → Validate input, move to next step
2. **Click Back** → Return to previous step
3. **Click Skip** → Skip to dashboard with partial profile
4. **Select goal** → Automatically continue to next step

### State Variations

- **Loading:** Button shows spinner
- **Error:** Inline validation errors
- **Success:** Progress indicator updates
- **Partial completion:** Can skip and complete later

### Data Requirements

- Form inputs: income, savings, goal selection
- Validation: Real-time input validation
- Progress tracking: Current step (1-4)

---

## Screen 4: Dashboard (Main)

### Desktop Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│ [☰] Sage        [Dashboard] [Goals] [Chat] [Profile]    [User ▼] [🔔]  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  Good morning, Akhil! 👋                                                 │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  Financial Health Score: 78/100                          ↗ +5    │   │
│  │  ████████████████████████░░░░░░░░                                │   │
│  │                                                                  │   │
│  │  Emergency Fund: ✓  Debt Ratio: ✓  Savings Rate: ⚠              │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌─────────────────────────┐  ┌─────────────────────────────────────┐   │
│  │ This Month's Allocation │  │        Quick Actions                │   │
│  │                         │  │                                     │   │
│  │ Income:    ₹80,000      │  │  [💬 Ask AI CFO]                    │   │
│  │                         │  │                                     │   │
│  │ Essential:  ₹40,000 50% │  │  [🎯 Create Goal]                   │   │
│  │ Debt:       ₹10,000 13% │  │                                     │   │
│  │ Emergency:   ₹6,000  8% │  │  [💰 Can I Afford?]                 │   │
│  │ Goals:      ₹15,000 19% │  │                                     │   │
│  │ Invest:      ₹4,500  6% │  │  [📊 Run Simulation]                │   │
│  │ Free:        ₹4,500  6% │  │                                     │   │
│  │                         │  └─────────────────────────────────────┘   │
│  │ [View Details]          │                                            │
│  └─────────────────────────┘                                            │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  Active Goals (3)                                    [View All]  │   │
│  │                                                                  │   │
│  │  🏠 House Down Payment                              ₹3L / ₹5L   │   │
│  │  ████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  60%       │   │
│  │  On track • 8 months remaining                                  │   │
│  │                                                                  │   │
│  │  🚗 New Car                                         ₹50K / ₹3L   │   │
│  │  ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  17%       │   │
│  │  Delayed by 2 months • Adjust timeline?                         │   │
│  │                                                                  │   │
│  │  ✈️ Europe Vacation                                ₹80K / ₹2L   │   │
│  │  ████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  40%       │   │
│  │  On track • 6 months remaining                                  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  Insights & Recommendations                                      │   │
│  │                                                                  │   │
│  │  💡 You can increase house goal contribution by ₹2,000/month    │   │
│  │  ⚠️ Car goal timeline needs adjustment - [Review Options]       │   │
│  │  ✅ Emergency fund on track to reach target in 3 months         │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

### Mobile Layout

```
┌──────────────────────────┐
│ [☰] Sage        [🔔] [⚙️] │
├──────────────────────────┤
│                          │
│ Good morning, Akhil! 👋  │
│                          │
│ ┌──────────────────────┐ │
│ │ Health Score: 78     │ │
│ │ ████████░░░░  ↗ +5   │ │
│ └──────────────────────┘ │
│                          │
│ ┌──────────────────────┐ │
│ │ This Month           │ │
│ │                      │ │
│ │ Income:   ₹80,000    │ │
│ │ Allocated: ₹75,500   │ │
│ │ Free:      ₹4,500    │ │
│ │                      │ │
│ │ [View Breakdown]     │ │
│ └──────────────────────┘ │
│                          │
│ ┌──────────────────────┐ │
│ │ 🏠 House             │ │
│ │ ████████░░  60%      │ │
│ │ ₹3L / ₹5L            │ │
│ └──────────────────────┘ │
│                          │
│ ┌──────────────────────┐ │
│ │ 🚗 Car               │ │
│ │ ██░░░░░░░░  17%      │ │
│ │ ₹50K / ₹3L  ⚠️       │ │
│ └──────────────────────┘ │
│                          │
│ [💬 Ask AI] [🎯 Goal]    │
│                          │
│ ┌──────────────────────┐ │
│ │ Insights (3)         │ │
│ │ • Increase house...  │ │
│ │ • Review car goal... │ │
│ └──────────────────────┘ │
└──────────────────────────┘
```

### Component Hierarchy

```
Dashboard
├── Header
│   ├── Logo
│   ├── Navigation
│   ├── UserMenu
│   └── NotificationBell
├── Greeting
├── HealthScoreCard
│   ├── ScoreDisplay
│   ├── ProgressBar
│   ├── TrendIndicator
│   └── ComponentScores
├── MainContent
│   ├── AllocationCard
│   │   ├── IncomeDisplay
│   │   ├── AllocationBreakdown[]
│   │   └── ViewDetailsButton
│   ├── QuickActionsCard
│   │   └── ActionButton[]
│   ├── GoalsCard
│   │   ├── GoalsList
│   │   │   └── GoalProgressItem[]
│   │   └── ViewAllButton
│   └── InsightsCard
│       └── InsightItem[]
└── MobileNavigation (mobile only)
```

### User Interactions

1. **Click goal** → Navigate to goal details
2. **Click "Ask AI CFO"** → Open chat
3. **Click "Can I Afford?"** → Open affordability simulator
4. **Click insight** → Navigate to relevant section
5. **Click notification bell** → Show notifications dropdown

### State Variations

- **Loading:** Skeleton screens for all cards
- **Empty state:** "No goals yet" with CTA
- **Error:** Error message with retry button
- **Offline:** Cached data with offline indicator

### Data Requirements

- User profile
- Current month allocation
- Active goals with progress
- Health score calculation
- Insights/recommendations

---

## Screen 5: Goal Creation/Edit

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  [← Back to Goals]                                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Create New Goal                                             │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Goal Type                                               │ │
│  │                                                         │ │
│  │ [🏠 House] [🚗 Car] [✈️ Vacation] [💍 Wedding]          │ │
│  │ [🎓 Education] [🛡️ Emergency] [Custom]                  │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Goal Name                                               │ │
│  │ [House Down Payment                              ]      │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Target Amount                                           │ │
│  │ ₹ [5,00,000                                      ]      │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌──────────────────────────┐  ┌──────────────────────────┐ │
│  │ Target Date              │  │ Priority                 │ │
│  │ [Dec 2026 ▼]             │  │ [High ▼]                 │ │
│  └──────────────────────────┘  └──────────────────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Description (Optional)                                  │ │
│  │ [Down payment for 2BHK apartment...              ]      │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Feasibility Check                                       │ │
│  │                                                         │ │
│  │ Required monthly: ₹15,625                               │ │
│  │ Available monthly: ₹20,000                              │ │
│  │                                                         │ │
│  │ ✅ This goal is achievable!                             │ │
│  │ Confidence: 85%                                         │ │
│  │                                                         │ │
│  │ You'll reach your goal by Dec 2026 if you save         │ │
│  │ ₹15,625 per month.                                      │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                    [Create Goal]                        │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  [Cancel]                                                    │
└─────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
GoalForm
├── BackButton
├── PageTitle
├── GoalTypeSelector
│   └── TypeButton[]
├── FormFields
│   ├── NameInput
│   ├── AmountInput (currency)
│   ├── DatePicker
│   ├── PrioritySelect
│   └── DescriptionTextarea
├── FeasibilityPreview
│   ├── RequiredMonthly
│   ├── AvailableMonthly
│   ├── FeasibilityStatus
│   ├── ConfidenceScore
│   └── Explanation
└── ActionButtons
    ├── CreateButton
    └── CancelButton
```

### User Interactions

1. **Select goal type** → Pre-fill name, suggest amount
2. **Change amount/date** → Recalculate feasibility
3. **Click "Create Goal"** → Validate, create, redirect
4. **Click "Cancel"** → Confirm, return to goals

### State Variations

- **Calculating:** Feasibility shows loading spinner
- **Feasible:** Green checkmark, positive message
- **Infeasible:** Red warning, suggestions
- **Validation error:** Inline error messages

---

## Screen 6: AI Chat Interface

### Desktop Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  [← Dashboard]  AI CFO Chat                      [New Chat] [⋮] │
├──────────────────┬──────────────────────────────────────────────┤
│                  │                                              │
│ Recent Chats     │  Chat with your AI CFO                       │
│                  │                                              │
│ ┌──────────────┐ │  Suggested questions:                        │
│ │ Can I afford │ │  • Can I afford a ₹50,000 laptop?            │
│ │ laptop?      │ │  • When can I buy a house?                   │
│ │ 2 hours ago  │ │  • How should I use my bonus?                │
│ │              │ │  • Am I saving enough?                       │
│ └──────────────┘ │                                              │
│                  │  ┌────────────────────────────────────────┐  │
│ ┌──────────────┐ │  │ [Type your question...            ] [→]│  │
│ │ House goal   │ │  └────────────────────────────────────────┘  │
│ │ timeline     │ │                                              │
│ │ Yesterday    │ │                                              │
│ └──────────────┘ │                                              │
│                  │                                              │
│ ┌──────────────┐ │  ─────────────────────────────────────────  │
│ │ Bonus        │ │                                              │
│ │ allocation   │ │  [User Message]                              │
│ │ 3 days ago   │ │  Can I afford a ₹50,000 laptop?              │
│ └──────────────┘ │                                              │
│                  │  [AI Response]                               │
│ [View All]       │  Based on your ₹80,000 monthly income and    │
│                  │  ₹60,000 expenses, you have ₹20,000 surplus. │
│                  │                                              │
│                  │  Buying from savings:                        │
│                  │  ❌ Would reduce emergency fund to ₹1,00,000 │
│                  │  ⚠️ Not recommended                          │
│                  │                                              │
│                  │  Saving first:                               │
│                  │  ✅ Save ₹20,000/month for 3 months          │
│                  │  ✅ No impact on emergency fund or goals     │
│                  │  ✅ Recommended approach                     │
│                  │                                              │
│                  │  Would you like to see loan options?         │
│                  │                                              │
│                  │  [Show Loan Options] [Create Savings Goal]   │
│                  │                                              │
└──────────────────┴──────────────────────────────────────────────┘
```

### Mobile Layout

```
┌──────────────────────────┐
│ [←] AI CFO    [⋮] [New]  │
├──────────────────────────┤
│                          │
│ Suggested:               │
│ • Can I afford...?       │
│ • When can I...?         │
│                          │
│ ┌──────────────────────┐ │
│ │ [Ask anything...  ] →│ │
│ └──────────────────────┘ │
│                          │
│ ────────────────────────│
│                          │
│ [You]                    │
│ Can I afford a           │
│ ₹50,000 laptop?          │
│                          │
│ [AI CFO]                 │
│ Based on your income...  │
│                          │
│ Buying from savings:     │
│ ❌ Not recommended       │
│                          │
│ Saving first:            │
│ ✅ Recommended           │
│ Save ₹20K for 3 months   │
│                          │
│ [Loan Options]           │
│ [Create Goal]            │
│                          │
│ ────────────────────────│
│                          │
│ ┌──────────────────────┐ │
│ │ [Type message...  ] →│ │
│ └──────────────────────┘ │
└──────────────────────────┘
```

### Component Hierarchy

```
ChatInterface
├── Header
│   ├── BackButton
│   ├── Title
│   ├── NewChatButton
│   └── MenuButton
├── Sidebar (desktop only)
│   ├── RecentChatsList
│   │   └── ChatPreview[]
│   └── ViewAllButton
├── ChatArea
│   ├── SuggestedQuestions (empty state)
│   │   └── QuestionButton[]
│   ├── MessageList
│   │   └── Message[]
│   │       ├── UserMessage
│   │       └── AssistantMessage
│   │           ├── MessageContent
│   │           ├── CalculationBreakdown
│   │           └── ActionButtons[]
│   └── TypingIndicator (when AI responding)
└── InputArea
    ├── MessageInput
    └── SendButton
```

### User Interactions

1. **Type message + Send** → Stream AI response
2. **Click suggested question** → Auto-fill and send
3. **Click action button** → Navigate to relevant feature
4. **Click past chat** → Load conversation
5. **Click "New Chat"** → Start fresh conversation

### State Variations

- **Empty:** Show suggested questions
- **Typing:** Show typing indicator with animation
- **Streaming:** Show partial response as it arrives
- **Error:** Show error message with retry
- **Offline:** Show offline indicator

---

## Screen 7: Affordability Simulator

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  [← Back]  Can I Afford This?                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Purchase Amount                                         │ │
│  │ ₹ [50,000                                        ]      │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Item (Optional)                                         │ │
│  │ [Laptop                                          ]      │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              [Check Affordability]                      │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ─────────────────────────────────────────────────────────  │
│                                                               │
│  Scenarios                                                   │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 💰 Buy from Savings                              ❌     │ │
│  │                                                         │ │
│  │ New savings: ₹1,50,000                                  │ │
│  │ Emergency fund: ₹1,00,000 (₹60K below target)          │ │
│  │                                                         │ │
│  │ ⚠️ Not recommended - impacts emergency fund             │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 💳 Take Loan (12% interest, 12 months)          ⚠️      │ │
│  │                                                         │ │
│  │ EMI: ₹4,442/month                                       │ │
│  │ Total cost: ₹53,304 (₹3,304 interest)                  │ │
│  │ Impact: House goal delayed by 2 months                  │ │
│  │                                                         │ │
│  │ ⚠️ Manageable but adds debt                             │ │
│  │                                                         │ │
│  │ [View Amortization]                                     │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 💡 Save First                                    ✅     │ │
│  │                                                         │ │
│  │ Timeline: 3 months                                      │
│  │ Save: ₹20,000/month                                     │ │
│  │ No impact on emergency fund or goals                    │ │
│  │                                                         │ │
│  │ ✅ Recommended - Best financial approach                │ │
│  │                                                         │ │
│  │ [Create Savings Goal]                                   │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
AffordabilitySimulator
├── Header
├── InputSection
│   ├── AmountInput
│   ├── ItemInput
│   └── CheckButton
├── ResultsSection
│   ├── ScenarioCard (Buy from Savings)
│   │   ├── Title
│   │   ├── StatusBadge
│   │   ├── ImpactDetails
│   │   ├── Recommendation
│   │   └── ActionButton (optional)
│   ├── ScenarioCard (Loan)
│   │   └── [Same structure]
│   └── ScenarioCard (Save First)
│       └── [Same structure]
└── ComparisonChart (optional)
```

### User Interactions

1. **Enter amount + Check** → Run simulation
2. **Click scenario** → Expand details
3. **Click "Create Savings Goal"** → Pre-fill goal form
4. **Click "View Amortization"** → Show loan schedule

### State Variations

- **Empty:** Show input form only
- **Calculating:** Show loading spinner
- **Results:** Show all scenarios
- **Error:** Show error message

---

## Screen 8: Settings

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  [← Back]  Settings                                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Profile                                                     │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ [Avatar]  Akhil Kumar                                   │ │
│  │           akhil@example.com                             │ │
│  │                                            [Edit Profile]│ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  Financial Profile                                           │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Monthly Income              ₹80,000      [Edit]         │ │
│  │ Current Savings             ₹2,00,000    [Edit]         │ │
│  │ Risk Tolerance              Moderate     [Edit]         │ │
│  │ CFO Understanding Score     78%          [Improve]      │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  Preferences                                                 │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Notifications               [Toggle: ON]                │ │
│  │ Email Updates               [Toggle: OFF]               │ │
│  │ Currency                    INR (₹)      [Change]       │ │
│  │ Theme                       Light        [Change]       │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  Data & Privacy                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ [Export My Data]                                        │ │
│  │ [Privacy Policy]                                        │ │
│  │ [Terms of Service]                                      │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  Account                                                     │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ [Change Password]                                       │ │
│  │ [Delete Account]                                        │ │
│  │ [Sign Out]                                              │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
Settings
├── Header
├── ProfileSection
│   ├── UserInfo
│   └── EditButton
├── FinancialProfileSection
│   └── SettingRow[]
│       ├── Label
│       ├── Value
│       └── EditButton
├── PreferencesSection
│   └── SettingRow[]
│       ├── Toggle
│       └── Select
├── DataPrivacySection
│   └── ActionButton[]
└── AccountSection
    └── ActionButton[]
```

---

## Responsive Patterns

### Breakpoints

- **Mobile:** < 768px
- **Tablet:** 768px - 1024px
- **Desktop:** > 1024px

### Mobile Adaptations

1. **Navigation:** Hamburger menu, bottom tab bar
2. **Cards:** Full-width, stacked vertically
3. **Forms:** Single column, larger touch targets
4. **Charts:** Simplified, horizontal scroll if needed
5. **Modals:** Full-screen on mobile

### Touch Targets

- Minimum size: 44x44px
- Spacing: 8px minimum between targets
- Buttons: Full-width on mobile

---

## Accessibility

### WCAG 2.1 AA Compliance

1. **Color Contrast:** 4.5:1 for text, 3:1 for UI components
2. **Keyboard Navigation:** All interactive elements accessible
3. **Screen Readers:** Proper ARIA labels and roles
4. **Focus Indicators:** Visible focus states
5. **Form Labels:** All inputs properly labeled

### Semantic HTML

```html
<header>, <nav>, <main>, <section>, <article>, <aside>, <footer>
```

---

## Loading States

### Skeleton Screens

```
┌──────────────────────┐
│ ▓▓▓▓▓▓▓▓░░░░░░░░░░  │
│ ▓▓▓▓░░░░░░░░░░░░░░░  │
│                      │
│ ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░  │
│ ▓▓▓▓▓▓░░░░░░░░░░░░  │
└──────────────────────┘
```

### Progress Indicators

- Spinner for short waits (< 3s)
- Progress bar for longer operations
- Skeleton screens for page loads

---

## Conclusion

These wireframes provide:

✅ **Visual layouts** with ASCII diagrams  
✅ **Component hierarchies** for implementation  
✅ **User interactions** documented  
✅ **State variations** specified  
✅ **Responsive behavior** defined  
✅ **Accessibility** considerations  
✅ **Data requirements** identified  

All screens designed for:
- **Clarity** - Clear information hierarchy
- **Speed** - Fast loading with skeletons
- **Accessibility** - WCAG 2.1 AA compliant
- **Responsiveness** - Mobile-first approach
- **Consistency** - Unified design system

This serves as the complete UI specification for implementing Sage's frontend.
