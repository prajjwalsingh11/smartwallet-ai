SmartWallet AI

A Next.js application that uses AWS Bedrock and DynamoDB to automatically evaluate corporate expenses.

Tech Stack

Frontend: Next.js (React), Tailwind CSS

Backend: AWS Lambda, AWS DynamoDB

Authentication: Supabase

AI Engine: Amazon Bedrock (Nova Micro)

How it works

Employees log in via Supabase.

They enter a merchant name and amount.

AWS Lambda passes the data to an LLM which approves or declines the transaction based on corporate policy.

The result is saved and displayed live from DynamoDB.