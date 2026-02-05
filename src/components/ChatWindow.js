import { useEffect, useRef, useState, useCallback } from "react";
import axios from "axios";
import { API_BASE } from "../api";
import { socket } from "../socket";
import { useAuth } from "../context/AuthContext.js";
import MessageBubble from "./MessageBubble.js";
import ChatInput from "./ChatInput.js";
import GroupManageModal from "./GroupManageModal";
import ContactInfoModal from "./ContactInfoModal"; // ✅ Added ContactInfoModal
import ForwardModal from "./ForwardModal";
import TaskModal from "./TaskModal";
import TaskBubble from "./TaskBubble";
import { encryptMessage } from "../utils/cryptoUtils";

export default function ChatWindow({ chat, onBack, onStartCall }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const scrollerRef = useRef(null);
  const [openManage, setOpenManage] = useState(false);
  const [openContactInfo, setOpenContactInfo] = useState(false); // ✅ Added state
  const [openTaskModal, setOpenTaskModal] = useState(false); // ✅ Task Modal State
  const [showMenu, setShowMenu] = useState(false);
  // ✅ Added state

  // ✅ Reply/Forward state
  const [replyTo, setReplyTo] = useState(null);
  const [forwardMessage, setForwardMessage] = useState(null);
  const [prefillMessage, setPrefillMessage] = useState(""); // ✅ New state

  // ✅ Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // ✅ Block state
  const [blockStatus, setBlockStatus] = useState({
    iBlockedThem: false,
    theyBlockedMe: false,
    isBlocked: false
  });
  const [blockError, setBlockError] = useState("");

  // ✅ Load messages (backend masks deleted messages)
  // ✅ Archive / Hide handlers
  const handleArchive = async () => {
    setShowMenu(false);
    try {
      await axios.post(`${API_BASE}/chats/${chat.id}/archive`, {
        archive: !chat.isArchived
      }, {
        headers: { Authorization: `Bearer ${user?.token}` }
      });
      window.dispatchEvent(new CustomEvent("chats:refresh"));
    } catch (err) {
      console.error("Archive failed:", err);
    }
  };

  const handleHide = async () => {
    setShowMenu(false);
    if (!window.confirm("Delete this chat? Message history will be cleared for you. The contact will see you as a new chat if you message again.")) return;
    try {
      await axios.post(`${API_BASE}/chats/${chat.id}/hide`, {}, {
        headers: { Authorization: `Bearer ${user?.token}` }
      });
      window.dispatchEvent(new CustomEvent("chats:refresh"));
      if (onBack) onBack(); // Close chat window after hiding
    } catch (err) {
      console.error("Hide failed:", err);
    }
  };

  const handleClearChat = async () => {
    setShowMenu(false);
    if (!window.confirm("Clear all messages? This action cannot be undone for you.")) return;
    try {
      await axios.post(`${API_BASE}/chats/${chat.id}/clear`, {}, {
        headers: { Authorization: `Bearer ${user?.token}` }
      });
      setMessages([]); // Clear local state
      window.dispatchEvent(new CustomEvent("chats:refresh")); // Refresh sidebar to clear last message
    } catch (err) {
      console.error("Clear chat failed:", err);
    }
  };

  const handleReportUser = async () => {
    setShowMenu(false);
    if (!window.confirm("Report this user? If multiple users report them, their account may be temporarily disabled.")) return;
    try {
      await axios.post(`${API_BASE}/users/${chat.other.id}/report`, {}, {
        headers: { Authorization: `Bearer ${user?.token}` }
      });
      alert("User reported successfully. Thank you for helping keep our community safe.");
      window.dispatchEvent(new CustomEvent("chats:refresh")); // ✅ Refresh to update report status
    } catch (err) {
      console.error("Report failed:", err);
      alert(err.response?.data?.message || "Failed to report user.");
    }
  };

  const handleReportGroup = async () => {
    setShowMenu(false);
    if (!window.confirm("Report this group? You will be automatically removed from it.")) return;
    try {
      await axios.post(`${API_BASE}/groups/${chat.id}/report`, {}, {
        headers: { Authorization: `Bearer ${user?.token}` }
      });
      onBack?.();
      window.dispatchEvent(new CustomEvent("chats:refresh"));
    } catch (e) {
      console.error("Report group failed:", e);
      alert(e.response?.data?.message || "Failed to report group");
    }
  };

  const load = useCallback(async () => {
    try {
      const { data } = await axios.get(
        `${API_BASE}/messages/${chat.id}`,
        {
          headers: { Authorization: `Bearer ${user?.token}` },
        }
      );

      // Add current user ID
      const enriched = data.map((m) => ({
        ...m,
        currentUserId: user.id,
      }));

      setMessages(enriched);
    } catch (err) {
      console.error("Failed to load messages:", err);
    }
  }, [chat.id, user?.token, user.id]);

  const handleProductInquiry = (product) => {
    const currencySymbol = product.currency === 'INR' ? '₹' : product.currency;
    setPrefillMessage(`${product.name} - ${currencySymbol} ${product.price}\n`);
  };

  const [typing, setTyping] = useState(false);
  const [presence, setPresence] = useState({
    isOnline: chat.other?.isOnline,
    lastSeen: chat.other?.lastSeen,
  });

  // ✅ Check block status when chat opens (for 1:1 chats)
  useEffect(() => {
    if (chat.isGroup || !chat.other?.id) return;

    socket.emit("user:checkBlocked", { targetUserId: chat.other.id }, (res) => {
      if (res?.success) {
        setBlockStatus({
          iBlockedThem: res.iBlockedThem,
          theyBlockedMe: res.theyBlockedMe,
          isBlocked: res.isBlocked
        });
      }
    });
  }, [chat.id, chat.other?.id, chat.isGroup]);

  // ✅ Listen for message errors (blocked)
  useEffect(() => {
    const onError = ({ error }) => {
      setBlockError(error);
      setTimeout(() => setBlockError(""), 3000);
    };

    socket.on("message:error", onError);
    return () => socket.off("message:error", onError);
  }, []);

  // ✅ Listen for real-time block/unblock notifications
  useEffect(() => {
    if (chat.isGroup || !chat.other?.id) return;

    const onBlockedBy = ({ blockedBy, targetUserId }) => {
      // If current user was blocked by the chat partner
      if (blockedBy === chat.other.id && targetUserId === user.id) {
        setBlockStatus(prev => ({ ...prev, theyBlockedMe: true, isBlocked: true }));
      }
    };

    const onUnblockedBy = ({ unblockedBy, targetUserId }) => {
      // If current user was unblocked by the chat partner
      if (unblockedBy === chat.other.id && targetUserId === user.id) {
        setBlockStatus(prev => ({
          ...prev,
          theyBlockedMe: false,
          isBlocked: prev.iBlockedThem
        }));
      }
    };

    socket.on("user:blockedBy", onBlockedBy);
    socket.on("user:unblockedBy", onUnblockedBy);

    return () => {
      socket.off("user:blockedBy", onBlockedBy);
      socket.off("user:unblockedBy", onUnblockedBy);
    };
  }, [chat.id, chat.other?.id, chat.isGroup, user.id]);

  // ✅ Load + listen new messages
  useEffect(() => {
    load();

    socket.connect();
    socket.emit("join_chat", { chatId: chat.id });

    const onNew = (m) => {
      // ✅ IMPORTANT: Only add message if it belongs to THIS chat
      if (m.chat !== chat.id) return;

      setMessages((prev) => {
        // If message exists, replace it (to update isReleased, status, etc)
        const idx = prev.findIndex(msg => msg._id === m._id);
        if (idx !== -1) {
          const updated = [...prev];
          updated[idx] = { ...m, currentUserId: user.id };
          return updated;
        }
        // Otherwise append new
        return [...prev, { ...m, currentUserId: user.id }];
      });
    };

    // ✅ Handle message pinned
    const onPinned = ({ chatId, message }) => {
      if (chatId !== chat.id) return;
      setMessages((prev) =>
        prev.map((m) => (m._id === message._id ? { ...m, isPinned: true } : m))
      );
    };

    // ✅ Handle message unpinned
    const onUnpinned = ({ chatId, messageId }) => {
      if (chatId !== chat.id) return;
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, isPinned: false } : m))
      );
    };

    // ✅ Handle reaction updates
    const onReacted = ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, reactions } : m))
      );
    };

    socket.on("message:new", onNew);
    socket.on("message:pinned", onPinned);
    socket.on("message:unpinned", onUnpinned);
    socket.on("message:reacted", onReacted);

    return () => {
      socket.off("message:new", onNew);
      socket.off("message:pinned", onPinned);
      socket.off("message:unpinned", onUnpinned);
      socket.off("message:reacted", onReacted);
    };
  }, [chat.id, user.id, load]);

  // ✅ AUTO-REFRESH REMOVED for performance. Sockets handle updates.

  // ✅ Mark all as read
  useEffect(() => {
    socket.emit("message:readAll", { chatId: chat.id });
  }, [chat.id]);

  // ✅ Mark read on window focus
  useEffect(() => {
    const onFocus = () => {
      socket.emit("message:readAll", { chatId: chat.id });
    };

    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [chat.id]);

  // ✅ Real-time delete sync
  useEffect(() => {
    const onDeletedEveryone = ({ messageId, chatId: eventChatId }) => {
      // Only update if event is for current chat
      if (eventChatId !== chat.id) return;
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId ? { ...m, deletedForEveryone: true } : m
        )
      );
    };

    const onDeletedMe = ({ messageId, chatId: eventChatId }) => {
      // Only update if event is for current chat
      if (eventChatId !== chat.id) return;
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId ? { ...m, deletedFor: [...(m.deletedFor || []), user.id] } : m
        )
      );
    };

    socket.on("message:deleted:everyone", onDeletedEveryone);
    socket.on("message:deleted:me", onDeletedMe);
    return () => {
      socket.off("message:deleted:everyone", onDeletedEveryone);
      socket.off("message:deleted:me", onDeletedMe);
    };
  }, [chat.id, user.id]);

  // ✅ Typing & presence
  useEffect(() => {
    socket.emit("join_chat", { chatId: chat.id });
    socket.emit("user:sync");

    const onTypingStart = ({ chatId }) =>
      chatId === chat.id && setTyping(true);

    const onTypingStop = ({ chatId }) =>
      chatId === chat.id && setTyping(false);

    const onPresence = (p) => {
      if (chat.other && p.userId === chat.other.id) {
        setPresence({ isOnline: p.isOnline, lastSeen: new Date() });
      }
    };

    socket.on("typing:started", onTypingStart);
    socket.on("typing:stopped", onTypingStop);
    socket.on("presence:update", onPresence);

    return () => {
      socket.off("typing:started", onTypingStart);
      socket.off("typing:stopped", onTypingStop);
      socket.off("presence:update", onPresence);
    };
  }, [chat.id, chat.other]);

  // ✅ Scroll to bottom on initial load, smart scroll for updates
  const isInitialLoad = useRef(true);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || messages.length === 0) return;

    // Always scroll to bottom on initial load
    if (isInitialLoad.current) {
      scroller.scrollTop = scroller.scrollHeight;
      isInitialLoad.current = false;
      return;
    }

    // For updates: only scroll if user is near the bottom (within 100px)
    const isNearBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 100;

    if (isNearBottom) {
      scroller.scrollTo({
        top: scroller.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  // Reset initial load flag when chat changes
  useEffect(() => {
    isInitialLoad.current = true;
  }, [chat.id]);

  // ✅ Send message with attachments, replyTo, and scheduledAt (E2EE support)
  const send = async (text, attachments = [], replyToId = null, scheduledAt = null) => {
    let payload = {
      chatId: chat.id,
      senderId: user.id,
      body: text,
      attachments: attachments.map(att => ({
        url: att.url,
        type: att.type,
        name: att.name
      })),
      replyTo: replyToId,
      scheduledAt: scheduledAt // ✅ Add scheduling
    };

    // ✅ Apply E2EE for 1:1 chats if other participant has a public key
    if (!chat.isGroup && chat.other?.publicKey && text) {
      try {
        const keysMap = {
          [user.id]: user.publicKey,
          [chat.other.id]: chat.other.publicKey
        };

        if (user.publicKey && chat.other.publicKey) {
          const encrypted = await encryptMessage(text, keysMap);
          payload.encryptedBody = encrypted.encryptedBody;
          payload.encryptedKeys = encrypted.encryptedKeys;
          payload.body = "[Encrypted Message]";
        }
      } catch (err) {
        console.error("Encryption failed:", err);
      }
    }

    socket.emit("message:send", payload);
  };

  // ✅ New event listener for scheduling confirmation
  useEffect(() => {
    const onScheduled = ({ message, scheduledAt }) => {
      // Show some UI feedback? For now, we'll just log or could show a toast
      console.log(`Message scheduled for ${new Date(scheduledAt).toLocaleString()}`);
      // alert(`Message scheduled for ${new Date(scheduledAt).toLocaleString()}`);
    };

    socket.on("message:scheduled", onScheduled);
    return () => socket.off("message:scheduled", onScheduled);
  }, []);

  // ✅ Block/Unblock handlers
  const handleBlock = () => {
    if (!chat.other?.id) return;
    socket.emit("user:block", { targetUserId: chat.other.id }, (res) => {
      if (res?.success) {
        setBlockStatus(prev => ({ ...prev, iBlockedThem: true, isBlocked: true }));
      }
    });
  };

  const handleUnblock = () => {
    if (!chat.other?.id) return;
    socket.emit("user:unblock", { targetUserId: chat.other.id }, (res) => {
      if (res?.success) {
        setBlockStatus(prev => ({
          ...prev,
          iBlockedThem: false,
          isBlocked: prev.theyBlockedMe
        }));
      }
    });
  };

  return (
    <div className="flex flex-col h-full bg-white/70 backdrop-blur-3xl rounded-3xl shadow-float border border-white/60 relative overflow-hidden z-10 m-0 md:m-0">

      {/* ✅ HEADER with glassmorphism */}
      <div className="px-5 py-4 bg-white/40 backdrop-blur-md border-b border-white/40 shadow-sm flex justify-between items-center gap-3 min-h-[72px] transition-all z-20">
        {showSearch ? (
          <div className="flex-1 flex items-center gap-3 animate-premium-in">
            <div className="relative flex-1">
              <input
                autoFocus
                type="text"
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full glass-input border-white/40 text-slate-800 placeholder-slate-400 px-10 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-inner"
              />
              <svg className="w-4 h-4 text-white/50 absolute left-3.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <button
              onClick={() => { setShowSearch(false); setSearchQuery(""); }}
              className="text-slate-500 hover:text-slate-800 text-sm font-bold px-2"
            >
              Cancel
            </button>
          </div>
        ) : (
          <>
            {/* LEFT - Back button + Name */}
            <div
              className={`flex items-center gap-3 min-w-0 ${!chat.isGroup ? "cursor-pointer group/header" : ""}`}
              onClick={() => !chat.isGroup && setOpenContactInfo(true)}
            >
              {/* Back button (mobile only) */}
              {onBack && (
                <button
                  onClick={onBack}
                  className="md:hidden p-2 hover:bg-white/40 rounded-xl transition-all duration-200 text-slate-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}

              {/* Avatar with gradient and online indicator */}
              <div className="relative">
                <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full grid place-items-center text-sm font-bold flex-shrink-0 text-white shadow-md overflow-hidden ${chat.isGroup
                  ? "bg-gradient-to-br from-secondary-dark to-secondary"
                  : "bg-gradient-to-br from-secondary to-secondary-light"
                  }`}>
                  {(chat.isGroup ? chat.avatar : chat.other?.avatar) ? (
                    <img src={chat.isGroup ? chat.avatar : chat.other.avatar} alt="" className="w-full h-full object-cover group-hover/header:scale-110 transition-transform" />
                  ) : chat.isGroup
                    ? (chat.title?.[0] || "G")
                    : (chat.other?.full_name?.[0] || chat.other?.phone?.slice(-2))}
                </div>
                {/* Online indicator */}
                {!chat.isGroup && !chat.isSelfChat && presence.isOnline && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-primary animate-pulse" />
                )}
              </div>

              <div className="min-w-0">
                <div className="font-bold text-sm sm:text-base truncate text-slate-800 group-hover/header:text-primary transition-colors">
                  {chat.title}
                </div>

                <div className="text-[10px] sm:text-xs text-slate-500 font-medium flex items-center gap-1">
                  {chat.isGroup
                    ? "Group"
                    : typing
                      ? <span className="animate-pulse-soft">Typing...</span>
                      : chat.isSelfChat
                        ? "Notes & Links"
                        : presence.isOnline
                          ? "Online"
                          : chat.other?.lastSeen
                            ? `last seen ${new Date(chat.other.lastSeen).toLocaleTimeString()}`
                            : ""
                  }
                </div>
              </div>
            </div>

            {/* RIGHT - Action buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSearch(true)}
                className="p-2 hover:bg-white/40 rounded-xl transition-all duration-200 text-slate-400 hover:text-primary"
                title="Search messages"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>

              {chat.isGroup && (
                <button
                  onClick={() => setOpenManage(true)}
                  className="text-xs bg-primary/10 hover:bg-primary/20 text-primary px-3 py-2 rounded-xl transition-all duration-200 font-semibold flex items-center gap-1.5 ring-1 ring-primary/20"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Info
                </button>
              )}

              {!chat.isGroup && !chat.isSelfChat && (
                <>
                  {/* Favorite Toggle Button */}
                  <button
                    onClick={async () => {
                      try {
                        const { data } = await axios.post(`${API_BASE}/users/favorites/toggle`, { targetId: chat.other.id }, {
                          headers: { Authorization: `Bearer ${user?.token}` }
                        });
                        if (data.success) {
                          chat.other.isFavorite = data.isFavorite; // Update local state
                          window.dispatchEvent(new CustomEvent("chats:refresh")); // Refresh sidebar
                        }
                      } catch (e) { console.error("Toggle favorite failed", e); }
                    }}
                    className={`p-2 rounded-xl transition-all duration-200 ring-1 ${chat.other?.isFavorite
                      ? "bg-yellow-500/20 text-yellow-600 ring-yellow-500/30 shadow-[0_0_10px_rgba(250,204,21,0.2)]"
                      : "bg-white/40 text-slate-400 hover:text-yellow-500 hover:bg-white/60 ring-black/5"
                      }`}
                    title={chat.other?.isFavorite ? "Remove from favorites" : "Add to favorites"}
                  >
                    <svg className="w-5 h-5" fill={chat.other?.isFavorite ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.382-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </button>

                  {/* Audio Call Button */}
                  <button
                    onClick={() => onStartCall?.("audio")}
                    className="p-2 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-xl transition-all duration-200 ring-1 ring-green-500/30 active:scale-95"
                    title="Audio call"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </button>
                  {/* Video Call Button */}
                  <button
                    onClick={() => onStartCall?.("video")}
                    className="p-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-xl transition-all duration-200 ring-1 ring-blue-500/30 active:scale-95"
                    title="Video call"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </>
              )}

              {!chat.isGroup && !chat.isSelfChat && (
                <button
                  onClick={blockStatus.iBlockedThem ? handleUnblock : handleBlock}
                  className={`text-xs px-3 py-2 rounded-xl transition-all duration-200 font-semibold ring-1 ${blockStatus.iBlockedThem
                    ? "bg-green-100 text-green-700 hover:bg-green-200 ring-green-200"
                    : "bg-red-50 text-red-600 hover:bg-red-100 ring-red-100"
                    }`}
                >
                  {blockStatus.iBlockedThem ? "Unblock" : "Block"}
                </button>
              )}

              {/* Three-dot Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 hover:bg-white/40 rounded-xl transition-all duration-200 text-slate-400 hover:text-primary"
                  title="More options"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                  </svg>
                </button>

                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-[1000]" onClick={() => setShowMenu(false)} />
                    <div className="absolute right-0 top-12 w-48 glass-card bg-white/95 backdrop-blur-xl border border-slate-100 rounded-2xl shadow-2xl z-[1010] py-2 animate-premium-in">
                      <button
                        onClick={async () => {
                          try {
                            const { data } = await axios.post(`${API_BASE}/users/favorites/toggle`, { targetId: chat.other.id }, {
                              headers: { Authorization: `Bearer ${user?.token}` }
                            });
                            if (data.success) {
                              chat.other.isFavorite = data.isFavorite; // Update local state
                              window.dispatchEvent(new CustomEvent("chats:refresh")); // Refresh sidebar
                            }
                          } catch (e) { console.error("Toggle favorite failed", e); }
                        }}
                        className={`w-full px-4 py-3 text-left text-sm font-medium transition-colors flex items-center gap-3 ${chat.other?.isFavorite
                          ? "text-yellow-600 hover:bg-yellow-50"
                          : "text-slate-700 hover:bg-slate-50"
                          }`}
                        title={chat.other?.isFavorite ? "Remove from favorites" : "Add to favorites"}
                      >
                        <svg className="w-4 h-4" fill={chat.other?.isFavorite ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.382-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                        {chat.other?.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                      </button>

                      <button
                        onClick={handleArchive}
                        className="w-full px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-3"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                        {chat.isArchived ? "Unarchive Chat" : "Archive Chat"}
                      </button>

                      <button
                        onClick={handleClearChat}
                        className="w-full px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-3"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Clear Chat
                      </button>

                      {!chat.isGroup && !chat.isSelfChat && (
                        <button
                          onClick={handleReportUser}
                          className="w-full px-4 py-3 text-left text-sm font-medium text-orange-600 hover:bg-orange-50 transition-colors flex items-center gap-3"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          Report Account
                        </button>
                      )}

                      {chat.isGroup && (
                        <button
                          onClick={handleReportGroup}
                          className="w-full px-4 py-3 text-left text-sm font-medium text-orange-600 hover:bg-orange-50 transition-colors flex items-center gap-3"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          Report Group
                        </button>
                      )}

                      <button
                        onClick={handleHide}
                        className="w-full px-4 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50 transition-colors flex items-center gap-3"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete Chat
                      </button>

                      {/* ✅ Assign Task Button */}
                      <button
                        onClick={() => { setShowMenu(false); setOpenTaskModal(true); }}
                        className="w-full px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-3"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                        Assign Task
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Close Chat Button */}
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-2 hover:bg-white/40 rounded-xl transition-all duration-200 text-slate-500 hover:text-red-500 hidden sm:block"
                  title="Close chat"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* ✅ Block Status Banners */}
      {
        blockError && (
          <div className="bg-red-50 text-red-600 border-b border-red-200 text-xs sm:text-sm px-3 sm:px-4 py-2 text-center animate-fade-in">
            {blockError}
          </div>
        )
      }
      {
        blockStatus.theyBlockedMe && !blockStatus.iBlockedThem && (
          <div className="bg-yellow-50 text-yellow-800 border-b border-yellow-200 text-xs sm:text-sm px-3 sm:px-4 py-2 text-center">
            You cannot send messages to this user.
          </div>
        )
      }
      {
        blockStatus.iBlockedThem && (
          <div className="bg-slate-100 text-slate-600 border-b border-slate-200 text-xs sm:text-sm px-3 sm:px-4 py-2 text-center">
            You have blocked this user. Unblock to send messages.
          </div>
        )
      }

      {/* ✅ Pinned Messages Section */}
      {
        messages.filter(m => m.isPinned).length > 0 && (
          <div className="bg-white/80 backdrop-blur-md border-b border-primary/10 px-3 sm:px-4 py-2 animate-fade-in">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-secondary-dark text-xs sm:text-sm font-semibold">📌 Pinned Messages</span>
              <span className="text-primary/60 text-[10px] sm:text-xs">
                ({messages.filter(m => m.isPinned).length})
              </span>
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {messages.filter(m => m.isPinned).map((m) => (
                <div
                  key={`pinned-${m._id}`}
                  className="flex items-start justify-between gap-2 bg-white/80 rounded-lg px-3 py-2 shadow-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] text-secondary-dark mb-0.5">
                      {m.sender?.full_name || (m.sender === user.id ? "You" : "User")}
                    </div>
                    <div className="text-xs sm:text-sm text-primary truncate">
                      {m.body?.substring(0, 100) || "[attachment]"}
                      {m.body?.length > 100 ? "..." : ""}
                    </div>
                  </div>
                  <button
                    onClick={() => socket.emit("message:unpin", { messageId: m._id, chatId: chat.id })}
                    className="text-[10px] text-primary/40 hover:text-red-500 flex-shrink-0"
                    title="Unpin"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )
      }

      {/* ✅ Messages Area */}
      <div
        ref={scrollerRef}
        className="flex-1 overflow-y-auto p-3 sm:p-4 bg-[#E9F4FF] relative"
      >
        <div className="space-y-2 relative z-10">
          {(searchQuery ? messages.filter(m => m.body?.toLowerCase().includes(searchQuery.toLowerCase())) : messages).map((m, index, arr) => {
            const prevMessage = arr[index - 1];
            const showDate = !prevMessage ||
              new Date(m.createdAt).toDateString() !== new Date(prevMessage.createdAt).toDateString();

            return (
              <div key={m._id}>
                {showDate && (
                  <div className="flex justify-center my-6">
                    <div className="bg-white/60 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-black text-slate-500 tracking-widest uppercase ring-1 ring-slate-200/50 shadow-sm">
                      {new Date(m.createdAt).toDateString() === new Date().toDateString() ? "Today" :
                        new Date(m.createdAt).toDateString() === new Date(Date.now() - 86400000).toDateString() ? "Yesterday" :
                          new Date(m.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                )}
                {/* ✅ Check if it's a TASK message */}
                {m.task ? (
                  <TaskBubble message={m} mine={m.sender === user.id} />
                ) : (
                  <MessageBubble
                    message={m}
                    mine={m.sender === user.id || m.sender?._id === user.id}
                    chatId={chat.id}
                    isGroup={chat.isGroup}
                    isAdmin={chat.isGroup && chat.admins?.includes(user.id)}
                    onReply={(msg) => setReplyTo(msg)}
                    onForward={(msg) => setForwardMessage(msg)}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ✅ Input */}
      <div className="border-t border-background-dark p-1 sm:p-1 bg-white">
        {blockStatus.isBlocked || chat.other?.isReportedByMe || chat.other?.hasReportedMe ? (
          <div className="text-center text-primary/50 py-1 text-sm italic">
            {chat.other?.isReportedByMe
              ? "You have reported this user. Communication is disabled."
              : chat.other?.hasReportedMe
                ? "You have been reported by this user. Communication is disabled."
                : blockStatus.iBlockedThem
                  ? "Unblock this user to send messages"
                  : "You cannot send messages to this user"}
          </div>
        ) : (chat.isAnnouncementGroup && !chat.admins?.includes(user.id)) ? (
          <div className="text-center text-primary/50 py-2 text-sm italic bg-gray-50 rounded-lg">
            Only admins can send messages in this group.
          </div>
        ) : (
          <ChatInput
            onSend={send}
            chatId={chat.id}
            replyTo={replyTo}
            onCancelReply={() => setReplyTo(null)}
            members={chat.members}
            prefillMessage={prefillMessage}
          />
        )}
      </div>

      {/* ✅ Group Manage Modal */}
      <GroupManageModal
        chat={chat}
        open={openManage}
        onClose={() => setOpenManage(false)}
      />

      {/* ✅ Contact Info Modal */}
      <ContactInfoModal
        contact={chat.other}
        open={openContactInfo}
        onClose={() => setOpenContactInfo(false)}
        onProductInquiry={handleProductInquiry} // ✅ Pass handler
      />

      {/* ✅ Forward Modal */}
      {forwardMessage && (
        <ForwardModal
          message={forwardMessage}
          onClose={() => setForwardMessage(null)}
        />
      )}

      {/* ✅ Task Modal */}
      <TaskModal
        isOpen={openTaskModal}
        onClose={() => setOpenTaskModal(false)}
        chat={chat}
        onTaskCreated={(newTask) => {
          // Socket handles updates
        }}
      />
    </div >
  );
}

