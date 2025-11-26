---
title: "Troubleshooting"
order: 3
category: "Reference"
---

# Agent Runtime Troubleshooting Guide

This guide helps you diagnose and resolve common issues when working with Agent Runtime.

## Table of Contents

- [Configuration Errors](#configuration-errors)
- [API & Connection Errors](#api--connection-errors)
- [Tool Execution Errors](#tool-execution-errors)
- [Type Validation Errors](#type-validation-errors)
- [Context & Memory Errors](#context--memory-errors)
- [Workflow Errors](#workflow-errors)
- [Debugging Techniques](#debugging-techniques)
- [Getting Help](#getting-help)

---

## Configuration Errors

### "OPENAI_API_KEY not found" / "ANTHROPIC_API_KEY not found"

**Cause**: The required API key environment variable is not set.

**Solutions**:

1. Set the environment variable:

   ```bash
   export OPENAI_API_KEY="sk-..."
   # or
   export ANTHROPIC_API_KEY="sk-ant-..."
   ```

2. Pass it explicitly in code:

   ```python
   from agent_runtime.types.config import OpenAILLMConfig

   llm_config = OpenAILLMConfig(
       model="gpt-4o",
       token_budget=4000,
       api_key="sk-..."  # Direct API key
   )
   ```

3. Use a `.env` file with python-dotenv:

   ```python
   from dotenv import load_dotenv
   load_dotenv()  # Load before importing agent_runtime
   ```

### "Invalid configuration" / Pydantic ValidationError

**Cause**: YAML or Python configuration has invalid fields or types.

**Example error**:

```text
ValidationError: 1 validation error for AgentConfig
llm -> token_budget
  value is not a valid integer (type=type_error.integer)
```

**Solutions**:

1. Check YAML syntax:

   ```yaml
   # Wrong - string instead of integer
   token_budget: "4000"

   # Correct
   token_budget: 4000
   ```

2. Verify required fields are present:

   ```yaml
   # Required fields for AgentConfig
   id: "my-agent"
   description: "Agent description"
   specialization_prompt: "System prompt"
   llm:
     provider: "openai"
     model: "gpt-4o"
     token_budget: 4000
   ```

3. Check enum values:

   ```yaml
   # Wrong
   tools:
     mode: "everything"  # Invalid

   # Correct
   tools:
     mode: "all"  # Valid: "all", "python_only", "mcp_only"
   ```

### "Module not found" for tool or config import

**Cause**: The Python import path is incorrect or the module isn't in PYTHONPATH.

**Example error**:

```text
ImportError: cannot import 'search_web' from 'myproject.tools'
```

**Solutions**:

1. Verify the import works manually:

   ```python
   from myproject.tools import search_web
   ```

2. Check your PYTHONPATH includes the project root:

   ```bash
   export PYTHONPATH="${PYTHONPATH}:$(pwd)"
   ```

3. Verify the function name matches:

   ```yaml
   # This must match the actual function name
   - type: "python"
     tool: "myproject.tools.search_web"  # Case-sensitive
   ```

---

## API & Connection Errors

### "Connection refused" / "Cannot connect to API"

**Cause**: Network issues or incorrect API endpoint.

**Solutions**:

1. Check internet connectivity
2. Verify API endpoint is correct:

   ```python
   # For Ollama, ensure base_url is correct
   llm_config = OllamaLLMConfig(
       model="llama3.1:8b",
       token_budget=4000,
       base_url="http://localhost:11434/v1"  # Check port
   )
   ```

3. Check if local services are running:

   ```bash
   # For Ollama
   ollama serve

   # Verify it's running
   curl http://localhost:11434/api/tags
   ```

### "Rate limit exceeded"

**Cause**: Too many requests to the LLM API.

**Solutions**:

1. Add delays between requests:

   ```python
   import asyncio

   for item in items:
       result = await agent.run(item)
       await asyncio.sleep(1)  # 1 second delay
   ```

2. Reduce concurrency:

   ```python
   # Instead of gathering all at once
   results = await asyncio.gather(*[agent.run(x) for x in items])

   # Process in batches
   async def process_batch(items, batch_size=5):
       results = []
       for i in range(0, len(items), batch_size):
           batch = items[i:i + batch_size]
           batch_results = await asyncio.gather(*[agent.run(x) for x in batch])
           results.extend(batch_results)
           await asyncio.sleep(2)
       return results
   ```

3. Set rate limiting (not yet enforced):

   ```bash
   export ART_LLM_RATE_LIMIT_RPM=60
   ```

### "Request timeout"

**Cause**: LLM request took too long.

**Solutions**:

1. Increase timeout:

   ```bash
   export ART_LLM_TIMEOUT_MS=60000  # 60 seconds
   ```

2. Reduce token budget for faster responses:

   ```python
   llm_config = OpenAILLMConfig(
       model="gpt-4o-mini",  # Faster model
       token_budget=2000,    # Smaller budget
   )
   ```

3. Enable retries:

   ```bash
   export ART_LLM_MAX_RETRIES=3
   export ART_LLM_RETRY_DELAY_MS=2000
   ```

### "401 Unauthorized" / "Invalid API key"

**Cause**: API key is invalid, expired, or for wrong service.

**Solutions**:

1. Verify the key is correct:

   ```bash
   # Test OpenAI key
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer $OPENAI_API_KEY"
   ```

2. Check you're using the right key for the provider:

   ```python
   # OpenAI key starts with "sk-"
   # Anthropic key starts with "sk-ant-"
   ```

3. Check key hasn't been revoked or expired

---

## Tool Execution Errors

### "Tool not found" / "Unknown tool"

**Cause**: Tool name doesn't match registered tools.

**Solutions**:

1. List available tools to verify names:

   ```python
   from agent_runtime.tool import ToolClient

   async def list_tools():
       client = ToolClient()
       await client.initialize()  # If using MCP
       tools = await client.list_tools()
       for tool in tools:
           print(f"- {tool.name}")
   ```

2. Check namespacing for MCP tools:

   ```python
   # MCP tools are namespaced as {server}__{tool}
   # e.g., "github__search_repositories"
   ```

3. Verify tool is registered in config:

   ```yaml
   tools:
     sources:
       - type: "python"
         tool: "myproject.tools.my_tool"  # Must be listed
   ```

### "Tool execution failed"

**Cause**: The tool function raised an exception.

**Solutions**:

1. Enable debug mode to see the error:

   ```python
   agent = create_agent(config, debug=True)
   ```

2. Test the tool directly:

   ```python
   from myproject.tools import my_tool

   # Test synchronously
   result = my_tool("test input")
   print(result)
   ```

3. Add error handling in your tool:

   ```python
   @to_tool
   def safe_tool(param: str) -> str:
       """Tool with error handling."""
       try:
           # Your logic
           return result
       except Exception as e:
           return f"Error: {str(e)}"
   ```

### "MCP server failed to start"

**Cause**: MCP server binary not found or crashed on startup.

**Solutions**:

1. Test the MCP command directly:

   ```bash
   npx -y @modelcontextprotocol/server-github
   ```

2. Check required environment variables:

   ```bash
   echo $GITHUB_TOKEN  # Must be set
   ```

3. Increase startup timeout:

   ```bash
   export ART_MCP_STARTUP_TIMEOUT_S=30
   ```

4. Check for stderr output:

   ```python
   # Enable debug mode to see server logs
   agent = create_agent(config, debug=True)
   ```

### "Tool call timed out"

**Cause**: Tool execution took too long.

**Solutions**:

1. Increase MCP timeout:

   ```bash
   export ART_MCP_SESSION_TIMEOUT_S=120
   ```

2. Optimize your tool implementation
3. Add progress logging to identify slow operations

---

## Type Validation Errors

### "Output doesn't match schema"

**Cause**: LLM output can't be parsed into the Pydantic model.

**Example error**:

```text
ValidationError: 1 validation error for AnalysisResult
confidence
  field required (type=value_error.missing)
```

**Solutions**:

1. Make fields optional with defaults:

   ```python
   class AnalysisResult(BaseModel):
       summary: str
       confidence: float = 0.5  # Default value
       details: str | None = None  # Optional
   ```

2. Improve the `on_end` prompt:

   ```yaml
   on_end:
     model: "myproject.models.AnalysisResult"
     prompt: |
       Return the result as JSON matching this exact schema:
       {
         "summary": "string",
         "confidence": 0.0-1.0,
         "details": "string or null"
       }
   ```

3. Use less strict validation:

   ```python
   class FlexibleModel(BaseModel):
       model_config = {"extra": "ignore"}  # Ignore extra fields
   ```

### "Invalid type for field"

**Cause**: LLM returned wrong type (e.g., string instead of number).

**Solutions**:

1. Allow type coercion:

   ```python
   from pydantic import field_validator

   class Result(BaseModel):
       score: float

       @field_validator("score", mode="before")
       @classmethod
       def coerce_score(cls, v):
           if isinstance(v, str):
               return float(v)
           return v
   ```

2. Use `Union` types:

   ```python
   class Result(BaseModel):
       value: int | str  # Accept either
   ```

---

## Context & Memory Errors

### "Context window exceeded"

**Cause**: Conversation history is too long for the model.

**Solutions**:

1. Enable compaction:

   ```python
   from agent_runtime.types.config import CompactionConfig

   compaction = CompactionConfig(
       strategy="summarization",
       max_context_tokens=100000,
       target_ratio=0.7,
       preserve_recent=5,
   )
   ```

2. Start a new context:

   ```python
   # Old context
   context = RunContext()
   await agent.run("Message 1", context=context)
   await agent.run("Message 2", context=context)

   # Reset for new conversation
   context = RunContext()
   await agent.run("New conversation", context=context)
   ```

3. Reduce token budget:

   ```python
   llm_config = OpenAILLMConfig(
       model="gpt-4o",
       token_budget=4000,  # Smaller responses
   )
   ```

### "Token estimation inaccurate"

**Cause**: Token counting differs from provider's actual counting.

**Solutions**:

1. Add safety margin:

   ```python
   compaction = CompactionConfig(
       max_context_tokens=90000,  # Below 128k limit
       target_ratio=0.6,          # More aggressive
   )
   ```

2. Monitor actual usage:

   ```python
   context = RunContext()
   await agent.run("Query", context=context)

   for event in context.usage_history:
       print(f"Prompt: {event.prompt_tokens}, Completion: {event.completion_tokens}")
   ```

---

## Workflow Errors

### "Block not found"

**Cause**: Workflow references a block that doesn't exist.

**Solutions**:

1. Verify block IDs match:

   ```yaml
   blocks:
     - id: "analyze"  # This ID
       description: "Analyze data"
       tasks: [...]

   # Must match when referencing
   ```

2. Check for typos in block references

### "Task failed in block"

**Cause**: A task within a block raised an exception.

**Solutions**:

1. Add rescue handling:

   ```yaml
   blocks:
     - id: "risky-operation"
       tasks:
         - type: "agent"
           agent_config: "configs/agent.yaml"
       rescue:
         - type: "agent"
           agent_config: "configs/fallback.yaml"
   ```

2. Check individual agent configurations

### "Coordinator failed to delegate"

**Cause**: Coordinator agent couldn't determine which blocks to run.

**Solutions**:

1. Improve block descriptions:

   ```yaml
   blocks:
     - id: "research"
       description: |
         Research the topic using web search and academic sources.
         Use this for gathering information and facts.
   ```

2. Reduce number of blocks (simpler decisions)
3. Use sequential runner for predictable execution

---

## Debugging Techniques

### Enable Debug Mode

```python
agent = create_agent(config, debug=True)
```

Shows:

- Messages sent to LLM
- Tool calls and results
- Compaction events

### Enable Performance Timing

```bash
MEASURE_TIME=true python your_script.py
```

Logs execution time for all operations.

### Inspect RunContext

```python
context = RunContext()
result = await agent.run("Query", context=context)

print(f"Messages: {len(context.messages)}")
print(f"Tokens: {context.estimated_tokens}")
print(f"Errors: {context.err_context}")
print(f"Compactions: {len(context.compaction_history)}")
```

### Structured Logging

```python
import logging
import structlog

structlog.configure(
    processors=[structlog.dev.ConsoleRenderer()],
    wrapper_class=structlog.make_filtering_bound_logger(logging.DEBUG),
)
```

### Test Components Individually

```python
# Test tool in isolation
from myproject.tools import my_tool
result = my_tool("test")

# Test config loading
from agent_runtime.types.config import AgentConfig
config = AgentConfig.parse_config(Path("config.yaml"))
print(config)

# Test LLM connection
from agent_runtime.agent.client import create_llm_client
client = create_llm_client(llm_config)
response = await client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hi"}],
)
```

---

## Getting Help

### Before Asking for Help

1. Enable debug mode and check logs
2. Verify your configuration is valid
3. Test components individually
4. Check this troubleshooting guide

### Information to Include

When reporting issues, include:

1. **Error message**: Full traceback
2. **Configuration**: Sanitized YAML/Python config (remove API keys)
3. **Environment**: Python version, OS, Agent Runtime version
4. **Minimal reproduction**: Simplest code that shows the issue

### Resources

- [User Guide](/docs/agent-runtime/user-guide) - Complete usage documentation
- [Developer Guide](/docs/agent-runtime/developer-guide) - Internals and extension
- [Examples](/docs/agent-runtime/examples) - Working code examples

---

## Quick Reference

### Environment Variables

```bash
# API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# LLM Configuration
ART_LLM_TIMEOUT_MS=30000
ART_LLM_MAX_RETRIES=3
ART_LLM_RETRY_DELAY_MS=1000

# MCP Configuration
ART_MCP_STARTUP_TIMEOUT_S=5
ART_MCP_SESSION_TIMEOUT_S=60
ART_MCP_CONCURRENCY_LIMIT=25

# Agent Configuration
ART_AGENT_MAX_RETRIES=5

# Debugging
MEASURE_TIME=true
```

### Common Fixes

| Issue | Quick Fix |
| ----- | --------- |
| API key not found | `export OPENAI_API_KEY="sk-..."` |
| Timeout | `export ART_LLM_TIMEOUT_MS=60000` |
| MCP won't start | `export ART_MCP_STARTUP_TIMEOUT_S=30` |
| Context too long | Enable compaction in LLM config |
| Tool not found | Check namespacing: `server__tool` |
| Type error | Make fields optional or add validators |
