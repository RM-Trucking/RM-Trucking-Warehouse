import { createSlice } from '@reduxjs/toolkit';
import axios from '../../utils/axios';
import { dispatch } from '../store';

const initialState = {
  idVerificationData: [],
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
  },
  searchTerm: '',
  // Filter state
  appliedFilterParams: {},
  appliedLogicOperator: 'and',
  filters: [{ id: 1, field: '', value: '' }],
  logicOperator: 'and',
  tempSearchValue: '',
  searchValue: '',
  paginationModel: {
    page: 0,
    pageSize: 10,
  },
};

const slice = createSlice({
  name: 'idVerification',
  initialState,
  reducers: {
    // Fetch start
    startLoading(state) {
      state.isLoading = true;
      state.error = null;
    },
    // Fetch success
    fetchSuccess(state, action) {
      state.isLoading = false;
      state.idVerificationData = action.payload.data || [];
      state.pagination = {
        page: action.payload.pagination?.page || 1,
        pageSize: action.payload.pagination?.pageSize || 10,
        total: action.payload.pagination?.total || 0,
        totalPages: action.payload.pagination?.totalPages || 0,
      };
    },
    // Fetch error
    fetchError(state, action) {
      state.isLoading = false;
      state.error = action.payload;
    },
    // Clear error
    clearError(state) {
      state.error = null;
    },
    // Set search term
    setSearchTerm(state, action) {
      state.searchTerm = action.payload;
    },
    // Filter state actions
    setAppliedFilterParams(state, action) {
      state.appliedFilterParams = action.payload;
    },
    setAppliedLogicOperator(state, action) {
      state.appliedLogicOperator = action.payload;
    },
    setFilters(state, action) {
      state.filters = action.payload;
    },
    setLogicOperator(state, action) {
      state.logicOperator = action.payload;
    },
    setTempSearchValue(state, action) {
      state.tempSearchValue = action.payload;
    },
    setSearchValue(state, action) {
      state.searchValue = action.payload;
    },
    setPaginationModel(state, action) {
      state.paginationModel = action.payload;
    },
    clearAllFilters(state) {
      state.appliedFilterParams = {};
      state.appliedLogicOperator = 'and';
      state.filters = [{ id: 1, field: '', value: '' }];
      state.logicOperator = 'and';
      state.tempSearchValue = '';
      state.searchValue = '';
    },
  },
});

export default slice.reducer;

// Async action to fetch ID Verification data
export function getIdVerificationData({ page = 1, pageSize = 10, searchTerm = '', filters = {}, filterLogic = '' } = {}) {
  return async () => {
    dispatch(slice.actions.startLoading());
    try {
      const params = new URLSearchParams({
        page,
        pageSize,
        ...(searchTerm && { searchTerm }),
        ...Object.fromEntries(
          Object.entries(filters).filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '')
        ),
        ...(filterLogic && { filterLogic }),
      });

      const response = await axios.get(`/id-verification?${params.toString()}`);

      if (response.data?.success) {
        dispatch(
          slice.actions.fetchSuccess({
            data: response.data.data || [],
            pagination: response.data.pagination || { page, pageSize, total: 0, totalPages: 0 },
          })
        );
        return response.data;
      } else {
        const errorMessage = response.data?.message || 'Failed to fetch ID Verification data';
        dispatch(slice.actions.fetchError(errorMessage));
        return null;
      }
    } catch (error) {
      console.error('Error fetching ID Verification data:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Error fetching ID Verification data';
      dispatch(slice.actions.fetchError(errorMessage));
      return null;
    }
  };
}

// Clear error action
export function clearIdVerificationError() {
  return async () => {
    dispatch(slice.actions.clearError());
  };
}

// Set search term action
export function setIdVerificationSearchTerm(searchTerm) {
  return async () => {
    dispatch(slice.actions.setSearchTerm(searchTerm));
  };
}

// Filter-related action exports
export const setAppliedFilterParams = (payload) => (dispatch) => {
  dispatch(slice.actions.setAppliedFilterParams(payload));
};

export const setAppliedLogicOperator = (payload) => (dispatch) => {
  dispatch(slice.actions.setAppliedLogicOperator(payload));
};

export const setFilters = (payload) => (dispatch) => {
  dispatch(slice.actions.setFilters(payload));
};

export const setLogicOperator = (payload) => (dispatch) => {
  dispatch(slice.actions.setLogicOperator(payload));
};

export const setTempSearchValue = (payload) => (dispatch) => {
  dispatch(slice.actions.setTempSearchValue(payload));
};

export const setSearchValue = (payload) => (dispatch) => {
  dispatch(slice.actions.setSearchValue(payload));
};

export const setIdVerificationPaginationModel = (payload) => (dispatch) => {
  dispatch(slice.actions.setPaginationModel(payload));
};

export const clearAllFilters = () => (dispatch) => {
  dispatch(slice.actions.clearAllFilters());
};
