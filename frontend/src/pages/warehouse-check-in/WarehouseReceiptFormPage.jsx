import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  Alert,
  Snackbar,
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
  Autocomplete,
  useMediaQuery,
} from '@mui/material';
import Iconify from '../../components/iconify';
import StyledTextField from '../../sections/shared/StyledTextField';
import rmLogo from '../../assets/RM.png';
import { useDispatch, useSelector } from '../../redux/store';
import { searchCustomers } from '../../redux/slices/enroute';
import { getIdVerificationData } from '../../redux/slices/idVerification';
import {
  clearWarehouseCheckInDraft,
  fetchPrintersDropdown,
  printWarehouseReceiptLabel,
  setWarehouseCheckInDraft,
  submitWarehouseReceiptBatch,
} from '../../redux/slices/warehouse';
import {
  getWarehouseReceiptAuditLogs,
  getWarehouseReceiptNotes,
  postWarehouseReceiptNote,
} from '../../redux/slices/warehouseReceipt';
import { PATH_DASHBOARD } from '../../routes/paths';
import { HOST_API_KEY } from '../../config';

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

const comingSoonBtnSx = {
  bgcolor: '#e5e5e5',
  color: '#8f8f8f',
  textTransform: 'none',
  '&:hover': { bgcolor: '#dedede' },
};

const fieldSx = {
  '& .MuiInputBase-input': { fontSize: 13, py: 0.2 },
  '& .MuiFormHelperText-root': { display: 'none' },
};

const FREIGHT_CONDITION_OPTIONS = ['Banded Skid', 'Shrink Wrapped Skid', 'SHT / IPPC Skid', 'Plastic Skid', 'Document'];

const createFreightInfo = () => ({
  conditions: {},
  badFreightCondition: false,
  freightConditionImages: [],
  hazMat: false,
  originalDgd: false,
  unNumbers: [],
  hazmatClasses: [],
  unNumberInput: '',
  hazmatClassInput: '',
  properShippingName: '',
  freightConditionDescription: '',
  hazardousDescription: '',
  notes: '',
});

const toNumberOrNull = (value) => {
  if (value === undefined || value === null || value === '') return null;

  const numberValue = Number(value);
  return Number.isNaN(numberValue) ? null : numberValue;
};

const formatDecimal10_2Input = (value) => {
  const inputValue = String(value ?? '').replace(/[^\d.]/g, '');
  const hasDecimal = inputValue.includes('.');
  const [integerPart = '', ...decimalParts] = inputValue.split('.');
  const integerValue = integerPart.slice(0, 8);
  const decimalValue = decimalParts.join('').slice(0, 2);

  return hasDecimal ? `${integerValue || '0'}.${decimalValue}` : integerValue;
};

const toDecimal10_2NumberOrNull = (value) => toNumberOrNull(formatDecimal10_2Input(value));

const calculateItemCbm = (item) =>
  Number(formatDecimal10_2Input(item.length)) *
  Number(formatDecimal10_2Input(item.width)) *
  Number(formatDecimal10_2Input(item.height));

const formatMeasurement = (value) => {
  if (!value) return 0;
  return Number.isInteger(value) ? value : Number(value.toFixed(3));
};

const normalizeEmailList = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];

  if (typeof value === 'string') {
    const trimmedValue = value.trim();
    if (!trimmedValue) return [];

    try {
      const parsedValue = JSON.parse(trimmedValue);
      if (Array.isArray(parsedValue)) return parsedValue.filter(Boolean);
    } catch {
      // Fall back to comma-separated parsing below.
    }

    return trimmedValue
      .split(',')
      .map((email) => email.trim())
      .filter(Boolean);
  }

  return [value].filter(Boolean);
};

const toValueOrNull = (value) => {
  if (value === undefined || value === null) return null;
  const stringValue = String(value).trim();
  return stringValue ? value : null;
};

const toLimitedValueOrNull = (value, maxLength) => {
  const limitedValue = String(value || '').slice(0, maxLength);
  return toValueOrNull(limitedValue);
};

const toYesNo = (value) => (value ? 'Y' : 'N');

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    if (!file) {
      resolve('');
      return;
    }

    if (typeof file === 'string') {
      resolve(file.includes(',') ? file.split(',').pop() : file);
      return;
    }

    if (!(file instanceof Blob)) {
      resolve('');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      resolve(result.includes(',') ? result.split(',').pop() : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const getFileExtension = (file) => {
  if (file?.name?.includes('.')) return file.name.split('.').pop();
  if (file?.type?.includes('/')) return file.type.split('/').pop();
  return 'jpg';
};

const toRenamedImageFile = async (image, fieldName) => {
  if (image instanceof File) {
    return new File([image], `${fieldName}.${getFileExtension(image)}`, {
      type: image.type || 'image/jpeg',
    });
  }

  if (typeof image === 'string' && image.startsWith('data:')) {
    const response = await fetch(image);
    const blob = await response.blob();
    return new File([blob], `${fieldName}.${getFileExtension(blob)}`, {
      type: blob.type || 'image/jpeg',
    });
  }

  return image;
};

const getRowValue = (row, fields, fallback = '') => {
  const fieldList = Array.isArray(fields) ? fields : [fields];
  const field = fieldList.find((name) => row?.[name] !== undefined && row?.[name] !== null && row?.[name] !== '');
  return field ? row[field] : fallback;
};

const getCustomerOptionLabel = (option) => {
  if (!option) return '';
  if (typeof option === 'string') return option;

  const customerName = option.customerName || option.name || option.label || '';
  const stationName = option.stationName || '';
  return stationName ? `${customerName} | ${stationName}` : customerName;
};

const buildCustomerSelection = (row = {}) => {
  const customerDisplay = getRowValue(row, ['customer', 'customerName'], '');
  if (!customerDisplay) return null;

  const [customerName, stationName] = String(customerDisplay).split('|').map((value) => value.trim());

  return {
    customerId: row.customerId,
    customerName: row.customerName || customerName,
    stationId: row.stationId,
    stationName: row.stationName || stationName || '',
  };
};

const formatDate = (date = new Date()) =>
  date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

const formatStatusHistoryTime = (value) => {
  if (!value) return '';

  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
  const date = match
    ? new Date(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3]),
        Number(match[4]),
        Number(match[5]),
        Number(match[6] || 0)
      )
    : new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const buildEmptyReceiptForms = () => [
  {
    id: 'empty-1',
    label: 'Form 1',
    receiptNumber: '',
    receivedBy: '',
    location: '',
    customerSelection: null,
    freightInfo: createFreightInfo(),
    row: {},
    items: [{ id: 1, pieces: '', type: '', length: '', width: '', height: '', weight: '', images: [] }],
  },
];

const FREIGHT_OPTION_FIELD_MAP = {
  'Banded Skid': 'Banded Skid',
  'Shrink Wrapped Skid': 'Shrink Wrapped Skid',
  'SHT / IPPC Skid': 'SHT / IPPC Skid',
  'SHPT / PPC Skid': 'SHT / IPPC Skid',
  'Plastic Skid': 'Plastic Skid',
  Document: 'Document',
};

const applyFreightOptionToInfo = (freightInfo, option) => {
  if (option === 'Bad Freight Condition') {
    freightInfo.badFreightCondition = true;
    return;
  }

  if (option === 'Haz Mat') {
    freightInfo.hazMat = true;
    return;
  }

  const conditionKey = FREIGHT_OPTION_FIELD_MAP[option];
  if (conditionKey) {
    freightInfo.conditions[conditionKey] = true;
  }
};

const buildFreightInfoFromForm = (form = {}) => {
  const suppliedFreightInfo = form.freightInfo || {};
  const suppliedFreightConditionImages = suppliedFreightInfo.freightConditionImages || [];
  const freightInfo = {
    ...createFreightInfo(),
    ...suppliedFreightInfo,
    conditions: {
      ...createFreightInfo().conditions,
      ...(suppliedFreightInfo.conditions || {}),
    },
    freightConditionImages: [...suppliedFreightConditionImages],
  };
  const items = form.items || [];

  (form.freightOptions || []).forEach((option) => applyFreightOptionToInfo(freightInfo, option));
  if (!suppliedFreightConditionImages.length && form.badFreightImages?.length) {
    freightInfo.badFreightCondition = true;
    freightInfo.freightConditionImages.push(...form.badFreightImages);
  }

  // Backward compatibility for drafts created before freight options became form-level.
  items.forEach((item) => {
    (item.freightOptions || []).forEach((option) => applyFreightOptionToInfo(freightInfo, option));

    if (item.badFreightImages?.length) {
      freightInfo.badFreightCondition = true;
      freightInfo.freightConditionImages.push(...item.badFreightImages);
    }
  });

  return freightInfo;
};

const getFormsFromState = (receipts = []) =>
  receipts.flatMap((receipt, receiptIndex) =>
    receipt.forms.map((form, formIndex) => {
      const customerRefNoPackageId = String(form.customerRefNoPackageId || '').trim();
      const destination = String(form.destination || '').trim();
      const row = {
        ...receipt.row,
        ...(destination ? { destination } : {}),
        ...(customerRefNoPackageId ? { packageId: customerRefNoPackageId } : {}),
      };

      return {
        id: `${receipt.key || receiptIndex}-${form.id}`,
        label: `Form ${formIndex + 1}`,
        receiptNumber: form.receiptNumber || row.receiptNumber || receipt.proNumber || '',
        receivedBy: receipt.receivedBy,
        location: receipt.location,
        customerSelection: buildCustomerSelection(row),
        freightInfo: buildFreightInfoFromForm(form),
        row,
        items: form.items,
      };
    })
  );

const getReceiptFormSignature = (forms = []) =>
  forms
    .map((form) => `${form.id}:${form.receiptNumber || ''}:${form.items?.length || 0}`)
    .join('|');

const SPLIT_MAIL_LIST_ROWS = [
  { id: 1, sno: '01', type: 'Station', emailId: 'Department1@ventanaserra.com' },
  { id: 2, sno: '02', type: 'Department', emailId: 'Department2@ventanaserra.com' },
  { id: 3, sno: '03', type: 'Personal', emailId: 'Department1@ventanaserra.com' },
  { id: 4, sno: '04', type: 'Personal', emailId: 'Department2@ventanaserra.com' },
  { id: 5, sno: '05', type: 'Department', emailId: 'Department1@ventanaserra.com' },
  { id: 6, sno: '06', type: 'Personal', emailId: 'Department2@ventanaserra.com' },
  { id: 7, sno: '07', type: 'Department', emailId: 'Department1@ventanaserra.com' },
  { id: 8, sno: '08', type: 'Department', emailId: 'Department2@ventanaserra.com' },
  { id: 9, sno: '09', type: 'Department', emailId: 'Department1@ventanaserra.com' },
];

const INITIAL_SPLIT_MAIL_SELECTED_IDS = [1, 2, 3, 5];

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

function DisplayField({
  label,
  value,
  required = false,
  width = '100%',
  fieldWidth = '100%',
  editable = false,
  maxLength,
  onChange,
}) {
  const displayValue = maxLength ? String(value || '').slice(0, maxLength) : value || '';

  return (
    <Stack spacing={0.1} sx={{ width, minWidth: 0 }}>
      <Typography sx={{ color: '#555', fontSize: 12 }}>
        {label} {required && <span style={{ color: '#b01818' }}>*</span>}
      </Typography>
      <StyledTextField
        value={displayValue}
        onChange={(event) => {
          const nextValue = maxLength ? event.target.value.slice(0, maxLength) : event.target.value;
          onChange?.(nextValue);
        }}
        variant="standard"
        size="small"
        disabled={!editable}
        inputProps={maxLength ? { maxLength } : undefined}
        sx={{ ...fieldSx, width: fieldWidth }}
      />
    </Stack>
  );
}

function HazmatPill({ label, onRemove, disabled = false }) {
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
      {!disabled && (
        <IconButton size="small" onClick={onRemove} sx={{ p: 0, ml: 0.2 }}>
          <Iconify icon="mdi:close-circle" width={12} sx={{ color: '#0c243f' }} />
        </IconButton>
      )}
    </Box>
  );
}

function TagInputBox({ label, values, inputValue, onInputChange, onAdd, onRemove, disabled = false }) {
  const handleKeyDown = (event) => {
    if (disabled) return;
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      onAdd(inputValue);
    }
  };

  return (
    <Box>
      <Typography sx={{ fontSize: 12, mb: 0.6 }}>{label}</Typography>
      <Box
        sx={{
          minHeight: 64,
          border: '1px solid #8f8f8f',
          borderRadius: 1,
          p: 1,
          display: 'flex',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 0.7,
        }}
      >
        {values.map((value, index) => (
          <HazmatPill key={`${value}-${index}`} label={value} disabled={disabled} onRemove={() => onRemove(index)} />
        ))}
        {!disabled && (
          <TextField
            variant="standard"
            value={inputValue}
            onChange={(event) => onInputChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={values.length ? '' : 'Type and press Enter'}
            sx={{
              minWidth: 150,
              flex: 1,
              '& .MuiInputBase-input': { fontSize: 12, py: 0.2 },
            }}
            InputProps={{ disableUnderline: true }}
          />
        )}
      </Box>
    </Box>
  );
}

function ReceiptInfoRow({ label, value, editable = false, required = false, error = '', maxLength, onChange }) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1}
      sx={{ py: 0.65, borderBottom: '1px solid #adadad' }}
    >
      <Typography sx={{ width: 130, flexShrink: 0, fontSize: 15, color: '#111', whiteSpace: 'nowrap' }}>
        {label} {required && <Box component="span" sx={{ color: '#A22' }}>*</Box>} :
      </Typography>
      <TextField
        value={value || ''}
        onChange={(event) => {
          const nextValue = maxLength ? event.target.value.slice(0, maxLength) : event.target.value;
          onChange?.(nextValue);
        }}
        size="small"
        fullWidth
        error={Boolean(error)}
        helperText={error || ''}
        InputProps={{ readOnly: !editable }}
        inputProps={maxLength ? { maxLength } : undefined}
        sx={{
          '& .MuiInputBase-root': { height: 30, bgcolor: '#fff', borderRadius: 0.8 },
          '& .MuiInputBase-input': { py: 0, fontSize: 15, fontWeight: 700 },
          '& fieldset': { borderColor: '#d6d6d6' },
          '& .MuiFormHelperText-root': { m: 0, minHeight: 16, fontSize: 11 },
          ...(editable && {
            '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: '#A22' },
          }),
        }}
      />
    </Stack>
  );
}

const looksLikeBase64Image = (value) => {
  const compactValue = String(value || '').trim();
  return compactValue.length > 80 && /^[A-Za-z0-9+/]+={0,2}$/.test(compactValue);
};

const getBase64ImageMimeType = (value) => {
  const compactValue = String(value || '').trim();

  if (compactValue.startsWith('/9j/')) return 'image/jpeg';
  if (compactValue.startsWith('iVBORw0KGgo')) return 'image/png';
  if (compactValue.startsWith('R0lGOD')) return 'image/gif';
  if (compactValue.startsWith('UklGR')) return 'image/webp';
  return 'image/jpeg';
};

const WAREHOUSE_IMAGE_UPLOAD_PATHS = {
  freight: '/api/uploads/warehouse/freight-image',
  badFreight: '/api/uploads/warehouse/bad-freight-image',
};

const getApiRoot = () => String(HOST_API_KEY || '').replace(/\/api\/?$/i, '').replace(/\/$/, '');

const isDirectImageSource = (value) => /^(data:image\/|https?:\/\/|blob:)/i.test(value);

const getUploadImageUrl = (imageName, imageType = 'freight') => {
  const cleanImageName = String(imageName || '').trim();
  if (!cleanImageName) return '';
  if (isDirectImageSource(cleanImageName)) return cleanImageName;
  if (looksLikeBase64Image(cleanImageName)) return `data:${getBase64ImageMimeType(cleanImageName)};base64,${cleanImageName}`;

  const cleanPath = cleanImageName.replace(/^\/+/, '');
  if (cleanPath.startsWith('api/uploads/')) return `${getApiRoot()}/${cleanPath}`;

  const uploadPath = WAREHOUSE_IMAGE_UPLOAD_PATHS[imageType] || WAREHOUSE_IMAGE_UPLOAD_PATHS.freight;
  return `${getApiRoot()}${uploadPath}/${encodeURIComponent(cleanPath.split('/').pop() || cleanPath)}`;
};

const getImageUrl = (file, imageType = 'freight') => {
  if (!file) return '';
  if (typeof file === 'string') {
    const image = file.trim();
    return getUploadImageUrl(image, imageType);
  }
  if (file instanceof File) return URL.createObjectURL(file);
  if (file.url) return getUploadImageUrl(file.url, imageType);
  if (file.preview) return getUploadImageUrl(file.preview, imageType);
  if (file.base64) return getImageUrl(file.base64, imageType);
  if (file.image) return getImageUrl(file.image, imageType);
  if (file.fileName) return getUploadImageUrl(file.fileName, imageType);
  if (file.filename) return getUploadImageUrl(file.filename, imageType);
  if (file.imageName) return getUploadImageUrl(file.imageName, imageType);
  if (file.path) return getUploadImageUrl(file.path, imageType);
  if (file.filePath) return getUploadImageUrl(file.filePath, imageType);
  if (file.imagePath) return getUploadImageUrl(file.imagePath, imageType);
  if (file.name) return getUploadImageUrl(file.name, imageType);
  return '';
};

const getImageName = (file, index) => {
  if (!file) return `Image ${index + 1}`;
  if (typeof file === 'string') {
    if (looksLikeBase64Image(file) || file.startsWith('data:image/')) return `Cargo API Image ${index + 1}`;
    return file.split('/').pop() || `Image ${index + 1}`;
  }
  return file.name || file.filename || file.fileName || file.imageName || file.path?.split('/').pop() || file.filePath?.split('/').pop() || file.imagePath?.split('/').pop() || `Image ${index + 1}`;
};

const getCargoApiImageValue = (image) => {
  if (!image) return '';
  if (typeof image === 'string') return image.trim();
  if (image instanceof Blob) return '';

  return (
    image.base64 ||
    image.image ||
    image.data ||
    image.url ||
    image.preview ||
    image.fileName ||
    image.filename ||
    image.imageName ||
    image.path ||
    image.filePath ||
    image.imagePath ||
    ''
  );
};

function WarehouseImage({ file, imageType = 'freight', alt = '', sx, ...props }) {
  const sourceUrl = getImageUrl(file, imageType);

  if (!sourceUrl) {
    return (
      <Stack
        alignItems="center"
        justifyContent="center"
        sx={{ bgcolor: '#f7f7f7', color: '#888', ...sx }}
      >
        <Iconify icon="mdi:image-off" width={28} />
      </Stack>
    );
  }

  return <Box component="img" src={sourceUrl} alt={alt} sx={sx} {...props} />;
}

const getSubmittedImageValue = async (image) => {
  const cargoImageValue = getCargoApiImageValue(image);

  if (cargoImageValue) {
    const cleanValue = String(cargoImageValue).trim();
    if (!cleanValue) return '';
    if (/^(https?:\/\/|blob:)/i.test(cleanValue)) return cleanValue;
    if (cleanValue.startsWith('data:image/')) {
      const base64Value = cleanValue.includes(',') ? cleanValue.split(',').pop() : cleanValue;
      return base64Value ? `base64,${base64Value}` : '';
    }
    if (cleanValue.startsWith('base64,')) return cleanValue;
    return looksLikeBase64Image(cleanValue) ? `base64,${cleanValue}` : cleanValue;
  }

  const base64Image = await fileToBase64(image);
  if (!base64Image) return '';

  return base64Image.startsWith('base64,') ? base64Image : `base64,${base64Image}`;
};

const getReceiptNumbersFromResponse = (response) => {
  const receiptNumbers = response?.data?.receiptNumbers || [];
  if (receiptNumbers.length) return [...new Set(receiptNumbers.filter(Boolean))];

  const updatedNumbers = response?.data?.updated?.map((receipt) => receipt.receiptNumber).filter(Boolean) || [];
  const createdNumbers = response?.data?.created?.map((receipt) => receipt.receiptNumber).filter(Boolean) || [];
  return [...new Set([...updatedNumbers, ...createdNumbers])];
};

export default function WarehouseReceiptFormPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { state } = useLocation();
  const { customerOptions, customerLoading } = useSelector((reduxState) => reduxState.enroutedata);
  const { warehouseReceiptBatch, printersDropdown, warehouseCheckInDrafts } = useSelector((reduxState) => reduxState.warehousedata);
  const {
    auditLogs,
    auditLogsLoading,
    auditLogsError,
    receiptNotes,
    receiptNotesLoading,
    receiptNotesSaving,
    receiptNotesError,
  } = useSelector((reduxState) => reduxState.warehouseReceiptdata);
  const isMobileReceiptForm = useMediaQuery('(max-width:599.95px)', { noSsr: true });
  const isSelectingCustomerRef = useRef(false);
  const freightCameraVideoRef = useRef(null);
  const freightCameraStreamRef = useRef(null);
  const freightCameraInputRef = useRef(null);
  const freightUploadInputRef = useRef(null);
  const selectedDraftKey = state?.draftKey || 'regular';
  const isWarehouseReceiptView = Boolean(state?.warehouseReceiptView);
  const isWarehouseReceiptEdit = Boolean(state?.warehouseReceiptEdit);
  const viewReceiptSummary = state?.viewReceiptSummary || null;
  const initialReceiptForms = useMemo(() => {
    const routeReceipts = state?.receipts || [];
    const savedReceiptForms = warehouseCheckInDrafts?.[selectedDraftKey]?.receiptForms || [];

    if (routeReceipts.length) {
      const routeForms = getFormsFromState(routeReceipts);
      const canUseSavedForms =
        savedReceiptForms.length > 0 &&
        getReceiptFormSignature(savedReceiptForms) === getReceiptFormSignature(routeForms);

      if (canUseSavedForms) return savedReceiptForms;
      return routeForms.length ? routeForms : buildEmptyReceiptForms();
    }

    if (savedReceiptForms.length) return savedReceiptForms;

    const draftReceipts =
      warehouseCheckInDrafts?.[selectedDraftKey]?.proceededReceipts ||
      warehouseCheckInDrafts?.regular?.proceededReceipts ||
      warehouseCheckInDrafts?.trailer?.proceededReceipts ||
      [];
    const sourceReceipts = routeReceipts.length ? routeReceipts : draftReceipts;
    const forms = getFormsFromState(sourceReceipts);
    return forms.length ? forms : buildEmptyReceiptForms();
  }, [state?.receipts, selectedDraftKey, warehouseCheckInDrafts]);
  const [receiptForms, setReceiptForms] = useState(initialReceiptForms);
  const [activeTab, setActiveTab] = useState(initialReceiptForms[0]?.id || '');
  const [imageDialog, setImageDialog] = useState({ open: false, images: [], itemLabel: '', imageType: 'freight' });
  const [fullImageDialog, setFullImageDialog] = useState({ open: false, image: null, title: '', imageType: 'freight' });
  const [receiptInfoErrors, setReceiptInfoErrors] = useState({});
  const [customerSearchValue, setCustomerSearchValue] = useState('');
  const [freightCameraOpen, setFreightCameraOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [successDialog, setSuccessDialog] = useState({ open: false, message: '', receiptNumbers: [] });
  const [printerDialog, setPrinterDialog] = useState({ open: false, receiptNumber: '' });
  const [selectedPrinterId, setSelectedPrinterId] = useState('');
  const [printLoading, setPrintLoading] = useState(false);
  const [ratesDialogOpen, setRatesDialogOpen] = useState(false);
  const [statusHistoryDialogOpen, setStatusHistoryDialogOpen] = useState(false);
  const [statusHistoryLinkLoadingId, setStatusHistoryLinkLoadingId] = useState('');
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [splitMailDialogOpen, setSplitMailDialogOpen] = useState(false);
  const [selectedSplitMailIds, setSelectedSplitMailIds] = useState(INITIAL_SPLIT_MAIL_SELECTED_IDS);
  const [splitDialogOpen, setSplitDialogOpen] = useState(false);
  const [splitStep, setSplitStep] = useState(0);
  const [splitDimensionMode, setSplitDimensionMode] = useState('recalculate');
  const [splitFormCount, setSplitFormCount] = useState(1);
  const [activeSplitFormTab, setActiveSplitFormTab] = useState(0);
  const [splitExistingFormItems, setSplitExistingFormItems] = useState([[]]);
  const [receiptNoteText, setReceiptNoteText] = useState(initialReceiptForms[0]?.freightInfo?.notes || '');
  const pageTitle = state?.title || 'Warehouse Check-In / Regular';
  const selectedDraft = warehouseCheckInDrafts?.[selectedDraftKey];
  const persistReceiptFormDraft = (forms = receiptForms) => {
    if (isWarehouseReceiptView || isWarehouseReceiptEdit) return;

    dispatch(setWarehouseCheckInDraft({
      ...(selectedDraft || {}),
      receiptForms: forms,
    }, selectedDraftKey));
  };
  const handleBack = () => {
    if (isWarehouseReceiptView || isWarehouseReceiptEdit) {
      navigate(PATH_DASHBOARD.warehouseReceiptDashboard);
      return;
    }

    persistReceiptFormDraft();
    navigate(
      selectedDraftKey === 'trailer'
        ? PATH_DASHBOARD.warehouseCheckInTrailer
        : PATH_DASHBOARD.warehouseCheckInRegular
    );
  };

  const activeForm = receiptForms.find((form) => form.id === activeTab) || receiptForms[0];
  const totalWeight = activeForm.items.reduce(
    (sum, item) => sum + Number(item.pieces || 0) * Number(item.weight || 0),
    0
  );
  const totalCbm = activeForm.items.reduce((sum, item) => sum + calculateItemCbm(item), 0);
  const row = activeForm.row || {};
  const piecesInland = getRowValue(row, ['piecesInland', 'pieces'], '');
  const weightInland = getRowValue(row, ['weightInland', 'weight'], '');
  const activeFreightInfo = { ...createFreightInfo(), ...(activeForm.freightInfo || {}) };
  const isReceiptDetailsEditable = !isWarehouseReceiptView;

  useEffect(() => {
    if (isSelectingCustomerRef.current) {
      isSelectingCustomerRef.current = false;
      return undefined;
    }

    const timer = setTimeout(() => {
      dispatch(searchCustomers(customerSearchValue));
    }, 500);

    return () => clearTimeout(timer);
  }, [dispatch, customerSearchValue]);

  useEffect(() => () => {
    freightCameraStreamRef.current?.getTracks?.().forEach((track) => track.stop());
    freightCameraStreamRef.current = null;
  }, []);

  useEffect(() => {
    const hasLoadedForms = initialReceiptForms.some((form) => form.id !== 'empty-1');
    const hasPlaceholderForm = receiptForms.length === 1 && receiptForms[0]?.id === 'empty-1';

    if (!hasLoadedForms || !hasPlaceholderForm) return undefined;

    const syncTimer = window.setTimeout(() => {
      setReceiptForms(initialReceiptForms);
      setActiveTab(initialReceiptForms[0]?.id || '');
    }, 0);

    return () => window.clearTimeout(syncTimer);
  }, [initialReceiptForms, receiptForms]);

  // useEffect(() => {
  //   if (!freightCameraOpen || !freightCameraStreamRef.current || !freightCameraVideoRef.current) return;

  //   const video = freightCameraVideoRef.current;
  //   video.srcObject = freightCameraStreamRef.current;
  //   video.muted = true;
  //   video.playsInline = true;
  //   const playVideo = () => video.play?.().catch(() => {});
  //   playVideo();
  //   const retryTimer = window.setTimeout(playVideo, 300);

  //   return () => window.clearTimeout(retryTimer);
  // }, [freightCameraOpen]);

  const updateActiveFormField = (field, value) => {
    setReceiptForms((prev) =>
      prev.map((form) => (form.id === activeTab ? { ...form, [field]: value } : form))
    );
    if ((field === 'receivedBy' || field === 'location') && String(value || '').trim()) {
      setReceiptInfoErrors((prev) => ({
        ...prev,
        [activeTab]: {
          ...(prev[activeTab] || {}),
          [field]: '',
        },
      }));
    }
  };

  const updateActiveRowField = (field, value) => {
    setReceiptForms((prev) =>
      prev.map((form) =>
        form.id === activeTab ? { ...form, row: { ...form.row, [field]: value } } : form
      )
    );
  };

  const updateActiveFreightInfo = (updater) => {
    setReceiptForms((prev) =>
      prev.map((form) => {
        if (form.id !== activeTab) return form;

        const currentFreightInfo = { ...createFreightInfo(), ...(form.freightInfo || {}) };
        const nextFreightInfo = typeof updater === 'function' ? updater(currentFreightInfo) : updater;

        return {
          ...form,
          freightInfo: {
            ...currentFreightInfo,
            ...nextFreightInfo,
          },
        };
      })
    );
  };

  const handleCustomerChange = (newValue) => {
    updateActiveFormField('customerSelection', newValue);

    if (!newValue) {
      setCustomerSearchValue('');
      dispatch(searchCustomers(''));
    }
  };

  const handleOpenImages = (item, index) => {
    setImageDialog({
      open: true,
      images: item.images || [],
      itemLabel: `Item ${String(index + 1).padStart(2, '0')}`,
      imageType: 'freight',
    });
  };

  const handleCloseImages = () => {
    setImageDialog({ open: false, images: [], itemLabel: '', imageType: 'freight' });
    setFullImageDialog({ open: false, image: null, title: '', imageType: 'freight' });
  };

  const handleOpenFullImage = (image, title, imageType = 'freight') => {
    setFullImageDialog({ open: true, image, title, imageType });
  };

  const handleCloseFullImage = () => {
    setFullImageDialog({ open: false, image: null, title: '', imageType: 'freight' });
  };

  const handleRemovePreviewImage = (index) => {
    if (imageDialog.itemLabel !== 'Bad Freight Condition') return;

    updateActiveFreightInfo((info) => ({
      freightConditionImages: info.freightConditionImages.filter((_, imageIndex) => imageIndex !== index),
    }));
    setImageDialog((prev) => ({
      ...prev,
      images: prev.images.filter((_, imageIndex) => imageIndex !== index),
    }));
  };

  const stopFreightCameraStream = () => {
    freightCameraStreamRef.current?.getTracks?.().forEach((track) => track.stop());
    freightCameraStreamRef.current = null;
  };

  const handleOpenFreightCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      freightCameraInputRef.current?.click();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      freightCameraStreamRef.current = stream;
      setFreightCameraOpen(true);
    } catch {
      freightCameraInputRef.current?.click();
    }
  };

  const handleCloseFreightCamera = () => {
    if (freightCameraVideoRef.current) {
      freightCameraVideoRef.current.srcObject = null;
    }
    stopFreightCameraStream();
    setFreightCameraOpen(false);
  };

  const handleTakeFreightPhoto = () => {
    const video = freightCameraVideoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;

      const file = new File([blob], `bad-freight-${Date.now()}.jpg`, { type: 'image/jpeg' });
      updateActiveFreightInfo((info) => ({ freightConditionImages: [...info.freightConditionImages, file] }));
      handleCloseFreightCamera();
    }, 'image/jpeg', 0.92);
  };

  const handleFreightCameraFileSelection = (event) => {
    const files = Array.from(event.target.files || []);
    updateActiveFreightInfo((info) => ({ freightConditionImages: [...info.freightConditionImages, ...files] }));
    event.target.value = '';
  };

  const handleOpenFreightUpload = () => {
    freightUploadInputRef.current?.click();
  };

  const addTagValue = (value, listField, inputField) => {
    const nextValue = value.replace(/,/g, '').trim();
    if (!nextValue) return;

    updateActiveFreightInfo((info) => ({
      [listField]: [...info[listField], nextValue],
      [inputField]: '',
    }));
  };

  const removeTagValue = (index, listField) => {
    updateActiveFreightInfo((info) => ({
      [listField]: info[listField].filter((_, valueIndex) => valueIndex !== index),
    }));
  };

  const buildReceiptPayload = () => ({
    receipts: receiptForms.map((form, formIndex) => {
      const formRow = form.row || {};
      const freightInfo = { ...createFreightInfo(), ...(form.freightInfo || {}) };
      const customerSelection = form.customerSelection || {};
      const freightDetails = (form.items || []).map((item) => {
        const cubicMeter = formatMeasurement(calculateItemCbm(item));

        return {
          pieces: toNumberOrNull(item.pieces),
          type: toValueOrNull(item.type),
          weight: toDecimal10_2NumberOrNull(item.weight),
          length: toDecimal10_2NumberOrNull(item.length),
          width: toDecimal10_2NumberOrNull(item.width),
          height: toDecimal10_2NumberOrNull(item.height),
          cubicMeter,
        };
      });
      const piecesInland = freightDetails.reduce((sum, item) => sum + Number(item.pieces || 0), 0);
      const weightInland = freightDetails.reduce((sum, item) => sum + Number(item.weight || 0), 0);
      const reWeight = freightDetails.reduce(
        (sum, item) => sum + Number(item.pieces || 0) * Number(item.weight || 0),
        0
      );
      const cubicMeter = formatMeasurement(
        freightDetails.reduce((sum, item) => sum + Number(item.cubicMeter || 0), 0)
      );
      const receiptId = formIndex === 0 ? toNumberOrNull(getRowValue(formRow, 'receiptId', null)) : 0;
      const verificationId = toNumberOrNull(formRow.verificationId);
      const hasNoVerificationId = verificationId === 0 || verificationId === null;

      return {
        receipt: {
          receiptId: receiptId || 0,
          receiptNumber: toNumberOrNull(form.receiptNumber || getRowValue(formRow, 'receiptNumber', null)),
          receiptType: selectedDraftKey === 'trailer' ? 'Trailer' : 'Regular',
          receivedBy: toLimitedValueOrNull(form.receivedBy, 100),
          location: toValueOrNull(form.location),
          shipper: toValueOrNull(getRowValue(formRow, ['shipper', 'shipperName'], '')),
          customerId: toNumberOrNull(customerSelection.customerId || formRow.customerId),
          stationId: toNumberOrNull(customerSelection.stationId || formRow.stationId),
          verificationId,
          ...(hasNoVerificationId
            ? { driverName: toValueOrNull(getRowValue(formRow, ['driverName', 'driver'], '')) || '' }
            : {}),
          carrierId: toNumberOrNull(formRow.carrierId),
          piecesInland,
          weightInland,
          reWeight,
          cubicMeter,
          proNumber: toValueOrNull(getRowValue(formRow, 'proNumber', '')),
          toEmails: normalizeEmailList(getRowValue(formRow, 'toEmails', [])),
          invoiceNumber: toLimitedValueOrNull(getRowValue(formRow, ['invoiceNo', 'invoiceNumber'], ''), 50),
          poNumber: toLimitedValueOrNull(getRowValue(formRow, ['poNumber', 'poNo'], ''), 50),
          customerRefNumber: toLimitedValueOrNull(getRowValue(formRow, ['customerRefNo', 'customerReference'], ''), 50),
          freightCondition: freightInfo.badFreightCondition ? 'Y' : null,
          handlingDescription: toValueOrNull(freightInfo.freightConditionDescription || freightInfo.notes),
          notes: toValueOrNull(freightInfo.notes),
          destination: toValueOrNull(getRowValue(formRow, ['destination', 'finalDestination'], '')),
          originalDgd: freightInfo.hazMat ? toYesNo(freightInfo.originalDgd) : null,
          unNumber: freightInfo.hazMat ? freightInfo.unNumbers.filter(Boolean) : [],
          class: freightInfo.hazMat ? freightInfo.hazmatClasses.filter(Boolean) : [],
          packageId: toValueOrNull(getRowValue(formRow, ['packageId', 'packageNumber'], '')),
          properShippingName: toValueOrNull(freightInfo.properShippingName),
          hazardousDescription: toValueOrNull(freightInfo.hazardousDescription),
          status: 'INITIATE',
          withSkid: toYesNo(
            freightInfo.conditions['Banded Skid'] ||
              freightInfo.conditions['Shrink Wrapped Skid'] ||
              freightInfo.conditions['SHT / IPPC Skid'] ||
              freightInfo.conditions['SHPT / PPC Skid'] ||
              freightInfo.conditions['Plastic Skid']
          ),
          bandedSkid: toYesNo(freightInfo.conditions['Banded Skid']),
          shrinkWrappedSkid: toYesNo(freightInfo.conditions['Shrink Wrapped Skid']),
          shtIppcSkid: toYesNo(freightInfo.conditions['SHT / IPPC Skid'] || freightInfo.conditions['SHPT / PPC Skid']),
          plasticSkid: toYesNo(freightInfo.conditions['Plastic Skid']),
          hazMat: toYesNo(freightInfo.hazMat),
          documents: toYesNo(freightInfo.conditions.Document),
          labelCount: form.items?.length || 0,
        },
        freightDetails,
      };
    }),
  });

  const hasReceiptImages = () =>
    receiptForms.some((form) => {
      const freightInfo = { ...createFreightInfo(), ...(form.freightInfo || {}) };
      return (
        (form.items || []).some((item) => (item.images || []).length > 0) ||
        freightInfo.freightConditionImages.length > 0
      );
    });

  const validateReceiptInfo = () => {
    const nextErrors = {};
    let firstInvalidFormId = '';

    receiptForms.forEach((form) => {
      const formErrors = {};

      if (!String(form.receivedBy || '').trim()) {
        formErrors.receivedBy = 'Received By is mandatory';
      }
      if (!String(form.location || '').trim()) {
        formErrors.location = 'Location is mandatory';
      }

      if (Object.keys(formErrors).length > 0) {
        nextErrors[form.id] = formErrors;
        if (!firstInvalidFormId) firstInvalidFormId = form.id;
      }
    });

    setReceiptInfoErrors(nextErrors);

    if (firstInvalidFormId) {
      setActiveTab(firstInvalidFormId);
      setSnackbar({ open: true, message: 'Please fill all mandatory fields before submitting', severity: 'error' });
      return false;
    }

    return true;
  };

  const buildReceiptFormData = async () => {
    const payload = buildReceiptPayload();
    const formData = new FormData();

    formData.append('batchData', JSON.stringify(payload));

    await Promise.all(
      receiptForms.flatMap((form, receiptIndex) => {
        const freightInfo = { ...createFreightInfo(), ...(form.freightInfo || {}) };
        const freightItemImageTasks = (form.items || []).flatMap((item, freightIndex) =>
          (item.images || []).map(async (image, imageIndex) => {
            const fieldName = `freight-${receiptIndex}-${freightIndex}-${imageIndex}`;
            const imageValue = await getSubmittedImageValue(image);

            if (imageValue) {
              formData.append(fieldName, imageValue);
            }
          })
        );
        const badFreightImageTasks = freightInfo.freightConditionImages.map(async (image, imageIndex) => {
          const fieldName = `bad-freight-image-${receiptIndex}-${imageIndex}`;
          const renamedImage = await toRenamedImageFile(image, fieldName);

          if (renamedImage instanceof File || renamedImage instanceof Blob) {
            formData.append(fieldName, renamedImage);
          }
        });

        return [...freightItemImageTasks, ...badFreightImageTasks];
      })
    );

    return formData;
  };

  const handleSubmit = async () => {
    if (!validateReceiptInfo()) return;

    const payload = hasReceiptImages() ? await buildReceiptFormData() : buildReceiptPayload();
    const response = await dispatch(submitWarehouseReceiptBatch(payload));

    if (response?.error || response?.success === false) {
      setSnackbar({
        open: true,
        message: response?.message || 'Failed to submit warehouse receipts',
        severity: 'error',
      });
      return;
    }

    setSuccessDialog({
      open: true,
      message: response?.message || 'Warehouse receipts submitted successfully',
      receiptNumbers: getReceiptNumbersFromResponse(response),
    });
  };

  const handleSuccessDialogOk = () => {
    setSuccessDialog({ open: false, message: '', receiptNumbers: [] });
    dispatch(clearWarehouseCheckInDraft(state?.draftKey));
    if (isWarehouseReceiptEdit) {
      navigate(PATH_DASHBOARD.warehouseReceiptDashboard);
      return;
    }
    navigate(PATH_DASHBOARD.warehouseCheckIn);
  };

  const handleOpenPrinterDialog = (receiptNumber) => {
    setPrinterDialog({ open: true, receiptNumber });
    setSelectedPrinterId('');
    dispatch(fetchPrintersDropdown());
  };

  const handleClosePrinterDialog = () => {
    setPrinterDialog({ open: false, receiptNumber: '' });
    setSelectedPrinterId('');
    setPrintLoading(false);
  };

  const handlePrintReceipt = async () => {
    const printer = printersDropdown.data.find((item) => String(item.printerId) === String(selectedPrinterId));

    if (!printer) {
      setSnackbar({ open: true, message: 'Please select a printer', severity: 'error' });
      return;
    }

    setPrintLoading(true);
    const response = await dispatch(
      printWarehouseReceiptLabel({
        printerIP: printer.printerIP,
        printerPort: printer.printerPort,
        receiptNumber: printerDialog.receiptNumber,
      })
    );
    setPrintLoading(false);

    if (response?.error || response?.success === false) {
      setSnackbar({
        open: true,
        message: response?.message || 'Failed to print label',
        severity: 'error',
      });
      return;
    }

    setSnackbar({
      open: true,
      message: response?.message || `Print requested for receipt ${printerDialog.receiptNumber} on ${printer.printerName}`,
      severity: 'success',
    });
    handleClosePrinterDialog();
  };

  const handleViewAction = (message) => {
    setSnackbar({ open: true, message, severity: 'info' });
  };

  const getActiveNoteThreadId = () =>
    viewReceiptSummary?.noteThreadId ||
    getRowValue(activeForm?.row, 'noteThreadId', '') ||
    activeForm?.noteThreadId ||
    0;

  const handleOpenNotesDialog = () => {
    const noteThreadId = getActiveNoteThreadId();

    setNotesDialogOpen(true);
    dispatch(getWarehouseReceiptNotes(noteThreadId));
  };

  const handleAddReceiptNote = async () => {
    const noteText = receiptNoteText.trim();
    if (!noteText) {
      setSnackbar({ open: true, message: 'Notes is mandatory', severity: 'error' });
      return;
    }

    const response = await dispatch(postWarehouseReceiptNote({
      noteThreadId: getActiveNoteThreadId(),
      messageText: noteText,
    }));

    if (response?.error) {
      setSnackbar({ open: true, message: response.message || 'Failed to add warehouse receipt note', severity: 'error' });
      return;
    }

    setReceiptNoteText('');
  };

  const handleToggleSplitMail = (id) => {
    setSelectedSplitMailIds((prev) =>
      prev.includes(id) ? prev.filter((selectedId) => selectedId !== id) : [...prev, id]
    );
  };

  const handleRemoveSplitMailAddress = (id) => {
    setSelectedSplitMailIds((prev) => prev.filter((selectedId) => selectedId !== id));
  };

  const handleOpenSplitDialog = () => {
    setSplitStep(0);
    setSplitDimensionMode('recalculate');
    setSplitFormCount(1);
    setActiveSplitFormTab(0);
    setSplitExistingFormItems([[]]);
    setSplitDialogOpen(true);
  };

  const handleCloseSplitDialog = () => {
    setSplitDialogOpen(false);
    setSplitStep(0);
    setSplitDimensionMode('recalculate');
    setSplitFormCount(1);
    setActiveSplitFormTab(0);
    setSplitExistingFormItems([[]]);
  };

  const handleEditWarehouseReceipt = () => {
    navigate(PATH_DASHBOARD.warehouseReceiptForm, {
      replace: true,
      state: {
        ...(state || {}),
        title: 'Edit Warehouse Receipt Form',
        warehouseReceiptView: false,
        warehouseReceiptEdit: true,
      },
    });
  };

  const handleCancelEditWarehouseReceipt = () => {
    navigate(PATH_DASHBOARD.warehouseReceiptForm, {
      replace: true,
      state: {
        ...(state || {}),
        title: 'Warehouse Receipt Form',
        warehouseReceiptView: true,
        warehouseReceiptEdit: false,
      },
    });
  };

  const getRateDialogRows = () =>
    (activeForm?.items || []).map((item) => {
      const pieces = String(item.pieces || '01').padStart(2, '0');
      const length = Number(formatDecimal10_2Input(item.length)) || 0;
      const width = Number(formatDecimal10_2Input(item.width)) || 0;
      const height = Number(formatDecimal10_2Input(item.height)) || 0;
      const dimWeight = formatMeasurement((Number(item.pieces || 1) * length * width * height) / 166);
      const actualWeight = Number(item.weight || 0);

      return {
        pieces,
        type: item.type || 'Box',
        formula: `${Number(item.pieces || 1)} x ${length} x ${width} x ${height} / 166 = ${dimWeight}`,
        dimWeight,
        actualWeight,
      };
    });

  const getRatesTotal = () => {
    const rateRows = getRateDialogRows();
    const dimWeightTotal = rateRows.reduce((sum, row) => sum + Number(row.dimWeight || 0), 0);
    const actualWeightTotal = rateRows.reduce((sum, row) => sum + Number(row.actualWeight || 0), 0);

    return {
      dimWeightTotal: formatMeasurement(dimWeightTotal),
      actualWeightTotal: formatMeasurement(actualWeightTotal),
      estimatedCost: 100,
    };
  };

  const handleOpenIdVerificationView = async (verificationId) => {
    const cleanVerificationId = String(verificationId || '').trim();
    if (!cleanVerificationId) return;

    setStatusHistoryLinkLoadingId(cleanVerificationId);

    try {
      const response = await dispatch(getIdVerificationData({
        page: 1,
        pageSize: 10,
        filters: { verificationId: cleanVerificationId },
        filterLogic: 'AND',
      }));
      const verificationRecord = response?.data?.find(
        (record) => String(record.verificationId) === cleanVerificationId
      );

      if (!verificationRecord) {
        setSnackbar({
          open: true,
          message: `ID Verification ${cleanVerificationId} was not found`,
          severity: 'error',
        });
        return;
      }

      navigate(PATH_DASHBOARD.idVerificationView(verificationRecord.verificationId));
    } finally {
      setStatusHistoryLinkLoadingId('');
    }
  };

  const renderStatusHistoryDescription = (description) => {
    const text = String(description || '');
    const match = text.match(/(verification\s+ID\s+)(\d+)/i);

    if (!match) return text;

    const [matchedText, label, verificationId] = match;
    const startIndex = text.indexOf(matchedText);
    const beforeText = text.slice(0, startIndex);
    const afterText = text.slice(startIndex + matchedText.length);

    return (
      <>
        {beforeText}
        {label}
        <Button
          variant="text"
          size="small"
          onClick={() => handleOpenIdVerificationView(verificationId)}
          disabled={Boolean(statusHistoryLinkLoadingId)}
          sx={{
            minWidth: 0,
            p: 0,
            color: '#A22',
            fontSize: 'inherit',
            fontWeight: 700,
            lineHeight: 'inherit',
            textDecoration: 'underline',
            verticalAlign: 'baseline',
            '&.Mui-disabled': { color: '#A22' },
            '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' },
          }}
        >
          {statusHistoryLinkLoadingId === verificationId ? (
            <CircularProgress size={12} sx={{ color: '#A22' }} />
          ) : (
            verificationId
          )}
        </Button>
        {afterText}
      </>
    );
  };

  const getStatusHistoryRows = () => {
    return (auditLogs || []).map((log) => ({
      warehouseId: log.receiptNumber || '',
      pro: log.proNumber || '',
      level: log.level || '',
      time: formatStatusHistoryTime(log.eventTime),
      user: log.userName || log.userId || '',
      status: log.status || '',
      description: renderStatusHistoryDescription(log.description),
    }));
  };

  const handleOpenStatusHistory = () => {
    const receiptId =
      viewReceiptSummary?.receiptId ||
      getRowValue(activeForm?.row, 'receiptId', '') ||
      activeForm?.receiptId ||
      '';

    if (!receiptId) {
      setSnackbar({ open: true, message: 'Receipt ID is required to load status history', severity: 'error' });
      return;
    }

    dispatch(getWarehouseReceiptAuditLogs(receiptId));
    setStatusHistoryDialogOpen(true);
  };

  const renderSplitStepper = (activeStep = 0) => {
    const steps = ['Start', 'Freight\nInfo', 'Form\nInfo', 'New\nForm'];
    const progressWidth = `${Math.max(0, Math.min(activeStep, steps.length - 1)) * 25}%`;

    return (
      <Box sx={{ width: { xs: '100%', sm: 430 }, mx: 'auto', mt: 3.2 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', alignItems: 'start', position: 'relative' }}>
          <Box
            sx={{
              position: 'absolute',
              top: 10,
              left: '12.5%',
              right: '12.5%',
              height: 4,
              bgcolor: '#d5d5d5',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              top: 10,
              left: '12.5%',
              width: progressWidth,
              height: 4,
              bgcolor: '#A22',
            }}
          />
          {steps.map((step, index) => {
            const active = index <= activeStep;
            return (
              <Stack key={step} alignItems="center" spacing={0.7} sx={{ position: 'relative', zIndex: 1 }}>
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    bgcolor: active ? '#A22' : '#fff',
                    border: active ? '1px solid #A22' : '1px solid #111',
                    color: active ? '#fff' : '#111',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {index + 1}
                </Box>
                <Typography sx={{ fontSize: 10, lineHeight: 1.1, whiteSpace: 'pre-line', textAlign: 'center' }}>
                  {step}
                </Typography>
              </Stack>
            );
          })}
        </Box>
      </Box>
    );
  };

  const renderSplitStartStep = () => (
    <Stack alignItems="center" spacing={2.4} sx={{ mt: 7.5 }}>
      <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
        Do You Need to Calculate the Dimensions Again?
      </Typography>
      <Stack direction="row" spacing={1.2}>
        <Button
          variant="outlined"
          size="small"
          onClick={() => {
            setSplitDimensionMode('existing');
            setSplitStep(1);
          }}
          sx={{ height: 24, minWidth: 60, color: '#111', borderColor: '#111', textTransform: 'none', fontSize: 11 }}
        >
          No
        </Button>
        <Button
          variant="contained"
          size="small"
          onClick={() => {
            setSplitDimensionMode('recalculate');
            setSplitStep(1);
          }}
          sx={{ ...actionBtnSx, height: 24, minWidth: 60, fontSize: 11 }}
        >
          Yes
        </Button>
      </Stack>
    </Stack>
  );

  const renderSplitFreightStep = () => {
    const splitItems = activeForm?.items?.length ? activeForm.items : [];

    return (
      <Box sx={{ mt: 5 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ borderBottom: '1px solid #9d9d9d', pb: 0.8 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700 }}>Freight Information</Typography>
          <Box sx={{ bgcolor: '#e6f3fb', px: 1, py: 0.35 }}>
            <Typography sx={{ fontSize: 10 }}>
              Separate The Freights as per the Requirement and Get the Dimensions as per the Requirement.
            </Typography>
          </Box>
        </Stack>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="flex-start" sx={{ mt: 3 }}>
          <Table
            size="small"
            sx={{
              width: { xs: '100%', md: 530 },
              border: '1px solid #d0d0d0',
              '& th': { bgcolor: '#f5f5f5', fontSize: 11, fontWeight: 700, py: 0.7 },
              '& td': { fontSize: 12, py: 0.65 },
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell>Item</TableCell>
                <TableCell>Pieces</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Length</TableCell>
                <TableCell>Width</TableCell>
                <TableCell>Height</TableCell>
                <TableCell>Weight (lbs)</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {splitItems.map((item, index) => (
                <TableRow key={item.id || index}>
                  <TableCell>{String(index + 1).padStart(2, '0')}</TableCell>
                  <TableCell>{item.pieces || ''}</TableCell>
                  <TableCell>{item.type || ''}</TableCell>
                  <TableCell>{item.length || ''}</TableCell>
                  <TableCell>{item.width || ''}</TableCell>
                  <TableCell>{item.height || ''}</TableCell>
                  <TableCell>{item.weight || ''}</TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={0.7} justifyContent="center">
                      <IconButton size="small" sx={{ p: 0.2, color: '#0c243f' }}>
                        <Iconify icon="mdi:truck-fast" width={16} />
                      </IconButton>
                      <IconButton size="small" sx={{ p: 0.2, color: '#111' }}>
                        <Iconify icon="mdi:download" width={16} />
                      </IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Stack spacing={2} sx={{ flex: 1, minWidth: { xs: '100%', md: 0 } }}>
            {Array.from({ length: splitFormCount }, (_, formIndex) => (
              (() => {
                const sourceItem = splitItems[formIndex] || splitItems[0] || {};
                const sourceType = sourceItem.type || '';

                return (
                  <Box key={`split-form-${formIndex + 1}`} component="fieldset" sx={{ border: '1px solid #777', borderRadius: 1, px: 1.6, py: 1.3, m: 0 }}>
                    <Box component="legend" sx={{ px: 0.8, fontSize: 13 }}>New Form {formIndex + 1}</Box>
                    <Stack direction="row" alignItems="center" spacing={1.2}>
                      <Iconify icon="mdi:cube-outline" width={16} />
                      <Typography sx={{ fontSize: 12 }}>Item 1</Typography>
                      <Box
                        sx={{
                          flex: 1,
                          display: 'grid',
                          gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, 1fr)' },
                          gap: 1.2,
                        }}
                      >
                        <TextField
                          variant="standard"
                          label={<Box component="span">Pieces <Box component="span" sx={{ color: '#A22' }}>*</Box></Box>}
                          defaultValue={sourceItem.pieces || ''}
                          size="small"
                          sx={{ '& .MuiInputLabel-root': { fontSize: 10 }, '& input': { fontSize: 12 } }}
                        />
                        <TextField
                          select
                          variant="standard"
                          label={<Box component="span">Type <Box component="span" sx={{ color: '#A22' }}>*</Box></Box>}
                          defaultValue={sourceType}
                          size="small"
                          sx={{ '& .MuiInputLabel-root': { fontSize: 10 }, '& .MuiSelect-select': { fontSize: 12 } }}
                        >
                          <MenuItem value="">Select</MenuItem>
                          {sourceType && !['Skid', 'Box', 'Pallet'].includes(sourceType) && (
                            <MenuItem value={sourceType}>{sourceType}</MenuItem>
                          )}
                          <MenuItem value="Skid">Skid</MenuItem>
                          <MenuItem value="Box">Box</MenuItem>
                          <MenuItem value="Pallet">Pallet</MenuItem>
                        </TextField>
                        <TextField
                          variant="standard"
                          label={<Box component="span">Length <Box component="span" sx={{ color: '#A22' }}>*</Box></Box>}
                          defaultValue={sourceItem.length || ''}
                          size="small"
                          sx={{ '& .MuiInputLabel-root': { fontSize: 10 }, '& input': { fontSize: 12 } }}
                        />
                        <TextField
                          variant="standard"
                          label={<Box component="span">Width <Box component="span" sx={{ color: '#A22' }}>*</Box></Box>}
                          defaultValue={sourceItem.width || ''}
                          size="small"
                          sx={{ '& .MuiInputLabel-root': { fontSize: 10 }, '& input': { fontSize: 12 } }}
                        />
                        <TextField
                          variant="standard"
                          label={<Box component="span">Height <Box component="span" sx={{ color: '#A22' }}>*</Box></Box>}
                          defaultValue={sourceItem.height || ''}
                          size="small"
                          sx={{ '& .MuiInputLabel-root': { fontSize: 10 }, '& input': { fontSize: 12 } }}
                        />
                        <TextField
                          variant="standard"
                          label={<Box component="span">Weight(lbs) <Box component="span" sx={{ color: '#A22' }}>*</Box></Box>}
                          defaultValue={sourceItem.weight || ''}
                          size="small"
                          sx={{ '& .MuiInputLabel-root': { fontSize: 10 }, '& input': { fontSize: 12 } }}
                        />
                        <Stack direction="row" alignItems="flex-end" spacing={1} sx={{ gridColumn: { xs: 'auto', sm: '3 / 5' }, justifyContent: 'flex-end' }}>
                          <IconButton size="small" sx={{ p: 0.3, color: '#111' }}>
                            <Iconify icon="mdi:delete" width={15} />
                          </IconButton>
                          <IconButton size="small" sx={{ p: 0.3, color: '#111' }}>
                            <Iconify icon="mdi:cube-outline" width={15} />
                          </IconButton>
                          <IconButton size="small" sx={{ p: 0.3, color: '#111' }}>
                            <Iconify icon="mdi:image-plus" width={15} />
                          </IconButton>
                        </Stack>
                      </Box>
                    </Stack>
                    <Button variant="contained" size="small" sx={{ ...actionBtnSx, mt: 1.2, height: 24, minWidth: 74, fontSize: 11 }}>
                      Add Item
                    </Button>
                  </Box>
                );
              })()
            ))}
          </Stack>
        </Stack>

        <Stack alignItems="flex-end" sx={{ mt: 2 }}>
          <Button
            variant="contained"
            size="small"
            onClick={() => setSplitFormCount((prev) => prev + 1)}
            sx={{ ...actionBtnSx, height: 26, minWidth: 110, fontSize: 11 }}
          >
            Add New Form
          </Button>
        </Stack>
      </Box>
    );
  };

  const renderSplitExistingFreightStep = () => {
    const splitItems = activeForm?.items?.length ? activeForm.items : [];
    const assignedItemIndexes = new Set(splitExistingFormItems.flat());
    const remainingSplitItems = splitItems
      .map((item, index) => ({ item, index }))
      .filter(({ index }) => !assignedItemIndexes.has(index));

    const handleDragStart = (event, itemIndex) => {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(itemIndex));
    };

    const handleDragOver = (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
    };

    const handleDropOnForm = (event, formIndex) => {
      event.preventDefault();
      const itemIndex = Number(event.dataTransfer.getData('text/plain'));
      if (!Number.isInteger(itemIndex) || itemIndex < 0 || itemIndex >= splitItems.length) return;

      setSplitExistingFormItems((prev) => {
        const next = Array.from({ length: splitFormCount }, (_, index) => [...(prev[index] || [])]);
        next.forEach((formItems, index) => {
          next[index] = formItems.filter((assignedIndex) => assignedIndex !== itemIndex);
        });
        next[formIndex] = [...next[formIndex], itemIndex];
        return next;
      });
    };

    const handleRemoveFromSplitForm = (formIndex, itemIndex) => {
      setSplitExistingFormItems((prev) =>
        prev.map((formItems, index) =>
          index === formIndex ? formItems.filter((assignedIndex) => assignedIndex !== itemIndex) : formItems
        )
      );
    };

    return (
      <Box sx={{ mt: 5 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ borderBottom: '1px solid #9d9d9d', pb: 0.8 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700 }}>Freight Information</Typography>
          <Box sx={{ bgcolor: '#e6f3fb', px: 1, py: 0.35 }}>
            <Typography sx={{ fontSize: 10 }}>
              Drag and Drop Freight Information into Specific Combination to Create New Warehouse Forms (Empty Form will be ignored)
            </Typography>
          </Box>
        </Stack>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="flex-start" sx={{ mt: 3 }}>
          <Table
            size="small"
            sx={{
              width: { xs: '100%', md: 530 },
              border: '1px solid #d0d0d0',
              '& th': { bgcolor: '#d7d7d7', fontSize: 11, fontWeight: 700, py: 0.7 },
              '& td': { fontSize: 12, py: 0.65 },
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell>Item</TableCell>
                <TableCell>Pieces</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Length</TableCell>
                <TableCell>Width</TableCell>
                <TableCell>Height</TableCell>
                <TableCell>Weight (lbs)</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {remainingSplitItems.map(({ item, index }) => (
                <TableRow
                  key={`remaining-${item.id || index}`}
                  draggable
                  onDragStart={(event) => handleDragStart(event, index)}
                  sx={{ cursor: 'grab', '&:active': { cursor: 'grabbing' } }}
                >
                  <TableCell>{String(index + 1).padStart(2, '0')}</TableCell>
                  <TableCell>{item.pieces || ''}</TableCell>
                  <TableCell>{item.type || ''}</TableCell>
                  <TableCell>{item.length || ''}</TableCell>
                  <TableCell>{item.width || ''}</TableCell>
                  <TableCell>{item.height || ''}</TableCell>
                  <TableCell>{item.weight || ''}</TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={0.7} justifyContent="center">
                      <IconButton size="small" sx={{ p: 0.2, color: '#0c243f' }}>
                        <Iconify icon="mdi:truck-fast" width={16} />
                      </IconButton>
                      <IconButton size="small" sx={{ p: 0.2, color: '#111' }}>
                        <Iconify icon="mdi:dots-vertical" width={16} />
                      </IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Stack spacing={2} sx={{ flex: 1, minWidth: { xs: '100%', md: 0 } }}>
            {Array.from({ length: splitFormCount }, (_, formIndex) => {
              const formItemIndexes = splitExistingFormItems[formIndex] || [];

              return (
                <Box
                  key={`existing-split-form-${formIndex + 1}`}
                  component="fieldset"
                  onDragOver={handleDragOver}
                  onDrop={(event) => handleDropOnForm(event, formIndex)}
                  sx={{
                    minHeight: 130,
                    border: '1px solid #777',
                    borderRadius: 1,
                    px: 1.6,
                    py: 1.3,
                    m: 0,
                    bgcolor: formItemIndexes.length ? '#fff' : '#fafafa',
                  }}
                >
                  <Box component="legend" sx={{ px: 0.8, fontSize: 13 }}>New Form {formIndex + 1}</Box>
                  <Table
                    size="small"
                    sx={{
                      border: '1px solid #d0d0d0',
                      '& th': { bgcolor: '#d7d7d7', fontSize: 11, fontWeight: 700, py: 0.7 },
                      '& td': { fontSize: 12, py: 0.65 },
                    }}
                  >
                    <TableHead>
                      <TableRow>
                        <TableCell>Item</TableCell>
                        <TableCell>Pieces</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Length</TableCell>
                        <TableCell>Width</TableCell>
                        <TableCell>Height</TableCell>
                        <TableCell>Weight (lbs)</TableCell>
                        <TableCell align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {formItemIndexes.map((itemIndex) => {
                        const item = splitItems[itemIndex] || {};

                        return (
                          <TableRow key={`new-form-${formIndex}-${item.id || itemIndex}`}>
                            <TableCell>{String(itemIndex + 1).padStart(2, '0')}</TableCell>
                            <TableCell>{item.pieces || ''}</TableCell>
                            <TableCell>{item.type || ''}</TableCell>
                            <TableCell>{item.length || ''}</TableCell>
                            <TableCell>{item.width || ''}</TableCell>
                            <TableCell>{item.height || ''}</TableCell>
                            <TableCell>{item.weight || ''}</TableCell>
                            <TableCell align="center">
                              <Stack direction="row" spacing={0.7} justifyContent="center">
                                <IconButton size="small" sx={{ p: 0.2, color: '#0c243f' }}>
                                  <Iconify icon="mdi:truck-fast" width={16} />
                                </IconButton>
                                <IconButton size="small" onClick={() => handleRemoveFromSplitForm(formIndex, itemIndex)} sx={{ p: 0.2, color: '#111' }}>
                                  <Iconify icon="mdi:dots-vertical" width={16} />
                                </IconButton>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Box>
              );
            })}
          </Stack>
        </Stack>

        <Stack alignItems="flex-end" sx={{ mt: 2 }}>
          <Button
            variant="contained"
            size="small"
            onClick={() => {
              setSplitFormCount((prev) => prev + 1);
              setSplitExistingFormItems((prev) => [...prev, []]);
            }}
            sx={{ ...actionBtnSx, height: 26, minWidth: 110, fontSize: 11 }}
          >
            Add New Form
          </Button>
        </Stack>
      </Box>
    );
  };

  const renderSplitFormInfoStep = () => (
    <Box sx={{ mt: 3 }}>
      <Tabs
        value={Math.min(activeSplitFormTab, splitFormCount - 1)}
        onChange={(event, value) => setActiveSplitFormTab(value)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          minHeight: 34,
          borderBottom: '1px solid #aaa',
          '& .MuiTabs-indicator': { bgcolor: '#A22', height: 2 },
          '& .MuiTabs-scrollButtons': { color: '#A22', width: 28 },
        }}
      >
        {Array.from({ length: splitFormCount }, (_, formIndex) => (
          <Tab
            key={`split-form-tab-${formIndex + 1}`}
            label={`Form ${formIndex + 1}`}
            sx={{
              textTransform: 'none',
              minHeight: 34,
              minWidth: 0,
              px: 1,
              mr: 0.5,
              fontSize: 12,
              fontWeight: Math.min(activeSplitFormTab, splitFormCount - 1) === formIndex ? 700 : 400,
              color: '#333',
              '&.Mui-selected': { color: '#111' },
            }}
          />
        ))}
      </Tabs>
      <Box sx={{ mt: 2, maxHeight: 430, overflowY: 'auto', pr: 0.5 }}>
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
                <ReceiptInfoRow
                  label="Received By"
                  value={activeForm.receivedBy}
                  editable
                  required
                  error={receiptInfoErrors[activeForm.id]?.receivedBy}
                  maxLength={100}
                  onChange={(value) => updateActiveFormField('receivedBy', value)}
                />
                <ReceiptInfoRow
                  label="Location"
                  value={activeForm.location}
                  editable
                  required
                  error={receiptInfoErrors[activeForm.id]?.location}
                  onChange={(value) => updateActiveFormField('location', value)}
                />
                <ReceiptInfoRow label="Label Count" value={String(activeForm.items.length).padStart(2, '0')} />
              </Stack>
            </Box>
          </Stack>

          <Section title="Shipper Details">
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems={{ xs: 'stretch', sm: 'flex-end' }}>
              <DisplayField label="Shipper" value={getRowValue(row, ['shipper', 'shipperName'], 'ROAD ONE')} required width={{ xs: '100%', sm: '25%' }} />
              <Stack spacing={0.1} sx={{ width: { xs: '100%', sm: '25%' }, minWidth: 0 }}>
                <Typography sx={{ color: '#555', fontSize: 12 }}>
                  Customer <span style={{ color: '#b01818' }}>*</span>
                </Typography>
                <Autocomplete
                  options={customerOptions}
                  value={activeForm.customerSelection}
                  getOptionLabel={getCustomerOptionLabel}
                  isOptionEqualToValue={(option, value) =>
                    option.customerId === value.customerId && option.stationId === value.stationId
                  }
                  onChange={(event, newValue) => {
                    isSelectingCustomerRef.current = true;
                    handleCustomerChange(newValue);
                  }}
                  onInputChange={(event, newInputValue, reason) => {
                    if (reason !== 'reset') {
                      setCustomerSearchValue(newInputValue);
                      if (!newInputValue || !newInputValue.trim()) {
                        dispatch(searchCustomers(''));
                      }
                    }
                  }}
                  loading={customerLoading}
                  loadingText="Searching customers..."
                  noOptionsText={customerSearchValue ? 'No customers found' : 'Type to search for customers'}
                  renderInput={(params) => (
                    <StyledTextField
                      {...params}
                      variant="standard"
                      size="small"
                      sx={fieldSx}
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {customerLoading ? <CircularProgress color="inherit" size={16} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />
              </Stack>
              <Box sx={{ flex: 1, display: 'flex', justifyContent: { xs: 'flex-start', sm: 'flex-end' } }}>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<Iconify icon="mdi:email" width={14} />}
                  onClick={() => setSplitMailDialogOpen(true)}
                  sx={{ ...actionBtnSx, height: 24, minWidth: 68, fontSize: 11 }}
                >
                  Mail
                </Button>
              </Box>
            </Stack>
          </Section>

          <Box sx={{ mt: 1.5 }}>
            <Section title="Inland Information">
              <Stack spacing={2}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                  <DisplayField label="Carrier" value={getRowValue(row, 'carrier', '')} required />
                  <DisplayField label="PRO No" value={getRowValue(row, 'proNumber', '')} required />
                  <DisplayField
                    label="Invoice No"
                    value={getRowValue(row, ['invoiceNo', 'invoiceNumber'], '')}
                    editable
                    maxLength={50}
                    onChange={(value) => updateActiveRowField('invoiceNo', value)}
                  />
                  <DisplayField
                    label="PO No"
                    value={getRowValue(row, ['poNumber', 'poNo'], '')}
                    editable
                    maxLength={50}
                    onChange={(value) => updateActiveRowField('poNumber', value)}
                  />
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                  <DisplayField
                    label="Customer Ref No"
                    value={getRowValue(row, ['customerRefNo', 'customerReference'], '')}
                    width={{ xs: '100%', sm: '25%' }}
                    editable
                    maxLength={50}
                    onChange={(value) => updateActiveRowField('customerRefNo', value)}
                  />
                  <DisplayField
                    label="Package ID"
                    value={getRowValue(row, ['packageId', 'packageNumber'], '')}
                    width={{ xs: '100%', sm: '25%' }}
                    editable
                    onChange={(value) => updateActiveRowField('packageId', value)}
                  />
                  <Box sx={{ flex: 1 }} />
                  <Box sx={{ flex: 1 }} />
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                  <DisplayField label="Pieces" value={piecesInland} required />
                  <DisplayField label="Weight" value={weightInland} required />
                  <DisplayField label="RE Weight" value={totalWeight} required />
                  <DisplayField label="CBM (m3)" value={formatMeasurement(totalCbm)} required />
                  <Box sx={{ flex: 1 }} />
                </Stack>
              </Stack>
            </Section>
          </Box>

          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} sx={{ mt: 1.5, minWidth: 0 }}>
            <Box sx={{ flex: 1.2, minWidth: 0, border: '1px solid #c6c6c6', borderRadius: 1, overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: { xs: 720, lg: '100%' } }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#d9d9d9' }}>
                    {['Item', 'Pieces', 'Type', 'Length', 'Width', 'Height', 'Weight(lbs)', 'CBM(m3)', 'Actions'].map((head) => (
                      <TableCell
                        key={head}
                        sx={{
                          py: 0.6,
                          px: 0.8,
                          fontSize: 12,
                          fontWeight: 700,
                          ...(head === 'Actions'
                            ? {
                                position: 'sticky',
                                right: 0,
                                zIndex: 2,
                                bgcolor: '#d9d9d9',
                                textAlign: 'center',
                                width: 72,
                              }
                            : {}),
                        }}
                      >
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
                      <TableCell sx={{ py: 0.35, px: 0.8, fontSize: 12 }}>
                        {formatMeasurement(calculateItemCbm(item))}
                      </TableCell>
                      <TableCell
                        sx={{
                          py: 0.35,
                          px: 0.8,
                          position: 'sticky',
                          right: 0,
                          zIndex: 1,
                          bgcolor: '#fff',
                          textAlign: 'center',
                          width: 72,
                        }}
                      >
                        <IconButton
                          size="small"
                          title="View uploaded images"
                          disabled={(item.images?.length || 0) === 0}
                          onClick={() => handleOpenImages(item, index)}
                          sx={{ p: 0.2, position: 'relative' }}
                        >
                          <Iconify
                            icon="mdi:image-multiple"
                            width={20}
                            sx={{ color: (item.images?.length || 0) > 0 ? '#0a4a8f' : '#9e9e9e' }}
                          />
                          {(item.images?.length || 0) > 0 && (
                            <Box
                              component="span"
                              sx={{
                                position: 'absolute',
                                top: -5,
                                right: -6,
                                minWidth: 15,
                                height: 15,
                                px: 0.35,
                                borderRadius: '50%',
                                bgcolor: '#A22',
                                color: '#fff',
                                fontSize: 10,
                                lineHeight: '15px',
                                fontWeight: 700,
                              }}
                            >
                              {item.images.length}
                            </Box>
                          )}
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Section title="Freight Information" sx={{ height: '100%' }}>
                <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} sx={{ minWidth: 0 }}>
                  <Stack sx={{ flex: 1, minWidth: 0 }}>
                    {FREIGHT_CONDITION_OPTIONS.map((label) => (
                      <FormControlLabel
                        key={label}
                        control={
                          <Checkbox
                            checked={Boolean(activeFreightInfo.conditions[label])}
                            disabled={isMobileReceiptForm}
                            onChange={(event) =>
                              updateActiveFreightInfo((info) => ({
                                conditions: { ...info.conditions, [label]: event.target.checked },
                              }))
                            }
                            size="small"
                            sx={{ p: 0.4, color: '#193f75', '&.Mui-checked': { color: '#193f75' } }}
                          />
                        }
                        label={<Typography sx={{ fontSize: 12 }}>{label}</Typography>}
                      />
                    ))}
                  </Stack>
                  <Stack sx={{ flex: 1.1, minWidth: 0 }} spacing={0.7}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 0.5, minWidth: 0 }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={activeFreightInfo.badFreightCondition}
                            disabled={isMobileReceiptForm}
                            onChange={(event) =>
                              updateActiveFreightInfo({
                                badFreightCondition: event.target.checked,
                                ...(event.target.checked ? {} : { freightConditionImages: [] }),
                              })
                            }
                            size="small"
                            sx={{ p: 0.4, color: '#193f75', '&.Mui-checked': { color: '#193f75' } }}
                          />
                        }
                        label={<Typography sx={{ fontSize: 12 }}>Bad Freight Condition</Typography>}
                      />
                      {activeFreightInfo.badFreightCondition && (
                        <>
                          <IconButton
                            size="small"
                            title="Capture freight condition image"
                            onClick={handleOpenFreightCamera}
                            disabled={isMobileReceiptForm}
                            sx={{ bgcolor: '#A22', color: '#fff', width: 30, height: 30, borderRadius: 1, '&:hover': { bgcolor: '#8b1c1c' } }}
                          >
                            <Iconify icon="mdi:camera" width={18} />
                          </IconButton>
                          <IconButton
                            size="small"
                            title="Upload freight condition image"
                            onClick={handleOpenFreightUpload}
                            disabled={isMobileReceiptForm}
                            sx={{ bgcolor: '#A22', color: '#fff', width: 30, height: 30, borderRadius: 1, '&:hover': { bgcolor: '#8b1c1c' } }}
                          >
                            <Iconify icon="mdi:image-plus" width={18} />
                          </IconButton>
                        </>
                      )}
                    </Stack>
                    <Typography sx={{ fontSize: 12, fontWeight: 700 }}>Freight Condition</Typography>
                    <TextField
                      multiline
                      rows={4}
                      value={activeFreightInfo.freightConditionDescription}
                      onChange={(event) => updateActiveFreightInfo({ freightConditionDescription: event.target.value })}
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
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={activeFreightInfo.hazMat}
                          onChange={(event) => updateActiveFreightInfo({ hazMat: event.target.checked })}
                          size="small"
                          sx={{ p: 0.4 }}
                        />
                      }
                      label={<Typography sx={{ fontSize: 12 }}>Haz Mat</Typography>}
                    />
                    {activeFreightInfo.hazMat && (
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={activeFreightInfo.originalDgd}
                            onChange={(event) => updateActiveFreightInfo({ originalDgd: event.target.checked })}
                            size="small"
                            sx={{ p: 0.4 }}
                          />
                        }
                        label={<Typography sx={{ fontSize: 12 }}>Original DGD</Typography>}
                      />
                    )}
                  </Stack>
                  {activeFreightInfo.hazMat && (
                    <>
                      <TagInputBox
                        label="UN Number"
                        values={activeFreightInfo.unNumbers}
                        inputValue={activeFreightInfo.unNumberInput}
                        onInputChange={(value) => updateActiveFreightInfo({ unNumberInput: value })}
                        onAdd={(value) => addTagValue(value, 'unNumbers', 'unNumberInput')}
                        onRemove={(index) => removeTagValue(index, 'unNumbers')}
                      />
                      <TagInputBox
                        label="Hazmat Class"
                        values={activeFreightInfo.hazmatClasses}
                        inputValue={activeFreightInfo.hazmatClassInput}
                        onInputChange={(value) => updateActiveFreightInfo({ hazmatClassInput: value })}
                        onAdd={(value) => addTagValue(value, 'hazmatClasses', 'hazmatClassInput')}
                        onRemove={(index) => removeTagValue(index, 'hazmatClasses')}
                      />
                    </>
                  )}
                </Stack>
                <Stack sx={{ flex: 1, minWidth: 0 }} spacing={1}>
                  <DisplayField
                    label="Proper Shipping Name"
                    value={activeFreightInfo.properShippingName}
                    editable
                    onChange={(value) => updateActiveFreightInfo({ properShippingName: value })}
                  />
                  <Typography sx={{ fontSize: 12 }}>Description</Typography>
                  <TextField
                    multiline
                    rows={6}
                    size="small"
                    value={activeFreightInfo.hazardousDescription}
                    onChange={(event) => updateActiveFreightInfo({ hazardousDescription: event.target.value })}
                    sx={{ '& textarea': { fontSize: 12 } }}
                  />
                </Stack>
              </Stack>
            </Section>
          </Box>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ mt: 1.5, minWidth: 0 }}>
            <Stack sx={{ flex: 1, minWidth: 0 }}>
              <DisplayField
                label="Destination"
                value={getRowValue(row, ['destination', 'finalDestination'], '')}
                editable
                onChange={(value) => updateActiveRowField('destination', value)}
              />
            </Stack>
            <Stack sx={{ flex: 1, minWidth: 0 }} spacing={0.3}>
              <Typography sx={{ fontSize: 12 }}>Notes</Typography>
              <TextField
                multiline
                rows={6}
                size="small"
                value={activeFreightInfo.notes}
                onChange={(event) => updateActiveFreightInfo({ notes: event.target.value })}
                sx={{ '& textarea': { fontSize: 12 } }}
              />
            </Stack>
          </Stack>
        </Box>
      </Box>
    </Box>
  );

  const renderViewSummary = () => {
    if (!isWarehouseReceiptView || !viewReceiptSummary) return null;

    const receiptNumber = viewReceiptSummary.receiptNumber || activeForm?.receiptNumber || '';
    const status = String(viewReceiptSummary.status || getRowValue(activeForm?.row, 'status', '') || '').toUpperCase();

    return (
      <Box sx={{ bgcolor: '#efefef', px: 2, pt: 1.2, pb: 1.4 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'flex-end' }} justifyContent="space-between" spacing={2}>
          <Box
            sx={{
              width: { xs: '100%', sm: 430 },
              bgcolor: '#d2d2d2',
              borderRadius: 1,
              px: 1.2,
              py: 0.8,
            }}
          >
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' },
                alignItems: 'center',
                rowGap: 0.6,
              }}
            >
              <Stack direction="row" spacing={0.5} sx={{ gridColumn: { xs: '1', sm: '1 / 4' }, pb: 0.6, borderBottom: '1px solid #9d9d9d' }}>
                <Typography sx={{ fontSize: 16 }}>Receipt Number :</Typography>
                <Typography sx={{ fontSize: 16, fontWeight: 700 }}>{receiptNumber}</Typography>
              </Stack>
              <Typography sx={{ fontSize: 16, pt: { xs: 0, sm: 0.3 } }}>Status :</Typography>
              <Typography sx={{ fontSize: 16, fontWeight: 700, pt: { xs: 0, sm: 0.3 } }}>{status}</Typography>
              <Box sx={{ pt: { xs: 0, sm: 0.3 } }}>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleOpenStatusHistory}
                  sx={{ ...actionBtnSx, height: 24, minWidth: 110, px: 1.2, fontSize: 12 }}
                >
                  Status History
                </Button>
              </Box>
              <Box sx={{ gridColumn: { xs: '1', sm: '1 / 4' }, borderTop: '1px solid #b6b6b6', pt: 0.8 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => handleViewAction('This feature will be available soon')}
                    sx={{ ...comingSoonBtnSx, height: 26, flex: 1, fontSize: 12 }}
                  >
                    Print
                  </Button>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => handleViewAction('This feature will be available soon')}
                    sx={{ ...comingSoonBtnSx, height: 26, flex: 1, fontSize: 12 }}
                  >
                    Print Labels
                  </Button>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => handleViewAction('This feature will be available soon')}
                    sx={{ ...comingSoonBtnSx, height: 26, flex: 1, fontSize: 12 }}
                  >
                    Rates
                  </Button>
                </Stack>
              </Box>
            </Box>
          </Box>

          <Stack direction="row" justifyContent="flex-end" spacing={1}>
            <Button
              variant="contained"
              size="small"
              onClick={() => handleViewAction('This feature will be available soon')}
              sx={{ ...comingSoonBtnSx, height: 26, minWidth: 60, fontSize: 11 }}
            >
              Split
            </Button>
            <Button
              variant="contained"
              size="small"
              onClick={() => handleViewAction('This feature will be available soon')}
              sx={{ ...comingSoonBtnSx, height: 26, minWidth: 60, fontSize: 11 }}
            >
              Edit
            </Button>
            <IconButton
              size="small"
              onClick={handleOpenNotesDialog}
              sx={{ color: '#A22', borderRadius: 0.6, width: 32, height: 28, '&:hover': { bgcolor: 'rgba(170, 34, 34, 0.08)' } }}
            >
              <Iconify icon="mdi:notebook" width={26} />
            </IconButton>
          </Stack>
        </Stack>
      </Box>
    );
  };

  return (
    <Box sx={{ bgcolor: '#dcdcdc', minHeight: '100vh', width: '100%', overflowX: 'hidden', boxSizing: 'border-box' }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ px: 1, pt: 1.5, pb: 0.6, bgcolor: '#efefef' }}
      >
        <Stack direction="row" alignItems="center" spacing={0.7} sx={{ cursor: 'pointer' }} onClick={handleBack}>
          <Iconify icon="eva:arrow-ios-back-fill" width={14} />
          <Typography sx={{ fontSize: 18, fontWeight: 600 }}>{pageTitle}</Typography>
        </Stack>
        {isWarehouseReceiptView ? null : isWarehouseReceiptEdit ? (
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              size="small"
              onClick={handleCancelEditWarehouseReceipt}
              sx={{ height: 24, fontSize: 11, color: '#111', borderColor: '#777', bgcolor: '#fff', textTransform: 'none' }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              size="small"
              disabled={warehouseReceiptBatch.loading}
              onClick={handleSubmit}
              sx={{ ...actionBtnSx, height: 24, minWidth: 58 }}
            >
              {warehouseReceiptBatch.loading ? 'Updating...' : 'Update'}
            </Button>
          </Stack>
        ) : (
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" size="small" onClick={handleBack} sx={{ height: 24, fontSize: 11, color: '#111', borderColor: '#777', bgcolor: '#fff' }}>
              Back
            </Button>
            <Button
              variant="contained"
              size="small"
              disabled={warehouseReceiptBatch.loading}
              onClick={handleSubmit}
              sx={{ ...actionBtnSx, height: 24, minWidth: 58 }}
            >
              {warehouseReceiptBatch.loading ? 'Submitting...' : 'Submit'}
            </Button>
          </Stack>
        )}
      </Stack>

      {renderViewSummary()}

      {((!isWarehouseReceiptView && !isWarehouseReceiptEdit) || receiptForms.length > 1) && (
      <Box sx={{ px: 2, bgcolor: '#efefef', boxSizing: 'border-box' }}>
        <Tabs
          value={activeTab}
          onChange={(event, value) => setActiveTab(value)}
          variant="scrollable"
          scrollButtons
          allowScrollButtonsMobile
          sx={{
            minHeight: 32,
            maxWidth: '100%',
            '& .MuiTab-root': { minHeight: 32, px: 1.5, fontSize: 11, textTransform: 'none' },
            '& .MuiTabs-indicator': { bgcolor: '#A22', height: 2 },
            '& .MuiTabs-scrollButtons': { color: '#A22', width: 28 },
          }}
        >
          {receiptForms.map((form) => (
            <Tab key={form.id} value={form.id} label={form.label} />
          ))}
        </Tabs>
      </Box>
      )}

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
                <ReceiptInfoRow
                  label="Received By"
                  value={activeForm.receivedBy}
                  editable={isReceiptDetailsEditable}
                  required
                  error={receiptInfoErrors[activeForm.id]?.receivedBy}
                  maxLength={100}
                  onChange={(value) => updateActiveFormField('receivedBy', value)}
                />
                <ReceiptInfoRow
                  label="Location"
                  value={activeForm.location}
                  editable={isReceiptDetailsEditable}
                  required
                  error={receiptInfoErrors[activeForm.id]?.location}
                  onChange={(value) => updateActiveFormField('location', value)}
                />
                <ReceiptInfoRow label="Label Count" value={String(activeForm.items.length).padStart(2, '0')} />
              </Stack>
            </Box>
          </Stack>

          <Section title="Shipper Details">
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
              <DisplayField label="Shipper" value={getRowValue(row, ['shipper', 'shipperName'], 'ROAD ONE')} required width={{ xs: '100%', sm: '25%' }} />
              <Stack spacing={0.1} sx={{ width: { xs: '100%', sm: '25%' }, minWidth: 0 }}>
                <Typography sx={{ color: '#555', fontSize: 12 }}>
                  Customer <span style={{ color: '#b01818' }}>*</span>
                </Typography>
                <Autocomplete
                  options={customerOptions}
                  value={activeForm.customerSelection}
                  disabled={!isReceiptDetailsEditable}
                  getOptionLabel={getCustomerOptionLabel}
                  isOptionEqualToValue={(option, value) =>
                    option.customerId === value.customerId && option.stationId === value.stationId
                  }
                  onChange={(event, newValue) => {
                    isSelectingCustomerRef.current = true;
                    handleCustomerChange(newValue);
                  }}
                  onInputChange={(event, newInputValue, reason) => {
                    if (reason !== 'reset') {
                      setCustomerSearchValue(newInputValue);
                      if (!newInputValue || !newInputValue.trim()) {
                        dispatch(searchCustomers(''));
                      }
                    }
                  }}
                  loading={customerLoading}
                  loadingText="Searching customers..."
                  noOptionsText={customerSearchValue ? 'No customers found' : 'Type to search for customers'}
                  renderInput={(params) => (
                    <StyledTextField
                      {...params}
                      variant="standard"
                      size="small"
                      sx={fieldSx}
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {customerLoading ? <CircularProgress color="inherit" size={16} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />
              </Stack>
            </Stack>
          </Section>

          <Box sx={{ mt: 1.5 }}>
            <Section title="Inland Information">
              <Stack spacing={2}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                  <DisplayField label="Carrier" value={getRowValue(row, 'carrier', '')} required />
                  <DisplayField label="PRO No" value={getRowValue(row, 'proNumber', '')} required />
                  <DisplayField
                    label="Invoice No"
                    value={getRowValue(row, ['invoiceNo', 'invoiceNumber'], '')}
                    editable={isReceiptDetailsEditable}
                    maxLength={50}
                    onChange={(value) => updateActiveRowField('invoiceNo', value)}
                  />
                  <DisplayField
                    label="PO No"
                    value={getRowValue(row, ['poNumber', 'poNo'], '')}
                    editable={isReceiptDetailsEditable}
                    maxLength={50}
                    onChange={(value) => updateActiveRowField('poNumber', value)}
                  />
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                  <DisplayField
                    label="Customer Ref No"
                    value={getRowValue(row, ['customerRefNo', 'customerReference'], '')}
                    width={{ xs: '100%', sm: '25%' }}
                    editable={isReceiptDetailsEditable}
                    maxLength={50}
                    onChange={(value) => updateActiveRowField('customerRefNo', value)}
                  />
                  <DisplayField
                    label="Package ID"
                    value={getRowValue(row, ['packageId', 'packageNumber'], '')}
                    width={{ xs: '100%', sm: '25%' }}
                    editable={isReceiptDetailsEditable}
                    onChange={(value) => updateActiveRowField('packageId', value)}
                  />
                  <Box sx={{ flex: 1 }} />
                  <Box sx={{ flex: 1 }} />
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                  <DisplayField label="Pieces" value={piecesInland} required />
                  <DisplayField label="Weight" value={weightInland} required />
                  <DisplayField label="RE Weight" value={totalWeight} required />
                  <DisplayField label="CBM (m³)" value={formatMeasurement(totalCbm)} required />
                  <Box sx={{ flex: 1 }} />
                </Stack>
              </Stack>
            </Section>
          </Box>

          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} sx={{ mt: 1.5, minWidth: 0 }}>
            <Box sx={{ flex: 1.2, minWidth: 0, border: '1px solid #c6c6c6', borderRadius: 1, overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: { xs: 720, lg: '100%' } }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#d9d9d9' }}>
                    {['Item', 'Pieces', 'Type', 'Length', 'Width', 'Height', 'Weight(lbs)', 'CBM(m3)', 'Actions'].map((head) => (
                      <TableCell
                        key={head}
                        sx={{
                          py: 0.6,
                          px: 0.8,
                          fontSize: 12,
                          fontWeight: 700,
                          ...(head === 'Actions'
                            ? {
                                position: 'sticky',
                                right: 0,
                                zIndex: 2,
                                bgcolor: '#d9d9d9',
                                textAlign: 'center',
                                width: 72,
                              }
                            : {}),
                        }}
                      >
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
                      <TableCell sx={{ py: 0.35, px: 0.8, fontSize: 12 }}>
                        {formatMeasurement(calculateItemCbm(item))}
                      </TableCell>
                      <TableCell
                        sx={{
                          py: 0.35,
                          px: 0.8,
                          position: 'sticky',
                          right: 0,
                          zIndex: 1,
                          bgcolor: '#fff',
                          textAlign: 'center',
                          width: 72,
                        }}
                      >
                        <IconButton
                          size="small"
                          title="View uploaded images"
                          disabled={(item.images?.length || 0) === 0}
                          onClick={() => handleOpenImages(item, index)}
                          sx={{ p: 0.2, position: 'relative' }}
                        >
                          <Iconify
                            icon="mdi:image-multiple"
                            width={20}
                            sx={{ color: (item.images?.length || 0) > 0 ? '#0a4a8f' : '#9e9e9e' }}
                          />
                          {(item.images?.length || 0) > 0 && (
                            <Box
                              component="span"
                              sx={{
                                position: 'absolute',
                                top: -5,
                                right: -6,
                                minWidth: 15,
                                height: 15,
                                px: 0.35,
                                borderRadius: '50%',
                                bgcolor: '#A22',
                                color: '#fff',
                                fontSize: 10,
                                lineHeight: '15px',
                                fontWeight: 700,
                              }}
                            >
                              {item.images.length}
                            </Box>
                          )}
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Section title="Freight Information" sx={{ height: '100%' }}>
                <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} sx={{ minWidth: 0 }}>
                  <Stack sx={{ flex: 1, minWidth: 0 }}>
                    {FREIGHT_CONDITION_OPTIONS.map((label) => (
                      <FormControlLabel
                        key={label}
                        control={
                          <Checkbox
                            checked={Boolean(activeFreightInfo.conditions[label])}
                            disabled={isMobileReceiptForm || !isReceiptDetailsEditable}
                            onChange={(event) =>
                              updateActiveFreightInfo((info) => ({
                                conditions: { ...info.conditions, [label]: event.target.checked },
                              }))
                            }
                            size="small"
                            sx={{ p: 0.4, color: '#193f75', '&.Mui-checked': { color: '#193f75' } }}
                          />
                        }
                        label={<Typography sx={{ fontSize: 12 }}>{label}</Typography>}
                      />
                    ))}
                  </Stack>
                  <Stack sx={{ flex: 1.1, minWidth: 0 }} spacing={0.7}>
                    <input
                      ref={freightCameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      style={{ display: 'none' }}
                      onChange={handleFreightCameraFileSelection}
                    />
                    <input
                      ref={freightUploadInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleFreightCameraFileSelection}
                    />
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 0.5, minWidth: 0 }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={activeFreightInfo.badFreightCondition}
                            disabled={isMobileReceiptForm || !isReceiptDetailsEditable}
                            onChange={(event) =>
                              updateActiveFreightInfo({
                                badFreightCondition: event.target.checked,
                                ...(event.target.checked ? {} : { freightConditionImages: [] }),
                              })
                            }
                            size="small"
                            sx={{ p: 0.4, color: '#193f75', '&.Mui-checked': { color: '#193f75' } }}
                          />
                        }
                        label={<Typography sx={{ fontSize: 12 }}>Bad Freight Condition</Typography>}
                      />
                      {activeFreightInfo.badFreightCondition && (
                        <>
                          <IconButton
                            size="small"
                            title="Capture freight condition image"
                            onClick={handleOpenFreightCamera}
                            disabled={isMobileReceiptForm || !isReceiptDetailsEditable}
                            sx={{
                              bgcolor: '#A22',
                              color: '#fff',
                              width: 30,
                              height: 30,
                              borderRadius: 1,
                              '&:hover': { bgcolor: '#8b1c1c' },
                            }}
                          >
                            <Iconify icon="mdi:camera" width={18} />
                          </IconButton>
                          <IconButton
                            size="small"
                            title="Upload freight condition image"
                            onClick={handleOpenFreightUpload}
                            disabled={isMobileReceiptForm || !isReceiptDetailsEditable}
                            sx={{
                              bgcolor: '#A22',
                              color: '#fff',
                              width: 30,
                              height: 30,
                              borderRadius: 1,
                              '&:hover': { bgcolor: '#8b1c1c' },
                            }}
                          >
                            <Iconify icon="mdi:image-plus" width={18} />
                          </IconButton>
                        </>
                      )}
                    </Stack>
                    {activeFreightInfo.badFreightCondition && activeFreightInfo.freightConditionImages.length > 0 && (
                      <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 0.5 }}>
                        {activeFreightInfo.freightConditionImages.map((file, index) => (
                          <WarehouseImage
                            key={`${getImageName(file, index)}-${index}`}
                            file={file}
                            imageType="badFreight"
                            alt={getImageName(file, index)}
                            onClick={() =>
                              setImageDialog({
                                open: true,
                                images: activeFreightInfo.freightConditionImages,
                                itemLabel: 'Bad Freight Condition',
                                imageType: 'badFreight',
                              })
                            }
                            sx={{
                              width: 54,
                              height: 54,
                              objectFit: 'cover',
                              border: '1px solid #d0d0d0',
                              borderRadius: 1,
                              cursor: 'pointer',
                            }}
                          />
                        ))}
                      </Stack>
                    )}
                    <Typography sx={{ fontSize: 12, fontWeight: 700 }}>Freight Condition</Typography>
                    <TextField
                      multiline
                      rows={4}
                      value={activeFreightInfo.freightConditionDescription}
                      onChange={(event) =>
                        updateActiveFreightInfo({ freightConditionDescription: event.target.value })
                      }
                      size="small"
                      InputProps={{ readOnly: !isReceiptDetailsEditable }}
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
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={activeFreightInfo.hazMat}
                          disabled={!isReceiptDetailsEditable}
                          onChange={(event) => updateActiveFreightInfo({ hazMat: event.target.checked })}
                          size="small"
                          sx={{ p: 0.4 }}
                        />
                      }
                      label={<Typography sx={{ fontSize: 12 }}>Haz Mat</Typography>}
                    />
                    {activeFreightInfo.hazMat && (
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={activeFreightInfo.originalDgd}
                            disabled={!isReceiptDetailsEditable}
                            onChange={(event) => updateActiveFreightInfo({ originalDgd: event.target.checked })}
                            size="small"
                            sx={{ p: 0.4 }}
                          />
                        }
                        label={<Typography sx={{ fontSize: 12 }}>Original DGD</Typography>}
                      />
                    )}
                  </Stack>
                  {activeFreightInfo.hazMat && (
                    <>
                      <TagInputBox
                        label="UN Number"
                        values={activeFreightInfo.unNumbers}
                        inputValue={activeFreightInfo.unNumberInput}
                        onInputChange={(value) => updateActiveFreightInfo({ unNumberInput: value })}
                        onAdd={(value) => addTagValue(value, 'unNumbers', 'unNumberInput')}
                        onRemove={(index) => removeTagValue(index, 'unNumbers')}
                        disabled={!isReceiptDetailsEditable}
                      />
                      <TagInputBox
                        label="Hazmat Class"
                        values={activeFreightInfo.hazmatClasses}
                        inputValue={activeFreightInfo.hazmatClassInput}
                        onInputChange={(value) => updateActiveFreightInfo({ hazmatClassInput: value })}
                        onAdd={(value) => addTagValue(value, 'hazmatClasses', 'hazmatClassInput')}
                        onRemove={(index) => removeTagValue(index, 'hazmatClasses')}
                        disabled={!isReceiptDetailsEditable}
                      />
                    </>
                  )}
                </Stack>
                <Stack sx={{ flex: 1, minWidth: 0 }} spacing={1}>
                  <DisplayField
                    label="Proper Shipping Name"
                    value={activeFreightInfo.properShippingName}
                    editable={isReceiptDetailsEditable}
                    onChange={(value) => updateActiveFreightInfo({ properShippingName: value })}
                  />
                  <Typography sx={{ fontSize: 12 }}>Description</Typography>
                  <TextField
                    multiline
                    rows={6}
                    size="small"
                    value={activeFreightInfo.hazardousDescription}
                    onChange={(event) => updateActiveFreightInfo({ hazardousDescription: event.target.value })}
                    InputProps={{ readOnly: !isReceiptDetailsEditable }}
                    sx={{ '& textarea': { fontSize: 12 } }}
                  />
                </Stack>
              </Stack>
            </Section>
          </Box>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ mt: 1.5, minWidth: 0 }}>
            <Stack sx={{ flex: 1, minWidth: 0 }}>
              <DisplayField
                label="Destination"
                value={getRowValue(row, ['destination', 'finalDestination'], '')}
                editable={isReceiptDetailsEditable}
                onChange={(value) => updateActiveRowField('destination', value)}
              />
            </Stack>
            <Stack sx={{ flex: 1, minWidth: 0 }} spacing={0.3}>
              <Typography sx={{ fontSize: 12 }}>Notes</Typography>
              <TextField
                multiline
                rows={6}
                size="small"
                value={activeFreightInfo.notes}
                onChange={(event) => updateActiveFreightInfo({ notes: event.target.value })}
                InputProps={{ readOnly: !isReceiptDetailsEditable }}
                sx={{ '& textarea': { fontSize: 12 } }}
              />
            </Stack>
          </Stack>
        </Box>
      </Box>
      <Dialog open={imageDialog.open} onClose={handleCloseImages} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16, pr: 5 }}>
          Uploaded Images - {imageDialog.itemLabel}
          <IconButton
            onClick={handleCloseImages}
            size="small"
            sx={{ position: 'absolute', right: 12, top: 12 }}
          >
            <Iconify icon="mdi:close" width={18} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {imageDialog.images.length === 0 ? (
            <Typography sx={{ fontSize: 13 }}>No uploaded images available.</Typography>
          ) : (
            <Stack direction="row" flexWrap="wrap" gap={2}>
              {imageDialog.images.map((file, index) => (
                <Stack
                  key={`${getImageName(file, index)}-${index}`}
                  spacing={0.8}
                  sx={{ width: 160, minWidth: 0 }}
                >
                  <Box sx={{ position: 'relative', width: 160, height: 120 }}>
                    <WarehouseImage
                      file={file}
                      imageType={imageDialog.imageType}
                      alt={getImageName(file, index)}
                      onClick={() => handleOpenFullImage(file, getImageName(file, index), imageDialog.imageType)}
                      sx={{
                            width: 160,
                            height: 120,
                            objectFit: 'cover',
                            border: '1px solid #d0d0d0',
                            borderRadius: 1,
                            cursor: 'zoom-in',
                          }}
                        />
                      {imageDialog.itemLabel === 'Bad Freight Condition' && !isMobileReceiptForm && isReceiptDetailsEditable && (
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
                      )}
                    </Box>
                    <Typography sx={{ fontSize: 12, wordBreak: 'break-word' }}>
                      {getImageName(file, index)}
                    </Typography>
                  </Stack>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button
            variant="contained"
            size="small"
            onClick={handleCloseImages}
            sx={{ ...actionBtnSx, height: 32, minWidth: 70 }}
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={fullImageDialog.open} onClose={handleCloseFullImage} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16, pr: 5 }}>
          {fullImageDialog.title || 'Image Preview'}
          <IconButton
            onClick={handleCloseFullImage}
            size="small"
            sx={{ position: 'absolute', right: 12, top: 12 }}
          >
            <Iconify icon="mdi:close" width={18} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ bgcolor: '#111', p: 2 }}>
          {getImageUrl(fullImageDialog.image, fullImageDialog.imageType) ? (
            <WarehouseImage
              file={fullImageDialog.image}
              imageType={fullImageDialog.imageType}
              alt={fullImageDialog.title || 'Image Preview'}
              sx={{
                display: 'block',
                maxWidth: '100%',
                maxHeight: '75vh',
                mx: 'auto',
                objectFit: 'contain',
                bgcolor: '#fff',
              }}
            />
          ) : (
            <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 320, color: '#fff' }} spacing={1}>
              <Iconify icon="mdi:image-off" width={32} />
              <Typography sx={{ fontSize: 13 }}>Image preview unavailable.</Typography>
            </Stack>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={freightCameraOpen} onClose={handleCloseFreightCamera} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>Capture Bad Freight Image</DialogTitle>
        <DialogContent dividers>
          <Box
            component="video"
            ref={(node) => {
    freightCameraVideoRef.current = node;
    if (node && freightCameraStreamRef.current && node.srcObject !== freightCameraStreamRef.current) {
      node.srcObject = freightCameraStreamRef.current;
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
            onClick={handleCloseFreightCamera}
            sx={{ textTransform: 'none', color: '#333', borderColor: '#aaa' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={handleTakeFreightPhoto}
            sx={{ ...actionBtnSx, height: 32 }}
          >
            Capture
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={successDialog.open} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>Success</DialogTitle>
        <DialogContent dividers>
          <Typography sx={{ fontSize: 14 }}>{successDialog.message}</Typography>
          {successDialog.receiptNumbers.length > 0 && (
            <Stack spacing={1} sx={{ mt: 2 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700 }}>Receipt Numbers</Typography>
              {successDialog.receiptNumbers.map((receiptNumber) => (
                <Stack
                  key={receiptNumber}
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  spacing={2}
                  sx={{ border: '1px solid #e2e2e2', borderRadius: 1, px: 1.2, py: 0.8 }}
                >
                  <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{receiptNumber}</Typography>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<Iconify icon="mdi:printer" width={16} />}
                    onClick={() => handleOpenPrinterDialog(receiptNumber)}
                    sx={{ ...actionBtnSx, height: 30, minWidth: 78 }}
                  >
                    Print
                  </Button>
                </Stack>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button
            variant="contained"
            size="small"
            onClick={handleSuccessDialogOk}
            sx={{ ...actionBtnSx, height: 32, minWidth: 70 }}
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={printerDialog.open} onClose={handleClosePrinterDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16, pr: 5 }}>
          Select Printer
          <IconButton
            onClick={handleClosePrinterDialog}
            size="small"
            sx={{ position: 'absolute', right: 12, top: 12 }}
          >
            <Iconify icon="mdi:close" width={18} />
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
                disabled={printersDropdown.loading || printLoading}
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
              disabled={printersDropdown.loading || printLoading || !selectedPrinterId}
              onClick={handlePrintReceipt}
              sx={{ ...actionBtnSx, height: 36, minWidth: 82, mt: { xs: 0, sm: '21px' } }}
            >
              {printLoading ? 'Printing...' : 'Print'}
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>
      <Dialog
        open={ratesDialogOpen}
        onClose={() => setRatesDialogOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 1.2,
            minHeight: 430,
          },
        }}
      >
        <DialogContent sx={{ p: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ borderBottom: '1px solid #777', pb: 0.8 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
              Charges/Rating - {viewReceiptSummary?.receiptNumber || activeForm?.receiptNumber || ''}
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setRatesDialogOpen(false)}
                sx={{ height: 24, minWidth: 70, color: '#111', borderColor: '#111', textTransform: 'none', fontSize: 11 }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                size="small"
                onClick={() => handleViewAction('Ready for Approval action is not available yet')}
                sx={{ ...actionBtnSx, height: 24, minWidth: 132, fontSize: 11 }}
              >
                Ready for Approval
              </Button>
            </Stack>
          </Stack>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems={{ xs: 'stretch', md: 'flex-end' }} sx={{ mt: 2 }}>
            <TextField
              variant="standard"
              label="Dim Factor"
              defaultValue="165"
              size="small"
              sx={{ flex: 1, '& .MuiInputLabel-root': { fontSize: 11 }, '& input': { fontSize: 12 } }}
            />
            <TextField
              variant="standard"
              label="Base Rate"
              defaultValue="0.025"
              size="small"
              sx={{ flex: 1, '& .MuiInputLabel-root': { fontSize: 11 }, '& input': { fontSize: 12 } }}
            />
            <FormControlLabel
              control={<Checkbox defaultChecked size="small" sx={{ p: 0.35, color: '#102a63', '&.Mui-checked': { color: '#102a63' } }} />}
              label={<Typography sx={{ fontSize: 12 }}>Flat Rate</Typography>}
              sx={{ mx: 0, pb: 0.3 }}
            />
            <TextField
              variant="standard"
              label="Flat Rate"
              defaultValue="100"
              size="small"
              sx={{ flex: 0.75, '& .MuiInputLabel-root': { fontSize: 11 }, '& input': { fontSize: 12 } }}
            />
            <TextField
              variant="standard"
              label="Notes"
              defaultValue="-"
              size="small"
              sx={{ flex: 1, '& .MuiInputLabel-root': { fontSize: 11 }, '& input': { fontSize: 12 } }}
            />
          </Stack>

          <Table size="small" sx={{ mt: 4, border: '1px solid #d0d0d0', '& th': { bgcolor: '#f5f5f5', fontSize: 11, fontWeight: 700 }, '& td': { fontSize: 12 } }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 110 }}>Pieces ⇅</TableCell>
                <TableCell sx={{ width: 110 }}>Type ⇅</TableCell>
                <TableCell>Pieces x L x W x H / Dim Factor (Dimensional Weight) ⇅</TableCell>
                <TableCell sx={{ width: 140 }}>Actual Weight ⇅</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {getRateDialogRows().map((row, index) => (
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
                <TableCell sx={{ fontWeight: 700 }}>{getRatesTotal().dimWeightTotal} lbs</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{getRatesTotal().actualWeightTotal} lbs</TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <Typography sx={{ mt: 2, ml: 1.2, fontSize: 13 }}>
            Total Estimated Cost - <Box component="span" sx={{ fontWeight: 700 }}>${getRatesTotal().estimatedCost}</Box> (Calculated based on Dimensional Weight )
          </Typography>

          <Box sx={{ mt: 1.5, ml: 1.2, bgcolor: '#dff0fa', borderRadius: 1, px: 1.5, py: 1.1, width: { xs: '100%', sm: 395 }, boxSizing: 'border-box' }}>
            <Typography sx={{ fontSize: 11 }}>
              Calculated Based on <Box component="span" sx={{ fontWeight: 700 }}>$0.025</Box> per lbs.
            </Typography>
            <Typography sx={{ fontSize: 11 }}>
              Minimum and maximum charges are <Box component="span" sx={{ fontWeight: 700 }}>$20</Box> and <Box component="span" sx={{ fontWeight: 700 }}>$195</Box> respectively.
            </Typography>
          </Box>
        </DialogContent>
      </Dialog>
      <Dialog
        open={splitDialogOpen}
        onClose={handleCloseSplitDialog}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 1,
            minHeight: splitStep === 1 ? 545 : 430,
          },
        }}
      >
        <DialogContent sx={{ p: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ borderBottom: '1px solid #777', pb: 0.8 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
              Split - {viewReceiptSummary?.receiptNumber || activeForm?.receiptNumber || ''}
            </Typography>
            {splitStep === 0 ? (
              <Button
                variant="contained"
                size="small"
                onClick={handleCloseSplitDialog}
                sx={{ ...actionBtnSx, height: 24, minWidth: 58, fontSize: 11 }}
              >
                Exit
              </Button>
            ) : (
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setSplitStep((prev) => Math.max(prev - 1, 0))}
                  sx={{ height: 24, minWidth: 58, color: '#111', borderColor: '#111', textTransform: 'none', fontSize: 11 }}
                >
                  Back
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => {
                    if (splitStep === 1) {
                      setActiveSplitFormTab(0);
                      setSplitStep(2);
                      return;
                    }

                    handleViewAction('Submit split action is not available yet');
                  }}
                  sx={{ ...actionBtnSx, height: 24, minWidth: 58, fontSize: 11 }}
                >
                  {splitStep === 2 ? 'Submit' : 'Next'}
                </Button>
              </Stack>
            )}
          </Stack>

          {renderSplitStepper(splitStep)}
          {splitStep === 0 && renderSplitStartStep()}
          {splitStep === 1 && (splitDimensionMode === 'existing' ? renderSplitExistingFreightStep() : renderSplitFreightStep())}
          {splitStep === 2 && renderSplitFormInfoStep()}
        </DialogContent>
      </Dialog>
      <Dialog
        open={statusHistoryDialogOpen}
        onClose={() => setStatusHistoryDialogOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 0.8,
            minHeight: 420,
          },
        }}
      >
        <DialogContent sx={{ p: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ borderBottom: '1px solid #777', pb: 0.8 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700 }}>Warehouse Receipt Status History</Typography>
            <Button
              variant="contained"
              size="small"
              onClick={() => setStatusHistoryDialogOpen(false)}
              sx={{ ...actionBtnSx, height: 24, minWidth: 58, fontSize: 11 }}
            >
              OK
            </Button>
          </Stack>

          <Table
            size="small"
            sx={{
              mt: 4,
              border: '1px solid #d0d0d0',
              '& th': { bgcolor: '#f5f5f5', fontSize: 11, fontWeight: 500 },
              '& td': { fontSize: 12, verticalAlign: 'top' },
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 110 }}>Warehouse ID ⇅</TableCell>
                <TableCell sx={{ width: 130 }}>Pro ⇅</TableCell>
                <TableCell sx={{ width: 100 }}>Level ⇅</TableCell>
                <TableCell sx={{ width: 130 }}>Time ⇅</TableCell>
                <TableCell sx={{ width: 90 }}>User ⇅</TableCell>
                <TableCell sx={{ width: 100 }}>Status ⇅</TableCell>
                <TableCell>Description ⇅</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {auditLogsLoading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : auditLogsError ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 3, color: '#A22' }}>
                    {auditLogsError}
                  </TableCell>
                </TableRow>
              ) : getStatusHistoryRows().length ? (
                getStatusHistoryRows().map((row, index) => (
                  <TableRow key={`${row.warehouseId}-${row.user}-${index}`}>
                    <TableCell>{row.warehouseId}</TableCell>
                    <TableCell>{row.pro}</TableCell>
                    <TableCell>{row.level}</TableCell>
                    <TableCell>{row.time}</TableCell>
                    <TableCell>{row.user}</TableCell>
                    <TableCell>{row.status}</TableCell>
                    <TableCell>{row.description}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                    No status history found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
      <Dialog
        open={notesDialogOpen}
        onClose={() => setNotesDialogOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 1,
            minHeight: 430,
          },
        }}
      >
        <DialogContent sx={{ p: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ borderBottom: '1px solid #777', pb: 0.8 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700 }}>Warehouse Receipt Notes</Typography>
            <Button
              variant="contained"
              size="small"
              onClick={() => setNotesDialogOpen(false)}
              sx={{ ...actionBtnSx, height: 24, minWidth: 58, fontSize: 11 }}
            >
              OK
            </Button>
          </Stack>

          <Box sx={{ mt: 2.2, maxWidth: '100%' }}>
            <TextField
              variant="standard"
              label={
                <Box component="span">
                  Notes <Box component="span" sx={{ color: '#A22' }}>*</Box>
                </Box>
              }
              value={receiptNoteText}
              onChange={(event) => setReceiptNoteText(event.target.value)}
              fullWidth
              size="small"
              sx={{
                '& .MuiInputLabel-root': { fontSize: 11 },
                '& .MuiInputBase-input': { fontSize: 12, py: 0.2 },
              }}
            />
            <Button
              variant="contained"
              size="small"
              onClick={handleAddReceiptNote}
              disabled={receiptNotesSaving}
              sx={{ ...actionBtnSx, mt: 0.8, height: 24, minWidth: 82, fontSize: 11 }}
            >
              {receiptNotesSaving ? 'Saving...' : 'Add Notes'}
            </Button>
          </Box>

          <Table
            size="small"
            sx={{
              mt: 3,
              border: '1px solid #d0d0d0',
              '& th': { bgcolor: '#f5f5f5', fontSize: 11, fontWeight: 500 },
              '& td': { fontSize: 12, verticalAlign: 'top' },
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 190 }}>Time</TableCell>
                <TableCell sx={{ width: 120 }}>User</TableCell>
                <TableCell>Notes</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {receiptNotesLoading ? (
                <TableRow>
                  <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : receiptNotesError ? (
                <TableRow>
                  <TableCell colSpan={3} align="center" sx={{ py: 3, color: '#A22' }}>
                    {receiptNotesError}
                  </TableCell>
                </TableRow>
              ) : receiptNotes.length ? (
                receiptNotes.map((note, index) => (
                  <TableRow key={note.noteMessageId || `${note.createdAt}-${note.createdBy}-${index}`}>
                    <TableCell>{formatStatusHistoryTime(note.createdAt)}</TableCell>
                    <TableCell>{note.createdByName || note.createdBy || ''}</TableCell>
                    <TableCell>{note.messageText || ''}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} align="center" sx={{ py: 3 }}>
                    No notes found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
      <Dialog
        open={splitMailDialogOpen}
        onClose={() => setSplitMailDialogOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 1,
            minHeight: 430,
          },
        }}
      >
        <DialogContent sx={{ p: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ borderBottom: '1px solid #777', pb: 0.8 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700 }}>Mail List</Typography>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setSplitMailDialogOpen(false)}
                sx={{ height: 24, minWidth: 70, color: '#111', borderColor: '#111', textTransform: 'none', fontSize: 11 }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                size="small"
                onClick={() => {
                  setSplitMailDialogOpen(false);
                  handleViewAction('Mail sent successfully');
                }}
                sx={{ ...actionBtnSx, height: 24, minWidth: 58, fontSize: 11 }}
              >
                Send
              </Button>
            </Stack>
          </Stack>

          <Table
            size="small"
            sx={{
              mt: 5,
              border: '1px solid #d0d0d0',
              '& th': { bgcolor: '#f5f5f5', fontSize: 11, fontWeight: 500, py: 0.6 },
              '& td': { fontSize: 12, py: 0.45 },
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 46 }} />
                <TableCell sx={{ width: 70 }}>SNo</TableCell>
                <TableCell sx={{ width: 120 }}>Type</TableCell>
                <TableCell>EmailID</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {SPLIT_MAIL_LIST_ROWS.map((row) => (
                <TableRow key={row.id}>
                  <TableCell sx={{ textAlign: 'center' }}>
                    <Checkbox
                      size="small"
                      checked={selectedSplitMailIds.includes(row.id)}
                      onChange={() => handleToggleSplitMail(row.id)}
                      sx={{ p: 0.2, color: '#102a63', '&.Mui-checked': { color: '#102a63' } }}
                    />
                  </TableCell>
                  <TableCell>{row.sno}</TableCell>
                  <TableCell>{row.type}</TableCell>
                  <TableCell>{row.emailId}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Box component="fieldset" sx={{ mt: 3, border: '1px solid #777', borderRadius: 1, px: 1.2, py: 1.2, minHeight: 64 }}>
            <Box component="legend" sx={{ px: 0.7, fontSize: 12, fontWeight: 700 }}>Email Addresses</Box>
            <Stack direction="row" flexWrap="wrap" gap={0.8}>
              {SPLIT_MAIL_LIST_ROWS.filter((row) => selectedSplitMailIds.includes(row.id)).map((row, index) => (
                <Box
                  key={`${row.id}-${index}`}
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.5,
                    bgcolor: '#d8ecfb',
                    borderRadius: 3,
                    px: 1,
                    py: 0.4,
                    fontSize: 11,
                  }}
                >
                  {index % 2 === 0 ? 'user6050599@example.com' : '50599@example.com'}
                  <IconButton
                    size="small"
                    onClick={() => handleRemoveSplitMailAddress(row.id)}
                    sx={{ p: 0, color: '#111' }}
                  >
                    <Iconify icon="mdi:close-circle" width={14} />
                  </IconButton>
                </Box>
              ))}
            </Stack>
          </Box>
        </DialogContent>
      </Dialog>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
      <Divider />
    </Box>
  );
}
