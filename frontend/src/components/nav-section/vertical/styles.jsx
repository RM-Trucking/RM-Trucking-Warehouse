// @mui
import { styled } from '@mui/material/styles';
import { ListSubheader } from '@mui/material';

// ----------------------------------------------------------------------

export const StyledSubheader = styled(ListSubheader)(({ theme, active }) => ({
  ...theme.typography.overline,
  fontSize: 15,
  fontWeight: 600,
  color: '#fff',
  cursor: 'pointer',
  textDecoration : active ? 'underline' : 'none'
}));
