// client/src/components/JoinGroupModal.js
import { useState } from "react";
import axios from "axios";
import { API_BASE } from "../api";
import { useAuth } from "../context/AuthContext";

export default function JoinGroupModal({ open, onClose, onRefresh }) {
    const { user } = useAuth();
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    if (!open) return null;

    const handleJoin = async (e) => {
        e.preventDefault();
        if (code.length !== 6) {
            setError("Please enter a 6-digit code");
            return;
        }

        setLoading(true);
        setError(null);
        try {
            await axios.post(
                `${API_BASE}/groups/join/${code}`,
                {},
                { headers: { Authorization: `Bearer ${user?.token}` } }
            );

            setSuccess(true);
            setTimeout(() => {
                onClose();
                setSuccess(false);
                setCode("");
                if (onRefresh) onRefresh();
            }, 2000);
        } catch (e) {
            setError(e.response?.data?.message || "Invalid or expired code");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 grid place-items-center z-[60] p-4 animate-in fade-in duration-200">
            <div className="bg-white border border-background-dark rounded-2xl p-6 w-full max-w-sm shadow-2xl scale-in-center">
                <div className="flex justify-between items-center mb-6">
                    <div className="text-xl font-black text-primary">Join Group</div>
                    <button onClick={onClose} className="text-primary/40 hover:text-primary transition-colors text-xl">✕</button>
                </div>

                {success ? (
                    <div className="text-center py-8">
                        <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" /></svg>
                        </div>
                        <div className="text-lg font-bold text-primary mb-1">Request Sent!</div>
                        <div className="text-sm text-primary/60">Wait for an admin to approve your request.</div>
                    </div>
                ) : (
                    <form onSubmit={handleJoin} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-primary/40 uppercase tracking-widest mb-2">6-Digit Invite Code</label>
                            <input
                                autoFocus
                                type="text"
                                maxLength={6}
                                placeholder="000000"
                                className="w-full bg-background border-2 border-background-dark px-4 py-4 rounded-xl text-3xl font-black text-center tracking-[0.5em] outline-none focus:border-secondary transition-all text-primary placeholder:text-primary/10"
                                value={code}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/[^0-9]/g, "");
                                    if (val.length <= 6) setCode(val);
                                }}
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm font-medium animate-shake">
                                {error}
                            </div>
                        )}

                        <button
                            disabled={loading || code.length !== 6}
                            className="w-full py-4 bg-primary text-white rounded-xl font-bold hover:bg-primary-light transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Checking...
                                </>
                            ) : (
                                "Request Access"
                            )}
                        </button>
                        <p className="text-[10px] text-center text-primary/40 leading-relaxed">By requesting to join, your name and phone number will be visible to the group admins.</p>
                    </form>
                )}
            </div>
        </div>
    );
}
