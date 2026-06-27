"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "../utils/supabase";

// Define Admins on the frontend for UI rendering
const ADMIN_EMAILS = ["prajwalsinghvns19@gmail.com", "prajjwal_admin@gmail.com"];

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [message, setMessage] = useState("");
  
  const [newPassword, setNewPassword] = useState("");
  const [isRecovery, setIsRecovery] = useState(false);

  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [swipeStatus, setSwipeStatus] = useState("");
  const [isScanning, setIsScanning] = useState(false); // NEW: AI Loading State
  
  const [logs, setLogs] = useState<any[]>([]);
  const [viewFilter, setViewFilter] = useState("ALL");

  const fileInputRef = useRef<HTMLInputElement>(null); // NEW: Hidden file input ref

  // Ensure no trailing slash for clean endpoint routing
  const AWS_API_URL = (process.env.NEXT_PUBLIC_AWS_API_URL || "").replace(/\/$/, "");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      if (session?.user?.email) fetchLogs(session.user.email);
    });
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setIsRecovery(true);
      setUser(session?.user || null);
      if (session?.user?.email) fetchLogs(session.user.email);
    });
    
    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    if (isForgotPassword) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
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

  const handleUpdatePassword = async () => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) alert(`Error: ${error.message}`);
    else {
      alert("Password updated successfully!");
      setIsRecovery(false);
      setNewPassword("");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setLogs([]);
    setViewFilter("ALL");
  };

  const fetchLogs = async (currentUserEmail: string) => {
    if (!AWS_API_URL) return;
    try {
      const res = await fetch(`${AWS_API_URL}?email=${currentUserEmail}`);
      if (!res.ok) throw new Error("Failed to fetch logs");
      const data = await res.json();
      setLogs(data);
    } catch (err: any) {
      console.error(err);
    }
  };

  // 📸 NEW: Handle Receipt Upload & Vision AI Extraction
  const handleScanReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !AWS_API_URL) return;

    setIsScanning(true);
    setSwipeStatus("📸 Initiating secure upload...");

    try {
      // 1. Get Presigned URL from Lambda
      const urlRes = await fetch(AWS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });
      if (!urlRes.ok) throw new Error("Failed to get secure upload link.");
      const { uploadUrl, fileKey } = await urlRes.json();

      setSwipeStatus("☁️ Uploading to AWS S3...");

      // 2. Upload file directly to S3 Bucket (Bypassing Lambda!)
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadRes.ok) throw new Error("S3 Upload Failed.");

      setSwipeStatus("🧠 Vision AI is analyzing receipt...");

      // 3. Trigger Vision AI extraction
      const analyzeRes = await fetch(AWS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileKey }),
      });
      if (!analyzeRes.ok) throw new Error("Vision AI analysis failed.");
      const extractedData = await analyzeRes.json();

      // 4. Auto-fill the form
      if (extractedData.merchant) setMerchant(extractedData.merchant);
      if (extractedData.amount) setAmount(extractedData.amount.toString());

      setSwipeStatus("✅ Receipt scanned successfully! Ready to swipe.");
    } catch (err: any) {
      setSwipeStatus(`Error: ${err.message}`);
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = ""; // Reset file input
    }
  };

  const handleSwipe = async () => {
    if (!AWS_API_URL || !merchant || !amount) {
      setSwipeStatus("Enter merchant and amount first.");
      return;
    }
    setSwipeStatus("Processing...");
    try {
      const res = await fetch(AWS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchant, amount: parseFloat(amount), email: user?.email }),
      });
      if (!res.ok) throw new Error("Network Error");
      const data = await res.json();
      setSwipeStatus(`Result: ${data.aiDecision}`);
      fetchLogs(user.email);
      setMerchant("");
      setAmount("");
    } catch (err: any) {
      setSwipeStatus(`Error: ${err.message}`);
    }
  };

  const isAdmin = user ? ADMIN_EMAILS.includes(user.email) : false;
  
  const getHighRiskUsers = () => {
    const strikes: Record<string, number> = {};
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).getTime();

    logs.forEach((log) => {
      const logTime = new Date(log.timestamp).getTime();
      if (log.aiDecision?.startsWith("DECLINED") && logTime > oneDayAgo) {
        strikes[log.email] = (strikes[log.email] || 0) + 1;
      }
    });
    return Object.entries(strikes).filter(([, count]) => count >= 2).map(([email]) => email);
  };
  
  const highRiskUsers = getHighRiskUsers();
  const isCurrentUserHighRisk = user ? highRiskUsers.includes(user.email) : false;
  
  const uniqueEmails = Array.from(new Set(logs.map((log) => log.email)));
  const displayedLogs = isAdmin && viewFilter !== "ALL" 
    ? logs.filter((log) => log.email === viewFilter) 
    : logs;

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-8">
        <h1 className="text-4xl font-bold mb-8 text-blue-400">SmartWallet AI</h1>
        <form onSubmit={handleAuth} className="bg-slate-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-slate-700 space-y-4">
          <h2 className="text-2xl font-semibold mb-2">{isForgotPassword ? "Reset Password" : isSignUp ? "Sign Up" : "Log In"}</h2>
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 rounded bg-slate-900 border border-slate-600 focus:border-blue-500 outline-none" required />
          {!isForgotPassword && (
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 rounded bg-slate-900 border border-slate-600 focus:border-blue-500 outline-none" required />
          )}
          <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded font-bold">
            {isForgotPassword ? "Send Reset Link" : isSignUp ? "Sign Up" : "Log In"}
          </button>
          {message && <p className="text-center text-emerald-400 text-sm">{message}</p>}
          <div className="flex flex-col items-center space-y-2 text-sm text-slate-400 pt-2">
            {isForgotPassword ? (
              <button type="button" onClick={() => { setIsForgotPassword(false); setMessage(""); }} className="hover:text-blue-400">← Back to Login</button>
            ) : (
              <>
                <button type="button" onClick={() => { setIsSignUp(!isSignUp); setMessage(""); }} className="hover:text-blue-400">{isSignUp ? "Already have an account? Log in" : "Need an account? Sign up"}</button>
                <button type="button" onClick={() => { setIsForgotPassword(true); setMessage(""); }} className="hover:text-blue-400">Forgot Password?</button>
              </>
            )}
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 p-8">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-700 pb-4">
          <h1 className="text-3xl font-bold text-blue-400">SmartWallet MVP</h1>
          <div className="flex items-center space-x-4">
            <span className={`text-xs px-2 py-1 rounded font-bold ${isAdmin ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700 text-slate-300'}`}>
              {isAdmin ? "👑 ADMIN" : "👤 EMPLOYEE"}
            </span>
            <span className="text-slate-400 text-sm">{user.email}</span>
            <button onClick={handleLogout} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded font-bold text-sm">Sign Out</button>
          </div>
        </div>

        {isRecovery && (
          <div className="bg-blue-900 border border-blue-500 rounded-xl p-6 shadow-2xl flex flex-col items-center">
            <h2 className="text-xl font-bold text-white mb-4">You requested a password reset</h2>
            <div className="flex w-full max-w-md space-x-4">
              <input type="password" placeholder="Enter new password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="flex-1 bg-slate-900 border border-slate-600 rounded p-3 text-white outline-none focus:border-blue-400" />
              <button onClick={handleUpdatePassword} className="px-6 py-3 bg-blue-500 hover:bg-blue-400 text-white font-bold rounded">Save</button>
            </div>
          </div>
        )}

        {/* ASYMMETRIC THREAT UI */}
        {isAdmin && highRiskUsers.length > 0 && (
          <div className="bg-red-950 border border-red-700 rounded-xl p-4 shadow-lg shadow-red-900/20">
            <p className="text-red-400 font-bold">⚠️ Global Alert — {highRiskUsers.length} High-Risk User(s) Detected (Last 24 Hours)</p>
            <p className="text-red-300 text-sm mt-1">{highRiskUsers.join(", ")} — 2+ policy violations</p>
          </div>
        )}

        {!isAdmin && isCurrentUserHighRisk && (
          <div className="bg-orange-950 border border-orange-700 rounded-xl p-4 shadow-lg shadow-orange-900/20">
            <p className="text-orange-400 font-bold">⚠️ Account Warning</p>
            <p className="text-orange-300 text-sm mt-1">You have multiple declined transactions in the last 24 hours. Please review the corporate expense policy below to avoid account suspension.</p>
          </div>
        )}

        {/* Swipe Card & Receipt Scanner */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">Test Corporate Card</h2>
            
            {/* Hidden File Input & Visible Button */}
            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef} 
              onChange={handleScanReceipt} 
              className="hidden" 
            />
            <button 
              onClick={() => fileInputRef.current?.click()} 
              disabled={isScanning}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 rounded font-bold text-sm text-white transition-colors flex items-center space-x-2"
            >
              {isScanning ? (
                <span>⏳ Processing AI...</span>
              ) : (
                <span>📸 Scan Receipt (AI)</span>
              )}
            </button>
          </div>

          <div className="flex space-x-4 mb-4">
            <input type="text" placeholder="Merchant Name" value={merchant} onChange={(e) => setMerchant(e.target.value)} className="flex-1 bg-slate-900 border border-slate-700 rounded p-3 text-white outline-none focus:border-blue-500" />
            <input type="number" placeholder="Amount ($)" value={amount} onChange={(e) => setAmount(e.target.value)} className="flex-1 bg-slate-900 border border-slate-700 rounded p-3 text-white outline-none focus:border-blue-500" />
          </div>
          
          <button onClick={handleSwipe} disabled={isScanning} className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 rounded font-bold text-white text-lg transition-colors">
            Swipe Card
          </button>
          
          {swipeStatus && (
            <p className={`mt-4 text-center font-bold ${
              swipeStatus.includes("Error") || swipeStatus.includes("DECLINED") 
                ? "text-red-400" 
                : swipeStatus.includes("☁️") || swipeStatus.includes("🧠") || swipeStatus.includes("📸")
                ? "text-blue-400"
                : "text-emerald-400"
            }`}>
              {swipeStatus}
            </p>
          )}

          <div className="mt-6 p-4 bg-slate-900/50 rounded border border-slate-700 text-sm text-slate-400">
             <span className="font-bold text-slate-300">Corporate Policy:</span> Auto-approval limit is $500.00. Luxury vendors (<span className="text-red-400 font-medium">Gucci, Rolex, Porsche, Louis Vuitton, Ritz</span>) are strictly prohibited and will result in an immediate strike.
          </div>
        </div>

        {/* Audit Ledger */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">{isAdmin ? "Global Audit Ledger" : "Personal Ledger"}</h2>
            
            <div className="flex items-center space-x-4">
              {isAdmin && uniqueEmails.length > 0 && (
                <select 
                  value={viewFilter} 
                  onChange={(e) => setViewFilter(e.target.value)} 
                  className="bg-slate-900 border border-slate-700 text-slate-300 text-sm rounded p-2 outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="ALL">All Employees</option>
                  {uniqueEmails.map(email => (
                    <option key={email} value={email}>{email}</option>
                  ))}
                </select>
              )}
              <button onClick={() => fetchLogs(user.email)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded font-bold text-sm transition-colors">↻ Refresh</button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-900 text-slate-400">
                <tr>
                  <th className="p-4 rounded-tl">Timestamp</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Merchant</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4 rounded-tr">AI Decision</th>
                </tr>
              </thead>
              <tbody>
                {displayedLogs.length === 0 ? (
                  <tr><td colSpan={5} className="p-4 text-center text-slate-500">No logs found.</td></tr>
                ) : (
                  displayedLogs.map((log: any) => {
                    const isHighRisk = isAdmin && highRiskUsers.includes(log.email);
                    const approved = log.aiDecision?.startsWith("APPROVED");
                    return (
                      <tr key={log.transactionId || log.id} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                        <td className="p-4 text-slate-400 text-xs">{new Date(log.timestamp).toLocaleString()}</td>
                        <td className={`p-4 font-medium ${isHighRisk ? "text-red-400" : "text-blue-300"}`}>
                          {isHighRisk && <span className="mr-1">⚠️</span>}
                          {log.email}
                        </td>
                        <td className="p-4 text-white font-medium">{log.merchant}</td>
                        <td className="p-4 text-slate-300">${parseFloat(log.amount).toFixed(2)}</td>
                        <td className={`p-4 font-bold ${approved ? "text-emerald-400" : "text-red-400"}`}>{log.aiDecision}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}