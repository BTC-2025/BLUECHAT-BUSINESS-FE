import { useState, useEffect } from "react";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import { socket } from "../socket";

export default function TaskBubble({ message, mine }) {
    const { user } = useAuth();
    const [task, setTask] = useState(message.task || null);
    const [reasonModal, setReasonModal] = useState({ open: false, status: "", reason: "" });

    useEffect(() => {
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
            case 'completed': return 'bg-green-50 text-green-700 border-green-200';
            case 'issue': return 'bg-red-50 text-red-700 border-red-200';
            case 'other': return 'bg-amber-50 text-amber-700 border-amber-200';
            default: return 'bg-slate-50 text-slate-600 border-slate-200';
        }
    };

    return (
        <div className={`w-full max-w-[50%] my-3 rounded-2xl overflow-hidden border border-blue-200/60 shadow-lg bg-white/95 backdrop-blur-xl transition-all hover:shadow-xl ${mine ? 'ml-auto' : 'mr-auto'}`}>
            {/* Header */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 border-b border-blue-100 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                        <h3 className="text-slate-800 font-bold text-base leading-tight">{task.title}</h3>
                        <span className="text-[10px] uppercase font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded-lg tracking-wider shrink-0">
                            Task
                        </span>
                    </div>
                    <p className="text-sm text-slate-600 mt-1 leading-relaxed">{task.description}</p>

                    {/* Assigner Info */}
                    <div className="flex items-center gap-1.5 mt-3 text-xs">
                        <span className="text-slate-500 font-medium">Assigned by:</span>
                        <span className="text-slate-700 font-semibold">
                            {(task.assignedBy?._id || task.assignedBy) === user.id ? "You" : (task.assignedBy?.full_name || "Unknown")}
                        </span>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-4 bg-slate-50/50">
                {/* Status Updates */}
                {(isAssignedByMe || task.assignees.length > 1) && (
                    <div className="space-y-2 mb-4">
                        <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Assignees</div>
                        <div className="max-h-40 overflow-y-auto space-y-2 custom-scrollbar">
                            {task.assignees.map((assignee, i) => {
                                const isMe = (assignee.user._id || assignee.user) === user.id;
                                return (
                                    <div key={i} className={`flex items-center justify-between gap-3 p-2.5 rounded-xl transition-all ${isMe ? "bg-blue-50 ring-2 ring-blue-200" : "bg-white/80"}`}>
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            {/* Avatar */}
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
                                                {assignee.user.avatar
                                                    ? <img src={assignee.user.avatar} className="w-full h-full rounded-full object-cover" alt="" />
                                                    : (assignee.user.full_name?.[0] || "?")}
                                            </div>
                                            <span className={`truncate text-sm ${isMe ? "font-bold text-slate-800" : "text-slate-700"}`}>
                                                {isMe ? "You" : (assignee.user.full_name || "Unknown")}
                                            </span>
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-lg border text-[10px] uppercase font-bold shrink-0 ${getStatusColor(assignee.status)}`}>
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
                        <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200">
                            <span className="text-sm text-slate-600 font-medium">Your Status:</span>
                            <span className={`px-2.5 py-1 rounded-lg border text-[10px] uppercase font-bold ${getStatusColor(myAssigneeEntry.status)}`}>
                                {myAssigneeEntry.status}
                            </span>
                        </div>

                        {myAssigneeEntry.status === 'pending' && (
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => handleStatusUpdate('completed')}
                                    className="col-span-2 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Mark Completed
                                </button>
                                <button
                                    onClick={() => setReasonModal({ open: true, status: 'issue', reason: '' })}
                                    className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 py-2.5 rounded-xl text-sm font-bold transition-all"
                                >
                                    ✕ Issue
                                </button>
                                <button
                                    onClick={() => setReasonModal({ open: true, status: 'other', reason: '' })}
                                    className="bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 py-2.5 rounded-xl text-sm font-bold transition-all"
                                >
                                    ? Other
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Reason Modal */}
            {reasonModal.open && (
                <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-sm rounded-2xl border border-slate-200 shadow-2xl p-5 animate-scale-in">
                        <h3 className="text-slate-800 font-bold text-lg mb-3">Provide a Reason</h3>
                        <textarea
                            value={reasonModal.reason}
                            onChange={e => setReasonModal({ ...reasonModal, reason: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:outline-none min-h-[100px] transition-all"
                            placeholder="Explain the reason..."
                            autoFocus
                        />
                        <div className="flex gap-2 mt-4">
                            <button
                                onClick={() => setReasonModal({ open: false, status: "", reason: "" })}
                                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold py-2.5 rounded-xl transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleStatusUpdate(reasonModal.status, reasonModal.reason)}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2.5 rounded-xl transition-all shadow-md hover:shadow-lg"
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
