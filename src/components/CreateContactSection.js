import { useState } from "react";
import axios from "axios";
import { API_BASE } from "../api";
import { useAuth } from "../context/AuthContext";

export default function CreateContactSection({ onBack, onOpenChat }) {
    const { user } = useAuth();
    const [phone, setPhone] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // ✅ Use specific phone search endpoint
            const { data: foundUser } = await axios.get(`${API_BASE}/users/search/${phone}`, {
                headers: { Authorization: `Bearer ${user.token}` }
            });

            if (foundUser) {
                const { data: chat } = await axios.post(`${API_BASE}/chats`, { userId: foundUser.id || foundUser._id }, {
                    headers: { Authorization: `Bearer ${user.token}` }
                });
                onOpenChat(chat);
                onBack();
            } else {
                setError("User not found with this number.");
            }
        } catch (err) {
            console.error(err);
            if (err.response?.status === 404) {
                setError("User not found with this number.");
            } else {
                setError("Failed to find user.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] animate-fade-in">
            <div className="p-4 flex items-center gap-3 border-b border-slate-200">
                <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" /></svg>
                </button>
                <div>
                    <h2 className="text-lg font-black text-slate-900">New Chat</h2>
                    <p className="text-slate-500 text-xs font-medium">Start conversation</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 ml-1 uppercase tracking-wider">Phone / Username</label>
                    <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors font-mono"
                        placeholder="Enter phone or username"
                        autoFocus
                        required
                    />
                </div>

                {error && <div className="text-red-500 text-xs font-bold text-center bg-red-50 py-2 rounded-lg">{error}</div>}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-bold text-base shadow-lg shadow-primary/25 transition-all mt-4"
                >
                    {loading ? "Searching..." : "Start Chat"}
                </button>
            </form>

            <div className="px-6 mt-10 opacity-40">
                <div className="text-center">
                    <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" /></svg>
                    <div className="text-sm font-medium text-slate-400">Enter exact detail</div>
                </div>
            </div>

        </div>
    );
}
