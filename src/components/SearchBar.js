import { useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { API_BASE } from "../api";

export default function SearchBar({ onOpen }) {
  const { user } = useAuth();
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const search = async () => {
    setError("");
    setResult(null);

    if (!phone.trim()) return;

    try {
      const { data: userFound } = await axios.get(
        `${API_BASE}/users/search/${phone}`,
        {
          headers: {
            Authorization: `Bearer ${user?.token}`,
          },
        }
      );

      setResult(userFound);
    } catch (err) {
      setError("No user found");
    }
  };

  const openChat = async () => {
    try {
      const { data: chat } = await axios.post(
        `${API_BASE}/chats/open`,
        { targetPhone: result.phone },
        { headers: { Authorization: `Bearer ${user?.token}` } }
      );

      onOpen(chat);
      setPhone("");
      setResult(null);

    } catch (err) {
      console.error("Failed to open chat:", err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all duration-300 text-white placeholder:text-white/20 shadow-inner group"
            placeholder="Search phones..."
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
          />
        </div>
        <button
          className="px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-300 active:scale-95"
          onClick={search}
        >
          Go
        </button>
      </div>

      {error && <div className="text-xs sm:text-sm text-red-500 animate-fade-in">{error}</div>}

      {result && (
        <div className="p-4 rounded-2xl glass-card flex items-center justify-between gap-4 animate-premium-in">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 grid place-items-center text-sm font-black text-white shadow-xl">
              {result.full_name?.[0] || "?"}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-[15px] truncate text-white">
                {result.id === user.id ? "Message Yourself (You)" : (result.full_name || "Unnamed")}
              </div>
              <div className="text-[11px] font-bold text-white/40 uppercase tracking-tighter">{result.phone}</div>
            </div>
          </div>
          <button
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 shadow-lg active:scale-95"
            onClick={openChat}
          >
            Chat
          </button>
        </div>
      )}
    </div>
  );
}
