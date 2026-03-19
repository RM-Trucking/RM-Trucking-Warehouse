import { createSlice } from '@reduxjs/toolkit';
// utils
import axios from '../../utils/axios';
//
import { dispatch } from '../store';


// ----------------------------------------------------------------------

const initialState = {
    isLoading: false,
    error: null,
    noteSuccess: false,
    notesData: [],
    operationalMessage : '',
};

const slice = createSlice({
    name: 'notes',
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
            state.noteSuccess = false;
            state.error = null;
        },
        getNotesDataSuccess(state, action) {
            state.isLoading = false;
            state.noteSuccess = true;
            state.notesData = action.payload;
        },
        postNoteSuccess(state, action){
            state.isLoading = false;
            state.noteSuccess = true;
            state.operationalMessage = 'Note message created successfully';
            state.notesData.unshift(action.payload.data);
        },
        clearNotesState(state){
            state.notesData = []
        },
    },
});

export const {
clearNotesState,
} = slice.actions;
export default slice.reducer;


// Actions

// ----------------------------------------------------------------------
export function getNotesData(id) {
    return async () => {
        dispatch(slice.actions.startLoading());
        try {
            const response = await axios.get(`maintenance/note/${id}`);
            dispatch(slice.actions.getNotesDataSuccess(response.data.data));
        } catch (error) {
            dispatch(slice.actions.hasError(error));
        }
    };
}
export function postNote(obj) {
    return async () => {
        dispatch(slice.actions.startLoading());
        try {
            const response = await axios.post(`maintenance/note`,obj);
            dispatch(slice.actions.postNoteSuccess(response.data));
        } catch (error) {
            dispatch(slice.actions.hasError(error));
        }
    };
}
