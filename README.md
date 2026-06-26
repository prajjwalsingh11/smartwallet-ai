```markdown
# 💳 SmartWallet MVP – Zero-Trust Corporate Expense Engine

![Next.js](https://img.shields.io/badge/Next.js-15-black)
![AWS](https://img.shields.io/badge/AWS-Lambda-orange)
![Supabase](https://img.shields.io/badge/Auth-Supabase-green)
![DynamoDB](https://img.shields.io/badge/Database-DynamoDB-blue)
![License](https://img.shields.io/badge/License-MIT-brightgreen)

A **serverless, enterprise-grade corporate expense management system** that evaluates employee transactions in real time using a **Zero-Trust architecture**.

This MVP demonstrates:

- 🔐 Secure authentication
- ⚡ Serverless event-driven backend
- 📊 Real-time audit ledger
- 🚨 Automated threat analytics
- 💰 Cloud cost optimization through deterministic rule evaluation

---

# 🚀 Production Features (V1)

## 🔐 1. Identity & Authentication

**Provider:** Supabase Auth

Features:

- Secure user signup
- User login
- Session management
- Password reset
- Email verification support

### Password Recovery

Integrated "Forgot Password" workflow using Supabase SMTP.

The frontend listens for the `PASSWORD_RECOVERY` event, allowing users to securely update their password directly from the dashboard without requiring additional backend logic.

---

## ⚡ 2. Algorithmic Expense Evaluation Engine

### Cost-Optimized Compute

Instead of invoking expensive LLMs (AWS Bedrock/OpenAI) for every transaction, SmartWallet uses a deterministic rule engine deployed on AWS Lambda.

Benefits:

- Sub-100 ms execution
- Zero inference cost
- Predictable latency
- Highly scalable

### Decision Rules

Automatically **APPROVES**

- Uber
- Delta Airlines
- Marriott Hotels

when transaction amounts fall within approved limits.

Automatically **DECLINES**

- Rolex
- Gucci
- Unknown merchants exceeding **$500**

---

## ☁️ 3. Serverless Audit Ledger

### Database

Amazon DynamoDB

**Region**

```

ap-south-1 (Mumbai)

```

### Schema

Partition Key

```

transactionId

````

Features:

- High-throughput writes
- Low-latency reads
- Serverless architecture
- Real-time audit trail

The frontend fetches and displays all enterprise transactions in a sortable audit ledger.

---

## 🚨 4. Dynamic Threat Analytics

The frontend continuously monitors incoming transaction data.

If any employee accumulates **2 or more declined transactions**, SmartWallet automatically flags them as a **High-Risk User**.

Indicators include:

- 🚨 Red threat banner
- ⚠️ Warning icon beside user email
- Real-time risk score updates

---

# 🛠 Technology Stack

| Layer | Technology |
|---------|------------|
| Frontend | Next.js, React, Tailwind CSS |
| Hosting | Vercel |
| Backend | AWS Lambda (Node.js) |
| Database | Amazon DynamoDB |
| Authentication | Supabase Auth |

---

# 🏗 High-Level Design (HLD)

```mermaid
graph TD

Client[Client Browser]

subgraph Identity Provider
Auth[Supabase Auth]
end

subgraph Frontend
UI[Next.js App<br/>Hosted on Vercel]
end

subgraph AWS Cloud

API[AWS Lambda URL]

Logic[Rule Engine]

DB[(Amazon DynamoDB<br/>SmartWalletLogs)]

end

Client -->|Authenticate| Auth

Client -->|Dashboard| UI

UI -->|POST Transaction| API

UI -->|GET Ledger| API

API --> Logic

Logic --> DB

DB --> API

API --> UI
````

---

# 🔄 Transaction Flow

```text
Employee

↓

Next.js Dashboard

↓

AWS Lambda

↓

Rule Engine

↓

APPROVED / DECLINED

↓

DynamoDB

↓

Audit Dashboard

↓

Threat Analytics
```

---

# 📂 Project Structure

```
smartwallet-ai/

│

├── app/

├── components/

├── lib/

├── public/

├── styles/

├── aws/

├── lambda/

├── README.md

└── package.json
```

---

# 💻 Local Setup

## 1. Clone the Repository

```bash
git clone https://github.com/yourusername/smartwallet-ai.git

cd smartwallet-ai
```

---

## 2. Install Dependencies

```bash
npm install
```

---

## 3. Configure Environment Variables

Create a file named:

```
.env.local
```

Add the following variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url

NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

NEXT_PUBLIC_AWS_API_URL=your_lambda_function_url
```

---

## 4. Run Development Server

```bash
npm run dev
```

Open:

```
http://localhost:3000
```

---

# 🔒 Security Highlights

* Zero-Trust architecture
* Strict CORS policies
* AWS IAM execution roles
* Serverless backend
* Secure Supabase authentication
* No secrets exposed to the frontend
* Stateless Lambda execution

---

# 💰 Cost Optimization

Instead of evaluating every transaction using an LLM, SmartWallet employs a deterministic rule engine.

Benefits include:

* Nearly zero compute cost
* Lower latency
* Predictable performance
* Easily extensible to Bedrock/OpenAI in future versions

---

# 🚀 Future Roadmap

* Amazon Bedrock integration
* AI-powered fraud detection
* Receipt OCR
* Manager approval workflows
* Slack/MS Teams notifications
* Budget tracking
* Department-level analytics
* Multi-tenant enterprise support

---

# 📄 License

This project is licensed under the MIT License.

```
```
