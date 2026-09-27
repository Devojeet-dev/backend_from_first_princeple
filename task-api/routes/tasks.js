import { Router } from 'express';
import * as taskController from '../controllers/task.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validateCreateTask } from '../middleware/validate.js';

const router = Router();

// All task routes require a valid JWT
router.use(authenticate);

router.get('/', taskController.getAll);
router.post('/', validateCreateTask, taskController.create);
router.get('/:id', taskController.getById);
router.patch('/:id', taskController.update);
router.delete('/:id', taskController.remove);

export default router;
