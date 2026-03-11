import React, { useState, useEffect } from 'react';
import { FiUpload, FiSend, FiFileText, FiCheckCircle, FiAlertCircle, FiLoader, FiTrash2, FiEdit3, FiX, FiSave, FiHelpCircle, FiMessageCircle } from "react-icons/fi";

const KnowledgeManager = () => {
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [knowledgeList, setKnowledgeList] = useState([]);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [editingId, setEditingId] = useState(null);
    const [editQuestion, setEditQuestion] = useState('');
    const [editAnswer, setEditAnswer] = useState('');

    useEffect(() => {
        fetchKnowledge();
    }, []);

    const fetchKnowledge = async () => {
        setFetching(true);
        try {
            const res = await fetch('/api/admin/knowledge');
            const data = await res.json();
            if (res.ok) {
                setKnowledgeList(data.data);
            }
        } catch (err) {
            console.error("Fetch error:", err);
        } finally {
            setFetching(false);
        }
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile && selectedFile.type === 'application/pdf') {
            setFile(selectedFile);
            setMessage({ type: '', text: '' });
        } else {
            setFile(null);
            setMessage({ type: 'error', text: 'Please select a valid PDF file.' });
        }
    };

    const handleTeach = async (e) => {
        e.preventDefault();
        if (!question && !answer && !file) {
            setMessage({ type: 'error', text: 'Please provide either a Question/Answer pair or a PDF file.' });
            return;
        }

        setLoading(true);
        setMessage({ type: '', text: '' });

        const formData = new FormData();
        if (question) formData.append('question', question);
        if (answer) formData.append('answer', answer);
        if (file) formData.append('file', file);

        try {
            const res = await fetch('/api/admin/teach', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();
            if (res.ok) {
                setMessage({ type: 'success', text: `Successfully taught! Added ${data.count || 0} knowledge entry.` });
                setQuestion('');
                setAnswer('');
                setFile(null);
                if (document.getElementById('pdf-upload')) document.getElementById('pdf-upload').value = '';
                fetchKnowledge(); // Refresh list
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to teach the chatbot.' });
            }
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'Network error. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this knowledge chunk? This cannot be undone.")) return;

        try {
            const res = await fetch(`/api/admin/knowledge/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setKnowledgeList(prev => prev.filter(item => item.id !== id));
            } else {
                alert("Failed to delete entry.");
            }
        } catch (err) {
            console.error(err);
        }
    };

    const startEdit = (item) => {
        setEditingId(item.id);
        setEditQuestion(item.question || '');
        setEditAnswer(item.answer || '');
    };

    const handleUpdate = async () => {
        if (!editQuestion.trim() || !editAnswer.trim()) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/knowledge/${editingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: editQuestion, answer: editAnswer })
            });
            if (res.ok) {
                setKnowledgeList(prev => prev.map(item => item.id === editingId ? { ...item, question: editQuestion, answer: editAnswer } : item));
                setEditingId(null);
            } else {
                alert("Failed to update entry.");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-500">
            {/* Left: Add Knowledge */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-fit">
                <div className="mb-6">
                    <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
                        <FiFileText className="text-blue-600" />
                        Teach Chatbot
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                        Add specific Questions and Answers or upload documents.
                    </p>
                </div>

                <form onSubmit={handleTeach} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                            Question
                        </label>
                        <input
                            type="text"
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            placeholder="e.g. How do I reset my password?"
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                            Answer
                        </label>
                        <textarea
                            className="w-full h-32 p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                            placeholder="Provide the detailed answer here..."
                            value={answer}
                            onChange={(e) => setAnswer(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-[1px] bg-gray-100"></div>
                        <span className="text-[10px] font-bold text-gray-300">OR UPLOAD PDF</span>
                        <div className="flex-1 h-[1px] bg-gray-100"></div>
                    </div>

                    <div>
                        <div className={`relative border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center transition-all ${file ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
                            <input
                                type="file" id="pdf-upload" accept=".pdf"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                onChange={handleFileChange}
                            />
                            <FiUpload className={`text-xl mb-1 ${file ? 'text-blue-500' : 'text-gray-400'}`} />
                            <p className="text-xs font-medium text-gray-600 truncate max-w-full px-4">
                                {file ? file.name : 'Click to upload PDF'}
                            </p>
                        </div>
                    </div>

                    {message.text && (
                        <div className={`p-3 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {message.type === 'success' ? <FiCheckCircle size={14} /> : <FiAlertCircle size={14} />}
                            <p className="text-[11px] font-bold">{message.text}</p>
                        </div>
                    )}

                    <button
                        type="submit" disabled={loading || (!question && !answer && !file)}
                        className="w-full bg-[#004A99] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-800 disabled:opacity-50 transition-all font-inter"
                    >
                        {loading ? <FiLoader className="animate-spin" /> : <FiSend />}
                        Teach chatbot
                    </button>
                </form>
            </div>

            {/* Right: Manage Knowledge */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[700px]">
                <div className="mb-4 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-black text-gray-800">Knowledge Base</h3>
                        <p className="text-xs text-gray-500 mt-1">Manage existing Q&A pairs.</p>
                    </div>
                    {fetching && <FiLoader className="animate-spin text-blue-500" />}
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                    {knowledgeList.length === 0 && !fetching && (
                        <div className="text-center py-20 text-gray-400">
                            <FiFileText size={40} className="mx-auto mb-2 opacity-20" />
                            <p className="text-sm">No knowledge found yet.</p>
                        </div>
                    )}

                    {knowledgeList.map((item) => (
                        <div key={item.id} className="p-5 bg-gray-50 border border-gray-100 rounded-2xl hover:border-blue-200 transition-all group relative">
                            {editingId === item.id ? (
                                <div className="space-y-3">
                                    <input
                                        className="w-full p-3 bg-white border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={editQuestion}
                                        onChange={(e) => setEditQuestion(e.target.value)}
                                        placeholder="Question"
                                    />
                                    <textarea
                                        className="w-full h-32 p-3 bg-white border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={editAnswer}
                                        onChange={(e) => setEditAnswer(e.target.value)}
                                        placeholder="Answer"
                                    />
                                    <div className="flex gap-2 justify-end">
                                        <button onClick={() => setEditingId(null)} className="flex items-center gap-1 px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-xl">
                                            <FiX /> Cancel
                                        </button>
                                        <button onClick={handleUpdate} disabled={loading} className="flex items-center gap-1 px-4 py-2 text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-xl disabled:opacity-50">
                                            {loading ? <FiLoader className="animate-spin" /> : <FiSave />} Save Changes
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="mb-3">
                                        <div className="flex items-start gap-2 mb-2">
                                            <FiHelpCircle className="text-blue-500 mt-1 shrink-0" size={16} />
                                            <h4 className="text-sm font-black text-gray-900 leading-tight">
                                                {item.question || "General Information"}
                                            </h4>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <FiMessageCircle className="text-green-500 mt-1 shrink-0" size={16} />
                                            <p className="text-sm text-gray-600 leading-relaxed line-clamp-4">
                                                {item.answer || item.content}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex justify-between items-center pt-3 border-t border-gray-100 text-[10px] text-gray-400">
                                        <div className="flex flex-col">
                                            <span>Source: {item.metadata?.source || 'Manual Entry'}</span>
                                            <span>Added: {new Date(item.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => startEdit(item)} className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors flex items-center gap-1 px-3" title="Edit">
                                                <FiEdit3 size={14} />
                                                <span className="text-[10px] font-bold uppercase">Edit</span>
                                            </button>
                                            <button onClick={() => handleDelete(item.id)} className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors flex items-center gap-1 px-3" title="Delete">
                                                <FiTrash2 size={14} />
                                                <span className="text-[10px] font-bold uppercase">Delete</span>
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default KnowledgeManager;
