import PropTypes from 'prop-types';
import { Box, Typography } from '@mui/material';
import truckImage from '../../assets/rm-truck-01.jpg';

LoginLayout.propTypes = { children: PropTypes.node };

export default function LoginLayout({ children }) {
  return (
    <Box component="main" sx={{
      position: 'fixed', inset: 0, height: '100dvh', overflow: 'hidden', display: 'flex', justifyContent: 'flex-end',
      backgroundImage: `url(${truckImage})`, backgroundSize: 'cover', backgroundPosition: 'right center',
    }}>
      <Box sx={{
        display: { xs: 'none', md: 'block' }, position: 'absolute', bottom: 0, left: 0, width: '55%',
        boxSizing: 'border-box', px: { md: 4, lg: 6 }, py: 4,
        background: 'linear-gradient(180deg, rgba(0,0,0,0.35), rgba(0,0,0,0.65))', color: '#fff',
      }}>
        <Box sx={{ width: 100, height: 2, bgcolor: '#ad2227', mb: 2 }} />
        <Typography sx={{ fontSize: { md: 18, lg: 20 }, fontWeight: 400, lineHeight: 1.3 }}>
          Your Cargo,<br />
          Our Commitment<br />
          Delivering Excellence since <Box component="span" sx={{ fontWeight: 700 }}>1976</Box>
        </Typography>
      </Box>
      <Box sx={{
        width: { xs: '100%', md: '45%' }, height: '100%', boxSizing: 'border-box', position: 'relative', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        bgcolor: '#fff', px: { xs: 3, sm: 5 }, pt: 3, pb: 7,
      }}>
        <Box sx={{ width: '100%', maxWidth: 360 }}>{children}</Box>
        <Box component="footer" sx={{ position: 'absolute', bottom: 18, left: 16, right: 16, display: 'flex', justifyContent: 'space-between', gap: 2, color: '#858585', fontSize: 12 }}>
          <Box component="span">© {new Date().getFullYear()} RM Truck</Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box component="span">Privacy policy</Box>
            <Box component="span">Terms of use</Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
