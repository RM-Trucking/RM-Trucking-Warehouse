import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, IconButton, Stack, Typography } from '@mui/material';
import Iconify from '../../components/iconify';
const ImageFileItem = ({ filename, onRemove, onView }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      bgcolor: '#f5f5f5',
      border: '1px solid #e0e0e0',
      borderRadius: 1,
      p: '4px 8px',
      mb: 1,
      width: '100%',
      minWidth: 0,
    }}
  >
    <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
      <IconButton size="small" onClick={onView} sx={{ bgcolor: '#dbdbdb', borderRadius: 0.5, p: '4px', color: '#000', flexShrink: 0 }}>
        <Iconify icon="mdi:eye" width={16} />
      </IconButton>
      <Typography sx={{ fontSize: 12, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {filename}
      </Typography>
    </Stack>
    <IconButton size="small" onClick={onRemove} sx={{ p: '2px', color: '#000', flexShrink: 0 }}>
      <Iconify icon="carbon:close-filled" width={16} />
    </IconButton>
  </Box>
);

const actionBtnSx = { bgcolor: '#A22', color: '#fff', textTransform: 'none', '&:hover': { bgcolor: '#8b1c1c' } };
const getImageName = (file) => file.name;

export default function ShipmentImageUploadDialog({ shipment, initialFiles = [], onClose, onStage }) {
  const splitItemUploadDialogOpen = Boolean(shipment);
  const [splitItemStagedFiles, setSplitItemStagedFiles] = useState(initialFiles);
  const [splitItemDraggingFiles, setSplitItemDraggingFiles] = useState(false);
  const [splitItemCameraOpen, setSplitItemCameraOpen] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  const splitItemUploadInputRef = useRef(null);
  const splitItemCameraInputRef = useRef(null);
  const splitItemCameraVideoRef = useRef(null);
  const splitItemCameraStreamRef = useRef(null);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      splitItemCameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url); }, [preview]);
  const handleCloseSplitItemCamera = () => {
    splitItemCameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    splitItemCameraStreamRef.current = null;
    setSplitItemCameraOpen(false);
  };
  const handleCloseSplitItemUpload = () => { handleCloseSplitItemCamera(); onClose(); };
  const addSplitItemFilesToStage = (files) => {
    const selected = Array.from(files || []);
    const valid = selected.filter((file) => file.type.startsWith('image/') || /\.jif$/i.test(file.name));
    setError(valid.length !== selected.length ? 'Please select image files only.' : '');
    setSplitItemStagedFiles((previous) => [...previous, ...valid]);
  };
  const handleBrowseSplitItemFiles = () => splitItemUploadInputRef.current?.click();
  const handleSplitItemFileSelection = (event) => {
    addSplitItemFilesToStage(event.target.files);
    event.target.value = '';
  };
  const handleSplitItemFileDrop = (event) => {
    event.preventDefault();
    setSplitItemDraggingFiles(false);
    addSplitItemFilesToStage(event.dataTransfer.files);
  };
  const handleRemoveSplitItemStagedFile = (index) => setSplitItemStagedFiles((previous) => previous.filter((_, i) => i !== index));
  const handleViewSplitItemStagedFile = (file) => setPreview({ url: URL.createObjectURL(file), name: file.name });
  const handleCaptureSplitItemImage = async () => {
    if (!navigator.mediaDevices?.getUserMedia) { splitItemCameraInputRef.current?.click(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      if (!mountedRef.current) { stream.getTracks().forEach((track) => track.stop()); return; }
      splitItemCameraStreamRef.current = stream;
      setSplitItemCameraOpen(true);
    } catch (cameraError) { setError(cameraError.message || 'Unable to open camera'); }
  };
  const handleTakeSplitItemPhoto = () => {
    const video = splitItemCameraVideoRef.current;
    if (!video?.videoWidth) { setError('Please wait for the camera to be ready.'); return; }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob || !mountedRef.current) return;
      addSplitItemFilesToStage([new File([blob], `shipment-${Date.now()}.jpg`, { type: 'image/jpeg' })]);
      handleCloseSplitItemCamera();
    }, 'image/jpeg', 0.92);
  };
  const handleUploadSplitItemImages = () => {
    if (!splitItemStagedFiles.length) { setError('Please select at least one image.'); return; }
    onStage(shipment, splitItemStagedFiles);
    handleCloseSplitItemUpload();
  };
  return <>      <Dialog open={splitItemUploadDialogOpen} onClose={handleCloseSplitItemUpload} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16, pr: 5 }}>
          Image Upload
          <IconButton
            onClick={handleCloseSplitItemUpload}
            size="small"
            sx={{ position: 'absolute', right: 12, top: 12 }}
          >
            <Iconify icon="mdi:close" width={18} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <input
            ref={splitItemUploadInputRef}
            type="file"
            multiple
            accept="image/*,.jif"
            style={{ display: 'none' }}
            onChange={handleSplitItemFileSelection}
          />
          <input
            ref={splitItemCameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={handleSplitItemFileSelection}
          />

          <Stack spacing={2}>
            <Alert severity="info">Images are staged locally for this shipment. Server upload will be enabled once connected.</Alert>{error && <Alert severity="error">{error}</Alert>}<Typography sx={{ fontSize: 14, fontWeight: 600 }}>File Upload</Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} sx={{ border: '1px dashed #a0a0a0', borderRadius: 2, p: 2 }}>
              <Stack
                sx={{
                  width: { xs: '100%', md: '50%' },
                  borderRight: { xs: 'none', md: '1px solid #e0e0e0' },
                  borderBottom: { xs: '1px solid #e0e0e0', md: 'none' },
                  pr: { xs: 0, md: 2 },
                  pb: { xs: 2, md: 0 },
                  mb: { xs: 2, md: 0 },
                  bgcolor: splitItemDraggingFiles ? '#fff3f3' : 'transparent',
                  borderRadius: 1,
                  transition: 'background-color 0.2s ease',
                  minHeight: 180,
                }}
                alignItems="center"
                justifyContent="center"
                spacing={1}
                onDragOver={(event) => {
                  event.preventDefault();
                  setSplitItemDraggingFiles(true);
                }}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setSplitItemDraggingFiles(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  setSplitItemDraggingFiles(false);
                }}
                onDrop={handleSplitItemFileDrop}
              >
                <Iconify icon="mdi:tray-arrow-up" width={32} color="#A22" />
                <Typography sx={{ fontWeight: 600, fontSize: 14 }}>Drag & Drop File</Typography>
                <Typography sx={{ fontSize: 11, color: '#777' }}>File Supported: Image, JIF</Typography>
                <Typography sx={{ fontSize: 14, fontWeight: 600, my: 0.5 }}>OR</Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <IconButton
                    size="small"
                    onClick={handleCaptureSplitItemImage}
                    title="Capture image"
                    sx={{
                      bgcolor: '#A22',
                      color: '#fff',
                      width: 32,
                      height: 32,
                      borderRadius: 1,
                      '&:hover': { bgcolor: '#8b1c1c' },
                    }}
                  >
                    <Iconify icon="mdi:camera" width={20} />
                  </IconButton>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleBrowseSplitItemFiles}
                    sx={{ ...actionBtnSx, height: 32 }}
                  >
                    Browse Files
                  </Button>
                </Stack>
              </Stack>

              <Stack sx={{ width: { xs: '100%', md: '50%' }, pl: { xs: 0, md: 2 }, minWidth: 0 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography sx={{ fontWeight: 600, fontSize: 13 }}>Uploaded Files</Typography>
                  <Typography sx={{ fontSize: 12, color: '#555' }}>{splitItemStagedFiles.length} file(s)</Typography>
                </Stack>
                <Divider sx={{ mb: 1 }} />

                {splitItemStagedFiles.length === 0 ? (
                  <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 140, opacity: 0.5 }} spacing={1}>
                    <Iconify icon="mdi:file-document-multiple" width={32} />
                    <Typography sx={{ fontSize: 12 }}>No Files</Typography>
                  </Stack>
                ) : (
                  <Box sx={{ maxHeight: 180, overflowY: 'auto', pr: 1 }}>
                    {splitItemStagedFiles.map((file, index) => (
                      <ImageFileItem
                        key={`${getImageName(file, index)}-${file.lastModified || index}-${index}`}
                        filename={getImageName(file, index)}
                        onView={() => handleViewSplitItemStagedFile(file, index)}
                        onRemove={() => handleRemoveSplitItemStagedFile(index)}
                      />
                    ))}
                  </Box>
                )}
              </Stack>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={handleCloseSplitItemUpload}
            sx={{ textTransform: 'none', color: '#333', borderColor: '#aaa' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={handleUploadSplitItemImages}
            sx={{ ...actionBtnSx, height: 32 }}
          >
            Upload
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={splitItemCameraOpen} onClose={handleCloseSplitItemCamera} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16, pr: 5 }}>
          Capture Image
          <IconButton
            onClick={handleCloseSplitItemCamera}
            size="small"
            sx={{ position: 'absolute', right: 12, top: 12 }}
          >
            <Iconify icon="mdi:close" width={18} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box
            component="video"
            ref={(node) => {
              splitItemCameraVideoRef.current = node;
              if (node && splitItemCameraStreamRef.current && node.srcObject !== splitItemCameraStreamRef.current) {
                node.srcObject = splitItemCameraStreamRef.current;
                node.play?.().catch(() => {});
              }
            }}
            autoPlay
            playsInline
            muted
            onLoadedMetadata={(event) => event.currentTarget.play?.().catch(() => {})}
            onCanPlay={(event) => event.currentTarget.play?.().catch(() => {})}
            sx={{
              width: '100%',
              height: { xs: '60vh', md: '70vh' },
              minHeight: { xs: 360, md: 560 },
              maxHeight: 760,
              bgcolor: '#000',
              borderRadius: 1,
              objectFit: 'contain',
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={handleCloseSplitItemCamera}
            sx={{ textTransform: 'none', color: '#333', borderColor: '#aaa' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={handleTakeSplitItemPhoto}
            sx={{ ...actionBtnSx, height: 32 }}
          >
            Capture
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={Boolean(preview)} onClose={() => setPreview(null)} maxWidth="md" fullWidth>
        <DialogTitle>{preview?.name}<IconButton aria-label="Close image preview" onClick={() => setPreview(null)} sx={{ position: 'absolute', right: 12, top: 12 }}><Iconify icon="mdi:close" width={18} /></IconButton></DialogTitle>
        <DialogContent><Box component="img" src={preview?.url} alt={preview?.name || 'Selected image'} sx={{ width: '100%', maxHeight: '70vh', objectFit: 'contain' }} /></DialogContent>
      </Dialog>
    </>;
}
