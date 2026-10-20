import { useEffect, useState } from 'react';
import { Alert, Box, CircularProgress, Dialog, DialogContent, DialogTitle, IconButton, Stack, Typography } from '@mui/material';
import Iconify from '../../components/iconify';
import axios from '../../utils/axios';

function imageName(image) {
  const name = String(image.imagePath || '').split('/').pop() || '';
  try { return decodeURIComponent(name); } catch { return name; }
}

export default function ShipmentImageGalleryDialog({ shipment, onClose }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let active = true;
    const urls = [];
    const controller = new AbortController();
    setLoading(true);
    setItems([]);
    setSelected(null);
    Promise.all((Array.isArray(shipment.images) ? shipment.images : []).map(async (image) => {
      const name = imageName(image);
      try {
        if (!name) throw new Error('Image filename is unavailable');
        const response = await axios.get(`/uploads/shipment/images/${encodeURIComponent(name)}`, {
          responseType: 'blob',
          signal: controller.signal,
        });
        if (!active) return null;
        const url = URL.createObjectURL(response.data);
        urls.push(url);
        return { ...image, name, url };
      } catch (error) {
        return { ...image, name, error: error.message || 'Unable to load image' };
      }
    })).then((images) => {
      if (active) {
        setItems(images.filter(Boolean));
        setLoading(false);
      }
    });
    return () => {
      active = false;
      controller.abort();
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [shipment]);

  return <>
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontSize: 16, fontWeight: 700, pr: 6 }}>
        Uploaded Images - {shipment.barcodeNumber || shipment.rmNumber || shipment.shipmentId}
        <IconButton aria-label="Close image gallery" onClick={onClose} sx={{ position: 'absolute', right: 12, top: 12 }}>
          <Iconify icon="mdi:close" width={20} />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {loading ? <Stack alignItems="center" sx={{ p: 4 }}><CircularProgress size={28} /></Stack>
          : items.length === 0 ? <Typography>No uploaded images available.</Typography>
            : <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
              {items.map((item, index) => <Box key={item.imageId ?? index} sx={{ border: '1px solid #ddd', borderRadius: 1, p: 1, minWidth: 0 }}>
                {item.error ? <Alert severity="error">{item.error}</Alert> : <Box
                  component="button"
                  aria-label={`Enlarge ${item.name}`}
                  onClick={() => setSelected(item)}
                  sx={{ display: 'block', width: '100%', p: 0, border: 0, bgcolor: 'transparent', cursor: 'zoom-in' }}
                >
                  <Box component="img" src={item.url} alt={item.name} sx={{ width: '100%', height: 160, objectFit: 'contain' }} />
                </Box>}
                <Typography sx={{ fontSize: 12, mt: 1, overflowWrap: 'anywhere' }}>{item.name}</Typography>
              </Box>)}
            </Box>}
      </DialogContent>
    </Dialog>
    <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ fontSize: 16, pr: 6, overflowWrap: 'anywhere' }}>
        {selected?.name}
        <IconButton aria-label="Close enlarged image" onClick={() => setSelected(null)} sx={{ position: 'absolute', right: 12, top: 12 }}>
          <Iconify icon="mdi:close" width={20} />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {selected && <Box component="img" src={selected.url} alt={selected.name} sx={{ width: '100%', maxHeight: '80vh', objectFit: 'contain' }} />}
      </DialogContent>
    </Dialog>
  </>;
}
