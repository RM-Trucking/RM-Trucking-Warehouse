import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DataGrid } from '@mui/x-data-grid';
import ShipmentFormLayout from '../../sections/shared/ShipmentFormLayout';
import StyledTextField from '../../sections/shared/StyledTextField';
import Iconify from '../../components/iconify';
import { useDispatch, useSelector } from '../../redux/store';
import { searchWarehouseReceipt, clearReceiptSearch } from '../../redux/slices/warehouse';

// ─── Styling helpers ────────────────────────────────────────────────
const actionBtnSx = {
  bgcolor: '#A22',
  color: '#fff',
  textTransform: 'none',
  minWidth: 80,
  height: 28,
  px: 1.5,
  fontSize: 12,
  '&:hover': { bgcolor: '#8b1c1c' },
};

const SEARCH_BY_OPTIONS = ['PRO', 'ID'];
const FREIGHT_TYPE_OPTIONS = ['Skid', 'Pallet', 'Box', 'Crate', 'Bundle', 'Drum'];

// ─── Helpers to create blank form / item ────────────────────────────
const createItem = (id) => ({ id, pieces: '', type: 'Skid', length: '', width: '', height: '', weight: '' });
const createForm = (id) => ({ id, collapsed: false, items: [createItem(1)] });

// ─── Dummy data keyed by PRO number ─────────────────────────────────
const DUMMY_DATA = {
  PRO7898710001: [
    { id: 1, sno: '01', receiptNumber: '100006878', carrier: 'CA12', customer: 'NEW DIREX | Northpoint | NY' },
    { id: 2, sno: '01', receiptNumber: '100006880', carrier: '-',    customer: 'NEW DIREX | Northpoint | NY' },
    { id: 3, sno: '01', receiptNumber: '100006882', carrier: 'CA12', customer: '-' },
    { id: 4, sno: '01', receiptNumber: '100006880', carrier: 'CA12', customer: 'NEW DIREX | Northpoint | NY' },
  ],
  PRO1234500001: [
    { id: 1, sno: '01', receiptNumber: '100007001', carrier: 'CA08', customer: 'XYZ LOGISTICS | Chicago | IL' },
    { id: 2, sno: '02', receiptNumber: '100007002', carrier: 'CA08', customer: 'XYZ LOGISTICS | Chicago | IL' },
  ],
};

export default function WarehouseCheckInPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { warehouseReceiptSearch } = useSelector((state) => state.warehousedata);

  const [searchType, setSearchType]     = useState('pro');   // 'pro' | 'rmDriver' | 'fedexUps'
  const [searchBy, setSearchBy]         = useState('PRO');
  const [searchValue, setSearchValue]   = useState('');
  const [savedResults, setSavedResults] = useState(null);    // snapshot before Proceed
  const [collapsed, setCollapsed]       = useState({});
  const [rejectOpen, setRejectOpen]     = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectRow, setRejectRow]       = useState(null);

  // ── Proceeded receipts state ───────────────────────────────────────
  const [proceededReceipts, setProceededReceipts] = useState([]);

  const handleProceed = (row) => {
    const key = `${warehouseReceiptSearch.data.proNumber}-${row.id}`;
    if (proceededReceipts.find((p) => p.key === key)) return;
    setSavedResults(warehouseReceiptSearch.data);
    setProceededReceipts((prev) => [
      ...prev,
      { key, proNumber: warehouseReceiptSearch.data.proNumber, row, receivedBy: '', location: '', sectionCollapsed: false, forms: [createForm(1)] },
    ]);
    // Clear search results
    dispatch(clearReceiptSearch());
  };

  const updateReceipt = (key, updater) =>
    setProceededReceipts((prev) => prev.map((p) => (p.key === key ? { ...p, ...updater(p) } : p)));

  const removeReceipt = (key) => {
    setProceededReceipts((prev) => prev.filter((p) => p.key !== key));
    if (savedResults) {
      // Restore the previous search results
      // Note: This is a simple restoration from saved state
    }
    setSavedResults(null);
  };

  const addForm = (key) =>
    updateReceipt(key, (p) => ({ forms: [...p.forms, createForm(p.forms.length + 1)] }));

  const removeForm = (key, formId) =>
    updateReceipt(key, (p) => ({ forms: p.forms.filter((f) => f.id !== formId) }));

  const toggleFormCollapse = (key, formId) =>
    updateReceipt(key, (p) => ({
      forms: p.forms.map((f) => (f.id === formId ? { ...f, collapsed: !f.collapsed } : f)),
    }));

  const addItem = (key, formId) =>
    updateReceipt(key, (p) => ({
      forms: p.forms.map((f) =>
        f.id === formId ? { ...f, items: [...f.items, createItem(f.items.length + 1)] } : f
      ),
    }));

  const removeItem = (key, formId, itemId) =>
    updateReceipt(key, (p) => ({
      forms: p.forms.map((f) =>
        f.id === formId ? { ...f, items: f.items.filter((i) => i.id !== itemId) } : f
      ),
    }));

  const duplicateItem = (key, formId, itemId) =>
    updateReceipt(key, (p) => ({
      forms: p.forms.map((f) => {
        if (f.id !== formId) return f;
        const idx = f.items.findIndex((i) => i.id === itemId);
        const newItem = { ...f.items[idx], id: Date.now() };
        const items = [...f.items];
        items.splice(idx + 1, 0, newItem);
        return { ...f, items };
      }),
    }));

  const updateItem = (key, formId, itemId, field, value) =>
    updateReceipt(key, (p) => ({
      forms: p.forms.map((f) =>
        f.id === formId
          ? { ...f, items: f.items.map((i) => (i.id === itemId ? { ...i, [field]: value } : i)) }
          : f
      ),
    }));

  const handleRejectOpen = (row) => {
    setRejectRow(row);
    setRejectReason('');
    setRejectOpen(true);
  };

  const handleRejectClose = () => {
    setRejectOpen(false);
    setRejectRow(null);
    setRejectReason('');
  };

  const handleRejectSubmit = () => {
    // TODO: call API with rejectRow and rejectReason
    console.log('Rejected:', rejectRow, 'Reason:', rejectReason);
    handleRejectClose();
  };

  // ── Search handler ─────────────────────────────────────────────────
  const handleSearch = () => {
    if (!searchValue.trim()) {
      return;
    }
    dispatch(searchWarehouseReceipt(searchValue.trim(), searchBy.toLowerCase()));
    setCollapsed({});
  };

  const toggleCollapse = (key) =>
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  // ── DataGrid columns ───────────────────────────────────────────────
  const columns = [
    { field: 'sno', headerName: 'SNo ⇅', width: 70 },
    {
      field: 'receiptNumber',
      headerName: 'Receipt Number ⇅',
      flex: 1,
      minWidth: 140,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Typography sx={{ fontWeight: 700, fontSize: 13 }}>{params.value}</Typography>
        </Box>
      ),
    },
    { field: 'carrier',  headerName: 'Carrier ⇅',  flex: 1, minWidth: 100 },
    { field: 'customer', headerName: 'Customer ⇅', flex: 2, minWidth: 180 },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 180,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ height: '100%' }}>
          <Button size="small" sx={actionBtnSx} onClick={() => handleRejectOpen(params.row)}>Reject</Button>
          <Button size="small" sx={actionBtnSx} onClick={() => handleProceed(params.row)}>Proceed</Button>
        </Stack>
      ),
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <ShipmentFormLayout
      title="Warehouse Check-In / Regular"
      handleClose={() => navigate(-1)}
      onSubmit={() => {}}
    >
      <Stack spacing={3}>
        {/* Warehouse Receipt fieldset */}
        <fieldset style={{ borderColor: '#b0b0b0', borderRadius: '8px', padding: '16px' }}>
          <legend>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, px: 1 }}>
              Warehouse Receipt
            </Typography>
          </legend>

          {/* Radio group */}
          <RadioGroup
            row
            value={searchType}
            onChange={(e) => { setSearchType(e.target.value); dispatch(clearReceiptSearch()); setSearchValue(''); }}
            sx={{ mb: 2 }}
          >
            <FormControlLabel
              value="pro"
              control={<Radio size="small" sx={{ color: '#A22', '&.Mui-checked': { color: '#A22' } }} />}
              label={<Typography sx={{ fontSize: 13 }}>Search By PRO#</Typography>}
            />
            <FormControlLabel
              value="rmDriver"
              control={<Radio size="small" sx={{ color: '#A22', '&.Mui-checked': { color: '#A22' } }} />}
              label={<Typography sx={{ fontSize: 13 }}>RM Driver</Typography>}
            />
            <FormControlLabel
              value="parcel"
              control={<Radio size="small" sx={{ color: '#A22', '&.Mui-checked': { color: '#A22' } }} />}
              label={<Typography sx={{ fontSize: 13 }}>Parcel</Typography>}
            />
          </RadioGroup>

          {/* Search row */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-end">
            {/* Search By dropdown */}
            <Stack spacing={0.5} sx={{ minWidth: 160 }}>
              <Typography sx={{ fontSize: 12, color: '#555' }}>
                Search By <span style={{ color: 'red' }}>*</span>
              </Typography>
              <StyledTextField
                select
                variant="outlined"
                size="small"
                value={searchBy}
                onChange={(e) => setSearchBy(e.target.value)}
                sx={{ minWidth: 160 }}
              >
                {SEARCH_BY_OPTIONS.map((opt) => (
                  <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                ))}
              </StyledTextField>
            </Stack>

            {/* PRO / value input */}
            <StyledTextField
              variant="outlined"
              size="small"
              required
              label={searchBy}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              sx={{ minWidth: 200 }}
            />

            <Button
              variant="contained"
              size="small"
              onClick={handleSearch}
              sx={{ ...actionBtnSx, minWidth: 90, height: 36 }}
            >
              Search
            </Button>
          </Stack>
        </fieldset>

        {/* Results */}
        {warehouseReceiptSearch.loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={40} />
          </Box>
        )}

        {warehouseReceiptSearch.error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {warehouseReceiptSearch.error}
          </Alert>
        )}

        {!warehouseReceiptSearch.loading && warehouseReceiptSearch.found && warehouseReceiptSearch.data && (
          <Box>
            {warehouseReceiptSearch.data.rows && warehouseReceiptSearch.data.rows.length === 0 ? (
              <Typography sx={{ color: '#777', fontSize: 14 }}>
                No records found for <strong>{warehouseReceiptSearch.data.proNumber}</strong>.
              </Typography>
            ) : (
              <Box sx={{ border: '1px solid #ddd', borderRadius: 1, overflow: 'hidden' }}>
                {/* Group header */}
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ bgcolor: '#c8c8c8', px: 2, py: 1, cursor: 'pointer' }}
                  onClick={() => toggleCollapse(warehouseReceiptSearch.data.proNumber)}
                >
                  <Typography sx={{ fontWeight: 700, fontSize: 14 }}>
                    {warehouseReceiptSearch.data.proNumber}
                  </Typography>
                  <IconButton size="small">
                    <Iconify
                      icon={collapsed[warehouseReceiptSearch.data.proNumber] ? 'eva:arrow-ios-forward-fill' : 'eva:arrow-ios-downward-fill'}
                      width={20}
                    />
                  </IconButton>
                </Stack>

                {/* Table */}
                <Collapse in={!collapsed[warehouseReceiptSearch.data.proNumber]} timeout="auto">
                  <DataGrid
                    rows={warehouseReceiptSearch.data.rows}
                    columns={columns}
                    autoHeight
                    disableRowSelectionOnClick
                    hideFooter
                    sx={{
                      border: 'none',
                      '& .MuiDataGrid-columnHeaders': { bgcolor: '#f5f5f5' },
                      '& .MuiDataGrid-row:nth-of-type(even)': { bgcolor: '#fafafa' },
                    }}
                  />
                </Collapse>
              </Box>
            )}
          </Box>
        )}
        {/* ── Proceeded Receipt Sections ───────────────────────────────── */}
        {proceededReceipts.map((pr) => (
          <Box key={pr.key} sx={{ border: '1px solid #ddd', borderRadius: 1, overflow: 'hidden' }}>

            {/* Section header */}
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ bgcolor: '#c8c8c8', px: 2, py: 1 }}
            >
              <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{pr.proNumber}</Typography>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => removeReceipt(pr.key)}
                  sx={actionBtnSx}
                >
                  Reset
                </Button>
                <IconButton
                  size="small"
                  onClick={() => updateReceipt(pr.key, (p) => ({ sectionCollapsed: !p.sectionCollapsed }))}
                >
                  <Iconify
                    icon={pr.sectionCollapsed ? 'eva:arrow-ios-forward-fill' : 'eva:arrow-ios-downward-fill'}
                    width={20}
                  />
                </IconButton>
              </Stack>
            </Stack>

            <Collapse in={!pr.sectionCollapsed} timeout="auto">
              <Box>

                {/* Selected row mini-table */}
                <Box sx={{ borderBottom: '1px solid #e0e0e0' }}>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: '80px 1fr 1fr 2fr',
                      bgcolor: '#f5f5f5',
                      px: 2,
                      py: 1,
                      borderBottom: '1px solid #e0e0e0',
                    }}
                  >
                    {['SNo \u21C5', 'Receipt Number \u21C5', 'Carrier \u21C5', 'Customer \u21C5'].map((h) => (
                      <Typography key={h} sx={{ fontSize: 12, fontWeight: 600, color: '#444' }}>
                        {h}
                      </Typography>
                    ))}
                  </Box>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: '80px 1fr 1fr 2fr',
                      px: 2,
                      py: 1.5,
                      alignItems: 'center',
                    }}
                  >
                    <Typography sx={{ fontSize: 13 }}>{pr.row.sno}</Typography>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{pr.row.receiptNumber}</Typography>
                      <Iconify icon="eva:checkmark-circle-2-fill" width={18} sx={{ color: '#2e7d32' }} />
                    </Stack>
                    <Typography sx={{ fontSize: 13 }}>{pr.row.carrier}</Typography>
                    <Typography sx={{ fontSize: 13 }}>{pr.row.customer}</Typography>
                  </Box>
                </Box>

                {/* Location & Receiver */}
                <Box sx={{ p: 2 }}>
                  <fieldset style={{ borderColor: '#b0b0b0', borderRadius: '8px', padding: '16px' }}>
                    <legend>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, px: 1 }}>
                        Location &amp; Receiver
                      </Typography>
                    </legend>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                      <Stack spacing={0.5} sx={{ minWidth: 200 }}>
                        <Typography sx={{ fontSize: 12, color: '#555' }}>
                          Received By <span style={{ color: 'red' }}>*</span>
                        </Typography>
                        <StyledTextField
                          variant="standard"
                          size="small"
                          value={pr.receivedBy}
                          onChange={(e) => updateReceipt(pr.key, () => ({ receivedBy: e.target.value }))}
                          sx={{ minWidth: 200 }}
                        />
                      </Stack>
                      <Stack spacing={0.5} sx={{ minWidth: 200 }}>
                        <Typography sx={{ fontSize: 12, color: '#555' }}>Location</Typography>
                        <StyledTextField
                          variant="standard"
                          size="small"
                          value={pr.location}
                          onChange={(e) => updateReceipt(pr.key, () => ({ location: e.target.value }))}
                          sx={{ minWidth: 200 }}
                        />
                      </Stack>
                    </Stack>
                  </fieldset>
                </Box>

                {/* Freight Information */}
                <Box sx={{ px: 2, pb: 2 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 1.5 }}>Freight Information</Typography>

                  <Stack spacing={2}>
                    {pr.forms.map((form, fIdx) => (
                      <fieldset
                        key={form.id}
                        style={{ borderColor: '#b0b0b0', borderRadius: '8px', padding: '16px' }}
                      >
                        <legend>
                          <Stack direction="row" alignItems="center" spacing={0.5}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600, px: 1 }}>
                              New Form {fIdx + 1}
                            </Typography>
                            <IconButton
                              size="small"
                              onClick={() => toggleFormCollapse(pr.key, form.id)}
                              sx={{ p: 0.3 }}
                            >
                              <Iconify
                                icon={form.collapsed ? 'eva:arrow-ios-forward-fill' : 'eva:arrow-ios-downward-fill'}
                                width={16}
                              />
                            </IconButton>
                            {pr.forms.length > 1 && (
                              <IconButton
                                size="small"
                                onClick={() => removeForm(pr.key, form.id)}
                                sx={{ p: 0.3, color: '#A22' }}
                              >
                                <CloseIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                            )}
                          </Stack>
                        </legend>

                        <Collapse in={!form.collapsed} timeout="auto">
                          <Stack spacing={2}>
                            {form.items.map((item, iIdx) => (
                              <Stack
                                key={item.id}
                                direction="row"
                                spacing={1.5}
                                alignItems="flex-end"
                                sx={{ width: '100%' }}
                              >
                                {/* Box icon + label */}
                                <Stack
                                  direction="row"
                                  alignItems="center"
                                  spacing={0.5}
                                  sx={{ minWidth: 64, pb: 0.5 }}
                                >
                                  <Iconify icon="mdi:package-variant-closed" width={22} sx={{ color: '#555' }} />
                                  <Typography sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                                    Item {iIdx + 1}
                                  </Typography>
                                </Stack>

                                {/* Pieces */}
                                <Stack spacing={0.3} sx={{ flex: 1, minWidth: 80 }}>
                                  <Typography sx={{ fontSize: 11, color: '#555' }}>
                                    Pieces <span style={{ color: 'red' }}>*</span>
                                  </Typography>
                                  <StyledTextField
                                    variant="standard"
                                    size="small"
                                    value={item.pieces}
                                    onChange={(e) => updateItem(pr.key, form.id, item.id, 'pieces', e.target.value)}
                                    inputProps={{ style: { fontSize: 13 } }}
                                  />
                                </Stack>

                                {/* Type dropdown */}
                                <Stack spacing={0.3} sx={{ flex: 1.3, minWidth: 100 }}>
                                  <Typography sx={{ fontSize: 11, color: '#555' }}>
                                    Type <span style={{ color: 'red' }}>*</span>
                                  </Typography>
                                  <StyledTextField
                                    select
                                    variant="standard"
                                    size="small"
                                    value={item.type}
                                    onChange={(e) => updateItem(pr.key, form.id, item.id, 'type', e.target.value)}
                                    inputProps={{ style: { fontSize: 13 } }}
                                  >
                                    {FREIGHT_TYPE_OPTIONS.map((opt) => (
                                      <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                                    ))}
                                  </StyledTextField>
                                </Stack>

                                {/* Length, Width, Height, Weight */}
                                {[
                                  { label: 'Length',      field: 'length' },
                                  { label: 'Width',       field: 'width'  },
                                  { label: 'Height',      field: 'height' },
                                  { label: 'Weight(lbs)', field: 'weight' },
                                ].map(({ label, field }) => (
                                  <Stack key={field} spacing={0.3} sx={{ flex: 1, minWidth: 70 }}>
                                    <Typography sx={{ fontSize: 11, color: '#555' }}>
                                      {label} <span style={{ color: 'red' }}>*</span>
                                    </Typography>
                                    <StyledTextField
                                      variant="standard"
                                      size="small"
                                      value={item[field]}
                                      onChange={(e) =>
                                        updateItem(pr.key, form.id, item.id, field, e.target.value)
                                      }
                                      inputProps={{ style: { fontSize: 13 } }}
                                    />
                                  </Stack>
                                ))}

                                {/* Action icons */}
                                <Stack direction="row" spacing={0.5} sx={{ pb: 0.5 }}>
                                  <IconButton
                                    size="small"
                                    onClick={() => removeItem(pr.key, form.id, item.id)}
                                    disabled={form.items.length === 1}
                                    title="Delete item"
                                  >
                                    <Iconify
                                      icon="mdi:trash-can-outline"
                                      width={18}
                                      sx={{ color: form.items.length === 1 ? '#ccc' : '#A22' }}
                                    />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    onClick={() => duplicateItem(pr.key, form.id, item.id)}
                                    title="Duplicate item"
                                  >
                                    <Iconify icon="mdi:content-copy" width={18} sx={{ color: '#555' }} />
                                  </IconButton>
                                  <IconButton size="small" title="Upload image">
                                    <Iconify icon="mdi:camera-outline" width={18} sx={{ color: '#555' }} />
                                  </IconButton>
                                </Stack>
                              </Stack>
                            ))}

                            <Box>
                              <Button
                                size="small"
                                variant="contained"
                                onClick={() => addItem(pr.key, form.id)}
                                sx={actionBtnSx}
                              >
                                Add Item
                              </Button>
                            </Box>
                          </Stack>
                        </Collapse>
                      </fieldset>
                    ))}
                  </Stack>

                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => addForm(pr.key)}
                      sx={{ ...actionBtnSx, minWidth: 110, height: 32 }}
                    >
                      Add New Form
                    </Button>
                  </Box>
                </Box>

              </Box>
            </Collapse>
          </Box>
        ))}

      </Stack>
      {/* Reject Freight Dialog */}
      <Dialog open={rejectOpen} onClose={handleRejectClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16, pr: 5 }}>
          Reject Freight
          <IconButton
            onClick={handleRejectClose}
            size="small"
            sx={{ position: 'absolute', right: 12, top: 12 }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Typography sx={{ fontSize: 13, mb: 1 }}>
            Reason for Rejection <span style={{ color: 'red' }}>*</span>
          </Typography>
          <TextField
            multiline
            rows={3}
            fullWidth
            size="small"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Enter reason for rejection"
          />
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={handleRejectClose}
            sx={{ textTransform: 'none', color: '#333', borderColor: '#aaa' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            size="small"
            disabled={!rejectReason.trim()}
            onClick={handleRejectSubmit}
            sx={{ ...actionBtnSx, height: 32 }}
          >
            Reject
          </Button>
        </DialogActions>
      </Dialog>
    </ShipmentFormLayout>
  );
}

