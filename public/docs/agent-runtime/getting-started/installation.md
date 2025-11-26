---
title: "Installation"
order: 2
category: "Getting Started"
---

# Installation

Get started with Agent Runtime in your Python project.

## Requirements

- **Python 3.13+**
- An LLM provider API key (OpenAI, Anthropic, or local Ollama)

## Install from PyPI

```bash
pip install nova-agent-runtime
```

Or with your preferred package manager:

```bash
# Using uv
uv add nova-agent-runtime

# Using poetry
poetry add nova-agent-runtime
```

## Environment Setup

### OpenAI

```bash
export OPENAI_API_KEY="your-api-key-here"
```

### Anthropic

```bash
export ANTHROPIC_API_KEY="your-api-key-here"
```

### Ollama (Local)

1. Install Ollama from [ollama.ai](https://ollama.ai)
2. Pull a model:
```bash
ollama pull llama2
```
3. Ollama runs on `http://localhost:11434` by default

## Verify Installation

Create a simple test script:

```python
import asyncio
from pathlib import Path
from agent_runtime import AgentConfig, create_agent

# Create a minimal config
config_yaml = """
id: "test_agent"
description: "A test agent"
llm:
  provider: "openai"
  model: "gpt-4"
  token_budget: 1000
"""

# Write config to file
Path("test_config.yaml").write_text(config_yaml)

# Load and run
config = AgentConfig.parse_config(Path("test_config.yaml"))
agent = create_agent(config, debug=True)

async def main():
    result = await agent.run("Say hello!")
    print(result)

asyncio.run(main())
```

Run the script:

```bash
python test_agent.py
```

## Project Structure

A typical project structure:

```
my_project/
├── configs/
│   ├── agent.yaml      # Agent configuration
│   ├── workflow.yaml   # Workflow configuration
│   └── mcp.py          # MCP server definitions
├── schemas/
│   └── outputs.py      # Pydantic output models
├── tools/
│   └── custom.py       # Custom tool definitions
└── main.py             # Entry point
```

## Configuration Files

### Agent Configuration

Create `configs/agent.yaml`:

```yaml
id: "my_agent"
description: "My first agent"

llm:
  provider: "openai"
  model: "gpt-4"
  token_budget: 10000

specialization_prompt: |
  You are a helpful assistant.
```

### MCP Server Configuration

Create `configs/mcp.py`:

```python
MCP_CONFIG = {
    "mcpServers": {
        "filesystem": {
            "command": "npx",
            "args": ["-y", "@anthropic/mcp-server-fs", "./data"]
        }
    }
}
```

## Using Different Providers

### OpenAI Configuration

```yaml
llm:
  provider: "openai"
  model: "gpt-4"           # or gpt-4-turbo, gpt-3.5-turbo
  token_budget: 10000
```

Available models: `gpt-4`, `gpt-4-turbo`, `gpt-4o`, `gpt-3.5-turbo`, etc.

### Anthropic Configuration

```yaml
llm:
  provider: "anthropic"
  model: "claude-3-opus"   # or claude-3-sonnet, claude-3-haiku
  token_budget: 10000
```

Available models: `claude-3-opus`, `claude-3-sonnet`, `claude-3-haiku`

### Ollama Configuration

```yaml
llm:
  provider: "ollama"
  model: "llama2"
  token_budget: 4000
  base_url: "http://localhost:11434"  # Optional
```

Use any model available in your Ollama installation.

## Custom API Endpoints

For OpenAI-compatible APIs:

```yaml
llm:
  provider: "openai"
  model: "your-model"
  base_url: "https://your-api.example.com/v1"
```

## Optional Dependencies

### DeepEval (for evaluation)

```bash
pip install deepeval
```

Required for using the evaluation loop feature.

### MCP Servers

Many MCP servers are available as npm packages:

```bash
# Filesystem server
npx -y @anthropic/mcp-server-fs /path/to/directory

# GitHub server
npx -y @anthropic/mcp-server-github

# Web search (Exa)
npx -y @anthropic/mcp-server-exa
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key | Required for OpenAI |
| `ANTHROPIC_API_KEY` | Anthropic API key | Required for Anthropic |
| `OPENAI_BASE_URL` | Custom OpenAI endpoint | OpenAI default |
| `LLM_MAX_RETRIES` | Max retry attempts | 3 |
| `LLM_RETRY_DELAY_MS` | Initial retry delay | 1000 |

## Troubleshooting

### API Key Issues

```
Error: OPENAI_API_KEY not set
```

Ensure your API key is exported in your shell:

```bash
echo $OPENAI_API_KEY  # Should print your key
```

### Import Errors

```
ModuleNotFoundError: No module named 'agent_runtime'
```

Verify installation:

```bash
pip show nova-agent-runtime
```

### MCP Server Issues

```
Error: MCP server failed to start
```

1. Ensure Node.js is installed: `node --version`
2. Check server command and arguments
3. Verify paths in stdio server configs exist

## Next Steps

- [Introduction](/docs/agent-runtime/introduction) - Framework overview
- [User Guide](/docs/agent-runtime/user-guide) - Complete building guide
- [Examples](/docs/agent-runtime/examples) - Code examples
