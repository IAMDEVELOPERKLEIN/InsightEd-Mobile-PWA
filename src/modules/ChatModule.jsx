import React from 'react';
import ChatWidget from '../components/ChatWidget';
import BottomNav from './BottomNav';
import PageTransition from '../components/PageTransition';
import { useAuth } from '../context/AuthContext';

const ChatModule = () => {
    const { user } = useAuth();
    const role = user?.role || localStorage.getItem('userRole') || "User";

    return (
        <PageTransition>
            <div className="flex flex-col h-screen bg-white overflow-hidden">
                {/* Main Content Area */}
                <div className="flex-1 relative overflow-hidden pb-20">
                    <ChatWidget fullScreen={true} showFloatingButton={false} />
                </div>

                {/* Bottom Navigation */}
                <BottomNav userRole={role} />
            </div>
        </PageTransition>
    );
};

export default ChatModule;
