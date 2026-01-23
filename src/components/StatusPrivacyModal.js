import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { API_BASE } from "../api";
import { useAuth } from "../context/AuthContext";

export default function StatusPrivacyModal({ isOpen, onClose, onConfirm }) {
    const { user } = useAuth();
    const [contacts, setContacts] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [privacyMode, setPrivacyMode] = useState("all"); // "all" or "selected"
    const [loading, setLoading] = useState(false);

    const fetchContacts = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get(`${API_BASE}/users/contacts`, {
                headers: { Authorization: `Bearer ${user?.token}` }
            });
            setContacts(data);
        } catch (err) {
            console.error("Failed to fetch contacts", err);
        } finally {
            setLoading(false);
        }
    }, [user?.token]);

    useEffect(() => {
        if (isOpen && privacyMode === "selected") {
            fetchContacts();
        }
    }, [isOpen, privacyMode, fetchContacts]);

    const toggleUser = (userId) => {
        if (selectedUsers.includes(userId)) {
            setSelectedUsers(prev => prev.filter(id => id !== userId));
        } else {
            setSelectedUsers(prev => [...prev, userId]);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-md bg-[#0f172a] border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-white">Status Privacy</h2>
                        <p className="text-white/40 text-[10px] uppercase tracking-widest font-black mt-1">Who can see your update?</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-white/40 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {/* Mode Selection */}
                    <div className="flex gap-3">
                        <button
                            onClick={() => setPrivacyMode("all")}
                            className={`flex-1 p-4 rounded-2xl border transition-all text-left ${privacyMode === "all" ? "bg-primary/20 border-primary ring-1 ring-primary" : "bg-white/5 border-white/5 hover:bg-white/10"}`}
                        >
                            <div className={`font-bold text-sm ${privacyMode === "all" ? "text-primary" : "text-white"}`}>All Contacts</div>
                            <div className="text-[10px] text-white/40 mt-1">Visible to everyone you've messaged</div>
                        </button>
                        <button
                            onClick={() => setPrivacyMode("selected")}
                            className={`flex-1 p-4 rounded-2xl border transition-all text-left ${privacyMode === "selected" ? "bg-emerald-500/20 border-emerald-500 ring-1 ring-emerald-500" : "bg-white/5 border-white/5 hover:bg-white/10"}`}
                        >
                            <div className={`font-bold text-sm ${privacyMode === "selected" ? "text-emerald-400" : "text-white"}`}>Only Share With...</div>
                            <div className="text-[10px] text-white/40 mt-1">Select specific people to view this</div>
                        </button>
                    </div>

                    {/* Contact List (if selected mode) */}
                    {privacyMode === "selected" && (
                        <div className="space-y-2 mt-4">
                            <div className="text-white/40 text-[10px] uppercase font-bold tracking-widest px-2">Select Contacts ({selectedUsers.length})</div>
                            <div className="max-h-60 overflow-y-auto pr-2 space-y-1 scrollbar-hide">
                                {loading ? (
                                    <div className="flex justify-center py-8">
                                        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent animate-spin rounded-full" />
                                    </div>
                                ) : contacts.length > 0 ? (
                                    contacts.map(c => (
                                        <div
                                            key={c._id}
                                            onClick={() => toggleUser(c._id)}
                                            className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-colors group"
                                        >
                                            <div className="w-10 h-10 rounded-full overflow-hidden bg-white/10">
                                                {c.avatar ? <img src={c.avatar} alt={c.full_name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-white font-bold">{c.full_name?.[0]}</div>}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-white text-sm font-bold truncate">{c.full_name}</div>
                                                <div className="text-white/40 text-[10px] truncate">{c.phone}</div>
                                            </div>
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${selectedUsers.includes(c._id) ? "bg-emerald-500 border-emerald-500" : "border-white/20 group-hover:border-white/40"}`}>
                                                {selectedUsers.includes(c._id) && (
                                                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-white/40 text-xs italic">No contacts found to share with.</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-white/5 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 px-4 rounded-xl text-white/60 font-bold text-sm hover:bg-white/5 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        disabled={privacyMode === "selected" && selectedUsers.length === 0}
                        onClick={() => onConfirm(privacyMode === "all" ? [] : selectedUsers)}
                        className="flex-1 py-3 px-4 rounded-xl bg-primary text-white font-bold text-sm hover:primary-light transition-all disabled:opacity-50 disabled:grayscale"
                    >
                        Confirm Privacy
                    </button>
                </div>
            </div>
        </div>
    );
}
