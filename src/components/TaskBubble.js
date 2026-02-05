import { useState, useEffect } from "react";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import { socket } from "../socket";

export default function TaskBubble({ message, mine }) {
    const { user } = useAuth();
    const [task, setTask] = useState(message.task || null); // Ideally populated
    const [reasonModal, setReasonModal] = useState({ open: false, status: "", reason: "" });

    // If task provided is just ID or partial, we might need to fetch it (or rely on message population)
    // Assuming message.task is populated by backend

    useEffect(() => {
        // Listen for realtime updates
        if (!task?._id) return;
        const onUpdate = (data) => {
            if (data.taskId === task._id) {
                setTask(prev => ({
                    ...prev,
                    assignees: prev.assignees.map(a =>
                        a.user._id === data.userId ? { ...a, status: data.status, reason: data.reason } : a
                    )
                }));
            }
        };
        socket.on("task:update", onUpdate);
        return () => socket.off("task:update", onUpdate);
    }, [task?._id]);

    if (!task || typeof task !== 'object') return <div className="text-red-500 text-xs">Task data missing or malformed</div>;

    const myAssigneeEntry = task.assignees?.find(a =>
        (a.user._id || a.user) === user.id
    );

    const isAssignedToMe = !!myAssigneeEntry;
    const isAssignedByMe = (task.assignedBy?._id || task.assignedBy) === user.id;

    const handleStatusUpdate = async (status, reason = "") => {
        try {
            await api.put(`/tasks/${task._id}/status`, { status, reason });
            // Optimistic update
            setTask(prev => ({
                ...prev,
                assignees: prev.assignees.map(a =>
                    (a.user._id || a.user) === user.id ? { ...a, status, reason } : a
                )
            }));
            setReasonModal({ open: false, status: "", reason: "" });
        } catch (err) {
            console.error("Failed to update task", err);
        }
    };

    const getStatusColor = (s) => {
        switch (s) {
            case 'completed': return 'bg-green-100 text-green-700 border-green-200';
            case 'issue': return 'bg-red-50 text-red-600 border-red-200';
            case 'other': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
            default: return 'bg-slate-100 text-slate-500 border-slate-200';
        }
    };

    return (
        <div className="w-full max-w-[90%] mx-auto my-4 rounded-3xl overflow-hidden shadow-float bg-white/70 backdrop-blur-3xl border border-white/60 transform transition-all hover:scale-[1.005]">
            {/* Header */}
            <div className="p-4 border-b border-primary/5 flex items-start gap-4">
                <div className="bg-gradient-to-br from-primary to-[#3375c4] p-2.5 rounded-2xl text-white shadow-md shadow-primary/20">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                        <h3 className="text-slate-800 font-bold text-lg leading-tight tracking-tight">{task.title}</h3>
                        <span className="text-[10px] uppercase font-bold bg-primary/10 px-2 py-1 rounded-lg text-primary tracking-wider shadow-sm">
                            Task
                        </span>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">{task.description}</p>

                    {/* Assigner Info */}
                    <div className="flex items-center gap-2 mt-3 text-xs text-slate-400 bg-white/50 w-fit px-3 py-1.5 rounded-full border border-white/60 shadow-sm">
                        <span className="uppercase font-bold tracking-wider text-[10px] opacity-70">Assigned By:</span>
                        <span className="text-primary font-bold">
                            {(task.assignedBy?._id || task.assignedBy) === user.id ? "You" : (task.assignedBy?.full_name || "Unknown")}
                        </span>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-4 bg-white/30 backdrop-blur-md">
                {/* If assigned by me (or generally visible), show summary list */}
                {/* We show list if I created it OR if it's a group task so everyone sees status */}
                {(isAssignedByMe || task.assignees.length > 1) && (
                    <div className="space-y-3 mb-4">
                        <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider pl-1">Status Updates</div>
                        <div className="max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                            {task.assignees.map((assignee, i) => {
                                const isMe = (assignee.user._id || assignee.user) === user.id;
                                return (
                                    <div key={i} className={`flex items-center justify-between gap-3 text-xs p-3 rounded-2xl transition-all border ${isMe ? "bg-white shadow-md border-primary/10 ring-1 ring-primary/5" : "bg-white/40 border-white/40 hover:bg-white/60"}`}>
                                        <div className="flex items-center gap-2 min-w-0">
                                            {/* Avatar/Initial */}
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 shadow-sm ${isMe ? 'bg-primary text-white' : 'bg-white text-primary border border-primary/10'}`}>
                                                {assignee.user.avatar
                                                    ? <img src={assignee.user.avatar} className="w-full h-full rounded-full object-cover" alt="" />
                                                    : (assignee.user.full_name?.[0] || "?")}
                                            </div>
                                            <span className={`truncate text-sm ${isMe ? "font-bold text-slate-900" : "text-slate-600"}`}>
                                                {isMe ? "You" : (assignee.user.full_name || "Unknown")}
                                            </span>
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-lg border text-[10px] uppercase font-bold shrink-0 shadow-sm ${getStatusColor(assignee.status)}`}>
                                            {assignee.status}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* If assigned to me, show actions */}
                {isAssignedToMe && !isAssignedByMe && (
                    <div className="space-y-3">
                        <div className="flex justify-between items-center bg-white/60 backdrop-blur-md p-3 rounded-2xl border border-white/60 shadow-sm">
                            <span className="text-xs font-semibold text-slate-500 pl-1">Your Status:</span>
                            <span className={`px-2.5 py-1 rounded-lg border text-[10px] uppercase font-bold shadow-sm ${getStatusColor(myAssigneeEntry.status)}`}>
                                {myAssigneeEntry.status}
                            </span>
                        </div>

                        {myAssigneeEntry.status === 'pending' && (
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => handleStatusUpdate('completed')}
                                    className="col-span-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:brightness-110 text-white border-none py-3 rounded-xl text-xs font-bold transition-all shadow-md active:scale-[0.98]"
                                >
                                    ✓ Mark Completed
                                </button>
                                <button
                                    onClick={() => setReasonModal({ open: true, status: 'issue', reason: '' })}
                                    className="bg-white hover:bg-red-50 text-red-500 border border-red-100 py-3 rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
                                >
                                    ✕ Issue
                                </button>
                                <button
                                    onClick={() => setReasonModal({ open: true, status: 'other', reason: '' })}
                                    className="bg-white hover:bg-yellow-50 text-yellow-600 border border-yellow-100 py-3 rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
                                >
                                    ? Other
                                </button>
                            </div>
                        )}

                        {/* If completed or issue, allow reverting? For now, no implicit revert unless implemented */}
                    </div>
                )}
            </div>

            {/* Reason Modal */}
            {reasonModal.open && (
                <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white/90 backdrop-blur-xl w-full max-w-sm rounded-3xl border border-white/60 shadow-premium p-6 animate-premium-in">
                        <h3 className="text-slate-800 font-bold text-lg mb-4">Provide a Reason</h3>
                        <textarea
                            value={reasonModal.reason}
                            onChange={e => setReasonModal({ ...reasonModal, reason: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-slate-800 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary/50 focus:outline-none min-h-[100px] shadow-inner mb-4 resize-none"
                            placeholder="Why is it pending/issue?"
                            autoFocus
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => setReasonModal({ open: false, status: "", reason: "" })}
                                className="flex-1 bg-white hover:bg-slate-50 text-slate-500 text-sm font-bold py-3 rounded-xl shadow-sm border border-slate-200 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleStatusUpdate(reasonModal.status, reasonModal.reason)}
                                className="flex-1 bg-primary hover:bg-primary-dark text-white text-sm font-bold py-3 rounded-xl shadow-md transform active:scale-95 transition-all"
                            >
                                Submit
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
