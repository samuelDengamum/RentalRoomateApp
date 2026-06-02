import Notification from '../models/Notification';
import User from '../models/User';

interface CreateNotificationInput {
  userId: string;
  title: string;
  message: string;
  type?: 'tour_request_created' | 'tour_request_status' | 'system';
  link?: string;
}

export const createNotification = async ({
  userId,
  title,
  message,
  type = 'system',
  link
}: CreateNotificationInput) => {
  await Notification.create({
    userId,
    title,
    message,
    type,
    link
  });
};

interface NotifyAdminsInput {
  title: string;
  message: string;
  type?: 'tour_request_created' | 'tour_request_status' | 'system';
  link?: string;
}

export const notifyAdmins = async ({
  title,
  message,
  type = 'system',
  link
}: NotifyAdminsInput) => {
  const admins = await User.find({ role: 'admin', banned: { $ne: true } }).select('_id');
  if (!admins.length) {
    return;
  }

  await Notification.insertMany(
    admins.map((admin) => ({
      userId: admin._id,
      title,
      message,
      type,
      link
    }))
  );
};