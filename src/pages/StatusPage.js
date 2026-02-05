import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { API_BASE } from "../api";
import StatusPrivacyModal from "../components/StatusPrivacyModal";

export default function StatusPage({ onBack }) {
    const { user } = useAuth();
    const [statusGroups, setStatusGroups] = useState([]);
    const [selectedGroupIdx, setSelectedGroupIdx] = useState(null); // ✅ Default to null (No auto-play)
    const [currentStatusIdx, setCurrentStatusIdx] = useState(0);
    const [progress, setProgress] = useState(0);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [showViewers, setShowViewers] = useState(false);
    const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
    const [pendingFile, setPendingFile] = useState(null);

    const fetchStatuses = useCallback(async () => {
        try {
            const { data } = await axios.get(`${API_BASE}/status`, {
                headers: { Authorization: `Bearer ${user?.token}` }
            });
            setStatusGroups(data);
            setLoading(false);
        } catch (err) {
            console.error("Failed to fetch statuses:", err);
            setLoading(false);
        }
    }, [user?.token]);

    useEffect(() => {
        if (user?.token) fetchStatuses();
    }, [user?.token, fetchStatuses]);

    const myGroup = statusGroups.find(g => g.user._id === user?.id);
    const otherGroups = statusGroups.filter(g => g.user._id !== user?.id);

    const currentGroup = selectedGroupIdx !== null ? statusGroups[selectedGroupIdx] : null;
    const currentStatus = currentGroup?.statuses?.[currentStatusIdx];
    const isMine = currentGroup?.user?._id === user?.id;

    const handleNext = useCallback(() => {
        if (!currentGroup) return;
        if (currentStatusIdx < currentGroup.statuses.length - 1) {
            setCurrentStatusIdx(currentStatusIdx + 1);
        } else if (selectedGroupIdx < statusGroups.length - 1) {
            const nextIdx = selectedGroupIdx + 1;
            setSelectedGroupIdx(nextIdx);
            setCurrentStatusIdx(0);
        } else {
            setSelectedGroupIdx(null);
        }
    }, [currentGroup, currentStatusIdx, selectedGroupIdx, statusGroups.length]);

    // Progress bar and auto-advance
    useEffect(() => {
        if (!currentStatus || showViewers) return; // ✅ Pause if viewers list is open

        setProgress(0);
        const duration = 5000;
        const interval = 50;
        const step = (interval / duration) * 100;

        const timer = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 100) {
                    handleNext();
                    return 0;
                }
                return prev + step;
            });
        }, interval);

        return () => clearInterval(timer);
    }, [currentStatus, showViewers, handleNext]); // ✅ Added showViewers dependency

    // Track views
    useEffect(() => {
        if (currentStatus && !isMine && !currentStatus.viewedBy?.includes(user?.id)) {
            axios.post(`${API_BASE}/status/view/${currentStatus._id}`, {}, {
                headers: { Authorization: `Bearer ${user?.token}` }
            }).catch(e => console.error("View track failed", e));
        }
    }, [currentStatus, isMine, user?.id, user?.token]);

    const handlePrev = () => {
        if (!currentGroup) return;
        if (currentStatusIdx > 0) {
            setCurrentStatusIdx(currentStatusIdx - 1);
        } else if (selectedGroupIdx > 0) {
            const prevIdx = selectedGroupIdx - 1;
            setSelectedGroupIdx(prevIdx);
            setCurrentStatusIdx(statusGroups[prevIdx].statuses.length - 1);
        }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setPendingFile(file);
        setPrivacyModalOpen(true);
        // Reset input so same file can be selected again if needed
        e.target.value = "";
    };

    const handleConfirmPrivacy = async (visibleTo) => {
        setPrivacyModalOpen(false);
        if (!pendingFile) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", pendingFile);
            const uploadRes = await axios.post(`${API_BASE}/upload`, formData, {
                headers: { Authorization: `Bearer ${user?.token}`, "Content-Type": "multipart/form-data" }
            });

            await axios.post(`${API_BASE}/status`,
                {
                    content: uploadRes.data.url,
                    type: "image",
                    visibleTo: visibleTo // ✅ Pass the privacy list
                },
                { headers: { Authorization: `Bearer ${user?.token}` } }
            );

            await fetchStatuses();
            setPendingFile(null);
        } catch (err) {
            console.error("Upload failed:", err);
            alert("Failed to upload status.");
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteStatus = async () => {
        if (!window.confirm("Delete this status?")) return;
        try {
            await axios.delete(`${API_BASE}/status/${currentStatus._id}`, {
                headers: { Authorization: `Bearer ${user?.token}` }
            });
            await fetchStatuses();
            if (currentGroup.statuses.length === 1) {
                setSelectedGroupIdx(null);
            } else {
                handleNext();
            }
        } catch (err) {
            console.error("Delete failed:", err);
        }
    };

    if (loading) return (
        <div className="h-screen w-screen bg-black flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-white/20 border-t-white animate-spin rounded-full" />
        </div>
    );

    return (
        <div className="h-screen w-screen bg-slate-950 flex relative overflow-hidden select-none">
            {/* Background Layer (Blurred) */}
            {currentStatus ? (
                <div
                    className="absolute inset-0 opacity-40 blur-3xl scale-110 pointer-events-none transition-all duration-1000"
                    style={{ backgroundImage: `url(${currentStatus.content})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                />
            ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-black pointer-events-none" />
            )}

            {/* LEFT SIDEBAR - Responsive: Hidden on mobile when viewing status */}
            <div className={`w-full md:w-[400px] flex flex-col bg-slate-900/60 backdrop-blur-3xl border-r border-white/5 z-50 overflow-hidden ${selectedGroupIdx !== null ? 'hidden md:flex' : 'flex'}`}>
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between sticky top-0 bg-slate-900/20 backdrop-blur-xl z-20">
                    <div>
                        <h2 className="text-white font-black text-2xl tracking-tight">Stories</h2>
                        <p className="text-white/40 text-xs font-medium mt-0.5">Share your moments</p>
                    </div>
                    <button onClick={onBack} title="Back to Chats" className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-all text-white/70 hover:text-white hover:scale-110 active:scale-95">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar">
                    {/* MY STATUS SECTION */}
                    <div>
                        <div className="px-2 py-2 text-white/30 text-[10px] uppercase font-black tracking-[0.2em] mb-1">My Story</div>
                        <div className="flex items-center gap-4 p-4 rounded-3xl transition-all bg-gradient-to-br from-white/5 to-white/0 border border-white/5 hover:border-white/10 group cursor-pointer relative overflow-hidden">
                            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />

                            <div className="relative z-10" onClick={() => fileInputRef.current?.click()}>
                                <div className={`w-14 h-14 rounded-full p-[2px] ${myGroup ? 'bg-gradient-to-tr from-primary to-blue-400' : 'bg-white/10'}`}>
                                    <div className="w-full h-full rounded-full border-2 border-slate-900 overflow-hidden bg-slate-800">
                                        {user?.avatar ? <img src={user.avatar} alt={user.full_name} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500" /> : <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">{user?.full_name?.[0]}</div>}
                                    </div>
                                </div>
                                {!myGroup && <div className="absolute bottom-0 right-0 w-5 h-5 bg-primary rounded-full flex items-center justify-center text-white border-2 border-slate-900 text-sm font-bold shadow-lg">+</div>}
                            </div>

                            <div className="flex-1 flex items-center justify-between z-10">
                                <div onClick={() => {
                                    if (myGroup) {
                                        setSelectedGroupIdx(statusGroups.findIndex(g => g.user._id === user.id));
                                        setCurrentStatusIdx(0);
                                    } else {
                                        fileInputRef.current?.click();
                                    }
                                }}>
                                    <div className="text-white font-bold text-base group-hover:text-primary transition-colors">My Status</div>
                                    <div className="text-white/40 text-xs font-medium mt-0.5">{myGroup ? `${myGroup.statuses.length} updates` : 'Touch to add update'}</div>
                                </div>
                                <button onClick={() => fileInputRef.current?.click()} className="p-3 text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition-all">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* RECENT UPDATES SECTION */}
                    {otherGroups.length > 0 && (
                        <div>
                            <div className="px-2 py-2 text-white/30 text-[10px] uppercase font-black tracking-[0.2em] mb-1">Recent Updates</div>
                            <div className="space-y-1">
                                {otherGroups.map((g) => {
                                    const globalIdx = statusGroups.findIndex(sg => sg.user._id === g.user._id);
                                    const hasUnviewed = g.statuses.some(s => !s.viewedBy?.some(v => (v._id || v) === user?.id));

                                    return (
                                        <div
                                            key={g.user._id}
                                            onClick={() => { setSelectedGroupIdx(globalIdx); setCurrentStatusIdx(0); }}
                                            className={`flex items-center gap-4 p-4 rounded-3xl cursor-pointer transition-all duration-300 group ${globalIdx === selectedGroupIdx ? 'bg-white/10 shadow-lg border border-white/10' : 'hover:bg-white/5 border border-transparent'}`}
                                        >
                                            <div className={`w-14 h-14 rounded-full p-[2px] transition-all duration-500 relative ${hasUnviewed ? 'bg-gradient-to-tr from-[#0088cc] via-[#36a3ff] to-[#0088cc] animate-gradient-xy shadow-[0_0_20px_rgba(0,136,204,0.3)]' : 'bg-white/10'}`}>
                                                <div className="w-full h-full rounded-full border-2 border-slate-900 overflow-hidden bg-slate-800 relative z-10">
                                                    {g.user.avatar ? <img src={g.user.avatar} alt={g.user.full_name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" /> : <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">{g.user.full_name?.[0]}</div>}
                                                </div>
                                            </div>
                                            <div className="flex-1 overflow-hidden">
                                                <div className={`text-white font-bold text-base truncate transition-colors ${hasUnviewed ? 'text-white' : 'text-white/60 group-hover:text-white/90'}`}>{g.user.full_name}</div>
                                                <div className="text-white/30 text-xs font-medium truncate mt-0.5 flex items-center gap-1.5">
                                                    <span>{new Date(g.statuses[0].createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    {hasUnviewed && <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-glow-sm"></span>}
                                                </div>
                                            </div>
                                            <svg className={`w-5 h-5 text-white/20 group-hover:text-white/60 transition-all transform ${globalIdx === selectedGroupIdx ? 'translate-x-0' : '-translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} /></svg>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* VIEWER AREA - Responsive: Hidden on mobile when list is visible */}
            <div className={`flex-1 flex flex-col relative h-full ${selectedGroupIdx === null ? 'hidden md:flex' : 'flex'}`}>
                {currentStatus ? (
                    <>
                        <div className="absolute top-0 inset-x-0 p-6 pt-12 md:pt-6 z-[60] flex flex-col gap-5 bg-gradient-to-b from-black/90 via-black/40 to-transparent">
                            {/* Improved Progress Bar */}
                            <div className="flex gap-1.5 w-full max-w-[600px] mx-auto">
                                {currentGroup.statuses.map((_, idx) => (
                                    <div key={idx} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
                                        <div
                                            className={`h-full bg-white transition-all duration-100 ease-linear ${idx === currentStatusIdx ? 'shadow-[0_0_10px_white]' : ''}`}
                                            style={{ width: idx < currentStatusIdx ? "100%" : idx === currentStatusIdx ? `${progress}%` : "0%" }}
                                        />
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center justify-between w-full max-w-[600px] mx-auto mt-2">
                                <div className="flex items-center gap-4">
                                    <button onClick={() => setSelectedGroupIdx(null)} className="md:hidden text-white p-2 hover:bg-white/10 rounded-full transition-colors">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                                    </button>
                                    <div className="flex items-center gap-3 group cursor-pointer">
                                        <div className="w-11 h-11 rounded-full border-2 border-white/20 overflow-hidden bg-white/10 shadow-lg relative group-hover:border-white/40 transition-colors">
                                            {currentGroup?.user?.avatar ? <img src={currentGroup.user.avatar} alt={currentGroup.user.full_name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-white font-bold">{currentGroup?.user?.full_name?.[0]}</div>}
                                        </div>
                                        <div className="flex flex-col">
                                            <div className="text-white font-bold text-base leading-tight drop-shadow-md group-hover:text-primary transition-colors">{currentGroup?.user?.full_name}</div>
                                            <div className="text-white/70 text-xs font-medium drop-shadow-sm flex items-center gap-1">
                                                {new Date(currentStatus.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                <span className="w-0.5 h-0.5 bg-white/60 rounded-full"></span>
                                                Today
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {isMine && (
                                        <>
                                            <button
                                                onClick={() => {
                                                    const newShow = !showViewers;
                                                    setShowViewers(newShow);
                                                    if (newShow) fetchStatuses();
                                                }}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md transition-all font-bold text-xs ${showViewers ? 'bg-white text-black' : 'bg-black/30 text-white border border-white/10 hover:bg-white/10'}`}
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                <span>{currentStatus.viewedBy?.length || 0}</span>
                                            </button>
                                            <button onClick={handleDeleteStatus} className="text-white/60 hover:text-red-400 p-2.5 transition-colors rounded-full hover:bg-white/10 backdrop-blur-md">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </>
                                    )}
                                    <button onClick={() => setSelectedGroupIdx(null)} className="hidden md:flex text-white/50 hover:text-white p-2.5 transition-colors rounded-full hover:bg-white/10 bg-black/20 backdrop-blur-md border border-white/5">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 flex items-center justify-center relative bg-black" onClick={(e) => {
                            const x = e.clientX;
                            const width = window.innerWidth;
                            if (x < width / 3) handlePrev();
                            else handleNext();
                        }}>
                            {/* Image Container with Safe Area */}
                            <div className="relative w-full h-full p-4 md:p-10 flex items-center justify-center">
                                <img
                                    key={currentStatus._id}
                                    src={currentStatus.content}
                                    className="max-w-full max-h-full object-contain drop-shadow-2xl animate-fade-in duration-500 rounded-lg"
                                    alt="Status Content"
                                />
                            </div>

                            {/* Viewers List Drawer - Glassmorphic */}
                            {showViewers && isMine && (
                                <div className="absolute bottom-0 inset-x-0 bg-slate-900/90 backdrop-blur-2xl border-t border-white/10 p-8 z-[100] animate-slide-up rounded-t-[2.5rem] shadow-2xl">
                                    <div className="max-w-[500px] mx-auto">
                                        <div className="flex justify-between items-center mb-6">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white">
                                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                </div>
                                                <h3 className="text-white font-bold text-lg">Views <span className="text-white/40 ml-1 font-normal text-sm">{currentStatus.viewedBy?.length || 0} people</span></h3>
                                            </div>
                                            <button onClick={() => setShowViewers(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/20 text-white/60 hover:text-white transition-all">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                        </div>
                                        <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                            {currentStatus.viewedBy?.length > 0 ? (
                                                currentStatus.viewedBy.map((v, i) => {
                                                    const isPopulated = v && typeof v === 'object';
                                                    return (
                                                        <div key={i} className="flex items-center gap-4 p-3 hover:bg-white/5 rounded-2xl transition-colors">
                                                            <div className="w-12 h-12 rounded-full overflow-hidden bg-white/10 border border-white/5">
                                                                {isPopulated && v.avatar ? (
                                                                    <img src={v.avatar} alt={v.full_name} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">
                                                                        {(isPopulated ? (v.full_name || v.phone) : 'U')[0]}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <div className="text-white text-base font-bold">
                                                                    {isPopulated ? (v.full_name || v.phone) : 'Viewing user'}
                                                                </div>
                                                                <div className="text-white/40 text-xs font-medium">
                                                                    {isPopulated && v.phone ? v.phone : 'Viewed recently'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="text-center py-10 flex flex-col items-center gap-3">
                                                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-2">
                                                        <svg className="w-8 h-8 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                    </div>
                                                    <div className="text-white/40 text-sm font-medium">No one has viewed this yet.</div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Premium Navigation Arrows */}
                            <div className="hidden md:flex absolute inset-y-0 left-0 right-0 justify-between items-center px-8 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none group">
                                <button onClick={(e) => { e.stopPropagation(); handlePrev(); }} className="p-5 rounded-full bg-white/5 hover:bg-white/20 text-white pointer-events-auto border border-white/5 backdrop-blur-xl transition-all hover:scale-110 active:scale-95 shadow-2xl group-hover:-translate-x-2">
                                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); handleNext(); }} className="p-5 rounded-full bg-white/5 hover:bg-white/20 text-white pointer-events-auto border border-white/5 backdrop-blur-xl transition-all hover:scale-110 active:scale-95 shadow-2xl group-hover:translate-x-2">
                                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    // PREMIUM LANDING VIEW 
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-black/20 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-transparent to-blue-500/5 animate-pulse-slow pointer-events-none" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/20 blur-[120px] rounded-full pointer-events-none opacity-20" />

                        <div className="relative z-10 flex flex-col items-center max-w-md mx-auto">
                            <div className="w-32 h-32 bg-gradient-to-tr from-white/10 to-white/0 rounded-[2rem] flex items-center justify-center backdrop-blur-lg border border-white/10 mb-10 shadow-[0_0_50px_rgba(0,0,0,0.5)] transform hover:scale-105 transition-transform duration-500 hover:rotate-3">
                                <svg className="w-16 h-16 text-primary drop-shadow-[0_0_15px_rgba(0,136,204,0.5)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            </div>
                            <h3 className="text-white text-5xl font-black tracking-tight mb-4 drop-shadow-lg">Stories</h3>
                            <p className="text-white/60 text-lg leading-relaxed mb-12 font-medium">
                                Share the moments that matter with the people you care about.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-5 w-full sm:w-auto">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-8 py-5 bg-gradient-to-r from-primary to-blue-500 text-white font-bold rounded-2xl hover:shadow-[0_0_30px_rgba(0,136,204,0.5)] transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 group border border-white/10"
                                >
                                    <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:rotate-90 transition-transform">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                                    </span>
                                    Add your Story
                                </button>
                                {statusGroups.length === 0 && (
                                    <button onClick={onBack} className="px-8 py-5 bg-white/5 text-white/70 hover:text-white font-bold rounded-2xl hover:bg-white/10 transition-all border border-white/5 hover:border-white/20 flex items-center justify-center gap-2">
                                        Go Back
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <input type="file" hidden ref={fileInputRef} onChange={handleFileSelect} accept="image/*" />

            <StatusPrivacyModal
                isOpen={privacyModalOpen}
                onClose={() => { setPrivacyModalOpen(false); setPendingFile(null); }}
                onConfirm={handleConfirmPrivacy}
            />

            {uploading && (
                <div className="absolute inset-0 bg-black/90 z-[200] flex flex-col items-center justify-center backdrop-blur-2xl animate-fade-in">
                    <div className="w-20 h-20 border-4 border-primary/30 border-t-primary animate-spin rounded-full mb-8 shadow-[0_0_40px_rgba(0,136,204,0.4)]" />
                    <span className="text-white font-black tracking-[0.2em] text-sm uppercase animate-pulse">Sharing Moment...</span>
                </div>
            )}
        </div>
    );
}
