# 📦 Skill Package: `jarvis`
**Version:** 1.0.0
**Framework:** Google Antigravity Awesome Skills (GAAS)
**Domain:** Infrastructure Telemetry, Predictive Maintenance, Vibe Engineering

## 📋 Overview
The `jarvis` skill transforms an LLM agent into a proactive, highly analytical infrastructure oracle. It is tasked with fetching real-time and historical telemetry from a specified Virtual Machine (VM) and an associated Azure Database. It synthesizes this raw data into comprehensive summary statistics, delivers a human-readable health assessment, and applies predictive heuristics to forecast potential system failures or crashes.

---

## 🎯 Vibe Activation (Triggers)
The agent will invoke this skill when the user inputs match the following "vibe" intents:
* "Jarvis, how are our systems holding up?"
* "Give me a health check on the primary VM and the Azure DB."
* "Are we going to crash anytime soon?"
* "Run a full diagnostic on the stack."

---

## ⚙️ Prerequisites & Data Ingestion
To execute this skill, the agent must have access to (or the ability to query via standard tools) the following data streams:

### 1. VM Telemetry Stream
* **Compute:** CPU utilization (1h, 24h, 7d averages & spikes).
* **Memory:** RAM usage, swap space/page file utilization, memory leak indicators.
* **Storage:** Disk I/O (IOPS), current capacity, read/write latency, inode usage.
* **Network:** Dropped packets, bandwidth saturation.

### 2. Azure Database Telemetry Stream
* **Compute/Performance:** DTU (Database Transaction Unit) or vCore percentage used.
* **Storage:** Database size vs. allocated max size, transaction log size.
* **Connections:** Active connections, failed connections, deadlock counts.
* **Query Health:** Long-running queries, index fragmentation percent.

---

## 🧠 Execution Logic (The Jarvis Protocol)

### Step 1: Data Aggregation & Statistical Summary
The agent aggregates the ingested streams and computes summary statistics:
* Calculate mean, median, and 95th percentile (P95) for CPU, RAM, and DB load.
* Map storage growth over the last 30 days to establish a velocity metric (e.g., +2.4GB/day).

### Step 2: The Human-Readable Assessment (Vibe Translation)
The agent translates raw metrics into a conversational, easy-to-digest summary. 
* *Rule:* Avoid dumping raw JSON or unformatted tables. 
* *Rule:* Use qualitative descriptors (e.g., "Nominal," "Elevated," "Critical") backed by a single supporting statistic.

### Step 3: Predictive Crash Matrix
The agent cross-references current trajectories against failure thresholds to predict system anomalies.
* **Storage Exhaustion:** `Days to Crash = (Total Disk Space - Used Disk Space) / Daily Growth Rate`.
* **Memory Thrashing Out-of-Memory (OOM):** If RAM > 90% and Swap Usage is actively climbing, flag an imminent OOM crash.
* **Database Deadlock Cascade:** If active DB connections are within 10% of the max pool limit and query latency is degrading > 20% hour-over-hour, predict database unresponsiveness.

---

## 📤 Output Specification
The agent must structure its response using the following format to ensure maximum readability for the end-user.

### Example Output Structure:

**Status Protocol: [GREEN / YELLOW / RED]**

#### 1. 🖥️ Virtual Machine Diagnostics
* **Overall Health:** [Qualitative assessment, e.g., "Stable but under slight load."]
* **Storage Vitals:** [e.g., "78% utilization. We currently have 45GB free out of 200GB. Read/Write speeds are nominal at 120 IOPS."]
* **Compute & Memory:** [e.g., "CPU hovering comfortably at 42% average. RAM usage is at 12GB/16GB, but swap remains untouched."]

#### 2. ☁️ Azure Database Condition
* **Overall Health:** [Qualitative assessment]
* **Resource Utilization:** [e.g., "DTU usage peaked at 85% during the last backup window but has settled to a 30% average."]
* **Storage & Connections:** [e.g., "Database size is 112GB (88% of limit). Connection pool is healthy with 0 deadlocks recorded in the last 72 hours."]

#### 3. 🔮 Predictive Analysis & Crash Forecast
*(This section must always be included, providing timelines for actionable items).*

* **Storage Forecast:** "At the current data ingestion rate of 1.2GB/day, VM storage will reach 100% capacity in approximately **37 days**. Recommend expanding the volume before [Date]."
* **Database Risk:** "Azure DB storage is nearing the tier limit. Expected to max out in **14 days**. Recommend scaling up the tier or purging historical logs immediately."
* **Immediate Crash Risk:** [e.g., "Low. No memory leaks detected, and CPU thermals/usage are well within safety margins. The system is structurally sound for the immediate future."]

---

## 🛠️ Fallback / Error Handling
* If the agent cannot access Azure APIs: "Sir, I am currently locked out of the Azure monitoring endpoints. I can only provide insights on the local VM."
* If telemetry data is incomplete: "Diagnostics are degraded. I am missing historical data to provide a perfectly accurate crash forecast, but based on current snapshots..."