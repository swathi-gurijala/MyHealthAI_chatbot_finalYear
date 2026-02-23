import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Mic, 
  MicOff, 
  Paperclip, 
  User, 
  LogOut, 
  History, 
  FileText, 
  Activity,
  Plus,
  Stethoscope,
  Download,
  MessageSquare
} from 'lucide-react';
import { chatWithAI, analyzeReport, generateSessionTitle } from './services/gemini';
import { cn, formatTime } from './lib/utils';
import { jsPDF } from 'jspdf';

// --- Types ---
interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  mobile?: string;
  bloodGroup?: string;
  personalNotes?: string;
}

// --- Components ---

const Navbar = ({ user, onLogout, activeTab, setActiveTab }: any) => (
  <nav className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
    <div className="flex items-center gap-2">
      <div className="bg-blue-600 p-2 rounded-lg">
        <Stethoscope className="text-white w-6 h-6" />
      </div>
      <h1 className="text-xl font-bold text-slate-900 tracking-tight">MyHealthAI</h1>
    </div>
    
    <div className="flex items-center gap-6">
      <button 
        onClick={() => setActiveTab('chat')}
        className={cn("text-sm font-medium transition-colors", activeTab === 'chat' ? "text-blue-600" : "text-slate-500 hover:text-slate-900")}
      >
        Chat
      </button>
      <button 
        onClick={() => setActiveTab('dashboard')}
        className={cn("text-sm font-medium transition-colors", activeTab === 'dashboard' ? "text-blue-600" : "text-slate-500 hover:text-slate-900")}
      >
        Dashboard
      </button>
      <div className="h-4 w-[1px] bg-slate-200" />
      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-semibold text-slate-900">
            {user?.firstName || 'User'} {user?.lastName || ''}
          </p>
          <p className="text-xs text-slate-500">{user?.email || ''}</p>
        </div>
        <button 
          onClick={onLogout}
          className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </div>
  </nav>
);

const MessageBubble = ({ msg }: { msg: Message }) => {
  const isAssistant = msg.role === 'assistant';
  
  // Simple markdown-like parser for bold and lists
  const renderContent = (content: string) => {
    return content.split('\n').map((line, i) => {
      let processed = line;
      // Bold
      processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-blue-900">$1</strong>');
      // Lists
      if (processed.trim().startsWith('* ')) {
        return <li key={i} className="ml-4 list-disc" dangerouslySetInnerHTML={{ __html: processed.trim().substring(2) }} />;
      }
      return <p key={i} className="mb-2" dangerouslySetInnerHTML={{ __html: processed }} />;
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={cn(
        "flex flex-col max-w-[85%] sm:max-w-[75%]",
        msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
      )}
    >
      <div className={cn(
        "p-5 rounded-3xl shadow-md transition-all duration-300",
        msg.role === 'user' 
          ? "bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-tr-none" 
          : "bg-white text-slate-800 rounded-tl-none border border-slate-100 relative overflow-hidden bg-gradient-to-br from-white to-blue-50/30"
      )}>
        {isAssistant && (
          <div className="absolute top-0 right-0 p-2 opacity-10">
            <Stethoscope className="w-12 h-12 text-blue-600 rotate-12" />
          </div>
        )}

        <div className="text-sm leading-relaxed relative z-10">
          {renderContent(msg.content)}
        </div>
      </div>
      <span className="text-[10px] text-slate-400 mt-1.5 px-3 flex items-center gap-1">
        {isAssistant && <Activity className="w-3 h-3 text-blue-400" />}
        {formatTime(msg.timestamp)}
      </span>
    </motion.div>
  );
};

const ChatInterface = ({ 
  user, 
  messages, 
  isLoading, 
  isRecording, 
  input, 
  setInput, 
  handleSend, 
  handleFileUpload, 
  startSpeechRecognition,
  messagesEndRef,
  fileInputRef,
  onNewChat
}: any) => {
  return (
    <div className="flex flex-col h-[calc(100vh-73px)] bg-[#F8FAFC]">
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {messages.length > 0 && (
          <div className="flex justify-end mb-4">
            <button 
              onClick={onNewChat}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors text-xs font-medium"
            >
              <Plus className="w-3 h-3" />
              New Chat
            </button>
          </div>
        )}
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-8 max-w-lg mx-auto">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-blue-400 blur-3xl opacity-20 rounded-full animate-pulse" />
              <div className="relative bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-3xl shadow-2xl shadow-blue-200">
                <Stethoscope className="w-12 h-12 text-white" />
              </div>
            </motion.div>
            
            <div className="space-y-3">
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                How can I help you, <span className="text-blue-600">{user?.firstName || 'there'}</span>?
              </h2>
              <p className="text-slate-500 text-lg">
                I'm your intelligent medical companion. Ask me about symptoms, reports, or wellness.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              {[
                { icon: Activity, text: "Check my symptoms", query: "I have some symptoms I'd like to check." },
                { icon: FileText, text: "Analyze a report", query: "Can you help me understand a medical report?" },
                { icon: Plus, text: "Wellness advice", query: "Give me some general wellness and lifestyle tips." },
                { icon: History, text: "Yoga & Diet", query: "Suggest some yoga and diet plans for general health." }
              ].map((item, idx) => (
                <motion.button
                  key={idx}
                  whileHover={{ y: -4, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSend(item.query)}
                  className="flex items-center gap-4 p-5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-200 transition-all text-left"
                >
                  <div className="bg-blue-50 p-3 rounded-xl">
                    <item.icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="font-semibold text-slate-700 text-sm">{item.text}</span>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} />
          ))}
        </AnimatePresence>
        
        {isLoading && (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 text-slate-400 text-xs px-4"
          >
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" />
            </div>
            MyHealthAI is analyzing...
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 sm:p-6 bg-white border-t border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
        <div className="max-w-4xl mx-auto flex items-end gap-3">
          <div className="flex-1 relative bg-slate-50 rounded-[2rem] border border-slate-200 focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-50 transition-all duration-300">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
              placeholder="Describe your symptoms or ask a question..."
              className="w-full p-5 pr-32 bg-transparent border-none focus:ring-0 resize-none max-h-40 min-h-[64px] text-slate-800 placeholder:text-slate-400"
              rows={1}
            />
            <div className="absolute right-3 bottom-3 flex items-center gap-1.5">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 hover:bg-white hover:shadow-sm rounded-full text-slate-500 hover:text-blue-600 transition-all"
                title="Upload Report"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              <button 
                onClick={startSpeechRecognition}
                className={cn(
                  "p-2.5 rounded-full transition-all", 
                  isRecording ? "bg-red-500 text-white shadow-lg shadow-red-200" : "hover:bg-white hover:shadow-sm text-slate-500 hover:text-blue-600"
                )}
                title="Voice Input"
              >
                {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="p-5 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-[2rem] hover:shadow-xl hover:shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Send className="w-6 h-6" />
          </motion.button>
        </div>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
          accept=".pdf,image/*" 
          className="hidden" 
        />
        <div className="flex items-center justify-center gap-2 mt-4">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">
            AI-Powered Medical Assistant • Secure & Encrypted
          </p>
        </div>
      </div>
    </div>
  );
};

const Dashboard = ({ user, onUpdateProfile, sessions, onSessionClick }: { user: UserProfile, onUpdateProfile: (data: any) => void, sessions: any[], onSessionClick: (id: number) => void }) => {
  const [profile, setProfile] = useState(user);
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    onUpdateProfile(profile);
    setIsEditing(false);
  };

  const downloadSessionPDF = async (sessionId: number, title: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`/api/chat/history?sessionId=${sessionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const doc = new jsPDF();
        doc.setFontSize(20);
        doc.text(`Chat History: ${title}`, 20, 20);
        doc.setFontSize(12);
        
        let y = 40;
        data.forEach((msg: any) => {
          const role = msg.role === 'user' ? 'You' : 'AI Assistant';
          const time = formatTime(new Date(msg.created_at));
          const text = `${role} (${time}): ${msg.content}`;
          const splitText = doc.splitTextToSize(text, 170);
          
          if (y + splitText.length * 7 > 280) {
            doc.addPage();
            y = 20;
          }
          
          doc.text(splitText, 20, y);
          y += splitText.length * 7 + 5;
        });
        
        doc.save(`chat-history-${title.toLowerCase().replace(/\s+/g, '-')}.pdf`);
      }
    } catch (err) {
      console.error("Failed to download PDF:", err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Health Dashboard</h2>
          <p className="text-slate-500">Manage your profile and health records.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            {isEditing ? 'Save Changes' : 'Edit Profile'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-2 text-slate-900 font-semibold border-b border-slate-100 pb-4">
              <User className="w-5 h-5 text-blue-600" />
              Personal Information
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">First Name</label>
                {isEditing ? (
                  <input 
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                    value={profile?.firstName || ''}
                    onChange={e => setProfile({...profile, firstName: e.target.value})}
                  />
                ) : (
                  <p className="text-slate-900 font-medium">{profile?.firstName || 'Not set'}</p>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Last Name</label>
                {isEditing ? (
                  <input 
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                    value={profile?.lastName || ''}
                    onChange={e => setProfile({...profile, lastName: e.target.value})}
                  />
                ) : (
                  <p className="text-slate-900 font-medium">{profile?.lastName || ''}</p>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Email</label>
                <p className="text-slate-900 font-medium">{profile?.email || ''}</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Mobile</label>
                {isEditing ? (
                  <input 
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                    value={profile?.mobile || ''}
                    onChange={e => setProfile({...profile, mobile: e.target.value})}
                  />
                ) : (
                  <p className="text-slate-900 font-medium">{profile?.mobile || 'Not set'}</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2 text-slate-900 font-semibold">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                Chat History
              </div>
              <button 
                onClick={() => {
                  setMessages([]);
                  setCurrentSessionId(null);
                  setActiveTab('chat');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                New Chat
              </button>
            </div>
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {sessions.length === 0 ? (
                <p className="text-slate-500 text-sm italic">No chat history yet.</p>
              ) : (
                sessions.map((session: any) => (
                  <div key={session.id} className="group flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-blue-200 hover:shadow-md transition-all cursor-pointer">
                    <div className="flex-1" onClick={() => onSessionClick(session.id)}>
                      <h4 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">{session.title}</h4>
                      <p className="text-[10px] text-slate-400 mt-1">{new Date(session.created_at).toLocaleDateString()} at {formatTime(new Date(session.created_at))}</p>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadSessionPDF(session.id, session.title);
                      }}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      title="Download PDF"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-blue-600 p-6 rounded-2xl text-white shadow-lg shadow-blue-200">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold uppercase tracking-widest opacity-80">Blood Group</span>
              <Activity className="w-5 h-5 opacity-80" />
            </div>
            {isEditing ? (
              <select 
                className="w-full p-2 bg-blue-500 border border-blue-400 rounded-lg text-sm text-white"
                value={profile.bloodGroup || ''}
                onChange={e => setProfile({...profile, bloodGroup: e.target.value})}
              >
                <option value="">Select</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            ) : (
              <p className="text-4xl font-bold">{profile.bloodGroup || '--'}</p>
            )}
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-blue-600" />
              Recent Activity
            </h3>
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="w-2 h-2 mt-1.5 rounded-full bg-blue-400" />
                  <div>
                    <p className="text-xs font-medium text-slate-800">Symptom Check</p>
                    <p className="text-[10px] text-slate-500">2 days ago</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main App Component ---

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'dashboard'>('chat');
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authForm, setAuthForm] = useState({ email: '', password: '', firstName: '', lastName: '' });
  const [sessions, setSessions] = useState<any[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async (text?: string) => {
    const messageText = text || input;
    if (!messageText.trim() || isLoading) return;

    let sessionId = currentSessionId;
    const token = localStorage.getItem('token');

    // Create session if it doesn't exist
    if (!sessionId && token) {
      setIsLoading(true);
      try {
        const title = await generateSessionTitle(messageText);
        const res = await fetch('/api/chat/sessions', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ title })
        });
        const data = await res.json();
        sessionId = data.id;
        setCurrentSessionId(sessionId);
        setSessions(prev => [{ id: sessionId, title, created_at: new Date().toISOString() }, ...prev]);
      } catch (err) {
        console.error("Failed to create session:", err);
      } finally {
        setIsLoading(false);
      }
    }

    const userMessage: Message = { role: 'user', content: messageText, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    saveToHistory('user', messageText, sessionId);
    setInput('');
    setIsLoading(true);

    try {
      const response = await chatWithAI([...messages, userMessage].map(m => ({ role: m.role, content: m.content })), user);
      const assistantMessage: Message = { 
        role: 'assistant', 
        content: response || "I'm sorry, I couldn't process that.", 
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
      saveToHistory('assistant', response || "I'm sorry, I couldn't process that.", sessionId);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let sessionId = currentSessionId;
    const token = localStorage.getItem('token');

    setIsLoading(true);

    // Create session if it doesn't exist
    if (!sessionId && token) {
      try {
        const title = `Report: ${file.name}`;
        const res = await fetch('/api/chat/sessions', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ title })
        });
        const data = await res.json();
        sessionId = data.id;
        setCurrentSessionId(sessionId);
        setSessions(prev => [{ id: sessionId, title, created_at: new Date().toISOString() }, ...prev]);
      } catch (err) {
        console.error("Failed to create session:", err);
      }
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      try {
        const analysis = await analyzeReport(base64, file.type);
        const userMsg: Message = { role: 'user', content: `Uploaded report: ${file.name}`, timestamp: new Date() };
        const assistantMsg: Message = { role: 'assistant', content: analysis, timestamp: new Date() };
        setMessages(prev => [...prev, userMsg, assistantMsg]);
        saveToHistory('user', `Uploaded report: ${file.name}`, sessionId);
        saveToHistory('assistant', analysis, sessionId);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const startSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("Speech recognition not supported in this browser.");
      return;
    }
    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      handleSend(transcript);
    };
    recognition.start();
  };

  const fetchSessions = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch('/api/chat/sessions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch (err) {
      console.error("Failed to fetch sessions:", err);
    }
  };

  const fetchSessionMessages = async (sessionId: number) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/chat/history?sessionId=${sessionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const formattedMessages = data.map((h: any) => ({
          role: h.role,
          content: h.content,
          timestamp: new Date(h.created_at)
        }));
        setMessages(formattedMessages);
        setCurrentSessionId(sessionId);
        setActiveTab('chat');
      }
    } catch (err) {
      console.error("Failed to fetch session messages:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setCurrentSessionId(null);
    setActiveTab('chat');
  };

  useEffect(() => {
    try {
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');
      if (token && savedUser) {
        setUser(JSON.parse(savedUser));
        fetchSessions();
      }
    } catch (err) {
      console.error("Failed to parse saved user:", err);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } finally {
      setIsAuthLoading(false);
    }
  }, []);

  const saveToHistory = async (role: string, content: string, sessionId?: number | null) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await fetch('/api/chat/history', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role, content, sessionId })
      });
    } catch (err) {
      console.error("Failed to save history:", err);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      });
      const data = await res.json();
      if (res.ok) {
        if (authMode === 'login') {
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          setUser(data.user);
        } else {
          setAuthMode('login');
          alert("Registration successful! Please login.");
        }
      } else {
        alert(data.error);
        if (authMode === 'register' && data.error.includes('already exists')) {
          setAuthMode('login');
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const handleUpdateProfile = async (profileData: any) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileData)
      });
      if (res.ok) {
        const updatedUser = { ...user, ...profileData };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (isAuthLoading) return null;

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-slate-200"
        >
          <div className="flex flex-col items-center text-center mb-8">
            <div className="bg-blue-600 p-3 rounded-2xl mb-4">
              <Stethoscope className="text-white w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">MyHealthAI</h1>
            <p className="text-slate-500 mt-1">Your intelligent medical companion</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === 'register' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">First Name</label>
                  <input 
                    required
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    value={authForm.firstName}
                    onChange={e => setAuthForm({...authForm, firstName: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Last Name</label>
                  <input 
                    required
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    value={authForm.lastName}
                    onChange={e => setAuthForm({...authForm, lastName: e.target.value})}
                  />
                </div>
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Email Address</label>
              <input 
                type="email"
                required
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={authForm.email}
                onChange={e => setAuthForm({...authForm, email: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Password</label>
              <input 
                type="password"
                required
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={authForm.password}
                onChange={e => setAuthForm({...authForm, password: e.target.value})}
              />
            </div>
            <button 
              type="submit"
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 mt-4"
            >
              {authMode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button 
              onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              className="text-sm text-blue-600 font-semibold hover:underline"
            >
              {authMode === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Navbar 
        user={user} 
        onLogout={handleLogout} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
      />
      
      <main className="h-[calc(100vh-73px)] overflow-hidden">
        {activeTab === 'chat' ? (
          <ChatInterface 
            user={user} 
            messages={messages} 
            isLoading={isLoading} 
            isRecording={isRecording}
            input={input}
            setInput={setInput}
            handleSend={handleSend}
            handleFileUpload={handleFileUpload}
            startSpeechRecognition={startSpeechRecognition}
            messagesEndRef={messagesEndRef}
            fileInputRef={fileInputRef}
            onNewChat={startNewChat}
          />
        ) : (
          <div className="h-full overflow-y-auto">
            <Dashboard 
              user={user} 
              onUpdateProfile={handleUpdateProfile} 
              sessions={sessions}
              onSessionClick={fetchSessionMessages}
            />
          </div>
        )}
      </main>
    </div>
  );
}
