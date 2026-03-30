import { Router } from 'express';
import authRouter from './auth';
import customerRouter from './customer';
import carrierRouter from './carrier';


const router = Router();


router.use('/auth', authRouter);
router.use('/customer', customerRouter);
router.use('/carrier', carrierRouter);



export default router;
