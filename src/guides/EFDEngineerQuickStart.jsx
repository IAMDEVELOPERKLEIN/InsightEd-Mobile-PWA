import React from 'react';
import { FiTool, FiShield, FiSmartphone, FiArrowRight, FiActivity, FiLock, FiCheckCircle, FiHome, FiList, FiMessageSquare, FiSettings, FiPlay, FiFileText } from 'react-icons/fi';
import PageTransition from '../components/PageTransition';

const EFDEngineerQuickStart = () => {
    return (
        <PageTransition>
            <div className="min-h-screen bg-[#020617] text-slate-100 scroll-smooth pb-32 font-sans selection:bg-amber-500/30">
                {/* Hero Glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-amber-600/10 blur-[120px] pointer-events-none"></div>

                {/* Top Navigation */}
                <nav className="sticky top-0 z-50 bg-[#020617]/80 backdrop-blur-xl border-b border-white/5">
                    <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center font-black text-white italic text-base shadow-lg shadow-amber-500/30">EFD</div>
                            <div>
                                <span className="font-bold text-lg tracking-tight block leading-none text-white">InsightED</span>
                                <span className="text-[10px] text-amber-500 font-bold uppercase tracking-[0.2em]">Central Governance</span>
                            </div>
                        </div>
                        <div className="px-4 py-1.5 bg-amber-600/10 rounded-full border border-amber-500/20">
                            <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest italic">Official Protocol</span>
                        </div>
                    </div>
                </nav>

                <div className="max-w-4xl mx-auto px-6 py-20 relative">
                    <main className="w-full">
                        
                        {/* Header Section */}
                        <header className="mb-32 text-center">
                            <div className="inline-flex items-center gap-2 mb-8 px-4 py-2 bg-amber-500/5 rounded-full border border-amber-500/10">
                                <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                                <span className="text-xs font-bold text-amber-500 uppercase tracking-widest">Official EFD Manual</span>
                            </div>
                            <h1 className="text-5xl md:text-7xl font-black mb-8 leading-[1.1] tracking-tight text-white italic uppercase">
                                Master Guide <br/>
                                <span className="bg-gradient-to-r from-amber-400 to-blue-400 bg-clip-text text-transparent not-italic normal-case">for EFD Engineers</span>
                            </h1>
                            <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed font-medium italic">
                                The centralized monitoring & infrastructure planning manual. Governance for national-level school building oversight.
                            </p>
                        </header>

                        {/* 1. Installation */}
                        <section id="installation" className="mb-40 group">
                            <div className="flex items-start gap-6 mb-12">
                                <div className="w-12 h-12 bg-navy-900 border border-white/10 rounded-2xl flex items-center justify-center text-amber-500 font-black text-xl shadow-lg shrink-0 group-hover:border-amber-500/50 transition-colors italic">01</div>
                                <div>
                                    <h2 className="text-4xl font-black mb-4 tracking-tight uppercase italic text-white flex items-center gap-4">
                                        <FiSmartphone className="text-amber-500" />
                                        Installation (PWA)
                                    </h2>
                                    <p className="text-slate-400 font-medium italic">InsightEd is a <span className="text-white font-bold italic underline decoration-amber-500/30">Progressive Web App</span>. No app store needed—just direct access.</p>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-8 mb-12">
                                <div className="bg-navy-900/50 backdrop-blur-xl border border-white/5 p-8 rounded-[2rem] hover:border-amber-500/30 transition-all">
                                    <h3 className="text-xl font-bold italic text-white mb-6 uppercase flex items-center gap-3">
                                        <div className="p-2 bg-amber-500/10 rounded-lg"><FiSmartphone className="text-amber-400" /></div>
                                        iOS Access (Safari)
                                    </h3>
                                    <ul className="space-y-4 text-slate-400 font-medium italic text-sm">
                                        <li>1. Open <code className="bg-white/5 px-2 py-0.5 rounded border border-white/10 text-amber-400">tinyurl.com/InsightEdV2</code></li>
                                        <li>2. Tap the <strong className="text-white">"Share"</strong> icon (square with arrow up)</li>
                                        <li>3. Scroll down and select <strong className="text-white">"Add to Home Screen"</strong></li>
                                        <li>4. Tap <strong className="text-amber-500 uppercase">Add</strong> in the top right</li>
                                    </ul>
                                </div>
                                <div className="bg-navy-900/50 backdrop-blur-xl border border-white/5 p-8 rounded-[2rem] hover:border-amber-500/30 transition-all">
                                    <h3 className="text-xl font-bold italic text-white mb-6 uppercase flex items-center gap-3">
                                        <div className="p-2 bg-amber-500/10 rounded-lg"><FiSmartphone className="text-amber-400" /></div>
                                        Android Access (Chrome)
                                    </h3>
                                    <ul className="space-y-4 text-slate-400 font-medium italic text-sm">
                                        <li>1. Open <code className="bg-white/5 px-2 py-0.5 rounded border border-white/10 text-amber-400">tinyurl.com/InsightEdV2</code></li>
                                        <li>2. Tap the <strong className="text-white">"Three Dots"</strong> menu button</li>
                                        <li>3. Select <strong className="text-white">"Install App"</strong> or "Add to Home Screen"</li>
                                        <li>4. Confirm by tapping <strong className="text-amber-500 uppercase">INSTALL</strong></li>
                                    </ul>
                                </div>
                            </div>

                            <div className="aspect-video bg-navy-950 rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl relative group">
                                <img src="/pwa_installation_flow.gif" alt="PWA Installation" className="w-full h-full object-cover" />
                                <div className="absolute bottom-6 left-6 px-4 py-2 bg-black/60 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest text-amber-500">Demonstration GIF</div>
                            </div>
                        </section>

                        {/* 2. Nexus Dashboard */}
                        <section id="nexus" className="mb-40 group">
                            <div className="flex items-start gap-6 mb-12">
                                <div className="w-12 h-12 bg-navy-900 border border-white/10 rounded-2xl flex items-center justify-center text-blue-500 font-black text-xl shadow-lg shrink-0 group-hover:border-blue-500/50 transition-colors italic">02</div>
                                <div>
                                    <h2 className="text-4xl font-black mb-4 tracking-tight uppercase italic text-white flex items-center gap-4">
                                        <FiActivity className="text-blue-500" />
                                        Nexus Hub Navigation
                                    </h2>
                                    <p className="text-slate-400 font-medium italic">Strategic redirect to the EFD governance environment.</p>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-12 items-center">
                                <div className="space-y-6">
                                    <div className="bg-navy-900/50 border border-white/5 p-8 rounded-[2rem] border-l-8 border-l-blue-500 hover:bg-blue-500/5 transition-all">
                                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2 block">Phase 1</span>
                                        <h4 className="text-2xl font-black mb-3 italic text-white uppercase">Select InsightEd for infrastructure</h4>
                                         <p className="text-slate-400 font-medium text-sm italic"></p>

                                    </div>
                                    <div className="bg-navy-900/50 border border-white/5 p-8 rounded-[2rem] border-l-8 border-l-amber-500 hover:bg-amber-500/5 transition-all">
                                        <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-2 block">Phase 2</span>
                                        <h4 className="text-2xl font-black mb-3 italic text-white uppercase underline decoration-amber-500/30 underline-offset-2">Select EFD Portal</h4>
                                         <p className="text-slate-400 font-medium text-sm italic"></p>

                                    </div>
                                </div>
                                <div className="aspect-video bg-navy-950 rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl group">
                                    <img src="/nexus_portal_selection.gif" alt="Nexus Navigation" className="w-full h-full object-cover" />
                                </div>
                            </div>
                        </section>

                        {/* 3. Registration & Identity */}
                        <section id="registration" className="mb-40 group">
                            <div className="flex items-start gap-6 mb-12">
                                <div className="w-12 h-12 bg-navy-900 border border-white/10 rounded-2xl flex items-center justify-center text-amber-500 font-black text-xl shadow-lg shrink-0 group-hover:border-amber-500/50 transition-colors italic">03</div>
                                <div>
                                    <h2 className="text-4xl font-black mb-4 tracking-tight uppercase italic text-white flex items-center gap-4">
                                        <FiShield className="text-amber-500" />
                                        Auth & Identity
                                    </h2>
                                    <p className="text-slate-400 font-medium italic">Registration protocol for secure EFD access.</p>
                                </div>
                            </div>

                            <div className="bg-navy-900/50 border border-white/5 p-12 rounded-[2.5rem] mb-12 relative overflow-hidden">
                                <div className="absolute -top-10 -right-10 opacity-5">
                                    <FiShield size={240} className="text-white" />
                                </div>
                                <div className="grid md:grid-cols-2 gap-12">
                                    <div>
                                        <h3 className="text-2xl font-black mb-8 italic flex items-center gap-3 text-white uppercase italic underline decoration-amber-500/30 underline-offset-4">
                                            Registration Flow
                                        </h3>
                                        <ul className="space-y-6 text-slate-400 font-medium italic">
                                            <li className="flex gap-4">
                                                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center font-black text-white shrink-0 text-xs">1</div>
                                                <p>Tap <strong className="text-white underline decoration-amber-500/30">Create New Account</strong> button.</p>
                                            </li>
                                            <li className="flex gap-4">
                                                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center font-black text-white shrink-0 text-xs">2</div>
                                                <p>Select <strong className="text-amber-500 uppercase italic italic underline underline-offset-2">Division Engineer</strong> role.</p>
                                            </li>
                                            <li className="flex gap-4">
                                                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center font-black text-white shrink-0 text-xs">3</div>
                                                <p>Use your official <strong className="text-white italic underline underline-offset-2">DepEd Email Account</strong>.</p>
                                            </li>
                                        </ul>
                                    </div>
                                    <div className="flex flex-col justify-center text-center">
                                        <div className="bg-navy-950 p-8 rounded-3xl border border-amber-500/20 shadow-2xl">
                                            <p className="text-[11px] uppercase font-black tracking-[0.4em] text-amber-500 mb-6 italic font-bold">GOVERNANCE AUTH KEY</p>
                                            <div className="text-4xl font-mono font-black tracking-[0.2em] text-white mb-6 select-all italic">EFD8-C1D9</div>
                                            <p className="text-[11px] italic text-slate-500 font-bold uppercase tracking-widest">Mandatory for Central Office Access.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* 4. Dashboard Breakdown */}
                        <section id="tabs" className="mb-40 group">
                            <div className="flex items-start gap-6 mb-16">
                                <div className="w-12 h-12 bg-navy-900 border border-white/10 rounded-2xl flex items-center justify-center text-rose-500 font-black text-xl shadow-lg shrink-0 group-hover:border-rose-500/50 transition-colors italic">04</div>
                                <div>
                                    <h2 className="text-4xl font-black mb-4 tracking-tight uppercase italic text-white flex items-center gap-4">
                                        <FiList className="text-rose-500" />
                                        Control Hub Hub
                                    </h2>
                                    <p className="text-slate-400 font-medium italic">Comprehensive view of your governance toolkit.</p>
                                </div>
                            </div>

                            {/* Home Tab */}
                            <div className="mb-24">
                                <div className="flex items-center gap-6 mb-10">
                                    <h3 className="text-2xl font-black italic uppercase tracking-tighter text-blue-400 flex items-center gap-4 shrink-0">
                                        <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center"><FiHome className="text-blue-500" /></div>
                                        Home: National Analytics
                                    </h3>
                                    <div className="h-px bg-white/5 flex-grow"></div>
                                </div>
                                <div className="bg-navy-900/50 border border-white/5 p-8 rounded-[2rem] flex flex-col md:flex-row gap-8 items-center border-l-4 border-l-blue-500">
                                    <div className="flex-grow">
                                        <h4 className="text-xl font-black mb-4 italic text-white uppercase tracking-tight">Oversight Metrics</h4>
                                         <p className="text-sm text-slate-400 font-medium italic mb-4 leading-relaxed">
                                            <strong>National Analytics Overview:</strong> View global ABC values vs. awarded contracts across all years through interactive bar and pie charts.
                                            <br/><br/>
                                            <strong>Regional Breakdowns:</strong> Monitor total projects and financial health by region. 
                                            <br/><br/>
                                            <strong>Drill-Down Capability:</strong> Click on specific years or regional segments to filter the entire dashboard for granular, real-time viewing.
                                        </p>

                                        <div className="flex gap-3">
                                            <span className="px-3 py-1 bg-blue-500/10 text-[10px] font-black uppercase text-blue-400 rounded-lg italic text-xs uppercase">Financial Sums</span>
                                            <span className="px-3 py-1 bg-emerald-500/10 text-[10px] font-black uppercase text-emerald-400 rounded-lg italic text-xs uppercase">Project Totals</span>
                                        </div>
                                    </div>
                                    <div className="w-full md:w-48 aspect-square bg-navy-950 rounded-2xl flex items-center justify-center border border-white/5 group overflow-hidden">
                                        <FiActivity className="text-blue-500/10 w-24 h-24 group-hover:scale-110 transition-transform rotate-12" />
                                    </div>
                                </div>
                            </div>

                            {/* Projects Tab */}
                            <div className="mb-24">
                                <div className="flex items-center gap-6 mb-10">
                                    <h3 className="text-2xl font-black italic uppercase tracking-tighter text-emerald-400 flex items-center gap-4 shrink-0">
                                        <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center"><FiList className="text-emerald-500" /></div>
                                        Projects: Inventory
                                    </h3>
                                    <div className="h-px bg-white/5 flex-grow"></div>
                                </div>
                                <div className="grid grid-cols-1 gap-6 mb-10">
                                    <div className="bg-navy-900/50 border border-white/5 p-8 rounded-[2rem] group hover:border-emerald-500/30 transition-all">
                                        <h5 className="text-[10px] font-black text-emerald-400 uppercase italic tracking-widest mb-3 italic">Inventory Intelligence</h5>
                                        <p className="text-sm text-slate-400 italic mb-4">
                                            <strong>Full Project Inventory:</strong> Access a searchable list of all national infrastructure. Use smart filters to isolate projects by Implementation Year, Region, or Status (Ongoing, Completed, etc.).
                                        </p>
                                        <p className="text-sm text-slate-400 italic mb-4">
                                            <strong>Project Cards:</strong> Each card displays the IPC ID, School Name, Location, and real-time Accomplishment Percentage.
                                        </p>
                                        <p className="text-sm text-slate-400 italic">
                                            <strong>Deep Dive:</strong> Click any project card to reveal the 6-step update wizard history, PDF archives, and variation orders.
                                        </p>
                                    </div>
v>
                                </div>
                            </div>

                            {/* Mother MOA Tab */}
                            <div id="moa" className="mb-24">
                                <div className="flex items-center gap-6 mb-10">
                                    <h3 className="text-2xl font-black italic uppercase tracking-tighter text-amber-500 flex items-center gap-4 shrink-0">
                                        <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center"><FiFileText className="text-amber-500" /></div>
                                        Mother MOA Archive
                                    </h3>
                                    <div className="h-px bg-white/5 flex-grow"></div>
                                </div>
                                <div className="bg-gradient-to-br from-navy-900 to-[#020617] border border-amber-500/20 p-12 rounded-[2.5rem] relative overflow-hidden group">
                                    <h4 className="text-2xl font-black mb-6 italic text-white uppercase tracking-tight underline decoration-amber-500/20 underline-offset-4">LGU Resolution Governance</h4>
                                    <p className="text-slate-400 font-medium italic leading-relaxed mb-8">Official archiving requires uploading both the **Mother MOA** and the **Sangguniang Resolution**. Add Supplemental MOAs for contract variations to ensure accurate documentation and centralized governance.</p>

                                    <div className="flex flex-wrap gap-4">
                                        <span className="px-4 py-2 bg-amber-500/10 border border-amber-500/20 text-[10px] font-black uppercase text-amber-400 rounded-xl italic">LGU Type Pairing</span>
                                        <span className="px-4 py-2 bg-amber-500/10 border border-amber-500/20 text-[10px] font-black uppercase text-amber-400 rounded-xl italic">Supplemental Docs</span>
                                        <span className="px-4 py-2 bg-amber-500/10 border border-amber-500/20 text-[10px] font-black uppercase text-amber-400 rounded-xl italic">IPC Verification</span>
                                    </div>
                                </div>
                            </div>

                            {/* Chat & Settings */}
                            <div className="grid md:grid-cols-2 gap-10">
                                {/* Logs Tab */}
                                <div className="bg-navy-900/50 border border-l-8 border-l-amber-500 p-10 rounded-[2.5rem] group hover:bg-amber-500/5 transition-all">
                                    <h3 className="text-2xl font-black italic text-white uppercase mb-4 italic flex gap-3 items-center">
                                        <FiMessageSquare className="text-amber-500" />
                                        Synergy Chat
                                    </h3>
                                    <p className="text-slate-400 text-sm italic font-medium leading-relaxed mb-6">Ask AI for standards, report bugs, or coordinate with the development team via the integrated assistant.</p>
                                    <img src="/assistant-mascot.png" alt="Synergy" className="w-16 grayscale opacity-40 ml-auto" />
                                </div>

                                {/* Settings Tab */}
                                <div className="bg-navy-900/50 border border-white/5 p-10 rounded-[2.5rem] group hover:border-white/20 transition-all">
                                    <h3 className="text-2xl font-black italic text-white uppercase mb-8 italic flex gap-3 items-center">
                                        <FiSettings className="text-slate-400" />
                                        System Control
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-white/5 p-4 rounded-xl text-center flex flex-col items-center gap-1 hover:bg-white/10 transition-all cursor-pointer">
                                            <FiActivity className="text-slate-400" />
                                            <span className="text-[10px] font-bold text-slate-500 italic uppercase">Security</span>
                                        </div>
                                        <div className="bg-white/5 p-4 rounded-xl text-center flex flex-col items-center gap-1 hover:bg-white/10 transition-all cursor-pointer">
                                            <FiShield className="text-slate-400" />
                                            <span className="text-[10px] font-bold text-slate-500 italic uppercase">Profile</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Final Support Footer */}
                        <footer className="mt-60 pt-20 border-t border-white/5 text-center relative">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-600/10 blur-[120px] pointer-events-none"></div>
                            
                            <div className="w-24 h-24 bg-navy-900 border border-white/10 rounded-[2rem] mx-auto flex items-center justify-center mb-10 shadow-2xl group hover:border-amber-500/40 transition-all overflow-hidden">
                                <img src="/mascot-thumbsup.png" alt="Thumbsup" className="w-16 animate-pulse group-hover:scale-110 transition-transform" />
                            </div>
                            <h2 className="text-3xl font-black italic uppercase tracking-tight text-white mb-6">EFD Support Node</h2>
                            <p className="text-slate-400 max-w-sm mx-auto font-medium italic mb-12 leading-relaxed uppercase tracking-widest text-xs italic">Strategic Planning Division Coordination Channel</p>
                            
                            <div className="inline-block bg-navy-900 border border-white/10 p-10 rounded-[3rem] group hover:border-amber-500/40 transition-all cursor-pointer mb-20 shadow-2xl">
                                <span className="text-[10px] font-black uppercase tracking-[0.5em] text-amber-500 block mb-4 italic">Official Correspondence Hub</span>
                                <span className="text-2xl font-mono font-black text-white italic tracking-tighter">efd.monitoring@deped.gov.ph</span>
                            </div>

                            <p className="text-[10px] font-black uppercase tracking-[1em] text-slate-700 italic">SOP COMPLIANCE MANUAL • EFD CENTRAL • 2026</p>
                        </footer>

                    </main>
                </div>
            </div>
        </PageTransition>
    );
};

export default EFDEngineerQuickStart;
