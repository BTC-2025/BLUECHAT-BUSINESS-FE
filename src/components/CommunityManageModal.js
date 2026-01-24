import { useState, useEffect } from "react";
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

    useEffect(() => {
        if (open && communityId) {
            fetchCommunity();
            fetchMyGroups();
        }
    }, [open, communityId]);

    const fetchMyGroups = async () => {
        try {
            const { data } = await axios.get(`${API_BASE}/communities/my-groups`, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setMyGroups(data);
        } catch (err) {
            console.error("Failed to fetch my groups:", err);
        }
    };

    const fetchCommunity = async () => {
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
    };

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
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-[#1e293b] w-full max-w-2xl h-[80vh] rounded-2xl flex flex-col shadow-2xl border border-white/10 animate-scale-up">

                {/* Header */}
                <div className="p-6 border-b border-white/5 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">
                        Manage {community?.name || "Community"}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/5">
                    <button
                        onClick={() => setActiveTab("members")}
                        className={`flex-1 p-4 font-bold text-sm transition-colors ${activeTab === "members" ? "text-primary border-b-2 border-primary bg-white/5" : "text-gray-400 hover:text-white"}`}
                    >
                        Members ({community?.membersCount || 0})
                    </button>
                    <button
                        onClick={() => setActiveTab("groups")}
                        className={`flex-1 p-4 font-bold text-sm transition-colors ${activeTab === "groups" ? "text-primary border-b-2 border-primary bg-white/5" : "text-gray-400 hover:text-white"}`}
                    >
                        Groups ({community?.groups?.length || 0})
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {loading ? (
                        <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
                    ) : (
                        <>
                            {activeTab === "members" && (
                                <div className="space-y-6">
                                    {/* Add Member */}
                                    <div className="bg-[#0f172a] p-4 rounded-xl border border-white/5">
                                        <h3 className="text-sm font-bold text-gray-400 uppercase mb-3">Add Member</h3>
                                        <form onSubmit={handleAddMember} className="flex gap-2">
                                            <input
                                                type="tel"
                                                value={newMemberPhone}
                                                onChange={(e) => setNewMemberPhone(e.target.value)}
                                                placeholder="Enter phone number"
                                                className="flex-1 bg-white/5 text-white p-2 rounded-lg outline-none focus:ring-1 focus:ring-primary border border-white/5"
                                            />
                                            <button type="submit" className="px-4 py-2 bg-primary rounded-lg font-bold text-sm hover:bg-primary-dark">Add</button>
                                        </form>
                                    </div>

                                    {/* Member List */}
                                    <div className="text-center text-gray-500 py-4 text-sm">
                                        Member list management by phone is available above. <br />
                                        (Full member listing requires API update)
                                    </div>

                                    {/* Remove Member Helper */}
                                    <div className="bg-[#0f172a] p-4 rounded-xl border border-red-500/10">
                                        <h3 className="text-sm font-bold text-red-400 uppercase mb-3">Remove Member</h3>
                                        <p className="text-xs text-gray-500 mb-2">Removes user from community and all its groups.</p>
                                        <div className="flex gap-2">
                                            <input
                                                type="tel"
                                                placeholder="Phone number to remove"
                                                className="flex-1 bg-white/5 text-white p-2 rounded-lg outline-none focus:ring-1 focus:ring-red-500 border border-white/5"
                                                id="remove-phone-biz"
                                            />
                                            <button
                                                onClick={() => {
                                                    const phone = document.getElementById('remove-phone-biz').value;
                                                    if (phone) handleRemoveMember(phone);
                                                }}
                                                className="px-4 py-2 bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg font-bold text-sm hover:bg-red-500/30"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === "groups" && (
                                <div className="space-y-6">
                                    {/* Create New Group */}
                                    <div className="bg-[#0f172a] p-4 rounded-xl border border-white/5">
                                        <h3 className="text-sm font-bold text-gray-400 uppercase mb-3">Create New Group</h3>
                                        <form onSubmit={handleCreateGroup} className="space-y-3">
                                            <input
                                                type="text"
                                                value={newGroupTitle}
                                                onChange={(e) => setNewGroupTitle(e.target.value)}
                                                placeholder="Group Title"
                                                className="w-full bg-white/5 text-white p-2 rounded-lg outline-none focus:ring-1 focus:ring-primary border border-white/5"
                                            />
                                            <input
                                                type="text"
                                                value={newGroupDesc}
                                                onChange={(e) => setNewGroupDesc(e.target.value)}
                                                placeholder="Description (optional)"
                                                className="w-full bg-white/5 text-white p-2 rounded-lg outline-none focus:ring-1 focus:ring-primary border border-white/5"
                                            />
                                            <button type="submit" className="w-full py-2 bg-primary rounded-lg font-bold text-sm hover:bg-primary-dark">Create & Link</button>
                                        </form>
                                    </div>

                                    {/* Add Existing Group */}
                                    <div className="bg-[#0f172a] p-4 rounded-xl border border-white/5">
                                        <h3 className="text-sm font-bold text-gray-400 uppercase mb-3">Add Existing Group</h3>
                                        <form onSubmit={handleAddGroup} className="flex gap-2">
                                            <select
                                                value={groupIdToAdd}
                                                onChange={(e) => setGroupIdToAdd(e.target.value)}
                                                className="flex-1 bg-white/5 text-white p-2 rounded-lg outline-none focus:ring-1 focus:ring-primary border border-white/5 appearance-none cursor-pointer"
                                            >
                                                <option value="" className="bg-[#1e293b]">Select a group to add...</option>
                                                {myGroups.map(g => (
                                                    <option key={g.id} value={g.id} className="bg-[#1e293b]">
                                                        {g.title} ({g.participantsCount} members)
                                                    </option>
                                                ))}
                                            </select>
                                            <button type="submit" disabled={!groupIdToAdd} className="px-4 py-2 bg-green-600 rounded-lg font-bold text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed">Link</button>
                                        </form>
                                        {myGroups.length === 0 && (
                                            <p className="text-xs text-gray-500 mt-2">No eligible groups found (you must be an admin and specific group not already in a community).</p>
                                        )}
                                    </div>
                                    {/* List Linked Groups */}
                                    <div className="space-y-2">
                                        <h3 className="text-sm font-bold text-gray-400 uppercase">Linked Groups</h3>
                                        {community?.groups?.map(g => (
                                            <div key={g.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                                                <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold">
                                                    {g.title[0]}
                                                </div>
                                                <div>
                                                    <div className="font-bold">{g.title}</div>
                                                    <div className="text-xs text-gray-500">{g.participantsCount} participants</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
