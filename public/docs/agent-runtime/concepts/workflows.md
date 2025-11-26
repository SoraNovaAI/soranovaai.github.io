---
title: "Workflows"
order: 4
category: "Concepts"
---

# Workflows

Workflows enable multi-agent coordination by orchestrating multiple blocks of tasks. Agent Runtime provides two workflow runners: `CoordinatorWorkflowRunner` for intelligent delegation and `SequentialWorkflowRunner` for ordered execution.

## Overview

A workflow consists of:
- **Blocks**: Groups of tasks that can be executed together
- **Coordination**: How blocks are orchestrated (parallel or sequential)
- **Agent** (optional): Coordinator agent for intelligent delegation

## Workflow Types

### Coordinator Workflow (Parallel)

Uses an LLM-guided coordinator that creates a DAG (Directed Acyclic Graph) execution plan:

```
User Query
    ↓
┌─────────────────────────────────┐
│  PLAN: Create DAG of blocks     │
│        with dependencies        │
└─────────────┬───────────────────┘
              ↓
┌─────────────────────────────────┐
│  ACT: Execute blocks in         │
│       parallel where possible   │
└─────────────┬───────────────────┘
              ↓
┌─────────────────────────────────┐
│  SYNTHESIZE: Combine results    │
└─────────────┬───────────────────┘
              ↓
┌─────────────────────────────────┐
│  EVALUATE: Assess quality       │
│            (optional)           │
└─────────────────────────────────┘
```

### Sequential Workflow

Executes all blocks in order without LLM coordination:

```
User Query
    ↓
Block 1 → Block 2 → Block 3 → Result
```

## Configuration

### Coordinator Workflow

```yaml
name: "research_workflow"

coordination:
  type: "parallel"

agent:
  id: "coordinator"
  llm:
    provider: "openai"
    model: "gpt-4"
  specialization_prompt: |
    You coordinate research tasks across specialist agents.

evaluator:
  type: deepeval
  max_iteration: 2
  deepeval:
    llm:
      model: "gpt-4-mini"
    metrics:
      completeness:
        weight: 1.0
        threshold: 0.7

blocks:
  - name: "web_researcher"
    block:
      - type: "agent"
        agent:
          id: "web_agent"
          llm:
            provider: "openai"
            model: "gpt-4"
          capabilities:
            skills: ["web_search"]
          tools:
            mode: "all"
            sources:
              - type: "mcp"
                mcp_servers: "configs.search.MCP_CONFIG"

  - name: "data_analyst"
    block:
      - type: "agent"
        agent:
          id: "analyst"
          llm:
            provider: "openai"
            model: "gpt-4"
          capabilities:
            skills: ["data_analysis"]
```

### Sequential Workflow

```yaml
name: "pipeline_workflow"

coordination:
  type: "sequential"

blocks:
  - name: "step_1"
    block:
      - type: "llm"
        llm:
          provider: "openai"
          model: "gpt-4"
        prompt: "Process the input data"

  - name: "step_2"
    block:
      - type: "llm"
        llm:
          provider: "openai"
          model: "gpt-4"
        prompt: "Analyze the processed data"
```

## Usage

### Running a Workflow

```python
from pathlib import Path
from agent_runtime.workflow import create_workflow_runner
from agent_runtime.agent.client import create_llm_client
from agent_runtime.types.config import Workflow

# Load workflow configuration
workflow = Workflow.parse_config(Path("workflow.yaml"))

# Create LLM client
model = create_llm_client(workflow.agent.llm)

# Create and run workflow
runner = create_workflow_runner(workflow, model, debug=True)
result = await runner.run("Research the latest AI developments")

# Access results
for worker_result in result.worker_results:
    print(f"{worker_result.worker_id}: {worker_result.response}")

# Check token usage
print(f"Total tokens: {result.total_tokens}")
```

### Accessing Worker Results

```python
# WorkflowResult contains results from all blocks
result = await runner.run("Query")

for worker in result.worker_results:
    print(f"Worker: {worker.worker_id}")
    print(f"Query: {worker.query}")
    print(f"Response: {worker.response}")
    print(f"Tokens: {worker.total_tokens}")
    print(f"Metadata: {worker.metadata}")
```

## Block Dependencies

In coordinator workflows, the planner creates a DAG with dependencies:

```python
# DAG nodes with dependencies
nodes = [
    DAGNode(block_id="data_fetch", depends_on=[]),
    DAGNode(block_id="analysis", depends_on=["data_fetch"]),
    DAGNode(block_id="report", depends_on=["analysis"])
]
```

The executor:
1. Identifies blocks with satisfied dependencies
2. Runs them in parallel
3. Passes results to dependent blocks
4. Repeats until all blocks complete

## Block Types

### Agent Block

Runs a full agent with tools and evaluation:

```yaml
block:
  - type: "agent"
    agent:
      id: "researcher"
      llm:
        provider: "openai"
        model: "gpt-4"
      capabilities:
        skills: ["web_search", "analysis"]
      tools:
        mode: "all"
```

### LLM Block

Simple LLM call with a prompt:

```yaml
block:
  - type: "llm"
    llm:
      provider: "openai"
      model: "gpt-4"
    prompt: "Summarize the following..."
```

### Tool Call Block

Direct tool execution:

```yaml
block:
  - type: "tool_call"
    tool: "search_web"
    arguments:
      query: "{input}"
```

## Coordinator Architecture

The `CoordinatorWorkflowRunner` uses three internal LLMs:

1. **Planner**: Creates DAG execution plan from available blocks
2. **Block Executors**: Run individual blocks (created per block)
3. **Synthesiser**: Combines worker results into final output

```python
# Internal structure
class CoordinatorWorkflowRunner:
    planner: AugmentedLLM      # Creates execution plan
    synthesiser: AugmentedLLM  # Combines results
    block_executors: dict      # Block ID → executor function
```

## Error Handling

Errors in individual blocks are captured and included in results:

```python
result = await runner.run("Query")

for worker in result.worker_results:
    if worker.metadata.get("status") == "error":
        print(f"Block {worker.worker_id} failed:")
        print(f"  Error: {worker.metadata.get('error')}")
```

Failed blocks:
- Return error message as response
- Are marked complete (to not block dependents)
- Pass error context to dependent blocks

## Token Tracking

Workflows aggregate token usage across all components:

```python
result = await runner.run("Query")

print(f"Total prompt tokens: {result.total_prompt_tokens}")
print(f"Total completion tokens: {result.total_completion_tokens}")
print(f"Total tokens: {result.total_tokens}")

# Detailed usage history
for event in result.usage_history:
    print(f"  {event.model}: {event.total_tokens} tokens")
```

## Factory Function

Use the factory to create the appropriate runner:

```python
from agent_runtime.workflow import create_workflow_runner

# Automatically selects runner based on coordination.type
runner = create_workflow_runner(workflow, model, debug=True)
```

- `coordination.type: "parallel"` → `CoordinatorWorkflowRunner`
- `coordination.type: "sequential"` → `SequentialWorkflowRunner`

## Context and State

Access the last execution context:

```python
runner = create_workflow_runner(workflow, model)
result = await runner.run("Query")

# Get last context (for debugging)
context = runner.last_context
print(f"Messages: {len(context.messages)}")

# For coordinator workflows, get worker messages
if hasattr(runner, 'get_worker_messages'):
    messages = runner.get_worker_messages("web_researcher")
```

## Best Practices

1. **Design Clear Block Boundaries**: Each block should have a focused responsibility
2. **Define Dependencies Carefully**: The coordinator infers dependencies from block descriptions
3. **Use Descriptive Names**: Block names help the coordinator understand purpose
4. **Monitor Token Usage**: Multi-agent workflows can consume significant tokens
5. **Add Evaluation for Quality**: Use evaluators on critical workflows

## Next Steps

- [Agents](/docs/agent-runtime/agents) - Single agent configuration
- [Configuration Reference](/docs/agent-runtime/configuration) - Complete workflow config options
- [Examples](/docs/agent-runtime/examples) - Workflow examples
