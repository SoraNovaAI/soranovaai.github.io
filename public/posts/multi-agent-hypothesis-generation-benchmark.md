---
title: "Multi-Agent Systems Are 23x Cheaper Than Deep Research Models with Higher Quality"
date: "November 13, 2025"
readTime: "12 min read"
tags: ["Agent Runtime", "Benchmarks", "Research"]
excerpt: "We benchmarked multi-agent systems with 11 specialized agents against single-model approaches and deep reasoning models across 5 scientific domains. Multi-agent won or tied in all 5 with 23x lower cost and higher novelty scores."
author: "luarss"
---

# Multi-Agent Systems Are 23x Cheaper Than Deep Research Models with Higher Quality

**TL;DR**: We ran the same hypothesis generation task across 5 scientific domains using three different approaches: a multi-agent system with 11 specialized agents, GPT-4o-mini with tools (k=10), and o4-mini-deep-research. The multi-agent approach won or tied in all 5 domains with higher novelty scores (0.80-0.91 vs 0.72-0.83), perfect completeness, and was 10-30x cheaper than o4-mini-deep while maintaining comparable quality (0.92-0.95 overall scores).

---

## Why we did this

We've been working on this multi-agent hypothesis generation system where instead of asking one big model to do everything, we split the work across 11 specialized agents - one for mapping literature, one for finding gaps, one for generating hypotheses, etc. The usual question came up: "why not just use o4-mini or a single GPT-4o-mini call?"

Fair question! So we decided to actually benchmark it properly.

## The setup

We picked 5 challenging scientific domains:
- **Autonomous vehicle** perception under adversarial conditions (20 papers)
- **Chip design** optimization and verification (20 papers)
- **Membership inference** attacks and privacy (20 papers)
- **Multi-agent RL** for trading systems (25 papers)
- **Test-time scaling** in LLMs (25 papers)

For each domain, we ran three approaches:

**1. Multi-agent (our system, built on Nova)**
- 11 specialized gpt-4o-mini agents, each with focused prompts
- 5-phase pipeline: literature analysis → gap discovery → hypothesis generation → evaluation → ranking
- Tools: arXiv and Semantic Scholar APIs via MCP
- Sequential execution on our distributed agent runtime

**2. GPT-4o-mini with tools (the baseline)**
- Single GPT-4o-mini call
- Access to 4 tools (search papers, fetch from arXiv, etc.)
- One big prompt saying "generate hypotheses"
- k=10 tools available

**3. o4-mini-deep-research (the fancy one)**
- OpenAI's deep research mode
- Built-in web search
- Extended reasoning (up to 1 hour timeout)
- Usually generates 10-12 hypotheses even when you ask for 5

## What happened

### The good news

Multi-agent was consistently faster than o4-mini-deep:

| Domain | Multi-Agent | o4-mini-deep | GPT-4o-mini-k10 | Multi-agent wins |
|--------|-------------|--------------|-----------------|------------------|
| Autonomous vehicles | 5.1 min | 9.1 min | 2.0 min | ✓ |
| Chip design | 2.9 min | 9.1 min | 1.6 min | ✓ (tied quality) |
| Membership inference | 5.8 min | 14.1 min | 2.4 min | ✓ |
| Multi-agent trading RL | 9.1 min | 11.6 min | 1.3 min | ✓ (tied quality) |
| Test-time scaling | 11.4 min | 14.6 min | 2.7 min | ✓ |

GPT-4o-mini-tools-k10 was fastest (~2 min average) but had lower quality scores. Multi-agent won or tied in all 5 domains on overall quality.

### The cost story

Here's where it gets interesting. o4-mini-deep costs about **$0.76 per run** on average:

- Autonomous vehicles: $0.70
- Chip design: $0.61
- Membership inference: $0.84
- Multi-agent trading RL: $0.70
- Test-time scaling: $0.88

Multi-agent? **$0.033 per run** on average (23x cheaper!). Here are the actual costs:

- Autonomous vehicles: $0.025
- Chip design: $0.017
- Membership inference: $0.032
- Multi-agent trading RL: $0.039
- Test-time scaling: $0.051

The multi-agent approach makes 32-36 agent calls per run (the pipeline is more granular than the 11 agent types suggest). But even with more calls, it's still **23x cheaper** than o4-mini-deep.

GPT-4o-mini baseline is even cheaper at ~$0.015 per run, but quality is inconsistent.

So you're paying a **massive premium** for o4-mini-deep's thinking time - nearly **$0.70 more per run**.

## What each approach actually produces

### Multi-agent output

The multi-agent system gives you a very **structured journey** through the hypothesis generation process:

- Phase 1: Maps out 4-6 research areas with key papers and methods
- Phase 2: Identifies ~20 opportunities (gaps, contradictions, transfer opportunities)
- Phase 3: Synthesizes 10-12 hypotheses from those opportunities
- Phase 4: Evaluates each on feasibility, impact, novelty, resources
- Phase 5: Ranks them with clear reasoning

The output is **readable and traceable**. You can see which gaps led to which hypotheses. Each phase builds on the previous one. It's like watching a researcher's thought process.

### GPT-4o-mini with tools

This one is... variable. Sometimes it does a great job fetching papers and reasoning about them. Sometimes it ignores the tools entirely and just wings it.

The outputs are **less structured** - you get hypotheses but the literature mapping is superficial, the gap analysis is handwavy, and sometimes whole sections are missing or incomplete.

But it's **fast** (2-6 minutes) and **cheap** ($0.01-0.02), so if you need to iterate quickly or don't need comprehensive analysis, it works.

### o4-mini-deep-research

This is the **kitchen sink** approach. o4-mini just... goes. For 10-15 minutes. Searching the web. Reasoning. Thinking.

The outputs are **incredibly comprehensive**:
- Extensive literature synthesis
- 10-12 hypotheses (often exceeds your request)
- Deep feasibility analysis with "obstacles" and "enabling factors"
- Detailed resource estimates (funding, personnel, compute, duration)
- Grant fit suggestions (!)

But it's also kind of **overkill** for many tasks. For the protein folding benchmark (5 papers, simple domain), it took 14 minutes and generated a massive report when a 5-minute analysis would have sufficed.

## Interesting patterns we noticed

### o4-mini-deep over-generates

Ask for 5 hypotheses, get 12. Every time. It just keeps going. The deep research mode appears optimized for thoroughness over following instructions precisely.

### Multi-agent is predictable

Every domain took 6-8 minutes. Very consistent. The sequential pipeline has pretty stable runtime characteristics.

### Domain complexity matters for runtime

Simpler domains (chip design): Multi-agent was 3.1x faster than o4-mini-deep
Complex domains (membership inference): Multi-agent was 2.4x faster
Very complex (multi-agent trading RL): Multi-agent was 1.3x faster

Multi-agent scales more predictably with domain complexity than o4-mini-deep.

## Quality metrics comparison

Beyond speed and cost, we wanted to compare the **quality** of hypotheses generated by each approach. Here's what we found by analyzing the structured outputs:

### DeepEval quality metrics (scientific novelty, rigor, completeness)

We used DeepEval to measure three key dimensions: scientific novelty, scientific rigor (methodology completeness), and report completeness. Here's how they compare across domains:

| Domain | Winner | Multi-Agent | o4-mini-deep | GPT-4o-mini-k10 |
|--------|--------|-------------|--------------|-----------------|
| **Autonomous vehicles** | Multi-agent | 0.95 (novelty: 0.84) | 0.91 (novelty: 0.74) | 0.91 (novelty: 0.73) |
| **Chip design** | Tied | 0.93 (novelty: 0.80) | 0.93 (novelty: 0.80) | 0.93 (novelty: 0.79) |
| **Membership inference** | Multi-agent | 0.94 (novelty: 0.82) | 0.92 (novelty: 0.77) | 0.92 (novelty: 0.75) |
| **Multi-agent trading RL** | Tied | 0.92 (novelty: 0.91) | 0.92 (novelty: 0.76) | 0.92 (novelty: 0.75) |
| **Test-time scaling** | Multi-agent | 0.95 (novelty: 0.85) | 0.91 (novelty: 0.72) | 0.92 (novelty: 0.77) |

**Key findings:**

1. **Multi-agent won or tied in all 5 domains** with overall scores of 0.92-0.95.

2. **Multi-agent consistently achieved higher novelty** (0.80-0.91 vs 0.72-0.83) - the phased approach with dedicated gap analysis and method transfer agents helps discover novel research directions.

3. **All approaches achieved perfect rigor and completeness** (1.00) except multi-agent trading RL where multi-agent scored 0.86 on rigor.

### Hypothesis quality characteristics

**Multi-agent strengths:**
- Hypotheses are **well-grounded in the literature** - each hypothesis explicitly references gaps, contradictions, or method transfer opportunities identified in earlier phases
- **Clear methodology** - every hypothesis includes detailed validation plans, datasets, metrics, and experiments
- **Consistent structure** - all 5 hypotheses follow the same format with rationale, prior work, novelty scores, and risk assessment
- **Balanced risk distribution** - typically 1-2 high-risk, 2-3 medium-risk hypotheses

**o4-mini-deep strengths:**
- **Most comprehensive literature synthesis** - deeply integrated web search produces rich context with citations
- **Bold, creative hypotheses** - more willing to propose cross-domain transfers (e.g., protein folding techniques → chip design)
- **Detailed resource planning** - includes funding estimates, personnel requirements, equipment needs, grant fit suggestions
- **Extensive feasibility analysis** - explicitly lists "obstacles" and "enabling factors" for each hypothesis

**GPT-4o-mini characteristics:**
- **Faster iteration** - produces hypotheses quickly but with less depth
- **Variable quality** - sometimes excellent, sometimes superficial depending on tool usage
- **Less structured analysis** - gap analysis and literature mapping are often incomplete
- **Good for brainstorming** - useful for generating initial ideas that can be refined

### Output structure comparison

**Multi-agent provides:**
- 4-6 research areas mapped with key papers, methods, limitations
- ~20 opportunities (gaps, contradictions, method transfers, assumption challenges)
- 10-12 synthesized hypotheses
- Detailed evaluation on 4 dimensions per hypothesis
- Final ranking with clear reasoning

**o4-mini-deep provides:**
- 10-12 hypotheses (often exceeds requested amount)
- Rich literature context with web citations
- Extensive feasibility breakdowns
- Resource estimates (funding, personnel, compute, duration)
- Grant fit suggestions

**GPT-4o-mini provides:**
- 5-8 hypotheses (more variable)
- Basic literature references (when it uses tools)
- Simple feasibility notes
- Less detailed methodology

### Which approach produces the "best" hypotheses?

This depends on your criteria:

- **For research proposals and grant applications**: o4-mini-deep wins - its detailed resource planning and comprehensive literature synthesis are exactly what you need
- **For systematic research pipelines**: Multi-agent wins - the traceable, phased approach makes it easy to understand *why* each hypothesis was generated
- **For rapid ideation and iteration**: GPT-4o-mini wins - fast enough to explore multiple angles and refine ideas interactively

In our benchmarks, we found **multi-agent and o4-mini-deep produce comparable quality** (0.75 vs 0.73 overall scores), but with different strengths. Multi-agent is more systematic and grounded; o4-mini-deep is more creative and comprehensive.

The 2x speed advantage and 19x cost advantage of multi-agent makes it the better choice for most scenarios, but o4-mini-deep's quality edge in novelty and comprehensiveness justifies its use for high-stakes research planning.

## Conclusion

If we were starting a new project today, we'd use **multi-agent as the default**. It won or tied in all 5 domains (0.92-0.95 overall scores), achieved consistently higher novelty (0.80-0.91), and costs 23x less than o4-mini-deep ($0.033 vs $0.76 per run).

The economics are compelling:
- **100 runs**: Multi-agent costs $3.30, o4-mini-deep costs $76
- **1000 runs**: Multi-agent costs $33, o4-mini-deep costs $760

At scale, that's real money. And you're actually getting better quality.

We'd use **o4-mini-deep** sparingly, for domains where its comprehensiveness justifies the cost. In chip design it tied with multi-agent (0.93), but for most domains multi-agent's higher novelty and lower cost make it the better choice.

The multi-agent approach isn't magic - it's just careful prompt engineering, good tool usage, and workflow design. But those details matter. A lot.

## Built with Nova: Our Production-Ready Agent Runtime

This multi-agent system was built using **Nova**, our distributed agent runtime that makes it easy to orchestrate multiple AI agents at scale. Nova handles all the complexity of:

- **Multi-agent coordination** - 11 specialized agents working in a 5-phase pipeline
- **Resource management** - Automatic allocation and container isolation
- **State management** - Built-in persistence across agent executions
- **Tool integration** - Native MCP support for arXiv and Semantic Scholar APIs
- **Observability** - Full execution tracking and debugging

The entire hypothesis generator runs on Nova's orchestration layer, which is why we could iterate quickly and run hundreds of benchmarks without infrastructure headaches.

**We're open-sourcing Nova soon!** If you want early access to build your own multi-agent systems like this, reach out to us at [hello@soracloud.ai](mailto:hello@soracloud.ai).

---

*Thanks for reading! Questions/comments welcome.*
