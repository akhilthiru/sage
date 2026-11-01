const fs = require('fs');
const path = require('path');

const filePath = 'd:/Projects/harley davidson/Source Code/Architect Agent/outputs/manage-reserved-items-v1.0.md';
let content = fs.readFileSync(filePath, 'utf8');

const placeholder = '## 6. Database Design\n\n{Database Design placeholder — to be filled by db-schema-designer}';

const dbSection = `## 6. Database Design

### 6.1 Tables & Schema

All tables below belong to the \`pagm-inventory\` service database. Schema name: \`inventory\`.

The \`ReservedItem\` and \`InventoryItem\` tables are the primary tables modified by this feature. \`ReservedItemComment\`, \`PriceBookItem\`, \`RefCustomer\`, \`RefVendor\`, and \`BinLocation\` are supporting tables referenced by this feature but not modified in this HLD (owned by existing feature work).

---

#### ReservedItem
**Purpose:** Represents a customer-specific demand claim against inventory stock. Tracks the full lifecycle from initial reservation through commitment, delivery, and cancellation.
**Schema:** \`inventory\`

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| Id | BIGINT IDENTITY(1,1) | PK NOT NULL | Surrogate primary key |
| TenantId | NVARCHAR(64) | NOT NULL | Tenant partition — Finbuckle multi-tenancy; global EF query filter applied |
| StoreId | BIGINT | NOT NULL | Store/dealer location identifier |
| CustomerId | BIGINT | FK NOT NULL | References \`RefCustomer(Id)\` |
| PriceBookItemId | BIGINT | FK NOT NULL | References \`PriceBookItem(Id)\` |
| VendorId | BIGINT | FK NULL | References \`RefVendor(Id)\` — null if no vendor-specific order |
| BinLocationId | BIGINT | FK NULL | References \`BinLocation(Id)\` — assigned bin for pick/pack |
| InvoiceId | BIGINT | NULL | References customer invoice when delivered; NULL until delivery |
| Type | INT (EnumType ref) | NOT NULL | ReservedItemType: SpecialOrder, Layaway, OTCSale, RepairOrder |
| Source | INT (EnumType ref) | NOT NULL | Source system: SpecialOrder, RepairOrder, OTCSale |
| SourceId | NVARCHAR(256) | NULL | External reference ID from source system (e.g., repairOrderJobId) |
| ReservedItemStatus | INT (EnumType ref) | NOT NULL | Pending, OnOrder, Committed, Delivered, Cancelled, PartiallyDelivered |
| DeliveryStatus | INT (EnumType ref) | NOT NULL | Delivery sub-status |
| RequestedQty | DECIMAL(18,6) | NOT NULL | Customer-requested quantity |
| CommittedQty | DECIMAL(18,6) | NOT NULL DEFAULT 0 | Quantity allocated from on-hand stock |
| DeliveredQty | DECIMAL(18,6) | NOT NULL DEFAULT 0 | Quantity handed to customer |
| CancelledQty | DECIMAL(18,6) | NOT NULL DEFAULT 0 | Quantity cancelled |
| QtyForDelivery | DECIMAL(18,6) | NOT NULL DEFAULT 0 | Quantity staged for current delivery |
| ItemCost | DECIMAL(18,6) | NULL | Purchase cost per unit |
| SellAmount | DECIMAL(18,6) | NULL | Selling price per unit |
| DiscountAmount | DECIMAL(18,6) | NULL | Discount per unit |
| ExtendedAmount | DECIMAL(18,6) | NOT NULL DEFAULT 0 | SellAmount * RequestedQty |
| SalesTax | DECIMAL(18,6) | NOT NULL DEFAULT 0 | Calculated sales tax |
| OtherTax | DECIMAL(18,6) | NOT NULL DEFAULT 0 | Other applicable tax |
| TotalAmount | DECIMAL(18,6) | NOT NULL DEFAULT 0 | ExtendedAmount + SalesTax + OtherTax |
| TotalBalanceDue | DECIMAL(18,6) | NOT NULL DEFAULT 0 | TotalAmount - DepositAmount |
| DepositAmount | DECIMAL(18,6) | NULL | Customer deposit paid |
| RemainingDeposit | DECIMAL(18,6) | NULL | Remaining deposit after partial payment |
| RequestedShipDate | DATE | NULL | Customer-requested ship date |
| CommittedDate | DATE | NULL | Date item was committed |
| IsNextDayPriority | BIT | NOT NULL DEFAULT 0 | Priority flag for next-day fulfilment |
| IsCompleted | BIT | NOT NULL DEFAULT 0 | True when fully delivered or cancelled |
| Notes | NVARCHAR(MAX) | NULL | Free-text notes |
| CreatedAtUtc | DATETIME2 | NOT NULL | Audit — creation timestamp |
| CreatedByUserId | BIGINT | NOT NULL | Audit — creating user |
| UpdatedAtUtc | DATETIME2 | NOT NULL | Audit — last update timestamp |
| UpdatedByUserId | BIGINT | NOT NULL | Audit — last updating user |
| DeletedAtUtc | DATETIME2 | NULL | Soft delete marker — NULL = active |
| RowVersion | ROWVERSION | NOT NULL | Optimistic concurrency token |

**Check Constraints:**
- \`CK_ReservedItem_RequestedQty_NonNegative\`: \`RequestedQty >= 0\`
- \`CK_ReservedItem_CommittedQty_NonNegative\`: \`CommittedQty >= 0\`
- \`CK_ReservedItem_DeliveredQty_NonNegative\`: \`DeliveredQty >= 0\`
- \`CK_ReservedItem_CancelledQty_NonNegative\`: \`CancelledQty >= 0\`

**FK Constraints:**
- \`FK_ReservedItem_RefCustomer (CustomerId -> RefCustomer.Id)\`
- \`FK_ReservedItem_PriceBookItem (PriceBookItemId -> PriceBookItem.Id)\`
- \`FK_ReservedItem_RefVendor (VendorId -> RefVendor.Id)\`
- \`FK_ReservedItem_BinLocation (BinLocationId -> BinLocation.Id)\`

---

#### InventoryItem
**Purpose:** Tracks physical stock quantities for a price book item within a store. The \`OnHandQty\` and \`CommittedQty\` fields are updated atomically during reserved item lifecycle transitions.
**Schema:** \`inventory\`

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| Id | BIGINT IDENTITY(1,1) | PK NOT NULL | Surrogate primary key |
| TenantId | NVARCHAR(64) | NOT NULL | Tenant partition key |
| StoreId | BIGINT | NOT NULL | Store/dealer location |
| PriceBookItemId | BIGINT | FK NOT NULL | References \`PriceBookItem(Id)\` |
| VendorId | BIGINT | FK NOT NULL | References \`RefVendor(Id)\` |
| ItemStatus | INT (EnumType ref) | NULL | Active, Inactive, OutOfStock |
| OnHandQty | DECIMAL(18,6) | NOT NULL DEFAULT 0 | Physical quantity currently in stock |
| CommittedQty | DECIMAL(18,6) | NOT NULL DEFAULT 0 | Quantity allocated to committed reserved items |
| OnOrderQty | DECIMAL(18,6) | NOT NULL DEFAULT 0 | Quantity on order from suppliers |
| AccountingCost | DECIMAL(18,6) | NULL | Inventory valuation cost |
| OnOrderSpecialOrderCount | INT | NOT NULL DEFAULT 0 | Number of special orders on order |
| OnOrderSpecialOrderQty | INT | NOT NULL DEFAULT 0 | Quantity across all special orders on order |
| LastOrderedCost | DECIMAL(18,6) | NULL | Unit cost at last purchase order |
| LastOrderedDate | DATETIME2 | NULL | Date of last purchase order |
| LastReceivedDate | DATETIME2 | NULL | Date last received into inventory |
| LastSaleDate | DATETIME2 | NULL | Date last sold |
| LastReceivedCost | DECIMAL(18,6) | NULL | Unit cost at last receipt |
| LifetimeSalesQty | DECIMAL(18,6) | NULL | Cumulative quantity sold |
| LifetimeSalesAmt | DECIMAL(18,6) | NULL | Cumulative sales amount |
| LifetimeUsageQty | DECIMAL(18,6) | NULL | Cumulative usage quantity (repair) |
| LifetimeUsageAmt | DECIMAL(18,6) | NULL | Cumulative usage amount (repair) |
| AvailableAsOfDate | DATETIME2 | NULL | Availability date for backordered items |
| LastCountedDate | DATETIME2 | NULL | Date of last physical count |
| CreatedAtUtc | DATETIME2 | NOT NULL | Audit |
| CreatedByUserId | BIGINT | NOT NULL | Audit |
| UpdatedAtUtc | DATETIME2 | NOT NULL | Audit |
| UpdatedByUserId | BIGINT | NOT NULL | Audit |
| DeletedAtUtc | DATETIME2 | NULL | Soft delete |
| RowVersion | ROWVERSION | NOT NULL | Optimistic concurrency token |

**Check Constraints:**
- \`CK_InventoryItem_OnHandQty_NonNegative\`: \`OnHandQty >= 0\`
- \`CK_InventoryItem_CommittedQty_NonNegative\`: \`CommittedQty >= 0\`

**FK Constraints:**
- \`FK_InventoryItem_PriceBookItem (PriceBookItemId -> PriceBookItem.Id)\`
- \`FK_InventoryItem_RefVendor (VendorId -> RefVendor.Id)\`

---

#### ReservedItemComment
**Purpose:** Stores freeform comments attached to a reserved item for customer service tracking.
**Schema:** \`inventory\`

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| Id | BIGINT IDENTITY(1,1) | PK NOT NULL | Surrogate primary key |
| TenantId | NVARCHAR(64) | NOT NULL | Tenant partition |
| StoreId | BIGINT | NOT NULL | Store reference |
| ReservedItemId | BIGINT | FK NOT NULL | References \`ReservedItem(Id)\` |
| Comment | NVARCHAR(MAX) | NOT NULL | Comment text |
| CreatedAtUtc | DATETIME2 | NOT NULL | Audit |
| CreatedByUserId | BIGINT | NOT NULL | Audit |
| UpdatedAtUtc | DATETIME2 | NOT NULL | Audit |
| UpdatedByUserId | BIGINT | NOT NULL | Audit |
| DeletedAtUtc | DATETIME2 | NULL | Soft delete |
| RowVersion | ROWVERSION | NOT NULL | Optimistic concurrency |

**FK Constraints:**
- \`FK_ReservedItemComment_ReservedItem (ReservedItemId -> ReservedItem.Id)\`

---

#### ItemTransactionSummary
**Purpose:** Audit trail of all inventory quantity changes (commit, deliver, cancel, adjust). Written via the \`ReservedItemUpdated\` event self-subscription.
**Schema:** \`inventory\`

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| Id | BIGINT IDENTITY(1,1) | PK NOT NULL | Surrogate primary key |
| TenantId | NVARCHAR(64) | NOT NULL | Tenant partition |
| StoreId | BIGINT | NOT NULL | Store reference |
| PriceBookItemId | BIGINT | FK NOT NULL | References \`PriceBookItem(Id)\` |
| ReservedItemId | BIGINT | NULL | References \`ReservedItem(Id)\` when applicable |
| TransactionType | INT (EnumType ref) | NOT NULL | Reserved, UnReserved, Delivered, Cancelled, Adjusted |
| TransactionSource | INT (EnumType ref) | NOT NULL | Source system (Inventory, RepairOrder, OTCSale) |
| TransactionQuantity | DECIMAL(18,6) | NOT NULL | Absolute quantity affected |
| ItemNumber | NVARCHAR(256) | NOT NULL | Denormalized item number for query efficiency |
| ItemDescription | NVARCHAR(512) | NULL | Denormalized item description |
| CustomerId | BIGINT | NULL | Customer involved, where applicable |
| CustomerName | NVARCHAR(256) | NULL | Denormalized customer name |
| CreatedAtUtc | DATETIME2 | NOT NULL | Audit |
| CreatedByUserId | BIGINT | NOT NULL | Audit |
| UpdatedAtUtc | DATETIME2 | NOT NULL | Audit |
| UpdatedByUserId | BIGINT | NOT NULL | Audit |
| DeletedAtUtc | DATETIME2 | NULL | Soft delete |
| RowVersion | ROWVERSION | NOT NULL | Optimistic concurrency |

---

### 6.2 Relationships

| Table | Relationship | Related Table | FK Column | Notes |
|-------|------------|--------------|-----------|-------|
| ReservedItem | Many-to-One | RefCustomer | CustomerId | Each reserved item belongs to one customer |
| ReservedItem | Many-to-One | PriceBookItem | PriceBookItemId | References the item catalogue entry |
| ReservedItem | Many-to-One (nullable) | RefVendor | VendorId | Vendor for special order; null for stock items |
| ReservedItem | Many-to-One (nullable) | BinLocation | BinLocationId | Physical storage location |
| ReservedItem | One-to-Many | ReservedItemComment | ReservedItemId | Comments on the reserved item |
| InventoryItem | Many-to-One | PriceBookItem | PriceBookItemId | One inventory stock record per price book item per store |
| ItemTransactionSummary | Many-to-One | PriceBookItem | PriceBookItemId | Transaction history per item |

**Note on ReservedItem to InventoryItem join**: There is no direct FK between \`ReservedItem\` and \`InventoryItem\`. The join is made via \`ReservedItem.PriceBookItemId -> PriceBookItem.Id -> InventoryItem.PriceBookItemId\`. This was an intentional schema decision (migration \`RemoveInventoryItemfromReservedItem\` confirms the direct FK was dropped). This allows reserved items to exist before an \`InventoryItem\` record is created, and decouples the reserved item lifecycle from stock record existence.

### 6.3 Key Business Rules at DB Layer

1. All quantity columns (RequestedQty, CommittedQty, DeliveredQty, CancelledQty, OnHandQty) must be >= 0 — enforced via check constraints.
2. Soft delete is mandatory on all tables — \`DeletedAtUtc IS NULL\` global EF query filters exclude soft-deleted records.
3. ROWVERSION on all mutable tables enables optimistic concurrency — concurrent writers receive 409 Conflict.
4. Tenant isolation enforced via \`TenantId\` column + Finbuckle EF global query filter + \`TenantMismatchMode.Throw\` in DbContext.

### 6.4 Indexing Strategy

| Table | Index Name | Columns | Type | Query Pattern |
|-------|-----------|---------|------|---------------|
| ReservedItem | IX_ReservedItem_TenantId_CustomerId | TenantId, CustomerId | Composite | List reserved items by customer — primary list query |
| ReservedItem | IX_ReservedItem_TenantId_ReservedItemStatus | TenantId, ReservedItemStatus | Composite | Filter by status |
| ReservedItem | IX_ReservedItem_TenantId_PriceBookItemId | TenantId, PriceBookItemId | Composite | Committed items view per price book item |
| ReservedItem | IX_ReservedItem_TenantId_Source_SourceId | TenantId, Source, SourceId | Composite | Lookup by source system reference (e.g., repairOrderJobId) |
| ReservedItem | IX_ReservedItem_BinLocationId | BinLocationId | Standard | Filter by bin location (existing) |
| InventoryItem | IX_InventoryItem_TenantId_PriceBookItemId | TenantId, PriceBookItemId | Composite | Hot path — inventory lookup on every commit |
| InventoryItem | IX_InventoryItem_TenantId_ItemStatus | TenantId, ItemStatus | Composite | Filter active/inactive inventory |
| ReservedItemComment | IX_ReservedItemComment_TenantId_ReservedItemId | TenantId, ReservedItemId | Composite | Fetch comments for a reserved item |
| ItemTransactionSummary | IX_ItemTransactionSummary_TenantId_PriceBookItemId | TenantId, PriceBookItemId | Composite | Transaction history per item |
| ItemTransactionSummary | IX_ItemTransactionSummary_TenantId_ReservedItemId | TenantId, ReservedItemId | Composite | Transaction history per reserved item |

### 6.5 Standards & Migration Notes

**Standards alignment:**
- All tables include mandatory audit columns, soft delete (DeletedAtUtc), and ROWVERSION — confirmed from codebase.
- All tables include TenantId NVARCHAR(64) NOT NULL — Finbuckle manages isolation.
- All decimal/quantity columns use DECIMAL(18,6) — confirmed from EF Core explicit type mappings.
- Schema name: \`inventory\` — matches service domain.
- PK strategy: BIGINT IDENTITY(1,1) — surrogate keys not exposed in external API responses.

**Migration notes for Phoenix:**
1. The \`SourceId\` column (NVARCHAR(256) NULL) on \`ReservedItem\` enables repair order job item tracing. If not already present, add via EF Core migration: \`{timestamp}_AddSourceIdToReservedItem.cs\`. Migration is backward compatible — new nullable column with default NULL.
2. The \`Source\` column (INT enum ref) should already exist per the entity definition. Verify presence in the DB snapshot before release.
3. Check constraints on quantity columns must be applied via migration if not already present. These are additive and non-breaking.
4. New index \`IX_ReservedItem_TenantId_Source_SourceId\` required to support repair order item lookups by source reference. Apply as a non-clustered index migration.
5. No destructive schema changes are required for this feature.`;

if (!content.includes(placeholder)) {
  console.error('Placeholder not found!');
  process.exit(1);
}

content = content.replace(placeholder, dbSection);
fs.writeFileSync(filePath, content, 'utf8');
console.log('Success. New length:', content.length);
