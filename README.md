SmartWallet AI: Enterprise Financial Compliance Engine

SmartWallet AI is an event-driven, serverless cloud application that automatically evaluates corporate card transactions against company policy using Generative AI.

🏗️ System Architecture

This project demonstrates a modern, decoupled cloud architecture utilizing Polyglot Persistence and Serverless Computing.

Frontend (Edge): Next.js hosted on Vercel for low-latency, globally distributed UI delivery.

Authentication & Relational Data: Supabase (PostgreSQL) handles secure user identity and structured employee data.

Compute Engine: AWS Lambda acts as the serverless routing brain, scaling instantly from zero to thousands of concurrent executions.

AI Logic Engine: AWS Bedrock (Amazon Nova Micro) processes natural language rule evaluations via strict prompt engineering and low-temperature inference.

Immutable Audit Ledger: AWS DynamoDB (NoSQL) captures high-throughput transaction logs in real-time, completely decoupled from the relational database.

✨ Key Technical Achievements

Polyglot Persistence: Successfully separated database workloads. Relational data (users/auth) stays in PostgreSQL, while high-velocity, schema-less audit logs are streamed to DynamoDB.

Enterprise Cloud Security & RBAC: Implemented strict IAM policies (Principle of Least Privilege) for Lambda. Engineered strict Role-Based Access Control (RBAC) via Supabase JWT metadata, utilizing programmatic backend validation over insecure client-side role assignment.

Admin Threat Analytics & Risk Scoring: Created an advanced admin dashboard that automatically aggregates company-wide approved spend and dynamically flags high-risk employees (users with 2+ policy violations) using a derived analytics engine.

Graceful Error Handling & Resiliency: The application safely catches cloud-level errors (e.g., AWS ThrottlingException account quotas) and handles CORS API gateway restrictions without crashing the client UI.

CI/CD Pipeline: Integrated a continuous deployment pipeline via GitHub and Vercel for zero-downtime production updates.

🚀 How It Works

An authenticated user simulates a corporate card swipe via the Next.js dashboard.

An API request is securely routed to the AWS Lambda function.

Lambda constructs a strict context window and queries AWS Bedrock to evaluate the merchant and amount against corporate policy.

The AI decision is instantly written to the DynamoDB NoSQL ledger.

The frontend automatically fetches the updated ledger via a GET request to Lambda, reflecting the immutable log in real-time.

🔮 V2 Roadmap (Upcoming Enterprise Features)

To further emulate a hyperscale enterprise application, the following architectural upgrades are planned for Version 2:

Advanced Infrastructure & Decoupling

Zero-Trust RBAC & Tenant Data Isolation: Roles are programmatically enforced via Supabase JWTs. The backend architecture dynamically routes database access:

Finance Admins are granted global Scan permissions on DynamoDB to view the company-wide immutable ledger and analytics.

Standard Employees utilize DynamoDB Global Secondary Indexes (GSIs) to securely query and view only their personal, isolated transaction history.

Asynchronous Message Queueing (AWS SQS): Decoupling the frontend from the AI processing engine. High-volume, concurrent transaction spikes will be buffered into an SQS Queue and processed by background worker Lambdas to prevent API timeouts and guarantee fault tolerance.

Real-time Data Lake Analytics (DynamoDB Streams + Athena): Utilizing DynamoDB Streams to pipe NoSQL transaction logs into an AWS S3 Data Lake. This will enable complex Business Intelligence (BI) aggregations using Amazon Athena's serverless SQL engine.

Applied Generative AI

Multimodal Vision AI (Receipt Processing): Integrating AWS S3 for secure receipt image uploads. AWS Bedrock (multimodal models) will extract, read, and cross-verify physical receipt line items against the digital swipe amount to detect tampering or discrepancies.

RAG-Powered Dynamic Policy Enforcement: Transitioning from static system prompts to Retrieval-Augmented Generation (RAG). The AI will dynamically retrieve compliance context from a vectorized corporate handbook (stored via pgvector in Supabase) to justify approvals or declines with exact policy citations.

Natural Language Audit Agents (Text-to-SQL): Building an AI data analyst agent for the finance team. Admins will be able to type natural language queries (e.g., "Show me all declined transport expenses in Q3"), which the LLM will translate into executable Athena SQL queries to instantly generate visual dashboard charts.

💻 Local Development

Clone the repository

Install dependencies: npm install

Configure environment variables in .env.local:

NEXT_PUBLIC_SUPABASE_URL

NEXT_PUBLIC_SUPABASE_ANON_KEY

NEXT_PUBLIC_AWS_LAMBDA_URL

Run the development server: npm run dev