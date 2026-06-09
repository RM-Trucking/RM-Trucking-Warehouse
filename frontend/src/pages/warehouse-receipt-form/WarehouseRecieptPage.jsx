import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  IconButton,
  InputAdornment,
  MenuItem,
  Popover,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import Iconify from '../../components/iconify';
import { PATH_DASHBOARD } from '../../routes/paths';

const statusTabs = [
  { label: 'Active', count: 100 },
  { label: 'Accounting', count: 5 },
];

const quickStatuses = [
  { label: 'Initiated', count: 25 },
  { label: 'On-Hand', count: 25 },
  { label: 'Approved', count: 40 },
  { label: 'Waiting', count: 10 },
];

const filterStatuses = ['Initiated', 'On-Hand', 'Prepared', 'Scanned', 'Shipped', 'Rejected', 'Archived'];

const actionIcons = [
  'mdi:eye',
  'mdi:printer',
  'mdi:check-circle',
  'mdi:download',
  'mdi:file-document',
  'mdi:send',
  'mdi:hourglass',
];

const rows = Array.from({ length: 25 }, (_, index) => {
  const carriers = ['CARGO', 'G-NEW', 'ROAD ONE', 'LHH'];
  const customers = ['Innovations LLC', 'Ventana Serra LLC', 'Seacoast', 'Serra LLC', 'Venture LLC', 'Sweetwater LLC'];
  const locations = ['CHH', 'OH'];
  const receiptNumber = 100002001 + index;

  return {
    id: receiptNumber,
    receiptNumber,
    status: index % 4 === 0 ? 'Initiated' : 'On-Hand',
    carrier: carriers[index % carriers.length],
    customer: customers[index % customers.length],
    proNumber: `PTLZ222143 05012${String(index + 27).padStart(2, '0')}`,
    idVerification: 100002001 + index,
    location: locations[index % locations.length],
    rate: index > 3 ? '120.00' : '130.00',
    createdDate: ['03/15/2026', '07/22/2026', '11/09/2026', '01/30/2026', '05/12/2026'][index % 5],
    receivedBy: index % 2 === 0 ? 'Dock User' : 'Warehouse User',
    pieces: String((index % 4) + 1),
    type: ['Skid', 'Crate', 'Box', 'Pallet'][index % 4],
    length: String(42 + index),
    width: String(36 + (index % 5)),
    height: String(30 + (index % 6)),
    weight: String(120 + index * 3),
    invoiceNo: `INV-${receiptNumber}`,
    poNumber: `PO-${receiptNumber}`,
    customerRefNo: `REF-${receiptNumber}`,
  };
});

const gridSx = {
  borderColor: '#d8d8d8',
  '& .MuiDataGrid-columnHeaders': {
    bgcolor: '#f3f3f3',
    minHeight: '38px !important',
    maxHeight: '38px !important',
  },
  '& .MuiDataGrid-columnHeader': {
    fontSize: 12,
    fontWeight: 700,
    color: '#222',
  },
  '& .MuiDataGrid-cell': {
    fontSize: 12,
    py: 0,
    borderColor: '#ececec',
  },
  '& .MuiDataGrid-row': {
    minHeight: '32px !important',
    maxHeight: '32px !important',
  },
  '& .MuiDataGrid-footerContainer': {
    borderTop: 'none',
    minHeight: 52,
  },
};

export default function WarehouseRecieptPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Active');
  const [searchValue, setSearchValue] = useState('');
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);
  const [selectedStatuses, setSelectedStatuses] = useState({
    Initiated: false,
    'On-Hand': true,
    Approved: false,
    Waiting: false,
  });
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 20 });

  const filteredRows = useMemo(() => {
    const search = searchValue.trim().toLowerCase();
    const checkedStatuses = Object.entries(selectedStatuses)
      .filter(([, checked]) => checked)
      .map(([label]) => label);

    return rows.filter((row) => {
      const matchesSearch =
        !search ||
        String(row.receiptNumber).includes(search) ||
        row.customer.toLowerCase().includes(search) ||
        row.proNumber.toLowerCase().includes(search);

      const matchesStatus = checkedStatuses.length === 0 || checkedStatuses.includes(row.status);
      return matchesSearch && matchesStatus;
    });
  }, [searchValue, selectedStatuses]);

  const columns = [
    {
      field: 'receiptNumber',
      headerName: 'Receipt Number',
      minWidth: 130,
      flex: 1,
      renderCell: (params) => (
        <Stack direction="row" alignItems="center" spacing={0.6} sx={{ height: '100%' }}>
          <Typography sx={{ fontSize: 12 }}>{params.value}</Typography>
          <Iconify icon="mdi:content-copy" width={13} sx={{ color: '#9db9cf' }} />
          <Iconify icon="mdi:check-circle" width={14} sx={{ color: '#63b66e' }} />
        </Stack>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      minWidth: 105,
      renderCell: (params) => (
        <Box
          sx={{
            bgcolor: '#62b36e',
            color: '#fff',
            px: 1.4,
            py: 0.25,
            borderRadius: 5,
            minWidth: 88,
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
      headerName: '',
      sortable: false,
      filterable: false,
      minWidth: 190,
      align: 'right',
      headerAlign: 'right',
      renderCell: (params) => (
        <Stack direction="row" justifyContent="flex-end" spacing={0.4} sx={{ width: '100%' }}>
          {actionIcons.map((icon) => (
            <IconButton
              key={icon}
              size="small"
              onClick={icon === 'mdi:eye' ? () => handleViewReceipt(params.row) : undefined}
              sx={{ p: 0.25 }}
            >
              <Iconify icon={icon} width={16} sx={{ color: '#050505' }} />
            </IconButton>
          ))}
        </Stack>
      ),
    },
  ];

  const handleStatusChange = (label, checked) => {
    setSelectedStatuses((prev) => ({ ...prev, [label]: checked }));
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  };

  const handleViewReceipt = (row) => {
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
              receiptId: row.id,
              receiptNumber: row.receiptNumber,
              carrier: row.carrier,
              customer: row.customer,
              proNumber: row.proNumber,
              invoiceNo: row.invoiceNo,
              poNumber: row.poNumber,
              customerRefNo: row.customerRefNo,
              piecesInland: row.pieces,
              weightInland: row.weight,
            },
            forms: [
              {
                id: 1,
                receiptNumber: row.receiptNumber,
                freightOptions: [],
                items: [
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
                ],
              },
            ],
          },
        ],
      },
    });
  };

  return (
    <Box sx={{ bgcolor: '#fff', minHeight: '100vh', p: 3 }}>
      <Typography sx={{ fontSize: 16, fontWeight: 700, mb: 8 }}>Warehouse Receipt Form</Typography>

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
                {tab.label} ({String(tab.count).padStart(2, '0')})
              </Button>
            );
          })}
        </Stack>

        <Stack direction="row" alignItems="center" spacing={1.2}>
          <TextField
            size="small"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            sx={{ width: 245, '& .MuiInputBase-root': { height: 31, borderRadius: 0 } }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <SearchIcon sx={{ fontSize: 18, color: '#777' }} />
                </InputAdornment>
              ),
            }}
          />
          <IconButton size="small" onClick={(event) => setFilterAnchorEl(event.currentTarget)}>
            <FilterListIcon sx={{ fontSize: 20 }} />
          </IconButton>
          <IconButton size="small" sx={{ bgcolor: '#a22', color: '#fff', borderRadius: 0.8, '&:hover': { bgcolor: '#8b1c1c' } }}>
            <Iconify icon="mdi:table" width={18} />
          </IconButton>
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
                checked={Boolean(selectedStatuses[status.label])}
                onChange={(event) => handleStatusChange(status.label, event.target.checked)}
                sx={{ p: 0.3, '&.Mui-checked': { color: '#1b426f' } }}
              />
            }
            label={
              <Typography sx={{ fontSize: 12 }}>
                {status.label} ({status.count})
              </Typography>
            }
          />
        ))}
      </Stack>

      <Box sx={{ height: 420, width: '100%' }}>
        <DataGrid
          rows={filteredRows}
          columns={columns}
          disableRowSelectionOnClick
          disableColumnMenu
          density="compact"
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[20, 50, 100]}
          sx={gridSx}
        />
      </Box>

      <Popover
        open={Boolean(filterAnchorEl)}
        anchorEl={filterAnchorEl}
        onClose={() => setFilterAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { width: 205, p: 1.2, borderRadius: 1, border: '1px solid #dedede' } }}
      >
        <Stack>
          {filterStatuses.map((status) => (
            <FormControlLabel
              key={status}
              control={
                <Checkbox
                  size="small"
                  checked={Boolean(selectedStatuses[status])}
                  onChange={(event) => handleStatusChange(status, event.target.checked)}
                  sx={{ p: 0.45 }}
                />
              }
              label={<Typography sx={{ fontSize: 12 }}>{status}</Typography>}
            />
          ))}
        </Stack>
      </Popover>
    </Box>
  );
}
