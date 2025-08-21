const getBaseUrl = (req) => {
  return `${req.protocol}://${req.get('host')}`;
};

const convertToFullUrl = (req, relativePath) => {
  if (!relativePath) return relativePath;
  
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath;
  }
  
  const baseUrl = getBaseUrl(req);
  
  if (relativePath.startsWith('/uploads/')) {
    return `${baseUrl}/api/upload/files/${relativePath.replace('/uploads/', '')}`;
  }
  
  if (relativePath.startsWith('uploads/')) {
    return `${baseUrl}/api/upload/files/${relativePath.replace('uploads/', '')}`;
  }
  
  return relativePath;
};

const convertMessageFileUrls = (req, messages) => {
  if (!Array.isArray(messages)) return messages;
  
  return messages.map(message => {
    if (message.attachments && Array.isArray(message.attachments)) {
      message.attachments = message.attachments.map(attachment => ({
        ...attachment,
        file_url: convertToFullUrl(req, attachment.file_url)
      }));
    }
    return message;
  });
};

const convertSingleMessageFileUrls = (req, message) => {
  if (!message) return message;
  
  if (message.attachments && Array.isArray(message.attachments)) {
    message.attachments = message.attachments.map(attachment => ({
      ...attachment,
      file_url: convertToFullUrl(req, attachment.file_url)
    }));
  }
  
  return message;
};

const convertFileListUrls = (req, files) => {
  if (!Array.isArray(files)) return files;
  
  return files.map(file => ({
    ...file,
    fileUrl: convertToFullUrl(req, file.fileUrl)
  }));
};

module.exports = {
  getBaseUrl,
  convertToFullUrl,
  convertMessageFileUrls,
  convertSingleMessageFileUrls,
  convertFileListUrls
};