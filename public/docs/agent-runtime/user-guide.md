---
title: "User Guide"
order: 2
category: "Getting Started"
---

# Agent Runtime User Guide

This guide covers everything you need to build AI agents and multi-agent workflows with Agent Runtime.

## Table of Contents

- [Part 1: Getting Started](#part-1-getting-started)
- [Part 2: Building Agents](#part-2-building-agents)
- [Part 3: Managing Context](#part-3-managing-context)
- [Part 4: Quality Assurance](#part-4-quality-assurance)
- [Part 5: Multi-Agent Workflows](#part-5-multi-agent-workflows)
- [Part 6: Configuration Reference](#part-6-configuration-reference)
- [Part 7: Troubleshooting](#part-7-troubleshooting)

---

## Part 1: Getting Started

### What is Agent Runtime?

Agent Runtime is a Python framework for building AI agents that can use tools, maintain context across conversations, and work together in workflows. It provides:

- **Agent Layer**: High-level interface for single-agent tasks with evaluation and quality assurance
- **Tool Layer**: Integration with local Python functions and remote MCP servers
- **Workflow Layer**: Orchestration of multiple agents working together

### Architecture Overview

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

### Your First Agent

Here's a minimal agent that answers questions:

```python
import asyncio
from pathlib import Path
from agent_runtime import create_agent
from agent_runtime.types.config import AgentConfig

# Create configuration
config = AgentConfig(
    id="my-first-agent",
    description="A helpful assistant",
    specialization_prompt="You are a helpful assistant that provides clear, concise answers.",
    llm={
        "provider": "openai",
        "model": "gpt-4o-mini",
        "token_budget": 4000
    }
)

async def main():
    agent = create_agent(config)
    result = await agent.run("What are the benefits of using type hints in Python?")
    print(result)

asyncio.run(main())
```

### Understanding the Output

When you run an agent:

1. **Message sent to LLM**: Your query is formatted with the system prompt
2. **Tool calls (if any)**: The LLM may call tools to gather information
3. **Response generated**: Final response returned as a string (or structured type)

Enable debug mode to see the execution flow:

```python
agent = create_agent(config, debug=True)
```

---

## Part 2: Building Agents

### Agent Configuration

Agents can be configured via YAML files or Python code.

#### YAML Configuration

```yaml
# agent_config.yaml
id: "research-agent"
description: "Researches topics and provides summaries"
specialization_prompt: |
  You are a research assistant. When given a topic:
  1. Search for relevant information
  2. Synthesize findings into a clear summary
  3. Cite your sources

llm:
  provider: "openai"
  model: "gpt-4o"
  token_budget: 8000

tools:
  mode: "all"
  sources:
    - type: "python"
      tool: "myproject.tools.search_web"
    - type: "mcp"
      mcp_servers: "myproject.configs.mcp_servers.MCP_CONFIG"
```

Load it with:

```python
from pathlib import Path
from agent_runtime.types.config import AgentConfig

config = AgentConfig.parse_config(Path("agent_config.yaml"))
```

#### Python Configuration

```python
from agent_runtime.types.config import AgentConfig

config = AgentConfig(
    id="research-agent",
    description="Researches topics and provides summaries",
    specialization_prompt="You are a research assistant...",
    llm={
        "provider": "openai",
        "model": "gpt-4o",
        "token_budget": 8000
    },
    tools={
        "mode": "all",
        "sources": [
            {"type": "python", "tool": "myproject.tools.search_web"}
        ]
    }
)
```

### LLM Providers

Agent Runtime supports multiple LLM providers through OpenAI-compatible APIs.

#### OpenAI

```python
from agent_runtime.types.config import OpenAILLMConfig

llm_config = OpenAILLMConfig(
    model="gpt-4o",
    token_budget=8000,
    api_key="sk-..."  # Or set OPENAI_API_KEY env var
)

agent = create_agent(config, llm_config=llm_config)
```

#### Anthropic

```python
from agent_runtime.types.config import AnthropicLLMConfig

llm_config = AnthropicLLMConfig(
    model="claude-3-5-sonnet-20241022",
    token_budget=8000,
    api_key="sk-ant-..."  # Or set ANTHROPIC_API_KEY env var
)

agent = create_agent(config, llm_config=llm_config)
```

#### Ollama (Local Models)

```python
from agent_runtime.types.config import OllamaLLMConfig

llm_config = OllamaLLMConfig(
    model="llama3.1:70b",
    token_budget=4000,
    base_url="http://localhost:11434/v1"
)

agent = create_agent(config, llm_config=llm_config)
```

#### Other Providers

Use `OpenAILLMConfig` with a custom `base_url` for OpenAI-compatible providers:

```python
# Together AI
llm_config = OpenAILLMConfig(
    model="meta-llama/Llama-3-70b-chat-hf",
    token_budget=4000,
    base_url="https://api.together.xyz/v1",
    api_key="your-together-api-key"
)

# Groq
llm_config = OpenAILLMConfig(
    model="llama-3.1-70b-versatile",
    token_budget=4000,
    base_url="https://api.groq.com/openai/v1",
    api_key="your-groq-api-key"
)
```

### Tool Integration

Tools allow agents to interact with external systems, fetch data, and perform actions.

#### Local Python Tools

Use the `@to_tool` decorator to convert Python functions into tools:

```python
from agent_runtime import to_tool
from pathlib import Path

@to_tool
def read_file(path: str) -> str:
    """Read the contents of a file.

    Args:
        path: The file path to read

    Returns:
        The file contents as a string
    """
    return Path(path).read_text()

@to_tool
def search_database(query: str, limit: int = 10) -> list[dict]:
    """Search the database for matching records.

    Args:
        query: Search query string
        limit: Maximum number of results to return

    Returns:
        List of matching records
    """
    # Your database search implementation
    return [{"id": 1, "title": "Result", "score": 0.95}]
```

**Important**: The docstring is critical - it's what the LLM uses to understand when and how to use the tool. Include clear descriptions of parameters and return values.

Register tools in your configuration:

```yaml
tools:
  mode: "python_only"
  sources:
    - type: "python"
      tool: "myproject.tools.read_file"
    - type: "python"
      tool: "myproject.tools.search_database"
```

#### Remote MCP Servers

MCP (Model Context Protocol) servers provide tools via a standardized protocol. Configure them in a Python module:

```python
# configs/mcp_servers.py
MCP_CONFIG = {
    "mcpServers": {
        "github": {
            "command": "npx",
            "args": ["-y", "@modelcontextprotocol/server-github"],
            "env": {
                "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
            }
        },
        "brave-search": {
            "command": "npx",
            "args": ["-y", "@anthropic/server-brave-search"],
            "env": {
                "BRAVE_API_KEY": "${BRAVE_API_KEY}"
            }
        }
    }
}
```

Reference it in your agent config:

```yaml
tools:
  mode: "mcp_only"
  sources:
    - type: "mcp"
      mcp_servers: "myproject.configs.mcp_servers.MCP_CONFIG"
```

#### Tool Modes

- `"all"`: Use both Python and MCP tools
- `"python_only"`: Only use local Python tools
- `"mcp_only"`: Only use MCP server tools

Tools are namespaced as `{server_name}__{tool_name}` to prevent conflicts.

### Structured Outputs

Return type-safe structured data using Pydantic models:

```python
from pydantic import BaseModel
from agent_runtime import create_agent
from agent_runtime.types.config import AgentConfig

class AnalysisResult(BaseModel):
    summary: str
    key_points: list[str]
    sentiment: str  # "positive", "negative", "neutral"
    confidence: float

config = AgentConfig(
    id="analyzer",
    description="Analyzes text and returns structured results",
    specialization_prompt="Analyze the given text and provide structured output.",
    llm={"provider": "openai", "model": "gpt-4o", "token_budget": 4000},
    on_end={
        "model": "myproject.models.AnalysisResult",
        "prompt": "Structure your analysis using the AnalysisResult schema."
    }
)

agent = create_agent(config)
result: AnalysisResult = await agent.run("Analyze this product review...")
print(f"Sentiment: {result.sentiment}, Confidence: {result.confidence}")
```

---

## Part 3: Managing Context

### Token Budgets

The `token_budget` in your LLM config controls how many tokens the agent can use per response. This affects:

- Response length
- Amount of context the LLM can consider
- Cost per request

```python
llm_config = OpenAILLMConfig(
    model="gpt-4o",
    token_budget=8000  # Max tokens for response
)
```

### Context Compaction

Long conversations can exceed the model's context window. Compaction strategies automatically manage this.

#### Greedy Compaction

Removes oldest messages first. Fast but loses context.

```python
from agent_runtime.types.config import CompactionConfig

compaction = CompactionConfig(
    strategy="greedy",
    max_context_tokens=128_000,
    target_ratio=0.8,
    preserve_system=True,
    preserve_recent=5
)
```

#### Summarization Compaction

Summarizes older messages. Slower but preserves context better.

```python
compaction = CompactionConfig(
    strategy="summarization",
    max_context_tokens=128_000,
    target_ratio=0.8,
    preserve_system=True,
    preserve_recent=3
)
```

#### Configuration Options

- `max_context_tokens`: Trigger compaction when context exceeds this
- `target_ratio`: Keep this percentage of tokens after compaction (0.0-1.0)
- `preserve_system`: Always keep the system prompt
- `preserve_recent`: Always keep the last N messages

#### Applying Compaction

```python
from agent_runtime.types.config import OpenAILLMConfig, CompactionConfig

llm_config = OpenAILLMConfig(
    model="gpt-4o",
    token_budget=8000,
    compaction=CompactionConfig(
        strategy="summarization",
        max_context_tokens=100_000,
        target_ratio=0.7,
        preserve_recent=5
    )
)

agent = create_agent(config, llm_config=llm_config)
```

### RunContext

`RunContext` maintains conversation state across multiple interactions:

```python
from agent_runtime.types.context import RunContext

context = RunContext()

# First interaction
result1 = await agent.run("What is machine learning?", context=context)

# Follow-up (agent remembers previous conversation)
result2 = await agent.run("Can you give me an example?", context=context)

# Check token usage
print(f"Estimated tokens: {context.estimated_tokens}")
print(f"Messages: {len(context.messages)}")
```

---

## Part 4: Quality Assurance

### Evaluation Loops

Agent Runtime can automatically evaluate responses and retry if they don't meet quality standards using DeepEval.

```yaml
# agent_config.yaml
id: "quality-agent"
description: "Agent with quality evaluation"
specialization_prompt: "Provide accurate, well-structured responses."

llm:
  provider: "openai"
  model: "gpt-4o"
  token_budget: 8000

evaluator:
  metrics:
    - name: "answer_relevancy"
      weight: 0.5
    - name: "faithfulness"
      weight: 0.3
    - name: "contextual_relevancy"
      weight: 0.2
  threshold: 0.7
  max_iteration: 3
```

### How Evaluation Works

1. Agent generates a response
2. Evaluator scores the response against metrics
3. If score < threshold, agent retries with feedback
4. Process repeats until threshold met or max_iteration reached

### Available Metrics

DeepEval provides various metrics:

- `answer_relevancy`: Is the answer relevant to the question?
- `faithfulness`: Is the answer faithful to the context?
- `contextual_relevancy`: Is the retrieved context relevant?
- `bias`: Does the answer contain bias?
- `toxicity`: Does the answer contain toxic content?

### Custom Thresholds

Set different thresholds per metric:

```yaml
evaluator:
  metrics:
    - name: "answer_relevancy"
      weight: 0.6
      threshold: 0.8  # Stricter threshold for relevancy
    - name: "faithfulness"
      weight: 0.4
      threshold: 0.6
  max_iteration: 3
```

---

## Part 5: Multi-Agent Workflows

### When to Use Workflows

Use workflows when:

- Task requires multiple specialized agents
- Different perspectives needed on same input
- Complex tasks benefit from divide-and-conquer
- You need approval or review stages

### Workflow Structure

Workflows consist of **blocks**, which contain **tasks**:

```yaml
# workflow.yaml
id: "research-workflow"
description: "Multi-agent research pipeline"

blocks:
  - id: "research"
    description: "Gather information on the topic"
    tasks:
      - type: "agent"
        agent_config: "configs/researcher.yaml"

  - id: "analyze"
    description: "Analyze the research findings"
    tasks:
      - type: "agent"
        agent_config: "configs/analyst.yaml"

  - id: "synthesize"
    description: "Create final report"
    tasks:
      - type: "agent"
        agent_config: "configs/writer.yaml"
```

### Execution Models

#### Coordinator Workflow

A coordinator agent decides which blocks to run and in what order:

```python
from agent_runtime.workflow import CoordinatorWorkflowRunner
from agent_runtime.types.config import Workflow
from pathlib import Path

config = Workflow.parse_config(Path("workflow.yaml"))
runner = CoordinatorWorkflowRunner(config)
result = await runner.run("Research the impact of AI on healthcare")
```

The coordinator sees each block as a tool and intelligently orchestrates them.

#### Sequential Workflow

All blocks run in order:

```python
from agent_runtime.workflow import SequentialWorkflowRunner

runner = SequentialWorkflowRunner(config)
result = await runner.run("Research the impact of AI on healthcare")
```

### Task Types

#### Agent Task

Run an agent:

```yaml
tasks:
  - type: "agent"
    agent_config: "configs/my_agent.yaml"
```

#### Tool Call Task

Call a specific tool directly:

```yaml
tasks:
  - type: "tool_call"
    tool_name: "search_database"
    arguments:
      query: "{{ input }}"
      limit: 10
```

#### Exec Task

Run a shell command:

```yaml
tasks:
  - type: "exec"
    command: "python scripts/process_data.py"
```

### Error Handling

Use `rescue` and `always` blocks for error handling:

```yaml
blocks:
  - id: "risky-operation"
    description: "Operation that might fail"
    tasks:
      - type: "agent"
        agent_config: "configs/risky_agent.yaml"
    rescue:
      - type: "agent"
        agent_config: "configs/fallback_agent.yaml"
    always:
      - type: "exec"
        command: "python scripts/cleanup.py"
```

---

## Part 6: Configuration Reference

### Environment Variables

#### Core Variables

| Variable | Description | Default |
| -------- | ----------- | ------- |
| `OPENAI_API_KEY` | OpenAI API key | Required for OpenAI |
| `ANTHROPIC_API_KEY` | Anthropic API key | Required for Anthropic |

#### LLM Configuration

| Variable | Description | Default |
| -------- | ----------- | ------- |
| `ART_LLM_TIMEOUT_MS` | Request timeout in milliseconds | `30000` |
| `ART_LLM_MAX_RETRIES` | Maximum retry attempts | `3` |
| `ART_LLM_RETRY_DELAY_MS` | Initial backoff delay in milliseconds | `1000` |
| `ART_LLM_RATE_LIMIT_RPM` | Requests per minute cap | None |

#### MCP Configuration

| Variable | Description | Default |
| -------- | ----------- | ------- |
| `ART_MCP_SESSION_TIMEOUT_S` | Session idle timeout in seconds | `60` |
| `ART_MCP_STARTUP_TIMEOUT_S` | Server startup timeout in seconds | `5` |
| `ART_MCP_MAX_RETRIES` | Maximum retries for tool calls | `1` |
| `ART_MCP_CONCURRENCY_LIMIT` | Max concurrent tool executions | `25` |
| `ART_MCP_READ_TIMEOUT_S` | Read timeout in seconds | None |

#### Agent Configuration

| Variable | Description | Default |
| -------- | ----------- | ------- |
| `ART_AGENT_MAX_RETRIES` | Max retries for evaluation loop | `5` |

### Agent Config Schema

```yaml
# Required fields
id: string                    # Unique identifier
description: string           # Human-readable description
specialization_prompt: string # System prompt for the agent

# LLM configuration
llm:
  provider: string           # "openai", "anthropic", "ollama"
  model: string              # Model identifier
  token_budget: integer      # Max tokens for response
  compaction:                # Optional context compaction
    strategy: string         # "greedy", "summarization"
    max_context_tokens: integer
    target_ratio: float
    preserve_system: boolean
    preserve_recent: integer

# Tool configuration
tools:
  mode: string               # "all", "python_only", "mcp_only"
  sources:
    - type: string           # "python" or "mcp"
      tool: string           # For python: module.path.to.function
      mcp_servers: string    # For mcp: module.path.to.CONFIG
  filter: list[string]       # Optional tool whitelist

# Evaluation configuration
evaluator:
  metrics:
    - name: string
      weight: float
      threshold: float       # Optional per-metric threshold
  threshold: float           # Global threshold
  max_iteration: integer

# Structured output
on_end:
  model: string              # Module path to Pydantic model
  prompt: string             # Instructions for structuring output
```

### Common Configuration Patterns

#### High-Quality Research Agent

```yaml
id: "research-agent"
description: "Thorough research agent"
specialization_prompt: |
  You are a meticulous research assistant. Always:
  - Verify information from multiple sources
  - Cite your sources
  - Acknowledge uncertainty

llm:
  provider: "openai"
  model: "gpt-4o"
  token_budget: 8000
  compaction:
    strategy: "summarization"
    max_context_tokens: 100000
    preserve_recent: 5

evaluator:
  metrics:
    - name: "faithfulness"
      weight: 0.6
    - name: "answer_relevancy"
      weight: 0.4
  threshold: 0.8
  max_iteration: 3
```

#### Fast Classification Agent

```yaml
id: "classifier"
description: "Quick classification agent"
specialization_prompt: "Classify the input into the appropriate category."

llm:
  provider: "openai"
  model: "gpt-4o-mini"
  token_budget: 1000

on_end:
  model: "myproject.models.Classification"
  prompt: "Return the classification result."
```

#### Local Development Agent

```yaml
id: "local-agent"
description: "Agent using local Ollama"
specialization_prompt: "You are a helpful assistant."

llm:
  provider: "ollama"
  model: "llama3.1:8b"
  token_budget: 2000
```

---

## Part 7: Troubleshooting

### Common Errors

#### "OPENAI_API_KEY not found"

**Cause**: API key not set in environment

**Solution**:

```bash
export OPENAI_API_KEY="sk-..."
```

Or pass it explicitly:

```python
llm_config = OpenAILLMConfig(
    model="gpt-4o",
    token_budget=4000,
    api_key="sk-..."
)
```

#### "Tool execution failed"

**Cause**: Tool raised an exception

**Solution**: Check your tool implementation for errors. Enable debug mode:

```python
agent = create_agent(config, debug=True)
```

#### "Context window exceeded"

**Cause**: Conversation too long for model

**Solution**: Enable compaction:

```python
compaction = CompactionConfig(
    strategy="summarization",
    max_context_tokens=100000,
    preserve_recent=3
)
```

#### "MCP server failed to start"

**Cause**: MCP server binary not found or crashed

**Solution**:

1. Verify the command exists: `npx -y @modelcontextprotocol/server-github`
2. Check environment variables are set
3. Increase startup timeout: `ART_MCP_STARTUP_TIMEOUT_S=10`

#### "Import error for tool"

**Cause**: Python module path incorrect

**Solution**: Ensure the tool path is importable:

```python
# Test it
from myproject.tools import search_web
```

### Debugging Techniques

#### Enable Debug Mode

```python
agent = create_agent(config, debug=True)
```

This shows:

- Messages sent to LLM
- Tool calls and results
- Context compaction events

#### Inspect Context

```python
context = RunContext()
result = await agent.run("Your query", context=context)

# Check state
print(f"Messages: {len(context.messages)}")
print(f"Tokens: {context.estimated_tokens}")
print(f"Compaction events: {len(context.compaction_history)}")
```

#### Use Structured Logging

Agent Runtime uses structlog. Configure it for debugging:

```python
import structlog
structlog.configure(
    processors=[
        structlog.dev.ConsoleRenderer()
    ],
    wrapper_class=structlog.make_filtering_bound_logger(logging.DEBUG),
)
```

### Best Practices

#### Prompt Engineering

- Be specific about desired output format
- Include examples in the system prompt
- Specify constraints and limitations
- Use clear, unambiguous language

#### Tool Design

- Write comprehensive docstrings
- Use type hints for all parameters
- Return structured data (dicts, lists) over raw strings
- Handle errors gracefully with informative messages

#### Token Management

- Start with smaller budgets and increase as needed
- Use compaction for long conversations
- Monitor `context.estimated_tokens` to track usage

#### Error Handling

```python
from agent_runtime.types.errors import ToolCallError, RetryBudgetExceeded

try:
    result = await agent.run("Your query")
except ToolCallError as e:
    print(f"Tool failed: {e}")
except RetryBudgetExceeded as e:
    print(f"Max retries exceeded: {e}")
```

---

## Next Steps

- Review the [Examples](/docs/agent-runtime/examples) for more code samples
- Understand [Context Compaction](/docs/agent-runtime/context-compaction) strategies
- See the [Developer Guide](/docs/agent-runtime/developer-guide) if you want to extend Agent Runtime
