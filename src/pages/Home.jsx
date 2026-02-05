import Sidebar from "../components/Sidebar.js";
import ChatWindow from "../components/ChatWindow.js";
import CallModal from "../components/CallModal.js";
import StatusPage from "./StatusPage.js";
import DashboardContent from "../components/DashboardContent"; // ✅ Business
import { useState, useEffect, useRef, useCallback } from "react";
import { socket } from "../socket";
import { useAuth } from "../context/AuthContext.js";
import logo from "../assets/Blue-Chat.jpeg";
import { playNotificationSound, playRingtone, stopRingtone } from "../utils/notificationHelper";

export default function Home() {
  const { user } = useAuth();
  const [activeChat, setActiveChat] = useState(null);
  const [view, setView] = useState("chats"); // "chats", "status", or "my-business"
  const [reloadKey, setReloadKey] = useState(0);

  // ✅ Call state
  const [callState, setCallState] = useState({
    isOpen: false,
    callType: null, // "video" or "audio"
    targetUserId: null,
    targetName: null,
    isIncoming: false,
    callerId: null,
    callerName: null,
  });

  // ✅ 1. Initialize state from URL/LocalStorage on mount
  useEffect(() => {
    const path = window.location.pathname;
    if (path === "/status") {
      setView("status");
    } else if (path === "/my-business") {
      setView("my-business");
    } else {
      // Check localStorage for persisted chat
      const savedChatId = localStorage.getItem("activeChatId");
      if (savedChatId) {
        window.__initialChatId = savedChatId;
      }
    }
  }, []);

  // ✅ 2. Sync State -> URL & LocalStorage
  useEffect(() => {
    if (view === "status") {
      if (window.location.pathname !== "/status") {
        window.history.pushState(null, "", "/status");
      }
    } else if (view === "my-business") {
      if (window.location.pathname !== "/my-business") {
        window.history.pushState(null, "", "/my-business");
      }
    } else if (activeChat) {
      // HIDE ID: Keep URL at / but save to localStorage
      if (window.location.pathname !== "/") {
        window.history.pushState(null, "", "/");
      }
      localStorage.setItem("activeChatId", activeChat.id);
    } else {
      if (window.location.pathname !== "/") {
        window.history.pushState(null, "", "/");
      }
      localStorage.removeItem("activeChatId");
    }
  }, [view, activeChat]);

  // ✅ 3. Listen for popstate (browser back/forward)
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === "/status") {
        setView("status");
      } else if (path === "/") {
        setView("chats");
        // Don't clear activeChat here as user might be coming back from status
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    const force = () => setReloadKey(k => k + 1);
    window.addEventListener("chat:reload", force);
    return () => window.removeEventListener("chat:reload", force);
  }, []);

  // ✅ Listen for incoming calls
  useEffect(() => {
    const handleIncomingCall = ({ callerId, callerName, callerAvatar, callType }) => {
      // Play ringtone if sound is enabled
      const settings = JSON.parse(localStorage.getItem("notificationSettings") || '{"sound":true}');
      if (settings.sound) {
        playRingtone();
      }

      setCallState({
        isOpen: true,
        callType,
        targetUserId: null,
        targetName: null,
        isIncoming: true,
        callerId,
        callerName,
      });
    };

    socket.on("call:incoming", handleIncomingCall);
    return () => {
      socket.off("call:incoming", handleIncomingCall);
      stopRingtone(); // Cleanup ringtone on unmount
    };
  }, []);

  // ✅ Listen for incoming messages for sound/notifications
  useEffect(() => {
    const handleNewMessage = (msg) => {
      console.log("📨 New message received for sound check:", {
        msgId: msg._id,
        chatId: msg.chat,
        senderId: msg.sender?._id || msg.sender,
        activeChatId: activeChat?.id,
        myId: user?.id
      });

      const senderId = msg.sender?._id || msg.sender;
      const isFromMe = String(senderId) === String(user?.id);
      const isCurrentChat = String(activeChat?.id) === String(msg.chat);

      console.log("🔍 Condition check:", { isFromMe, isCurrentChat });

      if (!isFromMe && !isCurrentChat) {
        const settings = JSON.parse(localStorage.getItem("notificationSettings") || '{"sound":true}');
        console.log("⚙️ Notification settings:", settings);
        if (settings.sound) {
          playNotificationSound();
        }
      }
    };

    socket.on("message:new", handleNewMessage);
    return () => socket.off("message:new", handleNewMessage);
  }, [activeChat, user?.id]);

  // When a chat is selected
  const handleOpenChat = (chat) => {
    setActiveChat(chat);
  };

  // Back button handler - go back to chat list
  const handleBack = () => {
    setActiveChat(null);
  };

  // ✅ Start a call
  const handleStartCall = (callType) => {
    if (!activeChat || activeChat.isGroup) return;
    setCallState({
      isOpen: true,
      callType,
      targetUserId: activeChat.other?.id,
      targetName: activeChat.other?.full_name || activeChat.other?.phone || "Unknown",
      isIncoming: false,
      callerId: null,
      callerName: null,
    });
  };

  // ✅ Close call modal
  const handleCloseCall = () => {
    stopRingtone(); // ✅ Stop ringtone when closing
    setCallState({
      isOpen: false,
      callType: null,
      targetUserId: null,
      targetName: null,
      isIncoming: false,
      callerId: null,
      callerName: null,
    });
  };

  // ✅ Resizable Sidebar State
  const [sidebarWidth, setSidebarWidth] = useState(420);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef(null);

  // Handle Resizing
  const startResizing = useCallback(() => setIsResizing(true), []);
  const stopResizing = useCallback(() => setIsResizing(false), []);
  const resize = useCallback((mouseMoveEvent) => {
    if (isResizing) {
      const newWidth = mouseMoveEvent.clientX;
      if (newWidth > 260 && newWidth < 600) {
        setSidebarWidth(newWidth);
      }
    }
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", resize);
      window.addEventListener("mouseup", stopResizing);
    } else {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    }
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

  if (view === "status") {
    return <StatusPage onBack={() => setView("chats")} />;
  }

  if (view === "my-business") {
    return <DashboardContent onBack={() => setView("chats")} />;
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-background">
      <div className="h-full w-full flex">

        {/* ✅ SIDEBAR - Hidden on mobile when chat is open */}
        <div
          ref={sidebarRef}
          className={`
            ${activeChat ? 'hidden' : 'flex'} 
            md:flex
            h-full overflow-hidden border-r border-background-dark
            flex-col relative
            flex-shrink-0
          `}
          style={{ width: window.innerWidth >= 768 ? sidebarWidth : '100%' }}
        >
          <Sidebar
            onOpenChat={handleOpenChat}
            activeChatId={activeChat?.id}
            onViewStatus={() => setView("status")}
            onViewMyBusiness={() => setView("my-business")}
          />

          {/* Resize Handle */}
          <div
            className="hidden md:block absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-primary/50 transition-colors z-50"
            onMouseDown={startResizing}
          />
        </div>

        {/* ✅ CHAT WINDOW - Full screen on mobile when chat is open */}
        <div className={`
          ${activeChat ? 'flex' : 'hidden'} 
          md:flex
          h-full overflow-hidden
          flex-col flex-1 min-w-0
        `}>
          {activeChat ? (
            <ChatWindow
              key={activeChat?.id + reloadKey}
              chat={activeChat}
              onBack={handleBack}
              onStartCall={handleStartCall}
            />
          ) : (
            <div className="h-full grid place-items-center text-primary/60 p-4 text-center bg-background">
              <div>
                <img src={logo} alt="BlueChat" className="w-20 h-20 mx-auto mb-4 rounded-xl opacity-80" />
                <div className="text-xl font-semibold text-primary mb-2">BlueChat</div>
                <div className="text-sm">Select a chat or search by phone to start messaging.</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ✅ Call Modal */}
      <CallModal
        callState={callState}
        onClose={handleCloseCall}
        userId={user?.id}
      />
    </div>
  );
}
