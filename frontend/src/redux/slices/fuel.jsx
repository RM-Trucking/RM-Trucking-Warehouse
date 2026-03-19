import { createSlice } from '@reduxjs/toolkit';
// utils
import axios from '../../utils/axios';
//
import { dispatch } from '../store';


// ----------------------------------------------------------------------

const initialState = {
    isLoading: false,
    error: null,
    fuelSuccess: false,
    fuelSurchargeData: [],
    fuelSurchargeSearchStr: '',
    operationalMessage : '',
    pagination: { page: 1, pageSize: 10, totalRecords: 0 },
    currentFuelSurchargeTab : 'general',
    selectedFuelSurchargeRowDetails : {},
};

const slice = createSlice({
    name: 'fuel',
    initialState,
    reducers: {
        hasError(state, action) {
            state.isLoading = false;
            state.operationalMessage = '';
            state.error = action.payload || action.payload.error;
        },
        // START LOADING
        startLoading(state) {
            state.isLoading = true;
            state.fuelSuccess = false;
            state.error = null;
        },
        // set search string
        setFuelSurchargeSearchStr(state, action) {
            state.fuelSurchargeSearchStr = action.payload;
        },
        // set current tab on fuel
        setCurrentFuelSurchargeTab(state,action){
            state.currentFuelSurchargeTab = action.payload;
        },
        // set table row details
        setSelectedFuelSurchargeRowDetails(state,action){
            state.selectedFuelSurchargeRowDetails = action.payload;
        },
        // get call
        getFuelSurchargeDataSuccess(state, action) {
            state.isLoading = false;
            state.fuelSuccess = true;
            state.fuelSurchargeData = action.payload;
        },
        clearFuelSurchargeData(state) {
            state.fuelSurchargeData = [];
        },
       
    },
});

export const {
setFuelSurchargeSearchStr,
clearFuelSurchargeData,
setCurrentFuelSurchargeTab,
setSelectedFuelSurchargeRowDetails,
} = slice.actions;
export default slice.reducer;


// Actions

// ----------------------------------------------------------------------

export function getFuelSurchargeData({ pageNo, pageSize, searchStr }) {
  return async () => {
    dispatch(slice.actions.startLoading());
    try {
    //   const response = await axios.get(`maintenance/fuel-surcharge?${searchStr ? `search=${searchStr}&` : ''}page=${pageNo}&pageSize=${pageSize}`);
      dispatch(slice.actions.getFuelSurchargeDataSuccess([]));
    } catch (error) {
      dispatch(slice.actions.hasError(error));
    }
  };
}
