import React, { useState } from 'react';
import { DocumentType, IAType, UserRole } from '@app/types';
import { DEPARTMENTS, SEMESTERS, YEARS, IA_TYPES, MODULES } from '@app/constants';
import { Trash2, FileText, Download, CheckSquare, Eye, File, FileCode, Filter, Search, BookOpen, Layers, Users } from 'lucide-react';

export const DocumentList = ({
    documents,
    currentUser,
    onDelete,
    onSelectionChange,
    onAnalyzeSingle
}) => {
    // Filter States
    const [filterType, setFilterType] = useState('ALL');
    const [filterDept, setFilterDept] = useState('');
    const [filterSem, setFilterSem] = useState('');
    const [filterSubCode, setFilterSubCode] = useState('');
    const [filterYear, setFilterYear] = useState('');
    const [filterIA, setFilterIA] = useState('');
    const [filterModule, setFilterModule] = useState('');
    const [filterUploadedByMe, setFilterUploadedByMe] = useState(false);

    const [selectedIds, setSelectedIds] = useState(new Set());

    // Derived filtered list
    const filteredDocs = documents.filter(doc => {
        if (filterUploadedByMe && doc.uploaderId !== currentUser.email) return false;
        if (filterType !== 'ALL' && doc.type !== filterType) return false;
        if (filterDept && doc.department !== filterDept) return false;
        if (filterSem && doc.semester !== filterSem) return false;
        if (filterSubCode && !doc.subjectCode.toLowerCase().includes(filterSubCode.toLowerCase())) return false;

        if (filterType === DocumentType.QP || filterType === DocumentType.IA) {
            if (filterYear && doc.year !== filterYear) return false;
        }
        if (filterType === DocumentType.IA && filterIA && doc.iaType !== filterIA) return false;
        if (filterType === DocumentType.NOTES && filterModule && doc.module !== filterModule) return false;

        return true;
    });

    const handleSelect = (doc) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(doc.id)) {
            newSet.delete(doc.id);
        } else {
            newSet.add(doc.id);
        }
        setSelectedIds(newSet);
        onSelectionChange(documents.filter(d => newSet.has(d.id)));
    };

    const handleDownload = (doc) => {
        if (doc.fileObject) {
            const url = URL.createObjectURL(doc.fileObject);
            const a = document.createElement('a');
            a.href = url;
            a.download = doc.fileName;
            a.click();
            URL.revokeObjectURL(url);
            return;
        }
        if (doc.fileUrl) {
            const a = document.createElement('a');
            a.href = doc.fileUrl;
            a.download = doc.fileName;
            a.click();
            return;
        }
        alert('File URL unavailable. Please refresh the page.');
    };

    const handleView = (doc) => {
        if (doc.fileObject) {
            const url = URL.createObjectURL(doc.fileObject);
            window.open(url, '_blank');
            return;
        }
        if (doc.fileUrl) {
            window.open(doc.fileUrl, '_blank');
            return;
        }
        alert('File preview unavailable. Please refresh the page.');
    };

    const getTheme = (type) => {
        switch (type) {
            case DocumentType.QP:
                return {
                    icon: <FileText className="text-blue-600 dark:text-blue-400" size={24} />,
                    bg: 'bg-blue-50 dark:bg-blue-900/20',
                    border: 'border-blue-200 dark:border-blue-900/50',
                    hoverBorder: 'hover:border-blue-400 dark:hover:border-blue-500/50',
                    accent: 'bg-blue-600 dark:bg-blue-500',
                    text: 'text-blue-700 dark:text-blue-300',
                    badge: 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200'
                };
            case DocumentType.IA:
                return {
                    icon: <FileCode className="text-purple-600 dark:text-purple-400" size={24} />,
                    bg: 'bg-purple-50 dark:bg-purple-900/20',
                    border: 'border-purple-200 dark:border-purple-900/50',
                    hoverBorder: 'hover:border-purple-400 dark:hover:border-purple-500/50',
                    accent: 'bg-purple-600 dark:bg-purple-500',
                    text: 'text-purple-700 dark:text-purple-300',
                    badge: 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200'
                };
            case DocumentType.NOTES:
                return {
                    icon: <BookOpen className="text-emerald-600 dark:text-emerald-400" size={24} />,
                    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
                    border: 'border-emerald-200 dark:border-emerald-900/50',
                    hoverBorder: 'hover:border-emerald-400 dark:hover:border-emerald-500/50',
                    accent: 'bg-emerald-600 dark:bg-emerald-500',
                    text: 'text-emerald-700 dark:text-emerald-300',
                    badge: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200'
                };
            default:
                return {
                    icon: <File className="text-gray-600 dark:text-gray-400" size={24} />,
                    bg: 'bg-gray-50 dark:bg-gray-800',
                    border: 'border-gray-200 dark:border-gray-700',
                    hoverBorder: 'hover:border-gray-400 dark:hover:border-gray-500',
                    accent: 'bg-gray-600 dark:bg-gray-500',
                    text: 'text-gray-700 dark:text-gray-300',
                    badge: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                };
        }
    };

    return (
        <div className="space-y-6">
            {/* Filters Toolbar */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden transition-colors duration-300">
                <div className="absolute top-0 left-0 w-1 h-full bg-rnsit-500"></div>
                <div className="flex items-center gap-2 mb-4 text-sm font-bold text-slate-800 dark:text-slate-100">
                    <div className="p-1.5 bg-rnsit-100 dark:bg-rnsit-900/50 rounded text-rnsit-700 dark:text-rnsit-300">
                        <Filter size={16} />
                    </div>
                    Filter Library
                </div>

                {/* Uploaded By Me Toggle */}
                <div className="mb-4">
                    <button
                        onClick={() => setFilterUploadedByMe(!filterUploadedByMe)}
                        className={`
              flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border
              ${filterUploadedByMe
                                ? 'bg-rnsit-50 dark:bg-rnsit-900/30 text-rnsit-600 dark:text-rnsit-400 border-rnsit-200 dark:border-rnsit-800'
                                : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'}
            `}
                    >
                        <Users size={16} />
                        Uploaded by Me
                    </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    <div className="col-span-2 md:col-span-1">
                        <select
                            className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm rounded-xl focus:ring-2 focus:ring-rnsit-500 focus:border-rnsit-500 block p-2.5 font-medium"
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                        >
                            <option value="ALL">All Document Types</option>
                            {Object.values(DocumentType).map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>

                    <select
                        className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm rounded-xl focus:ring-2 focus:ring-rnsit-500 focus:border-rnsit-500 block p-2.5 font-medium"
                        value={filterDept}
                        onChange={(e) => setFilterDept(e.target.value)}
                    >
                        <option value="">All Departments</option>
                        {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>

                    <select
                        className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm rounded-xl focus:ring-2 focus:ring-rnsit-500 focus:border-rnsit-500 block p-2.5 font-medium"
                        value={filterSem}
                        onChange={(e) => setFilterSem(e.target.value)}
                    >
                        <option value="">All Semesters</option>
                        {SEMESTERS.map(s => <option key={s} value={s}>Sem {s}</option>)}
                    </select>

                    <div className="relative col-span-2 md:col-span-1">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <Search size={14} className="text-slate-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Subject Code"
                            className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm rounded-xl focus:ring-2 focus:ring-rnsit-500 focus:border-rnsit-500 block w-full pl-9 p-2.5 font-medium placeholder-slate-400 dark:placeholder-slate-400"
                            value={filterSubCode}
                            onChange={(e) => setFilterSubCode(e.target.value)}
                        />
                    </div>

                    {/* Dynamic Filters */}
                    {(filterType === 'ALL' || filterType === DocumentType.QP || filterType === DocumentType.IA) && (
                        <select
                            className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm rounded-xl focus:ring-2 focus:ring-rnsit-500 focus:border-rnsit-500 block p-2.5 font-medium"
                            value={filterYear}
                            onChange={(e) => setFilterYear(e.target.value)}
                        >
                            <option value="">All Years</option>
                            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    )}

                    {filterType === DocumentType.IA && (
                        <select
                            className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm rounded-xl focus:ring-2 focus:ring-rnsit-500 focus:border-rnsit-500 block p-2.5 font-medium"
                            value={filterIA}
                            onChange={(e) => setFilterIA(e.target.value)}
                        >
                            <option value="">All IA Types</option>
                            {IA_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    )}

                    {filterType === DocumentType.NOTES && (
                        <select
                            className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm rounded-xl focus:ring-2 focus:ring-rnsit-500 focus:border-rnsit-500 block p-2.5 font-medium"
                            value={filterModule}
                            onChange={(e) => setFilterModule(e.target.value)}
                        >
                            <option value="">All Modules</option>
                            {MODULES.map(m => <option key={m} value={m}>Module {m}</option>)}
                        </select>
                    )}
                </div>
            </div>

            {/* Results Info */}
            <div className="flex justify-between items-center px-1">
                <span className="text-sm text-slate-500 dark:text-slate-400 font-semibold">{filteredDocs.length} documents found</span>
                {selectedIds.size > 0 && (
                    <span className="text-sm text-white font-bold bg-rnsit-600 px-3 py-1 rounded-full shadow-md animate-fade-in flex items-center gap-1">
                        <CheckSquare size={14} />
                        {selectedIds.size} selected
                    </span>
                )}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredDocs.map(doc => {
                    const theme = getTheme(doc.type);
                    const canDelete = currentUser.role === UserRole.ADMIN || currentUser.email === doc.uploaderId;
                    const isSelected = selectedIds.has(doc.id);

                    return (
                        <div
                            key={doc.id}
                            className={`
                group bg-white dark:bg-slate-800 rounded-2xl border-l-4 transition-all duration-300 relative overflow-hidden flex flex-col shadow-sm
                ${isSelected
                                    ? `ring-2 ring-offset-2 ring-rnsit-500 dark:ring-offset-slate-900 transform -translate-y-1 ${theme.border}`
                                    : `hover:shadow-lg hover:-translate-y-1 ${theme.border} hover:border-l-8`}
              `}
                            style={{ borderLeftColor: isSelected ? undefined : undefined }} // let Tailwind handle it via class
                        >
                            {/* Colored header background for visual pop */}
                            <div className={`absolute top-0 right-0 w-32 h-32 ${theme.bg} rounded-bl-full opacity-50 -mr-10 -mt-10 transition-transform group-hover:scale-110 pointer-events-none`}></div>

                            <div className="p-6 flex-1 relative z-10">
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`p-3 rounded-xl bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-700`}>
                                        {theme.icon}
                                    </div>

                                    <div className="flex gap-2">
                                        {(doc.type === DocumentType.QP || doc.type === DocumentType.IA) && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleSelect(doc); }}
                                                className={`p-2 rounded-lg transition-colors shadow-sm ${isSelected ? 'bg-rnsit-600 text-white' : 'bg-white dark:bg-slate-700 text-slate-400 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:border-rnsit-300 hover:text-rnsit-600 dark:hover:text-rnsit-400'}`}
                                                title="Select for AI Analysis"
                                            >
                                                <CheckSquare size={18} />
                                            </button>
                                        )}
                                        {canDelete && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onDelete(doc.id); }}
                                                className="p-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-400 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 hover:border-red-200 transition-colors shadow-sm"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="mb-2">
                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md ${theme.badge}`}>
                                        {doc.type}
                                    </span>
                                </div>
                                <h4 className="font-bold text-slate-900 dark:text-white leading-tight mb-1 truncate text-lg" title={doc.subjectName}>
                                    {doc.subjectName}
                                </h4>
                                <p className="text-sm font-mono text-slate-500 dark:text-slate-400 mb-4 bg-slate-50 dark:bg-slate-900/50 inline-block px-2 py-0.5 rounded border border-slate-100 dark:border-slate-700">
                                    {doc.subjectCode}
                                </p>

                                <div className="flex flex-wrap gap-y-2 gap-x-3 text-xs text-slate-600 dark:text-slate-300 pt-3 border-t border-slate-100 dark:border-slate-700">
                                    <span className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-700 px-2 py-1 rounded">
                                        <Layers size={12} className="text-slate-400" />
                                        <span className="font-semibold">{doc.department}</span>
                                    </span>
                                    <span className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-700 px-2 py-1 rounded">
                                        Sem <span className="font-semibold">{doc.semester}</span>
                                    </span>
                                    {doc.year && <span className="font-bold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">{doc.year}</span>}
                                    {doc.isSupplementary && <span className="font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-900/30 px-2 py-1 rounded border border-rose-100 dark:border-rose-900/50">Supplementary</span>}
                                    {doc.iaType && <span className="font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/30 px-2 py-1 rounded">{doc.iaType}</span>}
                                    {doc.module && <span className="font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded">Mod {doc.module}</span>}
                                    {currentUser?.role === UserRole.ADMIN && (
                                        <span className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-1 rounded border border-amber-100 dark:border-amber-800/50" title={`Uploaded by ${doc.uploaderName}`}>
                                            <Users size={12} />
                                            <span className="font-semibold truncate max-w-[120px]">{doc.uploaderName}</span>
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Action Footer */}
                            <div className="bg-slate-50/80 dark:bg-slate-900/50 backdrop-blur-sm px-6 py-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between group-hover:bg-white dark:group-hover:bg-slate-800 transition-colors">
                                <div className="flex gap-3">
                                    <button onClick={() => handleView(doc)} className="text-slate-500 dark:text-slate-400 hover:text-rnsit-600 dark:hover:text-rnsit-400 transition-colors flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide">
                                        <Eye size={14} /> View
                                    </button>
                                    <button onClick={() => handleDownload(doc)} className="text-slate-500 dark:text-slate-400 hover:text-rnsit-600 dark:hover:text-rnsit-400 transition-colors flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide">
                                        <Download size={14} /> Save
                                    </button>
                                </div>

                                {(doc.type === DocumentType.QP || doc.type === DocumentType.IA) && (
                                    <button
                                        onClick={() => onAnalyzeSingle(doc)}
                                        className="text-xs bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-4 py-1.5 rounded-lg hover:shadow-md hover:shadow-indigo-500/20 hover:-translate-y-0.5 flex items-center gap-1.5 font-bold transition-all shadow-sm border border-transparent"
                                        title="Get AI-generated solutions for this paper"
                                    >
                                        <FileText size={12} /> Solve
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {filteredDocs.length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 transition-colors duration-300">
                    <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-full mb-4">
                        <Filter size={40} className="text-slate-300 dark:text-slate-500" />
                    </div>
                    <p className="text-xl font-bold text-slate-600 dark:text-slate-300">No documents found</p>
                    <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Adjust your filters or upload a new document to get started.</p>
                </div>
            )}
        </div>
    );
};
