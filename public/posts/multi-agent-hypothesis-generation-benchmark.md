---
title: "Multi-Agent Systems Are 2x Faster and 19x Cheaper Than Deep Research Models"
date: "November 13, 2025"
readTime: "12 min read"
tags: ["Agent Runtime", "Benchmarks", "Research"]
excerpt: "We benchmarked multi-agent systems with 11 specialized agents against single-model approaches and deep reasoning models. Multi-agent was 2x faster and 19x cheaper while producing comparable quality."
author: "luarss"
---

# Multi-Agent Systems Are 2x Faster and 19x Cheaper Than Deep Reasoning Models

**TL;DR**: We ran the same hypothesis generation task across 5 scientific domains using three different approaches: a multi-agent system with 11 specialized agents, GPT-4o-mini with some tools, and o4-mini-deep-research. The multi-agent approach was consistently 2x faster than o4-mini-deep and 19x cheaper, while actually producing slightly better quality (0.75 vs 0.73 overall score). Multi-agent generates more feasible hypotheses; o4-mini-deep is more novel and comprehensive. GPT-4o-mini was fastest but quality varied significantly.

---

## Why we did this

We've been working on this multi-agent hypothesis generation system where instead of asking one big model to do everything, we split the work across 11 specialized agents - one for mapping literature, one for finding gaps, one for generating hypotheses, etc. The usual question came up: "why not just use o4-mini or a single GPT-4o-mini call?"

Fair question! So we decided to actually benchmark it properly.

## The setup

We picked 5 challenging scientific domains:
- **Drug discovery** for neurodegenerative diseases (20 papers)
- **Multi-agent RL** for trading systems (25 papers)
- **Autonomous vehicle** perception under adversarial conditions (20 papers)
- **Protein folding** (5 papers - the "easy" one)
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

| Domain | Multi-Agent | o4-mini-deep | Speedup |
|--------|-------------|--------------|---------|
| Drug discovery | 7.7 min | 15.4 min | **2.0x** |
| Trading RL | 6.3 min | 10.5 min | **1.7x** |
| Protein folding | 4.6 min | 14.1 min | **3.1x** |
| Autonomous vehicles | 5.6 min | 6.1 min | **1.1x** |
| Test-time scaling | 4.9 min | 12.2 min | **2.5x** |
| **Average** | **5.8 min** | **11.7 min** | **2.0x** |

GPT-4o-mini with tools was fastest overall (~4 min average). See the "Quality metrics comparison" section below for detailed quality analysis.

### The cost story

Here's where it gets interesting. o4-mini-deep costs about **$0.72 per run** on average:

- Drug discovery: $0.82
- Trading RL: $0.79
- Autonomous vehicles: $0.56
- Protein folding: $0.72
- Test-time scaling: $0.79

Multi-agent? **$0.038 per run** on average (19x cheaper!). Here are the actual costs:

- Autonomous vehicles: $0.039 (160k tokens, 34 API calls)
- Drug discovery: $0.041 (156k tokens, 34 API calls)
- Trading RL: $0.047 (188k tokens, 36 API calls)
- Protein folding: $0.021 (77k tokens, 32 API calls)
- Test-time scaling: $0.041 (147k tokens, 34 API calls)

The multi-agent approach makes 32-36 agent calls per run (the pipeline is more granular than the 11 agent types suggest). But even with more calls, it's still **19x cheaper** than o4-mini-deep.

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

### Domain complexity matters more for o4-mini-deep

Simple domains (protein folding): o4-mini-deep took 3x longer than multi-agent
Complex domains (drug discovery): o4-mini-deep took 2x longer
Very complex (trading RL): 1.7x longer

It's like o4-mini-deep has a "minimum depth" it goes to regardless of domain complexity.

## Quality metrics comparison

Beyond speed and cost, we wanted to compare the **quality** of hypotheses generated by each approach. Here's what we found by analyzing the structured outputs:

### Hypothesis scoring breakdown

All three approaches generate hypotheses with scores across 4 dimensions: feasibility, impact, novelty, and resources. Here's how they compare:

| Metric | Multi-Agent | o4-mini-deep | GPT-4o-mini |
|--------|-------------|--------------|-------------|
| **Avg Feasibility** | 0.73 | 0.64 | 0.68 |
| **Avg Impact** | 0.78 | 0.78 | 0.72 |
| **Avg Novelty** | 0.84 | 0.86 | 0.79 |
| **Avg Resources** | 0.63 | 0.62 | 0.70 |
| **Overall Score** | 0.75 | 0.73 | 0.72 |

**Key findings:**

1. **Multi-agent produces more feasible hypotheses** (0.73 vs 0.64). The phased approach with dedicated feasibility assessment helps filter impractical ideas early.

2. **o4-mini-deep edges out on novelty** (0.86 vs 0.84) - its extended reasoning time helps it find more creative combinations.

3. **Impact scores are tied** between multi-agent and o4-mini-deep (0.78), both significantly better than GPT-4o-mini (0.72).

4. **Resource requirements** are similar across approaches, though GPT-4o-mini tends to underestimate complexity (0.70 score = lower resource needs).

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

If we were starting a new project today, we'd use **multi-agent as the default**. It's fast enough (5-6 min), cheap enough ($0.038/run), and produces structured, traceable outputs with quality that matches or exceeds o4-mini-deep (0.75 vs 0.73 overall score).

The economics are compelling:
- **100 runs**: Multi-agent costs $3.80, o4-mini-deep costs $72
- **1000 runs**: Multi-agent costs $38, o4-mini-deep costs $720

At scale, that's real money. And you're not sacrificing quality to save it.

We'd keep **GPT-4o-mini with tools** around for rapid iteration during development. It's fast enough (2-6 min) and cheap enough ($0.015/run) for brainstorming and quick experiments.

We'd use **o4-mini-deep** sparingly, for high-value one-off analyses where we really need maximum comprehensiveness, boldest creative leaps, and detailed grant-ready resource planning. Its slightly higher novelty scores (0.86 vs 0.84) and extensive feasibility breakdowns justify the cost and time in those scenarios.

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
