import PropTypes from 'prop-types';
import { forwardRef } from 'react';
// @mui
import { useTheme } from '@mui/material/styles';
import { Box, Button } from '@mui/material';
// hooks
import useResponsive from '../../hooks/useResponsive';
// components
import Image from '../image';
// images importing
import RMLogo from '../../assets/RM.png';
// ----------------------------------------------------------------------

const Logo = forwardRef(({ disabledLink = false, sx, ...other }, ref) => {
  const theme = useTheme();
  const isMobile = useResponsive('down', 'sm');

  const logo = (
    <Box
      ref={ref}
      component="div"
      sx={{
        // width: 40,
        width: 'max-content',
        height: 40,
        display: 'inline-flex',
        ...sx,
      }}
      {...other}
    >
      <Image
        disabledEffect
        visibleByDefault
        alt="R&M Trucking"
        src={
          RMLogo
        }
        sx={{
          width: isMobile ? 'auto' : 'max-content',
          maxWidth: isMobile ? 72 : 'none',
          height: isMobile ? 34 : 40,
          objectFit: 'contain',
        }}
      />
    </Box>
  );

  if (disabledLink) {
    return <>{logo}</>;
  }

  return (
    <Button sx={{ justifyContent: 'flex-start', minWidth: 0, p: 0 }}>
      {logo}
    </Button>
  );
});

Logo.propTypes = {
  sx: PropTypes.object,
  disabledLink: PropTypes.bool,
};

export default Logo;
