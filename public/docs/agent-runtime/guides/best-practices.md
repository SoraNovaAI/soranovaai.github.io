---
title: "Best Practices"
order: 5
category: "Guides"
---

# Best Practices

This guide covers best practices for building reliable agents: evaluation loops, prompt engineering, tool design, and error handling.

## Quality Assurance & Evaluation

### Evaluation Loops

Agent Runtime can automatically evaluate responses and retry if they don't meet quality standards using DeepEval.

```yaml
# agent_config.yaml
id: "quality-agent"
description: "Agent with quality evaluation"
specialization_prompt: "Provide accurate, well-structured responses."

llm:
  provider: "openai"
  model: "gpt-4o"
  token_budget: 8000

evaluator:
  metrics:
    - name: "answer_relevancy"
      weight: 0.5
    - name: "faithfulness"
      weight: 0.3
    - name: "contextual_relevancy"
      weight: 0.2
  threshold: 0.7
  max_iteration: 3
```

### How Evaluation Works

1. Agent generates a response
2. Evaluator scores the response against metrics
3. If score < threshold, agent retries with feedback
4. Process repeats until threshold met or max_iteration reached

### Available Metrics

DeepEval provides various metrics:

| Metric | Description |
|--------|-------------|
| `answer_relevancy` | Is the answer relevant to the question? |
| `faithfulness` | Is the answer faithful to the context? |
| `contextual_relevancy` | Is the retrieved context relevant? |
| `bias` | Does the answer contain bias? |
| `toxicity` | Does the answer contain toxic content? |

### Custom Thresholds

Set different thresholds per metric:

```yaml
evaluator:
  metrics:
    - name: "answer_relevancy"
      weight: 0.6
      threshold: 0.8  # Stricter threshold for relevancy
    - name: "faithfulness"
      weight: 0.4
      threshold: 0.6
  max_iteration: 3
```

---

## Prompt Engineering

- Be specific about desired output format
- Include examples in the system prompt
- Specify constraints and limitations
- Use clear, unambiguous language

## Tool Design

- Write comprehensive docstrings (the LLM uses these to understand tools)
- Use type hints for all parameters
- Return structured data (dicts, lists) over raw strings
- Handle errors gracefully with informative messages

## Error Handling

```python
from agent_runtime.types.errors import ToolCallError, RetryBudgetExceeded

try:
    result = await agent.run("Your query")
except ToolCallError as e:
    print(f"Tool failed: {e}")
except RetryBudgetExceeded as e:
    print(f"Max retries exceeded: {e}")
```

---

## Next Steps

- See the [Configuration Reference](/docs/agent-runtime/configuration) for all configuration options
- Check [Troubleshooting](/docs/agent-runtime/troubleshooting) for common issues
- Browse [Examples](/docs/agent-runtime/examples) for working code samples
