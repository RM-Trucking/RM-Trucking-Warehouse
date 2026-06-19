import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  FormControlLabel,
  IconButton,
  InputAdornment,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import EditLocationAltIcon from '@mui/icons-material/EditLocationAlt';
import CloseIcon from '@mui/icons-material/Close';
import Iconify from '../../components/iconify';
import { PATH_DASHBOARD } from '../../routes/paths';
import { useDispatch, useSelector } from '../../redux/store';
import { getWarehouseReceipts } from '../../redux/slices/warehouseReceipt';

const statusTabs = [
  { label: 'Active', countKey: 'active' },
  { label: 'Accounting', countKey: 'accounting' },
];

const quickStatuses = [
  { label: 'Initiated', countKey: 'initiate' },
  { label: 'On-Hand', countKey: 'onHand' },
  { label: 'Prepared', countKey: 'prepared' },
  { label: 'Scanned', countKey: 'scanned' },
  { label: 'Shipped', countKey: 'shipped' },
  { label: 'Rejected', countKey: 'rejected' },
  { label: 'Archived', countKey: 'archived' },
];

const statusApiValues = {
  Initiated: 'INITIATED',
  'On-Hand': 'ON_HAND',
  Prepared: 'PREPARED',
  Scanned: 'SCANNED',
  Shipped: 'SHIPPED',
  Rejected: 'REJECTED',
  Archived: 'ARCHIVED',
};

const actionIcons = [
  'mdi:eye',
  'mdi:printer',
  'location-edit',
  'mdi:upload',
  'mdi:file-document',
  'mdi:send',
  'mdi:hourglass',
];

const gridSx = {
  '& .MuiDataGrid-root': { border: 'none' },
  '& .MuiDataGrid-cell': { borderBottom: '1px solid #e0e0e0' },
  '& .MuiDataGrid-columnHeaders': {
    fontWeight: 'bold !important',
    fontSize: '14px !important',
  },
  '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 'bold', fontSize: '14px' },
};

const isYes = (value) => String(value || '').toUpperCase() === 'Y';

const buildFreightInfoFromReceipt = (receipt = {}) => ({
  conditions: {
    'Banded Skid': isYes(receipt.bandedSkid),
    'Shrink Wrapped Skid': isYes(receipt.shrinkWrappedSkid),
    'SHT / IPPC Skid': isYes(receipt.shtIppcSkid),
    'Plastic Skid': isYes(receipt.plasticSkid),
    Document: isYes(receipt.documents),
  },
  badFreightCondition: isYes(receipt.freightCondition) || Boolean(receipt.badFreightConditionImages?.length),
  freightConditionImages: receipt.badFreightConditionImages || [],
  hazMat: isYes(receipt.hazMat),
  originalDgd: isYes(receipt.originalDgd),
  unNumbers: Array.isArray(receipt.unNumber) ? receipt.unNumber : [],
  hazmatClasses: Array.isArray(receipt.class) ? receipt.class : [],
  unNumberInput: '',
  hazmatClassInput: '',
  properShippingName: receipt.properShippingName || '',
  freightConditionDescription: receipt.handlingDescription || '',
  hazardousDescription: receipt.hazardousDescription || '',
  notes: receipt.notes || '',
});

export default function WarehouseRecieptPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { receipts, isLoading, error, pagination, countList } = useSelector((state) => state.warehouseReceiptdata);
  const [activeTab, setActiveTab] = useState('Active');
  const [searchValue, setSearchValue] = useState('');
  const [submittedReceiptNumber, setSubmittedReceiptNumber] = useState('');
  const [locationDialog, setLocationDialog] = useState({ open: false, row: null, location: '' });
  const [locationOverrides, setLocationOverrides] = useState({});
  const [copyMessageOpen, setCopyMessageOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });

  useEffect(() => {
    dispatch(getWarehouseReceipts({
      page: paginationModel.page + 1,
      pageSize: paginationModel.pageSize,
      status: selectedStatus ? statusApiValues[selectedStatus] : '',
      receiptNumber: submittedReceiptNumber,
    }));
  }, [dispatch, paginationModel.page, paginationModel.pageSize, selectedStatus, submittedReceiptNumber]);

  const gridRowCount = pagination.totalRecords || (
    paginationModel.page * paginationModel.pageSize +
    receipts.length +
    (receipts.length === paginationModel.pageSize ? 1 : 0)
  );

  const getCount = (key) => Number(countList?.[key] ?? 0);

  const filteredRows = useMemo(() => {
    return receipts.map((row) => ({
      ...row,
      location: locationOverrides[row.id] ?? row.location,
    }));
  }, [locationOverrides, receipts]);

  const handleCopyReceiptNumber = async (event, receiptNumber) => {
    event.stopPropagation();
    const value = String(receiptNumber ?? '');
    if (!value) return;

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      setCopyMessageOpen(true);
      return;
    }

    const input = document.createElement('input');
    input.value = value;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    setCopyMessageOpen(true);
  };

  const columns = [
    {
      field: 'receiptNumber',
      headerName: 'Receipt Number',
      minWidth: 130,
      flex: 1,
      renderCell: (params) => (
        <Stack direction="row" alignItems="center" spacing={0.6} sx={{ height: '100%' }}>
          <Typography sx={{ fontSize: 12 }}>{params.value}</Typography>
          <IconButton
            size="small"
            aria-label={`Copy receipt number ${params.value}`}
            onClick={(event) => handleCopyReceiptNumber(event, params.value)}
            sx={{ p: 0.2 }}
          >
            <Iconify icon="mdi:content-copy" width={13} sx={{ color: '#9db9cf' }} />
          </IconButton>
          <Iconify icon="mdi:check-circle" width={14} sx={{ color: '#63b66e' }} />
        </Stack>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      minWidth: 140,
      renderCell: (params) => (
        <Box
          sx={{
            bgcolor: '#62b36e',
            color: '#fff',
            borderRadius: 3,
            minWidth: 60,
            textAlign: 'center',
            fontSize: 11,
          }}
        >
          {params.value}
        </Box>
      ),
    },
    { field: 'carrier', headerName: 'Carrier', minWidth: 100, flex: 0.8 },
    { field: 'customer', headerName: 'Customer', minWidth: 155, flex: 1.2 },
    { field: 'proNumber', headerName: 'Pro Number', minWidth: 170, flex: 1.4 },
    { field: 'idVerification', headerName: 'Id Verification', minWidth: 120, flex: 1 },
    { field: 'location', headerName: 'Location', minWidth: 85, flex: 0.6 },
    { field: 'rate', headerName: 'Rate', minWidth: 80, flex: 0.6 },
    { field: 'createdDate', headerName: 'Created Date', minWidth: 125, flex: 0.9 },
    {
      field: 'actions',
      headerName: 'Actions',
      sortable: false,
      filterable: false,
      minWidth: 190,
      headerAlign: 'center',
      align: 'right',
      renderCell: (params) => (
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="flex-end"
          spacing={0.4}
          sx={{ width: '100%', height: '100%' }}
        >
          {actionIcons.map((icon) => (
            <IconButton
              key={icon}
              size="small"
              onClick={
                icon === 'mdi:eye'
                  ? () => handleViewReceipt(params.row)
                  : icon === 'location-edit'
                    ? () => handleOpenLocationDialog(params.row)
                    : undefined
              }
              sx={{ p: 0.25 }}
            >
              {icon === 'location-edit' ? (
                <EditLocationAltIcon sx={{ color: '#050505', fontSize: 18 }} />
              ) : (
                <Iconify icon={icon} width={16} sx={{ color: '#050505' }} />
              )}
            </IconButton>
          ))}
        </Stack>
      ),
    },
  ];

  const handleStatusChange = (label, checked) => {
    setSelectedStatus(checked ? label : '');
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  };

  const handleReceiptSearch = () => {
    setSubmittedReceiptNumber(searchValue.trim());
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  };

  const handleClearReceiptSearch = () => {
    setSearchValue('');
    setSubmittedReceiptNumber('');
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  };

  const handleOpenLocationDialog = (row) => {
    setLocationDialog({ open: true, row, location: row.location || '' });
  };

  const handleCloseLocationDialog = () => {
    setLocationDialog({ open: false, row: null, location: '' });
  };

  const handleSubmitLocation = () => {
    if (!locationDialog.row) return;

    setLocationOverrides((prev) => ({
      ...prev,
      [locationDialog.row.id]: locationDialog.location,
    }));
    handleCloseLocationDialog();
  };

  const handleViewReceipt = (row) => {
    const receipt = row.rawData || {};
    const freightInfo = buildFreightInfoFromReceipt(receipt);
    const freightItems = receipt.freightInformation?.length
      ? receipt.freightInformation.map((item, index) => ({
          id: item.freightId || index + 1,
          pieces: item.pieces,
          type: item.type,
          length: item.length,
          width: item.width,
          height: item.height,
          weight: item.weight,
          images: item.images || [],
        }))
      : [
          {
            id: 1,
            pieces: row.pieces,
            type: row.type,
            length: row.length,
            width: row.width,
            height: row.height,
            weight: row.weight,
            images: [],
          },
        ];

    navigate(PATH_DASHBOARD.warehouseReceiptForm, {
      state: {
        title: 'Warehouse Receipt Form',
        draftKey: `warehouse-receipt-view-${row.receiptNumber}`,
        warehouseReceiptView: true,
        viewReceiptSummary: {
          receiptNumber: row.receiptNumber,
          status: row.status,
        },
        receipts: [
          {
            key: `warehouse-receipt-${row.receiptNumber}`,
            proNumber: row.proNumber,
            receivedBy: row.receivedBy,
            location: row.location,
            row: {
              ...row,
              ...receipt,
              receiptId: row.receiptId || row.id,
              receiptNumber: row.receiptNumber,
              carrier: row.carrier,
              customer: row.customer,
              proNumber: row.proNumber,
              invoiceNo: row.invoiceNo,
              poNumber: row.poNumber,
              customerRefNo: row.customerRefNo,
              piecesInland: receipt.piecesInland ?? row.pieces,
              weightInland: receipt.weightInland ?? row.weight,
            },
            forms: [
              {
                id: 1,
                receiptNumber: row.receiptNumber,
                freightOptions: [],
                badFreightImages: receipt.badFreightConditionImages || [],
                freightInfo,
                items: freightItems,
              },
            ],
          },
        ],
      },
    });
  };

  return (
    <Box sx={{ bgcolor: '#fff', minHeight: '100vh', p: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <h2 style={{ margin: 0 }}>Warehouse Receipt Form</h2>
      </Stack>

      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1 }}>
        <TextField
          size="small"
          placeholder="Search by Receipt Number"
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          sx={{
            width: 245,
            '& .MuiOutlinedInput-root': {
              paddingRight: 0.5,
            },
          }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end" sx={{ gap: 0.5, mr: 0 }}>
                {searchValue && (
                  <IconButton size="small" onClick={handleClearReceiptSearch} sx={{ p: 0.2 }}>
                    <ClearIcon sx={{ fontSize: 18, color: '#999' }} />
                  </IconButton>
                )}
                <IconButton size="small" onClick={handleReceiptSearch} sx={{ p: 0.2 }}>
                  <SearchIcon sx={{ fontSize: 18, color: '#777' }} />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        <IconButton size="small" sx={{ bgcolor: '#a22', color: '#fff', borderRadius: 0.8, '&:hover': { bgcolor: '#8b1c1c' } }}>
          <Iconify icon="mdi:table" width={18} />
        </IconButton>
      </Box>

      <Stack direction="row" alignItems="flex-end" justifyContent="space-between" sx={{ mb: 1.5 }}>
        <Stack direction="row" alignItems="flex-end" spacing={2}>
          {statusTabs.map((tab) => {
            const selected = activeTab === tab.label;
            return (
              <Button
                key={tab.label}
                onClick={() => setActiveTab(tab.label)}
                sx={{
                  px: 0,
                  pb: 0.7,
                  minWidth: 0,
                  borderRadius: 0,
                  color: selected ? '#111' : '#777',
                  borderBottom: selected ? '2px solid #a22' : '2px solid transparent',
                  textTransform: 'none',
                  fontSize: 14,
                  fontWeight: selected ? 700 : 400,
                }}
              >
                {tab.label} ({String(getCount(tab.countKey)).padStart(2, '0')})
              </Button>
            );
          })}
        </Stack>
      </Stack>

      <Stack direction="row" spacing={1.2} sx={{ mb: 1.3 }}>
        {quickStatuses.map((status) => (
          <FormControlLabel
            key={status.label}
            sx={{ mr: 0.5 }}
            control={
              <Checkbox
                size="small"
                checked={selectedStatus === status.label}
                onChange={(event) => handleStatusChange(status.label, event.target.checked)}
                sx={{ p: 0.3, '&.Mui-checked': { color: '#1b426f' } }}
              />
            }
            label={
              <Typography sx={{ fontSize: 12 }}>
                {status.label} ({getCount(status.countKey)})
              </Typography>
            }
          />
        ))}
      </Stack>

      <Box sx={{ width: '100%' }}>
        {error && (
          <Typography sx={{ color: '#A22', fontSize: 12, mb: 1 }}>
            {error}
          </Typography>
        )}
        <DataGrid
          rows={filteredRows}
          columns={columns}
          loading={isLoading}
          disableRowSelectionOnClick
          disableColumnMenu
          paginationMode="server"
          rowCount={gridRowCount}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[10, 20, 50, 100]}
          sx={gridSx}
        />
      </Box>

      <Dialog
        open={locationDialog.open}
        onClose={handleCloseLocationDialog}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 1,
          },
        }}
      >
        <DialogContent sx={{ p: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ borderBottom: '1px solid #777', pb: 0.8 }}>
            <Typography sx={{ fontSize: 22, fontWeight: 700 }}>
              Update Location - {locationDialog.row?.receiptNumber || ''}
            </Typography>
            <IconButton size="small" onClick={handleCloseLocationDialog} sx={{ p: 0.2, color: '#111' }}>
              <CloseIcon sx={{ fontSize: 24 }} />
            </IconButton>
          </Stack>

          <TextField
            variant="standard"
            label={
              <Box component="span">
                Location <Box component="span" sx={{ color: '#A22' }}>*</Box>
              </Box>
            }
            value={locationDialog.location}
            onChange={(event) => setLocationDialog((prev) => ({ ...prev, location: event.target.value }))}
            fullWidth
            sx={{
              mt: 4,
              '& .MuiInputLabel-root': { fontSize: 18 },
              '& .MuiInputBase-input': { fontSize: 18, py: 0.8 },
            }}
          />

          <Stack direction="row" spacing={2.2} sx={{ mt: 7 }}>
            <Button
              variant="outlined"
              size="large"
              onClick={handleCloseLocationDialog}
              sx={{ color: '#111', borderColor: '#111', textTransform: 'none', minWidth: 98, fontSize: 20, height: 34 }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              size="large"
              onClick={handleSubmitLocation}
              sx={{ bgcolor: '#A22', '&:hover': { bgcolor: '#8b1c1c' }, textTransform: 'none', minWidth: 98, fontSize: 18, height: 34 }}
            >
              Submit
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>

      <Snackbar
        open={copyMessageOpen}
        autoHideDuration={2000}
        onClose={() => setCopyMessageOpen(false)}
        message="Receipt number copied"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}
