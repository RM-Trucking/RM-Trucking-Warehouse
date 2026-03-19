
import { Outlet } from 'react-router-dom';
// @mui
import { Box } from '@mui/material';
import Main from './Main';
import Header from './header';
import NavVertical from './nav/NavVertical';
// ----------------------------------------------------------------------

export default function DashboardLayout() {

  const renderNavVertical = <NavVertical />;

  return (
    <>
      <Header />

      <Box
        sx={{
          display: 'flex',
          flexDirection : 'row',
          minHeight: 1,
        }}
      >
        {renderNavVertical}

        <Main>
          <Outlet />
        </Main>
      </Box>
    </>
  );
}
