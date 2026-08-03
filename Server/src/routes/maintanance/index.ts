import { Router } from 'express';
import authRouter from './auth';
import customerRouter from './customer';
import carrierRouter from './carrier';
import devicesRouter from './devices';
import noteRouter from './note';
import airlineRouter from './airline';


const router = Router();


router.use('/auth', authRouter);
router.use('/customer', customerRouter);
router.use('/carrier', carrierRouter);
router.use('/devices', devicesRouter);
router.use('/note', noteRouter);
router.use('/airline', airlineRouter);



export default router;
