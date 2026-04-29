import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
// @mui
import {
  Box, Stack, Drawer
} from '@mui/material';
// hooks
import useResponsive from '../../../hooks/useResponsive';
// config
import { NAV } from '../../../config';
// components
import Scrollbar from '../../../components/scrollbar';
import { NavSectionVertical } from '../../../components/nav-section';
// routes
import { PATH_DASHBOARD } from '../../../routes/paths';


// ----------------------------------------------------------------------

const navConfig = [
  { title: 'Home',                  path: PATH_DASHBOARD.general.home,        icon: null },
  { title: 'Driver Check-In',       path: PATH_DASHBOARD.driverCheckIn,       icon: null },
  {
    title: 'Warehouse Check-In',
    path: PATH_DASHBOARD.warehouseCheckIn,
    icon: null,
    children: [
      { title: 'Regular', path: PATH_DASHBOARD.warehouseCheckInRegular, icon: null },
      { title: 'Trailer', path: PATH_DASHBOARD.warehouseCheckInTrailer, icon: null },
    ],
  },
  { title: 'En Route',              path: PATH_DASHBOARD.enRoute,             icon: null },
  { title: 'ID Verification Form',  path: PATH_DASHBOARD.idVerificationForm,  icon: null },
  // { title: 'Warehouse Receipt Form',path: PATH_DASHBOARD.warehouseReceiptForm,icon: null },
  // { title: 'Shipment Form',         path: PATH_DASHBOARD.shipmentBuilding,    icon: null },
];

// ----------------------------------------------------------------------

NavVertical.propTypes = {
};

export default function NavVertical({ }) {

  const renderContent = (
    <Scrollbar
      sx={{
        height: 1,
        '& .simplebar-content': {
          height: 1,
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      {navConfig && <NavSectionVertical data={navConfig} />}
      <Box sx={{ flexGrow: 1 }} />
    </Scrollbar>
  );

  return (
    <Box
      component="nav"
    >
      <Drawer
        open
        variant="permanent"
        PaperProps={{
          sx:{
            width: NAV.W_DASHBOARD,
            bgcolor: '#A22',
            border: "none",
            marginTop: 7.4,
            display: { xs: "none", sm: "block" }
          }
        }}
      >
        {renderContent}
      </Drawer>

    </Box>
  );
}
