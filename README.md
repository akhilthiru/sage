# Sage - Your AI-Powered Personal CFO

> **"Your Personal CFO, Always Available, Always Learning"**

Sage is an AI-powered financial decision-making system that helps individuals make better financial choices through intelligent guidance, simulation, and progressive learning.

Unlike traditional finance apps that focus on tracking and categorization, Sage focuses on **guidance, planning, simulations, and decision support**.

---

## 🎯 Vision

Most people struggle with financial decisions not because they lack data, but because they lack guidance:

- "Can I afford this purchase right now?"
- "Should I take this loan?"
- "How will buying a car affect my retirement plans?"
- "Am I saving enough for my goals?"
- "What should I prioritize financially this month?"

**Sage answers these questions.**

---

## ✨ Key Features

### MVP Features

1. **Quick Onboarding (2-Minute Rule)**
   - Get personalized financial guidance within 2 minutes
   - No lengthy forms or historical data required
   - Progressive data collection over time

2. **Goal Management**
   - Set and track financial goals
   - Real-time feasibility analysis
   - Timeline projections
   - Milestone tracking

3. **Smart Allocation Engine**
   - Personalized monthly allocation recommendations
   - Priority-based distribution
   - Emergency fund optimization
   - Goal-aligned savings

4. **AI CFO Chat**
   - Ask financial questions in natural language
   - Get personalized, data-driven answers
   - No hallucinated information
   - Transparent reasoning

5. **Decision Simulator**
   - "Can I afford this?" simulations
   - Loan feasibility analysis
   - Impact on goals visualization
   - Multiple scenario comparison

6. **Financial Health Dashboard**
   - Overall financial health score
   - Personalized insights
   - Progress tracking
   - Quick actions

---

## 🏗️ Architecture

Sage follows a **layered architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────┐
│                  Presentation Layer                      │
│               (Next.js Pages & Components)               │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                   Application Layer                      │
│             (Server Actions & API Routes)                │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                     Domain Layer                         │
│   Financial Engine | Simulation Engine | AI Service     │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                 Infrastructure Layer                     │
│      PostgreSQL | OpenAI | Clerk | Analytics            │
└─────────────────────────────────────────────────────────┘
```

### Core Principle: AI Explains, Engine Calculates

- **Financial calculations are deterministic** - No LLM involvement
- **AI provides natural language explanations** - Makes results understandable
- **All logic is testable and reproducible** - No black boxes

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 14+ | React framework with SSR |
| **UI** | shadcn/ui + Tailwind | Component library + styling |
| **Backend** | Next.js Server Actions | Server-side logic |
| **Database** | PostgreSQL | Primary data store |
| **ORM** | Prisma | Type-safe database access |
| **Auth** | Clerk | User authentication |
| **AI** | OpenAI GPT-4 | Natural language processing |
| **Analytics** | PostHog | Product analytics |
| **Email** | Resend | Transactional emails |
| **Hosting** | Vercel | Deployment platform |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd sage

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Set up database
npx prisma generate
npx prisma migrate dev
npx prisma db seed

# Run development server
npm run dev

# Open browser
# Navigate to http://localhost:3000
```

### Environment Variables

Create a `.env.local` file with the following:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/sage_dev"

# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."

# AI (OpenAI)
OPENAI_API_KEY="sk-..."

# Analytics (PostHog)
NEXT_PUBLIC_POSTHOG_KEY="phc_..."
NEXT_PUBLIC_POSTHOG_HOST="https://app.posthog.com"

# Email (Resend)
RESEND_API_KEY="re_..."

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## 📁 Project Structure

```
sage/
├── app/                    # Next.js app directory
├── components/             # React components
├── domain/                 # Business logic (pure functions)
├── features/               # Feature modules
├── lib/                    # Shared utilities
├── prisma/                 # Database schema & migrations
├── public/                 # Static assets
├── tests/                  # E2E and integration tests
└── docs/                   # Documentation
```

See [`docs/project-structure.md`](docs/project-structure.md) for detailed structure.

---

## 📚 Documentation

### Core Documentation

- **[Vision](docs/vision.md)** - Product vision and philosophy
- **[Project Constitution](docs/project-constitution.md)** - Core principles and rules
- **[Product Requirements](docs/product-requirements.md)** - Detailed feature specifications
- **[System Architecture](docs/system-architecture.md)** - Technical architecture
- **[Database Design](docs/database-design.md)** - Database schema and design

### Development Guides

- **[Development Workflow](docs/development-workflow.md)** - How to develop features
- **[Engineering Principles](docs/engineering-principles.md)** - Code quality standards
- **[AI Behavior](docs/ai-behavior.md)** - How the AI should behave

### Planning

- **[Roadmap](docs/roadmap.md)** - Development roadmap
- **[Tasks](docs/tasks.md)** - Detailed task breakdown
- **[Milestones](docs/milestones.md)** - Phase-by-phase milestones

---

## 🧪 Testing

```bash
# Run unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui
```

### Test Coverage Goals

- **Financial Engine:** 100% coverage (critical)
- **Business Logic:** 80%+ coverage
- **UI Components:** 60%+ coverage

---

## 🎨 Code Quality

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Type check
npm run type-check
```

---

## 🚢 Deployment

### Automatic Deployment (Vercel)

Push to `main` branch triggers automatic deployment to production.

### Manual Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

---

## 📊 Development Timeline

```
Week 1-2:   Phase 0 - Foundation
Week 3-4:   Sprint 1 - Onboarding & Profile
Week 5-6:   Sprint 2 - Goals
Week 7:     Sprint 3 - Allocation
Week 8:     Sprint 4 - AI Chat
Week 9-10:  Sprint 5 - Affordability Simulator
Week 11:    Sprint 6 - Loan Simulator
Week 12:    Sprint 7 - Enhanced Dashboard
Week 13-14: Phase 3 - Polish & Testing
Week 15-16: Phase 4 - Beta Launch

Total: 16 weeks to beta launch
```

---

## 🎯 Success Metrics

### MVP Success Criteria

**User Activation:**
- 80% complete onboarding within 2 minutes
- 70% ask first question within first session
- 60% return within 7 days

**User Engagement:**
- 3+ questions per week
- 5+ minute average session
- 70% weekly active users

**User Value:**
- 80% feel more confident in financial decisions
- 50% achieve goal milestone within 3 months
- NPS score: 40+

**Technical Performance:**
- Page load: < 1 second
- AI response: < 3 seconds
- 99.5% uptime

---

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guide](CONTRIBUTING.md) for details on:

- Code of conduct
- Development workflow
- Pull request process
- Code style guidelines

---

## 🔒 Security

- End-to-end encryption for sensitive data
- No selling of user data, ever
- Regular security audits
- GDPR compliant
- User owns their data

Report security vulnerabilities to: security@sage.app

---

## 📝 License

[MIT License](LICENSE)

---

## 🙏 Acknowledgments

Built with:
- [Next.js](https://nextjs.org/)
- [Prisma](https://www.prisma.io/)
- [Clerk](https://clerk.com/)
- [OpenAI](https://openai.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)

---

## 📞 Contact

- **Website:** https://sage.app
- **Email:** hello@sage.app
- **Twitter:** @SageFinance
- **Discord:** [Join our community](https://discord.gg/sage)

---

## 🗺️ Roadmap

### Current: MVP (Phase 1-4)
- ✅ Onboarding & Profile
- ✅ Goal Management
- ✅ Allocation Engine
- ✅ AI Chat
- ✅ Decision Simulator
- ✅ Financial Dashboard

### Next: Post-MVP (Phase 5+)
- [ ] Expense Tracking
- [ ] Bank Integration
- [ ] Investment Tracking
- [ ] Tax Planning
- [ ] Mobile App

See [Roadmap](docs/roadmap.md) for detailed plans.

---

## 💡 Philosophy

**We believe:**

1. **User value first** - Every feature must provide value within 2 minutes
2. **AI as advisor, not oracle** - AI explains, engine calculates
3. **Simplicity over features** - Solve one problem exceptionally well
4. **Progressive enhancement** - Work with minimal data, improve over time
5. **Transparency and trust** - Always explain recommendations

See [Project Constitution](docs/project-constitution.md) for full principles.

---

## 🎓 For Developers

### Quick Start

1. Read [Vision](docs/vision.md) to understand the product
2. Review [System Architecture](docs/system-architecture.md) for technical overview
3. Follow [Development Workflow](docs/development-workflow.md) for processes
4. Check [Engineering Principles](docs/engineering-principles.md) for code standards
5. Start with [Tasks](docs/tasks.md) for what to build

### Key Concepts

**Financial Engine:**
- Pure TypeScript functions
- Deterministic calculations
- 100% test coverage
- No external dependencies

**AI Service:**
- Explains results from financial engine
- Never invents financial data
- Transparent reasoning
- Version-controlled prompts

**Feature-Based Structure:**
- Code organized by feature, not type
- Each feature is self-contained
- Clear dependencies

---

## 🐛 Known Issues

None yet! This is a fresh start.

Report bugs via [GitHub Issues](https://github.com/sage/sage/issues).

---

## 📈 Status

**Current Phase:** Phase 0 - Foundation  
**Status:** Documentation Complete ✅  
**Next:** Project Setup

---

**Built with ❤️ for better financial decisions**

---

## Quick Links

- [Vision](docs/vision.md)
- [Architecture](docs/system-architecture.md)
- [Roadmap](docs/roadmap.md)
- [Contributing](CONTRIBUTING.md)
- [License](LICENSE)
