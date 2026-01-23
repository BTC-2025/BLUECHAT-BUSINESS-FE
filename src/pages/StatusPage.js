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
        <div className="h-screen w-screen bg-black flex relative overflow-hidden select-none">
            {/* Background Layer (Blurred) */}
            {currentStatus && (
                <div
                    className="absolute inset-0 opacity-30 blur-3xl scale-110 pointer-events-none transition-all duration-700"
                    style={{ backgroundImage: `url(${currentStatus.content})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                />
            )}

            {/* LEFT SIDEBAR - Responsive: Hidden on mobile when viewing status */}
            <div className={`w-full md:w-80 flex flex-col bg-black/40 backdrop-blur-2xl border-r border-white/10 z-50 overflow-hidden ${selectedGroupIdx !== null ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <h2 className="text-white font-bold text-xl tracking-tight">Status</h2>
                    <button onClick={onBack} title="Back to Chats" className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/60">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 scrollbar-hide">
                    {/* MY STATUS SECTION */}
                    <div className="px-2 py-2 text-white/40 text-[10px] uppercase font-bold tracking-widest mb-1">My Status</div>
                    <div className="flex items-center gap-4 p-4 rounded-2xl transition-all mb-4 bg-white/5 group border border-white/5">
                        <div className="relative cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            {/* OWNER RING: Always primary if exists, but we can make it green if unviewed by others or just primary */}
                            <div className={`w-12 h-12 rounded-full p-[2px] ${myGroup ? 'bg-primary' : 'bg-white/10'}`}>
                                <div className="w-full h-full rounded-full border-2 border-black overflow-hidden bg-white/5">
                                    {user?.avatar ? <img src={user.avatar} alt={user.full_name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-white font-bold">{user?.full_name?.[0]}</div>}
                                </div>
                            </div>
                            <div className="absolute bottom-0 right-0 w-4 h-4 bg-primary rounded-full flex items-center justify-center text-white border border-black text-[10px] font-bold">+</div>
                        </div>
                        <div className="flex-1 flex items-center justify-between">
                            <div className="cursor-pointer" onClick={() => {
                                if (myGroup) {
                                    setSelectedGroupIdx(statusGroups.findIndex(g => g.user._id === user.id));
                                    setCurrentStatusIdx(0);
                                } else {
                                    fileInputRef.current?.click();
                                }
                            }}>
                                <div className="text-white font-bold text-sm">My Status</div>
                                <div className="text-white/40 text-[10px]">{myGroup ? `${myGroup.statuses.length} updates` : 'Add status update'}</div>
                            </div>
                            <button onClick={() => fileInputRef.current?.click()} className="p-2 text-white/40 hover:text-white transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            </button>
                        </div>
                    </div>

                    {/* RECENT UPDATES SECTION */}
                    {otherGroups.length > 0 && (
                        <>
                            <div className="px-2 py-2 text-white/40 text-[10px] uppercase font-bold tracking-widest mb-1">Recent Updates</div>
                            {otherGroups.map((g) => {
                                const globalIdx = statusGroups.findIndex(sg => sg.user._id === g.user._id);
                                const hasUnviewed = g.statuses.some(s => !s.viewedBy?.some(v => (v._id || v) === user?.id));

                                return (
                                    <div
                                        key={g.user._id}
                                        onClick={() => { setSelectedGroupIdx(globalIdx); setCurrentStatusIdx(0); }}
                                        className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all ${globalIdx === selectedGroupIdx ? 'bg-primary/20 border border-primary/20 shadow-lg' : 'hover:bg-white/5 border border-transparent'}`}
                                    >
                                        <div className={`w-12 h-12 rounded-full p-[2px] transition-colors duration-500 ${hasUnviewed ? 'bg-green-500' : 'bg-white/20'}`}>
                                            <div className="w-full h-full rounded-full border-2 border-black overflow-hidden bg-white/5">
                                                {g.user.avatar ? <img src={g.user.avatar} alt={g.user.full_name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-white font-bold">{g.user.full_name?.[0]}</div>}
                                            </div>
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <div className={`text-white font-bold text-sm truncate ${hasUnviewed ? 'opacity-100' : 'opacity-60'}`}>{g.user.full_name}</div>
                                            <div className="text-white/40 text-[10px] truncate">
                                                {new Date(g.statuses[0].createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </>
                    )}
                </div>
            </div>

            {/* VIEWER AREA - Responsive: Hidden on mobile when list is visible */}
            <div className={`flex-1 flex flex-col relative h-full ${selectedGroupIdx === null ? 'hidden md:flex' : 'flex'}`}>
                {currentStatus ? (
                    <>
                        <div className="absolute top-0 inset-x-0 p-4 sm:p-6 z-[60] flex flex-col gap-4 bg-gradient-to-b from-black/80 to-transparent">
                            <div className="flex gap-1.5 w-full max-w-[500px] mx-auto">
                                {currentGroup.statuses.map((_, idx) => (
                                    <div key={idx} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-white transition-all duration-75 linear"
                                            style={{ width: idx < currentStatusIdx ? "100%" : idx === currentStatusIdx ? `${progress}%` : "0%" }}
                                        />
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center justify-between w-full max-w-[500px] mx-auto mt-2">
                                <div className="flex items-center gap-2 sm:gap-3">
                                    <button onClick={() => setSelectedGroupIdx(null)} className="text-white p-2 hover:bg-white/10 rounded-full transition-colors">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                                    </button>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full border-2 border-primary overflow-hidden bg-white/10 shadow-lg">
                                            {currentGroup?.user?.avatar ? <img src={currentGroup.user.avatar} alt={currentGroup.user.full_name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-white font-bold">{currentGroup?.user?.full_name?.[0]}</div>}
                                        </div>
                                        <div className="flex flex-col">
                                            <div className="text-white font-bold text-sm leading-tight drop-shadow-md">{currentGroup?.user?.full_name}</div>
                                            <div className="text-white/70 text-[11px] font-medium drop-shadow-sm">{new Date(currentStatus.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1 sm:gap-2">
                                    {isMine && (
                                        <>
                                            <button
                                                onClick={() => {
                                                    const newShow = !showViewers;
                                                    setShowViewers(newShow);
                                                    if (newShow) fetchStatuses(); // ✅ Refresh on open
                                                }}
                                                className={`p-2 transition-all rounded-full border ${showViewers ? 'bg-white text-black border-white' : 'text-white/60 hover:text-white border-white/20 hover:bg-white/10'}`}
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                            </button>
                                            <button onClick={handleDeleteStatus} className="text-white/60 hover:text-red-400 p-2 transition-colors rounded-full hover:bg-white/10">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </>
                                    )}
                                    <button onClick={() => setSelectedGroupIdx(null)} className="text-white/60 hover:text-white p-2 transition-colors rounded-full hover:bg-white/10">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 flex items-center justify-center relative bg-gradient-to-b from-black/20 to-black/40" onClick={(e) => {
                            const x = e.clientX;
                            const width = window.innerWidth;
                            if (x < width / 3) handlePrev();
                            else handleNext();
                        }}>
                            <img
                                key={currentStatus._id}
                                src={currentStatus.content}
                                className="max-w-full max-h-full object-contain shadow-2xl rounded-sm sm:rounded-xl animate-in zoom-in-95 duration-300"
                                alt="Status Content"
                            />

                            {/* Viewers List Drawer */}
                            {showViewers && isMine && (
                                <div className="absolute bottom-0 inset-x-0 bg-black/80 backdrop-blur-xl border-t border-white/10 p-6 z-[100] animate-in slide-in-from-bottom duration-300">
                                    <div className="max-w-[500px] mx-auto">
                                        <div className="flex justify-between items-center mb-6">
                                            <h3 className="text-white font-bold">Views ({currentStatus.viewedBy?.length || 0})</h3>
                                            <button onClick={() => setShowViewers(false)} className="text-white/40 hover:text-white">Close</button>
                                        </div>
                                        <div className="flex flex-col gap-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
                                            {currentStatus.viewedBy?.length > 0 ? (
                                                currentStatus.viewedBy.map((v, i) => {
                                                    const isPopulated = v && typeof v === 'object';
                                                    return (
                                                        <div key={i} className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-full overflow-hidden bg-white/10 border border-white/5">
                                                                {isPopulated && v.avatar ? (
                                                                    <img src={v.avatar} alt={v.full_name} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-white font-bold">
                                                                        {(isPopulated ? (v.full_name || v.phone) : 'U')[0]}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <div className="text-white text-sm font-medium">
                                                                    {isPopulated ? (v.full_name || v.phone) : 'Viewing user'}
                                                                </div>
                                                                <div className="text-white/40 text-[10px]">
                                                                    {isPopulated && v.phone ? v.phone : 'Viewed recently'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="text-center py-8 text-white/40 text-sm">No one has viewed this yet.</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Arrows */}
                            <div className="hidden md:flex absolute inset-y-0 left-0 right-0 justify-between items-center px-10 opacity-0 hover:opacity-100 transition-opacity pointer-events-none group">
                                <button onClick={(e) => { e.stopPropagation(); handlePrev(); }} className="p-4 rounded-full bg-black/40 text-white pointer-events-auto hover:bg-black/60 border border-white/10 backdrop-blur-xl transition-all hover:scale-110 active:scale-90">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); handleNext(); }} className="p-4 rounded-full bg-black/40 text-white pointer-events-auto hover:bg-black/60 border border-white/10 backdrop-blur-xl transition-all hover:scale-110 active:scale-90">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    // LANDING VIEW (No status selected)
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-black/20">
                        <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center backdrop-blur-md border border-primary/20 mb-8 animate-pulse">
                            <svg className="w-12 h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </div>
                        <h3 className="text-white text-3xl font-bold tracking-tight mb-3">Status Stories</h3>
                        <p className="text-white/50 text-base max-w-[320px] mx-auto leading-relaxed mb-10">
                            {statusGroups.length > 0
                                ? "Select a contact from the list to see their recent updates and shared moments."
                                : "No one has shared a story yet. Be the first to start a conversation with your contacts!"}
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="px-10 py-4 bg-primary text-white font-bold rounded-full hover:bg-primary-light transition-all hover:scale-105 shadow-2xl flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                Share My Update
                            </button>
                            {statusGroups.length === 0 && (
                                <button onClick={onBack} className="px-10 py-4 bg-white/5 text-white/60 hover:text-white font-bold rounded-full hover:bg-white/10 transition-all border border-white/5">
                                    Go Back
                                </button>
                            )}
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
                <div className="absolute inset-0 bg-black/80 z-[200] flex flex-col items-center justify-center backdrop-blur-xl">
                    <div className="w-14 h-14 border-4 border-primary border-t-transparent animate-spin rounded-full mb-6" />
                    <span className="text-white font-bold tracking-[0.2em] text-xs uppercase animate-pulse">Uploading Moment...</span>
                </div>
            )}
        </div>
    );
}
