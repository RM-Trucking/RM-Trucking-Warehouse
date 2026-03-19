import PropTypes from 'prop-types';

import {
  AppBar,
  Toolbar,
  Stack,
  Button,
} from '@mui/material';

import Logo from '../../../components/logo';
import { HEADER } from '../../../config';
import SearchBar from './SearchBar';
import UserAccount from './UserAccount';

// ----------------------------------------------------------------------

Header.propTypes = {
};

export default function Header() {

  const renderContent = (
    <>
      <Stack flexDirection={"row"} alignItems={"center"} justifyContent={"space-between"} sx={{width : "100%"}}>
        <Logo />
        <SearchBar/>
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
    </>
  );
}
