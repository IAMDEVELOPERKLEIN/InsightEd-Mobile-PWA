import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ChatWidget from '../components/ChatWidget';
import BottomNav from './BottomNav';
import PageTransition from '../components/PageTransition';
import { FiChevronLeft } from "react-icons/fi";

const ChatPage = () => {
    const navigate = useNavigate();
    const [userRole, setUserRole] = useState(localStorage.getItem('userRole'));

    useEffect(() => {
        // Sync user role if it changes in localStorage
        const handleStorage = () => setUserRole(localStorage.getItem('userRole'));
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    return (
        <PageTransition>
            <div className="min-h-screen bg-[#f5f7fa] dark:bg-[#1a202c] pb-20">
                {/* Header */}
                <div className="bg-gradient-to-br from-[#004A99] to-[#003366] dark:from-slate-900 dark:to-slate-800 p-5 h-20 flex items-center justify-between text-white rounded-b-3xl shadow-lg">
                    <button className="bg-transparent border-0 text-white cursor-pointer flex items-center" onClick={() => navigate(-1)}>
                        <FiChevronLeft size={24} />
                    </button>
                    <h2 className="m-0 text-lg font-semibold flex-1 text-center">Assistant</h2>
                    <div className="w-6"></div> {/* Balance header */}
                </div>

                {/* Chat Container */}
                <div className="h-[calc(100vh-150px)] w-full max-w-2xl mx-auto">
                    <ChatWidget embedded={true} showFloatingButton={false} />
                </div>

                <BottomNav userRole={userRole} />
            </div>
        </PageTransition>
    );
};

export default ChatPage;
