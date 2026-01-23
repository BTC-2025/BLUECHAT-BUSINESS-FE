// // client/src/components/GroupCreateModal.js
// import { useState } from "react";
// import axios from "axios";
// import { useAuth } from "../context/AuthContext";

// export default function GroupCreateModal({ open, onClose, onCreated }) {
//   const { user } = useAuth();
//   const [title, setTitle] = useState("");
//   const [description, setDesc] = useState("");
//   const [phones, setPhones] = useState("");
//   const [loading, setLoading] = useState(false);

//   if (!open) return null;

//   const createGroup = async () => {
//     if (!title.trim()) return;
//     setLoading(true);

//     try {
//       const { data } = await axios.post(
//         "http://localhost:5001/api/groups",
//         {
//           title,
//           description,
//           membersPhones: phones
//             .split(",")
//             .map((p) => p.trim())
//             .filter(Boolean),
//         },
//         {
//           headers: { Authorization: `Bearer ${user?.token}` },
//         }
//       );

//       onCreated?.({ id: data.id, isGroup: true });
//       onClose();
//       setTitle("");
//       setDesc("");
//       setPhones("");
//     } catch (e) {
//       alert(e.response?.data?.message || "Group create failed");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="fixed inset-0 bg-black/50 grid place-items-center z-50">
//       <div className="bg-neutral-900 p-4 border border-neutral-700 rounded-xl w-full max-w-md">
//         <div className="text-lg font-semibold mb-3">Create Group</div>

//         <div className="space-y-3">
//           <input
//             className="w-full bg-neutral-800 px-3 py-2 rounded outline-none"
//             placeholder="Group title"
//             value={title}
//             onChange={(e) => setTitle(e.target.value)}
//           />
//           <input
//             className="w-full bg-neutral-800 px-3 py-2 rounded outline-none"
//             placeholder="Description"
//             value={description}
//             onChange={(e) => setDesc(e.target.value)}
//           />
//           <textarea
//             className="w-full bg-neutral-800 px-3 py-2 rounded outline-none"
//             placeholder="Member phones (comma separated)"
//             value={phones}
//             onChange={(e) => setPhones(e.target.value)}
//           />
//         </div>

//         <div className="flex justify-end mt-4 gap-2">
//           <button
//             className="px-3 py-2 bg-neutral-700 rounded"
//             onClick={onClose}
//           >
//             Cancel
//           </button>
//           <button
//             disabled={loading}
//             onClick={createGroup}
//             className="px-3 py-2 bg-teal-600 hover:bg-teal-500 rounded disabled:opacity-50"
//           >
//             {loading ? "Creating..." : "Create"}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }



import { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE } from "../api";
import { socket } from "../socket";
import { useAuth } from "../context/AuthContext";

export default function GroupCreateModal({ open, onClose, onCreated }) {
  const { user } = useAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contacts, setContacts] = useState([]); // List of contacts from existing chats
  const [selectedMembers, setSelectedMembers] = useState([]); // Selected user IDs
  const [avatar, setAvatar] = useState(null); // File object
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);

  // ✅ Fetch contacts when modal opens
  useEffect(() => {
    if (!open || !user?.token) return;

    const fetchContacts = async () => {
      setLoadingContacts(true);
      try {
        const { data } = await axios.get(`${API_BASE}/chats`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });

        // Extract unique contacts from 1:1 chats (not groups)
        const contactList = data
          .filter(chat => !chat.isGroup && chat.other)
          .map(chat => ({
            id: chat.other.id,
            name: chat.other.full_name || chat.other.phone,
            phone: chat.other.phone,
          }));

        setContacts(contactList);
      } catch (err) {
        console.error("Failed to load contacts:", err);
      } finally {
        setLoadingContacts(false);
      }
    };

    fetchContacts();
  }, [open, user]);

  // ✅ Toggle member selection
  const toggleMember = (userId) => {
    setSelectedMembers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  // ✅ Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setTitle("");
      setDescription("");
      setSelectedMembers([]);
      setAvatar(null);
      setAvatarPreview(null);
    }
  }, [open]);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatar(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  if (!open) return null;

  const createGroup = () => {
    if (!title.trim()) return alert("Group title required");
    if (selectedMembers.length === 0) return alert("Select at least one member");

    setLoading(true);

    // ✅ Ensure socket is connected
    if (!socket.connected) {
      socket.connect();
    }

    // ✅ Get phone numbers of selected members
    const phones = contacts
      .filter((c) => selectedMembers.includes(c.id))
      .map((c) => c.phone);

    const proceed = async () => {
      let avatarUrl = "";
      if (avatar) {
        try {
          const formData = new FormData();
          formData.append("file", avatar);
          const { data } = await axios.post(`${API_BASE}/upload`, formData, {
            headers: {
              Authorization: `Bearer ${user.token}`,
              "Content-Type": "multipart/form-data",
            },
          });
          avatarUrl = data.url;
        } catch (err) {
          console.error("Avatar upload failed:", err);
          setLoading(false);
          return alert("Avatar upload failed. Proceeding without it?");
        }
      }

      const timeout = setTimeout(() => {
        setLoading(false);
        alert("Group creation timed out. Please check your connection.");
      }, 10000);

      // ✅ Emit socket event with proper callback handling
      socket.emit(
        "group:create",
        {
          title,
          description,
          participants: phones,
          avatar: avatarUrl,
        },
        (response) => {
          clearTimeout(timeout);
          setLoading(false);

          if (response?.success) {
            setTitle("");
            setDescription("");
            setSelectedMembers([]);
            setAvatar(null);
            setAvatarPreview(null);
            if (onCreated) onCreated();
            onClose();
          } else {
            alert(response?.error || "Failed to create group. Please try again.");
          }
        }
      );
    };

    proceed();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-md rounded-xl p-4 sm:p-5 border border-background-dark max-h-[90vh] overflow-hidden flex flex-col shadow-xl">
        <h2 className="text-lg sm:text-xl font-semibold mb-4 text-primary">Create Group</h2>

        {/* ✅ Avatar Selection */}
        <div className="flex flex-col items-center mb-5 gap-3">
          <label className="relative cursor-pointer group">
            <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-3xl border-2 border-dashed border-primary/20 flex items-center justify-center overflow-hidden transition-all group-hover:border-secondary shadow-lg ${avatarPreview ? 'border-solid' : ''}`}>
              {avatarPreview ? (
                <img src={avatarPreview} alt="Group" className="w-full h-full object-cover" />
              ) : (
                <svg className="w-8 h-8 sm:w-10 sm:h-10 text-primary/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
              <div className="absolute inset-0 bg-primary/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-3xl">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
            </div>
            <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
          </label>
          <div className="text-[10px] sm:text-xs font-bold text-primary/40 uppercase tracking-widest">Tap to upload group image</div>
        </div>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-background border border-background-dark px-3 py-2.5 rounded-lg mb-3 outline-none text-sm sm:text-base focus:ring-2 focus:ring-secondary transition-shadow text-primary placeholder:text-primary/50"
          placeholder="Group name"
        />

        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full bg-background border border-background-dark px-3 py-2.5 rounded-lg mb-3 outline-none text-sm sm:text-base focus:ring-2 focus:ring-secondary transition-shadow text-primary placeholder:text-primary/50"
          placeholder="Group description (optional)"
        />

        {/* ✅ Contact Selection */}
        <div className="text-xs sm:text-sm text-primary/60 mb-2">Select Members:</div>

        <div className="flex-1 overflow-y-auto bg-background border border-background-dark rounded-lg p-2 mb-4 max-h-48">
          {loadingContacts ? (
            <div className="text-primary/60 text-sm p-2">Loading contacts...</div>
          ) : contacts.length === 0 ? (
            <div className="text-primary/60 text-sm p-2">No contacts found. Start a chat first.</div>
          ) : (
            contacts.map((contact) => (
              <label
                key={contact.id}
                className="flex items-center gap-3 p-2 hover:bg-background-dark rounded-lg cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedMembers.includes(contact.id)}
                  onChange={() => toggleMember(contact.id)}
                  className="w-4 h-4 accent-secondary"
                />
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary grid place-items-center text-xs font-semibold uppercase text-white">
                    {contact.name?.[0] || "?"}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate text-primary">{contact.name}</div>
                    <div className="text-xs text-primary/60">{contact.phone}</div>
                  </div>
                </div>
              </label>
            ))
          )}
        </div>

        {/* ✅ Selected count */}
        {selectedMembers.length > 0 && (
          <div className="text-xs text-secondary-dark mb-3">
            {selectedMembers.length} member{selectedMembers.length > 1 ? "s" : ""} selected
          </div>
        )}

        <div className="flex justify-end gap-2 sm:gap-3">
          <button
            className="px-3 sm:px-4 py-2 bg-background-dark rounded-lg hover:bg-background text-primary text-sm font-medium transition-colors"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            className="px-3 sm:px-4 py-2 bg-primary rounded-lg hover:bg-primary-light disabled:opacity-50 text-sm font-medium transition-colors text-white"
            onClick={createGroup}
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Group"}
          </button>
        </div>
      </div>
    </div>
  );
}
