import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Stack } from '@mui/material';
import ShipmentFormLayout from '../../sections/shared/ShipmentFormLayout';
import Iconify from '../../components/iconify';

export default function TrailerCheckInPage() {
  const navigate = useNavigate();

  return (
    <ShipmentFormLayout
      title="Trailer Check-In"
      handleClose={() => navigate(-1)}
      onSubmit={() => {}}
    >
      <Stack spacing={3} alignItems="center" justifyContent="center" sx={{ py: 8 }}>
        <Box
          sx={{
            width: 100,
            height: 100,
            borderRadius: '50%',
            bgcolor: '#f5f5f5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Iconify icon="mdi:truck-flatbed" width={60} sx={{ color: '#a22' }} />
        </Box>

        <Typography variant="h5" sx={{ fontWeight: 600, textAlign: 'center' }}>
          Trailer Check-In
        </Typography>

        <Typography variant="body2" sx={{ color: '#666', textAlign: 'center', maxWidth: 400 }}>
          Trailer Check-In functionality is coming soon. This page will allow you to manage trailer check-in operations.
        </Typography>

        <Button
          variant="contained"
          startIcon={<Iconify icon="mdi:arrow-left" width={20} />}
          onClick={() => navigate(-1)}
          sx={{ bgcolor: '#a22', '&:hover': { bgcolor: '#811' }, mt: 2 }}
        >
          Go Back
        </Button>
      </Stack>
    </ShipmentFormLayout>
  );
}
