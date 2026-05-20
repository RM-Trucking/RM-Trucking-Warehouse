import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import Iconify from '../../components/iconify';
import StyledTextField from '../../sections/shared/StyledTextField';
import rmLogo from '../../assets/RM.png';

const actionBtnSx = {
  bgcolor: '#A22',
  color: '#fff',
  textTransform: 'none',
  minWidth: 72,
  height: 28,
  px: 1.5,
  fontSize: 12,
  '&:hover': { bgcolor: '#8b1c1c' },
};

const fieldSx = {
  '& .MuiInputBase-input': { fontSize: 13, py: 0.2 },
  '& .MuiFormHelperText-root': { display: 'none' },
};

const getRowValue = (row, fields, fallback = '') => {
  const fieldList = Array.isArray(fields) ? fields : [fields];
  const field = fieldList.find((name) => row?.[name] !== undefined && row?.[name] !== null && row?.[name] !== '');
  return field ? row[field] : fallback;
};

const formatDate = (date = new Date()) =>
  date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

const buildFallbackForms = () => [
  {
    id: 'fallback-1',
    label: 'Form 1',
    receiptNumber: '78297982897267',
    receivedBy: 'Chris',
    location: 'OH',
    row: {
      receiptNumber: '78297982897267',
      carrier: 'FEDEX',
      customer: 'VENTANA SUPPLY LLC | Sweetwater | FL',
      shipper: 'ROAD ONE',
      proNumber: '133113',
      invoiceNo: '55555',
      poNumber: '545455',
      customerRefNo: '454545656978',
      packageId: '1311313',
      destination: '',
    },
    items: [
      { id: 1, pieces: '5', type: 'Skid', length: '5', width: '5', height: '5', weight: '100' },
      { id: 2, pieces: '2', type: 'Skid', length: '2', width: '2', height: '2', weight: '120' },
      { id: 3, pieces: '5', type: 'Skid', length: '5', width: '5', height: '5', weight: '180' },
      { id: 4, pieces: '2', type: 'Skid', length: '2', width: '2', height: '2', weight: '180' },
      { id: 5, pieces: '1', type: 'Skid', length: '1', width: '1', height: '1', weight: '100' },
      { id: 6, pieces: '10', type: 'Skid', length: '10', width: '10', height: '10', weight: '100' },
      { id: 7, pieces: '20', type: 'Skid', length: '20', width: '20', height: '20', weight: '100' },
    ],
  },
];

const getFormsFromState = (receipts = []) =>
  receipts.flatMap((receipt, receiptIndex) =>
    receipt.forms.map((form, formIndex) => ({
      id: `${receipt.key || receiptIndex}-${form.id}`,
      label: `Form ${formIndex + 1}`,
      receiptNumber: form.receiptNumber || receipt.row?.receiptNumber || receipt.proNumber || '',
      receivedBy: receipt.receivedBy,
      location: receipt.location,
      row: receipt.row,
      items: form.items,
    }))
  );

function Section({ title, children, sx }) {
  return (
    <fieldset style={{ border: '1px solid #8f8f8f', borderRadius: 2, padding: '10px 12px', margin: 0, minWidth: 0, boxSizing: 'border-box', ...sx }}>
      <legend>
        <Typography sx={{ fontSize: 13, fontWeight: 700, px: 0.6 }}>{title}</Typography>
      </legend>
      {children}
    </fieldset>
  );
}

function DisplayField({ label, value, required = false, width = '100%' }) {
  return (
    <Stack spacing={0.1} sx={{ width, minWidth: 0 }}>
      <Typography sx={{ color: '#555', fontSize: 12 }}>
        {label} {required && <span style={{ color: '#b01818' }}>*</span>}
      </Typography>
      <StyledTextField value={value || ''} variant="standard" size="small" fullWidth disabled sx={fieldSx} />
    </Stack>
  );
}

function HazmatPill({ label }) {
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.4,
        px: 0.6,
        py: 0.25,
        border: '1px solid #9db6d8',
        borderRadius: 1,
        bgcolor: '#eaf3ff',
        fontSize: 12,
        lineHeight: 1,
      }}
    >
      {label}
      <Iconify icon="mdi:close-circle" width={12} sx={{ color: '#0c243f' }} />
    </Box>
  );
}

function ReceiptInfoRow({ label, value }) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1}
      sx={{ py: 0.65, borderBottom: '1px solid #adadad' }}
    >
      <Typography sx={{ width: 130, fontSize: 15, color: '#111' }}>{label} :</Typography>
      <TextField
        value={value || ''}
        size="small"
        fullWidth
        InputProps={{ readOnly: true }}
        sx={{
          '& .MuiInputBase-root': { height: 30, bgcolor: '#fff', borderRadius: 0.8 },
          '& .MuiInputBase-input': { py: 0, fontSize: 15, fontWeight: 700 },
          '& fieldset': { borderColor: '#d6d6d6' },
        }}
      />
    </Stack>
  );
}

const getImageUrl = (file) => {
  if (!file) return '';
  if (typeof file === 'string') return file;
  if (file.url) return file.url;
  if (file.preview) return file.preview;
  if (file instanceof File) return URL.createObjectURL(file);
  return '';
};

const getImageName = (file, index) => {
  if (!file) return `Image ${index + 1}`;
  if (typeof file === 'string') return file.split('/').pop() || `Image ${index + 1}`;
  return file.name || file.filename || `Image ${index + 1}`;
};

export default function WarehouseReceiptFormPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const receiptForms = useMemo(() => {
    const forms = getFormsFromState(state?.receipts || []);
    return forms.length ? forms : buildFallbackForms();
  }, [state?.receipts]);
  const [activeTab, setActiveTab] = useState(receiptForms[0]?.id || '');
  const [imageDialog, setImageDialog] = useState({ open: false, images: [], itemLabel: '' });

  const activeForm = receiptForms.find((form) => form.id === activeTab) || receiptForms[0];
  const totalPieces = activeForm.items.reduce((sum, item) => sum + Number(item.pieces || 0), 0);
  const totalWeight = activeForm.items.reduce((sum, item) => sum + Number(item.weight || 0), 0);
  const row = activeForm.row || {};

  const handleOpenImages = (item, index) => {
    setImageDialog({
      open: true,
      images: item.images || [],
      itemLabel: `Item ${String(index + 1).padStart(2, '0')}`,
    });
  };

  const handleCloseImages = () => {
    setImageDialog({ open: false, images: [], itemLabel: '' });
  };

  return (
    <Box sx={{ bgcolor: '#dcdcdc', minHeight: '100vh', width: '100%', overflowX: 'hidden', boxSizing: 'border-box' }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ px: 1, pt: 1.5, pb: 0.6, bgcolor: '#efefef' }}
      >
        <Stack direction="row" alignItems="center" spacing={0.7} sx={{ cursor: 'pointer' }} onClick={() => navigate(-1)}>
          <Iconify icon="eva:arrow-ios-back-fill" width={14} />
          <Typography sx={{ fontSize: 12, fontWeight: 700 }}>Warehouse Check-In / Regular</Typography>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" size="small" onClick={() => navigate(-1)} sx={{ height: 24, fontSize: 11, color: '#111', borderColor: '#777', bgcolor: '#fff' }}>
            Back
          </Button>
          <Button variant="contained" size="small" sx={{ ...actionBtnSx, height: 24, minWidth: 58 }}>
            Submit
          </Button>
        </Stack>
      </Stack>

      <Box sx={{ px: 2, bgcolor: '#efefef', boxSizing: 'border-box' }}>
        <Tabs
          value={activeTab}
          onChange={(event, value) => setActiveTab(value)}
          sx={{
            minHeight: 32,
            '& .MuiTab-root': { minHeight: 32, px: 1.5, fontSize: 11, textTransform: 'none' },
            '& .MuiTabs-indicator': { bgcolor: '#A22', height: 2 },
          }}
        >
          {receiptForms.map((form) => (
            <Tab key={form.id} value={form.id} label={form.label} />
          ))}
        </Tabs>
      </Box>

      <Box sx={{ p: 2, boxSizing: 'border-box', maxWidth: '100%' }}>
        <Box sx={{ bgcolor: '#fff', border: '1px solid #c9c9c9', borderRadius: 1, px: 2, pt: 0.25, pb: 2, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems="center" spacing={2} sx={{ mb: 2, minWidth: 0 }}>
            <Stack direction="row" alignItems="flex-end" spacing={2} sx={{ minWidth: 0, flexWrap: 'wrap' }}>
              <Box component="img" src={rmLogo} alt="RM Trucking Co." sx={{ width: 220, maxWidth: '36vw', objectFit: 'contain' }} />
              <Typography sx={{ fontSize: 14, fontWeight: 700, lineHeight: 1.35 }}>
                840 E Green St STE 100,<br />
                Bensenville, IL 60106<br />
                PH# (847)616-1080 Fax# (847)616-8811
              </Typography>
            </Stack>

            <Box
              sx={{
                bgcolor: '#d1d1d1',
                borderRadius: 1.3,
                px: 2,
                pt: 1.4,
                pb: 1.1,
                mt: 1.5,
                width: { xs: '100%', md: 450 },
                maxWidth: '100%',
                boxSizing: 'border-box',
                flexShrink: 0,
              }}
            >
              <Stack>
                <ReceiptInfoRow label="Receipt No" value={activeForm.receiptNumber} />
                <ReceiptInfoRow label="Date" value={formatDate()} />
                <ReceiptInfoRow label="Received By" value={activeForm.receivedBy} />
                <ReceiptInfoRow label="Location" value={activeForm.location} />
                <ReceiptInfoRow label="Label Count" value={String(activeForm.items.length).padStart(2, '0')} />
              </Stack>
            </Box>
          </Stack>

          <Section title="Shipper Details">
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
              <DisplayField label="Shipper" value={getRowValue(row, ['shipper', 'shipperName'], 'ROAD ONE')} required />
              <DisplayField label="Customer" value={getRowValue(row, ['customer', 'customerName'], '')} required />
            </Stack>
          </Section>

          <Box sx={{ mt: 1.5 }}>
            <Section title="Inland Information">
              <Stack spacing={2}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                  <DisplayField label="Carrier" value={getRowValue(row, 'carrier', '')} required />
                  <DisplayField label="PRO No" value={getRowValue(row, 'proNumber', '')} required />
                  <DisplayField label="Invoice No" value={getRowValue(row, ['invoiceNo', 'invoiceNumber'], '')} />
                  <DisplayField label="PO No" value={getRowValue(row, ['poNumber', 'poNo'], '')} />
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                  <DisplayField label="Customer Ref No" value={getRowValue(row, ['customerRefNo', 'customerReference'], '')} />
                  <DisplayField label="Package ID" value={getRowValue(row, ['packageId', 'packageNumber'], '')} />
                  <Box sx={{ flex: 1 }} />
                  <Box sx={{ flex: 1 }} />
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                  <DisplayField label="Pieces" value={totalPieces} required />
                  <DisplayField label="Height" value={activeForm.items[0]?.height || ''} required />
                  <DisplayField label="BS Weight" value={totalWeight} required />
                  <Box sx={{ flex: 1 }} />
                </Stack>
              </Stack>
            </Section>
          </Box>

          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} sx={{ mt: 1.5, minWidth: 0 }}>
            <Box sx={{ flex: 1.2, minWidth: 0, border: '1px solid #c6c6c6', borderRadius: 1, overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#d9d9d9' }}>
                    {['Item', 'Pieces', 'Type', 'Length', 'Width', 'Height', 'Weight(lbs)', 'Actions'].map((head) => (
                      <TableCell key={head} sx={{ py: 0.6, px: 0.8, fontSize: 12, fontWeight: 700 }}>
                        {head}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {activeForm.items.map((item, index) => (
                    <TableRow key={item.id || index}>
                      <TableCell sx={{ py: 0.35, px: 0.8, fontSize: 12 }}>{String(index + 1).padStart(2, '0')}</TableCell>
                      <TableCell sx={{ py: 0.35, px: 0.8, fontSize: 12 }}>{item.pieces}</TableCell>
                      <TableCell sx={{ py: 0.35, px: 0.8, fontSize: 12 }}>{item.type}</TableCell>
                      <TableCell sx={{ py: 0.35, px: 0.8, fontSize: 12 }}>{item.length}</TableCell>
                      <TableCell sx={{ py: 0.35, px: 0.8, fontSize: 12 }}>{item.width}</TableCell>
                      <TableCell sx={{ py: 0.35, px: 0.8, fontSize: 12 }}>{item.height}</TableCell>
                      <TableCell sx={{ py: 0.35, px: 0.8, fontSize: 12 }}>{item.weight}</TableCell>
                      <TableCell sx={{ py: 0.35, px: 0.8 }}>
                        <IconButton
                          size="small"
                          title="View uploaded images"
                          disabled={(item.images?.length || 0) === 0}
                          onClick={() => handleOpenImages(item, index)}
                          sx={{ p: 0.2 }}
                        >
                          <Iconify
                            icon="mdi:image-multiple"
                            width={20}
                            sx={{ color: (item.images?.length || 0) > 0 ? '#0a4a8f' : '#9e9e9e' }}
                          />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Section title="Freight Information" sx={{ height: '100%' }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ minWidth: 0 }}>
                  <Stack sx={{ flex: 1, minWidth: 0 }}>
                    {['Banded Skid', 'Shrink Wrapped Skid', 'SHPT / PPC Skid', 'Plastic Skid', 'Document'].map((label) => (
                      <FormControlLabel
                        key={label}
                        control={<Checkbox defaultChecked size="small" sx={{ p: 0.4, color: '#193f75', '&.Mui-checked': { color: '#193f75' } }} />}
                        label={<Typography sx={{ fontSize: 12 }}>{label}</Typography>}
                      />
                    ))}
                  </Stack>
                  <Stack sx={{ flex: 1.1, minWidth: 0 }} spacing={0.7}>
                    <FormControlLabel
                      control={<Checkbox defaultChecked size="small" sx={{ p: 0.4, color: '#193f75', '&.Mui-checked': { color: '#193f75' } }} />}
                      label={<Typography sx={{ fontSize: 12 }}>Bad Freight Condition</Typography>}
                    />
                    <Typography sx={{ fontSize: 12, fontWeight: 700 }}>Freight Condition</Typography>
                    <TextField
                      multiline
                      rows={4}
                      defaultValue="The corner of the freight condition package was damaged."
                      size="small"
                      sx={{ '& textarea': { fontSize: 12 } }}
                    />
                  </Stack>
                </Stack>
              </Section>
            </Box>
          </Stack>

          <Box sx={{ mt: 1.5 }}>
            <Section title="Hazardous Information">
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ minWidth: 0 }}>
                <Stack sx={{ flex: 1, minWidth: 0 }} spacing={1.2}>
                  <Stack direction="row" spacing={2}>
                    <FormControlLabel control={<Checkbox defaultChecked size="small" sx={{ p: 0.4 }} />} label={<Typography sx={{ fontSize: 12 }}>Haz Mat</Typography>} />
                    <FormControlLabel control={<Checkbox size="small" sx={{ p: 0.4 }} />} label={<Typography sx={{ fontSize: 12 }}>Original DGD</Typography>} />
                  </Stack>
                  <Box>
                    <Typography sx={{ fontSize: 12, mb: 0.6 }}>UN Number</Typography>
                    <Stack direction="row" flexWrap="wrap" gap={0.7}>
                      {['UN05050599', 'UN05050599', 'UN05050599', 'UN05050599', 'UN05050599'].map((label, index) => (
                        <HazmatPill key={`${label}-${index}`} label={label} />
                      ))}
                    </Stack>
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: 12, mb: 0.6 }}>Hazmat Class</Typography>
                    <Stack direction="row" flexWrap="wrap" gap={0.6}>
                      {['2.3', '2.3', '2.3', '2.3', '2.3', '2.3', '2.3', '2.3', '2.3', '2.3'].map((label, index) => (
                        <HazmatPill key={`${label}-${index}`} label={label} />
                      ))}
                    </Stack>
                  </Box>
                </Stack>
                <Stack sx={{ flex: 1, minWidth: 0 }} spacing={1}>
                  <DisplayField label="Proper Shipping Name" value="" />
                  <Typography sx={{ fontSize: 12 }}>Description</Typography>
                  <TextField multiline rows={6} size="small" sx={{ '& textarea': { fontSize: 12 } }} />
                </Stack>
              </Stack>
            </Section>
          </Box>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ mt: 1.5, minWidth: 0 }}>
            <DisplayField label="Destination" value={getRowValue(row, ['destination', 'finalDestination'], '')} />
            <Stack sx={{ flex: 1, minWidth: 0 }} spacing={0.3}>
              <Typography sx={{ fontSize: 12 }}>Notes</Typography>
              <TextField multiline rows={3} size="small" sx={{ '& textarea': { fontSize: 12 } }} />
            </Stack>
          </Stack>
        </Box>
      </Box>
      <Dialog open={imageDialog.open} onClose={handleCloseImages} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>
          Uploaded Images - {imageDialog.itemLabel}
        </DialogTitle>
        <DialogContent dividers>
          {imageDialog.images.length === 0 ? (
            <Typography sx={{ fontSize: 13 }}>No uploaded images available.</Typography>
          ) : (
            <Stack direction="row" flexWrap="wrap" gap={2}>
              {imageDialog.images.map((file, index) => {
                const imageUrl = getImageUrl(file);
                return (
                  <Stack
                    key={`${getImageName(file, index)}-${index}`}
                    spacing={0.8}
                    sx={{ width: 160, minWidth: 0 }}
                  >
                    {imageUrl ? (
                      <Box
                        component="img"
                        src={imageUrl}
                        alt={getImageName(file, index)}
                        sx={{
                          width: 160,
                          height: 120,
                          objectFit: 'cover',
                          border: '1px solid #d0d0d0',
                          borderRadius: 1,
                        }}
                      />
                    ) : (
                      <Stack
                        alignItems="center"
                        justifyContent="center"
                        sx={{ width: 160, height: 120, border: '1px solid #d0d0d0', borderRadius: 1 }}
                      >
                        <Iconify icon="mdi:image-off" width={28} />
                      </Stack>
                    )}
                    <Typography sx={{ fontSize: 12, wordBreak: 'break-word' }}>
                      {getImageName(file, index)}
                    </Typography>
                  </Stack>
                );
              })}
            </Stack>
          )}
        </DialogContent>
      </Dialog>
      <Divider />
    </Box>
  );
}
