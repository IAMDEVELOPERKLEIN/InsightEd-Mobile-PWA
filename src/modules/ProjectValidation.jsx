
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TbArrowLeft, TbCheck, TbX, TbBuildingSkyscraper, TbFileDescription, TbCalendar } from "react-icons/tb";
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import PageTransition from '../components/PageTransition';

const ProjectValidation = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState([]);
    const [schoolId, setSchoolId] = useState(null);
    const [user, setUser] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            const currentUser = auth.currentUser;
            if (!currentUser) {
                console.log("[ProjectValidation] No auth user found.");
                return;
            }
            setUser(currentUser);
            console.log(`[ProjectValidation] Current User: ${currentUser.uid}`);

            try {
                // 1. Get School Profile to find School ID
                const profileUrl = `/api/school-by-user/${currentUser.uid}`;
                console.log(`[ProjectValidation] Fetching profile from: ${profileUrl}`);

                const profileRes = await fetch(profileUrl);
                const profileJson = await profileRes.json();
                console.log("[ProjectValidation] Profile JSON:", profileJson);

                if (profileJson.exists && profileJson.data.school_id) {
                    const foundSchoolId = profileJson.data.school_id;
                    setSchoolId(foundSchoolId);
                    console.log(`[ProjectValidation] Found School ID: ${foundSchoolId}`);

                    // 2. Fetch Projects for this School
                    const projectsUrl = `/api/projects-by-school-id/${foundSchoolId}`;
                    console.log(`[ProjectValidation] Fetching projects from: ${projectsUrl}`);

                    const projectRes = await fetch(projectsUrl);
                    if (projectRes.ok) {
                        const projectData = await projectRes.json();
                        console.log(`[ProjectValidation] Projects found:`, projectData.length, projectData);
                        setProjects(projectData);
                    } else {
                        console.error("[ProjectValidation] Failed to fetch projects:", projectRes.status);
                    }
                } else {
                    console.warn("[ProjectValidation] No linked school profile found for this user.");
                }
            } catch (err) {
                console.error("[ProjectValidation] Error fetching data:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleValidation = async (projectId, status) => {
        if (!confirm(`Are you sure you want to mark this project as ${status}?`)) return;

        try {
            const res = await fetch('/api/validate-project', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId,
                    status,
                    userUid: user.uid,
                    userName: user.displayName || 'School Head'
                })
            });

            if (res.ok) {
                // Update UI Optimistically
                setProjects(prev => prev.map(p =>
                    p.id === projectId ? { ...p, validation_status: status } : p
                ));
                alert(`Project marked as ${status}`);
            } else {
                alert("Failed to update status");
            }
        } catch (err) {
            console.error("Validation error:", err);
            alert("Error connecting to server");
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Validated': return 'bg-green-100 text-green-700 border-green-200';
            case 'Rejected': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-orange-100 text-orange-700 border-orange-200';
        }
    };

    return (
        <PageTransition>
            <div className="min-h-screen bg-slate-50 pb-20">
                {/* Header */}
                <div className="bg-white px-6 pt-12 pb-6 shadow-sm border-b border-slate-100 sticky top-0 z-20">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-600 hover:bg-slate-50 rounded-full transition-colors">
                            <TbArrowLeft size={24} />
                        </button>
                        <h1 className="text-xl font-bold text-slate-800">Project Validation</h1>
                    </div>
                    <p className="text-slate-500 text-sm mt-1 ml-10">Confirm infrastructure projects in your school.</p>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    {loading ? (
                        <div className="text-center py-12 text-slate-400">Loading projects...</div>
                    ) : projects.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                                <TbBuildingSkyscraper size={32} />
                            </div>
                            <h3 className="text-slate-700 font-bold">No Projects Found</h3>
                            <p className="text-slate-500 text-sm mt-1">There are no submitted projects for your school yet.</p>
                        </div>
                    ) : (
                        projects.map((project) => (
                            <div key={project.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 relative overflow-hidden">
                                {project.validation_status === 'Validated' && (
                                    <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl">
                                        VALIDATED
                                    </div>
                                )}

                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                            <TbBuildingSkyscraper size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800 leading-tight">{project.projectName}</h3>
                                            <p className="text-xs text-slate-500">{project.schoolName}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3 mb-6">
                                    <div className="grid grid-cols-2 gap-3 text-xs">
                                        <div className="bg-slate-50 p-2 rounded-lg">
                                            <span className="text-slate-400 block mb-0.5">Status</span>
                                            <span className="font-semibold text-slate-700">{project.status}</span>
                                        </div>
                                        <div className="bg-slate-50 p-2 rounded-lg">
                                            <span className="text-slate-400 block mb-0.5">Completion</span>
                                            <span className="font-semibold text-slate-700">{project.accomplishmentPercentage}%</span>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                        <TbFileDescription size={16} className="shrink-0 mt-0.5 text-slate-400" />
                                        <p>{project.otherRemarks || "No remarks provided."}</p>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-3">
                                    {project.validation_status === 'Validated' ? (
                                        <button
                                            className="w-full py-3 rounded-xl bg-green-50 text-green-600 font-bold text-sm flex items-center justify-center gap-2 cursor-default"
                                            disabled
                                        >
                                            <TbCheck size={18} />
                                            Confirmed
                                        </button>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => handleValidation(project.id, 'Rejected')}
                                                className="flex-1 py-3 rounded-xl bg-red-50 text-red-600 font-bold text-sm hover:bg-red-100 transition flex items-center justify-center gap-2"
                                            >
                                                <TbX size={18} />
                                                Reject
                                            </button>
                                            <button
                                                onClick={() => handleValidation(project.id, 'Validated')}
                                                className="flex-1 py-3 rounded-xl bg-[#004A99] text-white font-bold text-sm hover:bg-blue-800 transition flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
                                            >
                                                <TbCheck size={18} />
                                                Confirm
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </PageTransition>
    );
};

export default ProjectValidation;
