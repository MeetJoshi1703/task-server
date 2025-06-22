const {supabase} = require('../config/supabase');

const createBoard = async (req, res, next) => {
  try {
    const { title, description, color, priority } = req.body;
    const userId = req.user.id;

    if (!title) {
      return res.status(400).json({ message: 'Title is required', statusCode: 400 });
    }

    const { data: board, error } = await supabase
      .from('boards')
      .insert({
        title,
        description,
        color: color || '#3B82F6',
        priority: priority || 'medium',
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Add creator as owner in board_members
    const { error: memberError } = await supabase
      .from('board_members')
      .insert({
        board_id: board.id,
        user_id: userId,
        role: 'owner',
      });

    if (memberError) throw new Error(memberError.message);

    res.status(201).json({ message: 'Board created successfully', board });
  } catch (error) {
    next({ message: error.message, statusCode: 500 });
  }
};

const getBoards = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const { data: boards, error } = await supabase
      .from('boards')
      .select(`
        *,
        board_members!inner (
          id,
          role,
          user_id,
          joined_at
        )
      `)
      .eq('board_members.user_id', userId);

    if (error) throw new Error(error.message);

    res.status(200).json({ message: 'Boards retrieved successfully', boards });
  } catch (error) {
    next({ message: error.message, statusCode: 500 });
  }
};

const getBoardById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const { data: board, error } = await supabase
      .from('boards')
      .select(`
        *,
        columns (
          id,
          title,
          position,
          color,
          created_at,
          updated_at,
          tasks (
            id,
            title,
            description,
            priority,
            status,
            position,
            due_date,
            created_by,
            created_at,
            updated_at,
            task_assignees (
              user_id,
              assigned_at
            ),
            task_tags (
              tag
            )
          )
        ),
        board_members (
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
        )
      `)
      .eq('id', id)
      .eq('board_members.user_id', userId)
      .single();

    if (error || !board) {
      return res.status(404).json({ message: 'Board not found or access denied', statusCode: 404 });
    }

    res.status(200).json({ message: 'Board retrieved successfully', board });
  } catch (error) {
    next({ message: error.message, statusCode: 500 });
  }
};

const updateBoard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, color, priority, is_starred } = req.body;
    const userId = req.user.id;

    const { data: member, error: memberError } = await supabase
      .from('board_members')
      .select('role')
      .eq('board_id', id)
      .eq('user_id', userId)
      .single();

    if (memberError || !member || !['owner', 'admin'].includes(member.role)) {
      return res.status(403).json({ message: 'Only owners or admins can update boards', statusCode: 403 });
    }

    const updates = {
      title,
      description,
      color,
      priority,
      is_starred,
      updated_at: new Date().toISOString(),
    };

    const { data: board, error } = await supabase
      .from('boards')
      .update(Object.fromEntries(Object.entries(updates).filter(([_, v]) => v !== undefined)))
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    res.status(200).json({ message: 'Board updated successfully', board });
  } catch (error) {
    next({ message: error.message, statusCode: 500 });
  }
};

const deleteBoard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const { data: member, error: memberError } = await supabase
      .from('board_members')
      .select('role')
      .eq('board_id', id)
      .eq('user_id', userId)
      .single();

    if (memberError || !member || member.role !== 'owner') {
      return res.status(403).json({ message: 'Only owners can delete boards', statusCode: 403 });
    }

    const { error } = await supabase.from('boards').delete().eq('id', id);

    if (error) throw new Error(error.message);

    res.status(200).json({ message: 'Board deleted successfully' });
  } catch (error) {
    next({ message: error.message, statusCode: 500 });
  }
};

const starBoard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if board exists and get current is_starred
    const { data: board, error: boardError } = await supabase
      .from('boards')
      .select('id, is_starred')
      .eq('id', id)
      .single();

    if (boardError || !board) {
      return res.status(404).json({ message: 'Board not found', statusCode: 404 });
    }

    // Check if user is a board member
    const { data: member, error: memberError } = await supabase
      .from('board_members')
      .select('id')
      .eq('board_id', id)
      .eq('user_id', userId)
      .single();

    if (memberError || !member) {
      return res.status(403).json({ message: 'Access denied', statusCode: 403 });
    }

    // Toggle is_starred
    const { data: updatedBoard, error: updateError } = await supabase
      .from('boards')
      .update({ is_starred: !board.is_starred, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(`
        id,
        title,
        description,
        color,
        created_by,
        priority,
        is_starred,
        created_at,
        updated_at
      `)
      .single();

    if (updateError) throw new Error(updateError.message);

    res.status(200).json({ message: 'Board star status updated successfully', board: updatedBoard });
  } catch (error) {
    next({ message: error.message, statusCode: 500 });
  }
};

module.exports = {
  createBoard,
  getBoards,
  getBoardById,
  updateBoard,
  deleteBoard,
  starBoard,
};