import { Router } from 'express';
import maintenanceRouter from './maintanance';
import enRouteRouter from './en-route';

const router = Router();

// Mount module routers
router.use('/maintenance', maintenanceRouter);
router.use('/enroute', enRouteRouter);

export default router;
