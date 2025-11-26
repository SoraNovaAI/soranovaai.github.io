---
title: "AugmentedLLM"
order: 3
category: "Concepts"
---

# AugmentedLLM

`AugmentedLLM` is the core execution engine in Agent Runtime that orchestrates LLM interactions with tool execution. It provides the foundational loop: call LLM → execute tools → call LLM → repeat until complete.

## Overview

While `Agent` provides a high-level facade with YAML configuration and evaluation loops, `AugmentedLLM` offers direct control over the execution engine for advanced use cases.

### Key Characteristics

- **Role**: Low-level LLM + tool orchestration engine
- **Configuration**: Constructor parameters (programmatic)
- **Evaluation**: None (Agent layer adds this)
- **Use Case**: Advanced scenarios requiring fine-grained control

### Relationship to Agent

```
Agent                             AugmentedLLM
├─ YAML configuration parsing  →  Direct constructor params
├─ Evaluation loops            →  No evaluation
├─ Simplified API              →  Full control API
└─ delegates to ───────────────→  Core execution engine
```

## Basic Usage

```python
from agent_runtime.agent.augmented_llm import AugmentedLLM
from agent_runtime.agent.llm_client import OpenAILLMClient

llm = AugmentedLLM(
    name="assistant",
    model_name="gpt-4",
    model=OpenAILLMClient(),
    instructions=["You are a helpful assistant."]
)

result = await llm.run("What is the capital of France?")
print(result)  # "The capital of France is Paris."
```

## Execution Flow

```
User Query
    ↓
AugmentedLLM.run()
    ↓
list_tools() ──→ ToolClient (discover available tools)
    ↓
┌─────────────────────────────────┐
│ Loop until no tool calls:       │
│                                 │
│ call_model() ──→ LLM API        │
│     ↓                           │
│ Check for tool calls            │
│     ↓                           │
│ _call_tools() (parallel)        │
│     ↓                           │
│ Append results to context       │
│     ↓                           │
└──────┬──────────────────────────┘
       │
       ↓
_call_last_tool() ──→ on_end() callback (if configured)
    ↓
Return typed result (S_co)
```

## Constructor Parameters

```python
AugmentedLLM(
    name: str,                    # Identifier for this instance
    model_name: str,              # LLM model (e.g., "gpt-4")
    model: LLMClient,             # Configured LLM client
    input_type: type[T] = None,   # Expected input type
    instructions: Sequence[str],  # System instructions
    tools: list[Tool] = None,     # Local tools to register
    tool_choice: str = "auto",    # Tool selection strategy
    on_end: Tool = None,          # Output processing callback
    tools_config: ToolsConfig,    # Tool filtering config
    compaction_config: CompactionConfig,  # Context management
    debug: bool = False           # Enable debug logging
)
```

### Tool Choice Options

- `"auto"`: Model decides when to use tools (zero or more)
- `"required"`: Model must use a tool (one or more)
- `"none"`: Model cannot use tools

## RunContext

`RunContext` maintains conversation state across multiple runs:

```python
from agent_runtime.types.context import RunContext

context = RunContext()

# First query
result1 = await llm.run("Hello!", context=context)

# Second query (maintains history)
result2 = await llm.run("What did I just say?", context=context)

# Inspect context
print(f"Messages: {len(context.messages)}")
print(f"Tokens used: {context.total_tokens}")
print(f"Compaction history: {context.compaction_history}")
```

### RunContext Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `messages` | list | Conversation history |
| `estimated_tokens` | int | Estimated token count |
| `total_tokens` | int | Actual tokens used |
| `total_prompt_tokens` | int | Prompt tokens used |
| `total_completion_tokens` | int | Completion tokens used |
| `compaction_history` | list | Record of compaction events |
| `err_context` | ErrorContext | Error tracking for retries |

## Structured Outputs

Use the `on_end` parameter for type-safe outputs:

```python
from pydantic import BaseModel
from agent_runtime.tool import OutputTool

class WeatherReport(BaseModel):
    city: str
    temperature: float
    conditions: str

llm = AugmentedLLM(
    name="weather_agent",
    model_name="gpt-4",
    model=OpenAILLMClient(),
    instructions=["You provide weather information."],
    on_end=OutputTool(WeatherReport, prompt="Extract weather data")
)

result: WeatherReport = await llm.run("Weather in Tokyo?")
print(f"Temperature: {result.temperature}F")
```

## Context Compaction

Automatically manages token budgets when conversations grow:

```python
from agent_runtime.types.config import CompactionConfig

llm = AugmentedLLM(
    name="assistant",
    model_name="gpt-4",
    model=OpenAILLMClient(),
    instructions=["You are helpful."],
    compaction_config=CompactionConfig(
        strategy="summarization",
        max_context_tokens=512000,
        target_ratio=0.8,
        preserve_system=True,
        preserve_recent=3
    )
)
```

### Compaction Strategies

| Strategy | Description | Best For |
|----------|-------------|----------|
| `greedy` | Removes oldest messages | Fast, no LLM cost |
| `summarization` | Compresses via LLM | Preserves context |
| `sliding_window` | Keeps recent N messages | Simple conversations |
| `hybrid` | Combines strategies | Complex scenarios |

## Parallel Tool Execution

When the LLM requests multiple tool calls, they execute concurrently:

```python
# If LLM calls get_weather("NYC") and get_weather("LA") simultaneously,
# both run in parallel for faster execution
```

Tool results are aggregated and appended to the conversation context.

## Error Handling and Retries

AugmentedLLM includes built-in retry logic:

```python
from agent_runtime.types.errors import RetryBudgetExceeded

try:
    result = await llm.run("Complex query")
except RetryBudgetExceeded:
    print("Max retries exceeded")
```

Error handling flow:
1. Error is captured and injected into conversation
2. LLM sees error context and can adjust
3. Exponential backoff between retries
4. Stops after `max_retries` (default from settings)

## Type System

`AugmentedLLM` uses Python generics for type safety:

```python
class AugmentedLLM[T, S_co]:
    """
    T: Input type (query)
    S_co: Output type (covariant)
    """
```

- `T`: Input type passed to `run()` - typically `str` but can be any type
- `S_co`: Output type - `str` for plain text, `BaseModel` for structured outputs

## Performance Characteristics

**Optimization Strategies:**

1. **Parallel tool execution**: Reduces latency for multiple tool calls
2. **Streaming responses**: Enables early tool execution
3. **Tool discovery caching**: ToolClient caches tool list
4. **Lazy compaction**: Only compacts when near token limit

## Direct Model Access

For advanced scenarios, access the underlying methods:

```python
# Call model directly
response = await llm.call_model(context, "Your prompt", tools)

# List available tools
tools = await llm.list_tools()

# Clean up resources
llm.tear_down()
```

## When to Use AugmentedLLM

**Use AugmentedLLM when:**
- Building custom agent frameworks
- Implementing non-standard evaluation loops
- Requiring fine-grained control over execution
- Integrating with existing orchestration systems
- Performance-critical scenarios

**Use Agent instead when:**
- Standard agent workflows with evaluation
- YAML-based configuration preferred
- Built-in DeepEval integration needed

## Next Steps

- [Agents](/docs/agent-runtime/agents) - High-level Agent API
- [Tools](/docs/agent-runtime/tools) - Tool integration guide
- [API Reference](/docs/agent-runtime/api-reference) - Complete API documentation
