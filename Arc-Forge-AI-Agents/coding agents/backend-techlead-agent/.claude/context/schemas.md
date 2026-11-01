# Context: Shared Data Schemas Between Agents

---

## FigmaScreen / FigmaDesign
Produced by: `confluence-reader-agent` (Step 7, via Figma MCP — reads Figma URLs found on story pages)
Consumed by: `lld-generator-agent` (Step 6, reads screenshots from StoryPackage — does not call Figma MCP directly)

```typescript
interface FigmaLink {
  url: string;
  title: string;
  type: "FILE" | "PROTOTYPE" | "BOARD";
  frames_read: boolean;           // false if Figma MCP could not read it
  screens: FigmaScreen[];
}

interface FigmaScreen {
  name: string;                   // Frame name in Figma, e.g., "Create Order"
  input_fields: FigmaInputField[];
  display_fields: FigmaDisplayField[];
  actions: FigmaAction[];
}

interface FigmaInputField {
  label: string;                  // Field label text in the design
  type: "text" | "number" | "date" | "datetime" | "dropdown" | "checkbox" | "multiselect" | "textarea";
  required: boolean;              // True if asterisk or "required" indicator visible
  options?: string[];             // Dropdown/multiselect enum values
  max_length?: number;            // From validation text e.g., "Max 100 characters"
  format?: string;                // Inferred: "email", "uuid", "date", etc.
  placeholder?: string;           // Placeholder text from the field
  validation_note?: string;       // Raw validation text from design
}

interface FigmaDisplayField {
  label: string;                  // Field label in the design
  type: "text" | "number" | "currency" | "date" | "boolean" | "status_badge" | "list";
  format_hint?: string;           // e.g., "£123.45" → currency, "12 Jan 2026" → date
  enum_values?: string[];         // Status badge labels if applicable
}

interface FigmaAction {
  label: string;                  // Button text, e.g., "Submit Order"
  maps_to: "POST" | "PUT" | "PATCH" | "DELETE" | "GET" | "navigation";
}

// Story content is fully represented in EnrichedStory (see StoryPackage below).
// FigmaLink objects are attached to each EnrichedStory after reading from story pages.
```

---

## PipelineState
Stored at: `.claude/memory/<EPIC_ID>/state.json`
Updated by: Orchestrator at every step transition

```typescript
interface PipelineState {
  epic_id: string;
  epic_title: string;
  started_at: string;           // ISO 8601
  last_updated: string;         // ISO 8601
  current_step: number;         // 1–8
  steps_completed: number[];
  
  hld: DocumentRef | null;
  frd: DocumentRef | null;
  
  confirmed_services: ConfirmedService[];
  
  repos: RepoStatus[];
  
  lld_generated: boolean;
  lld_approved: boolean;
  
  published_url: string | null;
}

interface DocumentRef {
  page_id: string;
  url: string;
  title: string;
}

interface ConfirmedService {
  name: string;                 // e.g., "order-service"
  expected_repo: string;        // e.g., "order-service"
  repo_path: string | null;     // set after Step 4
  change_types: string[];
  justification: string;
}

interface RepoStatus {
  service: string;
  repo_path: string;
  status: "READY" | "READY_WITH_WARNING" | "MISSING" | "PULL_FAILED";
  branch: string;
  head_commit: string;
  warnings: string[];
}
```

---

## FeatureContext
Produced by: `confluence-reader-agent` (Part 1)
Stored at: `.claude/memory/<EPIC_ID>/feature-context.json`
Consumed by: `service-identifier-agent`, `lld-generator-agent`, `lld-reviewer-agent`

```typescript
interface FeatureContext {
  feature_summary: string;
  hld: HLDContent;
  frd: FRDContent | null;
}

interface HLDContent {
  page_id: string;
  title: string;
  url: string;
  services_mentioned: string[];
  tech_stack: TechStack;
  data_flows: string[];
  integrations: string[];
  entities: string[];
  nfrs: Record<string, string>;
  architectural_patterns: string[];
  raw_content: string;           // full markdown — for LLD generator to reference
}

interface FRDContent {
  page_id: string;
  title: string;
  url: string;
  functional_requirements: string[];  // e.g., ["FR-1: User can create an order", ...]
  business_rules: string[];
  entities: string[];
  out_of_scope: string[];
  raw_content: string;
}

interface TechStack {
  language: string;
  framework: string;
  db: string;
  messaging: string | null;
}
```

---

## CurrentServiceState
Produced by: `spec-reader-agent`
Stored at: `.claude/memory/<EPIC_ID>/service-state.json` (JSON array, one object per service)
Consumed by: `lld-generator-agent`, `lld-reviewer-agent`

Reflects the three-file structure in each repo's `specifications/` folder.

```typescript
interface CurrentServiceState {
  service: string;
  repo_path: string;
  specifications_folder_exists: boolean;
  
  files: {
    openapi: OpenApiState;
    asyncapi: AsyncApiState;
    db_schema: DbSchemaState;
  };
}

interface OpenApiState {
  found: boolean;
  path: string | null;
  parse_error?: boolean;
  api_version: string | null;
  base_path: string | null;
  endpoints: ExistingEndpoint[];
  schema_names: string[];          // names already in components/schemas
  security_scheme: string | null;
}

interface AsyncApiState {
  found: boolean;
  path: string | null;
  parse_error?: boolean;
  spec_version: string | null;
  broker: string | null;           // "Azure Service Bus" | "Kafka" | "RabbitMQ" etc.
  channels: ExistingChannel[];
  message_names: string[];         // names already in components/messages
}

interface DbSchemaState {
  found: boolean;
  path: string | null;
  last_migration: string | null;
  migration_tool: string | null;   // "EF Core" | "Flyway" etc.
  tables: ExistingTable[];
}

interface ExistingTable {
  name: string;
  columns: { name: string; type: string; nullable: boolean; pk: boolean }[];
  indexes: { name: string; columns: string[]; unique: boolean }[];
}

interface ExistingEndpoint {
  method: string;
  path: string;
  operationId: string;
  tags: string[];
}

interface ExistingChannel {
  name: string;                    // topic/queue address
  role: "producer" | "consumer";
  message_schema: string | null;
}
```

---

## StoryPackage
Produced by: `confluence-reader-agent` (Part 2)
Stored at: `.claude/memory/<EPIC_ID>/story-package.json`
Consumed by: `lld-generator-agent`, `lld-reviewer-agent`, `confluence-publisher-agent`

**Authority model:** Confluence FRD child pages are the single source of truth. Each child page is one story page.

```typescript
interface StoryPackage {
  epic_id: string;
  total_stories: number;
  stories_with_figma: number;
  frd_child_pages_read: number;
  frd_requirements_covered: string;         // e.g., "10/12"
  uncovered_frd_requirements: string[];
  stories: EnrichedStory[];
}

interface EnrichedStory {
  key: string | null;                // Jira story key if present in page title (e.g. "PROJ-124")
  summary: string;                   // page title (minus the key prefix if present)
  lld_excluded: boolean;             // true if user typed SKIP at Figma gate

  // Confluence story page (FRD child page)
  confluence_page_id: string;
  confluence_url: string;

  // Content — all from Confluence story page
  acceptance_criteria: string[];
  narrative: string;
  design_notes: string;
  out_of_scope: string[];
  figma_links: FigmaLink[];          // read from Figma URLs found on the story page

  gaps: StoryGap[];
}

interface StoryGap {
  type: "no_ac" | "no_figma" | "no_design_notes" | "figma_unreadable";
  severity: "BLOCKER" | "WARN" | "INFO";
  message: string;
}
```

---

## EstimationResult
Produced by: `estimation-sequencing-agent` (Step 9)
Written to: `output/<EPIC_ID>/estimation.md`, `sequence.md`, `estimation-summary.md`
Never published externally.

```typescript
interface EstimationResult {
  epic_id: string;
  generated_at: string;
  unit: "hours" | "story_points" | "tshirt" | "days";
  total_hours: number;
  stories: StoryEstimate[];
  oversized_stories: string[];        // story keys recommended for splitting
  sequence: DevelopmentWave[];
  summary: {
    total_stories: number;
    total_hours: number;
    wave_count: number;
    max_parallel_stories: number;     // largest wave size
    minimum_sequential_path: string;  // e.g., "PROJ-124 → PROJ-128 → PROJ-127 (28 pts)"
  };
}

interface StoryEstimate {
  key: string;
  summary: string;
  tasks: EstimationTask[];
  implementation_points: number;     // before multiplier
  complexity_multiplier: number;
  implementation_subtotal: number;   // after multiplier, rounded to Fibonacci
  review_overhead: number;           // +1 per review round + rework buffer if applicable
  total_hours: number;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  split_recommended: boolean;        // true if total_hours > split_threshold (default 40h)
  split_suggestion?: string[];       // suggested story titles if splitting recommended
}

interface EstimationTask {
  category: "DB" | "API" | "EVENT" | "VAL" | "LOGIC" | "INTEGRATION" | "AUTH";
  description: string;
  base_hours: number;
  lld_reference: string;             // e.g., "Section 5.1 CustomerOrder table"
}

interface DevelopmentWave {
  wave_number: number;
  stories: WaveStory[];
  can_start_after: number | null;    // wave number this wave depends on, or null for Wave 1
  notes: string[];                   // parallel opportunities, merge conflict warnings
}

interface WaveStory {
  key: string;
  summary: string;
  points: number;
  service: string;
  depends_on: string[];              // story keys this story depends on
  dependency_reason: string;         // e.g., "Uses CustomerOrder table from PROJ-124"
}
```
