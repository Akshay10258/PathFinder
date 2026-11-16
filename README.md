<div align="center">

# Pathfinder

### Mastery-Adaptive Retrieval-Augmented Generation for Personalized DSA Education

[![Python 3.13](https://img.shields.io/badge/Python-3.13-3776AB?logo=python&logoColor=white)](https://python.org)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.141-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.11-EE4C2C?logo=pytorch&logoColor=white)](https://pytorch.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

*An intelligent tutoring system that dynamically adapts retrieval depth, instructional tone, practice difficulty, and study roadmaps to each student's evolving knowledge state — powered by Self-Attentive Knowledge Tracing, hybrid dense-sparse retrieval, and frontier LLMs.*

</div>

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [System Architecture](#system-architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Usage](#usage)
- [Demo Accounts](#demo-accounts)
- [Research & Evaluation](#research--evaluation)
- [Deployment](#deployment)
- [Contributors](#contributors)

---

## Overview

Most educational platforms deliver the same static explanation regardless of whether a student is encountering a concept for the first time or has already demonstrated working competence. **Pathfinder** eliminates this misalignment by maintaining a real-time cognitive model of each student and using it as a single unified signal to control every aspect of the learning experience.

The system combines **Self-Attentive Knowledge Tracing (SAKT)** with a **three-tier heterogeneous Retrieval-Augmented Generation (RAG) pipeline** to produce explanations that are factually grounded in academic sources and calibrated to the individual student's mastery level — from patient, analogy-driven beginner instruction to formal proof-level expert discourse.

### The Core Adaptive Loop

```
Student Interaction
        │
        ▼
┌─────────────────────┐
│  SAKT Knowledge     │◄──── Interaction history
│  Tracing Model      │      (34 DSA concepts)
└────────┬────────────┘
         │ mastery score (0.0 – 1.0)
         │
    ┌────┴────┬──────────┬──────────┐
    ▼         ▼          ▼          ▼
 Retrieval  Generation  Practice  Roadmap
 Tier       Persona     Difficulty  Priority
 Weights    Blending    Calibration Ordering
```

A single mastery estimate simultaneously governs:
- **What sources** to retrieve (textbook proofs vs. intuitive lectures)
- **How to explain** (formal notation vs. everyday analogies)
- **What to ask** (factual recall vs. complexity analysis)
- **What to study next** (weak topics first, mastered ones bypassed)

---

## Key Features

### 🧠 Adaptive AI Tutor
- **Multi-tier RAG pipeline** retrieving from formal textbooks (CLRS), practical tutorials (GeeksforGeeks), and intuitive lectures (MIT OCW)
- **Hybrid retrieval**: FAISS dense vector search + BM25 lexical matching, fused via Reciprocal Rank Fusion and re-ranked with a cross-encoder
- **Continuous persona blending** — not discrete difficulty levels, but a smooth probabilistic blend of three teaching styles based on mastery
- **Real-time pipeline trace** visible in the UI, showing each stage of retrieval and generation as it executes
- **Grounding validation** with a secondary verification pass to suppress hallucinated complexity bounds and theorem attributions

### 📊 Self-Attentive Knowledge Tracing (SAKT)
- Transformer-based sequence model pretrained on **5.5M interactions** (XES3G5M benchmark)
- **Online adaptation**: concept embeddings update with each new interaction while the attention backbone stays frozen
- **Per-concept mastery estimation** with three-way Bayesian smoothing (model prediction + per-concept accuracy + cold-start prior)
- **Ebbinghaus forgetting curve** decay — concepts not reviewed lose mastery over time, triggering proactive review recommendations

### 🎯 Adaptive Practice & Misconception Detection
- **Mastery-calibrated question generation** — difficulty scales from factual recall to proof-sketch questions
- **Four-stage answer evaluation**: semantic similarity, concept coverage, holistic LLM grading, and misconception diagnosis
- **Named misconception detection** — identifies the specific incorrect mental model (e.g., "applying greedy coin selection assumes the greedy choice property holds"), not just "wrong"
- **Closed-loop feedback**: every evaluation updates the SAKT model, shifting future questions and content

### 🗺️ Personalized Roadmap Generator
- **Prerequisite DAG** encoding 34 canonical DSA topic dependencies
- **Intelligent bypass**: topics already mastered are pruned; unmastered prerequisites remain
- **Decay-weighted time allocation**: forgotten topics receive proportionally more study hours
- **Three view modes**: Phase Stages board, Journey Map, and Sprint Table
- **Dual planning**: fluid time-budget mode or calendar-target mode with daily study pace

### 💻 Integrated Coding Practice
- **~145 curated LeetCode & GeeksforGeeks problems** indexed across all 34 topics
- **Mastery-to-difficulty mapping**: Easy at low mastery → Medium → Hard at high mastery
- Surfaced as **inline chips** in tutor responses, **sidebar panels** in practice, and **milestone links** in roadmaps

### 🔬 Research & Evaluation Workbench
- **Live A/B Comparison**: side-by-side adaptive Pathfinder vs. baseline LLM responses
- **Evidence Dashboard**: ablation study results, calibration metrics, and end-to-end evaluation data
- **Mastery Override Slider**: manually set mastery to demonstrate adaptation in real time

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          FRONTEND (Next.js 16)                      │
│  ┌──────┐ ┌────────┐ ┌─────────┐ ┌───────┐ ┌──────────┐ ┌───────┐ │
│  │Tutor │ │Practice│ │Dashboard│ │Roadmap│ │Comparison│ │Profile│ │
│  └──┬───┘ └───┬────┘ └────┬────┘ └───┬───┘ └─────┬────┘ └───┬───┘ │
└─────┼─────────┼──────────┼─────────┼───────────┼─────────┼───────┘
      │         │          │         │           │         │
      └─────────┴──────────┴─────────┴───────────┴─────────┘
                              │ REST + SSE
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        BACKEND (FastAPI)                            │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              Mastery-Adaptive RAG Pipeline                   │   │
│  │                                                              │   │
│  │  ┌──────────┐   ┌───────────────┐   ┌────────────────────┐  │   │
│  │  │ SAKT     │──▶│  Hybrid       │──▶│  Persona-Blended   │  │   │
│  │  │ Knowledge│   │  Retrieval    │   │  Generation        │  │   │
│  │  │ Tracing  │   │  (FAISS+BM25  │   │  + Grounding       │  │   │
│  │  │          │   │   +CrossEnc)  │   │    Validation      │  │   │
│  │  └──────────┘   └───────────────┘   └────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────┐  │
│  │ Question   │  │   Answer     │  │   Roadmap    │  │Pathfinder│  │
│  │ Generator  │  │  Evaluator   │  │   Engine     │  │Validator │  │
│  │            │  │ (4-stage +   │  │ (DAG+LLM     │  │(Grounding│  │
│  │            │  │ misconception│  │  ordering)   │  │  check)  │  │
│  │            │  │  detection)  │  │              │  │          │  │
│  └────────────┘  └──────────────┘  └──────────────┘  └──────────┘  │
│                                                                     │
│  ┌──────────────────┐  ┌──────────────────────────────────────┐     │
│  │   Auth (Supabase  │  │   Persistence (Supabase DB +        │     │
│  │   + Dev Mode)     │  │   Local JSON fallback)              │     │
│  └──────────────────┘  └──────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   ACADEMIC CORPUS (3 Tiers)                         │
│  T1: CLRS Textbook    T2: GeeksforGeeks    T3: MIT OCW Lectures    │
│  (Formal Proofs)      (Code + Examples)    (Intuitive Analogies)   │
└─────────────────────────────────────────────────────────────────────┘


```
<img width="1069" height="663" alt="image" src="https://github.com/user-attachments/assets/025b2622-1872-4607-9b26-5364b7ba6a76" />
---

## Tech Stack

| Layer | Technology | Purpose |
|:------|:-----------|:--------|
| **Knowledge Tracing** | PyTorch, SAKT Transformer | Per-concept mastery prediction with online adaptation |
| **Dense Retrieval** | FAISS (Meta AI), Sentence-Transformers (`all-MiniLM-L6-v2`) | Semantic vector search over the academic corpus |
| **Sparse Retrieval** | Rank-BM25 | Exact keyword and technical terminology matching |
| **Re-Ranking** | Sentence-Transformers (`ms-marco-MiniLM-L-6-v2`) | Cross-encoder deep relevance scoring |
| **LLM Generation** | Google Gemini, OpenAI GPT-4o, Anthropic Claude | Adaptive explanations, question generation, evaluation |
| **Backend** | FastAPI, Uvicorn, SSE-Starlette | REST API with server-sent events for streaming |
| **Frontend** | Next.js 16, React 19, Tailwind CSS 4, Framer Motion | Responsive UI with real-time streaming and animations |
| **Auth & Database** | Supabase (PostgreSQL + Auth) | User authentication, interaction history, session persistence |
| **Visualization** | Recharts, React Flow | Mastery radar charts, knowledge graphs, roadmap views |
| **Deployment** | Render (backend), Vercel (frontend) | Cloud deployment with health checks |

---

## Project Structure

```
pathfinder/
├── backend/                 # FastAPI application server
│   ├── main.py              # All API routes and orchestration
│   ├── auth.py              # Supabase JWT + dev-mode authentication
│   └── persistence.py       # Interaction history storage layer
│
├── retrieval/               # Hybrid retrieval engine
│   ├── retriever.py         # FAISS + BM25 + RRF + cross-encoder pipeline
│   └── topic_map.py         # 34-topic canonical mapping and aliases
│
├── generation/              # Mastery-adaptive generation
│   ├── generator.py         # Persona blending, grounding, structured output
│   └── question_generator.py# Mastery-calibrated question generation
│
├── knowledge_tracing/       # SAKT model and mastery inference
│   ├── predict.py           # Mastery estimation and online adaptation
│   ├── concept_bridge.py    # DSA concept → SAKT embedding mapping
│   └── student_store.py     # Per-student interaction history
│
├── evaluation/              # Answer evaluation and research metrics
│   ├── answer_evaluator.py  # 4-stage fusion pipeline
│   └── eval_comprehensive.py# Ablation study and benchmark runner
│
├── roadmap/                 # Adaptive roadmap generation
│   ├── roadmap_engine.py    # End-to-end orchestration
│   ├── skill_analyzer.py    # SAKT-based skill classification
│   ├── concept_graph.py     # Prerequisite DAG definition
│   ├── topic_ordering.py    # LLM-guided topological ordering
│   └── planning_agent.py    # Grounded step planning with validation
│
├── chunking/                # Corpus-specific document processors
│   ├── chunk_clrs.py        # LaTeX-aware CLRS textbook chunker
│   ├── chunk_gfg.py         # Code-preserving GFG article chunker
│   └── chunk_mit.py         # Lecture-structure-aware MIT OCW chunker
│
├── llm/                     # Provider-agnostic LLM client
│   ├── client.py            # Unified client with failover chain
│   └── providers.py         # Gemini, OpenAI/Azure, Claude adapters
│
├── frontend/                # Next.js 16 application
│   └── src/
│       ├── app/(app)/       # Authenticated pages
│       │   ├── tutor/       # AI Tutor with streaming + X-Ray panel
│       │   ├── practice/    # Adaptive practice with LeetCode integration
│       │   ├── dashboard/   # Mastery radar, forgetting curve alerts
│       │   ├── roadmap/     # Multi-view personalized study plan
│       │   ├── comparison/  # Live A/B: Pathfinder vs. baseline LLM
│       │   ├── evidence/    # Research evaluation dashboard
│       │   └── profile/     # Student profile and session history
│       ├── components/      # Shared UI components
│       └── lib/             # API client, types, problems database
│
├── scripts/                 # Utility scripts
│   └── seed_pro_demo.py     # Demo account data seeding
│
├── db/                      # Database client and schema
├── supabase/                # Supabase project configuration
└── data/                    # Raw corpus data files
```

---

## Getting Started

### Prerequisites

- **Python 3.13+** with pip
- **Node.js 20+** with npm
- At least one LLM API key (Gemini, OpenAI/Azure, or Anthropic)
- *(Optional)* Supabase project for authentication and persistence

### 1. Clone the Repository

```bash
git clone <project_url>
cd <root_folder>
```

### 2. Backend Setup

```bash
# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt
```

### 3. Frontend Setup

```bash
cd frontend
npm install
```

### 4. Environment Variables

Create a `.env` file in the project root:

```env
# LLM Configuration (at least one provider required)
LLM_PROVIDER_ORDER=gemini,azure,claude

# Google Gemini
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash

# OpenAI / Azure OpenAI (optional)
AZURE_OPENAI_API_KEY=your_azure_key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT=gpt-4o
AZURE_OPENAI_API_VERSION=2025-01-01

# Anthropic Claude (optional)
ANTHROPIC_API_KEY=your_anthropic_key
ANTHROPIC_MODEL=claude-sonnet-4-20250514

# Supabase (optional — falls back to local JSON storage)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Dev mode (enables anonymous access without Supabase auth)
ALLOW_ANONYMOUS_DEV_MODE=true
```

### 5. Run the Application

**Terminal 1 — Backend:**
```bash
python backend/main.py
# Server starts at http://localhost:8000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# App available at http://localhost:3000
```

---

## Configuration

### LLM Provider Failover

Pathfinder uses a provider-agnostic LLM client with automatic failover. Set `LLM_PROVIDER_ORDER` to control priority:

```env
LLM_PROVIDER_ORDER=gemini,azure,claude
```

If the first provider fails, the system automatically tries the next. Only one provider needs to be configured for the system to function.

### Running Without Supabase

Set `ALLOW_ANONYMOUS_DEV_MODE=true` in `.env`. The system will use local JSON file storage for interaction history and skip authentication. Suitable for local development and demos.

---

## Usage

| Page | Route | Description |
|:-----|:------|:------------|
| **Tutor** | `/tutor` | Ask any DSA question; receive mastery-adapted explanations with pipeline trace and source citations |
| **Practice** | `/practice` | AI-generated diagnostic questions + 4-stage answer evaluation + curated LeetCode problem sidebar |
| **Dashboard** | `/dashboard` | Interactive mastery radar, concept heatmap, and forgetting curve decay alerts |
| **Roadmap** | `/roadmap` | Personalized study plan with three view modes, prerequisite bypass, and time allocation |
| **Comparison** | `/comparison` | Side-by-side Pathfinder vs. baseline LLM to demonstrate adaptive advantage |
| **Evidence** | `/evidence` | Ablation study results, calibration metrics, evaluator validation data |
| **Profile** | `/profile` | Student profile summary, interaction count, and session history |

---

## Demo Accounts

Pre-seeded accounts for demonstration (password for all: `PathfinderDemo2026!`):

| Account | Persona | Best For |
|:--------|:--------|:---------|
| `detailed@pathfinder.dev` | Full analytics, 57+ interactions, realistic mastery variance | Primary demo — shows all features |
| `demo.beginner@pathfinder.dev` | Uniform low mastery (beginner student) | Patient Tutor persona, easy practice |
| `demo.mixed@pathfinder.dev` | Strong arrays (0.85), weak graphs (0.22) | Mastery contrast and adaptation |
| `demo.advanced@pathfinder.dev` | Uniform high mastery (advanced student) | Expert Peer persona, hard practice |

---

## Research & Evaluation

### Ablation Study

The system includes a comprehensive ablation study comparing three configurations:

| Configuration | Description |
|:--------------|:------------|
| **Full Pathfinder** | SAKT mastery + three-tier RAG + persona blending + grounding validation |
| **Standard RAG** | Same retrieval, no mastery adaptation, generic LLM prompt |
| **Prompt-Only** | No retrieval, direct LLM generation |

Run the evaluation suite:

```bash
cd evaluation
python eval_comprehensive.py
```

### Metrics Evaluated

- **Factual Accuracy**: Grounding rate against source material
- **Concept Coverage**: Percentage of expected concepts addressed
- **Pedagogical Calibration**: Appropriateness of depth for mastery level
- **Misconception Detection Rate**: Precision of identified student errors
- **Hallucination Rate**: Unsupported claims in generated responses

---

## Deployment

### Backend (Render)

The repository includes a `render.yaml` blueprint for one-click deployment:

```bash
# Render reads render.yaml automatically
# Set environment variables in the Render dashboard
```

### Frontend (Vercel)

```bash
cd frontend
npx vercel
```

See [`DEPLOY.md`](DEPLOY.md) for the full deployment guide including memory footprint considerations and environment variable setup.

---

<div align="center">

**Department of Computer Science, PES University, Bengaluru**

*Capstone Project — 2026*

</div>
