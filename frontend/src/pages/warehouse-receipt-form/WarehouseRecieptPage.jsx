import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogContent,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import FilterListIcon from '@mui/icons-material/FilterList';
import EditLocationAltIcon from '@mui/icons-material/EditLocationAlt';
import CloseIcon from '@mui/icons-material/Close';
import Iconify from '../../components/iconify';
import { PATH_DASHBOARD } from '../../routes/paths';
import { useDispatch, useSelector } from '../../redux/store';
import {
  getWarehouseReceipts,
  searchWarehouseReceiptCustomers,
  searchWarehouseReceiptStations,
  updateWarehouseReceiptLocation,
} from '../../redux/slices/warehouseReceipt';
import { searchCarriers } from '../../redux/slices/enroute';

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

const emptyReceiptFilters = {
  startDate: '',
  endDate: '',
  carrier: '',
  carrierId: '',
  location: '',
  proNumber: '',
  receiptNumber: '',
  verificationId: '',
  customer: '',
  customerId: '',
  station: '',
  stationId: '',
  destination: '',
  packageId: '',
  customerRefNumber: '',
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

const isSendToTellSystemYes = (value) => ['Y', 'YES'].includes(String(value || '').trim().toUpperCase());

const statusPillColors = {
  'on-hand': '#4aa3d8',
  initiated: '#a87b4f',
  prepared: '#8f63c7',
  scanned: '#3f9d50',
  shipped: '#1f7a3a',
  rejected: '#c62828',
  archived: '#707070',
};

const getStatusPillColor = (status) => {
  const key = String(status || '').trim().toLowerCase();
  return statusPillColors[key] || '#62b36e';
};

const isOnHandStatus = (status) => String(status || '').trim().toLowerCase().replace('_', '-') === 'on-hand';

const getCarrierOptionLabel = (option) => {
  if (!option) return '';
  if (typeof option === 'string') return option;
  return option.carrierName || option.name || option.label || '';
};

const getCustomerOptionLabel = (option) => {
  if (!option) return '';
  if (typeof option === 'string') return option;

  const customerName = option.customerName || option.name || option.label || '';
  const stationName = option.stationName || '';

  return stationName ? `${customerName} | ${stationName}` : customerName;
};

const getStationOptionLabel = (option) => {
  if (!option) return '';
  if (typeof option === 'string') return option;
  return option.stationName || option.name || option.label || '';
};

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
  const { state } = useLocation();
  const gridState = state?.warehouseReceiptGridState || {};
  const dispatch = useDispatch();
  const {
    receipts,
    isLoading,
    error,
    pagination,
    countList,
    customerOptions,
    customerLoading,
    stationOptions,
    stationLoading,
  } = useSelector((state) => state.warehouseReceiptdata);
  const { carrierOptions, carrierLoading } = useSelector((state) => state.enroutedata);
  const [activeTab, setActiveTab] = useState('Active');
  const [searchValue, setSearchValue] = useState(gridState.searchValue || '');
  const [submittedReceiptNumber, setSubmittedReceiptNumber] = useState(gridState.submittedReceiptNumber || '');
  const [locationDialog, setLocationDialog] = useState({ open: false, row: null, location: '' });
  const [locationOverrides, setLocationOverrides] = useState({});
  const [locationSaving, setLocationSaving] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [locationMessageOpen, setLocationMessageOpen] = useState(false);
  const [copyMessageOpen, setCopyMessageOpen] = useState(false);
  const [comingSoonMessageOpen, setComingSoonMessageOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(gridState.selectedStatus || '');
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [receiptFilters, setReceiptFilters] = useState(gridState.receiptFilters || gridState.appliedReceiptFilters || emptyReceiptFilters);
  const [appliedReceiptFilters, setAppliedReceiptFilters] = useState(gridState.appliedReceiptFilters || emptyReceiptFilters);
  const [filterSearchVersion, setFilterSearchVersion] = useState(0);
  const [paginationModel, setPaginationModel] = useState(gridState.paginationModel || { page: 0, pageSize: 10 });

  const activeFilterCount = Object.entries(appliedReceiptFilters)
    .filter(([key, value]) => !['carrier', 'customerId', 'stationId'].includes(key) && String(value || '').trim())
    .length;
  const requestStatus = selectedStatus ? statusApiValues[selectedStatus] : '';
  const requestReceiptNumber = appliedReceiptFilters.receiptNumber || submittedReceiptNumber;
  const requestFilters = {
    startDate: appliedReceiptFilters.startDate,
    endDate: appliedReceiptFilters.endDate,
    carrierId: appliedReceiptFilters.carrierId,
    location: appliedReceiptFilters.location,
    proNumber: appliedReceiptFilters.proNumber,
    verificationId: appliedReceiptFilters.verificationId,
    customerId: appliedReceiptFilters.customerId,
    stationId: appliedReceiptFilters.stationId,
    destination: appliedReceiptFilters.destination,
    packageId: appliedReceiptFilters.packageId,
    customerRefNumber: appliedReceiptFilters.customerRefNumber,
  };

  useEffect(() => {
    dispatch(getWarehouseReceipts({
      page: paginationModel.page + 1,
      pageSize: paginationModel.pageSize,
      status: requestStatus,
      receiptNumber: requestReceiptNumber,
      filters: requestFilters,
    }));
  }, [
    dispatch,
    filterSearchVersion,
    paginationModel.page,
    paginationModel.pageSize,
    requestStatus,
    requestReceiptNumber,
    requestFilters.startDate,
    requestFilters.endDate,
    requestFilters.carrierId,
    requestFilters.location,
    requestFilters.proNumber,
    requestFilters.verificationId,
    requestFilters.customerId,
    requestFilters.stationId,
    requestFilters.destination,
    requestFilters.packageId,
    requestFilters.customerRefNumber,
  ]);

  useEffect(() => {
    if (!filterDialogOpen) return undefined;
    if (receiptFilters.carrierId) return undefined;

    const timer = setTimeout(() => {
      dispatch(searchCarriers(receiptFilters.carrier));
    }, 500);

    return () => clearTimeout(timer);
  }, [dispatch, filterDialogOpen, receiptFilters.carrier, receiptFilters.carrierId]);

  useEffect(() => {
    if (!filterDialogOpen) return undefined;
    if (receiptFilters.customerId) return undefined;

    const timer = setTimeout(() => {
      dispatch(searchWarehouseReceiptCustomers(receiptFilters.customer));
    }, 500);

    return () => clearTimeout(timer);
  }, [dispatch, filterDialogOpen, receiptFilters.customer, receiptFilters.customerId]);

  useEffect(() => {
    if (!filterDialogOpen) return undefined;
    if (receiptFilters.stationId) return undefined;

    const timer = setTimeout(() => {
      dispatch(searchWarehouseReceiptStations(receiptFilters.customerId, receiptFilters.station));
    }, 500);

    return () => clearTimeout(timer);
  }, [dispatch, filterDialogOpen, receiptFilters.customerId, receiptFilters.station, receiptFilters.stationId]);

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
      renderCell: (params) => {
        const sentToTellSystem = isSendToTellSystemYes(params.row.sendToTellSystem);

        return (
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
            {sentToTellSystem ? (
              <Tooltip title="Warehouse receipt sent to the Tell system." arrow>
                <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center' }}>
                  <Iconify icon="mdi:check-circle" width={14} sx={{ color: '#63b66e' }} />
                </Box>
              </Tooltip>
            ) : (
              <Tooltip title="Waiting to send the warehouse receipt to the Tell system." arrow>
                <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center' }}>
                  <Iconify icon="mdi:clock-outline" width={18} sx={{ color: '#777' }} />
                </Box>
              </Tooltip>
            )}
          </Stack>
        );
      },
    },
    {
      field: 'status',
      headerName: 'Status',
      minWidth: 140,
      renderCell: (params) => {
        const pillColor = getStatusPillColor(params.value);

        return (
          <Stack alignItems="center" justifyContent="center" sx={{ width: '100%', height: '100%' }}>
            <Box
              sx={{
                bgcolor: pillColor,
                color: '#fff',
                borderRadius: 999,
                width: 'calc(100% - 18px)',
                height: 30,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 600,
                lineHeight: 1,
              }}
            >
              {params.value}
            </Box>
          </Stack>
        );
      },
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
      align: 'center',
      renderCell: (params) => {
        const visibleActionIcons = isOnHandStatus(params.row.status) ? actionIcons : ['mdi:eye'];

        return (
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="center"
            spacing={0.4}
            sx={{ width: '100%', height: '100%' }}
          >
            {visibleActionIcons.map((icon) => {
              const isEnabledAction = ['mdi:eye', 'location-edit'].includes(icon);
              const iconColor = isEnabledAction ? '#050505' : '#a8a8a8';
              const handleActionClick = (event) => {
                event.stopPropagation();

                if (icon === 'mdi:eye') {
                  handleViewReceipt(params.row);
                  return;
                }

                if (icon === 'location-edit') {
                  handleOpenLocationDialog(params.row);
                  return;
                }

                setComingSoonMessageOpen(true);
              };
              const handleActionMouseDown = (event) => {
                event.stopPropagation();
              };

              return (
                <IconButton
                  key={icon}
                  size="small"
                  onClick={handleActionClick}
                  onMouseDown={handleActionMouseDown}
                  sx={{ p: 0.25, color: iconColor }}
                >
                  {icon === 'location-edit' ? (
                    <EditLocationAltIcon sx={{ color: iconColor, fontSize: 18 }} />
                  ) : (
                    <Iconify icon={icon} width={16} sx={{ color: iconColor }} />
                  )}
                </IconButton>
              );
            })}
          </Stack>
        );
      },
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

  const handleReceiptFilterChange = (field, value) => {
    setReceiptFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleReceiptCarrierInputChange = (value, reason) => {
    setReceiptFilters((prev) => ({
      ...prev,
      carrier: value,
      carrierId: reason === 'reset' ? prev.carrierId : '',
    }));
  };

  const handleReceiptCarrierChange = (value) => {
    setReceiptFilters((prev) => ({
      ...prev,
      carrier: getCarrierOptionLabel(value),
      carrierId: value?.carrierId || value?.id || '',
    }));
  };

  const handleReceiptCustomerInputChange = (value, reason) => {
    setReceiptFilters((prev) => ({
      ...prev,
      customer: value,
      customerId: reason === 'reset' ? prev.customerId : '',
      station: reason === 'reset' ? prev.station : '',
      stationId: reason === 'reset' ? prev.stationId : '',
    }));
  };

  const handleReceiptCustomerChange = (value) => {
    setReceiptFilters((prev) => ({
      ...prev,
      customer: getCustomerOptionLabel(value),
      customerId: value?.customerId || value?.id || '',
      station: '',
      stationId: '',
    }));
  };

  const handleReceiptStationInputChange = (value, reason) => {
    setReceiptFilters((prev) => ({
      ...prev,
      station: value,
      stationId: reason === 'reset' ? prev.stationId : '',
    }));
  };

  const handleReceiptStationChange = (value) => {
    setReceiptFilters((prev) => ({
      ...prev,
      station: getStationOptionLabel(value),
      stationId: value?.stationId || value?.id || '',
    }));
  };

  const handleOpenReceiptFilters = () => {
    setReceiptFilters(appliedReceiptFilters);
    setFilterDialogOpen(true);
  };

  const handleCloseReceiptFilters = () => {
    setFilterDialogOpen(false);
  };

  const handleSearchReceiptFilters = () => {
    const nextFilters = {
      ...receiptFilters,
      carrier: receiptFilters.carrierId ? receiptFilters.carrier : '',
      customer: receiptFilters.customerId ? receiptFilters.customer : '',
      station: receiptFilters.stationId ? receiptFilters.station : '',
    };

    setReceiptFilters(nextFilters);
    setAppliedReceiptFilters(nextFilters);
    setFilterSearchVersion((prev) => prev + 1);
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
    setFilterDialogOpen(false);
  };

  const handleClearReceiptFilters = () => {
    setReceiptFilters(emptyReceiptFilters);
    setAppliedReceiptFilters(emptyReceiptFilters);
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  };

  const handleOpenLocationDialog = (row) => {
    setLocationDialog({ open: true, row, location: row.location || '' });
    setLocationError('');
  };

  const handleCloseLocationDialog = () => {
    if (locationSaving) return;
    setLocationDialog({ open: false, row: null, location: '' });
    setLocationError('');
  };

  const handleSubmitLocation = async () => {
    if (!locationDialog.row) return;

    const receiptId = locationDialog.row.receiptId || locationDialog.row.id;
    const location = locationDialog.location.trim();

    if (!location) {
      setLocationError('Location is required');
      return;
    }

    setLocationSaving(true);
    setLocationError('');

    const response = await dispatch(updateWarehouseReceiptLocation({
      receiptId,
      location,
    }));

    setLocationSaving(false);

    if (response?.error || response?.success === false) {
      setLocationError(response?.message || 'Failed to update warehouse receipt location');
      return;
    }

    setLocationOverrides((prev) => ({
      ...prev,
      [locationDialog.row.id]: location,
    }));
    handleCloseLocationDialog();
    setLocationMessageOpen(true);
  };

  const getWarehouseReceiptGridState = () => ({
    selectedStatus,
    searchValue,
    submittedReceiptNumber,
    receiptFilters,
    appliedReceiptFilters,
    paginationModel,
  });

  const handleViewReceipt = (row) => {
    const receipt = row.rawData || {};
    const freightInfo = buildFreightInfoFromReceipt(receipt);
    const freightItems = Array.isArray(receipt.freightInformation)
      ? receipt.freightInformation.map((item, index) => ({
          id: item.freightId || index + 1,
          freightId: item.freightId,
          pieces: item.pieces,
          type: item.type,
          length: item.length,
          width: item.width,
          height: item.height,
          weight: item.weight,
          images: item.images || [],
        }))
      : [];

    navigate(PATH_DASHBOARD.warehouseReceiptForm, {
      state: {
        title: 'Warehouse Receipt Form',
        draftKey: `warehouse-receipt-view-${row.receiptNumber}`,
        warehouseReceiptView: true,
        warehouseReceiptGridState: getWarehouseReceiptGridState(),
        viewReceiptSummary: {
          receiptId: row.receiptId || row.id,
          receiptNumber: row.receiptNumber,
          status: row.status,
          noteThreadId: receipt.noteThreadId,
          rateInformation: receipt.rateInformation,
          hasFlatRate: receipt.hasFlatRate,
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
          onChange={(event) => setSearchValue(event.target.value.slice(0, 100))}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              handleReceiptSearch();
            }
          }}
          inputProps={{ maxLength: 100 }}
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
        <IconButton
          size="small"
          onClick={handleOpenReceiptFilters}
          sx={{
            color: activeFilterCount ? '#1b426f' : '#111',
            bgcolor: activeFilterCount ? 'rgba(27, 66, 111, 0.1)' : 'transparent',
            borderRadius: 0.8,
            '&:hover': {
              bgcolor: activeFilterCount ? 'rgba(27, 66, 111, 0.16)' : 'rgba(0, 0, 0, 0.04)',
            },
          }}
        >
          <FilterListIcon sx={{ fontSize: 20 }} />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => setComingSoonMessageOpen(true)}
          sx={{
            bgcolor: '#e5e5e5',
            color: '#9a9a9a',
            borderRadius: 0.8,
            '&:hover': { bgcolor: '#dedede' },
          }}
        >
          <Iconify icon="mdi:table" width={18} sx={{ color: '#9a9a9a' }} />
        </IconButton>
      </Box>

      <Stack direction="row" alignItems="flex-end" justifyContent="space-between" sx={{ mb: 1.5 }}>
        <Stack direction="row" alignItems="flex-end" spacing={2}>
          {statusTabs.map((tab) => {
            const selected = activeTab === tab.label;
            const isDisabledTab = tab.label === 'Accounting';
            return (
              <Button
                key={tab.label}
                onClick={() => {
                  if (isDisabledTab) {
                    setComingSoonMessageOpen(true);
                    return;
                  }
                  setActiveTab(tab.label);
                }}
                sx={{
                  px: 0,
                  pb: 0.7,
                  minWidth: 0,
                  borderRadius: 0,
                  color: isDisabledTab ? '#a8a8a8' : selected ? '#111' : '#777',
                  borderBottom: selected && !isDisabledTab ? '2px solid #a22' : '2px solid transparent',
                  textTransform: 'none',
                  fontSize: 14,
                  fontWeight: selected && !isDisabledTab ? 700 : 400,
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
        open={filterDialogOpen}
        onClose={handleCloseReceiptFilters}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 1,
            width: 'min(100%, 960px)',
          },
        }}
      >
        <DialogContent sx={{ p: 2 }}>
          <Box sx={{ position: 'relative', pb: 1 }}>
            <Typography sx={{ textAlign: 'center', fontWeight: 700, fontSize: 16, mt: 2, mb: 2.2 }}>
              Search Filters
            </Typography>
            <IconButton
              size="small"
              onClick={handleCloseReceiptFilters}
              sx={{ position: 'absolute', top: 0, right: 0, color: '#A22' }}
            >
              <CloseIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gap: 2,
            }}
          >
            <TextField
              size="small"
              label="Start Date"
              type="date"
              value={receiptFilters.startDate}
              onChange={(event) => handleReceiptFilterChange('startDate', event.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              size="small"
              label="End Date"
              type="date"
              value={receiptFilters.endDate}
              onChange={(event) => handleReceiptFilterChange('endDate', event.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <Autocomplete
              options={carrierOptions}
              getOptionLabel={getCarrierOptionLabel}
              isOptionEqualToValue={(option, value) => String(option?.carrierId || option?.id || '') === String(value?.carrierId || value?.id || '')}
              value={
                receiptFilters.carrierId
                  ? { carrierId: receiptFilters.carrierId, carrierName: receiptFilters.carrier }
                  : null
              }
              inputValue={receiptFilters.carrier}
              onInputChange={(event, newInputValue, reason) => handleReceiptCarrierInputChange(newInputValue, reason)}
              onChange={(event, newValue) => handleReceiptCarrierChange(newValue)}
              loading={carrierLoading}
              loadingText="Searching carriers..."
              noOptionsText={receiptFilters.carrier ? 'No carriers found' : 'Type to search for carriers'}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  placeholder="Search By Carrier"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {carrierLoading ? <CircularProgress color="inherit" size={18} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              fullWidth
            />
            <TextField
              size="small"
              placeholder="Search by Location"
              value={receiptFilters.location}
              onChange={(event) => handleReceiptFilterChange('location', event.target.value)}
              fullWidth
            />
            <TextField
              size="small"
              placeholder="Search by Pro"
              value={receiptFilters.proNumber}
              onChange={(event) => handleReceiptFilterChange('proNumber', event.target.value)}
              fullWidth
            />
            <TextField
              size="small"
              placeholder="Search by Receipt Number"
              value={receiptFilters.receiptNumber}
              onChange={(event) => handleReceiptFilterChange('receiptNumber', event.target.value)}
              fullWidth
            />
            <TextField
              size="small"
              placeholder="Search by ID Verification Number"
              value={receiptFilters.verificationId}
              onChange={(event) => handleReceiptFilterChange('verificationId', event.target.value)}
              fullWidth
            />
            <TextField
              size="small"
              placeholder="Search by Destination"
              value={receiptFilters.destination}
              onChange={(event) => handleReceiptFilterChange('destination', event.target.value)}
              fullWidth
            />
            <TextField
              size="small"
              placeholder="Search by Package ID"
              value={receiptFilters.packageId}
              onChange={(event) => handleReceiptFilterChange('packageId', event.target.value)}
              fullWidth
            />
            <TextField
              size="small"
              placeholder="Search by Customer Ref Number"
              value={receiptFilters.customerRefNumber}
              onChange={(event) => handleReceiptFilterChange('customerRefNumber', event.target.value)}
              fullWidth
            />
            <Autocomplete
              options={customerOptions}
              getOptionLabel={getCustomerOptionLabel}
              isOptionEqualToValue={(option, value) =>
                String(option?.customerId || option?.id || '') === String(value?.customerId || value?.id || '')
              }
              value={
                receiptFilters.customerId
                  ? { id: receiptFilters.customerId, name: receiptFilters.customer }
                  : null
              }
              inputValue={receiptFilters.customer}
              onInputChange={(event, newInputValue, reason) => handleReceiptCustomerInputChange(newInputValue, reason)}
              onChange={(event, newValue) => handleReceiptCustomerChange(newValue)}
              loading={customerLoading}
              loadingText="Searching customers..."
              noOptionsText={receiptFilters.customer ? 'No customers found' : 'Type to search for customers'}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  placeholder="Search by Customer"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {customerLoading ? <CircularProgress color="inherit" size={18} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              fullWidth
            />
            <Autocomplete
              options={stationOptions}
              getOptionLabel={getStationOptionLabel}
              isOptionEqualToValue={(option, value) =>
                String(option?.stationId || option?.id || '') === String(value?.stationId || value?.id || '')
              }
              value={
                receiptFilters.stationId
                  ? { id: receiptFilters.stationId, name: receiptFilters.station }
                  : null
              }
              inputValue={receiptFilters.station}
              onInputChange={(event, newInputValue, reason) => handleReceiptStationInputChange(newInputValue, reason)}
              onChange={(event, newValue) => handleReceiptStationChange(newValue)}
              loading={stationLoading}
              loadingText="Searching stations..."
              noOptionsText={
                receiptFilters.customerId
                  ? receiptFilters.station
                    ? 'No stations found'
                    : 'Type to search for stations'
                  : 'Select a customer first'
              }
              disabled={!receiptFilters.customerId}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  placeholder="Search by Station"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {stationLoading ? <CircularProgress color="inherit" size={18} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              fullWidth
            />
            <Box
              sx={{
                gridColumn: '1 / -1',
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <Button
                variant="outlined"
                size="small"
                onClick={handleClearReceiptFilters}
                sx={{ color: '#333', borderColor: '#aaa', textTransform: 'none', minWidth: 70 }}
              >
                Clear
              </Button>
              <Button
                variant="contained"
                size="small"
                onClick={handleSearchReceiptFilters}
                sx={{ bgcolor: '#A22', '&:hover': { bgcolor: '#8b1c1c' }, textTransform: 'none', minWidth: 76 }}
              >
                Search
              </Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      <Dialog
        open={locationDialog.open}
        onClose={handleCloseLocationDialog}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 1,
            maxWidth: 360,
          },
        }}
      >
        <DialogContent sx={{ p: 1.5 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ borderBottom: '1px solid #777', pb: 0.6 }}>
            <Typography sx={{ fontSize: 18, fontWeight: 700 }}>
              Update Location - {locationDialog.row?.receiptNumber || ''}
            </Typography>
            <IconButton size="small" onClick={handleCloseLocationDialog} sx={{ p: 0.2, color: '#111' }}>
              <CloseIcon sx={{ fontSize: 20 }} />
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
            onChange={(event) => {
              setLocationDialog((prev) => ({ ...prev, location: event.target.value }));
              setLocationError('');
            }}
            error={Boolean(locationError)}
            helperText={locationError || ' '}
            fullWidth
            sx={{
              mt: 3,
              '& .MuiInputLabel-root': { fontSize: 15 },
              '& .MuiInputBase-input': { fontSize: 15, py: 0.5 },
              '& .MuiFormHelperText-root': { minHeight: 18, fontSize: 11 },
            }}
          />

          <Stack direction="row" spacing={1.5} sx={{ mt: 4.5 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={handleCloseLocationDialog}
              disabled={locationSaving}
              sx={{ color: '#111', borderColor: '#111', textTransform: 'none', minWidth: 82, fontSize: 15, height: 30 }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              size="small"
              onClick={handleSubmitLocation}
              disabled={locationSaving}
              sx={{ bgcolor: '#A22', '&:hover': { bgcolor: '#8b1c1c' }, textTransform: 'none', minWidth: 82, fontSize: 15, height: 30 }}
            >
              {locationSaving ? 'Saving...' : 'Submit'}
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
      <Snackbar
        open={locationMessageOpen}
        autoHideDuration={2000}
        onClose={() => setLocationMessageOpen(false)}
        message="Location updated successfully"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
      <Snackbar
        open={comingSoonMessageOpen}
        autoHideDuration={2000}
        onClose={() => setComingSoonMessageOpen(false)}
        message="This feature will be available soon"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}
