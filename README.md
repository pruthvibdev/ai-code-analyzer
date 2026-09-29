# 🔍 CodeLens AI — Intelligent Code Complexity & Quality Analyzer

A modern, high-performance developer tool that analyzes source code for algorithmic time & space complexity, cyclomatic complexity, code smells, and quality metrics using multi-language AST static parsing paired with neural AI-powered code reviews.

---

## ✨ Features

- **⚡ Algorithmic Complexity Analysis**: Calculates Big-O Time Complexity (e.g. $O(1)$, $O(n)$, $O(n^2)$) and Space Complexity using AST traversal.
- **📊 Code Quality & Health Score**: Computes maintainability ratings, cyclomatic complexity scores, Halstead metrics, and risk factors.
- **🛡️ Multi-Language Support**: Python, JavaScript, TypeScript, Java, C++, and Go.
- **💡 Smart Optimization & Refactoring**: Generates drop-in optimized code alternatives with step-by-step performance trade-off explanations.
- **💻 Monaco Editor Integration**: VS Code-grade in-browser code editor with syntax highlighting, line numbers, and theme support.
- **📜 Local Persistent History**: Saves and tracks previous code analyses with one-click restore and comparison.
- **🤖 Dual Engine Architecture**: Runs 100% offline via local AST rule engines, with optional Gemini AI integration for deep contextual code reviews.

---

## 🛠️ Architecture

```
ai-code-analyzer/
├── backend/                  # FastAPI Python backend
│   ├── app/
│   │   ├── analyzers/        # AST & static complexity analysis engines
│   │   ├── models/           # Pydantic data schemas
│   │   ├── routes/           # REST API endpoints (/api/analyze, /api/health, etc.)
│   │   ├── services/         # AI integration & JSON storage service
│   │   └── utils/            # App configuration
│   └── requirements.txt      # Python dependencies
├── frontend/                 # React + TypeScript + Vite frontend
│   ├── src/
│   │   ├── components/       # Monaco editor, metrics dashboards, charts
│   │   └── services/         # API client
│   └── package.json
└── start.bat                 # One-click start script for Windows
```

---

## 🚀 Quickstart

### 1. One-Click Start (Windows)
Double-click `start.bat` or run:
```bat
start.bat
```
This automatically compiles the frontend (if not already built) and launches the FastAPI server at [http://localhost:8000](http://localhost:8000).

---

### 2. Manual Setup

#### Backend
```bash
cd backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## 🔑 Optional AI Configuration

By default, CodeLens AI operates locally using static AST analysis with zero configuration required.

To enable deep AI-assisted reviews:
1. Create or edit `backend/.env`:
   ```env
   AI_API_KEY=your_gemini_api_key_here
   AI_MODEL=gemini-2.0-flash
   ```
2. Or configure your API key dynamically in the web UI via the **Settings** modal.

---

## 📄 License
MIT License.
