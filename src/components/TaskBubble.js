import { useState, useEffect } from "react";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import { socket } from "../socket";

export default function TaskBubble({ message, mine }) {
    const { user } = useAuth();
    const [task, setTask] = useState(message.task || null); // Ideally populated
    const [loading, setLoading] = useState(false);
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
        setLoading(true);
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
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (s) => {
        switch (s) {
            case 'completed': return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'issue': return 'bg-red-500/20 text-red-400 border-red-500/30';
            case 'other': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
            default: return 'bg-white/5 text-white/60 border-white/10';
        }
    };

    return (
        <div className="w-full max-w-[90%] mx-auto my-4 rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-[#0f172a] transform transition-all hover:scale-[1.01]">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600/30 to-purple-600/30 p-4 border-b border-white/10 flex items-start gap-4">
                <div className="bg-white/10 p-2.5 rounded-xl text-white shadow-inner">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                        <h3 className="text-white font-bold text-lg leading-tight tracking-tight">{task.title}</h3>
                        <span className="text-[10px] uppercase font-bold bg-white/10 px-2 py-1 rounded-md text-white/60 tracking-wider">
                            Task
                        </span>
                    </div>
                    <p className="text-sm text-white/70 mt-1">{task.description}</p>

                    {/* Assigner Info */}
                    <div className="flex items-center gap-2 mt-3 text-xs text-white/50 bg-black/20 w-fit px-3 py-1.5 rounded-full border border-white/5">
                        <span className="uppercase font-bold tracking-wider">Assigned By:</span>
                        <span className="text-white font-medium">
                            {(task.assignedBy?._id || task.assignedBy) === user.id ? "You" : (task.assignedBy?.full_name || "Unknown")}
                        </span>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-3 bg-black/20">
                {/* If assigned by me (or generally visible), show summary list */}
                {/* We show list if I created it OR if it's a group task so everyone sees status */}
                {(isAssignedByMe || task.assignees.length > 1) && (
                    <div className="space-y-2 mb-3">
                        <div className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Status Updates</div>
                        <div className="max-h-40 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                            {task.assignees.map((assignee, i) => {
                                const isMe = (assignee.user._id || assignee.user) === user.id;
                                return (
                                    <div key={i} className={`flex items-center justify-between gap-2 text-xs p-2 rounded-lg transition-colors ${isMe ? "bg-white/10 ring-1 ring-white/20" : "bg-white/5"}`}>
                                        <div className="flex items-center gap-2 min-w-0">
                                            {/* Avatar/Initial */}
                                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center text-[9px] font-bold text-white shrink-0">
                                                {assignee.user.avatar
                                                    ? <img src={assignee.user.avatar} className="w-full h-full rounded-full object-cover" alt="" />
                                                    : (assignee.user.full_name?.[0] || "?")}
                                            </div>
                                            <span className={`truncate ${isMe ? "font-bold text-white" : "text-white/80"}`}>
                                                {isMe ? "You" : (assignee.user.full_name || "Unknown")}
                                            </span>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-md border text-[10px] uppercase font-bold shrink-0 ${getStatusColor(assignee.status)}`}>
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
                        <div className="flex justify-between items-center bg-white/5 p-2 rounded-lg border border-white/5">
                            <span className="text-xs text-white/60">Your Status:</span>
                            <span className={`px-2 py-0.5 rounded-md border text-[10px] uppercase font-bold ${getStatusColor(myAssigneeEntry.status)}`}>
                                {myAssigneeEntry.status}
                            </span>
                        </div>

                        {myAssigneeEntry.status === 'pending' && (
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => handleStatusUpdate('completed')}
                                    className="col-span-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-600/30 py-2 rounded-lg text-xs font-bold transition-all"
                                >
                                    ✓ Mark Completed
                                </button>
                                <button
                                    onClick={() => setReasonModal({ open: true, status: 'issue', reason: '' })}
                                    className="bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30 py-2 rounded-lg text-xs font-bold transition-all"
                                >
                                    ✕ Issue
                                </button>
                                <button
                                    onClick={() => setReasonModal({ open: true, status: 'other', reason: '' })}
                                    className="bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 border border-yellow-600/30 py-2 rounded-lg text-xs font-bold transition-all"
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
                <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4">
                    <div className="bg-[#1e293b] w-full max-w-sm rounded-xl border border-white/10 shadow-2xl p-4 animate-scale-in">
                        <h3 className="text-white font-bold mb-3">Provide a Reason</h3>
                        <textarea
                            value={reasonModal.reason}
                            onChange={e => setReasonModal({ ...reasonModal, reason: e.target.value })}
                            className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white text-sm focus:border-primary focus:outline-none min-h-[80px]"
                            placeholder="Why is it pending/issue?"
                            autoFocus
                        />
                        <div className="flex gap-2 mt-3">
                            <button
                                onClick={() => setReasonModal({ open: false, status: "", reason: "" })}
                                className="flex-1 bg-white/5 hover:bg-white/10 text-white text-xs font-bold py-2 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleStatusUpdate(reasonModal.status, reasonModal.reason)}
                                className="flex-1 bg-primary hover:bg-primary-dark text-white text-xs font-bold py-2 rounded-lg"
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
