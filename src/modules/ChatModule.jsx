import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import ChatWidget from '../components/ChatWidget';
import BottomNav from './BottomNav';
import PageTransition from '../components/PageTransition';
import { useAuth } from '../context/AuthContext';

const ChatModule = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const role = user?.role || localStorage.getItem('userRole') || "User";
    const isAuthenticated = !!user;

    return (
        <PageTransition>
            <div className="flex flex-col h-screen bg-white overflow-hidden relative">
                {/* BACK BUTTON FOR GUESTS */}
                {!isAuthenticated && (
                    <button 
                        onClick={() => navigate('/login')}
                        className="absolute top-6 left-6 z-[100] p-2.5 bg-white shadow-xl rounded-xl border border-slate-100 text-slate-400 hover:text-blue-600 transition-all flex items-center gap-2 group"
                    >
                        <FiArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-xs font-bold uppercase tracking-wider pr-1 text-slate-600 group-hover:text-blue-600">Back to Login</span>
                    </button>
                )}

                {/* Main Content Area */}
                <div className={`flex-1 relative overflow-hidden ${isAuthenticated ? 'pb-20' : ''}`}>
                    <ChatWidget fullScreen={true} showFloatingButton={false} />
                </div>

                {/* Bottom Navigation */}
                {isAuthenticated && <BottomNav userRole={role} />}
            </div>
        </PageTransition>
    );
};

export default ChatModule;
