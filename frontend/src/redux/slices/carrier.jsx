import { createSlice, current } from '@reduxjs/toolkit';
// utils
import axios from '../../utils/axios';
//
import { dispatch } from '../store';


// ----------------------------------------------------------------------

const initialState = {
    isLoading: false,
    error: null,
    carrierSuccess: false,
    carrierData: [],
    carrierSearchStr: '',
    operationalMessage: '',
    selectedCarrierRowDetails: {},
    pagination: { page: 1, pageSize: 10, totalRecords: 0 },
    // carrier tab details
    currentCarrierTab: 'active',
    currentCarrierViewTab: 'terminal',
    // terminal details and accessorial data are mapped to this array
    carrierViewTabData: [],
    selectedCarrierTabRowDetails: {},
    selectedRowCarrierType: '',
    // terminal tab details
    terminalViewTabData: [],
    selectedTerminalTabRowDetails: {},
    currentTerminalTab: 'personnel',
};

const slice = createSlice({
    name: 'carrier',
    initialState,
    reducers: {
        hasError(state, action) {
            state.isLoading = false;
            state.error = action.payload || action.payload.error;
        },
        // START LOADING
        startLoading(state) {
            state.isLoading = true;
            state.carrierSuccess = false;
            state.error = null;
            state.operationalMessage = '';
        },
        setPaginationObject(state, action) {
            state.pagination = action.payload;
        },
        setCarrierSearchStr(state, action) {
            state.carrierSearchStr = action.payload;
        },
        // carrier row details
        setSelectedCarrierRowDetails(state, action) {
            state.selectedCarrierRowDetails = action.payload;
        },
        setOperationalMessage(state) {
            state.operationalMessage = '';
        },
        setCurrentCarrierTab(state, action) {
            state.currentCarrierTab = action.payload;
        },
        setCurrentCarrierViewTab(state, action) {
            state.currentCarrierViewTab = action.payload;
        },
        // get carrier success
        getCarrierDataSuccess(state, action) {
            state.isLoading = false;
            state.carrierSuccess = true;
            state.carrierData = action.payload.data;
            state.pagination = {
                page: action.payload?.pagination?.page || state.pagination?.page,
                pageSize: action.payload?.pagination?.pageSize || state.pagination?.pageSize,
                totalRecords: action.payload?.pagination?.total || state.pagination?.totalRecords || state.carrierData.length,
            };
        },
        postCarrierDataSuccess(state, action) {
            state.isLoading = false;
            state.carrierSuccess = true;
            state.operationalMessage = action.payload.message || 'Carrier created successfully';
            console.log("Carrier post payload", action.payload.data.customer);
            state.carrierData.unshift(action.payload.data.carrier);
            state.pagination.totalRecords = action?.payload?.pagination?.total + 1 || state.carrierData.length;
        },
        putCarrierdataSuccess(state, action) {
            state.isLoading = false;
            console.log("customer put payload", action.payload.data);
            state.carrierSuccess = true;
            state.operationalMessage = action.payload.message || 'Carrier updated successfully';
            const index = state.carrierData.findIndex((row) => row.carrierId === action.payload?.data?.carrier?.carrierId);
            if (index === 0 || index > 0) {
                state.carrierData.splice(index, 1, action.payload.data.carrier);
            }
        },
        deleteCarrierDataSuccess(state, action) {
            state.isLoading = false;
            state.carrierSuccess = true;
            state.operationalMessage = `Carrier deleted successfully.`;
        },
        // on view tab table details
        // terminal success calls
        getTerminalCarrierDataSuccess(state, action) {
            state.isLoading = false;
            state.carrierSuccess = true;
            state.carrierViewTabData = action.payload.data;
            state.pagination = {
                page: action.payload?.pagination?.page || state.pagination?.page,
                pageSize: action.payload?.pagination?.pageSize || state.pagination?.pageSize,
                totalRecords: action.payload?.pagination?.total || state.pagination?.totalRecords || state.carrierViewTabData.length,
            };
        },
        postTerminalDataSuccess(state, action) {
            state.isLoading = false;
            state.carrierSuccess = true;
            state.operationalMessage = action.payload.message || 'Terminal created successfully';
            state.carrierViewTabData.unshift(action.payload.data);
            state.pagination.totalRecords = action?.payload?.pagination?.total + 1 || state.carrierViewTabData.length;
        },
        putTerminalDataSuccess(state, action) {
            state.isLoading = false;
            console.log("Terminal put payload", action.payload.data);
            state.carrierSuccess = true;
            state.operationalMessage = action.payload.message || 'Terminal updated successfully';
            const index = state.carrierViewTabData.findIndex((row) => row.terminalId === action.payload?.data?.terminalId);
            if (index === 0 || index > 0) {
                state.carrierViewTabData.splice(index, 1, action.payload.data);
            }
        },
        deleteTerminalDataSuccess(state, action) {
            state.isLoading = false;
            state.carrierSuccess = true;
            state.operationalMessage = `Terminal deleted successfully.`;
        },

        setSelectedRowCarrierType(state, action) {
            state.selectedRowCarrierType = action.payload;
        },
        // carrier view tab row details
        setSelectedCarrierTabRowDetails(state, action) {
            state.selectedCarrierTabRowDetails = action.payload;
        },
        // terminal view row details
        setSelectedTeminalTabRowDetails(state, action) {
            state.selectedTerminalTabRowDetails = action.payload;
        },
        setCurrentTerminalTab(state, action) {
            state.currentTerminalTab = action.payload;
        },
        // terminal tab success slices
        getPersonnelTerminalDataSuccess(state, action) {
            state.isLoading = false;
            state.carrierSuccess = true;
            state.terminalViewTabData = action.payload.data;
            state.pagination = {
                page: action.payload?.pagination?.page || state.pagination?.page,
                pageSize: action.payload?.pagination?.pageSize || state.pagination?.pageSize,
                totalRecords: action.payload?.pagination?.total || state.pagination?.totalRecords || state.terminalViewTabData.length,
            };
        },
        postPersonnelDataSuccess(state, action) {
            state.isLoading = false;
            state.carrierSuccess = true;
            state.operationalMessage = action.payload.message || 'Personnel created successfully';
            state.terminalViewTabData.unshift(action.payload.data);
            state.pagination.totalRecords = action?.payload?.pagination?.total + 1 || state.terminalViewTabData.length;
        },
        putPersonnelDataSuccess(state, action) {
            state.isLoading = false;
            console.log("Personnel put payload", action.payload.data);
            state.carrierSuccess = true;
            state.operationalMessage = action.payload.message || 'Personnel updated successfully';
            const index = state.terminalViewTabData.findIndex((row) => row.personnelId === action.payload?.data?.personnelId);
            if (index === 0 || index > 0) {
                state.terminalViewTabData.splice(index, 1, action.payload.data);
            }
        },
        deletePersonnelDataSuccess(state, action) {
            state.isLoading = false;
            state.carrierSuccess = true;
            state.operationalMessage = `Personnel deleted successfully.`;
        },

        // rate data success slices
        getTerminalRateDataSuccess(state, action) {
            state.isLoading = false;
            state.carrierSuccess = true;
            state.terminalViewTabData = action.payload.data;
        },
        deleteTerminalRateSuccess(state, action) {
            state.isLoading = false;
            state.carrierSuccess = true;
            state.operationalMessage = 'Terminal rate deleted successfully';
        },

        // quality tab success slices
        getQualityTerminalDataSuccess(state, action) {
            state.isLoading = false;
            state.carrierSuccess = true;
            state.terminalViewTabData = [
                {
                    qualityId: 1,
                    totalShipments: '05',
                    onTimePercentage: '95%',
                    lateShipment: '02',
                },
                {
                    qualityId: 2,
                    totalShipments: '100',
                    onTimePercentage: '55%',
                    lateShipment: '92',
                },
            ]
        },

        // set carrier tab table data 
        setCarrierViewTabData(state, action) {
            state.carrierViewTabData = action.payload;
        },
        setTerminalViewTabData(state,action){
            state.terminalViewTabData = action.payload;
        },

    },
});

export const {
    setOperationalMessage,
    setPaginationObject,
    setCarrierSearchStr,
    setSelectedCarrierRowDetails,
    setCurrentCarrierTab,
    setCurrentCarrierViewTab,
    setSelectedRowCarrierType,
    setSelectedCarrierTabRowDetails,
    setSelectedTeminalTabRowDetails,
    setCurrentTerminalTab,
    setCarrierViewTabData,
    setTerminalViewTabData,
} = slice.actions;
export default slice.reducer;


// Actions

// ----------------------------------------------------------------------
// carrier api calls
export function getCarrierData({ pageNo, pageSize, searchStr, status }) {
    return async () => {
        dispatch(slice.actions.startLoading());
        try {
            const response = await axios.get(`maintenance/carrier?page=${pageNo}&pageSize=${pageSize}${searchStr ? `&search=${searchStr}` : ''}&status=${status}`);
            dispatch(slice.actions.getCarrierDataSuccess(response.data));
        } catch (error) {
            dispatch(slice.actions.hasError(error));
        }
    };
}
export function postCarrierData(obj) {
    return async () => {
        dispatch(slice.actions.startLoading());
        try {
            const response = await axios.post(`maintenance/carrier`, obj);
            dispatch(slice.actions.postCarrierDataSuccess(response.data));
        } catch (error) {
            dispatch(slice.actions.hasError(error));
        }
    };
}
export function putCarrierData(obj, id) {
    return async () => {
        dispatch(slice.actions.startLoading());
        try {
            const response = await axios.put(`maintenance/carrier/${id}`, obj);
            dispatch(slice.actions.putCarrierdataSuccess(response.data));
        } catch (error) {
            dispatch(slice.actions.hasError(error))
        }
    };
}
export function deleteCarrier(id, callback) {
    return async () => {
        dispatch(slice.actions.startLoading());
        try {
            const response = await axios.delete(`maintenance/carrier/${id}`);
            dispatch(slice.actions.deleteCarrierDataSuccess({
                id, message: response.data
            }));
            callback();
        } catch (error) {
            dispatch(slice.actions.hasError(error))
        }
    };
}

// terminal api calls
export function getTerminalCarrierData({ carrierId, pageNo, pageSize, searchStr }) {
    return async () => {
        dispatch(slice.actions.startLoading());
        try {
            const response = await axios.get(`maintenance/terminal/carrier/${carrierId}?page=${pageNo}&pageSize=${pageSize}${searchStr ? `&search=${searchStr}` : ''}`);
            dispatch(slice.actions.getTerminalCarrierDataSuccess(response.data));
        } catch (error) {
            dispatch(slice.actions.hasError(error));
        }
    };
}
export function postTerminalData(obj) {
    return async () => {
        dispatch(slice.actions.startLoading());
        try {
            const response = await axios.post(`maintenance/terminal`, obj);
            dispatch(slice.actions.postTerminalDataSuccess(response.data));
        } catch (error) {
            dispatch(slice.actions.hasError(error));
        }
    };
}
export function putTerminalData(obj, id) {
    return async () => {
        dispatch(slice.actions.startLoading());
        try {
            const response = await axios.put(`maintenance/terminal/${id}`, obj);
            dispatch(slice.actions.putTerminalDataSuccess(response.data));
        } catch (error) {
            dispatch(slice.actions.hasError(error))
        }
    };
}
export function deleteTerminal(id) {
    return async () => {
        dispatch(slice.actions.startLoading());
        try {
            const response = await axios.delete(`maintenance/terminal/${id}`);
            dispatch(slice.actions.deleteTerminalDataSuccess({
                id, message: response.data
            }));
        } catch (error) {
            dispatch(slice.actions.hasError(error))
        }
    };
}

// Terminal tab - personnel calls
export function getPersonnelTerminalData({ terminalId, pageNo, pageSize, searchStr }) {
    return async () => {
        dispatch(slice.actions.startLoading());
        try {
            const response = await axios.get(`maintenance/carrier-personnel/terminal/${terminalId}?page=${pageNo}&pageSize=${pageSize}${searchStr ? `&search=${searchStr}` : ''}`);
            dispatch(slice.actions.getPersonnelTerminalDataSuccess(response.data));
        } catch (error) {
            dispatch(slice.actions.hasError(error));
        }
    }
};
export function postPersonnelData(obj) {
    return async () => {
        dispatch(slice.actions.startLoading());
        try {
            const response = await axios.post(`maintenance/carrier-personnel`, obj);
            dispatch(slice.actions.postPersonnelDataSuccess(response.data));
        } catch (error) {
            dispatch(slice.actions.hasError(error));
        }
    };
}
export function putPersonnelData(obj, id) {
    return async () => {
        dispatch(slice.actions.startLoading());
        try {
            const response = await axios.put(`maintenance/carrier-personnel/${id}`, obj);
            dispatch(slice.actions.putPersonnelDataSuccess(response.data));
        } catch (error) {
            dispatch(slice.actions.hasError(error))
        }
    };
}
export function deletePersonnel(id) {
    return async () => {
        dispatch(slice.actions.startLoading());
        try {
            const response = await axios.delete(`maintenance/carrier-personnel/${id}`);
            dispatch(slice.actions.deletePersonnelDataSuccess({
                id, message: response.data
            }));
        } catch (error) {
            dispatch(slice.actions.hasError(error))
        }
    };
}

// get for terminal rate
export function getTerminalRateData(id, rateType) {
    return async () => {
        dispatch(slice.actions.startLoading());
        try {
            const response = await axios.get(`/maintenance/carrier-rate/terminal-rate-map?terminalId=${id}&rateType=${rateType}`);
            dispatch(slice.actions.getTerminalRateDataSuccess(response.data));
        } catch (error) {
            dispatch(slice.actions.hasError(error));
        }
    };
}
export function deleteTerminalRate(id) {
    return async () => {
        dispatch(slice.actions.startLoading());
        try {
            const response = await axios.delete(`maintenance/carrier-rate/terminal-rate-map/${id}`);
            dispatch(slice.actions.deleteTerminalRateSuccess({
                id, message: response.data
            }));
        } catch (error) {
            dispatch(slice.actions.hasError(error))
        }
    };
}

// quality tab api calls
export function getQualityTerminalData({ pageNo, pageSize, searchStr }) {
    return async () => {
        dispatch(slice.actions.startLoading());
        try {
            // const response = await axios.get(`maintenance/carrier?page=${pageNo}&pageSize=${pageSize}${searchStr ? `&search=${searchStr}` : ''}`);
            dispatch(slice.actions.getQualityTerminalDataSuccess([]));
        } catch (error) {
            dispatch(slice.actions.hasError(error));
        }
    }
};