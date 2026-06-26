"use client";

import { useState, useEffect } from "react";
import { supabase } from "../utils/supabase";

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<any>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState("");

  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [swipeStatus, setSwipeStatus] = useState("");
  const [logs, setLogs] = useState<any[]>([]);

  const AWS_API_URL = process.env.NEXT_PUBLIC_AWS_API_URL || "";

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      if (session?.user) {
        fetchLogs();
      }
    };
    checkUser();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setMessage(`Error: ${error.message}`);
      else setMessage("Success! You can now log in.");
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(`Error: ${error.message}`);
      else {
        setUser(data.user);
        setMessage("Successfully logged in!");
        fetchLogs();
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setLogs([]);
    setMessage("");
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch(AWS_API_URL);
      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
      const data = await res.json();
      setLogs(data);
    } catch (err: any) {
      console.error(err);
      setMessage(`Network Error: ${err.message}`);
    }
  };

  const handleSwipe = async () => {
    setSwipeStatus("Processing AI logic...");
    try {
      const res = await fetch(AWS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchant,
          amount: parseFloat(amount),
          email: user?.email,
        }),
      });

      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
      
      const data = await res.json();
      setSwipeStatus(`Success! Result: ${data.decision}`);
      fetchLogs(); 
      setMerchant("");
      setAmount("");
    } catch (err: any) {
      setSwipeStatus(`Error: ${err.message}`);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-8">
        <h1 className="text-4xl font-bold mb-8 text-blue-400">SmartWallet AI</h1>
        <div className="bg-slate-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-slate-700">
          <h2 className="text-2xl font-semibold mb-6">{isSignUp ? "Create Account" : "Sign In"}</h2>
          <form onSubmit={handleAuth} className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 rounded bg-slate-900 border border-slate-600 focus:border-blue-500 outline-none"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 rounded bg-slate-900 border border-slate-600 focus:border-blue-500 outline-none"
              required
            />
            <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded font-bold transition-colors">
              {isSignUp ? "Sign Up" : "Log In"}
            </button>
          </form>
          {message && <p className="mt-4 text-center text-emerald-400">{message}</p>}
          <button onClick={() => setIsSignUp(!isSignUp)} className="mt-6 w-full text-sm text-slate-400 hover:text-blue-400">
            {isSignUp ? "Already have an account? Log in" : "Need an account? Sign up"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex justify-between items-center mb-8 border-b border-slate-700 pb-4">
          <h1 className="text-3xl font-bold text-blue-400">SmartWallet MVP</h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-slate-400">{user.email}</span>
            <button onClick={handleLogout} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded font-bold text-sm transition">Sign Out</button>
          </div>
        </div>

        {/* Action Panel - Just the Swipe Form */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl">
           <h2 className="text-xl font-bold mb-4 text-white">Test Corporate Card</h2>
           <div className="flex space-x-4 mb-4">
              <div className="flex-1">
                <label className="text-xs text-slate-400">Merchant Name</label>
                <input type="text" value={merchant} onChange={(e)=>setMerchant(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-3 mt-1" />
              </div>
              <div className="flex-1">
                <label className="text-xs text-slate-400">Amount ($)</label>
                <input type="number" value={amount} onChange={(e)=>setAmount(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-3 mt-1" />
              </div>
           </div>
           <button onClick={handleSwipe} className="w-full py-4 bg-orange-600 hover:bg-orange-700 rounded font-bold text-white shadow-lg text-lg">
             Swipe Card
           </button>
           {swipeStatus && <p className="mt-4 text-center text-sm font-mono text-emerald-400">{swipeStatus}</p>}
        </div>

        {/* Simple Ledger */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">Raw Audit Database</h2>
            <button onClick={fetchLogs} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded font-bold text-sm">↻ Refresh DB</button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900 text-slate-400 font-bold">
                <tr>
                  <th className="p-4 rounded-tl-lg">Date</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Merchant</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4 rounded-tr-lg">AI Log</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr><td colSpan={5} className="p-4 text-center text-slate-500">No logs found in DynamoDB.</td></tr>
                ) : (
                  logs.map((log: any) => (
                    <tr key={log.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                      <td className="p-4 text-slate-400 font-mono text-xs">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="p-4 text-blue-300">{log.email}</td>
                      <td className="p-4 text-white">{log.merchant}</td>
                      <td className="p-4 text-slate-300">${parseFloat(log.amount).toFixed(2)}</td>
                      <td className="p-4 font-mono text-xs text-emerald-400">{log.aiDecision}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}