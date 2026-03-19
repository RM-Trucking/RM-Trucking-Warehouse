import { createSlice } from '@reduxjs/toolkit';
// utils
import axios from '../../utils/axios';
//
import { dispatch } from '../store';


// ----------------------------------------------------------------------

const initialState = {
  isLoading: false,
  error: null,
  zoneSuccess: false,
  zoneData: [],
  zoneZipCodeCheckData: [],
  zoneSearchStr: '',
  operationalMessage: '',
  selectedZoneRowDetails: {},
  pagination: { page: 1, pageSize: 10, totalRecords: 0 },
  zoneRateData: [],
  zipCheck: false,
};

const slice = createSlice({
  name: 'zone',
  initialState,
  reducers: {
    hasError(state, action) {
      state.isLoading = false;
      state.zipCheck = false;
      state.error = action.payload || action.payload.error || action.payload.message;
    },
    // START LOADING
    startLoading(state) {
      state.isLoading = true;
      state.zoneSuccess = false;
      state.error = null;
      state.operationalMessage = '';
      state.zipCheck = false;
    },
    setPaginationObject(state, action) {
      state.pagination = action.payload;
    },
    setZoneSearchStr(state, action) {
      state.zoneSearchStr = action.payload;
    },
    // zone row details
    setSelectedZoneRowDetails(state, action) {
      state.selectedZoneRowDetails = action.payload;
    },
    getZoneDataSuccess(state, action) {
      state.isLoading = false;
      state.zoneSuccess = true;
      state.zoneData = action.payload.data;
      state.pagination = {
        page: action.payload.pagination.page,
        pageSize: action.payload.pagination.pageSize,
        totalRecords: action.payload.pagination.total,
      };
    },
    postZoneDataSuccess(state, action) {
      state.isLoading = false;
      state.zoneSuccess = true;
      if (action?.payload?.message.includes('Conflict detected')) {
        // on conflict zipcode messae we make this zipcheck to true such that we show the confirm dialog
        state.zipCheck = true;
        state.zoneZipCodeCheckData = action.payload.zones;
        localStorage.setItem('zoneZipCodeCheckData', JSON.stringify([]));
        localStorage.setItem('zoneZipCodeCheckData', JSON.stringify(action.payload.zones));
      } else {
        state.operationalMessage = `Zone added successfully.`;
        state.zoneData.unshift(action.payload.data);
        state.pagination.totalRecords = action.payload?.total + 1 || state.pagination.totalRecords + 1;
      }
    },
    putZoneDataSuccess(state, action) {
      state.isLoading = false;
      state.zoneSuccess = true;
      if (action?.payload?.message.includes('Conflict detected')) {
        // on conflict zipcode messae we make this zipcheck to true such that we show the confirm dialog
        state.zipCheck = true;
        state.zoneZipCodeCheckData = action.payload.zones;
        localStorage.setItem('zoneZipCodeCheckData', JSON.stringify([]));
        localStorage.setItem('zoneZipCodeCheckData', JSON.stringify(action.payload.zones));
      } else {
        state.operationalMessage = "Zone updated successfully";
        // update table data by updating record
        const index = state.zoneData.findIndex((row) => row.zoneId === action.payload?.data?.zoneId);
        if (index === 0 || index > 0) {
          state.zoneData.splice(index, 1, action.payload.data);
        }
      }
    },
    getZoneByIdSuccess(state, action) {
      state.isLoading = false;
      state.zoneSuccess = true;
      state.selectedZoneRowDetails = action.payload.data;
    },
    deleteZoneDataSuccess(state, action) {
      state.isLoading = false;
      state.zoneSuccess = true;
      state.operationalMessage = `Zone deleted successfully.`;
    },
    setOperationalMessage(state) {
      state.operationalMessage = '';
    },
    setZoneZipCodeData(state, action) {
      state.zoneZipCodeCheckData = action.payload;
    },
    getZoneCustomerRateSuccess(state, action) {
      state.isLoading = false;
      state.zoneSuccess = true;
      state.zoneRateData = action.payload.data;
      state.pagination.page = action.payload.pagination.page;
      state.pagination.pageSize = action.payload.pagination.pageSize;
      state.pagination.totalRecords = action.payload.pagination.total;
    },
    getZoneCarrierRateSuccess(state,action){
      state.isLoading = false;
      state.zoneSuccess = true;
      state.zoneRateData = action.payload.data;
      state.pagination.page = action.payload.pagination.page;
      state.pagination.pageSize = action.payload.pagination.pageSize;
      state.pagination.totalRecords = action.payload.pagination.total;
    },
    setZoneRateData(state, action) {
      state.zoneRateData = action.payload;
    },
  },
});

export const {
  setOperationalMessage,
  setPaginationObject,
  setZoneSearchStr,
  setSelectedZoneRowDetails,
  setZoneZipCodeData,
  setZoneRateData,
} = slice.actions;
export default slice.reducer;


// Actions

// ----------------------------------------------------------------------
export function getZoneData({ pageNo, pageSize, searchStr }) {
  return async () => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.get(`maintenance/zone?page=${pageNo}&pageSize=${pageSize}${searchStr ? `&search=${searchStr}` : ''}`);
      dispatch(slice.actions.getZoneDataSuccess(response.data));
    } catch (error) {
      dispatch(slice.actions.hasError(error));
    }
  };
}
export function postZoneData(obj, zipCheck) {
  return async () => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.post(`maintenance/zone?force=${zipCheck}`, obj);
      dispatch(slice.actions.postZoneDataSuccess(response.data));
    } catch (error) {
      dispatch(slice.actions.hasError(error))
    }
  };
}
export function putZoneData(id, obj, zipCheck) {
  return async () => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.put(`maintenance/zone/${id}?force=${zipCheck}`, obj);
      dispatch(slice.actions.putZoneDataSuccess(response.data));
    } catch (error) {
      dispatch(slice.actions.hasError(error))
    }
  };
}
export function deleteZone(id, callback) {
  return async () => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.delete(`maintenance/zone/${id}`);
      dispatch(slice.actions.deleteZoneDataSuccess({
        id, message: response.data
      }));
      callback();
    } catch (error) {
      dispatch(slice.actions.hasError(error))
    }
  };
}
export function getZoneById(id) {
  return async () => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.get(`maintenance/zone/${id}`);
      dispatch(slice.actions.getZoneByIdSuccess(response.data));
    } catch (error) {
      dispatch(slice.actions.hasError(error))
    }
  };
}
// on rate click get rate retaled data by zoneid
export function getZoneCustomerRate(pageNo, pageSize, zoneId) {
  return async () => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.get(`maintenance/customer-rate/transport-rate/by-zone?zoneId=${zoneId}&page=${pageNo}&pageSize=${pageSize}`);
      dispatch(slice.actions.getZoneCustomerRateSuccess(response.data));
    } catch (error) {
      dispatch(slice.actions.hasError(error));
    }
  };
}
export function getZoneCarrierRate(pageNo, pageSize, zoneId) {
  return async () => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.get(`maintenance/carrier-rate/transport-rate/by-zone?zoneId=${zoneId}&page=${pageNo}&pageSize=${pageSize}`);
      dispatch(slice.actions.getZoneCarrierRateSuccess(response.data));
    } catch (error) {
      dispatch(slice.actions.hasError(error));
    }
  };
}
