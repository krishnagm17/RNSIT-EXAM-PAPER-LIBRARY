import React, { useState, useEffect } from 'react';
import { generateSolutionsForQuestions } from '@app/services/aiService';
import { Sparkles, Loader2, Download, ChevronDown, AlertCircle, Copy, BrainCircuit, ArrowLeft, Tag, Layers, CheckCircle2, CopyCheck } from 'lucide-react';
import { jsPDF } from "jspdf";
import ReactMarkdown from 'react-markdown';
import mermaid from 'mermaid';

const MermaidChart = ({ chart }) => {
    const [svg, setSvg] = useState('');
    const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;

    useEffect(() => {
        const renderChart = async () => {
            try {
                mermaid.initialize({ startOnLoad: false, theme: 'default', suppressErrorRendering: true });
                if (await mermaid.parse(chart)) {
                    const { svg } = await mermaid.render(id, chart);
                    setSvg(svg);
                }
            } catch (e) {
                console.error("Mermaid Error", e);
                setSvg(`<div class="text-red-500 text-xs p-2 border border-red-200 rounded bg-red-50">Unable to render diagram.</div>`);
            }
        };
        renderChart();
    }, [chart, id]);

    return <div className="mermaid-diagram flex justify-center py-4 overflow-x-auto" dangerouslySetInnerHTML={{ __html: svg }} />;
};

export const AIAnalysis = ({ results, isSinglePaper, onClose }) => {
    // Flatten questions for state management if it's a Deep Analysis group structure
    // Flatten questions for state management if it's a Deep Analysis group structure
    const initializeQuestions = () => {
        if (results && results.groups && Array.isArray(results.groups)) {
            return results.groups.flatMap(g =>
                Array.isArray(g.questions) ? g.questions.map(q => ({ ...q, concept: g.concept })) : []
            );
        }
        if (Array.isArray(results)) {
            return results;
        }
        console.warn("AIAnalysis: Unrecognized results format", results);
        return [];
    };

    const [questions, setQuestions] = useState(initializeQuestions());
    const [loadingSolutions, setLoadingSolutions] = useState(false);
    const [expandedId, setExpandedId] = useState(null);

    // If 'results' prop changes, update state
    useEffect(() => {
        setQuestions(initializeQuestions());
    }, [results]);

    const handleGenerateSolutions = async () => {
        setLoadingSolutions(true);
        try {
            const solved = await generateSolutionsForQuestions(questions);
            setQuestions(solved);
            if (solved.length > 0) setExpandedId(0);
        } catch (e) {
            alert("Failed to generate solutions.");
        } finally {
            setLoadingSolutions(false);
        }
    };

    const handleDownloadReport = () => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20; // Increased margin for better safety
        const maxLineWidth = pageWidth - (margin * 2);
        let yPosition = 20;

        // Helper for Footer
        const addFooter = (pageNumber) => {
            const footerY = pageHeight - 10;
            doc.setFont("helvetica", "italic");
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5); // Footer line
            doc.text(`RNSIT Exam Library - Page ${pageNumber}`, pageWidth / 2, footerY, { align: "center" });
        };

        // Helper for Page Break
        const checkPageBreak = (neededSpace) => {
            if (yPosition + neededSpace > pageHeight - 20) { // Keep 20px bottom margin for footer
                addFooter(doc.internal.getNumberOfPages());
                doc.addPage();
                yPosition = 20;
                return true;
            }
            return false;
        };

        // Title Page
        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        doc.setTextColor(30, 58, 138); // Indigo-900
        doc.text("RNSIT Exam Library", pageWidth / 2, 80, { align: "center" });

        doc.setFontSize(16);
        doc.setTextColor(50);
        doc.text("AI Analysis Report", pageWidth / 2, 95, { align: "center" });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, 110, { align: "center" });

        doc.addPage();
        yPosition = 20;

        const cleanText = (text) => text ? text.replace(/[^\x20-\x7E\n\r]/g, '').replace(/\*\*/g, '').replace(/###/g, '').replace(/`/g, '') : '';

        let questionCount = 0;

        questions.forEach((q, i) => {
            questionCount++;

            // Concept Header
            if (q.concept && (i === 0 || questions[i - 1].concept !== q.concept)) {
                checkPageBreak(30);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(14);
                doc.setTextColor(79, 70, 229); // Indigo-600
                doc.text(`Concept: ${cleanText(q.concept)}`, margin, yPosition);
                yPosition += 10;
                doc.setDrawColor(224, 231, 255); // Indigo-100
                doc.line(margin, yPosition, pageWidth - margin, yPosition);
                yPosition += 10;
            }

            // Question Header
            checkPageBreak(25);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(12);
            doc.setTextColor(0);

            const qPrefix = `Q${i + 1}: `;
            const qContent = cleanText(q.question_text || q.question);
            const splitQ = doc.splitTextToSize(qPrefix + qContent, maxLineWidth);

            // Check if question itself needs a page break
            if (checkPageBreak(splitQ.length * 7 + 15)) {
                // re-print header if page broke? No, just print.
            }

            doc.text(splitQ, margin, yPosition);
            yPosition += (splitQ.length * 6) + 4;

            // Metadata
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.setTextColor(100);
            let meta = [];
            if (q.type) meta.push(`Type: ${cleanText(q.type)}`);
            if (q.repeat_count) meta.push(`Freq: ${q.repeat_count}`);
            if (q.similarity_percentage) meta.push(`Sim: ${q.similarity_percentage}%`);

            if (meta.length > 0) {
                doc.text(meta.join(' | '), margin, yPosition);
                yPosition += 8;
            }

            // Answer Content
            if (q.answer) {
                const answerText = cleanText(q.answer);
                const splitA = doc.splitTextToSize(answerText, maxLineWidth);

                // For answers, we can split them across pages if they are long
                // But we seek to keep at least the start with the question if possible

                doc.setFont("courier", "normal"); // Use courier for code-like alignment (tables charts) or regular?
                // Actually sticking to helvetica for readability, maybe formatting code blocks differently?
                doc.setFont("helvetica", "normal");
                doc.setFontSize(10);
                doc.setTextColor(50);

                // Add a small indent or background? Just indent.
                const answerMargin = margin;

                // Print line by line to handle page breaks gracefully within the answer
                splitA.forEach(line => {
                    if (checkPageBreak(7)) {
                        doc.setFont("helvetica", "normal");
                        doc.setFontSize(10);
                        doc.setTextColor(50);
                    }
                    doc.text(line, answerMargin, yPosition);
                    yPosition += 5;
                });

                yPosition += 10; // Spacing after answer
            } else {
                yPosition += 5;
            }

            // Separator between questions
            if (i < questions.length - 1) {
                checkPageBreak(10);
                doc.setDrawColor(240);
                doc.line(margin, yPosition, pageWidth - margin, yPosition);
                yPosition += 10;
            }
        });

        // Add footer to the last page (others handled by page break)
        addFooter(doc.internal.getNumberOfPages());

        doc.save(`RNSIT_AI_Solutions_${new Date().getTime()}.pdf`);
    };

    // Grouping for render
    const renderedGroups = results.groups || [{ concept: 'Questions', questions: results }];

    return (
        <div className="bg-white dark:bg-slate-800 lg:rounded-3xl lg:shadow-2xl border border-indigo-100 dark:border-indigo-900 flex flex-col h-full lg:max-h-[85vh] overflow-hidden ring-4 ring-indigo-50/50 dark:ring-indigo-900/30 transition-colors duration-300">
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-violet-600 to-indigo-600 relative overflow-hidden flex-none">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                <div className="flex justify-between items-start mb-6 relative z-10">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                                <BrainCircuit className="text-white" size={24} />
                            </div>
                            Deep Analysis Report
                        </h2>
                        <p className="text-indigo-100 text-sm mt-2 font-medium max-w-sm leading-relaxed">
                            {results.groups
                                ? `Analyzed ${results.total_repeated_questions || results.total_questions || questions.length} questions across ${results.groups.length} concepts.`
                                : 'Analysis complete.'}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 px-4 rounded-xl flex items-center gap-2 transition-all">
                        <ArrowLeft size={20} /> <span className="font-bold text-sm">Back</span>
                    </button>
                </div>
                <div className="flex gap-3 relative z-10">
                    {!questions[0]?.answer && (
                        <button onClick={handleGenerateSolutions} disabled={loadingSolutions} className="flex-1 bg-white text-indigo-600 px-4 py-3 rounded-xl text-sm font-bold hover:bg-indigo-50 flex items-center justify-center gap-2 disabled:opacity-70 shadow-lg transition-all">
                            {loadingSolutions ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />} Generate Solutions
                        </button>
                    )}
                    <button onClick={handleDownloadReport} className="bg-indigo-700/50 border border-white/20 text-white px-4 py-3 rounded-xl text-sm font-bold hover:bg-indigo-700 flex items-center gap-2 transition-colors backdrop-blur-sm">
                        <Download size={18} /> Save PDF
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto p-6 space-y-8 bg-slate-50 dark:bg-slate-900/50 flex-1">
                {questions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-500 dark:text-slate-400">
                        <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-full mb-4">
                            <AlertCircle size={32} />
                        </div>
                        <p className="font-bold text-lg">No questions found.</p>
                        <p className="text-sm">Try selecting different papers or ensuring the text is clear.</p>
                    </div>
                ) : (
                    renderedGroups.map((group, gIdx) => (
                        <div key={gIdx} className="space-y-4">
                            {group.concept !== 'Questions' && (
                                <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold text-lg uppercase tracking-wide px-2">
                                    <Tag size={18} /> {group.concept}
                                </div>
                            )}

                            <div className="grid gap-4">
                                {group.questions.map((q, qIdx) => {
                                    // Find the question in the flattened state to get its answer
                                    const flatQ = questions.find(fq => (fq.question_text || fq.question) === (q.question_text || q.question));
                                    const answer = flatQ?.answer;
                                    const uniqueId = `${gIdx}-${qIdx}`;
                                    const isExpanded = expandedId === uniqueId;

                                    return (
                                        <div key={uniqueId} className={`bg-white dark:bg-slate-800 rounded-2xl border transition-all duration-300 overflow-hidden ${isExpanded ? 'shadow-xl border-indigo-200 dark:border-indigo-700 ring-2 ring-indigo-100 dark:ring-indigo-900/50' : 'shadow-sm border-slate-200 dark:border-slate-700 hover:shadow-md'}`}>
                                            <div onClick={() => setExpandedId(isExpanded ? null : uniqueId)} className="p-5 cursor-pointer relative">
                                                {isExpanded && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-500"></div>}
                                                <div className="flex justify-between items-start gap-4">
                                                    <div className="flex-1 space-y-3">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            {q.type && (
                                                                <span className={`text-xs px-2.5 py-1 rounded-md border font-bold ${q.type === 'Duplicate' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300' :
                                                                    q.type === 'Unique' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300' :
                                                                        'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300'
                                                                    }`}>
                                                                    {q.type}
                                                                </span>
                                                            )}
                                                            {q.repeat_count > 1 && (
                                                                <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 border border-amber-200 dark:border-amber-800">
                                                                    <CopyCheck size={14} /> Repeated {q.repeat_count} times
                                                                </span>
                                                            )}
                                                            {q.similarity_percentage > 0 && (
                                                                <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs px-2 py-1 rounded-md font-mono">
                                                                    {q.similarity_percentage}% Match
                                                                </span>
                                                            )}
                                                        </div>
                                                        <h3 className="text-slate-800 dark:text-slate-100 font-bold leading-relaxed text-base">
                                                            {q.question_text || q.question}
                                                        </h3>



                                                        {q.sources && (
                                                            <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 mt-2">
                                                                <Layers size={12} />
                                                                Found in: {q.sources.join(', ')}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className={`mt-1 p-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-300 transition-all ${isExpanded ? 'rotate-180 bg-indigo-100 text-indigo-600' : ''}`}>
                                                        <ChevronDown size={20} />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className={`transition-all duration-500 ease-in-out border-t border-indigo-50 dark:border-slate-700 bg-gradient-to-b from-indigo-50/50 to-white dark:from-slate-800 dark:to-slate-800 ${isExpanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                                                <div className="p-6">
                                                    <div className="flex items-center gap-2 mb-4">
                                                        <div className="p-1.5 bg-indigo-600 rounded-lg text-white shadow-md"><Sparkles size={14} /></div>
                                                        <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-200 uppercase tracking-wider">AI Solution</h4>
                                                    </div>
                                                    {answer ? (
                                                        <div className="prose prose-sm prose-indigo dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-900 p-5 rounded-2xl border border-indigo-100 dark:border-slate-700 shadow-sm font-medium">
                                                            <ReactMarkdown components={{
                                                                code({ node, inline, className, children, ...props }) {
                                                                    const match = /language-(\w+)/.exec(className || '');
                                                                    const isMermaid = match && match[1] === 'mermaid';

                                                                    if (!inline && isMermaid) {
                                                                        return <MermaidChart chart={String(children).replace(/\n$/, '')} />;
                                                                    }

                                                                    return match ? (
                                                                        <code className={className} {...props}>
                                                                            {children}
                                                                        </code>
                                                                    ) : (
                                                                        <code className="bg-slate-200 dark:bg-slate-700 rounded px-1 py-0.5 text-sm" {...props}>
                                                                            {children}
                                                                        </code>
                                                                    );
                                                                }
                                                            }}>{answer}</ReactMarkdown>
                                                        </div>
                                                    ) : (
                                                        <div className="text-sm text-slate-500 italic px-2 py-4 text-center bg-white/50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-600">
                                                            Solution pending. Click "Generate Solutions" above.
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )))}
            </div>
        </div>
    );
};
