import React from 'react';
import BottomNav from './BottomNav';
import PageTransition from '../components/PageTransition';

const LegacyGuideWrapper = () => {
    return (
        <PageTransition>
            <div className="h-screen w-full flex flex-col bg-white overflow-hidden pb-[85px]">
                <div className="flex-1 w-full h-full relative">
                    <iframe 
                        src={`${import.meta.env.BASE_URL}mobile-guides/school-head.html`} 
                        className="absolute inset-0 w-full h-full border-none"
                        title="School Head Operational Guide"
                    />
                </div>
                <BottomNav userRole="School Head" />
            </div>
        </PageTransition>
    );
};

export default LegacyGuideWrapper;
