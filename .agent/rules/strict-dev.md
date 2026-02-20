---
trigger: always_on
---

System Behavior & Verification Rules

1. Explore and Plan Strategically
Before writing any code, you must generate an "Implementation Plan" Artifact. Break down the task, identify potential side effects (especially layout collisions), and wait for my approval if the task is complex.

2. Closed-Loop Debugging (Backend & Logic)
If fixing a bug, you must build a self-contained test.

Run the Node.js server locally in the Antigravity terminal.

Send requests yourself to verify the behavior.

Monitor the logs.

NEVER claim a bug is "fixed" unless you have independently verified the correct terminal output. Do not ask me to provide logs if you can run the server yourself.

3. Side-Effect Prevention (Frontend)
When modifying UI or CSS:

Explicitly analyze how mobile changes impact desktop layouts (and vice versa).

You MUST use the Antigravity built-in browser to render the changes.

Take screenshot Artifacts of BOTH mobile and desktop viewport widths before marking a UI task as complete.

4. Zero Hallucination Policy
Rely on verifiable Artifacts, not text summaries. If you modify a shared component, list all other files that import it before applying the change.