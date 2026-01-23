import ChatListItem from "./ChatListItem.js";

export default function ChatList({ items, activeId, onOpen, userId }) {
  return (
    <div className="overflow-y-auto divide-y divide-slate-800">
      {items.map(item => (
        <ChatListItem
          key={item.id}
          item={item}
          active={activeId === item.id}
          onClick={() => onOpen(item)}
          userId={userId}
        />
      ))}
      {items.length === 0 && (
        <div className="p-6 text-slate-500 text-sm">No recent chats. Search by phone to start one.</div>
      )}
    </div>
  );
}

