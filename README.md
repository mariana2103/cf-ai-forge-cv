# 🛠️ ForgeCV: The "Edge-First" Resume Engine

Most AI resume tailors are slow, expensive, and leak data to 3rd party LLM providers. **ForgeCV** is a proof-of-concept built to run entirely on the **Cloudflare Global Network**.

By using **Workers AI** and **R2**, this project handles PDF extraction, semantic analysis, and real-time tailoring without ever leaving the Cloudflare ecosystem.

---

## 🏗️ The Engineering Blueprint

I built this to solve the "Black Box" problem of AI career tools. Here is the technical flow I am implementing:

### 1. The "Ingest" Phase (PDF → JSON)

Instead of just "reading text," I'm using a Worker-side parser to convert raw PDF bytes into a structured schema.

* **Challenge:** Handling multi-column PDF layouts which usually break simple parsers.
* **Solution:** Using a localized parsing logic that identifies headers (Experience, Education) to create a "Master JSON" of the user's career.

### 2. Semantic Analysis (Workers AI)

Once I have the Job Description and the Master JSON, I pipe them into **Llama 3 (running on Cloudflare's Edge GPUs)**.

* **The Prompt Strategy:** I use a "Chain of Thought" prompt. The AI doesn't just rewrite; it first identifies "Gaps" (e.g., "The job requires AWS, but the user only listed Cloudflare") and then generates the bridge.
* **The Agentic Twist:** The system returns a `reasoning` object. For every change made, the AI must justify it (e.g., *"Prioritized 'Distributed Systems' over 'Backend' to match JD keywords"*).

### 3. State Management (D1 & R2)

* **R2:** Stores the original "Source of Truth" PDF.
* **D1 (SQL):** Manages relational data like user sessions, tailoring history, and the specific "Agent Reasoning" logs for later review.

---

## 💻 Technical Stack

* **Framework:** Next.js (Deployed via `next-on-pages`)
* **Runtime:** Cloudflare Workers (V8 Isolates for 0ms cold starts)
* **Database:** Cloudflare D1 (SQL at the Edge)
* **Storage:** Cloudflare R2 (Object Storage)
* **AI Inference:** Cloudflare Workers AI (`@cf/meta/llama-3-8b-instruct`)
* **Styling:** Tailwind CSS + Shadcn UI (Radix-based)

---

## 🛠️ My Implementation Roadmap (The Guide)

If you are following this repo, here is how I am building it step-by-step:

### **Phase 1: The "Cloudflare Native" Setup**

* [ ] Initialize the project using `c3` (Cloudflare’s Create Tool).
* [ ] Bind the Worker to a **D1 Database** and an **R2 Bucket**.
* [ ] Configure `wrangler.toml` for local development.

### **Phase 2: The Parser & UI**

* [ ] Build a drag-and-drop zone using **React-Dropzone**.
* [ ] Implement the `POST /api/upload` route to stream bytes directly to **R2**.
* [ ] Use `pdf-parse` within the Worker context to return an editable JSON structure to the frontend.

### **Phase 3: The AI Logic**

* [ ] Create the **Inference Worker**.
* [ ] Implement the "Reasoning Agent" prompt.
* [ ] Stream the AI response back to the UI (using Server-Sent Events) so the user sees the "Why" in real-time.

### **Phase 4: Export & Polish**

* [ ] Add "One-Click Apply" formatting (Plain text/Markdown/PDF export).
* [ ] Implement a "Version History" tab using **D1**.

---

## 📈 Why Cloudflare?

I chose this stack over AWS or Vercel because:

1. **Latency:** The AI inference happens in the same data center where the user's request lands.
2. **Privacy:** User data doesn't bounce around different clouds; it stays within Cloudflare’s secure perimeter.
3. **Cost:** Using **Workers AI** and **D1** is significantly more sustainable than paying per-token for OpenAI plus database hosting.

---

### **A Quick Note for Recruiters**

I built this project to demonstrate my proficiency with **Edge Computing** and **LLM Orchestration**. If you're looking for someone who understands how to build scalable, low-latency AI applications on the Cloudflare stack, we should talk.
