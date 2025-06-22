const {supabase,supabaseAdmin} = require('../config/supabase');

const createTask = async (req, res, next) => {
  try {
    const { column_id, title, description, priority, due_date, assignees, tags } = req.body;
    const userId = req.user.id;

    if (!column_id || !title) {
      return res.status(400).json({ message: 'Column ID and title are required', statusCode: 400 });
    }

    const { data: column, error: columnError } = await supabase
      .from('columns')
      .select('board_id')
      .eq('id', column_id)
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

    if (memberError || !member) {
      return res.status(403).json({ message: 'Access denied', statusCode: 403 });
    }

    const { data: tasks, error: countError } = await supabase
      .from('tasks')
      .select('id')
      .eq('column_id', column_id);

    if (countError) throw new Error(countError.message);

    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        column_id,
        title,
        description,
        priority: priority || 'medium',
        due_date,
        created_by: userId,
        position: tasks.length,
        status: 'active', // Explicitly set status to 'active'
      })
      .select(`
        id,
        column_id,
        title,
        description,
        priority,
        due_date,
        created_by,
        position,
        status,
        created_at,
        updated_at
      `)
      .single();

    if (error) throw new Error(error.message);

    // Add assignees
    if (Array.isArray(assignees) && assignees.length > 0) {
      const assigneeInserts = assignees.map(user_id => ({
        task_id: task.id,
        user_id,
      }));

      const { error: assigneeError } = await supabase
        .from('task_assignees')
        .insert(assigneeInserts);

      if (assigneeError) throw new Error(assigneeError.message);

      // Create notifications for assignees
      const notificationInserts = assignees
        .filter(uid => uid !== userId)
        .map(user_id => ({
          title: 'Task Assigned',
          message: `You were assigned to "${title}"`,
          type: 'info',
          user_id,
          board_id: column.board_id,
          action_url: `/boards/${column.board_id}/tasks/${task.id}`,
        }));

      if (notificationInserts.length > 0) {
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert(notificationInserts);

        if (notificationError) console.error('Notification error:', notificationError);
      }
    }

    // Add tags
    if (Array.isArray(tags) && tags.length > 0) {
      const tagInserts = tags.map(tag => ({
        task_id: task.id,
        tag,
      }));

      const { error: tagError } = await supabase
        .from('task_tags')
        .insert(tagInserts);

      if (tagError) throw new Error(tagError.message);
    }

    res.status(201).json({ message: 'Task created successfully', task });
  } catch (error) {
    next({ message: error.message, statusCode: 500 });
  }
};


const getAllTasks = async (req, res, next) => {
  try {
    const userId = req.user.id;
    console.log(`[getAllTasks] Fetching tasks for userId: ${userId}`);

    // Get all task IDs where user is assigned
    const { data: assignedTaskIds, error: assignedError } = await supabase
      .from('task_assignees')
      .select('task_id')
      .eq('user_id', userId);

    if (assignedError) {
      console.error('[getAllTasks] Error fetching assigned tasks:', assignedError);
      return next({ message: 'Failed to fetch assigned tasks', statusCode: 500 });
    }

    // Extract task IDs
    const taskIds = assignedTaskIds.map(item => item.task_id);

    // Build the query condition
    let tasksQuery = supabase
      .from('tasks')
      .select(`
        id,
        title,
        description,
        priority,
        status,
        position,
        due_date,
        created_by,
        column_id,
        created_at,
        updated_at,
        columns(board_id),
        task_assignees(user_id),
        task_tags(tag)
      `)
      .order('position', { ascending: true });

    // Fetch tasks where user is creator OR assignee
    if (taskIds.length > 0) {
      tasksQuery = tasksQuery.or(`created_by.eq.${userId},id.in.(${taskIds.join(',')})`);
    } else {
      // If no assigned tasks, only get created tasks
      tasksQuery = tasksQuery.eq('created_by', userId);
    }

    const { data: tasks, error: tasksError } = await tasksQuery;

    if (tasksError) {
      console.error('[getAllTasks] Error fetching tasks:', tasksError);
      return next({ message: 'Failed to fetch tasks', statusCode: 500 });
    }

    // Transform tasks to match frontend expectations
    const formattedTasks = tasks.map((task) => ({
      ...task,
      board_id: task.columns?.board_id || null,
      task_assignees: task.task_assignees || [],
      task_tags: task.task_tags || [],
      columns: undefined, // Remove nested columns object
    }));

    console.log(`[getAllTasks] Returning ${formattedTasks.length} tasks for userId: ${userId}`);

    res.status(200).json({ tasks: formattedTasks });
  } catch (error) {
    console.error('[getAllTasks] Unexpected error:', error);
    next({ message: error.message || 'Internal server error', statusCode: 500 });
  }
};


const getTasksByColumn = async (req, res, next) => {
  try {
    const { columnId } = req.params;
    const userId = req.user.id;

    const { data: tasks, error } = await supabase
      .from('tasks')
      .select(`
        *,
        task_assignees (
          user_id,
          assigned_at
        ),
        task_tags (
          tag
        )
      `)
      .eq('column_id', columnId)
      .eq('column_id', columnId, 'columns.board_id', 'board_members.user_id', userId)
      .order('position', { ascending: true });

    if (error) throw new Error(error.message);

    res.status(200).json({ message: 'Tasks retrieved successfully', tasks });
  } catch (error) {
    next({ message: error.message, statusCode: 500 });
  }
};

const getTaskById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const { data: task, error } = await supabase
      .from('tasks')
      .select(`
        *,
        task_assignees (
          user_id,
          assigned_at,
          profiles (
            id,
            full_name,
            email,
            avatar_url
          )
        ),
        task_tags (
          tag
        ),
        task_comments (
          id,
          user_id,
          content,
          created_at,
          profiles (
            id,
            full_name,
            avatar_url
          )
        ),
        task_attachments (
          id,
          file_name,
          file_url,
          file_size,
          file_type,
          uploaded_by,
          uploaded_at
        )
      `)
      .eq('id', id)
      .eq('column_id', 'columns.board_id', 'board_members.user_id', userId)
      .single();

    if (error || !task) {
      return res.status(404).json({ message: 'Task not found or access denied', statusCode: 404 });
    }

    res.status(200).json({ message: 'Task', task });
  } catch (error) {
    next({ message: error.message, statusCode: 500 });
  }
};

const updateTask = async (req, res, next) => {
  try {
    const { id } = req.params; // Use req.params for task ID
    const { title, description, priority, due_date, status, assignees, tags } = req.body;
    const userId = req.user.id; // Use req.user.id for user ID

    // Fetch task to get column_id and created_by
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('column_id, created_by')
      .eq('id', id)
      .single();

    if (taskError || !task) {
      return res.status(404).json({ message: 'Task not found', statusCode: 404 });
    }

    // Fetch column to get board_id
    const { data: column, error: columnError } = await supabase
      .from('columns')
      .select('board_id')
      .eq('id', task.column_id)
      .single();

    if (columnError || !column) {
      return res.status(404).json({ message: 'Column not found', statusCode: 404 });
    }

    // Check if user is owner, admin, or assignee
    const { data: member, error: memberError } = await supabase
      .from('board_members')
      .select('role')
      .eq('board_id', column.board_id)
      .eq('user_id', userId)
      .single();

    const { data: assignee, error: assigneeError } = await supabase
      .from('task_assignees')
      .select('user_id')
      .eq('task_id', id)
      .eq('user_id', userId)
      .single();

    if ((memberError || !member || !['owner', 'admin'].includes(member.role)) && 
        (assigneeError || !assignee)) {
      return res.status(403).json({ message: 'Only owners, admins, or assignees can update tasks', statusCode: 403 });
    }

    // Prepare task updates
    const updates = {
      title,
      description,
      priority,
      status,
      due_date,
      updated_at: new Date().toISOString(),
    };

    // Update task
    const { data: updatedTask, error: updateError } = await supabase
      .from('tasks')
      .update(Object.fromEntries(
        Object.entries(updates).filter(([_, v]) => v !== undefined)
      ))
      .eq('id', id)
      .select(`
        id,
        column_id,
        title,
        description,
        priority,
        due_date,
        created_by,
        position,
        status,
        created_at,
        updated_at
      `)
      .single();

    if (updateError) throw new Error(updateError.message);

    // Update assignees if provided
    if (Array.isArray(assignees)) {
      // Delete existing assignees
      const { error: deleteAssigneeError } = await supabase
        .from('task_assignees')
        .delete()
        .eq('task_id', id);

      if (deleteAssigneeError) throw new Error(deleteAssigneeError.message);

      // Insert new assignees
      if (assignees.length > 0) {
        const assigneeInserts = assignees.map(user_id => ({
          task_id: id,
          user_id,
        }));

        const { error: assigneeError } = await supabase
          .from('task_assignees')
          .insert(assigneeInserts);

        if (assigneeError) throw new Error(assigneeError.message);
      }
    }

    // Update tags if provided
    if (Array.isArray(tags)) {
      // Delete existing tags
      const { error: deleteTagError } = await supabase
        .from('task_tags')
        .delete()
        .eq('task_id', id);

      if (deleteTagError) throw new Error(deleteTagError.message);

      // Insert new tags
      if (tags.length > 0) {
        const tagInserts = tags.map(tag => ({
          task_id: id,
          tag,
        }));

        const { error: tagError } = await supabase
          .from('task_tags')
          .insert(tagInserts);

        if (tagError) throw new Error(tagError.message);
      }
    }

    // Create notification for task completion
    if (status === 'completed' && updatedTask && task.created_by !== userId) {
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          title: 'Task Completed',
          message: `"${title}" has been marked as completed`,
          type: 'success',
          user_id: task.created_by,
          board_id: column.board_id,
          action_url: `/boards/${column.board_id}/tasks/${id}`,
        });

      if (notificationError) console.error('Notification error:', notificationError);
    }

    res.status(200).json({ message: 'Task updated successfully', task: updatedTask });
  } catch (error) {
    next({ message: error.message, statusCode: 500 });
  }
};


const deleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Fetch task to get column_id
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('column_id')
      .eq('id', id)
      .single();

    if (taskError || !task) {
      return res.status(404).json({ message: 'Task not found', statusCode: 404 });
    }

    // Fetch column to get board_id
    const { data: column, error: columnError } = await supabase
      .from('columns')
      .select('board_id')
      .eq('id', task.column_id)
      .single();

    if (columnError || !column) {
      return res.status(404).json({ message: 'Column not found', statusCode: 404 });
    }

    // Check if user is owner or admin
    const { data: member, error: memberError } = await supabase
      .from('board_members')
      .select('role')
      .eq('board_id', column.board_id)
      .eq('user_id', userId)
      .single();

    if (memberError || !member || !['owner', 'admin'].includes(member.role)) {
      return res.status(403).json({ message: 'Only owners or admins can delete tasks', statusCode: 403 });
    }

    // Delete task (RLS will enforce access control)
    const { error: deleteError } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (deleteError) throw new Error(deleteError.message);

    // Reorder remaining tasks
    const { data: remainingTasks, error: reorderError } = await supabase
      .from('tasks')
      .select('id')
      .eq('column_id', task.column_id)
      .order('position', { ascending: true });

    if (reorderError) throw new Error(reorderError.message);

    for (let i = 0; i < remainingTasks.length; i++) {
      await supabase
        .from('tasks')
        .update({ position: i })
        .eq('id', remainingTasks[i].id);
    }

    res.status(200).json({ message: 'Task deleted successfully' });
  } catch (error) {
    next({ message: error.message, statusCode: 500 });
  }
};

const moveTask = async (req, res, next) => {
  try {
    const { task_id, target_column_id, new_position } = req.body;
    const userId = req.user.id;

    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('column_id')
      .eq('id', task_id)
      .single();

    if (taskError || !task) {
      return res.status(404).json({ message: 'Task not found', statusCode: 404 });
    }

    const { data: member, error: memberError } = await supabase
      .from('board_members')
      .select('role')
      .eq('board_id', 'columns.board_id')
      .eq('user_id', userId)
      .single();

    if (memberError || !member) {
      return res.status(403).json({ message: 'Access denied', statusCode: 403 });
    }

    // Update task position and column
    const { data: updatedTask, error } = await supabase
      .from('tasks')
      .update({
        column_id: target_column_id,
        position: new_position,
        updated_at: new Date().toISOString(),
      })
      .eq('id', task_id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Reorder tasks in source column
    const { data: sourceTasks, error: sourceError } = await supabase
      .from('tasks')
      .select('id')
      .eq('column_id', task.column_id)
      .order('position', { ascending: true });

    if (sourceError) throw new Error(sourceError.message);

    for (let i = 0; i < sourceTasks.length; i++) {
      await supabase
        .from('tasks')
        .update({ position: i })
        .eq('id', sourceTasks[i].id);
    }

    // Reorder tasks in target column
    const { data: targetTasks, error: targetError } = await supabase
      .from('tasks')
      .select('id')
      .eq('column_id', target_column_id)
      .order('position', { ascending: true });

    if (targetError) throw new Error(targetError.message);

    for (let i = 0; i < targetTasks.length; i++) {
      await supabase
        .from('tasks')
        .update({ position: i })
        .eq('id', targetTasks[i].id);
    }

    res.status(200).json({ message: 'Task moved successfully', task: updatedTask });
  } catch (error) {
    next({ message: error.message, statusCode: 500 });
  }
};

const addAssignee = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;
    const currentUserId = req.user.id;

    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('column_id, title')
      .eq('id', id)
      .single();

    if (taskError || !task) {
      return res.status(404).json({ message: 'Task not found', statusCode: 404 });
    }

    const { data: member, error: memberError } = await supabase
      .from('board_members')
      .select('role')
      .eq('board_id', 'columns.board_id')
      .eq('user_id', currentUserId)
      .single();

    if (memberError || !member) {
      return res.status(403).json({ message: 'Access denied', statusCode: 403 });
    }

    // Verify user is a board member
    const { data: newMember, error: newMemberError } = await supabase
      .from('board_members')
      .select('id')
      .eq('board_id', 'columns.board_id')
      .eq('user_id', user_id)
      .single();

    if (newMemberError || !newMember) {
      return res.status(400).json({ message: 'User is not a board member', statusCode: 400 });
    }

    const { data: assignee, error } = await supabase
      .from('task_assignees')
      .insert({
        task_id: id,
        user_id,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Create notification
    if (user_id !== currentUserId) {
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          title: 'Task Assigned',
          message: `You were assigned to "${task.title}"`,
          type: 'info',
          user_id,
          board_id: 'columns.board_id',
          action_url: `/boards/${'columns.board_id'}/tasks/${id}`,
        });

      if (notificationError) console.error('Notification error:', notificationError);
    }

    res.status(201).json({ message: 'Assignee added successfully', assignee });
  } catch (error) {
    next({ message: error.message, statusCode: 500 });
  }
};

const removeAssignee = async (req, res, next) => {
  try {
    const { id, userId } = req.params;
    const currentUserId = req.user.id;

    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('column_id')
      .eq('id', id)
      .single();

    if (taskError || !task) {
      return res.status(404).json({ message: 'Task not found', statusCode: 404 });
    }

    const { data: member, error: memberError } = await supabase
      .from('board_members')
      .select('role')
      .eq('board_id', 'columns.board_id')
      .eq('user_id', currentUserId)
      .single();

    if (memberError || !member) {
      return res.status(403).json({ message: 'Access denied', statusCode: 403 });
    }

    const { error } = await supabase
      .from('task_assignees')
      .delete()
      .eq('task_id', id)
      .eq('user_id', userId);

    if (error) throw new Error(error.message);

    res.status(200).json({ message: 'Assignee removed successfully' });
  } catch (error) {
    next({ message: error.message, statusCode: 500 });
  }
};

const addTag = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { tag } = req.body;
    const userId = req.user.id;

    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('column_id')
      .eq('id', id)
      .single();

    if (taskError || !task) {
      return res.status(404).json({ message: 'Task not found', statusCode: 404 });
    }

    const { data: member, error: memberError } = await supabase
      .from('board_members')
      .select('role')
      .eq('board_id', 'columns.board_id')
      .eq('user_id', userId)
      .single();

    if (memberError || !member) {
      return res.status(403).json({ message: 'Access denied', statusCode: 403 });
    }

    const { data: newTag, error } = await supabase
      .from('task_tags')
      .insert({
        task_id: id,
        tag,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    res.status(201).json({ message: 'Tag added successfully', tag: newTag });
  } catch (error) {
    next({ message: error.message, statusCode: 500 });
  }
};

const removeTag = async (req, res, next) => {
  try {
    const { id, tag } = req.params;
    const userId = req.user.id;

    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('column_id')
      .eq('id', id)
      .single();

    if (taskError || !task) {
      return res.status(404).json({ message: 'Task not found', statusCode: 404 });
    }

    const { data: member, error: memberError } = await supabase
      .from('board_members')
      .select('role')
      .eq('board_id', 'columns.board_id')
      .eq('user_id', userId)
      .single();

    if (memberError || !member) {
      return res.status(403).json({ message: 'Access denied', statusCode: 403 });
    }

    const { error } = await supabase
      .from('task_tags')
      .delete()
      .eq('task_id', id)
      .eq('tag', tag);

    if (error) throw new Error(error.message);

    res.status(200).json({ message: 'Tag removed successfully' });
  } catch (error) {
    next({ message: error.message, statusCode: 500 });
  }
};

const addComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('column_id, title')
      .eq('id', id)
      .single();

    if (taskError || !task) {
      return res.status(404).json({ message: 'Task not found', statusCode: 404 });
    }

    const { data: member, error: memberError } = await supabase
      .from('board_members')
      .select('role')
      .eq('board_id', 'columns.board_id')
      .eq('user_id', userId)
      .single();

    if (memberError || !member) {
      return res.status(403).json({ message: 'Access denied', statusCode: 403 });
    }

    const { data: comment, error } = await supabase
      .from('task_comments')
      .insert({
        task_id: id,
        user_id: userId,
        content,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Notify assignees and creator (except commenter)
    const { data: recipients, error: recipientError } = await supabase
      .from('task_assignees')
      .select('user_id')
      .eq('task_id', id);

    if (recipientError) console.error('Recipient error:', recipientError);

    const notificationInserts = recipients
      .filter(r => r.user_id !== userId)
      .concat(task.created_by !== userId ? [{ user_id: task.created_by }] : [])
      .map(r => ({
        title: 'New Comment',
        message: `A new comment was added to "${task.title}"`,
        type: 'info',
        user_id: r.user_id,
        board_id: 'columns.board_id',
        action_url: `/boards/${'columns.board_id'}/tasks/${id}`,
      }));

    if (notificationInserts.length > 0) {
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notificationInserts);

      if (notificationError) console.error('Notification error:', notificationError);
    }

    res.status(201).json({ message: 'Comment added successfully', comment });
  } catch (error) {
    next({ message: error.message, statusCode: 500 });
  }
};

const deleteComment = async (req, res, next) => {
  try {
    const { id, commentId } = req.params;
    const userId = req.user.id;

    const { data: comment, error: commentError } = await supabase
      .from('task_comments')
      .select('user_id')
      .eq('id', commentId)
      .eq('task_id', id)
      .single();

    if (commentError || !comment) {
      return res.status(404).json({ message: 'Comment not found', statusCode: 404 });
    }

    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('column_id')
      .eq('id', id)
      .single();

    if (taskError || !task) {
      return res.status(404).json({ message: 'Task not found', statusCode: 404 });
    }

    const { data: member, error: memberError } = await supabase
      .from('board_members')
      .select('role')
      .eq('board_id', 'columns.board_id')
      .eq('user_id', userId)
      .single();

    if (memberError || !member || (comment.user_id !== userId && !['owner', 'admin'].includes(member.role))) {
      return res.status(403).json({ message: 'Only comment author or admins can delete comments', statusCode: 403 });
    }

    const { error } = await supabase
      .from('task_comments')
      .delete()
      .eq('id', commentId);

    if (error) throw new Error(error.message);

    res.status(200).json({ message: 'Comment deleted successfully' });
  } catch (error) {
    next({ message: error.message, statusCode: 500 });
  }
};

const addAttachment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { file_name, file_url, file_size, file_type } = req.body;
    const userId = req.user.id;

    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('column_id')
      .eq('id', id)
      .single();

    if (taskError || !task) {
      return res.status(404).json({ message: 'Task not found', statusCode: 404 });
    }

    const { data: member, error: memberError } = await supabase
      .from('board_members')
      .select('role')
      .eq('board_id', 'columns.board_id')
      .eq('user_id', userId)
      .single();

    if (memberError || !member) {
      return res.status(403).json({ message: 'Access denied', statusCode: 403 });
    }

    const { data: attachment, error } = await supabase
      .from('task_attachments')
      .insert({
        task_id: id,
        file_name,
        file_url,
        file_size,
        file_type,
        uploaded_by: userId,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    res.status(201).json({ message: 'Attachment added successfully', attachment });
  } catch (error) {
    next({ message: error.message, statusCode: 500 });
  }
};

const deleteAttachment = async (req, res, next) => {
  try {
    const { id, attachmentId } = req.params;
    const userId = req.user.id;

    const { data: attachment, error: attachmentError } = await supabase
      .from('task_attachments')
      .select('uploaded_by')
      .eq('id', attachmentId)
      .eq('task_id', id)
      .single();

    if (attachmentError || !attachment) {
      return res.status(404).json({ message: 'Attachment not found', statusCode: 404 });
    }

    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('column_id')
      .eq('id', id)
      .single();

    if (taskError || !task) {
      return res.status(404).json({ message: 'Task not found', statusCode: 404 });
    }

    const { data: member, error: memberError } = await supabase
      .from('board_members')
      .select('role')
      .eq('board_id', 'columns.board_id')
      .eq('user_id', userId)
      .single();

    if (memberError || !member || (attachment.uploaded_by !== userId && !['owner', 'admin'].includes(member.role))) {
      return res.status(403).json({ message: 'Only uploader or admins can delete attachments', statusCode: 403 });
    }

    const { error } = await supabase
      .from('task_attachments')
      .delete()
      .eq('id', attachmentId);

    if (error) throw new Error(error.message);

    res.status(200).json({ message: 'Attachment deleted successfully' });
  } catch (error) {
    next({ message: error.message, statusCode: 500 });
  }
};

module.exports = {
  createTask,
  getTasksByColumn,
  getTaskById,
  updateTask,
  deleteTask,
  moveTask,
  addAssignee,
  removeAssignee,
  addTag,
  removeTag,
  addComment,
  deleteComment,
  addAttachment,
  deleteAttachment,
  getAllTasks
};