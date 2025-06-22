const {supabase} = require('../config/supabase');

const createColumn = async (req, res, next) => {
  try {
    const { board_id, title, color } = req.body;
    const userId = req.user.id;

    if (!board_id || !title) {
      return res.status(400).json({ message: 'Board ID and title are required', statusCode: 400 });
    }

    const { data: member, error: memberError } = await supabase
      .from('board_members')
      .select('role')
      .eq('board_id', board_id)
      .eq('user_id', userId)
      .single();

    if (memberError || !member || !['owner', 'admin'].includes(member.role)) {
      return res.status(403).json({ message: 'Only owners or admins can create columns', statusCode: 403 });
    }

    const { data: columns, error: countError } = await supabase
      .from('columns')
      .select('id')
      .eq('board_id', board_id);

    if (countError) throw new Error(countError.message);

    const { data: column, error } = await supabase
      .from('columns')
      .insert({
        board_id,
        title,
        color: color || '#6B7280',
        position: columns.length,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    res.status(201).json({ message: 'Column created successfully', column });
  } catch (error) {
    next({ message: error.message, statusCode: 500 });
  }
};

const getColumnsByBoard = async (req, res, next) => {
  try {
    const { boardId } = req.params;
    const userId = req.user.id;

    const { data: columns, error } = await supabase
      .from('columns')
      .select('*')
      .eq('board_id', boardId)
      .eq('board_id', boardId, 'board_members.user_id', userId)
      .order('position', { ascending: true });

    if (error) throw new Error(error.message);

    res.status(200).json({ message: 'Columns retrieved successfully', columns });
  } catch (error) {
    next({ message: error.message, statusCode: 500 });
  }
};

const updateColumn = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, color } = req.body;
    const userId = req.user.id;

    const { data: column, error: columnError } = await supabase
      .from('columns')
      .select('board_id')
      .eq('id', id)
      .single();

    if (columnError || !column) {
      return res.status(404).json({ message: 'Column not found', statusCode: 404 });
    }

    const { data: member, error: memberError } = await supabase
      .from('board_members')
      .select('role')
      .eq('board_id', column.board_id)
      .eq('user_id', userId)
      .single();

    if (memberError || !member || !['owner', 'admin'].includes(member.role)) {
      return res.status(403).json({ message: 'Only owners or admins can update columns', statusCode: 403 });
    }

    const updates = {
      title,
      color,
      updated_at: new Date().toISOString(),
    };

    const { data: updatedColumn, error } = await supabase
      .from('columns')
      .update(Object.fromEntries(Object.entries(updates).filter(([_, v]) => v !== undefined)))
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    res.status(200).json({ message: 'Column updated successfully', column: updatedColumn });
  } catch (error) {
    next({ message: error.message, statusCode: 500 });
  }
};

const deleteColumn = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const { data: column, error: columnError } = await supabase
      .from('columns')
      .select('board_id')
      .eq('id', id)
      .single();

    if (columnError || !column) {
      return res.status(404).json({ message: 'Column not found', statusCode: 404 });
    }

    const { data: member, error: memberError } = await supabase
      .from('board_members')
      .select('role')
      .eq('board_id', column.board_id)
      .eq('user_id', userId)
      .single();

    if (memberError || !member || !['owner', 'admin'].includes(member.role)) {
      return res.status(403).json({ message: 'Only owners or admins can delete columns', statusCode: 403 });
    }

    const { error } = await supabase.from('columns').delete().eq('id', id);

    if (error) throw new Error(error.message);

    // Reorder remaining columns
    const { data: remainingColumns, error: reorderError } = await supabase
      .from('columns')
      .select('id')
      .eq('board_id', column.board_id)
      .order('position', { ascending: true });

    if (reorderError) throw new Error(reorderError.message);

    for (let i = 0; i < remainingColumns.length; i++) {
      await supabase
        .from('columns')
        .update({ position: i })
        .eq('id', remainingColumns[i].id);
    }

    res.status(200).json({ message: 'Column deleted successfully' });
  } catch (error) {
    next({ message: error.message, statusCode: 500 });
  }
};

const reorderColumns = async (req, res, next) => {
  try {
    const { board_id, columns } = req.body;
    const userId = req.user.id;

    if (!board_id || !Array.isArray(columns)) {
      return res.status(400).json({ message: 'Board ID and columns array are required', statusCode: 400 });
    }

    const { data: member, error: memberError } = await supabase
      .from('board_members')
      .select('role')
      .eq('board_id', board_id)
      .eq('user_id', userId)
      .single();

    if (memberError || !member || !['owner', 'admin'].includes(member.role)) {
      return res.status(403).json({ message: 'Only owners or admins can reorder columns', statusCode: 403 });
    }

    const updates = columns.map((col, index) => ({
      id: col.id,
      position: index,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from('columns').upsert(updates);

    if (error) throw new Error(error.message);

    res.status(200).json({ message: 'Columns reordered successfully' });
  } catch (error) {
    next({ message: error.message, statusCode: 500 });
  }
};

module.exports = {
  createColumn,
  getColumnsByBoard,
  updateColumn,
  deleteColumn,
  reorderColumns,
};