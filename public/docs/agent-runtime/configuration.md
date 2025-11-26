---
title: "Configuration Reference"
order: 2
category: "Reference"
---

# Configuration Reference

Complete reference for Agent Runtime YAML configuration files.

## Agent Configuration

### Complete Example

```yaml
id: "research_agent"
description: "An agent that conducts research using web search and analysis"

specialization_prompt: |
  You are a research specialist.
  Always cite sources and provide balanced analysis.
  Be thorough but concise.

capabilities:
  skills:
    - "web_search"
    - "data_analysis"
    - "summarization"

llm:
  provider: "openai"
  model: "gpt-4"
  token_budget: 10000
  compaction:
    strategy: "summarization"
    max_context_tokens: 512000
    target_ratio: 0.8
    preserve_system: true
    preserve_recent: 3

tools:
  mode: "all"
  required: false
  sources:
    - type: "mcp"
      mcp_servers: "myapp.configs.mcp.MCP_CONFIG"
    - type: "python"
      tool: "myapp.tools.custom_tool"

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
          - "Verify claims against sources"
          - "Check for speculation vs fact"
      completeness:
        weight: 0.5
        threshold: 0.7
        criteria: "Evaluate response completeness"

on_end:
  model: "myapp.schemas.ResearchOutput"
  prompt: "Extract the research findings into structured format"
```

### Field Reference

#### Root Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier for the agent |
| `description` | string | No | Human-readable description |
| `specialization_prompt` | string | No | System prompt for agent behavior |
| `capabilities` | object | No | Agent capabilities declaration |
| `llm` | object | Yes | LLM provider configuration |
| `tools` | object | No | Tool access configuration |
| `evaluator` | object | No | Evaluation loop configuration |
| `on_end` | object | No | Structured output configuration |

---

## LLM Configuration

### OpenAI

```yaml
llm:
  provider: "openai"
  model: "gpt-4"           # or "gpt-4-turbo", "gpt-3.5-turbo", etc.
  token_budget: 10000
  compaction:
    strategy: "summarization"
    max_context_tokens: 128000
```

### Anthropic

```yaml
llm:
  provider: "anthropic"
  model: "claude-3-opus"   # or "claude-3-sonnet", "claude-3-haiku"
  token_budget: 10000
  compaction:
    strategy: "summarization"
    max_context_tokens: 200000
```

### Ollama (Local)

```yaml
llm:
  provider: "ollama"
  model: "llama2"          # or any Ollama model
  token_budget: 4000
  base_url: "http://localhost:11434"  # Optional, default shown
```

### LLM Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `provider` | string | Required | "openai", "anthropic", or "ollama" |
| `model` | string | Required | Model name |
| `token_budget` | int | 4000 | Max tokens per request |
| `compaction` | object | None | Context compaction config |
| `base_url` | string | Provider default | Custom API endpoint |

---

## Compaction Configuration

```yaml
compaction:
  strategy: "summarization"
  max_context_tokens: 512000
  target_ratio: 0.8
  preserve_system: true
  preserve_recent: 3
```

### Compaction Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `strategy` | string | "greedy" | Compaction strategy |
| `max_context_tokens` | int | 512000 | Threshold to trigger compaction |
| `target_ratio` | float | 0.8 | Target size after compaction (0.0-1.0) |
| `preserve_system` | bool | true | Keep system messages |
| `preserve_recent` | int | 3 | Number of recent exchanges to keep |

### Compaction Strategies

| Strategy | Description | Use Case |
|----------|-------------|----------|
| `greedy` | Removes oldest messages | Fast, no LLM cost |
| `summarization` | Compresses via LLM summary | Preserves context |
| `sliding_window` | Keeps last N messages | Simple conversations |
| `hybrid` | Combines strategies | Complex scenarios |

---

## Tools Configuration

```yaml
tools:
  mode: "all"
  required: false
  sources:
    - type: "mcp"
      mcp_servers: "myapp.configs.mcp.MCP_CONFIG"
    - type: "python"
      tool: "myapp.tools.calculator"
```

### Tools Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `mode` | string | "all" | Tool access mode |
| `required` | bool | false | Whether tool use is required |
| `sources` | list | [] | Tool sources to load |

### Tool Modes

| Mode | Description |
|------|-------------|
| `all` | Access all tools (Python + MCP) |
| `python_only` | Only local Python tools |
| `mcp_only` | Only MCP server tools |

### Tool Source Types

**MCP Source:**
```yaml
- type: "mcp"
  mcp_servers: "myapp.configs.mcp.MCP_CONFIG"  # Python module path
```

**Python Tool Source:**
```yaml
- type: "python"
  tool: "myapp.tools.my_function"  # Python path to @to_tool function
```

---

## MCP Server Configuration

The `mcp_servers` field references a Python module containing server definitions:

```python
# myapp/configs/mcp.py

MCP_CONFIG = {
    "mcpServers": {
        "github": {
            "url": "http://localhost:3000",
            "token": "your-auth-token"
        },
        "filesystem": {
            "command": "npx",
            "args": ["-y", "@anthropic/mcp-server-fs", "/allowed/path"],
            "env": {
                "NODE_ENV": "production"
            }
        }
    }
}
```

### HTTP Server

```python
"server_name": {
    "url": "https://api.example.com/mcp",
    "token": "bearer-token"  # Optional
}
```

### Stdio Server

```python
"server_name": {
    "command": "python",
    "args": ["-m", "my_mcp_server"],
    "env": {"API_KEY": "secret"}  # Optional
}
```

---

## Evaluator Configuration

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

### Evaluator Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `type` | string | Required | Evaluator type ("deepeval") |
| `max_iteration` | int | 3 | Maximum retry attempts |
| `deepeval` | object | Required | DeepEval-specific config |

### Metric Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `weight` | float | 1.0 | Metric weight in combined score |
| `threshold` | float | 0.7 | Minimum passing score |
| `criteria` | string | Required | Evaluation criteria description |
| `evaluation_steps` | list | [] | Specific steps for evaluation |

---

## Structured Output Configuration

```yaml
on_end:
  model: "myapp.schemas.OutputModel"
  prompt: "Extract data into the specified format"
```

### On End Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `model` | string | Yes | Python path to Pydantic model |
| `prompt` | string | No | Extraction prompt for the LLM |

The model must be a Pydantic `BaseModel`:

```python
# myapp/schemas.py
from pydantic import BaseModel

class OutputModel(BaseModel):
    title: str
    summary: str
    key_points: list[str]
    confidence: float
```

---

## Workflow Configuration

### Complete Example

```yaml
name: "research_workflow"

coordination:
  type: "parallel"  # or "sequential"

agent:
  id: "coordinator"
  llm:
    provider: "openai"
    model: "gpt-4"
  specialization_prompt: |
    You coordinate research tasks across specialist agents.

evaluator:
  type: deepeval
  max_iteration: 2
  deepeval:
    llm:
      model: "gpt-4-mini"
    metrics:
      completeness:
        weight: 1.0
        threshold: 0.7

blocks:
  - name: "web_researcher"
    block:
      - type: "agent"
        agent:
          id: "web_agent"
          llm:
            provider: "openai"
            model: "gpt-4"
          capabilities:
            skills: ["web_search"]
          tools:
            mode: "mcp_only"
            sources:
              - type: "mcp"
                mcp_servers: "configs.search.MCP_CONFIG"

  - name: "data_analyst"
    block:
      - type: "agent"
        agent:
          id: "analyst"
          llm:
            provider: "openai"
            model: "gpt-4"
          capabilities:
            skills: ["data_analysis"]
```

### Workflow Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Workflow identifier |
| `coordination` | object | Yes | Coordination strategy |
| `agent` | object | For parallel | Coordinator agent config |
| `evaluator` | object | No | Workflow-level evaluation |
| `blocks` | list | Yes | List of execution blocks |

### Coordination Types

```yaml
coordination:
  type: "parallel"  # LLM-coordinated DAG execution
```

```yaml
coordination:
  type: "sequential"  # Execute blocks in order
```

### Block Types

**Agent Block:**
```yaml
- type: "agent"
  agent:
    id: "agent_id"
    llm: { ... }
    tools: { ... }
```

**LLM Block:**
```yaml
- type: "llm"
  llm:
    provider: "openai"
    model: "gpt-4"
  prompt: "Process the input"
```

**Tool Call Block:**
```yaml
- type: "tool_call"
  tool: "tool_name"
  arguments:
    param: "{input}"
```

---

## Environment Variables

Agent Runtime reads these environment variables:

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `OPENAI_BASE_URL` | Custom OpenAI-compatible endpoint |
| `LLM_MAX_RETRIES` | Maximum retry attempts (default: 3) |
| `LLM_RETRY_DELAY_MS` | Initial retry delay in ms (default: 1000) |
| `AGENT_MAX_ACT_ITERATIONS` | Max ACT phase iterations (default: 10) |

---

## Minimal Configurations

### Minimal Agent

```yaml
id: "minimal_agent"
description: "A minimal agent"
llm:
  provider: "openai"
  model: "gpt-4"
```

### Agent with Tools

```yaml
id: "tool_agent"
llm:
  provider: "openai"
  model: "gpt-4"
tools:
  mode: "all"
  sources:
    - type: "mcp"
      mcp_servers: "configs.mcp.MCP_CONFIG"
```

### Agent with Evaluation

```yaml
id: "eval_agent"
llm:
  provider: "openai"
  model: "gpt-4"
evaluator:
  type: deepeval
  max_iteration: 3
  deepeval:
    llm:
      model: "gpt-4-mini"
    metrics:
      quality:
        threshold: 0.7
        criteria: "Evaluate response quality"
```
