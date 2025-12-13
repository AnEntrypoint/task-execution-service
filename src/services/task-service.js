import { executeTaskWithTimeout } from '@sequentialos/server-utilities';
import { nowISO, createTimestamps, updateTimestamp } from '@sequentialos/timestamp-utilities';
import { delay, withRetry } from '@sequentialos/async-patterns';

export class TaskService {
  constructor(repository, toolRepository = null, config = {}) {
    this.repository = repository;
    this.toolRepository = toolRepository;
    this.config = config;
    this.activeTasks = new Map();
    this.defaultExecutionTimeoutMs = config.executionTimeoutMs || 30000;
  }

  validateInputs(taskName, input, config) {
    if (!config.inputs) {
      return;
    }
    const errors = this.validateInputSchema(input, config.inputs);
    if (errors.length > 0) {
      const err = new Error(errors.join('; '));
      err.code = 'VALIDATION_ERROR';
      err.status = 400;
      throw err;
    }
  }

  validateInputSchema(input, schema) {
    const errors = [];
    for (const field of schema) {
      if (field.required && (input[field.name] === undefined || input[field.name] === null)) {
        errors.push(`${field.name} is required`);
        continue;
      }
      if (input[field.name] !== undefined && field.type && typeof input[field.name] !== field.type) {
        errors.push(`${field.name} must be of type ${field.type}`);
      }
    }
    return errors;
  }

  validateMetadata(result) {
    try {
      JSON.stringify(result);
    } catch (e) {
      const err = new Error(`Cannot serialize task result: ${e.message}`);
      err.code = 'VALIDATION_ERROR';
      err.status = 400;
      throw err;
    }
  }

  createRunId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${process.pid}`;
  }

  registerActiveTask(runId, taskName) {
    const task = {
      runId,
      taskName,
      startTime: Date.now(),
      cancelled: false,
      cancel: function() { this.cancelled = true; }
    };
    this.activeTasks.set(runId, task);
    return task;
  }

  getActiveTask(runId) {
    return this.activeTasks.get(runId);
  }

  unregisterActiveTask(runId) {
    this.activeTasks.delete(runId);
  }

  getActiveTasks() {
    return this.activeTasks;
  }

  buildRunResult(runId, taskName, input, output, status, error, duration) {
    return {
      runId,
      taskName,
      status,
      input,
      output,
      error,
      duration,
      timestamp: nowISO()
    };
  }

  getExecutionTimeoutMs(cancelled = false) {
    return cancelled ? 0 : this.defaultExecutionTimeoutMs;
  }

  async executeTask(runId, taskName, code, input, cancelled = false) {
    const timeoutMs = this.getExecutionTimeoutMs(cancelled);

    const toolExecutor = this.toolRepository ? async (toolName, params) => {
      const tool = await this.toolRepository.get(toolName);
      if (!tool) {
        throw new Error(`Tool not found: ${toolName}`);
      }
      const implementation = tool.implementation || tool.code;
      if (!implementation) {
        throw new Error(`Tool has no implementation: ${toolName}`);
      }
      try {
        const asyncFn = new Function(`return (${implementation})`);
        const fn = asyncFn();
        return await fn(params || {});
      } catch (error) {
        throw new Error(`Tool execution failed: ${error.message}`);
      }
    } : null;

    return executeTaskWithTimeout(taskName, code, input, timeoutMs, toolExecutor);
  }
}
