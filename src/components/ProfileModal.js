import { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { API_BASE } from "../api";

export default function ProfileModal({ open, onClose }) {
    const { user, logout } = useAuth(); // ✅ Added logout
    const [editing, setEditing] = useState(false);
    const [fullName, setFullName] = useState(user?.full_name || "");
    const [avatar, setAvatar] = useState(user?.avatar || "");
    const [email, setEmail] = useState(user?.email || "");
    const [about, setAbout] = useState(user?.about || "");
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false); // ✅ Added deleting state
    const [error, setError] = useState("");
    const fileInputRef = useRef(null);

    if (!open) return null;

    const handleAvatarChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        setError("");
        try {
            const formData = new FormData();
            formData.append("file", file);

            const response = await axios.post(
                `${API_BASE}/upload`,
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${user?.token}`,
                        "Content-Type": "multipart/form-data",
                    },
                }
            );

            setAvatar(response.data.url);
        } catch (err) {
            console.error("Avatar upload failed:", err);
            setError("Failed to upload image.");
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setError("");
        try {
            await axios.put(
                `${API_BASE}/users/profile`,
                { full_name: fullName, avatar, email, about },
                { headers: { Authorization: `Bearer ${user?.token}` } }
            );

            // Update local storage
            const updatedUser = { ...user, full_name: fullName, avatar, email, about };
            localStorage.setItem("auth_user", JSON.stringify(updatedUser));

            // Reload to reflect changes
            window.location.reload();
        } catch (err) {
            console.error("Profile update failed:", err);
            setError("Failed to update profile.");
            setSaving(false);
        }
    };

    const handleDeleteAccount = async () => {
        const confirmed = window.confirm(
            "CRITICAL WARNING: This will permanently delete your account, all your messages, chats, and statuses. This action CANNOT be undone. Are you absolutely sure?"
        );
        if (!confirmed) return;

        setDeleting(true);
        setError("");
        try {
            await axios.delete(`${API_BASE}/users/me`, {
                headers: { Authorization: `Bearer ${user?.token}` },
            });
            // Successfully deleted from backend, now clear local state
            logout();
            onClose();
        } catch (err) {
            console.error("Account deletion failed:", err);
            setError("Failed to delete account. Please try again.");
            setDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-primary to-primary-light p-6 text-center relative">
                    {/* Logout Button */}
                    <button
                        onClick={() => {
                            if (window.confirm("Are you sure you want to logout?")) {
                                logout();
                                window.location.href = "/"; // Force refresh and redirect to login
                            }
                        }}
                        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all group"
                        title="Logout from BlueChat"
                    >
                        <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                    </button>
                    {/* Avatar */}
                    <div className="relative inline-block">
                        <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg overflow-hidden bg-white mx-auto">
                            {avatar ? (
                                <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-secondary/20 flex items-center justify-center text-4xl font-bold text-secondary">
                                    {(fullName || user?.phone)?.[0]?.toUpperCase() || "?"}
                                </div>
                            )}
                        </div>
                        {editing && (
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="absolute bottom-0 right-0 w-8 h-8 bg-secondary rounded-full flex items-center justify-center text-white shadow-md hover:bg-secondary-dark transition-colors"
                            >
                                {uploading ? (
                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                ) : (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                )}
                            </button>
                        )}
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="hidden"
                    />

                    {/* Name */}
                    {editing ? (
                        <input
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="mt-3 bg-white/20 text-white text-center text-xl font-semibold rounded-lg px-4 py-2 outline-none placeholder:text-white/50 w-full"
                            placeholder="Your name"
                        />
                    ) : (
                        <h2 className="mt-3 text-xl font-semibold text-white">
                            {fullName || "No name set"}
                        </h2>
                    )}
                    <p className="text-white/70 text-sm mt-1">{user?.phone}</p>
                </div>

                {/* Body */}
                <div className="p-4 space-y-3">
                    {error && (
                        <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Details in display mode */}
                    {!editing && (
                        <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-3 p-3 bg-background-dark/30 rounded-xl">
                                <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                <span className="text-primary">{user?.phone}</span>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-background-dark/30 rounded-xl">
                                <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <span className="text-primary truncate">{email || "No email set"}</span>
                            </div>
                            <div className="p-3 bg-background-dark/30 rounded-xl space-y-1">
                                <div className="flex items-center gap-2 text-secondary font-medium text-xs">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    About
                                </div>
                                <p className="text-primary text-sm leading-relaxed">{about || "Hey there! I am using BlueChat."}</p>
                            </div>
                        </div>
                    )}

                    {/* Inputs in edit mode */}
                    {editing && (
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-primary/60 px-1">Email Address</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-background-dark/30 border border-transparent focus:border-secondary/50 rounded-xl px-4 py-2 text-sm outline-none transition-all text-primary placeholder:text-primary/30"
                                    placeholder="yourname@gmail.com"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-primary/60 px-1">About</label>
                                <textarea
                                    value={about}
                                    onChange={(e) => setAbout(e.target.value)}
                                    rows={3}
                                    className="w-full bg-background-dark/30 border border-transparent focus:border-secondary/50 rounded-xl px-4 py-2 text-sm outline-none transition-all text-primary placeholder:text-primary/30 resize-none"
                                    placeholder="Write something about yourself..."
                                />
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col gap-2 pt-2">
                        <div className="flex gap-2">
                            {editing ? (
                                <>
                                    <button
                                        onClick={() => {
                                            setEditing(false);
                                            setFullName(user?.full_name || "");
                                            setAvatar(user?.avatar || "");
                                            setEmail(user?.email || "");
                                            setAbout(user?.about || "");
                                        }}
                                        className="flex-1 py-2.5 rounded-xl border border-background-dark text-primary hover:bg-background-dark/30 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={saving || uploading}
                                        className="flex-1 py-2.5 rounded-xl bg-primary text-white hover:bg-primary-light transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {saving ? (
                                            <>
                                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                </svg>
                                                Saving...
                                            </>
                                        ) : (
                                            "Save"
                                        )}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={onClose}
                                        className="flex-1 py-2.5 rounded-xl border border-background-dark text-primary hover:bg-background-dark/30 transition-colors"
                                    >
                                        Close
                                    </button>
                                    <button
                                        onClick={() => setEditing(true)}
                                        className="flex-1 py-2.5 rounded-xl bg-secondary text-white hover:bg-secondary-dark transition-colors"
                                    >
                                        Edit Profile
                                    </button>
                                </>
                            )}
                        </div>

                        {/* ✅ Delete Account Button */}
                        {!editing && (
                            <div className="flex flex-col items-center">
                                <button
                                    onClick={handleDeleteAccount}
                                    disabled={deleting}
                                    className="w-full py-2 text-xs font-bold text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all border border-transparent hover:border-red-100 flex items-center justify-center gap-2 mt-2"
                                >
                                    {deleting ? (
                                        <>
                                            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                            Deleting Account...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                            Permanently Delete Account
                                        </>
                                    )}
                                </button>
                                <a
                                    href="/delete-account"
                                    className="text-[10px] text-primary/40 hover:text-primary mt-1 transition-colors"
                                    title="Dedicated link for Google/Apple compliance"
                                >
                                    View dedicated deletion page
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
