export class FlowService {
  constructor(flowRepository) {
    this.flowRepository = flowRepository;
    this.activeFlows = new Map();
  }

  validateFlowId(flowId) {
    if (!flowId || typeof flowId !== 'string') {
      throw new Error('Invalid flow ID');
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(flowId)) {
      throw new Error('Flow ID contains invalid characters');
    }
    return flowId;
  }

  validateFlowDefinition(definition) {
    if (!definition || typeof definition !== 'object') {
      throw new Error('Flow definition must be an object');
    }
    if (!definition.id || typeof definition.id !== 'string') {
      throw new Error('Flow definition requires an id');
    }
    if (!definition.states || !Array.isArray(definition.states)) {
      throw new Error('Flow definition requires states array');
    }
    return definition;
  }

  createFlowId() {
    return `flow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  registerActiveFlow(flowId, flowName) {
    const flow = {
      flowId,
      flowName,
      startTime: Date.now(),
      status: 'running',
      cancel: () => {
        flow.cancelled = true;
        flow.status = 'cancelled';
      }
    };
    this.activeFlows.set(flowId, flow);
    return flow;
  }

  getActiveFlow(flowId) {
    return this.activeFlows.get(flowId);
  }

  getActiveFlows() {
    return this.activeFlows;
  }

  unregisterActiveFlow(flowId) {
    this.activeFlows.delete(flowId);
  }

  buildFlowResult(flowId, flowName, input, output, status, error, duration) {
    return {
      flowId,
      flowName,
      input,
      output,
      status,
      error,
      duration,
      timestamp: nowISO()
    };
  }

  validateMetadata(result) {
    try {
      JSON.stringify(result);
      return true;
    } catch (err) {
      throw new Error('Result not JSON serializable');
    }
  }
}
