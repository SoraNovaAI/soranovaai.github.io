---
title: "Tools"
order: 2
category: "Concepts"
---

# Tools

Agent Runtime provides flexible tool integration through two mechanisms: local Python tools via the `@to_tool` decorator and remote tools via MCP (Model Context Protocol) servers.

## Overview

Tools extend agent capabilities by providing access to external resources, APIs, and custom functionality. The framework handles:

- **Tool Discovery**: Automatic discovery from MCP servers
- **Tool Namespacing**: Prevents conflicts between servers
- **Parallel Execution**: Concurrent tool calls for better performance
- **Type Safety**: Pydantic-based schema generation

## Local Python Tools

Use the `@to_tool` decorator to convert Python functions into tools:

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

The decorator:
- Extracts the function signature and docstring
- Generates a JSON schema for parameters
- Makes the function callable by the LLM

### Parameter Types

The decorator supports various Python types:

```python
from pydantic import BaseModel
from typing import Optional, List

class SearchParams(BaseModel):
    query: str
    max_results: int = 10

@to_tool
def search_web(
    query: str,
    max_results: int = 10,
    include_images: bool = False
) -> List[str]:
    """Search the web for information.

    Args:
        query: Search query string
        max_results: Maximum number of results to return
        include_images: Whether to include image results

    Returns:
        List of search result URLs
    """
    # Implementation here
    pass
```

### Stateful Tools

For tools that need to maintain state, use class methods:

```python
class DataProcessor:
    def __init__(self):
        self.cache = {}

    @to_tool
    def process_data(self, data_id: str) -> dict:
        """Process and cache data.

        Args:
            data_id: Unique identifier for the data

        Returns:
            Processed data dictionary
        """
        if data_id in self.cache:
            return self.cache[data_id]

        result = {"id": data_id, "processed": True}
        self.cache[data_id] = result
        return result

# Create instance and use the tool
processor = DataProcessor()
tool = to_tool(processor.process_data)
```

## MCP Server Integration

MCP (Model Context Protocol) enables remote tool access from external servers.

### Configuration

Configure MCP servers in your agent YAML:

```yaml
tools:
  mode: "all"
  sources:
    - type: "mcp"
      mcp_servers: "myapp.configs.mcp.MCP_CONFIG"
```

Define the MCP configuration in Python:

```python
# myapp/configs/mcp.py
MCP_CONFIG = {
    "mcpServers": {
        "github": {
            "url": "http://localhost:3000",
            "token": "your-auth-token"  # Optional
        },
        "filesystem": {
            "command": "npx",
            "args": ["-y", "@anthropic/mcp-server-fs", "/allowed/path"]
        }
    }
}
```

### Server Types

**HTTP Servers** (Streamable HTTP):
```python
MCP_CONFIG = {
    "mcpServers": {
        "remote_server": {
            "url": "https://api.example.com/mcp",
            "token": "bearer-token"
        }
    }
}
```

**Stdio Servers** (Local process):
```python
MCP_CONFIG = {
    "mcpServers": {
        "local_server": {
            "command": "python",
            "args": ["-m", "my_mcp_server"],
            "env": {"API_KEY": "secret"}
        }
    }
}
```

## ToolClient

The `ToolClient` aggregates tools from multiple sources and provides a unified interface:

```python
from agent_runtime.tool import ToolClient
from agent_runtime.types.config import ToolsConfig

# Create with configuration
tools_config = ToolsConfig(
    mode="all",
    sources=[
        {"type": "mcp", "mcp_servers": "myapp.configs.mcp.MCP_CONFIG"}
    ]
)

async with ToolClient(tools_config=tools_config) as client:
    # List available tools
    tools = await client.list_tools()

    for tool in tools.tools:
        print(f"{tool.name}: {tool.description}")

    # Call a tool
    result = await client.call_tool(
        "search_github",
        {"query": "agent runtime", "limit": 5}
    )
```

### Tool Namespacing

Tools are automatically namespaced with their server origin to prevent conflicts:

```
tool_name_server_name
```

For example, a `search` tool from a `github` server becomes `search_github`.

## Tool Access Modes

Control which tools are available to the agent:

```yaml
tools:
  mode: "all"        # All tools (Python + MCP)
  # OR
  mode: "python_only"  # Only local Python tools
  # OR
  mode: "mcp_only"     # Only MCP server tools
```

### Tool Filtering

Require specific tools or filter available tools:

```yaml
tools:
  mode: "all"
  required: true  # Model must use a tool
```

## Using Tools with AugmentedLLM

For direct control, pass tools to `AugmentedLLM`:

```python
from agent_runtime.agent.augmented_llm import AugmentedLLM
from agent_runtime.agent.llm_client import OpenAILLMClient
from agent_runtime import to_tool

@to_tool
def get_weather(city: str) -> str:
    """Get current weather for a city."""
    return f"Weather in {city}: Sunny, 72F"

llm = AugmentedLLM(
    name="weather_assistant",
    model_name="gpt-4",
    model=OpenAILLMClient(),
    tools=[get_weather],
    instructions=["You help users check the weather."]
)

result = await llm.run("What's the weather in San Francisco?")
```

## Error Handling

Tool execution errors are captured and can trigger retries:

```python
from agent_runtime.types.errors import ToolCallError

try:
    result = await client.call_tool("risky_tool", {"param": "value"})
except ToolCallError as e:
    print(f"Tool failed: {e}")
```

When tools fail during agent execution:
1. Error is injected into conversation context
2. LLM sees the error and can adjust strategy
3. Retry logic kicks in based on configuration

## Best Practices

1. **Write Clear Docstrings**: The LLM uses docstrings to understand tool purpose
2. **Use Type Hints**: Enables automatic schema generation
3. **Handle Errors Gracefully**: Return meaningful error messages
4. **Keep Tools Focused**: One tool per specific capability
5. **Namespace Carefully**: Avoid tool name conflicts across servers

## Next Steps

- [MCP Servers](/docs/agent-runtime/mcp-servers) - Deep-dive on MCP configuration
- [API Reference](/docs/agent-runtime/api-reference) - Complete tool API documentation
- [Examples](/docs/agent-runtime/examples) - Working tool examples
