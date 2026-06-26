# 💳 SmartWallet MVP – Zero-Trust Corporate Expense Engine

![Next.js](https://img.shields.io/badge/Next.js-15-black)
![AWS](https://img.shields.io/badge/AWS-Lambda-orange)
![Supabase](https://img.shields.io/badge/Auth-Supabase-green)
![DynamoDB](https://img.shields.io/badge/Database-DynamoDB-blue)
![License](https://img.shields.io/badge/License-MIT-brightgreen)

A **serverless, enterprise-grade corporate expense management system** that evaluates employee transactions in real-time using a **Zero-Trust architecture**.

This MVP demonstrates:
- 🔐 Secure authentication
- ⚡ Serverless, event-driven backend compute
- 📊 Real-time NoSQL audit ledger
- 🚨 Automated threat analytics
- 💰 Cloud cost optimization through deterministic rule evaluation

---

## 🚀 Production Features (V1)

### 🔐 1. Identity & Authentication
**Provider:** Supabase Auth
* **Features:** Secure user signup, login, and robust session management.
* **Password Recovery:** Fully integrated "Forgot Password" workflow utilizing Supabase SMTP. The frontend listens for the `PASSWORD_RECOVERY` event, allowing users to securely update their password directly from the dashboard.

### ⚡ 2. Algorithmic Expense Evaluation Engine
To prevent runaway API costs from LLMs during the MVP phase, SmartWallet uses a deterministic, C++ style logic gate deployed on AWS Lambda.
* **Performance:** Sub-100 ms execution with zero inference cost.
* **Decision Rules:** * Automatically **APPROVES** verified transit and lodging vendors (Uber, Delta, Marriott) under standard limits.
  * Instantly **DECLINES** luxury vendors (Rolex, Gucci) and unrecognized transactions exceeding $500.

### ☁️ 3. Serverless Audit Ledger
* **Database:** Amazon DynamoDB (`ap-south-1` Mumbai Region).
* **Schema:** Cleanly partitioned with unique `transactionId` keys to ensure high-throughput writes and low-latency reads.
* **Functionality:** Real-time fetching and sorting of enterprise transactions into a unified audit ledger on the frontend.

### 🚨 4. Dynamic Threat Analytics
The frontend continuously monitors incoming transaction data. If any employee accumulates **2 or more declined transactions**, SmartWallet automatically flags them as a **High-Risk User**.
* Indicators include a red threat banner and a ⚠️ warning icon beside the user's email in the raw ledger.

---

## 🛠 Technology Stack

| Layer | Technology |
|---------|------------|
| **Frontend** | Next.js, React, Tailwind CSS |
| **Hosting** | Vercel |
| **Backend** | AWS Lambda (Node.js) |
| **Database** | Amazon DynamoDB |
| **Authentication** | Supabase Auth |

---

## 🏗 High-Level Design (HLD)

*For a deep dive into the system components, data flow, and design decisions, please see the [ARCHITECTURE.md](./ARCHITECTURE.md) file.*

```mermaid
graph TD
    Client[Client Browser]
    
    subgraph Identity Provider
        Auth[Supabase Auth]
    end

    subgraph Frontend Ecosystem
        UI[Next.js App Hosted on Vercel]
    end

    subgraph AWS Cloud Infrastructure
        API[AWS Lambda URL]
        Logic[Algorithmic Rule Engine]
        DB[(Amazon DynamoDB SmartWalletLogs)]
    end

    Client -->|1. Authenticate & Reset Password| Auth
    Client -->|2. Render Dashboard & Threat UI| UI
    UI -->|3. POST / POST Swipe Data| API
    UI -->|4. GET / Fetch Audit Ledger| API
    API -->|5. Evaluate Merchant & Amount| Logic
    Logic -->|6. Read/Write Transaction| DB