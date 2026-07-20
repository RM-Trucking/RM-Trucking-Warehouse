import { Router } from 'express';
import maintenanceRouter from './maintanance';
import enRouteRouter from './en-route';
import idVerificationRouter from './id-verification';
import warehouseReceiptRouter from './warehouse-receipt';
import shipmentRouter from './shipment';

const router = Router();

// Mount module routers
router.use('/maintenance', maintenanceRouter);
router.use('/enroute', enRouteRouter);
router.use('/id-verification', idVerificationRouter);
router.use('/warehouse-receipt', warehouseReceiptRouter);
router.use('/shipment', shipmentRouter);

export default router;
