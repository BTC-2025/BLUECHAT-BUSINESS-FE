import { useState } from "react";
import axios from "axios";
import { API_BASE } from "../api";
import { useAuth } from "../context/AuthContext";

export default function CommunityCreateModal({ open, onClose, onCreated }) {
    const { user } = useAuth();
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);

    if (!open) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;

        setLoading(true);
        try {
            await axios.post(
                `${API_BASE}/communities`,
                { name, description },
                { headers: { Authorization: `Bearer ${user.token}` } }
            );
            setName("");
            setDescription("");
            onCreated();
            onClose();
        } catch (err) {
            console.error("Failed to create community:", err);
            alert("Failed to create community");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="glass-card w-full max-w-md rounded-2xl p-6 shadow-2xl border border-white/10 animate-scale-up relative overflow-hidden">
                {/* Decorative background gradients */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-secondary/10 blur-3xl rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />

                <h2 className="text-2xl font-black mb-6 text-white relative z-10">Create New Community</h2>

                <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-widest">Community Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-white/5 text-white p-3.5 rounded-xl outline-none focus:ring-2 focus:ring-secondary/50 border border-white/10 transition-all font-medium placeholder:text-white/20 hover:bg-white/10"
                            placeholder="e.g. Neighborhood Watch"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-widest">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full bg-white/5 text-white p-3.5 rounded-xl outline-none focus:ring-2 focus:ring-secondary/50 border border-white/10 transition-all h-28 resize-none font-medium placeholder:text-white/20 hover:bg-white/10"
                            placeholder="What's this community about?"
                        />
                    </div>

                    <div className="flex justify-end gap-3 mt-8">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all font-bold text-sm tracking-wide"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !name.trim()}
                            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-light hover:from-primary-light hover:to-primary text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-95 flex items-center justify-center min-w-[120px]"
                        >
                            {loading ? (
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : "Create"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
