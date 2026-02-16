import express from 'express';
import { Document } from '../models/Document.js';
import { getGeminiClient, fileToGenerativePart, getFileManager } from '../utils/geminiClient.js';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

const router = express.Router();

const cleanAndParseJSON = (text) => {
  if (!text) return [];
  let clean = text.trim();
  clean = clean.replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '').trim();
  try {
    return JSON.parse(clean);
  } catch (e) {
    console.error("JSON Parse Error. Raw text:", text);
    throw e;
  }
};

router.post('/repeats', async (req, res) => {
  try {
    const { documentIds } = req.body;
    if (!Array.isArray(documentIds) || documentIds.length < 2) {
      return res.status(400).json({ message: 'At least two documents are required.' });
    }

    const docs = await Document.find({ _id: { $in: documentIds } });
    if (docs.length !== documentIds.length) {
      return res.status(404).json({ message: 'One or more documents not found.' });
    }

    const client = getGeminiClient();
    // Using 'gemini-2.5-flash-lite' due to 503 errors on latest lite
    const model = client.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

    const parts = [
      {
        text: `
          Analyze the following exam papers to find repeated questions.
          Identify questions that are semantically similar and appear in at least two DIFFERENT documents.
          Ignore minor wording differences.
          
          Output strictly a JSON array with keys: question, count, sources.
          In 'sources', list the exact Filename.
          Example: { "question": "Explain OOP concepts.", "count": 2, "sources": ["2022_Exam.pdf", "2023_Exam.pdf"] }
        `
      }
    ];

    const tempPaths = [];
    const uploadedFiles = [];
    const fileManager = getFileManager();

    for (const doc of docs) {
      const tempPath = path.join(process.cwd(), `temp_repeats_${doc._id}_${doc.fileName}`);
      fs.writeFileSync(tempPath, doc.fileData);
      tempPaths.push(tempPath);

      const mimeType = doc.fileMimeType || "application/pdf";
      const sanitizedDisplayName = doc.fileName.replace(/[^a-zA-Z0-9_]/g, '_');
      console.log(`Uploading file for repeats: path=${tempPath}, size=${fs.statSync(tempPath).size}, mimeType=${mimeType}, displayName=${sanitizedDisplayName}`);
      const uploadResponse = await fileManager.uploadFile(tempPath, { mimeType, displayName: sanitizedDisplayName });
      uploadedFiles.push(uploadResponse.file);

      parts.push({ text: `--- DOCUMENT: ${doc.fileName} ---` });
      parts.push({ fileData: { mimeType: uploadResponse.file.mimeType, fileUri: uploadResponse.file.uri } });
    }

    const response = await model.generateContent({
      contents: [{ role: 'user', parts }]
    });

    // Cleanup temp files
    for (const p of tempPaths) {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
    // Cleanup remote files
    for (const f of uploadedFiles) {
      try { await fileManager.deleteFile(f.name); } catch (e) { console.error("Failed to delete remote file:", e); }
    }

    const content = response.response.text();
    const parsed = JSON.parse(content);

    let results = [];
    if (parsed.results) results = parsed.results;
    else if (Array.isArray(parsed)) results = parsed;
    else if (parsed.repeats) results = parsed.repeats;
    else if (parsed.questions) results = parsed.questions;
    else if (typeof parsed === 'object') {
      const values = Object.values(parsed);
      if (values.length > 0 && Array.isArray(values[0])) results = values[0];
    }

    const filtered = results.filter(item => item.sources && item.sources.length >= 2);
    res.json(filtered);

  } catch (error) {
    console.error('AI repeats error:', error);
    res.status(500).json({ message: 'Failed to analyze documents', error: error.message });
  }
});

router.post('/solve', async (req, res) => {
  try {
    const { documentId } = req.body;
    if (!documentId) return res.status(400).json({ message: 'documentId is required' });

    const doc = await Document.findById(documentId);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    // Create temp file for Gemini upload
    const tempPath = path.join(process.cwd(), `temp_solve_${doc._id}_${doc.fileName}`);
    fs.writeFileSync(tempPath, doc.fileData);

    const client = getGeminiClient();
    // Using 'gemini-2.5-flash-lite' for solving
    const model = client.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

    const prompt = `
      Analyze the attached exam paper document (which may be scanned/handwritten).
      Identify ALL questions (including those with diagrams, graphs, or specific formatting) and provide detailed, step-by-step academic solutions.
      
      STRICT REQUIREMENTS FROM EXPERT ACADEMIC ASSISTANT:

      ═══════════════════════════════════════════════════════════════════
      CRITICAL RULES FOR DIAGRAMS & FORMATTING
      ═══════════════════════════════════════════════════════════════════
1. USE MERMAID.JS for all diagrams, flowcharts, circuits, and graphs.
      2. WRAP Mermaid code in \`\`\`mermaid ... \`\`\` blocks.
      3. For complex circuits or diagrams not easily representable in Mermaid, use clear text descriptions or ASCII as a fallback, but PREFER Mermaid.
      4. Format answers in clear, numbered points (1., 2., 3...) with bullet sub-points (•).
      5. Use proper spacing and line breaks for readability.
      6. All mathematical expressions using standard notation (LaTeX not meant for rendering, use readable text representations like x^2, sqrt(), etc.).
      7. Always provide step-by-step solutions.
      8. FOR COMPARISONS/DIFFERENCES: If the question asks for "Difference between", "Compare", or "Distinguish", YOU MUST USE A MARKDOWN TABLE.

      ═══════════════════════════════════════════════════════════════════
      UNIVERSAL ANSWER FORMAT (ALL SUBJECTS)
      ═══════════════════════════════════════════════════════════════════
      Every answer MUST follow this exact structure:

      QUESTION [NUMBER]: [Write complete question text here]

      Solution:
      1. [First Main Point/Concept Name]
         • Sub-point explaining the concept
         • Formula/Example if needed

      2. [Second Main Point]
         • Clear explanation in bullet points

      3. [Diagram/Circuit/Figure if needed]
         [Brief Title]
         \`\`\`mermaid
         graph TD
         A[Start] --> B[Process]
         B --> C[End]
         \`\`\`
         (OR appropriate Mermaid diagram type: graph, sequenceDiagram, classDiagram, stateDiagram-v2, etc.)

      4. [Calculations/Derivations if applicable]
         Step 1: [Description of step]
         Formula: [Write formula]
         Substitution: [Substitute values]
         Result: [Intermediate result with units]

      5. [Conclusion/Final Answer]
         • Summary of the result.

      FINAL ANSWER:
      ┌─────────────────────────────────────────────────────────────┐
      │ [Write concise final answer with units/conclusion]         │
      └─────────────────────────────────────────────────────────────┘

      CRITICAL OUTPUT FORMAT (REQUIRED FOR SYSTEM PARSING):
      Do NOT output plain text only. Do NOT output standard markdown structure outside the blocks.
      You MUST wrap each Question and Answer block EXACTLY as follows:

      ===QUESTION===
      [Question text here]
      ===ANSWER===
      [The detailed solution following the UNIVERSAL ANSWER FORMAT above]
      ===END===

      Repeat this block for every question found in the document.
      Do not include any preamble or extra text outside these blocks.
    `;

    const fileManager = getFileManager();
    const mimeType = doc.fileMimeType || "application/pdf";
    const sanitizedDisplayName = doc.fileName.replace(/[^a-zA-Z0-9_]/g, '_');
    console.log(`Uploading file for solve: path=${tempPath}, size=${fs.statSync(tempPath).size}, mimeType=${mimeType}, displayName=${sanitizedDisplayName}`);
    const uploadResponse = await fileManager.uploadFile(tempPath, { mimeType, displayName: sanitizedDisplayName });

    const response = await model.generateContent({
      contents: [{
        role: 'user', parts: [
          { fileData: { mimeType: uploadResponse.file.mimeType, fileUri: uploadResponse.file.uri } },
          { text: prompt }
        ]
      }]
    });

    // Cleanup temp file
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }

    // Cleanup remote file
    try {
      await fileManager.deleteFile(uploadResponse.file.name);
    } catch (e) {
      console.error("Failed to delete remote file:", e);
    }

    const text = response.response.text();

    const results = [];
    const blocks = text.split('===QUESTION===');

    for (const block of blocks) {
      if (!block.trim()) continue;

      const answerSplit = block.split('===ANSWER===');
      if (answerSplit.length !== 2) continue;

      const question = answerSplit[0].trim();
      const rawAnswer = answerSplit[1].split('===END===')[0].trim();

      if (question && rawAnswer) {
        results.push({
          question: question,
          answer: rawAnswer
        });
      }
    }

    res.json(results);

  } catch (error) {
    console.error('AI solve error:', error);
    res.status(500).json({ message: 'Failed to solve document', error: error.message });
  }
});

router.post('/solutions', async (req, res) => {
  try {
    const { questions } = req.body;
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: 'questions array is required' });
    }



    const client = getGeminiClient();
    // Using 'gemini-2.5-flash-lite' for solutions
    const model = client.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

    const prompt = `
        Provide detailed, step-by-step academic solutions for the following questions.
        
        STRICT REQUIREMENTS FROM EXPERT ACADEMIC ASSISTANT:

        ═══════════════════════════════════════════════════════════════════
        CRITICAL RULES FOR DIAGRAMS & FORMATTING
        ═══════════════════════════════════════════════════════════════════
        1. USE MERMAID.JS for all diagrams, flowcharts, circuits, and graphs.
        2. WRAP Mermaid code in \`\`\`mermaid ... \`\`\` blocks.
        3. For complex circuits or diagrams not easily representable in Mermaid, use clear text descriptions or ASCII as a fallback, but PREFER Mermaid.
        4. Format answers in clear, numbered points (1., 2., 3...) with bullet sub-points (•).
        5. Use proper spacing and line breaks for readability.
        6. All mathematical expressions using standard notation (LaTeX not meant for rendering, use readable text representations like x^2, sqrt(), etc.).
        7. Always provide step-by-step solutions.
        8. FOR COMPARISONS/DIFFERENCES: If the question asks for "Difference between", "Compare", or "Distinguish", YOU MUST USE A MARKDOWN TABLE.

        ═══════════════════════════════════════════════════════════════════
        UNIVERSAL ANSWER FORMAT (ALL SUBJECTS)
        ═══════════════════════════════════════════════════════════════════
        Every answer MUST follow this exact structure:

        QUESTION [NUMBER]: [Write complete question text here]

        Solution:
        1. [First Main Point/Concept Name]
           • Sub-point explaining the concept
           • Formula/Example if needed

        2. [Second Main Point]
           • Clear explanation in bullet points

        3. [Diagram/Circuit/Figure if needed]
           [Brief Title]
           \`\`\`mermaid
           graph TD
           A[Start] --> B[Process]
           B --> C[End]
           \`\`\`
           (OR appropriate Mermaid diagram type: graph, sequenceDiagram, classDiagram, stateDiagram-v2, etc.)

        4. [Calculations/Derivations if applicable]
           Step 1: [Description of step]
           Formula: [Write formula]
           Substitution: [Substitute values]
           Result: [Intermediate result with units]

        5. [Conclusion/Final Answer]
           • Summary of the result.

        FINAL ANSWER:
        ┌─────────────────────────────────────────────────────────────┐
        │ [Write concise final answer with units/conclusion]         │
        └─────────────────────────────────────────────────────────────┘

        CRITICAL OUTPUT FORMAT (REQUIRED FOR SYSTEM PARSING):
        Do NOT output plain text only. Do NOT output standard markdown structure outside the blocks.
        You MUST wrap each Question and Answer block EXACTLY as follows:

        ===QUESTION===
        [Question Text]
        ===ANSWER===
        [The detailed solution following the UNIVERSAL ANSWER FORMAT above]
        ===END===

        Repeat this block for every question provided below.

        Questions:
        ${questions.map((q, i) => `Q${i + 1}: ${q.question}`).join('\n')}
      `;

    const response = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    const text = response.response.text();

    const results = [];
    const blocks = text.split('===QUESTION===');

    for (const block of blocks) {
      if (!block.trim()) continue;

      const answerSplit = block.split('===ANSWER===');
      if (answerSplit.length < 2) continue;

      const questionText = answerSplit[0].trim();
      const rawAnswerBody = answerSplit.slice(1).join('===ANSWER===');
      const answer = rawAnswerBody.split('===END===')[0].trim();

      if (questionText && answer) {
        const cleanQ = questionText.replace(/^Q\d+\s*:\s*/i, '').trim();
        results.push({
          question: cleanQ,
          answer: answer
        });
      }
    }

    res.json(results);

  } catch (error) {
    console.error('AI solutions error:', error);
    res.status(500).json({ message: 'Failed to generate solutions', error: error.message });
  }
});


router.post('/deep-analyze', async (req, res) => {
  try {
    const { documentIds } = req.body;
    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({ message: 'At least one document is required.' });
    }

    const docs = await Document.find({ _id: { $in: documentIds } });
    if (docs.length !== documentIds.length) {
      return res.status(404).json({ message: 'One or more documents not found.' });
    }



    const client = getGeminiClient();
    // Using 'gemini-2.5-flash-lite' for deep analysis
    const model = client.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

    const parts = [
      {
        text: `
          Analyze the attached exam papers.
          1. Extract all individual questions clearly.
          2. Identify exact duplicate questions.
          3. Identify semantically similar questions.
          4. Identify questions that may look different but produce the same final answer.
          5. Group related questions under a common concept tag.
          6. Assign similarity percentage(0–100 %).
          7. Mark each as: "Duplicate", "Similar", "Same Answer Type".
          8. Count how many times each question (or its similar variant) repeats across the papers. Ensure you count ALL occurrences (e.g., 2, 3, 4, 5, etc.).
          9. CRITICAL: Do NOT include unique questions. Only include questions that appear in at least two different papers.

          Return output in structured JSON format:
    {
    "total_repeated_questions": number,
    "groups": [
      {
        "concept": "Concept Name",
        "questions": [
          {
            "question_text": "...",
            "type": "Duplicate/Similar/Same Answer Type",
            "similar_to_question_no": "Q2", // Optional
            "similarity_percentage": 85,
            "repeat_count": 2, // Minimum 2.
            "sources": ["file1.pdf", "file2.pdf"] // Filenames where this question appears
          }
        ]
      }
    ]
    }
    `
      }
    ];

    const tempPaths = [];


    const uploadedFiles = [];
    const fileManager = getFileManager();

    for (const doc of docs) {
      const tempPath = path.join(process.cwd(), `temp_deep_${doc._id}_${doc.fileName}`);
      fs.writeFileSync(tempPath, doc.fileData);
      tempPaths.push(tempPath);

      const mimeType = doc.fileMimeType || "application/pdf";
      const sanitizedDisplayName = doc.fileName.replace(/[^a-zA-Z0-9_]/g, '_');
      console.log(`Uploading file for deep-analyze: path=${tempPath}, size=${fs.statSync(tempPath).size}, mimeType=${mimeType}, displayName=${sanitizedDisplayName}`);
      const uploadResponse = await fileManager.uploadFile(tempPath, { mimeType, displayName: sanitizedDisplayName });
      uploadedFiles.push(uploadResponse.file);

      parts.push({ text: `-- - DOCUMENT: ${doc.fileName} -- - ` });
      parts.push({ fileData: { mimeType: uploadResponse.file.mimeType, fileUri: uploadResponse.file.uri } });
    }

    const response = await model.generateContent({
      contents: [{ parts }],
      generationConfig: { responseMimeType: 'application/json' }
    });

    // Cleanup temp files
    for (const p of tempPaths) {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
    // Cleanup remote files
    for (const f of uploadedFiles) {
      try { await fileManager.deleteFile(f.name); } catch (e) { console.error("Failed to delete remote file:", e); }
    }

    const content = response.response.text();
    const parsed = JSON.parse(content);
    console.log("Deep Analysis Result:", JSON.stringify(parsed, null, 2));

    let finalResult = parsed;
    if (parsed.results) finalResult = parsed.results;
    if (!finalResult.groups && parsed.groups) finalResult = parsed;

    if (finalResult.groups) {
      finalResult.groups = finalResult.groups.map(group => ({
        ...group,
        questions: group.questions.filter(q => q.repeat_count >= 2)
      })).filter(group => group.questions.length > 0);

      finalResult.total_repeated_questions = finalResult.groups.reduce((sum, g) => sum + g.questions.length, 0);
    } else {
      finalResult = { total_repeated_questions: 0, groups: [] };
    }

    res.json(finalResult);

  } catch (error) {
    console.error('AI Deep Analysis Error:', error);
    res.status(500).json({ message: 'Analysis failed', error: error.message });
  }
});

export default router;
