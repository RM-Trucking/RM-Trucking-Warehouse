import { createSlice } from '@reduxjs/toolkit';
// utils
import axios from '../../utils/axios';
//
import { dispatch } from '../store';


// ----------------------------------------------------------------------

const initialState = {
    isLoading: false,
    error: null,
    accessorialSuccess: false,
    accessorialData: [],
    accessorialSearchStr: '',
    operationalMessage: '',
    selectedAccessorialRowDetails: {},
    pagination: { page: 1, pageSize: 10, totalRecords: 0 },
};

const slice = createSlice({
    name: 'accesssorial',
    initialState,
    reducers: {
        hasError(state, action) {
            state.isLoading = false;
            state.error = action.payload || action.payload.error;
        },
        // START LOADING
        startLoading(state) {
            state.isLoading = true;
            state.accessorialSuccess = false;
            state.error = null;
            state.operationalMessage = '';
        },
        setPaginationObject(state, action) {
            state.pagination = action.payload;
        },
        setAccessorialSearchStr(state, action) {
            state.accessorialSearchStr = action.payload;
        },
        // accessorial row details
        setSelectedAccessorialRowDetails(state, action) {
            state.selectedAccessorialRowDetails = action.payload;
        },
        getAccessorialDataSuccess(state, action) {
            state.isLoading = false;
            state.accessorialSuccess = true;
            state.accessorialData = action.payload.data;
            state.pagination = {
                page: action.payload?.pagination?.page || state.pagination?.page,
                pageSize: action.payload?.pagination?.pageSize || state.pagination?.pageSize,
                totalRecords: action.payload?.pagination?.total || state.pagination?.totalRecords || state.accessorialData.length,
            };
        },
        postAccessorialDataSuccess(state,action){
            state.isLoading = false;
            state.accessorialSuccess = true;
            state.operationalMessage = `Accessorial added successfully.`;
            state.accessorialData.unshift(action.payload.data);
            state.pagination.totalRecords = action.payload?.total + 1 || state.pagination.totalRecords + 1;
        },
        putAccessorialDataSuccess(state, action) {
            state.isLoading = false;
            state.accessorialSuccess = true;
            state.operationalMessage = "Accessorial updated successfully";
            // update table data by updating record
            const index = state.accessorialData.findIndex((row) => row.accessorialId === action.payload?.data?.accessorialId);
            if (index === 0 || index > 0) {
                state.accessorialData.splice(index, 1, action.payload.data);
            }
        },
        deleteAccessorialDataSuccess(state, action) {
            state.isLoading = false;
            state.accessorialSuccess = true;
            state.operationalMessage = `Accessorial deleted successfully.`;
        },
        setOperationalMessage(state) {
            state.operationalMessage = '';
        },

    },
});

export const {
    setOperationalMessage,
    setPaginationObject,
    setAccessorialSearchStr,
    setSelectedAccessorialRowDetails,
} = slice.actions;
export default slice.reducer;


// Actions

// ----------------------------------------------------------------------
export function getAccessorialData({ pageNo, pageSize, searchStr }) {
    return async () => {
        dispatch(slice.actions.startLoading());
        try {
            const response = await axios.get(`maintenance/accessorial?page=${pageNo}&pageSize=${pageSize}${searchStr ? `&search=${searchStr}` : ''}`);
            dispatch(slice.actions.getAccessorialDataSuccess(response.data));
        } catch (error) {
            dispatch(slice.actions.hasError(error));
        }
    };
}
export function postAccessorialData(obj) {
  return async () => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.post(`maintenance/accessorial`, obj);
      dispatch(slice.actions.postAccessorialDataSuccess(response.data));
    } catch (error) {
      dispatch(slice.actions.hasError(error))
    }
  };
}
export function putAccessorialData(id, obj) {
  return async () => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.put(`maintenance/accessorial/${id}`, obj);
      dispatch(slice.actions.putAccessorialDataSuccess(response.data));
    } catch (error) {
      dispatch(slice.actions.hasError(error))
    }
  };
}
export function deleteAccessorial(id, callback) {
  return async () => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.delete(`maintenance/accessorial/${id}`);
      dispatch(slice.actions.deleteAccessorialDataSuccess({
        id, message: response.data
      }));
      callback();
    } catch (error) {
      dispatch(slice.actions.hasError(error))
    }
  };
}

