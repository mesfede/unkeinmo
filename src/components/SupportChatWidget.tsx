import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, User, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { addSupportMessageToFirebase, syncSupportMessages } from '../lib/dbService';
import { SupportMessage } from '../types';

interface SupportChatWidgetProps {
  currentUser: any;
  userProfile?: any;
}

export function SupportChatWidget({ currentUser, userProfile }: SupportChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const brandColor = userProfile?.brandColor || '#2E847A';

  // Listen to messages for this specific user
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = syncSupportMessages(
      (msgs) => {
        setMessages(msgs);
        
        // If the chat is closed, count admin messages as unread
        if (!isOpen) {
          const adminMsgs = msgs.filter(m => m.isFromAdmin);
          // If we have messages, let's look at the ones sent after the last user message or just the last message
          if (adminMsgs.length > 0) {
            const lastMsg = msgs[msgs.length - 1];
            if (lastMsg.isFromAdmin) {
              setUnreadCount(prev => prev + 1);
            }
          }
        }
      },
      (err) => console.error(err),
      currentUser.uid
    );

    return () => unsubscribe();
  }, [currentUser, isOpen]);

  // Reset unread count when chat is opened
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      setTimeout(scrollToBottom, 100);
    }
  }, [isOpen]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || !currentUser || isSending) return;

    setIsSending(true);
    const textToSend = newMessageText.trim();
    setNewMessageText('');

    try {
      await addSupportMessageToFirebase({
        chatId: currentUser.uid,
        senderId: currentUser.uid,
        senderName: userProfile?.name || currentUser.displayName || currentUser.email?.split('@')[0] || 'Usuario',
        senderEmail: currentUser.email || '',
        text: textToSend,
        timestamp: new Date().toISOString(),
        isFromAdmin: false
      });
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setIsSending(false);
    }
  };

  if (!currentUser) return null;

  // Don't show floating widget to the admin themselves, they'll have the dedicated View
  const isMesfedeAdmin = currentUser?.email?.toLowerCase() === 'mesfede@gmail.com' || 
                         currentUser?.email?.toLowerCase() === 'mesfede@unkeinmo.com' || 
                         userProfile?.email?.toLowerCase() === 'mesfede@gmail.com' || 
                         userProfile?.email?.toLowerCase() === 'mesfede@unkeinmo.com';

  if (isMesfedeAdmin) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="absolute bottom-20 right-0 w-[380px] h-[520px] max-w-[calc(100vw-2rem)] bg-white/95 backdrop-blur-md rounded-3xl border border-black/5 shadow-2xl flex flex-col overflow-hidden font-sans"
            id="unke-support-chat-box"
          >
            {/* Header */}
            <div 
              className="p-4.5 text-white flex items-center justify-between shadow-md relative"
              style={{ backgroundColor: brandColor }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm border border-white/10 uppercase">
                  F
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">Federico — Soporte UNKE</h3>
                  <p className="text-[10px] text-white/80 font-medium">Responde por lo general al instante</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
                title="Cerrar chat"
                id="close-support-chat-btn"
              >
                <X size={18} />
              </button>
            </div>

            {/* Message Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-neutral-50/50">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-6">
                  <div className="p-3 bg-neutral-100 rounded-full text-neutral-400 mb-3">
                    <MessageSquare size={24} />
                  </div>
                  <h4 className="text-xs font-bold text-neutral-800">¿En qué podemos ayudarte?</h4>
                  <p className="text-[11px] text-neutral-500 mt-1 max-w-[200px]">
                    Escribile directamente a Federico. Podés consultar sobre cargas, clientes, inmuebles o reportar cualquier problema.
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = !msg.isFromAdmin;
                  const date = new Date(msg.timestamp);
                  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div 
                      key={msg.id} 
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1 mb-1">
                        <span className="text-[9px] font-semibold text-neutral-400">
                          {isMe ? 'Tú' : 'Soporte UNKE'}
                        </span>
                        <span className="text-[8px] text-neutral-300">•</span>
                        <span className="text-[8px] text-neutral-400">{timeStr}</span>
                      </div>
                      <div 
                        className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-xs font-semibold leading-relaxed shadow-sm ${
                          isMe 
                            ? 'text-white rounded-tr-none' 
                            : 'bg-white text-neutral-800 border border-neutral-100 rounded-tl-none'
                        }`}
                        style={isMe ? { backgroundColor: brandColor } : {}}
                      >
                        {msg.text}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-neutral-100 flex items-center gap-2">
              <input
                type="text"
                placeholder="Escribí un mensaje..."
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                className="flex-1 text-xs font-semibold px-4 py-2.5 bg-neutral-100 hover:bg-neutral-150/50 focus:bg-white rounded-xl border border-transparent focus:border-neutral-200 outline-none transition-all placeholder:text-neutral-400 text-neutral-800"
                maxLength={1000}
                required
                id="support-message-input"
              />
              <button
                type="submit"
                disabled={!newMessageText.trim() || isSending}
                className="p-2.5 rounded-xl text-white transition-all hover:scale-105 active:scale-95 flex items-center justify-center disabled:opacity-50 disabled:pointer-events-none"
                style={{ backgroundColor: brandColor }}
                id="send-support-message-btn"
              >
                <Send size={15} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-14 h-14 rounded-full text-white shadow-2xl flex items-center justify-center cursor-pointer transition-shadow hover:shadow-teal-500/10"
        style={{ backgroundColor: brandColor }}
        title="Consultas y Soporte"
        id="toggle-support-chat-widget"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}

        {/* Unread dot notification */}
        {!isOpen && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white animate-bounce shadow-md">
            {unreadCount}
          </span>
        )}
      </motion.button>
    </div>
  );
}
