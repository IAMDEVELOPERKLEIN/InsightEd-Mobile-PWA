import React from 'react';
import { FiTool, FiShield, FiSmartphone, FiArrowRight, FiArrowLeft, FiInfo, FiActivity, FiRefreshCw, FiDatabase, FiLock, FiCheckCircle } from 'react-icons/fi';
import PageTransition from '../components/PageTransition';

const DivisionEngineerQuickStart = () => {
    return (
        <PageTransition>
            <div className="min-h-screen bg-slate-50 text-slate-900 scroll-smooth pb-32 font-sans">
                {/* Top Navigation */}
                <nav className="sticky top-0 z-50 bg-[#0A192F] text-white border-b border-slate-800 backdrop-blur-md bg-opacity-95">
                    <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-black text-white italic text-xs tracking-tighter shadow-lg shadow-blue-500/20">IE</div>
                            <span className="font-bold tracking-tight text-sm uppercase italic">InsightED <span className="text-blue-400 font-normal not-italic">SOP MASTER GUIDE</span></span>
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4 py-1.5 bg-white/5 rounded-full border border-white/10 italic">Official Pilot Phase II</div>
                    </div>
                </nav>

                <div className="max-w-4xl mx-auto px-6 py-12">
                    <main className="w-full">
                        
                        {/* Global Header */}
                        <header className="mb-20 text-center">
                            <div className="inline-block px-4 py-1.5 bg-[#0A192F] text-white text-[10px] font-black rounded-full uppercase tracking-[0.2em] mb-6 shadow-xl shadow-blue-900/10 border border-blue-500/20">Official Pilot Phase II</div>
                            <h1 className="text-4xl md:text-5xl font-black text-[#0A192F] mb-6 tracking-tight leading-tight italic uppercase">Complete Operational Guide <br/> <span className="text-blue-600 normal-case not-italic underline decoration-blue-100 decoration-8 underline-offset-[-2px]">for Division Engineers</span></h1>
                            <p className="text-lg text-slate-600 leading-relaxed mx-auto underline decoration-blue-500 decoration-4 underline-offset-8 font-medium max-w-2xl italic tracking-tight">
                                Achieving 100% Infrastructure Data Health compliance within the Stride Ecosystem
                            </p>
                        </header>

                        {/* Module 1: Installation */}
                        <section className="mb-32 group">
                            <div className="flex items-center mb-10">
                                <span className="w-10 h-10 bg-[#0A192F] text-white rounded-2xl flex items-center justify-center font-black text-lg mr-4 shadow-xl shadow-blue-900/10 group-hover:scale-110 transition-transform italic">1</span>
                                <h2 className="text-3xl font-black text-[#0A192F] uppercase tracking-tight flex items-center gap-3 italic">
                                    <FiSmartphone className="text-blue-500" />
                                    App Installation (PWA)
                                </h2>
                            </div>
                            <div className="space-y-8 text-slate-700 leading-relaxed bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                                <p className="text-lg font-medium italic">InsightEd is a <span className="text-blue-600 font-black italic underline decoration-blue-200 decoration-4 underline-offset-4">Progressive Web App (PWA)</span>. It operates directly from your mobile browser for maximum performance and offline-readiness during on-site inspections.</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div className="flex items-start gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-blue-200 transition-all">
                                            <div className="w-8 h-8 bg-white rounded-xl shadow-sm flex items-center justify-center shrink-0 text-blue-600 font-black italic">1.1</div>
                                            <p className="text-sm font-bold italic">Open <span className="text-navy-950 underline underline-offset-2 decoration-2 decoration-slate-200">Chrome (Android)</span> or <span className="text-navy-950 underline underline-offset-2 decoration-2 decoration-slate-200">Safari (iOS)</span>.</p>
                                        </div>
                                        <div className="flex items-start gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-blue-200 transition-all">
                                            <div className="w-8 h-8 bg-white rounded-xl shadow-sm flex items-center justify-center shrink-0 text-blue-600 font-black italic">1.2</div>
                                            <p className="text-sm font-bold italic whitespace-nowrap">Navigate to: <code className="bg-blue-600 text-white px-3 py-1 rounded-lg font-mono text-xs select-all shadow-md italic">tinyurl.com/InsightEdV2</code></p>
                                        </div>
                                        <div className="flex items-start gap-4 p-5 bg-red-50 rounded-2xl border-l-4 border-red-500 shadow-xl shadow-red-900/5">
                                            <div className="w-8 h-8 bg-white rounded-xl shadow-sm flex items-center justify-center shrink-0 text-red-600 font-black italic">1.3</div>
                                            <p className="text-sm font-black italic text-red-950 leading-snug uppercase tracking-tighter">Protocol: Avoid logging out during field work to prevent volatile cache deletion.</p>
                                        </div>
                                    </div>
                                    <div className="bg-[#0A192F] aspect-video rounded-3xl flex flex-col items-center justify-center gap-4 text-white p-8 shadow-2xl relative overflow-hidden group/gif transition-all hover:bg-navy-900 border-4 border-blue-500/20">
                                        <div className="absolute inset-0 bg-blue-500/5 transition-opacity opacity-0 group-hover/gif:opacity-100"></div>
                                        <div className="relative z-10 text-center">
                                            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/10">
                                                <FiInfo className="text-blue-400 rotate-12" size={24} />
                                            </div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-400 mb-2 italic">Visual Guide</p>
                                            <h4 className="text-sm font-bold font-mono text-white/90">pwa_installation_flow.gif</h4>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Module 2: Nexus Navigation */}
                        <section className="mb-32 group">
                            <div className="flex items-center mb-10">
                                <span className="w-10 h-10 bg-[#0A192F] text-white rounded-2xl flex items-center justify-center font-black text-lg mr-4 shadow-xl shadow-blue-900/10 group-hover:scale-110 transition-transform italic">2</span>
                                <h2 className="text-3xl font-black text-[#0A192F] uppercase tracking-tight flex items-center gap-3 italic">
                                    <FiDatabase className="text-indigo-500" />
                                    Navigating the Nexus Dashboard
                                </h2>
                            </div>
                            <div className="space-y-8 text-slate-700 leading-relaxed bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                                <p className="text-lg font-medium italic">Select the specialized infrastructure entry point to access the <span className="text-indigo-600 font-black italic underline decoration-indigo-200 decoration-4 underline-offset-4">Engineering Data Layer</span> within the Stride Ecosystem.</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
                                        <div className="p-4 bg-white rounded-2xl border border-slate-200 group hover:border-blue-500 transition-colors shadow-sm">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 italic">Step Alpha</span>
                                            <p className="text-sm font-bold italic">Select the <span className="bg-slate-900 text-white px-2 py-0.5 rounded italic">"InsightED (For Infrastructure)"</span> path.</p>
                                        </div>
                                        <div className="p-4 bg-white rounded-2xl border border-slate-200 group hover:border-blue-500 transition-colors shadow-sm">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 italic">Step Beta</span>
                                            <p className="text-sm font-bold italic">Locate and select the <span className="text-blue-600 underline underline-offset-2 decoration-2 decoration-blue-100 font-black">"Engineers Portal"</span>.</p>
                                        </div>
                                    </div>
                                    <div className="bg-[#0A192F] aspect-video rounded-3xl flex flex-col items-center justify-center gap-4 text-white p-8 shadow-2xl relative overflow-hidden group/gif transition-all hover:bg-navy-900 border-4 border-indigo-500/20">
                                        <div className="relative z-10 text-center">
                                            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/10">
                                                <FiInfo className="text-indigo-400 rotate-12" size={24} />
                                            </div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-400 mb-2 italic">Visual Guide</p>
                                            <h4 className="text-sm font-bold font-mono text-white/90 italic">nexus_portal_selection.gif</h4>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Module 3: Registration */}
                        <section className="mb-32 group">
                            <div className="flex items-center mb-10">
                                <span className="w-10 h-10 bg-[#0A192F] text-white rounded-2xl flex items-center justify-center font-black text-lg mr-4 shadow-xl shadow-blue-900/10 group-hover:scale-110 transition-transform italic">3</span>
                                <h2 className="text-3xl font-black text-[#0A192F] uppercase tracking-tight flex items-center gap-3 italic">
                                    <FiShield className="text-emerald-500" />
                                    Registration & Identity
                                </h2>
                            </div>
                            <div className="space-y-8 text-slate-700 leading-relaxed bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                                <p className="text-lg font-medium italic">Select <strong className="text-emerald-600 underline underline-offset-4 decoration-emerald-200 decoration-4 uppercase tracking-widest italic">Division Engineer</strong> role. Mandatory fields must align with official HR records for PILOT validation.</p>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <div className="p-8 bg-navy-950 text-white rounded-[2.5rem] border-l-[12px] border-emerald-500/50 shadow-2xl relative overflow-hidden group">
                                            <div className="relative z-10">
                                                <h4 className="text-[10px] uppercase font-black text-emerald-400 mb-3 tracking-[0.4em] italic underline decoration-emerald-500/20 underline-offset-4">3.2 Secure Authorization Key</h4>
                                                <p className="text-xl font-black mb-3 uppercase tracking-widest italic"><code className="bg-blue-600 px-4 py-1 rounded-xl shadow-lg border border-blue-400/20">E5T8-B2W3</code></p>
                                                <p className="text-[10px] font-black italic opacity-70 uppercase tracking-widest text-emerald-100">Mandatory for Division-level authentication.</p>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="flex items-start gap-4 p-5 bg-slate-50 rounded-2xl group hover:border-emerald-200 border border-transparent transition-all">
                                                <FiCheckCircle className="text-emerald-500 shrink-0 mt-1" />
                                                <p className="text-sm font-bold italic text-slate-600 leading-tight">Enter prefix only. System mandates <strong className="text-navy-950 underline decoration-emerald-200">@deped.gov.ph</strong> domain.</p>
                                            </div>
                                            <div className="flex items-start gap-4 p-5 bg-slate-50 rounded-2xl group hover:border-emerald-200 border border-transparent transition-all">
                                                <FiCheckCircle className="text-emerald-500 shrink-0 mt-1" />
                                                <p className="text-sm font-bold italic text-slate-600 leading-tight">Identify correct <strong className="text-navy-950">Region & Division</strong> hierarchy nodes.</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-[#0A192F] rounded-[2.5rem] flex flex-col items-center justify-center gap-4 text-white p-8 shadow-2xl relative overflow-hidden group/gif transition-all hover:bg-navy-900 border-4 border-emerald-500/20">
                                        <div className="relative z-10 text-center">
                                            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/10">
                                                <FiInfo className="text-emerald-400 rotate-12" size={24} />
                                            </div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-400 mb-2 italic">Visual Guide Missing</p>
                                            <h4 className="text-sm font-bold font-mono text-white/90 italic">engineer_identity_flow</h4>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Module 4: Sign-In */}
                        <section className="mb-32 group">
                            <div className="flex items-center mb-10">
                                <span className="w-10 h-10 bg-[#0A192F] text-white rounded-2xl flex items-center justify-center font-black text-lg mr-4 shadow-xl shadow-blue-900/10 group-hover:scale-110 transition-transform italic">4</span>
                                <h2 className="text-3xl font-black text-[#0A192F] uppercase tracking-tight flex items-center gap-3 italic">
                                    <FiLock className="text-amber-500" />
                                    Administrative Sign-In
                                </h2>
                            </div>
                            <div className="space-y-8 text-slate-700 leading-relaxed bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                                    <div className="bg-[#0A192F] aspect-video rounded-3xl flex flex-col items-center justify-center gap-4 text-white p-8 shadow-2xl relative overflow-hidden group/gif transition-all hover:bg-navy-900 border-4 border-amber-500/20">
                                        <div className="relative z-10 text-center">
                                            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-400 mb-2 italic">Visual Guide Missing</p>
                                            <h4 className="text-sm font-bold font-mono text-white/90 italic">login_permissions_flow</h4>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="p-6 bg-[#0A192F] text-white rounded-[2rem] border-l-4 border-amber-500 shadow-xl group">
                                            <h4 className="text-[10px] uppercase font-black text-amber-400 mb-3 tracking-[0.4em] italic underline decoration-amber-500/20 underline-offset-4">Protocol Requirement</h4>
                                            <p className="text-sm italic opacity-90 leading-relaxed mb-4 font-bold">You MUST tap **[ALLOW]** for all device permissions to ensure 100% data health compliance:</p>
                                            <ul className="text-[9px] font-black uppercase tracking-[0.2em] space-y-2 text-amber-200 italic">
                                                <li className="flex items-center gap-2"><div className="w-1 h-1 bg-amber-400 rounded-full"></div> CAMERA (Photographic Evidence)</li>
                                                <li className="flex items-center gap-2"><div className="w-1 h-1 bg-amber-400 rounded-full"></div> LOCATION (Geotagged Verification)</li>
                                                <li className="flex items-center gap-2"><div className="w-1 h-1 bg-amber-400 rounded-full"></div> STORAGE (Offline Data Caching)</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Module 5: Nexus Dashboard Monitoring */}
                        <section className="mb-32 group">
                            <div className="flex items-center mb-10">
                                <span className="w-10 h-10 bg-[#0A192F] text-white rounded-2xl flex items-center justify-center font-black text-lg mr-4 shadow-xl shadow-blue-900/10 group-hover:scale-110 transition-transform italic">5</span>
                                <h2 className="text-3xl font-black text-[#0A192F] uppercase tracking-tight flex items-center gap-3 italic">
                                    <FiActivity className="text-blue-500" />
                                    Nexus Dashboard Monitoring
                                </h2>
                            </div>
                            <div className="space-y-8 text-slate-700 leading-relaxed bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                                <p className="text-lg font-medium italic">The Dashboard serves as the command center for regional and division-level oversight. Monitor these three core metrics to maintain data health.</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="p-5 bg-white border border-slate-100 rounded-[2rem] shadow-sm hover:border-blue-400 transition-all border-l-8 border-l-blue-600">
                                            <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1 italic">Budget Alpha (ABC)</h4>
                                            <p className="text-xs font-bold text-slate-800 leading-snug italic">Approved Budget for Contract. The maximum financial ceiling for procurement.</p>
                                        </div>
                                        <div className="p-5 bg-white border border-slate-100 rounded-[2rem] shadow-sm hover:border-emerald-400 transition-all border-l-8 border-l-emerald-500">
                                            <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1 italic">Fiscal Result (Contract)</h4>
                                            <p className="text-xs font-bold text-slate-800 leading-snug italic">The actual bid price awarded to the winning contractor.</p>
                                        </div>
                                        <div className="p-5 bg-red-950 text-white rounded-2xl border border-red-500/20 group hover:bg-red-900 transition-all shadow-xl border-l-[12px] border-l-red-600">
                                            <h4 className="text-[10px] font-black text-red-400 uppercase tracking-[0.2em] mb-1 italic underline decoration-red-500/30">Delayed Projects (⚠️)</h4>
                                            <p className="text-xs font-bold text-red-100 leading-snug italic">Auto-flags projects where Actual % is less than Target Accomplishment.</p>
                                        </div>
                                    </div>
                                    <div className="bg-[#0A192F] aspect-video rounded-3xl flex flex-col items-center justify-center gap-4 text-white p-8 shadow-2xl relative overflow-hidden group/gif transition-all hover:bg-navy-900 border-4 border-blue-500/20">
                                        <div className="relative z-10 text-center">
                                            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/10">
                                                <FiInfo className="text-blue-400 rotate-12" size={24} />
                                            </div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-400 mb-2 italic">Visual Guide</p>
                                            <h4 className="text-sm font-bold font-mono text-white/90 italic text-center uppercase tracking-tighter leading-tight italic">Nexus Analytics Drilldown</h4>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Module 6: Construction Protocol */}
                        <section className="mb-32 group">
                            <div className="flex items-center mb-10">
                                <span className="w-10 h-10 bg-[#0A192F] text-white rounded-2xl flex items-center justify-center font-black text-lg mr-4 shadow-xl shadow-blue-900/10 group-hover:scale-110 transition-transform italic">6</span>
                                <h2 className="text-3xl font-black text-[#0A192F] uppercase tracking-tight flex items-center gap-3 italic">
                                    <FiCheckCircle className="text-emerald-500" />
                                    Construction Update Protocol
                                </h2>
                            </div>
                            <div className="space-y-12 text-slate-700 leading-relaxed bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                                <div className="p-8 bg-[#0A192F] text-white rounded-[2rem] border-l-[12px] border-emerald-500 shadow-2xl relative overflow-hidden group">
                                    <h4 className="text-emerald-400 font-black text-xs uppercase mb-3 italic tracking-[0.3em]">SOP Mandatory Protocol</h4>
                                    <p className="text-lg font-medium italic opacity-90 leading-relaxed">Division Engineers must follow the 3-Step Wizard for all site progress reporting. Accomplishment reports WITHOUT categorized photographic evidence are non-compliant.</p>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl shadow-sm hover:border-blue-400 transition-all border-l-4 border-l-blue-500 group">
                                            <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3 italic underline decoration-blue-100">Media Classification</h4>
                                            <ul className="text-xs text-slate-500 space-y-3 font-bold italic">
                                                <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5"></div> Internal: Classroom lighting, outlets, flooring.</li>
                                                <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5"></div> External: Façade, structural civil, painting.</li>
                                                <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5"></div> Cardinal Angles: Front, Left, Right, Rear.</li>
                                            </ul>
                                        </div>
                                        <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl shadow-sm hover:border-emerald-400 transition-all border-l-4 border-l-emerald-500 group">
                                            <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-3 italic underline decoration-emerald-100">Accomplishment Slider</h4>
                                            <p className="text-xs font-bold text-slate-800 italic leading-relaxed">Percentage is auto-locked to 100% when "For Final Inspection" or "Completed" is selected.</p>
                                        </div>
                                    </div>
                                    <div className="bg-[#0A192F] aspect-video rounded-3xl flex flex-col items-center justify-center gap-4 text-white p-8 shadow-2xl relative overflow-hidden group/gif transition-all hover:bg-navy-900 border-4 border-emerald-500/20">
                                        <div className="relative z-10 text-center">
                                            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/10">
                                                <FiInfo className="text-emerald-400 rotate-12" size={24} />
                                            </div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-400 mb-2 italic">Visual Guide</p>
                                            <h4 className="text-sm font-bold font-mono text-white/90 italic text-center uppercase tracking-tighter leading-tight italic">Accomplishment Update Wizard</h4>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Module 7: Offline support */}
                        <section className="mb-32 group">
                            <div className="flex items-center mb-10">
                                <span className="w-10 h-10 bg-[#0A192F] text-white rounded-2xl flex items-center justify-center font-black text-lg mr-4 shadow-xl shadow-blue-900/10 group-hover:scale-110 transition-transform italic">7</span>
                                <h2 className="text-3xl font-black text-[#0A192F] uppercase tracking-tight flex items-center gap-3 italic">
                                    <FiRefreshCw className="text-blue-500" />
                                    Offline Sync Protocol
                                </h2>
                            </div>
                            <div className="space-y-8 text-slate-700 leading-relaxed bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                                <p className="text-lg font-medium italic">InsightEd saves inputs locally during Zero-Signal field work. Navigate to the Synergy Center once technical signal is restored.</p>
                                
                                <div className="p-10 bg-navy-950 text-white rounded-[3rem] border-l-[12px] border-blue-500 shadow-2xl relative overflow-hidden text-center group">
                                    <div className="relative z-10">
                                        <p className="text-[10px] uppercase font-black text-blue-400 mb-4 tracking-[0.5em] italic underline decoration-blue-500/20 underline-offset-8">Data Transmission Protocol</p>
                                        <h4 className="text-xl font-black mb-6 uppercase tracking-tight italic leading-snug">Navigate to the SYNC CENTER (Clipboard Icon) & tap [SYNC ALL] to transmit payloads.</h4>
                                        <div className="inline-flex items-center gap-3 bg-blue-600 px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-500/30 group-hover:scale-105 transition-transform italic">
                                            <FiRefreshCw className="animate-spin" /> Transmitting
                                        </div>
                                    </div>
                                </div>
                                <div className="p-8 bg-red-950 text-white rounded-[2rem] border-4 border-red-500/20 shadow-2xl text-center group">
                                    <h4 className="text-[11px] uppercase font-black text-red-500 mb-3 tracking-[0.4em] italic flex items-center justify-center gap-2">
                                        <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div> Mandatory SOP Security
                                    </h4>
                                    <p className="text-lg font-black italic uppercase tracking-tighter mb-2">DO NOT LOG OUT</p>
                                    <p className="text-xs font-medium italic opacity-70 decoration-red-500/50 decoration-wavy underline underline-offset-4">Logging out will result in permanent loss of cached records.</p>
                                </div>
                            </div>
                        </section>

                        {/* Module 8: Procurement Wizard */}
                        <section className="mb-32 group">
                            <div className="flex items-center mb-10">
                                <span className="w-10 h-10 bg-[#0A192F] text-white rounded-2xl flex items-center justify-center font-black text-lg mr-4 shadow-xl shadow-blue-900/10 group-hover:scale-110 transition-transform italic">8</span>
                                <h2 className="text-3xl font-black text-[#0A192F] uppercase tracking-tight flex items-center gap-3 italic">
                                    <FiDatabase className="text-indigo-500" />
                                    Procurement Lifecycle Wizard
                                </h2>
                            </div>
                            <div className="space-y-8 text-slate-700 leading-relaxed bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 text-center md:text-left">
                                <p className="text-lg font-medium italic">For projects in the "Under Procurement" phase, document the bidding timeline to ensure compliance with <span className="text-indigo-600 font-bold underline decoration-indigo-100 underline-offset-4">RA 9184</span>.</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                                    <div className="space-y-4">
                                        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm border-l-4 border-l-indigo-500">
                                            <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-3 italic">Bidding Milestones</h4>
                                            <p className="text-xs font-bold text-slate-600 italic">Toggle Pre-bid, Opening, and Post-Qual switches as they occur.</p>
                                        </div>
                                        <div className="p-6 bg-[#0A192F] text-white rounded-2xl shadow-xl border-l-[12px] border-l-emerald-500">
                                            <h4 className="text-emerald-400 font-black text-xs uppercase mb-3 italic tracking-widest">Contract Award</h4>
                                            <p className="text-xs font-bold text-indigo-100 italic">Notice of Award triggers mandatory Contractor Name and Award Amount fields.</p>
                                        </div>
                                    </div>
                                    <div className="bg-[#0A192F] aspect-video rounded-3xl flex flex-col items-center justify-center gap-4 text-white p-8 shadow-2xl relative overflow-hidden group/gif transition-all hover:bg-navy-900 border-4 border-indigo-500/20">
                                        <div className="text-3xl mb-2">📜</div>
                                        <h4 className="text-sm font-bold font-mono text-white/90 italic uppercase tracking-tighter">Procurement Data Node</h4>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Module 9: Variation Orders */}
                        <section className="mb-32 group">
                            <div className="flex items-center mb-10">
                                <span className="w-10 h-10 bg-[#0A192F] text-white rounded-2xl flex items-center justify-center font-black text-lg mr-4 shadow-xl shadow-blue-900/10 group-hover:scale-110 transition-transform italic">9</span>
                                <h2 className="text-3xl font-black text-[#0A192F] uppercase tracking-tight flex items-center gap-3 italic">
                                    <FiActivity className="text-amber-500" />
                                    Variation Orders (VO) Management
                                </h2>
                            </div>
                            <div className="space-y-8 text-slate-700 leading-relaxed bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                                <div className="p-8 bg-amber-50 border border-amber-200 rounded-[2rem] shadow-sm text-center">
                                    <h4 className="text-amber-800 font-black text-sm uppercase mb-3 italic tracking-[0.2em]">Budget & Timeline Realignment</h4>
                                    <p className="text-lg font-medium italic text-amber-900">Tap the <span className="bg-amber-100 px-3 py-1 rounded-xl border border-amber-300 font-black">⚖️ VO</span> button on the project card to register legal changes to the contract or schedule.</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm text-center">
                                        <div className="text-2xl mb-2">💵</div>
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Financial VO</h4>
                                        <p className="text-xs font-bold text-slate-600 italic">Register Additive or Deductive amounts.</p>
                                    </div>
                                    <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm text-center">
                                        <div className="text-2xl mb-2">⏳</div>
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Time Extension</h4>
                                        <p className="text-xs font-bold text-slate-600 italic">Log calendar days added to the expiry.</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Module 10: Settings */}
                        <section className="mb-32 group">
                            <div className="flex items-center mb-10">
                                <span className="w-10 h-10 bg-[#0A192F] text-white rounded-2xl flex items-center justify-center font-black text-lg mr-4 shadow-xl shadow-blue-900/10 group-hover:scale-110 transition-transform italic">10</span>
                                <h2 className="text-3xl font-black text-[#0A192F] uppercase tracking-tight flex items-center gap-3 italic">
                                    <FiSmartphone className="text-blue-500" />
                                    Settings & Profile Management
                                </h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="p-6 bg-white border border-slate-100 rounded-[2rem] shadow-sm hover:border-blue-400 transition-all text-center group">
                                    <FiLock className="mx-auto mb-4 text-blue-500 group-hover:scale-110 transition-transform" size={32} />
                                    <h4 className="font-black text-navy-950 uppercase text-xs mb-2 italic">Passcode PIN</h4>
                                    <p className="text-[10px] text-slate-500 font-medium italic underline decoration-slate-100">Secure field devices.</p>
                                </div>
                                <div className="p-6 bg-white border border-slate-100 rounded-[2rem] shadow-sm hover:border-blue-400 transition-all text-center group">
                                    <FiActivity className="mx-auto mb-4 text-blue-500 group-hover:scale-110 transition-transform" size={32} />
                                    <h4 className="font-black text-navy-950 uppercase text-xs mb-2 italic">Dark Mode</h4>
                                    <p className="text-[10px] text-slate-500 font-medium italic underline decoration-slate-100">High-contrast reporting.</p>
                                </div>
                                <div className="p-6 bg-white border border-slate-100 rounded-[2rem] shadow-sm hover:border-blue-400 transition-all text-center group">
                                    <FiInfo className="mx-auto mb-4 text-blue-500 group-hover:scale-110 transition-transform" size={32} />
                                    <h4 className="font-black text-navy-950 uppercase text-xs mb-2 italic">Help Center</h4>
                                    <p className="text-[10px] text-slate-500 font-medium italic underline decoration-slate-100">FAQ & Sync Solutions.</p>
                                </div>
                            </div>
                        </section>

                        {/* Final Support */}
                        <footer className="mt-40 pt-24 border-t-8 border-navy-950 text-center relative overflow-hidden">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-blue-500/5 rounded-full blur-[80px]"></div>
                            <div className="max-w-md mx-auto relative z-10">
                                <div className="w-20 h-20 bg-[#0A192F] text-white rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-blue-900/40 border border-blue-500/20">
                                    <FiTool size={40} className="text-blue-400 rotate-12" />
                                </div>
                                <h2 className="text-2xl font-black text-[#0A192F] uppercase mb-4 tracking-[0.3em] italic">Engineering Support Desk</h2>
                                <p className="text-sm text-slate-400 mb-10 font-bold uppercase tracking-widest italic leading-relaxed px-6">For technical anomalies or SOP inquiries, coordinate via the official Stratcom Google Space.</p>
                                <div className="bg-[#0A192F] p-10 rounded-[2.5rem] text-white font-mono text-base shadow-2xl shadow-blue-900/40 border border-blue-500/20 group hover:scale-105 transition-all">
                                    <div className="text-blue-400 text-[9px] font-black uppercase tracking-[0.6em] mb-4 opacity-70 italic underline decoration-blue-500/20">Official SOP Inquiry Channel</div>
                                    support.stride@deped.gov.ph
                                </div>
                            </div>
                            <div className="mt-32 pb-20">
                                <p className="text-[10px] text-slate-300 uppercase tracking-[1em] font-black italic">SOP COMPLIANCE MANUAL • 2026</p>
                            </div>
                        </footer>

                    </main>
                </div>
            </div>
        </PageTransition>
    );
};

export default DivisionEngineerQuickStart;
