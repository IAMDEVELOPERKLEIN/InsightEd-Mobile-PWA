import React from 'react';
import BottomNav from '../modules/BottomNav';
import PageTransition from '../components/PageTransition';

const EFDEngineerQuickStart = () => {
    return (
        <PageTransition>
            <div className="h-screen w-full flex flex-col bg-[#020617] overflow-hidden pb-[85px]">
                <div className="flex-1 w-full h-full relative">
                    <iframe 
                        src={`${import.meta.env.BASE_URL}mobile-guides/efd-engineer.html`} 
                        className="absolute inset-0 w-full h-full border-none bg-[#020617]"
                        title="EFD Engineer Operational Guide"
                    />
                </div>
                <BottomNav userRole="EFD Engineer" />
            </div>
        </PageTransition>
    );
};

export default EFDEngineerQuickStart;
