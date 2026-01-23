// client/src/components/CallHistory.js
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { API_BASE } from "../api";
import { useAuth } from "../context/AuthContext";

export default function CallHistory({ onStartCall }) {
    const { user } = useAuth();
    const [calls, setCalls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchCalls = useCallback(async () => {
        try {
            const { data } = await axios.get(`${API_BASE}/calls/get-calls`, {
                headers: { Authorization: `Bearer ${user?.token}` }
            });
            setCalls(data);
        } catch (err) {
            console.error("Failed to fetch call history:", err);
            setError("Failed to load call history");
        } finally {
            setLoading(false);
        }
    }, [user?.token]);

    const handleClear = async () => {
        if (!window.confirm("Clear all call history? This cannot be undone.")) return;
        try {
            await axios.delete(`${API_BASE}/calls/clear`, {
                headers: { Authorization: `Bearer ${user?.token}` }
            });
            setCalls([]);
        } catch (err) {
            console.error("Failed to clear call history:", err);
            alert("Failed to clear call history");
        }
    };

    useEffect(() => {
        if (user?.token) fetchCalls();
    }, [user?.token, fetchCalls]);

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex-1 p-6 text-center text-red-500">
                <p>{error}</p>
                <button onClick={fetchCalls} className="mt-4 text-primary font-bold hover:underline">Retry</button>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-[#040712]">
            <div className="px-5 pt-8 pb-4 flex items-end justify-between">
                <div>
                    <h2 className="text-2xl font-black text-white">Call History</h2>
                    <p className="text-xs text-white/40 mt-1">Review your past audio and video interactions.</p>
                </div>
                {calls.length > 0 && (
                    <button
                        onClick={handleClear}
                        className="text-[10px] font-black uppercase tracking-widest text-red-400/60 hover:text-red-400 px-3 py-1.5 rounded-lg border border-red-400/10 hover:bg-red-400/5 transition-all"
                    >
                        Clear All
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto px-3 space-y-2 custom-scrollbar pb-20">
                {calls.length === 0 ? (
                    <div className="py-20 text-center opacity-40">
                        <div className="text-4xl mb-4">📞</div>
                        <p className="text-sm font-medium">No call logs yet</p>
                    </div>
                ) : (
                    calls.map((c) => {
                        const isCaller = c.caller._id === user.id;
                        const peer = isCaller ? c.receiver : c.caller;
                        const isMissed = c.status === "missed" || c.status === "declined";

                        return (
                            <div
                                key={c._id}
                                className="group flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-12 h-12 rounded-2xl overflow-hidden bg-primary/20 text-primary flex items-center justify-center font-bold text-lg ring-1 ring-white/10 flex-shrink-0">
                                        {peer.avatar ? (
                                            <img src={peer.avatar} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            peer.full_name?.[0] || "?"
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-bold text-white truncate flex items-center gap-2">
                                            {peer.full_name || peer.phone}
                                            {c.type === "video" ? (
                                                <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                </svg>
                                            ) : (
                                                <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                </svg>
                                            )}
                                        </div>
                                        <div className="text-[10px] flex items-center gap-1.5 mt-0.5">
                                            {isCaller ? (
                                                <svg className="w-3 h-3 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                                </svg>
                                            ) : (
                                                <svg className="w-3 h-3 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                                                </svg>
                                            )}
                                            <span className={`${isMissed ? "text-red-400" : "text-white/40"} font-medium capitalize`}>
                                                {isMissed ? "Missed" : "Completed"}
                                            </span>
                                            <span className="text-white/20">•</span>
                                            <span className="text-white/40">{new Date(c.startedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                            {c.duration > 0 && (
                                                <>
                                                    <span className="text-white/20">•</span>
                                                    <span className="text-white/40">{Math.floor(c.duration / 60)}m {c.duration % 60}s</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => onStartCall?.(peer.id, c.type)}
                                    className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-white/40 hover:text-white transition-all scale-90 group-hover:scale-100 ring-1 ring-white/0 hover:ring-white/10 shadow-lg"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                </button>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
