"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "../utils/supabase";

const ADMIN_EMAILS = ["prajwalsinghvns19@gmail.com", "prajjwal_admin@gmail.com"];
const ROWS_PER_PAGE = 10;

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
  const [isScanning, setIsScanning] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [viewFilter, setViewFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const AWS_API_URL = (process.env.NEXT_PUBLIC_AWS_API_URL || "").replace(/\/$/, "");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      if (session?.user?.email) fetchLogs(session.user.email);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") setIsRecovery(true);
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
      else setMessage("Account created! You can now log in.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(`Error: ${error.message}`);
    }
  };

  const handleUpdatePassword = async () => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) alert(`Error: ${error.message}`);
    else { alert("Password updated!"); setIsRecovery(false); setNewPassword(""); }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setLogs([]); setViewFilter("ALL"); setCurrentPage(1);
  };

  const fetchLogs = async (currentUserEmail: string) => {
    if (!AWS_API_URL) return;
    try {
      const res = await fetch(`${AWS_API_URL}?email=${currentUserEmail}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setLogs(data);
      setCurrentPage(1);
    } catch (err: any) { console.error(err); }
  };

  const handleScanReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !AWS_API_URL) return;
    setIsScanning(true);
    setSwipeStatus("📸 Initiating secure upload...");
    try {
      const urlRes = await fetch(AWS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });
      if (!urlRes.ok) throw new Error("Failed to get upload link.");
      const { uploadUrl, fileKey } = await urlRes.json();
      setSwipeStatus("☁️ Uploading to AWS S3...");
      const uploadRes = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!uploadRes.ok) throw new Error("S3 Upload Failed.");
      setSwipeStatus("🧠 Gemini Vision AI analyzing receipt...");
      const analyzeRes = await fetch(AWS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileKey }),
      });
      if (!analyzeRes.ok) throw new Error("Vision AI analysis failed.");
      const extractedData = await analyzeRes.json();
      if (extractedData.merchant) setMerchant(extractedData.merchant);
      if (extractedData.amount) setAmount(extractedData.amount.toString());
      setSwipeStatus("✅ Receipt scanned! Review and swipe.");
    } catch (err: any) {
      setSwipeStatus(`Error: ${err.message}`);
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSwipe = async () => {
    if (!AWS_API_URL || !merchant || !amount) { setSwipeStatus("Enter merchant and amount first."); return; }
    setSwipeStatus("Processing...");
    try {
      const res = await fetch(AWS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchant, amount: parseFloat(amount), email: user?.email }),
      });
      if (!res.ok) throw new Error("Network Error");
      const data = await res.json();
      setSwipeStatus(`${data.aiDecision?.startsWith("APPROVED") ? "✅" : "❌"} ${data.aiDecision}`);
      fetchLogs(user.email);
      setMerchant(""); setAmount("");
    } catch (err: any) { setSwipeStatus(`Error: ${err.message}`); }
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
    return Object.entries(strikes).filter(([, c]) => c >= 2).map(([e]) => e);
  };

  const highRiskUsers = getHighRiskUsers();
  const isCurrentUserHighRisk = user ? highRiskUsers.includes(user.email) : false;
  const uniqueEmails = Array.from(new Set(logs.map((l) => l.email)));
  const filteredLogs = isAdmin && viewFilter !== "ALL" ? logs.filter((l) => l.email === viewFilter) : logs;

  // Stats
  const totalTx = filteredLogs.length;
  const totalApproved = filteredLogs.filter(l => l.aiDecision?.startsWith("APPROVED")).length;
  const totalDeclined = filteredLogs.filter(l => l.aiDecision?.startsWith("DECLINED")).length;
  const totalSpend = filteredLogs.filter(l => l.aiDecision?.startsWith("APPROVED")).reduce((s, l) => s + parseFloat(l.amount || 0), 0);
  const approvalRate = totalTx > 0 ? Math.round((totalApproved / totalTx) * 100) : 0;

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / ROWS_PER_PAGE);
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

  // AUTH SCREEN
  if (!user) {
    return (
      <div className="min-h-screen flex" style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #0d1b2a 50%, #0a1628 100%)" }}>
        {/* Left Panel */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12" style={{ borderRight: "1px solid rgba(99,179,237,0.1)" }}>
          <div>
            <div className="flex items-center gap-3 mb-16">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold" style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)" }}>S</div>
              <span className="text-white font-semibold text-lg tracking-tight">SmartWallet AI</span>
            </div>
            <div className="space-y-8">
              <div>
                <h1 className="text-5xl font-bold text-white leading-tight mb-4">Corporate expense<br /><span style={{ color: "#3b82f6" }}>compliance,</span><br />automated.</h1>
                <p className="text-lg" style={{ color: "#64748b" }}>AI-powered transaction evaluation, real-time fraud detection, and complete audit trails — built for enterprise.</p>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4">
                {[
                  { label: "Transactions Evaluated", value: "10K+" },
                  { label: "Avg Decision Time", value: "<2s" },
                  { label: "Fraud Detection Rate", value: "99.2%" },
                  { label: "Uptime SLA", value: "99.9%" },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <p className="text-2xl font-bold text-white">{stat.value}</p>
                    <p className="text-xs mt-1" style={{ color: "#64748b" }}>{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {["#3b82f6", "#06b6d4", "#8b5cf6", "#10b981"].map((c, i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold text-white" style={{ background: c, borderColor: "#0a0f1e" }}>U</div>
              ))}
            </div>
            <p className="text-sm" style={{ color: "#64748b" }}>Trusted by finance teams worldwide</p>
          </div>
        </div>

        {/* Right Panel - Auth Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            <div className="lg:hidden flex items-center gap-3 mb-10 justify-center">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold" style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)" }}>S</div>
              <span className="text-white font-semibold text-lg">SmartWallet AI</span>
            </div>

            <div className="rounded-2xl p-8" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <h2 className="text-2xl font-bold text-white mb-1">
                {isForgotPassword ? "Reset password" : isSignUp ? "Create account" : "Welcome back"}
              </h2>
              <p className="text-sm mb-8" style={{ color: "#64748b" }}>
                {isForgotPassword ? "Enter your email to receive a reset link" : isSignUp ? "Start managing expenses smarter" : "Sign in to your workspace"}
              </p>

              <form onSubmit={handleAuth} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "#94a3b8" }}>Email address</label>
                  <input type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none transition-all"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} required />
                </div>
                {!isForgotPassword && (
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: "#94a3b8" }}>Password</label>
                    <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} required />
                  </div>
                )}
                <button type="submit" className="w-full py-3 rounded-xl font-semibold text-white text-sm mt-2 transition-all hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)" }}>
                  {isForgotPassword ? "Send reset link" : isSignUp ? "Create account" : "Sign in"}
                </button>
              </form>

              {message && (
                <div className="mt-4 px-4 py-3 rounded-xl text-sm" style={{ background: message.startsWith("Error") ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)", color: message.startsWith("Error") ? "#f87171" : "#34d399" }}>
                  {message}
                </div>
              )}

              <div className="mt-6 pt-6 flex flex-col items-center gap-2 text-sm" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", color: "#64748b" }}>
                {isForgotPassword ? (
                  <button type="button" onClick={() => { setIsForgotPassword(false); setMessage(""); }} className="hover:text-white transition-colors">← Back to sign in</button>
                ) : (
                  <>
                    <button type="button" onClick={() => { setIsSignUp(!isSignUp); setMessage(""); }} className="hover:text-white transition-colors">
                      {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
                    </button>
                    <button type="button" onClick={() => { setIsForgotPassword(true); setMessage(""); }} className="hover:text-white transition-colors">Forgot your password?</button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // DASHBOARD
  return (
    <div className="min-h-screen" style={{ background: "#080e1a", color: "#e2e8f0" }}>

      {/* Top Nav */}
      <nav className="sticky top-0 z-50 px-6 py-4 flex items-center justify-between" style={{ background: "rgba(8,14,26,0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)" }}>S</div>
          <span className="font-semibold text-white">SmartWallet AI</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(59,130,246,0.15)", color: "#60a5fa" }}>v2.0</span>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${isAdmin ? "text-amber-300" : "text-blue-300"}`}
            style={{ background: isAdmin ? "rgba(251,191,36,0.15)" : "rgba(59,130,246,0.15)" }}>
            {isAdmin ? "👑 Admin" : "👤 Employee"}
          </span>
          <span className="text-sm hidden sm:block" style={{ color: "#64748b" }}>{user.email}</span>
          <button onClick={handleLogout} className="text-sm px-4 py-1.5 rounded-lg font-medium transition-all hover:bg-white/10" style={{ border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8" }}>
            Sign out
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* Password Recovery */}
        {isRecovery && (
          <div className="rounded-2xl p-6" style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}>
            <h3 className="font-semibold text-white mb-4">Set new password</h3>
            <div className="flex gap-3 max-w-md">
              <input type="password" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
              <button onClick={handleUpdatePassword} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)" }}>Save</button>
            </div>
          </div>
        )}

        {/* Threat Banners */}
        {isAdmin && highRiskUsers.length > 0 && (
          <div className="rounded-2xl p-5 flex items-start gap-4" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(239,68,68,0.15)" }}>
              <span className="text-lg">🚨</span>
            </div>
            <div>
              <p className="font-semibold text-red-400">Global Alert — {highRiskUsers.length} High-Risk User(s) Detected</p>
              <p className="text-sm mt-1" style={{ color: "#f87171" }}>{highRiskUsers.join(" · ")} — 2+ policy violations in last 24 hours</p>
            </div>
          </div>
        )}

        {!isAdmin && isCurrentUserHighRisk && (
          <div className="rounded-2xl p-5 flex items-start gap-4" style={{ background: "rgba(251,146,60,0.08)", border: "1px solid rgba(251,146,60,0.2)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(251,146,60,0.15)" }}>
              <span className="text-lg">⚠️</span>
            </div>
            <div>
              <p className="font-semibold text-orange-400">Account Warning</p>
              <p className="text-sm mt-1 text-orange-300">You have multiple declined transactions in the last 24 hours. Review the corporate expense policy to avoid suspension.</p>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Transactions", value: totalTx, sub: "all time", icon: "📊", color: "#3b82f6" },
            { label: "Approved", value: totalApproved, sub: `${approvalRate}% approval rate`, icon: "✅", color: "#10b981" },
            { label: "Declined", value: totalDeclined, sub: "policy violations", icon: "❌", color: "#ef4444" },
            { label: "Approved Spend", value: `$${totalSpend.toFixed(2)}`, sub: "total authorized", icon: "💰", color: "#f59e0b" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium" style={{ color: "#64748b" }}>{stat.label}</span>
                <span className="text-lg">{stat.icon}</span>
              </div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-xs mt-1" style={{ color: "#475569" }}>{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Swipe Card Panel */}
          <div className="lg:col-span-1 rounded-2xl p-6 space-y-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-white">Swipe Card</h2>
                <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>AI-evaluated transaction</p>
              </div>
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleScanReceipt} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} disabled={isScanning}
                className="text-xs px-3 py-2 rounded-xl font-semibold transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: "rgba(16,185,129,0.15)", color: "#34d399", border: "1px solid rgba(16,185,129,0.2)" }}>
                {isScanning ? "⏳ Scanning..." : "📸 Scan Receipt"}
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "#94a3b8" }}>Merchant</label>
                <input type="text" placeholder="e.g. Uber, Marriott..." value={merchant} onChange={(e) => setMerchant(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "#94a3b8" }}>Amount (USD)</label>
                <input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }} />
              </div>
            </div>

            <button onClick={handleSwipe} disabled={isScanning}
              className="w-full py-3.5 rounded-xl font-semibold text-white text-sm transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)" }}>
              Swipe Corporate Card
            </button>

            {swipeStatus && (
              <div className={`px-4 py-3 rounded-xl text-sm font-medium text-center ${swipeStatus.includes("APPROVED") || swipeStatus.includes("✅") || swipeStatus.includes("scanned") ? "text-emerald-400" : swipeStatus.includes("Error") || swipeStatus.includes("DECLINED") || swipeStatus.includes("❌") ? "text-red-400" : "text-blue-400"}`}
                style={{ background: "rgba(255,255,255,0.04)" }}>
                {swipeStatus}
              </div>
            )}

            {/* Policy Box */}
            <div className="rounded-xl p-4 text-xs space-y-1" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", color: "#475569" }}>
              <p className="font-semibold text-slate-400 mb-2">Corporate Policy</p>
              <p>• Auto-approval limit: <span className="text-slate-300">$500.00</span></p>
              <p>• Prohibited vendors: <span className="text-red-400">Gucci · Rolex · Porsche · Louis Vuitton · Ritz</span></p>
            </div>
          </div>

          {/* Audit Ledger */}
          <div className="lg:col-span-2 rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-semibold text-white">{isAdmin ? "Global Audit Ledger" : "My Transactions"}</h2>
                <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>
                  {filteredLogs.length} records · Page {currentPage} of {totalPages || 1}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && uniqueEmails.length > 0 && (
                  <select value={viewFilter} onChange={(e) => { setViewFilter(e.target.value); setCurrentPage(1); }}
                    className="text-xs px-3 py-2 rounded-xl outline-none cursor-pointer"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8" }}>
                    <option value="ALL">All Employees</option>
                    {uniqueEmails.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                )}
                <button onClick={() => fetchLogs(user.email)}
                  className="text-xs px-3 py-2 rounded-xl font-medium transition-all hover:bg-white/10"
                  style={{ border: "1px solid rgba(255,255,255,0.08)", color: "#64748b" }}>
                  ↻ Refresh
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    {["Timestamp", "Employee", "Merchant", "Amount", "Decision"].map(h => (
                      <th key={h} className="text-left pb-3 pr-4 text-xs font-medium" style={{ color: "#475569" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-sm" style={{ color: "#475569" }}>
                        No transactions yet. Swipe a card to get started.
                      </td>
                    </tr>
                  ) : (
                    paginatedLogs.map((log: any) => {
                      const isHighRisk = isAdmin && highRiskUsers.includes(log.email);
                      const approved = log.aiDecision?.startsWith("APPROVED");
                      return (
                        <tr key={log.transactionId || log.id} className="transition-colors hover:bg-white/[0.02]"
                          style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                          <td className="py-3.5 pr-4 text-xs font-mono" style={{ color: "#475569" }}>
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="py-3.5 pr-4">
                            <span className={`text-xs font-medium ${isHighRisk ? "text-red-400" : "text-blue-400"}`}>
                              {isHighRisk && "⚠️ "}{log.email}
                            </span>
                          </td>
                          <td className="py-3.5 pr-4 font-medium text-white text-sm">{log.merchant}</td>
                          <td className="py-3.5 pr-4 font-mono text-sm" style={{ color: "#94a3b8" }}>
                            ${parseFloat(log.amount).toFixed(2)}
                          </td>
                          <td className="py-3.5">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${approved ? "text-emerald-400" : "text-red-400"}`}
                              style={{ background: approved ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)" }}>
                              {log.aiDecision}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-xs" style={{ color: "#475569" }}>
                  Showing {((currentPage - 1) * ROWS_PER_PAGE) + 1}–{Math.min(currentPage * ROWS_PER_PAGE, filteredLogs.length)} of {filteredLogs.length}
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1}
                    className="w-8 h-8 rounded-lg text-xs flex items-center justify-center disabled:opacity-30 hover:bg-white/10 transition-colors"
                    style={{ color: "#64748b" }}>«</button>
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                    className="w-8 h-8 rounded-lg text-xs flex items-center justify-center disabled:opacity-30 hover:bg-white/10 transition-colors"
                    style={{ color: "#64748b" }}>‹</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                    .reduce((acc: (number | string)[], p, idx, arr) => {
                      if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, idx) => p === "..." ? (
                      <span key={`ellipsis-${idx}`} className="w-8 h-8 flex items-center justify-center text-xs" style={{ color: "#475569" }}>…</span>
                    ) : (
                      <button key={p} onClick={() => setCurrentPage(p as number)}
                        className="w-8 h-8 rounded-lg text-xs font-medium flex items-center justify-center transition-all"
                        style={currentPage === p ? { background: "linear-gradient(135deg, #3b82f6, #06b6d4)", color: "white" } : { color: "#64748b" }}>
                        {p}
                      </button>
                    ))}
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                    className="w-8 h-8 rounded-lg text-xs flex items-center justify-center disabled:opacity-30 hover:bg-white/10 transition-colors"
                    style={{ color: "#64748b" }}>›</button>
                  <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}
                    className="w-8 h-8 rounded-lg text-xs flex items-center justify-center disabled:opacity-30 hover:bg-white/10 transition-colors"
                    style={{ color: "#64748b" }}>»</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}