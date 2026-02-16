export const buildFilePart = (doc) => {
  const base64Data = doc.fileData.toString('base64');
  return {
    inlineData: {
      data: base64Data,
      mimeType: doc.fileMimeType
    }
  };
};

export const toDocumentResponse = (doc) => ({
  id: doc._id.toString(),
  uploaderId: doc.uploaderId,
  uploaderName: doc.uploaderName,
  uploadDate: doc.uploadDate,
  type: doc.type,
  department: doc.department,
  semester: doc.semester,
  subjectName: doc.subjectName,
  subjectCode: doc.subjectCode,
  year: doc.year,
  iaType: doc.iaType,
  module: doc.module,
  fileName: doc.fileName,
  fileSize: doc.fileSize,
  fileMimeType: doc.fileMimeType,
  fileUrl: `/documents/${doc._id.toString()}/file`,
  isSupplementary: doc.isSupplementary
});

