---
title: "Agents"
order: 1
category: "Concepts"
---

# Agents

The `Agent` class is the high-level interface for building AI agents in Agent Runtime. It provides a three-phase execution model with built-in evaluation loops and YAML-based configuration.

## Overview

Agent Runtime provides two main interfaces:

1. **`Agent`**: High-level facade with YAML configuration and evaluation loops
2. **`AugmentedLLM`**: Core LLM + tool execution engine with direct control

**Relationship**: `Agent` wraps `AugmentedLLM` and adds YAML-based configuration and evaluation loop integration. For standard agent workflows, use `Agent`. For advanced scenarios requiring fine-grained control, use `AugmentedLLM` directly.

## Three-Phase Execution Model

The Agent executes tasks using a **PLAN → ACT → EVALUATE** cycle:

```
User Query
    ↓
┌─────────────────────────────────┐
│  PLAN: Planner LLM creates      │
│        execution plan           │
└─────────────┬───────────────────┘
              ↓
┌─────────────────────────────────┐
│  ACT: Executor LLM runs steps   │
│       using available tools     │
└─────────────┬───────────────────┘
              ↓
┌─────────────────────────────────┐
│  EVALUATE: Synthesiser produces │
│            output, evaluator    │
│            assesses quality     │
└─────────────┬───────────────────┘
              ↓
    Pass? → Return result
    Fail? → Retry with feedback
```

### Phase Details

1. **PLAN Phase**: The planner LLM analyzes the query and creates an execution plan with specific, actionable steps.

2. **ACT Phase**: The executor LLM works through each step in the plan, using available tools to complete tasks.

3. **EVALUATE Phase**: The synthesiser produces the final output. If an evaluator is configured, it assesses quality and can trigger retries with feedback.

## Basic Usage

```python
import asyncio
from pathlib import Path
from agent_runtime import AgentConfig, create_agent

# Load configuration from YAML
config = AgentConfig.parse_config(Path("agent_config.yaml"))

# Create agent using factory function
agent = create_agent(config, debug=True)

# Run the agent
result = asyncio.run(agent.run("Research quantum computing advances"))
print(result)
```

## Configuration

Agents are configured via YAML files:

```yaml
id: "researcher"
description: "Conducts research on topics"
specialization_prompt: |
  You are a research specialist.
  Always cite sources and provide analysis.

llm:
  provider: "openai"
  model: "gpt-4"
  token_budget: 10000
  compaction:
    strategy: "summarization"
    max_context_tokens: 512000
    target_ratio: 0.8

tools:
  mode: "all"
  sources:
    - type: "mcp"
      mcp_servers: "examples.configs.github.MCP_CONFIG"

evaluator:
  type: deepeval
  max_iteration: 3
  deepeval:
    llm:
      model: "gpt-4-mini"
    metrics:
      correctness:
        weight: 1.0
        threshold: 0.7
        criteria: "Evaluate factual accuracy"

on_end:
  model: "myapp.schemas.OutputModel"
```

See the [Configuration Reference](/docs/agent-runtime/configuration) for complete options.

## Evaluation Loops

The evaluation system automatically refines responses based on quality criteria:

1. Agent generates a response
2. Evaluator assesses against configured metrics
3. If weighted score < threshold: inject feedback and retry
4. Loop until pass or `max_iteration` reached

```yaml
evaluator:
  type: deepeval
  max_iteration: 3
  deepeval:
    llm:
      model: "gpt-4-mini"
    metrics:
      accuracy:
        weight: 0.5
        threshold: 0.8
        criteria: "Evaluate factual accuracy"
        evaluation_steps:
          - "Verify claims with sources"
          - "Check for speculation"
      completeness:
        weight: 0.5
        threshold: 0.7
        criteria: "Evaluate data completeness"
```

## Structured Outputs

Return validated Pydantic models instead of plain text:

```yaml
on_end:
  model: "myapp.schemas.CompanyData"
  prompt: "Extract all company information"
```

```python
from pydantic import BaseModel

class CompanyData(BaseModel):
    name: str
    founded_year: int
    employees: int
    revenue_usd: float | None

# Agent returns typed result
result: CompanyData = await agent.run("Research Anthropic")
print(f"Founded: {result.founded_year}")
```

## Context Management

Use `RunContext` to maintain conversation state across multiple runs:

```python
from agent_runtime.types.context import RunContext

context = RunContext()

# First query
result1 = await agent.run("What is quantum computing?", context=context)

# Follow-up query (remembers previous context)
result2 = await agent.run("How does it relate to cryptography?", context=context)

# Check token usage
print(f"Total tokens used: {context.total_tokens}")
```

## When to Use Agent vs AugmentedLLM

| Aspect | Agent | AugmentedLLM |
| ------ | ----- | ------------ |
| **Configuration** | YAML-based | Constructor params |
| **Evaluation** | Built-in DeepEval loops | None |
| **API Complexity** | Simplified facade | Explicit control |
| **Use Case** | Standard agent patterns | Advanced/custom workflows |

**Use Agent when:**
- Standard agent workflows with evaluation
- YAML-based configuration preferred
- Built-in DeepEval integration needed
- Rapid prototyping

**Use AugmentedLLM when:**
- Building custom agent frameworks
- Implementing non-standard evaluation loops
- Requiring fine-grained control over execution
- Performance-critical scenarios

## Next Steps

- [Tools](/docs/agent-runtime/tools) - Learn about tool integration
- [AugmentedLLM](/docs/agent-runtime/augmented-llm) - Low-level execution engine
- [Configuration Reference](/docs/agent-runtime/configuration) - Complete YAML options
