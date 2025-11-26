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
from typing import List

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

### Tool Namespacing

Tools from MCP servers are automatically namespaced with their server origin to prevent conflicts:

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

Note that since you define the sources of the tools, it is recommended to control access via the `sources` field for more granular control instead of using the `mode` field. This
field is exposed for quick testing and prototyping.

## Error Handling

When tools fail during agent execution:

1. Error is injected into conversation context
2. LLM sees the error and can adjust strategy
3. Retry logic kicks in based on configuration

Tools should return meaningful error messages to help the LLM understand what went wrong and how to recover.

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
