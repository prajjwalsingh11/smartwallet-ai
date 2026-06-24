"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

export default function Home() {
  // --- Auth State ---
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState('');

  // --- AWS & AI State ---
  const [awsStatus, setAwsStatus] = useState("Waiting for swipe...");
  const [aiDecision, setAiDecision] = useState("");
  const [merchantInput, setMerchantInput] = useState("Uber Ride");
  const [amountInput, setAmountInput] = useState("25.50");
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // --- Initialize: Check User Session & Fetch Logs ---
  useEffect(() => {
    // 1. Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // 2. Listen for login/logout events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    // 3. Fetch audit logs for the dashboard
    fetchAuditLogs();

    return () => subscription.unsubscribe();
  }, []);

  // --- Supabase Authentication Handlers ---
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthMessage("");
    
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setAuthMessage(`Error: ${error.message}`);
      else setAuthMessage("Success! You can now log in.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setAuthMessage(`Error: ${error.message}`);
      else setAuthMessage("Successfully logged in!");
    }
    setAuthLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setAuthMessage("Logged out securely.");
  };

  // --- AWS Lambda (Fetch Logs) ---
  const fetchAuditLogs = async () => {
    const lambdaUrl = process.env.NEXT_PUBLIC_AWS_LAMBDA_URL;
    if (!lambdaUrl) return;
    
    try {
      const response = await fetch(lambdaUrl); 
      const data = await response.json();
      if (Array.isArray(data)) setAuditLogs(data);
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    }
  };

  // --- AWS Lambda (Process Swipe) ---
  const simulateCardSwipe = async () => {
    if (!user) {
      setAwsStatus("Access Denied: Please log in first.");
      return;
    }

    setAwsStatus("Analyzing transaction via AWS Bedrock...");
    setAiDecision("");
    
    const lambdaUrl = process.env.NEXT_PUBLIC_AWS_LAMBDA_URL;
    if (!lambdaUrl) return;

    try {
      const response = await fetch(lambdaUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchant: merchantInput,
          amount: parseFloat(amountInput) || 0
        })
      });

      const data = await response.json();
      
      if (data && data.decision) {
        setAwsStatus(`Success! Merchant: ${data.merchantAnalyzed} ($${data.amountProcessed})`);
        setAiDecision(`AI Engine: ${data.decision}`);
        fetchAuditLogs(); // Refresh ledger
      } else {
        setAwsStatus(`Received anomaly: ${JSON.stringify(data).substring(0, 60)}...`);
      }
    } catch (error: any) {
      setAwsStatus(`Network Error: ${error.message}`);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-start bg-gray-900 text-white p-8 md:p-12">
      <h1 className="text-5xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 pt-8">
        SmartWallet AI
      </h1>
      <h2 className="text-xl text-gray-400 mb-12 font-mono">System Architecture Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl">
        
        {/* --- 1. Supabase Auth Panel --- */}
        <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 shadow-2xl flex flex-col items-center">
          <h3 className="text-2xl font-bold mb-2">Identity Provider</h3>
          <p className="text-sm text-gray-400 mb-6">Authentication via Supabase Auth</p>
          
          {user ? (
            <div className="w-full flex flex-col items-center bg-gray-900 p-6 rounded border border-emerald-900/50">
              <div className="h-16 w-16 bg-emerald-900/50 rounded-full flex items-center justify-center mb-4 border border-emerald-500">
                <span className="text-2xl">👤</span>
              </div>
              <p className="text-emerald-400 font-bold mb-1">Authenticated Employee</p>
              <p className="text-gray-400 text-sm mb-6">{user.email}</p>
              <button 
                onClick={handleSignOut}
                className="px-6 py-2 w-full bg-gray-700 hover:bg-gray-600 rounded font-bold transition-all active:scale-95 text-sm"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <form onSubmit={handleAuth} className="w-full">
              <div className="mb-4">
                <label className="block text-xs text-gray-400 mb-1">Corporate Email</label>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="mb-6">
                <label className="block text-xs text-gray-400 mb-1">Password</label>
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <button 
                type="submit"
                disabled={authLoading}
                className="px-6 py-3 w-full bg-blue-600 hover:bg-blue-500 rounded-lg font-bold transition-all active:scale-95 mb-4 disabled:opacity-50"
              >
                {authLoading ? "Processing..." : (isSignUp ? "Create Account" : "Secure Login")}
              </button>
              <p className="text-xs text-center text-gray-400 cursor-pointer hover:text-blue-400" onClick={() => setIsSignUp(!isSignUp)}>
                {isSignUp ? "Already have an account? Sign In" : "Need access? Create Account"}
              </p>
            </form>
          )}

          <p className={`text-sm font-mono mt-4 text-center h-6 ${authMessage.includes('Error') ? 'text-red-400' : 'text-emerald-400'}`}>
            {authMessage}
          </p>
        </div>

        {/* --- 2. AWS Lambda + Bedrock Panel --- */}
        <div className={`bg-gray-800 p-8 rounded-xl border ${user ? 'border-orange-900/50' : 'border-gray-700 opacity-75'} shadow-2xl flex flex-col items-center text-center transition-all`}>
          <h3 className="text-2xl font-bold mb-2">AI Logic Engine</h3>
          <p className="text-sm text-gray-400 mb-6">Serverless Compute + AWS Bedrock</p>
          
          {!user && (
            <div className="absolute mt-24 bg-gray-900/90 p-4 rounded border border-gray-600 backdrop-blur-sm z-10">
              <p className="text-red-400 font-bold text-sm">🔒 AUTHENTICATION REQUIRED</p>
              <p className="text-xs text-gray-400 mt-1">Please log in to use the AI engine.</p>
            </div>
          )}

          {/* Dynamic Inputs */}
          <div className="flex gap-4 w-full mb-4">
            <div className="flex-1">
              <label className="block text-xs text-gray-400 mb-1 text-left">Merchant Name</label>
              <input 
                type="text" 
                disabled={!user}
                value={merchantInput}
                onChange={(e) => setMerchantInput(e.target.value)}
                className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white focus:outline-none focus:border-orange-500 disabled:opacity-50"
              />
            </div>
            <div className="w-1/3">
              <label className="block text-xs text-gray-400 mb-1 text-left">Amount ($)</label>
              <input 
                type="number" 
                disabled={!user}
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white focus:outline-none focus:border-orange-500 disabled:opacity-50"
              />
            </div>
          </div>

          <button 
            onClick={simulateCardSwipe}
            disabled={!user}
            className="px-6 py-3 w-full bg-orange-600 hover:bg-orange-500 rounded-lg font-bold transition-all active:scale-95 mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* --- 3. Live Audit Ledger Panel --- */}
      <div className="w-full max-w-5xl mt-8 bg-gray-800 p-8 rounded-xl border border-gray-700 shadow-2xl mb-12">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-2xl font-bold">Immutable Audit Ledger</h3>
            <p className="text-sm text-gray-400">Live NoSQL feed via AWS DynamoDB</p>
          </div>
          <button 
            onClick={fetchAuditLogs}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm font-bold transition-all active:scale-95"
          >
            ↻ Refresh
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-900 text-gray-400">
              <tr>
                <th className="p-3 rounded-tl-lg">Timestamp</th>
                <th className="p-3">Merchant</th>
                <th className="p-3">Amount</th>
                <th className="p-3 rounded-tr-lg">AI Decision</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-gray-500">No transactions found in ledger.</td>
                </tr>
              ) : (
                auditLogs.map((log, index) => (
                  <tr key={index} className="border-b border-gray-700 hover:bg-gray-750">
                    <td className="p-3 text-gray-400 font-mono text-xs">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="p-3 font-semibold">{log.merchant}</td>
                    <td className="p-3 font-mono">${parseFloat(log.amount).toFixed(2)}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        log.aiDecision?.includes('APPROVED') ? 'bg-green-900/50 text-green-400' : 
                        log.aiDecision?.includes('ERROR') ? 'bg-yellow-900/50 text-yellow-400' :
                        'bg-red-900/50 text-red-400'
                      }`}>
                        {log.aiDecision?.substring(0, 45) || "Unknown"}{log.aiDecision?.length > 45 ? '...' : ''}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}