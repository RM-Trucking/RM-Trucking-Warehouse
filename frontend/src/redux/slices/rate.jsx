import { createSlice } from '@reduxjs/toolkit';
// utils
import axios from '../../utils/axios';
//
import { dispatch } from '../store';


// ----------------------------------------------------------------------

const initialState = {
    isLoading: false,
    originLoading: false,
    destinationLoading: false,
    error: null,
    rateSuccess: false,
    rateTableData: [],
    rateSearchObj: {},
    selectedCurrentRateRow: {},
    currentRateTab: 'transportation',
    rateFieldChargeData: [],
    rateFieldChargeDataWarehouse: [],
    pagination: { page: 1, pageSize: 10, totalRecords: 0 },
    operationalMessage: '',
    currentRateRoutedFrom: null,
    originZoneListByZipCode: [],
    destinationZoneListByZipCode: [],
    customerList: [],
    carrierList: [],
    isSelectRateClicked: false,
};

const slice = createSlice({
    name: 'rate',
    initialState,
    reducers: {
        hasError(state, action) {
            state.isLoading = false;
            state.originLoading = false;
            state.destinationLoading = false;
            state.error = action.payload || action.payload.error;
        },
        // START LOADING
        startLoading(state) {
            state.isLoading = true;
            state.rateSuccess = false;
            state.error = null;
            state.operationalMessage = '';
        },
        // load origin and destination zone load
        startOriginZoneLaoding(state) {
            state.originLoading = true;
        },
        startDestinationZoneLaoding(state) {
            state.destinationLoading = true;
        },
        // customer warehouse data success slices
        getWarehouseRateDashboardDataSuccess(state, action) {
            state.isLoading = false;
            state.rateSuccess = true;
            state.rateTableData = action.payload.rates;
            state.pagination.page = action.payload.page;
            state.pagination.pageSize = action.payload.pageSize;
            state.pagination.totalRecords = action.payload.total;
        },
        postRateDashboarddataSuccess(state, action) {
            state.isLoading = false;
            state.rateSuccess = true;
            state.operationalMessage = "Rate added successfully";
            // update table data by adding new record at the start
            state.rateTableData.unshift(action.payload.data);
            state.pagination.totalRecords = action.payload.total + 1 || state.pagination.totalRecords + 1;
        },
        putRateDashboarddataSuccess(state, action) {
            state.isLoading = false;
            state.rateSuccess = true;
            state.operationalMessage = "Rate updated successfully";
            // update table data by updating record
            const index = state.rateTableData.findIndex((row) => row.rateId === action.payload?.data?.rateId);
            if (index === 0 || index > 0) {
                state.rateTableData.splice(index, 1, action.payload.data);
            }
        },
        deleteRateDashboarddataSuccess(state, action) {
            state.isLoading = false;
            state.rateSuccess = true;
            state.operationalMessage = "Rate deleted successfully";
        },
        setWarehouseRatesFieldChargeData(state, action) {
            state.rateFieldChargeDataWarehouse = action.payload;
        },
        // setting transportation min max details array
        setRateFieldChargeData(state, action) {
            state.rateFieldChargeData = action.payload;
        },
        // rate search object
        setRateSearchObj(state, action) {
            state.rateSearchObj = action.payload;
        },
        // current rate tab
        setCurrentRateTab(state, action) {
            state.currentRateTab = action.payload;
        },
        // set isSelectRateClicked state
        setIsSelectRateClicked(state, action) {
            state.isSelectRateClicked = action.payload;
        },
        // selected current rate row object
        setSelectedCurrentRateRow(state, action) {
            state.selectedCurrentRateRow = action.payload;
        },
        setOperationalMessage(state) {
            state.operationalMessage = '';
        },
        setIsLoading(state, action) {
            state.isLoading = action.payload;
        },
        // current rate routed from state
        setCurrentRateRoutedFrom(state, action) {
            state.currentRateRoutedFrom = action.payload;
        },
        // zone by zipcode success
        getOriginZoneByZipCodeSuccess(state, action) {
            state.isLoading = false;
            state.originLoading = false;
            state.rateSuccess = true;
            state.originZoneListByZipCode = action.payload.data;
        },
        getDestinationZoneByZipCodeSuccess(state, action) {
            state.isLoading = false;
            state.destinationLoading = false;
            state.rateSuccess = true;
            state.destinationZoneListByZipCode = action.payload.data;
        },
        // customer list and carrier list according to rate id
        getCustomerListByRateIDSuccess(state, action) {
            state.isLoading = false;
            state.rateSuccess = true;
            state.customerList = action.payload.data;
        },
        getCarrierListByRateIDSuccess(state, action) {
            state.isLoading = false;
            state.rateSuccess = true;
            state.carrierList = action.payload.data;
        },
        // customer transportation success slices
        getCustomerTransportationRateDashboardDataSuccess(state, action) {
            state.isLoading = false;
            state.rateSuccess = true;
            state.rateTableData = action.payload.data;
            state.pagination.page = action.payload.pagination.page;
            state.pagination.pageSize = action.payload.pagination.pageSize;
            state.pagination.totalRecords = action.payload.pagination.total;
        },
        postCustomerTransportationRateSuccess(state, action) {
            state.isLoading = false;
            state.rateSuccess = true;
            state.operationalMessage = "Rate added successfully";
            // update table data by adding new record at the start
            state.rateTableData.unshift(action.payload.data);
            state.pagination.totalRecords = action.payload.total + 1 || state.pagination.totalRecords + 1;
        },
        putCustomerTransportRateSuccess(state, action) {
            state.isLoading = false;
            state.rateSuccess = true;
            state.operationalMessage = "Rate updated successfully";
            // update table data by updating record
            const index = state.rateTableData.findIndex((row) => row.rateId === action.payload?.data?.rateId);
            if (index === 0 || index > 0) {
                state.rateTableData.splice(index, 1, action.payload.data);
            }
        },
        deleteCustomerTransportRateSuccess(state, action) {
            state.isLoading = false;
            state.rateSuccess = true;
            state.operationalMessage = "Rate deleted successfully";
        },
        // carrier transportation success slices
        getCarrierTransportationRateDashboardDataSuccess(state, action) {
            state.isLoading = false;
            state.rateSuccess = true;
            state.rateTableData = action.payload.data;
            state.pagination.page = action.payload.pagination.page;
            state.pagination.pageSize = action.payload.pagination.pageSize;
            state.pagination.totalRecords = action.payload.pagination.total;
        },
        postCarrierTransportationRateSuccess(state, action) {
            state.isLoading = false;
            state.rateSuccess = true;
            state.operationalMessage = "Rate added successfully";
            // update table data by adding new record at the start
            state.rateTableData.unshift(action.payload.data);
            state.pagination.totalRecords = action.payload.total + 1 || state.pagination.totalRecords + 1;
        },
        putCarrierTransportRateSuccess(state, action) {
            state.isLoading = false;
            state.rateSuccess = true;
            state.operationalMessage = "Rate updated successfully";
            // update table data by updating record
            const index = state.rateTableData.findIndex((row) => row.rateId === action.payload?.data?.rateId);
            if (index === 0 || index > 0) {
                state.rateTableData.splice(index, 1, action.payload.data);
            }
        },
        deleteCarrierTransportRateSuccess(state, action) {
            state.isLoading = false;
            state.rateSuccess = true;
            state.operationalMessage = "Rate deleted successfully";
        },
        // post of select rates from customer
        postStationRateDataSuccess(state, action) {
            state.isLoading = false;
            state.rateSuccess = true;
            state.isSelectRateClicked = false;
            state.operationalMessage = 'Station rate created successfully';
        },
        postTerminalRateDataSuccess(state, action) {
            state.isLoading = false;
            state.rateSuccess = true;
            state.isSelectRateClicked = false;
            state.operationalMessage = 'Terminal rate created successfully';
        },

    },
});

export const {
    setWarehouseRatesFieldChargeData,
    setOperationalMessage,
    setRateSearchObj,
    setCurrentRateTab,
    setSelectedCurrentRateRow,
    setIsLoading,
    setCurrentRateRoutedFrom,
    setRateFieldChargeData,
    setIsSelectRateClicked,
} = slice.actions;
export default slice.reducer;


// Actions

// ----------------------------------------------------------------------

// customer warehouse rate data
export function getWarehouseRateDashboardData({ pageNo, pageSize, searchStr }) {
    return async () => {
        dispatch(slice.actions.startLoading());
        try {
            const response = await axios.get(`maintenance/customer-rate/warehouse-rate?${searchStr ? `search=${searchStr}&` : ''}&page=${pageNo}&pageSize=${pageSize}`);
            dispatch(slice.actions.getWarehouseRateDashboardDataSuccess(response.data));
        } catch (error) {
            dispatch(slice.actions.hasError(error));
        }
    };
}
export function postWarehouseRate(obj) {
    return async () => {
        dispatch(slice.actions.startLoading());
        try {
            const response = await axios.post(`maintenance/customer-rate/warehouse-rate`, obj);
            dispatch(slice.actions.postRateDashboarddataSuccess(response.data));
        } catch (error) {
            dispatch(slice.actions.hasError(error));
        }
    };
}
export function putWarehouseRate(id, obj) {
    return async () => {
        dispatch(slice.actions.startLoading());
        try {
            const response = await axios.put(`maintenance/customer-rate/warehouse-rate/${id}`, obj);
            dispatch(slice.actions.putRateDashboarddataSuccess(response.data));
        } catch (error) {
            dispatch(slice.actions.hasError(error));
        }
    };
}
export function deleteWarehouseRate(id) {
    return async () => {
        dispatch(slice.actions.startLoading());
        try {
            const response = await axios.delete(`maintenance/customer-rate/warehouse-rate/${id}`);
            dispatch(slice.actions.deleteRateDashboarddataSuccess({
                id, message: response.data
            }));
        } catch (error) {
            dispatch(slice.actions.hasError(error));
        }
    };
}

// customer transport rate data
export function getCustomerTransportationRateDashboardData({
    originZoneId,
    originZipOrRange,
    destinationZoneId,
    destinationZipOrRange,
    pageNo,
    pageSize
}) {
    return async (dispatch) => {
        dispatch(slice.actions.startLoading());
        try {
            const params = new URLSearchParams();

            // Helper to only append if value exists and isn't just whitespace
            const appendIfValid = (key, value) => {
                if (value !== undefined && value !== null && value.toString().trim() !== '') {
                    params.append(key, value.toString().trim());
                }
            };

            appendIfValid("originZoneId", originZoneId);
            appendIfValid("originZipOrRange", originZipOrRange);
            appendIfValid("destinationZoneId", destinationZoneId);
            appendIfValid("destinationZipOrRange", destinationZipOrRange);

            // Pagination usually defaults to 1 and 10 if missing
            params.append("page", pageNo || 1);
            params.append("pageSize", pageSize || 10);

            const url = `maintenance/customer-rate/transport-rate?${params.toString()}`;
            const response = await axios.get(url);

            dispatch(slice.actions.getCustomerTransportationRateDashboardDataSuccess(response.data));
        } catch (error) {
            dispatch(slice.actions.hasError(error));
        }
    };
}

export function postCustomerTransportationRate(obj) {
    return async () => {
        dispatch(slice.actions.startLoading());
        try {
            const response = await axios.post(`maintenance/customer-rate/transport-rate`, obj);
            dispatch(slice.actions.postCustomerTransportationRateSuccess(response.data));
        } catch (error) {
            dispatch(slice.actions.hasError(error));
        }
    };
}
export function putCustomerTransportationRate(id, obj) {
    return async () => {
        dispatch(slice.actions.startLoading());
        try {
            const response = await axios.put(`maintenance/customer-rate/transport-rate/${id}`, obj);
            dispatch(slice.actions.putCustomerTransportRateSuccess(response.data));
        } catch (error) {
            dispatch(slice.actions.hasError(error));
        }
    };
}
export function deleteCustomerTransportationRate(id) {
    return async () => {
        dispatch(slice.actions.startLoading());
        try {
            const response = await axios.delete(`maintenance/customer-rate/transport-rate/${id}`);
            dispatch(slice.actions.deleteCustomerTransportRateSuccess({
                id, message: response.data
            }));
        } catch (error) {
            dispatch(slice.actions.hasError(error));
        }
    };
}

// carrier transportation rate data
export function getCarrierTransportationRateDashboardData({ originZoneId, originZipOrRange, destinationZoneId, destinationZipOrRange, pageNo, pageSize }) {
    return async () => {
        dispatch(slice.actions.startLoading());
        try {
            // Use URLSearchParams to build a clean string without spaces
            const params = new URLSearchParams();

            if (originZoneId) params.append("originZoneId", originZoneId);
            if (originZipOrRange && originZipOrRange?.length > 0) params.append("originZipOrRange", originZipOrRange);
            if (destinationZoneId) params.append("destinationZoneId", destinationZoneId);
            if (destinationZipOrRange && destinationZipOrRange?.length > 0) params.append("destinationZipOrRange", destinationZipOrRange);

            params.append("page", pageNo || 1);
            params.append("pageSize", pageSize || 10);

            const url = `maintenance/carrier-rate/transport-rate?${params.toString()}`;
            const response = await axios.get(url);

            dispatch(slice.actions.getCarrierTransportationRateDashboardDataSuccess(response.data));
        } catch (error) {
            dispatch(slice.actions.hasError(error));
        }
    };
}
export function postCarrierTransportationRate(obj) {
    return async () => {
        dispatch(slice.actions.startLoading());
        try {
            const response = await axios.post(`maintenance/carrier-rate/transport-rate`, obj);
            dispatch(slice.actions.postCarrierTransportationRateSuccess(response.data));
        } catch (error) {
            dispatch(slice.actions.hasError(error));
        }
    };
}
export function putCarrierTransportationRate(id, obj) {
    return async () => {
        dispatch(slice.actions.startLoading());
        try {
            const response = await axios.put(`maintenance/carrier-rate/transport-rate/${id}`, obj);
            dispatch(slice.actions.putCarrierTransportRateSuccess(response.data));
        } catch (error) {
            dispatch(slice.actions.hasError(error));
        }
    };
}
export function deleteCarrierTransportationRate(id) {
    return async () => {
        dispatch(slice.actions.startLoading());
        try {
            const response = await axios.delete(`maintenance/carrier-rate/transport-rate/${id}`);
            dispatch(slice.actions.deleteCarrierTransportRateSuccess({
                id, message: response.data
            }));
        } catch (error) {
            dispatch(slice.actions.hasError(error));
        }
    };
}

// get OrizinZone DestinationZone by zipcode
export function getOriginZoneByZipCode(zipcode) {
    return async () => {
        dispatch(slice.actions.startOriginZoneLaoding());
        try {
            const response = await axios.get(`maintenance/zone/dropdown?input=${zipcode}'`);
            dispatch(slice.actions.getOriginZoneByZipCodeSuccess(response.data));
        } catch (error) {
            dispatch(slice.actions.hasError(error));
        }
    };
}
export function getDestinationZoneByZipCode(zipcode) {
    return async () => {
        dispatch(slice.actions.startDestinationZoneLaoding());
        try {
            const response = await axios.get(`maintenance/zone/dropdown?input=${zipcode}'`);
            dispatch(slice.actions.getDestinationZoneByZipCodeSuccess(response.data));
        } catch (error) {
            dispatch(slice.actions.hasError(error));
        }
    };
}

// customer and carrier object
export function getCustomerObjectByRateID(id) {
    return async () => {
        dispatch(slice.actions.startLoading());
        try {
            const response = await axios.get(`maintenance/customer-rate/transport-rate/${id}`);
        } catch (error) {
            dispatch(slice.actions.hasError(error))
        }
    };
}
export function getCarrierObjectByRateID(id) {
    return async () => {
        dispatch(slice.actions.startLoading());
        try {
            const response = await axios.get(`maintenance/carrier-rate/transport-rate/${id}`);
            //   dispatch(slice.actions.getCarrierListByRateIDSuccess(response.data));
        } catch (error) {
            dispatch(slice.actions.hasError(error))
        }
    };
}

// customer and carrier list
export function getCustomerListByRateID(id) {
    return async () => {
        dispatch(slice.actions.startLoading());
        try {
            const response = await axios.get(`/maintenance/customer/by-rate/${id}`);
            dispatch(slice.actions.getCustomerListByRateIDSuccess(response.data));
        } catch (error) {
            dispatch(slice.actions.hasError(error))
        }
    };
}
export function getCarrierListByRateID(id) {
    return async () => {
        dispatch(slice.actions.startLoading());
        try {
            const response = await axios.get(`/maintenance/carrier/by-rate/${id}`);
            dispatch(slice.actions.getCarrierListByRateIDSuccess(response.data));
        } catch (error) {
            dispatch(slice.actions.hasError(error))
        }
    };
}

// station rate post api call from select rate
export function postStationRate(arr) {
    return async () => {
        dispatch(slice.actions.startLoading());
        try {
            const response = await axios.post(`maintenance/customer-rate/station-rate-map`, arr);
            dispatch(slice.actions.postStationRateDataSuccess(response.data));
        } catch (error) {
            dispatch(slice.actions.hasError(error))
        }
    };
}
export function postTerminalRate(arr) {
    return async () => {
        dispatch(slice.actions.startLoading());
        try {
            const response = await axios.post(`maintenance/carrier-rate/terminal-rate-map`, arr);
            dispatch(slice.actions.postTerminalRateDataSuccess(response.data));
        } catch (error) {
            dispatch(slice.actions.hasError(error))
        }
    };
}