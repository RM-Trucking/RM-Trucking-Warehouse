import { useState } from 'react';
import PropTypes from 'prop-types';

import {
  AppBar,
  Toolbar,
  Stack,
  Box,
  Drawer,
  IconButton,
  useMediaQuery,
} from '@mui/material';

import Logo from '../../../components/logo';
import Iconify from '../../../components/iconify';
import { HEADER } from '../../../config';
import UserAccount from './UserAccount';
import Scrollbar from '../../../components/scrollbar';
import { NavSectionVertical } from '../../../components/nav-section';
import { PATH_DASHBOARD } from '../../../routes/paths';
import { navConfig } from '../nav/NavVertical';

// ----------------------------------------------------------------------

const mobileNavConfig = [
  { title: 'Home', path: PATH_DASHBOARD.general.home, icon: null },
  {
    title: 'Warehouse Check-In',
    path: PATH_DASHBOARD.warehouseCheckIn,
    icon: null,
    children: [
      { title: 'Regular', path: PATH_DASHBOARD.warehouseCheckInRegular, icon: null },
      { title: 'Trailer', path: PATH_DASHBOARD.warehouseCheckInTrailer, icon: null },
    ],
  },
  {
    title: 'Shipment Form',
    path: PATH_DASHBOARD.shipmentBuilding,
    icon: null,
    resetToGrid: true,
  },
  {
    title: 'Location - View/Update',
    path: PATH_DASHBOARD.locationViewUpdate,
    icon: null,
  },
];

Header.propTypes = {
};

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobileMenuRestricted = useMediaQuery('(max-width:599.95px)', { noSsr: true });
  const drawerNavConfig = isMobileMenuRestricted ? mobileNavConfig : navConfig;

  const renderContent = (
    <>
      <Stack flexDirection={"row"} alignItems={"center"} justifyContent={"space-between"} sx={{width : "100%"}}>
        <Stack direction="row" alignItems="center" spacing={0.75}>
          <IconButton
            size="small"
            onClick={() => setMobileMenuOpen(true)}
            sx={{ display: { xs: 'inline-flex', lg: 'none' }, color: '#111', p: 0.5 }}
          >
            <Iconify icon="mdi:menu" width={24} />
          </IconButton>
          <Logo />
        </Stack>
        <UserAccount/>
      </Stack>
    </>
  );

  return (
    <>
      <AppBar
        sx={{
          '&.MuiPaper-root.MuiAppBar-root': {
            pr: '0px !important',
          },
          '&.MuiPaper-root.MuiAppBar-root:hover': {
            pr: '0px !important',
          },
          boxShadow: 'rgba(0, 0, 0, 0.25)',
          height: HEADER.H_MOBILE,
          color : "black"
        }}
      >
        <Toolbar
          sx={{
            '&.MuiToolbar-root': {
              minHeight: '60px',
            },
            height: '60px',
            px: { lg: 3 },
            bgcolor: '#ffffff',
          }}
        >
          {renderContent}
        </Toolbar>
      </AppBar>
      <Drawer
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        variant="temporary"
        PaperProps={{
          sx: {
            width: 280,
            bgcolor: '#A22',
            border: 'none',
          },
        }}
      >
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
          <Box sx={{ py: 1 }}>
            <NavSectionVertical data={drawerNavConfig} onItemClick={() => setMobileMenuOpen(false)} />
          </Box>
        </Scrollbar>
      </Drawer>
    </>
  );
}
