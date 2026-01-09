import React, { useState, useEffect } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Autoplay } from "swiper/modules";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import "swiper/css";
import "swiper/css/pagination";

// Components
import BottomNav from "./BottomNav";
import PageTransition from "../components/PageTransition";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

// --- CONSTANTS ---
const ProjectStatus = {
  UnderProcurement: "Under Procurement",
  NotYetStarted: "Not Yet Started",
  Ongoing: "Ongoing",
  ForFinalInspection: "For Final Inspection",
  Completed: "Completed",
};

// --- HELPERS ---
const formatAllocation = (value) => {
  const num = Number(value) || 0;
  if (num >= 1000000) {
    return `₱${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `₱${(num / 1000).toFixed(1)}k`;
  }
  return `₱${num.toLocaleString()}`;
};

// --- SUB-COMPONENTS ---

const DashboardStats = ({ projects }) => {
  // 1. Get the current date for comparison
  const now = new Date();

  // 2. Define a helper to check if a specific project is delayed
  const isProjectDelayed = (p) => {
    if (p.status === ProjectStatus.Completed) return false; // Completed is never delayed
    if (!p.targetCompletionDate) return false; // No date, can't be delayed
    
    const target = new Date(p.targetCompletionDate);
    // It is delayed if NOW is past Target AND it's not 100% done
    return now > target && p.accomplishmentPercentage < 100;
  };

  const stats = {
    total: projects.length,
    
    completed: projects.filter((p) => p.status === ProjectStatus.Completed).length,
    
    // UPDATED: Count strictly "Delayed" projects
    delayed: projects.filter((p) => isProjectDelayed(p)).length,

    // UPDATED: Count "Ongoing" as ONLY those active AND NOT delayed
    ongoing: projects.filter((p) => 
      p.status === ProjectStatus.Ongoing && !isProjectDelayed(p)
    ).length,

    totalAllocation: projects.reduce(
      (acc, curr) => acc + (Number(curr.projectAllocation) || 0),
      0
    ),
  };

  const data = [
    { name: "Completed", value: stats.completed, color: "#10B981" },
    { name: "Ongoing", value: stats.ongoing, color: "#3B82F6" }, 
    { name: "Delayed", value: stats.delayed, color: "#EF4444" },
    {
      name: "Others",
      value: stats.total - (stats.completed + stats.ongoing + stats.delayed),
      color: "#94A3B8",
    },
  ].filter((d) => d.value > 0);

  return (
    <div className="mb-6 space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-center items-center text-center">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">
            Allocation
          </p>
          <p className="text-sm font-bold text-[#004A99] mt-1">
            {formatAllocation(stats.totalAllocation)}
          </p>
        </div>
        <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-center items-center text-center">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">
            Projects
          </p>
          <p className="text-xl font-bold text-slate-800 mt-1">{stats.total}</p>
        </div>
        <div
          className={`p-3 rounded-xl shadow-sm border flex flex-col justify-center items-center text-center ${
            stats.delayed > 0
              ? "bg-red-50 border-red-100"
              : "bg-white border-slate-200"
          }`}
        >
          <p
            className={`text-[10px] font-bold uppercase tracking-wide ${
              stats.delayed > 0 ? "text-red-500" : "text-slate-500"
            }`}
          >
            Delayed
          </p>
          <div className="flex items-center gap-1 mt-1">
            <p
              className={`text-xl font-bold ${
                stats.delayed > 0 ? "text-red-600" : "text-slate-800"
              }`}
            >
              {stats.delayed}
            </p>
            {stats.delayed > 0 && (
              <span className="text-[10px] animate-pulse">⚠️</span>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
        <div className="flex flex-col justify-center ml-2">
          <p className="text-xs font-bold text-slate-700 mb-2">
            Project Status Mix
          </p>
          <div className="text-[10px] text-slate-500 space-y-1">
            {data.map((d) => (
              <div key={d.name} className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: d.color }}
                ></span>
                <span>
                  {d.name}: {d.value}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="w-24 h-24 mr-2">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={18}
                outerRadius={35}
                paddingAngle={5}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

// --- MAIN DASHBOARD COMPONENT ---

const EngineerDashboard = () => {
  const [userName, setUserName] = useState("Engineer");
  const [projects, setProjects] = useState([]);
  const [activities, setActivities] = useState([]); // [NEW] Activity State
//   const [isLoading, setIsLoading] = useState(true); // Unused in this simplified version if we don't show loading spinner for stats, but good to keep if we want to add it back.

  // API Base URL
  const API_BASE = "";

  // Fetch User & Projects
  useEffect(() => {
    const fetchUserDataAndProjects = async () => {
      const user = auth.currentUser;
      if (user) {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserName(docSnap.data().firstName);
        }

        try {
        //   setIsLoading(true);
          const response = await fetch(
            `${API_BASE}/api/projects?engineer_id=${user.uid}`
          );
          if (!response.ok) throw new Error("Failed to fetch projects");
          const data = await response.json();

          const mappedData = data.map((item) => ({
             // Keeping map same as before to ensure consistency
            id: item.id,
            projectName: item.projectName,
            schoolName: item.schoolName,
            schoolId: item.schoolId,
            status: item.status,
            accomplishmentPercentage: item.accomplishmentPercentage,
            projectAllocation: item.projectAllocation,
            targetCompletionDate: item.targetCompletionDate,
            statusAsOfDate: item.statusAsOfDate,
            otherRemarks: item.otherRemarks,
            contractorName: item.contractorName,
          }));
          setProjects(mappedData);

          // [NEW] Fetch Recent Activities for this Engineer
          const actResponse = await fetch(`${API_BASE}/api/activities?user_uid=${user.uid}`);
          if (actResponse.ok) {
            const actData = await actResponse.json();
            setActivities(actData);
          }

        } catch (err) {
          console.error("Error loading projects:", err);
        } finally {
        //   setIsLoading(false);
        }
      }
    };
    fetchUserDataAndProjects();
  }, []);

  return (
    <PageTransition>
      <div className="min-h-screen bg-slate-50 font-sans pb-24">
        {/* --- TOP HEADER --- */}
        <div className="relative bg-[#004A99] pt-12 pb-24 px-6 rounded-b-[2.5rem] shadow-xl">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-blue-200 text-xs font-bold tracking-wider uppercase">
                DepEd Infrastructure
              </p>
              <h1 className="text-2xl font-bold text-white mt-1">Dashboard</h1>
              <p className="text-blue-100 mt-1 text-sm">
                Overview of {projects.length} active projects.
              </p>
            </div>
            <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 text-white shadow-inner">
              👷‍♂️
            </div>
          </div>
        </div>

        {/* --- MAIN CONTENT CONTAINER --- */}
        <div className="px-5 -mt-16 relative z-10 space-y-6">
          <DashboardStats projects={projects} />

          <div className="w-full">
            <Swiper
              modules={[Pagination, Autoplay]}
              spaceBetween={15}
              slidesPerView={1}
              pagination={{ clickable: true, dynamicBullets: true }}
              autoplay={{ delay: 5000 }}
              className="w-full"
            >
              {/* --- SLIDE 1: WELCOME --- */}
              <SwiperSlide className="pb-8">
                <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-[#FDB913] flex flex-col justify-center min-h-[140px]">
                  <h3 className="text-[#004A99] font-bold text-sm flex items-center mb-1">
                    <span className="text-xl mr-2">👷</span>
                    Welcome, Engr. {userName}!
                  </h3>
                  <p className="text-slate-500 text-xs leading-relaxed ml-7">
                    Your dashboard is ready. Track ongoing construction and validate school infrastructure data.
                  </p>
                </div>
              </SwiperSlide>

              {/* --- SLIDE 2: PROJECTS LIST --- */}
              <SwiperSlide className="pb-8">
                <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-emerald-500 flex flex-col h-[140px]">
                  <h3 className="text-emerald-700 font-bold text-sm flex items-center mb-2 shrink-0">
                    <span className="text-xl mr-2">🏗️</span>
                    Active Projects ({projects.length})
                  </h3>
                  <div className="overflow-y-auto flex-1 pr-1 space-y-2 custom-scrollbar">
                    {projects.length > 0 ? (
                      projects.map((p) => (
                        <div key={p.id} className="flex justify-between items-center text-xs border-b border-slate-100 last:border-0 pb-1">
                          <span className="text-slate-700 font-medium truncate w-[70%]">{p.schoolName}</span>
                          <span className={`font-bold ${p.accomplishmentPercentage === 100 ? "text-emerald-600" : "text-blue-600"}`}>
                            {p.accomplishmentPercentage || 0}%
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-400 text-xs italic ml-7">No active projects found.</p>
                    )}
                  </div>
                </div>
              </SwiperSlide>

              {/* --- SLIDE 3: REMARKS --- */}
              <SwiperSlide className="pb-8">
                <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-500 flex flex-col h-[140px]">
                  <h3 className="text-blue-700 font-bold text-sm flex items-center mb-2 shrink-0">
                    <span className="text-xl mr-2">📢</span>
                    Latest Remarks
                  </h3>
                  <div className="overflow-y-auto flex-1 pr-1 space-y-2 custom-scrollbar">
                    {projects.some(p => p.otherRemarks) ? (
                      projects.filter(p => p.otherRemarks).map((p) => (
                        <div key={p.id} className="text-xs border-b border-slate-100 last:border-0 pb-2">
                          <p className="font-bold text-slate-700 truncate">{p.schoolName}</p>
                          <p className="text-slate-500 line-clamp-2">{p.otherRemarks}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-400 text-xs italic ml-7">No remarks available.</p>
                    )}
                  </div>
                </div>
              </SwiperSlide>
            </Swiper>
          </div>

          {/* --- RECENT ACTIVITIES (NEW SECTION) --- */}
          <div className="w-full">
               <h3 className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-3 ml-1">Recent Activities</h3>
               <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                   {activities.length > 0 ? (
                       <>
                           <div className="divide-y divide-slate-50 max-h-96 overflow-y-auto custom-scrollbar">
                               {activities.map((log, idx) => (
                                   <div key={log.log_id || idx} className="p-4 flex gap-3 hover:bg-slate-50 transition-colors">
                                       <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                                           log.action_type === 'CREATE' ? 'bg-green-500' : 
                                           log.action_type === 'DELETE' ? 'bg-red-500' : 'bg-blue-500'
                                       }`} />
                                       <div className="flex-1 min-w-0">
                                           <div className="flex justify-between items-start">
                                               <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border mb-1 inline-block ${
                                                   log.action_type === 'CREATE' ? 'bg-green-50 text-green-600 border-green-100' : 
                                                   log.action_type === 'DELETE' ? 'bg-red-50 text-red-600 border-red-100' : 
                                                   'bg-blue-50 text-blue-600 border-blue-100'
                                               }`}>
                                                   {log.action_type}
                                               </span>
                                               <span className="text-[10px] text-slate-400">{log.formatted_time}</span>
                                           </div>
                                           <p className="text-xs font-bold text-slate-700 truncate">{log.target_entity}</p>
                                           <p className="text-[11px] text-slate-500 leading-snug mt-0.5">{log.details}</p>
                                       </div>
                                   </div>
                               ))}
                           </div>
                           <div className="p-3 text-center bg-slate-50/50 border-t border-slate-50">
                               <p className="text-[10px] text-slate-400 font-medium">Showing all {activities.length} recent activities</p>
                           </div>
                       </>
                   ) : (
                       <div className="p-8 text-center">
                           <p className="text-2xl mb-2">💤</p>
                           <p className="text-sm font-bold text-slate-600">No recent activity</p>
                           <p className="text-xs text-slate-400">Your actions will appear here.</p>
                       </div>
                   )}
               </div>
          </div>
        </div>
        <BottomNav userRole="Engineer" />
      </div>
    </PageTransition>
  );
};

export default EngineerDashboard;
