import PropTypes from 'prop-types';
import { useLocation } from 'react-router-dom';
// @mui
import { Box } from '@mui/material';
// hooks
import useResponsive from '../../hooks/useResponsive';
// config
import { HEADER, NAV } from '../../config';

// ----------------------------------------------------------------------

const SPACING = 8;

Main.propTypes = {
  sx: PropTypes.object,
  children: PropTypes.node,
};

export default function Main({ children, sx, ...other }) {
   const { pathname } = useLocation();
  return (
    <Box
      component="main"
      sx={{
        flexGrow: 1,
        // py: `${HEADER.H_MOBILE + SPACING}px`,
        px: 2,
        py: `${HEADER.H_DASHBOARD_DESKTOP + SPACING}px`,
        // width: `calc(100% - ${NAV.W_DASHBOARD}px)`,
        width: `calc(100% - 312px)`,
        position : 'absolute',
        left : {sm: '280px'},
        ...sx,
        bgcolor : (pathname.includes('customer-view') || pathname.includes('station-view') || pathname.includes('rate-view') || pathname.includes('carrier-view') || pathname.includes('terminal-view')) ? 'rgb(229, 229, 229)' : '#fff',
      }}
      {...other}
    >
      {children}
    </Box>
  );
}
