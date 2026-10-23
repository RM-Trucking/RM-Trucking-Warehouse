import { useEffect, useRef, useState } from 'react';
import { Alert, Box, CircularProgress, Dialog, DialogContent, DialogTitle, IconButton, Stack, Typography } from '@mui/material';
import Iconify from '../../components/iconify';
import axios from '../../utils/axios';
import { useDispatch } from '../../redux/store';
import { removeShipmentImage } from '../../redux/slices/shipment';

function imageName(image) {
  const name = String(image.imagePath || '').split('/').pop() || '';
  try { return decodeURIComponent(name); } catch { return name; }
}

export default function ShipmentImageGalleryDialog({ shipment, onClose }) {
  const dispatch = useDispatch();
  const [removingId, setRemovingId] = useState(null);
  const [removeError, setRemoveError] = useState('');
  const removingRef = useRef(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const handleRemove = async (item) => {
    if (removingRef.current) return;
    removingRef.current = true;
    setRemovingId(item.imageId);
    setRemoveError('');
    try {
      const result = await dispatch(removeShipmentImage({
        shipmentId: shipment.shipmentId ?? shipment.id,
        imageId: item.imageId,
      }));
      if (result?.error) {
        setRemoveError(result.message);
        return;
      }
      setItems((previous) => previous.filter((image) => image.imageId !== item.imageId));
      setSelected((previous) => previous?.imageId === item.imageId ? null : previous);
      if (item.url) URL.revokeObjectURL(item.url);
    } finally {
      removingRef.current = false;
      setRemovingId(null);
    }
  };

  const handleClose = () => { if (!removingRef.current) onClose(); };

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
    <Dialog open onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontSize: 16, fontWeight: 700, pr: 6 }}>
        Uploaded Images - {shipment.barcodeNumber || shipment.rmNumber || shipment.shipmentId}
        <IconButton aria-label="Close image gallery" disabled={removingId !== null} onClick={handleClose} sx={{ position: 'absolute', right: 12, top: 12 }}>
          <Iconify icon="mdi:close" width={20} />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {removeError && <Alert severity="error" sx={{ mb: 2 }}>{removeError}</Alert>}
        {loading ? <Stack alignItems="center" sx={{ p: 4 }}><CircularProgress size={28} /></Stack>
          : items.length === 0 ? <Typography>No uploaded images available.</Typography>
            : <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
              {items.map((item, index) => <Box key={item.imageId ?? index} sx={{ border: '1px solid #ddd', borderRadius: 1, p: 1, minWidth: 0 }}>
                <Box sx={{ position: 'relative' }}>
                {item.error ? <Alert severity="error">{item.error}</Alert> : <Box
                  component="button"
                  aria-label={`Enlarge ${item.name}`}
                  onClick={() => setSelected(item)}
                  sx={{ display: 'block', width: '100%', p: 0, border: 0, bgcolor: 'transparent', cursor: 'zoom-in' }}
                >
                  <Box component="img" src={item.url} alt={item.name} sx={{ width: '100%', height: 160, objectFit: 'contain' }} />
                </Box>}
                  <IconButton
                    size="small"
                    aria-label={`Remove ${item.name}`}
                    title="Remove image"
                    disabled={removingId !== null || item.imageId == null}
                    onClick={() => handleRemove(item)}
                    sx={{ position: 'absolute', top: 4, right: 4, color: '#A22', bgcolor: '#fff', '&:hover': { bgcolor: '#f5f5f5' } }}
                  >
                    {removingId === item.imageId ? <CircularProgress size={18} color="inherit" /> : <Iconify icon="mdi:delete-outline" width={20} />}
                  </IconButton>
                </Box>
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
