const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user_id: { type: Number, required: true, index: true }, 
    type: { type: String, required: true, trim: true },
    data: { type: mongoose.Schema.Types.Mixed, default: null }, 
    content: { type: String, default: "" }, 
    is_read: { type: Boolean, default: false },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
  }
);

notificationSchema.index({ user_id: 1, created_at: -1 });

const Notification = mongoose.model("Notification", notificationSchema);
module.exports = Notification;
