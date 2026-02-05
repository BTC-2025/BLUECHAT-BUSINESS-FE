import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { API_BASE } from "../api";
import { useAuth } from "../context/AuthContext";

export default function CommunityManageModal({ open, onClose, communityId }) {
    const { user } = useAuth();
    const [community, setCommunity] = useState(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("members"); // members, groups

    // Member inputs
    const [newMemberPhone, setNewMemberPhone] = useState("");

    // Group inputs
    const [groupIdToAdd, setGroupIdToAdd] = useState("");
    const [newGroupTitle, setNewGroupTitle] = useState("");
    const [newGroupDesc, setNewGroupDesc] = useState("");
    const [myGroups, setMyGroups] = useState([]); // ✅ List of available groups



    const fetchMyGroups = useCallback(async () => {
        try {
            const { data } = await axios.get(`${API_BASE}/communities/my-groups`, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setMyGroups(data);
        } catch (err) {
            console.error("Failed to fetch my groups:", err);
        }
    }, [user.token]);

    const fetchCommunity = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get(`${API_BASE}/communities/${communityId}`, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setCommunity(data);
        } catch (err) {
            console.error("Failed to fetch community:", err);
        } finally {
            setLoading(false);
        }
    }, [communityId, user.token]);

    useEffect(() => {
        if (open && communityId) {
            fetchCommunity();
            fetchMyGroups();
        }
    }, [open, communityId, fetchCommunity, fetchMyGroups]);

    const handleAddMember = async (e) => {
        e.preventDefault();
        try {
            await axios.post(
                `${API_BASE}/communities/${communityId}/members`,
                { phone: newMemberPhone },
                { headers: { Authorization: `Bearer ${user.token}` } }
            );
            setNewMemberPhone("");
            fetchCommunity();
            alert("Member added successfully");
        } catch (err) {
            alert(err.response?.data?.message || "Failed to add member");
        }
    };

    const handleRemoveMember = async (phone) => {
        if (!window.confirm("Are you sure? This will remove them from all community groups.")) return;
        try {
            await axios.delete(`${API_BASE}/communities/${communityId}/members`, {
                headers: { Authorization: `Bearer ${user.token}` },
                data: { phone }
            });
            fetchCommunity();
        } catch (err) {
            alert("Failed to remove member");
        }
    };

    const handleAddGroup = async (e) => {
        e.preventDefault();
        if (!groupIdToAdd) return;
        try {
            await axios.post(
                `${API_BASE}/communities/${communityId}/groups`,
                { groupId: groupIdToAdd },
                { headers: { Authorization: `Bearer ${user.token}` } }
            );
            setGroupIdToAdd("");
            fetchCommunity();
            fetchMyGroups(); // Refresh list
            alert("Group added successfully");
        } catch (err) {
            alert(err.response?.data?.message || "Failed to add group");
        }
    };

    const handleCreateGroup = async (e) => {
        e.preventDefault();
        try {
            await axios.post(
                `${API_BASE}/communities/${communityId}/groups/create`,
                { title: newGroupTitle, description: newGroupDesc },
                { headers: { Authorization: `Bearer ${user.token}` } }
            );
            setNewGroupTitle("");
            setNewGroupDesc("");
            fetchCommunity();
            alert("Group created within community");
        } catch (err) {
            alert(err.response?.data?.message || "Failed to create group");
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full max-w-2xl h-[85vh] rounded-xl flex flex-col shadow-2xl border border-background-dark animate-scale-up relative overflow-hidden">

                {/* Header */}
                <div className="p-5 border-b border-background-dark flex justify-between items-center bg-white z-10 shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-primary leading-tight">
                            Manage {community?.name || "Community"}
                        </h2>
                        <p className="text-xs text-primary/60 font-semibold uppercase tracking-wider mt-1">Admin Dashboard</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-background-dark hover:bg-background text-primary rounded-lg transition-all">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-background-dark shrink-0 z-10 bg-background">
                    <button
                        onClick={() => setActiveTab("members")}
                        className={`flex-1 p-3 font-semibold text-sm transition-all border-b-2 ${activeTab === "members" ? "border-secondary text-secondary bg-white" : "border-transparent text-primary/60 hover:text-primary hover:bg-white"}`}
                    >
                        Members ({community?.membersCount || 0})
                    </button>
                    <button
                        onClick={() => setActiveTab("groups")}
                        className={`flex-1 p-3 font-semibold text-sm transition-all border-b-2 ${activeTab === "groups" ? "border-secondary text-secondary bg-white" : "border-transparent text-primary/60 hover:text-primary hover:bg-white"}`}
                    >
                        Groups ({community?.groups?.length || 0})
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 bg-background custom-scrollbar z-10">
                    {loading ? (
                        <div className="flex justify-center py-20">
                            <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        </div>
                    ) : (
                        <div className="space-y-6 pb-6">
                            {activeTab === "members" && (
                                <>
                                    {/* Add Member Card */}
                                    <div className="bg-white rounded-xl p-5 border border-background-dark shadow-sm">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
                                            </div>
                                            <h3 className="text-sm font-bold text-primary uppercase tracking-wider">Add Member</h3>
                                        </div>
                                        <form onSubmit={handleAddMember} className="flex gap-3">
                                            <input
                                                type="tel"
                                                value={newMemberPhone}
                                                onChange={(e) => setNewMemberPhone(e.target.value)}
                                                placeholder="Enter phone number"
                                                className="flex-1 bg-background border border-background-dark text-primary p-3 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all placeholder:text-primary/40 text-sm"
                                            />
                                            <button type="submit" className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold transition-all shadow-md shadow-emerald-500/10 text-sm">Add</button>
                                        </form>
                                    </div>

                                    {/* Remove Member Card */}
                                    <div className="bg-white rounded-xl p-5 border border-background-dark shadow-sm">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
                                            </div>
                                            <h3 className="text-sm font-bold text-primary uppercase tracking-wider">Remove Member</h3>
                                        </div>
                                        <p className="text-xs text-primary/60 mb-4 font-medium">This will remove the user from the community and all linked groups.</p>
                                        <div className="flex gap-3">
                                            <input
                                                type="tel"
                                                placeholder="Phone number to remove"
                                                className="flex-1 bg-background border border-background-dark text-primary p-3 rounded-lg outline-none focus:ring-2 focus:ring-red-500/30 transition-all placeholder:text-primary/40 text-sm"
                                                id="remove-phone"
                                            />
                                            <button
                                                onClick={() => {
                                                    const phone = document.getElementById('remove-phone').value;
                                                    if (phone) handleRemoveMember(phone);
                                                }}
                                                className="px-5 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg font-bold hover:bg-red-100 transition-all text-sm"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}

                            {activeTab === "groups" && (
                                <>
                                    {/* Create Group Card */}
                                    <div className="bg-white rounded-xl p-5 border border-background-dark shadow-sm">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
                                            </div>
                                            <h3 className="text-sm font-bold text-primary uppercase tracking-wider">Create New Group</h3>
                                        </div>
                                        <form onSubmit={handleCreateGroup} className="space-y-3">
                                            <input
                                                type="text"
                                                value={newGroupTitle}
                                                onChange={(e) => setNewGroupTitle(e.target.value)}
                                                placeholder="Group Title"
                                                className="w-full bg-background border border-background-dark text-primary p-3 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-primary/40 text-sm"
                                            />
                                            <input
                                                type="text"
                                                value={newGroupDesc}
                                                onChange={(e) => setNewGroupDesc(e.target.value)}
                                                placeholder="Description (optional)"
                                                className="w-full bg-background border border-background-dark text-primary p-3 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-primary/40 text-sm"
                                            />
                                            <button type="submit" className="w-full py-2.5 bg-primary hover:bg-primary-light text-white rounded-lg font-bold transition-all shadow-md shadow-primary/10 text-sm">Create & Link Group</button>
                                        </form>
                                    </div>

                                    {/* Link Group Card */}
                                    <div className="bg-white rounded-xl p-5 border border-background-dark shadow-sm">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
                                            </div>
                                            <h3 className="text-sm font-bold text-primary uppercase tracking-wider">Link Existing Group</h3>
                                        </div>
                                        <form onSubmit={handleAddGroup} className="flex gap-3">
                                            <div className="relative flex-1">
                                                <select
                                                    value={groupIdToAdd}
                                                    onChange={(e) => setGroupIdToAdd(e.target.value)}
                                                    className="w-full appearance-none bg-background border border-background-dark text-primary p-3 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer text-sm"
                                                >
                                                    <option value="" className="text-gray-500">Select a group to add...</option>
                                                    {myGroups.map(g => (
                                                        <option key={g.id} value={g.id} className="text-primary">
                                                            {g.title} ({g.participantsCount} members)
                                                        </option>
                                                    ))}
                                                </select>
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-primary/40">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
                                                </div>
                                            </div>
                                            <button type="submit" disabled={!groupIdToAdd} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-500/10 text-sm">Link</button>
                                        </form>
                                        {myGroups.length === 0 && (
                                            <p className="text-xs text-primary/40 mt-3 font-medium flex items-center gap-2">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
                                                No eligible groups found.
                                            </p>
                                        )}
                                    </div>

                                    {/* Linked Groups List */}
                                    <div className="pt-2">
                                        <h3 className="text-xs font-bold text-primary/50 uppercase tracking-widest mb-4 pl-1">Linked Groups</h3>
                                        <div className="space-y-2">
                                            {community?.groups?.map(g => (
                                                <div key={g.id} className="flex items-center gap-4 p-3 bg-white rounded-xl border border-background-dark hover:border-secondary/30 transition-all group shadow-sm">
                                                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-bold group-hover:bg-primary group-hover:text-white transition-colors">
                                                        {g.title[0]}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="font-bold text-primary transition-colors">{g.title}</div>
                                                        <div className="text-xs text-primary/50 font-medium">{g.participantsCount} participants</div>
                                                    </div>
                                                </div>
                                            ))}
                                            {(!community?.groups || community.groups.length === 0) && (
                                                <div className="text-center py-8 text-primary/30 text-sm font-medium italic">No groups linked yet.</div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
