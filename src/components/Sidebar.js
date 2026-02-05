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
import CommunityCreateModal from "./CommunityCreateModal"; // ✅ Community
import CommunityManageModal from "./CommunityManageModal"; // ✅ Community
import NavRail from "./NavRail";
import { requestNotificationPermission, unsubscribeFromNotifications } from "../utils/notificationHelper";

export default function Sidebar({ onOpenChat, activeChatId, onViewStatus, onViewMyBusiness }) {
  const { user } = useAuth();
  const [chats, setChats] = useState([]);
  const [openCreate, setOpenCreate] = useState(false);
  const [openJoin, setOpenJoin] = useState(false);
  const [openProfile, setOpenProfile] = useState(false);
  const [openBusinessReg, setOpenBusinessReg] = useState(false); // ✅ Business
  const [openCommunityCreate, setOpenCommunityCreate] = useState(false); // ✅ Community
  const [openCommunityManage, setOpenCommunityManage] = useState(false); // ✅ Community
  const [viewingCommunity, setViewingCommunity] = useState(null); // ✅ Community ID when drilling down
  const [communityDetails, setCommunityDetails] = useState(null); // ✅ Community Data
  const [activeTab, setActiveTab] = useState("chats"); // chats, groups, calls, status, settings
  const [notifSettings, setNotifSettings] = useState(() =>
    JSON.parse(localStorage.getItem("notificationSettings") || '{"sound":true,"push":true}')
  );

  // ✅ Social Tab State
  const [socialView, setSocialView] = useState('apps'); // 'apps' | 'contacts'
  const [selectedApp, setSelectedApp] = useState(null); // { id: 'ecommerce', name: '...' }
  const [connectedApps, setConnectedApps] = useState([]);

  // ✅ Fetch Connected Apps
  useEffect(() => {
    const fetchApps = async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/integration/apps`, {
          headers: { Authorization: `Bearer ${user.token}` }
        });
        if (data.success) {
          setConnectedApps(data.apps);
        }
      } catch (e) { console.error("Failed to fetch connected apps", e); }
    };
    fetchApps();
  }, [user.token]);

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

  // ✅ Community: Load Communities
  const [communities, setCommunities] = useState([]);
  const loadCommunities = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/communities`, {
        headers: { Authorization: `Bearer ${user?.token}` }
      });
      setCommunities(data);
    } catch (e) { console.error("Failed to load communities", e); }
  }, [user?.token]);

  // ✅ Community: Load Specific Community Details
  const loadCommunityDetails = useCallback(async (communityId) => {
    try {
      const { data } = await axios.get(`${API_BASE}/communities/${communityId}`, {
        headers: { Authorization: `Bearer ${user?.token}` }
      });
      setCommunityDetails(data);
    } catch (e) {
      console.error("Failed to load community details", e);
      setViewingCommunity(null); // fallback
    }
  }, [user?.token]);

  useEffect(() => {
    if (activeTab === 'communities' && !viewingCommunity) {
      loadCommunities();
    }
    if (viewingCommunity) {
      loadCommunityDetails(viewingCommunity);
    }
  }, [activeTab, viewingCommunity, loadCommunities, loadCommunityDetails]);

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
    if (activeTab === "groups") return c.isGroup && !c.isArchived && !c.isAnnouncementGroup;
    if (activeTab === "favorites") return !c.isGroup && c.other?.isFavorite && !c.isArchived;
    // ✅ Social Tab: In 'contacts' view, filter by selected app
    if (activeTab === "social") {
      if (socialView === 'contacts' && selectedApp) {
        return c.origin === selectedApp.chatOriginId && !c.isArchived;
      }
      return false; // In 'apps' view, we don't show chats directly
    }
    if (activeTab === "chats") return !c.isGroup && !c.isArchived && c.origin !== 'ecommerce'; // ✅ Exclude Social
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
              className="w-full flex items-center justify-between p-4 bg-white/60 hover:bg-white/80 rounded-2xl transition-all shadow-sm border border-white/40 text-slate-800"
            >
              <span>Account Information</span>
              <svg className="w-5 h-5 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
            </button>

            {/* My Business Button - Removed from here, now in main nav */}

            {/* Business Registration Button - Only show if user doesn't have a business */}
            {!user?.isBusiness && (
              <button
                onClick={() => setOpenBusinessReg(true)}
                className="w-full flex items-center justify-between p-4 bg-white hover:bg-white/90 rounded-2xl transition-all shadow-sm border border-black/5 group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-slate-900 group-hover:text-primary transition-colors">Register Business Account</div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Start selling with catalog</div>
                  </div>
                </div>
                <svg className="w-5 h-5 text-slate-400 group-hover:text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
              </button>
            )}

            {/* ✅ App Settings for Connections */}
            <div className="p-4 bg-white/60 rounded-2xl space-y-4 shadow-sm border border-white/40 text-slate-800">
              <h3 className="font-bold text-sm text-gray-400 uppercase tracking-wider">App Connection</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">App Name</label>
                  <input
                    type="text"
                    placeholder="Business Client"
                    value={localStorage.getItem('appName') || 'Business Client'}
                    onChange={(e) => {
                      localStorage.setItem('appName', e.target.value);
                      window.location.reload();
                    }}
                    className="w-full bg-[#0f172a] px-3 py-2 rounded-lg border border-white/10 text-white text-sm outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Origin ID</label>
                  <input
                    type="text"
                    placeholder="business-client"
                    value={localStorage.getItem('appOrigin') || 'business-client'}
                    onChange={(e) => {
                      localStorage.setItem('appOrigin', e.target.value);
                      window.location.reload();
                    }}
                    className="w-full bg-[#0f172a] px-3 py-2 rounded-lg border border-white/10 text-white text-sm outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-white/60 rounded-2xl space-y-4 shadow-sm border border-white/40 text-slate-800">
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

            <div className="p-4 bg-white/60 rounded-2xl space-y-4 shadow-sm border border-white/40 text-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">Disappearing Messages</div>
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
                  className="bg-white text-[#0f172a] text-xs font-bold py-1 px-2 rounded-lg border border-slate-200 outline-none focus:ring-1 focus:ring-primary shadow-sm"
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

    // ✅ Communities Tab
    if (activeTab === "communities") {
      if (viewingCommunity && communityDetails) {
        // Drill Down View
        return (
          <div className="flex-1 flex flex-col h-full bg-transparent">
            {/* Header */}
            <div className="p-4 border-b border-white/20 flex items-center gap-4 sticky top-0 bg-white/60 backdrop-blur-md z-10 animate-fade-in shadow-sm">
              <button
                onClick={() => { setViewingCommunity(null); setCommunityDetails(null); }}
                className="w-10 h-10 flex items-center justify-center bg-white/40 hover:bg-white/60 rounded-xl transition-all hover:scale-105 active:scale-95 text-slate-600 hover:text-slate-900 shadow-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" /></svg>
              </button>
              <div className="flex-1 min-w-0">
                <h2 className="font-black text-xl leading-tight truncate text-slate-900 tracking-tight">{communityDetails.name}</h2>
                <p className="text-[10px] text-secondary font-bold uppercase tracking-widest mt-0.5">Community</p>
              </div>
              {communityDetails.admins?.includes(user?.id) && (
                <button
                  onClick={() => setOpenCommunityManage(true)}
                  className="w-10 h-10 flex items-center justify-center bg-primary/10 hover:bg-primary/20 text-primary rounded-xl transition-all hover:scale-105 active:scale-95"
                  title="Manage Community"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
              {/* Announcement Group Card */}
              {communityDetails.announcementGroup && (
                <div
                  onClick={() => onOpenChat(communityDetails.announcementGroup)}
                  className="relative group p-4 rounded-2xl cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 border border-slate-200 bg-white hover:border-primary/30"
                >
                  {/* Subtle Gradient Background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white to-slate-50 z-0" />
                  <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity z-0" />

                  {/* Icon & Glitter */}
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <svg className="w-24 h-24 text-primary" fill="currentColor" viewBox="0 0 24 24"><path d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
                  </div>

                  <div className="relative z-10 flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 overflow-hidden transform group-hover:scale-110 transition-transform">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
                    </div>
                    <div className="flex-1">
                      <div className="font-black text-lg text-slate-900 group-hover:text-primary transition-colors">Announcements</div>
                      <div className="text-xs font-medium text-slate-500 group-hover:text-slate-700 transition-colors">Official Community Updates</div>
                    </div>
                    <svg className="w-5 h-5 text-slate-300 group-hover:text-primary transition-all transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" /></svg>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mt-6 mb-3 px-1">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Groups</div>
                <div className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{communityDetails.groups?.length || 0}</div>
              </div>

              <div className="space-y-1">
                {communityDetails.groups?.map(group => (
                  <div
                    key={group.id}
                    onClick={() => group.isMember ? onOpenChat(group) : alert("You are not a member of this group.")}
                    className={`flex items-center gap-4 p-3 rounded-2xl transition-all border border-transparent animate-slide-up ${group.isMember
                      ? 'hover:bg-slate-50 hover:shadow-sm cursor-pointer group active:scale-[0.99]'
                      : 'opacity-50 grayscale cursor-not-allowed'
                      }`}
                  >
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center font-bold text-primary border border-primary/5 group-hover:border-primary/20 group-hover:shadow-sm transition-all">
                      {group.title?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-800 group-hover:text-primary truncate transition-colors">{group.title}</div>
                      <div className="text-xs text-slate-500 group-hover:text-slate-600 flex items-center gap-1.5">
                        <span>{group.participantsCount} members</span>
                        {group.isMember && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-primary/50"></span>
                            <span className="text-primary font-medium">Joined</span>
                          </>
                        )}
                      </div>
                    </div>
                    {group.isMember && (
                      <svg className="w-5 h-5 text-slate-300 group-hover:text-slate-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
                    )}
                  </div>
                ))}

                {communityDetails.groups?.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 opacity-40">
                    <svg className="w-12 h-12 mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" /></svg>
                    <div className="text-sm font-medium text-slate-500">No groups yet</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      }

      // List View
      return (
        <div className="flex-1 flex flex-col h-full">
          <div className="px-5 pt-6 pb-2 flex justify-between items-center">
            <h2 className="text-2xl font-black text-slate-900">Communities</h2>
            <button onClick={() => setOpenCommunityCreate(true)} className="w-8 h-8 flex items-center justify-center bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20" title="Create Community">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" /></svg>
            </button>
          </div>

          <div className="px-5 pb-4">
            <p className="text-xs text-slate-400">Communities bring members together in topic-based groups.</p>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
            {communities.map(comm => (
              <div
                key={comm.id}
                onClick={() => setViewingCommunity(comm.id)}
                className="flex items-center gap-4 p-4 hover:bg-slate-50 rounded-2xl cursor-pointer transition-all border border-transparent hover:shadow-sm animate-slide-up group"
              >
                <div className="relative">
                  <div className="w-12 h-12 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-primary shadow-sm group-hover:scale-105 transition-transform">
                    {comm.icon ? <img src={comm.icon} className="w-full h-full object-cover rounded-xl" alt="" /> : <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="font-bold text-base text-slate-800 group-hover:text-primary transition-colors">{comm.name}</div>
                  <div className="text-xs text-slate-500 truncate">{comm.description || "No description"}</div>
                </div>
                <svg className="w-5 h-5 text-slate-300 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
              </div>
            ))}

            {communities.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 opacity-50">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 opacity-50 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                </div>
                <p className="text-sm font-bold text-slate-500">No communities</p>
                <p className="text-xs text-slate-400">Create one to get started!</p>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Filter online users (only for 1:1 chats)
    const onlineUsers = chats
      .filter(c => !c.isGroup && c.other?.isOnline && !c.isArchived)
      .map(c => c.other);

    const getTitle = () => {
      if (activeTab === 'groups') return 'Groups';
      if (activeTab === 'favorites') return 'Favorites';
      if (activeTab === 'archived') return 'Archived';
      if (activeTab === 'social') return 'Social';
      return 'Chats';
    };

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header Area */}
        <div className="px-5 pt-6 pb-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {/* ✅ Back Button for Social Contacts View */}
              {activeTab === 'social' && socialView === 'contacts' && (
                <button
                  onClick={() => { setSocialView('apps'); setSelectedApp(null); }}
                  className="p-2 -ml-2 rounded-xl bg-slate-100 hover:bg-white text-slate-500 hover:text-primary transition-all shadow-sm"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" /></svg>
                </button>
              )}
              <h2 className="text-2xl font-black text-slate-900">{activeTab === 'social' ? (socialView === 'contacts' ? selectedApp?.name : 'Social Apps') : getTitle()}</h2>
            </div>
            <div className="flex gap-2">
              {activeTab === 'groups' && (
                <>
                  <button
                    onClick={() => setOpenJoin(true)}
                    className="h-8 px-3 flex items-center justify-center bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors text-xs font-bold ring-1 ring-slate-200"
                    title="Join group with code"
                  >
                    Join
                  </button>
                  <button onClick={() => setOpenCreate(true)} className="w-8 h-8 flex items-center justify-center bg-secondary text-white rounded-lg hover:bg-secondary-dark transition-colors shadow-lg shadow-secondary/20" title="Create new group">
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
            <div className="text-[11px] font-bold text-slate-400 tracking-widest uppercase mb-2">Online</div>
            <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar no-scrollbar">
              {onlineUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => onOpenChat(chats.find(c => !c.isGroup && c.other.id === u.id))}
                  className="flex-shrink-0 relative group"
                >
                  <div className="w-12 h-12 rounded-2xl overflow-hidden border border-slate-100 group-hover:border-primary/50 transition-all shadow-sm">
                    {u.avatar ? (
                      <img src={u.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                        {u.full_name?.[0] || '?'}
                      </div>
                    )}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-[3px] border-white rounded-full" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* List Container */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pt-2">
          {/* ✅ Social App List View */}
          {activeTab === 'social' && socialView === 'apps' ? (
            <div className="px-3 space-y-2">
              {connectedApps.map(app => {
                // Count unread for this app
                const unread = chats.filter(c => c.origin === app.chatOriginId).reduce((acc, c) => acc + (c.unread || 0), 0);

                return (
                  <div
                    key={app._id}
                    onClick={() => { setSelectedApp(app); setSocialView('contacts'); }}
                    className="flex items-center gap-4 p-4 hover:bg-slate-50 rounded-2xl cursor-pointer transition-all border border-transparent hover:border-slate-100 group animate-slide-up"
                  >
                    <div className="relative">
                      <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-600 border border-slate-100 overflow-hidden">
                        {app.icon ? <img src={app.icon} className="w-full h-full object-cover" alt="" /> : (
                          <svg className="w-6 h-6 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
                        )}
                      </div>
                      {unread > 0 && <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-bold px-1.5 h-4 flex items-center justify-center rounded-full border border-white">{unread}</span>}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-base text-slate-800 group-hover:text-primary transition-colors">{app.name}</div>
                      <div className="text-xs text-slate-500">Connected App</div>
                    </div>
                    <svg className="w-5 h-5 text-slate-300 group-hover:text-slate-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
                  </div>
                );
              })}
              {connectedApps.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 opacity-40">
                  <div className="text-sm text-slate-500">No connected apps</div>
                </div>
              )}
            </div>
          ) : (
            <ChatList
              items={sortChats(displayChats, user?.id)}
              activeId={activeChatId}
              userId={user?.id}
              onOpen={async (chat) => {
                if (chat.isSynthetic) {
                  try {
                    const { data } = await axios.post(`${API_BASE}/chats/open`,
                      { targetPhone: user.phone },
                      { headers: { Authorization: `Bearer ${user.token}` } }
                    );
                    onOpenChat(data);
                    await load();
                  } catch (e) { console.error("Self-chat init failed", e); }
                  return;
                }
                onOpenChat(chat);
                setChats((prev) => prev.map((c) => (c.id === chat.id ? { ...c, unread: 0 } : c)));
              }}
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col-reverse md:flex-row h-full overflow-hidden bg-white/50 backdrop-blur-3xl rounded-3xl shadow-float border border-white/50 relative z-10">
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

      <div className="flex-1 flex flex-col h-full overflow-hidden pb-[64px] md:pb-0 bg-white">
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
      <CommunityCreateModal
        open={openCommunityCreate}
        onClose={() => setOpenCommunityCreate(false)}
        onCreated={() => { loadCommunities(); }}
      />
      {viewingCommunity && (
        <CommunityManageModal
          open={openCommunityManage}
          onClose={() => setOpenCommunityManage(false)}
          communityId={viewingCommunity}
        />
      )}
    </div>
  );
}
