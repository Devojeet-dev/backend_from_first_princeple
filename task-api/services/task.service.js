import Task from '../models/Task.js';
import AppError from '../utils/AppError.js';

export async function findAll({ userId, role, status, priority, page = 1, limit = 10 }) {
  const filter = {};

  // Regular users only see their own tasks; admins see all
  if (role !== 'admin') filter.owner = userId;
  if (status) filter.status = status;
  if (priority) filter.priority = priority;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [tasks, total] = await Promise.all([
    Task.find(filter)
      .populate('owner', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Task.countDocuments(filter),
  ]);

  return {
    data: tasks,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  };
}

export async function findById(taskId, userId, role) {
  const task = await Task.findById(taskId).populate('owner', 'name email');
  if (!task) throw new AppError('Task not found', 404);

  // Ownership check: only the owner or an admin can view
  if (role !== 'admin' && task.owner._id.toString() !== userId) {
    throw new AppError('You do not have permission to access this task', 403);
  }

  return task;
}

export async function create({ title, description, status, priority, dueDate }, ownerId) {
  const task = await Task.create({ title, description, status, priority, dueDate, owner: ownerId });
  return task.populate('owner', 'name email');
}

export async function update(taskId, updates, userId, role) {
  const task = await Task.findById(taskId);
  if (!task) throw new AppError('Task not found', 404);

  if (role !== 'admin' && task.owner.toString() !== userId) {
    throw new AppError('You do not have permission to update this task', 403);
  }

  const allowed = ['title', 'description', 'status', 'priority', 'dueDate'];
  for (const field of allowed) {
    if (updates[field] !== undefined) task[field] = updates[field];
  }

  await task.save();
  return task.populate('owner', 'name email');
}

export async function remove(taskId, userId, role) {
  const task = await Task.findById(taskId);
  if (!task) throw new AppError('Task not found', 404);

  if (role !== 'admin' && task.owner.toString() !== userId) {
    throw new AppError('You do not have permission to delete this task', 403);
  }

  await task.deleteOne();
}
