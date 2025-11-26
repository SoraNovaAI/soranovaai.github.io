---
title: "User Guide"
order: 1
category: "Guides"
---

# Agent Runtime User Guide

Agent Runtime is a Python framework for building AI agents that can use tools, maintain context across conversations, and work together in workflows. This guide provides an overview of the framework and links to detailed documentation for each topic.

## Architecture Overview

```text
┌─────────────────────────────────────────┐
│              Your Application            │
├─────────────────────────────────────────┤
│     Agent (high-level facade)            │
│       ↓                                  │
│     AugmentedLLM (execution engine)      │
│       ↓                                  │
│     ToolClient (tool aggregation)        │
│       ↓                                  │
│     LLM Provider (OpenAI, etc.)          │
└─────────────────────────────────────────┘
```

The framework provides three main layers:

- **Agent Layer**: High-level interface for single-agent tasks with evaluation and quality assurance
- **Tool Layer**: Integration with local Python functions and remote MCP servers
- **Workflow Layer**: Orchestration of multiple agents working together

## Your First Agent

Here's a minimal agent that answers questions:

```python
import asyncio
from agent_runtime import create_agent
from agent_runtime.types.config import AgentConfig

config = AgentConfig(
    id="my-first-agent",
    description="A helpful assistant",
    specialization_prompt="You are a helpful assistant.",
    llm={
        "provider": "openai",
        "model": "gpt-4o-mini",
        "token_budget": 4000
    }
)

async def main():
    agent = create_agent(config)
    result = await agent.run("What are the benefits of type hints in Python?")
    print(result)

asyncio.run(main())
```

Enable debug mode to see the execution flow:

```python
agent = create_agent(config, debug=True)
```

---

## What's Next?

### Building Agents

Learn how to configure agents, choose LLM providers, and customize behavior.

- [Agents](/docs/agent-runtime/agents) - Agent configuration, capabilities, and how agents work

### Using Tools

Extend your agents with Python functions and MCP server tools.

- [MCP Servers Guide](/docs/agent-runtime/mcp-servers) - Tool integration via Model Context Protocol
- [Tools Concept](/docs/agent-runtime/tools) - Understanding tool architecture

### Common Patterns

Discover reusable patterns for building effective agents.

- [Patterns Guide](/docs/agent-runtime/patterns) - Research agents, data extraction, classification, and more

### Context & Evaluation

Manage long conversations and ensure quality outputs.

- [Best Practices Guide](/docs/agent-runtime/best-practices) - Context management, compaction strategies, and evaluation loops

### Multi-Agent Workflows

Orchestrate multiple agents working together on complex tasks.

- [Workflows Concept](/docs/agent-runtime/workflows) - Workflow structure and execution models

### Reference

- [Configuration Reference](/docs/agent-runtime/configuration) - Complete YAML configuration schema
- [API Reference](/docs/agent-runtime/api-reference) - Python API documentation
- [Troubleshooting](/docs/agent-runtime/troubleshooting) - Common errors and debugging techniques
- [Examples](/docs/agent-runtime/examples) - Working code samples
