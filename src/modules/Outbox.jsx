import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOutbox, deleteFromOutbox } from '../db';
import BottomNav from './BottomNav';

const Outbox = () => {
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [statusMap, setStatusMap] = useState({}); // 'waiting', 'syncing', 'success', 'error'

    // --- 1. LOAD ITEMS ---
    useEffect(() => {
        loadItems();
    }, []);

    const loadItems = async () => {
        try {
            const data = await getOutbox();
            // Sort by newest first
            setItems(data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
        } catch (error) {
            console.error("Error loading outbox:", error);
        }
    };

    // --- 2. DELETE ITEM ---
    const handleDelete = async (id) => {
        if (confirm("Are you sure you want to discard this unsaved form?")) {
            await deleteFromOutbox(id);
            loadItems();
        }
    };

    // --- 3. SYNC ALL ---
    const handleSyncAll = async () => {
        if (!navigator.onLine) {
            alert("⚠️ You are offline. Connect to the internet to sync.");
            return;
        }

        if (items.length === 0) return;

        setIsSyncing(true);

        // Process sequentially to avoid overwhelming the server/connection
        for (const item of items) {
            // Update UI to 'syncing'
            setStatusMap(prev => ({ ...prev, [item.id]: 'syncing' }));

            try {
                const response = await fetch(item.url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(item.payload)
                });

                if (response.ok) {
                    // Success: Mark green, then delete from DB
                    setStatusMap(prev => ({ ...prev, [item.id]: 'success' }));
                    await deleteFromOutbox(item.id);
                } else {
                    // Server Error
                    setStatusMap(prev => ({ ...prev, [item.id]: 'error' }));
                }
            } catch (error) {
                // Network Error
                console.error("Sync error:", error);
                setStatusMap(prev => ({ ...prev, [item.id]: 'error' }));
            }
            
            // Small delay for visual feedback
            await new Promise(r => setTimeout(r, 500));
        }

        setIsSyncing(false);
        // Reload list to remove successfully synced items
        loadItems();
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-32 relative">
            
            {/* --- HEADER --- */}
            <div className="bg-white p-4 shadow-sm flex items-center gap-3 sticky top-0 z-20 border-b border-gray-100">
                <button onClick={() => navigate(-1)} className="text-2xl text-gray-600 hover:text-[#004A99] transition">&larr;</button>
                <div>
                    <h1 className="text-xl font-bold text-gray-800">Sync Center</h1>
                    <p className="text-xs text-gray-400">
                        {items.length} item{items.length !== 1 && 's'} pending
                    </p>
                </div>
            </div>

            {/* --- CONTENT --- */}
            <div className="p-5">
                
                {/* Sync Button */}
                {items.length > 0 ? (
                    <button 
                        onClick={handleSyncAll} 
                        disabled={isSyncing}
                        className={`w-full py-4 rounded-xl font-bold text-white shadow-lg mb-6 flex items-center justify-center gap-2 transition-all active:scale-95
                        ${isSyncing ? 'bg-blue-400 cursor-progress' : 'bg-[#004A99] hover:bg-blue-800'}
                        `}
                    >
                        {isSyncing ? (
                            <>
                                <span className="animate-spin text-xl">⏳</span> Syncing...
                            </>
                        ) : (
                            <>
                                <span className="text-xl">☁️</span> Sync All Now
                            </>
                        )}
                    </button>
                ) : (
                    <div className="text-center py-20 opacity-50 flex flex-col items-center">
                        <div className="text-6xl mb-4 bg-gray-100 p-6 rounded-full">✅</div>
                        <h3 className="font-bold text-gray-600 text-lg">All caught up!</h3>
                        <p className="text-sm text-gray-400">No pending forms to upload.</p>
                    </div>
                )}

                {/* List */}
                <div className="space-y-3">
                    {items.map((item) => (
                        <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between group">
                            
                            {/* Icon & Details */}
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold
                                    ${statusMap[item.id] === 'success' ? 'bg-green-100 text-green-600' : 
                                      statusMap[item.id] === 'error' ? 'bg-red-100 text-red-600' :
                                      'bg-blue-50 text-blue-600'}
                                `}>
                                    {item.type === 'SCHOOL_PROFILE' && '🏫'}
                                    {item.type === 'ENROLMENT' && '📊'}
                                    {item.type === 'TEACHING_PERSONNEL' && '👩‍🏫'}
                                    {item.type === 'ORGANIZED_CLASSES' && '🗂️'}
                                    {item.type === 'SHIFTING_MODALITIES' && '🔄'}
                                    {item.type === 'SCHOOL_RESOURCES' && '💻'}
                                    {item.type === 'TEACHER_SPECIALIZATION' && '🎓'}
                                    {!item.type && '📄'}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800 text-sm">{item.label || "Untitled Form"}</h3>
                                    <p className="text-[10px] text-gray-400">
                                        {new Date(item.timestamp).toLocaleString()}
                                    </p>
                                    
                                    {/* Status Text */}
                                    {statusMap[item.id] === 'syncing' && <p className="text-[10px] text-blue-500 font-bold animate-pulse">Uploading...</p>}
                                    {statusMap[item.id] === 'success' && <p className="text-[10px] text-green-500 font-bold">Synced!</p>}
                                    {statusMap[item.id] === 'error' && <p className="text-[10px] text-red-500 font-bold">Failed. Try again.</p>}
                                </div>
                            </div>

                            {/* Action Icons */}
                            <div className="flex items-center gap-2">
                                {statusMap[item.id] === 'success' ? (
                                    <span className="text-green-500 text-xl">✓</span>
                                ) : (
                                    <>
                                        {/* Trash Button (Only show if not syncing) */}
                                        {!isSyncing && (
                                            <button 
                                                onClick={() => handleDelete(item.id)}
                                                className="p-2 rounded-full text-gray-300 hover:text-red-500 hover:bg-red-50 transition"
                                                title="Discard Draft"
                                            >
                                                🗑️
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Bottom Nav (Active = Outbox) */}
            <BottomNav />
        </div>
    );
};

export default Outbox;