---
title: "MCP Servers"
order: 4
category: "Guides"
---

# MCP Servers

Model Context Protocol (MCP) enables agents to access remote tools from external servers. This guide covers setting up and configuring MCP servers with Agent Runtime.

## What is MCP?

MCP (Model Context Protocol) is a standard protocol for LLM tool integration. It allows:

- **Tool Discovery**: Servers expose available tools with schemas
- **Remote Execution**: Tools run on external servers
- **Multi-Server Aggregation**: Combine tools from multiple servers

## Server Types

Agent Runtime supports two MCP transport types:

### Streamable HTTP Servers

Remote servers accessed via HTTP:

```python
MCP_CONFIG = {
    "mcpServers": {
        "remote_api": {
            "url": "https://api.example.com/mcp",
            "token": "your-auth-token"  # Optional bearer token
        }
    }
}
```

### Stdio Servers

Local processes communicating via stdin/stdout:

```python
MCP_CONFIG = {
    "mcpServers": {
        "local_server": {
            "command": "npx",
            "args": ["-y", "@anthropic/mcp-server-fs", "/data"],
            "env": {"NODE_ENV": "production"}  # Optional
        }
    }
}
```

## Configuration Setup

### 1. Create MCP Config Module

Create a Python module with your MCP configuration:

```python
# myapp/configs/mcp.py

MCP_CONFIG = {
    "mcpServers": {
        "filesystem": {
            "command": "npx",
            "args": ["-y", "@anthropic/mcp-server-fs", "./allowed_directory"]
        },
        "github": {
            "command": "npx",
            "args": ["-y", "@anthropic/mcp-server-github"],
            "env": {
                "GITHUB_TOKEN": "your-github-token"
            }
        }
    }
}
```

### 2. Reference in Agent Config

```yaml
# agent.yaml
id: "my_agent"
llm:
  provider: "openai"
  model: "gpt-4"

tools:
  mode: "mcp_only"
  sources:
    - type: "mcp"
      mcp_servers: "myapp.configs.mcp.MCP_CONFIG"
```

### 3. Use the Agent

```python
from pathlib import Path
from agent_runtime import AgentConfig, create_agent

config = AgentConfig.parse_config(Path("agent.yaml"))
agent = create_agent(config)

# Agent now has access to filesystem and github tools
result = await agent.run("List files in the current directory")
```

## Popular MCP Servers

### Filesystem Server

Access local files and directories:

```python
"filesystem": {
    "command": "npx",
    "args": ["-y", "@anthropic/mcp-server-fs", "/path/to/allow"]
}
```

**Tools provided:** `read_file`, `write_file`, `list_directory`, `create_directory`

### GitHub Server

Interact with GitHub repositories:

```python
"github": {
    "command": "npx",
    "args": ["-y", "@anthropic/mcp-server-github"],
    "env": {
        "GITHUB_TOKEN": "ghp_your_token"
    }
}
```

**Tools provided:** `search_repositories`, `get_file_contents`, `create_issue`, `list_commits`

### Web Search (Exa)

Search the web using Exa:

```python
"exa_search": {
    "command": "npx",
    "args": ["-y", "@anthropic/mcp-server-exa"],
    "env": {
        "EXA_API_KEY": "your-exa-key"
    }
}
```

**Tools provided:** `search`, `find_similar`, `get_contents`

### Brave Search

Web search using Brave:

```python
"brave_search": {
    "command": "npx",
    "args": ["-y", "@anthropic/mcp-server-brave-search"],
    "env": {
        "BRAVE_API_KEY": "your-brave-key"
    }
}
```

## Remote HTTP Servers

For custom or deployed MCP servers:

```python
MCP_CONFIG = {
    "mcpServers": {
        "custom_api": {
            "url": "https://mcp.mycompany.com/v1",
            "token": "Bearer secret-token"
        }
    }
}
```

### Authentication

HTTP servers support bearer token authentication:

```python
"authenticated_server": {
    "url": "https://api.example.com/mcp",
    "token": "your-bearer-token"  # Sent as Authorization header
}
```

## Multiple Servers

Combine tools from multiple sources:

```python
MCP_CONFIG = {
    "mcpServers": {
        "filesystem": {
            "command": "npx",
            "args": ["-y", "@anthropic/mcp-server-fs", "./data"]
        },
        "github": {
            "command": "npx",
            "args": ["-y", "@anthropic/mcp-server-github"],
            "env": {"GITHUB_TOKEN": "ghp_xxx"}
        },
        "web_search": {
            "command": "npx",
            "args": ["-y", "@anthropic/mcp-server-exa"],
            "env": {"EXA_API_KEY": "xxx"}
        }
    }
}
```

### Tool Namespacing

Tools are automatically namespaced to prevent conflicts:

```
read_file_filesystem
search_repositories_github
search_web_search
```

The format is `{tool_name}_{server_name}`.

## Tool Filtering

Control which tools are available:

```yaml
tools:
  mode: "mcp_only"      # Only MCP tools, no Python tools
  # OR
  mode: "all"           # Both Python and MCP tools
```

## Environment Variables

Pass environment variables to stdio servers:

```python
"server_with_env": {
    "command": "python",
    "args": ["-m", "my_mcp_server"],
    "env": {
        "API_KEY": "secret",
        "DATABASE_URL": "postgresql://...",
        "DEBUG": "true"
    }
}
```

## Custom MCP Servers

Build your own MCP server using the MCP SDK:

```python
# my_mcp_server.py
from mcp.server import Server
from mcp.types import Tool, TextContent

server = Server("my-server")

@server.tool("my_tool")
async def my_tool(param: str) -> list[TextContent]:
    """Do something useful.

    Args:
        param: Input parameter
    """
    result = f"Processed: {param}"
    return [TextContent(type="text", text=result)]

if __name__ == "__main__":
    import asyncio
    asyncio.run(server.run_stdio())
```

Configure in your MCP config:

```python
"custom": {
    "command": "python",
    "args": ["-m", "my_mcp_server"]
}
```

## Debugging MCP Servers

### Enable Debug Logging

```python
agent = create_agent(config, debug=True)
```

### Test Server Manually

For stdio servers, test directly:

```bash
echo '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}' | \
  npx -y @anthropic/mcp-server-fs ./data
```

### Common Issues

**Server fails to start:**
- Check command and arguments
- Verify required environment variables are set
- Ensure paths exist for filesystem servers

**Tool not found:**
- Check tool namespacing: `{tool}_{server}`
- Verify server is in `mcpServers` config
- Check `tools.mode` isn't filtering it out

**Authentication errors:**
- Verify token is correct
- Check token format (some need "Bearer " prefix)
- Ensure token has required permissions

## Best Practices

1. **Use Environment Variables for Secrets**
   ```python
   import os
   MCP_CONFIG = {
       "mcpServers": {
           "github": {
               "command": "npx",
               "args": ["-y", "@anthropic/mcp-server-github"],
               "env": {"GITHUB_TOKEN": os.environ["GITHUB_TOKEN"]}
           }
       }
   }
   ```

2. **Limit Filesystem Access**
   ```python
   # Only allow specific directories
   "filesystem": {
       "command": "npx",
       "args": ["-y", "@anthropic/mcp-server-fs", "./safe_directory"]
   }
   ```

3. **Use Tool Filtering for Security**
   ```yaml
   tools:
     mode: "mcp_only"  # Restrict to known MCP tools
   ```

4. **Handle Server Lifecycle**
   ```python
   agent = create_agent(config)
   try:
       result = await agent.run("Query")
   finally:
       # Cleanup is automatic, but can be explicit
       pass
   ```

## Next Steps

- [Tools](/docs/agent-runtime/tools) - Tool integration overview
- [Configuration Reference](/docs/agent-runtime/configuration) - Complete config options
- [Examples](/docs/agent-runtime/examples) - Working MCP examples
