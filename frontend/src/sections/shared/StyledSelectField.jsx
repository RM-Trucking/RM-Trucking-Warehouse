import { styled } from '@mui/material/styles';
import Select from '@mui/material/Select';

const StyledSelectField = styled(Select)({
  // Default bottom border color (green)
  '&:before': {
    borderBottomColor: 'rgba(107, 107, 107, 1)',
  },
  // Hover bottom border color (blue)
  '&:hover:not(.Mui-disabled):before': {
    borderBottomColor: 'rgba(107, 107, 107, 1)',
  },
  // Focused bottom border color (red)
  '&:after': {
    borderBottomColor: 'rgba(107, 107, 107, 1)',
  },
});

export default StyledSelectField;