const express = require('express');
const { ChatMessage, ChatAttachment } = require('../models/ChatModels');
const { validateMessage } = require('../validators/chatValidators');
const { convertMessageFileUrls, convertFileListUrls } = require('../utils/urlHelpers');

const router = express.Router();

router.get('/messages/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const messages = await ChatMessage.getMessagesByGroup(
      parseInt(groupId), 
      parseInt(page), 
      parseInt(limit)
    );

    const messagesWithFullUrls = convertMessageFileUrls(req, messages);

    res.json({
      success: true,
      data: {
        messages: messagesWithFullUrls.map(msg => ({
          messageId: msg._id,
          groupId: msg.group_id,
          senderId: msg.sender_id,
          senderName: msg.sender_name,
          messageType: msg.message_type,
          contentText: msg.content_text,
          attachments: msg.attachments,
          createdAt: msg.created_at,
          updatedAt: msg.updated_at
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          hasMore: messages.length === parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Error getting messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get messages'
    });
  }
});

router.get('/latest-messages', async (req, res) => {
  try {
    const { groupIds } = req.query;

    if (!groupIds) {
      return res.status(400).json({
        success: false,
        message: 'Group IDs are required'
      });
    }

    const groupIdArray = groupIds.split(',').map(id => parseInt(id));
    const latestMessages = [];

    for (const groupId of groupIdArray) {
      const message = await ChatMessage.getLatestMessageByGroup(groupId);
      if (message) {
        const messageWithFullUrls = convertMessageFileUrls(req, [message])[0];
        
        latestMessages.push({
          messageId: messageWithFullUrls._id,
          groupId: messageWithFullUrls.group_id,
          senderId: messageWithFullUrls.sender_id,
          senderName: messageWithFullUrls.sender_name,
          messageType: messageWithFullUrls.message_type,
          contentText: messageWithFullUrls.content_text,
          attachments: messageWithFullUrls.attachments,
          createdAt: messageWithFullUrls.created_at,
          updatedAt: messageWithFullUrls.updated_at
        });
      }
    }

    res.json({
      success: true,
      data: latestMessages
    });

  } catch (error) {
    console.error('Error getting latest messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get latest messages'
    });
  }
});

router.post('/send', async (req, res) => {
  try {
    const { error } = validateMessage(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { groupId, messageType, contentText, senderName } = req.body;

    if (!senderName) {
      return res.status(400).json({
        success: false,
        message: 'Sender name is required'
      });
    }

    const message = new ChatMessage({
      group_id: groupId,
      sender_id: req.user.userId,
      sender_name: senderName,
      message_type: messageType || 'user_text',
      content_text: contentText
    });

    await message.save();
    await message.populate('attachments');

    res.status(201).json({
      success: true,
      data: {
        messageId: message._id,
        groupId: message.group_id,
        senderId: message.sender_id,
        senderName: message.sender_name,
        messageType: message.message_type,
        contentText: message.content_text,
        attachments: message.attachments,
        createdAt: message.created_at,
        updatedAt: message.updated_at
      }
    });

  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message'
    });
  }
});

router.delete('/messages/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await ChatMessage.findById(messageId);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    if (message.sender_id !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this message'
      });
    }

    message.content_text = '[Message deleted]';
    message.message_type = 'system';
    await message.save();

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete message'
    });
  }
});

router.get('/group-files', async (req, res) => {
  try {
    const { groupId, fileType } = req.query;

    if (!groupId) {
      return res.status(400).json({
        success: false,
        message: 'Group ID is required'
      });
    }

    const messageQuery = { group_id: parseInt(groupId) };
    
    const messagesWithAttachments = await ChatMessage.find(messageQuery)
      .populate({
        path: 'attachments',
        match: fileType ? { file_type: fileType } : {}
      })
      .sort({ created_at: -1 });

    const files = [];
    messagesWithAttachments.forEach(message => {
      if (message.attachments && message.attachments.length > 0) {
        message.attachments.forEach(attachment => {
          files.push({
            attachmentId: attachment._id,
            messageId: message._id,
            senderId: message.sender_id,
            fileName: attachment.file_name,
            fileUrl: req.protocol + '://' + req.get('host') + '/api/upload/files/' + attachment.file_url.replace(/^.*\//, ''), 
            fileType: attachment.file_type,
            fileSize: attachment.file_size,
            attachmentType: attachment.attachment_type,
            uploadedAt: attachment.created_at,
            messageCreatedAt: message.created_at
          });
        });
      }
    });

    const filesByType = files.reduce((acc, file) => {
      if (!acc[file.fileType]) {
        acc[file.fileType] = [];
      }
      acc[file.fileType].push(file);
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        groupId: parseInt(groupId),
        totalFiles: files.length,
        files: files,
        filesByType: filesByType,
        statistics: {
          totalImages: filesByType.image?.length || 0,
          totalDocuments: filesByType.document?.length || 0,
          totalSize: files.reduce((sum, file) => sum + (file.fileSize || 0), 0)
        }
      }
    });

  } catch (error) {
    console.error('Error getting group files:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get group files'
    });
  }
});

router.get('/stats/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;

    const stats = await ChatMessage.aggregate([
      { $match: { group_id: parseInt(groupId) } },
      {
        $group: {
          _id: null,
          totalMessages: { $sum: 1 },
          messagesByType: {
            $push: '$message_type'
          },
          latestMessage: { $max: '$created_at' },
          oldestMessage: { $min: '$created_at' }
        }
      }
    ]);

    if (!stats.length) {
      return res.json({
        success: true,
        data: {
          totalMessages: 0,
          messagesByType: {},
          latestMessage: null,
          oldestMessage: null
        }
      });
    }

    const typeCount = {};
    stats[0].messagesByType.forEach(type => {
      typeCount[type] = (typeCount[type] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        totalMessages: stats[0].totalMessages,
        messagesByType: typeCount,
        latestMessage: stats[0].latestMessage,
        oldestMessage: stats[0].oldestMessage
      }
    });

  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get statistics'
    });
  }
});

module.exports = router;