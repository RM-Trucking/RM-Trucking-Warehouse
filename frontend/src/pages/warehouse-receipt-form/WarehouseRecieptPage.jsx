import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
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
import WarehouseReceiptPrintTemplate from './WarehouseReceiptPrintTemplate';
import { PATH_DASHBOARD } from '../../routes/paths';
import { useDispatch, useSelector } from '../../redux/store';
import {
  approveWarehouseReceiptRates,
  exportWarehouseReceiptSpreadsheet,
  getWarehouseReceipts,
  getWarehouseReceiptDocument,
  putWarehouseReceiptsOnAccountHold,
  markWarehouseReceiptRateReadyForApproval,
  removeWarehouseReceiptDocument,
  revertWarehouseReceiptsFromAccountHold,
  sendWarehouseReceiptEmail,
  searchWarehouseReceiptCustomers,
  searchWarehouseReceiptStations,
  updateWarehouseReceiptLocation,
  uploadWarehouseReceiptDocuments,
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

const accountingStatuses = [
  { label: 'On Hold', countKey: 'pending' },
  { label: 'Ready for Approval', countKey: 'ready' },
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

const approvalStatusApiValues = {
  'On Hold': 'PENDING',
  'Ready for Approval': 'READY',
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

const warehouseReceiptDocumentAccept = 'application/pdf,.pdf';

const accountingActionIcons = [
  'material-symbols:edit-square-outline',
  'material-symbols:keyboard-return-rounded',
  'mdi:check-circle-outline',
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

const getMailEmailValue = (value) => typeof value === 'string'
  ? value.trim()
  : String(value?.entryEmail || value?.emailId || value?.email || '').trim();
const getUniqueEmails = (values = []) => [...new Set(
  (Array.isArray(values) ? values : []).map(getMailEmailValue).filter(Boolean)
)];
const getReceiptMailRows = (row = {}) => {
  const sourceRow = row.rawData || row;
  return getUniqueEmails(sourceRow.toEmails).map((email) => ({ email }));
};

const isSendToTellSystemYes = (value) =>
  ['Y', 'YES', 'SUCCESS', 'SENT', 'TRUE'].includes(String(value || '').trim().toUpperCase());

const hasAvailableRateInformation = (value) => {
  if (!value) return false;
  if (Array.isArray(value)) return value.length > 0;

  if (typeof value === 'object') {
    return Object.values(value).some((entry) => {
      if (Array.isArray(entry)) return entry.length > 0;
      if (entry && typeof entry === 'object') return Object.keys(entry).length > 0;
      return entry !== null && entry !== undefined && entry !== '';
    });
  }

  return true;
};

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

const getRateDisplayValue = (value) => {
  if (value === undefined || value === null || value === '') return '';
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return value;
  return Number.isInteger(numberValue) ? numberValue : Number(numberValue.toFixed(3));
};

const clampAccountingCost = (cost, minRate, maxRate) => {
  const numericCost = Number(cost);
  if (!Number.isFinite(numericCost)) return cost;

  const hasMinRate = minRate !== undefined && minRate !== null && minRate !== '';
  const hasMaxRate = maxRate !== undefined && maxRate !== null && maxRate !== '';
  const numericMinRate = Number(minRate);
  const numericMaxRate = Number(maxRate);
  const costWithMinimum = hasMinRate && Number.isFinite(numericMinRate)
    ? Math.max(numericCost, numericMinRate)
    : numericCost;

  return hasMaxRate && Number.isFinite(numericMaxRate)
    ? Math.min(costWithMinimum, numericMaxRate)
    : costWithMinimum;
};

const formatRateApprovalDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).replace(',', '');
};

const getAccountingRateRows = (rateInformation = {}, receipt = {}) => {
  const freightBreakdown = Array.isArray(rateInformation.freightBreakdown) ? rateInformation.freightBreakdown : [];
  const sourceRows = freightBreakdown.length
    ? freightBreakdown
    : Array.isArray(receipt.freightInformation) ? receipt.freightInformation : [];
  const hasValue = (value) => value !== undefined && value !== null && value !== '';
  const dimFactor = hasValue(rateInformation.dimFactor) ? getRateDisplayValue(rateInformation.dimFactor) : '';

  return sourceRows.map((item) => {
    const pieces = hasValue(item.pieces) ? item.pieces : '';
    const length = hasValue(item.length) ? getRateDisplayValue(item.length) : '';
    const width = hasValue(item.width) ? getRateDisplayValue(item.width) : '';
    const height = hasValue(item.height) ? getRateDisplayValue(item.height) : '';
    const numericPieces = Number(pieces);
    const numericLength = Number(length);
    const numericWidth = Number(width);
    const numericHeight = Number(height);
    const numericDimFactor = Number(dimFactor);
    const canCalculateDimensionalWeight =
      [pieces, length, width, height, dimFactor].every(hasValue) &&
      [numericPieces, numericLength, numericWidth, numericHeight, numericDimFactor].every(Number.isFinite) &&
      numericDimFactor > 0;
    const dimensionalWeight = canCalculateDimensionalWeight
      ? getRateDisplayValue((numericPieces * numericLength * numericWidth * numericHeight) / numericDimFactor)
      : hasValue(item.dimensionalWeight) ? getRateDisplayValue(item.dimensionalWeight) : '';
    const actualWeightValue = item.actualWeight ?? item.weight;

    return {
      pieces,
      type: item.type || '',
      formula: [pieces, length, width, height, dimFactor, dimensionalWeight].every(hasValue)
        ? `${pieces} x ${length} x ${width} x ${height} / ${dimFactor} = ${dimensionalWeight}`
        : '',
      dimensionalWeight,
      actualWeight: hasValue(actualWeightValue) ? getRateDisplayValue(actualWeightValue) : '',
    };
  });
};

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
  const documentInputRef = useRef(null);
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
  const [activeTab, setActiveTab] = useState(gridState.activeTab || 'Active');
  const [searchValue, setSearchValue] = useState(gridState.searchValue || '');
  const [submittedReceiptNumber, setSubmittedReceiptNumber] = useState(gridState.submittedReceiptNumber || '');
  const [locationDialog, setLocationDialog] = useState({ open: false, row: null, location: '' });
  const [locationOverrides, setLocationOverrides] = useState({});
  const [locationSaving, setLocationSaving] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [locationMessageOpen, setLocationMessageOpen] = useState(false);
  const [copyMessageOpen, setCopyMessageOpen] = useState(false);
  const [documentUploadDialog, setDocumentUploadDialog] = useState({ open: false, receiptId: null, receiptNumber: '', files: [] });
  const [documentUploadDragging, setDocumentUploadDragging] = useState(false);
  const [documentUploading, setDocumentUploading] = useState(false);
  const [documentUploadError, setDocumentUploadError] = useState('');
  const [documentUploadMessage, setDocumentUploadMessage] = useState('');
  const [documentPreview, setDocumentPreview] = useState({ open: false, file: null, url: '' });
  const [uploadedDocumentsDialog, setUploadedDocumentsDialog] = useState({ open: false, row: null, documents: [] });
  const [uploadedDocumentLoadingPath, setUploadedDocumentLoadingPath] = useState('');
  const [uploadedDocumentRemovingId, setUploadedDocumentRemovingId] = useState(null);
  const [uploadedDocumentError, setUploadedDocumentError] = useState('');
  const [printReceipt, setPrintReceipt] = useState(null);
  const [exportingSpreadsheet, setExportingSpreadsheet] = useState(false);
  const [exportError, setExportError] = useState('');
  const [accountHoldReceiptId, setAccountHoldReceiptId] = useState(null);
  const [accountHoldMessage, setAccountHoldMessage] = useState('');
  const [accountHoldError, setAccountHoldError] = useState('');
  const [accountHoldRevertReceiptId, setAccountHoldRevertReceiptId] = useState(null);
  const [accountingConfirmation, setAccountingConfirmation] = useState({ open: false, action: '', row: null });
  const [mailDialog, setMailDialog] = useState({ open: false, receiptId: null, receiptNumber: '', rows: [], selectedEmails: [], extraEmails: [] });
  const [mailSending, setMailSending] = useState(false);
  const [mailMessage, setMailMessage] = useState('');
  const [mailError, setMailError] = useState('');
  const [rateApprovalSaving, setRateApprovalSaving] = useState(false);
  const [selectedApprovalReceiptIds, setSelectedApprovalReceiptIds] = useState([]);
  const [bulkRateApprovalSaving, setBulkRateApprovalSaving] = useState(false);
  const [rowRateApprovalReceiptId, setRowRateApprovalReceiptId] = useState(null);
  const [accountingRatesDialog, setAccountingRatesDialog] = useState({
    open: false,
    row: null,
    rateInformation: {},
    hasFlatRate: false,
    notesForFlatRate: '',
    flatRateError: '',
    dimFactorError: false,
    baseRateError: false,
  });
  const [selectedStatus, setSelectedStatus] = useState(() => {
    const availableStatuses = gridState.activeTab === 'Accounting' ? accountingStatuses : quickStatuses;
    return availableStatuses.some((status) => status.label === gridState.selectedStatus) ? gridState.selectedStatus : '';
  });
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [receiptFilters, setReceiptFilters] = useState(gridState.receiptFilters || gridState.appliedReceiptFilters || emptyReceiptFilters);
  const [appliedReceiptFilters, setAppliedReceiptFilters] = useState(gridState.appliedReceiptFilters || emptyReceiptFilters);
  const [filterSearchVersion, setFilterSearchVersion] = useState(0);
  const [receiptSearchVersion, setReceiptSearchVersion] = useState(0);
  const [paginationModel, setPaginationModel] = useState(gridState.paginationModel || { page: 0, pageSize: 10 });
  const [gridStateByTab, setGridStateByTab] = useState(() => {
    const emptyTabState = {
      selectedStatus: '',
      searchValue: '',
      submittedReceiptNumber: '',
      receiptFilters: { ...emptyReceiptFilters },
      appliedReceiptFilters: { ...emptyReceiptFilters },
      paginationModel: { page: 0, pageSize: 10 },
      selectedApprovalReceiptIds: [],
    };
    const initialTab = gridState.activeTab === 'Accounting' ? 'Accounting' : 'Active';

    return {
      Active: { ...emptyTabState, receiptFilters: { ...emptyReceiptFilters }, appliedReceiptFilters: { ...emptyReceiptFilters }, paginationModel: { page: 0, pageSize: 10 } },
      Accounting: { ...emptyTabState, receiptFilters: { ...emptyReceiptFilters }, appliedReceiptFilters: { ...emptyReceiptFilters }, paginationModel: { page: 0, pageSize: 10 } },
      [initialTab]: {
        selectedStatus: gridState.selectedStatus || '',
        searchValue: gridState.searchValue || '',
        submittedReceiptNumber: gridState.submittedReceiptNumber || '',
        receiptFilters: gridState.receiptFilters || gridState.appliedReceiptFilters || { ...emptyReceiptFilters },
        appliedReceiptFilters: gridState.appliedReceiptFilters || { ...emptyReceiptFilters },
        paginationModel: gridState.paginationModel || { page: 0, pageSize: 10 },
        selectedApprovalReceiptIds: [],
      },
    };
  });

  const activeFilterCount = Object.entries(appliedReceiptFilters)
    .filter(([key, value]) => !['carrier', 'customerId', 'stationId'].includes(key) && String(value || '').trim())
    .length;
  const requestStatus = activeTab === 'Active' && selectedStatus ? statusApiValues[selectedStatus] : '';
  const requestApprovalStatus = activeTab === 'Accounting' && selectedStatus
    ? approvalStatusApiValues[selectedStatus]
    : '';
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
      approvalStatus: requestApprovalStatus,
      receiptNumber: requestReceiptNumber,
      accounting: activeTab === 'Accounting',
      filters: requestFilters,
    }));
  }, [
    dispatch,
    activeTab,
    filterSearchVersion,
    receiptSearchVersion,
    paginationModel.page,
    paginationModel.pageSize,
    requestStatus,
    requestApprovalStatus,
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

  useEffect(() => {
    const handleAfterPrint = () => setPrintReceipt(null);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  const handlePrintWarehouseReceipt = (row) => {
    setPrintReceipt(row.rawData || row);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => window.print());
    });
  };

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

  const showApprovalSelection = activeTab === 'Accounting' && selectedStatus === 'Ready for Approval';
  const visibleApprovalReceiptIds = filteredRows.map((row) => row.receiptId ?? row.rawData?.receiptId ?? row.id);
  const allVisibleApprovalRowsSelected =
    visibleApprovalReceiptIds.length > 0 &&
    visibleApprovalReceiptIds.every((receiptId) => selectedApprovalReceiptIds.some((selectedId) => String(selectedId) === String(receiptId)));

  const columns = [
    ...(showApprovalSelection
      ? [{
          field: 'approvalSelection',
          headerName: '',
          width: 52,
          sortable: false,
          filterable: false,
          disableColumnMenu: true,
          align: 'center',
          headerAlign: 'center',
          renderHeader: () => (
            <Checkbox
              size="small"
              checked={allVisibleApprovalRowsSelected}
              indeterminate={
                !allVisibleApprovalRowsSelected &&
                visibleApprovalReceiptIds.some((receiptId) =>
                  selectedApprovalReceiptIds.some((selectedId) => String(selectedId) === String(receiptId))
                )
              }
              onChange={(event) => {
                setSelectedApprovalReceiptIds(event.target.checked ? visibleApprovalReceiptIds : []);
              }}
              sx={{ p: 0.3, '&.Mui-checked': { color: '#1b426f' } }}
            />
          ),
          renderCell: (params) => {
            const receiptId = params.row.receiptId ?? params.row.rawData?.receiptId ?? params.row.id;
            const checked = selectedApprovalReceiptIds.some((selectedId) => String(selectedId) === String(receiptId));

            return (
              <Checkbox
                size="small"
                checked={checked}
                onClick={(event) => event.stopPropagation()}
                onChange={(event) => {
                  setSelectedApprovalReceiptIds((previous) =>
                    event.target.checked
                      ? [...previous, receiptId]
                      : previous.filter((selectedId) => String(selectedId) !== String(receiptId))
                  );
                }}
                sx={{ p: 0.3, '&.Mui-checked': { color: '#1b426f' } }}
              />
            );
          },
        }]
      : []),
    {
      field: 'receiptNumber',
      headerName: 'Receipt Number',
      minWidth: 130,
      flex: 1,
      renderCell: (params) => {
        const sentToTellSystem = isSendToTellSystemYes(params.row.sendToTellSystem);
        const rateInformation = params.row.rawData?.rateInformation || params.row.rateInformation;
        const hasRateInformation = hasAvailableRateInformation(rateInformation);
        const hideReceiptStatusIcon = ['initiated', 'rejected'].includes(
          String(params.row.status || '').trim().toLowerCase()
        );

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
            {!hideReceiptStatusIcon && (!hasRateInformation ? (
              <Tooltip title="Rate not set for this Receipt" arrow>
                <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center' }}>
                  <Iconify icon="mdi:alert" width={16} sx={{ color: '#facc15' }} />
                </Box>
              </Tooltip>
            ) : sentToTellSystem ? (
              <Tooltip title="Warehouse receipt sent to the Tell system." arrow>
                <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center' }}>
                  <Iconify icon="mdi:check-circle" width={14} sx={{ color: '#63b66e' }} />
                </Box>
              </Tooltip>
            ) : (
              <Tooltip title="Waiting to send the warehouse receipt to the Tell system." arrow>
                <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center' }}>
                  <Iconify icon="mdi:clock-outline" width={18} sx={{ color: '#f59e0b' }} />
                </Box>
              </Tooltip>
            ))}
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
    {
      field: 'rate',
      headerName: 'Rate',
      minWidth: 80,
      flex: 0.6,
      renderCell: (params) => {
        const sourceRow = params.row.rawData || params.row;
        const receiptStatus = String(
          params.row.status ?? sourceRow.status ?? ''
        ).trim().toUpperCase();
        if (['INITIATED', 'REJECTED'].includes(receiptStatus)) return null;

        const approvalStatus = String(
          params.row.approvalStatus ?? sourceRow.approvalStatus ?? ''
        ).trim().toUpperCase();
        const dollarColor = ['PENDING', 'READY'].includes(approvalStatus)
          ? '#f59e0b'
          : approvalStatus === 'APPROVED'
            ? '#2e7d32'
            : 'inherit';
        const hasRate = params.value !== null && params.value !== undefined && params.value !== '';
        const showDollar = hasRate && (
          (activeTab === 'Accounting' && approvalStatus === 'READY') ||
          (activeTab === 'Active' && approvalStatus === 'APPROVED')
        );

        return (
          <Stack direction="row" alignItems="center" spacing={0.4} sx={{ height: '100%' }}>
            <Typography component="span" sx={{ fontSize: 14 }}>
              {params.value ?? ''}
            </Typography>
            {showDollar && (
              <Tooltip
                placement="bottom-start"
                title={
                  <Box sx={{ minWidth: 260, px: 1, py: 0.6 }}>
                    <Stack direction="row" spacing={1} alignItems="baseline">
                      <Typography sx={{ fontSize: 14, color: '#111', minWidth: 112 }}>Requested by :</Typography>
                      <Typography sx={{ fontSize: 14, color: '#111' }}>{sourceRow.requestedByName || ''}</Typography>
                    </Stack>
                    <Typography sx={{ ml: 15, mt: 0.3, mb: 1.5, fontSize: 14, fontStyle: 'italic', color: '#111' }}>
                      {formatRateApprovalDate(sourceRow.requestedAt)}
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="baseline">
                      <Typography sx={{ fontSize: 14, color: '#111', minWidth: 112 }}>Approved by :</Typography>
                      <Typography sx={{ fontSize: 14, color: '#111' }}>{sourceRow.approvedByName || ''}</Typography>
                    </Stack>
                    <Typography sx={{ ml: 15, mt: 0.3, fontSize: 14, fontStyle: 'italic', color: '#111' }}>
                      {formatRateApprovalDate(sourceRow.approvedAt)}
                    </Typography>
                  </Box>
                }
                componentsProps={{
                  tooltip: {
                    sx: {
                      bgcolor: '#fff',
                      border: '1px solid #bdbdbd',
                      boxShadow: 3,
                      maxWidth: 'none',
                    },
                  },
                }}
              >
                <Box
                  component="span"
                  sx={{
                    width: 18,
                    height: 18,
                    flexShrink: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    bgcolor: dollarColor,
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 800,
                    lineHeight: 1,
                    cursor: 'default',
                  }}
                >
                  $
                </Box>
              </Tooltip>
            )}
          </Stack>
        );
      },
    },
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
        const approvalStatus = String(
          params.row.approvalStatus ?? params.row.rawData?.approvalStatus ?? ''
        ).trim().toUpperCase();
        const visibleActionIcons = activeTab === 'Accounting'
          ? accountingActionIcons.filter((icon) =>
              (icon !== 'material-symbols:keyboard-return-rounded' || approvalStatus === 'PENDING') &&
              (icon !== 'mdi:check-circle-outline' || approvalStatus === 'READY')
            )
          : isOnHandStatus(params.row.status)
            ? actionIcons
            : ['mdi:eye'];

        return (
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="center"
            spacing={0.4}
            sx={{ width: '100%', height: '100%' }}
          >
            {visibleActionIcons.map((icon) => {
              const handleActionClick = (event) => {
                event.stopPropagation();

                if (icon === 'mdi:eye') {
                  handleViewReceipt(params.row);
                  return;
                }

                if (icon === 'mdi:printer') {
                  handlePrintWarehouseReceipt(params.row);
                  return;
                }

                if (icon === 'material-symbols:edit-square-outline') {
                  handleOpenAccountingRates(params.row);
                  return;
                }

                if (icon === 'material-symbols:keyboard-return-rounded') {
                  setAccountingConfirmation({ open: true, action: 'revert', row: params.row });
                  return;
                }

                if (icon === 'mdi:check-circle-outline') {
                  setAccountingConfirmation({ open: true, action: 'approve', row: params.row });
                  return;
                }

                if (icon === 'location-edit') {
                  handleOpenLocationDialog(params.row);
                  return;
                }

                if (icon === 'mdi:upload') {
                  handleOpenDocumentUpload(params.row);
                  return;
                }

                if (icon === 'mdi:file-document') {
                  handleOpenUploadedDocuments(params.row);
                  return;
                }

                if (icon === 'mdi:send') {
                  handleOpenMailDialog(params.row);
                  return;
                }

                if (icon === 'mdi:hourglass') {
                  setAccountingConfirmation({ open: true, action: 'hold', row: params.row });
                }
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
                  disabled={
                    (icon === 'mdi:hourglass' &&
                      String(accountHoldReceiptId) === String(params.row.receiptId ?? params.row.rawData?.receiptId ?? params.row.id)) ||
                    (icon === 'material-symbols:keyboard-return-rounded' &&
                      String(accountHoldRevertReceiptId) === String(params.row.receiptId ?? params.row.rawData?.receiptId ?? params.row.id)) ||
                    (icon === 'mdi:check-circle-outline' &&
                      String(rowRateApprovalReceiptId) === String(params.row.receiptId ?? params.row.rawData?.receiptId ?? params.row.id))
                  }
                  sx={{ p: 0.25, color: '#050505' }}
                >
                  {icon === 'location-edit' ? (
                    <EditLocationAltIcon sx={{ color: '#050505', fontSize: 18 }} />
                  ) : (
                    <Iconify icon={icon} width={16} sx={{ color: '#050505' }} />
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
    const nextStatus = checked ? label : '';
    setSelectedStatus(nextStatus);
    setSelectedApprovalReceiptIds([]);
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  };

  const handleMainTabChange = (tabLabel) => {
    if (tabLabel === activeTab) return;

    const currentTabState = {
      selectedStatus,
      searchValue,
      submittedReceiptNumber,
      receiptFilters,
      appliedReceiptFilters,
      paginationModel,
      selectedApprovalReceiptIds,
    };
    const targetTabState = gridStateByTab[tabLabel];

    setGridStateByTab((previous) => ({ ...previous, [activeTab]: currentTabState }));
    setActiveTab(tabLabel);
    setSelectedStatus(targetTabState.selectedStatus);
    setSelectedApprovalReceiptIds(targetTabState.selectedApprovalReceiptIds);
    setSearchValue(targetTabState.searchValue);
    setSubmittedReceiptNumber(targetTabState.submittedReceiptNumber);
    setReceiptFilters(targetTabState.receiptFilters);
    setAppliedReceiptFilters(targetTabState.appliedReceiptFilters);
    setFilterDialogOpen(false);
    setPaginationModel(targetTabState.paginationModel);
  };

  const handleReceiptSearch = () => {
    setSubmittedReceiptNumber(searchValue.trim());
    setReceiptSearchVersion((previous) => previous + 1);
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

  const handleOpenMailDialog = (row) => {
    const sourceRow = row.rawData || row;
    setMailError('');
    setMailDialog({
      open: true,
      receiptId: row.receiptId ?? row.rawData?.receiptId ?? row.id,
      receiptNumber: row.receiptNumber ?? row.rawData?.receiptNumber ?? '',
      rows: getReceiptMailRows(row),
      selectedEmails: getUniqueEmails(sourceRow.toEmails),
      extraEmails: [],
    });
  };

  const handleOpenDocumentUpload = (row) => {
    setDocumentUploadError('');
    setDocumentUploadDragging(false);
    setDocumentUploadDialog({
      open: true,
      receiptId: row.receiptId ?? row.rawData?.receiptId ?? row.id,
      receiptNumber: row.receiptNumber ?? row.rawData?.receiptNumber ?? '',
      files: [],
    });
  };

  const handleOpenUploadedDocuments = (row) => {
    const sourceRow = row?.rawData || row || {};
    setUploadedDocumentError('');
    setUploadedDocumentsDialog({
      open: true,
      row,
      documents: Array.isArray(sourceRow.uploadedDocuments) ? sourceRow.uploadedDocuments : [],
    });
  };

  const handleCloseUploadedDocuments = () => {
    if (uploadedDocumentLoadingPath || uploadedDocumentRemovingId !== null) return;
    setUploadedDocumentsDialog({ open: false, row: null, documents: [] });
    setUploadedDocumentError('');
  };

  const handleViewUploadedDocument = async (document) => {
    const filePath = document?.filePath;
    if (!filePath || uploadedDocumentLoadingPath) return;

    setUploadedDocumentLoadingPath(filePath);
    setUploadedDocumentError('');
    const response = await dispatch(getWarehouseReceiptDocument(filePath));
    setUploadedDocumentLoadingPath('');

    if (response?.error || !response?.blob) {
      setUploadedDocumentError(response?.message || 'Failed to load warehouse receipt document');
      return;
    }

    const file = new File([response.blob], filePath, {
      type: response.contentType || response.blob.type || 'application/pdf',
    });
    handleOpenDocumentPreview(file);
  };

  const handleRemoveUploadedDocument = async (document) => {
    const row = uploadedDocumentsDialog.row || {};
    const receiptId = document?.receiptId ?? row.receiptId ?? row.rawData?.receiptId ?? row.id;
    const documentId = document?.documentId;
    if (uploadedDocumentLoadingPath || uploadedDocumentRemovingId !== null) return;

    setUploadedDocumentRemovingId(documentId);
    setUploadedDocumentError('');
    const response = await dispatch(removeWarehouseReceiptDocument({ receiptId, documentId }));
    setUploadedDocumentRemovingId(null);

    if (response?.error) {
      setUploadedDocumentError(response.message || 'Failed to remove warehouse receipt document');
      return;
    }

    setUploadedDocumentsDialog((previous) => ({
      ...previous,
      documents: previous.documents.filter((item) => item.documentId !== documentId),
    }));
    setDocumentUploadMessage(response?.message || 'Document removed successfully');
    setReceiptSearchVersion((previous) => previous + 1);
  };

  const handleCloseDocumentUpload = () => {
    if (documentUploading) return;
    setDocumentUploadDialog({ open: false, receiptId: null, receiptNumber: '', files: [] });
    setDocumentUploadError('');
    setDocumentUploadDragging(false);
  };

  const addWarehouseReceiptDocuments = (fileList) => {
    const selectedFiles = Array.from(fileList || []);
    const validFiles = selectedFiles.filter((file) => {
      const extension = file.name.split('.').pop()?.toLowerCase();
      return file.type === 'application/pdf' || extension === 'pdf';
    });

    if (validFiles.length !== selectedFiles.length) {
      setDocumentUploadError('Only PDF files are allowed');
    } else {
      setDocumentUploadError('');
    }

    if (validFiles.length) {
      setDocumentUploadDialog((previous) => ({
        ...previous,
        files: [...previous.files, ...validFiles],
      }));
    }
  };

  const handleDocumentSelection = (event) => {
    addWarehouseReceiptDocuments(event.target.files);
    event.target.value = '';
  };

  const handleDocumentDrop = (event) => {
    event.preventDefault();
    setDocumentUploadDragging(false);
    addWarehouseReceiptDocuments(event.dataTransfer.files);
  };

  const handleOpenDocumentPreview = (file) => {
    if (!file) return;
    setDocumentPreview({ open: true, file, url: URL.createObjectURL(file) });
  };

  const handleCloseDocumentPreview = () => {
    if (documentPreview.url) URL.revokeObjectURL(documentPreview.url);
    setDocumentPreview({ open: false, file: null, url: '' });
  };

  const handleUploadDocuments = async () => {
    if (!documentUploadDialog.files.length) {
      setDocumentUploadError('Select at least one document to upload');
      return;
    }

    setDocumentUploading(true);
    setDocumentUploadError('');
    const response = await dispatch(uploadWarehouseReceiptDocuments({
      receiptId: documentUploadDialog.receiptId,
      files: documentUploadDialog.files,
    }));
    setDocumentUploading(false);

    if (response?.error) {
      setDocumentUploadError(response.message || 'Failed to upload warehouse receipt documents');
      return;
    }

    setDocumentUploadDialog({ open: false, receiptId: null, receiptNumber: '', files: [] });
    setDocumentUploadMessage(response?.message || 'Documents uploaded successfully');
    setReceiptSearchVersion((previous) => previous + 1);
  };

  const handleCloseMailDialog = () => {
    if (!mailSending) setMailDialog((previous) => ({ ...previous, open: false }));
  };

  const handleSendMail = async () => {
    const emails = getUniqueEmails(mailDialog.extraEmails);
    if (!emails.length) {
      setMailError('Enter at least one email');
      return;
    }

    setMailSending(true);
    setMailError('');
    const response = await dispatch(sendWarehouseReceiptEmail({
      receiptId: mailDialog.receiptId,
      emails,
    }));
    setMailSending(false);

    if (response?.error) {
      setMailError(response.message || 'Failed to send warehouse receipt email');
      return;
    }

    setMailDialog((previous) => ({ ...previous, open: false }));
    setMailMessage(response?.message || 'Email sent successfully');
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

  const handleAccountHold = async (row) => {
    const receiptId = row?.receiptId ?? row?.rawData?.receiptId ?? row?.id;

    if (receiptId === null || receiptId === undefined || receiptId === '' || accountHoldReceiptId !== null) {
      if (receiptId === null || receiptId === undefined || receiptId === '') {
        setAccountHoldError('Receipt ID is required for account hold');
      }
      return;
    }

    setAccountHoldReceiptId(receiptId);
    setAccountHoldError('');
    setAccountHoldMessage('');

    const response = await dispatch(putWarehouseReceiptsOnAccountHold([receiptId]));

    if (response?.error) {
      setAccountHoldError(response.message || 'Failed to place warehouse receipt on account hold');
    } else {
      setAccountHoldMessage(response?.message || 'Warehouse receipt placed on account hold successfully');
      dispatch(getWarehouseReceipts({
        page: paginationModel.page + 1,
        pageSize: paginationModel.pageSize,
        status: requestStatus,
        approvalStatus: requestApprovalStatus,
        receiptNumber: requestReceiptNumber,
        accounting: activeTab === 'Accounting',
        filters: requestFilters,
      }));
    }

    setAccountHoldReceiptId(null);
  };

  const handleAccountHoldRevert = async (row) => {
    const receiptId = row?.receiptId ?? row?.rawData?.receiptId ?? row?.id;

    if (receiptId === null || receiptId === undefined || receiptId === '' || accountHoldRevertReceiptId !== null) {
      if (receiptId === null || receiptId === undefined || receiptId === '') {
        setAccountHoldError('Receipt ID is required to revert account hold');
      }
      return;
    }

    setAccountHoldRevertReceiptId(receiptId);
    setAccountHoldError('');
    setAccountHoldMessage('');

    const response = await dispatch(revertWarehouseReceiptsFromAccountHold([receiptId]));

    if (response?.error) {
      setAccountHoldError(response.message || 'Failed to revert warehouse receipt from account hold');
    } else {
      setAccountHoldMessage(response?.message || 'Warehouse receipt reverted from account hold successfully');
      dispatch(getWarehouseReceipts({
        page: paginationModel.page + 1,
        pageSize: paginationModel.pageSize,
        status: requestStatus,
        approvalStatus: requestApprovalStatus,
        receiptNumber: requestReceiptNumber,
        accounting: true,
        filters: requestFilters,
      }));
    }

    setAccountHoldRevertReceiptId(null);
  };

  const handleCloseAccountingConfirmation = () => {
    if (accountHoldReceiptId !== null || accountHoldRevertReceiptId !== null || rowRateApprovalReceiptId !== null) return;
    setAccountingConfirmation({ open: false, action: '', row: null });
  };

  const handleRowRateApproval = async (row) => {
    const receiptId = row?.receiptId ?? row?.rawData?.receiptId ?? row?.id;

    if (receiptId === null || receiptId === undefined || receiptId === '') {
      setAccountHoldError('Receipt ID is required for rate approval');
      return;
    }

    setRowRateApprovalReceiptId(receiptId);
    setAccountHoldError('');
    setAccountHoldMessage('');

    const response = await dispatch(approveWarehouseReceiptRates([receiptId]));

    if (response?.error) {
      setAccountHoldError(response.message || 'Failed to approve warehouse receipt rate');
    } else {
      setAccountHoldMessage(response?.message || 'Warehouse receipt rate approved successfully');
      setSelectedApprovalReceiptIds((previous) =>
        previous.filter((selectedId) => String(selectedId) !== String(receiptId))
      );
      dispatch(getWarehouseReceipts({
        page: paginationModel.page + 1,
        pageSize: paginationModel.pageSize,
        status: requestStatus,
        approvalStatus: requestApprovalStatus,
        receiptNumber: requestReceiptNumber,
        accounting: true,
        filters: requestFilters,
      }));
    }

    setRowRateApprovalReceiptId(null);
  };

  const handleConfirmAccountingAction = async () => {
    const { action, row } = accountingConfirmation;
    if (!row) return;

    if (action === 'hold') {
      await handleAccountHold(row);
    } else if (action === 'revert') {
      await handleAccountHoldRevert(row);
    } else if (action === 'approve') {
      await handleRowRateApproval(row);
    }

    setAccountingConfirmation({ open: false, action: '', row: null });
  };

  const handleExportSpreadsheet = async () => {
    setExportingSpreadsheet(true);
    setExportError('');

    const response = await dispatch(exportWarehouseReceiptSpreadsheet({
      status: requestStatus,
      approvalStatus: requestApprovalStatus,
      receiptNumber: requestReceiptNumber,
      accounting: activeTab === 'Accounting',
      filters: requestFilters,
    }));

    setExportingSpreadsheet(false);

    if (response?.error || response?.success === false) {
      setExportError(response?.message || 'Failed to export warehouse receipt spreadsheet');
    }
  };

  const getWarehouseReceiptGridState = () => ({
    activeTab,
    selectedStatus,
    searchValue,
    submittedReceiptNumber,
    receiptFilters,
    appliedReceiptFilters,
    paginationModel,
  });

  const handleOpenAccountingRates = (row) => {
    const receipt = row?.rawData || {};
    const rateInformation = receipt.rateInformation || row?.rateInformation || {};

    setAccountingRatesDialog({
      open: true,
      row,
      rateInformation: {
        ...rateInformation,
        dimFactor:
          rateInformation.dimFactor === null ||
          rateInformation.dimFactor === undefined ||
          rateInformation.dimFactor === ''
            ? 166
            : rateInformation.dimFactor,
      },
      hasFlatRate: isYes(receipt.hasFlatRate ?? rateInformation.hasFlatRate),
      notesForFlatRate: receipt.notesForFlatRate ?? row?.notesForFlatRate ?? '',
      flatRateError: '',
      dimFactorError: false,
      baseRateError: false,
    });
  };

  const handleBulkRateApproval = async () => {
    if (!selectedApprovalReceiptIds.length || bulkRateApprovalSaving) return;

    setBulkRateApprovalSaving(true);
    setAccountHoldError('');
    setAccountHoldMessage('');

    const response = await dispatch(approveWarehouseReceiptRates(selectedApprovalReceiptIds));

    if (response?.error) {
      setAccountHoldError(response.message || 'Failed to approve warehouse receipt rates');
    } else {
      setAccountHoldMessage(response?.message || 'Warehouse receipt rates approved successfully');
      setSelectedApprovalReceiptIds([]);
      dispatch(getWarehouseReceipts({
        page: paginationModel.page + 1,
        pageSize: paginationModel.pageSize,
        status: requestStatus,
        approvalStatus: requestApprovalStatus,
        receiptNumber: requestReceiptNumber,
        accounting: true,
        filters: requestFilters,
      }));
    }

    setBulkRateApprovalSaving(false);
  };

  const handleCloseAccountingRates = () => {
    setAccountingRatesDialog({
      open: false,
      row: null,
      rateInformation: {},
      hasFlatRate: false,
      notesForFlatRate: '',
      flatRateError: '',
      dimFactorError: false,
      baseRateError: false,
    });
  };

  const handleAccountingRateChange = (field, value) => {
    setAccountingRatesDialog((previous) => ({
      ...previous,
      rateInformation: {
        ...previous.rateInformation,
        [field]: value,
      },
      flatRateError: field === 'finalRate' && String(value).trim() ? '' : previous.flatRateError,
      dimFactorError: field === 'dimFactor' && String(value).trim() ? false : previous.dimFactorError,
      baseRateError: field === 'baseRate' && String(value).trim() ? false : previous.baseRateError,
    }));
  };

  const handleAccountingFlatRateChange = (checked) => {
    setAccountingRatesDialog((previous) => ({
      ...previous,
      hasFlatRate: checked,
      notesForFlatRate: checked ? previous.notesForFlatRate : '',
      rateInformation: {
        ...previous.rateInformation,
        finalRate: checked ? '' : previous.rateInformation.finalRate,
      },
      flatRateError: '',
      dimFactorError: false,
      baseRateError: false,
    }));
  };

  const handleAccountingReadyForApproval = async () => {
    const rateInformation = accountingRatesDialog.rateInformation || {};
    const flatRateMissing = accountingRatesDialog.hasFlatRate && !String(rateInformation.finalRate ?? '').trim();
    const dimFactorMissing = !accountingRatesDialog.hasFlatRate && !String(rateInformation.dimFactor ?? '').trim();
    const baseRateMissing = !accountingRatesDialog.hasFlatRate && !String(rateInformation.baseRate ?? '').trim();

    setAccountingRatesDialog((previous) => ({
      ...previous,
      flatRateError: flatRateMissing ? 'Flat Rate is required' : '',
      dimFactorError: dimFactorMissing,
      baseRateError: baseRateMissing,
    }));

    if (flatRateMissing || dimFactorMissing || baseRateMissing) return;

    const receiptId =
      accountingRatesDialog.row?.receiptId ??
      accountingRatesDialog.row?.rawData?.receiptId ??
      accountingRatesDialog.row?.id;

    if (receiptId === null || receiptId === undefined || receiptId === '') {
      setAccountHoldError('Receipt ID is required for rate approval');
      return;
    }

    setRateApprovalSaving(true);
    setAccountHoldError('');
    setAccountHoldMessage('');

    const rateRows = getAccountingRateRows(rateInformation, accountingRatesDialog.row?.rawData || {});
    const revisedDimensionalWeightTotal = rateRows.reduce(
      (total, row) => total + (Number(row.dimensionalWeight) || 0),
      0
    );
    const hasBackendActualWeightTotal =
      rateInformation.totalActualWeight !== null &&
      rateInformation.totalActualWeight !== undefined &&
      rateInformation.totalActualWeight !== '';
    const totalActualWeight = hasBackendActualWeightTotal
      ? Number(rateInformation.totalActualWeight)
      : rateRows.reduce((total, row) => total + (Number(row.actualWeight) || 0), 0);
    const baseRate = Number(rateInformation.baseRate);
    const higherWeight = Math.max(
      Number.isFinite(totalActualWeight) ? totalActualWeight : 0,
      revisedDimensionalWeightTotal
    );
    const calculatedRate = accountingRatesDialog.hasFlatRate
      ? Number(rateInformation.finalRate)
      : clampAccountingCost(
          (baseRate / 100) * higherWeight,
          rateInformation.minRate,
          rateInformation.maxRate
        );
    const toRateNumberOrNull = (value) => {
      if (value === null || value === undefined || value === '') return null;
      const numberValue = Number(value);
      return Number.isFinite(numberValue) ? numberValue : null;
    };
    const rateDetails = {
      rate: Number.isFinite(calculatedRate) ? calculatedRate : null,
      dimFactor: toRateNumberOrNull(rateInformation.dimFactor),
      baseRate: toRateNumberOrNull(rateInformation.baseRate),
      minRate: toRateNumberOrNull(rateInformation.minRate),
      maxRate: toRateNumberOrNull(rateInformation.maxRate),
      hasFlatRate: accountingRatesDialog.hasFlatRate ? 'Y' : 'N',
      notesForFlatRate: accountingRatesDialog.hasFlatRate
        ? String(accountingRatesDialog.notesForFlatRate || '').trim() || null
        : null,
    };

    const response = await dispatch(markWarehouseReceiptRateReadyForApproval({ receiptId, rateDetails }));

    if (response?.error) {
      setAccountHoldError(response.message || 'Failed to mark warehouse receipt rate ready for approval');
    } else {
      setAccountHoldMessage(response?.message || 'Warehouse receipt rate is ready for approval');
      handleCloseAccountingRates();
      dispatch(getWarehouseReceipts({
        page: paginationModel.page + 1,
        pageSize: paginationModel.pageSize,
        status: requestStatus,
        approvalStatus: requestApprovalStatus,
        receiptNumber: requestReceiptNumber,
        accounting: true,
        filters: requestFilters,
      }));
    }

    setRateApprovalSaving(false);
  };

  const handleViewReceipt = (row) => {
    const receipt = row.rawData || {};
    const freightInfo = buildFreightInfoFromReceipt(receipt);
    const freightItems = Array.isArray(receipt.freightInformation)
      ? receipt.freightInformation.map((item, index) => ({
          id: item.freightId || index + 1,
          freightId: item.freightId,
          freightBarcodeValue: item.freightBarcodeValue,
          pieces: item.pieces,
          type: item.type,
          length: item.length,
          width: item.width,
          height: item.height,
          weight: item.weight,
          isScanned: item.isScanned,
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
          notesForFlatRate: receipt.notesForFlatRate,
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
          onClick={handleExportSpreadsheet}
          disabled={exportingSpreadsheet}
          sx={{
            bgcolor: '#eef6ef',
            color: '#1f7a3a',
            borderRadius: 0.8,
            '&:hover': { bgcolor: '#dceedd' },
            '&.Mui-disabled': { bgcolor: '#e5e5e5', color: '#9a9a9a' },
          }}
        >
          {exportingSpreadsheet ? (
            <CircularProgress size={16} color="inherit" />
          ) : (
            <Iconify icon="mdi:file-excel" width={18} sx={{ color: 'inherit' }} />
          )}
        </IconButton>
      </Box>

      <Stack direction="row" alignItems="flex-end" justifyContent="space-between" sx={{ mb: 1.5 }}>
        <Stack direction="row" alignItems="flex-end" spacing={2}>
          {statusTabs.map((tab) => {
            const selected = activeTab === tab.label;
            return (
              <Button
                key={tab.label}
                onClick={() => handleMainTabChange(tab.label)}
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

      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.3 }}>
        <Stack direction="row" spacing={1.2}>
          {(activeTab === 'Accounting' ? accountingStatuses : quickStatuses).map((status) => (
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
        {showApprovalSelection && selectedApprovalReceiptIds.length > 0 && (
          <Button
            variant="contained"
            size="small"
            onClick={handleBulkRateApproval}
            disabled={bulkRateApprovalSaving}
            sx={{
              height: 28,
              minWidth: 86,
              bgcolor: '#A22',
              color: '#fff',
              textTransform: 'none',
              fontSize: 12,
              '&:hover': { bgcolor: '#8b1c1c' },
            }}
          >
            {bulkRateApprovalSaving ? 'Approving...' : 'Approve'}
          </Button>
        )}
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
        open={accountingRatesDialog.open}
        onClose={handleCloseAccountingRates}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { borderRadius: 1.2, minHeight: 430 } }}
      >
        <DialogContent sx={{ p: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ borderBottom: '1px solid #777', pb: 0.8 }}>
            <Typography sx={{ fontSize: 16, fontWeight: 700 }}>
              Charges/Rating - {accountingRatesDialog.row?.receiptNumber || ''}
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                size="small"
                onClick={handleCloseAccountingRates}
                disabled={rateApprovalSaving}
                sx={{ height: 28, minWidth: 74, color: '#111', borderColor: '#111', textTransform: 'none', fontSize: 12 }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                size="small"
                onClick={handleAccountingReadyForApproval}
                disabled={rateApprovalSaving}
                sx={{
                  height: 28,
                  minWidth: 126,
                  bgcolor: '#A22',
                  color: '#fff',
                  textTransform: 'none',
                  fontSize: 12,
                  '&:hover': { bgcolor: '#8b1c1c' },
                }}
              >
                {rateApprovalSaving ? 'Submitting...' : 'Ready for Approval'}
              </Button>
            </Stack>
          </Stack>

          {(() => {
            const rateInformation = accountingRatesDialog.rateInformation || {};
            const hasFlatRate = accountingRatesDialog.hasFlatRate;
            const rateRows = getAccountingRateRows(rateInformation, accountingRatesDialog.row?.rawData || {});
            const revisedDimensionalWeightTotal = rateRows.reduce(
              (total, row) => total + (Number(row.dimensionalWeight) || 0),
              0
            );
            const hasBackendActualWeightTotal =
              rateInformation.totalActualWeight !== null &&
              rateInformation.totalActualWeight !== undefined &&
              rateInformation.totalActualWeight !== '';
            const calculatedActualWeightTotal = rateRows.reduce(
              (total, row) => total + (Number(row.actualWeight) || 0),
              0
            );
            const totalActualWeight = hasBackendActualWeightTotal
              ? Number(rateInformation.totalActualWeight)
              : calculatedActualWeightTotal;
            const baseRate = Number(rateInformation.baseRate);
            const higherWeight = Math.max(
              Number.isFinite(totalActualWeight) ? totalActualWeight : 0,
              revisedDimensionalWeightTotal
            );
            const calculatedEstimatedCost =
              hasFlatRate
                ? rateInformation.finalRate
                : Number.isFinite(baseRate) && higherWeight > 0
                  ? getRateDisplayValue(clampAccountingCost(
                      (baseRate / 100) * higherWeight,
                      rateInformation.minRate,
                      rateInformation.maxRate
                    ))
                  : '';
            const baseRatePerLb = Number.isFinite(baseRate) ? getRateDisplayValue(baseRate / 100) : '';
            const rateCalculatedBy = hasFlatRate
              ? 'FLAT RATE'
              : revisedDimensionalWeightTotal > (Number.isFinite(totalActualWeight) ? totalActualWeight : 0)
                ? 'DIMENSIONAL WEIGHT'
                : 'ACTUAL WEIGHT';
            const hasBaseRate = rateInformation.baseRate !== undefined && rateInformation.baseRate !== null && rateInformation.baseRate !== '';
            const hasMinRate = rateInformation.minRate !== undefined && rateInformation.minRate !== null && rateInformation.minRate !== '';
            const hasMaxRate = rateInformation.maxRate !== undefined && rateInformation.maxRate !== null && rateInformation.maxRate !== '';

            return (
              <>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems={{ xs: 'stretch', md: 'flex-end' }} sx={{ mt: 2 }}>
                  <TextField
                    variant="standard"
                    label="Dim Factor"
                    value={rateInformation.dimFactor ?? ''}
                    onChange={(event) => handleAccountingRateChange('dimFactor', event.target.value)}
                    inputProps={{ inputMode: 'decimal' }}
                    InputProps={{ readOnly: hasFlatRate }}
                    required={!hasFlatRate}
                    error={accountingRatesDialog.dimFactorError}
                    size="small"
                    sx={{
                      flex: 1,
                      '& .MuiInputLabel-root': { fontSize: 14 },
                      '& input': { fontSize: 14, color: hasFlatRate ? '#777' : 'inherit' },
                    }}
                  />
                  <TextField
                    variant="standard"
                    label="Base Rate"
                    value={rateInformation.baseRate ?? ''}
                    onChange={(event) => handleAccountingRateChange('baseRate', event.target.value)}
                    inputProps={{ inputMode: 'decimal' }}
                    InputProps={{ readOnly: hasFlatRate }}
                    required={!hasFlatRate}
                    error={accountingRatesDialog.baseRateError}
                    size="small"
                    sx={{
                      flex: 1,
                      '& .MuiInputLabel-root': { fontSize: 14 },
                      '& input': { fontSize: 14, color: hasFlatRate ? '#777' : 'inherit' },
                    }}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={hasFlatRate}
                        onChange={(event) => handleAccountingFlatRateChange(event.target.checked)}
                        size="small"
                        sx={{ p: 0.35, color: '#102a63', '&.Mui-checked': { color: '#102a63' } }}
                      />
                    }
                    label={<Typography sx={{ fontSize: 14 }}>Flat Rate</Typography>}
                    sx={{ mx: 0, pb: 0.3 }}
                  />
                  <TextField
                    variant="standard"
                    label="Flat Rate"
                    value={rateInformation.finalRate ?? ''}
                    onChange={(event) => handleAccountingRateChange('finalRate', event.target.value)}
                    inputProps={{ inputMode: 'decimal' }}
                    size="small"
                    required={hasFlatRate}
                    error={Boolean(accountingRatesDialog.flatRateError)}
                    sx={{
                      flex: 0.75,
                      visibility: hasFlatRate ? 'visible' : 'hidden',
                      '& .MuiInputLabel-root': { fontSize: 14 },
                      '& input': { fontSize: 14 },
                    }}
                  />
                  <TextField
                    variant="standard"
                    label="Notes"
                    value={accountingRatesDialog.notesForFlatRate}
                    onChange={(event) => setAccountingRatesDialog((previous) => ({
                      ...previous,
                      notesForFlatRate: event.target.value,
                    }))}
                    size="small"
                    sx={{
                      flex: 1,
                      visibility: hasFlatRate ? 'visible' : 'hidden',
                      '& .MuiInputLabel-root': { fontSize: 14 },
                      '& input': { fontSize: 14 },
                    }}
                  />
                </Stack>

                <Table size="small" sx={{ mt: 4, border: '1px solid #d0d0d0', '& th': { bgcolor: '#f5f5f5', fontSize: 13, fontWeight: 700 }, '& td': { fontSize: 13 } }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: 110 }}>Pieces ⇅</TableCell>
                      <TableCell sx={{ width: 110 }}>Type ⇅</TableCell>
                      <TableCell>Pieces x L x W x H / Dim Factor (Dimensional Weight) ⇅</TableCell>
                      <TableCell sx={{ width: 140 }}>Actual Weight ⇅</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rateRows.map((row, index) => (
                      <TableRow key={`${row.pieces}-${row.type}-${index}`}>
                        <TableCell>{row.pieces}</TableCell>
                        <TableCell>{row.type}</TableCell>
                        <TableCell>{row.formula}</TableCell>
                        <TableCell>{row.actualWeight}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Total</TableCell>
                      <TableCell />
                      <TableCell sx={{ fontWeight: 700 }}>
                        {rateRows.length ? getRateDisplayValue(revisedDimensionalWeightTotal) : getRateDisplayValue(rateInformation.totalDimensionalWeight)}
                        {rateRows.length || (rateInformation.totalDimensionalWeight !== undefined && rateInformation.totalDimensionalWeight !== null && rateInformation.totalDimensionalWeight !== '') ? ' lbs' : ''}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>
                        {getRateDisplayValue(totalActualWeight)}
                        {hasBackendActualWeightTotal || rateRows.length ? ' lbs' : ''}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>

                <Typography sx={{ mt: 2, ml: 1.2, fontSize: 14 }}>
                  Total Estimated Cost -{' '}
                  <Box component="span" sx={{ fontWeight: 700 }}>
                    {calculatedEstimatedCost !== undefined && calculatedEstimatedCost !== null && calculatedEstimatedCost !== '' ? `$${getRateDisplayValue(calculatedEstimatedCost)}` : ''}
                  </Box>
                  {rateCalculatedBy ? ` (Calculated based on ${rateCalculatedBy})` : ''}
                </Typography>

                {!hasFlatRate && (hasBaseRate || hasMinRate || hasMaxRate) && (
                  <Box sx={{ mt: 1.5, ml: 1.2, bgcolor: '#dff0fa', borderRadius: 1, px: 1.5, py: 1.1, width: { xs: '100%', sm: 395 }, boxSizing: 'border-box' }}>
                    {hasBaseRate && (
                      <Typography sx={{ fontSize: 13 }}>
                        Calculated Based on <Box component="span" sx={{ fontWeight: 700 }}>${baseRatePerLb}</Box> per lbs.
                      </Typography>
                    )}
                    {(hasMinRate || hasMaxRate) && (
                      <Typography sx={{ fontSize: 13 }}>
                        Minimum and maximum charges are <Box component="span" sx={{ fontWeight: 700 }}>{hasMinRate ? `$${getRateDisplayValue(rateInformation.minRate)}` : ''}</Box>{hasMinRate && hasMaxRate ? ' and ' : ''}<Box component="span" sx={{ fontWeight: 700 }}>{hasMaxRate ? `$${getRateDisplayValue(rateInformation.maxRate)}` : ''}</Box> respectively.
                      </Typography>
                    )}
                  </Box>
                )}
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

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
        open={accountingConfirmation.open}
        onClose={handleCloseAccountingConfirmation}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 1, maxWidth: 420 } }}
      >
        <DialogContent sx={{ p: 2 }}>
          <Typography sx={{ fontSize: 16, fontWeight: 700 }}>Confirmation</Typography>
          <Typography sx={{ mt: 2, fontSize: 14 }}>
            {accountingConfirmation.action === 'hold'
              ? 'Are you sure you want to move this receipt to the Accounting tab?'
              : accountingConfirmation.action === 'approve'
                ? 'Are you sure you want to approve this warehouse receipt rate?'
                : 'Are you sure you want to revert this receipt back to the Active tab?'}
          </Typography>
          <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mt: 3 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={handleCloseAccountingConfirmation}
              disabled={accountHoldReceiptId !== null || accountHoldRevertReceiptId !== null || rowRateApprovalReceiptId !== null}
              sx={{ color: '#111', borderColor: '#111', textTransform: 'none', minWidth: 76 }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              size="small"
              onClick={handleConfirmAccountingAction}
              disabled={accountHoldReceiptId !== null || accountHoldRevertReceiptId !== null || rowRateApprovalReceiptId !== null}
              sx={{ bgcolor: '#A22', '&:hover': { bgcolor: '#8b1c1c' }, textTransform: 'none', minWidth: 76 }}
            >
              {accountHoldReceiptId !== null || accountHoldRevertReceiptId !== null || rowRateApprovalReceiptId !== null
                ? 'Processing...'
                : 'Confirm'}
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>

      {printReceipt && <WarehouseReceiptPrintTemplate data={printReceipt} />}

      <Dialog
        open={mailDialog.open}
        onClose={handleCloseMailDialog}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { borderRadius: 1, minHeight: 430 } }}
      >
        <DialogContent sx={{ p: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ borderBottom: '1px solid #777', pb: 0.8 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
              Mail List - {mailDialog.receiptNumber}
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" size="small" onClick={handleCloseMailDialog} disabled={mailSending} sx={{ height: 24, minWidth: 70, color: '#111', borderColor: '#111', textTransform: 'none', fontSize: 11 }}>
                Cancel
              </Button>
              <Button variant="contained" size="small" onClick={handleSendMail} disabled={mailSending} sx={{ height: 24, minWidth: 70, bgcolor: '#A22', '&:hover': { bgcolor: '#8b1c1c' }, textTransform: 'none', fontSize: 11 }}>
                {mailSending ? 'Sending...' : 'Send'}
              </Button>
            </Stack>
          </Stack>

          <Box component="fieldset" sx={{ mt: 3, border: '1px solid #777', borderRadius: 1, px: 1.2, py: 1.2, minHeight: 64 }}>
            <Box component="legend" sx={{ px: 0.7, fontSize: 12, fontWeight: 700 }}>Email Addresses</Box>
            <Autocomplete
              multiple
              freeSolo
              options={[]}
              value={mailDialog.extraEmails}
              onChange={(event, values) => {
                setMailDialog((previous) => ({ ...previous, extraEmails: getUniqueEmails(values) }));
                setMailError('');
              }}
              renderTags={(values, getTagProps) => values.map((value, index) => (
                <Chip label={value} size="small" {...getTagProps({ index })} key={value} />
              ))}
              renderInput={(params) => (
                <TextField
                  {...params}
                  variant="standard"
                  placeholder="Enter email and press Enter"
                  error={Boolean(mailError)}
                  helperText={mailError}
                  InputProps={{ ...params.InputProps, disableUnderline: true }}
                />
              )}
            />
          </Box>

          <Table size="small" sx={{ mt: 3, border: '1px solid #d0d0d0', '& th': { bgcolor: '#f5f5f5', fontSize: 11, fontWeight: 500, py: 0.6 }, '& td': { fontSize: 12, py: 0.45 } }}>
            <TableHead>
              <TableRow><TableCell sx={{ width: 70 }}>S.No</TableCell><TableCell>Email ID</TableCell></TableRow>
            </TableHead>
            <TableBody>
              {mailDialog.rows.length ? mailDialog.rows.map((row, index) => (
                <TableRow key={row.email}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{row.email}</TableCell>
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={2} align="center" sx={{ py: 3, color: '#555' }}>No emails found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      <Dialog
        open={documentUploadDialog.open}
        onClose={handleCloseDocumentUpload}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 1 } }}
      >
        <DialogContent sx={{ p: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ borderBottom: '1px solid #777', pb: 0.8 }}>
            <Typography sx={{ fontSize: 16, fontWeight: 700 }}>
              Upload Documents - {documentUploadDialog.receiptNumber}
            </Typography>
            <IconButton size="small" onClick={handleCloseDocumentUpload} disabled={documentUploading} sx={{ p: 0.2, color: '#111' }}>
              <CloseIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Stack>

          <input
            ref={documentInputRef}
            type="file"
            multiple
            accept={warehouseReceiptDocumentAccept}
            hidden
            onChange={handleDocumentSelection}
          />

          <Stack
            alignItems="center"
            justifyContent="center"
            spacing={1}
            onDragOver={(event) => {
              event.preventDefault();
              setDocumentUploadDragging(true);
            }}
            onDragEnter={(event) => {
              event.preventDefault();
              setDocumentUploadDragging(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setDocumentUploadDragging(false);
            }}
            onDrop={handleDocumentDrop}
            sx={{
              mt: 2,
              minHeight: 180,
              border: '1px dashed #999',
              borderRadius: 1.5,
              bgcolor: documentUploadDragging ? '#fff3f3' : '#fff',
              transition: 'background-color 0.2s ease',
            }}
          >
            <Iconify icon="mdi:tray-arrow-up" width={34} sx={{ color: '#A22' }} />
            <Typography sx={{ fontSize: 14, fontWeight: 600 }}>Drag & Drop File</Typography>
            <Typography sx={{ fontSize: 11, color: '#777' }}>File Supported: PDF</Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 600 }}>OR</Typography>
            <Button
              variant="contained"
              size="small"
              onClick={() => documentInputRef.current?.click()}
              sx={{ bgcolor: '#A22', '&:hover': { bgcolor: '#8b1c1c' }, textTransform: 'none' }}
            >
              Browse Files
            </Button>
          </Stack>

          {documentUploadDialog.files.length > 0 && (
            <Stack spacing={0.8} sx={{ mt: 2 }}>
              {documentUploadDialog.files.map((file, index) => (
                <Stack
                  key={`${file.name}-${file.lastModified}-${index}`}
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ bgcolor: '#f5f5f5', border: '1px solid #e0e0e0', borderRadius: 1, px: 1, py: 0.5 }}
                >
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDocumentPreview(file)}
                      sx={{ p: 0.3, bgcolor: '#dbdbdb', color: '#111', borderRadius: 0.5, flexShrink: 0 }}
                    >
                      <Iconify icon="mdi:eye" width={16} />
                    </IconButton>
                    <Iconify icon="mdi:file-document-outline" width={18} sx={{ flexShrink: 0 }} />
                    <Typography noWrap sx={{ fontSize: 12 }}>{file.name}</Typography>
                  </Stack>
                  <Stack direction="row" alignItems="center">
                    <IconButton
                      size="small"
                      onClick={() => setDocumentUploadDialog((previous) => ({
                        ...previous,
                        files: previous.files.filter((_, fileIndex) => fileIndex !== index),
                      }))}
                      disabled={documentUploading}
                      sx={{ p: 0.2, color: '#111' }}
                    >
                      <CloseIcon sx={{ fontSize: 17 }} />
                    </IconButton>
                  </Stack>
                </Stack>
              ))}
            </Stack>
          )}

          {documentUploadError && (
            <Typography sx={{ mt: 1, color: '#A22', fontSize: 12 }}>{documentUploadError}</Typography>
          )}

          <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mt: 2.5 }}>
            <Button variant="outlined" size="small" onClick={handleCloseDocumentUpload} disabled={documentUploading} sx={{ color: '#111', borderColor: '#111', textTransform: 'none', minWidth: 76 }}>
              Cancel
            </Button>
            <Button variant="contained" size="small" onClick={handleUploadDocuments} disabled={documentUploading || !documentUploadDialog.files.length} sx={{ bgcolor: '#A22', '&:hover': { bgcolor: '#8b1c1c' }, textTransform: 'none', minWidth: 76 }}>
              {documentUploading ? 'Uploading...' : 'Upload'}
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>

      <Dialog
        open={uploadedDocumentsDialog.open}
        onClose={handleCloseUploadedDocuments}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { borderRadius: 1, minHeight: 400 } }}
      >
        <DialogContent sx={{ p: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ borderBottom: '1px solid #777', pb: 0.8 }}>
            <Typography sx={{ fontSize: 16, fontWeight: 700 }}>
              Uploaded Documents - {uploadedDocumentsDialog.row?.receiptNumber || uploadedDocumentsDialog.row?.rawData?.receiptNumber || ''}
            </Typography>
            <IconButton size="small" onClick={handleCloseUploadedDocuments} disabled={Boolean(uploadedDocumentLoadingPath) || uploadedDocumentRemovingId !== null} sx={{ p: 0.2, color: '#111' }}>
              <CloseIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Stack>

          <Table
            size="small"
            sx={{
              mt: 2,
              border: '1px solid #d0d0d0',
              '& th': { bgcolor: '#d9d9d9', fontSize: 12, fontWeight: 700, borderRight: '1px solid #c7c7c7' },
              '& td': { fontSize: 12, borderRight: '1px solid #d9d9d9', verticalAlign: 'top' },
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 55 }}>Sno</TableCell>
                <TableCell sx={{ width: 190 }}>Date &amp; TimeStamp</TableCell>
                <TableCell sx={{ width: 240 }}>Uploaded by</TableCell>
                <TableCell>Uploaded file</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {uploadedDocumentsDialog.documents.length ? uploadedDocumentsDialog.documents.map((document, index) => {
                const sourceRow = uploadedDocumentsDialog.row?.rawData || uploadedDocumentsDialog.row || {};
                const uploadedByName = document.uploadedByName || document.requestedByName || sourceRow.requestedByName || '';
                const uploadedByRole = document.uploadedByRole || document.roleName || '';
                const isLoadingDocument = uploadedDocumentLoadingPath === document.filePath;
                const isRemovingDocument = uploadedDocumentRemovingId === document.documentId;

                return (
                  <TableRow key={document.documentId ?? `${document.filePath}-${index}`}>
                    <TableCell>{String(index + 1).padStart(2, '0')}</TableCell>
                    <TableCell>{formatRateApprovalDate(document.uploadedAt)}</TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 12 }}>{uploadedByName}</Typography>
                      {uploadedByRole && <Typography sx={{ fontSize: 11, fontStyle: 'italic', fontWeight: 600 }}>{uploadedByRole}</Typography>}
                    </TableCell>
                    <TableCell>
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1}
                        sx={{ maxWidth: 420, border: '1px solid #ddd', borderRadius: 1, px: 0.8, py: 0.45, boxShadow: 1 }}
                      >
                        <IconButton
                          size="small"
                          onClick={() => handleViewUploadedDocument(document)}
                          disabled={Boolean(uploadedDocumentLoadingPath) || uploadedDocumentRemovingId !== null}
                          sx={{ p: 0.35, bgcolor: '#b8b8b8', color: '#111', borderRadius: 0.5, flexShrink: 0 }}
                        >
                          {isLoadingDocument ? <CircularProgress size={16} color="inherit" /> : <Iconify icon="mdi:eye" width={17} />}
                        </IconButton>
                        <Typography noWrap sx={{ minWidth: 0, flex: 1, fontSize: 12 }}>{document.filePath}</Typography>
                        <IconButton
                          size="small"
                          aria-label={`Remove ${document.filePath || 'document'}`}
                          onClick={() => handleRemoveUploadedDocument(document)}
                          disabled={Boolean(uploadedDocumentLoadingPath) || uploadedDocumentRemovingId !== null}
                          sx={{ p: 0.2, color: '#050505', flexShrink: 0 }}
                        >
                          {isRemovingDocument
                            ? <CircularProgress size={14} color="inherit" />
                            : <Iconify icon="carbon:close-filled" width={16} />}
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              }) : (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 5, color: '#666' }}>No uploaded documents found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {uploadedDocumentError && (
            <Typography sx={{ mt: 1, color: '#A22', fontSize: 12 }}>{uploadedDocumentError}</Typography>
          )}

          <Button
            variant="contained"
            size="small"
            onClick={handleCloseUploadedDocuments}
            disabled={Boolean(uploadedDocumentLoadingPath) || uploadedDocumentRemovingId !== null}
            sx={{ mt: 3, bgcolor: '#A22', '&:hover': { bgcolor: '#8b1c1c' }, minWidth: 48, textTransform: 'none' }}
          >
            OK
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog
        open={documentPreview.open}
        onClose={handleCloseDocumentPreview}
        maxWidth="xl"
        fullWidth
        PaperProps={{ sx: { height: '92vh', maxHeight: '92vh', borderRadius: 1 } }}
      >
        <DialogContent sx={{ p: 2, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ borderBottom: '1px solid #777', pb: 0.8, mb: 1.5 }}>
            <Typography noWrap sx={{ fontSize: 16, fontWeight: 700, pr: 2 }}>
              {documentPreview.file?.name || 'Document Preview'}
            </Typography>
            <IconButton size="small" onClick={handleCloseDocumentPreview} sx={{ p: 0.2, color: '#111' }}>
              <CloseIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Stack>

          {documentPreview.file?.type?.startsWith('image/') ? (
            <Box
              component="img"
              src={documentPreview.url}
              alt={documentPreview.file?.name || 'Document preview'}
              sx={{ width: '100%', height: '100%', minHeight: 0, objectFit: 'contain', bgcolor: '#f5f5f5' }}
            />
          ) : (
            <Box
              component="iframe"
              title={documentPreview.file?.name || 'Document preview'}
              src={documentPreview.url}
              sx={{ width: '100%', flex: 1, minHeight: 0, border: '1px solid #ddd', bgcolor: '#fff' }}
            />
          )}
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
        open={Boolean(exportError)}
        autoHideDuration={3000}
        onClose={() => setExportError('')}
        message={exportError}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
      <Snackbar
        open={Boolean(accountHoldMessage)}
        autoHideDuration={3000}
        onClose={() => setAccountHoldMessage('')}
        message={accountHoldMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
      <Snackbar
        open={Boolean(accountHoldError)}
        autoHideDuration={3000}
        onClose={() => setAccountHoldError('')}
        message={accountHoldError}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
      <Snackbar
        open={Boolean(mailMessage)}
        autoHideDuration={3000}
        onClose={() => setMailMessage('')}
        message={mailMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
      <Snackbar
        open={Boolean(documentUploadMessage)}
        autoHideDuration={3000}
        onClose={() => setDocumentUploadMessage('')}
        message={documentUploadMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}
