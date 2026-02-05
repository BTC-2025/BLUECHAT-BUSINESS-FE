import React from 'react';
import { useAuth } from '../context/AuthContext';


export default function NavRail({ activeTab, onTabChange, onOpenProfile }) {
    const { user } = useAuth();

    const tabs = [
        { id: 'chats', icon: '💬', label: 'Chats' },
        { id: 'social', icon: '🌐', label: 'Social' }, // ✅ Added Social Tab
        { id: 'communities', icon: '👨‍👩‍👧‍👦', label: 'Communities' },
        { id: 'groups', icon: '👥', label: 'Groups' },
        ...(user?.isBusiness ? [{ id: 'my-business', icon: '🏢', label: 'My Business' }] : []),
        { id: 'calls', icon: '📞', label: 'Calls' },
        { id: 'status', icon: '🕒', label: 'Status' },
        { id: 'settings', icon: '⚙️', label: 'Settings' },
    ];

    return (
        <div className="
            w-full h-[64px] 
            md:w-[72px] md:h-full 
            bg-transparent border-none
            flex flex-row md:flex-col items-center 
            px-4 md:px-0 py-0 md:py-6 gap-2 md:gap-6 
            z-50 
            fixed bottom-0 md:relative
        ">
            {/* Logo Removed */}

            {/* Navigation Icons */}
            <div className="flex-1 flex flex-row items-center md:flex-col justify-around md:justify-start md:gap-6 w-full pt-4">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        className={`
                            w-12 h-12 md:w-14 md:h-14 
                            rounded-2xl flex items-center justify-center 
                            transition-all duration-300 group relative 
                            ${activeTab === tab.id
                                ? 'bg-primary/10 text-primary shadow-glow ring-2 ring-primary/20'
                                : 'text-slate-400 hover:bg-primary/5 hover:text-primary'
                            }
                        `}
                        title={tab.label}
                    >
                        <span className="text-xl group-hover:scale-110 transition-transform">
                            {tab.id === 'chats' && (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                            )}
                            {tab.id === 'favorites' && (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.382-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                </svg>
                            )}
                            {tab.id === 'social' && (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                </svg>
                            )}
                            {tab.id === 'communities' && (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            )}
                            {tab.id === 'groups' && (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            )}
                            {tab.id === 'archived' && (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                </svg>
                            )}
                            {tab.id === 'calls' && (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                            )}
                            {tab.id === 'status' && (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            )}
                            {tab.id === 'my-business' && (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            )}
                            {tab.id === 'blocked' && (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                            )}
                            {tab.id === 'settings' && (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            )}
                        </span>
                        {activeTab === tab.id && (
                            <div className="absolute left-0 md:left-0 bottom-0 md:bottom-auto w-full md:w-1 h-1 md:h-8 bg-primary rounded-t-full md:rounded-r-full shadow-[0_0_10px_rgba(25,91,172,0.5)]" />
                        )}
                    </button>
                ))}
            </div>

            {/* Profile Avatar (Bottom/End) */}
            <button
                onClick={onOpenProfile}
                className="w-10 h-10 md:w-12 md:h-12 rounded-2xl overflow-hidden border-2 border-white/50 hover:border-primary transition-all duration-300 ring-2 ring-white/0 hover:ring-primary/20 shadow-md"
            >
                {user?.avatar ? (
                    <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                        {user?.full_name?.[0] || '?'}
                    </div>
                )}
            </button>
        </div>
    );
}
