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
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white w-full max-w-md rounded-xl p-4 sm:p-5 border border-background-dark overflow-hidden flex flex-col shadow-xl animate-scale-up">
                <h2 className="text-lg sm:text-xl font-semibold mb-4 text-primary">Create Community</h2>

                <form onSubmit={handleSubmit} className="flex flex-col">
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-background border border-background-dark px-3 py-2.5 rounded-lg mb-3 outline-none text-sm sm:text-base focus:ring-2 focus:ring-secondary transition-shadow text-primary placeholder:text-primary/50"
                        placeholder="Community name"
                        autoFocus
                    />

                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full bg-background border border-background-dark px-3 py-2.5 rounded-lg mb-3 outline-none text-sm sm:text-base focus:ring-2 focus:ring-secondary transition-shadow text-primary placeholder:text-primary/50 resize-vm h-24"
                        placeholder="Community description"
                    />

                    <div className="flex justify-end gap-2 sm:gap-3 mt-2">
                        <button
                            type="button"
                            className="px-3 sm:px-4 py-2 bg-background-dark rounded-lg hover:bg-background text-primary text-sm font-medium transition-colors"
                            onClick={onClose}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="px-3 sm:px-4 py-2 bg-primary rounded-lg hover:bg-primary-light disabled:opacity-50 text-sm font-medium transition-colors text-white flex items-center gap-2"
                            disabled={loading || !name.trim()}
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>Creating...</span>
                                </>
                            ) : (
                                "Create Community"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
