# BullMQ Quick Reference

## Installation

```bash
npm install bullmq
# or
yarn add bullmq
```

---

## Core Concepts

- **Queue**: Manage jobs (add/pause/clean)
- **Worker**: Process jobs (1+ instances)
- **QueueEvents**: Listen to system-wide events
- **FlowProducer**: Handle complex workflows

---

## Basic Setup

```ts
// Create Queue
import { Queue } from 'bullmq';
const queue = new Queue('foo', { connection });

// Add Jobs
await queue.add('jobName', { data });

// Create Worker
import { Worker } from 'bullmq';
const worker = new Worker('foo', async job => {
  console.log(job.data);
}, { connection });

// Handle Events
worker.on('completed', job => {
  console.log(`${job.id} completed`);
});
```

---

## Redis Connection

```ts
import IORedis from 'ioredis';

// Recommended config:
const connection = new IORedis({
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});
```

---

## Key Features

### Repeatable Jobs

```ts
// Cron pattern
await queue.add('clean', {}, {
  repeat: { pattern: '0 */1 * * * *' }
});

// Interval-based
await queue.add('report', {}, {
  repeat: { every: 86400000, limit: 100 }
});

// Management
const jobs = await queue.getRepeatableJobs();
await queue.removeRepeatable('jobName', { every: 10000 });
```

---

### Concurrency

```ts
// Global concurrency
await queue.setGlobalConcurrency(4);

// Worker concurrency
new Worker('foo', processor, { concurrency: 50 });
```

---

### Bulk Operations

```ts
await queue.addBulk([
  { name: 'paint', data: { color: 'blue' } },
  { name: 'paint', data: { color: 'red' } }
]);
```

---

## Best Practices

- Always set Redis `maxmemory-policy=noeviction`
- Use separate connections for producers/consumers
- Handle failed jobs:

```ts
worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed: ${err.message}`);
});
```

---

## Advanced Patterns

### Custom Repeat Strategies

```ts
const settings = {
  repeatStrategy: (millis, opts) => {
    // Custom scheduling logic
    return nextOccurrence.getTime();
  }
};

new Queue('Paint', { settings });
```

### Job Management

```ts
// Remove jobs
await job.remove();

// Clean queues
await queue.obliterate({ force: true });
```
