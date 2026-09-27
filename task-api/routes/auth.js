import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { validateRegister, validateLogin } from '../middleware/validate.js';

const router = Router();

router.post('/register', validateRegister, authController.register);
router.post('/login', validateLogin, authController.login);

export default router;
