---
title: "Introduction"
order: 1
category: "Getting Started"
---

# Agent Runtime

Agent Runtime is a Python framework for building AI agents with tool integration, multi-agent workflows, and evaluation loops.

## What Makes Agent Runtime Different

- **Multi-Agent Workflows** - Coordinate multiple specialist agents with intelligent task delegation
- **MCP Integration** - Native tool discovery via Model Context Protocol
- **Evaluation Loops** - Built-in quality assessment with automatic retry on failure
- **Context Management** - Automatic context compaction for long conversations
- **YAML Configuration** - Declarative agent and workflow definitions

## Quick Start

### Requirements

- Python 3.13+
- OpenAI API key (or other LLM provider)

### Installation

```bash
pip install nova-agent-runtime
```

### Environment Variables

Set your LLM provider API key:

```bash
export OPENAI_API_KEY="your-api-key-here"
# OR
export ANTHROPIC_API_KEY="your-api-key-here"
```

### Your First Agent

```python
import asyncio
from pathlib import Path
from agent_runtime import AgentConfig, create_agent

# Load agent config from YAML file
config = AgentConfig.parse_config(Path("agent_config.yaml"))

# Create agent using factory function
agent = create_agent(config, debug=True)

# Run the agent
result = asyncio.run(agent.run("Hello!"))
print(result)
```

**Minimal agent_config.yaml:**

```yaml
id: "minimal_agent"
description: "A minimal agent with no tools"
llm:
  provider: "openai"
  model: "gpt-4.1-mini"
  token_budget: 4000
```

## Key Features

### Tool Integration

Native MCP support with automatic tool discovery, plus local Python tools via `@to_tool` decorator.

### Evaluation & Quality

Built-in evaluation loops with DeepEval integration for automatic quality assessment and retry on failure.

## Architecture

Agent Runtime provides a layered architecture for building AI agents:

**Agent Layer** - Core agent functionality:

- `Agent` - High-level agent with three-phase execution: PLAN → ACT → EVALUATE
  - **PLAN**: Planner LLM creates execution plans for complex tasks
  - **ACT**: Executor LLM executes steps with tool calls
  - **EVALUATE**: Synthesiser produces output, evaluator assesses quality
- `AugmentedLLM` - Low-level LLM + tool execution primitive
- `RunContext` - Conversation history and state management

**Tool Layer** - Tool integration:

- `ToolClient` - Multi-server tool aggregation
- `@to_tool` - Decorator for local Python functions
- MCP support for remote tool servers

**Workflow Layer** - Multi-agent coordination:

- `CoordinatorWorkflowRunner` - Intelligent task delegation
- `SequentialWorkflowRunner` - Sequential block execution

## Use Cases

- **Research Workflows**: Multi-agent systems for comprehensive research and analysis
- **Tool-Augmented Agents**: Agents with access to web search, file systems, APIs
- **Quality-Assured Responses**: Evaluation loops for consistent output quality
- **Complex Task Decomposition**: Coordinator agents delegating to specialists

## Next Steps

- [User Guide](/docs/agent-runtime/user-guide) - Complete guide to building agents
- [Patterns](/docs/agent-runtime/patterns) - Common patterns and best practices
- [Examples](/docs/agent-runtime/examples) - Code examples and use cases
