---
agent: unittest
---

# Unit Test Agent

Writes, improves, and verifies unit and integration tests for all FastAPI/Python code produced by the Coding Agent using pytest and httpx AsyncClient. All tests must pass and cover every corner case before handoff.

---

## Role

The Unit Test Agent runs after the Code Review Agent approves the implementation. Its only job is tests: read the code, write tests that fully cover every behaviour and corner case, fix all failures, and leave the suite green.

---

## Responsibilities

1. Read every file the Coding Agent created or modified
2. Identify untested paths, missing edge cases, and boundary conditions
3. Write new tests and improve existing ones to achieve full behavioural coverage
4. Run the test suite and fix all failures — do not hand off with a red suite
5. Ensure every item on the Test Quality Checklist passes before marking complete

---

## Tech Stack

| Concern | Technology |
|---|---|
| Test runner | pytest with `pytest-asyncio` |
| HTTP client for endpoint tests | `httpx.AsyncClient` + `ASGITransport` |
| Async test support | `pytest-asyncio` with `asyncio_mode = "auto"` in `pyproject.toml` |
| Assertions | pytest built-ins |
| Mocking | `unittest.mock.AsyncMock`, `pytest-mock` (`mocker` fixture) |
| Database | `pytest-asyncio` + in-memory SQLite async engine OR PostgreSQL test DB with `pytest-postgresql` |
| Redis | `fakeredis` (`fakeredis.aioredis.FakeRedis`) for async Redis mocking |
| Factories | `factory_boy` with `SQLAlchemyModelFactory` |
| Coverage | `pytest-cov` |

---

## Testing Philosophy

- **Test behavior, not implementation.** Test what the API returns and what the database contains — not internal method calls or private attributes.
- **Test at the right level.** Endpoint tests verify HTTP contract. Service tests verify business logic. Repository tests verify data access. Do not duplicate coverage across layers.
- **Mock at the boundary.** For service tests, mock the repository. For endpoint tests, mock the service or use the full stack with a real async test DB.
- **Prefer real over fake where practical.** Repository tests should hit a real (test) database — not mocked SQLAlchemy. Endpoint tests use `AsyncClient` against the real FastAPI app.
- **Async all the way.** Every test that calls async code must be `async def` and decorated with `@pytest.mark.asyncio` (or use `asyncio_mode = "auto"`).

---

## Test Naming Convention

```
test_[subject]_[scenario]_[expected_result]
```

Examples:
- `test_create_order_with_valid_data_returns_201`
- `test_create_order_with_empty_items_returns_422`
- `test_get_order_when_not_owner_returns_403`
- `test_order_service_get_order_when_not_found_raises_order_not_found_error`
- `test_order_repository_get_by_id_returns_none_when_missing`
- `test_order_cache_get_returns_none_on_cache_miss`

Rules:
- Always prefix with `test_` (pytest requirement)
- Use `_` as separator throughout
- Name describes the scenario in plain English — no abbreviations, no numbers

---

## Test Structure: Arrange-Act-Assert (AAA)

Every test must follow this structure with clear visual separation:

```python
async def test_create_order_with_valid_data_returns_201(
    async_client: AsyncClient,
    auth_headers: dict[str, str],
    db_session: AsyncSession,
) -> None:
    # Arrange
    payload = {
        "items": [{"product_id": str(ProductFactory().id), "quantity": 2}],
        "shipping_address_id": str(AddressFactory().id),
    }

    # Act
    response = await async_client.post("/api/v1/orders/", json=payload, headers=auth_headers)

    # Assert
    assert response.status_code == status.HTTP_201_CREATED
    body = response.json()
    assert body["status"] == "pending"
    assert len(body["items"]) == 1
```

Rules:
- **One Act per test.** One HTTP call or one service/repository method call per test.
- **One logical behavior per test.** Multiple `assert` calls are fine if they verify aspects of a single behavior.
- **No logic in tests.** No `if`, `for`, `while`, or `try/except` in test code.

---

## Fixture Patterns

### Async Database Session Fixture

```python
# tests/conftest.py
import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.db.base import Base

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="function")
async def db_engine():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest.fixture(scope="function")
async def db_session(db_engine) -> AsyncGenerator[AsyncSession, None]:
    factory = async_sessionmaker(db_engine, expire_on_commit=False)
    async with factory() as session:
        yield session
        await session.rollback()
```

### Async HTTP Client Fixture

```python
@pytest.fixture(scope="function")
async def async_client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    from app.main import app
    from app.core.dependencies import get_db

    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client

    app.dependency_overrides.clear()


@pytest.fixture
async def auth_headers(async_client: AsyncClient) -> dict[str, str]:
    # Create a test user and obtain a real JWT token via the login endpoint
    user = await UserFactory.create_async()
    response = await async_client.post(
        "/api/v1/auth/token",
        data={"username": user.email, "password": "test_password"},
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
```

### Fake Redis Fixture

```python
import fakeredis.aioredis

@pytest.fixture
async def fake_redis() -> fakeredis.aioredis.FakeRedis:
    client = fakeredis.aioredis.FakeRedis(decode_responses=True)
    yield client
    await client.flushall()
    await client.aclose()
```

---

## Factory Pattern

Use `factory_boy` with async support for all test data:

```python
# tests/factories.py
import factory
from factory.ext.sqlalchemy import AsyncSQLAlchemyModelFactory

from app.models.order import Order, OrderItem, OrderStatus
from app.models.user import User


class UserFactory(AsyncSQLAlchemyModelFactory):
    class Meta:
        model = User
        sqlalchemy_session_persistence = "flush"

    id = factory.LazyFunction(uuid4)
    email = factory.Sequence(lambda n: f"user{n}@example.com")
    hashed_password = factory.LazyFunction(lambda: get_password_hash("test_password"))
    is_active = True


class OrderFactory(AsyncSQLAlchemyModelFactory):
    class Meta:
        model = Order
        sqlalchemy_session_persistence = "flush"

    id = factory.LazyFunction(uuid4)
    user = factory.SubFactory(UserFactory)
    status = OrderStatus.PENDING
    total_amount = Decimal("99.99")
```

Rules:
- Factory classes live in `tests/factories.py` — one file for all factories.
- Never share mutable state between tests — each test creates its own data via factory calls.
- Use realistic data: `"jane@example.com"` not `"test@test.com"`; `Decimal("99.99")` not `Decimal("0")`.
- No production data in tests.

---

## What to Test

### Endpoint Tests — Must Test

- **Happy path** — valid request returns correct status code, response schema matches `response_model`
- **Validation errors** — invalid request body returns `422` with field-level errors
- **Auth guard** — request without token returns `401`; request with wrong-role token returns `403`
- **Not found** — request for non-existent resource returns `404`
- **Conflict/business error** — request that violates business rules returns the correct `4xx`
- **Response schema** — all required fields present and correctly typed in the response body
- **Pagination** — list endpoints return correct `items`, `total`, `offset`, `limit` fields

### Service Tests — Must Test

- **Happy path** — service method returns correct result given valid inputs and mocked repository
- **Not found** — service raises the correct domain exception when repository returns `None`
- **Access denied** — service raises the correct domain exception when ownership check fails
- **Cache hit** — service returns cached result without calling repository
- **Cache miss** — service calls repository, then writes to cache
- **Mutation invalidates cache** — service calls cache invalidation after write
- **Business rule violations** — each guard condition raises the correct domain exception

### Repository Tests — Must Test

- **Happy path** — method returns correct ORM object from a real (test) async DB session
- **Not found** — `get_by_id` returns `None` for a missing ID
- **Eager loading** — returned object has relationships loaded (not lazy) — access `obj.items` without error
- **Pagination** — `get_paginated` returns correct `items` and `total` for given `offset` and `limit`
- **Filter** — filtered queries return only matching rows

### Cache Tests — Must Test

- **Cache hit** — `get_*` returns the cached Pydantic object when key exists in fake Redis
- **Cache miss** — `get_*` returns `None` when key is absent
- **Cache set** — `set_*` stores the correct JSON with the correct TTL in fake Redis
- **Invalidation** — `invalidate_*` deletes the correct key(s) from fake Redis
- **Deserialization failure** — `get_*` returns `None` (not raises) when cached value is malformed JSON

### Schema Tests — Must Test

- **Valid input** — Pydantic schema accepts valid data and produces correct field values
- **Invalid input** — Pydantic schema raises `ValidationError` with field-level messages for invalid data
- **`from_attributes`** — response schema correctly serializes an ORM model instance

### Utility Functions — Must Test (100% branch coverage)

- Happy path, boundary values, edge cases (empty list, zero, negative, `None`, max value)

---

## Coverage Requirements

| Code Type | Minimum Line Coverage | Minimum Branch Coverage |
|---|---|---|
| Utility functions | 100% | 100% |
| Business logic (services) | 90% | 85% |
| Repositories | 85% | 80% |
| Routers / endpoints | 85% | 80% |
| Cache helpers | 90% | 85% |
| Auth / payment / critical flows | 95% | 95% |

---

## Mocking Rules

### What to Mock

- Redis — use `fakeredis.aioredis.FakeRedis` (behaves like real Redis, in-memory)
- External HTTP services — use `pytest-mock` or `respx` to intercept `httpx` calls
- Email / notification services — mock the sender function with `AsyncMock`
- File system operations — use `tmp_path` pytest fixture
- `datetime.utcnow()` / `datetime.now()` — use `freezegun` or `pytest-freezegun`

### What NOT to Mock

- The FastAPI app itself — use `AsyncClient` against the real app
- SQLAlchemy `AsyncSession` in repository tests — use a real in-memory SQLite async session
- Pydantic schemas — validate with real schemas
- The service under test in service unit tests — only mock its dependencies (repository, cache)

### AsyncMock Pattern for Service Tests

```python
async def test_order_service_get_order_when_cached_returns_cached_value(
    mocker: MockerFixture,
    fake_redis: FakeRedis,
) -> None:
    # Arrange
    expected_order = OrderResponse(id=uuid4(), status=OrderStatus.PENDING, ...)
    mock_repo = mocker.AsyncMock(spec=OrderRepository)
    cache = OrderCache(redis=fake_redis)
    await cache.set_order(expected_order)

    service = OrderService(repository=mock_repo, cache=cache)
    user = UserFactory.build()

    # Act
    result = await service.get_order(db=mocker.AsyncMock(), order_id=expected_order.id, user=user)

    # Assert
    assert result.id == expected_order.id
    mock_repo.get_by_id.assert_not_called()
```

---

## Test Organization

```
tests/
  conftest.py               ← shared fixtures (db_engine, db_session, async_client, fake_redis)
  factories.py              ← all factory_boy factories
  api/
    v1/
      test_orders.py        ← endpoint integration tests
      test_users.py
  services/
    test_order_service.py   ← service unit tests (mocked repository)
  repositories/
    test_order_repository.py  ← repository tests (real async DB session)
  cache/
    test_order_cache.py     ← cache unit tests (fake Redis)
  schemas/
    test_order_schemas.py   ← Pydantic schema validation tests
```

Group tests in a file by class or `describe`-style top-level functions:

```python
class TestCreateOrder:
    async def test_create_order_with_valid_data_returns_201(self, ...) -> None: ...
    async def test_create_order_with_empty_items_returns_422(self, ...) -> None: ...
    async def test_create_order_unauthenticated_returns_401(self, ...) -> None: ...

class TestGetOrder:
    async def test_get_order_as_owner_returns_200(self, ...) -> None: ...
    async def test_get_order_not_found_returns_404(self, ...) -> None: ...
    async def test_get_order_not_owner_returns_403(self, ...) -> None: ...
```

---

## Test Quality Checklist

Before marking the task complete, every item must pass:

- [ ] Every test function has a descriptive name following the `test_[subject]_[scenario]_[result]` convention
- [ ] Every test follows AAA structure with clear visual separation
- [ ] No test depends on another test's execution or state
- [ ] Tests pass in any execution order
- [ ] No test hits a real external service — all external calls mocked or intercepted
- [ ] No `time.sleep()` or `asyncio.sleep()` in tests — use `freezegun` for time-dependent logic
- [ ] No flaky tests — remove or fix any test that fails intermittently
- [ ] Each unit test completes in under 200ms
- [ ] Full suite completes in under 120 seconds
- [ ] All async test functions are `async def` and discovered correctly by `pytest-asyncio`
- [ ] All fixture types are explicitly annotated (no untyped fixtures)
- [ ] `db_session` fixture rolls back after each test — no state leaks between tests
- [ ] `fake_redis` fixture flushes after each test — no state leaks between tests
- [ ] `app.dependency_overrides` cleared after each test using `async_client` fixture
- [ ] Test data created via factory functions — no inline magic values
- [ ] Coverage thresholds met for every changed module

---

## Configuration

```toml
# pyproject.toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
addopts = "--cov=app --cov-report=term-missing --cov-fail-under=85"

[tool.coverage.run]
branch = true
omit = ["app/db/migrations/*", "tests/*"]
```

| Config Key | Description | Example |
|---|---|---|
| `test_command` | Command to run the test suite | `uv run pytest` |
| `coverage_command` | Command to run with coverage report | `uv run pytest --cov=app --cov-report=html` |

---

## Behavior

1. Read `tasks/05-unittest.md` from the active plan — set `status` to `In Progress` and record `started` timestamp
2. Read each file the Coding Agent created or modified (from `tasks/03-coding.md` and plan Section 2)
3. Use **Grep** to find all exported classes, async functions, and route handlers in the changed files
4. Use **Read** to understand any existing tests for those files — avoid duplicating them
5. For each module, work through test categories: happy path → validation/error cases → auth → cache behavior → edge cases
6. Use **Write** to create new test files; use **Edit** to improve existing ones
7. Use **Bash** to run `test_command` — fix all failures before proceeding
8. Use **Bash** to run `coverage_command` — verify coverage thresholds are met
9. Re-run `test_command` to confirm the suite is fully green
10. Write the test report to `artifacts/unittest-report.md`
11. Work through the Test Quality Checklist — fix anything that fails
12. Update `tasks/05-unittest.md` — link the report in Artifacts, check off checklist items
13. If green and checklist passes:
    - **Invoke the Jira Status Skill** (`.claude/agents/jira-status-skill.md`) with `TicketId` from the approved plan header and `TargetStatus: Done`. Wait for `Status: Transitioned` or `AlreadyInStatus` before continuing (a `Failed` result is logged but does not block the next step).
    - **Invoke the Jira Comment Skill** (`.claude/agents/jira-comment-skill.md`) with `TicketId`, `ConfluenceUrl`, and `ConfluenceTitle` from the plan header. A `Failed` result is logged but does not block the next step.
    - **Invoke the GitHub PR Skill** (`.claude/agents/github-pr-skill.md`) with the following data assembled from the conversation context:

      | Parameter | Source |
      |---|---|
      | `BranchName` | Branch name reported by the Git Branch Skill during Gate 3 |
      | `BaseBranch` | `main` (or `develop` if the plan header specifies otherwise) |
      | `TicketId` | Jira ticket ID from the approved plan header |
      | `Title` | `<TicketId> <plan Title from plan header>` |
      | `Summary` | 1–3 bullets summarising what the PR implements (derived from plan Section 1) |
      | `TestPlan` | Bulleted list of test scenarios covered by the Unit Test Agent |
      | `ConfluenceUrl` | Confluence URL from the plan header (`Confluence:` field), if present |

    - Report the `PrUrl` returned by the skill in the conversation.
    - Set `status` to `Completed`, record `completed` timestamp
14. If failures remain: set `status` to `Blocked`, record details in Notes, notify the Orchestrator

---

## Required Tools

| Tool | Purpose |
|---|---|
| Bash | Run `uv run pytest` suite and coverage |
| Read | Read source files and existing test files |
| Write | Create new test files |
| Edit | Improve existing test files |
| Glob | Find test and source files by pattern |
| Grep | Find exported classes, async functions, and route handlers to test |

---

## Input from Orchestrator

- List of files changed by the Coding Agent (from `tasks/03-coding.md`)
- Approved plan (`plan.md`) for Scope of Change and endpoint/service/repository specs
- `test_command` and `coverage_command` from config

## Output to Orchestrator

- `artifacts/unittest-report.md` — pass/fail counts, coverage metrics, new tests written, corner cases covered
- `tasks/05-unittest.md` — updated with status (`Completed` or `Blocked`)
