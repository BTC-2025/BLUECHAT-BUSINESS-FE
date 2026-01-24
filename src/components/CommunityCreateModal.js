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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-[#1e293b] w-full max-w-md rounded-2xl p-6 shadow-2xl border border-white/10 animate-scale-up">
                <h2 className="text-xl font-bold mb-4 text-white">Create New Community</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wide">Community Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-[#0f172a] text-white p-3 rounded-xl outline-none focus:ring-2 focus:ring-primary border border-white/5 transition-all"
                            placeholder="e.g. Neighborhood Watch"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wide">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full bg-[#0f172a] text-white p-3 rounded-xl outline-none focus:ring-2 focus:ring-primary border border-white/5 transition-all h-24 resize-none"
                            placeholder="What's this community about?"
                        />
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors font-bold"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !name.trim()}
                            className="px-6 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
                        >
                            {loading ? "Creating..." : "Create Community"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
