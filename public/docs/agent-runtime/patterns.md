---
title: "Patterns"
order: 4
category: "Guides"
---

# Agent Runtime Patterns Guide

This guide provides reusable patterns for common use cases. Each pattern includes motivation, architecture, complete code, and configuration.

## Table of Contents

- [Research Agent Pattern](#research-agent-pattern)
- [Data Extraction Pattern](#data-extraction-pattern)
- [Classification Agent Pattern](#classification-agent-pattern)
- [Multi-Turn Conversation Pattern](#multi-turn-conversation-pattern)
- [Approval Workflow Pattern](#approval-workflow-pattern)
- [Parallel Analysis Pattern](#parallel-analysis-pattern)

---

## Research Agent Pattern

### Use Case

You need an agent that gathers information from multiple sources, synthesizes findings, and provides well-cited responses.

### Architecture

```text
User Query → Research Agent → [Search Tools] → Synthesized Response
                    ↓
            Evaluation Loop (accuracy, faithfulness)
```

### Configuration

```yaml
# configs/research_agent.yaml
id: "research-agent"
description: "Researches topics with source verification"
specialization_prompt: |
  You are a thorough research assistant. When given a topic:

  1. Search for information from multiple sources
  2. Cross-reference facts between sources
  3. Synthesize findings into a clear summary
  4. Always cite your sources with [Source Name]
  5. Acknowledge any limitations or uncertainties

  Be objective and present multiple perspectives when relevant.

llm:
  provider: "openai"
  model: "gpt-4o"
  token_budget: 8000
  compaction:
    strategy: "summarization"
    max_context_tokens: 100000
    preserve_recent: 5

tools:
  mode: "all"
  sources:
    - type: "mcp"
      mcp_servers: "myproject.configs.mcp_servers.SEARCH_CONFIG"
    - type: "python"
      tool: "myproject.tools.search_academic"

evaluator:
  metrics:
    - name: "faithfulness"
      weight: 0.5
    - name: "answer_relevancy"
      weight: 0.3
    - name: "contextual_relevancy"
      weight: 0.2
  threshold: 0.75
  max_iteration: 3
```

### MCP Configuration

```python
# configs/mcp_servers.py
SEARCH_CONFIG = {
    "mcpServers": {
        "brave-search": {
            "command": "npx",
            "args": ["-y", "@anthropic/server-brave-search"],
            "env": {
                "BRAVE_API_KEY": "${BRAVE_API_KEY}"
            }
        }
    }
}
```

### Custom Tool

```python
# tools/search_academic.py
from agent_runtime import to_tool

@to_tool
def search_academic(query: str, max_results: int = 5) -> list[dict]:
    """Search academic papers and publications.

    Args:
        query: Search query for academic content
        max_results: Maximum number of papers to return

    Returns:
        List of papers with title, abstract, authors, and URL
    """
    # Implementation using Semantic Scholar, arXiv, etc.
    import requests

    response = requests.get(
        "https://api.semanticscholar.org/graph/v1/paper/search",
        params={"query": query, "limit": max_results},
    )

    papers = []
    for paper in response.json().get("data", []):
        papers.append({
            "title": paper["title"],
            "abstract": paper.get("abstract", ""),
            "authors": [a["name"] for a in paper.get("authors", [])],
            "url": f"https://semanticscholar.org/paper/{paper['paperId']}",
        })

    return papers
```

### Usage

```python
import asyncio
from pathlib import Path
from agent_runtime import create_agent
from agent_runtime.types.config import AgentConfig
from agent_runtime.types.context import RunContext

async def research_topic(topic: str) -> str:
    config = AgentConfig.parse_config(Path("configs/research_agent.yaml"))
    agent = create_agent(config)

    context = RunContext()
    result = await agent.run(
        f"Research the following topic and provide a comprehensive summary: {topic}",
        context=context,
    )

    print(f"Tokens used: {context.estimated_tokens}")
    return result

# Example
result = asyncio.run(research_topic("Recent advances in transformer architectures"))
print(result)
```

---

## Data Extraction Pattern

### Use Case

Extract structured data from unstructured text like documents, emails, or web pages.

### Architecture

```text
Raw Text → Extraction Agent → Structured Output (Pydantic Model)
                  ↓
          Type Validation
```

### Output Model

```python
# models/extraction.py
from pydantic import BaseModel

class ContactInfo(BaseModel):
    name: str
    email: str | None = None
    phone: str | None = None
    company: str | None = None
    title: str | None = None

class ExtractedContacts(BaseModel):
    contacts: list[ContactInfo]
    extraction_confidence: float
```

### Configuration

```yaml
# configs/extractor_agent.yaml
id: "contact-extractor"
description: "Extracts contact information from text"
specialization_prompt: |
  You are a precise data extraction assistant. Your task is to extract
  contact information from the provided text.

  Rules:
  - Extract all contacts mentioned in the text
  - Use null for fields that are not present
  - Normalize phone numbers to E.164 format when possible
  - Preserve original capitalization for names and companies
  - Set extraction_confidence based on data clarity (0.0-1.0)

llm:
  provider: "openai"
  model: "gpt-4o"
  token_budget: 2000

on_end:
  model: "myproject.models.extraction.ExtractedContacts"
  prompt: "Structure the extracted contacts using the ExtractedContacts schema."
```

### Usage

```python
import asyncio
from pathlib import Path
from agent_runtime import create_agent
from agent_runtime.types.config import AgentConfig
from myproject.models.extraction import ExtractedContacts

async def extract_contacts(text: str) -> ExtractedContacts:
    config = AgentConfig.parse_config(Path("configs/extractor_agent.yaml"))
    agent = create_agent(config)

    result = await agent.run(f"Extract all contact information from:\n\n{text}")

    return result

# Example
email_text = """
Hi Team,

Please reach out to our new partners:
- Sarah Chen (sarah.chen@techcorp.com) - VP of Engineering at TechCorp
- Mike Johnson at Startup Inc, phone: +1-555-123-4567

Best,
Alex
"""

result = asyncio.run(extract_contacts(email_text))
for contact in result.contacts:
    print(f"{contact.name} - {contact.email} - {contact.company}")
```

---

## Classification Agent Pattern

### Use Case

Classify input into predefined categories with confidence scores.

### Architecture

```text
Input Text → Classification Agent → Category + Confidence
                     ↓
              Fast Model (gpt-4o-mini)
```

### Output Model

```python
# models/classification.py
from pydantic import BaseModel

class Classification(BaseModel):
    category: str
    confidence: float
    reasoning: str
```

### Configuration

```yaml
# configs/classifier_agent.yaml
id: "support-classifier"
description: "Classifies customer support tickets"
specialization_prompt: |
  You are a customer support ticket classifier. Classify each ticket into
  exactly one of these categories:

  - billing: Payment, invoices, refunds, subscriptions
  - technical: Bugs, errors, how-to questions, integrations
  - account: Login, password, profile, settings
  - feature: Feature requests, suggestions, feedback
  - other: Anything that doesn't fit above

  Provide:
  - category: The classification label
  - confidence: Your confidence (0.0-1.0)
  - reasoning: Brief explanation for the classification

llm:
  provider: "openai"
  model: "gpt-4o-mini"  # Fast and cost-effective for classification
  token_budget: 500

on_end:
  model: "myproject.models.classification.Classification"
  prompt: "Return the classification result."
```

### Usage

```python
import asyncio
from pathlib import Path
from agent_runtime import create_agent
from agent_runtime.types.config import AgentConfig

async def classify_ticket(ticket_text: str):
    config = AgentConfig.parse_config(Path("configs/classifier_agent.yaml"))
    agent = create_agent(config)

    result = await agent.run(f"Classify this support ticket:\n\n{ticket_text}")

    return result

# Example
ticket = "I can't log in to my account. It says my password is wrong but I'm sure it's correct."

result = asyncio.run(classify_ticket(ticket))
print(f"Category: {result.category}")
print(f"Confidence: {result.confidence}")
print(f"Reasoning: {result.reasoning}")
```

### Batch Classification

```python
import asyncio
from pathlib import Path
from agent_runtime import create_agent
from agent_runtime.types.config import AgentConfig

async def classify_batch(tickets: list[str]):
    config = AgentConfig.parse_config(Path("configs/classifier_agent.yaml"))
    agent = create_agent(config)

    # Run classifications in parallel
    tasks = [agent.run(f"Classify: {ticket}") for ticket in tickets]
    results = await asyncio.gather(*tasks)

    return results
```

---

## Multi-Turn Conversation Pattern

### Use Case

Maintain context across multiple interactions for a conversational experience.

### Architecture

```text
User Message 1 → Agent → Response 1
     ↓                      ↓
    Context ←───────────────┘
     ↓
User Message 2 → Agent → Response 2 (with context)
```

### Configuration

```yaml
# configs/conversational_agent.yaml
id: "assistant"
description: "Conversational assistant with memory"
specialization_prompt: |
  You are a helpful conversational assistant. You have access to the full
  conversation history and should:

  - Reference previous messages when relevant
  - Ask clarifying questions if needed
  - Maintain a consistent personality
  - Remember user preferences mentioned earlier

llm:
  provider: "openai"
  model: "gpt-4o"
  token_budget: 4000
  compaction:
    strategy: "summarization"
    max_context_tokens: 50000
    target_ratio: 0.7
    preserve_recent: 10
```

### Usage

```python
import asyncio
from pathlib import Path
from agent_runtime import create_agent
from agent_runtime.types.config import AgentConfig
from agent_runtime.types.context import RunContext

class ConversationSession:
    def __init__(self, config_path: str):
        config = AgentConfig.parse_config(Path(config_path))
        self.agent = create_agent(config)
        self.context = RunContext()

    async def chat(self, message: str) -> str:
        """Send a message and get a response."""
        return await self.agent.run(message, context=self.context)

    @property
    def message_count(self) -> int:
        return len(self.context.messages)

    @property
    def token_count(self) -> int:
        return self.context.estimated_tokens

async def main():
    session = ConversationSession("configs/conversational_agent.yaml")

    # First turn
    response1 = await session.chat("Hi! I'm working on a Python project.")
    print(f"Assistant: {response1}")

    # Second turn - agent remembers context
    response2 = await session.chat("What testing framework would you recommend?")
    print(f"Assistant: {response2}")

    # Third turn - references earlier context
    response3 = await session.chat("How do I set that up in my project?")
    print(f"Assistant: {response3}")

    print(f"\nTotal messages: {session.message_count}")
    print(f"Total tokens: {session.token_count}")

asyncio.run(main())
```

### Saving and Restoring Sessions

```python
import json
from agent_runtime.types.context import RunContext

def save_session(context: RunContext, path: str):
    """Save conversation state to file."""
    data = {
        "messages": context.messages,
        "compaction_history": context.compaction_history,
    }
    with open(path, "w") as f:
        json.dump(data, f)

def load_session(path: str) -> RunContext:
    """Load conversation state from file."""
    with open(path) as f:
        data = json.load(f)

    context = RunContext()
    context.messages = data["messages"]
    context.compaction_history = data.get("compaction_history", [])
    return context
```

---

## Approval Workflow Pattern

### Use Case

Multi-step process where work is created, reviewed, and approved before finalizing.

### Architecture

```text
Input → Creator Agent → Draft
           ↓
       Reviewer Agent → Feedback
           ↓
       Reviser Agent → Final Version
           ↓
       Approver Agent → Approved/Rejected
```

### Workflow Configuration

```yaml
# workflows/approval_workflow.yaml
id: "content-approval"
description: "Content creation with review and approval"

blocks:
  - id: "create"
    description: "Create initial content draft"
    tasks:
      - type: "agent"
        agent_config: "configs/creator_agent.yaml"

  - id: "review"
    description: "Review the draft for issues"
    tasks:
      - type: "agent"
        agent_config: "configs/reviewer_agent.yaml"

  - id: "revise"
    description: "Revise based on feedback"
    tasks:
      - type: "agent"
        agent_config: "configs/reviser_agent.yaml"

  - id: "approve"
    description: "Final approval decision"
    tasks:
      - type: "agent"
        agent_config: "configs/approver_agent.yaml"
```

### Usage

```python
import asyncio
from pathlib import Path
from agent_runtime.workflow import SequentialWorkflowRunner
from agent_runtime.types.config import Workflow

async def run_approval_workflow(brief: str):
    config = Workflow.parse_config(Path("workflows/approval_workflow.yaml"))
    runner = SequentialWorkflowRunner(config)

    result = await runner.run(brief)

    return result

# Example
brief = """
Create a blog post about the benefits of test-driven development.
Target audience: Junior developers
Length: 800-1000 words
"""

result = asyncio.run(run_approval_workflow(brief))
print(result)
```

---

## Parallel Analysis Pattern

### Use Case

Get multiple perspectives on the same input simultaneously.

### Architecture

```text
              ┌→ Analyst A → Perspective A ─┐
Input ────────┼→ Analyst B → Perspective B ─┼→ Synthesizer → Final Analysis
              └→ Analyst C → Perspective C ─┘
```

### Custom Synthesis

For more control over how perspectives are combined:

```python
import asyncio
from pathlib import Path
from agent_runtime import create_agent
from agent_runtime.types.config import AgentConfig

async def analyze_with_synthesis(proposal: str):
    # Load analyst configs
    technical_config = AgentConfig.parse_config(Path("configs/technical_analyst.yaml"))
    business_config = AgentConfig.parse_config(Path("configs/business_analyst.yaml"))
    risk_config = AgentConfig.parse_config(Path("configs/risk_analyst.yaml"))
    synthesis_config = AgentConfig.parse_config(Path("configs/synthesizer.yaml"))

    # Create agents
    technical = create_agent(technical_config)
    business = create_agent(business_config)
    risk = create_agent(risk_config)
    synthesizer = create_agent(synthesis_config)

    # Run analyses in parallel
    analyses = await asyncio.gather(
        technical.run(proposal),
        business.run(proposal),
        risk.run(proposal),
    )

    # Synthesize results
    synthesis_prompt = f"""
    Synthesize these three analyses into a unified recommendation:

    Technical Analysis:
    {analyses[0]}

    Business Analysis:
    {analyses[1]}

    Risk Analysis:
    {analyses[2]}

    Provide a balanced recommendation considering all perspectives.
    """

    final_result = await synthesizer.run(synthesis_prompt)

    return final_result
```

---

## Best Practices

### Pattern Selection

| Scenario | Recommended Pattern |
| -------- | ------------------- |
| Information gathering | Research Agent |
| Unstructured → structured | Data Extraction |
| Categorization | Classification |
| Chat/dialogue | Multi-Turn Conversation |
| Review processes | Approval Workflow |
| Multiple viewpoints | Parallel Analysis |

### Performance Tips

1. **Use appropriate models**: gpt-4o-mini for simple tasks, gpt-4o for complex reasoning
2. **Set token budgets wisely**: Smaller for classification, larger for research
3. **Enable compaction**: For multi-turn conversations or research agents
4. **Parallel execution**: Use `asyncio.gather()` for independent tasks

### Error Handling

Always wrap agent calls for production:

```python
from agent_runtime.types.errors import ToolCallError, RetryBudgetExceeded

async def safe_agent_call(agent, prompt):
    try:
        return await agent.run(prompt)
    except ToolCallError as e:
        logger.error("Tool failed", error=str(e))
        return None
    except RetryBudgetExceeded as e:
        logger.error("Max retries exceeded", error=str(e))
        return None
```

---

## Further Reading

- [User Guide](/docs/agent-runtime/user-guide) - Complete guide to using Agent Runtime
- [Examples](/docs/agent-runtime/examples) - More code examples
