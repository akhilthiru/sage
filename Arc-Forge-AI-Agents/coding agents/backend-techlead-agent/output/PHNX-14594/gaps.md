# Gap Log — Service — Manage Stock Items
Epic: PHNX-14594 | Generated: 2026-05-12

## BLOCKER Gaps

None

## WARN Gaps

### GAP-001
- **ID:** GAP-001
- **Severity:** WARN
- **Detected by:** spec-reader-agent
- **Subject:** tps-dms-repair-order
- **Type:** spec_file_missing
- **Description:** `specifications/db-schema.md` is missing in the `tps-dms-repair-order` GitHub repository. The LLD DB design for `RepairOrderItem` was created from scratch based on FRD requirements (FR-01 to FR-14), HLD data model, and story acceptance criteria.
- **Impact:** The existing DB schema for the Repair Order service could not be verified. There is a risk that column names, types, or FK relationships for tables referenced by `RepairOrderItem` (i.e., `RepairOrder`, `RepairOrderJob`) differ from what is assumed in this LLD.
- **Recommendation:** Add `specifications/db-schema.md` to the `tps-dms-repair-order` repository reflecting the current DB state. Review FK targets (`RepairOrder.Id`, `RepairOrderJob.Id`) before applying the migration.
- **Resolved:** false
- **Resolution:** null

---

### GAP-002
- **ID:** GAP-002
- **Severity:** WARN
- **Detected by:** spec-reader-agent
- **Subject:** tps-dms-parts-merchandise-inventory
- **Type:** spec_file_missing
- **Description:** `specifications/db-schema.md` is missing in the `tps-dms-parts-merchandise-inventory` GitHub repository. Existing inventory quantity columns (`OnHandQty`, `CommittedQty`) and their types were inferred from FRD descriptions and HLD narrative.
- **Impact:** The new inventory mutation endpoints (`/commit-direct`, `/uncommit`, `/deliver`, `/rollback`) are designed against assumed column names. If actual column names differ, the endpoint implementations will require adjustment.
- **Recommendation:** Add `specifications/db-schema.md` to the `tps-dms-parts-merchandise-inventory` repository. Cross-reference actual `InventoryItem` column names with the DTO field names in this LLD before implementation.
- **Resolved:** false
- **Resolution:** null

## INFO Gaps

### GAP-003
- **ID:** GAP-003
- **Severity:** INFO
- **Detected by:** confluence-reader-agent
- **Subject:** PHNX-7211, PHNX-7210, PHNX-7209, PHNX-7191, PHNX-7186, PHNX-7185, PHNX-23957, PHNX-23303, PHNX-7184, PHNX-7206, PHNX-7208, PHNX-23322, PHNX-7197, PHNX-7196, PHNX-7195, PHNX-7189, PHNX-7192 (17 of 18 stories)
- **Type:** figma_data_unavailable
- **Description:** Figma rate limit encountered during pipeline execution. 17 of 18 user stories returned no Figma frame data. User explicitly authorized pipeline to proceed without Figma design data. API specifications were derived from FRD acceptance criteria and HLD data model.
- **Impact:** API field names, enum values, and response structures may not perfectly match the approved UI designs. Minor field name discrepancies between UI and API contracts could require iteration during frontend integration.
- **Recommendation:** Re-run Figma extraction per story once the rate limit clears (typically 1 hour). Compare extracted field names and screen layouts against the API DTO field names in this LLD, particularly for `RepairOrderItemDto`, `RepairOrderStockItemsDto`, and `AddStockItemRequest`.
- **Resolved:** true
- **Resolution:** User authorized proceeding without Figma data at pipeline Step 2. Gap recorded for developer awareness only.
