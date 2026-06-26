"use client";

import { useState, useEffect } from "react";
import { supabase } from "../utils/supabase";

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [message, setMessage] = useState("");

  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [swipeStatus, setSwipeStatus] = useState("");
  const [logs, setLogs] = useState<any[]>([]);

  const AWS_API_URL = process.env.NEXT_PUBLIC_AWS_API_URL || "";

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      if (session?.user) fetchLogs();
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (session?.user) fetchLogs();
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    if (isForgotPassword) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) setMessage(`Error: ${error.message}`);
      else setMessage("✓ Reset link sent! Check your email.");
      return;
    }

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setMessage(`Error: ${error.message}`);
      else setMessage("Success! You can log in now.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(`Error: ${error.message}`);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setLogs([]);
  };

  const fetchLogs = async () => {
    if (!AWS_API_URL) return;
    try {
      const res = await fetch(AWS_API_URL);
      if (!res.ok) throw new Error("Failed to fetch logs");
      const data = await res.json();
      setLogs(data);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleSwipe = async () => {
    if (!AWS_API_URL) {
      setSwipeStatus("Error: AWS_API_URL is missing.");
      return;
    }
    if (!merchant || !amount) {
      setSwipeStatus("Enter merchant and amount first.");
      return;
    }
    setSwipeStatus("Processing...");
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
      if (!res.ok) throw new Error("Network Error: Failed to fetch from AWS");
      const data = await res.json();
      setSwipeStatus(`Result: ${data.aiDecision}`);
      fetchLogs();
      setMerchant("");
      setAmount("");
    } catch (err: any) {
      setSwipeStatus(`Error: ${err.message}`);
    }
  };

  // Threat Analytics
  const getHighRiskUsers = () => {
    const strikes: Record<string, number> = {};
    logs.forEach((log) => {
      if (log.aiDecision?.startsWith("DECLINED")) {
        strikes[log.email] = (strikes[log.email] || 0) + 1;
      }
    });
    return Object.entries(strikes)
      .filter(([, count]) => count >= 2)
      .map(([email]) => email);
  };
  const highRiskUsers = getHighRiskUsers();

  // AUTH SCREEN
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-8">
        <h1 className="text-4xl font-bold mb-8 text-blue-400">SmartWallet AI</h1>
        <form onSubmit={handleAuth} className="bg-slate-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-slate-700 space-y-4">
          <h2 className="text-2xl font-semibold mb-2">
            {isForgotPassword ? "Reset Password" : isSignUp ? "Sign Up" : "Log In"}
          </h2>

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 rounded bg-slate-900 border border-slate-600 focus:border-blue-500 outline-none"
            required
          />

          {!isForgotPassword && (
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 rounded bg-slate-900 border border-slate-600 focus:border-blue-500 outline-none"
              required
            />
          )}

          <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded font-bold">
            {isForgotPassword ? "Send Reset Link" : isSignUp ? "Sign Up" : "Log In"}
          </button>

          {message && <p className="text-center text-emerald-400 text-sm">{message}</p>}

          <div className="flex flex-col items-center space-y-2 text-sm text-slate-400 pt-2">
            {isForgotPassword ? (
              <button type="button" onClick={() => { setIsForgotPassword(false); setMessage(""); }} className="hover:text-blue-400">
                ← Back to Login
              </button>
            ) : (
              <>
                <button type="button" onClick={() => { setIsSignUp(!isSignUp); setMessage(""); }} className="hover:text-blue-400">
                  {isSignUp ? "Already have an account? Log in" : "Need an account? Sign up"}
                </button>
                <button type="button" onClick={() => { setIsForgotPassword(true); setMessage(""); }} className="hover:text-blue-400">
                  Forgot Password?
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    );
  }

  // DASHBOARD
  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 p-8">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-700 pb-4">
          <h1 className="text-3xl font-bold text-blue-400">SmartWallet MVP</h1>
          <div className="flex items-center space-x-4">
            <span className="text-slate-400 text-sm">{user.email}</span>
            <button onClick={handleLogout} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded font-bold text-sm">Sign Out</button>
          </div>
        </div>

        {/* Threat Analytics Banner */}
        {highRiskUsers.length > 0 && (
          <div className="bg-red-950 border border-red-700 rounded-xl p-4">
            <p className="text-red-400 font-bold">⚠️ Threat Analytics — {highRiskUsers.length} High-Risk User(s) Detected</p>
            <p className="text-red-300 text-sm mt-1">{highRiskUsers.join(", ")} — 2+ policy violations flagged</p>
          </div>
        )}

        {/* Swipe Card */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h2 className="text-xl font-bold mb-4 text-white">Test Corporate Card</h2>
          <div className="flex space-x-4 mb-4">
            <input type="text" placeholder="Merchant Name" value={merchant} onChange={(e) => setMerchant(e.target.value)} className="flex-1 bg-slate-900 border border-slate-700 rounded p-3 text-white outline-none focus:border-blue-500" />
            <input type="number" placeholder="Amount ($)" value={amount} onChange={(e) => setAmount(e.target.value)} className="flex-1 bg-slate-900 border border-slate-700 rounded p-3 text-white outline-none focus:border-blue-500" />
          </div>
          <button onClick={handleSwipe} className="w-full py-4 bg-blue-600 hover:bg-blue-700 rounded font-bold text-white text-lg">Swipe Card</button>
          {swipeStatus && (
            <p className={`mt-4 text-center font-bold ${swipeStatus.startsWith("Error") ? "text-red-400" : "text-emerald-400"}`}>
              {swipeStatus}
            </p>
          )}
        </div>

        {/* Audit Ledger */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">Raw Audit Ledger</h2>
            <button onClick={fetchLogs} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded font-bold text-sm">↻ Refresh</button>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="p-4">Timestamp</th>
                <th className="p-4">Email</th>
                <th className="p-4">Merchant</th>
                <th className="p-4">Amount</th>
                <th className="p-4">AI Decision</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr><td colSpan={5} className="p-4 text-center text-slate-500">No logs found.</td></tr>
              ) : (
                logs.map((log: any) => {
                  const isHighRisk = highRiskUsers.includes(log.email);
                  const approved = log.aiDecision?.startsWith("APPROVED");
                  return (
                    <tr key={log.transactionId || log.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                      <td className="p-4 text-slate-400 text-xs">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className={`p-4 font-medium ${isHighRisk ? "text-red-400" : "text-blue-300"}`}>
                        {isHighRisk && <span className="mr-1">⚠️</span>}
                        {log.email}
                      </td>
                      <td className="p-4 text-white">{log.merchant}</td>
                      <td className="p-4 text-slate-300">${parseFloat(log.amount).toFixed(2)}</td>
                      <td className={`p-4 font-bold ${approved ? "text-emerald-400" : "text-red-400"}`}>
                        {log.aiDecision}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}