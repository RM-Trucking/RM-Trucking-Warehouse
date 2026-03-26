import { Router } from 'express';
import authRouter from './auth';


const router = Router();

// Mount module routers

router.use('/auth', authRouter);

export default router;
