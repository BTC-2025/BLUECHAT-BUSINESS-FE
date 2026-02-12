import React from 'react';
// import axios from 'axios'; // Removed: not used
// import { API_BASE } from '../api'; // Removed: not used
// import { useAuth } from '../context/AuthContext'; // Removed: user is not used

export default function NewChatSection({ onBack, onNewGroup, onNewContact, onNewCommunity, onDialNumber /* Removed: onOpenChat is not used */ }) {
    // const { user } = useAuth(); // Removed: user is not used
    // const [contacts, setContacts] = useState([]); // Removed: not used
    // const [loading, setLoading] = useState(true); // Removed: not used

    // useEffect(() => { // Removed: not used
    //     // Placeholder for future contact fetching logic
    //     setLoading(false);
    // }, []);

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] animate-fade-in">
            {/* Header */}
            <div className="p-4 flex items-center gap-3 border-b border-slate-200">
                <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" /></svg>
                </button>
                <div>
                    <h2 className="text-lg font-black text-slate-900">New chat</h2>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                {/* Actions List */}
                <div className="space-y-1 mb-6">
                    <button onClick={onNewGroup} className="w-full flex items-center gap-4 p-3 hover:bg-slate-50 rounded-xl transition-all group text-left">
                        <div className="w-12 h-12 rounded-full bg-secondary/10 text-secondary flex items-center justify-center group-hover:bg-secondary group-hover:text-white transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                        </div>
                        <span className="font-bold text-slate-800 group-hover:text-secondary transition-colors">New group</span>
                    </button>

                    <button onClick={onNewContact} className="w-full flex items-center gap-4 p-3 hover:bg-slate-50 rounded-xl transition-all group text-left">
                        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                        </div>
                        <span className="font-bold text-slate-800 group-hover:text-primary transition-colors">New contact</span>
                    </button>

                    <button onClick={onNewCommunity} className="w-full flex items-center gap-4 p-3 hover:bg-slate-50 rounded-xl transition-all group text-left">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                        </div>
                        <span className="font-bold text-slate-800 group-hover:text-emerald-500 transition-colors">New community</span>
                    </button>

                    <button onClick={onDialNumber} className="w-full flex items-center gap-4 p-3 hover:bg-slate-50 rounded-xl transition-all group text-left">
                        <div className="w-12 h-12 rounded-full bg-blue-400/10 text-blue-400 flex items-center justify-center group-hover:bg-blue-400 group-hover:text-white transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                        </div>
                        <span className="font-bold text-slate-800 group-hover:text-blue-400 transition-colors">Dial Number</span>
                    </button>
                </div>

                {/* Contacts Header */}
                <div className="px-3 mb-2">
                    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest">Contacts</h3>
                </div>

                {/* Placeholder for Contacts List */}
                <div className="px-3 text-slate-400 text-sm italic">
                    Use "New contact" to find people.
                </div>

            </div>
        </div>
    );
}
