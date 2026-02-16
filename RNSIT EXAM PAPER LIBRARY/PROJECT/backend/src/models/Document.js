import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema(
  {

    uploaderId: { type: String, required: true },
    uploaderName: { type: String, required: true },
    uploadDate: { type: Date, default: Date.now },
    type: { type: String, required: true },
    department: { type: String, required: true },
    semester: { type: String, required: true },
    subjectName: { type: String, required: true },
    subjectCode: { type: String, required: true },
    year: { type: String },
    iaType: { type: String },
    module: { type: String },
    fileName: { type: String, required: true },
    fileMimeType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    fileData: { type: Buffer, required: true },
    isSupplementary: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const Document = mongoose.model('Document', documentSchema);

