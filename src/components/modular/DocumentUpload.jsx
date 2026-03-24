import React, { useState, useEffect } from "react";
import { FiUploadCloud, FiFile, FiCheckCircle, FiLoader, FiAlertCircle, FiX } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";

const DocumentUpload = ({ iern, docType, onUploadSuccess, initialFile = null }) => {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState("idle"); // idle, uploading, optimizing, success, error
    const [progress, setProgress] = useState(0);
    const [errorMessage, setErrorMessage] = useState("");
    const [uploadedPath, setUploadedPath] = useState(initialFile);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile && selectedFile.type === "application/pdf") {
            setFile(selectedFile);
            setErrorMessage("");
            setStatus("idle");
        } else {
            setErrorMessage("Please select a valid PDF file.");
            e.target.value = null;
        }
    };

    const handleUpload = async () => {
        if (!file || !iern) return;

        setUploading(true);
        setStatus("uploading");
        setErrorMessage("");

        const formData = new FormData();
        formData.append("file", file);
        formData.append("doc_type", docType);

        try {
            const response = await fetch(`/api/schools/${iern}/ownership-docs`, {
                method: "POST",
                body: formData,
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Upload failed");
            }

            setUploadedPath(result.data.filePath);
            setStatus("optimizing");
            onUploadSuccess(result.data.filePath);

            // Simulation of optimization status check (optional/mocked for now)
            // In a real app, we might poll an endpoint to check if status === 'optimized'
            setTimeout(() => {
                setStatus("success");
            }, 3000);

        } catch (err) {
            console.error("Upload error:", err);
            setStatus("error");
            setErrorMessage(err.message);
        } finally {
            setUploading(false);
        }
    };

    const clearFile = () => {
        setFile(null);
        setStatus("idle");
        setUploadedPath(null);
        setErrorMessage("");
    };

    return (
        <div className="space-y-4">
            <AnimatePresence mode="wait">
                {!uploadedPath ? (
                    <motion.div
                        key="uploader"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className={`relative border-2 border-dashed rounded-[2rem] p-8 transition-all ${
                            status === "error" ? "border-red-200 bg-red-50" : "border-blue-100 bg-blue-50/30"
                        } flex flex-col items-center justify-center gap-4 text-center group hover:border-blue-300 hover:bg-blue-50/50`}
                    >
                        {!file ? (
                            <>
                                <div className="w-16 h-16 bg-blue-100 rounded-3xl flex items-center justify-center text-blue-600 shadow-inner group-hover:scale-110 transition-transform">
                                    <FiUploadCloud className="w-8 h-8" />
                                </div>
                                <div>
                                    <p className="text-sm font-black text-blue-900 leading-tight">Click to Upload PDF</p>
                                    <p className="text-[11px] font-bold text-blue-400 uppercase tracking-widest mt-1">Ownership Document</p>
                                </div>
                                <input
                                    type="file"
                                    accept=".pdf"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                            </>
                        ) : (
                            <div className="w-full space-y-4">
                                <div className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-blue-100 shadow-sm">
                                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                                        <FiFile className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 text-left min-w-0">
                                        <p className="text-sm font-bold text-gray-900 truncate">{file.name}</p>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                            {(file.size / (1024 * 1024)).toFixed(2)} MB • PDF
                                        </p>
                                    </div>
                                    <button onClick={clearFile} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                                        <FiX className="w-5 h-5" />
                                    </button>
                                </div>

                                <button
                                    onClick={handleUpload}
                                    disabled={uploading || status === "uploading"}
                                    className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-100 active:scale-95 transition-all disabled:opacity-50"
                                >
                                    {status === "uploading" ? "Uploading..." : "Confirm & Send"}
                                </button>
                            </div>
                        )}
                    </motion.div>
                ) : (
                    <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-emerald-50 border-2 border-emerald-100 rounded-[2rem] p-6 space-y-4 relative overflow-hidden"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
                                {status === "optimizing" ? (
                                    <FiLoader className="w-6 h-6 animate-spin" />
                                ) : (
                                    <FiCheckCircle className="w-6 h-6" />
                                )}
                            </div>
                            <div>
                                <p className="text-sm font-black text-emerald-900">
                                    {status === "optimizing" ? "Optimizing PDF..." : "Document Secured"}
                                </p>
                                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest leading-none mt-1">
                                    {status === "optimizing" ? "Applying 75 DPI compression" : "Local server storage active"}
                                </p>
                            </div>
                            {status === "success" && (
                                <button
                                    onClick={clearFile}
                                    className="ml-auto p-2 text-emerald-300 hover:text-emerald-600 transition-colors"
                                >
                                    <FiEdit2 className="w-5 h-5" />
                                </button>
                            )}
                        </div>

                        <div className="flex items-center justify-between p-3 bg-white/50 rounded-xl border border-emerald-100">
                            <span className="text-[11px] font-bold text-gray-500 truncate max-w-[200px]">{uploadedPath}</span>
                            <a href={uploadedPath} target="_blank" rel="noopener noreferrer" className="text-[10px] font-black text-emerald-600 uppercase hover:underline">
                                View File &rarr;
                            </a>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {status === "error" && (
                <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-xl border border-red-100"
                >
                    <FiAlertCircle className="flex-shrink-0" />
                    <span className="text-[11px] font-bold">{errorMessage}</span>
                </motion.div>
            )}
        </div>
    );
};

export default DocumentUpload;
