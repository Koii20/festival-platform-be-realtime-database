const express = require("express");
const Notification = require("../models/NotificationModel");
const { getIO } = require("../socket/io");
const NotificationTemplates = require("../utils/notificationTemplates");

const router = express.Router();

router.post("/:type", async (req, res) => {
  try {
    const { type } = req.params;
    const { data = null, list_user_id } = req.body;

    if (!type || typeof type !== "string") {
      return res.status(400).json({ success: false, message: "Invalid type" });
    }
    if (!Array.isArray(list_user_id) || list_user_id.length === 0) {
      return res.status(400).json({
        success: false,
        message: "list_user_id must be a non-empty array",
      });
    }

    const templateFn = NotificationTemplates[type];
    if (!templateFn) {
      return res.status(400).json({
        success: false,
        message: `Unsupported notification type: ${type}`,
      });
    }

    const docs = list_user_id.map((receiverId) => ({
      user_id: receiverId,
      type,
      data: data ?? null,
      content: templateFn(data),
      is_read: false,
    }));

    const created = await Notification.insertMany(docs, { ordered: true });

    const io = getIO();
    created.forEach((n) => {
      io.emit(`notification-${n.user_id}`, {
        notificationId: n._id,
        userId: n.user_id,
        type: n.type,
        content: n.content,
        data: n.data,
        isRead: n.is_read,
        createdAt: n.created_at,
      });
    });

    res.status(201).json({
      success: true,
      data: created.map((n) => ({
        notificationId: n._id,
        userId: n.user_id,
        type: n.type,
        content: n.content,
        data: n.data,
        isRead: n.is_read,
        createdAt: n.created_at,
      })),
    });
  } catch (err) {
    console.error("Create notifications error:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to create notifications" });
  }
});

router.get("/", async (req, res) => {
  try {
    const userId = parseInt(req.query.user_id, 10);
    const page = parseInt(req.query.page || "1", 10);
    const limit = Math.min(parseInt(req.query.limit || "50", 10), 200);
    const isReadFilter =
      typeof req.query.is_read === "string"
        ? req.query.is_read === "true"
        : undefined;

    if (Number.isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: "user_id is required and must be a number",
      });
    }

    const query = { user_id: userId };
    if (typeof isReadFilter === "boolean") query.is_read = isReadFilter;

    const [items, total] = await Promise.all([
      Notification.find(query)
        .sort({ created_at: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Notification.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: items.map((n) => ({
        notificationId: n._id,
        userId: n.user_id,
        type: n.type,
        content: n.content,
        data: n.data,
        isRead: n.is_read,
        createdAt: n.created_at,
      })),
      pagination: {
        page,
        limit,
        total,
        hasMore: page * limit < total,
      },
    });
  } catch (err) {
    console.error("Get notifications error:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to get notifications" });
  }
});

router.patch("/:notification_id/read", async (req, res) => {
  try {
    const { notification_id } = req.params;
    const { user_id } = req.body;

    if (typeof user_id !== "number") {
      return res
        .status(400)
        .json({ success: false, message: "user_id must be a number" });
    }

    const updated = await Notification.findOneAndUpdate(
      { _id: notification_id, user_id },
      { $set: { is_read: true } },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Notification not found for this user",
      });
    }

    res.json({
      success: true,
      data: {
        notificationId: updated._id,
        userId: updated.user_id,
        type: updated.type,
        content: updated.content,
        data: updated.data,
        isRead: updated.is_read,
        createdAt: updated.created_at,
      },
    });
  } catch (err) {
    console.error("Mark one read error:", err);
    res.status(500).json({ success: false, message: "Failed to mark as read" });
  }
});

router.patch("/read-all", async (req, res) => {
  try {
    const { user_id } = req.body;
    if (typeof user_id !== "number") {
      return res
        .status(400)
        .json({ success: false, message: "user_id must be a number" });
    }

    const result = await Notification.updateMany(
      { user_id, is_read: false },
      { $set: { is_read: true } }
    );

    res.json({
      success: true,
      data: {
        matched: result.matchedCount ?? result.n,
        modified: result.modifiedCount ?? result.nModified,
      },
    });
  } catch (err) {
    console.error("Mark all read error:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to mark all as read" });
  }
});

router.delete("/clear", async (req, res) => {
  try {
    const { user_id } = req.body;
    if (typeof user_id !== "number") {
      return res
        .status(400)
        .json({ success: false, message: "user_id must be a number" });
    }

    const result = await Notification.deleteMany({ user_id });
    res.json({ success: true, data: { deleted: result.deletedCount } });
  } catch (err) {
    console.error("Clear all error:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to clear notifications" });
  }
});

module.exports = router;
