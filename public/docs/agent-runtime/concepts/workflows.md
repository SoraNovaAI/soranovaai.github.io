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
from agent_runtime.types.config import Workflow

# Load workflow configuration
workflow = Workflow.parse_config(Path("workflow.yaml"))

# Create and run workflow
runner = create_workflow_runner(workflow)
result = await runner.run("Research the latest AI developments")

# Access results from each block
for worker_result in result.worker_results:
    print(f"{worker_result.worker_id}: {worker_result.response}")
```

## Block Dependencies

In coordinator workflows, the planner automatically creates a DAG (Directed Acyclic Graph) with dependencies based on block descriptions. The executor:

1. Identifies blocks with satisfied dependencies
2. Runs them in parallel where possible
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

## Error Handling

Failed blocks in a workflow:

- Return error message as response
- Are marked complete (to not block dependents)
- Pass error context to dependent blocks

The workflow continues execution even if individual blocks fail, allowing partial results to be collected.

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
