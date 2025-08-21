const Joi = require('joi');

// Validate message data
const validateMessage = (data) => {
  const schema = Joi.object({
    groupId: Joi.number().integer().positive().required(),
    messageType: Joi.string().valid('user_text', 'ai_text', 'user_img', 'ai_img').default('user_text'),
    contentText: Joi.string().max(5000).allow('').optional()
  });

  return schema.validate(data);
};

// Validate message with attachment
const validateMessageWithAttachment = (data) => {
  const schema = Joi.object({
    groupId: Joi.number().integer().positive().required(),
    messageType: Joi.string().valid('user_text', 'ai_text', 'user_img', 'ai_img').default('user_img'),
    contentText: Joi.string().max(5000).allow('').optional(),
    attachment: Joi.object({
      attachmentType: Joi.string().valid('user_upload', 'ai_generated').default('user_upload'),
      fileType: Joi.string().valid('image', 'document').required(),
      fileName: Joi.string().max(255).required(),
      fileUrl: Joi.string().uri().required(),
      fileSize: Joi.number().integer().min(1).max(104857600).required() // Max 100MB
    }).required()
  });

  return schema.validate(data);
};

// Validate pagination parameters
const validatePagination = (data) => {
  const schema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(50)
  });

  return schema.validate(data);
};

// Validate group ID
const validateGroupId = (data) => {
  const schema = Joi.object({
    groupId: Joi.number().integer().positive().required()
  });

  return schema.validate(data);
};

// Validate group IDs array
const validateGroupIds = (data) => {
  const schema = Joi.object({
    groupIds: Joi.array().items(Joi.number().integer().positive()).min(1).required()
  });

  return schema.validate(data);
};

module.exports = {
  validateMessage,
  validateMessageWithAttachment,
  validatePagination,
  validateGroupId,
  validateGroupIds
};