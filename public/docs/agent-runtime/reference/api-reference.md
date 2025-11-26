---
title: "API Reference"
order: 1
category: "Reference"
---

# API Reference

This reference documents the core public APIs of Agent Runtime.

## Core Classes

### Agent

```python
class Agent[T: BaseModel | None = None, S_co: BaseModel | str = str]
```

High-level agent that orchestrates planning, execution, and evaluation using a three-phase architecture: PLAN → ACT → EVALUATE.

**Constructor:**

```python
Agent(
    config: AgentConfig,
    model: LLMClient,
    *,
    input_type: type[T] | None = None,
    debug: bool = False
)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `config` | `AgentConfig` | Agent configuration with LLM settings and tools |
| `model` | `LLMClient` | LLM client for API calls |
| `input_type` | `type[T]` | Optional input type for type safety |
| `debug` | `bool` | Enable debug logging |

**Methods:**

```python
async def run(
    query: str,
    input: T | None = None,
    context: RunContext[T] | None = None
) -> S_co
```

Execute the agent with a query. Returns the result as string or structured output.

**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `last_context` | `RunContext[T] | None` | The most recent execution context |

---

### AugmentedLLM

```python
class AugmentedLLM[T: BaseModel | None = None, S_co: BaseModel | str = str]
```

Core LLM + tool execution engine that orchestrates LLM interactions with MCP tool support.

**Constructor:**

```python
AugmentedLLM(
    name: str,
    model_name: str,
    model: LLMClient,
    *,
    input_type: type[T] | None = None,
    instructions: Sequence[str] | None = None,
    tools: list[Tool] | None = None,
    tool_choice: ChatCompletionToolChoiceOptionParam | None = None,
    on_end: Tool[BaseModel] | None = None,
    tools_config: ToolsConfig | None = None,
    compaction_config: CompactionConfig | None = None,
    debug: bool = False
)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | `str` | Unique identifier for this instance |
| `model_name` | `str` | LLM model to use (e.g., "gpt-4") |
| `model` | `LLMClient` | Configured LLM client |
| `input_type` | `type[T]` | Expected input type |
| `instructions` | `Sequence[str]` | System instructions |
| `tools` | `list[Tool]` | Local tools to register |
| `tool_choice` | `str | dict` | Tool selection strategy: "auto", "required", "none" |
| `on_end` | `Tool` | Callback for structured output |
| `tools_config` | `ToolsConfig` | Tool filtering configuration |
| `compaction_config` | `CompactionConfig` | Context compaction settings |
| `debug` | `bool` | Enable debug logging |

**Methods:**

```python
async def run(
    user_prompt: str = "",
    input: T | None = None,
    context: RunContext[T] | None = None,
    tool_choice: ChatCompletionToolChoiceOptionParam | None = None
) -> S_co
```

Execute the agent with a user prompt.

```python
async def call_model(
    context: RunContext[T],
    prompt: str | None = None,
    tools: ListToolsResult | None = None,
    tool_choice: ChatCompletionToolChoiceOptionParam | None = None
) -> ChatCompletionAssistantMessageParam
```

Call the LLM directly with current context.

```python
async def list_tools() -> ListToolsResult
```

List all available tools from the client.

```python
def tear_down() -> None
```

Clean up resources and close connections.

---

### RunContext

```python
class RunContext[T: BaseModel | None = None]
```

Maintains conversation state across multiple LLM runs.

**Attributes:**

| Attribute | Type | Description |
|-----------|------|-------------|
| `messages` | `list` | Conversation message history |
| `input` | `T | None` | Typed input data |
| `estimated_tokens` | `int` | Estimated token count |
| `total_tokens` | `int` | Actual total tokens used |
| `total_prompt_tokens` | `int` | Prompt tokens used |
| `total_completion_tokens` | `int` | Completion tokens used |
| `compaction_history` | `list` | Record of compaction events |
| `err_context` | `ErrorContext | None` | Error tracking for retries |
| `max_retries` | `int` | Maximum retry attempts |
| `run_id` | `str` | Unique run identifier |

**Usage:**

```python
context = RunContext()
result1 = await llm.run("First query", context=context)
result2 = await llm.run("Follow-up", context=context)  # Maintains history
```

---

### ToolClient

```python
class ToolClient
```

Client for discovering and calling tools from multiple MCP servers.

**Constructor:**

```python
ToolClient(
    toolset_clients: ToolsetStore | None = None,
    tools_config: ToolsConfig | None = None
)
```

**Methods:**

```python
async def list_tools(cursor: str | None = None) -> ListToolsResult
```

List all available tools from connected servers.

```python
async def call_tool(
    name: str,
    arguments: dict[str, Any] | None = None,
    read_timeout_seconds: timedelta | None = None,
    progress_callback: ProgressFnT | None = None
) -> CallToolResult
```

Execute a tool by its namespaced name.

```python
def tear_down() -> None
```

Close all underlying MCP client connections.

---

## Factory Functions

### create_agent

```python
def create_agent[T: BaseModel | None = None, S_co: BaseModel | str = str](
    config: AgentConfig,
    llm_config: LLMConfig | None = None,
    *,
    input_type: type[T] | None = None,
    debug: bool = False
) -> Agent[T, S_co]
```

Factory function to create an Agent from configuration.

| Parameter | Type | Description |
|-----------|------|-------------|
| `config` | `AgentConfig` | Agent configuration |
| `llm_config` | `LLMConfig | None` | Optional LLM config override |
| `input_type` | `type[T]` | Optional input type |
| `debug` | `bool` | Enable debug logging |

**Example:**

```python
from agent_runtime import AgentConfig, create_agent
from pathlib import Path

config = AgentConfig.parse_config(Path("agent.yaml"))
agent = create_agent(config, debug=True)
```

---

### create_workflow_runner

```python
def create_workflow_runner(
    workflow: Workflow,
    model: LLMClient,
    debug: bool = False
) -> BaseWorkflowRunner
```

Factory function to create the appropriate workflow runner.

Returns `CoordinatorWorkflowRunner` for parallel coordination, `SequentialWorkflowRunner` for sequential execution.

---

## Decorators

### @to_tool

```python
def to_tool[RetType](func: Callable[..., RetType]) -> Tool[RetType]
```

Convert a Python function into a tool that can be used by LLMs.

The decorator:
- Extracts function signature and docstring
- Generates JSON schema for parameters
- Wraps function for LLM tool calling

**Example:**

```python
from agent_runtime import to_tool

@to_tool
def calculate_sum(a: int, b: int) -> int:
    """Calculate the sum of two numbers.

    Args:
        a: First number
        b: Second number

    Returns:
        The sum of a and b
    """
    return a + b
```

---

## Configuration Classes

### AgentConfig

```python
class AgentConfig(BaseModel)
```

Agent configuration model parsed from YAML.

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | `str` | Unique agent identifier |
| `description` | `str` | Agent description |
| `specialization_prompt` | `str | None` | System prompt for specialization |
| `llm` | `LLMConfig` | LLM provider and model settings |
| `tools` | `ToolsConfig | None` | Tool configuration |
| `evaluator` | `EvaluatorConfig | None` | Evaluation configuration |
| `on_end` | `OnEndConfig | None` | Structured output configuration |

**Class Methods:**

```python
@classmethod
def parse_config(cls, path: Path) -> AgentConfig
```

Parse configuration from a YAML file.

---

### LLMConfig (Union Type)

```python
OpenAILLMConfig | AnthropicLLMConfig | OllamaLLMConfig
```

**OpenAILLMConfig Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `provider` | `Literal["openai"]` | Provider identifier |
| `model` | `str` | Model name (e.g., "gpt-4") |
| `token_budget` | `int` | Maximum tokens per request |
| `compaction` | `CompactionConfig | None` | Context compaction settings |

---

### CompactionConfig

```python
class CompactionConfig(BaseModel)
```

Configuration for context window management.

**Fields:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `strategy` | `str` | `"greedy"` | Compaction strategy |
| `max_context_tokens` | `int` | `512000` | Token threshold for compaction |
| `target_ratio` | `float` | `0.8` | Target ratio after compaction |
| `preserve_system` | `bool` | `True` | Preserve system messages |
| `preserve_recent` | `int` | `3` | Number of recent exchanges to keep |

---

### ToolsConfig

```python
class ToolsConfig(BaseModel)
```

Configuration for tool access and filtering.

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `mode` | `str` | Access mode: "all", "python_only", "mcp_only" |
| `required` | `bool` | Whether tool use is required |
| `sources` | `list[ToolSourceConfig]` | Tool sources to load |

---

## Output Tools

### OutputTool

```python
class OutputTool[T: BaseModel](Tool[T])
```

Tool for structured output extraction using Pydantic models.

**Constructor:**

```python
OutputTool(
    user_class: type[T],
    prompt: str | None = None
)
```

**Example:**

```python
from pydantic import BaseModel
from agent_runtime.tool import OutputTool

class Summary(BaseModel):
    title: str
    points: list[str]

output_tool = OutputTool(Summary, prompt="Extract key points")
```

---

## Exceptions

| Exception | Description |
|-----------|-------------|
| `RetryBudgetExceeded` | Maximum retries exceeded |
| `ToolCallError` | Tool execution failed |
| `LLMCommunicationError` | LLM API call failed |
| `LLMUnexpectedResponseError` | Unexpected LLM response format |
| `MCPSDKError` | MCP protocol error |
| `ToolsDiscoveryError` | Failed to discover tools |

---

## Type Parameters

Many classes use Python generics for type safety:

- `T`: Input type - typically `BaseModel | None`
- `S_co`: Output type (covariant) - `str` or `BaseModel` subclass

```python
# Plain text output
agent: Agent[None, str] = create_agent(config)

# Structured output
agent: Agent[None, MyOutputModel] = create_agent(config)

# Typed input and output
agent: Agent[MyInputModel, MyOutputModel] = create_agent(
    config, input_type=MyInputModel
)
```
