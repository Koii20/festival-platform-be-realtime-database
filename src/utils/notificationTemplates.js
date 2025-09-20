const NotificationTemplates = {
  festival_requested: (data) =>
    `Lễ hội "${data?.festivalName ?? ""}" vừa được tạo đang chờ phê duyệt!.`,

  festival_approval: (data) =>
    `Lễ hội "${data?.festivalName ?? ""}" đã được Admin phê duyệt!`,

  festival_reject: (data) =>
    `Lễ hội "${data?.festivalName ?? ""}" đã bị từ chối. Lý do: ${
      data?.reason ?? "Không có lý do cụ thể"
    }.`,

  festival_ongoing: (data) =>
    `Lễ hội "${
      data?.festivalName ?? ""
    }" hiện đang diễn ra, hãy tham gia ngay!`,

  festival_participant: (data) =>
    `"${data?.userName ?? ""}" đã quan tâm Lễ hội "${
      data?.festivalName ?? ""
    }"`,

  festival_comment: (data) =>
    `Lễ hội "${data?.festivalName ?? ""} có người bình luận: "${
      data?.comment
    }" "`,

  group_add_member: (data) =>
    `Bạn vừa được thêm vào nhóm "${data?.groupName ?? ""}"`,

  group_up_role: (data) =>
    `Bạn vừa được thăng lên làm thủ quỹ của nhóm "${data?.groupName ?? ""}"`,

  group_down_role: (data) =>
    `Bạn vừa bị giáng chức xuống thành viên của nhóm "${
      data?.groupName ?? ""
    }"`,

  group_remove_member: (data) =>
    `Bạn vừa bị đuổi ra khỏi nhóm "${data?.groupName ?? ""}"`,

  booth_pending: (data) =>
    `Nhóm ${data?.groupName ?? ""} vừa gửi yêu cầu đăng ký gian hàng "${
      data?.boothName ?? ""
    }" trong lễ hội "${data?.festivalName ?? ""}".`,

  booth_approval: (data) =>
    `Giáo viên đã chấp thuận gian hàng "${
      data?.boothName ?? ""
    }" trong lễ hội "${data?.festivalName ?? ""}".`,

  booth_rejected: (data) =>
    `Giáo viên đã từ chối gian hàng "${data?.boothName ?? ""}" trong lễ hội "${
      data?.festivalName ?? ""
    }" với lý do: ${data?.reason ?? "Không có lý do cụ thể"}.`,

  booth_active: (data) =>
    `Gian hàng "${data?.boothName ?? ""}" trong lễ hội "${
      data?.festivalName ?? ""
    }" đã được kích hoạt để mở bán.`,

  booth_updated: (data) =>
    `Nhóm ${data?.groupName ?? ""} vừa gửi lại yêu cầu xét duyệt gian hàng "${
      data?.boothName ?? ""
    }" trong lễ hội "${data?.festivalName ?? ""}".`,

  festival_completed: (data) =>
    `Lễ hội "${
      data?.festivalName ?? ""
    }" đã kết thúc. Bạn có thể trích hoa hồng từ đây.`,

  festival_commission: (data) =>
    `Hệ thống đã trích ${data?.amount} từ lễ hội"${data?.festivalName ?? ""}".`,
};

module.exports = NotificationTemplates;
