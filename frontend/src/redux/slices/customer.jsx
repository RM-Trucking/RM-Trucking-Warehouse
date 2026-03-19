import { createSlice } from '@reduxjs/toolkit';
// utils
import axios from '../../utils/axios';
//
import { dispatch } from '../store';


// ----------------------------------------------------------------------

const initialState = {
  isLoading: false,
  error: null,
  customerSuccess: false,
  customerRows: [],
  customerSearchStr: "",
  stationSearchStr: "",
  selectedCustomerRowDetails: {},
  selectedCustomerStationDetails: {},
  selectedStationTabRowDetails: {},
  stationRows: [],
  tableWhichBeingViewed: '',
  stationCurrentTab: 'department',
  stationTabTableData: [],
  checkedRates: [],
  pagination: { page: 1, pageSize: 10, totalRecords: 0 },
  operationalMessage: '',
  departmentData: [],
  accessorialData: [],
};

const slice = createSlice({
  name: 'customer',
  initialState,
  reducers: {
    hasError(state, action) {
      state.isLoading = false;
      state.error = action.payload || action.payload.error;
    },
    // START LOADING
    startLoading(state) {
      state.isLoading = true;
      state.customerSuccess = false;
      state.error = null;
      state.operationalMessage = '';
    },
    // set pagination object of the current table
    setPaginationObject(state, action) {
      state.pagination = action.payload;
    },

    // CRUD operations of customer
    getCustomerdataSuccess(state, action) {
      state.isLoading = false;
      state.customerSuccess = true;
      state.customerRows = action.payload.data;
      state.pagination.page = action.payload.pagination.page;
      state.pagination.pageSize = action.payload.pagination.pageSize;
      state.pagination.totalRecords = action.payload.pagination.total;
    },
    postCustomerdataSuccess(state, action) {
      state.isLoading = false;
      state.customerSuccess = true;
      state.operationalMessage = action.payload.message || 'Customer created successfully';
      console.log("customer post payload", action.payload.data.customer);
      state.customerRows.unshift(action.payload.data.customer);
    },
    putCustomerdataSuccess(state, action) {
      state.isLoading = false;
      console.log("customer put payload", action.payload.data);
      state.customerSuccess = true;
      state.operationalMessage = action.payload.message || 'Customer updated successfully';
      const index = state.customerRows.findIndex((row) => row.customerId === action.payload?.data?.customerId);
      if (index === 0 || index > 0) {
        state.customerRows.splice(index, 1, action.payload.data);
      }
    },
    customerStatusChangeSuccess(state, action) {
      state.isLoading = false;
      state.customerSuccess = true;
      state.operationalMessage = action.payload.message.message || 'Customer activated successfully';
      const index = state.customerRows.findIndex((row) => row.customerId === action.payload.message?.data?.customerId);
      if (index === 0 || index > 0) {
        state.customerRows.splice(index, 1, action.payload.message.data);
      }
    },

    // station table data in customer
    getCustomerStationDataSuccess(state, action) {
      state.isLoading = false;
      state.stationRows = action.payload.data;
      state.pagination.page = action.payload.pagination.page;
      state.pagination.pageSize = action.payload.pagination.pageSize;
      state.pagination.totalRecords = action.payload.pagination.total;
    },
    postStationdataSuccess(state, action) {
      state.isLoading = false;
      state.customerSuccess = true;
      state.operationalMessage = action.payload.message || 'Station created successfully';
      console.log("station post payload", action.payload.data);
      state.stationRows.unshift(action.payload.data);
    },
    putStationdataSuccess(state, action) {
      state.isLoading = false;
      state.customerSuccess = true;
      state.operationalMessage = action.payload.message || 'Station updated successfully';
      console.log("station put payload", action.payload.data);
      const index = state.stationRows.findIndex((row) => row.stationId === action.payload?.data?.stationId);
      if (index === 0 || index > 0) {
        state.stationRows.splice(index, 1, action.payload.data);
      }
    },
    deleteStationdataSuccess(state, action) {
      state.isLoading = false;
      state.customerSuccess = true;
      state.operationalMessage = action.payload.message.message || 'Station deleted successfully';
      console.log("station delete payload", action.payload);
      const index = state.stationRows.findIndex((row) => row.stationId === action.payload.id);
      if (index === 0 || index > 0) {
        state.stationRows.splice(index, 1);
      }
    },

    // station tabs data
    // department
    getStationDepartmentDataSuccess(state, action) {
      state.isLoading = false;
      state.stationTabTableData = action.payload.data;
    },
    postStationDepartmentdataSuccess(state, action) {
      state.isLoading = false;
      state.customerSuccess = true;
      state.operationalMessage = action.payload.message || 'Department created successfully';
      console.log("department post payload", action.payload.data);
      state.stationTabTableData.unshift(action.payload.data);
    },
    putStationdDepartmentataSuccess(state, action) {
      state.isLoading = false;
      state.customerSuccess = true;
      state.operationalMessage = action.payload.message || 'Department updated successfully';
      console.log("department put payload", state.stationTabTableData, action.payload.data);
      const index = state.stationTabTableData.findIndex((row) => row.departmentId === action.payload?.data?.departmentId);
      if (index === 0 || index > 0) {
        state.stationTabTableData.splice(index, 1, action.payload.data);
      }
    },
    deleteStationDepartmentdataSuccess(state, action) {
      state.isLoading = false;
      state.customerSuccess = true;
      state.operationalMessage = action.payload.message.message || 'Department deleted successfully';
      console.log("department delete payload", action.payload);
      const index = state.stationTabTableData.findIndex((row) => row.departmentId === action.payload.id);
      if (index === 0 || index > 0) {
        state.stationTabTableData.splice(index, 1);
      }
    },

    // personnel
    getDepartmentDataSuccess(state, action) {
      state.isLoading = false;
      state.departmentData = action.payload.data;
    },
    getStationPersonnelDataSuccess(state, action) {
      state.isLoading = false;
      state.stationTabTableData = action?.payload?.data;
      state.pagination.page = action.payload.pagination.page;
      state.pagination.pageSize = action.payload.pagination.pageSize;
      state.pagination.totalRecords = action.payload.pagination.total;
    },
    postStationPersonneldataSuccess(state, action) {
      state.isLoading = false;
      state.customerSuccess = true;
      state.operationalMessage = action.payload.message || 'Personnel created successfully';
      console.log("personnel post payload", action.payload.data);
      state.stationTabTableData.unshift(action.payload.data);
      state.pagination.totalRecords = action?.payload?.pagination?.total + 1 || state.stationTabTableData.length;
    },
    putStationdPersonneldataSuccess(state, action) {
      state.isLoading = false;
      state.customerSuccess = true;
      state.operationalMessage = action.payload.message || 'Personnel updated successfully';
      console.log("personnel put payload", action.payload.data);
      const index = state.stationTabTableData.findIndex((row) => row.personnelId === action.payload?.data?.personnelId);
      if (index === 0 || index > 0) {
        state.stationTabTableData.splice(index, 1, action.payload.data);
      }
    },
    deleteStationPersonneldataSuccess(state, action) {
      state.isLoading = false;
      state.customerSuccess = true;
      state.operationalMessage = action.payload.message.message || 'Personnel deleted successfully';
      console.log("personnel delete payload", action.payload);
      const index = state.stationTabTableData.findIndex((row) => row.personnelId === action.payload.id);
      if (index === 0 || index > 0) {
        state.stationTabTableData.splice(index, 1);
      }
    },

    // rate
    getStationRateDataSuccess(state, action) {
      state.isLoading = false;
      state.customerSuccess = true;
      state.stationTabTableData = action.payload.data;
    },
    deleteStationRateSuccess(state, action) {
      state.isLoading = false;
      state.customerSuccess = true;
      state.operationalMessage = 'Station rate deleted successfully';
    },

    // accessorial
    getAccessorialDataSuccess(state, action) {
      state.isLoading = false;
      state.customerSuccess = true;
      state.accessorialData = action.payload.data;
    },
    getStationAccessorialDataSuccess(state, action) {
      state.isLoading = false;
      state.customerSuccess = true;
      state.stationTabTableData = action.payload.data;
    },
    postStationAccessorialDataSuccess(state, action) {
      state.isLoading = false;
      state.customerSuccess = true;
      state.operationalMessage = "Accessorial created successfully";
      state.stationTabTableData.unshift(action.payload.data);
    },
    putStationAccessorialDataSuccess(state, action) {
      state.isLoading = false;
      state.customerSuccess = true;
      state.operationalMessage = action.payload.message || 'Accessorial updated successfully';
      console.log("Accessorial put payload", action.payload.data);
      const index = state.stationTabTableData.findIndex((row) => row.accessorialId === action.payload?.data?.accessorialId);
      if (index === 0 || index > 0) {
        state.stationTabTableData.splice(index, 1, action.payload.data);
      }
    },
    deleteStationAccessorialDataSuccess(state, action) {
      state.isLoading = false;
      state.customerSuccess = true;
      state.operationalMessage = action.payload.message.message || 'Accessorial deleted successfully';
      const index = state.stationTabTableData.findIndex((row) => row.accessorialId === action.payload.id);
      if (index === 0 || index > 0) {
        state.stationTabTableData.splice(index, 1);
      }
    },
    patchStationAccessorialDataSuccess(state,action){
      state.isLoading = false;
      state.customerSuccess = true;
      state.operationalMessage = action.payload.message.message || 'Accessorial Service updated successfully';
    },

    // set values
    setStationRateData(state, action) {
      console.log('Setting station rate data in customer slice:', action.payload);
      if (action.payload.checked) {
        state.checkedRates.push({
          rateID: action.payload.row.rateId,
          origin: action.payload.row.origin,
          originZipCode: action.payload.row.originZipCode,
          destination: action.payload.row.destination,
          destinationZipCode: action.payload.row.destinationZipCode,
          minRate: action.payload.row.min,
          rateLB: "",
          maxRate: action.payload.row.max,
          expiryDate: action.payload.row.expiryDate
        });
      }
      else {
        const filteredRates = state.checkedRates.filter(rate => rate.rateID !== action.payload.row.rateID);
        console.log('Filtered Rates:', filteredRates);
        state.checkedRates = filteredRates;
      }
    },
    // customer search string on customer page
    setCustomerSearchStr(state, action) {
      state.customerSearchStr = action.payload;
    },
    setStationSearchStr(state, action) {
      state.stationSearchStr = action.payload;
    },
    // customer row details
    setSelectedCustomerRowDetails(state, action) {
      state.selectedCustomerRowDetails = action.payload;
    },
    // station row details
    setSelectedCustomerStationRowDetails(state, action) {
      state.selectedCustomerStationDetails = action.payload;
    },
    // station tab row details
    setSelectedStationTabRowDetails(state, action) {
      state.selectedStationTabRowDetails = action.payload;
    },
    // which table is being viewed on Ui
    setTableBeingViewed(state, action) {
      state.tableWhichBeingViewed = action.payload;
    },
    // which tab is being viewed on UI in station details
    setStationCurrentTab(state, action) {
      state.stationCurrentTab = action.payload;
      state.tableWhichBeingViewed = action.payload;
    },
    setStationTabTableData(state) {
      state.stationTabTableData = [];
    },
    setOperationalMessage(state) {
      state.operationalMessage = '';
    }
  },
});

export const {
  setCustomerSearchStr,
  setOperationalMessage,
  setStationSearchStr,
  setSelectedCustomerRowDetails,
  setSelectedCustomerStationRowDetails,
  setTableBeingViewed,
  setStationCurrentTab,
  setSelectedStationTabRowDetails,
  setStationRateData,
  setStationTabTableData,
} = slice.actions;
export default slice.reducer;


// Actions

// ----------------------------------------------------------------------
// CRUD operations of Customer
export function getCustomerData({ pageNo, pageSize, searchStr }) {
  return async () => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.get(`maintenance/customer?${searchStr ? `search=${searchStr}&` : ''}page=${pageNo}&pageSize=${pageSize}`);
      dispatch(slice.actions.getCustomerdataSuccess(response.data));
    } catch (error) {
      dispatch(slice.actions.hasError(error));
    }
  };
}
export function postCustomerData(obj) {
  return async () => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.post(`maintenance/customer`, obj);
      dispatch(slice.actions.postCustomerdataSuccess(response.data));
    } catch (error) {
      dispatch(slice.actions.hasError(error))
    }
  };
}
export function putCustomerData(obj, id) {
  return async () => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.put(`maintenance/customer/${id}`, obj);
      dispatch(slice.actions.putCustomerdataSuccess(response.data));
    } catch (error) {
      dispatch(slice.actions.hasError(error))
    }
  };
}
export function customerStatusChange(id, obj) {
  return async () => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.put(`maintenance/customer/${id}/toggle`, obj);
      dispatch(slice.actions.customerStatusChangeSuccess({
        id, message: response.data
      }));
    } catch (error) {
      dispatch(slice.actions.hasError(error))
    }
  };
}

// CRUD operations of station
export function getCustomerStationData({ pageNo, pageSize, searchStr, customerId }) {
  return async () => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.get(`maintenance/station/customer/${customerId}?page=${pageNo}&pageSize=${pageSize}${searchStr ? `&search=${searchStr}` : ''}`);
      dispatch(slice.actions.getCustomerStationDataSuccess(response.data));
    } catch (error) {
      dispatch(slice.actions.hasError(error));
    }
  };
}
export function postStationData(obj) {
  return async () => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.post(`maintenance/station`, obj);
      dispatch(slice.actions.postStationdataSuccess(response.data));
    } catch (error) {
      dispatch(slice.actions.hasError(error))
    }
  };
}
export function putStationData(id, obj) {
  return async () => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.put(`maintenance/station/${id}`, obj);
      dispatch(slice.actions.putStationdataSuccess(response.data));
    } catch (error) {
      dispatch(slice.actions.hasError(error))
    }
  };
}
export function deleteStation(id, callback) {
  return async () => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.delete(`maintenance/station/${id}`);
      dispatch(slice.actions.deleteStationdataSuccess({
        id, message: response.data
      }));
      callback();
    } catch (error) {
      dispatch(slice.actions.hasError(error))
    }
  };
}

// CRUD operations of Department
export function getStationDepartmentData(stationId) {
  return async () => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.get(`maintenance/department/station/${stationId}`);
      dispatch(slice.actions.getStationDepartmentDataSuccess(response.data));
    } catch (error) {
      dispatch(slice.actions.hasError(error));
    }
  };
}
export function postStationDepartmentData(obj) {
  return async () => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.post(`maintenance/department`, obj);
      dispatch(slice.actions.postStationDepartmentdataSuccess(response.data));
    } catch (error) {
      dispatch(slice.actions.hasError(error))
    }
  };
}
export function putStationDepartmentData(id, obj) {
  return async () => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.put(`maintenance/department/${id}`, obj);
      dispatch(slice.actions.putStationdDepartmentataSuccess(response.data));
    } catch (error) {
      dispatch(slice.actions.hasError(error))
    }
  };
}
export function deleteStationDepartment(id, callback) {
  return async () => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.delete(`maintenance/department/${id}`);
      dispatch(slice.actions.deleteStationDepartmentdataSuccess({
        id, message: response.data
      }));
      callback();
    } catch (error) {
      dispatch(slice.actions.hasError(error))
    }
  };
}

// CRUD operations of Personnel
export function getDepartmentData(stationId) {
  return async () => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.get(`maintenance/department/station/${stationId}`);
      dispatch(slice.actions.getDepartmentDataSuccess(response.data));
    } catch (error) {
      dispatch(slice.actions.hasError(error));
    }
  };
}
export function getStationPersonnelData({ pageNo, pageSize, stationId }) {
  return async () => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.get(`maintenance/customer-personnel/station/${stationId}?page=${pageNo}&pageSize=${pageSize}`);
      dispatch(slice.actions.getStationPersonnelDataSuccess(response.data));
    } catch (error) {
      dispatch(slice.actions.hasError(error));
    }
  };
}
export function postStationPersonnelData(obj) {
  return async () => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.post(`maintenance/customer-personnel`, obj);
      dispatch(slice.actions.postStationPersonneldataSuccess(response.data));
    } catch (error) {
      dispatch(slice.actions.hasError(error))
    }
  };
}
export function putStationPersonnelData(id, obj) {
  return async () => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.put(`maintenance/customer-personnel/${id}`, obj);
      dispatch(slice.actions.putStationdPersonneldataSuccess(response.data));
    } catch (error) {
      dispatch(slice.actions.hasError(error))
    }
  };
}
export function deleteStationPersonnel(id, callback) {
  return async () => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.delete(`maintenance/customer-personnel/${id}`);
      dispatch(slice.actions.deleteStationPersonneldataSuccess({
        id, message: response.data
      }));
      callback();
    } catch (error) {
      dispatch(slice.actions.hasError(error))
    }
  };
}

// get for station rate
export function getStationRateData(id, rateType) {
  return async () => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.get(`/maintenance/customer-rate/station-rate-map?stationId=${id}&rateType=${rateType}`);
      dispatch(slice.actions.getStationRateDataSuccess(response.data));
    } catch (error) {
      dispatch(slice.actions.hasError(error));
    }
  };
}
export function deleteStationRate(id, callback) {
  return async () => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.delete(`maintenance/customer-rate/station-rate-map/${id}`);
      dispatch(slice.actions.deleteStationRateSuccess({
        id, message: response.data
      }));
      callback();
    } catch (error) {
      dispatch(slice.actions.hasError(error))
    }
  };
}

// CRUD operations of accessorial
export function getAccessorialData() {
  return async () => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.get('/maintenance/accessorial/dropdown');
      dispatch(slice.actions.getAccessorialDataSuccess(response.data));
    } catch (error) {
      dispatch(slice.actions.hasError(error));
    }
  };
}
export function getStationAccessorialData(entityId) {
  return async () => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.get(`maintenance/entity-accessorial/${entityId}`);
      dispatch(slice.actions.getStationAccessorialDataSuccess(response.data));
    } catch (error) {
      dispatch(slice.actions.hasError(error));
    }
  }
}
export function postStationAccessorialData(obj) {
  return async () => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.post(`maintenance/entity-accessorial`, obj);
      dispatch(slice.actions.postStationAccessorialDataSuccess(response.data));
    } catch (error) {
      dispatch(slice.actions.hasError(error))
    }
  };
}
export function putStationAccessorialData(id, obj) {
  return async () => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.put(`maintenance/entity-accessorial/${id}`, obj);
      dispatch(slice.actions.putStationAccessorialDataSuccess(response.data));
    } catch (error) {
      dispatch(slice.actions.hasError(error))
    }
  };
}
export function deleteStationAccessorial(id, callback) {
  return async () => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.delete(`maintenance/entity-accessorial/${id}`);
      dispatch(slice.actions.deleteStationAccessorialDataSuccess({
        id, message: response.data
      }));
      callback();
    } catch (error) {
      dispatch(slice.actions.hasError(error))
    }
  };
}
export function patchStationAccessorialData(obj, id) {
  return async () => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.put(`maintenance/entity-accessorial/${id}/service-not-offered`, obj);
      dispatch(slice.actions.patchStationAccessorialDataSuccess(response.data));
    } catch (error) {
      dispatch(slice.actions.hasError(error))
    }
  };
}