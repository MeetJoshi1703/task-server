const {supabase} = require('../config/supabase');

const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const { data: notifications, error } = await supabase
      .from('notifications')
      .select(`
        *,
        boards (
          id,
          title
        )
      `)
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });

    if (error) throw new Error(error.message);

    res.status(200).json({ message: 'Notifications retrieved successfully', notifications });
  } catch (error) {
    next({ message: error.message, statusCode: 500 });
  }
};

const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const { data: notification, error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !notification) {
      return res.status(404).json({ message: 'Notification not found or access denied', statusCode: 404 });
    }

    res.status(200).json({ message: 'Notification marked as read', notification });
  } catch (error) {
    next({ message: error.message, statusCode: 500 });
  }
};

const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId);

    if (error) throw new Error(error.message);

    res.status(200).json({ message: 'All notifications marked as read' });
  } catch (error) {
    next({ message: error.message, statusCode: 500 });
  }
};

const deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw new Error(error.message);

    res.status(200).json({ message: 'Notification deleted successfully' });
  } catch (error) {
    next({ message: error.message, statusCode: 500 });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};