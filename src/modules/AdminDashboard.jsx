import React, { useState, useEffect } from 'react';
import BottomNav from './BottomNav';
import PageTransition from '../components/PageTransition';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

// NOTE: Removed the problematic import: import { DashboardStats } from './EngineerDashboard'; 

// --- SUB-COMPONENT FOR REUSABLE STATS CARD ---
const ProjectStatCard = ({ icon, label, value, color }) => (
    <div className={`p-3 rounded-xl shadow-sm text-center ${color}`}>
        <div className="text-2xl mb-1">{icon}</div>
        <p className="text-xs font-bold">{value}</p>
        <p className="text-[10px] font-medium opacity-80">{label}</p>
    </div>
);

const AdminDashboard = () => {
    // --- USER STATE ---
    const [userName, setUserName] = useState('Admin');
    const [currentView, setCurrentView] = useState('SchoolHead'); // Controls the active tab

    // --- SCHOOL HEAD DATA STATES ---
    const [schools, setSchools] = useState([]);
    const [selectedSchool, setSelectedSchool] = useState(null);
    const [schoolLoading, setSchoolLoading] = useState(true);
    const [schoolError, setSchoolError] = useState(null);
    const [schoolStats, setSchoolStats] = useState({
        totalSchools: 0,
        submittedCount: 0,
        submissionRate: 0,
        totalEnrollment: 0,
        totalFaculty: 0
    });

    // --- ENGINEER DATA STATES (New) ---
    const [projects, setProjects] = useState([]); // Stores the full project list
    const [projectLoading, setProjectLoading] = useState(false);
    const [projectError, setProjectError] = useState(null);
    const [projectStats, setProjectStats] = useState({
        total: 0,
        completed: 0,
        ongoing: 0,
        delayed: 0,
        completionRate: 0,
    });


    // --- 1. FETCH USER (Firebase) ---
    useEffect(() => {
        const fetchUserData = async () => {
            const user = auth.currentUser;
            if (user) {
                const docRef = doc(db, "users", user.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setUserName(docSnap.data().firstName);
                }
            }
        };
        fetchUserData();
    }, []);

    // --- 2. FETCH SCHOOL DATA ---
    const fetchSchools = async () => {
        setSchoolLoading(true);
        setSchoolError(null);
        try {
            // Using Port 3000 as inferred from previous snippets
            const response = await fetch('/api/schools');

            if (!response.ok) {
                throw new Error('Failed to fetch school list from server (404/500)');
            }
            const data = await response.json();
            setSchools(data);

            const total = data.length;
            const submitted = data.filter(s => s.status === 'Submitted').length;
            const enrollmentSum = data.reduce((acc, curr) => acc + (curr.data?.enrollment?.total || 0), 0);
            const facultySum = data.reduce((acc, curr) => acc + (curr.data?.faculty?.total || 0), 0);

            setSchoolStats({
                totalSchools: total,
                submittedCount: submitted,
                submissionRate: total > 0 ? Math.round((submitted / total) * 100) : 0,
                totalEnrollment: enrollmentSum,
                totalFaculty: facultySum
            });

        } catch (err) {
            console.error("Error fetching schools:", err);
            setSchoolError("Could not load school data. Check backend connection.");
        } finally {
            setSchoolLoading(false);
        }
    };

    // --- 3. FETCH ENGINEER DATA (The problem function) ---
    const fetchProjects = async () => {
        setProjectLoading(true);
        setProjectError(null);
        try {
            // Check this URL carefully: /api/projects/stats
            const response = await fetch('/api/projects/stats');

            if (!response.ok) {
                // If the server response code is not 200 (like 404 or 500)
                throw new Error('Failed to fetch project stats (404/500)');
            }
            const data = await response.json();

            // Map statuses from data 
            const ProjectStatus = {
                Completed: 'Completed',
                Ongoing: 'Ongoing',
            };

            // Calculate Project Stats
            const total = data.length;
            const completed = data.filter(p => p.status === ProjectStatus.Completed).length;
            const ongoing = data.filter(p => p.status === ProjectStatus.Ongoing).length;
            const delayed = data.filter(p => {
                if (p.status === ProjectStatus.Completed) return false;
                if (!p.targetCompletionDate) return false;
                const target = new Date(p.targetCompletionDate);
                const now = new Date();
                // A project is delayed if it's not completed AND its target date has passed
                return now > target;
            }).length;

            setProjects(data); // Store full list for rendering
            setProjectStats({
                total: total,
                completed: completed,
                ongoing: ongoing,
                delayed: delayed,
                completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
            });

        } catch (err) {
            // This is the line that outputs the error to the console
            console.error("Error fetching projects:", err);
            setProjectError("Could not load project data. Check backend connection and the /api/projects/stats route.");
        } finally {
            setProjectLoading(false);
        }
    };

    // --- Data Fetching Effect (Triggers based on view) ---
    useEffect(() => {
        if (currentView === 'SchoolHead') {
            fetchSchools();
        }
        if (currentView === 'Engineer') {
            fetchProjects();
        }
    }, [currentView]);


    // Helper for safe date formatting
    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };


    // ==========================================================
    //                        VIEW RENDERING FUNCTIONS
    // ==========================================================

    // --- A. School Head View (Retained) ---
    const renderSchoolHeadView = () => {
        const handleView = (school) => setSelectedSchool(school);
        const handleBack = () => setSelectedSchool(null);

        if (schoolLoading) return (
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 flex flex-col items-center justify-center min-h-[200px]">
                <div className="w-10 h-10 border-4 border-blue-100 border-t-[#004A99] rounded-full animate-spin mb-4"></div>
                <p className="text-gray-400 text-sm">Synchronizing School Data...</p>
            </div>
        );

        if (schoolError) return (
            <div className="bg-red-50 p-6 rounded-2xl shadow-lg border border-red-100 text-center">
                <div className="text-3xl mb-2">⚠️</div>
                <h3 className="text-red-800 font-bold">Connection Error</h3>
                <p className="text-red-600 text-xs mt-1">{schoolError}</p>
            </div>
        );

        if (selectedSchool) {
            // Detail View content... (Left out for brevity but should be included)
            return (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                    {/* School Header Card */}
                    <div className="bg-white p-5 rounded-2xl shadow-lg border border-gray-100 mb-4 relative overflow-hidden">
                        <h2 className="text-xl font-bold text-gray-800 relative z-10">{selectedSchool.name}</h2>
                        <div className="flex gap-3 mt-2 text-xs relative z-10">
                            <span className="bg-green-50 text-green-700 px-2 py-1 rounded border border-green-100 font-medium">
                                Submitted: {formatDate(selectedSchool.date)}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {/* Enrollment */}
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-blue-100">
                            <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wide">Enrollment</h4>
                            <div className="text-4xl font-extrabold text-[#004A99] mt-1">
                                {selectedSchool.data?.enrollment?.total || 0}
                                <span className="text-sm font-normal text-gray-400 ml-1">students</span>
                            </div>
                        </div>
                        {/* Faculty */}
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-indigo-100">
                            <h4 className="text-xs font-bold text-indigo-800 uppercase tracking-wide">Faculty</h4>
                            <div className="text-3xl font-bold text-gray-800 mt-1">
                                {selectedSchool.data?.faculty?.total || 0}
                            </div>
                        </div>
                        <button onClick={handleBack} className="w-full py-4 text-sm font-bold text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors mt-2">
                            Close Details
                        </button>
                    </div>
                </div>
            );
        }

        // Main School Head Overview content...
        return (
            <>
                <div className="bg-white p-5 rounded-2xl shadow-lg border border-gray-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-gray-800 font-bold text-lg">School Submission Status</h2>
                        <p className="text-xs text-gray-500 mt-1">
                            {schoolStats.submittedCount} out of {schoolStats.totalSchools} schools reported.
                        </p>
                    </div>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-sm ${schoolStats.submissionRate === 100 ? 'bg-green-100 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                        {schoolStats.submissionRate === 100 ? '✓' : '📊'}
                    </div>
                </div>

                <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider ml-1 mt-4">Region Totals</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 p-4 rounded-2xl shadow-md text-white">
                        <p className="text-indigo-100 text-xs font-medium uppercase">Total Learners</p>
                        <h3 className="text-2xl font-bold mt-1">{schoolStats.totalEnrollment.toLocaleString()}</h3>
                    </div>
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                        <p className="text-gray-500 text-xs font-bold uppercase">Faculty</p>
                        <h3 className="text-2xl font-bold text-gray-800">{schoolStats.totalFaculty}</h3>
                    </div>
                </div>

                <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider ml-1 mt-4">School Master List</h3>
                <div className="space-y-3">
                    {schools.map((school) => (
                        <div
                            key={school.id}
                            onClick={() => school.status === 'Submitted' && handleView(school)}
                            className={`relative bg-white p-4 rounded-2xl shadow-sm border border-gray-100 transition-all ${school.status === 'Submitted' ? 'active:scale-95 cursor-pointer hover:shadow-md' : 'opacity-70 grayscale'}`}
                        >
                            <div className={`absolute left-0 top-4 bottom-4 w-1 rounded-r-full ${school.status === 'Submitted' ? 'bg-green-500' : 'bg-red-400'}`}></div>
                            <div className="pl-3 flex justify-between items-center">
                                <div>
                                    <h4 className="font-bold text-gray-800 text-sm">{school.name}</h4>
                                </div>
                                <div className="text-right">
                                    {school.status === 'Submitted' ? (
                                        <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full">
                                            View Data
                                        </span>
                                    ) : (
                                        <span className="text-xs text-red-400 font-medium italic">
                                            Pending
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </>
        );
    };

    // --- B. Engineer View (Updated) ---
    const renderEngineerView = () => {
        if (projectLoading) return (
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 flex flex-col items-center justify-center min-h-[200px]">
                <div className="w-10 h-10 border-4 border-blue-100 border-t-[#004A99] rounded-full animate-spin mb-4"></div>
                <p className="text-gray-400 text-sm">Synchronizing Project Data...</p>
            </div>
        );

        if (projectError) return (
            <div className="bg-red-50 p-6 rounded-2xl shadow-lg border border-red-100 text-center">
                <div className="text-3xl mb-2">⚠️</div>
                <h3 className="text-red-800 font-bold">Project Connection Error</h3>
                <p className="text-red-600 text-xs mt-1">{projectError}</p>
                <p className="text-xs text-red-500 mt-2">Check the server log for details about the 404/500 error.</p>
            </div>
        );

        const delayedProjects = projects.filter(p => {
            if (p.status === 'Completed') return false;
            if (!p.targetCompletionDate) return false;
            const target = new Date(p.targetCompletionDate);
            const now = new Date();
            return now > target;
        });

        return (
            <>
                <div className="bg-white p-5 rounded-2xl shadow-lg border border-gray-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-gray-800 font-bold text-lg">Project Completion Rate</h2>
                        <p className="text-xs text-gray-500 mt-1">
                            {projectStats.completed} out of {projectStats.total} projects are completed.
                        </p>
                    </div>
                    {/* Visual display of completion rate */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${projectStats.completionRate === 100 ? 'bg-green-100 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                        {projectStats.completionRate}%
                    </div>
                </div>

                <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider ml-1 mt-2">Project Status Summary</h3>
                <div className="grid grid-cols-3 gap-4">
                    <ProjectStatCard icon="✅" label="Completed" value={projectStats.completed} color="bg-green-100 text-green-800" />
                    <ProjectStatCard icon="🚧" label="Ongoing" value={projectStats.ongoing} color="bg-yellow-100 text-yellow-800" />
                    <ProjectStatCard icon="🚨" label="Delayed" value={projectStats.delayed} color="bg-red-100 text-red-800" />
                </div>

                {/* --- PROJECTS MASTER LIST (New User Request) --- */}
                <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider ml-1 mt-4">Project Master List ({projects.length})</h3>
                <div className="space-y-3">
                    {projects.map((project) => {
                        const isDelayed = delayedProjects.some(p => p.project_id === project.project_id);
                        const statusColor = isDelayed ? 'text-red-600' : project.status === 'Completed' ? 'text-green-600' : 'text-yellow-600';

                        return (
                            <div
                                key={project.project_id}
                                className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 active:scale-95 transition-transform"
                            >
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h4 className="font-bold text-gray-800 text-sm">{project.project_name}</h4>
                                        <p className={`text-xs font-medium mt-0.5 ${statusColor}`}>
                                            {isDelayed ? 'Delayed' : project.status}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-gray-400">Target Date</p>
                                        <p className="text-xs font-semibold text-gray-700">{formatDate(project.targetCompletionDate)}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </>
        );
    };

    // --- C. HR View (Placeholder) ---
    const renderHRView = () => (
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 text-center min-h-[200px] flex flex-col justify-center">
            <div className="text-4xl mb-3">🧑‍💼</div>
            <h3 className="text-gray-800 font-bold">Human Resources Dashboard</h3>
            <p className="text-gray-500 text-sm mt-1">This feature is coming soon.</p>
            <p className="text-xs text-gray-400 mt-2">Monitor regional staffing and payroll data here.</p>
        </div>
    );

    // --- View Switcher Logic ---
    const renderContent = () => {
        switch (currentView) {
            case 'Engineer':
                return renderEngineerView();
            case 'HR':
                return renderHRView();
            case 'SchoolHead':
            default:
                return renderSchoolHeadView();
        }
    };


    return (
        <PageTransition>
            <div className="min-h-screen bg-slate-50 font-sans pb-24 relative">

                {/* --- TOP HEADER (IDENTITY & METRICS) --- */}
                <div className="bg-[#004A99] px-6 pt-12 pb-32 rounded-b-[3rem] shadow-xl relative overflow-hidden transition-all duration-500 ease-in-out">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                    <div className="relative z-10 flex justify-between items-start">
                        <div className="text-white">
                            <p className="text-blue-200 text-xs font-bold tracking-widest uppercase mb-1">
                                System Admin
                            </p>
                            <h1 className="text-2xl font-bold leading-tight">
                                Hello, {userName}
                            </h1>
                            <p className="text-blue-100/80 text-sm mt-2">
                                Data View: {currentView}
                            </p>
                        </div>
                    </div>
                </div>

                {/* --- MAIN CONTENT AREA --- */}
                <div className="px-5 -mt-24 relative z-20 space-y-5">

                    {/* --- TAB SLIDER/SWITCHER --- */}
                    <div className="bg-white p-1 rounded-full shadow-lg border border-gray-100 flex justify-between gap-1">
                        {['SchoolHead', 'Engineer', 'HR'].map((view) => (
                            <button
                                key={view}
                                onClick={() => {
                                    setCurrentView(view);
                                    setSelectedSchool(null); // Reset detail view on tab switch
                                }}
                                className={`flex-1 py-3 text-sm font-semibold rounded-full transition-all duration-300 ${currentView === view
                                    ? 'bg-[#004A99] text-white shadow-md'
                                    : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                {view === 'SchoolHead' ? 'School Head' : view === 'Engineer' ? 'Engineer' : 'HR (Soon)'}
                            </button>
                        ))}
                    </div>

                    {/* --- RENDER CURRENT VIEW CONTENT --- */}
                    {renderContent()}

                </div>

                <BottomNav userRole="Admin" />
            </div>
        </PageTransition>
    );
};

export default AdminDashboard;