import { useState, useEffect } from "react";
import dayjs from "dayjs";
import { socket } from "../socket";
import { useAuth } from "../context/AuthContext";
import { decryptMessage } from "../utils/cryptoUtils";

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

export default function MessageBubble({ message, mine, isGroup, isAdmin, onReply, onForward }) {
  const { user, privateKey } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [decryptedBody, setDecryptedBody] = useState(null);
  const [decryptionFailed, setDecryptionFailed] = useState(false);

  // ✅ E2EE Decryption
  useEffect(() => {
    const decrypt = async () => {
      // 1. Check for multi-recipient keys array first, then fallback to single key (legacy)
      const myKeyObj = Array.isArray(message.encryptedKeys)
        ? message.encryptedKeys.find(k => String(k.user) === String(message.currentUserId))
        : null;

      const encryptedKey = myKeyObj?.key || message.encryptedKey;

      if (message.encryptedBody && encryptedKey && privateKey) {
        try {
          const plainText = await decryptMessage(
            message.encryptedBody,
            encryptedKey,
            privateKey
          );
          setDecryptedBody(plainText);
        } catch (err) {
          console.error("Decryption error:", err);
          setDecryptionFailed(true);
        }
      }
    };
    decrypt();
  }, [message.encryptedBody, message.encryptedKeys, message.encryptedKey, message.currentUserId, privateKey]);

  // ✅ Determine if deleted
  const isDeletedForAll = message.deletedForEveryone;
  const isDeletedForMe =
    Array.isArray(message.deletedFor) &&
    message.deletedFor.includes(message.currentUserId);

  const isDeleted = isDeletedForAll || isDeletedForMe;

  // ✅ Get sender name for group chats
  const senderName = message.sender?.full_name || message.sender?.phone || "Unknown";

  // ✅ Handle emoji reaction
  const handleReaction = (emoji) => {
    socket.emit("message:react", { messageId: message._id, emoji });
    setMenuOpen(false);
  };

  const renderTicks = () => {
    if (isDeleted) return null;
    if (!mine) return null;

    // ✅ If NOT released (scheduled), show a pulsing clock icon
    if (message.isReleased === false) {
      return (
        <span title="Scheduled" className="text-white/60 animate-pulse ml-1">
          <svg className="w-3 h-3 inline pb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </span>
      );
    }

    if (message.status === "seen") return <span className="text-primary-light">✔✔</span>;
    if (message.status === "delivered") return <span className="text-white/50">✔✔</span>;
    return <span className="text-white/30">✔</span>;
  };

  const deleteForMe = () => {
    socket.emit("message:delete", {
      messageId: message._id,
      forEveryone: false
    });
    setMenuOpen(false);
  };

  const deleteForEveryone = () => {
    // ✅ Allow if sender OR admin (admin check is done by UI showing the button)
    if (!mine && !isAdmin) return;
    socket.emit("message:delete", {
      messageId: message._id,
      forEveryone: true
    });
    setMenuOpen(false);
  };

  // ✅ Show Deleted Bubble Only
  if (isDeleted) {
    return (
      <div className={`max-w-[75%] ${mine ? "ml-auto" : ""}`}>
        <div className="bg-slate-100 text-slate-500 italic px-3 py-2 rounded-xl text-sm border border-slate-200">
          This message was deleted
        </div>
      </div>
    );
  }

  // ✅ Check if mentioned
  const isMentioned = (() => {
    if (!message.body || mine) return false;
    const text = decryptedBody || message.body;
    if (!text) return false;

    // Check against user name and phone
    const name = user?.full_name?.split(" ")[0];
    const phone = user?.phone;

    // Regex for @Name or @Phone
    if (name && new RegExp(`@${name}`, "i").test(text)) return true;
    if (phone && new RegExp(`@${phone}`).test(text)) return true;

    return false;
  })();

  const renderText = () => {
    const text = decryptedBody || message.body;
    if (!text) return null;

    const parts = text.split(/(@[a-zA-Z0-9]+)(?=\s|$|\W)/g);

    return parts.map((part, i) => {
      if (part.startsWith("@")) {
        const mentionTarget = part.substring(1);
        const isMe = (user?.full_name && user.full_name.toLowerCase().includes(mentionTarget.toLowerCase())) ||
          (user?.phone && user.phone.includes(mentionTarget));

        return (
          <span
            key={i}
            className={`font-bold ${isMe ? "bg-primary/20 text-primary-dark px-1 rounded" : (mine ? "text-white font-black" : "text-primary")}`}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      {/* ✅ Chat Bubble with modern styling - fits content */}
      <div
        className={`relative inline-block rounded-3xl px-5 py-3 animate-fade-in max-w-[75%] ${mine
          ? "bg-gradient-to-br from-primary via-primary to-[#3375c4] text-white rounded-br-none shadow-premium border border-primary/20"
          : isMentioned
            ? "bg-white border-2 border-primary text-slate-900 rounded-bl-none shadow-card" // ✅ Highlight style
            : "bg-white text-slate-800 rounded-bl-none shadow-card border border-white/60"
          }`}
      >
        {/* ⋮ Menu - inside the bubble */}
        <div className="absolute top-1 right-1 z-50">
          <button
            className={`text-lg leading-none p-1 rounded transition-colors ${mine
              ? "text-white/50 hover:text-white hover:bg-white/10"
              : "text-slate-400 hover:text-primary hover:bg-slate-50"
              }`}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            ⋮
          </button>

          {menuOpen && (
            <div className={`absolute mt-1 bg-white rounded-lg shadow-xl 
                            p-2 text-xs min-w-[140px] border border-slate-100 z-50 ${mine ? "right-0" : "left-0"
              }`}>

              {/* Reaction picker */}
              <div className="flex gap-1 pb-2 mb-2 border-b border-slate-100">
                {REACTION_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(emoji)}
                    className="text-lg hover:scale-125 transition-transform p-0.5"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Reply button */}
              <button
                className="block w-full text-left px-2 py-1 hover:bg-slate-50 rounded text-slate-700"
                onClick={() => {
                  onReply?.(message);
                  setMenuOpen(false);
                }}
              >
                ↪️ Reply
              </button>

              {/* Forward button */}
              <button
                className="block w-full text-left px-2 py-1 hover:bg-slate-50 rounded text-slate-700"
                onClick={() => {
                  onForward?.(message);
                  setMenuOpen(false);
                }}
              >
                ⏩ Forward
              </button>

              {/* Pin/Unpin button */}
              <button
                className="block w-full text-left px-2 py-1 hover:bg-slate-50 rounded text-slate-700"
                onClick={() => {
                  if (message.isPinned) {
                    socket.emit("message:unpin", { messageId: message._id, chatId: message.chat });
                  } else {
                    socket.emit("message:pin", { messageId: message._id, chatId: message.chat });
                  }
                  setMenuOpen(false);
                }}
              >
                {message.isPinned ? "📌 Unpin" : "📌 Pin"}
              </button>

              <button
                className="block w-full text-left px-2 py-1 hover:bg-slate-50 rounded text-slate-700"
                onClick={deleteForMe}
              >
                Delete for me
              </button>

              {/* Show "Delete for everyone" for sender OR admin in groups */}
              {(mine || isAdmin) && (
                <button
                  className="block w-full text-left px-2 py-1 hover:bg-red-50 rounded text-red-600"
                  onClick={deleteForEveryone}
                >
                  Delete for everyone
                </button>
              )}
            </div>
          )}
        </div>

        {/* Tail for bubble */}
        {/* Removed tail for cleaner look, relying on rounded corners logic (rounded-br-none / rounded-bl-none) */}

        {/* ✅ Show sender name for group chats (only for other users' messages) */}
        {isGroup && !mine && (
          <div className="text-[11px] sm:text-xs text-primary font-bold mb-1.5 flex items-center gap-1.5 pr-6">
            <span className="w-5 h-5 rounded-full bg-primary/10 text-primary grid place-items-center text-[8px] font-bold uppercase overflow-hidden">
              {message.sender?.avatar ? (
                <img src={message.sender.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                senderName?.[0] || "?"
              )}
            </span>
            {senderName}
          </div>
        )}

        {/* ✅ Forwarded indicator */}
        {message.forwardedFrom?.originalSender && (
          <div className={`text-xs mb-1 italic ${mine ? "text-white/60" : "text-slate-400"}`}>
            ↪️ Forwarded from {message.forwardedFrom.originalSender.full_name || message.forwardedFrom.originalSender.phone}
          </div>
        )}

        {/* ✅ Reply preview */}
        {message.replyTo && (
          <div className={`text-xs mb-2 p-2 rounded-lg border-l-2 ${mine
            ? "bg-white/10 border-white/40 text-white/80"
            : "bg-slate-50 border-primary/40 text-slate-600"
            }`}>
            <div className="font-semibold text-xs mb-0.5">
              {message.replyTo.sender?.full_name || message.replyTo.sender?.phone || "Unknown"}
            </div>
            <div className="truncate">
              {message.replyTo.body || (message.replyTo.attachments?.length ? "[attachment]" : "")}
            </div>
          </div>
        )}
        {message.attachments && message.attachments.length > 0 && (
          <div className="space-y-2 mb-2">
            {message.attachments.map((att, idx) => (
              <div key={idx}>
                {att.type === "image" ? (
                  <img
                    src={att.url}
                    alt={att.name || "Image"}
                    className="max-w-full max-h-60 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setLightboxImage(att.url)}
                  />
                ) : att.type === "video" ? (
                  <video
                    src={att.url}
                    controls
                    className="max-w-full max-h-60 rounded-lg"
                  />
                ) : att.type === "audio" ? (
                  <div className={`flex items-center gap-3 p-2 rounded-xl ${mine ? "bg-white/10" : "bg-slate-50"
                    }`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${mine ? "bg-white/20" : "bg-primary/10"
                      }`}>
                      <svg className={`w-5 h-5 ${mine ? "text-white" : "text-primary"}`} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1 1.93c-3.94-.49-7-3.85-7-7.93h2c0 3.31 2.69 6 6 6s6-2.69 6-6h2c0 4.08-3.06 7.44-7 7.93V22h-2v-6.07z" />
                      </svg>
                    </div>
                    <audio
                      src={att.url}
                      controls
                      className="h-8 flex-1"
                      style={{ minWidth: "150px" }}
                    />
                  </div>
                ) : (
                  <a
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${mine ? "bg-white/10 hover:bg-white/20" : "bg-slate-50 hover:bg-slate-100"
                      }`}
                  >
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-sm truncate">{att.name || "Download file"}</span>
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ✅ Image Lightbox */}
        {lightboxImage && (
          <div
            className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4"
            onClick={() => setLightboxImage(null)}
          >
            <button
              className="absolute top-4 right-4 text-white text-3xl hover:text-gray-300 transition-colors"
              onClick={() => setLightboxImage(null)}
            >
              ×
            </button>
            <img
              src={lightboxImage}
              alt="Full size"
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

        {/* ✅ Check if message has 5+ lines - show as code block */}
        {message.body && message.body.split('\n').length >= 5 ? (
          <div className="relative">
            {/* Copy Button */}
            <button
              onClick={() => {
                navigator.clipboard.writeText(message.body);
                const btn = document.getElementById(`copy-btn-${message._id}`);
                if (btn) {
                  btn.textContent = '✓ Copied';
                  setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
                }
              }}
              id={`copy-btn-${message._id}`}
              className="absolute top-2 right-2 text-[10px] sm:text-xs bg-white text-primary px-2.5 py-1 rounded-md transition-all font-medium hover:bg-white/90"
            >
              Copy
            </button>
            {/* Code Block */}
            <div className={`rounded-xl p-3 pt-8 overflow-x-auto text-xs sm:text-sm font-mono ${mine ? "bg-black/20" : "bg-slate-50 border border-slate-200"
              }`}>
              <pre className="whitespace-pre-wrap break-words">{message.body}</pre>
            </div>
          </div>
        ) : (message.body || decryptedBody) ? (
          <div className="whitespace-pre-wrap text-sm sm:text-base break-words leading-relaxed font-sans">
            {renderText()}
            {decryptionFailed && <span className="text-red-400 block text-xs mt-1">(Decryption failed)</span>}
          </div>
        ) : null}

        {/* ✅ Ticks + Time */}
        <div className={`text-[10px] text-right mt-1.5 flex gap-1.5 items-center justify-end font-medium ${mine ? "text-white/60" : "text-slate-400"
          }`}>
          {message.encryptedBody && (
            <span title="End-to-end encrypted" className="opacity-70">🔒</span>
          )}
          <span>{dayjs(message.createdAt).format("HH:mm")}</span>
          {renderTicks()}
        </div>

        {/* ✅ Reactions display */}
        {message.reactions && message.reactions.length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1 ${mine ? "justify-end" : "justify-start"}`}>
            {Object.entries(
              message.reactions.reduce((acc, r) => {
                acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                return acc;
              }, {})
            ).map(([emoji, count]) => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                className={`text-xs px-1.5 py-0.5 rounded-full flex items-center gap-0.5 transition-colors ${mine ? "bg-white/20 hover:bg-white/30" : "bg-slate-100 hover:bg-slate-200"
                  }`}
              >
                <span>{emoji}</span>
                <span className={mine ? "text-white/70" : "text-primary/60"}>{count}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

