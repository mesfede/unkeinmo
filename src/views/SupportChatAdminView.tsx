import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, User, ChevronRight, Clock, Shield } from 'lucide-react';
import { motion } from 'motion/react';
import { addSupportMessageToFirebase, syncSupportMessages } from '../lib/dbService';
import { SupportMessage } from '../types';

interface SupportChatAdminViewProps {
  currentUser: any;
  userProfile?: any;
}

export function SupportChatAdminView({ currentUser, userProfile }: SupportChatAdminViewProps) {
  const [allMessages, setAllMessages] = useState<SupportMessage[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const brandColor = userProfile?.brandColor || '#2E847A';

  // Listen to ALL messages across all chats
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = syncSupportMessages(
      (msgs) => {
        setAllMessages(msgs);
      },
      (err) => console.error(err)
    );

    return () => unsubscribe();
  }, [currentUser]);

  // Scroll to bottom when conversation or messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedChatId, allMessages]);

  // Group messages by chatId (user UID)
  const chatGroups = allMessages.reduce<Record<string, { userEmail: string; userName: string; lastMessage: SupportMessage; messages: SupportMessage[] }>>((acc, msg) => {
    if (!acc[msg.chatId]) {
      acc[msg.chatId] = {
        userEmail: msg.isFromAdmin ? '' : msg.senderEmail,
        userName: msg.isFromAdmin ? '' : msg.senderName,
        lastMessage: msg,
        messages: []
      };
    }
    
    // Fill in userName / userEmail if not already set (admin messages don't have them, but user messages do)
    if (!msg.isFromAdmin) {
      acc[msg.chatId].userEmail = msg.senderEmail;
      acc[msg.chatId].userName = msg.senderName;
    }
    
    acc[msg.chatId].messages.push(msg);
    
    // Ensure lastMessage is the latest one
    if (new Date(msg.timestamp) > new Date(acc[msg.chatId].lastMessage.timestamp)) {
      acc[msg.chatId].lastMessage = msg;
    }
    
    return acc;
  }, {});

  const chatsList = Object.entries(chatGroups).map(([chatId, data]) => ({
    chatId,
    userName: data.userName || data.userEmail.split('@')[0] || 'Usuario de CRM',
    userEmail: data.userEmail || 'S/D',
    lastMessage: data.lastMessage,
    messagesCount: data.messages.length
  })).sort((a, b) => new Date(b.lastMessage.timestamp).getTime() - new Date(a.lastMessage.timestamp).getTime());

  const activeChatMessages = selectedChatId ? (chatGroups[selectedChatId]?.messages || []) : [];
  const selectedChatData = selectedChatId ? chatsList.find(c => c.chatId === selectedChatId) : null;

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedChatId || isSending || !currentUser) return;

    setIsSending(true);
    const textToSend = replyText.trim();
    setReplyText('');

    try {
      await addSupportMessageToFirebase({
        chatId: selectedChatId,
        senderId: currentUser.uid,
        senderName: 'Soporte UNKE (Federico)',
        senderEmail: currentUser.email || 'mesfede@unkeinmo.com',
        text: textToSend,
        timestamp: new Date().toISOString(),
        isFromAdmin: true
      });
    } catch (err) {
      console.error('Error sending support reply:', err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] min-h-[500px] bg-white/45 backdrop-blur-md rounded-3xl border border-white/60 overflow-hidden shadow-sm font-sans" id="support-chat-admin-container">
      {/* View Header */}
      <div className="px-8 py-5 border-b border-black/5 flex items-center justify-between bg-white/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-[#1D1D1F]">Centro de Soporte Técnico</h1>
            <span className="flex items-center gap-1 text-[10px] bg-[#2E847A]/10 text-[#2E847A] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              <Shield size={10} /> Admin
            </span>
          </div>
          <p className="text-xs text-[#86868B] font-semibold mt-0.5">Respondé consultas de los usuarios de tu inmobiliaria en tiempo real.</p>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left List Pane */}
        <div className="w-1/3 border-r border-black/5 flex flex-col bg-white/20">
          <div className="p-4 border-b border-black/5">
            <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Conversaciones Activas ({chatsList.length})</h2>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-black/[0.03]">
            {chatsList.length === 0 ? (
              <div className="p-8 text-center text-xs font-semibold text-neutral-400">
                Ningún usuario ha enviado consultas todavía.
              </div>
            ) : (
              chatsList.map((chat) => {
                const isSelected = selectedChatId === chat.chatId;
                const date = new Date(chat.lastMessage.timestamp);
                const isToday = date.toDateString() === new Date().toDateString();
                const timeStr = isToday 
                  ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });

                return (
                  <button
                    key={chat.chatId}
                    onClick={() => setSelectedChatId(chat.chatId)}
                    className={`w-full text-left p-4 flex items-start gap-3 transition-all ${
                      isSelected 
                        ? 'bg-white shadow-sm font-bold border-l-4' 
                        : 'hover:bg-white/40'
                    }`}
                    style={isSelected ? { borderLeftColor: brandColor } : {}}
                    id={`support-chat-tab-${chat.chatId}`}
                  >
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white uppercase shrink-0"
                      style={{ backgroundColor: isSelected ? brandColor : '#86868B' }}
                    >
                      {chat.userName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-bold text-neutral-800 truncate">{chat.userName}</span>
                        <span className="text-[9px] font-medium text-neutral-400 flex items-center gap-0.5">
                          <Clock size={10} /> {timeStr}
                        </span>
                      </div>
                      <span className="text-[10px] text-neutral-400 block mb-1 truncate">{chat.userEmail}</span>
                      <p className={`text-[11px] truncate leading-none ${isSelected ? 'text-neutral-700' : 'text-neutral-500'}`}>
                        {chat.lastMessage.isFromAdmin ? (
                          <span className="text-[10px] text-teal-600 font-bold mr-1">Tú:</span>
                        ) : null}
                        {chat.lastMessage.text}
                      </p>
                    </div>
                    <ChevronRight size={14} className="text-neutral-300 mt-1" />
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Chat Pane */}
        <div className="flex-1 flex flex-col bg-white/10">
          {selectedChatId && selectedChatData ? (
            <>
              {/* Active Conversation Header */}
              <div className="p-4 bg-white/60 border-b border-black/5 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-neutral-800">{selectedChatData.userName}</h3>
                  <span className="text-[10px] text-neutral-500 font-semibold">{selectedChatData.userEmail}</span>
                </div>
              </div>

              {/* Chat Stream */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-neutral-50/20">
                {activeChatMessages.map((msg) => {
                  const isMe = msg.isFromAdmin;
                  const date = new Date(msg.timestamp);
                  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div 
                      key={msg.id} 
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 text-[9px] font-semibold text-neutral-400">
                        <span>{isMe ? 'Tú (Soporte)' : msg.senderName}</span>
                        <span>•</span>
                        <span>{timeStr}</span>
                      </div>
                      <div 
                        className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-xs font-semibold leading-relaxed shadow-sm ${
                          isMe 
                            ? 'text-white rounded-tr-none' 
                            : 'bg-white text-neutral-800 border border-neutral-150 rounded-tl-none'
                        }`}
                        style={isMe ? { backgroundColor: brandColor } : {}}
                      >
                        {msg.text}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply Input Bar */}
              <form onSubmit={handleSendReply} className="p-4 bg-white border-t border-black/5 flex items-center gap-2">
                <input
                  type="text"
                  placeholder={`Responder a ${selectedChatData.userName}...`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 text-xs font-semibold px-4 py-3 bg-neutral-100 hover:bg-neutral-150/50 focus:bg-white rounded-xl border border-transparent focus:border-neutral-200 outline-none transition-all placeholder:text-neutral-400 text-neutral-800"
                  maxLength={1000}
                  required
                  id="admin-reply-input"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim() || isSending}
                  className="p-3 rounded-xl text-white transition-all hover:scale-105 active:scale-95 flex items-center justify-center disabled:opacity-50 disabled:pointer-events-none"
                  style={{ backgroundColor: brandColor }}
                  id="send-admin-reply-btn"
                >
                  <Send size={15} />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
              <div className="p-4 bg-neutral-100 rounded-full text-neutral-400 mb-4">
                <MessageSquare size={32} />
              </div>
              <h3 className="text-sm font-bold text-neutral-800">Centro de Soporte UNKE</h3>
              <p className="text-xs text-neutral-500 mt-1.5 max-w-sm leading-relaxed">
                Seleccioná una conversación de la lista de la izquierda para ver las consultas de tus usuarios y responderles en tiempo real.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
