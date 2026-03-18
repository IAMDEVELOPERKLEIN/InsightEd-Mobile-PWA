import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BottomNav from './BottomNav';
import PageTransition from '../components/PageTransition';
import { FiTrendingUp, FiCheckCircle, FiClock, FiFileText, FiMapPin, FiArrowLeft, FiMenu, FiBell, FiSearch, FiFilter, FiAlertCircle, FiX, FiBarChart2, FiRefreshCw, FiChevronLeft, FiChevronRight, FiChevronsLeft, FiChevronsRight, FiPieChart } from 'react-icons/fi';
import { TbTrophy, TbSchool, TbChartBar, TbFileDownload } from 'react-icons/tb';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LabelList } from 'recharts';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import locationData from '../locations.json';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

// Helper for robust name matching (ignoring "Division", "District" suffixes)
const normalizeLocationName = (name) => {
    return name?.toString().toLowerCase().trim()
        .replace(/\s+division$/, '')
        .replace(/\s+district$/, '')
        .replace(/^division\s+of\s+/, '')
        .replace(/^district\s+of\s+/, '')
        .trim() || '';
};


import { useServiceWorker } from '../context/ServiceWorkerContext'; // Import Context

const MonitoringDashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    
    // Service Worker Update Context
    const { isUpdateAvailable, updateApp } = useServiceWorker();
    const [userData, setUserData] = useState(null);

    useEffect(() => {
        if (user) {
            setUserData(user);
        }
    }, [user]);
    const [stats, setStats] = useState(null);
    const [engStats, setEngStats] = useState(null);
    const [jurisdictionProjects, setJurisdictionProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('accomplishment'); // Default to InsightED Accomplishment

    // State for Central Office Filters
    const [coRegion, setCoRegion] = useState('');
    const [coDivision, setCoDivision] = useState('');
    const [coDistrict, setCoDistrict] = useState(''); // NEW: District Filter
    const [availableRegions, setAvailableRegions] = useState([]);
    const [availableDivisions, setAvailableDivisions] = useState([]);
    const [availableDistricts, setAvailableDistricts] = useState([]); // NEW: District State
    const [drilldownType, setDrilldownType] = useState('school_district'); // NEW: Drilldown Type (school_district vs legislative)
    const [schoolData] = useState([]); // Kept for safety, no longer populated from CSV

    // NEW: Regional Stats for National View
    const [regionalStats, setRegionalStats] = useState([]);
    const [divisionStats, setDivisionStats] = useState([]); // Per-division stats for RO
    const [districtStats, setDistrictStats] = useState([]); // Per-district stats for SDO
    const [districtSchools, setDistrictSchools] = useState([]); // Schools for Drill-down
    const [loadingDistrict, setLoadingDistrict] = useState(false);
    const [schoolSort, setSchoolSort] = useState('pct-desc'); // Sort state for schools
    const [schoolSearch, setSchoolSearch] = useState(''); // NEW: Search state
    const [schoolPage, setSchoolPage] = useState(1); // NEW: Pagination state
    
    // NEW: Pagination limit state with LocalStorage persistence
    const [schoolLimit, setSchoolLimit] = useState(() => {
        const savedLimit = localStorage.getItem('monitoringSchoolLimit');
        return savedLimit ? parseInt(savedLimit, 10) : 10;
    });

    useEffect(() => {
        localStorage.setItem('monitoringSchoolLimit', schoolLimit);
    }, [schoolLimit]);

    const [isIssuesModalOpen, setIsIssuesModalOpen] = useState(false); // NEW: Issues Modal state
    const [selectedSchoolForIssues, setSelectedSchoolForIssues] = useState(null); // NEW: Selected school for issues

    // Prevent background scrolling when Issues Modal is open
    useEffect(() => {
        if (isIssuesModalOpen) {
            document.body.classList.add('overflow-hidden');
        } else {
            document.body.classList.remove('overflow-hidden');
        }

        return () => {
            document.body.classList.remove('overflow-hidden');
        };
    }, [isIssuesModalOpen]);

    const [insightsGradeLevel, setInsightsGradeLevel] = useState('total');
    const [insightsSubMetric, setInsightsSubMetric] = useState('within');
    const [insightsSector, setInsightsSector] = useState('division');
    const [insightsMetric, setInsightsMetric] = useState('registration'); // Default to Registration Rate for Simplified Insights
    const [insightsData, setInsightsData] = useState([]);
    const [isFetchingInsights, setIsFetchingInsights] = useState(false);

    const [projectListModal, setProjectListModal] = useState({ isOpen: false, title: '', projects: [], isLoading: false });
    const [isReportMenuOpen, setIsReportMenuOpen] = useState(false);
    const [isGeneratingReport, setIsGeneratingReport] = useState(null); // 'pdf', 'unregistered', 'inactive', 'anomalies'

    // --- REPORT GENERATION HELPERS & API LOGIC ---
    const downloadCSV = (dataArray, filename) => {
        if (!dataArray || dataArray.length === 0) {
            alert('No data available to export based on current parameters.');
            return;
        }

        const headers = Object.keys(dataArray[0]);
        const csvContent = [
            headers.join(','),
            ...dataArray.map(row => 
                headers.map(fieldName => {
                    let cellData = row[fieldName] === null || row[fieldName] === undefined ? '' : row[fieldName];
                    const stringData = String(cellData).replace(/"/g, '""');
                    if (stringData.search(/("|,|\n)/g) >= 0) return `"${stringData}"`;
                    return stringData;
                }).join(',')
            )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const fetchReportData = async (type) => {
        try {
            setIsGeneratingReport(type);
            const params = new URLSearchParams();
            if (effectiveRegion) {
                const formattedRegion = effectiveRegion.toString().toLowerCase().includes('region') 
                    ? effectiveRegion 
                    : `Region ${effectiveRegion}`;
                params.append('region', formattedRegion);
            }
            if (effectiveRole === 'School Division Office') {
                const division = effectiveDivision || userData?.division;
                if (division) params.append('division', division);
            }
            
            const res = await fetch(`/api/reports/data-health?${params.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch data');
            const data = await res.json();
            return data;
        } catch (error) {
            console.error('Error fetching report:', error);
            alert('Encountered an error fetching report data.');
            return null;
        } finally {
            setIsGeneratingReport(null);
            setIsReportMenuOpen(false);
        }
    };

    const handleGeneratePDF = async () => {
        const data = await fetchReportData('pdf');
        if (!data) return;

        const doc = new jsPDF('p', 'pt', 'a4');
        const jurisdiction = data.jurisdiction || (effectiveDivision || userData?.division || effectiveRegion || 'National');
        const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        
        // PAGE 1: EXECUTIVE SUMMARY
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text("InsightEd Data Health & Compliance Report", 40, 60);

        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(`Jurisdiction: ${jurisdiction}`, 40, 85);
        doc.text(`Data As Of: ${dateStr}`, 40, 100);

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text("Executive Summary", 40, 140);
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(`Total Expected Schools: ${data.summary?.totalExpected || 0}`, 40, 165);
        doc.text(`Registered Schools: ${data.summary?.registered || 0}`, 40, 185);
        doc.text(`Overall Health Score: ${data.summary?.overallHealthScore || 0}%`, 40, 205);

        // PAGE 2+: DATASET AUTO-TABLES
        if (data.datasets) {
            let currentY = 240;

            // TABLE 1: TOP 20 CRITICAL ANOMALIES
            const anomaliesData = data.datasets.anomalies?.slice(0, 20) || [];
            if (anomaliesData.length > 0) {
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text("Top Critical Anomalies", 40, currentY);
                currentY += 15;

                autoTable(doc, {
                    startY: currentY,
                    head: [['School ID', 'School Name', 'Enrollment']],
                    body: anomaliesData.map(item => [item.school_id, item.school_name, item.total_enrollment || 'Missing']),
                    theme: 'striped',
                    headStyles: { fillColor: [75, 85, 99] }, // slate-600
                    styles: { fontSize: 9 },
                    margin: { top: 40, bottom: 40 }
                });
                currentY = doc.lastAutoTable.finalY + 40;
            }

            // TABLE 2: UNREGISTERED SCHOOLS
            const unregisteredData = data.datasets.unregistered || [];
            if (unregisteredData.length > 0) {
                // Determine if we need a page break before starting the next table title
                if (currentY > 700) { doc.addPage(); currentY = 60; }

                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text("Unregistered Schools List", 40, currentY);
                currentY += 15;

                autoTable(doc, {
                    startY: currentY,
                    head: [['School ID', 'School Name', 'District']],
                    body: unregisteredData.map(item => [item.school_id, item.school_name, item.district || '']),
                    theme: 'grid',
                    headStyles: { fillColor: [245, 158, 11] }, // amber-500
                    styles: { fontSize: 9 },
                    margin: { top: 40, bottom: 40 }
                });
                currentY = doc.lastAutoTable.finalY + 40;
            }

            // TABLE 3: INACTIVE / STALE ACCOUNTS
            const staleData = data.datasets.stale || [];
            if (staleData.length > 0) {
                 // Determine if we need a page break
                 if (currentY > 700) { doc.addPage(); currentY = 60; }

                 doc.setFontSize(12);
                 doc.setFont('helvetica', 'bold');
                 doc.text("Inactive/Stale Accounts", 40, currentY);
                 currentY += 15;
 
                 autoTable(doc, {
                     startY: currentY,
                     head: [['School ID', 'School Name', 'Last Updated']],
                     body: staleData.map(item => {
                         const updatedDate = item.last_updated ? new Date(item.last_updated).toLocaleDateString() : 'Missing';
                         return [item.school_id, item.school_name, updatedDate];
                     }),
                     theme: 'grid',
                     headStyles: { fillColor: [225, 29, 72] }, // rose-600
                     styles: { fontSize: 9 },
                     margin: { top: 40, bottom: 40 }
                 });
            }
        }

        const formattedJurisdiction = jurisdiction.toString().replace(/\s+/g, '');
        const filenameDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        doc.save(`${formattedJurisdiction}_ExecutiveReport_${filenameDate}.pdf`);
    };

    const handleExportMasterCSV = async () => {
        setIsGeneratingReport('master_csv');
        try {
            const params = new URLSearchParams();
            if (effectiveRegion) params.append('region', effectiveRegion);
            const division = effectiveDivision || userData?.division || coDivision;
            if (division) params.append('division', division);

            const res = await fetch(`/api/reports/insights/master?${params.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch master dataset');
            const result = await res.json();

            if (result.success && result.data) {
                const jurisdiction = result.jurisdiction || 'National';
                const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
                const filename = `${jurisdiction.replace(/\s+/g, '')}_MasterDataset_${dateStr}.csv`;
                downloadCSV(result.data, filename);
            }
        } catch (error) {
            console.error('Error exporting master dataset:', error);
            alert('Encountered an error fetching master dataset.');
        } finally {
            setIsGeneratingReport(null);
        }
    };

    const handleExportInsightsCSV = async () => {
        setIsGeneratingReport('insights_csv');
        try {
            const params = new URLSearchParams();
            if (effectiveRegion) params.append('region', effectiveRegion);
            const division = effectiveDivision || userData?.division || coDivision;
            if (division) params.append('division', division);
            if (coDistrict) params.append('district', coDistrict);

            const res = await fetch(`/api/reports/insights?${params.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch insights data');
            const result = await res.json();

            if (result.success && result.datasets && result.datasets.insights) {
                const rawData = result.datasets.insights;
                
                const mappedData = rawData.map(item => {
                    let metricValue = 0;
                    let metricKeyName = 'Value';

                    if (insightsMetric === 'enrolment') {
                        const key = insightsSubMetric === 'total' ? 'total_enrollment' : insightsSubMetric;
                        metricValue = item[key];
                        metricKeyName = insightsSubMetric === 'total' ? 'Total Enrolment' : insightsSubMetric.replace('grade_', 'Grade ').replace('_', ' ');
                    } else if (insightsMetric === 'aral') {
                        metricValue = item[`aral_${insightsAralSubject}_${insightsAralGrade}`];
                        const subj = insightsAralSubject === 'math' ? 'Math' : insightsAralSubject === 'sci' ? 'Science' : 'Reading';
                        metricKeyName = `ARAL ${subj} (Grade ${insightsAralGrade.replace('g','')})`;
                    } else if (insightsMetric === 'organized_classes') {
                        metricValue = item[insightsClassesGrade];
                        metricKeyName = `Classes: ${insightsClassesGrade.replace('classes_grade_', 'Grade ').replace('classes_kinder', 'Kindergarten')}`;
                    } else if (insightsMetric === 'class_size') {
                        const key = `size_${insightsClassSizeCategory}_${insightsClassSizeGrade.replace('classes_', '')}`;
                        metricValue = item[key];
                        metricKeyName = `Class Size ${insightsClassSizeCategory} (${insightsClassSizeGrade.replace('classes_grade_', 'G').replace('classes_kinder', 'K')})`;
                    } else if (insightsMetric === 'teachers') {
                        const key = insightsTeacherGrade === 'total' ? 'total_teachers' : `teachers_${insightsTeacherGrade}`;
                        metricValue = item[key];
                        metricKeyName = `Teachers: ${insightsTeacherGrade}`;
                    } else {
                        metricValue = item.total_enrollment || 0;
                        metricKeyName = `Reference Enrolment`;
                    }

                    return {
                        "School ID": item.school_id,
                        "School Name": item.school_name,
                        "District": item.derived_district || item.district || '',
                        "Division": item.derived_division || division || '',
                        [metricKeyName]: parseInt(metricValue || 0)
                    };
                });

                const jurisdiction = (coDistrict || division || effectiveRegion || 'National').toString().replace(/\s+/g, '');
                const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
                const filename = `${jurisdiction}_Insights_${insightsMetric}_${dateStr}.csv`;
                downloadCSV(mappedData, filename);
            }
        } catch (error) {
            console.error('Error exporting insights CSV:', error);
            alert('Encountered an error fetching insights data.');
        } finally {
            setIsGeneratingReport(null);
        }
    };

    const handleGenerateInsightsPDF = async () => {
        setIsGeneratingReport('insights_pdf');
        try {
            const chartElement = document.getElementById('insight-charts-container');
            if (!chartElement) {
                alert('Chart container not found. Make sure the chart is completely rendered.');
                setIsGeneratingReport(null);
                return;
            }

            // Dynamically import html2canvas so it only loads when button is clicked
            const html2canvas = (await import('html2canvas')).default;

            const canvas = await html2canvas(chartElement, {
                scale: 2, // Higher resolution
                useCORS: true,
                backgroundColor: '#ffffff'
            });

            const imgData = canvas.toDataURL('image/png');
            const doc = new jsPDF('p', 'pt', 'a4'); // Using portrait A4
            
            const division = effectiveDivision || userData?.division || coDivision;
            const jurisdiction = coDistrict || division || effectiveRegion || 'National';
            const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
            
            // 1. Formal Header
            doc.setFontSize(22);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(30, 41, 59); // slate-800
            doc.text("InsightEd - Executive Analytics Brief", 40, 60);

            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 116, 139); // slate-500
            
            // Subtitle with active filters
            const activeFilters = `Jurisdiction: ${jurisdiction} | Metric: ${insightsMetric.toUpperCase()}`;
            doc.text(`Filters Applied: ${activeFilters}`, 40, 85);
            doc.text(`Date Generated: ${dateStr}`, 40, 105);

            // 2. Embed the captured chart image
            const pdfWidth = doc.internal.pageSize.getWidth();
            const margin = 40;
            const imgWidth = pdfWidth - (margin * 2);
            // Calculate height proportional to the original canvas size
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            doc.addImage(imgData, 'PNG', margin, 130, imgWidth, imgHeight);

            // 3. Save the file
            const filenameDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            doc.save(`${jurisdiction.replace(/\s+/g, '')}_ExecutiveBrief_${filenameDate}.pdf`);

            // Optional: Show success toast to user here if implemented
            
        } catch (error) {
            console.error('Error generating visual insights PDF:', error);
            alert('Encountered an error generating the PDF snapshot.');
        } finally {
            setIsGeneratingReport(null);
        }
    };

    const handleExportRegisteredHealthCSV = async () => {
        const data = await fetchReportData('registered_health');
        if (data && data.datasets && data.datasets.registered_health) {
            const jurisdiction = (effectiveDivision || userData?.division || effectiveRegion || 'National').toString().replace(/\s+/g, '');
            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            
            // Map the data to clean CSV columns
            const mappedData = data.datasets.registered_health.map(item => ({
                "School ID": item.school_id,
                "School Name": item.school_name,
                "District": item.district || '',
                "Completion Rate (%)": `${parseFloat(item.completion_rate).toFixed(1)}%`,
                "Data Health Score (%)": `${parseFloat(item.data_health_score).toFixed(1)}%`,
                "Issues Detected": item.issues_detected || 'None',
                "Last Updated": item.last_updated ? new Date(item.last_updated).toLocaleDateString() : 'Missing'
            }));

            downloadCSV(mappedData, `${jurisdiction}_RegisteredSchoolsHealth_${dateStr}.csv`);
        }
    };

    const handleExportAllSchoolsStatusCSV = async () => {
        // Show a loading indicator if you have one, e.g., setIsExporting(true);
        console.log("Starting Masterlist Export...");
        setIsGeneratingReport('all_schools_status'); // Re-added the existing loading state indicator
        
        try {
          // 1. Determine Scope based on user role (handles RO, SDO, and CO drill-down)
          const isSuperUser = userData?.role === 'Super User';
          const impersonatedRole = sessionStorage.getItem('impersonatedRole');
          const role = (isSuperUser && impersonatedRole) ? impersonatedRole : userData?.role;
          
          let targetRegion = (isSuperUser) ? (sessionStorage.getItem('impersonatedRegion') || sessionStorage.getItem('impersonatedLocation') || userData?.region) : userData?.region;
          let targetDivision = (isSuperUser && role === 'School Division Office') ? sessionStorage.getItem('impersonatedLocation') : userData?.division;
    
          // If Central Office is logged in, use their active dropdown filters
          if (role === 'Central Office') {
             targetRegion = coRegion;
             targetDivision = coDivision;
          }
    
          if (!targetRegion) {
            alert("Please wait for data to load or select a Region first.");
            return;
          }
    
          // Helper: Cleans text (e.g. turns "MIMAROPA Region" and "MIMAROPA" into just "mimaropa")
          const cleanString = (str) => String(str || '').toLowerCase().replace(/region|division|city|of/gi, '').replace(/[-_]/g, ' ').trim();
    
          // 2. Fetch Both Registered and Unregistered Schools from the Database API
          const queryParams = new URLSearchParams();
          if (targetRegion && targetRegion !== 'All Regions') {
              // The schools table strictly uses "Region I", "Region V", "MIMAROPA", "NCR"
              const needsPrefix = !targetRegion.toLowerCase().startsWith('region') && !['NCR', 'CAR', 'BARMM', 'CARAGA', 'NIR', 'MIMAROPA'].includes(targetRegion.toUpperCase());
              const formattedRegion = needsPrefix ? `Region ${targetRegion}` : targetRegion;
              queryParams.append('region', formattedRegion);
          }
          if (targetDivision && targetDivision !== 'All Divisions') {
              queryParams.append('division', targetDivision);
          }
          queryParams.append('limit', '100000');

          console.log("Fetching API with params:", queryParams.toString());

          // Fetch Registered
          const registeredRes = await fetch(`/api/monitoring/schools?${queryParams.toString()}`);
          if (!registeredRes.ok) throw new Error('Failed to fetch registered schools');
          const registeredData = await registeredRes.json();
          const apiSchools = Array.isArray(registeredData.data) ? registeredData.data : [];
          console.log("Fetched Registered Schools count:", apiSchools.length);

          // Fetch Unregistered
          queryParams.append('unregistered', 'true');
          console.log("Fetching Unregistered with params:", queryParams.toString());
          const unregisteredRes = await fetch(`/api/monitoring/schools?${queryParams.toString()}`);
          if (!unregisteredRes.ok) throw new Error('Failed to fetch unregistered schools');
          const unregisteredData = await unregisteredRes.json();
          const unregisteredSchools = Array.isArray(unregisteredData.data) ? unregisteredData.data : [];
          console.log("Fetched Unregistered Schools count:", unregisteredSchools.length);

          if (apiSchools.length === 0 && unregisteredSchools.length === 0) {
            alert("No schools found in the database for this jurisdiction.");
            return;
          }

          // 3. Merge Both Datasets
          const csvRows = [];

          // Process Registered
          apiSchools.forEach(apiMatch => {
              let completedModules = 0;
              if (apiMatch.profile_status) completedModules++;
              if (apiMatch.head_status) completedModules++;
              if (apiMatch.enrollment_status) completedModules++;
              if (apiMatch.classes_status) completedModules++;
              if (apiMatch.personnel_status) completedModules++;
              if (apiMatch.facilities_status) completedModules++;
              
              const completionRate = `${Math.round((completedModules / 6) * 100)}%`;

              csvRows.push({
                  "School ID": apiMatch.school_id,
                  "School Name": apiMatch.school_name,
                  "Region": apiMatch.region || targetRegion,
                  "Division": apiMatch.division || targetDivision,
                  "District": apiMatch.district || '',
                  "Status": "Registered",
                  "Completion Rate": completionRate,
                  "Last Updated": apiMatch.updated_at ? new Date(apiMatch.updated_at).toLocaleDateString() : "N/A"
              });
          });

          // Process Unregistered
          unregisteredSchools.forEach(unreg => {
              csvRows.push({
                  "School ID": unreg.school_id,
                  "School Name": unreg.school_name,
                  "Region": unreg.region || targetRegion,
                  "Division": unreg.division || targetDivision,
                  "District": unreg.district || '',
                  "Status": "Unregistered",
                  "Completion Rate": "N/A",
                  "Last Updated": "N/A"
              });
          });
    
          // 6. Generate and Trigger CSV Download
          const headers = Object.keys(csvRows[0]);
          const csvContent = [
              headers.join(','),
              ...csvRows.map(row => headers.map(h => `"${(row[h] || '').toString().replace(/"/g, '""')}"`).join(','))
          ].join('\n');
    
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          
          const jurisdictionName = targetDivision ? targetDivision : targetRegion;
          link.setAttribute("download", `${jurisdictionName.replace(/\s+/g, '_')}_Masterlist_Status.csv`);
          
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
    
        } catch (error) {
          console.error("Export Error:", error);
          alert("Failed to generate export. Please check the console.");
        } finally {
          setIsGeneratingReport(null);
        }
      };

    const handleExportInactiveCSV = async () => {
        const data = await fetchReportData('inactive');
        if (data && data.datasets && data.datasets.stale) {
            const jurisdiction = (effectiveDivision || userData?.division || effectiveRegion || 'National').toString().replace(/\s+/g, '');
            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            downloadCSV(data.datasets.stale, `${jurisdiction}_InactiveAccounts_${dateStr}.csv`);
        }
    };

    const handleExportAnomaliesCSV = async () => {
        const data = await fetchReportData('anomalies');
        if (data && data.datasets && data.datasets.anomalies) {
            const jurisdiction = (effectiveDivision || userData?.division || effectiveRegion || 'National').toString().replace(/\s+/g, '');
            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            downloadCSV(data.datasets.anomalies, `${jurisdiction}_DataAnomalies_${dateStr}.csv`);
        }
    };

    // --- SUPER USER EFFECTIVE ROLE ---
    // Calculate derived role/region for rendering
    const isSuperUser = userData?.role === 'Super User';
    const impersonatedRole = sessionStorage.getItem('impersonatedRole');

    const effectiveRole = (isSuperUser && impersonatedRole)
        ? impersonatedRole
        : userData?.role;

    const effectiveRegion = (isSuperUser)
        ? (sessionStorage.getItem('impersonatedRegion') || sessionStorage.getItem('impersonatedLocation') || userData?.region)
        : userData?.region;

    const effectiveDivision = (isSuperUser && effectiveRole === 'School Division Office')
        ? sessionStorage.getItem('impersonatedLocation')
        : userData?.division;

    // Note: For SDO, we might need effectiveDivision too if we want to be precise, 
    // but the Selector sets 'impersonatedLocation' to the division name usually? 
    // Actually Selector sets:
    // Region -> impersonatedRegion
    // Division -> impersonatedDivision OR impersonatedLocation depending on logic.
    // Let's rely on standard logic below or update as needed.
    // For now, fixing Regional View is priority.

    // --- EFFECT: DATA FETCHING ---
    useEffect(() => {
        if (userData) {
            fetchData(userData.region || '', userData.division || '');
        }
    }, [userData]);

    const fetchProjectList = async (region, status) => {
        setProjectListModal({ isOpen: true, title: `${status} Projects in ${region}`, projects: [], isLoading: true });
        try {
            const res = await fetch(`/api/monitoring/engineer-projects?region=${encodeURIComponent(region)}`);
            if (res.ok) {
                const data = await res.json();
                // Filter by status on client side
                const filtered = data.filter(p => {
                    const s = p.status?.toString().toLowerCase().trim() || '';
                    const q = status.toString().toLowerCase().trim();

                    // Robust matching to align with backend "ILIKE %...%" for procurement
                    if (q.includes('under procurement')) {
                        return s.includes('under procurement');
                    }

                    return s === q;
                });
                setProjectListModal(prev => ({ ...prev, projects: filtered, isLoading: false }));
            } else {
                setProjectListModal(prev => ({ ...prev, isLoading: false }));
            }
        } catch (err) {
            console.error(err);
            setProjectListModal(prev => ({ ...prev, isLoading: false }));
        }
    };

    const handleProjectDrillDown = (region, status) => {
        fetchProjectList(region, status);
    };

    const fetchData = async (region, division, district) => {
        let uid = user?.uid || localStorage.getItem('uid');
        if (!uid) {
            console.warn("No UID found in auth or storage. Skipping fetch.");
            setLoading(false);
            return;
        }

        // Helper: read localStorage safely (returns '' for null/undefined/literal "null")
        const safeLs = (key) => {
            const v = localStorage.getItem(key);
            return (v && v !== 'null' && v !== 'undefined') ? v : '';
        };

        // Always start from localStorage values saved on login (most up-to-date location info)
        const lsRole = safeLs('userRole');
        const lsRegion = safeLs('userRegion');
        const lsDivision = safeLs('userDivision');
        const lsEmail = safeLs('userEmail');
        const lsAccountCategory = safeLs('accountCategory');

        // If we already have userData, enrich it with the fresh localStorage values from login
        let currentUserData = userData
            ? {
                ...userData,
                region: userData.region || lsRegion,
                division: userData.division || lsDivision,
                role: userData.role || lsRole,
            }
            : null;

        if (!currentUserData) {
            // Fallback to localStorage if context not yet ready
            const lsRole = safeLs('userRole');
            const lsRegion = safeLs('userRegion');
            const lsDivision = safeLs('userDivision');
            const lsEmail = safeLs('userEmail');
            const lsAccountCategory = safeLs('accountCategory');

            if (lsRole) {
                currentUserData = {
                    uid,
                    role: lsRole,
                    email: lsEmail,
                    region: lsRegion,
                    division: lsDivision,
                    account_category: lsAccountCategory
                };
            }
        }


        if (!currentUserData) {
            console.warn("No currentUserData available for effectiveRole/Region logic.");
            return;
        }

        // --- SUPER USER OVERRIDE ---
        let effectiveRole = currentUserData.role || currentUserData.Role;
        let effectiveRegion = currentUserData.region || currentUserData.Region || '';
        let effectiveDivision = currentUserData.division || currentUserData.Division || '';

        // Clean out literal string "undefined" or "null" that might be loaded from bad localStorage state
        if (effectiveRegion === 'undefined' || effectiveRegion === 'null') effectiveRegion = '';
        if (effectiveDivision === 'undefined' || effectiveDivision === 'null') effectiveDivision = '';

        console.log("Monitoring Dashboard: Resolving Jurisdiction Filters:", {
            role: effectiveRole,
            region: effectiveRegion,
            division: effectiveDivision
        });

        const impersonatedRole = sessionStorage.getItem('impersonatedRole');
        const isSuperUser = currentUserData.role === 'Super User';

        if (isSuperUser && impersonatedRole) {
            effectiveRole = impersonatedRole;
            const impLoc = sessionStorage.getItem('impersonatedLocation'); // e.g., "Region I" or "Region I - Ilocos Norte"

            // Allow Super User to act as these roles
            if (effectiveRole === 'Regional Office') {
                effectiveRegion = impLoc;
            } else if (effectiveRole === 'School Division Office') {
                // Assuming impLoc is "Region - Division" or just Division? selector logic says "Region" then "Division"
                // The selector saves specific Region and Division? 
                // Let's check Selector logic: `sessionStorage.setItem('impersonatedLocation', selectedDivision);` for SDO
                // But SDO needs Region too for queries. 
                // For now, let's assume filtering relies mostly on Division name which is usually unique enough or handled by backend.
                // Better: The selector should have saved region too. 
                // But `api/monitoring/stats` takes region/division params.
                effectiveDivision = impLoc;
                // We might need to look up the region for this division if backend requires it strictly.
                // However, most endpoints just filter by what's provided.
            }
        }

        try {
            // Determine params based on Role
            let queryRegion = region;
            let queryDivision = division;
            // Use passed district if defined (even empty string), otherwise fallback to state
            let queryDistrict = district !== undefined ? district : coDistrict;

            if (effectiveRole === 'Central Office') {
                // If in National View (no region selected), fetch Regional Overview
                // However, we only need to fetch detailed stats if a region IS selected.

                if (region || coRegion) {
                    queryRegion = region !== undefined ? region : coRegion;
                    queryDivision = division !== undefined ? division : (coDivision || '');
                } else {
                    // NATIONAL VIEW: Fetch Regional Stats
                    const regionRes = await fetch('/api/monitoring/regions');
                    if (regionRes.ok) setRegionalStats(await regionRes.json());
                    setLoading(false);
                    return; // Stop here, don't fetch detailed stats yet
                }
            } else if (effectiveRole === 'Regional Office') {
                // Force queries to respect the effective region
                queryRegion = effectiveRegion;
                queryDivision = division; // Allows filtering within the region if implemented, else usually null
            } else if (effectiveRole === 'School Division Office') {
                // Force queries to respect the effective division
                if (isSuperUser) {
                    effectiveRegion = sessionStorage.getItem('impersonatedRegion') || effectiveRegion;
                }
                queryDivision = effectiveDivision;
                queryRegion = effectiveRegion;
            } else {
                // Fallback / Original
                queryRegion = currentUserData.region;
                queryDivision = currentUserData.division;
            }

            // FIX: For SDO and RO, we want the "Top Stats" to remain as Jurisdiction Overview even when drilling down.
            // Create a separate params object for the main stats that EXCLUDES drill-down filters.

            // 1. Base Params (Region/Division/District) - Used for LISTS and DRILL-DOWN data
            const params = new URLSearchParams({
                region: queryRegion || '',
                ...(queryDivision && { division: queryDivision }),
                ...(queryDistrict && { district: queryDistrict })
            });

            // FIX: For SDO, we want the "Top Stats" to remain as Division Overview even when drilling down to a district.
            // Create a separate params object for the main stats that EXCLUDES district.
            const statsParams = new URLSearchParams();

            if (effectiveRole === 'Regional Office') {
                // FORCE Region Level Stats
                statsParams.append('region', effectiveRegion || '');
                // Explicitly DO NOT append division even if selected (drilled down)
            } else if (effectiveRole === 'School Division Office') {
                // FORCE Division Level Stats
                statsParams.append('region', effectiveRegion || ''); // Some endpoints might need region context
                statsParams.append('division', effectiveDivision || '');
                // Explicitly DO NOT append district
            } else {
                // Central Office / Super User Default: Follow the Drill Down
                if (queryRegion) statsParams.append('region', queryRegion);
                if (queryDivision) statsParams.append('division', queryDivision);
                // Note: CO usually wants to see stats for the drilled down level?
                // Request says "Regional Office and Schools Division Office dashboards... freeze". 
                // Implies CO might still want dynamic? 
                // "only show Regional summary for the Regional Office and then SDO summary the Schools Division Office"
                // So CO behavior remains dynamic (shows stats for what's viewed).
            }

            const fetchPromises = [
                // Use statsParams for the main stats (Top Card)
                fetch(`/api/monitoring/stats?${statsParams.toString()}`),
                fetch(`/api/monitoring/engineer-stats?${statsParams.toString()}`),
                // Projects List should probably respect the FILTER (Drill Down) or the CARD (Overview)?
                // "freeze the jurisdiction overview cards"
                // Usually the cards show "Completed Forms: X/Y". 
                // The list below shows "Accomplishment Rate per School/District".
                // The `engineer-projects` endpoint is for the project list? NO, it's for infra stats? 
                // Wait, `engineer-projects` returns a list. `engineer-stats` returns summary.
                // `jurisdictionProjects` state is set from `engineer-projects`. 
                // If we want the *list* to filter, we should use `params`. 
                // If we want the *cards* (Infra Matrix?) to freeze, we use `statsParams`.
                // "Infra Projects Matrix" is a table. "Jurisdiction Overview" is the top card.
                // Let's assume `engineer-projects` is for the matrix/list and should filter?
                // Actually `engineer-projects` seems to be used for the textual stats or matrix?
                // Let's look at usage. `engStats` used in "Infra Projects" card. 
                // `jurisdictionProjects`... is it used? 
                // Line 253: `setJurisdictionProjects`. 
                // Usage search: It's NOT USED in the rendered JSX in the snippet I read? 
                // Ah, wait. `engineer-projects` endpoint returns list of projects. 
                // `fetching` logic in `fetchData`:
                // `fetch('/api/monitoring/engineer-projects?${statsParams.toString()}')`
                // If "Jurisdiction Overview" includes Infra stats, then `engineer-stats` needs `statsParams`.
                // `engineer-projects`... might be heavy if getting all? 
                // Let's keep `engineer-projects` on `statsParams` if it feeds the "Infra Projects" card counts. 
                // If it feeds a list, it should be `params`.
                // Logic check: "Infra Projects Matrix" (Section 2) iterates `regionalStats` (from `/api/monitoring/regions`?). No.
                // Section 2 code (Line 826): Uses `regionalStats`. 
                // Where is `engStats` used? Line 745 (Delayed), Line 1169 (Infra Projects Card).
                // So `engStats` is for the CARD. It should be FROZEN. -> statsParams.
                // `jurisdictionProjects`... not seeing explicit usage in the cards? 
                // Let's stick to `statsParams` for `engineer-projects` to be safe/consistent with `engineer-stats`.

                fetch(`/api/monitoring/engineer-projects?${statsParams.toString()}`)
            ];

            // Fetch Division Stats for Regional Office OR Central Office (when drilling down to a region)
            // This populates the "Accomplishment Rate per School Division" list. 
            // This SHOULD change on drill down? 
            // Attempting to list Divisions. queryRegion is set.
            // Dynamic indices for additional fetches
            let divisionStatsIndex = -1;
            let districtStatsIndex = -1;

            // Fetch Division Stats (RO main view, or CO drilled to Region)
            if (effectiveRole === 'Regional Office' || (effectiveRole === 'Central Office' && queryRegion && !queryDivision)) {
                fetchPromises.push(fetch(`/api/monitoring/division-stats?${params.toString()}`));
                divisionStatsIndex = fetchPromises.length - 1;
            }

            // Fetch District Stats (SDO main view, or RO/CO drilled to Division)
            if (effectiveRole === 'School Division Office' || ((effectiveRole === 'Central Office' || effectiveRole === 'Regional Office') && queryDivision)) {
                let url = `/api/monitoring/district-stats?${params.toString()}`;
                if (drilldownType === 'legislative') {
                    url += '&groupBy=legislative';
                } else if (drilldownType === 'municipality') {
                    url += '&groupBy=municipality';
                }
                fetchPromises.push(fetch(url));
                districtStatsIndex = fetchPromises.length - 1;
            }

            const results = await Promise.all(fetchPromises);
            const statsRes = results[0];
            const engStatsRes = results[1];
            const projectsRes = results[2];

            const divStatsRes = divisionStatsIndex !== -1 ? results[divisionStatsIndex] : null;
            const distStatsRes = districtStatsIndex !== -1 ? results[districtStatsIndex] : null;

            if (statsRes.ok) setStats(await statsRes.json());
            if (engStatsRes.ok) setEngStats(await engStatsRes.json());
            if (projectsRes.ok) setJurisdictionProjects(await projectsRes.json());
            if (divStatsRes && divStatsRes.ok) setDivisionStats(await divStatsRes.json());
            if (distStatsRes && distStatsRes.ok) setDistrictStats(await distStatsRes.json());

            // FETCH SIMPLIFIED INSIGHTS (Aggregated Bar Graph Data)
            // This is secondary and non-blocking for major stats
            if (activeTab === 'insights') {
                setIsFetchingInsights(true);
                try {
                    const iRes = await fetch(`/api/reports/insights?${params.toString()}`);
                    if (iRes.ok) {
                        const iData = await iRes.json();
                        setInsightsData(iData.data || []);
                    }
                } catch (iErr) {
                    console.error("Insights Fetch Error:", iErr);
                } finally {
                    setIsFetchingInsights(false);
                }
            }
        } catch (err) {
            console.error("Dashboard Fetch Error:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchInsightsData = async () => {
        setIsFetchingInsights(true);
        try {
            const params = new URLSearchParams();
            const activeRegion = effectiveRole === 'Central Office' ? coRegion : effectiveRegion;
            const activeDivision = effectiveRole === 'School Division Office' ? (effectiveDivision || userData?.division) : (coDivision || '');
            const activeDistrict = coDistrict;

            if (activeRegion && activeRegion !== 'All') params.append('region', activeRegion);
            if (activeDivision && activeDivision !== 'All Divisions') params.append('division', activeDivision);
            if (activeDistrict && activeDistrict !== 'All') params.append('district', activeDistrict);
            
            params.append('item', insightsMetric);
            params.append('grade', insightsGradeLevel);
            params.append('subMetric', insightsSubMetric);

            const res = await fetch(`/api/reports/insights?${params.toString()}`);
            const result = await res.json();
            if (result.success) {
                setInsightsData(result.data);
            }
        } catch (err) {
            console.error("Fetch Insights Error:", err);
        } finally {
            setIsFetchingInsights(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'insights' && userData) {
            fetchInsightsData();
        }
    }, [activeTab, coRegion, coDivision, coDistrict, insightsMetric, insightsGradeLevel, insightsSubMetric, userData, effectiveRole, effectiveRegion, effectiveDivision]);

    useEffect(() => {
        fetchData();

        // Load regions from API (schools_IERN)
        fetch('/api/locations/regions')
            .then(r => r.json())
            .then(data => {
                const regions = data.map(r => r.region).filter(Boolean).sort();
                setAvailableRegions(regions);
            })
            .catch(() => {
                // Fallback to locationData JSON
                setAvailableRegions(Object.keys(locationData).sort());
            });
    }, []);

    // NEW: Handle Active Tab from Navigation State
    useEffect(() => {
        if (location.state?.activeTab) {
            setActiveTab(location.state.activeTab);

            if (location.state.resetFilters) {
                setCoRegion('');
                setCoDivision('');
                setCoDistrict('');
                // Fetch Data for National View (empty params)
                fetchData('', '');
            }
        }
    }, [location.state]);

    // Fetch Insights data when switching to the insights tab
    useEffect(() => {
        if (activeTab === 'insights' && userData) {
            setIsFetchingInsights(true);
            const params = new URLSearchParams();
            const r = effectiveRole === 'Central Office' ? coRegion : effectiveRegion;
            const d = effectiveRole === 'School Division Office' ? (effectiveDivision || userData?.division) : (coDivision || '');
            if (r) params.append('region', r);
            if (d) params.append('division', d);
            if (coDistrict) params.append('district', coDistrict);
            fetch(`/api/reports/insights?${params.toString()}`)
                .then(res => res.json())
                .then(data => setInsightsData(data.data || []))
                .catch(err => console.error('Insights fetch error:', err))
                .finally(() => setIsFetchingInsights(false));
        }
    }, [activeTab]);

    // Effect for Central Office: Update divisions when Region changes (uses schools_IERN API)
    useEffect(() => {
        if (userData?.role === 'Central Office' && coRegion) {
            fetch(`/api/locations/divisions?region=${encodeURIComponent(coRegion)}`)
                .then(r => r.json())
                .then(data => {
                    const divisions = data.map(d => d.division).filter(Boolean).sort();
                    setAvailableDivisions(divisions);
                })
                .catch(() => setAvailableDivisions([]));
        } else {
            setAvailableDivisions([]);
        }
    }, [coRegion, userData]);

    // Update Districts when Division changes (uses schools_IERN API)
    useEffect(() => {
        const effectiveRole = (userData?.role === 'Super User' && sessionStorage.getItem('impersonatedRole'))
            ? sessionStorage.getItem('impersonatedRole')
            : userData?.role;

        if (effectiveRole === 'Central Office' && coDivision) {
            fetch(`/api/locations/districts?region=${encodeURIComponent(coRegion)}&division=${encodeURIComponent(coDivision)}`)
                .then(r => r.json())
                .then(data => {
                    const districts = data.map(d => d.district).filter(Boolean).sort();
                    setAvailableDistricts(districts);
                })
                .catch(() => setAvailableDistricts([]));
        } else {
            setAvailableDistricts([]);
        }
    }, [coDivision, coRegion, userData]);

    // NEW: Mobile Detection
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleFilterChange = (region) => {
        setCoRegion(region); // Set empty string for National View
        setCoDivision(''); // Reset division when region changes
        setCoDistrict(''); // Reset district
        fetchData(region, '');
    };

    const handleDivisionChange = async (division) => {
        setCoDivision(division);
        setCoDistrict(''); // Reset district
        setSchoolSearch(''); // Reset search
        setSchoolPage(1); // Reset pagination

        // NEW: For Regional Office, fetch schools immediately (Skip District)
        // SUPER USER CHECK
        const effectiveRole = (userData?.role === 'Super User' && sessionStorage.getItem('impersonatedRole'))
            ? sessionStorage.getItem('impersonatedRole')
            : userData?.role;

        const effectiveRegion = (userData?.role === 'Super User' && effectiveRole === 'Regional Office')
            ? sessionStorage.getItem('impersonatedLocation')
            : (userData?.role === 'Regional Office' ? userData?.region : coRegion);

        // UNIFIED: Fetch Schools for both RO and CO when a division is selected
        if (effectiveRole === 'Regional Office' || (effectiveRole === 'Central Office' && division)) {
            setLoadingDistrict(true);
            try {
                // Determine Region
                const targetRegion = effectiveRole === 'Central Office' ? coRegion : effectiveRegion;

                // Fetch ALL schools in this division (API Data)
                const res = await fetch(`/api/monitoring/schools?region=${encodeURIComponent(targetRegion)}&division=${encodeURIComponent(division)}&limit=1000&role=${encodeURIComponent(effectiveRole)}`);
                let apiSchools = [];
                if (res.ok) {
                    const data = await res.json();
                    apiSchools = Array.isArray(data) ? data : (data.data || []);
                }

                // Use API data directly — schools_IERN is now the authoritative source
                const mergedSchools = apiSchools.sort((a, b) => 
                    (a.school_name || '').localeCompare(b.school_name || '')
                );
                setDistrictSchools(mergedSchools);

            } catch (err) {
                console.error(err);
            } finally {
                setLoadingDistrict(false);
            }

            // Update Global Stats
            if (userData?.role === 'Super User') {
                fetchData(effectiveRegion, division);
            } else {
                fetchData(effectiveRole === 'Central Office' ? coRegion : userData.region, division);
            }
        } else {
            fetchData(coRegion, division);
        }
    };

    // NEW: Trigger re-fetch when drilldown type changes
    useEffect(() => {
        if (isDistrictView) {
            // Determine effective region/division based on role to re-fetch correct stats
            const effectiveRole = (userData?.role === 'Super User' && sessionStorage.getItem('impersonatedRole'))
                ? sessionStorage.getItem('impersonatedRole')
                : userData?.role;

            const r = effectiveRole === 'Central Office' ? coRegion : (userData?.role === 'Regional Office' ? userData?.region : coRegion);
            const d = effectiveRole === 'School Division Office' ? userData?.division : coDivision;

            // Just call fetchData with current context
            // Note: fetchData handles role logic internally, we just need to pass the right "query" params if needed
            // Actually, simply calling fetchData with current coRegion/coDivision is usually enough as it figures out the rest
            fetchData(coRegion, coDivision);
        }
    }, [drilldownType]);

    const handleDistrictChange = async (district) => {
        setCoDistrict(district);
        setSchoolSearch(''); // Reset search
        setSchoolPage(1); // Reset pagination

        if (district) {
            setLoadingDistrict(true);
            try {
                // Determine params
                const effectiveRole = (userData?.role === 'Super User' && sessionStorage.getItem('impersonatedRole'))
                    ? sessionStorage.getItem('impersonatedRole')
                    : userData?.role;

                let region, division;

                if (effectiveRole === 'Central Office') {
                    region = coRegion;
                    division = coDivision;
                } else if (userData?.role === 'Super User') {
                    division = coDivision || sessionStorage.getItem('impersonatedLocation');
                    region = coRegion;
                } else {
                    region = userData.region;
                    division = userData.division;
                }

                const res = await fetch(`/api/monitoring/schools?region=${region}&division=${division}&district=${district}&limit=1000&role=${encodeURIComponent(effectiveRole)}`);
                let apiSchools = [];
                if (res.ok) {
                    const data = await res.json();
                    apiSchools = Array.isArray(data) ? data : (data.data || []);
                }

                // Use API data directly — schools_IERN is now the authoritative source
                const mergedSchools = apiSchools.sort((a, b) => 
                    (a.school_name || '').localeCompare(b.school_name || '')
                );
                setDistrictSchools(mergedSchools);

            } catch (error) {
                console.error("Failed to fetch district schools:", error);
            } finally {
                setLoadingDistrict(false);
            }
        } else {
            setDistrictSchools([]);
        }

        // Trigger global stats fetch (pass explicit district to avoid stale state)
        setTimeout(() => fetchData(undefined, undefined, district), 0);
    };

    // Better: Add useEffect for Filters
    useEffect(() => {
        const effectiveRole = (userData?.role === 'Super User' && sessionStorage.getItem('impersonatedRole'))
            ? sessionStorage.getItem('impersonatedRole')
            : userData?.role;

        if (effectiveRole === 'Central Office' && (coDistrict || coDivision || coRegion)) {
            fetchData(coRegion, coDivision);
        }
    }, [coDistrict, coDivision, coRegion, userData]);

    const StatCard = ({ title, value, total, color, icon: Icon }) => {
        const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
        return (
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="flex justify-between items-start mb-4">
                    <div className={`p-3 rounded-xl ${color} bg-opacity-10 dark:bg-opacity-20`}>
                        <Icon className={color.replace('bg-', 'text-')} size={24} />
                    </div>
                    <div className="text-right">
                        <span className="text-2xl font-black text-slate-800 dark:text-slate-100">{percentage}%</span>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{value} / {total}</p>
                    </div>
                </div>
                <h3 className="text-sm font-bold text-slate-600 dark:text-slate-300">{title}</h3>
                <div className="mt-3 w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                    <div
                        className={`h-full ${color} transition-all duration-1000`}
                        style={{ width: `${percentage}%` }}
                    ></div>
                </div>
            </div>
        );
    };

    // jurisdictionTotal: rely on API stats (schools_IERN-backed) as single source of truth
    const jurisdictionTotal = useMemo(() => {
        return parseInt(stats?.total_schools || 0);
    }, [stats?.total_schools]);

    // NEW: Determine Insight Chart Data Source (Division vs District)
    const isDistrictView = useMemo(() => {
        // Log logic for debugging
        // console.log("Checking View Level:", { effectiveRole, coDivision });

        if (effectiveRole === 'School Division Office') return true;
        // Even if RO drill down isn't fully supported in UI yet, this logic prepares for it
        if (effectiveRole === 'Regional Office' && coDivision) return true;
        if (effectiveRole === 'Central Office' && coDivision) return true;
        return false;
    }, [effectiveRole, coDivision]);

    const insightChartData = useMemo(() => {
        return isDistrictView ? districtStats : divisionStats;
    }, [isDistrictView, districtStats, divisionStats]);

    const insightLabelKey = isDistrictView ? 'district' : 'division';

    const formatInsightLabel = (item) => {
        const val = item[insightLabelKey];
        if (!val) return 'Unknown';
        if (isDistrictView) {
            return val.toString().replace(/^District\s+of\s+/i, '').replace(/\s+District$/i, '').trim();
        }
        return val.toString().replace('Division of ', '').replace(' City', '').trim();
    };

    // HANDLER: Drill down on chart click
    const handleInsightBarClick = (data, index) => {
        if (data) {
            // Need to handle both data formats: { fullName: ... } and { ...d, displayDivision: ... }
            const locationName = data.fullName || data.division || data.district || (data.payload && (data.payload.fullName || data.payload.division || data.payload.district));

            if (locationName) {
                if (!isDistrictView) {
                    // We are at Division level, drill down to District
                    handleDivisionChange(locationName);
                } else if (!coDistrict) {
                    // We are at District level (showing districts in a chart), drill down to School List
                    handleDistrictChange(locationName);
                }
            }
        }
    };


    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
    );

    // --- RENDER NATIONAL VIEW (REGIONAL GRID) ---

    if (effectiveRole === 'Central Office' && !coRegion) {
        return (
            <PageTransition>
                <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-24 font-sans">
                    {/* --- NEW UPDATE MODAL --- */}
                    {isUpdateAvailable && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-5 relative overflow-hidden border border-emerald-200 dark:border-emerald-900/40">
                                {/* Glowing Background Effect */}
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-teal-500"></div>
                                <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl"></div>

                                <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mx-auto text-emerald-500 mb-2 shadow-sm animate-pulse">
                                    <FiRefreshCw size={36} />
                                </div>

                                <div className="text-center space-y-2">
                                    <h2 className="text-xl font-bold text-slate-800 dark:text-white leading-tight">
                                        Update Available
                                    </h2>
                                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                                        A new version of InsightEd is ready. <br />Please reload to apply the latest changes.
                                    </p>
                                </div>

                                <button
                                    onClick={() => updateApp()}
                                    className="w-full py-3.5 bg-[#004A99] hover:bg-blue-800 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 hover:shadow-xl hover:scale-[1.02] transition-all active:scale-95"
                                >
                                    Reload Now
                                </button>
                            </div>
                        </div>
                    )}
                    {/* Header */}
                    <div className="bg-gradient-to-br from-[#004A99] to-[#002D5C] p-8 pb-32 rounded-b-[3rem] shadow-2xl text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <FiTrendingUp size={200} />
                        </div>
                        <div className="relative z-10 max-w-7xl mx-auto">
                            <div className="flex justify-between items-end mb-6">
                                <div>
                                    <h1 className="text-4xl font-black tracking-tighter">{userData.bureau || 'Central Office'}</h1>
                                    <p className="text-blue-200 text-lg font-medium mt-1">
                                        {activeTab === 'infra' ? 'Infrastructure Project Monitoring' : 'National Registration Overview'}
                                    </p>
                                </div>
                                <div className="hidden md:block text-right">
                                    <p className="text-blue-300 text-xs font-bold uppercase tracking-widest">Current Scope</p>
                                    <p className="text-2xl font-bold">Philippines (National)</p>
                                </div>
                            </div>

                            {/* Global Quick Stats */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">

                                {/* 1. InsightED Stats (Accomplishment Tab) */}
                                {activeTab === 'accomplishment' && (
                                    <>
                                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 col-span-2">
                                            <p className="text-blue-200 text-xs font-bold uppercase tracking-wider">Account Registration Rate</p>
                                            {/* Show Percentage */}
                                            {(() => {
                                                const dbSum = regionalStats.reduce((acc, curr) => acc + parseInt(curr.total_schools || 0), 0);

                                                // Use DB total directly (schools_IERN-backed)
                                                const totalSchools = dbSum;
                                                const completed = regionalStats.reduce((acc, curr) => acc + parseInt(curr.completed_schools || 0), 0);
                                                const pct = totalSchools > 0 ? ((completed / totalSchools) * 100).toFixed(1) : 0;
                                                return (
                                                    <div className="flex items-end gap-3">
                                                        <p className="text-4xl font-black mt-1">{pct}%</p>
                                                        <p className="text-sm opacity-70 mb-1 font-medium">{completed.toLocaleString()} of {totalSchools.toLocaleString()} Registered Schools</p>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </>
                                )}

                                {/* 2. Infra Stats (Infra Tab) */}
                                {activeTab === 'infra' && (
                                    <>
                                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                                            <p className="text-blue-200 text-xs font-bold uppercase tracking-wider">Total Projects</p>
                                            <p className="text-3xl font-black mt-1">{regionalStats.reduce((acc, curr) => acc + parseInt(curr.total_projects || 0), 0).toLocaleString()}</p>
                                        </div>
                                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                                            <p className="text-blue-200 text-xs font-bold uppercase tracking-wider">Ongoing Projects</p>
                                            <p className="text-3xl font-black mt-1 text-blue-400">{regionalStats.reduce((acc, curr) => acc + parseInt(curr.ongoing_projects || 0), 0).toLocaleString()}</p>
                                        </div>
                                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                                            <p className="text-blue-200 text-xs font-bold uppercase tracking-wider">Completed</p>
                                            <p className="text-3xl font-black mt-1 text-emerald-400">{regionalStats.reduce((acc, curr) => acc + parseInt(curr.completed_projects || 0), 0).toLocaleString()}</p>
                                        </div>
                                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                                            <p className="text-blue-200 text-xs font-bold uppercase tracking-wider">Delayed</p>
                                            <p className="text-3xl font-black mt-1 text-rose-400">
                                                {regionalStats && regionalStats.length > 0
                                                    ? regionalStats.reduce((acc, curr) => acc + parseInt(curr.delayed_projects || 0), 0).toLocaleString()
                                                    : (engStats?.delayed_count || 0)}
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* --- SIMULATION MODE BUTTONS (Moved here for easier access) --- */}
                            {/* REMOVED: Replaced by context-specific buttons below as per user request */}
                        </div>
                    </div>

                    <div className="max-w-7xl mx-auto px-6 -mt-20 space-y-12 relative z-20 pb-20">
                        {regionalStats.length === 0 ? (
                            <div className="bg-white p-8 rounded-3xl text-center text-slate-400">Loading regional stats...</div>
                        ) : (
                            <>
                                {/* SECTION 1: REGIONAL PERFORMANCE (SCHOOL DATA) - INSIGHTED TAB */}
                                {activeTab === 'accomplishment' && (
                                    <div>
                                        <h2 className="text-black/60 dark:text-white/60 text-xs font-black uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                            <FiCheckCircle className="text-blue-500" /> Regional Registration Performance
                                        </h2>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {regionalStats.map((reg, idx) => {
                                                const totalSchools = parseInt(reg.total_schools || 0);

                                                const completedCount = reg.completed_schools || 0;

                                                // Handle edge case where backend total is 0 but we want to show 0/CSV_Total
                                                const completionRate = totalSchools > 0 ? Math.round((completedCount / totalSchools) * 100) : 0;

                                                return (
                                                    <div
                                                        key={idx}
                                                        onClick={() => handleFilterChange(reg.region)}
                                                        className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-lg border border-slate-100 dark:border-slate-700 cursor-pointer hover:shadow-2xl hover:-translate-y-1 transition-all group relative overflow-hidden"
                                                    >
                                                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 dark:bg-blue-900/20 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150"></div>

                                                        <div className="relative z-10">
                                                            <div className="flex justify-between items-start mb-6">
                                                                <div>
                                                                    <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 group-hover:text-blue-600 transition-colors">{reg.name || reg.region}</h2>
                                                                    {/* REMOVED: Total Schools sub-label if desired, but user said remove "Total Schools" metric. 
                                                                        Does that mean remove it from cards too? 
                                                                        "InsightED Accomplishment page should only feature (1) National Accomplishment Rate (2) Regional and division breakdown".
                                                                        Usually breakdown implies visualizing the counts or rate. I will keep the rate prominent.
                                                                        I will Hide the "X Schools" label if strictly interpreted, but it's useful context. 
                                                                        Let's keep the percentage prominent.
                                                                     */}
                                                                    <p className="text-xs font-bold text-slate-400 uppercase mt-1">Status Report</p>
                                                                </div>
                                                                <div className={`flex items-center justify-center w-12 h-12 rounded-full font-black text-sm border-4 ${completionRate >= 100 ? 'border-emerald-500 text-emerald-600 bg-emerald-50' : (completionRate >= 50 ? 'border-blue-500 text-blue-600 bg-blue-50' : 'border-orange-500 text-orange-600 bg-orange-50')}`}>
                                                                    {completionRate}%
                                                                </div>
                                                            </div>

                                                            <div className="space-y-3">
                                                                <div>
                                                                    <div className="flex justify-between text-xs font-bold mb-1">
                                                                        <span className="text-slate-500">Form Completion</span>
                                                                        <span className="text-slate-700 dark:text-slate-300">{completedCount} / {totalSchools.toLocaleString()}</span>
                                                                    </div>
                                                                    <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                                                                        <div className={`h-full rounded-full ${completionRate >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${completionRate}%` }}></div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* SECTION 2: INFRASTRUCTURE PROJECTS MATRIX - INFRA TAB */}
                                {activeTab === 'infra' && (
                                    <div>
                                        <div className="flex justify-between items-center mb-6">
                                            <h2 className="text-black/60 dark:text-white/60 text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2">
                                                <FiTrendingUp className="text-emerald-500" /> Infrastructure Projects Matrix
                                            </h2>
                                            <button
                                                onClick={() => navigate('/dummy-forms', { state: { type: 'engineer' } })}
                                                className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest bg-amber-50 dark:bg-amber-900/30 px-3 py-1.5 rounded-lg border border-amber-100 hover:bg-amber-100 transition-colors flex items-center gap-2"
                                            >
                                                <FiCheckCircle size={14} className="text-amber-500" />
                                                Sample Engineer Forms
                                            </button>
                                        </div>
                                        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden relative">
                                            <div className="overflow-x-auto custom-scrollbar">
                                                <table className="w-full text-left border-collapse min-w-[800px]">
                                                    <thead>
                                                        <tr className="text-[10px] uppercase font-black text-slate-400 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                                                            <th className="p-5 min-w-[180px] sticky left-0 bg-white dark:bg-slate-800 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">Region</th>
                                                            <th className="p-5 text-center min-w-[100px]">Projects</th>
                                                            <th className="p-5 text-center min-w-[140px]">Approved Budget (ABC)</th>
                                                            <th className="p-5 text-center min-w-[140px]">Contract Amount</th>
                                                            <th className="p-5 text-center text-slate-400 min-w-[100px]">Not Started</th>
                                                            <th className="p-5 text-center text-orange-400 min-w-[120px]">Under Proc.</th>
                                                            <th className="p-5 text-center text-blue-500 min-w-[100px]">Ongoing</th>
                                                            <th className="p-5 text-center text-emerald-500 min-w-[100px]">Completed</th>
                                                            <th className="p-5 text-center text-rose-500 min-w-[100px]">Delayed</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="text-xs font-bold text-slate-600 dark:text-slate-300">
                                                        {regionalStats.map((reg, idx) => (
                                                            <tr key={idx} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/20 transition-colors border-b border-slate-50 dark:border-slate-800 group">
                                                                <td className="p-5 sticky left-0 bg-white dark:bg-slate-800 group-hover:bg-blue-50/30 dark:group-hover:bg-blue-900/20 transition-colors z-10 border-r border-slate-50 dark:border-slate-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] text-slate-700 dark:text-slate-100 font-extrabold">
                                                                    {reg.region}
                                                                </td>
                                                                <td className="p-5 text-center text-base">{reg.total_projects}</td>
                                                                <td className="p-5 text-center font-mono text-slate-500 text-[11px]">
                                                                    ₱{parseInt(reg.total_allocation || 0).toLocaleString()}
                                                                </td>
                                                                <td className="p-5 text-center font-mono text-slate-500 text-[11px]">
                                                                    ₱{parseInt(reg.total_contract_amount || 0).toLocaleString()}
                                                                </td>
                                                                <td className="p-2 text-center">
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); handleProjectDrillDown(reg.region, 'Not Yet Started'); }}
                                                                        className="w-full py-2 px-3 rounded-lg text-slate-500 bg-slate-50/50 hover:bg-slate-100/80 hover:scale-105 active:scale-95 transition-all font-black shadow-sm"
                                                                    >
                                                                        {reg.not_yet_started_projects || 0}
                                                                    </button>
                                                                </td>
                                                                <td className="p-2 text-center">
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); handleProjectDrillDown(reg.region, 'Under Procurement'); }}
                                                                        className="w-full py-2 px-3 rounded-lg text-orange-500 bg-orange-50/50 hover:bg-orange-100/80 hover:scale-105 active:scale-95 transition-all font-black shadow-sm"
                                                                    >
                                                                        {reg.under_procurement_projects || 0}
                                                                    </button>
                                                                </td>
                                                                <td className="p-2 text-center">
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); handleProjectDrillDown(reg.region, 'Ongoing'); }}
                                                                        className="w-full py-2 px-3 rounded-lg text-blue-600 bg-blue-50/50 hover:bg-blue-100/80 hover:scale-105 active:scale-95 transition-all font-black shadow-sm"
                                                                    >
                                                                        {reg.ongoing_projects}
                                                                    </button>
                                                                </td>
                                                                <td className="p-2 text-center">
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); handleProjectDrillDown(reg.region, 'Completed'); }}
                                                                        className="w-full py-2 px-3 rounded-lg text-emerald-600 bg-emerald-50/50 hover:bg-emerald-100/80 hover:scale-105 active:scale-95 transition-all font-black shadow-sm"
                                                                    >
                                                                        {reg.completed_projects}
                                                                    </button>
                                                                </td>
                                                                <td className="p-2 text-center">
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); handleProjectDrillDown(reg.region, 'Delayed'); }}
                                                                        className="w-full py-2 px-3 rounded-lg text-rose-500 bg-rose-50/50 hover:bg-rose-100/80 hover:scale-105 active:scale-95 transition-all font-black shadow-sm"
                                                                    >
                                                                        {reg.delayed_projects}
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                    <BottomNav userRole={userData?.role} />
                </div>
                {/* PROJECT LIST MODAL (NATIONAL VIEW) */}
                {projectListModal.isOpen && (
                    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                                <div>
                                    <h3 className="text-lg font-black text-slate-800 dark:text-white">{projectListModal.title}</h3>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{projectListModal.projects.length} Projects Found</p>
                                </div>
                                <button
                                    onClick={() => setProjectListModal(prev => ({ ...prev, isOpen: false }))}
                                    className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors"
                                >
                                    <FiX />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                                {projectListModal.isLoading ? (
                                    <div className="flex justify-center py-10">
                                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {projectListModal.projects.map((p) => (
                                            <div key={p.id} className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700 flex justify-between items-center group hover:border-blue-200 transition-colors">
                                                <div>
                                                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm group-hover:text-blue-600 transition-colors">{p.schoolName}</h4>
                                                    <p className="text-xs text-slate-500 italic">{p.projectName}</p>
                                                    {p.projectAllocation && (
                                                        <p className="text-[10px] font-mono text-slate-400 mt-1">
                                                            Alloc: ₱{Number(p.projectAllocation).toLocaleString()}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="text-right">
                                                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase mb-1 ${p.status === 'Completed' ? 'bg-emerald-100 text-emerald-600' :
                                                        p.status === 'Delayed' ? 'bg-rose-100 text-rose-600' :
                                                            'bg-blue-100 text-blue-600'
                                                        }`}>
                                                        {p.status}
                                                    </span>
                                                    <div className="text-xs font-black text-slate-700 dark:text-slate-300">
                                                        {p.accomplishmentPercentage}%
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {projectListModal.projects.length === 0 && (
                                            <p className="text-center text-slate-400 italic py-10">No projects found for this category.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </PageTransition>
        );
    }

    return (
        <PageTransition>
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-24 font-sans">
                {/* --- NEW UPDATE MODAL --- */}
                {isUpdateAvailable && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-5 relative overflow-hidden border border-emerald-200 dark:border-emerald-900/40">
                            {/* Glowing Background Effect */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-teal-500"></div>
                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl"></div>

                            <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mx-auto text-emerald-500 mb-2 shadow-sm animate-pulse">
                                <FiRefreshCw size={36} />
                            </div>

                            <div className="text-center space-y-2">
                                <h2 className="text-xl font-bold text-slate-800 dark:text-white leading-tight">
                                    Update Available
                                </h2>
                                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                                    A new version of InsightEd is ready. <br />Please reload to apply the latest changes.
                                </p>
                            </div>

                            <button
                                onClick={() => updateApp()}
                                className="w-full py-3.5 bg-[#004A99] hover:bg-blue-800 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 hover:shadow-xl hover:scale-[1.02] transition-all active:scale-95"
                            >
                                Reload Now
                            </button>
                        </div>
                    </div>
                )}
                {/* Header */}
                <div className="bg-gradient-to-br from-[#004A99] to-[#002D5C] p-6 pb-20 rounded-b-[3rem] shadow-xl text-white relative z-[60]">
                    {/* REMOVED BACKGROUND ICON as per user request */}


                    <div className="relative z-10">
                        {effectiveRole === 'Central Office' ? (
                            <>
                                <div className="flex items-center gap-2 mb-4">
                                    {(coRegion || coDivision || coDistrict) && (
                                        <button
                                            onClick={() => {
                                                if (coDistrict) handleDistrictChange(''); // Back to Division View
                                                else if (coDivision) handleDivisionChange(''); // Back to Regional View
                                                else if (coRegion) handleFilterChange(''); // Back to National View
                                            }}
                                            className="mr-2 p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition flex items-center justify-center group"
                                            title="Go Back"
                                        >
                                            <FiArrowLeft className="text-lg group-hover:-translate-x-0.5 transition-transform" />
                                        </button>
                                    )}

                                    <div>
                                        <h1 className="text-3xl font-black tracking-tight">{userData.bureau || 'Central Office'}</h1>
                                        <p className="text-blue-100/70 text-sm mt-1 font-bold uppercase tracking-widest">
                                            {coDistrict ? `${coDistrict}, ${coDivision}` : (coDivision ? `${coDivision} Division` : (coRegion ? `${coRegion}` : 'National View'))}
                                        </p>
                                    </div>
                                </div>

                                {/* --- REGIONAL VIEW ACTION: SCHOOL HEAD SIMULATION --- */}
                                {(coRegion || coDivision) && (
                                    <div className="mt-2 text-right md:absolute md:top-6 md:right-32 md:mt-0">
                                        <button
                                            onClick={() => navigate('/dummy-forms', { state: { type: 'school' } })}
                                            className="text-[10px] font-black text-blue-100 uppercase tracking-widest bg-blue-500/20 px-3 py-1.5 rounded-lg border border-blue-400/30 hover:bg-blue-500/30 transition-colors flex items-center gap-2"
                                        >
                                            <TbSchool size={16} className="text-blue-200" />
                                            <span>Sample School Head Forms</span>
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <div className="flex items-center gap-2 mb-2 opacity-80">
                                    <FiMapPin size={14} />
                                    <span className="text-xs font-bold uppercase tracking-widest">
                                        {effectiveRole === 'Regional Office'
                                            ? (effectiveRegion?.toString().toLowerCase().includes('region') ? effectiveRegion : `Region ${effectiveRegion}`)
                                            : `SDO ${(effectiveDivision || userData?.division)?.toString().replace(/\s+Division$/i, '')}`
                                        }
                                    </span>
                                </div>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h1 className="text-3xl font-black tracking-tight">Monitoring</h1>
                                        <p className="text-blue-100/70 text-sm mt-1">Status of schools & infrastructure.</p>
                                    </div>
                                    {(effectiveRole === 'Regional Office' || effectiveRole === 'School Division Office') && (
                                        <div className="relative">
                                            <button 
                                                onClick={() => setIsReportMenuOpen(!isReportMenuOpen)}
                                                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl text-sm font-bold transition-all border border-white/10 shadow-lg text-white"
                                            >
                                                <FiFileText size={16} />
                                                Generate Reports
                                            </button>
                                            
                                            {isReportMenuOpen && (
                                                <>
                                                    <div 
                                                        className="fixed inset-0 z-40" 
                                                        onClick={() => setIsReportMenuOpen(false)}
                                                    ></div>
                                                    <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 origin-top-right text-left text-slate-800 dark:text-white">
                                                        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                                                            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                                                <TbChartBar className="text-blue-500" size={16} />
                                                                Data Health & Compliance
                                                            </h3>
                                                        </div>
                                                        
                                                        <div className="p-2 space-y-1">
                                                            <div className="px-3 py-2">
                                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Section A: Executive Reports</p>
                                                                <button 
                                                                    onClick={handleGeneratePDF}
                                                                    disabled={isGeneratingReport !== null}
                                                                    className={`w-full text-left p-3 rounded-xl group transition-colors border border-transparent ${isGeneratingReport === 'pdf' ? 'bg-blue-50 dark:bg-blue-900/20 opacity-70 cursor-not-allowed' : 'hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-100 dark:hover:border-blue-800'}`}
                                                                >
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                                                                            {isGeneratingReport === 'pdf' ? <FiRefreshCw className="animate-spin" size={16} /> : <FiFileText size={16} />}
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                                                                {isGeneratingReport === 'pdf' ? 'Generating PDF...' : 'Generate Executive Summary (PDF)'}
                                                                            </p>
                                                                            <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">A visual compliance report for the Superintendent/Regional Director.</p>
                                                                        </div>
                                                                    </div>
                                                                </button>
                                                            </div>
                                                            
                                                            <div className="h-px bg-slate-100 dark:bg-slate-700 my-1 mx-3"></div>
                                                            
                                                            <div className="px-3 py-2">
                                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Section B: Actionable Datasets</p>
                                                                
                                                                <button 
                                                                    onClick={handleExportRegisteredHealthCSV}
                                                                    disabled={isGeneratingReport !== null}
                                                                    className={`w-full text-left p-2.5 rounded-lg group transition-colors flex items-center gap-3 ${isGeneratingReport === 'registered_health' ? 'bg-slate-50 dark:bg-slate-700/50 opacity-70 cursor-not-allowed' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                                                                >
                                                                    {isGeneratingReport === 'registered_health' ? <FiRefreshCw className="text-emerald-500 animate-spin" size={14} /> : <FiFileText className="text-slate-400 group-hover:text-emerald-500" size={14} />}
                                                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 group-hover:text-slate-800 dark:group-hover:text-white">
                                                                        {isGeneratingReport === 'registered_health' ? 'Compiling data...' : 'Download Registered Schools Health (.csv)'}
                                                                    </span>
                                                                </button>

                                                                <button 
                                                                    onClick={handleExportAllSchoolsStatusCSV}
                                                                    disabled={isGeneratingReport !== null}
                                                                    className={`w-full text-left p-2.5 rounded-lg group transition-colors flex items-start gap-3 ${isGeneratingReport === 'all_schools_status' ? 'bg-slate-50 dark:bg-slate-700/50 opacity-70 cursor-not-allowed' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                                                                >
                                                                    <div className="mt-0.5">
                                                                        {isGeneratingReport === 'all_schools_status' ? <FiRefreshCw className="text-amber-500 animate-spin" size={14} /> : <FiFileText className="text-slate-400 group-hover:text-amber-500" size={14} />}
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300 group-hover:text-slate-800 dark:group-hover:text-white leading-tight">
                                                                            {isGeneratingReport === 'all_schools_status' ? 'Gathering dataset...' : 'Download List of Schools (Registration Status) (.csv)'}
                                                                        </span>
                                                                        <span className="text-[10px] text-slate-400 mt-1 font-normal leading-tight">Includes both registered & unregistered schools.</span>
                                                                    </div>
                                                                </button>

                                                            </div>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {/* MANUAL REFRESH BUTTON (For RO/SDO/CO) */}
                        <div className="absolute bottom-1 right-0">
                            <button
                                onClick={() => { setLoading(true); fetchData(); }}
                                className="p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-all hover:rotate-180 active:scale-95"
                                title="Refresh Data"
                            >
                                <FiRefreshCw size={18} />
                            </button>
                        </div>
                    </div>


                    {/* Tabs - Hidden for SDO AND RO as they use Bottom Nav. Also hidden for Central Office when drilling down to a region. */}
                    {effectiveRole !== 'School Division Office' && effectiveRole !== 'Regional Office' && !(effectiveRole === 'Central Office' && coRegion) && (
                        <div className="flex gap-2 mt-8 relative z-10">
                            {['all', 'school', 'engineer', 'insights'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab
                                        ? 'bg-white text-[#004A99] shadow-lg'
                                        : 'bg-white/10 text-white hover:bg-white/20'
                                        }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="px-5 -mt-10 space-y-6 relative z-20">
                    {/* HOME TAB (Previously ALL) - NOW SHARED FOR REGIONAL/DIVISION VIEWS */}
                    {(activeTab === 'all' || activeTab === 'home' || activeTab === 'accomplishment' || activeTab === 'infra') && (
                        <>
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-lg border border-slate-100 dark:border-slate-700">
                                <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Jurisdiction Overview</h2>
                                <div className={`grid grid-cols-1 md:grid-cols-2 ${effectiveRole !== 'Regional Office' && effectiveRole !== 'School Division Office' ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-4`}>
                                    {/* Account Registration Card (from users table) */}
                                    {(activeTab === 'all' || activeTab === 'home' || activeTab === 'accomplishment') && (
                                        <div className={`p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800/50 ${(effectiveRole === 'Regional Office' || effectiveRole === 'School Division Office') ? 'col-span-1 lg:col-span-1 md:col-span-2' : 'col-span-1'}`}>
                                            {(() => {
                                                const displayTotal = jurisdictionTotal;
                                                const accountsCount = parseInt(stats?.accounts_count || 0);
                                                const percentage = displayTotal > 0 ? ((accountsCount / displayTotal) * 100).toFixed(1) : 0;

                                                return (
                                                    <div className="flex items-center justify-between h-full">
                                                        <div>
                                                            <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                                                                {percentage}%
                                                            </span>
                                                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mt-1">
                                                                Account Registration <br />
                                                                <span className="text-emerald-600 dark:text-emerald-300">({accountsCount} / {displayTotal})</span>
                                                            </p>
                                                        </div>
                                                        <TbSchool size={32} className="text-emerald-200" />
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    )}

                                    {/* Completion Card */}
                                    {(activeTab === 'all' || activeTab === 'home' || activeTab === 'accomplishment') && (
                                        <div className={`p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800/50 ${(effectiveRole === 'Regional Office' || effectiveRole === 'School Division Office') ? 'col-span-1 lg:col-span-1 md:col-span-2' : 'col-span-1'}`}>
                                            {(() => {
                                                const displayTotal = jurisdictionTotal;
                                                const completedCount = parseInt(stats?.completed_schools_count || 0);
                                                const percentage = displayTotal > 0 ? ((completedCount / displayTotal) * 100).toFixed(1) : 0;

                                                return (
                                                    <div className="flex items-center justify-between h-full">
                                                        <div>
                                                            <span className="text-3xl font-black text-[#004A99] dark:text-blue-400">
                                                                {percentage}%
                                                            </span>
                                                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mt-1">
                                                                100% Data Completion <br />
                                                                <span className="text-[#004A99] dark:text-blue-300">({completedCount} / {displayTotal})</span>
                                                            </p>
                                                        </div>
                                                        <FiCheckCircle size={32} className="text-blue-200" />
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    )}

                                    {/* System Validated Card - ONLY FOR CO */}
                                    {(activeTab === 'all' || activeTab === 'home' || activeTab === 'accomplishment') && effectiveRole !== 'Regional Office' && effectiveRole !== 'School Division Office' && (
                                        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-2xl col-span-1 border border-purple-100 dark:border-purple-800/50">
                                            {(() => {
                                                const displayTotal = jurisdictionTotal;
                                                const validatedCount = parseInt(stats?.validated_schools_count || 0);
                                                const percentage = displayTotal > 0 ? ((validatedCount / displayTotal) * 100).toFixed(1) : 0;

                                                return (
                                                    <div className="flex items-center justify-between h-full">
                                                        <div>
                                                            <span className="text-3xl font-black text-purple-600 dark:text-purple-400">
                                                                {percentage}%
                                                            </span>
                                                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mt-1">
                                                                System Validated <br />
                                                                <span className="text-purple-600 dark:text-purple-300">({validatedCount} / {displayTotal})</span>
                                                            </p>
                                                        </div>
                                                        <FiTrendingUp size={32} className="text-purple-200" />
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    )}



                                    {(activeTab === 'infra') && (
                                        <div className={`p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl ${activeTab === 'infra' ? 'col-span-2' : ''}`}>
                                            <div className="flex flex-col h-full justify-center">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{engStats?.total_projects || 0}</span>
                                                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mt-1">Infra Projects</p>
                                                    </div>
                                                    <div className="text-right space-y-1">
                                                        <div className="bg-white/50 dark:bg-slate-800/50 px-3 py-1.5 rounded-xl border border-emerald-100 dark:border-emerald-800">
                                                            <p className="text-[8px] font-black text-slate-400 uppercase leading-none">Total ABC</p>
                                                            <p className="text-sm font-black text-emerald-700 dark:text-emerald-300 antialiased tracking-tight">₱{Number(engStats?.total_allocation || 0).toLocaleString()}</p>
                                                        </div>
                                                        <div className="bg-white/50 dark:bg-slate-800/50 px-3 py-1.5 rounded-xl border border-emerald-100 dark:border-emerald-800">
                                                            <p className="text-[8px] font-black text-slate-400 uppercase leading-none">Total Contract</p>
                                                            <p className="text-sm font-black text-blue-700 dark:text-blue-300 antialiased tracking-tight">₱{Number(engStats?.total_contract_amount || 0).toLocaleString()}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Completed Projects % */}
                                                {engStats?.total_projects > 0 && (
                                                    <div className="mt-4 text-[10px] font-bold text-emerald-700/70 dark:text-emerald-300/70">
                                                        {Math.round(((engStats.completed_count || 0) / engStats.total_projects) * 100)}% Completed
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Accomplishment Rate per School Division (Regional Office Only OR Central Office Regional View) */}
                            {/* ONLY SHOW FOR INSIGHTED ACCOMPLISHMENT TAB */}
                            {(activeTab === 'all' || activeTab === 'home' || activeTab === 'accomplishment') &&
                                !coDivision &&
                                (effectiveRole === 'Regional Office' || (effectiveRole === 'Central Office' && coRegion)) && (
                                    <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-lg border border-slate-100 dark:border-slate-700 mt-6">
                                        <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Account Registration per School Division</h2>
                                        {(() => {
                                            // 1. Get List of Divisions from API (schools_IERN backed)
                                            const targetRegion = effectiveRole === 'Central Office' ? coRegion : effectiveRegion;

                                            // Build division list from API divisionStats (already deduplicated)
                                            const divMap = {};
                                            divisionStats.forEach(d => {
                                                const key = normalizeLocationName(d.division);
                                                if (key) divMap[key] = d.division;
                                            });
                                            const regionDivisions = Object.values(divMap).sort();

                                            if (regionDivisions.length === 0) {
                                                return <p className="text-sm text-slate-400 italic">No division data available / No schools found.</p>;
                                            }

                                            return (
                                                <div className="space-y-4">
                                                    {regionDivisions.map((divName, idx) => {
                                                        // 3. Get Completed Count from Backend Stats
                                                        const startStat = divisionStats.find(d => normalizeLocationName(d.division) === normalizeLocationName(divName));
                                                        const completedCount = startStat ? parseInt(startStat.completed_schools || 0) : 0;
                                                        const validatedCount = startStat ? parseInt(startStat.validated_schools || 0) : 0;

                                                        // 2. Calculate Total Schools
                                                        // Use API Total if available and higher than CSV (to include new schools)
                                                        const apiTotal = startStat ? parseInt(startStat.total_schools || 0) : 0;

                                                        // Use API total directly (schools_IERN is the source of truth)
                                                        const totalSchools = apiTotal;

                                                        // 4. Calculate Percentage (User Logic: Completed Schools / Total Schools)
                                                        // Clamp to 100%
                                                        const rawPercentage = totalSchools > 0 ? (completedCount / totalSchools) * 100 : 0;
                                                        // Use toFixed(1) to avoid rounding up to 100%
                                                        const percentage = totalSchools > 0 ? Math.min(rawPercentage, 100).toFixed(1) : 0;

                                                        // Validation Percentages for Stacked Bar
                                                        const validatedPct = totalSchools > 0 ? (validatedCount / totalSchools) * 100 : 0;

                                                        // For Validation: Use the for_validation_schools field from API
                                                        const forValidationCount = parseInt(startStat?.for_validation_schools || 0);
                                                        const forValidationPct = totalSchools > 0 ? (forValidationCount / totalSchools) * 100 : 0;

                                                        // Define colors for progress bars (cycling)
                                                        const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-pink-500'];
                                                        const color = colors[idx % colors.length];

                                                        return (
                                                            <div
                                                                key={divName}
                                                                onClick={() => {
                                                                    // UNIFIED HANDLER: Both RO and CO use handleDivisionChange
                                                                    handleDivisionChange(divName);
                                                                }}
                                                                className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors group"
                                                            >
                                                                <div className="flex justify-between items-center mb-2">
                                                                    <div>
                                                                        <h3 className="font-bold text-slate-700 dark:text-slate-200 text-sm group-hover:text-blue-600 transition-colors">{divName}</h3>
                                                                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">
                                                                            {completedCount} / {totalSchools} Registered
                                                                        </p>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <span className="text-lg font-black text-slate-700 dark:text-slate-200">{percentage}%</span>
                                                                        {effectiveRole !== 'Regional Office' && effectiveRole !== 'School Division Office' && (
                                                                            <p className="text-[9px] font-bold text-slate-400">({Math.round(validatedPct)}% Validated)</p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                {/* Stacked Progress Bar */}
                                                                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden flex mb-2">
                                                                    <div
                                                                        className={`h-full ${color} transition-all duration-1000`}
                                                                        style={{ width: `${(effectiveRole === 'Regional Office' || effectiveRole === 'School Division Office') ? percentage : validatedPct}%` }}
                                                                        title={`System Validated: ${validatedCount}`}
                                                                    ></div>
                                                                    {effectiveRole !== 'Regional Office' && effectiveRole !== 'School Division Office' && (
                                                                        <div
                                                                            className={`h-full bg-rose-400/80 transition-all duration-1000`}
                                                                            style={{ width: `${forValidationPct}%` }}
                                                                            title={`Critical Issues: ${forValidationCount}`}
                                                                        ></div>
                                                                    )}
                                                                </div>
                                                                {effectiveRole !== 'Regional Office' && effectiveRole !== 'School Division Office' && (
                                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                                                                        <span className="text-emerald-500">{validatedCount} Validated</span> • <span className="text-rose-500">{forValidationCount} For Validation</span>
                                                                    </p>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}

                            {/* NEW: District Accomplishment Rate for SDO OR Central Office Division View */}
                            {/* SHOW FOR INSIGHTED ACCOMPLISHMENT TAB */}
                            {(activeTab === 'all' || activeTab === 'home' || activeTab === 'accomplishment') &&
                                (effectiveRole === 'School Division Office' || (effectiveRole === 'Central Office' && coDivision) || (effectiveRole === 'Regional Office' && coDivision)) && (
                                    <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-lg border border-slate-100 dark:border-slate-700 mt-6">
                                        <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
                                            {(coDistrict || (effectiveRole === 'Regional Office' && coDivision) || (effectiveRole === 'Central Office' && coDivision)) ? 'Account Registration per School' : 'Account Registration per District'}
                                        </h2>
                                        {(() => {
                                            // Determine Target Region:
                                            // 1. CO: Use selected Region
                                            // 2. RO: Use effectiveRegion
                                            // 3. SDO: Use effectiveRegion (if normal user) OR derive from SchoolData (if Super User impersonating SDO)
                                            const targetRegion = effectiveRole === 'Central Office'
                                                ? coRegion
                                                : (effectiveRegion || sessionStorage.getItem('impersonatedRegion') || '');

                                            // Determine Target Division:
                                            const targetDivision = (effectiveRole === 'Central Office' || effectiveRole === 'Regional Office')
                                                ? coDivision
                                                : effectiveDivision;

                                            // IF DISTRICT SELECTED OR REGIONAL OFFICE DRILL-DOWN: SHOW SCHOOLS
                                            if (coDistrict || (effectiveRole === 'Regional Office' && coDivision) || (effectiveRole === 'Central Office' && coDivision)) {
                                                if (loadingDistrict) {
                                                    return <div className="p-8 text-center text-slate-400 animate-pulse">Loading schools...</div>;
                                                }

                                                // PRE-PROCESS FOR FILTERING & SORTING ONLY (Use raw API data directly to save memory/CPU)
                                                const filteredSchools = districtSchools.filter(s =>
                                                    s.school_name?.toLowerCase().includes(schoolSearch.toLowerCase()) ||
                                                    s.school_id?.includes(schoolSearch)
                                                );

                                                const sortedSchools = [...filteredSchools].sort((a, b) => {
                                                    const pctA = parseInt(a.completion_percentage || 0);
                                                    const pctB = parseInt(b.completion_percentage || 0);
                                                    if (schoolSort === 'name-asc') return a.school_name.localeCompare(b.school_name);
                                                    if (schoolSort === 'pct-desc') return pctB - pctA;
                                                    if (schoolSort === 'pct-asc') return pctA - pctB;
                                                    return 0;
                                                });

                                                // PAGINATION
                                                const totalPages = Math.ceil(sortedSchools.length / schoolLimit);
                                                const startIndex = (schoolPage - 1) * schoolLimit;
                                                const rawPaginatedSchools = sortedSchools.slice(startIndex, startIndex + schoolLimit);

                                                // RUN HEAVY VALIDATION LOGIC ONLY ON VIEWABLE SCHOOLS
                                                const paginatedSchools = rawPaginatedSchools.map(s => {
                                                    let percentage = 0;
                                                    if (s.completion_percentage !== undefined && s.completion_percentage !== null) {
                                                        percentage = parseInt(s.completion_percentage);
                                                    }

                                                    // Identify missing for tooltip/subtitle if needed
                                                    const missing = [];
                                                    if (!s.profile_status) missing.push("Profile");
                                                    if (!s.head_status) missing.push("School Head");
                                                    if (!s.enrollment_status) missing.push("Enrollment");
                                                    if (!s.classes_status) missing.push("Classes");
                                                    if (!s.personnel_status) missing.push("Personnel");
                                                    if (!s.specialization_status) missing.push("Specialization");
                                                    if (!s.resources_status) missing.push("Resources");
                                                    if (!s.shifting_status) missing.push("Modalities");
                                                    if (!s.learner_stats_status) missing.push("Learner Stats");
                                                    if (!s.facilities_status) missing.push("Facilities");

                                                    return { ...s, percentage, missing };
                                                });

                                                return (
                                                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                                        {/* Header with Back Button */}
                                                        <div className="flex flex-col gap-4">
                                                                <div className="flex items-start justify-between">
                                                                    <div className="flex items-start gap-3">
                                                                        <button
                                                                            onClick={() => {
                                                                                if (effectiveRole === 'Regional Office') {
                                                                                    handleDivisionChange(''); // Back to Division List
                                                                                } else if (effectiveRole === 'Central Office') {
                                                                                    handleDivisionChange(''); // Back to Division List for CO
                                                                                } else {
                                                                                    handleDistrictChange(''); // Back to District List
                                                                                }
                                                                            }}
                                                                            className="p-2 bg-slate-100 dark:bg-slate-700 rounded-full hover:bg-slate-200 transition mt-0.5"
                                                                        >
                                                                            <FiArrowLeft size={18} className="text-slate-600 dark:text-slate-300" />
                                                                        </button>
                                                                        <div>
                                                                            <h3 className="font-black text-xl text-slate-800 dark:text-white leading-tight">
                                                                                {effectiveRole === 'Regional Office' || effectiveRole === 'Central Office' ? coDivision : coDistrict}
                                                                            </h3>
                                                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 mb-3">{sortedSchools.length} Schools</p>

                                                                            {/* Show Controls - Moved beneath Division Name */}
                                                                            <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1 items-center w-max">
                                                                                <span className="text-xs font-black text-slate-500 mx-2 uppercase tracking-wide">Show:</span>
                                                                                {[10, 20, 50, 100].map(num => (
                                                                                    <button
                                                                                        key={num}
                                                                                        onClick={() => { setSchoolLimit(num); setSchoolPage(1); }}
                                                                                        className={`px-3 py-1 rounded-md text-xs font-bold transition ${schoolLimit === num ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-800 dark:text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                                                                                    >
                                                                                        {num}
                                                                                    </button>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {/* Sort Controls */}
                                                                    <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1 self-start mt-0.5">
                                                                        <button
                                                                            onClick={() => setSchoolSort('name-asc')}
                                                                            className={`p-1.5 rounded-md text-xs font-bold transition ${schoolSort === 'name-asc' ? 'bg-white dark:bg-slate-600 shadow text-blue-600 dark:text-blue-300' : 'text-slate-400'}`}
                                                                            title="Sort A-Z"
                                                                        >
                                                                            A-Z
                                                                        </button>
                                                                        <button
                                                                            onClick={() => setSchoolSort('pct-desc')}
                                                                            className={`p-1.5 rounded-md text-xs font-bold transition ${schoolSort === 'pct-desc' ? 'bg-white dark:bg-slate-600 shadow text-emerald-600 dark:text-emerald-300' : 'text-slate-400'}`}
                                                                            title="Sort % High-Low"
                                                                        >
                                                                            % High
                                                                        </button>
                                                                        <button
                                                                            onClick={() => setSchoolSort('pct-asc')}
                                                                            className={`p-1.5 rounded-md text-xs font-bold transition ${schoolSort === 'pct-asc' ? 'bg-white dark:bg-slate-600 shadow text-rose-600 dark:text-rose-300' : 'text-slate-400'}`}
                                                                            title="Sort % Low-High"
                                                                        >
                                                                            % Low
                                                                        </button>
                                                                    </div>
                                                                </div>

                                                                {/* Search Box */}
                                                            <div className="relative">
                                                                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                                                <input
                                                                    type="text"
                                                                    placeholder="Search school name or ID..."
                                                                    value={schoolSearch}
                                                                    onChange={(e) => {
                                                                        setSchoolSearch(e.target.value);
                                                                        setSchoolPage(1); // Reset to page 1 on search
                                                                    }}
                                                                    className="w-full bg-slate-100 dark:bg-slate-700 border-none rounded-xl py-3 pl-10 pr-4 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:font-normal placeholder:text-slate-400"
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Unified School List (Paginated) */}
                                                        <div className="space-y-3 min-h-[400px]">
                                                            {paginatedSchools.map((s) => (
                                                                <div
                                                                    key={s.school_id}
                                                                    onClick={() => {
                                                                        if (userData?.role === 'Super User') {
                                                                            sessionStorage.setItem('targetSchoolId', s.school_id);
                                                                            sessionStorage.setItem('targetSchoolName', s.school_name);
                                                                            navigate('/school-audit');
                                                                        }
                                                                    }}
                                                                    className={`bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex justify-between items-center group hover:border-blue-200 transition-colors ${userData?.role === 'Super User' ? 'cursor-pointer ring-2 ring-transparent hover:ring-blue-400' : ''}`}
                                                                >
                                                                    <div className="flex-1 min-w-0 pr-4">
                                                                        <div className="flex items-center gap-2 mb-2">
                                                                            <h4 className="font-bold text-slate-700 dark:text-slate-200 text-sm group-hover:text-blue-600 transition-colors truncate">{s.school_name}</h4>
                                                                            {s.percentage === 100 && <FiCheckCircle className="text-emerald-500 shrink-0" size={14} />}

                                                                            {s.percentage === 0 && <span className="text-[9px] bg-slate-100 dark:bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded-md font-bold uppercase shrink-0">No Data</span>}
                                                                        </div>

                                                                        <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden mb-2">
                                                                            <div
                                                                                className={`h-full rounded-full transition-all duration-500 ${s.percentage === 100 ? 'bg-emerald-500' :
                                                                                    s.percentage >= 50 ? 'bg-blue-500' :
                                                                                        s.percentage > 0 ? 'bg-amber-500' : 'bg-slate-300'
                                                                                    }`}
                                                                                style={{ width: `${s.percentage}%` }}
                                                                            ></div>
                                                                        </div>

                                                                        <div className="space-y-1">
                                                                            {/* DATA HEALTH SCORE DISPLAY - MOVED BELOW BAR */}
                                                                            {effectiveRole !== 'Regional Office' && effectiveRole !== 'School Division Office' && (() => {
                                                                                // Default to 0 if undefined
                                                                                const score = s.data_health_score !== undefined ? s.data_health_score : 0;

                                                                                let colorClass = 'bg-slate-100 text-slate-600';
                                                                                let label = '';

                                                                                // 1. Determine Label & Color based on Score
                                                                                if (score <= 50) {
                                                                                    colorClass = 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400';
                                                                                    label = 'Major Data Anomalies';
                                                                                } else if (score <= 85) {
                                                                                    colorClass = 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400';
                                                                                    label = 'Minor Data Anomalies';
                                                                                } else if (score <= 99) {
                                                                                    colorClass = 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400';
                                                                                    label = 'Minimal Data Anomalies';
                                                                                } else { // 100 or higher
                                                                                    colorClass = 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400';
                                                                                    label = 'Excellent';
                                                                                }

                                                                                return (
                                                                                    <div className="flex items-center gap-2">
                                                                                        <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase shrink-0 flex items-center gap-1 ${colorClass}`}>
                                                                                            <FiAlertCircle size={10} />
                                                                                            <span className="opacity-75">Score: {score}</span> • {label}
                                                                                        </span>
                                                                                    </div>
                                                                                );
                                                                            })()}

                                                                            {/* Data Quality Issues Badge */}
                                                                            {effectiveRole !== 'Regional Office' && effectiveRole !== 'School Division Office' && (s.data_quality_issues && s.data_quality_issues !== 'None' && s.data_quality_issues.trim() !== '') ? (
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        setSelectedSchoolForIssues(s);
                                                                                        setIsIssuesModalOpen(true);
                                                                                    }}
                                                                                    className="mt-1 flex items-center gap-1.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2.5 py-1 rounded-full text-[10px] font-black uppercase hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors shadow-sm cursor-pointer w-max"
                                                                                >
                                                                                    <FiAlertCircle size={12} />
                                                                                    {s.data_quality_issues.split(';').filter(i => i.trim() !== '').length} Issues
                                                                                </button>
                                                                            ) : effectiveRole !== 'Regional Office' && effectiveRole !== 'School Division Office' && (
                                                                                <div className="mt-1 flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full text-[10px] font-black uppercase w-max">
                                                                                    <FiCheckCircle size={12} />
                                                                                    Clean
                                                                                </div>
                                                                            )}

                                                                            {s.missing.length > 0 && s.missing.length < 10 && (
                                                                                <p className="text-[10px] text-slate-400 truncate">
                                                                                    Missing: {s.missing.join(', ')}
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    <div className="text-right shrink-0">
                                                                        <span className={`text-xl font-black ${s.percentage === 100 ? 'text-emerald-500' :
                                                                            s.percentage >= 50 ? 'text-blue-500' :
                                                                                s.percentage > 0 ? 'text-amber-500' : 'text-slate-300'
                                                                            }`}>
                                                                            {s.percentage}%
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            ))}

                                                            {paginatedSchools.length === 0 && (
                                                                <div className="text-center py-10 text-slate-400 italic">
                                                                    No schools found.
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Pagination Controls */}
                                                        {totalPages > 1 && (
                                                            <div className="flex justify-center items-center gap-3 mt-6 pt-6 border-t border-slate-100 dark:border-slate-700">
                                                                <button
                                                                    onClick={() => setSchoolPage(1)}
                                                                    disabled={schoolPage === 1}
                                                                    className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-lg text-slate-500 hover:border-blue-500 hover:text-blue-600 disabled:opacity-30 disabled:hover:border-slate-100 dark:disabled:hover:border-slate-700 disabled:cursor-not-allowed transition-all active:scale-90"
                                                                    title="First Page"
                                                                >
                                                                    <FiChevronsLeft size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={() => setSchoolPage(prev => Math.max(prev - 1, 1))}
                                                                    disabled={schoolPage === 1}
                                                                    className="px-4 py-2 flex items-center gap-2 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:border-blue-500 hover:text-blue-600 disabled:opacity-30 disabled:hover:border-slate-100 dark:disabled:hover:border-slate-700 disabled:cursor-not-allowed transition-all active:scale-95"
                                                                >
                                                                    <FiChevronLeft size={14} />
                                                                    <span>Prev</span>
                                                                </button>

                                                                <div className="bg-slate-100 dark:bg-slate-700 px-4 py-2 rounded-lg text-xs font-black text-slate-600 dark:text-slate-300">
                                                                    {schoolPage} <span className="text-slate-400 font-bold mx-1">/</span> {totalPages}
                                                                </div>

                                                                <button
                                                                    onClick={() => setSchoolPage(prev => Math.min(prev + 1, totalPages))}
                                                                    disabled={schoolPage === totalPages}
                                                                    className="px-4 py-2 flex items-center gap-2 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:border-blue-500 hover:text-blue-600 disabled:opacity-30 disabled:hover:border-slate-100 dark:disabled:hover:border-slate-700 disabled:cursor-not-allowed transition-all active:scale-95"
                                                                >
                                                                    <span>Next</span>
                                                                    <FiChevronRight size={14} />
                                                                </button>
                                                                <button
                                                                    onClick={() => setSchoolPage(totalPages)}
                                                                    disabled={schoolPage === totalPages}
                                                                    className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-lg text-slate-500 hover:border-blue-500 hover:text-blue-600 disabled:opacity-30 disabled:hover:border-slate-100 dark:disabled:hover:border-slate-700 disabled:cursor-not-allowed transition-all active:scale-90"
                                                                    title="Last Page"
                                                                >
                                                                    <FiChevronsRight size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={() => setSchoolPage(totalPages)}
                                                                    disabled={schoolPage === totalPages}
                                                                    title="Go to Last Page"
                                                                    className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors text-slate-600 dark:text-slate-300"
                                                                >
                                                                    &gt;&gt;
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            }

                                            // DEFAULT: LIST OF DISTRICTS / LEGISLATIVE / MUNICIPALITY
                                            // DYNAMIC GROUPING FIX: Use Keys from API (districtStats) if available, otherwise fall back to CSV
                                            // The API returns grouped data. The CSV is for the "Master List" of what *should* be there.
                                            // For Legislative/Municipality, we might not have a perfect master list in CSV if those columns are missing or messy.
                                            // Strategy: Collection of ALL unique keys from both CSV (if applicable) and API.

                                            let divisionDistricts = [];

                                            if (drilldownType === 'legislative') {
                                                // Get keys from API
                                                const apiKeys = districtStats.map(d => d.leg_district).filter(k => k);
                                                // Get keys from CSV (if column exists) - Assuming 'leg_district' column in CSV
                                                const csvKeys = schoolData
                                                    .filter(s => s.region === targetRegion && s.division === targetDivision)
                                                    .map(s => s.leg_district) // Ensure CSV has this column
                                                    .filter(k => k);

                                                divisionDistricts = [...new Set([...apiKeys, ...csvKeys])].sort();

                                                // console.log("Drilldown Legislative Keys:", divisionDistricts);
                                            } else if (drilldownType === 'municipality') {
                                                // Get keys from API
                                                const apiKeys = districtStats.map(d => d.municipality).filter(k => k);
                                                // Get keys from CSV
                                                const csvKeys = schoolData
                                                    .filter(s => s.region === targetRegion && s.division === targetDivision)
                                                    .map(s => s.municipality)
                                                    .filter(k => k);

                                                divisionDistricts = [...new Set([...apiKeys, ...csvKeys])].sort();
                                                // console.log("Drilldown Municipality Keys:", divisionDistricts);
                                            } else {
                                                // Default: School District
                                                const districtsMap = {};
                                                schoolData
                                                    .filter(s => 
                                                        s.region?.toUpperCase().trim() === targetRegion?.toUpperCase().trim() && 
                                                        s.division?.toUpperCase().trim() === targetDivision?.toUpperCase().trim()
                                                    )
                                                    .forEach(s => {
                                                        const u = s.district?.toUpperCase().trim();
                                                        if (u && !districtsMap[u]) districtsMap[u] = s.district;
                                                    });
                                                divisionDistricts = Object.values(districtsMap).sort();
                                            }

                                            if (divisionDistricts.length === 0) {
                                                return <p className="text-sm text-slate-400 italic">No grouped data available.</p>;
                                            }

                                            return (
                                                <div className="space-y-4">
                                                    {divisionDistricts.map((distName, idx) => {
                                                        // 2. Count Total from CSV
                                                        // Use API total — schools_IERN is the source of truth
                                                        const csvTotal = 0; // No longer used

                                                        // 3. Get API Stats for this Group
                                                        const startStat = districtStats.find(d => {
                                                            if (drilldownType === 'legislative') {
                                                                return normalizeLocationName(d.leg_district) === normalizeLocationName(distName);
                                                            } else if (drilldownType === 'municipality') {
                                                                return normalizeLocationName(d.municipality) === normalizeLocationName(distName);
                                                            }
                                                            return normalizeLocationName(d.district) === normalizeLocationName(distName);
                                                        });

                                                        const completedCount = startStat ? parseInt(startStat.completed_schools || 0) : 0;
                                                        const validatedCount = startStat ? parseInt(startStat.validated_schools || 0) : 0;
                                                        const apiTotal = startStat ? parseInt(startStat.total_schools || 0) : 0;

                                                        // Fix >100% Bug: Ensure total includes API count if it's higher than CSV
                                                        const totalSchools = Math.max(csvTotal, apiTotal);

                                                        // 4. Calculate Percentage (User Logic: Completed Schools / Total Schools)
                                                        // Clamp to 100% to prevent edge cases
                                                        const rawPercentage = totalSchools > 0 ? (completedCount / totalSchools) * 100 : 0;
                                                        // Use toFixed(1) to avoid rounding up to 100%
                                                        const percentage = totalSchools > 0 ? Math.min(rawPercentage, 100).toFixed(1) : 0;

                                                        // Validation Percentages for Stacked Bar
                                                        const validatedPct = totalSchools > 0 ? (validatedCount / totalSchools) * 100 : 0;
                                                        const forValidationCount = Math.max(0, completedCount - validatedCount);
                                                        const forValidationPct = totalSchools > 0 ? (forValidationCount / totalSchools) * 100 : 0;

                                                        // Colors
                                                        const colors = ['bg-orange-500', 'bg-cyan-500', 'bg-lime-500', 'bg-fuchsia-500', 'bg-indigo-500'];
                                                        const color = colors[idx % colors.length];

                                                        return (
                                                            <div
                                                                key={distName}
                                                                onClick={() => handleDistrictChange(distName)}
                                                                className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors group"
                                                            >
                                                                <div className="flex justify-between items-center mb-2">
                                                                    <div>
                                                                        <h3 className="font-bold text-slate-700 dark:text-slate-200 text-sm group-hover:text-blue-600 transition-colors">{distName}</h3>
                                                                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">
                                                                            {completedCount} / {totalSchools} Registered
                                                                        </p>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <span className="text-lg font-black text-slate-700 dark:text-slate-200">{percentage}%</span>
                                                                        {effectiveRole !== 'Regional Office' && effectiveRole !== 'School Division Office' && (
                                                                            <p className="text-[9px] font-bold text-slate-400">({Math.round(validatedPct)}% Validated)</p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                {/* Stacked Progress Bar */}
                                                                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden flex mb-2">
                                                                    <div
                                                                        className={`h-full ${color} transition-all duration-1000`}
                                                                        style={{ width: `${(effectiveRole === 'Regional Office' || effectiveRole === 'School Division Office') ? percentage : validatedPct}%` }}
                                                                        title={`System Validated: ${validatedCount}`}
                                                                    ></div>
                                                                    {effectiveRole !== 'Regional Office' && effectiveRole !== 'School Division Office' && (
                                                                        <div
                                                                            className={`h-full bg-slate-400 transition-all duration-1000`}
                                                                            style={{ width: `${forValidationPct}%` }}
                                                                            title={`For Validation: ${forValidationCount}`}
                                                                        ></div>
                                                                    )}
                                                                </div>
                                                                {effectiveRole !== 'Regional Office' && effectiveRole !== 'School Division Office' && (
                                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                                                                        <span className="text-emerald-500">{validatedCount} Validated</span> • <span className="text-rose-500">{forValidationCount} For Validation</span>
                                                                    </p>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )
                            }
                        </>
                    )}

                    {/* INSIGHTS TAB */}
                    {(activeTab === 'insights') && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div className="flex wrap items-center gap-4">
                                    <h2 className="text-black/60 dark:text-white/60 text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2">
                                        <TbChartBar className="text-purple-500" size={18} /> Regional Insights (PH Schools)
                                    </h2>

                                    <div className="flex items-center gap-2">
                                        {/* Back Button for Drilldown */}
                                        {(isDistrictView || coDistrict) && effectiveRole !== 'School Division Office' && (
                                            <button
                                                onClick={() => {
                                                    if (coDistrict) {
                                                        setCoDistrict('');
                                                        // Keep division if we were in district view
                                                    } else {
                                                        handleDivisionChange('');
                                                    }
                                                }}
                                                className="px-3 py-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 hover:text-purple-600 hover:border-purple-200 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all shadow-sm group"
                                            >
                                                <FiArrowLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" />
                                                {coDistrict ? 'Back to District View' : 'Back to Division View'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Expanded Metric Selectors */}
                            <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm w-full">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest hidden lg:inline">Primary Metric:</span>
                                    <select
                                        value={insightsMetric}
                                        onChange={(e) => {
                                            setInsightsMetric(e.target.value);
                                            // Reset sub-metric contextually
                                            if (e.target.value === 'class_size') setInsightsSubMetric('within');
                                            else if (e.target.value.startsWith('aral_')) setInsightsSubMetric(e.target.value.split('_')[1]);
                                            else if (e.target.value === 'shifting') setInsightsSubMetric('Double');
                                            else if (e.target.value === 'mode') setInsightsSubMetric('Distance');
                                            else if (e.target.value === 'teachers') setInsightsSubMetric('total');
                                            else if (e.target.value === 'specialization') setInsightsSubMetric('Science');
                                            else if (e.target.value === 'building_condition') setInsightsSubMetric('Good');
                                            else if (e.target.value === 'it_equipment') setInsightsSubMetric('laptop');
                                        }}
                                        className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold uppercase tracking-wide rounded-xl py-2 pl-3 pr-8 outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer shadow-sm appearance-none min-w-[200px]"
                                        style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right 0.5rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.5em 1.5em` }}
                                    >
                                        <optgroup label="Monitoring Status">
                                            <option value="registration">Registration Rate %</option>
                                            <option value="completion">Process Completion %</option>
                                        </optgroup>
                                        <optgroup label="Learner Enrollment">
                                            <option value="enrolment">Total Enrollment</option>
                                            <option value="muslim">Muslim Learners</option>
                                            <option value="ip">IP Learners</option>
                                            <option value="lwd">LWD Learners</option>
                                            <option value="sned">SNED Learners</option>
                                        </optgroup>
                                        <optgroup label="Student Status">
                                            <option value="displaced">Displaced Learners</option>
                                            <option value="overage">Overage Learners</option>
                                            <option value="dropout">Dropouts</option>
                                            <option value="repeater">Repeaters</option>
                                        </optgroup>
                                        <optgroup label="Aral (Academic Support)">
                                            <option value="aral_math">Aral Math</option>
                                            <option value="aral_science">Aral Science</option>
                                            <option value="aral_reading">Aral Reading</option>
                                        </optgroup>
                                        <optgroup label="Classes & Shifting">
                                            <option value="class_size">Class Size Status</option>
                                            <option value="shifting">Shifting Type</option>
                                            <option value="mode">Delivery Mode</option>
                                        </optgroup>
                                        <optgroup label="Personnel">
                                            <option value="teachers">Teacher Headcount</option>
                                            <option value="specialization">Specialization Mix</option>
                                        </optgroup>
                                        <optgroup label="Infrastructure">
                                            <option value="building_condition">Building Condition</option>
                                        </optgroup>
                                        <optgroup label="Resources">
                                            <option value="it_equipment">IT Equipment Count</option>
                                        </optgroup>
                                        <optgroup label="Safety & Risk">
                                            <option value="risk_index">Hazard Risk Score</option>
                                        </optgroup>
                                    </select>
                                </div>

                                {/* Contextual Sub-Metric Selector */}
                                {['class_size', 'shifting', 'mode', 'teachers', 'specialization', 'building_condition', 'it_equipment'].includes(insightsMetric) && (
                                    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest hidden lg:inline">Status/Type:</span>
                                        <select
                                            value={insightsSubMetric}
                                            onChange={(e) => setInsightsSubMetric(e.target.value)}
                                            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold uppercase tracking-wide rounded-xl py-2 pl-3 pr-8 outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer shadow-sm appearance-none"
                                            style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right 0.5rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.5em 1.5em` }}
                                        >
                                            {insightsMetric === 'class_size' && (
                                                <>
                                                    <option value="less">Less than Standard</option>
                                                    <option value="within">Within Standard</option>
                                                    <option value="above">Above Standard</option>
                                                </>
                                            )}
                                            {insightsMetric === 'shifting' && (
                                                <>
                                                    <option value="Double">Double Shift</option>
                                                    <option value="Triple">Triple Shift</option>
                                                </>
                                            )}
                                            {insightsMetric === 'mode' && (
                                                <>
                                                    <option value="Distance">Distance Learning</option>
                                                    <option value="Blended">Blended Learning</option>
                                                </>
                                            )}
                                            {insightsMetric === 'teachers' && (
                                                <>
                                                    <option value="total">All Levels</option>
                                                    <option value="kinder">Kindergarten</option>
                                                    <option value="elementary">Elementary</option>
                                                    <option value="jhs">JHS</option>
                                                    <option value="shs">SHS</option>
                                                </>
                                            )}
                                            {insightsMetric === 'specialization' && (
                                                <>
                                                    <option value="Science">Science</option>
                                                    <option value="Math">Math</option>
                                                    <option value="English">English</option>
                                                    <option value="TVL">TVL</option>
                                                </>
                                            )}
                                            {insightsMetric === 'building_condition' && (
                                                <>
                                                    <option value="Good">Good Condition</option>
                                                    <option value="Minor">Minor Repair</option>
                                                    <option value="Major">Major Repair</option>
                                                </>
                                            )}
                                            {insightsMetric === 'it_equipment' && (
                                                <>
                                                    <option value="laptop">Laptops</option>
                                                    <option value="tablet">Tablets</option>
                                                    <option value="printer">Printers</option>
                                                    <option value="ecart">E-Carts</option>
                                                </>
                                            )}
                                        </select>
                                    </div>
                                )}

                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest hidden lg:inline">Grade Level:</span>
                                    <select
                                        value={insightsGradeLevel}
                                        onChange={(e) => setInsightsGradeLevel(e.target.value)}
                                        className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold uppercase tracking-wide rounded-xl py-2 pl-3 pr-8 outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer shadow-sm appearance-none"
                                        style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right 0.5rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.5em 1.5em` }}
                                    >
                                        <option value="total">All Grades (Total)</option>
                                        <option value="kinder">Kindergarten</option>
                                        <option value="g1">Grade 1</option>
                                        <option value="g2">Grade 2</option>
                                        <option value="g3">Grade 3</option>
                                        <option value="g4">Grade 4</option>
                                        <option value="g5">Grade 5</option>
                                        <option value="g6">Grade 6</option>
                                        <option value="g7">Grade 7</option>
                                        <option value="g8">Grade 8</option>
                                        <option value="g9">Grade 9</option>
                                        <option value="g10">Grade 10</option>
                                        <option value="g11">Grade 11</option>
                                        <option value="g12">Grade 12</option>
                                    </select>
                                </div>

                                {/* Export Master Dataset Button */}
                                <div className="ml-auto flex items-center gap-2">
                                    <button
                                        onClick={handleExportMasterCSV}
                                        disabled={isGeneratingReport !== null}
                                        className="p-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 dark:text-indigo-400 rounded-lg transition-colors shadow-sm flex items-center gap-2 border border-indigo-100 dark:border-indigo-800"
                                        title="Download Complete Master Dataset (CSV)"
                                    >
                                        {isGeneratingReport === 'master_csv' ? <FiRefreshCw className="animate-spin text-indigo-500" size={14} /> : <>
                                            <TbFileDownload size={14} /> 
                                            <span className="text-[10px] uppercase font-bold tracking-widest hidden sm:inline">Export Master Dataset</span>
                                        </>}
                                    </button>
                                </div>
                            </div>

                            {/* Chart Container */}
                            <div id="insight-charts-container" key={drilldownType + (coDistrict ? '-list' : '-chart')} className={`bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-xl border border-slate-100 dark:border-slate-700 relative overflow-hidden ${isMobile ? 'h-[500px] overflow-y-auto' : ''}`}>
                                
                                {isFetchingInsights && (
                                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm animate-in fade-in duration-300">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-12 h-12 border-4 border-purple-100 dark:border-purple-900 border-t-purple-600 rounded-full animate-spin"></div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading Insights Data...</p>
                                        </div>
                                    </div>
                                )}

                                {(() => {
                                    // IF we are at the final level (District View -> Select District -> List Schools)
                                    // OR CoDistrict (SDO View)
                                    if (coDistrict) {
                                        // RENDER SCHOOL LIST WITH PERCENTAGES
                                        const schoolsData = insightsData || [];
                                        
                                        if (schoolsData.length === 0) {
                                            return (
                                                <div className="h-[400px] flex flex-col items-center justify-center text-slate-400">
                                                    <TbSchool size={48} className="opacity-20 mb-4" />
                                                    <p className="text-sm font-bold uppercase tracking-widest italic opacity-50">No schools found for this district.</p>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                                <div className="flex justify-between items-center mb-2">
                                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                        <TbSchool className="text-purple-500" size={16} /> District Schools: {coDistrict}
                                                    </h3>
                                                    <span className="text-[10px] font-bold text-slate-400">{schoolsData.length} Schools</span>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                    {schoolsData.map((school, idx) => {
                                                        const metricValue = insightsMetric === 'registration' 
                                                            ? (school.registration_rate || 0) 
                                                            : (school.avg_completion || 0);
                                                        
                                                        const isCompleted = school.completed_schools > 0;
                                                        const isRegistered = school.registered_schools > 0;

                                                        return (
                                                            <div key={school.school_id || idx} className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800 relative overflow-hidden group hover:border-purple-200 dark:hover:border-purple-900/50 transition-all shadow-sm">
                                                                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                                                    <TbSchool size={40} />
                                                                </div>
                                                                
                                                                <p className="text-[10px] font-bold text-slate-400 uppercase truncate pr-8">{school.school_name}</p>
                                                                <p className="text-[9px] font-medium text-slate-300 dark:text-slate-500 uppercase tracking-tighter mb-3">{school.school_id}</p>
                                                                
                                                                <div className="flex items-end justify-between gap-4">
                                                                    <div className="flex-1">
                                                                        <div className="flex justify-between items-center mb-1.5">
                                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                                                {insightsMetric === 'registration' ? 'Registration' : 'Completion'}
                                                                            </span>
                                                                            <span className={`text-sm font-black ${metricValue >= 100 ? 'text-emerald-500' : 'text-purple-600'}`}>
                                                                                {metricValue.toFixed(1)}%
                                                                            </span>
                                                                        </div>
                                                                        <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                                            <div 
                                                                                className={`h-full rounded-full transition-all duration-1000 ${metricValue >= 100 ? 'bg-emerald-500' : 'bg-purple-500'}`}
                                                                                style={{ width: `${Math.min(metricValue, 100)}%` }}
                                                                            ></div>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="mt-3 flex gap-2">
                                                                    <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${isRegistered ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                                                                        {isRegistered ? 'Registered' : 'Pending'}
                                                                    </div>
                                                                    <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${isCompleted ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                                                                        {isCompleted ? '100% Completed' : 'In Progress'}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    }

                                    // RENDER BAR CHART (Divisions or Districts)
                                    const isRate = ['registration', 'completion'].includes(insightsMetric);
                                    const chartData = (insightsData || []).map(d => ({
                                        name: d.label || 'Unknown',
                                        value: parseFloat(d.value || 0),
                                        fullValue: parseFloat(d.value || 0),
                                        raw: d
                                    })).sort((a, b) => b.value - a.value);

                                    if (chartData.length === 0 && !isFetchingInsights) {
                                        return (
                                            <div className="h-[400px] flex flex-col items-center justify-center text-slate-400">
                                                <TbChartBar size={48} className="opacity-20 mb-4" />
                                                <p className="text-sm font-bold uppercase tracking-widest italic opacity-50">No data available for the selected filters.</p>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="h-full min-h-[450px] flex flex-col pt-4">
                                            <div className="flex justify-between items-center mb-8">
                                                <div>
                                                    <h3 className="text-xl font-black text-slate-700 dark:text-slate-100 tracking-tight">
                                                        {insightsMetric === 'registration' ? 'Account Registration Rate' : 
                                                         insightsMetric === 'completion' ? 'Data Completion Percentage' :
                                                         insightsMetric === 'enrolment' ? 'Learner Enrollment' :
                                                         insightsMetric === 'class_size' ? `Class Size: ${insightsSubMetric.toUpperCase()} Standard` :
                                                         insightsMetric === 'shifting' ? `${insightsSubMetric} Shifting Schools` :
                                                         insightsMetric === 'mode' ? `${insightsSubMetric} Learning Schools` :
                                                         insightsMetric === 'teachers' ? `Teacher Headcount: ${insightsSubMetric.toUpperCase()}` :
                                                         insightsMetric === 'specialization' ? `Specialists: ${insightsSubMetric}` :
                                                         insightsMetric === 'building_condition' ? `Buildings in ${insightsSubMetric} Condition` :
                                                         insightsMetric === 'it_equipment' ? `IT Equipment: ${insightsSubMetric.charAt(0).toUpperCase() + insightsSubMetric.slice(1)}s` :
                                                         insightsMetric === 'risk_index' ? 'Hazard Risk Score' :
                                                         `${insightsMetric.charAt(0).toUpperCase() + insightsMetric.slice(1)} Learners`}
                                                    </h3>
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
                                                        {insightsGradeLevel === 'total' ? 'All Grade Levels' : `Grade Level: ${insightsGradeLevel.toUpperCase()}`} • Summarized by {coDistrict ? 'School' : ((coDivision || effectiveRole === 'School Division Office') ? 'District' : 'Division')}
                                                    </p>
                                                </div>
                                                <div className="hidden lg:flex items-center gap-6">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-3 h-3 rounded bg-purple-500"></div>
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Count</span>
                                                    </div>
                                                    {isRate && (
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-3 h-3 rounded bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]"></div>
                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">100% Milestone</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex-1 min-h-[500px] w-full overflow-y-auto overflow-x-hidden custom-scrollbar pr-4" style={{ maxHeight: 'calc(100vh - 400px)' }}>
                                                <div style={{ height: Math.max(500, chartData.length * 35), width: '100%' }}>
                                                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                                        <BarChart
                                                            data={chartData}
                                                            layout="vertical"
                                                            margin={{ top: 5, right: 100, left: 140, bottom: 5 }}
                                                            onClick={(data) => {
                                                                if (data && data.activePayload) {
                                                                    const selected = data.activePayload[0].payload.raw;
                                                                    if (effectiveRole !== 'School Division Office' && !coDivision) {
                                                                        handleDivisionChange(selected.label);
                                                                    } else if (!coDistrict) {
                                                                        setCoDistrict(selected.label);
                                                                    }
                                                                }
                                                            }}
                                                        >
                                                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" opacity={0.5} />
                                                            <XAxis 
                                                                type="number" 
                                                                hide={true}
                                                                domain={isRate ? [0, 100] : [0, 'auto']} 
                                                            />
                                                            <YAxis 
                                                                dataKey="name" 
                                                                type="category" 
                                                                width={130}
                                                                axisLine={false}
                                                                tickLine={false}
                                                                interval={0}
                                                                tick={({ x, y, payload }) => (
                                                                    <g transform={`translate(${x},${y})`}>
                                                                        <text 
                                                                            x={-10} 
                                                                            y={0} 
                                                                            dy={4} 
                                                                            textAnchor="end" 
                                                                            fill="#64748b" 
                                                                            className="text-[10px] font-black uppercase tracking-tight"
                                                                        >
                                                                            {payload.value.length > 20 ? payload.value.substring(0, 17) + '...' : payload.value}
                                                                        </text>
                                                                    </g>
                                                                )}
                                                            />
                                                            <Tooltip 
                                                                cursor={{ fill: 'rgba(241, 245, 249, 0.4)' }}
                                                                content={({ active, payload, label }) => {
                                                                    if (active && payload && payload.length) {
                                                                        const val = payload[0].value;
                                                                        return (
                                                                            <div className="bg-white dark:bg-slate-800 p-4 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200">
                                                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                                                                                <p className="text-xl font-black text-purple-600 dark:text-purple-400">
                                                                                    {isRate ? `${val.toFixed(1)}%` : val.toLocaleString()}
                                                                                </p>
                                                                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight mt-1">
                                                                                    {isRate ? (val >= 100 ? 'Target Met' : 'In Progress') : 'Total Accumulated'}
                                                                                </p>
                                                                                {!coDistrict && (
                                                                                    <div className="mt-3 pt-3 border-t border-slate-50 dark:border-slate-700">
                                                                                        <p className="text-[9px] font-black text-purple-500 uppercase flex items-center gap-1.5 animate-pulse">
                                                                                            <TbChartBar size={12} /> Click bar to drill down
                                                                                        </p>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    }
                                                                    return null;
                                                                }}
                                                            />
                                                            <Bar 
                                                                dataKey="value" 
                                                                radius={[0, 12, 12, 0]}
                                                                barSize={20}
                                                            >
                                                                {chartData.map((entry, index) => (
                                                                    <Cell 
                                                                        key={`cell-${index}`} 
                                                                        fill={isRate && entry.value >= 100 ? '#10b981' : '#8b5cf6'} 
                                                                        className="transition-all duration-500 hover:opacity-80 cursor-pointer"
                                                                    />
                                                                ))}
                                                                <LabelList 
                                                                    dataKey="value" 
                                                                    position="right" 
                                                                    offset={15}
                                                                    content={(props) => {
                                                                        const { x, y, width, height, value } = props;
                                                                        return (
                                                                            <text 
                                                                                x={x + width + 10} 
                                                                                y={y + height / 2} 
                                                                                fill="#64748b" 
                                                                                fontSize={11} 
                                                                                fontWeight="900" 
                                                                                textAnchor="start" 
                                                                                dominantBaseline="middle"
                                                                            >
                                                                                {isRate ? `${value.toFixed(1)}%` : value.toLocaleString()}
                                                                            </text>
                                                                        );
                                                                    }}
                                                                />
                                                            </Bar>
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    )}


                    {/* SCHOOL TAB */}
                    {
                        activeTab === 'school' && (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Form Submissions</h2>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => navigate('/dummy-forms', { state: { type: 'school' } })}
                                            className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest bg-amber-50 dark:bg-amber-900/30 px-3 py-1.5 rounded-lg border border-amber-100 hover:bg-amber-100 transition-colors"
                                        >
                                            View Sample Forms
                                        </button>
                                        <button
                                            onClick={() => {
                                                const params = new URLSearchParams();
                                                if (coRegion) params.append('region', coRegion);
                                                if (coDivision) params.append('division', coDivision);
                                                navigate(`/jurisdiction-schools?${params.toString()}`);
                                            }}
                                            className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-lg border border-blue-50 hover:bg-blue-100 transition-colors"
                                        >
                                            View All Schools
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Use jurisdictionTotal for ALL cards */}
                                    <StatCard title="Profiles" value={stats?.profile || 0} total={jurisdictionTotal} color="bg-blue-500" icon={FiFileText} />
                                    <StatCard title="School Head" value={stats?.head || 0} total={jurisdictionTotal} color="bg-indigo-500" icon={FiCheckCircle} />
                                    <StatCard title="Enrollment" value={stats?.enrollment || 0} total={jurisdictionTotal} color="bg-emerald-500" icon={FiTrendingUp} />
                                    <StatCard title="Classes" value={stats?.organizedclasses || 0} total={jurisdictionTotal} color="bg-cyan-500" icon={FiCheckCircle} />
                                    <StatCard title="Modalities" value={stats?.shifting || 0} total={jurisdictionTotal} color="bg-purple-500" icon={FiMapPin} />
                                    <StatCard title="Personnel" value={stats?.personnel || 0} total={jurisdictionTotal} color="bg-orange-500" icon={FiFileText} />
                                    <StatCard title="Specialization" value={stats?.specialization || 0} total={jurisdictionTotal} color="bg-pink-500" icon={FiTrendingUp} />
                                    <StatCard title="Resources" value={stats?.resources || 0} total={jurisdictionTotal} color="bg-amber-500" icon={FiClock} />
                                </div>
                            </div>
                        )
                    }

                    {/* ENGINEER TAB */}
                    {
                        activeTab === 'engineer' && (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Infrastructure Summary</h2>
                                    <button
                                        onClick={() => navigate('/dummy-forms', { state: { type: 'engineer' } })}
                                        className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest bg-amber-50 dark:bg-amber-900/30 px-3 py-1.5 rounded-lg border border-amber-100 hover:bg-amber-100 transition-colors"
                                    >
                                        View Sample Forms
                                    </button>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-lg border border-slate-100 dark:border-slate-700">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="text-center">
                                            <p className="text-4xl font-black text-[#004A99] dark:text-blue-400">{engStats?.total_projects || 0}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total Projects</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-4xl font-black text-emerald-600 dark:text-emerald-400">{engStats?.completed_count || 0}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Completed</p>
                                        </div>
                                        <div className="text-center col-span-2 pt-4 border-t border-slate-50 dark:border-slate-700">
                                            <p className="text-4xl font-black text-amber-500 dark:text-amber-400">{engStats?.avg_progress || 0}%</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Avg. Physical Accomplishment</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] px-1">Validated Project List</h2>
                                    {jurisdictionProjects.length === 0 ? (
                                        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700 text-center text-slate-400">
                                            No projects found in this jurisdiction.
                                        </div>
                                    ) : (
                                        <div className="space-y-3 pb-6">
                                            {jurisdictionProjects.map((project) => (
                                                <div
                                                    key={project.id}
                                                    onClick={() => navigate(`/project-details/${project.id}`)}
                                                    className="bg-white dark:bg-slate-800 p-5 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 active:scale-[0.98] transition-all cursor-pointer group"
                                                >
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="flex-1">
                                                            <h3 className="font-bold text-slate-800 dark:text-slate-100 leading-tight group-hover:text-blue-600 transition-colors">{project.projectName}</h3>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 flex items-center gap-1">
                                                                <FiMapPin size={10} /> {project.schoolName}
                                                            </p>
                                                        </div>
                                                        <div className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider ${project.validation_status === 'Validated' ? 'bg-emerald-50 text-emerald-600' :
                                                            project.validation_status === 'Rejected' ? 'bg-red-50 text-red-600' :
                                                                'bg-orange-50 text-orange-600'
                                                            }`}>
                                                            {project.validation_status || 'Pending'}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-blue-500 rounded-full"
                                                                style={{ width: `${project.accomplishmentPercentage}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="text-xs font-black text-slate-700 dark:text-slate-300">{project.accomplishmentPercentage}%</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    }

                    {/* VALIDATION TAB (For SDO) */}
                    {
                        activeTab === 'validation' && effectiveRole !== 'Regional Office' && effectiveRole !== 'School Division Office' && (
                            <div className="space-y-6">
                                <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Data Validation</h2>

                                {/* School Validation Section */}
                                <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-lg border border-slate-100 dark:border-slate-700">
                                    <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 mb-2">School Data Validation</h3>
                                    <p className="text-sm text-slate-500 mb-4">Validate school profiles and submitted forms.</p>
                                    <button
                                        onClick={() => navigate('/jurisdiction-schools')}
                                        className="w-full py-3 bg-blue-50 text-blue-600 rounded-xl font-bold uppercase tracking-wider text-xs hover:bg-blue-100 transition-colors"
                                    >
                                        View Schools to Validate
                                    </button>
                                </div>

                                {/* Infrastructure Validation Section */}
                                <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-lg border border-slate-100 dark:border-slate-700">
                                    <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 mb-2">Infrastructure Validation</h3>
                                    <p className="text-sm text-slate-500 mb-4">Review and validate ongoing infrastructure projects.</p>

                                    {jurisdictionProjects.filter(p => p.validation_status !== 'Validated').length === 0 ? (
                                        <p className="text-center text-slate-400 text-sm py-4">No pending project validations.</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {jurisdictionProjects
                                                .filter(p => p.validation_status !== 'Validated') // Show pending/rejected
                                                .map((project) => (
                                                    <div
                                                        key={project.id}
                                                        onClick={() => navigate(`/project-validation?schoolId=${project.schoolId}`)}
                                                        className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex justify-between items-center group"
                                                    >
                                                        <div>
                                                            <h4 className="font-bold text-slate-700 dark:text-slate-200 text-sm group-hover:text-blue-600">{project.projectName}</h4>
                                                            <p className="text-[10px] text-slate-400 uppercase mt-0.5">{project.schoolName}</p>
                                                        </div>
                                                        <div className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-[10px] font-bold uppercase">
                                                            {project.validation_status || 'Pending'}
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    }
                </div >

                <BottomNav userRole={userData?.role} />
            </div >
            {/* INSIGHTS SCHOOL LIST MODAL */}
            {activeTab === 'insights' && isDistrictView && coDistrict && (() => {
                const getSchoolMetric = (s) => {
                    if (insightsMetric === 'enrolment') {
                        const key = insightsSubMetric === 'total' ? 'total_enrollment' : insightsSubMetric;
                        const val = parseInt(s[key]);
                        return isNaN(val) ? null : val;
                    }
                    if (insightsMetric === 'organized_classes') {
                        const val = parseInt(s[insightsClassesGrade]);
                        return isNaN(val) ? null : val;
                    }
                    if (insightsMetric === 'aral') {
                        const val = parseInt(s[`aral_${insightsAralSubject}_${insightsAralGrade}`]);
                        return isNaN(val) ? null : val;
                    }
                    if (insightsMetric === 'class_size') {
                        const grade = insightsClassSizeGrade === 'k' || insightsClassSizeGrade === 'kinder' ? 'kinder' : insightsClassSizeGrade.replace('g', '');
                        const val = parseInt(s[`${insightsClassSizeCategory === 'less' ? 'less' : 'more'}_${grade}`]);
                        return (!isNaN(val) && val > 0) ? val : null;
                    }
                    if (insightsMetric === 'shifting') {
                        const grade = insightsShiftingGrade === 'k' ? 'kinder' : insightsShiftingGrade.replace('g', '');
                        const val = s[`shift_${grade}`];
                        if (!val) return null;
                        const v = String(val).toLowerCase();
                        if (insightsShiftingCategory === 'single' && v.includes('single')) return val;
                        if (insightsShiftingCategory === 'double' && v.includes('double')) return val;
                        if (insightsShiftingCategory === 'triple' && (v.includes('triple') || v.includes('multiple'))) return val;
                        return null;
                    }
                    if (insightsMetric === 'delivery') {
                        const grade = insightsDeliveryGrade === 'k' ? 'kinder' : insightsDeliveryGrade.replace('g', '');
                        const val = s[`mode_${grade}`];
                        if (!val) return null;
                        const v = String(val).toLowerCase();
                        if (insightsDeliveryCategory === 'inperson' && v.includes('in-person')) return val;
                        if (insightsDeliveryCategory === 'blended' && v.includes('blended')) return val;
                        if (insightsDeliveryCategory === 'distance' && v.includes('distance')) return val;
                        return null;
                    }
                    if (insightsMetric === 'demographic') {
                        let grade = insightsDemographicGrade === 'k' ? 'kinder' : insightsDemographicGrade.replace('g', '');
                        const val = parseInt(s[`stat_${insightsDemographicCategory}_${grade}`]);
                        return (!isNaN(val) && val > 0) ? val : null;
                    }
                    if (insightsMetric === 'experience') {
                        const val = parseInt(s[`teach_exp_${insightsExperienceCategory}`]);
                        return (!isNaN(val) && val > 0) ? val : null;
                    }
                    if (insightsMetric === 'specialization') {
                        const val = parseInt(s[`spec_${insightsSpecializationSubject}_major`]);
                        return (!isNaN(val) && val > 0) ? val : null;
                    }
                    if (insightsMetric === 'classrooms') {
                        const key = `build_classrooms_${insightsClassroomCondition === 'demolish' ? 'demolition' : insightsClassroomCondition}`;
                        const val = parseInt(s[key]);
                        return (!isNaN(val) && val > 0) ? val : null;
                    }
                    if (insightsMetric === 'inventory') {
                        let val;
                        if (insightsInventoryItem === 'seats') val = parseInt(s[`seats_${insightsSeatsGrade}`]);
                        else if (insightsInventoryItem === 'toilets') val = parseInt(s[`res_toilets_${insightsToiletType}`]);
                        else val = parseInt(s[`res_${insightsInventoryItem}_${insightsInventoryItem === 'ecart' ? 'func' : insightsInventoryItem === 'laptop' ? 'func' : insightsInventoryItem === 'printer' ? 'func' : 'func'}`]);
                        return (!isNaN(val) && val > 0) ? val : null;
                    }
                    if (insightsMetric === 'rooms') {
                        const val = parseInt(s[`res_${insightsRoomType === 'sci' ? 'sci_labs' : insightsRoomType === 'com' ? 'com_labs' : 'tvl_workshops'}`]);
                        return (!isNaN(val) && val > 0) ? val : null;
                    }
                    if (insightsMetric === 'teachers') {
                        if (insightsTeacherGrade === 'total') {
                            let sum = 0;
                            ['k', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g9', 'g10', 'g11', 'g12'].forEach(g => {
                                sum += parseInt(s[`teach_${g}`]) || 0;
                            });
                            return sum > 0 ? sum : null;
                        }
                        const val = parseInt(s[`teach_${insightsTeacherGrade}`]);
                        return isNaN(val) ? null : val;
                    }
                    if (insightsMetric === 'multigrade') {
                        const val = parseInt(s[`teach_multi_${insightsMultigradeCategory}`]);
                        return isNaN(val) ? null : val;
                    }
                    if (insightsMetric === 'adm') {
                        let hasIt = false;
                        if (insightsAdmType === 'mdl') hasIt = s.adm_mdl;
                        else if (insightsAdmType === 'odl') hasIt = s.adm_odl;
                        else if (insightsAdmType === 'tvi') hasIt = s.adm_tvi;
                        else if (insightsAdmType === 'blended') hasIt = s.adm_blended;
                        if (hasIt) {
                            if (insightsAdmType === 'mdl') return 'MDL';
                            if (insightsAdmType === 'odl') return 'ODL';
                            if (insightsAdmType === 'tvi') return 'TVI/RBI';
                            if (insightsAdmType === 'blended') return 'Blended';
                        }
                        return null;
                    }
                    if (insightsMetric === 'site') {
                        let hasIt = false;
                        let valStr = '';
                        if (insightsSiteCategory === 'elec') {
                            const v = s.res_electricity_source || '';
                            if (insightsSiteSubOption === 'grid') hasIt = v === 'GRID SUPPLY';
                            else if (insightsSiteSubOption === 'offgrid') hasIt = v.includes('OFF-GRID');
                            else hasIt = v === 'NO ELECTRICITY';
                            if (hasIt) valStr = v;
                        } else if (insightsSiteCategory === 'water') {
                            const v = s.res_water_source || '';
                            if (insightsSiteSubOption === 'piped') hasIt = v.includes('Piped');
                            else if (insightsSiteSubOption === 'natural') hasIt = v === 'Natural Resources';
                            else hasIt = v === 'No Water Source';
                            if (hasIt) valStr = v;
                        } else if (insightsSiteCategory === 'build') {
                            const v = s.res_buildable_space || '';
                            if (insightsSiteSubOption === 'yes') hasIt = v === 'Yes';
                            else hasIt = v === 'No';
                            if (hasIt) valStr = v;
                        } else if (insightsSiteCategory === 'sha') {
                            const v = s.sha_category || '';
                            if (insightsSiteSubOption === 'hardship') hasIt = v.includes('HARDSHIP');
                            else hasIt = v.includes('MULTIGRADE');
                            if (hasIt) valStr = v;
                        }
                        return hasIt ? valStr : null;
                    }
                    return null;
                };

                const filtered = districtSchools.filter(s => {
                    const matchesSearch = s.school_name?.toLowerCase().includes(schoolSearch.toLowerCase()) || s.school_id?.includes(schoolSearch);

                    const id = String(s.school_id || '');
                    const isES = id.startsWith('1') || id.startsWith('5');
                    const isHS = id.startsWith('3') || id.startsWith('5');

                    let belongsToCategory = true;

                    const checkGrade = (grade) => {
                        if (!grade) return true;
                        grade = grade.toLowerCase();
                        if (['kinder', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'es'].includes(grade)) return isES;
                        if (['g7', 'g8', 'g9', 'g10', 'g11', 'g12', 'jhs', 'shs'].includes(grade)) return isHS;
                        return true;
                    };

                    if (insightsMetric === 'enrolment') {
                        belongsToCategory = checkGrade(insightsSubMetric);
                    } else if (insightsMetric === 'organized_classes') {
                        belongsToCategory = checkGrade(insightsClassesGrade);
                    } else if (insightsMetric === 'aral') {
                        belongsToCategory = checkGrade(insightsAralGrade);
                    } else if (insightsMetric === 'class_size') {
                        belongsToCategory = checkGrade(insightsClassSizeGrade);
                    } else if (insightsMetric === 'shifting') {
                        belongsToCategory = checkGrade(insightsShiftingGrade);
                    } else if (insightsMetric === 'delivery') {
                        belongsToCategory = checkGrade(insightsDeliveryGrade);
                    } else if (insightsMetric === 'demographic') {
                        belongsToCategory = checkGrade(insightsDemographicGrade);
                    } else if (insightsMetric === 'inventory' && insightsInventoryItem === 'seats') {
                        belongsToCategory = checkGrade(insightsSeatsGrade);
                    } else if (insightsMetric === 'teachers' && insightsTeacherGrade !== 'total') {
                        belongsToCategory = checkGrade(insightsTeacherGrade);
                    } else if (insightsMetric === 'multigrade') {
                        belongsToCategory = isES;
                    }

                    const statValue = getSchoolMetric(s);

                    // To match the graph's aggregation, exclude schools with a value of 0 or null for the selected metric
                    // so that the total school count in the modal aligns perfectly with the graph's data method.
                    if (statValue === null || statValue === 0) {
                        return false;
                    }

                    return matchesSearch && belongsToCategory;
                });

                const sorted = [...filtered].sort((a, b) => {
                    const vA = getSchoolMetric(a);
                    const vB = getSchoolMetric(b);
                    if (vA === null && vB === null) return 0;
                    if (vA === null) return 1;
                    if (vB === null) return -1;
                    if (typeof vA === 'string' && typeof vB === 'string') return vA.localeCompare(vB);
                    return vB - vA;
                });

                const ITEMS_PER_PAGE = 10;
                const totalP = Math.ceil(sorted.length / ITEMS_PER_PAGE);
                const startIdx = (schoolPage - 1) * ITEMS_PER_PAGE;
                const paginated = sorted.slice(startIdx, startIdx + ITEMS_PER_PAGE);

                return (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[1100] p-4">
                        <div className="bg-white dark:bg-slate-800 w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                <div>
                                    <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-wider">{coDistrict}</h3>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">
                                        School List • {filtered.length} Schools
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        setCoDistrict('');
                                        // Trigger fetchData to refresh district-level stats for the chart if needed
                                        fetchData(undefined, undefined, '');
                                    }}
                                    className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors"
                                >
                                    <FiX />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                                <div className="relative mb-6">
                                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search school name or ID..."
                                        value={schoolSearch}
                                        onChange={(e) => {
                                            setSchoolSearch(e.target.value);
                                            setSchoolPage(1);
                                        }}
                                        className="w-full bg-slate-100 dark:bg-slate-700 border-none rounded-xl py-3 pl-10 pr-4 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                    />
                                </div>
                                <div className="space-y-3">
                                    {paginated.map(s => {
                                        const val = getSchoolMetric(s);
                                        return (
                                            <div key={s.school_id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex justify-between items-center group">
                                                <div className="flex-1 min-w-0 pr-4">
                                                    <h4 className="font-bold text-slate-700 dark:text-slate-200 text-sm truncate">{s.school_name}</h4>
                                                    <p className="text-[10px] text-slate-400">ID: {s.school_id}</p>
                                                </div>
                                                {val !== null && (
                                                    <div className="text-right shrink-0">
                                                        <span className="text-lg font-black text-purple-600 dark:text-purple-400">
                                                            {typeof val === 'string' ? val : val.toLocaleString()}
                                                        </span>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                            {insightsMetric === 'enrolment' || insightsMetric === 'demographic' ? 'Learners' : insightsMetric === 'teachers' || insightsMetric === 'experience' || insightsMetric === 'specialization' || insightsMetric === 'multigrade' ? 'Teachers' : insightsMetric === 'classrooms' || insightsMetric === 'organized_classes' || insightsMetric === 'class_size' ? 'Classes' : insightsMetric === 'shifting' ? 'Shifting' : insightsMetric === 'delivery' ? 'Delivery Mode' : insightsMetric === 'adm' ? 'Emergency ADM' : insightsMetric === 'site' ? 'Facility Status' : 'Units'}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {paginated.length === 0 && (
                                        <div className="text-center py-10 text-slate-400 italic">No schools found.</div>
                                    )}

                                    {totalP > 1 && (
                                        <div className="flex justify-center items-center gap-3 mt-6 pt-6 border-t border-slate-100 dark:border-slate-700">
                                            <button onClick={() => setSchoolPage(prev => Math.max(prev - 1, 1))} disabled={schoolPage === 1} className="px-4 py-2 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 disabled:opacity-30 transition-all">Prev</button>
                                            <div className="bg-slate-100 dark:bg-slate-700 px-4 py-2 rounded-lg text-xs font-black text-slate-600 dark:text-slate-300">{schoolPage} / {totalP}</div>
                                            <button onClick={() => setSchoolPage(prev => Math.min(prev + 1, totalP))} disabled={schoolPage === totalP} className="px-4 py-2 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 disabled:opacity-30 transition-all">Next</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* PROJECT LIST MODAL */}
            {projectListModal.isOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[1100] p-4">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-2xl max-h-[80vh] flex flex-col rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black text-slate-800 dark:text-white">{projectListModal.title}</h3>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">
                                    {projectListModal.projects.length} Projects Found
                                </p>
                            </div>
                            <button
                                onClick={() => setProjectListModal(prev => ({ ...prev, isOpen: false }))}
                                className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors"
                            >
                                <FiX />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                            {projectListModal.isLoading ? (
                                <div className="flex justify-center py-10">
                                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {projectListModal.projects.map((p) => (
                                        <div key={p.id} className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700 flex justify-between items-center group hover:border-blue-200 transition-colors">
                                            <div>
                                                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm group-hover:text-blue-600 transition-colors">{p.schoolName}</h4>
                                                <p className="text-xs text-slate-500 italic">{p.projectName}</p>
                                                {p.projectAllocation && (
                                                    <p className="text-[10px] font-mono text-slate-400 mt-1">
                                                        Alloc: ₱{Number(p.projectAllocation).toLocaleString()}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase mb-1 ${p.status === 'Completed' ? 'bg-emerald-100 text-emerald-600' :
                                                    p.status === 'Delayed' ? 'bg-rose-100 text-rose-600' :
                                                        'bg-blue-100 text-blue-600'
                                                    }`}>
                                                    {p.status}
                                                </span>
                                                <div className="text-xs font-black text-slate-700 dark:text-slate-300">
                                                    {p.accomplishmentPercentage}%
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {projectListModal.projects.length === 0 && (
                                        <p className="text-center text-slate-400 italic py-10">No projects found for this category.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {/* ISSUES MODAL */}
            {createPortal(
                <AnimatePresence>
                    {isIssuesModalOpen && selectedSchoolForIssues && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 overflow-y-auto p-4"
                        >
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.95, opacity: 0 }}
                                className="relative bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                            >
                                {/* Header */}
                                <div className="flex justify-between items-start mb-4 border-b border-slate-100 dark:border-slate-700 pb-4">
                                    <div>
                                        <h3 className="text-xl font-black text-slate-800 dark:text-white leading-tight pr-4">
                                            {selectedSchoolForIssues.school_name}
                                        </h3>
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
                                            School ID: {selectedSchoolForIssues.school_id}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setIsIssuesModalOpen(false);
                                            setSelectedSchoolForIssues(null);
                                        }}
                                        className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center hover:bg-rose-100 hover:text-rose-500 transition-colors shrink-0"
                                    >
                                        <FiX />
                                    </button>
                                </div>

                                {/* Body */}
                                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                                    {selectedSchoolForIssues.data_quality_issues.split(';').filter(i => i.trim() !== '').map((issue, index) => (
                                        <div key={index} className="flex items-start gap-3 bg-red-50 dark:bg-red-900/10 p-4 rounded-xl border border-red-100 dark:border-red-900/30">
                                            <FiAlertCircle className="text-red-500 shrink-0 mt-0.5" size={16} />
                                            <p className="text-sm font-semibold text-red-700 dark:text-red-300 leading-relaxed">
                                                {issue.trim()}
                                            </p>
                                        </div>
                                    ))}
                                </div>

                                {/* Footer */}
                                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-end">
                                    <button
                                        onClick={() => {
                                            setIsIssuesModalOpen(false);
                                            setSelectedSchoolForIssues(null);
                                        }}
                                        className="px-5 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                                    >
                                        Close
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </PageTransition >
    );
};

export default MonitoringDashboard;
