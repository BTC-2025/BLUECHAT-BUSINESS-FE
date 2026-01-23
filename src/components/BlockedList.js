// client/src/components/BlockedList.js
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { API_BASE } from "../api";
import { useAuth } from "../context/AuthContext";
import { socket } from "../socket";

export default function BlockedList() {
    const { user } = useAuth();
    const [blockedUsers, setBlockedUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchBlocked = useCallback(async () => {
        try {
            const { data } = await axios.get(`${API_BASE}/users/blocked`, {
                headers: { Authorization: `Bearer ${user?.token}` }
            });
            setBlockedUsers(data);
        } catch (err) {
            console.error("Failed to fetch blocked users:", err);
            setError("Failed to load blocked contacts");
        } finally {
            setLoading(false);
        }
    }, [user?.token]);

    useEffect(() => {
        if (user?.token) fetchBlocked();
    }, [user?.token, fetchBlocked]);

    const handleUnblock = (targetUserId) => {
        socket.emit("user:unblock", { targetUserId }, (res) => {
            if (res.success) {
                setBlockedUsers(prev => prev.filter(u => u._id !== targetUserId));
            } else {
                alert(res.error || "Failed to unblock user");
            }
        });
    };

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
                <button onClick={fetchBlocked} className="mt-4 text-primary font-bold hover:underline">Retry</button>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-[#040712]">
            <div className="px-5 pt-8 pb-4">
                <h2 className="text-2xl font-black text-white">Blocked Contacts</h2>
                <p className="text-xs text-white/40 mt-1">Blocked contacts cannot message you or see your presence.</p>
            </div>

            <div className="flex-1 overflow-y-auto px-3 space-y-2 custom-scrollbar pb-20">
                {blockedUsers.length === 0 ? (
                    <div className="py-20 text-center opacity-40">
                        <div className="text-4xl mb-4">🚫</div>
                        <p className="text-sm font-medium">No blocked contacts</p>
                    </div>
                ) : (
                    blockedUsers.map((u) => (
                        <div
                            key={u._id}
                            className="group flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl overflow-hidden bg-primary/20 text-primary flex items-center justify-center font-bold text-lg ring-1 ring-white/10">
                                    {u.avatar ? (
                                        <img src={u.avatar} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        u.full_name?.[0] || "?"
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <div className="font-bold text-white truncate">{u.full_name}</div>
                                    <div className="text-xs text-white/40 truncate">{u.phone}</div>
                                </div>
                            </div>

                            <button
                                onClick={() => handleUnblock(u._id)}
                                className="px-4 py-2 bg-emerald-500/10 text-emerald-500 rounded-xl text-xs font-black hover:bg-emerald-500 hover:text-white transition-all scale-95 group-hover:scale-100 opacity-60 group-hover:opacity-100"
                            >
                                Unblock
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
