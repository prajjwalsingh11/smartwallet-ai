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
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setLogs(data);
    } catch (err: any) {
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

      if (!res.ok) throw new Error("Failed to process transaction");
      
      const data = await res.json();
      setSwipeStatus(`Success! Result: ${data.decision}`);
      fetchLogs(); 
      setMerchant("");
      setAmount("");
    } catch (err: any) {
      setSwipeStatus(`Error: ${err.message}`);
    }
  };

  const isAdmin = user?.email?.includes("admin");

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-8">
        <h1 className="text-4xl font-bold mb-8 text-blue-400">SmartWallet AI</h1>
        <div className="bg-slate-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-slate-700">
          <h2 className="text-2xl font-semibold mb-6">{isSignUp ? "Create Account" : "Sign In"}</h2>
          <form onSubmit={handleAuth} className="space-y-4">
            <input
              type="email"
              placeholder="Corporate Email"
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
      <div className="max-w-6xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold text-center text-blue-400 mb-12">SmartWallet AI Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl flex flex-col items-center">
            <h2 className="text-xl font-bold mb-4 text-white">Identity Provider</h2>
            <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mb-4">👤</div>
            <p className="text-emerald-400 font-bold">Authenticated User</p>
            <p className="text-slate-300 mb-2">{user.email}</p>
            <span className={`px-3 py-1 rounded-full text-xs font-bold mb-6 ${isAdmin ? 'bg-purple-900 text-purple-300' : 'bg-blue-900 text-blue-300'}`}>
              Role: {isAdmin ? 'ADMIN' : 'EMPLOYEE'}
            </span>
            <button onClick={handleLogout} className="w-full py-2 bg-slate-700 hover:bg-slate-600 rounded font-bold transition">Sign Out</button>
          </div>

          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl">
             <h2 className="text-xl font-bold mb-4 text-center text-white">AI Logic Engine</h2>
             <div className="flex space-x-4 mb-4">
                <div className="flex-1">
                  <label className="text-xs text-slate-400">Merchant Name</label>
                  <input type="text" value={merchant} onChange={(e)=>setMerchant(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 mt-1" />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-slate-400">Amount ($)</label>
                  <input type="number" value={amount} onChange={(e)=>setAmount(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 mt-1" />
                </div>
             </div>
             <button onClick={handleSwipe} className="w-full py-3 bg-orange-600 hover:bg-orange-700 rounded font-bold text-white shadow-lg">Swipe Corporate Card</button>
             {swipeStatus && <p className="mt-4 text-center text-sm font-mono text-emerald-400">{swipeStatus}</p>}
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Audit Ledger</h2>
            <button onClick={fetchLogs} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded font-bold text-sm">↻ Refresh</button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900 text-slate-400 font-bold">
                <tr>
                  <th className="p-4 rounded-tl-lg">Timestamp</th>
                  <th className="p-4">Employee</th>
                  <th className="p-4">Merchant</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4 rounded-tr-lg">AI Decision</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr><td colSpan={5} className="p-4 text-center text-slate-500">No transactions found.</td></tr>
                ) : (
                  logs.map((log: any) => (
                    <tr key={log.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                      <td className="p-4 text-slate-400 font-mono text-xs">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="p-4 text-blue-300 font-medium">{log.email}</td>
                      <td className="p-4 text-white">{log.merchant}</td>
                      <td className="p-4 text-slate-300">${parseFloat(log.amount).toFixed(2)}</td>
                      <td className="p-4 font-bold text-emerald-400">{log.aiDecision}</td>
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