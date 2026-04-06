# Performance and Scale Plan

## Studio Magic Profiling
- Record timeline drag/resize interactions with 20+ clips.
- Measure FPS and interaction delay on desktop and mobile devices.
- Track memory growth after repeated clip edits and undo/redo operations.

## API and Worker Throughput
- Simulate concurrent export job queueing from multiple users.
- Measure worker completion rate and average render duration.
- Verify retry behavior and timeout handling for failed FFmpeg tasks.

## Baselines
- API p95 < 300ms for non-render endpoints.
- Worker queue drain rate supports expected peak hourly load.
- No duplicate processing for a single queued job under concurrent workers.

## Follow-up Actions
- Add dashboards for job status counts and failure causes.
- Add alerts for queue growth, stuck processing, and webhook failures.
