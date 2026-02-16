import express from 'express';
import multer from 'multer';
import { Document } from '../models/Document.js';
import { toDocumentResponse } from '../utils/fileHelpers.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB
});

router.get('/', async (_req, res) => {
  try {
    const docs = await Document.find().sort({ createdAt: -1 });
    res.json(docs.map(toDocumentResponse));
  } catch (error) {
    console.error('Fetch documents error:', error);
    res.status(500).json({ message: 'Failed to fetch documents' });
  }
});

router.post('/check-duplicate', async (req, res) => {
  try {
    const { type, department, semester, subjectCode, year, isSupplementary, iaType, module } = req.body;

    const query = { type, department, semester, subjectCode };

    // Add specific fields based on type to ensure accurate checking
    if (year) query.year = year;

    // Handle isSupplementary: false matching logic for legacy docs (where field is missing)
    if (isSupplementary !== undefined) {
      if (isSupplementary === false) {
        query.$or = [{ isSupplementary: false }, { isSupplementary: { $exists: false } }];
      } else {
        query.isSupplementary = true;
      }
    }

    if (iaType) query.iaType = iaType;
    if (module) query.module = module;

    const existing = await Document.findOne(query);
    res.json({ exists: !!existing });
  } catch (error) {
    console.error('Check duplicate error:', error);
    res.status(500).json({ message: 'Failed to check duplicates' });
  }
});

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'File is required' });
    }

    const doc = await Document.create({
      uploaderId: req.body.uploaderId,
      uploaderName: req.body.uploaderName,
      uploadDate: new Date(),
      type: req.body.type,
      department: req.body.department,
      semester: req.body.semester,
      subjectName: req.body.subjectName,
      subjectCode: req.body.subjectCode,
      year: req.body.year,
      iaType: req.body.iaType,
      module: req.body.module,
      fileName: req.file.originalname,
      fileMimeType: req.file.mimetype,
      fileSize: req.file.size,
      fileData: req.file.buffer,
      isSupplementary: req.body.isSupplementary === 'true'
    });

    res.status(201).json(toDocumentResponse(doc));
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({ message: 'Failed to upload document' });
  }
});

router.get('/:id/file', async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ message: 'Document not found' });
    }

    res.setHeader('Content-Type', doc.fileMimeType);
    res.setHeader('Content-Disposition', `inline; filename="${doc.fileName}"`);
    res.send(doc.fileData);
  } catch (error) {
    console.error('Download document error:', error);
    res.status(500).json({ message: 'Failed to fetch file' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const doc = await Document.findByIdAndDelete(req.params.id);
    if (!doc) {
      return res.status(404).json({ message: 'Document not found' });
    }
    res.json({ message: 'Document deleted' });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ message: 'Failed to delete document' });
  }
});

export default router;

