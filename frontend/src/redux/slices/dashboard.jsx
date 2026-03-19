import { createSlice } from '@reduxjs/toolkit';
// utils
import axios from '../../utils/axios';
//
import { dispatch } from '../store';


// ----------------------------------------------------------------------

const initialState = {
  isLoading: false,
  error : null,
  dashboardsuccess : false,
  dashboardData : [],
  dashboardSearchStr : "",
};

const slice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    hasError(state, action) {
      state.isLoading = false;
      state.error = 'error';
    },
    // START LOADING
    startLoading(state) {
      state.isLoading = true;
      state.dashboardsuccess = false;
      state.error = null;
    },
    getDashboarddataSuccess(state, action) {
        state.isLoading = false;
        state.dashboardData = [];
    },
    setDashboardSearchStr(state, action) {
      state.dashboardSearchStr = action.payload;
    },
     
  },
});

export const {
  setDashboardSearchStr,
} = slice.actions;
export default slice.reducer;


// Actions

// ----------------------------------------------------------------------
export function getDashboardData() {
  return async () => {
    dispatch(slice.actions.startLoading());
    try {
      const response = await axios.get('/dashboarddata');
      dispatch(slice.actions.getDashboarddataSuccess(response));
    } catch (error) {
      dispatch(slice.actions.hasError(error));
    }
  };
}