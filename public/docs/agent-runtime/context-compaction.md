---
title: "Context Compaction"
order: 5
category: "Guides"
---

# Context Compaction System

## Overview

The context compaction system provides automatic context window management for agents and orchestrators in Agent Runtime. It prevents context overflow errors by intelligently removing or summarizing older conversation history when approaching token limits.

## Features

- **Multiple Strategies**: Greedy, sliding window, summarization, and hybrid approaches
- **Configurable**: Per-agent/orchestrator settings via YAML
- **Extensible**: Easy to add new compaction strategies
- **Observable**: Tracks compaction events in RunContext for debugging
- **Shared**: Works seamlessly with both Agent and Orchestrator classes

## Architecture

### Core Components

**`agent_runtime/agent/compaction.py`**

- `ContextCompactor` - Abstract base class for compaction strategies
- `estimate_tokens()` - Token counting using tiktoken
- `CompactionEvent` - Records compaction operations
- Concrete implementations:
  - `GreedyCompactor` - Removes oldest tool calls/responses
  - `SlidingWindowCompactor` - Keeps only recent messages
  - `SummarizationCompactor` - LLM-based summarization (basic implementation)
  - `HybridCompactor` - Combines multiple strategies

**`agent_runtime/types/config/`**

- `CompactionConfig` - Configuration model with strategy selection

**`agent_runtime/types/context.py`**

- `RunContext.compaction_history` - Tracks compaction events

**`agent_runtime/agent/augmented_llm.py`**

- Integrated in `call_model()` - Automatic compaction before API calls

## Usage

### Basic Configuration

Add compaction configuration to your agent's LLM config:

```yaml
llm_config:
  model: "gpt-4.1-mini"
  token_budget: 10000
  compaction:
    strategy: "hybrid"  # greedy | sliding_window | summarization | hybrid
    max_context_tokens: 128000
    target_ratio: 0.75
    preserve_system: true
    preserve_recent: 5
```

### Configuration Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `strategy` | str | `"greedy"` | Compaction strategy to use |
| `max_context_tokens` | int | `128000` | Maximum tokens before triggering compaction |
| `target_ratio` | float | `0.8` | Target token ratio after compaction (0-1) |
| `preserve_system` | bool | `true` | Always keep system message |
| `preserve_recent` | int | `3` | Number of recent exchanges to preserve |

### Programmatic Usage

```python
from agent_runtime import AgentConfig, create_agent
from agent_runtime.types.config import CompactionConfig, OpenAILLMConfig

# Create compaction config
compaction_config = CompactionConfig(
    strategy="hybrid",
    max_context_tokens=128000,
    target_ratio=0.75,
    preserve_recent=5
)

# Use in LLM config
llm_config = OpenAILLMConfig(
    model="gpt-4o-mini",
    token_budget=10000,
    compaction=compaction_config
)

# Load agent config and create agent with LLM config override
agent_config = AgentConfig.parse_config(Path("agent_config.yaml"))
agent = create_agent(agent_config, llm_config)
result = await agent.run("Long conversation...")
```

### Monitoring Compaction

```python
from agent_runtime.types.context import RunContext

# Create context to track compaction
context = RunContext()

# Run agent
result = await agent.run("Query", context=context)

# Check compaction history
for event in context.compaction_history:
    print(f"Strategy: {event['strategy']}")
    print(f"Original tokens: {event['original_tokens']}")
    print(f"Compacted tokens: {event['compacted_tokens']}")
    print(f"Messages removed: {event['messages_removed']}")
```

## Compaction Strategies

### Greedy Strategy

Removes oldest tool calls and tool responses first, preserving recent exchanges and system messages.

**Best for**: Long conversations with many tool calls that are no longer relevant.

**Behavior**:

1. Preserves system message (if configured)
2. Preserves N most recent user/assistant exchanges
3. Removes tool calls and responses from oldest to newest
4. Stops when target token count is reached

### Sliding Window Strategy

Keeps only the most recent messages that fit within the token budget.

**Best for**: Conversations where only recent context matters.

**Behavior**:

1. Preserves system message (if configured)
2. Keeps as many recent messages as fit in target budget
3. Adds summary message indicating removed history

### Summarization Strategy

Replaces middle portion of conversation with a summary (currently basic implementation).

**Best for**: Long conversations where historical context should be preserved in compressed form.

**Behavior**:

1. Preserves system message (if configured)
2. Preserves N most recent exchanges
3. Summarizes middle messages
4. Replaces with summary system message

**Note**: Current implementation uses a placeholder summary. Future versions will use LLM to generate intelligent summaries.

### Hybrid Strategy

Combines multiple strategies for optimal results.

**Best for**: General purpose use with varying conversation patterns.

**Behavior**:

1. First tries greedy removal of tool calls
2. If still over budget, applies sliding window
3. Tracks combined effect

## Token Counting

Uses an extremely simple character-based approximation:

```python
def estimate_tokens(messages):
    total_chars = len(json.dumps(messages))
    return total_chars // 4
```

- **Heuristic**: 1 token ≈ 4 characters for English text
- **Implementation**: Serialize messages to JSON, count characters, divide by 4
- **Performance**: O(n) with minimal overhead, no external dependencies
- **Accuracy**: Approximate but sufficient for compaction decisions

While not as precise as tiktoken, this approach:

- Avoids dependency on external tokenization libraries
- Provides consistent estimates across all model types
- Automatically handles all message fields (content, tool calls, metadata, etc.)
- Is trivially simple to understand and maintain

## Performance

- **Lazy evaluation**: Only compacts when needed
- **Minimal overhead**: Token counting is fast (<1ms for typical conversations)
- **Incremental**: Only processes messages being removed/summarized

## Example Configurations

### Minimal Compaction (Conservative)

```yaml
compaction:
  strategy: "greedy"
  max_context_tokens: 200000  # Very high limit
  target_ratio: 0.9  # Only compact by 10%
  preserve_recent: 10
```

### Aggressive Compaction

```yaml
compaction:
  strategy: "hybrid"
  max_context_tokens: 64000
  target_ratio: 0.5  # Compact to 50%
  preserve_recent: 2
```

### Research Agent (Keep History)

```yaml
compaction:
  strategy: "summarization"
  max_context_tokens: 128000
  target_ratio: 0.7
  preserve_recent: 8
```

### Tool-Heavy Agent (Remove Tool Calls)

```yaml
compaction:
  strategy: "greedy"
  max_context_tokens: 100000
  target_ratio: 0.6
  preserve_recent: 3
```

## Testing

Comprehensive test suite in `tests/test_compaction.py`:

```bash
uv run pytest tests/test_compaction.py -v
```

**Test Coverage**: 94% (175/186 statements)

Tests cover:

- Token estimation accuracy
- Each compaction strategy
- Configuration validation
- Edge cases (empty context, no removable messages, etc.)
- Integration with message history

## Future Enhancements

1. **Smart Summarization**: Use LLM to generate intelligent summaries
2. **Semantic Clustering**: Group and compress related exchanges
3. **Importance Scoring**: Preserve important messages based on content analysis
4. **Adaptive Thresholds**: Adjust target ratio based on conversation patterns
5. **Multi-level Compaction**: Different strategies for different conversation stages
6. **Compaction Preview**: Show what will be removed before compaction

## Troubleshooting

### Issue: Compaction not triggering

**Solution**: Check that:

- `compaction` config is set in `llm_config`
- `max_context_tokens` is appropriate for your model
- Token count actually exceeds the threshold

### Issue: Too much context removed

**Solution**: Adjust configuration:

- Increase `target_ratio` (e.g., 0.9 instead of 0.75)
- Increase `preserve_recent`
- Use less aggressive strategy (greedy instead of hybrid)

### Issue: Important context lost

**Solution**:

- Use `summarization` strategy instead of `greedy`
- Increase `preserve_recent`
- Consider custom compaction strategy for your use case

## See Also

- [Agent SDK](/docs/agent-runtime/agent)
- [User Guide](/docs/agent-runtime/user-guide)
