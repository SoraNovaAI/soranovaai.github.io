---
title: "Agents"
order: 1
category: "Concepts"
---

# Agents

The `Agent` class is the high-level interface for building AI agents in Agent Runtime. It provides a three-phase execution model with built-in evaluation loops and YAML-based configuration.

## Overview

An **Agent** is an autonomous system that can interpret user queries, plan actions, execute tasks using tools, and evaluate results. It leverages Large Language Models (LLMs) to understand and respond to complex requests.

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

---

## Configuration

### Agent Configuration

```yaml
id: "researcher"
description: "Conducts research on topics"
specialization_prompt: |
  You are a research specialist.
  Always cite sources and provide analysis.

capabilities:
  skills:
    - "web_search"
    - "data_analysis"

llm:
  provider: "openai"
  model: "gpt-4"

tools:
  mode: "all" # or "none" or list of tool names
  sources: # Optional: specify tool sources to load
    - type: "mcp"
      mcp_servers: "examples.configs.github.MCP_CONFIG" # Python path to MCP config

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
  model: "myapp.schemas.OutputModel" # Pydantic model path
```

**Loading Configuration:**

```python
from pathlib import Path
from agent_runtime import Agent, AgentConfig

config = AgentConfig.parse_config(Path("agent-config.yaml"))
agent = Agent(config=config)
result = await agent.run("Research quantum computing")
```

### Tools Configuration

**Access modes:**

```yaml
tools:
  mode: "all"  # Access all tools (python + mcp)
  # OR
  mode: "python_only"  # Only Python tools
  # OR
  mode: "mcp_only"  # Only MCP server tools
```

**Tool sources** customize behavior:

```yaml
tools:
  mode: "all"
  sources:
    - type: "mcp"
      mcp_servers: examples.configs.exa_remote.MCP_CONFIG
```

### Evaluation Configuration

Define quality criteria with DeepEval:

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

**How it works:**

1. Agent generates response
2. Evaluator assesses against metrics
3. If weighted score < threshold: inject feedback and retry
4. Loop until pass or `max_iteration` reached

### Structured Outputs

Return validated Pydantic models:

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

---

## Next Steps

- [Tools](/docs/agent-runtime/tools) - Learn about tool integration
- [Configuration Reference](/docs/agent-runtime/configuration) - Complete YAML options
- [Examples](/docs/agent-runtime/examples) - Usage patterns
- [AugmentedLLM](/docs/agent-runtime/augmented-llm) - Low-level execution engine (Advanced users only)
