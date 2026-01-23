// client/src/components/GroupManageModal.js
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { API_BASE } from "../api";
import { useAuth } from "../context/AuthContext";

export default function GroupManageModal({ chat, open, onClose }) {
  const { user } = useAuth();
  const chatId = chat?.id; // ✅ Derived from chat prop
  const [group, setGroup] = useState(null);
  const [phone, setPhone] = useState("");
  const [meta, setMeta] = useState({ title: "", description: "" });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get(
        `${API_BASE}/groups/${chatId}`,
        { headers: { Authorization: `Bearer ${user?.token}` } }
      );

      setGroup(data);
      setMeta({ title: data.title, description: data.description });
    } catch (e) {
      console.error("Group info error:", e);
      setError(e.response?.data?.message || "Failed to load group info");
    } finally {
      setLoading(false);
    }
  }, [chatId, user?.token]);

  useEffect(() => {
    if (open && chatId) {
      setGroup(null); // Reset on open
      load();
    }
  }, [open, chatId, load]);

  if (!open) return null;

  // Show loading state
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 grid place-items-center z-50 p-4">
        <div className="bg-white border border-background-dark rounded-xl p-6 w-full max-w-md text-center shadow-xl">
          <div className="text-primary">Loading group info...</div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="fixed inset-0 bg-black/60 grid place-items-center z-50 p-4">
        <div className="bg-white border border-background-dark rounded-xl p-6 w-full max-w-md shadow-xl">
          <div className="text-red-500 mb-4">{error}</div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary rounded-lg hover:bg-primary-light text-white"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (!group) return null;

  const addMember = async () => {
    try {
      await axios.post(
        `${API_BASE}/groups/${chatId}/members`,
        { phone },
        { headers: { Authorization: `Bearer ${user?.token}` } }
      );
      load();
      setPhone("");
    } catch (e) {
      alert(e.response?.data?.message);
    }
  };

  const removeMember = async (phone) => {
    try {
      await axios.delete(
        `${API_BASE}/groups/${chatId}/members`,
        {
          data: { phone },
          headers: { Authorization: `Bearer ${user?.token}` },
        }
      );
      load();
    } catch (e) {
      alert(e.response?.data?.message);
    }
  };

  const toggleAdmin = async (phone, promote) => {
    try {
      await axios.post(
        `${API_BASE}/groups/${chatId}/admins`,
        { phone, promote },
        { headers: { Authorization: `Bearer ${user?.token}` } }
      );
      load();
    } catch (e) {
      alert(e.response?.data?.message);
    }
  };

  const saveMeta = async () => {
    try {
      let avatarUrl = group.avatar;

      if (avatarFile) {
        const formData = new FormData();
        formData.append("file", avatarFile);
        const { data: uploadRes } = await axios.post(`${API_BASE}/upload`, formData, {
          headers: {
            Authorization: `Bearer ${user?.token}`,
            "Content-Type": "multipart/form-data",
          },
        });
        avatarUrl = uploadRes.url;
      }

      await axios.patch(
        `${API_BASE}/groups/${chatId}`,
        { ...meta, avatar: avatarUrl },
        {
          headers: { Authorization: `Bearer ${user?.token}` },
        }
      );
      setAvatarFile(null);
      setAvatarPreview(null);
      load();
      // Ensure sidebar and chat window see the update
      window.dispatchEvent(new CustomEvent("chats:refresh"));
    } catch (e) {
      alert(e.response?.data?.message || "Failed to save group info");
    }
  };

  const handleLeave = async () => {
    if (!window.confirm("Are you sure you want to leave this group?")) return;
    try {
      await axios.post(`${API_BASE}/groups/${chatId}/leave`, {}, {
        headers: { Authorization: `Bearer ${user?.token}` }
      });
      onClose();
      // Force reload chats
      window.dispatchEvent(new CustomEvent("chats:refresh"));
    } catch (e) {
      alert(e.response?.data?.message || "Failed to leave group");
    }
  };

  const generateInvite = async () => {
    try {
      const { data } = await axios.post(`${API_BASE}/groups/${chatId}/invite`, {}, {
        headers: { Authorization: `Bearer ${user?.token}` }
      });
      if (data.success) {
        setGroup(prev => ({ ...prev, inviteCode: data.inviteCode }));
      }
    } catch (e) {
      alert(e.response?.data?.message || "Failed to generate invite");
    }
  };

  const approveRequest = async (targetUserId, approve) => {
    try {
      await axios.post(`${API_BASE}/groups/${chatId}/approve`, {
        targetUserId,
        approve
      }, {
        headers: { Authorization: `Bearer ${user?.token}` }
      });
      load();
    } catch (e) {
      alert(e.response?.data?.message || "Failed to process request");
    }
  };

  const isAdmin = group.admins.includes(user.id);

  return (
    <div className="fixed inset-0 bg-black/60 grid place-items-center z-50 p-4">
      <div className="bg-white border border-background-dark rounded-xl p-4 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex justify-between items-center mb-3">
          <div className="text-lg font-semibold text-primary">Group Info</div>
          <button onClick={onClose} className="text-primary/40 hover:text-primary transition-colors">✕</button>
        </div>

        {/* AVATAR */}
        <div className="flex flex-col items-center mb-6 gap-3">
          <label className={`relative ${isAdmin ? 'cursor-pointer' : ''} group`}>
            <div className="w-24 h-24 rounded-3xl bg-background-dark border border-background-dark flex items-center justify-center overflow-hidden transition-all group-hover:ring-2 group-hover:ring-secondary/50 shadow-lg">
              {avatarPreview || group.avatar ? (
                <img src={avatarPreview || group.avatar} alt="Group" className="w-full h-full object-cover" />
              ) : (
                <div className="text-3xl font-black text-primary/20 uppercase">{group.title?.[0] || "?"}</div>
              )}
              {isAdmin && (
                <div className="absolute inset-0 bg-primary/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-3xl">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              )}
            </div>
            {isAdmin && <input type="file" className="hidden" accept="image/*" onChange={(e) => {
              const file = e.target.files[0];
              if (file) {
                setAvatarFile(file);
                setAvatarPreview(URL.createObjectURL(file));
              }
            }} />}
          </label>
        </div>

        {/* META */}
        <div className="space-y-2 mb-4">
          <input
            disabled={!isAdmin}
            className="w-full bg-background border border-background-dark px-3 py-2.5 rounded-lg text-sm sm:text-base outline-none focus:ring-2 focus:ring-secondary disabled:opacity-50 text-primary"
            value={meta.title}
            onChange={(e) => setMeta({ ...meta, title: e.target.value })}
            placeholder="Group Title"
          />
          <input
            disabled={!isAdmin}
            className="w-full bg-background border border-background-dark px-3 py-2.5 rounded-lg text-sm sm:text-base outline-none focus:ring-2 focus:ring-secondary disabled:opacity-50 text-primary"
            value={meta.description}
            onChange={(e) =>
              setMeta({ ...meta, description: e.target.value })
            }
            placeholder="Group Description"
          />
          {isAdmin && (
            <button
              onClick={saveMeta}
              className="px-4 py-2 bg-primary rounded-lg hover:bg-primary-light text-sm font-medium transition-colors text-white"
            >
              Save Changes
            </button>
          )}
        </div>

        {/* PENDING REQUESTS (Admin Only) */}
        {isAdmin && group.pendingParticipants?.length > 0 && (
          <div className="mb-6 animate-in slide-in-from-top duration-300">
            <div className="text-xs font-bold text-secondary mb-2 tracking-widest uppercase">Pending Join Requests ({group.pendingParticipants.length})</div>
            <div className="space-y-2">
              {group.pendingParticipants.map((p) => (
                <div key={p.id} className="flex items-center justify-between bg-secondary/5 border border-secondary/20 p-3 rounded-xl">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-primary truncate">{p.name || p.phone}</div>
                    <div className="text-[10px] text-primary/40">{p.phone}</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => approveRequest(p.id, true)}
                      className="px-3 py-1.5 bg-secondary text-primary-dark rounded-lg text-xs font-black hover:bg-secondary-dark transition-all"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => approveRequest(p.id, false)}
                      className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-bold hover:bg-primary/20 transition-all"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* INVITE LINK (Admin Only) */}
        {isAdmin && (
          <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-xl">
            <div className="text-sm font-bold text-primary mb-2 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
              Invite Link
            </div>
            {group.inviteCode ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-white border border-background-dark px-3 py-2 rounded-lg text-sm font-mono text-primary truncate">
                  {group.inviteCode}
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(group.inviteCode);
                    alert("Invite code copied!");
                  }}
                  className="px-3 py-2 bg-secondary text-primary-dark rounded-lg text-xs font-bold hover:bg-secondary-dark transition-colors"
                >
                  Copy
                </button>
              </div>
            ) : (
              <button
                onClick={generateInvite}
                className="w-full py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary-light transition-colors"
              >
                Generate Invite Link
              </button>
            )}
          </div>
        )}

        {/* MEMBERS */}
        <div className="text-sm text-primary/60 mb-2 font-bold tracking-tight uppercase">Members ({group.members.length})</div>
        <div className="max-h-60 overflow-y-auto space-y-2 mb-4 custom-scrollbar">
          {group.members.map((m) => {
            const isMAdmin = group.admins.includes(m.id);

            return (
              <div
                key={m.id}
                className="flex items-center justify-between bg-background border border-background-dark px-3 py-2 rounded-lg"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-background-dark overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {m.avatar ? (
                      <img src={m.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-primary/40 uppercase">{m.name?.[0] || m.phone?.[0]}</span>
                    )}
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="text-sm font-semibold truncate text-primary flex items-center gap-2">
                      {m.name || m.phone}
                      {isMAdmin && <span className="text-[10px] bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded border border-emerald-500/20">Admin</span>}
                    </div>
                    <div className="text-xs text-primary/60">{m.phone}</div>
                  </div>
                </div>

                {isAdmin && m.id !== user.id && (
                  <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                    <button
                      onClick={() => removeMember(m.phone)}
                      className="px-2 py-1 bg-red-400/10 text-red-500 rounded text-xs hover:bg-red-500 hover:text-white transition-all font-bold"
                    >
                      Remove
                    </button>

                    {!isMAdmin && (
                      <button
                        onClick={() => toggleAdmin(m.phone, true)}
                        className="px-2 py-1 bg-secondary text-primary-dark rounded text-xs hover:bg-secondary-dark transition-colors font-bold"
                      >
                        Make Admin
                      </button>
                    )}

                    {isMAdmin && (
                      <button
                        onClick={() => toggleAdmin(m.phone, false)}
                        className="px-2 py-1 bg-primary/10 text-primary rounded text-xs hover:bg-primary/20 transition-colors font-bold"
                      >
                        Dismiss Admin
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ADD MEMBER */}
        {isAdmin && (
          <div className="mt-4 flex gap-2 mb-6">
            <input
              className="flex-1 bg-background border border-background-dark px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-secondary text-primary placeholder:text-primary/50"
              placeholder="Add member by phone..."
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <button
              onClick={addMember}
              className="px-4 py-2 bg-primary rounded-lg text-sm font-bold hover:bg-primary-light transition-colors text-white"
            >
              Add
            </button>
          </div>
        )}

        {/* LEAVE GROUP */}
        <div className="border-t border-background-dark pt-4">
          <button
            onClick={handleLeave}
            className="w-full py-3 bg-red-500/10 text-red-600 rounded-xl text-sm font-bold hover:bg-red-500 hover:text-white transition-all duration-200 flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
            Leave Group
          </button>
        </div>
      </div>
    </div>
  );
}
