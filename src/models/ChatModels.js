const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  group_id: {
    type: Number,
    required: true,
    index: true
  },
  sender_id: {
    type: Number,
    required: true,
    index: true
  },
  sender_name: {
    type: String,
    required: true,
    trim: true,
    maxLength: 100
  },
  message_type: {
    type: String,
    required: true,
    enum: ['user_text', 'ai_text', 'user_img', 'ai_img'],
    default: 'user_text'
  },
  content_text: {
    type: String,
    trim: true,
    maxLength: 5000
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

chatMessageSchema.index({ group_id: 1, created_at: -1 });
chatMessageSchema.index({ sender_id: 1, created_at: -1 });

const chatAttachmentSchema = new mongoose.Schema({
  message_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatMessage',
    required: true,
    index: true
  },
  attachment_type: {
    type: String,
    required: true,
    enum: ['user_upload', 'ai_generated'],
    default: 'user_upload'
  },
  file_type: {
    type: String,
    required: true,
    enum: ['image', 'document'],
    default: 'image'
  },
  file_name: {
    type: String,
    trim: true
  },
  file_url: {
    type: String,
    required: true,
    trim: true
  },
  file_size: {
    type: Number,
    min: 0,
    max: 104857600 
  }
}, {
  timestamps: {
    createdAt: 'created_at'
  }
});

chatMessageSchema.virtual('attachments', {
  ref: 'ChatAttachment',
  localField: '_id',
  foreignField: 'message_id'
});

chatMessageSchema.set('toJSON', { virtuals: true });
chatMessageSchema.set('toObject', { virtuals: true });

chatMessageSchema.statics.getMessagesByGroup = function(groupId, page = 1, limit = 50) {
  return this.find({ group_id: groupId })
    .populate('attachments')
    .sort({ created_at: -1 })
    .limit(limit)
    .skip((page - 1) * limit)
    .exec();
};

chatMessageSchema.statics.getLatestMessageByGroup = function(groupId) {
  return this.findOne({ group_id: groupId })
    .populate('attachments')
    .sort({ created_at: -1 })
    .exec();
};

chatMessageSchema.methods.addAttachment = function(attachmentData) {
  return mongoose.model('ChatAttachment').create({
    message_id: this._id,
    ...attachmentData
  });
};

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);
const ChatAttachment = mongoose.model('ChatAttachment', chatAttachmentSchema);

module.exports = {
  ChatMessage,
  ChatAttachment
};