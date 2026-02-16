import React, { useState, useEffect } from 'react';
import { documentService } from '@app/services/documentService';
import { DocumentType } from '@app/types';
import { DEPARTMENTS, SEMESTERS, YEARS, IA_TYPES, MODULES } from '@app/constants';
import { X, Upload, FileCheck, FileText, FileCode, BookOpen, AlertCircle } from 'lucide-react';

export const UploadModal = ({ user, onUpload, onClose }) => {
    const [docType, setDocType] = useState(DocumentType.QP);
    const [department, setDepartment] = useState(DEPARTMENTS[0]);
    const [semester, setSemester] = useState(SEMESTERS[0]);
    const [subjectName, setSubjectName] = useState('');
    const [subjectCode, setSubjectCode] = useState('');
    const [year, setYear] = useState(YEARS[0]);
    const [iaType, setIaType] = useState(IA_TYPES[0]);
    const [module, setModule] = useState(MODULES[0]);
    const [isSupplementary, setIsSupplementary] = useState(false);
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [isDuplicate, setIsDuplicate] = useState(false);

    useEffect(() => {
        const check = async () => {
            if (!subjectCode || subjectCode.length < 3) return;
            try {
                const criteria = {
                    type: docType,
                    department,
                    semester,
                    subjectCode,
                    // Only include relevant fields
                    ...(docType !== DocumentType.NOTES && { year }),
                    ...(docType === DocumentType.QP && { isSupplementary }),
                    ...(docType === DocumentType.IA && { iaType }),
                    ...(docType === DocumentType.NOTES && { module })
                };
                const { exists } = await documentService.checkDuplicate(criteria);
                setIsDuplicate(exists);
            } catch (e) {
                console.error("Duplicate check failed", e);
            }
        };
        const timeout = setTimeout(check, 500); // Debounce
        return () => clearTimeout(timeout);
    }, [docType, department, semester, subjectCode, year, isSupplementary, iaType, module]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!file) {
            setError('Please select a file to upload.');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('uploaderId', user.email);
        formData.append('uploaderName', user.name);
        formData.append('type', docType);
        formData.append('department', department);
        formData.append('semester', semester);
        formData.append('subjectName', subjectName);
        formData.append('subjectCode', subjectCode);

        if (docType === DocumentType.QP) {
            formData.append('isSupplementary', isSupplementary);
        }

        if (docType !== DocumentType.NOTES && year) {
            formData.append('year', year);
        }
        if (docType === DocumentType.IA && iaType) {
            formData.append('iaType', iaType);
        }
        if (docType === DocumentType.NOTES && module) {
            formData.append('module', module);
        }

        setUploading(true);
        try {
            await onUpload(formData);
            onClose();
        } catch (err) {
            setError(err?.message || 'Failed to upload document.');
        } finally {
            setUploading(false);
        }
    };

    const handleSubjectCodeChange = (e) => {
        // Only allow Capital Letters and Numbers
        const value = e.target.value.toUpperCase();
        if (/^[A-Z0-9]*$/.test(value)) {
            setSubjectCode(value);
        }
    };

    const getDocTypeIcon = (type) => {
        switch (type) {
            case DocumentType.QP: return <FileText size={18} />;
            case DocumentType.IA: return <FileCode size={18} />;
            case DocumentType.NOTES: return <BookOpen size={18} />;
        }
    };

    const getDocTypeColor = (type, isSelected) => {
        if (!isSelected) return 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-600';
        switch (type) {
            case DocumentType.QP: return 'bg-blue-600 text-white border-blue-600 shadow-blue-200 dark:shadow-none shadow-lg';
            case DocumentType.IA: return 'bg-purple-600 text-white border-purple-600 shadow-purple-200 dark:shadow-none shadow-lg';
            case DocumentType.NOTES: return 'bg-emerald-600 text-white border-emerald-600 shadow-emerald-200 dark:shadow-none shadow-lg';
        }
    };

    // Determine accepted file types
    const acceptedFileTypes = docType === DocumentType.NOTES
        ? ".pdf,.ppt,.pptx"
        : ".pdf";

    return (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up transform transition-all ring-1 ring-white/50 dark:ring-slate-700">

                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 sticky top-0 z-10">
                    <div>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Upload Material</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Add resources to the RNSIT Library</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-full transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-8 bg-slate-50/50 dark:bg-slate-900/50">
                    {error && (
                        <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800 text-red-600 dark:text-red-300 rounded-2xl text-sm font-semibold">
                            {error}
                        </div>
                    )}
                    {isDuplicate && (
                        <div className={`p-4 rounded-2xl text-sm font-bold flex items-center gap-2 animate-fade-in ${docType === DocumentType.NOTES
                                ? 'bg-amber-50 dark:bg-amber-900/30 border border-amber-100 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                                : 'bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800 text-red-700 dark:text-red-300'
                            }`}>
                            <AlertCircle size={20} />
                            <span>
                                {docType === DocumentType.NOTES
                                    ? "As it already exists, check whether it is the same."
                                    : "This document already exists in the library. Uploading is disabled."}
                            </span>
                        </div>
                    )}
                    {/* Document Type Selection */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">Document Type</label>
                        <div className="grid grid-cols-3 gap-4">
                            {Object.values(DocumentType).map((type) => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => {
                                        setDocType(type);
                                        setFile(null); // Reset file if type changes to ensure validation
                                    }}
                                    className={`p-4 text-sm font-bold rounded-2xl border flex flex-col items-center gap-2 transition-all duration-200 transform active:scale-95 ${getDocTypeColor(type, docType === type)}`}
                                >
                                    {getDocTypeIcon(type)}
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Department</label>
                            <select
                                value={department}
                                onChange={(e) => setDepartment(e.target.value)}
                                className="w-full border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-rnsit-500 focus:border-rnsit-500 transition-shadow outline-none border font-medium text-slate-800 dark:text-white"
                            >
                                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Semester</label>
                            <select
                                value={semester}
                                onChange={(e) => setSemester(e.target.value)}
                                className="w-full border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-rnsit-500 focus:border-rnsit-500 transition-shadow outline-none border font-medium text-slate-800 dark:text-white"
                            >
                                {SEMESTERS.map(s => <option key={s} value={s}>Semester {s}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Subject Name</label>
                            <input
                                type="text"
                                required
                                value={subjectName}
                                onChange={(e) => setSubjectName(e.target.value)}
                                className="w-full border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-rnsit-500 focus:border-rnsit-500 transition-shadow outline-none border font-medium placeholder-slate-400 dark:placeholder-slate-400 text-slate-800 dark:text-white"
                                placeholder="e.g. Database Management"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Subject Code</label>
                            <input
                                type="text"
                                required
                                value={subjectCode}
                                onChange={handleSubjectCodeChange}
                                className="w-full border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-rnsit-500 focus:border-rnsit-500 transition-shadow outline-none border font-medium placeholder-slate-400 dark:placeholder-slate-400 text-slate-800 dark:text-white"
                                placeholder="e.g. BCS501"
                            />
                            <p className="text-xs text-slate-500 dark:text-slate-400 ml-1">Capital letters and numbers only.</p>
                        </div>
                    </div>

                    {/* Conditional Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {docType !== DocumentType.NOTES && (
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Year</label>
                                <select
                                    value={year}
                                    onChange={(e) => setYear(e.target.value)}
                                    className="w-full border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-rnsit-500 focus:border-rnsit-500 transition-shadow outline-none border font-medium text-slate-800 dark:text-white"
                                >
                                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                        )}

                        {docType === DocumentType.QP && (
                            <div className="flex items-center space-x-3 h-auto min-h-[50px] px-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600">
                                <input
                                    type="checkbox"
                                    id="isSupplementary"
                                    checked={isSupplementary}
                                    onChange={(e) => setIsSupplementary(e.target.checked)}
                                    className="w-5 h-5 text-rnsit-600 rounded focus:ring-rnsit-500 border-gray-300 cursor-pointer"
                                />
                                <label htmlFor="isSupplementary" className="text-sm font-bold text-slate-700 dark:text-slate-300 select-none cursor-pointer">
                                    Supplementary Paper?
                                </label>
                            </div>
                        )}

                        {docType === DocumentType.IA && (
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Assessment Type</label>
                                <select
                                    value={iaType}
                                    onChange={(e) => setIaType(e.target.value)}
                                    className="w-full border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-rnsit-500 focus:border-rnsit-500 transition-shadow outline-none border font-medium text-slate-800 dark:text-white"
                                >
                                    {IA_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                        )}

                        {docType === DocumentType.NOTES && (
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Module Number</label>
                                <select
                                    value={module}
                                    onChange={(e) => setModule(e.target.value)}
                                    className="w-full border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-rnsit-500 focus:border-rnsit-500 transition-shadow outline-none border font-medium text-slate-800 dark:text-white"
                                >
                                    {MODULES.map(m => <option key={m} value={m}>Module {m}</option>)}
                                </select>
                            </div>
                        )}
                    </div>

                    <div className={`
            border-3 border-dashed rounded-2xl p-8 text-center transition-all duration-300 cursor-pointer
            ${file ? 'border-rnsit-500 bg-rnsit-50/50 dark:bg-rnsit-900/20' : 'border-slate-300 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-700 hover:border-rnsit-400'}
          `}>
                        <input
                            type="file"
                            accept={acceptedFileTypes}
                            required
                            onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                            className="hidden"
                            id="file-upload"
                        />
                        <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                            {file ? (
                                <div className="text-white mb-3 p-4 bg-rnsit-600 rounded-full shadow-lg animate-bounce-slow">
                                    <FileCheck size={36} />
                                </div>
                            ) : (
                                <div className="text-rnsit-500 mb-3 p-4 bg-rnsit-100 dark:bg-rnsit-900/50 rounded-full">
                                    <Upload size={36} />
                                </div>
                            )}

                            <span className="text-lg text-slate-800 dark:text-slate-200 font-bold mt-2">
                                {file ? file.name : "Click to upload file"}
                            </span>
                            <span className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
                                {file
                                    ? `${(file.size / 1024 / 1024).toFixed(2)} MB`
                                    : docType === DocumentType.NOTES
                                        ? "Supports PDF, PPT, PPTX"
                                        : "Supports PDF Only"}
                            </span>
                        </label>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-600 font-bold transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={uploading || (isDuplicate && docType !== DocumentType.NOTES)}
                            className={`px-8 py-3 text-white rounded-xl font-bold shadow-lg transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0 ${(isDuplicate && docType !== DocumentType.NOTES)
                                    ? 'bg-slate-400 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-rnsit-600 to-rnsit-700 hover:from-rnsit-700 hover:to-rnsit-800 shadow-rnsit-500/30'
                                }`}
                        >
                            {uploading
                                ? 'Uploading...'
                                : (isDuplicate && docType !== DocumentType.NOTES)
                                    ? 'Already Exists'
                                    : 'Upload Document'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
