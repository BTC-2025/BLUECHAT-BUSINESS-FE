// import { useState } from "react";
// import dayjs from "dayjs";
// import { socket } from "../socket";

// export default function MessageBubble({ mine, text, time, status, messageId, chatId }) {
//   const [menuOpen, setMenuOpen] = useState(false);

//   const renderTicks = () => {
//     if (!mine) return null;

//     if (status === "seen") return <span className="text-blue-400">✔✔</span>;
//     if (status === "delivered") return <span className="text-gray-300">✔✔</span>;
//     return <span className="text-gray-300">✔</span>;
//   };

//   const deleteForMe = () => {
//     socket.emit("message:delete", { messageId, forEveryone: false });
//     setMenuOpen(false);
//   };

//   const deleteForEveryone = () => {
//     if (!mine) return; // Only sender can delete for everyone
//     socket.emit("message:delete", { messageId, forEveryone: true });
//     setMenuOpen(false);
//   };

//   return (
//     <div className={`relative max-w-[75%] ${mine ? "ml-auto" : ""}`}>
//       {/* 3-dot menu button */}
//       <div className="absolute -top-2 -right-2">
//         <button
//           className="text-neutral-400 text-sm hover:text-neutral-200"
//           onClick={() => setMenuOpen(!menuOpen)}
//         >
//           ⋮
//         </button>

//         {/* Dropdown menu */}
//         {menuOpen && (
//           <div className="absolute right-0 mt-1 bg-neutral-800 rounded-lg shadow-lg p-2 text-xs min-w-[120px] border border-neutral-700 z-20">
//             <button
//               className="block w-full text-left px-2 py-1 hover:bg-neutral-700 rounded"
//               onClick={deleteForMe}
//             >
//               Delete for me
//             </button>

//             {mine && (
//               <button
//                 className="block w-full text-left px-2 py-1 hover:bg-neutral-700 rounded text-red-400"
//                 onClick={deleteForEveryone}
//               >
//                 Delete for everyone
//               </button>
//             )}
//           </div>
//         )}
//       </div>

//       {/* Bubble */}
//       <div
//         className={`rounded-2xl px-4 py-2 ${
//           mine ? "bg-teal-700" : "bg-neutral-800"
//         }`}
//       >
//         <div className="whitespace-pre-wrap">{text}</div>

//         {/* Time + ticks */}
//         <div className="text-[10px] text-neutral-300 text-right mt-1 flex gap-1 justify-end items-center">
//           <span>{dayjs(time).format("HH:mm")}</span>
//           {renderTicks()}
//         </div>
//       </div>
//     </div>
//   );
// }


// import { useState } from "react";
// import dayjs from "dayjs";
// import { socket } from "../socket";

// export default function MessageBubble({ message, mine }) {
//   const [menuOpen, setMenuOpen] = useState(false);

//   const isDeletedForAll = message.deletedForEveryone;
//   const isDeletedForMe = message.deletedFor?.includes?.(message.currentUserId);

//   const isDeleted = isDeletedForAll || isDeletedForMe;

//   const renderTicks = () => {
//     if (isDeleted) return null;
//     if (!mine) return null;

//     if (message.status === "seen") return <span className="text-blue-400">✔✔</span>;
//     if (message.status === "delivered") return <span className="text-gray-300">✔✔</span>;
//     return <span className="text-gray-300">✔</span>;
//   };

//   const deleteForMe = () => {
//     socket.emit("message:delete", {
//       messageId: message._id,
//       forEveryone: false
//     });
//     setMenuOpen(false);
//   };

//   const deleteForEveryone = () => {
//     if (!mine) return;
//     socket.emit("message:delete", {
//       messageId: message._id,
//       forEveryone: true
//     });
//     setMenuOpen(false);
//   };

//   // ✅ Deleted UI (WhatsApp style)
//   if (isDeleted) {
//     return (
//       <div className={`max-w-[75%] ${mine ? "ml-auto" : ""}`}>
//         <div className="bg-neutral-800 text-neutral-400 italic px-3 py-2 rounded-xl text-sm">
//           This message was deleted
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className={`relative max-w-[75%] ${mine ? "ml-auto" : ""}`}>

//       {/* Menu button */}
//       <div className="absolute -top-2 -right-2 z-20">
//         <button
//           className="text-neutral-400 text-sm hover:text-neutral-200"
//           onClick={() => setMenuOpen(!menuOpen)}
//         >
//           ⋮
//         </button>

//         {menuOpen && (
//           <div className="absolute right-0 mt-1 bg-neutral-800 rounded-lg 
//                           shadow-lg p-2 text-xs min-w-[140px] 
//                           border border-neutral-700 z-30">

//             {/* DELETE FOR ME */}
//             <button
//               className="block w-full text-left px-2 py-1 hover:bg-neutral-700 rounded"
//               onClick={deleteForMe}
//             >
//               Delete for me
//             </button>

//             {/* DELETE FOR EVERYONE — only sender */}
//             {mine && (
//               <button
//                 className="block w-full text-left px-2 py-1 hover:bg-neutral-700 rounded text-red-400"
//                 onClick={deleteForEveryone}
//               >
//                 Delete for everyone
//               </button>
//             )}
//           </div>
//         )}
//       </div>

//       {/* Bubble */}
//       <div
//         className={`rounded-2xl px-4 py-2 ${
//           mine ? "bg-teal-700" : "bg-neutral-800"
//         }`}
//       >
//         {/* Message text */}
//         <div className="whitespace-pre-wrap">{message.body}</div>

//         {/* Time + ticks */}
//         <div className="text-[10px] text-neutral-300 text-right mt-1 flex gap-1 items-center">
//           <span>{dayjs(message.createdAt).format("HH:mm")}</span>
//           {renderTicks()}
//         </div>
//       </div>
//     </div>
//   );
// }


import { useState, useEffect } from "react";
import dayjs from "dayjs";
import { socket } from "../socket";
import { useAuth } from "../context/AuthContext";
import { decryptMessage } from "../utils/cryptoUtils";

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

export default function MessageBubble({ message, mine, isGroup, isAdmin, onReply, onForward }) {
  const { privateKey } = useAuth();
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

    if (message.status === "seen") return <span className="text-blue-400">✔✔</span>;
    if (message.status === "delivered") return <span className="text-gray-300">✔✔</span>;
    return <span className="text-gray-300">✔</span>;
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
        <div className="bg-background-dark text-primary/50 italic px-3 py-2 rounded-xl text-sm">
          This message was deleted
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      {/* ✅ Chat Bubble with modern styling - fits content */}
      <div
        className={`relative inline-block rounded-2xl px-4 py-2.5 animate-fade-in max-w-[75%] ${mine
          ? "bg-gradient-to-br from-primary to-primary-light text-white rounded-br-md shadow-bubble"
          : "bg-white text-primary rounded-bl-md shadow-card border border-background-dark/50"
          }`}
      >
        {/* ⋮ Menu - inside the bubble */}
        <div className="absolute top-1 right-1 z-50">
          <button
            className={`text-lg leading-none p-1 rounded transition-colors ${mine
              ? "text-white/50 hover:text-white hover:bg-white/10"
              : "text-primary/40 hover:text-primary hover:bg-black/5"
              }`}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            ⋮
          </button>

          {menuOpen && (
            <div className={`absolute mt-1 bg-white rounded-lg shadow-xl 
                            p-2 text-xs min-w-[140px] border border-background-dark z-50 ${mine ? "right-0" : "left-0"
              }`}>

              {/* Reaction picker */}
              <div className="flex gap-1 pb-2 mb-2 border-b border-background-dark">
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
                className="block w-full text-left px-2 py-1 hover:bg-background-dark rounded text-primary"
                onClick={() => {
                  onReply?.(message);
                  setMenuOpen(false);
                }}
              >
                ↩️ Reply
              </button>

              {/* Forward button */}
              <button
                className="block w-full text-left px-2 py-1 hover:bg-background-dark rounded text-primary"
                onClick={() => {
                  onForward?.(message);
                  setMenuOpen(false);
                }}
              >
                ↪️ Forward
              </button>

              {/* Pin/Unpin button */}
              <button
                className="block w-full text-left px-2 py-1 hover:bg-background-dark rounded text-secondary-dark"
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
                className="block w-full text-left px-2 py-1 hover:bg-background-dark rounded text-primary"
                onClick={deleteForMe}
              >
                Delete for me
              </button>

              {/* Show "Delete for everyone" for sender OR admin in groups */}
              {(mine || isAdmin) && (
                <button
                  className="block w-full text-left px-2 py-1 hover:bg-background-dark rounded text-red-500"
                  onClick={deleteForEveryone}
                >
                  Delete for everyone
                </button>
              )}
            </div>
          )}
        </div>

        {/* Tail for bubble */}
        <div className={`absolute bottom-0 w-3 h-3 ${mine
          ? "right-0 translate-x-1/2 bg-primary-light"
          : "left-0 -translate-x-1/2 bg-white border-l border-b border-background-dark/50"
          }`} style={{
            clipPath: mine ? 'polygon(0 0, 100% 100%, 0 100%)' : 'polygon(100% 0, 100% 100%, 0 100%)'
          }} />

        {/* ✅ Show sender name for group chats (only for other users' messages) */}
        {isGroup && !mine && (
          <div className="text-[11px] sm:text-xs text-secondary-dark font-bold mb-1.5 flex items-center gap-1.5 pr-6">
            <span className="w-5 h-5 rounded-full bg-gradient-to-br from-secondary to-secondary-dark text-white grid place-items-center text-[8px] font-bold uppercase overflow-hidden">
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
          <div className={`text-xs mb-1 italic ${mine ? "text-white/60" : "text-primary/50"}`}>
            ↪️ Forwarded from {message.forwardedFrom.originalSender.full_name || message.forwardedFrom.originalSender.phone}
          </div>
        )}

        {/* ✅ Reply preview */}
        {message.replyTo && (
          <div className={`text-xs mb-2 p-2 rounded-lg border-l-2 ${mine
            ? "bg-white/10 border-white/40 text-white/80"
            : "bg-background-dark/50 border-secondary/60 text-primary/70"
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
                  <div className={`flex items-center gap-3 p-2 rounded-xl ${mine ? "bg-white/10" : "bg-background-dark/50"
                    }`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${mine ? "bg-white/20" : "bg-secondary/20"
                      }`}>
                      <svg className={`w-5 h-5 ${mine ? "text-white" : "text-secondary"}`} fill="currentColor" viewBox="0 0 24 24">
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
                    className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${mine ? "bg-white/10 hover:bg-white/20" : "bg-background-dark hover:bg-background-dark/80"
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
              className="absolute top-2 right-2 text-[10px] sm:text-xs bg-primary/90 hover:bg-primary text-white px-2.5 py-1 rounded-md transition-all font-medium"
            >
              Copy
            </button>
            {/* Code Block */}
            <div className={`rounded-xl p-3 pt-8 overflow-x-auto text-xs sm:text-sm font-mono ${mine ? "bg-primary-dark/50" : "bg-background-dark/70"
              }`}>
              <pre className="whitespace-pre-wrap break-words">{message.body}</pre>
            </div>
          </div>
        ) : (message.body || decryptedBody) ? (
          <div className="whitespace-pre-wrap text-sm sm:text-base break-words leading-relaxed">
            {(() => {
              const text = decryptedBody || message.body;
              if (!text) return null;

              // Mention highlighting regex: @ followed by non-space characters
              // Since we inject names like "@John Doe ", they might have spaces.
              // We'll use a simpler approach: match @ followed by any word chars or spaces until another @ or end
              // Better: match against actual group members if we had them, OR use a regex that handles names.
              // Let's use a regex that matches @Name until a space or next mention.
              const parts = text.split(/(@[a-zA-Z0-9\s]+?)(?=\s@|$|\s\W|\s\n)/g);

              return parts.map((part, i) => {
                if (part.startsWith("@")) {
                  return (
                    <span
                      key={i}
                      className={`font-black ${mine ? "text-secondary" : "text-primary-light"}`}
                    >
                      {part}
                    </span>
                  );
                }
                return part;
              });
            })()}
            {decryptionFailed && <span className="text-red-400 block text-xs mt-1">(Decryption failed)</span>}
          </div>
        ) : null}

        {/* ✅ Ticks + Time */}
        <div className={`text-[10px] text-right mt-1.5 flex gap-1.5 items-center justify-end font-medium ${mine ? "text-white/60" : "text-primary/40"
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
                className={`text-xs px-1.5 py-0.5 rounded-full flex items-center gap-0.5 transition-colors ${mine ? "bg-white/20 hover:bg-white/30" : "bg-background-dark hover:bg-background-dark/70"
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

