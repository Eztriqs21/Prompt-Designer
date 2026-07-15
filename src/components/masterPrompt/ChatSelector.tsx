import type { ChatSession } from '../../types';
import CustomSelect from '../ui/CustomSelect';

interface ChatSelectorProps {
  chats: ChatSession[];
  activeChatId: string | null;
  onSelect: (chatId: string) => void;
  onDelete: (chatId: string) => void;
}

export default function ChatSelector({ chats, activeChatId, onSelect, onDelete }: ChatSelectorProps) {
  if (chats.length === 0) return null;

  const options = chats.map((chat) => ({ value: chat.id, label: chat.title }));

  return (
    <div className="flex items-center gap-2">
      <CustomSelect
        value={activeChatId ?? ''}
        options={options}
        onChange={(val) => onSelect(val)}
        placeholder="Select chat..."
      />
      {activeChatId && (
        <button
          onClick={() => {
            if (confirm('Delete this chat?')) onDelete(activeChatId);
          }}
          className="text-[11px] text-white/25 hover:text-red-400 transition-colors px-2 py-1"
        >
          Delete
        </button>
      )}
    </div>
  );
}
