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
    <div className="pt-2 relative">
      {/* Reply Preview */}
      {replyTo && (
        <div className="flex items-center gap-2 p-2 mb-2 bg-white/60 backdrop-blur-sm rounded-xl border border-primary/20 shadow-sm animate-slide-up">
          <div className="w-1 h-8 bg-primary rounded-full" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-primary">
              Replying to {replyTo.sender?.full_name || replyTo.sender?.phone || "Unknown"}
            </div>
            <div className="text-xs text-slate-600 truncate opacity-80">
              {replyTo.body || (replyTo.attachments?.length ? "[attachment]" : "")}
            </div>
          </div>
          <button
            onClick={onCancelReply}
            className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Scheduled Time Indicator */}
      {scheduledAt && (
        <div className="flex items-center gap-2 px-3 py-2 mb-2 bg-blue-50/90 backdrop-blur-sm border border-blue-200 rounded-xl animate-fade-in shadow-sm w-fit max-w-full">
          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs font-bold text-blue-700 truncate">
            Scheduled: {new Date(scheduledAt).toLocaleString()}
          </span>
          <button
            onClick={() => setScheduledAt(null)}
            className="ml-2 p-1 hover:bg-blue-100 rounded-lg text-blue-600 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Attachment Preview */}
      {attachments.length > 0 && (
        <div className="flex gap-2 p-2 mb-2 overflow-x-auto custom-scrollbar">
          {attachments.map((att, index) => (
            <div key={index} className="relative group flex-shrink-0">
              {att.type === "image" ? (
                <img
                  src={att.url}
                  alt={att.name}
                  className="w-16 h-16 object-cover rounded-xl border border-slate-200 shadow-sm"
                />
              ) : (
                <div className="w-16 h-16 bg-white rounded-xl border border-slate-200 flex items-center justify-center shadow-sm text-primary">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </div>
              )}
              <button
                onClick={() => removeAttachment(index)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white text-red-500 border border-slate-100 rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Datetime Picker Modal */}
      {showPicker && (
        <div className="absolute bottom-full mb-4 right-0 z-50 p-4 bg-white/95 backdrop-blur-xl rounded-2xl shadow-premium border border-white/60 w-[300px] animate-premium-in">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Schedule Release</h4>
            <button onClick={() => setShowPicker(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="datetime-local"
              className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 text-sm font-bold text-slate-800"
              min={new Date().toISOString().slice(0, 16)}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
            <button
              onClick={() => setShowPicker(false)}
              className="px-3 bg-primary text-white rounded-lg font-bold text-sm shadow-sm hover:shadow-md transition-all"
            >
              Set
            </button>
          </div>
        </div>
      )}

      {/* Mention Suggestions */}
      {showMentions && filteredMembers.length > 0 && (
        <div className="absolute bottom-full left-0 w-64 mb-2 bg-white/90 backdrop-blur-xl border border-white/60 rounded-2xl shadow-premium overflow-hidden z-[100] animate-slide-up">
          <div className="p-2 border-b border-primary/5 text-[10px] font-bold uppercase tracking-widest text-primary/60 bg-primary/5">
            Mention Member
          </div>
          <div className="max-h-48 overflow-y-auto custom-scrollbar">
            {filteredMembers.map((m, idx) => (
              <button
                key={m.id}
                onClick={() => insertMention(m)}
                className={`w-full flex items-center gap-3 px-3 py-2 transition-all ${idx === mentionIndex ? "bg-primary/10" : "hover:bg-white/50"
                  }`}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-dark text-white flex items-center justify-center font-bold text-xs shadow-sm">
                  {m.avatar ? (
                    <img src={m.avatar} alt="" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    m.name?.[0] || "?"
                  )}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="font-bold text-sm text-slate-800 truncate">{m.name}</div>
                  <div className="text-[10px] text-slate-500 truncate">{m.phone}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recording UI */}
      {recording && (
        <div className="flex items-center gap-3 p-2 bg-red-50/80 backdrop-blur-sm rounded-full border border-red-100 animate-fade-in mx-2 mb-2">
          {/* Animated waveform */}
          <div className="flex items-center gap-1 pl-2">
            {[1, 2, 3, 4, 3, 2, 1].map((h, i) => (
              <div key={i} className="w-1 bg-red-500 rounded-full animate-pulse"
                style={{ height: `${h * 4}px`, animationDelay: `${i * 100}ms` }} />
            ))}
          </div>
          <span className="text-red-600 font-bold text-sm min-w-[3rem]">{formatTime(recordingTime)}</span>
          <div className="flex-1" />
          <button
            onClick={cancelRecording}
            className="p-2 text-red-500 hover:bg-white rounded-full transition-all"
            title="Cancel"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <button
            onClick={stopRecording}
            className="p-2 bg-red-500 text-white rounded-full hover:shadow-lg hover:scale-105 transition-all shadow-md"
            title="Send"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      )}

      {/* Uploading Spinner */}
      {!recording && uploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-20 rounded-xl">
          <svg className="w-8 h-8 text-primary animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      )}

      {/* Input Row - Floating Glass Pill */}
      {/* Input Row - Floating Glass Pill */}
      {/* Input Row - Floating Glass Pill */}
      {!recording && (
        <div className="flex items-end gap-1.5 p-1 bg-white rounded-[2rem] shadow-float border border-white/60 backdrop-blur-xl relative z-20">

          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-full text-slate-400 hover:text-primary hover:bg-primary/5 transition-all flex-shrink-0"
            title="Attach file"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>

          {!val.trim() && attachments.length === 0 && (
            <button
              onClick={() => setShowPicker(!showPicker)}
              className={`p-2 rounded-full transition-all flex-shrink-0 ${scheduledAt ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:text-primary hover:bg-primary/5'}`}
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
            className="flex-1 bg-transparent border-none outline-none resize-none overflow-y-auto text-slate-800 placeholder-slate-400 py-2.5 px-1 max-h-[100px] text-[15px] leading-relaxed"
            placeholder="Type a message..."
            value={val}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            rows={1}
            style={{ minHeight: '44px' }}
          />

          {!val.trim() && attachments.length === 0 ? (
            <button
              onClick={startRecording}
              className="p-2 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all flex-shrink-0"
              title="Record voice message"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={uploading}
              className={`p-2 rounded-full bg-gradient-to-br transition-all shadow-md hover:shadow-lg hover:scale-105 active:scale-95 flex items-center justify-center flex-shrink-0 ${scheduledAt ? 'from-blue-600 to-blue-500' : 'from-primary to-[#3375c4]'
                } text-white`}
            >
              <svg className="w-5 h-5 translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
