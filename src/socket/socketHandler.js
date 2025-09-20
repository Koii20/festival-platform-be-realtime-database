const { ChatMessage, ChatAttachment } = require("../models/ChatModels");
const authMiddleware = require("../middleware/authMiddleware");

const getSocketBaseUrl = () => {
  const port = process.env.PORT || 5000;
  const host =
    process.env.NODE_ENV === "production"
      ? process.env.SERVER_URL_PRODUCTION
      : `localhost:${port}`;
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  return `${protocol}://${host}`;
};

const convertSocketMessageUrls = (message) => {
  if (message.attachments && Array.isArray(message.attachments)) {
    const baseUrl = getSocketBaseUrl();
    message.attachments = message.attachments.map((attachment) => ({
      ...attachment,
      file_url: attachment.file_url.startsWith("http")
        ? attachment.file_url
        : `${baseUrl}/api/upload/files/${attachment.file_url.replace(
            /^.*\//,
            ""
          )}`,
    }));
  }
  return message;
};

const socketHandler = (io) => {
  io.use(authMiddleware);

  io.on("connection", (socket) => {
    console.log(`📱 User connected: ${socket.userId}`);

    socket.on("test", (data) => {
      console.log("📩 Test event received:", data);
      socket.emit("test_response", {
        message: "Server received your test successfully!",
        serverTime: new Date().toISOString(),
        yourUserId: socket.userId,
        receivedData: data,
      });
    });

    socket.on("join_groups", async (data) => {
      try {
        const { groupIds } = data;

        if (!Array.isArray(groupIds)) {
          return socket.emit("error", { message: "Invalid group IDs format" });
        }

        groupIds.forEach((groupId) => {
          socket.join(`group_${groupId}`);
          // console.log(`👥 User ${socket.userId} joined group ${groupId}`);
        });

        socket.emit("groups_joined", {
          success: true,
          message: `Joined ${groupIds.length} groups`,
        });
      } catch (error) {
        console.error("Error joining groups:", error);
        socket.emit("error", { message: "Failed to join groups" });
      }
    });

    socket.on("send_message", async (data) => {
      try {
        const { groupId, messageType, contentText } = data;

        if (!groupId) {
          return socket.emit("error", { message: "Group ID is required" });
        }

        const message = new ChatMessage({
          group_id: groupId,
          sender_id: socket.userId,
          sender_name: socket.senderName,
          message_type: messageType || "user_text",
          content_text: contentText,
        });

        await message.save();
        await message.populate("attachments");

        const messageWithFullUrls = convertSocketMessageUrls(
          message.toObject()
        );

        io.to(`group_${groupId}`).emit("new_message", {
          messageId: messageWithFullUrls._id,
          groupId: messageWithFullUrls.group_id,
          senderId: messageWithFullUrls.sender_id,
          senderName: messageWithFullUrls.sender_name,
          messageType: messageWithFullUrls.message_type,
          contentText: messageWithFullUrls.content_text,
          attachments: messageWithFullUrls.attachments,
          createdAt: messageWithFullUrls.created_at,
          updatedAt: messageWithFullUrls.updated_at,
        });

        console.log(
          `💬 Message sent by ${socket.senderName} (${socket.userId}) to group ${groupId}`
        );
      } catch (error) {
        console.error("Error sending message:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    });
    socket.on("send_message_with_attachment", async (data) => {
      try {
        const { groupId, messageType, contentText, attachment } = data;

        if (!groupId || !attachment) {
          return socket.emit("error", {
            message: "Group ID and attachment are required",
          });
        }

        const message = new ChatMessage({
          group_id: groupId,
          sender_id: socket.userId,
          sender_name: socket.senderName,
          message_type: messageType || "user_img",
          content_text: contentText,
        });

        await message.save();

        const attachmentDoc = new ChatAttachment({
          message_id: message._id,
          attachment_type: attachment.attachmentType || "user_upload",
          file_type: attachment.fileType,
          file_name: attachment.fileName,
          file_url: attachment.fileUrl,
          file_size: attachment.fileSize,
        });

        await attachmentDoc.save();
        await message.populate("attachments");

        const messageWithFullUrls = convertSocketMessageUrls(
          message.toObject()
        );

        io.to(`group_${groupId}`).emit("new_message", {
          messageId: messageWithFullUrls._id,
          groupId: messageWithFullUrls.group_id,
          senderId: messageWithFullUrls.sender_id,
          senderName: messageWithFullUrls.sender_name,
          messageType: messageWithFullUrls.message_type,
          contentText: messageWithFullUrls.content_text,
          attachments: messageWithFullUrls.attachments,
          createdAt: messageWithFullUrls.created_at,
          updatedAt: messageWithFullUrls.updated_at,
        });

        console.log(
          `📎 Message with attachment sent by ${socket.senderName} (${socket.userId}) to group ${groupId}`
        );
      } catch (error) {
        console.error("Error sending message with attachment:", error);
        socket.emit("error", {
          message: "Failed to send message with attachment",
        });
      }
    });

    socket.on("get_message_history", async (data) => {
      try {
        const { groupId, page = 1, limit = 50 } = data;

        if (!groupId) {
          return socket.emit("error", { message: "Group ID is required" });
        }

        const messages = await ChatMessage.getMessagesByGroup(
          groupId,
          page,
          limit
        );

        socket.emit("message_history", {
          groupId,
          messages: messages.map((msg) => ({
            messageId: msg._id,
            groupId: msg.group_id,
            senderId: msg.sender_id,
            senderName: msg.sender_name,
            messageType: msg.message_type,
            contentText: msg.content_text,
            attachments: msg.attachments,
            createdAt: msg.created_at,
            updatedAt: msg.updated_at,
          })),
          pagination: {
            page,
            limit,
            hasMore: messages.length === limit,
          },
        });
      } catch (error) {
        console.error("Error getting message history:", error);
        socket.emit("error", { message: "Failed to get message history" });
      }
    });

    socket.on("typing_start", (data) => {
      const { groupId } = data;
      socket.to(`group_${groupId}`).emit("user_typing", {
        userId: socket.userId,
        groupId,
      });
    });

    socket.on("typing_stop", (data) => {
      const { groupId } = data;
      socket.to(`group_${groupId}`).emit("user_stopped_typing", {
        userId: socket.userId,
        groupId,
      });
    });

    socket.on("disconnect", () => {
      console.log(`📱 User disconnected: ${socket.userId}`);
    });

    socket.on("error", (error) => {
      console.error("Socket error:", error);
    });
  });
};

module.exports = socketHandler;
