# Mastery-Adaptive RAG System for DSA

An intelligent, Mastery-Adaptive Retrieval-Augmented Generation (RAG) system designed to dynamically adjust its pedagogical tone and retrieval context based on a student's cognitive proficiency (Mastery Score). 

This Capstone project utilizes a 3-tiered knowledge base (CLRS Textbook, GeeksForGeeks, MIT OCW), a 9-step Agentic Retrieval Pipeline, and continuous mathematical persona blending via GitHub Models (`gpt-4o-mini`).

## Prerequisites
- Python 3.9+
- A GitHub Personal Access Token (for GitHub Models API access)

## 🛠️ Setup Instructions

### 1. Set Up the Virtual Environment
Open your terminal in the project root directory (`Capstone_Proj`) and run:
```bash
python -m venv venv
```

Activate the virtual environment:
- **Windows:**
  ```bash
  .\venv\Scripts\activate
  ```
- **Mac/Linux:**
  ```bash
  source venv/bin/activate
  ```

### 2. Install Dependencies
Ensure your virtual environment is activated, then install the required packages:
```bash
pip install -r requirements.txt
pip install python-dotenv
```

### 3. Configure Environment Variables
This project uses GitHub Models for LLM generation and evaluation. You must provide a valid GitHub token.
1. Create a file named `.env` in the root directory (`Capstone_Proj/.env`).
2. Add your GitHub token to the file without quotes:
```env
GITHUB_TOKEN=your_actual_github_token_here
```

---

## 🚀 Running the System

### 1. Interactive Q&A Mode
To test the pipeline by asking questions and simulating different mastery levels (e.g., 0.2 for Beginner, 0.8 for Expert):
```bash
cd retrieval
python test_interactive.py
```

### 2. Running the Comprehensive Evaluation
To run the automated, 14-metric RAGAS-inspired ablation study (which compares Full RAG vs Standard RAG vs Prompt-Only):
```bash
cd evaluation
python eval_comprehensive.py
```
*Note: The evaluation script uses `gpt-4o-mini` as an LLM-Judge and will take some time to process all queries.*

---

## 🏗️ Architecture Overview

1. **Tier-Specific Chunkers (`chunking/`)**: Custom Python parsers that preserve the structural integrity of CLRS (math), GFG (code), and MIT OCW (conversational text).
2. **Retrieval Engine (`retrieval/`)**: A 9-step pipeline utilizing FAISS, BM25, Reciprocal Rank Fusion, and Cross-Encoder reranking. Slot allocation is mathematically governed by the student's mastery score.
3. **Generation Engine (`generation/`)**: Calculates continuous probabilistic weights to instruct `gpt-4o-mini` to dynamically blend teaching personas (Patient Tutor vs. Expert Peer) while strictly grounding answers in the retrieved context.
