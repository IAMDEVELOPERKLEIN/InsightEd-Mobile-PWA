import React, { useState, useEffect, useRef } from 'react';
import { FiMessageSquare, FiSend, FiX, FiMinus, FiCornerDownLeft, FiUser, FiAlertCircle } from "react-icons/fi";
import { TbRobot } from "react-icons/tb";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const ChatWidget = ({ showFloatingButton = true, embedded = false }) => {
    const [isOpen, setIsOpen] = useState(embedded);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState([
        { role: 'assistant', text: "Hello! I'm your InsightED Assistant. How can I help you today?" }
    ]);
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState('chat'); // 'chat', 'suggestion', or 'bug'
    const [suggestion, setSuggestion] = useState('');
    const [bugReport, setBugReport] = useState('');
    const [feedbackStatus, setFeedbackStatus] = useState(null); // 'success' or 'error'
    const [loadingStatus, setLoadingStatus] = useState("Searching knowledge base...");
    const messagesEndRef = useRef(null);

    const statusMessages = [
        "Searching knowledge base...",
        "Analyzing relevance...",
        "Generating response...",
        "Finishing up..."
    ];

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen) scrollToBottom();
    }, [messages, isOpen]);

    useEffect(() => {
        const handleToggle = () => setIsOpen(prev => !prev);
        window.addEventListener('toggle-chatbot', handleToggle);
        return () => window.removeEventListener('toggle-chatbot', handleToggle);
    }, []);

    useEffect(() => {
        let interval;
        if (loading) {
            let index = 0;
            setLoadingStatus(statusMessages[0]);
            interval = setInterval(() => {
                index = (index + 1) % statusMessages.length;
                setLoadingStatus(statusMessages[index]);
            }, 2000);
        } else {
            setLoadingStatus(statusMessages[0]);
        }
        return () => clearInterval(interval);
    }, [loading]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMessage = { role: 'user', text: input.trim() };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: userMessage.text }),
            });

            if (res.ok) {
                const data = await res.json();
                setMessages(prev => [...prev, { role: 'assistant', text: data.answer }]);
            } else {
                setMessages(prev => [...prev, { role: 'assistant', text: "I'm sorry, I'm having trouble connecting right now. Please try again later." }]);
            }
        } catch (err) {
            console.error(err);
            setMessages(prev => [...prev, { role: 'assistant', text: "Network error. Please check your connection." }]);
        } finally {
            setLoading(false);
        }
    };

    const handleFeedbackSubmit = async (e) => {
        e.preventDefault();
        if (!suggestion.trim() || loading || suggestion.length > 200) return;

        setLoading(true);
        setFeedbackStatus(null);

        try {
            const res = await fetch('/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    content: suggestion.trim()
                }),
            });

            if (res.ok) {
                setFeedbackStatus('success');
                setSuggestion('');
                setTimeout(() => {
                    setFeedbackStatus(null);
                    setMode('chat');
                }, 2000);
            } else {
                setFeedbackStatus('error');
            }
        } catch (err) {
            console.error(err);
            setFeedbackStatus('error');
        } finally {
            setLoading(false);
        }
    };

    const handleBugSubmit = async (e) => {
        e.preventDefault();
        if (!bugReport.trim() || loading || bugReport.length > 500) return;

        setLoading(true);
        setFeedbackStatus(null);

        try {
            const res = await fetch('/api/bugs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    description: bugReport.trim()
                }),
            });

            if (res.ok) {
                setFeedbackStatus('success');
                setBugReport('');
                setTimeout(() => {
                    setFeedbackStatus(null);
                    setMode('chat');
                }, 3000);
            } else {
                setFeedbackStatus('error');
            }
        } catch (err) {
            console.error(err);
            setFeedbackStatus('error');
        } finally {
            setLoading(false);
        }
    };

    const isLoginScreen = window.location.hash === '#/' || window.location.pathname === '/';

    const renderModeSelector = () => (
        <div className="flex bg-slate-100 dark:bg-slate-700 p-1.5 rounded-2xl mx-4 my-2 shadow-inner border border-slate-200 dark:border-slate-600">
            <button 
                onClick={() => setMode('chat')}
                className={`flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-xl transition-all duration-300 ${
                    mode === 'chat' 
                    ? 'bg-white dark:bg-slate-900 text-[#004A99] dark:text-blue-400 shadow-xl scale-100' 
                    : 'text-slate-500 dark:text-slate-400 opacity-60 hover:opacity-100'
                }`}
            >
                <div className={`p-1.5 rounded-lg ${mode === 'chat' ? 'bg-blue-50 dark:bg-blue-900/40' : 'bg-transparent'}`}>
                    <TbRobot size={18} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">Chat</span>
            </button>
            <button 
                onClick={() => setMode('suggestion')}
                className={`flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-xl transition-all duration-300 ${
                    mode === 'suggestion' 
                    ? 'bg-white dark:bg-slate-900 text-yellow-600 dark:text-yellow-400 shadow-xl scale-100' 
                    : 'text-slate-500 dark:text-slate-400 opacity-60 hover:opacity-100'
                }`}
            >
                <div className={`p-1.5 rounded-lg ${mode === 'suggestion' ? 'bg-yellow-50 dark:bg-yellow-900/40' : 'bg-transparent'}`}>
                    <FiMessageSquare size={18} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">Suggest</span>
            </button>
            <button 
                onClick={() => setMode('bug')}
                className={`flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-xl transition-all duration-300 ${
                    mode === 'bug' 
                    ? 'bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 shadow-xl scale-100' 
                    : 'text-slate-500 dark:text-slate-400 opacity-60 hover:opacity-100'
                }`}
            >
                <div className={`p-1.5 rounded-lg ${mode === 'bug' ? 'bg-red-50 dark:bg-red-900/40' : 'bg-transparent'}`}>
                    <FiAlertCircle size={18} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">Bug</span>
            </button>
        </div>
    );

    return (
        <div className={`${embedded ? 'w-full h-full' : `fixed ${isLoginScreen ? 'top-6 right-6' : 'bottom-6 right-6'} z-[9999] flex flex-col items-end gap-4 pointer-events-none`}`}>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={embedded ? false : { opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={embedded ? false : { opacity: 0, y: 20, scale: 0.95 }}
                        className={`${embedded ? 'w-full h-full min-h-[500px]' : 'w-80 sm:w-96 h-[500px] shadow-2xl border border-gray-100 rounded-2xl'} bg-white dark:bg-slate-800 flex flex-col overflow-hidden pointer-events-auto transition-colors duration-300`}
                    >
                        {/* Header (Only for popup mode) */}
                        {!embedded && (
                            <div className="bg-[#004A99] p-4 text-white flex items-center justify-between shadow-lg">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                                        <TbRobot size={20} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold m-0">Assistant</h4>
                                        <p className="text-[10px] text-blue-200 m-0">Always here to help</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                                    <FiMinus size={18} />
                                </button>
                            </div>
                        )}

                        {/* Better Mode Selector */}
                        {renderModeSelector()}

                        {/* Messages / Suggestion Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 dark:bg-slate-900/20">
                            {mode === 'chat' ? (
                                <>
                                    {messages.map((msg, idx) => (
                                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[85%] p-4 rounded-3xl text-[12px] leading-relaxed shadow-sm transition-all animate-in fade-in slide-in-from-bottom-2 duration-300 ${msg.role === 'user'
                                                    ? 'bg-[#004A99] text-white rounded-tr-none shadow-blue-900/10'
                                                    : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-100 border border-gray-100 dark:border-slate-600 rounded-tl-none'
                                                }`}>
                                                {msg.role === 'assistant' ? (
                                                    <div className="prose prose-sm dark:prose-invert max-w-none">
                                                        <ReactMarkdown 
                                                            remarkPlugins={[remarkGfm]}
                                                            components={{
                                                                ul: ({node, ...props}) => <ul className="list-disc ml-5 mb-3 mt-1 space-y-1" {...props} />,
                                                                ol: ({node, ...props}) => <ol className="list-decimal ml-5 mb-3 mt-1 space-y-1" {...props} />,
                                                                li: ({node, ...props}) => <li className="mb-1" {...props} />,
                                                                p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                                                                a: ({node, ...props}) => <a className="text-blue-600 dark:text-blue-400 underline font-medium" {...props} />,
                                                                strong: ({node, ...props}) => <strong className="font-extrabold text-gray-900 dark:text-white" {...props} />,
                                                            }}
                                                        >
                                                            {msg.text}
                                                        </ReactMarkdown>
                                                    </div>
                                                ) : (
                                                    <div className="whitespace-pre-wrap">{msg.text}</div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {loading && (
                                        <div className="flex justify-start">
                                            <div className="bg-white dark:bg-slate-700 p-4 rounded-3xl rounded-tl-none shadow-sm border border-gray-100 dark:border-slate-600 flex flex-col gap-2">
                                                <div className="flex gap-1">
                                                    <div className="w-1.5 h-1.5 bg-[#004A99] dark:bg-blue-400 rounded-full animate-bounce"></div>
                                                    <div className="w-1.5 h-1.5 bg-[#004A99] dark:bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                                    <div className="w-1.5 h-1.5 bg-[#004A99] dark:bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                                                </div>
                                                <motion.p 
                                                    key={loadingStatus}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    className="text-[10px] font-bold text-blue-600 dark:text-blue-400 animate-pulse uppercase tracking-wider"
                                                >
                                                    {loadingStatus}
                                                </motion.p>
                                            </div>
                                        </div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </>
                            ) : mode === 'suggestion' ? (
                                <div className="h-full flex flex-col justify-center items-center text-center p-6 animate-in fade-in duration-300">
                                    <div className="w-20 h-20 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-500 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-yellow-500/10">
                                        <FiMessageSquare size={36} />
                                    </div>
                                    <h5 className="text-lg font-bold text-gray-800 dark:text-white mb-2 tracking-tight">Help us improve!</h5>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-8 max-w-[200px]">Your feedback directly impacts our development roadmap.</p>
                                    
                                    <form onSubmit={handleFeedbackSubmit} className="w-full space-y-6">
                                        <div className="relative">
                                            <textarea
                                                className="w-full h-40 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4 text-sm outline-none focus:border-yellow-400 dark:focus:border-yellow-500 transition-all resize-none shadow-sm dark:text-white"
                                                placeholder="Tell us what's on your mind..."
                                                maxLength={200}
                                                value={suggestion}
                                                onChange={(e) => setSuggestion(e.target.value)}
                                            />
                                            <div className={`absolute bottom-3 right-4 text-[10px] font-black ${suggestion.length >= 200 ? 'text-red-500' : 'text-slate-300'}`}>
                                                {suggestion.length}/200
                                            </div>
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={!suggestion.trim() || loading}
                                            className="w-full py-4 bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700 text-white rounded-2xl text-sm font-black transition-all shadow-xl shadow-yellow-500/20 active:scale-95 disabled:opacity-50"
                                        >
                                            {loading ? 'Submitting...' : 'Send Feedback'}
                                        </button>
                                        
                                        {feedbackStatus === 'success' && (
                                            <p className="text-xs text-green-600 dark:text-green-400 font-bold animate-bounce mt-4">✓ We've received your suggestion!</p>
                                        )}
                                        {feedbackStatus === 'error' && (
                                            <p className="text-xs text-red-500 font-bold mt-4">Error sending feedback. Please try again.</p>
                                        )}
                                    </form>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col justify-center items-center text-center p-6 animate-in fade-in duration-300">
                                    <div className="w-20 h-20 bg-red-50 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-red-500/10">
                                        <FiAlertCircle size={36} />
                                    </div>
                                    <h5 className="text-lg font-bold text-gray-800 dark:text-white mb-2 tracking-tight">Report an Issue</h5>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-8 max-w-[200px]">Let us know if something isn't working correctly.</p>
                                    
                                    <form onSubmit={handleBugSubmit} className="w-full space-y-6">
                                        <div className="relative">
                                            <textarea
                                                className="w-full h-40 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4 text-sm outline-none focus:border-red-400 dark:focus:border-red-500 transition-all resize-none shadow-sm dark:text-white"
                                                placeholder="Describe the problem in detail..."
                                                maxLength={500}
                                                value={bugReport}
                                                onChange={(e) => setBugReport(e.target.value)}
                                            />
                                            <div className={`absolute bottom-3 right-4 text-[10px] font-black ${bugReport.length >= 500 ? 'text-red-500' : 'text-slate-300'}`}>
                                                {bugReport.length}/500
                                            </div>
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={!bugReport.trim() || loading}
                                            className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-sm font-black transition-all shadow-xl shadow-red-600/20 active:scale-95 disabled:opacity-50"
                                        >
                                            {loading ? 'Reporting...' : 'Submit Bug Report'}
                                        </button>
                                        
                                        {feedbackStatus === 'success' && (
                                            <p className="text-xs text-green-600 font-bold animate-pulse mt-4">✓ Developers notified! Fixing now.</p>
                                        )}
                                        {feedbackStatus === 'error' && (
                                            <p className="text-xs text-red-500 font-bold mt-4">Failed to report. Please check connection.</p>
                                        )}
                                    </form>
                                </div>
                            )}
                        </div>

                        {/* Input Area (Only in Chat Mode) */}
                        {mode === 'chat' && (
                            <form onSubmit={handleSend} className="p-4 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 flex items-center gap-3 transition-colors duration-300">
                                <div className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 flex items-center transition-all focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500/50">
                                    <input
                                        autoFocus={!embedded}
                                        type="text"
                                        className="w-full bg-transparent text-sm dark:text-white outline-none placeholder-slate-400"
                                        placeholder="Ask a question..."
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={!input.trim() || loading}
                                    className="w-12 h-12 bg-[#004A99] hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-2xl flex items-center justify-center transition-all shadow-lg shadow-blue-900/10 active:scale-90 disabled:opacity-50"
                                >
                                    <FiSend size={18} />
                                </button>
                            </form>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toggle Button */}
            {(!embedded && showFloatingButton) && (
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-14 h-14 bg-[#004A99] text-white rounded-full shadow-2xl flex items-center justify-center pointer-events-auto hover:bg-blue-800 transition-all relative group"
                >
                    {isOpen ? <FiX size={24} /> : <FiMessageSquare size={24} />}
                    {!isOpen && (
                        <div className="absolute right-full mr-3 px-3 py-2 bg-white text-[#004A99] text-xs font-bold rounded-xl shadow-lg border border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                            Need help? Ask me!
                        </div>
                    )}
                </motion.button>
            )}
        </div>
    );
};

export default ChatWidget;
