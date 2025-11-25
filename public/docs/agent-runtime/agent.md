---
title: "Agent SDK"
order: 3
category: "Guides"
---

# Agent Runtime Agent SDK Guide

This guide covers the client-facing SDK in the `agent_runtime` package for building AI agents. The SDK combines LLM orchestration, tool management, and the Model Context Protocol (MCP) for production-ready single-agent execution.

## Document Scope

**This guide covers:**

- Agent capabilities
- Configuration and setup
- Tool integration patterns
- Context management and compaction
- Evaluation loops
- Usage examples

---

## Overview

Agent Runtime provides two main interfaces for building agents:

1. **`Agent`**: High-level facade with YAML configuration and evaluation loops
2. **`AugmentedLLM`**: Core LLM + tool execution engine with direct control

**Relationship**: `Agent` is a thin wrapper around `AugmentedLLM` that adds YAML-based configuration and evaluation loop integration. For advanced scenarios requiring fine-grained control, use `AugmentedLLM` directly. For standard agent workflows with configuration-driven setup, use `Agent`.

---

## Agent Capabilities

### Configuration-Driven Setup

**Agent** loads configuration from YAML files:

- **Specialization prompts**: Define agent role and behavior
- **LLM settings**: Model, token budgets
- **Tool configuration**: Control tool access and filters
- **Evaluation metrics**: Define quality criteria with DeepEval
- **Compaction strategy**: Automatic context management

### Evaluation Loops

Automatically refines responses based on quality criteria:

- **Think-act-evaluate cycle**: Generate → Evaluate → Retry if needed
- **DeepEval integration**: Multiple weighted metrics (accuracy, completeness, etc.)
- **Feedback injection**: LLM sees evaluation feedback and improves
- **Max iterations**: Configurable retry limit

### Structured Outputs

Type-safe responses via Pydantic models:

- **Custom return types**: Define output schema
- **Automatic validation**: Ensures schema compliance
- **Type hints**: Full IDE support and type checking

---

## Comparison: Agent vs AugmentedLLM

| Aspect | Agent | AugmentedLLM |
| ------ | ----- | ------------ |
| **Configuration** | YAML-based (`AgentConfig`) | Constructor params |
| **Evaluation** | Built-in DeepEval loops | None |
| **API Complexity** | Simplified facade | Explicit control |
| **Use Case** | Standard agent patterns | Advanced/custom workflows |
| **Tool Integration** | Configured via YAML | Direct `ToolClient` |
| **Context Management** | Automatic | Manual `RunContext` passing |
| **Error Handling** | High-level evaluation feedback | Low-level retry injection |
| **Type Safety** | Generic `T`, `S_co` (inherited) | Generic `T`, `S_co` |
| **Extensibility** | Limited to config options | Full control over execution |

### When to Use Each

**Use Agent when:**

- Standard agent workflows with evaluation
- YAML-based configuration preferred
- Built-in DeepEval integration needed
- Simplified API sufficient
- Rapid prototyping

**Use AugmentedLLM directly when:**

- Building custom agent frameworks
- Implementing non-standard evaluation loops
- Requiring fine-grained control over execution
- Integrating with existing orchestration systems
- Performance-critical scenarios needing optimization

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
  token_budget: 10000
  compaction:
    strategy: "summarization"  # or "greedy"
    max_context_tokens: 512000
    target_ratio: 0.8

tools:
  mode: "all"  # or "none" or list of tool names
  sources:  # Optional: specify tool sources to load
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
  model: "myapp.schemas.OutputModel"  # Pydantic model path
```

**Loading Configuration:**

```python
from pathlib import Path
from agent_runtime import Agent, AgentConfig

config = AgentConfig.parse_config(Path("agent-config.yaml"))
agent = Agent(config=config)
result = await agent.run("Research quantum computing")
```

### Context Compaction

Automatically manages token budgets when conversations grow:

**Strategies:**

1. **Greedy**: Removes oldest messages (fast, no LLM cost)
2. **Summarization**: Compresses middle section via LLM (preserves context, adds cost)

**Configuration:**

```yaml
llm:
  compaction:
    strategy: "summarization"
    max_context_tokens: 512000  # Trigger threshold
    target_ratio: 0.8  # Compact to 80% of max
    preserve_system: true
    preserve_recent: 3  # Keep last 3 exchanges
```

**Trigger**: Activates when context exceeds `max_context_tokens`.

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

## Related Documentation

### Core Documentation

- [Context Compaction](/docs/agent-runtime/context-compaction) - Compaction strategies

### Additional Resources

- [Examples](/docs/agent-runtime/examples) - Usage patterns
