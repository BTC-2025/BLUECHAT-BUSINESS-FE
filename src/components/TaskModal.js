import { useState } from "react";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";

export default function TaskModal({ isOpen, onClose, chat, onTaskCreated }) {
    const { user } = useAuth();
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [assignAll, setAssignAll] = useState(true);
    const [selectedAssignees, setSelectedAssignees] = useState([]);
    const [isPrivate, setIsPrivate] = useState(false);
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    // Determine selectable users
    const assignableUsers = chat.isGroup
        ? (chat.members || chat.participantsDetails || []).filter(u => (u.id || u._id) !== user.id)
        : [chat.other];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const assigneeIds = chat.isGroup && !assignAll
                ? selectedAssignees
                : assignableUsers.map(u => u._id || u.id);

            const { data } = await api.post("/tasks/create", {
                title,
                description,
                chatId: chat.id,
                assigneeIds,
                isPrivate
            });

            onTaskCreated?.(data.task);
            onClose();
        } catch (err) {
            alert("Failed to create task");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const toggleAssignee = (userId) => {
        setSelectedAssignees(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-lg rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-fade-in">
                {/* Header */}
                <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                            </svg>
                        </div>
                        <h2 className="text-lg font-bold text-slate-800">Assign Task</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-100 rounded-lg"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                    {/* Task Title */}
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">Task Title</label>
                        <input
                            type="text"
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                            placeholder="e.g. Update client presentation"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">Description (Optional)</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all min-h-[100px] resize-none"
                            placeholder="Add details..."
                        />
                    </div>

                    {/* Assignees Selection (Only for Groups) */}
                    {chat.isGroup && (
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">Assign To</label>
                            <div className="space-y-2">
                                <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-all">
                                    <input
                                        type="radio"
                                        checked={assignAll}
                                        onChange={() => setAssignAll(true)}
                                        className="accent-blue-600 w-4 h-4"
                                    />
                                    <span className="text-sm font-semibold text-slate-700">All Participants</span>
                                </label>

                                <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-all">
                                    <input
                                        type="radio"
                                        checked={!assignAll}
                                        onChange={() => setAssignAll(false)}
                                        className="accent-blue-600 w-4 h-4"
                                    />
                                    <span className="text-sm font-semibold text-slate-700">Select Specific People</span>
                                </label>
                            </div>

                            {!assignAll && (
                                <div className="mt-3 max-h-48 overflow-y-auto space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                                    {assignableUsers.map(u => (
                                        <label key={u._id || u.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white cursor-pointer transition-all border border-transparent hover:border-blue-200">
                                            <input
                                                type="checkbox"
                                                checked={selectedAssignees.includes(u._id || u.id)}
                                                onChange={() => toggleAssignee(u._id || u.id)}
                                                className="accent-blue-600 w-4 h-4 rounded"
                                            />
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 text-xs grid place-items-center font-bold text-white uppercase">
                                                    {u.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover rounded-full" /> : (u.full_name?.[0] || u.phone?.slice(-2))}
                                                </div>
                                                <span className="text-sm text-slate-700 font-medium">{u.full_name || u.phone}</span>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Private Task Toggle */}
                    {chat.isGroup && (
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                            <input
                                type="checkbox"
                                id="privateDetails"
                                checked={isPrivate}
                                onChange={(e) => setIsPrivate(e.target.checked)}
                                className="accent-blue-600 w-4 h-4 rounded cursor-pointer mt-0.5"
                            />
                            <div className="flex flex-col">
                                <label htmlFor="privateDetails" className="text-sm font-bold text-slate-700 cursor-pointer">
                                    Private Task
                                </label>
                                <span className="text-xs text-slate-600 leading-relaxed">
                                    Only assigned members and you can see this task
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Submit Button */}
                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading || (!assignAll && selectedAssignees.length === 0)}
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                        >
                            {loading ? (
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                    </svg>
                                    Assign Task
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
