import { useEffect } from 'react';
import { useChatContext } from '../context/ChatContext';

export function useChats(initialChatId: string | null = null) {
  const {
    chats,
    activeChatId,
    messagesByChatId,
    promptsByChatId,
    loading,
    hydrated,
    setActiveChat,
    createNewChat,
    renameChat,
    addMessage,
    setPrompt,
    deleteChat,
    loadChatData,
    loadChats,
    clearError,
  } = useChatContext();

  useEffect(() => {
    if (initialChatId && hydrated) {
      const chatExists = chats.some((c) => c.id === initialChatId);
      if (chatExists) {
        setActiveChat(initialChatId);
      }
    }
  }, [initialChatId, hydrated, chats, setActiveChat]);

  return {
    activeChatId,
    chats,
    messagesByChatId,
    promptsByChatId,
    loading: loading || !hydrated,
    setActiveChat,
    createNewChat,
    renameChat,
    addMessage,
    setPrompt,
    deleteChat,
    loadChatData,
    loadChats,
    clearError,
  };
}
