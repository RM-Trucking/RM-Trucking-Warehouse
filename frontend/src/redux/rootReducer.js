import { combineReducers } from 'redux';
import { createMigrate } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
// import slices
import dashboardReducer from './slices/dashboard';
import carrierReducer from './slices/carrier';
import customerReducer from './slices/customer';
import fuelReducer from './slices/fuel';
import noteReducer from './slices/note';
import rateReducer from './slices/rate';
import zoneReducer from './slices/zone';
import accessorialReducer from './slices/accessorial';
import shipmentReducer from './slices/shipment';
import enrouteReducer from './slices/enroute';
import idVerificationReducer from './slices/idVerification';
import warehouseReducer from './slices/warehouse';
import warehouseReceiptReducer from './slices/warehouseReceipt';
import locationScanReducer from './slices/locationScan';
// ----------------------------------------------------------------------

const rootPersistConfig = {
  key: 'root',
  storage,
  keyPrefix: 'redux-',
  whitelist: ['idVerificationdata'],
  version: 1,
  migrate: createMigrate({
    1: (state) => {
      if (!state?.idVerificationdata) return state;

      return {
        ...state,
        idVerificationdata: {
          ...state.idVerificationdata,
          paginationModel: { page: 0, pageSize: 50 },
        },
      };
    },
  }),
};

const rootReducer = combineReducers({
  // combine reducers
  dashboarddata : dashboardReducer,
  carrierdata: carrierReducer,
  customerdata: customerReducer,
  fueldata: fuelReducer,
  notedata: noteReducer,
  ratedata: rateReducer,
  zonedata: zoneReducer,
  accessorialdata: accessorialReducer,
  shipmentdata: shipmentReducer,
  enroutedata: enrouteReducer,
  warehousedata: warehouseReducer,
  warehouseReceiptdata: warehouseReceiptReducer,
  locationScandata: locationScanReducer,
  idVerificationdata: idVerificationReducer,
});

export { rootPersistConfig, rootReducer };
