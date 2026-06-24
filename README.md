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

Enterprise Cloud Security: Implemented strict IAM (Identity and Access Management) policies, adhering to the Principle of Least Privilege for Lambda-to-Bedrock/DynamoDB communications.

Graceful Error Handling & Resiliency: The application safely catches cloud-level errors (e.g., AWS ThrottlingException account quotas) and handles CORS API gateway restrictions without crashing the client UI.

CI/CD Pipeline: Integrated a continuous deployment pipeline via GitHub and Vercel for zero-downtime production updates.

🚀 How It Works

An authenticated user simulates a corporate card swipe via the Next.js dashboard.

An API request is securely routed to the AWS Lambda function.

Lambda constructs a strict context window and queries AWS Bedrock to evaluate the merchant and amount against corporate policy.

The AI decision is instantly written to the DynamoDB NoSQL ledger.

The frontend automatically fetches the updated ledger via a GET request to Lambda, reflecting the immutable log in real-time.

💻 Local Development

Clone the repository

Install dependencies: npm install

Configure environment variables in .env.local:

NEXT_PUBLIC_SUPABASE_URL

NEXT_PUBLIC_SUPABASE_ANON_KEY

NEXT_PUBLIC_AWS_LAMBDA_URL

Run the development server: npm run dev