import { styled } from '@mui/material/styles';
import Checkbox from '@mui/material/Checkbox';

const StyledCheckbox = styled(Checkbox)({
  // Default color for the unchecked state
  color: '#00194c',
  paddingBottom: '0px',
  // Color for the checked state
  '&.Mui-checked': {
    color: '#00194c',
  },

  // Optional: Add a focus ring for keyboard navigation accessibility
  '&.Mui-focusVisible': {
    boxShadow: '0 0 0 2px #00194c',
  },
   // --- ADD THIS SECTION FOR THE DISABLED RED STATE ---
  '&.Mui-disabled': {
    color: '#000', // Makes the unchecked box red
    opacity: 1,    // Removes the default faded/grey look
  },
  
  '&.Mui-checked.Mui-disabled': {
    color: '#000', // Makes the checkmark and box red when checked AND disabled
  },
});

export default StyledCheckbox;