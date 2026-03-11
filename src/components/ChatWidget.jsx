import React, { useState, useEffect, useRef } from 'react';
import { FiMessageSquare, FiSend, FiX, FiMinus, FiCornerDownLeft, FiUser, FiAlertCircle } from "react-icons/fi";
import { TbRobot } from "react-icons/tb";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const ChatWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
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

    return (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-4 pointer-events-none">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="w-80 sm:w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden pointer-events-auto"
                    >
                        {/* Header */}
                        <div className="bg-[#004A99] p-4 text-white flex items-center justify-between shadow-lg">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                                    <TbRobot size={20} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold m-0">InsightED Assistant</h4>
                                    <p className="text-[10px] text-blue-200 m-0">Ask anything about the app</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => {
                                        setMode(mode === 'suggestion' ? 'chat' : 'suggestion');
                                        setFeedbackStatus(null);
                                    }}
                                    className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                                        mode === 'suggestion' 
                                        ? 'bg-yellow-400 text-blue-900 shadow-inner' 
                                        : 'bg-white/10 hover:bg-white/20 text-white'
                                    }`}
                                >
                                    {mode === 'suggestion' ? 'Chat' : 'Suggest'}
                                </button>
                                <button 
                                    onClick={() => {
                                        setMode(mode === 'bug' ? 'chat' : 'bug');
                                        setFeedbackStatus(null);
                                    }}
                                    className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                                        mode === 'bug' 
                                        ? 'bg-red-500 text-white shadow-inner' 
                                        : 'bg-white/10 hover:bg-white/20 text-white'
                                    }`}
                                >
                                    {mode === 'bug' ? 'Chat' : 'Report Bug'}
                                </button>
                                <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                                    <FiMinus size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Messages / Suggestion Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                            {mode === 'chat' ? (
                                <>
                                    {messages.map((msg, idx) => (
                                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[80%] p-3 rounded-2xl text-[11px] leading-relaxed ${msg.role === 'user'
                                                    ? 'bg-[#004A99] text-white rounded-tr-none shadow-md'
                                                    : 'bg-white text-gray-700 border border-gray-100 rounded-tl-none shadow-sm'
                                                }`}>
                                                {msg.role === 'assistant' ? (
                                                    <div className="prose prose-sm max-w-none">
                                                        <ReactMarkdown 
                                                            remarkPlugins={[remarkGfm]}
                                                            components={{
                                                                ul: ({node, ...props}) => <ul className="list-disc ml-5 mb-3 mt-1 space-y-1" {...props} />,
                                                                ol: ({node, ...props}) => <ol className="list-decimal ml-5 mb-3 mt-1 space-y-1" {...props} />,
                                                                li: ({node, ...props}) => <li className="mb-1" {...props} />,
                                                                p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                                                                a: ({node, ...props}) => <a className="text-blue-600 underline font-medium" {...props} />,
                                                                strong: ({node, ...props}) => <strong className="font-extrabold text-gray-900" {...props} />,
                                                                b: ({node, ...props}) => <b className="font-extrabold text-gray-900" {...props} />
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
                                            <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm border border-gray-100 flex flex-col gap-2">
                                                <div className="flex gap-1">
                                                    <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce"></div>
                                                    <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                                    <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                                                </div>
                                                <motion.p 
                                                    key={loadingStatus}
                                                    initial={{ opacity: 0, x: -5 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    className="text-[9px] font-bold text-blue-600 animate-pulse"
                                                >
                                                    {loadingStatus}
                                                </motion.p>
                                            </div>
                                        </div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </>
                            ) : mode === 'suggestion' ? (
                                <div className="h-full flex flex-col justify-center items-center text-center p-4">
                                    <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mb-4">
                                        <FiMessageSquare size={32} />
                                    </div>
                                    <h5 className="text-sm font-bold text-gray-800 mb-2">Help us improve!</h5>
                                    <p className="text-[10px] text-gray-500 mb-6">Type your suggestions for the InsightED Mobile App below.</p>
                                    
                                    <form onSubmit={handleFeedbackSubmit} className="w-full space-y-4">
                                        <div className="relative">
                                            <textarea
                                                className="w-full h-32 bg-white border border-gray-200 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-yellow-400 transition-all resize-none"
                                                placeholder="What can we do better?"
                                                maxLength={200}
                                                value={suggestion}
                                                onChange={(e) => setSuggestion(e.target.value)}
                                            />
                                            <div className={`absolute bottom-2 right-3 text-[9px] font-bold ${suggestion.length >= 200 ? 'text-red-500' : 'text-gray-400'}`}>
                                                {suggestion.length}/200
                                            </div>
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={!suggestion.trim() || loading}
                                            className="w-full py-2.5 bg-[#004A99] text-white rounded-xl text-xs font-bold hover:bg-blue-800 disabled:opacity-50 transition-all shadow-lg shadow-blue-900/10"
                                        >
                                            {loading ? 'Submitting...' : 'Submit Suggestion'}
                                        </button>
                                        
                                        {feedbackStatus === 'success' && (
                                            <p className="text-[10px] text-green-600 font-bold animate-bounce">Thank you! Your feedback has been saved.</p>
                                        )}
                                        {feedbackStatus === 'error' && (
                                            <p className="text-[10px] text-red-500 font-bold">Failed to submit. Please try again later.</p>
                                        )}
                                    </form>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col justify-center items-center text-center p-4">
                                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                                        <FiAlertCircle size={32} />
                                    </div>
                                    <h5 className="text-sm font-bold text-gray-800 mb-2">Report a Bug</h5>
                                    <p className="text-[10px] text-gray-500 mb-6">Found an error? Describe it below and our team will check it.</p>
                                    
                                    <form onSubmit={handleBugSubmit} className="w-full space-y-4">
                                        <div className="relative">
                                            <textarea
                                                className="w-full h-32 bg-white border border-gray-200 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-red-400 transition-all resize-none"
                                                placeholder="Describe the bug or error..."
                                                maxLength={500}
                                                value={bugReport}
                                                onChange={(e) => setBugReport(e.target.value)}
                                            />
                                            <div className={`absolute bottom-2 right-3 text-[9px] font-bold ${bugReport.length >= 500 ? 'text-red-500' : 'text-gray-400'}`}>
                                                {bugReport.length}/500
                                            </div>
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={!bugReport.trim() || loading}
                                            className="w-full py-2.5 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 disabled:opacity-50 transition-all shadow-lg shadow-red-900/10"
                                        >
                                            {loading ? 'Reporting...' : 'Report Bug'}
                                        </button>
                                        
                                        {feedbackStatus === 'success' && (
                                            <p className="text-[10px] text-green-600 font-bold animate-pulse">Developers are on their way to fix this!</p>
                                        )}
                                        {feedbackStatus === 'error' && (
                                            <p className="text-[10px] text-red-500 font-bold">Failed to report. Please try again later.</p>
                                        )}
                                    </form>
                                </div>
                            )}
                        </div>

                        {/* Input Area (Only in Chat Mode) */}
                        {mode === 'chat' && (
                            <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-100 flex items-center gap-2">
                                <input
                                    autoFocus
                                    type="text"
                                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    placeholder="Type your question..."
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                />
                                <button
                                    type="submit"
                                    disabled={!input.trim() || loading}
                                    className="w-8 h-8 bg-[#004A99] text-white rounded-lg flex items-center justify-center hover:bg-blue-800 disabled:opacity-50 transition-all shadow-md shadow-blue-900/10"
                                >
                                    <FiSend size={14} />
                                </button>
                            </form>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toggle Button */}
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
        </div>
    );
};

export default ChatWidget;
