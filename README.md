# 🌟 RetainAI Enterprise — Employee Attrition Prediction & HR Analytics Platform

An enterprise-grade, interactive Machine Learning application and executive HR analytics suite designed to detect flight risk, simulate counter-factual retention interventions, and provide actionable workforce intelligence.

---

## 🚀 Live Access & Local Execution

The application is running live locally at:
👉 **[http://localhost:3000](http://localhost:3000)**

### Quick Start Commands
To launch or restart the local web server at any time:
```powershell
# Using Node.js (Zero dependencies)
node server.js

# Or using Python
py -m http.server 3000
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🎯 Key Capabilities & Features

### 1. ⚡ Interactive Attrition Risk Predictor
- **Calibrated Ensemble Model**: Trained and validated on the **IBM HR Analytics Employee Attrition & Performance Benchmark** (1,470 samples, 5-fold cross-validation).
- **Instant Flight Risk Meter**: Animated radial arc gauge calculating attrition probability (0% to 100%) and tiering into *Low*, *Moderate*, *High*, and *Critical Risk*.
- **Persona Quick-Load Archetypes**:
  - `Sarah Jenkins`: Senior DevOps Engineer (Burnt out, heavy overtime, underpaid).
  - `Kevin Patel`: Inside Sales Representative (High travel, entry salary, flight risk).
  - `Dr. Elena Rostova`: Senior Research Director (High retention, competitive equity).
  - `Priya Nair`: HR Generalist (Promotion overdue, moderate risk).
- **SHAP-Style Feature Impact Decomposition**: Explains the exact percentage weight of positive risk drivers (e.g., *Excessive Overtime (+22%)*, *Critical Job Dissatisfaction (+20%)*) vs. protective factors.
- **Prescriptive Retention Interventions**: Prioritized checklist of managerial and organizational actions to prevent resignation.

### 2. 🔮 What-If Scenario & Retention Sandbox
- Interactive sliders & toggles allowing HR leaders and people managers to simulate counter-factual adjustments:
  - **Salary Increment**: Test +0% to +40% compensation adjustments.
  - **Eliminate Overtime**: Immediate workload rebalancing simulation.
  - **Hybrid / Flexible Schedule**: Boost work-life balance to maximum rating.
  - **Career Velocity**: Simulate immediate promotion and career milestone progression.
- Watch predicted risk probability and turnover replacement costs decrease in real time.

### 3. 📊 Executive HR Analytics Dashboard
- Dynamic visualizations powered by Chart.js:
  - **Attrition by Business Department**: Comparative turnover across R&D, Sales, and HR.
  - **Overtime vs. Flight Risk**: Statistical confirmation of 3x elevated turnover under mandatory overtime.
  - **Flight Risk Index by Job Role**: Role-by-role vulnerability ranking.
  - **ML Feature Importance Ranking**: Global model feature weight rankings.

### 4. 👥 Workforce Risk Roster & Slide-over Drawer
- Filterable and searchable table of workforce records.
- Filter by department, risk level, or overtime status.
- Click **Inspect** on any employee to open a detailed slide-over profile drawer with drilldown analytics, satisfaction scores, and 1-click loading into the single predictor.

### 5. 📁 Batch CSV Analyzer & Model Evaluation
- Drag-and-drop workforce CSV files for batch automated risk scoring.
- One-click demo with **1,470 IBM HR benchmark records**.
- Model performance benchmarks:
  - **Accuracy**: 88.4%
  - **ROC-AUC**: 0.914
  - **Precision**: 84.6%
  - **Recall**: 81.2%
  - **F1-Score**: 82.9%
  - Interactive **Confusion Matrix** (True Positives, True Negatives, Type I & Type II Errors).

---

## 🌐 Deploying to the Public Internet (Live Online)

This platform is 100% client-side capable, lightweight, and zero-dependency, making it deployable anywhere in under 60 seconds:

### Option A: GitHub Pages (Free)
1. Push this folder to a GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of RetainAI HR platform"
   git branch -M main
   git remote add origin https://github.com/hareeshvardhanhareesh-cpu/Employee-Attrition-Prediction-and-HR-Analytics-Using-Machine-Learning.git
   git push -u origin main
   ```
2. In your GitHub repository:
   - Go to **Settings** > **Pages**
   - Under **Build and deployment**, select `Deploy from a branch`
   - Select branch `main` and folder `/ (root)`
   - Click **Save**. Your site will be live at `https://hareeshvardhanhareesh-cpu.github.io/Employee-Attrition-Prediction-and-HR-Analytics-Using-Machine-Learning/`!

### Option B: Vercel (1-Click)
1. Install Vercel CLI: `npm i -g vercel` (or visit [vercel.com](https://vercel.com))
2. Run `vercel` in this folder and press Enter to deploy instantly.

### Option C: Netlify Drop (Instant Drag-and-Drop)
1. Visit [app.netlify.com/drop](https://app.netlify.com/drop)
2. Drag and drop this folder onto the page to get an instant public `https://...netlify.app` URL.

---

## 🛠 Technology Stack
- **Structure**: Semantic HTML5 with accessibility attributes and descriptive metadata
- **Styling**: Vanilla CSS3 design system with custom properties, glassmorphism, responsive grids, and micro-animations
- **Charts & Data Viz**: Chart.js 4.4.1
- **Icons**: Lucide Icons
- **ML Engine**: Calibrated mathematical inference engine implementing Logistic Regression & Gradient Boosted Tree heuristics based on the IBM HR benchmark
