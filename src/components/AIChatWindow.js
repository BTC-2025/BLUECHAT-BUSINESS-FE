import React, { useState, useEffect, useRef } from 'react';

export default function AIChatWindow({ onBack }) {
    const [messages, setMessages] = useState([
        { id: 1, sender: 'benly', body: "Hello! I am Benly, your AI assistant. How can I help you today?", createdAt: new Date() }
    ]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages, isTyping]);

    const handleSend = (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg = {
            id: Date.now(),
            sender: 'me',
            body: input.trim(),
            createdAt: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setIsTyping(true);

        // AI Logic
        setTimeout(() => {
            const lowerInput = userMsg.body.toLowerCase();
            let replyText = "I'm still learning. Can you try asking differently?";

            if (['hi', 'hello', 'hey'].some(w => lowerInput.includes(w))) {
                replyText = "Hello! I am Benly, your AI assistant.";
            } else if (lowerInput.includes('help')) {
                replyText = "I can help you with checking prices, product details, or general navigation.";
            } else if (lowerInput.includes('price') || lowerInput.includes('cost')) {
                replyText = "Our pricing varies based on the service. Please check our catalog or contact support for a quote.";
            } else if (lowerInput.includes('bye')) {
                replyText = "Goodbye! Have a great day!";
            } else if (lowerInput.includes('thank')) {
                replyText = "You're welcome!";
            }

            const aiMsg = {
                id: Date.now() + 1,
                sender: 'benly',
                body: replyText,
                createdAt: new Date()
            };

            setMessages(prev => [...prev, aiMsg]);
            setIsTyping(false);
        }, 1500);
    };

    return (
        <div className="flex flex-col h-full bg-[#0b101a] text-white">
            {/* Header */}
            <div className="h-16 border-b border-white/10 flex items-center px-4 gap-4 bg-[#0b101a]/95 backdrop-blur z-10">
                <button onClick={onBack} className="md:hidden p-2 -ml-2 text-slate-400 hover:text-white">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                </div>
                <div>
                    <div className="font-bold">Benly AI</div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <div className="text-xs text-emerald-400 font-medium">Online</div>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {messages.map((msg) => {
                    const isMe = msg.sender === 'me';
                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`
                max-w-[80%] md:max-w-[60%] p-3 rounded-2xl
                ${isMe
                                    ? 'bg-primary text-white rounded-tr-none'
                                    : 'bg-white/10 text-slate-200 rounded-tl-none'
                                }
              `}>
                                <div>{msg.body}</div>
                                <div className="text-[10px] opacity-50 mt-1 text-right">
                                    {msg.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>
                    );
                })}
                {isTyping && (
                    <div className="flex justify-start">
                        <div className="bg-white/10 p-3 rounded-2xl rounded-tl-none flex gap-1 items-center">
                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-white/10 bg-[#0b101a]">
                <form onSubmit={handleSend} className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type a message to Benly..."
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-colors"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim()}
                        className="bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </button>
                </form>
            </div>
        </div>
    );
}
