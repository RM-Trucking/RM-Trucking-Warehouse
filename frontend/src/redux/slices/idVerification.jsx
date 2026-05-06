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
  },
});

export default slice.reducer;

// Async action to fetch ID Verification data
export function getIdVerificationData({ page = 1, pageSize = 10, searchTerm = '' } = {}) {
  return async () => {
    dispatch(slice.actions.startLoading());
    try {
      const params = new URLSearchParams({
        page,
        pageSize,
        ...(searchTerm && { searchTerm }),
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
