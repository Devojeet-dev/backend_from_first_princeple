import * as taskService from '../services/task.service.js';

export async function getAll(req, res, next) {
  try {
    const { status, priority, page, limit } = req.query;
    const result = await taskService.findAll({
      userId: req.user.id,
      role: req.user.role,
      status,
      priority,
      page,
      limit,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const task = await taskService.findById(req.params.id, req.user.id, req.user.role);
    res.json(task);
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const task = await taskService.create(req.body, req.user.id);
    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const task = await taskService.update(req.params.id, req.body, req.user.id, req.user.role);
    res.json(task);
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    await taskService.remove(req.params.id, req.user.id, req.user.role);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
