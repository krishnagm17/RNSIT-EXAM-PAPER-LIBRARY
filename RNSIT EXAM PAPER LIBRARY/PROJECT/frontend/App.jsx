import React, { useState, useEffect } from 'react';
import { Auth } from '@components/Auth';
import { UploadModal } from '@components/UploadModal';
import { DocumentList } from '@components/DocumentList';
import { AIAnalysis } from '@components/AIAnalysis';

import { analyzePapersForRepeats, solveSinglePaper, deepAnalyzePapers } from './services/aiService';
import { documentService } from './services/documentService';
import { userService } from './services/userService';
// Admin: Delete User
const handleAdminDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
        return;
    }
    try {
        await userService.remove(userId);
        loadUsers();
    } catch (error) {
        console.error(error);
        alert("Failed to delete user.");
    }
};
import { authService } from './services/authService';
import { LogOut, Upload as UploadIcon, User as UserIcon, Settings, BrainCircuit, Loader2, Library, GraduationCap, Moon, Sun, KeyRound, Users, Trash2, X, Check, Search, BookOpen } from 'lucide-react';

const App = () => {
    // --- State ---
    const [user, setUser] = useState(null);
    const [users, setUsers] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [uploadModalOpen, setUploadModalOpen] = useState(false);

    const [darkMode, setDarkMode] = useState(false);

    // Admin State
    const [userSearchQuery, setUserSearchQuery] = useState('');

    // AI State
    const [selectedDocs, setSelectedDocs] = useState([]);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiResults, setAiResults] = useState(null);
    const [isSinglePaperAnalysis, setIsSinglePaperAnalysis] = useState(false);

    // --- Mock Admin Actions ---
    const [resetRequests, setResetRequests] = useState([]);

    // --- Effects ---
    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [darkMode]);

    // Check for existing session
    useEffect(() => {
        const checkSession = async () => {
            try {
                const user = await authService.verifySession();
                setUser(user);
            } catch (e) {
                // No session or invalid token, stay logged out
            }
        };
        checkSession();
    }, []);

    const normalizeDocument = (doc) => ({
        ...doc,
        uploadDate: doc.uploadDate
            ? new Date(doc.uploadDate).toISOString()
            : new Date().toISOString(),
        fileUrl: doc.fileUrl ? documentService.getFileUrl(doc.fileUrl) : undefined
    });

    const loadDocuments = async () => {
        try {
            const docs = await documentService.fetchAll();
            const normalized = docs.map(normalizeDocument);
            setDocuments(normalized);
            setSelectedDocs(prev => {
                const docMap = new Map(normalized.map(doc => [doc.id, doc]));
                return prev
                    .map(doc => docMap.get(doc.id))
                    .filter(d => Boolean(d));
            });
        } catch (error) {
            console.error('Failed to fetch documents', error);
        }
    };

    const loadUsers = async () => {
        try {
            const fetched = await userService.fetchAll();
            setUsers(fetched);
        } catch (error) {
            console.error('Failed to fetch users', error);
        }
    };



    useEffect(() => {
        if (!user) {
            setDocuments([]);
            setUsers([]);
            return;
        }

        loadDocuments();
        if (user.role === 'ADMIN') {
            loadUsers();
        }
    }, [user]);

    // --- Handlers ---

    const handleLogin = (u) => {
        setUser(u);
    };

    const handleLogout = async () => {
        try {
            await authService.logout();
        } catch (e) {
            console.error("Logout failed", e);
        }
        setUser(null);
        setAiResults(null);
        setSelectedDocs([]);
        setUserSearchQuery('');
        setDocuments([]);
        setUsers([]);
        setResetRequests([]);
    };


    const handleUpload = async (formData) => {
        try {
            const uploaded = await documentService.upload(formData);
            const normalized = normalizeDocument(uploaded);
            const fileEntry = formData.get('file');
            if (fileEntry instanceof File) {
                normalized.fileObject = fileEntry;
            }
            setDocuments(prev => [normalized, ...prev]);
        } catch (error) {
            console.error(error);
            alert("Failed to upload document. Please try again.");
        }
    };

    const handleDelete = async (id) => {
        try {
            await documentService.remove(id);
            setDocuments(prev => prev.filter(d => d.id !== id));
            setSelectedDocs(prev => prev.filter(d => d.id !== id));
        } catch (error) {
            console.error(error);
            alert("Failed to delete document.");
        }
    };

    const handleAnalyzeSelected = async () => {
        if (selectedDocs.length < 2) {
            alert("Please select at least 2 papers to analyze.");
            return;
        }

        setAiLoading(true);
        try {
            const ids = selectedDocs.map(d => d.id);
            // Use static import
            const results = await deepAnalyzePapers(ids);
            console.log("Forced Deep Analysis Results:", results);
            setAiResults(results);
            setIsSinglePaperAnalysis(false);
        } catch (e) {
            console.error(e);
            alert(e.message || "AI Analysis failed. Please check your API key or file format.");
        } finally {
            setAiLoading(false);
        }
    };

    const handleAnalyzeSingle = async (doc) => {
        setAiLoading(true);
        try {
            const results = await solveSinglePaper(doc.id);
            // Map simple Q/A to RepeatedQuestion format for reuse
            const mapped = results.map(r => ({
                question: r.question,
                count: 1,
                sources: [doc.fileName],
                answer: r.answer
            }));
            setAiResults(mapped);
            setIsSinglePaperAnalysis(true);
        } catch (e) {
            console.error("Solve error:", e);
            alert(`Failed to solve paper: ${e.message}`);
        } finally {
            setAiLoading(false);
        }
    };

    // Admin: Approve Reset
    const handleAdminResetPassword = async (email) => {
        try {
            await resetService.approve(email);
            alert(`Password for ${email} reset to '123456'`);
            loadResetRequests();
        } catch (error) {
            console.error(error);
            alert("Failed to reset password.");
        }
    };

    // Admin: Reject Reset
    const handleAdminRejectReset = async (email) => {
        if (!window.confirm(`Reject password reset request for ${email}?`)) {
            return;
        }
        try {
            await resetService.reject(email);
            loadResetRequests();
        } catch (error) {
            console.error(error);
            alert("Failed to reject reset request.");
        }
    };

    // Admin: Delete User
    const handleAdminDeleteUser = async (userId) => {
        if (!window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
            return;
        }
        try {
            await userService.remove(userId);
            loadUsers();
        } catch (error) {
            console.error(error);
            alert("Failed to delete user.");
        }
    };

    const handleChangePassword = async (oldPassword, newPassword) => {
        if (!user) return;
        try {
            await authService.changePassword(user.email, oldPassword, newPassword);
            alert("Password updated successfully!");
        } catch (error) {
            alert(error?.message || "Failed to update password.");
        }
    };

    // Filtered Users for Admin
    const filteredUsers = users.filter(u => {
        if (u.role === 'ADMIN') return false;
        if (!userSearchQuery) return true;
        const q = userSearchQuery.toLowerCase();
        return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    });

    // Count total registered members (excluding admins)
    const totalRegisteredMembers = users.filter(u => u.role !== 'ADMIN').length;

    // --- Renders ---

    if (!user) {
        return (
            <div className={darkMode ? 'dark' : ''}>
                <Auth
                    onLogin={handleLogin}
                />
                {/* Dark Mode Toggle on Login Screen */}
                <button
                    onClick={() => setDarkMode(!darkMode)}
                    className="fixed bottom-4 right-4 p-3 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-md hover:scale-110 transition-transform z-50"
                >
                    {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>
            </div>
        );
    }

    return (
        <div className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
            {/* Background Mesh Gradient */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-100/40 dark:bg-blue-900/10 rounded-full mix-blend-multiply dark:mix-blend-normal filter blur-3xl opacity-30 -mr-40 -mt-40"></div>
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-100/40 dark:bg-indigo-900/10 rounded-full mix-blend-multiply dark:mix-blend-normal filter blur-3xl opacity-30 -ml-20 -mb-20"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-slate-100/50 dark:bg-slate-800/10 rounded-full mix-blend-multiply dark:mix-blend-normal filter blur-3xl opacity-20"></div>
                <div className="absolute inset-0 bg-slate-50/20 dark:bg-slate-950/20" style={{ backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)', backgroundSize: '32px 32px', opacity: 0.1 }}></div>
            </div>

            {/* Colored Header */}
            <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-b border-white/50 dark:border-slate-800 shadow-sm transition-all duration-300">
                <div className="w-full h-1 bg-gradient-to-r from-rnsit-600 via-rnsit-500 to-accent-500"></div>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-20 items-center py-3">
                        <div className="flex items-center gap-4">

                            <div className="hidden sm:block">
                                <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none">RNSIT <span className="text-rnsit-600 dark:text-rnsit-400">Library</span></h1>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold tracking-widest uppercase mt-0.5">Exam Resource Portal</p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-4 md:space-x-6">
                            <button
                                onClick={() => setDarkMode(!darkMode)}
                                className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                            >
                                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                            </button>

                            <div className="hidden md:flex flex-col items-end mr-2">
                                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{user.name}</span>
                                <span className="text-[10px] uppercase tracking-wider text-rnsit-700 dark:text-rnsit-300 bg-rnsit-50 dark:bg-rnsit-900/50 px-2 py-0.5 rounded-full font-bold border border-rnsit-100 dark:border-rnsit-800">
                                    {user.role}
                                </span>
                            </div>



                            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 hidden md:block"></div>
                            <button
                                onClick={handleLogout}
                                className="group p-2.5 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 flex items-center gap-2 border border-transparent hover:border-red-100 dark:hover:border-red-900/30"
                                title="Logout"
                            >
                                <LogOut size={20} className="group-hover:scale-110 transition-transform" />
                                <span className="hidden md:inline text-sm font-bold">Sign Out</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 space-y-8">

                {/* --- ADMIN SECTION --- */}
                {user.role === 'ADMIN' && (
                    <div className="space-y-6">



                        {/* User Management Section */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-rnsit-100 dark:bg-rnsit-900/50 rounded-lg text-rnsit-600 dark:text-rnsit-400">
                                        <Users size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                            Registered Members
                                            <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-600">
                                                {totalRegisteredMembers}
                                            </span>
                                        </h2>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Manage student and faculty accounts</p>
                                    </div>
                                </div>

                                {/* Search Bar */}
                                <div className="relative w-full sm:w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Search email or name..."
                                        value={userSearchQuery}
                                        onChange={(e) => setUserSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-rnsit-500 outline-none transition-all placeholder-slate-400 text-slate-700 dark:text-slate-200"
                                    />
                                </div>
                            </div>

                            {users.length === 0 ? (
                                <div className="text-center py-8 text-slate-400 text-sm">No registered users found.</div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {filteredUsers.map(u => (
                                        <div key={u.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 hover:border-rnsit-200 dark:hover:border-rnsit-800 transition-colors group animate-fade-in">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-rnsit-600 font-bold border border-slate-200 dark:border-slate-700 shadow-sm shrink-0">
                                                    {u.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">{u.name}</h4>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{u.email}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleAdminDeleteUser(u.id)}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                title="Delete User"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    {filteredUsers.length === 0 && (
                                        <div className="col-span-full text-center py-6 text-slate-400 italic text-sm">
                                            No members match your search.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Quick Tips Banner */}
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/10 border border-indigo-100 dark:border-indigo-800/30 p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-start md:items-center justify-between shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mt-2 -mr-2 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl"></div>
                    <div className="flex gap-4 items-center relative z-10">
                        <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-50 dark:border-indigo-900/50">
                            <BookOpen size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Discover AI Features</h3>
                            <div className="flex flex-col sm:flex-row gap-x-6 gap-y-1 text-xs text-slate-600 dark:text-slate-400 mt-1">
                                <span className="flex items-center gap-1.5"><strong className="text-indigo-600 dark:text-indigo-400">⚡ Solve Papers:</strong> Click 'Solve' on any paper to get instant answers.</span>
                                <span className="flex items-center gap-1.5"><strong className="text-indigo-600 dark:text-indigo-400">🔄 Find Repeats:</strong> Select 2+ papers to spot repeated questions.</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Hero / Action Section */}
                <div className="flex flex-col md:flex-row justify-between items-end gap-6 pb-8 border-b border-slate-200/60 dark:border-slate-800/60">
                    <div className="w-full md:w-auto">
                        <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-3">Dashboard</h2>
                        <p className="text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed text-lg font-medium">
                            Manage your academic resources. <span className="text-rnsit-600 dark:text-rnsit-400">Analyze papers</span> and <span className="text-accent-600 dark:text-accent-400">generate solutions</span> using advanced AI models.
                        </p>
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                        <button
                            onClick={handleAnalyzeSelected}
                            disabled={aiLoading || selectedDocs.length < 2}
                            title={selectedDocs.length < 2 ? "Select at least 2 papers to analyze" : "Deep Analyze selected papers"}
                            className="animate-fade-in flex-1 md:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-6 py-3.5 rounded-xl shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:hover:translate-y-0 disabled:shadow-none font-bold disabled:cursor-not-allowed"
                        >
                            {aiLoading ? <Loader2 className="animate-spin" size={20} /> : <BrainCircuit size={20} />}
                            <span>
                                {selectedDocs.length < 2 ? `Select 2+ to Analyze` : `Deep Analysis (${selectedDocs.length})`}
                            </span>
                        </button>
                        <button
                            onClick={() => setUploadModalOpen(true)}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-3.5 rounded-xl hover:bg-slate-800 dark:hover:bg-slate-100 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 font-bold"
                        >
                            <UploadIcon size={20} />
                            <span>Upload Material</span>
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex flex-col lg:flex-row gap-8 relative min-h-[500px]">

                    {/* Document List */}
                    <div className={`flex-1 transition-all duration-300 ease-in-out ${aiResults ? 'lg:w-1/2' : 'w-full'}`}>
                        <DocumentList
                            documents={documents}
                            currentUser={user}
                            onDelete={handleDelete}
                            onSelectionChange={setSelectedDocs}
                            onAnalyzeSingle={handleAnalyzeSingle}
                        />
                    </div>

                    {/* AI Panel (Split View) */}
                    {(aiResults || aiLoading) && (
                        <div className={`
                fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm lg:backdrop-blur-none lg:bg-transparent lg:static lg:block lg:w-1/2 lg:z-auto transition-all duration-300
                flex flex-col
             `}>
                            <div className="h-full flex flex-col p-4 lg:p-0">
                                {/* Mobile Close Area */}
                                <div className="lg:hidden flex justify-end mb-2">
                                    <button onClick={() => setAiResults(null)} className="text-white bg-slate-800 px-4 py-2 rounded-full font-bold text-sm shadow-lg">Close Panel</button>
                                </div>

                                {aiLoading && !aiResults ? (
                                    <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-white dark:border-slate-700 p-12 text-center animate-fade-in">
                                        <div className="relative mb-8">
                                            <div className="absolute inset-0 bg-indigo-100 dark:bg-indigo-900 rounded-full animate-ping opacity-75"></div>
                                            <div className="relative bg-gradient-to-br from-indigo-50 to-white dark:from-slate-700 dark:to-slate-800 p-6 rounded-full border border-indigo-100 dark:border-slate-600 shadow-inner">
                                                <Loader2 className="animate-spin text-indigo-600 dark:text-indigo-400" size={48} />
                                            </div>
                                        </div>
                                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">AI Processing</h3>
                                        <p className="text-slate-500 dark:text-slate-400 text-base font-medium max-w-xs leading-relaxed mx-auto">
                                            Analyzing document content and extracting questions...
                                        </p>
                                    </div>
                                ) : (
                                    aiResults && (
                                        <div className="h-full animate-slide-up">
                                            <AIAnalysis
                                                results={aiResults}
                                                isSinglePaper={isSinglePaperAnalysis}
                                                onClose={() => setAiResults(null)}
                                            />
                                        </div>
                                    )
                                )}
                            </div>
                        </div>
                    )}
                </div>

            </main>

            {uploadModalOpen && (
                <UploadModal
                    user={user}
                    onUpload={handleUpload}
                    onClose={() => setUploadModalOpen(false)}
                />
            )}


        </div>
    );
};

export default App;
