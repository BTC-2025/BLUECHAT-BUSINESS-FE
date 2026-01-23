import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { API_BASE } from "../api";
import SearchBar from "./SearchBar.js";
import ChatList from "./ChatList.js";
import { useAuth } from "../context/AuthContext.js";
import { socket } from "../socket";
import GroupCreateModal from "./GroupCreateModal";
import JoinGroupModal from "./JoinGroupModal";
import ProfileModal from "./ProfileModal";
import BlockedList from "./BlockedList"; // ✅ Added
import CallHistory from "./CallHistory"; // ✅ Added
import BusinessRegistrationModal from "./BusinessRegistrationModal"; // ✅ Business
// import MyBusinessDashboard from "./MyBusinessDashboard"; // ✅ Business (Handled by Home.jsx view state)
import NavRail from "./NavRail";
import { requestNotificationPermission, unsubscribeFromNotifications } from "../utils/notificationHelper";

export default function Sidebar({ onOpenChat, activeChatId, onViewStatus, onViewMyBusiness }) {
  const { user } = useAuth();
  const [chats, setChats] = useState([]);
  const [openCreate, setOpenCreate] = useState(false);
  const [openJoin, setOpenJoin] = useState(false);
  const [openProfile, setOpenProfile] = useState(false);
  const [openBusinessReg, setOpenBusinessReg] = useState(false); // ✅ Business
  const [activeTab, setActiveTab] = useState("chats"); // chats, groups, calls, status, settings
  const [notifSettings, setNotifSettings] = useState(() =>
    JSON.parse(localStorage.getItem("notificationSettings") || '{"sound":true,"push":true}')
  );

  const toggleSetting = async (key) => {
    const newVal = !notifSettings[key];
    const newSettings = { ...notifSettings, [key]: newVal };
    setNotifSettings(newSettings);
    localStorage.setItem("notificationSettings", JSON.stringify(newSettings));

    if (key === "push") {
      if (newVal) {
        await requestNotificationPermission(user.token);
      } else {
        await unsubscribeFromNotifications(user.token);
      }
    }
  };

  const load = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/chats`, {
        headers: {
          Authorization: `Bearer ${user?.token}`,
        },
      });
      setChats(data);
    } catch (err) {
      console.error("Failed to fetch chats:", err);
    }
  }, [user?.token]);

  useEffect(() => {
    const fetchChatsOnce = async () => {
      if (!user?.token) return;
      try {
        const { data } = await axios.get(`${API_BASE}/chats`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        setChats((prev) => {
          const prevMap = new Map(prev.map(c => [c.id, c]));
          const merged = data.map(c => {
            const local = prevMap.get(c.id);
            return {
              ...c,
              unread: Math.max(c.unread || 0, local?.unread || 0)
            };
          });

          if (window.__initialChatId) {
            const match = merged.find(c => String(c.id) === String(window.__initialChatId));
            if (match) {
              onOpenChat(match);
              window.__initialChatId = null;
            }
          }
          return merged;
        });
      } catch (err) {
        console.error("Failed to fetch chats:", err);
      }
    };
    fetchChatsOnce();
  }, [user, onOpenChat]);

  const fetchChat = useCallback(async (chatId) => {
    try {
      const { data } = await axios.get(`${API_BASE}/chats/${chatId}`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      setChats((prev) => {
        const exists = prev.some(c => c.id === data.id);
        if (exists) return prev;
        return sortChats([data, ...prev], user?.id);
      });
    } catch (err) {
      console.error("Failed to fetch new chat:", err);
    }
  }, [user?.token, user?.id]);

  useEffect(() => {
    const onNewMessage = (msg) => {
      setChats((prev) => {
        const chatExists = prev.some(c => c.id === msg.chat);

        if (!chatExists) {
          // Discover new chat!
          fetchChat(msg.chat);
          return prev;
        }

        const updated = prev.map((c) => {
          if (c.id === msg.chat) {
            return {
              ...c,
              lastMessage: msg.body || (msg.attachments?.length ? "[attachment]" : ""),
              lastAt: msg.createdAt,
              lastEncryptedBody: msg.encryptedBody || null,
              lastEncryptedKeys: msg.encryptedKeys || [],
              unread: (String(msg.sender) !== String(user?.id) && String(msg.sender?._id) !== String(user?.id) && String(msg.chat) !== String(activeChatId))
                ? (c.unread || 0) + 1
                : c.unread
            };
          }
          return c;
        });
        return sortChats(updated, user?.id);
      });
    };

    socket.on("message:new", onNewMessage);
    return () => socket.off("message:new", onNewMessage);
  }, [user?.id, activeChatId, fetchChat]);

  // ✅ Auto-clear unread for active chat
  useEffect(() => {
    if (activeChatId) {
      setChats((prev) =>
        prev.map((c) => (c.id === activeChatId ? { ...c, unread: 0 } : c))
      );
    }
  }, [activeChatId]);

  useEffect(() => {
    const onUnreadReset = ({ chatId, unreadResetFor }) => {
      if (!user) return;
      if (unreadResetFor !== user.id) return;
      setChats((prev) =>
        prev.map((c) => (c.id === chatId ? { ...c, unread: 0 } : c))
      );
    };

    socket.on("chats:update", onUnreadReset);
    return () => socket.off("chats:update", onUnreadReset);
  }, [user]);

  useEffect(() => {
    const onChatPinned = ({ chatId }) => {
      setChats((prev) => {
        const updated = prev.map((c) =>
          c.id === chatId ? { ...c, isPinned: true } : c
        );
        return sortChats(updated, user?.id);
      });
    };

    const onChatUnpinned = ({ chatId }) => {
      setChats((prev) => {
        const updated = prev.map((c) =>
          c.id === chatId ? { ...c, isPinned: false } : c
        );
        return sortChats(updated, user?.id);
      });
    };

    const handleRefresh = () => load();
    window.addEventListener("chats:refresh", handleRefresh);

    socket.on("chat:pinned", onChatPinned);
    socket.on("chat:unpinned", onChatUnpinned);
    return () => {
      socket.off("chat:pinned", onChatPinned);
      socket.off("chat:unpinned", onChatUnpinned);
      window.removeEventListener("chats:refresh", handleRefresh);
    };
  }, [user?.id, load]);

  const sortChats = (chatList, userId) => {
    return [...chatList].sort((a, b) => {
      // 1. Self-chat always at the absolute top
      if (a.isSelfChat && !b.isSelfChat) return -1;
      if (!a.isSelfChat && b.isSelfChat) return 1;

      // 2. Pinned chats next
      const aIsPinned = a.isPinned || a.pinnedBy?.includes(userId);
      const bIsPinned = b.isPinned || b.pinnedBy?.includes(userId);
      if (aIsPinned && !bIsPinned) return -1;
      if (!aIsPinned && bIsPinned) return 1;

      // 3. Favorites next
      if (a.other?.isFavorite && !b.other?.isFavorite) return -1;
      if (!a.other?.isFavorite && b.other?.isFavorite) return 1;

      // 4. Newest first
      return new Date(b.lastAt) - new Date(a.lastAt);
    });
  };

  const filteredChats = chats.filter(c => {
    if (activeTab === "groups") return c.isGroup && !c.isArchived;
    if (activeTab === "favorites") return !c.isGroup && c.other?.isFavorite && !c.isArchived;
    if (activeTab === "chats") return !c.isGroup && !c.isArchived;
    if (activeTab === "archived") return c.isArchived;
    return true; // fallback for others
  });

  // ✅ Always ensure "Me" (self-chat) is visible at top of "chats" tab if not already there
  let displayChats = filteredChats;
  if (activeTab === "chats") {
    const hasSelf = chats.some(c => c.isSelfChat);
    if (!hasSelf) {
      // Create a synthetic "Me" chat if it doesn't exist yet
      displayChats = [{
        id: "me-shortcut",
        title: "Me",
        isSelfChat: true,
        lastMessage: "Message yourself to save notes/links",
        unread: 0,
        isSynthetic: true
      }, ...filteredChats];
    }
  }

  const renderContent = () => {
    if (activeTab === "settings") {
      return (
        <div className="flex-1 p-6 space-y-6">
          <h2 className="text-2xl font-bold mb-4">Settings</h2>
          <div className="space-y-4">
            <button
              onClick={() => setOpenProfile(true)}
              className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all"
            >
              <span>Account Information</span>
              <svg className="w-5 h-5 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
            </button>

            {/* My Business Button - Removed from here, now in main nav */}

            {/* Business Registration Button - Only show if user doesn't have a business */}
            {!user?.isBusiness && (
              <button
                onClick={() => setOpenBusinessReg(true)}
                className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 hover:from-green-500/20 hover:to-emerald-500/20 rounded-2xl transition-all border border-green-500/20"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-green-500">Register Business Account</div>
                    <div className="text-[10px] opacity-60 uppercase tracking-widest font-black">Start selling with catalog</div>
                  </div>
                </div>
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
              </button>
            )}

            <div className="p-4 bg-white/5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold">Sound Notifications</div>
                  <div className="text-[10px] opacity-40 uppercase tracking-widest font-black">Incoming messages</div>
                </div>
                <button
                  onClick={() => toggleSetting("sound")}
                  className={`w-12 h-6 rounded-full transition-all relative ${notifSettings.sound ? "bg-primary" : "bg-white/10"}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${notifSettings.sound ? "right-1" : "left-1"}`} />
                </button>
              </div>
              <div className="flex items-center justify-between border-t border-white/5 pt-4">
                <div>
                  <div className="font-bold">Push Notifications</div>
                  <div className="text-[10px] opacity-40 uppercase tracking-widest font-black">Browser popups</div>
                </div>
                <button
                  onClick={() => toggleSetting("push")}
                  className={`w-12 h-6 rounded-full transition-all relative ${notifSettings.push ? "bg-primary" : "bg-white/10"}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${notifSettings.push ? "right-1" : "left-1"}`} />
                </button>
              </div>
            </div>

            <div className="p-4 bg-white/5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-emerald-400">Disappearing Messages</div>
                  <div className="text-[10px] opacity-40 uppercase tracking-widest font-black">Personal retention policy</div>
                </div>
                <select
                  value={user?.messageRetentionDays || 0}
                  onChange={async (e) => {
                    const days = parseInt(e.target.value);
                    try {
                      await axios.patch(`${API_BASE}/users/retention`, { days }, {
                        headers: { Authorization: `Bearer ${user.token}` }
                      });
                      // Update local user state if possible, or just refresh
                      window.location.reload(); // Quickest way to sync AuthContext user
                    } catch (err) {
                      alert("Failed to update retention policy");
                    }
                  }}
                  className="bg-[#0f172a] text-xs font-bold py-1 px-2 rounded-lg border border-white/10 outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value={0}>Off</option>
                  <option value={1}>24 Hours</option>
                  <option value={7}>7 Days</option>
                  <option value={30}>30 Days</option>
                </select>
              </div>
            </div>

            {/* 
            <div className="p-4 bg-white/5 rounded-2xl space-y-3">
              <div className="flex justify-between items-center opacity-70">
                <span>Theme</span>
                <span className="text-primary font-bold">Premium Dark</span>
              </div>
              <div className="flex justify-between items-center opacity-70">
                <span>Encrypted Chats</span>
                <span className="text-emerald-400 font-bold">Enabled</span>
              </div>
            </div>
*/}
          </div>
        </div>
      );
    }

    if (activeTab === "calls") {
      return (
        <CallHistory onStartCall={(peerId, type) => {
          // Find the chat for this peer and trigger the call
          const chat = chats.find(c => !c.isGroup && c.other?.id === peerId);
          if (chat) {
            onOpenChat(chat);
            // We might need a way to trigger the call directly from Sidebar
            // For now, opening the chat is a good start as it shows the call buttons
          }
        }} />
      );
    }

    if (activeTab === "blocked") {
      return <BlockedList />;
    }

    // Filter online users (only for 1:1 chats)
    const onlineUsers = chats
      .filter(c => !c.isGroup && c.other?.isOnline && !c.isArchived)
      .map(c => c.other);

    const getTitle = () => {
      if (activeTab === 'groups') return 'Groups';
      if (activeTab === 'favorites') return 'Favorites';
      if (activeTab === 'archived') return 'Archived';
      return 'Chats';
    };

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header Area */}
        <div className="px-5 pt-6 pb-2">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-black">{getTitle()}</h2>
            <div className="flex gap-2">
              {activeTab === 'groups' && (
                <>
                  <button
                    onClick={() => setOpenJoin(true)}
                    className="h-8 px-3 flex items-center justify-center bg-secondary text-primary-dark rounded-lg hover:bg-secondary-dark transition-colors text-xs font-bold"
                    title="Join group with code"
                  >
                    Join
                  </button>
                  <button onClick={() => setOpenCreate(true)} className="w-8 h-8 flex items-center justify-center bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors" title="Create new group">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" /></svg>
                  </button>
                </>
              )}
            </div>
          </div>
          <SearchBar onOpen={async (chat) => { onOpenChat(chat); await load(); }} />
        </div>

        {/* Online Section (Horizontal Scroll) */}
        {activeTab === "chats" && onlineUsers.length > 0 && (
          <div className="px-5 py-2">
            <div className="text-[11px] font-bold text-light tracking-widest uppercase mb-2">Online</div>
            <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar no-scrollbar">
              {onlineUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => onOpenChat(chats.find(c => !c.isGroup && c.other.id === u.id))}
                  className="flex-shrink-0 relative group"
                >
                  <div className="w-12 h-12 rounded-2xl overflow-hidden border border-white/10 group-hover:border-primary/50 transition-all">
                    {u.avatar ? (
                      <img src={u.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-primary/20 text-primary flex items-center justify-center font-bold">
                        {u.full_name?.[0] || '?'}
                      </div>
                    )}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-accent border-[3px] border-[#040712] rounded-full" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* List Container */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pt-2">
          {/* {activeTab === "chats" && (
            <div className="px-3 mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white tracking-tight">
                Sort by <span className="text-pri">Newest</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
              </div>
            </div>
          )} */}
          <ChatList
            items={sortChats(displayChats, user?.id)}
            activeId={activeChatId}
            userId={user?.id}
            onOpen={async (chat) => {
              if (chat.isSynthetic) {
                // "Me" shortcut clicked, open/create real chat
                try {
                  const { data } = await axios.post(`${API_BASE}/chats/open`,
                    { targetPhone: user.phone },
                    { headers: { Authorization: `Bearer ${user.token}` } }
                  );
                  onOpenChat(data);
                  await load(); // Refresh to replace synthetic with real
                } catch (e) { console.error("Self-chat init failed", e); }
                return;
              }
              onOpenChat(chat);
              setChats((prev) => prev.map((c) => (c.id === chat.id ? { ...c, unread: 0 } : c)));
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col-reverse md:flex-row h-full bg-[#040712] overflow-hidden">
      <NavRail
        activeTab={activeTab}
        onTabChange={(id) => {
          if (id === 'status') {
            onViewStatus();
          } else if (id === 'my-business') {
            onViewMyBusiness?.();
          } else {
            setActiveTab(id);
          }
        }}
        onOpenProfile={() => setOpenProfile(true)}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden pb-[64px] md:pb-0">
        {renderContent()}
      </div>

      <ProfileModal open={openProfile} onClose={() => setOpenProfile(false)} />
      <GroupCreateModal open={openCreate} onClose={() => setOpenCreate(false)} onCreated={async () => { setOpenCreate(false); await load(); }} />
      <JoinGroupModal open={openJoin} onClose={() => setOpenJoin(false)} onRefresh={load} />
      <BusinessRegistrationModal
        open={openBusinessReg}
        onClose={() => setOpenBusinessReg(false)}
        onSuccess={async () => { setOpenBusinessReg(false); await load(); }}
      />
    </div>
  );
}
