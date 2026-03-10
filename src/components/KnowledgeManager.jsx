import React, { useState } from 'react';
import { FiUpload, FiSend, FiFileText, FiCheckCircle, FiAlertCircle, FiLoader } from "react-icons/fi";

const KnowledgeManager = () => {
    const [content, setContent] = useState('');
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

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
        if (!content && !file) {
            setMessage({ type: 'error', text: 'Please provide either text content or a PDF file.' });
            return;
        }

        setLoading(true);
        setMessage({ type: '', text: '' });

        const formData = new FormData();
        if (content) formData.append('content', content);
        if (file) formData.append('file', file);

        try {
            const res = await fetch('/api/admin/teach', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();
            if (res.ok) {
                setMessage({ type: 'success', text: `Successfully taught! Added ${data.chunks} knowledge chunks.` });
                setContent('');
                setFile(null);
                // Reset file input
                document.getElementById('pdf-upload').value = '';
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

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in duration-500">
            <div className="mb-6">
                <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
                    <FiFileText className="text-blue-600" />
                    Knowledge Manager
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                    Upload documents or paste text to "teach" the chatbot new information.
                </p>
            </div>

            <form onSubmit={handleTeach} className="space-y-6">
                {/* Text Area */}
                <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                        Text Content (FAQ, Policies, etc.)
                    </label>
                    <textarea
                        className="w-full h-40 p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                        placeholder="Paste FAQ or any text documentation here..."
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex-1 h-[1px] bg-gray-100"></div>
                    <span className="text-[10px] font-bold text-gray-300 uppercase">OR</span>
                    <div className="flex-1 h-[1px] bg-gray-100"></div>
                </div>

                {/* File Upload */}
                <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                        Upload PDF Document
                    </label>
                    <div className={`relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all ${file ? 'border-blue-200 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-gray-50'}`}>
                        <input
                            type="file"
                            id="pdf-upload"
                            accept=".pdf"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={handleFileChange}
                        />
                        <FiUpload className={`text-2xl mb-2 ${file ? 'text-blue-500' : 'text-gray-400'}`} />
                        <p className="text-sm font-medium text-gray-600">
                            {file ? file.name : 'Click or drag PDF here'}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-1">Maximum size: 10MB</p>
                    </div>
                </div>

                {/* Status Message */}
                {message.text && (
                    <div className={`p-4 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2 duration-300 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                        {message.type === 'success' ? <FiCheckCircle /> : <FiAlertCircle />}
                        <p className="text-xs font-bold">{message.text}</p>
                    </div>
                )}

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={loading || (!content && !file)}
                    className="w-full bg-[#004A99] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-900/10"
                >
                    {loading ? (
                        <>
                            <FiLoader className="animate-spin" />
                            Ingesting Knowledge...
                        </>
                    ) : (
                        <>
                            <FiSend />
                            Teach Chatbot
                        </>
                    )}
                </button>
            </form>
        </div>
    );
};

export default KnowledgeManager;
