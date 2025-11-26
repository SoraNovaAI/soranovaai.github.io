---
title: "Examples"
order: 4
category: "Reference"
---

# Agent Runtime Examples & Use Cases

Comprehensive code examples demonstrating Agent Runtime's capabilities for AI agent development.

**Quick Navigation:**

- [Basic Examples](#basic-examples)
- [Multi-Agent Orchestration](#multi-agent-orchestration)
- [YAML Configuration](#yaml-configuration)

**See Also:**

- [User Guide](/docs/agent-runtime/user-guide) - Complete guide to building with Agent Runtime
- [Agents](/docs/agent-runtime/agents) - Agent configuration and capabilities
- [Introduction](/docs/agent-runtime/introduction) - Quick start

---

## Basic Examples

### Single Agent with Local Tools

Create an agent with local Python functions as tools using `AugmentedLLM` (the lower-level API):

```python
from agent_runtime import to_tool
from agent_runtime.agent import AugmentedLLM
from agent_runtime.agent.llm_client import OpenAILLMClient

@to_tool
def calculate(a: float, b: float, operation: str) -> float:
    """Perform basic math operations."""
    if operation == "add":
        return a + b
    elif operation == "multiply":
        return a * b
    return 0.0

async def main():
    # Initialize OpenAI client
    client = OpenAILLMClient(api_key=os.getenv("OPENAI_API_KEY"))

    # AugmentedLLM provides direct control over LLM + tool execution
    llm = AugmentedLLM(
        name="math_assistant",
        model_name="gpt-4o",
        model=client,
        instructions=["You are a helpful math assistant."],
        tools=[calculate]
    )

    result = await llm.run("What is 42 times 17?")
    print(result)
```

**Run with:**

```bash
export OPENAI_API_KEY="your-key"
uv run python your_script.py
```

---

### Agent with MCP Tool Discovery

Automatically discover and use tools from MCP servers:

#### Option 1: Using Agent with MCP Configuration

```python
from pathlib import Path
from agent_runtime import AgentConfig, create_agent

# Load agent config with MCP server filters
config = AgentConfig.parse_config(Path("agent_config.yaml"))

# create_agent handles client creation internally
agent = create_agent(config, debug=True)

result = await agent.run("Research quantum computing breakthroughs")
print(result)
```

**agent_config.yaml:**

```yaml
id: "research_assistant"
description: "Research assistant with MCP tools"
specialization_prompt: "Research thoroughly and cite sources"

llm:
  provider: "openai"
  model: "gpt-4"
  token_budget: 10000

tools:
  mode: "all"
  sources:
    - type: "mcp"
      mcp_servers: "examples.configs.my_mcp.MCP_CONFIG"
```

#### Option 2: Direct AugmentedLLM with ToolClient

```python
from agent_runtime import ToolClient
from agent_runtime.agent import AugmentedLLM
from agent_runtime.agent.llm_client import OpenAILLMClient
from agent_runtime.types.config import ToolsConfig, McpConfig

async def main():
    # Configure and discover tools from MCP servers
    tools_config = ToolsConfig(
        mode="all",
        sources=[McpConfig(mcp_servers="examples.configs.my_mcp.MCP_CONFIG")]
    )
    tool_client = ToolClient(tools_config=tools_config)
    tools_result = await tool_client.list_tools()

    # Initialize OpenAI client
    client = OpenAILLMClient(api_key=os.getenv("OPENAI_API_KEY"))

    # Use AugmentedLLM for direct LLM + tool control
    llm = AugmentedLLM(
        name="research_assistant",
        model_name="gpt-4o",
        model=client,
        instructions=["Research thoroughly and cite sources"],
        tools=tools_result.tools
    )

    result = await llm.run("Research quantum computing breakthroughs")
    print(result)
```

**Prerequisites:** Configure MCP servers using Python modules (see [User Guide](/docs/agent-runtime/user-guide#remote-mcp-servers)) or environment variables (legacy)

---

## Multi-Agent Orchestration

### Coordinator-Based Workflow

Use a coordinator agent to intelligently delegate to specialized blocks:

```python
from pathlib import Path
from agent_runtime.types.config import Workflow
from agent_runtime.workflow import CoordinatorWorkflowRunner

# Load workflow configuration from YAML
workflow = Workflow.parse_config(Path("workflow.yaml"))

# Create coordinator workflow runner
runner = CoordinatorWorkflowRunner(workflow, debug=True)

# Execute workflow with intelligent task delegation
result = await runner.run("Research quantum computing startups for investment")

# Access results from each block
for worker_result in result.worker_results:
    print(f"Block {worker_result.worker_id}: {worker_result.response}")

print(f"Total tokens used: {result.total_tokens}")
```

**Workflow YAML Structure:**

```yaml
name: "Research Workflow"
description: "Multi-agent research with coordinator"

# Coordinator agent (optional - enables intelligent delegation)
agent:
  id: "coordinator"
  description: "Coordinates research workflow"
  specialization_prompt: |
    You coordinate research by delegating to specialized blocks.
    Analyze the query and determine which research areas to cover.
  capabilities:
    skills:
      - "task_delegation"
      - "research_planning"
  llm:
    provider: "openai"
    model: "gpt-4"
    token_budget: 15000
  tools:
    mode: "all"  # Access to all blocks as tools

# Evaluator (optional - quality assurance)
evaluator:
  type: deepeval
  max_iteration: 2
  deepeval:
    llm:
      model: "gpt-4-mini"
    metrics:
      completeness:
        weight: 0.5
        threshold: 0.7

# Blocks serve as specialized workers
blocks:
  - name: "market_research"
    block:
      - type: "agent"
        agent:
          id: "market_researcher"
          description: "Analyzes markets and competition"
          capabilities:
            skills: ["market_analysis", "competitive_intelligence"]
          llm:
            model: "gpt-4"
          tools:
            mode: "all"
            sources:
              - type: "mcp"
                mcp_servers: examples.configs.exa_remote.MCP_CONFIG

  - name: "technical_analysis"
    block:
      - type: "agent"
        agent:
          id: "tech_analyst"
          description: "Evaluates technical architecture"
          capabilities:
            skills: ["technical_analysis"]
          llm:
            model: "gpt-4"
```

**Features:**

- Intelligent task delegation based on query analysis
- Each block can contain multiple tasks (agents, tool calls, shell commands)
- Optional quality evaluation with automatic retry loops
- Coordinator selectively invokes relevant blocks

---

### Sequential Workflow Execution

Execute all blocks in sequence without a coordinator:

```python
from pathlib import Path
from agent_runtime.types.config import Workflow
from agent_runtime.workflow import SequentialWorkflowRunner

# Load workflow (no agent field = sequential mode)
workflow = Workflow.parse_config(Path("sequential_workflow.yaml"))

# Create sequential runner
runner = SequentialWorkflowRunner(workflow, debug=True)

# Execute all blocks with the same query
result = await runner.run("Analyze company X")

# All blocks execute sequentially
for worker_result in result.worker_results:
    print(f"{worker_result.worker_id}: {worker_result.response}")
```

**Use Cases:**

- Parallel-safe batch processing
- Comprehensive multi-perspective analysis
- Deterministic pipeline execution

---

### Block Composition

Blocks can contain multiple task types for complex workflows:

```yaml
# Example YAML configuration
blocks:
  - name: "data_gathering"
    block:
      # 1. Search for information
      - name: "Search for information"
        tool_call:
          tool: "__main__.web_search"
          arguments:
            - "{{ query }}"
            - "{{ query }} features pricing"
            - "{{ query }} reviews ratings"
          llm:
            model: "gpt-4o-mini"
            specialization_prompt: |
              You are a web research specialist. Search for comprehensive information
              about the query and synthesize findings into a clear summary.
          execution:
            mode: "parallel"
            max_concurrent: 2

      # 2. Process with an agent
      - type: "agent"
        agent:
          id: "processor"
          description: "Processes search results"
          llm:
            model: "gpt-4"

      # 3. Save to file
      - type: "exec"
        exec:
          command: "echo '{{ output }}' > results.txt"
```

**Task Types:**

- `agent`: Run an agent with full configuration
- `tool_call`: Direct tool execution (web_search, etc.)
- `exec`: Shell command execution

---

## YAML Configuration

### Single Agent Configuration

Load agent configurations from YAML files:

```yaml
# researcher.yaml
id: researcher
name: Research Assistant
description: Conducts thorough research on topics
specialization_prompt: |
  You are a research specialist. Always cite sources
  and provide comprehensive analysis.
llm:
  provider: "openai"
  model: gpt-4
  token_budget: 10000
capabilities:
  skills:
    - web_search
    - data_analysis
    - report_writing
tools:
  mode: "all"
  sources:
    - type: "mcp"
      mcp_servers: examples.configs.exa_remote.MCP_CONFIG

evaluator:
  type: deepeval
  deepeval:
    llm:
      model: "gpt-4-mini"
    metrics:
      correctness:
        weight: 1.0
        threshold: 0.7
        criteria: |
          Evaluate if the response is factual and well-researched
```

**Load and use in Python:**

```python
from pathlib import Path
from agent_runtime import AgentConfig, create_agent

# Load agent configuration
config = AgentConfig.parse_config(Path("researcher.yaml"))

# Create agent from config
agent = create_agent(config, debug=True)

result = await agent.run("Research quantum computing")
```

---

### Workflow Configuration

Define multi-agent workflows entirely in YAML:

```yaml
# workflow.yaml
name: "Deep Research Workflow"
description: "Multi-agent research with coordinator orchestration"

# Coordinator agent (optional)
agent:
  id: "coordinator"
  description: "Research coordinator"
  specialization_prompt: |
    Coordinate research by delegating to specialized blocks.
  llm:
    provider: "openai"
    model: "gpt-4"
    token_budget: 15000
  tools:
    mode: "all"

# Quality evaluator (optional)
evaluator:
  type: deepeval
  max_iteration: 2
  deepeval:
    llm:
      model: "gpt-4-mini"
    metrics:
      completeness:
        weight: 0.5
        threshold: 0.7

# Specialized research blocks
blocks:
  - name: "market_research"
    block:
      - type: "agent"
        agent:
          id: "market_researcher"
          description: "Market analysis specialist"
          llm:
            model: "gpt-4"

  - name: "technical_research"
    block:
      - type: "agent"
        agent:
          id: "tech_researcher"
          description: "Technical analysis specialist"
          llm:
            model: "gpt-4"
```

**Load and execute:**

```python
from pathlib import Path
from agent_runtime.types.config import Workflow
from agent_runtime.workflow import CoordinatorWorkflowRunner

workflow = Workflow.parse_config(Path("workflow.yaml"))
runner = CoordinatorWorkflowRunner(workflow)
result = await runner.run("Research AI startups")
```

---

### Hybrid Approach (Recommended)

Keep configuration in YAML, orchestration logic in Python:

```python
from pathlib import Path
from agent_runtime.types.config import Workflow
from agent_runtime.workflow import CoordinatorWorkflowRunner, SequentialWorkflowRunner

# Load workflow configuration from YAML
workflow = Workflow.parse_config(Path("workflow.yaml"))

# Choose execution strategy in Python
if complex_query:
    # Use coordinator for intelligent delegation
    runner = CoordinatorWorkflowRunner(workflow, debug=True)
else:
    # Use sequential for simple processing
    runner = SequentialWorkflowRunner(workflow, debug=True)

result = await runner.run(query)
```

---

## Next Steps

- **[User Guide](/docs/agent-runtime/user-guide)** - Complete guide to building with Agent Runtime
- **[Agents](/docs/agent-runtime/agents)** - Agent configuration and capabilities
- **[Context Compaction](/docs/agent-runtime/context-compaction)** - Managing long conversations

---

## More Examples

For additional examples, see the `examples/` directory in the agent-runtime repository:

- `examples/1_agent/` - Agent usage patterns
- `examples/2_workflows/` - Workflow configuration examples
- `examples/3_primitives/` - Low-level AugmentedLLM examples
