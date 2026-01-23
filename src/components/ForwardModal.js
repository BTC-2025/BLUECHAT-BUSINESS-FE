import { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE } from "../api";
import { socket } from "../socket";
import { useAuth } from "../context/AuthContext";

export default function ForwardModal({ message, onClose }) {
    const { user } = useAuth();
    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [forwarding, setForwarding] = useState(false);

    useEffect(() => {
        const loadChats = async () => {
            try {
                const { data } = await axios.get(`${API_BASE}/chats`, {
                    headers: { Authorization: `Bearer ${user?.token}` }
                });
                // Filter out the current chat
                const filtered = data.filter(c => c.id !== message.chat);
                setChats(filtered);
            } catch (err) {
                console.error("Failed to load chats:", err);
            } finally {
                setLoading(false);
            }
        };
        loadChats();
    }, [user?.token, message.chat]);

    const handleForward = (chatId) => {
        setForwarding(true);
        socket.emit("message:forward", { messageId: message._id, targetChatId: chatId }, (res) => {
            setForwarding(false);
            if (res?.success) {
                onClose();
            } else {
                alert(res?.error || "Failed to forward message");
            }
        });
    };

    if (!message) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[70vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 border-b border-background-dark flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-primary">Forward to...</h3>
                    <button onClick={onClose} className="text-primary/50 hover:text-primary text-2xl">&times;</button>
                </div>

                {/* Message preview */}
                <div className="p-3 bg-background-dark/30 mx-4 mt-4 rounded-lg text-sm text-primary/70 truncate">
                    {message.body || "[attachment]"}
                </div>

                {/* Chat list */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {loading ? (
                        <div className="text-center text-primary/50 py-8">Loading chats...</div>
                    ) : chats.length === 0 ? (
                        <div className="text-center text-primary/50 py-8">No other chats available</div>
                    ) : (
                        chats.map((chat) => (
                            <button
                                key={chat.id}
                                onClick={() => handleForward(chat.id)}
                                disabled={forwarding}
                                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-background-dark transition-colors disabled:opacity-50"
                            >
                                {/* Avatar */}
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-secondary to-secondary-dark flex items-center justify-center text-white font-semibold overflow-hidden">
                                    {!chat.isGroup && chat.other?.avatar ? (
                                        <img src={chat.other.avatar} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        (chat.title || chat.other?.full_name || "?")?.[0]?.toUpperCase()
                                    )}
                                </div>
                                <div className="flex-1 text-left">
                                    <div className="font-medium text-primary">
                                        {chat.isGroup ? chat.title : (chat.other?.full_name || chat.other?.phone)}
                                    </div>
                                    {chat.isGroup && (
                                        <div className="text-xs text-primary/50">Group</div>
                                    )}
                                </div>
                                <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
