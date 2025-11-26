---
title: "Developer Guide"
order: 1
category: "Contributing"
---

# Agent Runtime Developer Guide

This guide is for contributors who want to understand Agent Runtime's internals and extend the framework. For using Agent Runtime to build agents, see the [User Guide](/docs/agent-runtime/user-guide).

## Table of Contents

- [Part 1: Architecture Overview](#part-1-architecture-overview)
- [Part 2: Component Deep Dives](#part-2-component-deep-dives)
- [Part 3: Extension Points](#part-3-extension-points)
- [Part 4: Testing](#part-4-testing)
- [Part 5: Contributing](#part-5-contributing)
- [Part 6: Debugging & Diagnostics](#part-6-debugging--diagnostics)

---

## Part 1: Architecture Overview

### Layered Architecture

Agent Runtime uses a layered architecture where each layer builds on the one below:

```text
┌─────────────────────────────────────────────────────┐
│                  Workflow Layer                      │
│   WorkflowRunner → BlockRunner → TaskRunner          │
├─────────────────────────────────────────────────────┤
│                   Agent Layer                        │
│        Agent (facade) → AugmentedLLM (engine)        │
├─────────────────────────────────────────────────────┤
│                   Tool Layer                         │
│   ToolClient → LocalToolClient / RemoteMcpClient     │
├─────────────────────────────────────────────────────┤
│                 Provider Layer                       │
│              AsyncOpenAI (LLM client)                │
└─────────────────────────────────────────────────────┘
```

### Design Patterns

#### Facade Pattern

`Agent` provides a simple API while hiding `AugmentedLLM` complexity:

```python
# Simple interface
agent = create_agent(config)
result = await agent.run("query")

# vs. direct AugmentedLLM (more control, more complexity)
llm = AugmentedLLM(client, tool_client, ...)
result = await llm.generate(messages, ...)
```

#### Protocol-based Design

Tool clients implement `AbstractMcpClient` protocol (`agent_runtime/tool/base.py`):

```python
class AbstractMcpClient(Protocol):
    async def list_tools(self) -> list[Tool]: ...
    async def call_tool(self, name: str, arguments: dict) -> Any: ...
```

This enables polymorphism - `ToolClient` can aggregate any client implementing this protocol.

#### Queue-based Session Management

`SessionWorker` (`agent_runtime/tool/remote/session_worker.py`) manages MCP server lifecycle non-blocking:

```python
# Internal queue-based pattern
class SessionWorker:
    def __init__(self):
        self._queue: asyncio.Queue[WorkItem] = asyncio.Queue()

    async def _worker(self):
        while True:
            item = await self._queue.get()
            result = await self._execute(item)
            item.future.set_result(result)
```

#### Tool Namespacing

When aggregating multiple MCP servers, tools are namespaced to prevent conflicts:

```python
# Server "github" with tool "search_repos" becomes:
"github__search_repos"
```

### Type System

Agent Runtime uses Python 3.13+ generic syntax with covariance:

```python
# Agent with input type T and output type S_co (covariant)
class Agent[T: BaseModel | None = None, S_co: BaseModel | str = str]:
    async def run(self, prompt: str, input: T | None = None) -> S_co: ...
```

Covariance (`S_co`) allows returning subtypes - if `S_co = BaseModel`, you can return any Pydantic model.

### Data Flow

```text
User Query
    ↓
Agent.run()
    ↓
AugmentedLLM.generate()
    ↓
┌─────────────────────┐
│ Format messages     │
│ Call LLM            │
│ Parse tool calls    │
│ Execute tools       │ ← ToolClient.call_tool()
│ Collect results     │
│ Loop until done     │
└─────────────────────┘
    ↓
Response (str or structured)
```

---

## Part 2: Component Deep Dives

### AugmentedLLM (`agent_runtime/agent/augmented_llm.py`)

The core execution engine. Handles the LLM → tool → LLM loop.

#### Initialization

```python
class AugmentedLLM[T: BaseModel | None = None, S_co: BaseModel | str = str]:
    def __init__(
        self,
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
        debug: bool = False,
    ): ...
```

#### Execution Flow

1. **Tool Discovery**: Fetch available tools from `ToolClient`
2. **Message Formatting**: Build messages array with system prompt
3. **LLM Call**: Send to provider with function calling
4. **Parse Response**: Extract text and tool calls
5. **Tool Execution**: Run tools in parallel via `ToolClient`
6. **Result Aggregation**: Collect tool results as messages
7. **Loop**: Repeat until no more tool calls
8. **Output Processing**: Apply `on_end` for structured output

Key method:

```python
async def generate(
    self,
    messages: list[ChatCompletionMessageParam],
    context: RunContext[T],
) -> S_co:
    # Main execution loop
    while True:
        response = await self._call_llm(messages)

        if not response.tool_calls:
            break

        results = await self._execute_tools(response.tool_calls)
        messages.extend(results)

    return self._process_output(response)
```

### ToolClient (`agent_runtime/tool/tool.py`)

Aggregates multiple tool sources (local Python, remote MCP).

#### Architecture

```python
class ToolClient:
    def __init__(self):
        self._local_client: LocalToolClient
        self._mcp_clients: dict[str, RemoteMcpClient]
        self._tool_cache: dict[str, Tool]
```

#### Tool Resolution

```python
async def call_tool(self, name: str, arguments: dict) -> Any:
    # Parse namespaced name
    if "__" in name:
        server, tool_name = name.split("__", 1)
        client = self._mcp_clients[server]
    else:
        client = self._local_client
        tool_name = name

    return await client.call_tool(tool_name, arguments)
```

### Context Compaction (`agent_runtime/agent/compaction.py`)

Manages long conversations by compacting message history.

#### Compactor Interface

```python
class ContextCompactor(ABC):
    @abstractmethod
    async def compact(
        self,
        messages: list[ChatCompletionMessageParam],
        target_tokens: int,
    ) -> list[ChatCompletionMessageParam]: ...
```

#### Strategies

**GreedyCompactor**: Removes oldest messages first

```python
async def compact(self, messages, target_tokens):
    result = []
    tokens = 0

    # Always preserve system message
    if messages[0]["role"] == "system":
        result.append(messages[0])
        tokens += count_tokens(messages[0])

    # Add from end (newest) until budget exceeded
    for msg in reversed(messages[1:]):
        msg_tokens = count_tokens(msg)
        if tokens + msg_tokens > target_tokens:
            break
        result.insert(1, msg)
        tokens += msg_tokens

    return result
```

**SummarizationCompactor**: Uses LLM to summarize older messages

```python
async def compact(self, messages, target_tokens):
    # Split into preserve (recent) and summarize (old)
    old_messages = messages[:-self.preserve_recent]
    recent_messages = messages[-self.preserve_recent:]

    # Summarize old messages
    summary = await self._summarize(old_messages)

    # Return system + summary + recent
    return [messages[0], summary_message, *recent_messages]
```

### RunContext (`agent_runtime/types/context.py`)

Maintains conversation state across interactions.

```python
@dataclass
class RunContext[T: BaseModel | None = None]:
    run_id: UUID = field(default_factory=uuid4)
    max_retries: int = field(default_factory=lambda: settings.agent_max_retries)
    messages: list[ChatCompletionMessageParam] = field(default_factory=list)
    err_context: ErrorContext | None = None
    compaction_history: list[dict[str, Any]] = field(default_factory=list)
    usage_history: list[UsageEvent] = field(default_factory=list)
    _per_message_tokens: list[int] = field(default_factory=list)

    @property
    def estimated_tokens(self) -> int:
        """Cached token count for performance."""
        return sum(self._per_message_tokens)
```

---

## Part 3: Extension Points

### Custom Evaluators

Create evaluators to assess response quality.

#### Interface

```python
from abc import ABC, abstractmethod
from pydantic import BaseModel

class EvaluationResult(BaseModel):
    passed: bool
    score: float
    feedback: str | None = None

class Evaluator(ABC):
    @abstractmethod
    async def evaluate(
        self,
        query: str,
        response: str,
        context: list[str] | None = None,
    ) -> EvaluationResult: ...
```

#### Example: Custom Metric Evaluator

```python
from agent_runtime.agent.evaluator import Evaluator, EvaluationResult

class LengthEvaluator(Evaluator):
    """Evaluates if response meets length requirements."""

    def __init__(self, min_words: int = 50, max_words: int = 500):
        self.min_words = min_words
        self.max_words = max_words

    async def evaluate(
        self,
        query: str,
        response: str,
        context: list[str] | None = None,
    ) -> EvaluationResult:
        word_count = len(response.split())

        if word_count < self.min_words:
            return EvaluationResult(
                passed=False,
                score=word_count / self.min_words,
                feedback=f"Response too short ({word_count} words). Add more detail."
            )

        if word_count > self.max_words:
            return EvaluationResult(
                passed=False,
                score=self.max_words / word_count,
                feedback=f"Response too long ({word_count} words). Be more concise."
            )

        return EvaluationResult(passed=True, score=1.0)
```

### Custom Compactors

Create strategies for managing conversation context.

#### Example: Sliding Window Compactor

```python
from agent_runtime.agent.compaction import ContextCompactor
from openai.types.chat import ChatCompletionMessageParam

class SlidingWindowCompactor(ContextCompactor):
    """Keeps only the most recent N messages."""

    def __init__(self, window_size: int = 10):
        self.window_size = window_size

    async def compact(
        self,
        messages: list[ChatCompletionMessageParam],
        target_tokens: int,
    ) -> list[ChatCompletionMessageParam]:
        # Always keep system message
        system = [messages[0]] if messages[0]["role"] == "system" else []

        # Take last window_size messages (excluding system)
        non_system = [m for m in messages if m["role"] != "system"]
        recent = non_system[-self.window_size:]

        return system + recent
```

### Adding LLM Providers

Support new LLM providers by extending the client factory.

#### Example: Adding a New Provider

```python
# agent_runtime/types/config/workflow/tasks/llm.py

class MyProviderLLMConfig(BaseLLMConfig):
    """Configuration for MyProvider."""
    provider: Literal["myprovider"] = "myprovider"
    api_key: str | None = None
    custom_option: str = "default"

# Update the discriminated union
LLMConfig = Annotated[
    OpenAILLMConfig | AnthropicLLMConfig | OllamaLLMConfig | MyProviderLLMConfig,
    Field(discriminator="provider")
]
```

```python
# agent_runtime/agent/client.py

def create_llm_client(config: LLMConfig) -> AsyncOpenAI:
    match config:
        case OpenAILLMConfig():
            return AsyncOpenAI(...)
        case AnthropicLLMConfig():
            return AsyncOpenAI(base_url="https://api.anthropic.com/v1", ...)
        case MyProviderLLMConfig():
            return AsyncOpenAI(
                base_url="https://api.myprovider.com/v1",
                api_key=config.api_key,
            )
```

---

## Part 4: Testing

### Async Testing

Agent Runtime uses pytest-asyncio with auto mode - no decorators needed:

```python
# tests/agent/test_agent.py

async def test_agent_run():
    config = AgentConfig(...)
    agent = create_agent(config)

    result = await agent.run("Test query")

    assert result is not None
    assert len(result) > 0
```

### Mocking LLM Responses

```python
import pytest
from unittest.mock import AsyncMock, MagicMock
from openai.types.chat import ChatCompletion, ChatCompletionMessage, Choice

@pytest.fixture
def mock_openai_client():
    client = AsyncMock()

    # Mock a simple response
    client.chat.completions.create.return_value = ChatCompletion(
        id="test",
        created=1234567890,
        model="gpt-4o",
        object="chat.completion",
        choices=[
            Choice(
                index=0,
                message=ChatCompletionMessage(
                    role="assistant",
                    content="Test response",
                ),
                finish_reason="stop",
            )
        ],
    )

    return client

async def test_augmented_llm_run(mock_openai_client):
    llm = AugmentedLLM(
        name="test_agent",
        model_name="gpt-4o",
        model=mock_openai_client,
        instructions=["Test prompt"],
    )

    context = RunContext()
    result = await llm.run("Hello", context=context)

    assert result == "Test response"
```

### Integration Testing

```python
import pytest
from pathlib import Path

@pytest.fixture
def test_config():
    return AgentConfig.parse_config(Path("tests/fixtures/test_agent.yaml"))

@pytest.mark.integration
async def test_full_agent_flow(test_config):
    """Integration test with real LLM (requires API key)."""
    agent = create_agent(test_config)

    result = await agent.run("What is 2 + 2?")

    assert "4" in result
```

Run integration tests separately:

```bash
pytest -m integration tests/
```

---

## Part 5: Contributing

### Development Setup

```bash
# Clone and install
git clone https://github.com/your-org/agent_runtime.git
cd agent_runtime
make sync

# Verify setup
make check
make test
```

### Make Commands

| Command | Description |
| ------- | ----------- |
| `make sync` | Install dependencies with uv |
| `make format` | Format code with ruff |
| `make check` | Run lint, type check, complexity analysis |
| `make test` | Run tests with coverage |

### Code Standards

#### Type Hints (Required)

All functions must have complete type hints:

```python
# Good
def process(data: str | None) -> list[str]:
    return data.split() if data else []

# Bad - missing types
def process(data):
    return data.split() if data else []
```

#### Absolute Imports

```python
# Good
from agent_runtime.agent import Agent
from agent_runtime.types.errors import ToolCallError

# Bad
from ..agent import Agent
from .errors import ToolCallError
```

#### Structured Logging

Use structlog with structured fields:

```python
import structlog

logger = structlog.get_logger(__name__)

# Good - structured fields
logger.debug("Tool executed", tool_name=name, duration_ms=duration)

# Bad - string formatting
logger.debug(f"Tool {name} executed in {duration}ms")
```

### Git Workflow

1. **Branch from main**: `git checkout -b feature/my-feature`
2. **Make changes**: Follow code standards
3. **Run checks**: `make check && make test`
4. **Commit**: Use conventional commits
   - `feat: add new evaluator`
   - `fix: handle empty tool results`
   - `docs: update user guide`
5. **Push and PR**: Request review

---

## Part 6: Debugging & Diagnostics

### Debug Mode

Enable verbose logging:

```python
agent = create_agent(config, debug=True)
```

This logs:

- All messages sent to LLM
- Tool calls and arguments
- Tool results
- Compaction events
- Token usage

### Performance Timing

Enable with environment variable:

```bash
MEASURE_TIME=true python your_script.py
```

This logs execution time for:

- LLM calls
- Tool executions
- Compaction operations

### Inspecting Context

```python
context = RunContext()
result = await agent.run("Query", context=context)

# Inspect state
print(f"Run ID: {context.run_id}")
print(f"Messages: {len(context.messages)}")
print(f"Estimated tokens: {context.estimated_tokens}")
print(f"Compaction events: {context.compaction_history}")
print(f"Usage history: {context.usage_history}")

# Inspect individual messages
for i, msg in enumerate(context.messages):
    print(f"{i}: {msg['role']}: {msg.get('content', '')[:100]}...")
```

### Common Issues

#### Async Context Issues

**Symptom**: `RuntimeError: no running event loop`

**Fix**: Ensure you're in an async context:

```python
# Wrong
result = agent.run("query")

# Right
result = await agent.run("query")

# Or from sync code
import asyncio
result = asyncio.run(agent.run("query"))
```

#### Type Validation Errors

**Symptom**: Pydantic validation errors

**Fix**: Check your model matches the LLM output:

```python
class Result(BaseModel):
    score: float  # LLM might return int

# Better - allow coercion
class Result(BaseModel):
    score: float

    model_config = {"coerce_numbers_to_str": False}
```

---

## Further Reading

- [User Guide](/docs/agent-runtime/user-guide) - For building with Agent Runtime
- [Context Compaction](/docs/agent-runtime/context-compaction) - Compaction strategies
