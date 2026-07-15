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
    if (hydrated && chats.length === 0) {
      loadChats();
    }
  }, [hydrated, chats.length, loadChats]);

  useEffect(() => {
    if (initialChatId && hydrated) {
      const chatExists = chats.some((c) => c.id === initialChatId);
      const messagesLoaded = (messagesByChatId[initialChatId]?.length ?? 0) > 0;
      if (!chatExists || !messagesLoaded) {
        loadChatData(initialChatId).then(() => {
          setActiveChat(initialChatId);
        });
      } else {
        setActiveChat(initialChatId);
      }
    }
  }, [initialChatId, hydrated, chats, messagesByChatId, loadChatData, setActiveChat]);

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
