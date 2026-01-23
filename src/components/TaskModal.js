import { useState } from "react";
import { api } from "../api";

export default function TaskModal({ isOpen, onClose, chat, onTaskCreated }) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [assignAll, setAssignAll] = useState(true);
    const [selectedAssignees, setSelectedAssignees] = useState([]);
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    // Determine selectable users
    const assignableUsers = chat.isGroup
        ? chat.participantsDetails?.filter(u => u.id !== chat.currentUserId) || [] // Assuming we have details
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
                assigneeIds
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
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
            <div className="bg-[#0f172a] w-full max-w-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-fade-in">
                <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <h2 className="text-lg font-bold text-white">Assign Task</h2>
                    <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wider">Task Title</label>
                        <input
                            type="text"
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-primary transition-colors"
                            placeholder="e.g. Update client presentation"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wider">Description (Optional)</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-primary transition-colors min-h-[100px] resize-none"
                            placeholder="Add details..."
                        />
                    </div>

                    {/* Assignees Selection (Only for Groups) */}
                    {chat.isGroup && (
                        <div>
                            <label className="block text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wider">Assign To</label>
                            <div className="space-y-2">
                                <label className="flex items-center gap-3 p-3 rounded-xl bg-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                                    <input
                                        type="radio"
                                        checked={assignAll}
                                        onChange={() => setAssignAll(true)}
                                        className="accent-primary w-4 h-4"
                                    />
                                    <span className="text-sm font-medium text-white">All Participants</span>
                                </label>

                                <label className="flex items-center gap-3 p-3 rounded-xl bg-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                                    <input
                                        type="radio"
                                        checked={!assignAll}
                                        onChange={() => setAssignAll(false)}
                                        className="accent-primary w-4 h-4"
                                    />
                                    <span className="text-sm font-medium text-white">Select Specific People</span>
                                </label>
                            </div>

                            {!assignAll && (
                                <div className="mt-2 max-h-40 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                                    {assignableUsers.map(u => (
                                        <label key={u._id || u.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={selectedAssignees.includes(u._id || u.id)}
                                                onChange={() => toggleAssignee(u._id || u.id)}
                                                className="accent-primary w-4 h-4 rounded"
                                            />
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-secondary to-secondary-dark text-[10px] grid place-items-center font-bold text-white uppercase">
                                                    {u.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover rounded-full" /> : (u.full_name?.[0] || u.phone?.slice(-2))}
                                                </div>
                                                <span className="text-sm text-white/90">{u.full_name || u.phone}</span>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading || (!assignAll && selectedAssignees.length === 0)}
                            className="w-full bg-gradient-to-r from-primary to-primary-light hover:brightness-110 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
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
