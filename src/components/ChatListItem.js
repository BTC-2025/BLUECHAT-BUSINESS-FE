import { useState, useEffect } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useAuth } from "../context/AuthContext";
import { decryptMessage } from "../utils/cryptoUtils";
dayjs.extend(relativeTime);

export default function ChatListItem({ item, active, onClick, userId }) {
  const { user, privateKey } = useAuth();
  const [lightboxImage, setLightboxImage] = useState(null);
  const [decryptedLast, setDecryptedLast] = useState(null);

  // ✅ Decrypt last message for sidebar
  useEffect(() => {
    const decrypt = async () => {
      if (item.lastEncryptedBody && item.lastEncryptedKeys && privateKey) {
        try {
          const keyEntry = item.lastEncryptedKeys.find(k => String(k.user) === String(user.id) || String(k.user?._id) === String(user.id));
          if (keyEntry) {
            const body = await decryptMessage(item.lastEncryptedBody, keyEntry.key, privateKey);
            setDecryptedLast(body);
          } else {
            setDecryptedLast(item.lastMessage);
          }
        } catch (err) {
          console.error("Sidebar decryption failed:", err);
          setDecryptedLast(item.lastMessage);
        }
      } else {
        setDecryptedLast(item.lastMessage);
      }
    };
    decrypt();
  }, [item.lastEncryptedBody, item.lastEncryptedKeys, item.lastMessage, privateKey, user.id]);

  const avatarInitial = item.isSelfChat ? "Me" : (item.title || "?")[0];
  const displayName = item.isSelfChat ? "Me" : item.title;

  // Check if chat is pinned for this user
  const isPinned = item.isPinned || item.pinnedBy?.includes(userId);
  const isOnline = !item.isGroup && item.other?.isOnline;

  const handleAvatarClick = (e) => {
    e.stopPropagation();
    if (!item.isGroup && item.other?.avatar) {
      setLightboxImage(item.other.avatar);
    }
  };

  return (
    <>
      <div className="group relative">
        <button
          onClick={onClick}
          className={`w-full text-left px-5 py-4 transition-all duration-300 relative overflow-hidden ${active
            ? "bg-primary/5 shadow-sm ring-1 ring-primary/10"
            : "hover:bg-slate-50"
            }`}
        >
          {/* Active Indicator Glow */}
          {active && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full shadow-[0_0_12px_rgba(59,130,246,0.8)]" />
          )}

          <div className="flex items-center gap-4 relative z-10 pr-6">
            {/* Avatar */}
            <div
              className="relative flex-shrink-0 cursor-pointer"
              onClick={handleAvatarClick}
            >
              <div className={`w-12 h-12 rounded-2xl grid place-items-center text-sm font-black uppercase shadow-sm transition-all duration-300 group-hover:scale-105 group-hover:rotate-3 overflow-hidden border border-white/50 ${item.isGroup
                ? "bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600"
                : "bg-gradient-to-br from-primary to-primary-dark text-white"
                }`}>
                {(item.isGroup ? item.avatar : item.other?.avatar) ? (
                  <img src={item.isGroup ? item.avatar : item.other.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  avatarInitial
                )}
              </div>

              {/* Premium Online Pulse */}
              {isOnline && (
                <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 border-4 border-white rounded-full shadow-sm" />
              )}
            </div>

            {/* Main Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`font-bold truncate text-[15px] tracking-tight transition-colors ${active ? "text-primary" : "text-slate-800 group-hover:text-primary"
                    }`}>
                    {displayName}
                  </div>
                  {isPinned && (
                    <span className="text-secondary flex-shrink-0" title="Pinned chat">
                      <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20">
                        <path d="M10 2a1 1 0 011 1v1.323l3.945 2.035a1 1 0 01.555.894V10a1 1 0 01-1 1H5.5a1 1 0 01-1-1V7.252a1 1 0 01.555-.894L9 4.323V3a1 1 0 011-1z" />
                      </svg>
                    </span>
                  )}
                  {item.isArchived && (
                    <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase tracking-tighter">Archived</span>
                  )}
                </div>

                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex-shrink-0">
                  {item.lastAt ? dayjs(item.lastAt).fromNow(true) : ""}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className={`text-sm truncate transition-colors max-w-[80%] ${item.unread > 0 ? "text-slate-900 font-bold" : "text-slate-500"
                  }`}>
                  {decryptedLast || item.lastMessage || "No messages yet"}
                </div>

                {/* Sophisticated Unread Badge */}
                {item.unread > 0 && (
                  <div className="bg-primary text-white text-[10px] font-black px-1.5 py-0.5 rounded-md min-w-[18px] text-center shadow-sm">
                    {item.unread > 99 ? "99+" : item.unread}
                  </div>
                )}
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* Lightbox for avatar */}
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-sm w-full">
            <img
              src={lightboxImage}
              alt="Profile"
              className="w-full h-auto max-h-[70vh] object-contain rounded-2xl shadow-2xl"
            />
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-3 -right-3 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-primary hover:bg-gray-100 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="text-center mt-4 text-white font-medium">
              {displayName}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

