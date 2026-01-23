import { useState, useRef, useEffect } from "react";
import { socket } from "../socket";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { API_BASE } from "../api";

export default function ChatInput({ onSend, chatId, replyTo, onCancelReply, members = [], prefillMessage }) {
  const { user } = useAuth();
  const [val, setVal] = useState("");

  // ✅ Handle prefill message (e.g. from product inquiry)
  useEffect(() => {
    if (prefillMessage) {
      setVal(prev => prev || prefillMessage);
      setVal(prefillMessage);
      textareaRef.current?.focus();
    }
  }, [prefillMessage]);
  const [typing, setTyping] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [scheduledAt, setScheduledAt] = useState(null); // ✅ New State
  const [showPicker, setShowPicker] = useState(false); // ✅ New State
  const [showMentions, setShowMentions] = useState(false); // ✅ New State
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);

  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  const submit = async () => {
    const text = val.trim();
    if (!text && attachments.length === 0) return;

    // Send message with attachments, replyTo, and scheduledAt
    onSend(text, attachments, replyTo?._id, scheduledAt);

    setVal("");
    setAttachments([]);
    setScheduledAt(null);
    setShowPicker(false);
    onCancelReply?.();

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    socket.emit("typing:stop", { chatId });
    setTyping(false);
  };

  const handleChange = (e) => {
    const v = e.target.value;
    setVal(v);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + "px";
    }

    if (!typing) {
      setTyping(true);
      socket.emit("typing:start", { chatId });
    }

    clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
      socket.emit("typing:stop", { chatId });
    }, 800);

    // ✅ Mention Detection
    const lastWord = v.split(/\s/).pop();
    if (lastWord.startsWith("@") && members.length > 0) {
      setShowMentions(true);
      setMentionQuery(lastWord.slice(1).toLowerCase());
      setMentionIndex(0);
    } else {
      setShowMentions(false);
    }
  };

  const filteredMembers = members.filter(m =>
    m.name?.toLowerCase().includes(mentionQuery) ||
    m.phone?.includes(mentionQuery)
  );

  const insertMention = (member) => {
    const words = val.split(" ");
    words.pop(); // Remove the @query part
    const newVal = words.join(" ") + (words.length ? " " : "") + "@" + member.name + " ";
    setVal(newVal);
    setShowMentions(false);
    if (textareaRef.current) textareaRef.current.focus();
  };

  const handleKeyDown = (e) => {
    if (showMentions && filteredMembers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex(prev => (prev + 1) % filteredMembers.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex(prev => (prev - 1 + filteredMembers.length) % filteredMembers.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(filteredMembers[mentionIndex]);
        return;
      }
      if (e.key === "Escape") {
        setShowMentions(false);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);

    try {
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);

        const response = await axios.post(
          `${API_BASE}/upload`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${user?.token}`,
              "Content-Type": "multipart/form-data",
            },
          }
        );

        return response.data;
      });

      const uploaded = await Promise.all(uploadPromises);
      setAttachments((prev) => [...prev, ...uploaded]);
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to upload file. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Voice recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await uploadVoiceMessage(audioBlob);
      };

      mediaRecorder.start();
      setRecording(true);
      setRecordingTime(0);

      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Failed to start recording:", error);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      clearInterval(recordingTimerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      mediaRecorderRef.current = null;
      audioChunksRef.current = [];
      setRecording(false);
      setRecordingTime(0);
      clearInterval(recordingTimerRef.current);
    }
  };

  const uploadVoiceMessage = async (audioBlob) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", audioBlob, `voice-${Date.now()}.webm`);

      const response = await axios.post(
        `${API_BASE}/upload`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${user?.token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      // Send voice message immediately
      onSend("", [{ ...response.data, type: "audio" }]);
    } catch (error) {
      console.error("Voice upload failed:", error);
      alert("Failed to send voice message.");
    } finally {
      setUploading(false);
      setRecordingTime(0);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-2 relative">
      {/* Reply Preview */}
      {replyTo && (
        <div className="flex items-center gap-2 p-2 bg-secondary/10 rounded-xl border border-secondary/30">
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-secondary">
              Replying to {replyTo.sender?.full_name || replyTo.sender?.phone || "Unknown"}
            </div>
            <div className="text-sm text-primary/70 truncate">
              {replyTo.body || "[attachment]"}
            </div>
          </div>
          <button
            onClick={onCancelReply}
            className="p-1 text-primary/50 hover:text-primary rounded-lg hover:bg-white/50 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Scheduled Time Indicator */}
      {scheduledAt && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl animate-fade-in">
          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs font-bold text-blue-600">
            Scheduled: {new Date(scheduledAt).toLocaleString()}
          </span>
          <button
            onClick={() => setScheduledAt(null)}
            className="ml-auto p-1 hover:bg-blue-500/20 rounded-lg text-blue-500 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Attachment Preview */}
      {attachments.length > 0 && (
        <div className="flex gap-2 flex-wrap p-2 bg-white/50 rounded-xl border border-background-dark/30">
          {attachments.map((att, index) => (
            <div key={index} className="relative group">
              {att.type === "image" ? (
                <img
                  src={att.url}
                  alt={att.name}
                  className="w-16 h-16 object-cover rounded-lg border border-background-dark/30"
                />
              ) : att.type === "video" ? (
                <div className="w-16 h-16 bg-primary/10 rounded-lg border border-background-dark/30 flex items-center justify-center">
                  <svg className="w-6 h-6 text-primary" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              ) : att.type === "audio" ? (
                <div className="w-16 h-16 bg-secondary/10 rounded-lg border border-background-dark/30 flex items-center justify-center">
                  <svg className="w-6 h-6 text-secondary" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                  </svg>
                </div>
              ) : (
                <div className="w-16 h-16 bg-background-dark/50 rounded-lg border border-background-dark/30 flex items-center justify-center">
                  <svg className="w-6 h-6 text-primary/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              )}
              <button
                onClick={() => removeAttachment(index)}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Datetime Picker Modal */}
      {showPicker && (
        <div className="p-4 bg-white rounded-2xl shadow-2xl border border-background-dark/30 animate-premium-in">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-black text-primary uppercase tracking-wider">Schedule Release</h4>
            <button onClick={() => setShowPicker(false)} className="text-primary/40 hover:text-primary transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="datetime-local"
              className="flex-1 p-3 bg-background border border-background-dark/50 rounded-xl outline-none focus:ring-2 focus:ring-primary/50 text-sm font-bold text-primary"
              min={new Date().toISOString().slice(0, 16)}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
            <button
              onClick={() => setShowPicker(false)}
              className="px-4 py-3 bg-primary text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all"
            >
              Set
            </button>
          </div>
        </div>
      )}

      {/* Mention Suggestions */}
      {showMentions && filteredMembers.length > 0 && (
        <div className="absolute bottom-full left-0 w-64 mb-2 bg-[#0f172a]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[100] animate-premium-in">
          <div className="p-2 border-b border-white/5 text-[10px] font-black uppercase tracking-widest text-white/40">
            Mention Participant
          </div>
          <div className="max-h-48 overflow-y-auto custom-scrollbar">
            {filteredMembers.map((m, idx) => (
              <button
                key={m.id}
                onClick={() => insertMention(m)}
                className={`w-full flex items-center gap-3 px-4 py-3 transition-all ${idx === mentionIndex ? "bg-primary text-white" : "hover:bg-white/5 text-white/70"
                  }`}
              >
                <div className="w-8 h-8 rounded-full overflow-hidden bg-primary/20 flex-shrink-0">
                  {m.avatar ? (
                    <img src={m.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-xs uppercase">
                      {m.name?.[0] || "?"}
                    </div>
                  )}
                </div>
                <div className="flex-1 text-left">
                  <div className="font-bold text-sm truncate">{m.name}</div>
                  <div className="text-[10px] opacity-60 truncate">{m.phone}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recording UI */}
      {recording && (
        <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-red-50 to-red-100 rounded-xl border border-red-200">
          {/* Animated waveform */}
          <div className="flex items-center gap-1">
            <div className="w-1 h-4 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: "0ms" }} />
            <div className="w-1 h-6 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
            <div className="w-1 h-3 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
            <div className="w-1 h-5 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: "450ms" }} />
            <div className="w-1 h-4 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: "600ms" }} />
          </div>
          <span className="text-red-600 font-semibold">{formatTime(recordingTime)}</span>
          <div className="flex-1" />
          <button
            onClick={cancelRecording}
            className="p-2.5 text-red-500 hover:bg-red-200 rounded-full transition-all"
            title="Cancel"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <button
            onClick={stopRecording}
            className="p-2.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all shadow-md hover:shadow-lg"
            title="Send"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      )}

      {/* Uploading Voice Message UI */}
      {!recording && uploading && (
        <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-secondary/10 to-secondary/20 rounded-xl border border-secondary/30">
          <svg className="w-6 h-6 text-secondary animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-secondary font-medium">Sending voice message...</span>
        </div>
      )}

      {/* Input Row */}
      {!recording && (
        <div className="flex gap-3 items-end">
          {/* Attachment Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="p-3 bg-white/80 border border-background-dark/50 rounded-2xl hover:bg-background-dark transition-all duration-200 disabled:opacity-50"
            title="Attach file"
          >
            {uploading ? (
              <svg className="w-5 h-5 text-primary animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            )}
          </button>

          {/* Schedule Button */}
          {!val.trim() && attachments.length === 0 && (
            <button
              onClick={() => setShowPicker(!showPicker)}
              className={`p-3 border rounded-2xl transition-all duration-200 ${showPicker || scheduledAt ? 'bg-blue-500/10 border-blue-500/50 text-blue-500' : 'bg-white/80 border-background-dark/50 text-primary hover:bg-background-dark'}`}
              title="Schedule message"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
            onChange={handleFileSelect}
            className="hidden"
          />

          <textarea
            ref={textareaRef}
            className="flex-1 bg-white/80 backdrop-blur-sm border border-background-dark/50 rounded-2xl px-4 py-3 outline-none resize-none overflow-y-auto text-sm sm:text-base focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-all duration-200 text-primary placeholder:text-primary/40 shadow-sm"
            placeholder="Type a message..."
            value={val}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            rows={1}
            style={{ maxHeight: "150px" }}
          />

          {/* Voice Message Button */}
          {!val.trim() && attachments.length === 0 ? (
            <button
              onClick={startRecording}
              disabled={uploading}
              className="p-3 bg-secondary/10 border border-secondary/30 rounded-2xl hover:bg-secondary/20 transition-all duration-200 disabled:opacity-50"
              title="Record voice message"
            >
              <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={(!val.trim() && attachments.length === 0) || uploading}
              className={`px-4 sm:px-5 py-3 bg-gradient-to-r ${scheduledAt ? 'from-blue-600 to-blue-400' : 'from-primary to-primary-light'} rounded-2xl hover:brightness-110 transition-all duration-200 font-semibold text-sm sm:text-base text-white shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
            >
              <span className="hidden sm:inline">{scheduledAt ? 'Schedule' : 'Send'}</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {scheduledAt ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                )}
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
