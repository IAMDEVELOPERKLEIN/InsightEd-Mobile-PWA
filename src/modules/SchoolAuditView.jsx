import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiInfo, FiUsers, FiTrendingUp, FiLayout, FiBox, FiLayers, FiUser, FiActivity, FiServer, FiHeart, FiCheckCircle } from 'react-icons/fi';
import { TbSchool, TbReportAnalytics } from "react-icons/tb";


// Import Modular Units
import Unit1SchoolIdentity from '../components/modular/Unit1SchoolIdentity';
import Unit2Learners from '../components/modular/Unit2Learners';
import Unit3OrganizedClasses from '../components/modular/Unit3OrganizedClasses';
import Unit4LearnerProfile from '../components/modular/Unit4LearnerProfile';
import Unit5ShiftingModality from '../components/modular/Unit5ShiftingModality';
import Unit6SchoolResources from '../components/modular/Unit6SchoolResources';
import Unit7PhysicalFacilities from '../components/modular/Unit7PhysicalFacilities';
import Unit8SchoolLocation from '../components/modular/Unit8SchoolLocation';
import Unit10Verification from '../components/modular/Unit10Verification';

const SchoolAuditView = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('u1');
    const [schoolData, setSchoolData] = useState(null);

    useEffect(() => {
        const storedId = sessionStorage.getItem('targetSchoolId');
        const storedName = sessionStorage.getItem('targetSchoolName');

        if (!storedId) {
            navigate('/jurisdiction-schools');
            return;
        }

        // Set session flag for read-only hooks
        sessionStorage.setItem("isViewingAsSuperUser", "true");

        setSchoolData({
            id: storedId,
            name: storedName || "Unknown School"
        });

        // Clean up flag on unmount
        return () => {
            sessionStorage.removeItem("isViewingAsSuperUser");
        };
    }, [navigate]);

    const handleBack = () => {
        navigate(-1);
    };

    if (!schoolData) return null;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans">
            {/* Header */}
            <div className="bg-slate-900 text-white p-6 pt-10 pb-20 rounded-b-[2.5rem] shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-32 bg-blue-500/10 rounded-full blur-3xl"></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-4">
                        <button
                            onClick={handleBack}
                            className="p-2 rounded-full hover:bg-white/10 transition-colors"
                        >
                            <FiArrowLeft size={24} />
                        </button>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-500 text-amber-950">
                                    Audit Review Mode
                                </span>
                                <span className="text-slate-400 text-xs font-mono">ID: {schoolData.id}</span>
                            </div>
                            <h1 className="text-2xl font-bold mt-1">{schoolData.name}</h1>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
                        <TabButton active={activeTab === 'u1'} onClick={() => setActiveTab('u1')} icon={<TbSchool />} label="Identity (U1)" />
                        <TabButton active={activeTab === 'u2'} onClick={() => setActiveTab('u2')} icon={<FiUsers />} label="Enrollment (U2)" />
                        <TabButton active={activeTab === 'u3'} onClick={() => setActiveTab('u3')} icon={<FiLayers />} label="Classes (U3)" />
                        <TabButton active={activeTab === 'u4'} onClick={() => setActiveTab('u4')} icon={<FiActivity />} label="Learners (U4)" />
                        <TabButton active={activeTab === 'u5'} onClick={() => setActiveTab('u5')} icon={<TbReportAnalytics />} label="Modality (U5)" />
                        <TabButton active={activeTab === 'u6'} onClick={() => setActiveTab('u6')} icon={<FiBox />} label="Resources (U6)" />
                        <TabButton active={activeTab === 'u7'} onClick={() => setActiveTab('u7')} icon={<FiServer />} label="Facilities (U7)" />
                        <TabButton active={activeTab === 'u8'} onClick={() => setActiveTab('u8')} icon={<FiActivity />} label="Location (U8)" />
                        <TabButton active={activeTab === 'u9'} onClick={() => setActiveTab('u9')} icon={<FiCheckCircle />} label="Verification (U9)" />
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="-mt-12 px-4 pb-20 relative z-20">
                <div className="bg-white dark:bg-slate-800 min-h-[500px] rounded-[2rem] shadow-lg border border-slate-100 dark:border-slate-700 overflow-hidden relative">

                    {/* Watermark for Audit Mode */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.03] z-0 overflow-hidden">
                        <span className="text-9xl font-black -rotate-45 whitespace-nowrap">AUDIT MODE</span>
                    </div>

                    {activeTab === 'u1' && <Unit1SchoolIdentity targetSchoolId={schoolData.id} isReadOnly={true} />}
                    {activeTab === 'u2' && <Unit2Learners targetSchoolId={schoolData.id} isReadOnly={true} />}
                    {activeTab === 'u3' && <Unit3OrganizedClasses targetSchoolId={schoolData.id} isReadOnly={true} />}
                    {activeTab === 'u4' && <Unit4LearnerProfile targetSchoolId={schoolData.id} isReadOnly={true} />}
                    {activeTab === 'u5' && <Unit5ShiftingModality targetSchoolId={schoolData.id} isReadOnly={true} />}
                    {activeTab === 'u6' && <Unit6SchoolResources targetSchoolId={schoolData.id} isReadOnly={true} />}
                    {activeTab === 'u7' && <Unit7PhysicalFacilities targetSchoolId={schoolData.id} isReadOnly={true} />}
                    {activeTab === 'u8' && <Unit8SchoolLocation targetSchoolId={schoolData.id} isReadOnly={true} />}
                    {activeTab === 'u9' && <Unit10Verification targetSchoolId={schoolData.id} />}
                </div>
            </div>
        </div>
    );
};

const TabButton = ({ active, onClick, icon, label }) => (
    <button
        onClick={onClick}
        className={`
            flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap
            ${active
                ? 'bg-white text-slate-900 shadow-lg'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }
        `}
    >
        {icon}
        {label}
    </button>
);

export default SchoolAuditView;
