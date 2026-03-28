import React from 'react';
import { FiTool, FiShield, FiSmartphone, FiArrowRight, FiActivity, FiLock, FiCheckCircle, FiHome, FiList, FiMessageSquare, FiSettings, FiPlay } from 'react-icons/fi';
import PageTransition from '../components/PageTransition';

const DivisionEngineerQuickStart = () => {
    return (
        <PageTransition>
            <div className="min-h-screen bg-[#020617] text-slate-100 scroll-smooth pb-32 font-sans selection:bg-blue-500/30">
                {/* Hero Glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-blue-600/10 blur-[120px] pointer-events-none"></div>

                {/* Top Navigation */}
                <nav className="sticky top-0 z-50 bg-[#020617]/80 backdrop-blur-xl border-b border-white/5">
                    <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-white italic text-base shadow-lg shadow-blue-500/30">IE</div>
                            <div>
                                <span className="font-bold text-lg tracking-tight block leading-none text-white">InsightED</span>
                                <span className="text-[10px] text-blue-400 font-bold uppercase tracking-[0.2em]">Engineer Operations</span>
                            </div>
                        </div>
                        <div className="px-4 py-1.5 bg-blue-600/10 rounded-full border border-blue-500/20">
                            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest italic">Pilot Phase II</span>
                        </div>
                    </div>
                </nav>

                <div className="max-w-4xl mx-auto px-6 py-20 relative">
                    <main className="w-full">
                        
                        {/* Header Section */}
                        <header className="mb-32 text-center">
                            <div className="inline-flex items-center gap-2 mb-8 px-4 py-2 bg-blue-500/5 rounded-full border border-blue-500/10">
                                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                                <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">Official SOP Manual</span>
                            </div>
                            <h1 className="text-5xl md:text-7xl font-black mb-8 leading-[1.1] tracking-tight text-white italic uppercase">
                                Master Guide <br/>
                                <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent not-italic normal-case">for Division Engineers</span>
                            </h1>
                            <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed font-medium italic">
                                Definitive guide to the Efd Engineer Dashboard. Empowering site oversight with real-time data and AI-driven insights.
                            </p>
                        </header>

                        {/* 1. Installation */}
                        <section id="installation" className="mb-40 group">
                            <div className="flex items-start gap-6 mb-12">
                                <div className="w-12 h-12 bg-navy-900 border border-white/10 rounded-2xl flex items-center justify-center text-blue-500 font-black text-xl shadow-lg shrink-0 group-hover:border-blue-500/50 transition-colors italic">01</div>
                                <div>
                                    <h2 className="text-4xl font-black mb-4 tracking-tight uppercase italic text-white flex items-center gap-4">
                                        <FiSmartphone className="text-blue-500" />
                                        Installation of PWA
                                    </h2>
                                    <p className="text-slate-400 font-medium italic">InsightEd is a <span className="text-white font-bold italic underline decoration-blue-500/30">Progressive Web App</span>. No app store needed—just direct access.</p>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-8 mb-12">
                                <div className="bg-navy-900/50 backdrop-blur-xl border border-white/5 p-8 rounded-[2rem] hover:border-blue-500/30 transition-all">
                                    <h3 className="text-xl font-bold italic text-white mb-6 uppercase flex items-center gap-3">
                                        <div className="p-2 bg-blue-500/10 rounded-lg"><FiSmartphone className="text-blue-400" /></div>
                                        iOS Access (Safari)
                                    </h3>
                                    <ul className="space-y-4 text-slate-400 font-medium italic text-sm">
                                        <li>1. Open <code className="bg-white/5 px-2 py-0.5 rounded border border-white/10 text-blue-400">tinyurl.com/InsightEdV2</code></li>
                                        <li>2. Tap the <strong className="text-white">"Share"</strong> icon (square with arrow up)</li>
                                        <li>3. Scroll down and select <strong className="text-white">"Add to Home Screen"</strong></li>
                                        <li>4. Tap <strong className="text-blue-500 uppercase">Add</strong> in the top right</li>
                                    </ul>
                                </div>
                                <div className="bg-navy-900/50 backdrop-blur-xl border border-white/5 p-8 rounded-[2rem] hover:border-emerald-500/30 transition-all">
                                    <h3 className="text-xl font-bold italic text-white mb-6 uppercase flex items-center gap-3">
                                        <div className="p-2 bg-emerald-500/10 rounded-lg"><FiSmartphone className="text-emerald-400" /></div>
                                        Android Access (Chrome)
                                    </h3>
                                    <ul className="space-y-4 text-slate-400 font-medium italic text-sm">
                                        <li>1. Open <code className="bg-white/5 px-2 py-0.5 rounded border border-white/10 text-emerald-400">tinyurl.com/InsightEdV2</code></li>
                                        <li>2. Tap the <strong className="text-white">"Three Dots"</strong> menu button</li>
                                        <li>3. Select <strong className="text-white">"Install App"</strong> or "Add to Home Screen"</li>
                                        <li>4. Confirm by tapping <strong className="text-emerald-500 uppercase">INSTALL</strong></li>
                                    </ul>
                                </div>
                            </div>

                            <div className="aspect-video bg-navy-950 rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl relative group">
                                <img src={`${import.meta.env.BASE_URL}pwa_installation_flow.gif`.replace('//', '/')} alt="PWA Installation" className="w-full h-full object-cover" />
                                <div className="absolute bottom-6 left-6 px-4 py-2 bg-black/60 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest text-blue-400">Demonstration GIF</div>
                            </div>
                        </section>

                        {/* 2. Nexus Dashboard */}
                        <section id="nexus" className="mb-40 group">
                            <div className="flex items-start gap-6 mb-12">
                                <div className="w-12 h-12 bg-navy-900 border border-white/10 rounded-2xl flex items-center justify-center text-emerald-500 font-black text-xl shadow-lg shrink-0 group-hover:border-emerald-500/50 transition-colors italic">02</div>
                                <div>
                                    <h2 className="text-4xl font-black mb-4 tracking-tight uppercase italic text-white flex items-center gap-4">
                                        <FiActivity className="text-emerald-500" />
                                        Navigating the Nexus
                                    </h2>
                                    <p className="text-slate-400 font-medium italic">The Launchpad to your jurisdiction's engineering metrics.</p>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-12 items-center">
                                <div className="space-y-6">
                                    <div className="bg-navy-900/50 border border-white/5 p-8 rounded-[2rem] border-l-8 border-l-blue-500 hover:bg-blue-500/5 transition-all">
                                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2 block">Phase 1</span>
                                        <h4 className="text-2xl font-black mb-3 italic text-white uppercase">Select InsightEd for infrastructure</h4>
                                        <p className="text-slate-400 font-medium text-sm italic">Filter the ecosystem views to focus exclusively on public school building facilities.</p>
                                    </div>
                                    <div className="bg-navy-900/50 border border-white/5 p-8 rounded-[2rem] border-l-8 border-l-emerald-500 hover:bg-emerald-500/5 transition-all">
                                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2 block">Phase 2</span>
                                        <h4 className="text-2xl font-black mb-3 italic text-white uppercase">Select Engineers Portal</h4>
                                        <p className="text-slate-400 font-medium text-sm italic">Enter the specialized dashboard tailored for Division-level operations.</p>
                                    </div>
                                </div>
                                <div className="aspect-video bg-navy-950 rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl group">
                                    <img src={`${import.meta.env.BASE_URL}nexus_portal_selection.gif`.replace('//', '/')} alt="Nexus Navigation" className="w-full h-full object-cover" />
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
                                        Identity & Access
                                    </h2>
                                    <p className="text-slate-400 font-medium italic">Registering your account for the pilot phase.</p>
                                </div>
                            </div>

                            <div className="bg-navy-900/50 border border-white/5 p-12 rounded-[2.5rem] mb-12 relative overflow-hidden">
                                <div className="absolute -top-10 -right-10 opacity-5">
                                    <FiShield size={240} className="text-white" />
                                </div>
                                <div className="grid md:grid-cols-2 gap-12">
                                    <div>
                                        <h3 className="text-2xl font-black mb-8 italic flex items-center gap-3 text-white uppercase">
                                            <span className="w-2 h-8 bg-amber-500 rounded-full"></span>
                                            Registration Flow
                                        </h3>
                                        <ul className="space-y-6 text-slate-400 font-medium italic">
                                            <li className="flex gap-4">
                                                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center font-black text-white shrink-0 text-xs">1</div>
                                                <p>Tap <strong className="text-white underline decoration-amber-500/30">Create New Account</strong> button.</p>
                                            </li>
                                            <li className="flex gap-4">
                                                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center font-black text-white shrink-0 text-xs">2</div>
                                                <p>Select <strong className="text-amber-500 uppercase italic">Division Engineer</strong> role.</p>
                                            </li>
                                            <li className="flex gap-4">
                                                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center font-black text-white shrink-0 text-xs">3</div>
                                                <p>Use your <strong className="text-white italic underline">DepEd Email Account</strong>.</p>
                                            </li>
                                        </ul>
                                    </div>
                                    <div className="flex flex-col justify-center text-center">
                                        <div className="bg-navy-950 p-8 rounded-3xl border border-amber-500/20 shadow-2xl">
                                            <p className="text-[11px] uppercase font-black tracking-[0.4em] text-amber-500 mb-6 italic font-bold">MASTER AUTHORIZATION KEY</p>
                                            <div className="text-4xl font-mono font-black tracking-[0.2em] text-white mb-6 select-all italic">E5T8-B2W3</div>
                                            <p className="text-[11px] italic text-slate-500 font-bold uppercase tracking-widest">Mandatory for Division-level Auth.</p>
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
                                        The Dashboard Hub
                                    </h2>
                                    <p className="text-slate-400 font-medium italic">Comprehensive view of your engineering toolkit.</p>
                                </div>
                            </div>

                            {/* Home Tab */}
                            <div className="mb-24">
                                <div className="flex items-center gap-6 mb-10">
                                    <h3 className="text-2xl font-black italic uppercase tracking-tighter text-blue-400 flex items-center gap-4 shrink-0">
                                        <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center"><FiHome className="text-blue-500" /></div>
                                        Home: Oversight
                                    </h3>
                                    <div className="h-px bg-white/5 flex-grow"></div>
                                </div>
                                <div className="grid md:grid-cols-2 gap-8 mb-8">
                                    <div className="bg-navy-900/50 border border-white/5 p-8 rounded-[2rem] border-t-4 border-t-blue-500">
                                        <h4 className="font-black text-xs uppercase tracking-widest text-blue-400 mb-6 italic">Financial Data</h4>
                                        <ul className="space-y-4 text-sm text-slate-400 font-medium italic">
                                            <li className="flex justify-between"><span>Total ABC</span> <span className="text-white font-black italic">Regional Budget</span></li>
                                            <li className="flex justify-between"><span>Total Contract</span> <span className="text-white font-black italic">Awarded Amount</span></li>
                                        </ul>
                                    </div>
                                    <div className="bg-navy-900/50 border border-white/5 p-8 rounded-[2rem] border-t-4 border-t-emerald-500">
                                        <h4 className="font-black text-xs uppercase tracking-widest text-emerald-400 mb-6 italic">Physical Health</h4>
                                        <ul className="space-y-4 text-sm text-slate-400 font-medium italic">
                                            <li className="flex justify-between"><span>Total Projects</span> <span className="text-white font-black italic">Active Inventory</span></li>
                                            <li className="flex justify-between"><span>Delayed</span> <span className="text-rose-500 font-black animate-pulse">Critical Alerts</span></li>
                                        </ul>
                                    </div>
                                </div>
                                <div className="bg-navy-900/50 border border-white/5 p-8 rounded-[2rem] flex flex-col md:flex-row gap-8 items-center border-l-4 border-l-blue-500">
                                    <div className="flex-grow">
                                        <h4 className="text-xl font-black mb-4 italic text-white uppercase tracking-tight">Status Matrix & Calendar</h4>
                                        <p className="text-sm text-slate-400 font-medium italic mb-4 leading-relaxed">Visual distribution of project states. Use the <strong className="text-blue-400 font-bold italic underline">Calendar View</strong> to track upcoming deadlines and inspection windows.</p>
                                        <div className="flex gap-3">
                                            <span className="px-3 py-1 bg-blue-500/10 text-[10px] font-black uppercase text-blue-400 rounded-lg italic">Ongoing</span>
                                            <span className="px-3 py-1 bg-emerald-500/10 text-[10px] font-black uppercase text-emerald-400 rounded-lg italic">Completed</span>
                                            <span className="px-3 py-1 bg-rose-500/10 text-[10px] font-black uppercase text-rose-500 rounded-lg italic">Suspended</span>
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
                                        Projects: Execution
                                    </h3>
                                    <div className="h-px bg-white/5 flex-grow"></div>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-10">
                                    <div className="bg-navy-900/50 border border-white/5 p-6 rounded-3xl text-center group hover:border-emerald-500/30 transition-all">
                                        <div className="text-3xl mb-3">🔍</div>
                                        <h5 className="text-[10px] font-black text-white uppercase italic tracking-widest mb-1">Smart Filter</h5>
                                        <p className="text-[9px] text-slate-500 font-bold italic">Isolate by Status/Year</p>
                                    </div>
                                    <div className="bg-navy-900/50 border border-white/5 p-6 rounded-3xl text-center group hover:border-emerald-500/30 transition-all">
                                        <div className="text-3xl mb-3">📇</div>
                                        <h5 className="text-[10px] font-black text-white uppercase italic tracking-widest mb-1">Project Cards</h5>
                                        <p className="text-[9px] text-slate-500 font-bold italic">Real-time status view</p>
                                    </div>
                                    <div className="bg-navy-900/50 border border-white/5 p-6 rounded-3xl text-center group hover:border-emerald-500/30 transition-all">
                                        <div className="text-3xl mb-3">⚡</div>
                                        <h5 className="text-[10px] font-black text-white uppercase italic tracking-widest mb-1">Detailed View</h5>
                                        <p className="text-[9px] text-slate-500 font-bold italic">360-degree analytics</p>
                                    </div>
                                </div>
                                <div className="aspect-video bg-navy-950 rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl relative group cursor-pointer hover:border-blue-500/30 transition-all">
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 z-10">
                                        <div className="w-16 h-16 bg-blue-600/20 border-2 border-blue-500 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-all shadow-[0_0_20px_rgba(59,130,246,0.5)]">
                                            <FiPlay size={24} className="text-blue-500 translate-x-1" fill="currentColor" />
                                        </div>
                                        <span className="text-xs font-black uppercase tracking-[0.4em] text-blue-400 italic">Project Update Tutorial</span>
                                    </div>
                                    <img src={`${import.meta.env.BASE_URL}pwa-512x512.png`.replace('//', '/')} alt="Overlay" className="w-full h-full object-cover grayscale opacity-10" />
                                </div>
                            </div>

                            {/* Logs Tab */}
                            <div className="mb-24">
                                <div className="flex items-center gap-6 mb-10">
                                    <h3 className="text-2xl font-black italic uppercase tracking-tighter text-amber-500 flex items-center gap-4 shrink-0">
                                        <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center"><FiMessageSquare className="text-amber-500" /></div>
                                        Logs: Intelligence
                                    </h3>
                                    <div className="h-px bg-white/5 flex-grow"></div>
                                </div>
                                <div className="bg-gradient-to-br from-navy-900 to-[#020617] border border-amber-500/20 p-12 rounded-[2.5rem] flex flex-col md:flex-row gap-12 items-center relative overflow-hidden group">
                                    <div className="flex-grow relative z-10">
                                        <h4 className="text-2xl font-black mb-6 italic text-white uppercase tracking-tight">Synergy AI <span className="text-amber-500">&</span> Collaboration</h4>
                                        <p className="text-slate-400 font-medium italic leading-relaxed mb-10">Need technical guidance? Interact with our integrated AI to query engineering standards or coordinate feedback directly with the development team.</p>
                                        <div className="flex flex-wrap gap-4">
                                            <span className="px-4 py-2 bg-amber-500/10 border border-amber-500/20 text-[10px] font-black uppercase text-amber-400 rounded-xl italic">AI Chat Support</span>
                                            <span className="px-4 py-2 bg-amber-500/10 border border-amber-500/20 text-[10px] font-black uppercase text-amber-400 rounded-xl italic">Bug Reporting</span>
                                            <span className="px-4 py-2 bg-amber-500/10 border border-amber-500/20 text-[10px] font-black uppercase text-amber-400 rounded-xl italic">Feature Requests</span>
                                        </div>
                                    </div>
                                    <div className="shrink-0 relative group-hover:scale-110 transition-transform duration-700">
                                        <div className="absolute inset-0 bg-amber-500/20 blur-[60px] rounded-full"></div>
                                        <img src={`${import.meta.env.BASE_URL}assistant-mascot.png`.replace('//', '/')} alt="Synergy mascot" className="w-40 relative z-10" />
                                    </div>
                                </div>
                            </div>

                            {/* Settings Tab */}
                            <div>
                                <div className="flex items-center gap-6 mb-10">
                                    <h3 className="text-2xl font-black italic uppercase tracking-tighter text-slate-400 flex items-center gap-4 shrink-0">
                                        <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center"><FiSettings className="text-slate-400" /></div>
                                        Settings: Control
                                    </h3>
                                    <div className="h-px bg-white/5 flex-grow"></div>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-center">
                                    {[
                                        { icon: '👤', label: 'Profile', sub: 'Edit Credentials' },
                                        { icon: '🔒', label: 'Security', sub: 'Change Passcode' },
                                        { icon: '🎨', label: 'Themes', sub: 'UI Customization' },
                                        { icon: '🛠️', label: 'Support', sub: 'Troubleshoot' },
                                        { icon: '🚀', label: 'Updates', sub: 'Version Control' },
                                        { icon: '💬', label: 'Feedback', sub: 'Direct Response' },
                                    ].map((item, idx) => (
                                        <div key={idx} className="bg-navy-900/50 border border-white/5 p-8 rounded-[2rem] group hover:border-blue-500/40 transition-all cursor-pointer">
                                            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">{item.icon}</div>
                                            <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-white mb-1 italic group-hover:text-blue-400 transition-colors uppercase">{item.label}</h5>
                                            <p className="text-[9px] font-bold text-slate-600 italic uppercase tracking-tighter">{item.sub}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>

                        {/* Final Support Footer */}
                        <footer className="mt-60 pt-20 border-t border-white/5 text-center relative">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-blue-600/10 blur-[120px] pointer-events-none"></div>
                            
                            <div className="w-24 h-24 bg-navy-900 border border-white/10 rounded-[2rem] mx-auto flex items-center justify-center mb-10 shadow-2xl group hover:border-blue-500/40 transition-all overflow-hidden">
                                <img src={`${import.meta.env.BASE_URL}mascot-thumbsup.png`.replace('//', '/')} alt="Thumbsup" className="w-16 animate-pulse group-hover:scale-110 transition-transform" />
                            </div>
                            <h2 className="text-3xl font-black italic uppercase tracking-tight text-white mb-6">Engineering Support Desk</h2>
                            <p className="text-slate-400 max-w-sm mx-auto font-medium italic mb-12 leading-relaxed">For anomalies or SOP inquiries, coordinate via the official Stratcom Google Space or reach us below.</p>
                            
                            <div className="inline-block bg-navy-900 border border-white/10 p-10 rounded-[3rem] group hover:border-blue-500/40 transition-all cursor-pointer mb-20 shadow-2xl">
                                <span className="text-[10px] font-black uppercase tracking-[0.5em] text-blue-500 block mb-4 italic">Official Correspondence Node</span>
                                <span className="text-2xl font-mono font-black text-white italic tracking-tighter">support.stride@deped.gov.ph</span>
                            </div>

                            <div className="flex justify-center gap-10 grayscale opacity-40 mb-16">
                                <img src={`${import.meta.env.BASE_URL}deped_logo.png`.replace('//', '/')} alt="Deped" className="h-10 w-auto" />
                                <img src={`${import.meta.env.BASE_URL}pwa-512x512.png`.replace('//', '/')} alt="Insighted" className="h-10 w-auto" />
                            </div>

                            <p className="text-[10px] font-black uppercase tracking-[1em] text-slate-700 italic">SOP COMPLIANCE MANUAL • 2026</p>
                        </footer>

                    </main>
                </div>

                {/* Sidebar Navigation */}
                <div className="hidden xl:block fixed top-48 right-[8%] w-48 font-black">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 mb-8 border-b border-blue-500/20 pb-2 italic text-left">Quick Access</p>
                    <nav className="space-y-6 text-[10px] text-slate-500 uppercase italic text-left">
                        <a href="#installation" className="block hover:text-white transition-colors border-l-2 border-transparent hover:border-blue-500 pl-4">01 Installation</a>
                        <a href="#nexus" className="block hover:text-white transition-colors border-l-2 border-transparent hover:border-emerald-500 pl-4">02 Nexus Portal</a>
                        <a href="#registration" className="block hover:text-white transition-colors border-l-2 border-transparent hover:border-amber-500 pl-4">03 Auth & Identity</a>
                        <a href="#tabs" className="block hover:text-white transition-colors border-l-2 border-transparent hover:border-rose-500 pl-4">04 Dashboards</a>
                    </nav>
                </div>
            </div>
        </PageTransition>
    );
};

export default DivisionEngineerQuickStart;
