import { combineReducers } from 'redux';
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
// ----------------------------------------------------------------------

const rootPersistConfig = {
  key: 'root',
  storage,
  keyPrefix: 'redux-',
  whitelist: [],
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
});

export { rootPersistConfig, rootReducer };
