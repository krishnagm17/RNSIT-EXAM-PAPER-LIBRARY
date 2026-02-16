import { apiClient } from "./apiClient.js";

export const analyzePapersForRepeats = async (
    documentIds
) => {
    return apiClient.post('/ai/repeats', { documentIds });
};

export const generateSolutionsForQuestions = async (
    questions
) => {
    const questionsToSend = questions.map(q => ({
        question: q.question_text || q.question
    }));

    const answers = await apiClient.post(
        '/ai/solutions',
        { questions: questionsToSend }
    );

    return questions.map((q, idx) => {
        const qText = q.question_text || q.question;
        // Try exact match first, then index fallback
        const match =
            answers.find((a) => a.question === qText) ||
            answers.find((a) => a.question.includes(qText.slice(0, 20))) ||
            answers[idx];

        if (!match?.answer) {
            console.warn(`No solution found for question: ${qText.slice(0, 50)}...`);
        }

        return {
            ...q,
            answer: match?.answer || q.answer || 'Solution generation failed. Please try again.'
        };
    });
};

export const solveSinglePaper = async (documentId) => {
    const response = await apiClient.post('/ai/solve', { documentId });
    return response;
};

export const deepAnalyzePapers = async (documentIds) => {
    const response = await apiClient.post('/ai/deep-analyze', { documentIds });
    return response;
};
