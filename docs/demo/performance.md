# Performance Report

## Environment

- **Hardware**: Local development machine
- **Database**: PostgreSQL in Docker (pgvector enabled)
- **Dataset**: Seeded demo data
- **AI Provider**: Mocked (no live Bedrock calls in benchmarks)
- **Date**: 2026-04-30

## Targets

| Metric | Target | Measured | Status |
|--------|--------|----------|--------|
| Task list API | < 300ms | - | Manual run required |
| Vector search API | < 500ms | - | Manual run required |
| Chat first response | < 2s (mocked) | - | Manual run required |
| Embedding indexer | Seed completes | - | Manual run required |

## How to Run Benchmarks

```bash
# 1. Start services
pnpm dev:db
pnpm db:migrate
pnpm db:seed

# 2. Start API
pnpm dev:api

# 3. Run task list benchmark
bash scripts/bench-tasks.sh

# 4. Run benchmark smoke tests (functional only, no strict timing in CI)
pnpm exec nx test api --testPathPattern="benchmark"
```

## Notes

- Live Bedrock latency varies by region, model, and prompt size.
- Vector search performance depends on dataset size and index type.
- Cold start (first request after restart) is typically slower.
- Results above are from local development environment with small dataset.
- For production, run benchmarks against realistic data volumes.

## Cold Start Notes

- First Bedrock call is slower due to connection setup (~2-5s).
- Subsequent calls are faster due to connection reuse.
- Docker database cold start adds ~2-3s to first query.
