import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  MenuList,
  Popover,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
  CircularProgress,
  Alert,
  Snackbar,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DataGrid } from '@mui/x-data-grid';
import ShipmentFormLayout from '../../sections/shared/ShipmentFormLayout';
import StyledTextField from '../../sections/shared/StyledTextField';
import Iconify from '../../components/iconify';
import { useDispatch, useSelector } from '../../redux/store';
import {
  searchWarehouseReceipt,
  searchWarehouseReceiptProDetail,
  clearReceiptSearch,
  createTempWarehouseReceipt,
  fetchCargoApiDropdown,
  fetchCargoApiDimensions,
  fetchPrintersDropdown,
  setWarehouseCheckInDraft,
  clearWarehouseCheckInDraft,
} from '../../redux/slices/warehouse';
import axios from '../../utils/axios';
import { PATH_DASHBOARD } from '../../routes/paths';

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
const FREIGHT_TYPE_OPTIONS = ['Skid', 'Crate', 'Drum', 'Pail', 'Bundle', 'Bag','Basket','Box','Carton','Jerrican','Package','Pallet','Cylinder','Tote','Roll','Reel','Tube'];
const REQUIRED_ITEM_FIELDS = [
  { field: 'pieces', label: 'Pieces' },
  { field: 'type', label: 'Type' },
  { field: 'length', label: 'Length' },
  { field: 'width', label: 'Width' },
  { field: 'height', label: 'Height' },
  { field: 'weight', label: 'Weight' },
];

// ─── Helpers to create blank form / item ────────────────────────────
const createItem = (id) => ({ id, pieces: '', type: '', length: '', width: '', height: '', weight: '', images: [] });
const createForm = (id, receiptNumber = null, defaults = {}) => ({
  id,
  collapsed: false,
  items: [createItem(1)],
  receiptNumber,
  destination: defaults.destination || '',
  customerRefNoPackageId: defaults.customerRefNoPackageId || '',
});

const getDropdownOptionLabel = (option) => {
  if (option === null || option === undefined) return '';
  if (typeof option !== 'object') return String(option);

  return (
    option.label ||
    option.name ||
    option.value ||
    option.description ||
    option.deviceName ||
    option.cargoApiName ||
    option.apiName ||
    option.code ||
    option.apiId ||
    option.id ||
    ''
  );
};

const FileItem = ({ filename, onRemove, onView, hideRemove = false }) => (
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
    }}
  >
    <Stack direction="row" alignItems="center" spacing={1}>
      <IconButton size="small" onClick={onView} sx={{ bgcolor: '#dbdbdb', borderRadius: 0.5, p: '4px', color: '#000' }}>
        <Iconify icon="mdi:eye" width={16} color="#000" />
      </IconButton>
      <Typography sx={{ fontSize: 12 }}>{filename}</Typography>
    </Stack>
    {!hideRemove && (
      <IconButton size="small" onClick={onRemove} sx={{ p: '2px', color: '#000' }}>
        <Iconify icon="carbon:close-filled" width={16} />
      </IconButton>
    )}
  </Box>
);

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

const getRowValue = (row, fields, fallback = '') => {
  const fieldList = Array.isArray(fields) ? fields : [fields];
  const field = fieldList.find((name) => row?.[name] !== undefined && row?.[name] !== null && row?.[name] !== '');
  return field ? row[field] : fallback;
};

const buildTempReceiptPayload = (receipt) => {
  const { row, proNumber, receivedBy, location } = receipt;

  return {
    verificationId: getRowValue(row, 'verificationId', 0),
    shipper: getRowValue(row, ['shipper', 'shipperName', 'shipperCompany'], ''),
    customerId: getRowValue(row, 'customerId', 0),
    stationId: getRowValue(row, 'stationId', 0),
    carrierId: getRowValue(row, 'carrierId', 0),
    status: 'INITIATE',
    receivedBy: receivedBy || '',
    location: location || '',
    destination: getRowValue(row, ['destination', 'finalDestination'], 0),
    proNumber: getRowValue(row, 'proNumber', proNumber),
    packageId: getRowValue(row, ['packageId', 'packageNumber'], 0),
  };
};

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

export default function WarehouseCheckInPage({
  title = 'Warehouse Check-In / Regular',
  showParcelOption = true,
  showTrailerFreightHeader = false,
  draftKey = 'regular',
}) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const cameraVideoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const draftRestoredRef = useRef(false);
  const { warehouseReceiptSearch, cargoApiDropdown, printersDropdown, warehouseCheckInDrafts } = useSelector((state) => state.warehousedata);
  const warehouseCheckInDraft = warehouseCheckInDrafts?.[draftKey];

  const [searchType, setSearchType]     = useState('pro');   // 'pro' | 'rmDriver' | 'fedexUps'
  const [searchBy, setSearchBy]         = useState('PRO');
  const [searchValue, setSearchValue]   = useState('');
  const [savedResults, setSavedResults] = useState(null);    // snapshot before Proceed
  const [collapsed, setCollapsed]       = useState({});
  const [rejectOpen, setRejectOpen]     = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectRow, setRejectRow]       = useState(null);
  const [rejectLoading, setRejectLoading] = useState(false);
  const [rejectedRowIds, setRejectedRowIds] = useState([]);
  const [noDataDialogOpen, setNoDataDialogOpen] = useState(false);
  const [snackbar, setSnackbar]         = useState({ open: false, message: '', severity: 'success' });
  const [isSearchDisabled, setIsSearchDisabled] = useState(false);
  const [tempReceiptLoading, setTempReceiptLoading] = useState({});
  const [receiptErrors, setReceiptErrors] = useState({});
  const [uploadDialog, setUploadDialog] = useState({ open: false, mode: 'upload', key: null, formId: null, itemId: null });
  const [imagePreviewDialog, setImagePreviewDialog] = useState({
    open: false,
    images: [],
    itemLabel: '',
    key: null,
    formId: null,
    itemId: null,
  });
  const [stagedFiles, setStagedFiles] = useState([]);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [cameraDialogOpen, setCameraDialogOpen] = useState(false);
  const [packageDropdownAnchor, setPackageDropdownAnchor] = useState(null);
  const [packageDropdownContext, setPackageDropdownContext] = useState({ key: null, formId: null, itemId: null });
  const [printerDialogOpen, setPrinterDialogOpen] = useState(false);
  const [selectedPrinterId, setSelectedPrinterId] = useState('');

  // ── Proceeded receipts state ───────────────────────────────────────
  const [proceededReceipts, setProceededReceipts] = useState([]);

  useEffect(() => {
    dispatch(fetchCargoApiDropdown());
  }, [dispatch]);

  useEffect(() => () => {
    cameraStreamRef.current?.getTracks?.().forEach((track) => track.stop());
    cameraStreamRef.current = null;
  }, []);

  useEffect(() => {
    if (!warehouseCheckInDraft || draftRestoredRef.current) return;

    draftRestoredRef.current = true;
    setSearchType(warehouseCheckInDraft.searchType || 'pro');
    setSearchBy(warehouseCheckInDraft.searchBy || 'PRO');
    setSearchValue(warehouseCheckInDraft.searchValue || '');
    setSavedResults(warehouseCheckInDraft.savedResults || null);
    setCollapsed(warehouseCheckInDraft.collapsed || {});
    setRejectedRowIds(warehouseCheckInDraft.rejectedRowIds || []);
    setIsSearchDisabled(Boolean(warehouseCheckInDraft.isSearchDisabled));
    setReceiptErrors(warehouseCheckInDraft.receiptErrors || {});
    setProceededReceipts(warehouseCheckInDraft.proceededReceipts || []);
  }, [warehouseCheckInDraft]);

  // Show no data dialog when search returns empty results
  useEffect(() => {
    const { loading, found, data } = warehouseReceiptSearch;

    if (!loading && found && data) {
      // Check if data.rows exists and is empty
      const isEmpty = (data.rows && Array.isArray(data.rows) && data.rows.length === 0) ||
                      (Array.isArray(data) && data.length === 0);

      if (isEmpty) {
        setNoDataDialogOpen(true);
      }
    }
  }, [warehouseReceiptSearch.loading, warehouseReceiptSearch.found, warehouseReceiptSearch.data]);

  const handleProceed = (row) => {
    const key = `${warehouseReceiptSearch.data.proNumber}-${row.id}`;
    if (proceededReceipts.find((p) => p.key === key)) return;
    setSavedResults(warehouseReceiptSearch.data);
    const formDefaults = {
      destination: getRowValue(row, ['destination', 'finalDestination'], ''),
      customerRefNoPackageId: getRowValue(row, ['packageId', 'packageNumber'], ''),
    };
    setProceededReceipts((prev) => [
      ...prev,
      { key, proNumber: warehouseReceiptSearch.data.proNumber, row, receivedBy: '', location: 'OH', sectionCollapsed: false, forms: [createForm(1, null, formDefaults)] },
    ]);
    setIsSearchDisabled(true);
    // Clear search results
    dispatch(clearReceiptSearch());
  };

  const updateReceipt = (key, updater) =>
    setProceededReceipts((prev) => prev.map((p) => (p.key === key ? { ...p, ...updater(p) } : p)));

  const removeReceipt = (key) => {
    setProceededReceipts((prev) => prev.filter((p) => p.key !== key));
    setIsSearchDisabled(false);
    setSearchValue('');
    if (savedResults) {
      // Restore the previous search results
      // Note: This is a simple restoration from saved state
    }
    setSavedResults(null);
  };

  const getItemErrorKey = (formId, itemId, field) => `${formId}-${itemId}-${field}`;
  const getFormErrorKey = (formId, field) => `${formId}-${field}`;

  const addForm = async (key) => {
    const receipt = proceededReceipts.find((p) => p.key === key);
    if (!receipt) return;

    const lastForm = receipt.forms[receipt.forms.length - 1];
    const itemErrors = {};
    const formErrors = {};

    if (!receipt.receivedBy.trim()) {
      setReceiptErrors((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          receivedBy: 'Received By is mandatory',
        },
      }));
      updateReceipt(key, () => ({ sectionCollapsed: false }));
      setSnackbar({ open: true, message: 'Please fill all mandatory fields before adding a new form', severity: 'error' });
      return;
    }

    lastForm.items.forEach((item) => {
      REQUIRED_ITEM_FIELDS.forEach(({ field, label }) => {
        if (!String(item[field]).trim()) {
          itemErrors[getItemErrorKey(lastForm.id, item.id, field)] = `${label} is mandatory`;
        }
      });
    });

    if (showTrailerFreightHeader) {
      if (!String(lastForm.destination || '').trim()) {
        formErrors[getFormErrorKey(lastForm.id, 'destination')] = 'Destination is mandatory';
      }
      if (!String(lastForm.customerRefNoPackageId || '').trim()) {
        formErrors[getFormErrorKey(lastForm.id, 'customerRefNoPackageId')] = 'Package ID is mandatory';
      }
    }

    if (Object.keys(itemErrors).length > 0 || Object.keys(formErrors).length > 0) {
      setReceiptErrors((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          receivedBy: '',
          formFields: {
            ...(prev[key]?.formFields || {}),
            ...formErrors,
          },
          items: {
            ...(prev[key]?.items || {}),
            ...itemErrors,
          },
        },
      }));
      updateReceipt(key, (p) => ({
        sectionCollapsed: false,
        forms: p.forms.map((form) => (form.id === lastForm.id ? { ...form, collapsed: false } : form)),
      }));
      setSnackbar({ open: true, message: 'Please fill all mandatory fields before adding a new form', severity: 'error' });
      return;
    }

    setReceiptErrors((prev) => ({ ...prev, [key]: { ...prev[key], receivedBy: '' } }));
    setTempReceiptLoading((prev) => ({ ...prev, [key]: true }));

    try {
      const payload = buildTempReceiptPayload(receipt);
      const response = await dispatch(createTempWarehouseReceipt(payload));

      if (response?.error || response?.success === false) {
        setSnackbar({
          open: true,
          message: response?.message || 'Failed to create temporary warehouse receipt',
          severity: 'error'
        });
        return;
      }

      const receiptNumber = response?.data?.receiptNumber;
      const formDefaults = {
        destination: getRowValue(receipt.row, ['destination', 'finalDestination'], ''),
        customerRefNoPackageId: getRowValue(receipt.row, ['packageId', 'packageNumber'], ''),
      };
      updateReceipt(key, (p) => ({ forms: [...p.forms, createForm(p.forms.length + 1, receiptNumber, formDefaults)] }));
      setSnackbar({
        open: true,
        message: 'Temporary warehouse receipt created successfully',
        severity: 'success'
      });
    } finally {
      setTempReceiptLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const removeForm = (key, formId) =>
    updateReceipt(key, (p) => ({ forms: p.forms.filter((f) => f.id !== formId) }));

  const toggleFormCollapse = (key, formId) =>
    updateReceipt(key, (p) => ({
      forms: p.forms.map((f) => (f.id === formId ? { ...f, collapsed: !f.collapsed } : f)),
    }));

  const updateFormField = (key, formId, field, value) =>
    updateReceipt(key, (p) => ({
      forms: p.forms.map((f) => (f.id === formId ? { ...f, [field]: value } : f)),
    }));

  const addItem = (key, formId) =>
    updateReceipt(key, (p) => ({
      forms: p.forms.map((f) =>
        f.id === formId ? { ...f, items: [...f.items, createItem(f.items.length + 1)] } : f
      ),
    }));

  const removeItem = (key, formId, itemId) =>
    updateReceipt(key, (p) => ({
      forms: p.forms.map((f) => {
        if (f.id !== formId) return f;
        // If this is the last item, clear values instead of removing
        if (f.items.length === 1) {
          return {
            ...f,
            items: f.items.map((i) =>
              i.id === itemId ? { ...createItem(i.id) } : i
            ),
          };
        }
        // Otherwise, remove the item
        return { ...f, items: f.items.filter((i) => i.id !== itemId) };
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

  const clearItemError = (key, formId, itemId, field, value) => {
    if (!String(value).trim()) return;

    setReceiptErrors((prev) => {
      const itemErrors = { ...(prev[key]?.items || {}) };
      delete itemErrors[getItemErrorKey(formId, itemId, field)];

      return {
        ...prev,
        [key]: {
          ...prev[key],
          items: itemErrors,
        },
      };
    });
  };

  const clearFormFieldError = (key, formId, field, value) => {
    if (!String(value).trim()) return;

    setReceiptErrors((prev) => {
      const formFields = { ...(prev[key]?.formFields || {}) };
      delete formFields[getFormErrorKey(formId, field)];

      return {
        ...prev,
        [key]: {
          ...prev[key],
          formFields,
        },
      };
    });
  };

  const handleOpenImageUpload = (key, formId, itemId, existingFiles = [], mode = 'upload') => {
    setUploadDialog({ open: true, mode, key, formId, itemId });
    setStagedFiles(existingFiles);
    setIsDraggingFiles(false);
  };

  const handleCloseImageUpload = () => {
    setUploadDialog({ open: false, mode: 'upload', key: null, formId: null, itemId: null });
    setStagedFiles([]);
    setIsDraggingFiles(false);
    handleCloseCamera();
  };

  const handleOpenImagePreview = (images = [], itemLabel = '', context = {}) => {
    setImagePreviewDialog({ open: true, images, itemLabel, ...context });
  };

  const handleCloseImagePreview = () => {
    setImagePreviewDialog({ open: false, images: [], itemLabel: '', key: null, formId: null, itemId: null });
  };

  const handleRemovePreviewImage = (index) => {
    const { key, formId, itemId } = imagePreviewDialog;
    if (!key || !formId || !itemId) return;

    const nextImages = imagePreviewDialog.images.filter((_, imageIndex) => imageIndex !== index);
    updateItem(key, formId, itemId, 'images', nextImages);
    setImagePreviewDialog((prev) => ({ ...prev, images: nextImages }));
  };

  const handleBrowseFiles = () => {
    fileInputRef.current?.click();
  };

  const stopCameraStream = () => {
    cameraStreamRef.current?.getTracks?.().forEach((track) => track.stop());
    cameraStreamRef.current = null;
  };

  const handleCaptureImage = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      cameraInputRef.current?.click();
      setSnackbar({
        open: true,
        message: 'Camera is not available in this browser. Please use file upload.',
        severity: 'warning',
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });

      cameraStreamRef.current = stream;
      setCameraDialogOpen(true);

      setTimeout(() => {
        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = stream;
          cameraVideoRef.current.play?.();
        }
      }, 0);
    } catch (error) {
      setSnackbar({
        open: true,
        message: error?.message || 'Unable to open camera',
        severity: 'error',
      });
    }
  };

  const handleCloseCamera = () => {
    stopCameraStream();
    setCameraDialogOpen(false);
  };

  const handleTakePhoto = () => {
    const video = cameraVideoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;

      const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
      addFilesToStage([file]);
      handleCloseCamera();
    }, 'image/jpeg', 0.92);
  };

  const addFilesToStage = (files) => {
    const selectedFiles = Array.from(files || []);

    if (selectedFiles.length > 0) {
      setStagedFiles((prev) => [...prev, ...selectedFiles]);
    }
  };

  const handleFileSelection = (event) => {
    addFilesToStage(event.target.files);
    event.target.value = '';
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDraggingFiles(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setIsDraggingFiles(false);
  };

  const handleFileDrop = (event) => {
    event.preventDefault();
    setIsDraggingFiles(false);
    addFilesToStage(event.dataTransfer.files);
  };

  const handleRemoveStagedFile = (index) => {
    setStagedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleViewStagedFile = (file) => {
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    window.open(previewUrl, '_blank', 'noopener,noreferrer');

    setTimeout(() => {
      URL.revokeObjectURL(previewUrl);
    }, 1000);
  };

  const handleUploadImages = () => {
    if (!uploadDialog.key || !uploadDialog.formId || !uploadDialog.itemId) return;

    updateItem(uploadDialog.key, uploadDialog.formId, uploadDialog.itemId, 'images', stagedFiles);
    handleCloseImageUpload();
  };

  const getDimensionValue = (dimensions, fields) => {
    const data = Array.isArray(dimensions) ? dimensions[0] : dimensions;
    const field = fields.find((name) => data?.[name] !== undefined && data?.[name] !== null && data?.[name] !== '');
    return field ? data[field] : null;
  };

  const applyCargoDimensions = (dimensionsResponse) => {
    const { key, formId, itemId } = packageDropdownContext;
    const dimensions = dimensionsResponse?.data || dimensionsResponse;

    if (!key || !formId || !itemId || !dimensions || dimensionsResponse?.error) return;

    const fieldMap = {
      length: ['length', 'cargoLength', 'apiLength'],
      width: ['width', 'cargoWidth', 'apiWidth'],
      height: ['height', 'cargoHeight', 'apiHeight'],
      weight: ['weight', 'cargoWeight', 'apiWeight', 'weightLbs'],
    };

    Object.entries(fieldMap).forEach(([field, fieldNames]) => {
      const value = getDimensionValue(dimensions, fieldNames);
      if (value !== null) {
        updateItem(key, formId, itemId, field, String(value));
        clearItemError(key, formId, itemId, field, String(value));
      }
    });
  };

  const handlePackageDetailsClick = (event, key, formId, itemId) => {
    setPackageDropdownAnchor(event.currentTarget);
    setPackageDropdownContext({ key, formId, itemId });
  };

  const handleClosePackageDropdown = () => {
    setPackageDropdownAnchor(null);
  };

  const handlePackageOptionSelect = async (option) => {
    const apiId = option?.apiId || option?.id || option?.value;

    if (!apiId) {
      handleClosePackageDropdown();
      return;
    }

    const dimensionsResponse = await dispatch(fetchCargoApiDimensions(apiId));
    applyCargoDimensions(dimensionsResponse);

    if (dimensionsResponse?.message) {
      setSnackbar({
        open: true,
        message: dimensionsResponse.message,
        severity: dimensionsResponse.error || dimensionsResponse.success === false
          ? 'error'
          : dimensionsResponse.warning
            ? 'warning'
            : 'success',
      });
    }

    handleClosePackageDropdown();
  };

  const handleOpenPrinterDialog = () => {
    setPrinterDialogOpen(true);
    setSelectedPrinterId('');
    dispatch(fetchPrintersDropdown());
  };

  const handleClosePrinterDialog = () => {
    setPrinterDialogOpen(false);
    setSelectedPrinterId('');
  };

  const handlePrint = () => {
    const printer = printersDropdown.data.find((item) => String(item.printerId) === String(selectedPrinterId));

    setSnackbar({
      open: true,
      message: printer ? `Print requested for ${printer.printerName}` : 'Please select a printer',
      severity: printer ? 'success' : 'error',
    });

    if (printer) {
      handleClosePrinterDialog();
    }
  };

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

  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) {
      setSnackbar({ open: true, message: 'Please enter a rejection reason', severity: 'error' });
      return;
    }

    if (!rejectRow) {
      setSnackbar({ open: true, message: 'No receipt selected', severity: 'error' });
      return;
    }

    setRejectLoading(true);

    try {
      const receiptId = rejectRow.receiptId || rejectRow.id;

      // Make API call to reject the receipt
      const response = await axios.put(`/warehouse-receipt/${receiptId}/reject`, {
        rejectionReason: rejectReason
      });

      if (response.data?.success) {
        setSnackbar({
          open: true,
          message: 'Receipt rejected successfully',
          severity: 'success'
        });

        // Remove only the rejected row from the display
        setRejectedRowIds((prev) => [...prev, rejectRow.id]);

        handleRejectClose();
      } else {
        setSnackbar({
          open: true,
          message: response.data?.message || 'Failed to reject receipt',
          severity: 'error'
        });
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Error rejecting receipt';
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error'
      });
      console.error('Error rejecting receipt:', error);
    } finally {
      setRejectLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleCancel = () => {
    dispatch(clearWarehouseCheckInDraft(draftKey));
    setSearchType('pro');
    setSearchBy('PRO');
    setSearchValue('');
    setSavedResults(null);
    setCollapsed({});
    setRejectOpen(false);
    setRejectReason('');
    setRejectRow(null);
    setRejectLoading(false);
    setRejectedRowIds([]);
    setNoDataDialogOpen(false);
    setSnackbar({ open: false, message: '', severity: 'success' });
    setIsSearchDisabled(false);
    setTempReceiptLoading({});
    setReceiptErrors({});
    setUploadDialog({ open: false, mode: 'upload', key: null, formId: null, itemId: null });
    setStagedFiles([]);
    setIsDraggingFiles(false);
    setPackageDropdownAnchor(null);
    setPackageDropdownContext({ key: null, formId: null, itemId: null });
    setProceededReceipts([]);
    dispatch(clearReceiptSearch());
  };

  const handleNext = () => {
    if (proceededReceipts.length === 0) {
      setSnackbar({ open: true, message: 'Please proceed with a warehouse receipt before continuing', severity: 'error' });
      return;
    }

    const nextErrors = {};
    let hasErrors = false;

    proceededReceipts.forEach((receipt) => {
      const receiptError = { formFields: {}, items: {} };

      if (!receipt.receivedBy.trim()) {
        receiptError.receivedBy = 'Received By is mandatory';
        hasErrors = true;
      }

      receipt.forms.forEach((form) => {
        if (showTrailerFreightHeader) {
          if (!String(form.destination || '').trim()) {
            receiptError.formFields[getFormErrorKey(form.id, 'destination')] = 'Destination is mandatory';
            hasErrors = true;
          }
          if (!String(form.customerRefNoPackageId || '').trim()) {
            receiptError.formFields[getFormErrorKey(form.id, 'customerRefNoPackageId')] = 'Package ID is mandatory';
            hasErrors = true;
          }
        }

        form.items.forEach((item) => {
          REQUIRED_ITEM_FIELDS.forEach(({ field, label }) => {
            if (!String(item[field]).trim()) {
              receiptError.items[getItemErrorKey(form.id, item.id, field)] = `${label} is mandatory`;
              hasErrors = true;
            }
          });
        });
      });

      if (
        receiptError.receivedBy ||
        Object.keys(receiptError.formFields).length > 0 ||
        Object.keys(receiptError.items).length > 0
      ) {
        nextErrors[receipt.key] = receiptError;
      }
    });

    setReceiptErrors(nextErrors);

    if (hasErrors) {
      setProceededReceipts((prev) =>
        prev.map((receipt) => {
          const receiptError = nextErrors[receipt.key];
          if (!receiptError) return receipt;

          return {
            ...receipt,
            sectionCollapsed: false,
            forms: receipt.forms.map((form) => ({
              ...form,
              collapsed:
                Boolean(
                  receiptError.formFields?.[getFormErrorKey(form.id, 'destination')] ||
                    receiptError.formFields?.[getFormErrorKey(form.id, 'customerRefNoPackageId')]
                ) ||
                form.items.some((item) =>
                  REQUIRED_ITEM_FIELDS.some(({ field }) => receiptError.items[getItemErrorKey(form.id, item.id, field)])
                )
                ? false
                : form.collapsed,
            })),
          };
        })
      );
      setSnackbar({ open: true, message: 'Please fill all mandatory fields before continuing', severity: 'error' });
      return;
    }

    dispatch(setWarehouseCheckInDraft({
      searchType,
      searchBy,
      searchValue,
      savedResults,
      collapsed,
      rejectedRowIds,
      isSearchDisabled,
      receiptErrors: nextErrors,
      proceededReceipts,
    }, draftKey));

    navigate(PATH_DASHBOARD.warehouseReceiptForm, { state: { receipts: proceededReceipts, title, draftKey } });
  };

  // ── Search handler ─────────────────────────────────────────────────
  const handleSearch = () => {
    if (!searchValue.trim()) {
      return;
    }
    setNoDataDialogOpen(false);
    if (searchType === 'rmDriver') {
      dispatch(searchWarehouseReceiptProDetail(searchValue.trim()));
    } else {
      dispatch(searchWarehouseReceipt(searchValue.trim(), searchBy.toLowerCase()));
    }
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
      title={title}
      handleClose={() => navigate(-1)}
      onCancel={handleCancel}
      onSubmit={handleNext}
      submitLabel="Next"
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
              disabled={isSearchDisabled}
              control={<Radio size="small" sx={{ color: '#A22', '&.Mui-checked': { color: '#A22' } }} />}
              label={<Typography sx={{ fontSize: 13 }}>Search By PRO#</Typography>}
            />
            <FormControlLabel
              value="rmDriver"
              disabled={isSearchDisabled}
              control={<Radio size="small" sx={{ color: '#A22', '&.Mui-checked': { color: '#A22' } }} />}
              label={<Typography sx={{ fontSize: 13 }}>RM Driver</Typography>}
            />
            {showParcelOption && (
              <FormControlLabel
                value="parcel"
                disabled={isSearchDisabled}
                control={<Radio size="small" sx={{ color: '#A22', '&.Mui-checked': { color: '#A22' } }} />}
                label={<Typography sx={{ fontSize: 13 }}>Parcel</Typography>}
              />
            )}
          </RadioGroup>

          {/* Search row */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-end">
            {searchType !== 'rmDriver' && (
              <Stack spacing={0.5} sx={{ minWidth: 160 }}>
                <Typography sx={{ fontSize: 12, color: '#555' }}>
                  Search By <span style={{ color: 'red' }}>*</span>
                </Typography>
                <StyledTextField
                  select
                  variant="standard"
                  size="small"
                  value={searchBy}
                  onChange={(e) => setSearchBy(e.target.value)}
                  disabled={isSearchDisabled}
                  sx={{ minWidth: 160 }}
                >
                  {SEARCH_BY_OPTIONS.map((opt) => (
                    <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                  ))}
                </StyledTextField>
              </Stack>
            )}

            {/* PRO / value input */}
            <StyledTextField
              variant="standard"
              size="small"
              required
              label={searchType === 'rmDriver' ? 'Pro' : searchBy}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              disabled={isSearchDisabled}
              sx={{ minWidth: 200 }}
            />

            <Button
              variant="contained"
              size="small"
              onClick={handleSearch}
              disabled={isSearchDisabled}
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
            {!warehouseReceiptSearch.data.rows || warehouseReceiptSearch.data.rows.length === 0 ? null : (
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
                    rows={warehouseReceiptSearch.data.rows?.filter((row) => !rejectedRowIds.includes(row.id)) || []}
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
                          onChange={(e) => {
                            updateReceipt(pr.key, () => ({ receivedBy: e.target.value }));
                            if (e.target.value.trim()) {
                              setReceiptErrors((prev) => ({ ...prev, [pr.key]: { ...prev[pr.key], receivedBy: '' } }));
                            }
                          }}
                          error={!!receiptErrors[pr.key]?.receivedBy}
                          helperText={receiptErrors[pr.key]?.receivedBy || ' '}
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
                              New Form {fIdx + 1} - {form.receiptNumber || pr.row.receiptNumber}
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
                            {showTrailerFreightHeader && (
                              <Stack
                                direction={{ xs: 'column', md: 'row' }}
                                spacing={2}
                                alignItems={{ xs: 'stretch', md: 'flex-end' }}
                                justifyContent="space-between"
                              >
                                <Stack
                                  direction={{ xs: 'column', sm: 'row' }}
                                  spacing={3}
                                  sx={{ flex: 1, minWidth: 0 }}
                                >
                                  <Stack spacing={0.3} sx={{ width: { xs: '100%', sm: 260 }, minWidth: 0 }}>
                                    <Typography sx={{ fontSize: 11, color: '#555' }}>
                                      Destination <span style={{ color: 'red' }}>*</span>
                                    </Typography>
                                    <StyledTextField
                                      variant="standard"
                                      size="small"
                                      value={form.destination || ''}
                                      onChange={(e) => {
                                        updateFormField(pr.key, form.id, 'destination', e.target.value);
                                        clearFormFieldError(pr.key, form.id, 'destination', e.target.value);
                                      }}
                                      error={!!receiptErrors[pr.key]?.formFields?.[getFormErrorKey(form.id, 'destination')]}
                                      helperText={receiptErrors[pr.key]?.formFields?.[getFormErrorKey(form.id, 'destination')] || ' '}
                                      inputProps={{ style: { fontSize: 13 } }}
                                    />
                                  </Stack>
                                  <Stack spacing={0.3} sx={{ width: { xs: '100%', sm: 260 }, minWidth: 0 }}>
                                    <Typography sx={{ fontSize: 11, color: '#555' }}>
                                      Package ID <span style={{ color: 'red' }}>*</span>
                                    </Typography>
                                    <StyledTextField
                                      variant="standard"
                                      size="small"
                                      value={form.customerRefNoPackageId || ''}
                                      onChange={(e) => {
                                        updateFormField(pr.key, form.id, 'customerRefNoPackageId', e.target.value);
                                        clearFormFieldError(pr.key, form.id, 'customerRefNoPackageId', e.target.value);
                                      }}
                                      error={
                                        !!receiptErrors[pr.key]?.formFields?.[
                                          getFormErrorKey(form.id, 'customerRefNoPackageId')
                                        ]
                                      }
                                      helperText={
                                        receiptErrors[pr.key]?.formFields?.[
                                          getFormErrorKey(form.id, 'customerRefNoPackageId')
                                        ] || ' '
                                      }
                                      inputProps={{ style: { fontSize: 13 } }}
                                    />
                                  </Stack>
                                </Stack>
                                <Button
                                  variant="contained"
                                  size="small"
                                  startIcon={<Iconify icon="mdi:printer" width={16} />}
                                  onClick={handleOpenPrinterDialog}
                                  sx={{ ...actionBtnSx, minWidth: 76, alignSelf: { xs: 'flex-end', md: 'flex-start' } }}
                                >
                                  Print
                                </Button>
                              </Stack>
                            )}
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
                                    onChange={(e) => {
                                      updateItem(pr.key, form.id, item.id, 'pieces', e.target.value);
                                      clearItemError(pr.key, form.id, item.id, 'pieces', e.target.value);
                                    }}
                                    error={!!receiptErrors[pr.key]?.items?.[getItemErrorKey(form.id, item.id, 'pieces')]}
                                    helperText={receiptErrors[pr.key]?.items?.[getItemErrorKey(form.id, item.id, 'pieces')] || ' '}
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
                                    onChange={(e) => {
                                      updateItem(pr.key, form.id, item.id, 'type', e.target.value);
                                      clearItemError(pr.key, form.id, item.id, 'type', e.target.value);
                                    }}
                                    error={!!receiptErrors[pr.key]?.items?.[getItemErrorKey(form.id, item.id, 'type')]}
                                    helperText={receiptErrors[pr.key]?.items?.[getItemErrorKey(form.id, item.id, 'type')] || ' '}
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
                                      onChange={(e) => {
                                        updateItem(pr.key, form.id, item.id, field, e.target.value);
                                        clearItemError(pr.key, form.id, item.id, field, e.target.value);
                                      }}
                                      error={!!receiptErrors[pr.key]?.items?.[getItemErrorKey(form.id, item.id, field)]}
                                      helperText={receiptErrors[pr.key]?.items?.[getItemErrorKey(form.id, item.id, field)] || ' '}
                                      inputProps={{ style: { fontSize: 13 } }}
                                    />
                                  </Stack>
                                ))}

                                {/* Action icons */}
                                <Stack direction="row" spacing={0.7} alignItems="center" sx={{ pb: 0.5 }}>
                                  <IconButton
                                    size="small"
                                    onClick={() => removeItem(pr.key, form.id, item.id)}
                                    title="Delete item"
                                    sx={{ p: 0.4 }}
                                  >
                                    <Iconify
                                      icon="mdi:trash-can"
                                      width={24}
                                      sx={{ color: '#000' }}
                                    />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    title="Package details"
                                    onClick={(event) => handlePackageDetailsClick(event, pr.key, form.id, item.id)}
                                    sx={{ p: 0.4 }}
                                  >
                                    <Iconify icon="mdi:cube" width={28} sx={{ color: '#000' }} />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    title="Upload image"
                                    onClick={() => handleOpenImageUpload(pr.key, form.id, item.id, item.images || [])}
                                    sx={{ p: 0.4 }}
                                  >
                                    <Iconify icon="mdi:image-plus" width={28} sx={{ color: '#000' }} />
                                  </IconButton>
                                  {(item.images?.length || 0) > 0 && (
                                    <IconButton
                                      size="small"
                                      title="View images"
                                      onClick={() =>
                                        handleOpenImagePreview(
                                          item.images || [],
                                          `Item ${String(iIdx + 1).padStart(2, '0')}`,
                                          { key: pr.key, formId: form.id, itemId: item.id }
                                        )
                                      }
                                      sx={{ p: 0.4, position: 'relative' }}
                                    >
                                      <Iconify icon="mdi:image-multiple" width={30} sx={{ color: '#000' }} />
                                      <Box
                                        sx={{
                                          position: 'absolute',
                                          top: -5,
                                          right: -3,
                                          width: 22,
                                          height: 22,
                                          borderRadius: '50%',
                                          bgcolor: '#102a63',
                                          color: '#fff',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          fontSize: 14,
                                          fontWeight: 700,
                                          lineHeight: 1,
                                        }}
                                      >
                                        {item.images.length}
                                      </Box>
                                    </IconButton>
                                  )}
                                </Stack>
                              </Stack>
                            ))}

                            {!showTrailerFreightHeader && (
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
                            )}
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
                      disabled={!!tempReceiptLoading[pr.key]}
                      sx={{ ...actionBtnSx, minWidth: 110, height: 32 }}
                    >
                      {tempReceiptLoading[pr.key] ? (
                        <>
                          <CircularProgress size={14} sx={{ color: 'white', mr: 1 }} />
                          Adding...
                        </>
                      ) : (
                        'Add New Form'
                      )}
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
            disabled={rejectLoading}
            sx={{ textTransform: 'none', color: '#333', borderColor: '#aaa' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            size="small"
            disabled={!rejectReason.trim() || rejectLoading}
            onClick={handleRejectSubmit}
            sx={{ ...actionBtnSx, height: 32 }}
          >
            {rejectLoading ? (
              <>
                <CircularProgress size={16} sx={{ color: 'white', mr: 1 }} />
                Rejecting...
              </>
            ) : (
              'Reject'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={printerDialogOpen} onClose={handleClosePrinterDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16, pr: 5 }}>
          Select Printer
          <IconButton
            onClick={handleClosePrinterDialog}
            size="small"
            sx={{ position: 'absolute', right: 12, top: 12 }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-end">
            <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: 12, color: '#555' }}>
                Printer <span style={{ color: 'red' }}>*</span>
              </Typography>
              <StyledTextField
                select
                size="small"
                value={selectedPrinterId}
                onChange={(event) => setSelectedPrinterId(event.target.value)}
                disabled={printersDropdown.loading}
                helperText={printersDropdown.error || ''}
                error={Boolean(printersDropdown.error)}
                sx={{ width: '100%' }}
              >
                {printersDropdown.loading ? (
                  <MenuItem value="" disabled>
                    Loading printers...
                  </MenuItem>
                ) : printersDropdown.data.length > 0 ? (
                  printersDropdown.data.map((printer) => (
                    <MenuItem key={printer.printerId} value={printer.printerId}>
                      {printer.printerName}
                      {printer.printerIP ? ` - ${printer.printerIP}` : ''}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem value="" disabled>
                    No printers available
                  </MenuItem>
                )}
              </StyledTextField>
            </Stack>
            <Button
              variant="contained"
              size="small"
              startIcon={<Iconify icon="mdi:printer" width={16} />}
              disabled={printersDropdown.loading || !selectedPrinterId}
              onClick={handlePrint}
              sx={{ ...actionBtnSx, height: 36, minWidth: 82, mt: { xs: 0, sm: '21px' } }}
            >
              Print
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>

      {/* No Data Dialog */}
      <Dialog open={noDataDialogOpen} onClose={() => {
        setNoDataDialogOpen(false);
        dispatch(clearReceiptSearch());
      }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16, pr: 5 }}>
          No Data Available
          <IconButton
            onClick={() => {
              setNoDataDialogOpen(false);
              dispatch(clearReceiptSearch());
            }}
            size="small"
            sx={{ position: 'absolute', right: 12, top: 12 }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Typography sx={{ fontSize: 14 }}>
            No data available for PRO number <strong>{warehouseReceiptSearch.data?.proNumber}</strong>.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button
            variant="contained"
            size="small"
            onClick={() => {
              setNoDataDialogOpen(false);
              dispatch(clearReceiptSearch());
            }}
            sx={{ ...actionBtnSx, height: 32 }}
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={imagePreviewDialog.open} onClose={handleCloseImagePreview} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16, pr: 5 }}>
          Uploaded Images - {imagePreviewDialog.itemLabel}
          <IconButton
            onClick={handleCloseImagePreview}
            size="small"
            sx={{ position: 'absolute', right: 12, top: 12 }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {imagePreviewDialog.images.length === 0 ? (
            <Typography sx={{ fontSize: 13 }}>No uploaded images available.</Typography>
          ) : (
            <Stack direction="row" flexWrap="wrap" gap={2}>
              {imagePreviewDialog.images.map((file, index) => {
                const imageUrl = getImageUrl(file);

                return (
                  <Stack key={`${getImageName(file, index)}-${index}`} spacing={0.7} sx={{ width: 170 }}>
                    <Box
                      sx={{
                        position: 'relative',
                        width: 170,
                        height: 130,
                        border: '1px solid #d0d0d0',
                        borderRadius: 1,
                        overflow: 'hidden',
                        bgcolor: '#f7f7f7',
                      }}
                    >
                      {imageUrl ? (
                        <Box
                          component="img"
                          src={imageUrl}
                          alt={getImageName(file, index)}
                          sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <Stack alignItems="center" justifyContent="center" sx={{ height: '100%', opacity: 0.5 }}>
                          <Iconify icon="mdi:image-off" width={28} />
                        </Stack>
                      )}
                      <IconButton
                        size="small"
                        title="Remove image"
                        onClick={() => handleRemovePreviewImage(index)}
                        sx={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          bgcolor: 'rgba(255,255,255,0.9)',
                          color: '#A22',
                          '&:hover': { bgcolor: '#fff' },
                        }}
                      >
                        <Iconify icon="mdi:close-circle" width={18} />
                      </IconButton>
                    </Box>
                    <Typography sx={{ fontSize: 12, wordBreak: 'break-word' }}>
                      {getImageName(file, index)}
                    </Typography>
                  </Stack>
                );
              })}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button
            variant="contained"
            size="small"
            onClick={handleCloseImagePreview}
            sx={{ ...actionBtnSx, height: 32, minWidth: 70 }}
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>

      {/* Image Upload Dialog */}
      <Dialog open={uploadDialog.open} onClose={handleCloseImageUpload} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16, pr: 5 }}>
          {uploadDialog.mode === 'view' ? 'Uploaded Images' : 'Image Upload'}
          <IconButton
            onClick={handleCloseImageUpload}
            size="small"
            sx={{ position: 'absolute', right: 12, top: 12 }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.jif"
            style={{ display: 'none' }}
            onChange={handleFileSelection}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={handleFileSelection}
          />

          <Stack spacing={2}>
            {uploadDialog.mode !== 'view' && (
              <Typography sx={{ fontSize: 14, fontWeight: 600 }}>File Upload</Typography>
            )}
            <Stack direction={{ xs: 'column', md: 'row' }} sx={{ border: '1px dashed #a0a0a0', borderRadius: 2, p: 2 }}>
              {uploadDialog.mode !== 'view' && (
                <Stack
                  sx={{
                    width: { xs: '100%', md: '50%' },
                    borderRight: { xs: 'none', md: '1px solid #e0e0e0' },
                    borderBottom: { xs: '1px solid #e0e0e0', md: 'none' },
                    pr: { xs: 0, md: 2 },
                    pb: { xs: 2, md: 0 },
                    mb: { xs: 2, md: 0 },
                    bgcolor: isDraggingFiles ? '#fff3f3' : 'transparent',
                    borderRadius: 1,
                    transition: 'background-color 0.2s ease',
                    minHeight: 180,
                  }}
                  alignItems="center"
                  justifyContent="center"
                  spacing={1}
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleFileDrop}
                >
                  <Iconify icon="mdi:tray-arrow-up" width={32} color="#A22" />
                  <Typography sx={{ fontWeight: 600, fontSize: 14 }}>Drag & Drop File</Typography>
                  <Typography sx={{ fontSize: 11, color: '#777' }}>File Supported: Image, JIF</Typography>
                  <Typography sx={{ fontSize: 14, fontWeight: 600, my: 0.5 }}>OR</Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <IconButton
                      size="small"
                      onClick={handleCaptureImage}
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
                      onClick={handleBrowseFiles}
                      sx={{ ...actionBtnSx, height: 32 }}
                    >
                      Browse Files
                    </Button>
                  </Stack>
                </Stack>
              )}

              <Stack sx={{ width: uploadDialog.mode === 'view' ? '100%' : { xs: '100%', md: '50%' }, pl: uploadDialog.mode === 'view' ? 0 : { xs: 0, md: 2 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography sx={{ fontWeight: 600, fontSize: 13 }}>Uploaded Files</Typography>
                  <Typography sx={{ fontSize: 12, color: '#555' }}>{stagedFiles.length} file(s)</Typography>
                </Stack>
                <Divider sx={{ mb: 1 }} />

                {stagedFiles.length === 0 ? (
                  <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 140, opacity: 0.5 }} spacing={1}>
                    <Iconify icon="mdi:file-document-multiple" width={32} />
                    <Typography sx={{ fontSize: 12 }}>No Files</Typography>
                  </Stack>
                ) : (
                  <Box sx={{ maxHeight: 180, overflowY: 'auto', pr: 1 }}>
                    {stagedFiles.map((file, idx) => (
                      <FileItem
                        key={`${file.name}-${file.lastModified || idx}-${idx}`}
                        filename={file.name}
                        onView={() => handleViewStagedFile(file)}
                        onRemove={uploadDialog.mode === 'view' ? undefined : () => handleRemoveStagedFile(idx)}
                        hideRemove={uploadDialog.mode === 'view'}
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
            onClick={handleCloseImageUpload}
            sx={{ textTransform: 'none', color: '#333', borderColor: '#aaa' }}
          >
            Cancel
          </Button>
          {uploadDialog.mode !== 'view' && (
            <Button
              variant="contained"
              size="small"
              onClick={handleUploadImages}
              sx={{ ...actionBtnSx, height: 32 }}
            >
              Upload
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Dialog open={cameraDialogOpen} onClose={handleCloseCamera} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16, pr: 5 }}>
          Capture Image
          <IconButton
            onClick={handleCloseCamera}
            size="small"
            sx={{ position: 'absolute', right: 12, top: 12 }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box
            component="video"
            ref={cameraVideoRef}
            autoPlay
            playsInline
            muted
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
            onClick={handleCloseCamera}
            sx={{ textTransform: 'none', color: '#333', borderColor: '#aaa' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={handleTakePhoto}
            sx={{ ...actionBtnSx, height: 32 }}
          >
            Capture
          </Button>
        </DialogActions>
      </Dialog>

      <Popover
        open={Boolean(packageDropdownAnchor)}
        anchorEl={packageDropdownAnchor}
        onClose={handleClosePackageDropdown}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        PaperProps={{
          sx: {
            mt: 0.5,
            minWidth: 180,
            maxWidth: 260,
            maxHeight: 280,
            border: '1px solid #d9d9d9',
            boxShadow: '0 8px 20px rgba(0,0,0,0.12)',
          },
        }}
      >
        {cargoApiDropdown.loading ? (
          <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 2, py: 1.5 }}>
            <CircularProgress size={16} />
            <Typography sx={{ fontSize: 12 }}>Loading...</Typography>
          </Stack>
        ) : cargoApiDropdown.error ? (
          <Typography sx={{ px: 2, py: 1.5, fontSize: 12, color: 'error.main' }}>
            {cargoApiDropdown.error}
          </Typography>
        ) : cargoApiDropdown.data.length > 0 ? (
          <MenuList dense sx={{ py: 0.5 }}>
            {cargoApiDropdown.data.map((option, index) => (
              <MenuItem
                key={option?.apiId || option?.id || option?.value || option?.code || index}
                onClick={() => handlePackageOptionSelect(option)}
                sx={{ fontSize: 12, minHeight: 30 }}
              >
                {getDropdownOptionLabel(option)}
              </MenuItem>
            ))}
          </MenuList>
        ) : (
          <Typography sx={{ px: 2, py: 1.5, fontSize: 12 }}>No package details available</Typography>
        )}
      </Popover>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </ShipmentFormLayout>
  );
}

