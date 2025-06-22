const {supabase} = require('../config/supabase');

const addMember = async (req, res, next) => {
  try {
    const { boardId } = req.params;
    const { email, role } = req.body;
    const userId = req.user.id;

    const { data: currentMember, error: memberError } = await supabase
      .from('board_members')
      .select('role')
      .eq('board_id', boardId)
      .eq('user_id', userId)
      .single();

    if (memberError || !currentMember || !['owner', 'admin'].includes(currentMember.role)) {
      return res.status(403).json({ message: 'Only owners or admins can add members', statusCode: 403 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ message: 'User not found', statusCode: 404 });
    }

    const { data: existingMember, error: existingError } = await supabase
      .from('board_members')
      .select('id')
      .eq('board_id', boardId)
      .eq('user_id', profile.id)
      .single();

    if (existingMember) {
      return res.status(400).json({ message: 'User is already a member', statusCode: 400 });
    }

    const { data: member, error } = await supabase
      .from('board_members')
      .insert({
        board_id: boardId,
        user_id: profile.id,
        role: role || 'member',
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Create notification
    const { data: board, error: boardError } = await supabase
      .from('boards')
      .select('title')
      .eq('id', boardId)
      .single();

    if (boardError) console.error('Board error:', boardError);

    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        title: 'Added to Board',
        message: `You were added to "${board.title}" as a ${role || 'member'}`,
        type: 'info',
        user_id: profile.id,
        board_id: boardId,
        action_url: `/boards/${boardId}`,
      });

    if (notificationError) console.error('Notification error:', notificationError);

    res.status(201).json({ message: 'Member added successfully', member });
  } catch (error) {
    next({ message: error.message, statusCode: 500 });
  }
};

const getMembers = async (req, res, next) => {
  try {
    const { boardId } = req.params;
    const userId = req.user.id;

    const { data: member, error: memberError } = await supabase
      .from('board_members')
      .select('id')
      .eq('board_id', boardId)
      .eq('user_id', userId)
      .single();

    if (memberError || !member) {
      return res.status(403).json({ message: 'Access denied', statusCode: 403 });
    }

    const { data: members, error } = await supabase
      .from('board_members')
      .select(`
        id,
        user_id,
        role,
        joined_at,
        profiles (
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('board_id', boardId);

    if (error) throw new Error(error.message);

    res.status(200).json({ message: 'Members retrieved successfully', members });
  } catch (error) {
    next({ message: error.message, statusCode: 500 });
  }
};

const updateMemberRole = async (req, res, next) => {
  try {
    const { boardId, userId: targetUserId } = req.params;
    const { role } = req.body;
    const currentUserId = req.user.id;

    const { data: currentMember, error: memberError } = await supabase
      .from('board_members')
      .select('role')
      .eq('board_id', boardId)
      .eq('user_id', currentUserId)
      .single();

    if (memberError || !currentMember || currentMember.role !== 'owner') {
      return res.status(403).json({ message: 'Only owners can update member roles', statusCode: 403 });
    }

    const { data: member, error } = await supabase
      .from('board_members')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('board_id', boardId)
      .eq('user_id', targetUserId)
      .select()
      .single();

    if (error || !member) {
      return res.status(404).json({ message: 'Member not found', statusCode: 404 });
    }

    res.status(200).json({ message: 'Member role updated successfully', member });
  } catch (error) {
    next({ message: error.message, statusCode: 500 });
  }
};

const removeMember = async (req, res, next) => {
  try {
    const { boardId, userId: targetUserId } = req.params;
    const currentUserId = req.user.id;

    const { data: currentMember, error: memberError } = await supabase
      .from('board_members')
      .select('role')
      .eq('board_id', boardId)
      .eq('user_id', currentUserId)
      .single();

    if (memberError || !currentMember || currentMember.role !== 'owner') {
      return res.status(403).json({ message: 'Only owners can remove members', statusCode: 403 });
    }

    const { error } = await supabase
      .from('board_members')
      .delete()
      .eq('board_id', boardId)
      .eq('user_id', targetUserId);

    if (error) throw new Error(error.message);

    res.status(200).json({ message: 'Member removed successfully' });
  } catch (error) {
    next({ message: error.message, statusCode: 500 });
  }
};

module.exports = {
  addMember,
  getMembers,
  updateMemberRole,
  removeMember,
};