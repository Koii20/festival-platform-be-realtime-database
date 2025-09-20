let ioInstance = null;

const setIO = (io) => { ioInstance = io; };
const getIO = () => {
  if (!ioInstance) throw new Error('Socket.io instance not set yet.');
  return ioInstance;
};

module.exports = { setIO, getIO };
