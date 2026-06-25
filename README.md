SmartWallet AI: Enterprise Financial Compliance Engine

SmartWallet AI is an event-driven, serverless cloud application that automatically evaluates corporate card transactions against company policy using Generative AI.

🏗️ System Architecture

This project demonstrates a modern, decoupled cloud architecture utilizing Polyglot Persistence and Serverless Computing.

Frontend (Edge): Next.js hosted on Vercel for low-latency, globally distributed UI delivery.

Authentication & Relational Data: Supabase (PostgreSQL) handles secure user identity, JWT generation, and password recovery flows.

Compute Engine: AWS Lambda acts as the serverless routing brain, scaling instantly from zero to thousands of concurrent executions.

AI Logic Engine: AWS Bedrock (Amazon Nova Micro) processes natural language rule evaluations via strict prompt engineering and low-temperature inference.

Immutable Audit Ledger: AWS DynamoDB (NoSQL) captures high-throughput transaction logs in real-time, completely decoupled from the relational database.

✨ Key Technical Achievements

Polyglot Persistence: Successfully separated database workloads. Relational authentication stays in PostgreSQL, while high-velocity, schema-less audit logs are streamed to DynamoDB.

Zero-Trust RBAC & Tenant Data Isolation: Implemented Role-Based Access Control via Supabase JWT metadata. The system uses programmatic domain-whitelisting to prevent privilege escalation.

Finance Admins are granted global Scan access on DynamoDB to view the company-wide ledger.

Standard Employees are restricted to their personal transaction history via strict backend filtering.

Threat Analytics & Risk Scoring Engine: Built a derived analytics dashboard that automatically aggregates company-wide approved spend and dynamically flags high-risk employees (users with 2+ policy violations).

Advanced Prompt Engineering: Engineered strict structural guardrails for the AWS Bedrock LLM, forcing JSON-like deterministic outputs (APPROVED/DECLINED) based on specific budget ceilings ($100 for transport, $50 for meals) while catching and parsing AWS ThrottlingExceptions gracefully.

CI/CD Pipeline: Integrated a continuous deployment pipeline via GitHub and Vercel for zero-downtime production updates.

🚀 How It Works

An authenticated user simulates a corporate card swipe via the Next.js dashboard.

An API request containing the user's role and email is securely routed to the AWS Lambda function.

Lambda constructs a strict context window and queries AWS Bedrock to evaluate the merchant and amount against corporate policy limits.

The AI decision is instantly written to the DynamoDB NoSQL ledger.

The frontend automatically fetches the updated ledger, reflecting the isolated, immutable log in real-time.

🔮 V2 Roadmap (Upcoming Enterprise Features)

To further emulate a hyperscale enterprise application, the following architectural upgrades are planned:

Advanced Infrastructure & Decoupling

Asynchronous Message Queueing (AWS SQS): Decoupling the frontend from the AI processing engine. High-volume, concurrent transaction spikes will be buffered into an SQS Queue and processed by background worker Lambdas to prevent API timeouts and guarantee fault tolerance.

Real-time Data Lake Analytics (DynamoDB Streams + Athena): Utilizing DynamoDB Streams to pipe NoSQL transaction logs into an AWS S3 Data Lake. This will enable complex Business Intelligence (BI) aggregations using Amazon Athena's serverless SQL engine.

Applied Generative AI

Multimodal Vision AI (Receipt Processing): Integrating AWS S3 for secure receipt image uploads. AWS Bedrock (multimodal models) will extract, read, and cross-verify physical receipt line items against the digital swipe amount to detect tampering or discrepancies.

RAG-Powered Dynamic Policy Enforcement: Transitioning from static system prompts to Retrieval-Augmented Generation (RAG). The AI will dynamically retrieve compliance context from a vectorized corporate handbook (stored via pgvector in Supabase) to justify approvals or declines with exact policy citations.

💻 Local Development

Clone the repository

Install dependencies: npm install

Configure environment variables in .env.local:

NEXT_PUBLIC_SUPABASE_URL

NEXT_PUBLIC_SUPABASE_ANON_KEY

NEXT_PUBLIC_AWS_LAMBDA_URL

Run the development server: npm run dev