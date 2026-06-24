"use client";

import { useState } from 'react';
import { supabase } from '../utils/supabase';

export default function Home() {
  const [dbStatus, setDbStatus] = useState("Waiting for database...");
  const [awsStatus, setAwsStatus] = useState("Waiting for swipe...");
  const [aiDecision, setAiDecision] = useState("");
  
  // New state variables for dynamic inputs
  const [merchantInput, setMerchantInput] = useState("Uber Ride");
  const [amountInput, setAmountInput] = useState("25.50");

  // --- 1. Supabase Database Test ---
  const testDatabaseConnection = async () => {
    setDbStatus("Connecting to Supabase...");
    const { data, error } = await supabase
      .from('users')
      .insert([{ name: 'Prajjwal Singh', email: `prajjwal+${Date.now()}@smartwallet.com`, role: 'admin' }])
      .select();

    if (error) setDbStatus(`DB Error: ${error.message}`);
    else setDbStatus(`DB Success: User ${data[0].name} added!`);
  };

  // --- 2. AWS Lambda & Bedrock Test (Dynamic) ---
  const simulateCardSwipe = async () => {
    setAwsStatus("Analyzing transaction via AWS Bedrock...");
    setAiDecision("");
    
    const lambdaUrl = process.env.NEXT_PUBLIC_AWS_LAMBDA_URL;
    
    if (!lambdaUrl) {
      setAwsStatus("Error: AWS URL not found in .env.local");
      return;
    }

    try {
      const response = await fetch(lambdaUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          merchant: merchantInput,
          amount: parseFloat(amountInput) || 0
        })
      });

      const data = await response.json();
      console.log("AWS AI Response:", data);
      
      if (data && data.decision) {
        setAwsStatus(`Success! Merchant: ${data.merchantAnalyzed} ($${data.amountProcessed})`);
        setAiDecision(`AI Engine: ${data.decision}`);
      } else {
        setAwsStatus(`Received anomaly: ${JSON.stringify(data).substring(0, 60)}...`);
      }
      
    } catch (error: any) {
      console.error("AWS Network Error:", error);
      setAwsStatus(`Network Error: ${error.message}`);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white p-12">
      <h1 className="text-5xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
        SmartWallet AI
      </h1>
      <h2 className="text-xl text-gray-400 mb-12 font-mono">System Architecture Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl">
        
        {/* Supabase Panel */}
        <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 shadow-2xl flex flex-col items-center">
          <h3 className="text-2xl font-bold mb-2">Relational Data</h3>
          <p className="text-sm text-gray-400 mb-6">PostgreSQL via Supabase</p>
          <button 
            onClick={testDatabaseConnection}
            className="px-6 py-3 w-full bg-blue-600 hover:bg-blue-500 rounded-lg font-bold transition-all active:scale-95 mb-4"
          >
            1. Test Database Insert
          </button>
          <p className="text-sm font-mono text-emerald-400 text-center h-12 flex items-center justify-center">
            {dbStatus}
          </p>
        </div>

        {/* AWS Lambda + Bedrock Panel */}
        <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 shadow-2xl flex flex-col items-center text-center">
          <h3 className="text-2xl font-bold mb-2">AI Logic Engine</h3>
          <p className="text-sm text-gray-400 mb-6">Serverless Compute + AWS Bedrock</p>
          
          {/* Dynamic Inputs */}
          <div className="flex gap-4 w-full mb-4">
            <div className="flex-1">
              <label className="block text-xs text-gray-400 mb-1 text-left">Merchant Name</label>
              <input 
                type="text" 
                value={merchantInput}
                onChange={(e) => setMerchantInput(e.target.value)}
                className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white focus:outline-none focus:border-orange-500"
              />
            </div>
            <div className="w-1/3">
              <label className="block text-xs text-gray-400 mb-1 text-left">Amount ($)</label>
              <input 
                type="number" 
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <button 
            onClick={simulateCardSwipe}
            className="px-6 py-3 w-full bg-orange-600 hover:bg-orange-500 rounded-lg font-bold transition-all active:scale-95 mb-4"
          >
            2. Swipe Corporate Card
          </button>
          
          <div className="flex flex-col h-24 items-center justify-center w-full px-2">
            <p className="text-sm font-mono text-emerald-400 break-words max-w-full">
              {awsStatus}
            </p>
            {aiDecision && (
              <p className={`mt-2 p-3 w-full rounded text-sm font-bold shadow-inner ${
                aiDecision.includes('DECLINED') || aiDecision.includes('ERROR') 
                  ? 'bg-red-900/50 text-red-400 border border-red-800' 
                  : 'bg-green-900/50 text-green-400 border border-green-800'
              }`}>
                {aiDecision}
              </p>
            )}
          </div>
        </div>

      </div>
    </main>
  );
}