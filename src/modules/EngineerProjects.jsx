import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FiSearch, FiPlus, FiFilter, FiCamera, FiImage, FiSettings, FiChevronRight } from "react-icons/fi";
import { LuClipboardList, LuCalendar, LuDollarSign, LuActivity } from "react-icons/lu";

import BottomNav from "./BottomNav";
import PageTransition from "../components/PageTransition";
import { useAuth } from "../context/AuthContext";
import { addEngineerToOutbox, cacheProjects, getCachedProjects } from "../db";
import { compressImage } from "../utils/imageCompression";
import { uploadFileInChunks } from '../utils/chunkedUploader'; // NEW CHUNK UPLOADER

import LocationPickerMap from '../components/LocationPickerMap';

// --- CONSTANTS ---
const ProjectStatus = {
  UnderProcurement: "Under Procurement",
  NotYetStarted: "Not Yet Started",
  Ongoing: "Ongoing",
  ForFinalInspection: "For Final Inspection",
  Completed: "Completed",
};

const DOC_TYPES = {
  POW: "Program of Works",
  DUPA: "DUPA",
  CONTRACT: "Signed Contract"
};

// -----------------------
//   HELPER FUNCTION: File input to Chunked Uploader
// -----------------------
const processPdfFileChunked = async (file, onProgress) => {
  if (!file) return null;
  if (!file.type.includes('pdf')) {
    alert("Only PDF files are allowed.");
    return null;
  }
  return await uploadFileInChunks(file, onProgress);
};

// --- HELPERS ---
const formatAllocation = (value) => {
  const num = Number(value) || 0;
  return `₱${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDateShort = (dateString) => {
  if (!dateString) return "TBD";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "2-digit",
  });
};

// --- SUB-COMPONENTS ---

const ProjectTable = ({ projects, onEdit, onDelete, onAnalyze, onView, isLoading, searchQuery, readOnly, uploadProgress = {}, handlePdfUpload }) => {
  const navigate = useNavigate();

  const getStatusColor = (status) => {
    switch (status) {
      case ProjectStatus.Completed:
        return "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800";
      case ProjectStatus.Ongoing:
        return "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800";
      case ProjectStatus.UnderProcurement:
        return "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800";
      case ProjectStatus.ForFinalInspection:
        return "bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-800";
      default:
        return "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-100 dark:border-slate-700";
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 h-[450px] flex items-center justify-center flex-col">
        <div className="w-10 h-10 border-4 border-slate-100 dark:border-slate-700 border-t-[#004A99] dark:border-t-blue-500 rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-medium text-slate-400">Loading your projects...</p>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 h-[300px] flex items-center justify-center flex-col p-8 text-center">
        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
          <LuClipboardList size={32} className="text-slate-300 dark:text-slate-500" />
        </div>
        <p className="text-lg font-bold text-slate-700 dark:text-slate-200">
          {searchQuery ? "No matching projects" : "No Projects Yet"}
        </p>
        <p className="text-sm text-slate-400 mt-1 max-w-[200px]">
          {searchQuery ? "Try adjusting your search terms." : "Start by adding your first school infrastructure project."}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 flex flex-col h-[calc(100vh-220px)] overflow-hidden">
      <div className="overflow-auto flex-1 relative custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-20 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100 dark:border-slate-700">
            <tr>
              <th className="sticky left-0 bg-slate-50 dark:bg-slate-900 z-30 p-4 w-full">
                Project Info
              </th>
              <th className="sticky right-0 bg-slate-50 dark:bg-slate-900 z-30 p-4 min-w-[80px] text-center">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-700 text-xs text-slate-600 dark:text-slate-300">
            {projects.map((p, idx) => {
              // DEBUG: Check values for "Warning" logic
              if (idx === 0) console.log("DEBUG RENDER Project[0]:", { id: p.id, school: p.schoolName, pow: p.pow_pdf, dupa: p.dupa_pdf, contract: p.contract_pdf });

              const isLocked = p.status === ProjectStatus.Completed;
              const progress = p.accomplishmentPercentage || 0;

              return (
                <tr
                  key={p.id}
                  className="hover:bg-blue-50/30 dark:hover:bg-blue-900/20 transition-all duration-200 group animate-in fade-in slide-in-from-bottom-2"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <td className="sticky left-0 bg-white dark:bg-slate-800 group-hover:bg-blue-50/30 dark:group-hover:bg-blue-900/20 z-10 p-4">
                    <div className="flex flex-col gap-1">
                      <div className="text-[10px] font-black uppercase tracking-widest text-[#004A99] dark:text-blue-400 opacity-70">
                        {p.schoolName}
                      </div>
                      <div className="font-bold text-slate-800 dark:text-slate-100 text-[13px] leading-snug group-hover:text-[#004A99] transition-colors">
                        {p.projectName}
                      </div>
                      
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                          <LuCalendar size={10} className="text-slate-300" />
                          Latest Update: {formatDateShort(p.statusAsOfDate)}
                        </div>
                        {p.accomplishmentPercentage > 0 && (
                          <div className={`text-[9px] font-black px-1.5 py-0.5 rounded ${p.accomplishmentPercentage === 100 ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                            {p.accomplishmentPercentage}%
                          </div>
                        )}
                      </div>

                      {/* ID Badges (Smaller) */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {p.ipc && (
                          <div className="px-1.5 py-0.5 bg-slate-50 rounded border border-slate-100 text-[8px] font-black text-slate-400">
                            IPC {p.ipc}
                          </div>
                        )}
                        <div className="px-1.5 py-0.5 bg-slate-50 rounded border border-slate-100 text-[8px] font-black text-slate-400 uppercase">
                          ID {p.schoolId}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="sticky right-0 bg-white dark:bg-slate-800 group-hover:bg-blue-50/30 dark:group-hover:bg-blue-900/20 z-10 p-4 border-l border-slate-50 dark:border-slate-700 text-center">
                    <div className="flex flex-col gap-2">
                      {/* CONDITIONAL ACTION: Upload Docs / View Docs */}




                      <button
                        onClick={() => onView(p)}
                        className={`w-full py-1.5 text-[10px] font-bold rounded-lg border transition-all active:scale-95 flex items-center justify-center gap-1 ${p.hasVariationOrder
                          ? "bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100 shadow-sm shadow-amber-900/10"
                          : "bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-300 border-slate-100 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-600 hover:shadow-md"}`}
                      >
                        {p.hasVariationOrder ? (
                          <>VIEW <span className="bg-amber-100 text-amber-700 px-1 rounded-sm text-[8px] font-black">VO</span></>
                        ) : (
                          <>VIEW <FiChevronRight size={12} /></>
                        )}
                      </button>
                      <button
                        onClick={() => navigate(`/project-gallery/${p.id}`)}
                        className="w-full py-1.5 bg-amber-50/50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[10px] font-bold rounded-lg border border-amber-100 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-900/50 hover:shadow-md transition-all active:scale-95 flex items-center justify-center gap-1"
                      >
                        <FiImage size={12} /> GALLERY
                      </button>
                      {!readOnly && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => onEdit(p, 'quick')}
                            disabled={isLocked}
                            className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg shadow-lg transition-all active:scale-95 flex items-center justify-center gap-1 ${isLocked
                              ? "bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-600"
                              : "bg-[#004A99] dark:bg-blue-600 text-white hover:bg-blue-800 dark:hover:bg-blue-700 shadow-blue-500/20"
                              }`}
                          >
                            {isLocked ? "LOCKED" : "UPDATE"}
                          </button>
                          <button
                            onClick={() => onDelete(p.id)}
                            className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg border border-red-100 transition-all active:scale-95"
                            title="Delete Project"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};


import EditProjectModal from "../components/EditProjectModal";
import UpdateProjectWizard from "../components/UpdateProjectWizard";


// --- MAIN PROJECT LIST COMPONENT ---

const EngineerProjects = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [userName, setUserName] = useState(user?.first_name || user?.firstName || "Engineer");
    const [userRole, setUserRole] = useState(() => {
        let role = user?.role || localStorage.getItem('userRole') || "Division Engineer";
        if (role === 'deped_engineer' || role === 'DepEd Engineer') return 'Division Engineer';
        if (role === 'hrodi_engineer' || role === 'HRODI Engineer' || role === 'EFD' || role === 'HRODI') return 'EFD Engineer';
        return role;
    });
  const [accountCategory, setAccountCategory] = useState(null);
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [modalMode, setModalMode] = useState('quick');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  // Categorized State
  const [internalFiles, setInternalFiles] = useState([]);
  const [internalPreviews, setInternalPreviews] = useState([]);
  const [externalFiles, setExternalFiles] = useState([]);
  const [externalPreviews, setExternalPreviews] = useState([]);
  const [activeCategory, setActiveCategory] = useState('Internal');

  // PDF Upload Progress State
  const [uploadProgress, setUploadProgress] = useState({});

  // AI Modal State
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState("");

  // --- Image Upload State & Refs ---
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const API_BASE = "";

  // Fetch User & Projects
  useEffect(() => {
    const fetchUserDataAndProjects = async () => {
      const currentUid = user?.uid || localStorage.getItem('uid');
      let currentRole = user?.account_category || user?.role || localStorage.getItem('userRole');
      
      if (currentUid) {
        // Sync Basic Info from User Object if available
        if (user) {
            setUserName(`${user.first_name || user.firstName || ''} ${user.last_name || user.lastName || ''}`.trim() || 'Engineer');
            setAccountCategory(user.account_category);
        }

        try {
          setIsLoading(true);
          // Normalize role for BottomNav and logic
          if (currentRole === 'deped_engineer' || currentRole === 'DepEd Engineer') currentRole = 'Division Engineer';
          if (currentRole === 'hrodi_engineer' || currentRole === 'HRODI Engineer' || currentRole === 'EFD' || currentRole === 'HRODI') currentRole = 'EFD Engineer';
          if (currentRole === 'non_deped_engineer') currentRole = 'Non-DepEd Engineer';
          if (currentRole === 'engineer') currentRole = 'Engineer';
          
          setUserRole(currentRole);
          let currentProjects = [];

          // 1. Immediate Cache Load (Fast Render)
          try {
            const cachedData = await getCachedProjects();
            if (cachedData && cachedData.length > 0) {
              setProjects(cachedData);
              currentProjects = cachedData;
              setIsLoading(false);
            }
          } catch (err) {
            console.warn("Cache read failed", err);
          }

          // 2. Network Request
          try {
            let url = `${API_BASE}/api/projects?engineer_id=${currentUid}`;

            if (currentRole === 'Super User') {
              const impersonatedDivision = sessionStorage.getItem('impersonatedDivision');
              if (impersonatedDivision) {
                url = `${API_BASE}/api/projects?division=${encodeURIComponent(impersonatedDivision)}`;
              } else {
                url = `${API_BASE}/api/projects`;
              }
            } else if (currentRole === 'Super Admin') {
                url = `${API_BASE}/api/projects`;
            }

            const response = await fetch(url);
            if (!response.ok) throw new Error("Failed to fetch projects");
            const data = await response.json();

            currentProjects = data.map(item => ({
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
              ipc: item.ipc,
              latitude: item.latitude,
              longitude: item.longitude,
              projectCategory: item.projectCategory,
              scopeOfWork: item.scopeOfWork,
              numberOfClassrooms: item.numberOfClassrooms,
              numberOfStoreys: item.numberOfStoreys,
              numberOfSites: item.numberOfSites,
              fundsUtilized: item.fundsUtilized,
              constructionStartDate: item.constructionStartDate,
              noticeToProceed: item.noticeToProceed,
              batchOfFunds: item.batchOfFunds,
              hasPow: item.hasPow,
              hasDupa: item.hasDupa,
              hasContract: item.hasContract,
              hasMoa: item.hasMoa,
              hasRta: item.hasRta,
              hasVariationOrder: item.hasVariationOrder,
              variationOrderPdf: item.variationOrderPdf,
              contractAmount: item.contractAmount,
              statusDesignPhase: item.statusDesignPhase,
              fundingYear: item.fundingYear
            }));

            // Update Cache on success
            await cacheProjects(currentProjects);

            // Update state with fresh data
            setProjects(currentProjects);

          } catch (networkError) {
            console.warn("Network request failed:", networkError);
          }

        } catch (err) {
          console.error("Error loading projects:", err);
        } finally {
          setIsLoading(false);
        }
      }
    };
    fetchUserDataAndProjects();
  }, [user, user?.uid]);

  // Filtered list
  const filteredProjects = projects.filter(p =>
    p.schoolName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(p.schoolId).includes(searchQuery)
  );

  // Handlers
  const handleViewProject = (project) => navigate(`/project-details/${project.id}`);

  const handleDeleteProject = async (projectId) => {
    const isConfirmed = window.confirm("⚠️ DELETE PROJECT\n\nAre you sure you want to delete this project? This will permanently remove all associated progress, photos, and documents. This action cannot be undone.");

    if (!isConfirmed) return;

    try {
      const response = await fetch(`${API_BASE}/api/projects/${projectId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete project");
      }

      // Update local state
      setProjects(prev => prev.filter(p => p.id !== projectId));
      alert("Project deleted successfully.");

    } catch (err) {
      console.error("Delete Error:", err);
      alert(`Error: ${err.message}`);
    }
  };

  const handleEditProject = async (project, mode = 'quick') => {
    setSelectedProject(project);
    setModalMode(mode);
    setInternalFiles([]);
    setInternalPreviews([]);
    setExternalFiles([]);
    setExternalPreviews([]); // Clear old previews
    setEditModalOpen(true);

    // BACKGROUND SYNC: Fetch full project details (including PDFs) while modal is open
    try {
      const response = await fetch(`${API_BASE}/api/projects/${project.id}`);
      if (response.ok) {
        const fullData = await response.json();
        // Merge full data into selected project (preserving local changes if any, though unlikely here)
        setSelectedProject(prev => prev && prev.id === project.id ? { ...prev, ...fullData } : prev);
      }
    } catch (err) {
      console.warn("Background project fetch failed:", err);
    }
  };

  const handlePdfUpload = async (projectId, type, file, item) => {
    // Create local progress state mapping
    setUploadProgress(prev => ({ ...prev, [`${projectId}-${type}`]: 0 }));

    try {
      const cloudUrl = await processPdfFileChunked(file, (prog) => {
        setUploadProgress(prev => ({ ...prev, [`${projectId}-${type}`]: prog }));
      });

      if (!cloudUrl) {
        setUploadProgress(prev => { const n = { ...prev }; delete n[`${projectId}-${type}`]; return n; });
        return; // Canceled
      }

      // Merge into save payload
      const updatedDocs = { [type]: cloudUrl };

      const response = await fetch(`${API_BASE}/api/update-project/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedDocs),
      });

      if (!response.ok) throw new Error("PDF upload failed");

      // Update the project in the local state with the new PDF URL
      setProjects(prev => prev.map(p =>
        p.id === projectId ? { ...p, [type]: cloudUrl } : p
      ));

      alert(`${type.toUpperCase()} uploaded successfully!`);

    } catch (err) {
      console.error(err);
      alert("Failed to upload document chunk.");
    } finally {
      setUploadProgress(prev => { const n = { ...prev }; delete n[`${projectId}-${type}`]; return n; });
    }
  };

  const handleSaveProject = async (updatedProject) => {
    console.log("DEBUG SAVE PROJECT PAYLOAD:", {
      id: updatedProject.id,
      pow_len: updatedProject.pow_pdf?.length,
      dupa_len: updatedProject.dupa_pdf?.length,
      contract_len: updatedProject.contract_pdf?.length
    });

    const uid = user?.uid;
    if (!uid) return;

    // OPTIMIZATION: Check if progress changed
    const originalProject = projects.find(p => p.id === updatedProject.id);
    const isProgressUpdated = originalProject && (
      originalProject.status !== updatedProject.status ||
      Number(originalProject.accomplishmentPercentage) !== Number(updatedProject.accomplishmentPercentage)
    );

    // CHECK: Mandatory Photo Upload (Exempt Variation Order & Realignment)
    const progressiveStatuses = [ProjectStatus.Ongoing, ProjectStatus.ForFinalInspection, ProjectStatus.Completed];
    const isProgressiveUpdate = progressiveStatuses.includes(updatedProject.status);
    const canSkipPhotos = updatedProject.hasVariationOrder || updatedProject.isRealigned || updatedProject.isProjectDetailsUpdate || updatedProject.update_type === 'Details Update';

    if (modalMode !== 'docs_only' && isProgressiveUpdate && internalFiles.length === 0 && externalFiles.length === 0 && !canSkipPhotos) {
      alert(`⚠️ PROOF REQUIRED\n\nAccording to COA requirements, you must attach at least one site photo for projects in "${updatedProject.status}" status.`);
      return;
    }

    // CHECK: Completed Projects must have Actual Completion Date
    if (updatedProject.status === 'Completed' && !updatedProject.actualCompletionDate) {
      alert("⚠️ DATE REQUIRED\n\nYou cannot mark a project as 'Completed' without specifying the Actual Completion Date.");
      return;
    }

    // CHECK: Mandatory Location REMOVED per user request
    // if (!updatedProject.latitude || !updatedProject.longitude) {
    //   alert("⚠️ LOCATION REQUIRED\n\nPlease capture the project coordinates (Latitude/Longitude) before saving.");
    //   return;
    // }

    setIsUploading(true);
    try {
      // Create payload copy
      // Determine uploader_type from the logged-in user's role and account category
      let uploaderType = 'DepEd Engineer'; // Default
      if (userRole === 'EFD' || userRole === 'HRODI Engineer') uploaderType = 'EFD Engineer';
      else if (userRole === 'Non-DepEd Engineer' || (userRole === 'DepEd Engineer' && accountCategory === 'Non-DepEd Engineer')) uploaderType = 'Non-DepEd Engineer';

      const payload = { ...updatedProject, uid: uid, modifiedBy: userName, uploader_type: uploaderType };

      const body = payload;
      if (!navigator.onLine) {
        await addEngineerToOutbox({
          url: `${API_BASE}/api/update-project/${updatedProject.id}`,
          method: 'PUT',
          body: body,
          formName: `Update: ${updatedProject.schoolName}`
        });

        // Save images offline
        const allFiles = [
          ...internalFiles.map(f => ({ file: f, category: 'Internal' })),
          ...externalFiles.map(f => ({ file: f, category: 'External' }))
        ];

        if (allFiles.length > 0) {
          for (const item of allFiles) {
            try {
              const base64Image = await compressImage(item.file);
              await addEngineerToOutbox({
                url: `${API_BASE}/api/upload-image`,
                method: 'POST',
                body: { projectId: updatedProject.id, imageData: base64Image, uploadedBy: uid, category: item.category },
                formName: `Photo (${item.category}): ${updatedProject.schoolName}`
              });
            } catch (err) {
              console.error("Compression failed for file:", item.file.name, err);
            }
          }
        }
        alert("⚠️ Offline: Changes cached to Sync Center.");
        setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
        setEditModalOpen(false);
        return;
      }

      // Online Save Project
      const response = await fetch(`${API_BASE}/api/update-project/${updatedProject.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error("Update failed");
      const resData = await response.json();
      const finalProject = {
        ...updatedProject,
        id: resData.project.project_id,
        otherRemarks: resData.project.other_remarks // Ensure latest remarks are in state
      };

      // Online Upload Images
      const allFiles = [
        ...internalFiles.map(f => ({ file: f, category: 'Internal' })),
        ...externalFiles.map(f => ({ file: f, category: 'External' }))
      ];

      if (allFiles.length > 0) {
        for (const item of allFiles) {
          try {
            const base64Image = await compressImage(item.file);
            await fetch(`${API_BASE}/api/upload-image`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ projectId: updatedProject.id, imageData: base64Image, uploadedBy: uid, category: item.category }),
            });
          } catch (err) {
            console.error("Compression failed for file:", item.file.name, err);
          }
        }
      }
      setProjects(prev => prev.map(p => p.id === updatedProject.id ? finalProject : p));
      alert("Success: Changes synced to database!");
      setInternalFiles([]);
      setExternalFiles([]);
      setEditModalOpen(false);
    } catch (err) {
      console.error("Save Error:", err);
      alert("Sync error. Try again later.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Limit to 100MB
    const validFiles = files.filter(file => file.size <= 100 * 1024 * 1024);
    const newPreviews = validFiles.map(file => URL.createObjectURL(file));

    if (activeCategory === 'Internal') {
      setInternalFiles(prev => [...prev, ...validFiles]);
      setInternalPreviews(prev => [...prev, ...newPreviews]);
    } else {
      setExternalFiles(prev => [...prev, ...validFiles]);
      setExternalPreviews(prev => [...prev, ...newPreviews]);
    }

    e.target.value = null;
  };

  const removeFile = (index, category) => {
    if (category === 'Internal') {
      setInternalFiles(prev => prev.filter((_, i) => i !== index));
      setInternalPreviews(prev => prev.filter((_, i) => i !== index));
    } else {
      setExternalFiles(prev => prev.filter((_, i) => i !== index));
      setExternalPreviews(prev => prev.filter((_, i) => i !== index));
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans pb-24">
        {/* --- DYNAMIC PREMIUM HEADER --- */}
        <div className="bg-gradient-to-br from-[#004A99] via-[#003366] to-[#001D3D] p-6 pb-28 rounded-b-[3.5rem] shadow-2xl relative overflow-hidden transition-all duration-500">
          {/* Decorative Elements */}
          <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-[-20%] left-[-10%] w-48 h-48 bg-blue-400/10 rounded-full blur-2xl"></div>

          <div className="relative z-10">
            <div className="flex justify-between items-center mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
                  <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.2em] leading-none">
                     Infrastructure
                  </p>
                </div>
                <h1 className="text-3xl font-black text-white tracking-tight">
                  Project Monitoring
                </h1>
              </div>
              {userRole !== 'Super User' && (
                <button
                  onClick={() => navigate("/new-project")}
                  className="group bg-white text-[#004A99] px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-900/40 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                >
                  <FiPlus size={16} className="group-hover:rotate-90 transition-transform" />
                  New Project
                </button>
              )}
            </div>

            {/* --- GLASSMORPHISM SEARCH BAR --- */}
            <div className="relative group transition-all duration-300">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <FiSearch className="text-white/40 group-focus-within:text-white transition-colors" />
              </div>
              <input
                type="text"
                placeholder="Query schools, projects or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/10 backdrop-blur-xl border border-white/20 text-white placeholder:text-white/30 text-xs px-12 py-4 rounded-2xl outline-none focus:ring-4 focus:ring-white/10 focus:bg-white/15 transition-all shadow-inner"
              />
              <div className="absolute inset-y-0 right-4 flex items-center">
                <div className="h-6 w-[1px] bg-white/10 mx-2"></div>
                <FiFilter className="text-white/40 hover:text-white cursor-pointer transition-colors" />
              </div>
            </div>
          </div>
        </div>

        {/* --- PROJECT LISTING --- */}
        <div className="px-5 -mt-12 relative z-20">
          <ProjectTable
            projects={filteredProjects}
            onEdit={handleEditProject}
            onDelete={handleDeleteProject}
            onView={handleViewProject}
            isLoading={isLoading}
            searchQuery={searchQuery}
            readOnly={userRole === 'Super User'}
            uploadProgress={uploadProgress}
            handlePdfUpload={handlePdfUpload}
          />

          <div className="flex items-center justify-center gap-4 mt-4">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-[#004A99] rounded-full"></div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Swipe Details</span>
            </div>
            <div className="w-[1px] h-3 bg-slate-200"></div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Live Updates</span>
            </div>
          </div>
        </div>

        {/* --- HIDDEN INPUTS & MODALS --- */}
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
        <input type="file" ref={cameraInputRef} onChange={handleFileUpload} accept="image/*" capture="environment" className="hidden" />

        <UpdateProjectWizard
          project={selectedProject}
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          isUploading={isUploading}
          onSave={async (updatedProject, wizardInternalFiles, wizardExternalFiles) => {
            // Use files provided by the wizard instead of the parent state
            const prevInternal = internalFiles;
            const prevExternal = externalFiles;
            setInternalFiles(wizardInternalFiles || []);
            setExternalFiles(wizardExternalFiles || []);
            await handleSaveProject(updatedProject);
            setInternalFiles(prevInternal);
            setExternalFiles(prevExternal);
          }}
        />

        <BottomNav userRole={userRole} />
      </div>
    </PageTransition >
  );
};

export default EngineerProjects;
