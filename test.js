import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { TaskService } from './src/index.js';
import { nowISO, createTimestamps, updateTimestamp } from '@sequentialos/timestamp-utilities';

describe('TaskService', () => {
  let service;
  let mockRepository;

  beforeEach(() => {
    mockRepository = {
      getConfig: () => ({ inputs: [] })
    };
    service = new TaskService(mockRepository, { executionTimeoutMs: 30000 });
  });

  it('should create unique run IDs', () => {
    const id1 = service.createRunId();
    const id2 = service.createRunId();

    assert.ok(id1);
    assert.ok(id2);
    assert.notStrictEqual(id1, id2);
    assert.match(id1, /^\d+-[a-z0-9]+-\d+$/);
  });

  it('should register and unregister active tasks', () => {
    const runId = service.createRunId();
    const task = service.registerActiveTask(runId, 'test-task');

    assert.ok(service.getActiveTask(runId));
    assert.strictEqual(service.getActiveTasks().size, 1);

    service.unregisterActiveTask(runId);
    assert.strictEqual(service.getActiveTasks().size, 0);
  });

  it('should track active task count', () => {
    const id1 = service.createRunId();
    const id2 = service.createRunId();

    service.registerActiveTask(id1, 'task1');
    service.registerActiveTask(id2, 'task2');

    assert.strictEqual(service.getActiveTasks().size, 2);
  });

  it('should validate metadata is JSON serializable', () => {
    const result = {
      runId: '123',
      taskName: 'test',
      input: { key: 'value' },
      output: { result: 'success' },
      status: 'success',
      error: null,
      duration: 100,
      timestamp: nowISO()
    };

    assert.doesNotThrow(() => service.validateMetadata(result));
    assert.ok(JSON.stringify(result));
  });

  it('should have method stubs for validation', () => {
    assert.ok(typeof service.validateInputs === 'function');
    assert.ok(typeof service.validateMetadata === 'function');
    assert.ok(typeof service.createRunId === 'function');
    assert.ok(typeof service.registerActiveTask === 'function');
    assert.ok(typeof service.unregisterActiveTask === 'function');
    assert.ok(typeof service.getActiveTask === 'function');
    assert.ok(typeof service.getActiveTasks === 'function');
  });

  it('should build run results', () => {
    const result = service.buildRunResult(
      'run-123',
      'test-task',
      { input: 'data' },
      { output: 'data' },
      'success',
      null,
      1000
    );

    assert.strictEqual(result.runId, 'run-123');
    assert.strictEqual(result.taskName, 'test-task');
    assert.strictEqual(result.status, 'success');
    assert.strictEqual(result.duration, 1000);
    assert.ok(result.timestamp);
  });
});
