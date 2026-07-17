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
  Menu,
  MenuList,
  MenuItem,
  Popover,
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
import WarehouseReceiptPrintTemplate from '../warehouse-receipt-form/WarehouseReceiptPrintTemplate';
import { useDispatch, useSelector } from '../../redux/store';
import { searchCustomers } from '../../redux/slices/enroute';
import { getIdVerificationData } from '../../redux/slices/idVerification';
import {
  clearWarehouseCheckInDraft,
  createTempWarehouseReceipt,
  fetchCargoApiDropdown,
  fetchCargoApiDimensions,
  fetchPrintersDropdown,
  printWarehouseReceiptLabel,
  setWarehouseCheckInDraft,
  submitWarehouseReceiptBatch,
} from '../../redux/slices/warehouse';
import {
  getWarehouseReceiptAuditLogs,
  getWarehouseReceiptNotes,
  postWarehouseReceiptNote,
  updateWarehouseReceipt,
} from '../../redux/slices/warehouseReceipt';
import { PATH_DASHBOARD } from '../../routes/paths';
import { HOST_API_KEY } from '../../config';
import axios from '../../utils/axios';

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

const fieldSx = {
  '& .MuiInputBase-input': { fontSize: 13, py: 0.2 },
  '& .MuiFormHelperText-root': { display: 'none' },
};

const FREIGHT_CONDITION_OPTIONS = ['Banded Skid', 'Shrink Wrapped Skid', 'SHT / IPPC Skid', 'Plastic Skid', 'Document'];
const FREIGHT_TYPE_OPTIONS = [
  'Skid',
  'Crate',
  'Drum',
  'Pail',
  'Bundle',
  'Bag',
  'Basket',
  'Box',
  'Carton',
  'Jerrican',
  'Package',
  'Pallet',
  'Cylinder',
  'Tote',
  'Roll',
  'Reel',
  'Tube',
];
const DECIMAL_ITEM_FIELDS = new Set(['length', 'width', 'height', 'weight']);
const REQUIRED_FREIGHT_ITEM_FIELDS = [
  { field: 'pieces', label: 'Pieces' },
  { field: 'type', label: 'Type' },
  { field: 'length', label: 'Length' },
  { field: 'width', label: 'Width' },
  { field: 'height', label: 'Height' },
  { field: 'weight', label: 'Weight' },
];
const REQUIRED_FREIGHT_ITEM_FIELD_SET = new Set(REQUIRED_FREIGHT_ITEM_FIELDS.map(({ field }) => field));
const FREIGHT_ITEM_TABLE_HEADERS = [
  { label: 'Item' },
  { label: 'Pieces', field: 'pieces' },
  { label: 'Type', field: 'type' },
  { label: 'Length (in)', field: 'length' },
  { label: 'Width (in)', field: 'width' },
  { label: 'Height (in)', field: 'height' },
  { label: 'Weight(lbs)', field: 'weight' },
  { label: 'CBM(m3)' },
  { label: 'Actions' },
];
const ROW_FIELD_ALIASES = {
  invoiceNo: ['invoiceNo', 'invoiceNumber'],
  invoiceNumber: ['invoiceNo', 'invoiceNumber'],
  poNumber: ['poNumber', 'poNo'],
  poNo: ['poNumber', 'poNo'],
  customerRefNo: ['customerRefNo', 'customerReference'],
  customerReference: ['customerRefNo', 'customerReference'],
  packageId: ['packageId', 'packageNumber'],
  packageNumber: ['packageId', 'packageNumber'],
  destination: ['destination', 'finalDestination'],
  finalDestination: ['destination', 'finalDestination'],
};
const INCH_TO_METER = 0.0254;

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

const createEmptySplitFormDetails = (baseRow = {}) => ({
  row: {
    ...baseRow,
    invoiceNo: '',
    invoiceNumber: '',
    poNumber: '',
    poNo: '',
    customerRefNo: '',
    customerReference: '',
    packageId: '',
    packageNumber: '',
    destination: '',
    finalDestination: '',
  },
  freightInfo: createFreightInfo(),
});

const createSplitRecalculateItem = (id = 1) => ({
  id,
  pieces: '',
  type: '',
  length: '',
  width: '',
  height: '',
  weight: '',
  images: [],
});

const SPLIT_ITEM_MANDATORY_FIELDS = [
  { field: 'pieces', label: 'Pieces' },
  { field: 'type', label: 'Type' },
  { field: 'length', label: 'Length' },
  { field: 'width', label: 'Width' },
  { field: 'height', label: 'Height' },
  { field: 'weight', label: 'Weight' },
];

const getNextSplitItemId = (items = []) =>
  items.length ? Math.max(...items.map((item) => Number(item.id) || 0)) + 1 : 1;

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
  INCH_TO_METER *
  Number(formatDecimal10_2Input(item.width)) *
  INCH_TO_METER *
  Number(formatDecimal10_2Input(item.height)) *
  INCH_TO_METER;

const formatMeasurement = (value) => {
  if (value === undefined || value === null || value === '') return '';
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return value;
  return Number.isInteger(numberValue) ? numberValue : Number(numberValue.toFixed(3));
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

const getRowFieldPatch = (field, value) =>
  (ROW_FIELD_ALIASES[field] || [field]).reduce(
    (patch, alias) => ({
      ...patch,
      [alias]: value,
    }),
    {}
  );

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

const getNormalizedEmailAddress = (email) => {
  if (typeof email === 'string') return email;
  return email?.entryEmail || email?.email || '';
};

const normalizeSubmitEmailList = (value) =>
  normalizeEmailList(value)
    .map(getNormalizedEmailAddress)
    .map((email) => String(email || '').trim())
    .filter(Boolean);

const mergeUniqueEmailLists = (...emailLists) => {
  const seenEmails = new Set();

  return emailLists
    .flatMap((emailList) => normalizeSubmitEmailList(emailList))
    .filter((email) => {
      const emailKey = email.toLowerCase();
      if (seenEmails.has(emailKey)) return false;
      seenEmails.add(emailKey);
      return true;
    });
};

const hasStationDefaultEmails = (row = {}) =>
  String(row.stationDefaultEmails?.hasDefaultEmails || '').trim().toUpperCase() === 'Y';

const getStationDefaultEmailList = (row = {}) =>
  hasStationDefaultEmails(row) ? normalizeSubmitEmailList(row.stationDefaultEmails?.emails || []) : [];

const getSubmitToEmails = (row = {}) =>
  mergeUniqueEmailLists(getRowValue(row, 'toEmails', []), getStationDefaultEmailList(row));

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

const hasValidCustomerSelection = (value) =>
  Boolean(value?.customerId) && Boolean(value?.stationId);

const isYes = (value) => String(value || '').toUpperCase() === 'Y';

const formatWarehouseReceiptStatus = (value) =>
  String(value || '')
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('-');

const formatWarehouseReceiptDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).split(' ')[0] || '';
  return date.toLocaleDateString('en-US');
};

const buildFreightInfoFromWarehouseReceipt = (receipt = {}) => ({
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

const buildWarehouseReceiptGridRow = (receipt = {}) => {
  const firstFreight = receipt.freightInformation?.[0] || {};
  const rateValue = receipt.rateInformation?.finalRate;

  return {
    id: receipt.receiptId || receipt.receiptNumber,
    receiptId: receipt.receiptId,
    receiptNumber: receipt.receiptNumber,
    sendToTellSystem: receipt.sendToTellSystem,
    status: formatWarehouseReceiptStatus(receipt.status),
    carrier: receipt.carrierName || '',
    customer: [receipt.customerName, receipt.stationName].filter(Boolean).join(' | '),
    destination: receipt.destination || receipt.finalDestination || '',
    proNumber: receipt.proNumber || '',
    idVerification: receipt.verificationId || '',
    location: receipt.location || '',
    rate: rateValue === null || rateValue === undefined ? '' : Number(rateValue).toFixed(2),
    createdDate: formatWarehouseReceiptDate(receipt.createdAt || receipt.receiptDate),
    receivedBy: receipt.receivedBy || '',
    pieces: String(firstFreight.pieces ?? receipt.piecesInland ?? ''),
    type: firstFreight.type || '',
    length: String(firstFreight.length ?? ''),
    width: String(firstFreight.width ?? ''),
    height: String(firstFreight.height ?? ''),
    weight: String(firstFreight.weight ?? receipt.weightInland ?? ''),
    invoiceNo: receipt.invoiceNumber || '',
    poNumber: receipt.poNumber || '',
    customerRefNo: receipt.customerRefNumber || '',
    receiptType: receipt.receiptType || '',
    rawData: receipt,
  };
};

const buildWarehouseReceiptViewState = (row = {}, warehouseReceiptGridState) => {
  const receipt = row.rawData || {};
  const freightInfo = buildFreightInfoFromWarehouseReceipt(receipt);
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

  return {
    title: 'Warehouse Receipt Form',
    draftKey: `warehouse-receipt-view-${row.receiptNumber}`,
    warehouseReceiptView: true,
    warehouseReceiptGridState,
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
  };
};

const formatDate = (date = new Date()) =>
  date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

const getLocalDstDeltaMinutes = (date) => {
  const januaryOffset = new Date(date.getFullYear(), 0, 1).getTimezoneOffset();
  const julyOffset = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
  const standardOffset = Math.max(januaryOffset, julyOffset);

  return Math.max(standardOffset - date.getTimezoneOffset(), 0);
};

const formatStatusHistoryTime = (value) => {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  const displayDate = new Date(date.getTime() - getLocalDstDeltaMinutes(date) * 60 * 1000);

  return displayDate.toLocaleString('en-US', {
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

const buildTempReceiptPayloadFromForm = (form = {}) => {
  const row = form.row || {};

  return {
    verificationId: getRowValue(row, 'verificationId', 0),
    shipper: getRowValue(row, ['shipper', 'shipperName', 'shipperCompany'], ''),
    customerId: getRowValue(row, 'customerId', 0),
    stationId: getRowValue(row, 'stationId', 0),
    carrierId: getRowValue(row, 'carrierId', 0),
    status: 'INITIATE',
    receivedBy: form.receivedBy || '',
    location: form.location || '',
    destination: getRowValue(row, ['destination', 'finalDestination'], 0),
    proNumber: getRowValue(row, 'proNumber', ''),
    packageId: getRowValue(row, ['packageId', 'packageNumber'], 0),
  };
};

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

const getMailEmailValue = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value !== 'object') return String(value).trim();

  return String(
    value.emailId ||
      value.emailID ||
      value.email ||
      value.emailAddress ||
      value.customerEmail ||
      value.entryEmail ||
      value.toEmail ||
      ''
  ).trim();
};

const getMailTypeValue = (value) => {
  if (!value || typeof value !== 'object') return '';
  return value.type || value.emailType || value.contactType || value.customerEmailType || value.entryType || '';
};

const getMailEmailKey = (value) => getMailEmailValue(value).toLowerCase();

const getUniqueMailEmails = (value) =>
  normalizeEmailList(value)
    .map(getMailEmailValue)
    .filter(Boolean)
    .filter((email, index, emails) =>
      emails.findIndex((currentEmail) => currentEmail.toLowerCase() === email.toLowerCase()) === index
    );

const normalizeTempEmailList = (value) => {
  if (Array.isArray(value)) return getUniqueMailEmails(value);
  if (!value) return [];

  return String(value)
    .split(/[\s,;]+/)
    .map((email) => email.trim())
    .filter(Boolean)
    .filter((email, index, emails) =>
      emails.findIndex((currentEmail) => currentEmail.toLowerCase() === email.toLowerCase()) === index
    );
};

const getCustomerEmailRows = (value) =>
  normalizeEmailList(value)
    .map((emailEntry, index) => {
      const emailId = getMailEmailValue(emailEntry);

      if (!emailId) return null;

      return {
        id: `${getMailEmailKey(emailEntry)}-${index}`,
        sno: String(index + 1).padStart(2, '0'),
        type: getMailTypeValue(emailEntry),
        emailId,
      };
    })
    .filter(Boolean);

const mergeCustomerAndSelectedEmailRows = (customerEmailRows, selectedEmails) => {
  const existingEmailKeys = new Set(customerEmailRows.map((row) => row.emailId.toLowerCase()));
  const extraSelectedRows = selectedEmails
    .filter((email) => !existingEmailKeys.has(email.toLowerCase()))
    .map((email, index) => ({
      id: `selected-${email.toLowerCase()}-${index}`,
      sno: String(customerEmailRows.length + index + 1).padStart(2, '0'),
      type: 'To Email',
      emailId: email,
    }));

  return [...customerEmailRows, ...extraSelectedRows];
};

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
  const displayValue = maxLength
    ? String(value ?? '').slice(0, maxLength)
    : value ?? '';

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

function TagInputBox({ label, values, inputValue, onInputChange, onAdd, onRemove, disabled = false, framed = true }) {
  const handleKeyDown = (event) => {
    if (disabled) return;
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      onAdd(inputValue);
    }
  };

  return (
    <Box>
      {label && <Typography sx={{ fontSize: 12, mb: 0.6 }}>{label}</Typography>}
      <Box
        sx={{
          minHeight: 64,
          border: framed ? '1px solid #8f8f8f' : 0,
          borderRadius: framed ? 1 : 0,
          p: framed ? 1 : 0,
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
        value={value ?? ''}
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
  if (cleanImageName.startsWith('base64,')) {
    const base64Value = cleanImageName.slice('base64,'.length);
    return base64Value ? `data:${getBase64ImageMimeType(base64Value)};base64,${base64Value}` : '';
  }
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
  if (file.imageUrl) return getUploadImageUrl(file.imageUrl, imageType);
  if (file.preview) return getUploadImageUrl(file.preview, imageType);
  if (file.base64) return getImageUrl(file.base64, imageType);
  if (file.image) return getImageUrl(file.image, imageType);
  if (file.fileName) return getUploadImageUrl(file.fileName, imageType);
  if (file.filename) return getUploadImageUrl(file.filename, imageType);
  if (file.imageName) return getUploadImageUrl(file.imageName, imageType);
  if (file.path) return getUploadImageUrl(file.path, imageType);
  if (file.filePath) return getUploadImageUrl(file.filePath, imageType);
  if (file.imagePath) return getUploadImageUrl(file.imagePath, imageType);
  if (file.uploadPath) return getUploadImageUrl(file.uploadPath, imageType);
  if (file.name) return getUploadImageUrl(file.name, imageType);
  return '';
};

const getImageName = (file, index) => {
  if (!file) return `Image ${index + 1}`;
  if (typeof file === 'string') {
    if (looksLikeBase64Image(file) || file.startsWith('data:image/')) return `Cargo API Image ${index + 1}`;
    return file.split('/').pop() || `Image ${index + 1}`;
  }
  return file.name || file.filename || file.fileName || file.imageName || file.imageUrl?.split('/').pop() || file.path?.split('/').pop() || file.filePath?.split('/').pop() || file.imagePath?.split('/').pop() || file.uploadPath?.split('/').pop() || `Image ${index + 1}`;
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
    image.imageUrl ||
    image.preview ||
    image.fileName ||
    image.filename ||
    image.imageName ||
    image.path ||
    image.filePath ||
    image.imagePath ||
    image.uploadPath ||
    ''
  );
};

const getFreightDetailImageName = (image) => {
  if (!image) return '';
  if (image instanceof Blob) return '';

  const imageValue = typeof image === 'string'
    ? image
    : image.fileName ||
      image.filename ||
      image.imageName ||
      image.imageUrl ||
      image.path ||
      image.filePath ||
      image.imagePath ||
      image.uploadPath ||
      image.url ||
      image.preview ||
      '';
  const cleanValue = String(imageValue || '').trim();

  if (!cleanValue || cleanValue.startsWith('data:image/') || cleanValue.startsWith('blob:')) return '';

  return cleanValue.split(/[\\/]/).pop()?.split('?')[0]?.trim() || '';
};

const getFreightDetailImageNames = (images = []) => {
  if (!Array.isArray(images)) return [];
  return images.map(getFreightDetailImageName).filter(Boolean);
};

const getReceiptImageRemovePath = (image) => {
  const imageName = getFreightDetailImageName(image);
  return looksLikeBase64Image(imageName) ? '' : imageName;
};

const isPersistedReceiptImage = (image) => Boolean(getReceiptImageRemovePath(image));

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
  const { warehouseReceiptBatch, printersDropdown, warehouseCheckInDrafts, cargoApiDropdown } = useSelector((reduxState) => reduxState.warehousedata);
  const {
    auditLogs,
    auditLogsLoading,
    auditLogsError,
    receiptNotes,
    receiptNotesLoading,
    receiptNotesSaving,
    receiptNotesError,
    updateReceiptLoading,
  } = useSelector((reduxState) => reduxState.warehouseReceiptdata);
  const isMobileReceiptForm = useMediaQuery('(max-width:599.95px)', { noSsr: true });
  const isSelectingCustomerRef = useRef(false);
  const freightCameraVideoRef = useRef(null);
  const freightCameraStreamRef = useRef(null);
  const freightCameraInputRef = useRef(null);
  const freightUploadInputRef = useRef(null);
  const splitItemUploadInputRef = useRef(null);
  const splitItemCameraInputRef = useRef(null);
  const splitItemCameraVideoRef = useRef(null);
  const splitItemCameraStreamRef = useRef(null);
  const splitFreightImageFormIndexRef = useRef(null);
  const editReceiptSnapshotRef = useRef(null);
  const selectedDraftKey = state?.draftKey || 'regular';
  const isWarehouseReceiptView = Boolean(state?.warehouseReceiptView);
  const isWarehouseReceiptEdit = Boolean(state?.warehouseReceiptEdit);
  const viewReceiptSummary = state?.viewReceiptSummary || null;
  const initialReceiptForms = useMemo(() => {
    const routeReceiptForms = state?.receiptForms || [];
    const routeReceipts = state?.receipts || [];
    const savedReceiptForms = warehouseCheckInDrafts?.[selectedDraftKey]?.receiptForms || [];

    if (routeReceiptForms.length) return routeReceiptForms;

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
  }, [state?.receiptForms, state?.receipts, selectedDraftKey, warehouseCheckInDrafts]);
  const [receiptForms, setReceiptForms] = useState(initialReceiptForms);
  const [activeTab, setActiveTab] = useState(initialReceiptForms[0]?.id || '');
  const [imageDialog, setImageDialog] = useState({ open: false, images: [], itemLabel: '', imageType: 'freight', splitFormIndex: null });
  const [fullImageDialog, setFullImageDialog] = useState({ open: false, image: null, title: '', imageType: 'freight' });
  const [receiptInfoErrors, setReceiptInfoErrors] = useState({});
  const [customerSearchValue, setCustomerSearchValue] = useState('');
  const [freightCameraOpen, setFreightCameraOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [successDialog, setSuccessDialog] = useState({ open: false, message: '', receiptNumbers: [], source: '' });
  const [cancelEditConfirmOpen, setCancelEditConfirmOpen] = useState(false);
  const [printerDialog, setPrinterDialog] = useState({ open: false, receiptNumber: '' });
  const [selectedPrinterId, setSelectedPrinterId] = useState('');
  const [printLoading, setPrintLoading] = useState(false);
  const [printReceipt, setPrintReceipt] = useState(null);
  const [ratesDialogOpen, setRatesDialogOpen] = useState(false);
  const [ratesNoticeOpen, setRatesNoticeOpen] = useState(false);
  const [statusHistoryDialogOpen, setStatusHistoryDialogOpen] = useState(false);
  const [statusHistoryLinkLoadingId, setStatusHistoryLinkLoadingId] = useState('');
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [splitMailDialogOpen, setSplitMailDialogOpen] = useState(false);
  const [splitMailFormIndex, setSplitMailFormIndex] = useState(null);
  const [selectedSplitMailEmails, setSelectedSplitMailEmails] = useState([]);
  const [splitTempEmails, setSplitTempEmails] = useState([]);
  const [splitTempEmailInput, setSplitTempEmailInput] = useState('');
  const [splitDialogOpen, setSplitDialogOpen] = useState(false);
  const [splitBackConfirmOpen, setSplitBackConfirmOpen] = useState(false);
  const [splitStep, setSplitStep] = useState(0);
  const [splitDimensionMode, setSplitDimensionMode] = useState('recalculate');
  const [splitFormCount, setSplitFormCount] = useState(1);
  const [activeSplitFormTab, setActiveSplitFormTab] = useState(0);
  const [splitExistingFormItems, setSplitExistingFormItems] = useState([[]]);
  const [splitFormDetails, setSplitFormDetails] = useState([]);
  const [splitRecalculateFormItems, setSplitRecalculateFormItems] = useState([[createSplitRecalculateItem(1)]]);
  const [splitRecalculateItemErrors, setSplitRecalculateItemErrors] = useState({});
  const [splitExistingItemErrors, setSplitExistingItemErrors] = useState({});
  const [splitExistingFormErrors, setSplitExistingFormErrors] = useState({});
  const [splitMoveMenu, setSplitMoveMenu] = useState({ anchorEl: null, itemIndex: null });
  const [splitTempReceiptNumbers, setSplitTempReceiptNumbers] = useState([]);
  const [splitTempReceiptLoading, setSplitTempReceiptLoading] = useState(false);
  const [splitSubmitLoading, setSplitSubmitLoading] = useState(false);
  const [splitCargoApiLoadingItems, setSplitCargoApiLoadingItems] = useState({});
  const [splitPackageDropdownAnchor, setSplitPackageDropdownAnchor] = useState(null);
  const [splitPackageDropdownContext, setSplitPackageDropdownContext] = useState({ formIndex: null, itemId: null });
  const [splitItemUploadContext, setSplitItemUploadContext] = useState({ formIndex: null, itemId: null });
  const [splitItemUploadDialogOpen, setSplitItemUploadDialogOpen] = useState(false);
  const [splitItemStagedFiles, setSplitItemStagedFiles] = useState([]);
  const [splitItemDraggingFiles, setSplitItemDraggingFiles] = useState(false);
  const [splitItemCameraOpen, setSplitItemCameraOpen] = useState(false);
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
      navigate(PATH_DASHBOARD.warehouseReceiptDashboard, {
        state: {
          warehouseReceiptGridState: state?.warehouseReceiptGridState,
        },
      });
      return;
    }

    persistReceiptFormDraft();
    navigate(
      selectedDraftKey === 'trailer'
        ? PATH_DASHBOARD.warehouseCheckInTrailer
        : PATH_DASHBOARD.warehouseCheckInRegular
    );
  };

  useEffect(() => {
    const handleAfterPrint = () => setPrintReceipt(null);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

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

  const handlePrintWarehouseReceipt = () => {
    const receipt = activeForm?.row?.rawData || activeForm?.row;
    if (!receipt) return;

    setPrintReceipt(receipt);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => window.print());
    });
  };

  useEffect(() => {
    if (isWarehouseReceiptEdit) {
      if (!editReceiptSnapshotRef.current) {
        editReceiptSnapshotRef.current = {
          receiptForms,
          activeTab,
          receiptInfoErrors,
          receiptNoteText,
        };
      }
      return;
    }

    editReceiptSnapshotRef.current = null;
  }, [isWarehouseReceiptEdit]);

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
    splitItemCameraStreamRef.current?.getTracks?.().forEach((track) => track.stop());
    splitItemCameraStreamRef.current = null;
  }, []);

  useEffect(() => {
    const hasLoadedForms = initialReceiptForms.some((form) => form.id !== 'empty-1');
    const hasPlaceholderForm = receiptForms.length === 1 && receiptForms[0]?.id === 'empty-1';
    const routeSignature = getReceiptFormSignature(initialReceiptForms);
    const currentSignature = getReceiptFormSignature(receiptForms);

    if (!hasLoadedForms || (!hasPlaceholderForm && (!isWarehouseReceiptView || routeSignature === currentSignature))) {
      return undefined;
    }

    const syncTimer = window.setTimeout(() => {
      setReceiptForms(initialReceiptForms);
      setActiveTab(initialReceiptForms[0]?.id || '');
    }, 0);

    return () => window.clearTimeout(syncTimer);
  }, [initialReceiptForms, isWarehouseReceiptView, receiptForms]);

  useEffect(() => {
    dispatch(fetchCargoApiDropdown());
  }, [dispatch]);

  useEffect(() => {
    if (!ratesNoticeOpen) return undefined;

    const timer = window.setTimeout(() => setRatesNoticeOpen(false), 4000);
    return () => window.clearTimeout(timer);
  }, [ratesNoticeOpen]);

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
    const shouldClearFieldError =
      ((field === 'receivedBy' || field === 'location') && String(value || '').trim()) ||
      (field === 'customerSelection' && hasValidCustomerSelection(value));

    if (shouldClearFieldError) {
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
        form.id === activeTab ? { ...form, row: { ...form.row, ...getRowFieldPatch(field, value) } } : form
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

  const handleRemoveActiveFreightItem = (itemId) => {
    setReceiptForms((prev) =>
      prev.map((form) => {
        if (form.id !== activeTab) return form;

        const itemToRemove = (form.items || []).find((item) => String(item.id) === String(itemId));
        const freightId = toNumberOrNull(itemToRemove?.freightId);
        const nextItems = (form.items || []).filter((item) => String(item.id) !== String(itemId));

        return {
          ...form,
          items: nextItems.length ? nextItems : form.items,
          removeFreightIds: freightId
            ? [...new Set([...(form.removeFreightIds || []), freightId])]
            : form.removeFreightIds || [],
        };
      })
    );
  };

  const handleAddActiveFreightItem = () => {
    setReceiptForms((prev) =>
      prev.map((form) => {
        if (form.id !== activeTab) return form;

        const nextId = (form.items || []).length
          ? Math.max(...(form.items || []).map((item) => Number(item.id) || 0)) + 1
          : 1;

        return {
          ...form,
          items: [
            ...(form.items || []),
            { id: nextId, freightId: 0, pieces: '', type: '', length: '', width: '', height: '', weight: '', images: [] },
          ],
        };
      })
    );
  };

  const updateActiveFreightItemField = (itemId, field, value) => {
    const nextValue = DECIMAL_ITEM_FIELDS.has(field) ? formatDecimal10_2Input(value) : value;

    setReceiptForms((prev) =>
      prev.map((form) =>
        form.id === activeTab
          ? {
              ...form,
              items: (form.items || []).map((item) =>
                String(item.id) === String(itemId)
                  ? {
                      ...item,
                      [field]: nextValue,
                    }
                  : item
              ),
            }
          : form
      )
    );
    if (String(nextValue ?? '').trim()) {
      const errorKey = `${itemId}-${field}`;
      setReceiptInfoErrors((prev) => {
        const formErrors = prev[activeTab] || {};
        const itemErrors = { ...(formErrors.items || {}) };
        delete itemErrors[errorKey];

        return {
          ...prev,
          [activeTab]: {
            ...formErrors,
            items: itemErrors,
          },
        };
      });
    }
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
      splitFormIndex: null,
      splitItemContext: null,
      itemId: item.id,
    });
  };

  const handleOpenActiveItemUpload = (item) => {
    setSplitItemUploadContext({ formIndex: null, itemId: item.id, target: 'active' });
    setSplitItemStagedFiles(item.images || []);
    setSplitItemDraggingFiles(false);
    setSplitItemUploadDialogOpen(true);
  };

  const downloadImageFromUrl = async (imageUrl, filename) => {
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error('Failed to download image');

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  };

  const handleDownloadItemImages = async (item, itemIndex) => {
    const images = item.images || [];

    if (!images.length) {
      setSnackbar({ open: true, message: 'No images available to download', severity: 'info' });
      return;
    }

    try {
      await Promise.all(
        images.map(async (image, imageIndex) => {
          const imageUrl = getImageUrl(image, 'freight');
          if (!imageUrl) return;

          const filename = getImageName(image, imageIndex) || `item-${itemIndex + 1}-image-${imageIndex + 1}`;
          await downloadImageFromUrl(imageUrl, filename);
        })
      );
    } catch {
      setSnackbar({ open: true, message: 'Failed to download one or more images', severity: 'error' });
    }
  };

  const handleCloseImages = () => {
    setImageDialog({ open: false, images: [], itemLabel: '', imageType: 'freight', splitFormIndex: null, splitItemContext: null });
    setFullImageDialog({ open: false, image: null, title: '', imageType: 'freight' });
  };

  const handleOpenFullImage = (image, title, imageType = 'freight') => {
    setFullImageDialog({ open: true, image, title, imageType });
  };

  const handleCloseFullImage = () => {
    setFullImageDialog({ open: false, image: null, title: '', imageType: 'freight' });
  };

  const handleRemovePreviewImage = (index) => {
    if (imageDialog.splitItemContext) {
      const { formIndex, itemId } = imageDialog.splitItemContext;
      const nextImages = imageDialog.images.filter((_, imageIndex) => imageIndex !== index);

      updateSplitRecalculateItem(formIndex, itemId, 'images', nextImages);
      setImageDialog((prev) => ({ ...prev, images: nextImages }));
      return;
    }

    if (imageDialog.itemLabel !== 'Bad Freight Condition') {
      const removedImage = imageDialog.images[index];
      const removePath = getReceiptImageRemovePath(removedImage);
      const nextImages = imageDialog.images.filter((_, imageIndex) => imageIndex !== index);

      setReceiptForms((prev) =>
        prev.map((form) => {
          if (form.id !== activeTab) return form;

          return {
            ...form,
            items: (form.items || []).map((item) => {
              if (String(item.id) !== String(imageDialog.itemId)) return item;

              return {
                ...item,
                images: nextImages,
                removeImagePaths: removePath
                  ? [...new Set([...(item.removeImagePaths || []), removePath])]
                  : item.removeImagePaths || [],
              };
            }),
          };
        })
      );
      setImageDialog((prev) => ({ ...prev, images: nextImages }));
      return;
    }

    const removedBadFreightImage = imageDialog.images[index];
    const badFreightRemovePath = getReceiptImageRemovePath(removedBadFreightImage);

    if (Number.isInteger(imageDialog.splitFormIndex)) {
      updateSplitFormFreightInfo(imageDialog.splitFormIndex, (info) => ({
        freightConditionImages: info.freightConditionImages.filter((_, imageIndex) => imageIndex !== index),
      }));
    } else {
      updateActiveFreightInfo((info) => ({
        freightConditionImages: info.freightConditionImages.filter((_, imageIndex) => imageIndex !== index),
        removeBadFreightImagePaths: badFreightRemovePath
          ? [...new Set([...(info.removeBadFreightImagePaths || []), badFreightRemovePath])]
          : info.removeBadFreightImagePaths || [],
      }));
    }

    setImageDialog((prev) => ({
      ...prev,
      images: prev.images.filter((_, imageIndex) => imageIndex !== index),
    }));
  };

  const addFreightConditionImages = (images) => {
    const imageList = Array.isArray(images) ? images : [images];
    if (!imageList.length) return;

    if (Number.isInteger(splitFreightImageFormIndexRef.current)) {
      updateSplitFormFreightInfo(splitFreightImageFormIndexRef.current, (info) => ({
        freightConditionImages: [...info.freightConditionImages, ...imageList],
      }));
      return;
    }

    updateActiveFreightInfo((info) => ({
      freightConditionImages: [...info.freightConditionImages, ...imageList],
    }));
  };

  const stopFreightCameraStream = () => {
    freightCameraStreamRef.current?.getTracks?.().forEach((track) => track.stop());
    freightCameraStreamRef.current = null;
  };

  const handleOpenFreightCamera = async (splitFormIndex = null) => {
    splitFreightImageFormIndexRef.current = Number.isInteger(splitFormIndex) ? splitFormIndex : null;

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
      addFreightConditionImages(file);
      handleCloseFreightCamera();
    }, 'image/jpeg', 0.92);
  };

  const handleFreightCameraFileSelection = (event) => {
    const files = Array.from(event.target.files || []);
    addFreightConditionImages(files);
    event.target.value = '';
  };

  const handleOpenFreightUpload = (splitFormIndex = null) => {
    splitFreightImageFormIndexRef.current = Number.isInteger(splitFormIndex) ? splitFormIndex : null;
    freightUploadInputRef.current?.click();
  };

  const getSplitCargoLoadingKey = (formIndex, itemId) => `split-${formIndex}-${itemId}`;
  const getSplitRecalculateItemErrorKey = (formIndex, itemId, field) => `${formIndex}-${itemId}-${field}`;

  const updateSplitRecalculateItem = (formIndex, itemId, field, value) => {
    const nextValue = DECIMAL_ITEM_FIELDS.has(field) ? formatDecimal10_2Input(value) : value;

    setSplitRecalculateFormItems((prev) =>
      prev.map((items, index) =>
        index === formIndex
          ? items.map((item) => (item.id === itemId ? { ...item, [field]: nextValue } : item))
          : items
      )
    );

    if (String(nextValue ?? '').trim() !== '') {
      setSplitRecalculateItemErrors((prev) => {
        const errorKey = getSplitRecalculateItemErrorKey(formIndex, itemId, field);
        if (!prev[errorKey]) return prev;

        const next = { ...prev };
        delete next[errorKey];
        return next;
      });
    }
  };

  const addSplitRecalculateItem = (formIndex) => {
    setSplitRecalculateFormItems((prev) =>
      prev.map((items, index) =>
        index === formIndex ? [...items, createSplitRecalculateItem(getNextSplitItemId(items))] : items
      )
    );
  };

  const removeSplitRecalculateItem = (formIndex, itemId) => {
    setSplitRecalculateFormItems((prev) =>
      prev.map((items, index) => {
        if (index !== formIndex) return items;
        if (items.length === 1) return items.map((item) => (item.id === itemId ? createSplitRecalculateItem(item.id) : item));
        return items.filter((item) => item.id !== itemId);
      })
    );
    setSplitRecalculateItemErrors((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((errorKey) => {
        if (errorKey.startsWith(`${formIndex}-${itemId}-`)) {
          delete next[errorKey];
        }
      });
      return next;
    });
  };

  const handleOpenSplitItemUpload = (formIndex, itemId) => {
    const currentItem = splitRecalculateFormItems[formIndex]?.find((item) => item.id === itemId);
    setSplitItemUploadContext({ formIndex, itemId });
    setSplitItemStagedFiles(currentItem?.images || []);
    setSplitItemDraggingFiles(false);
    setSplitItemUploadDialogOpen(true);
  };

  const stopSplitItemCameraStream = () => {
    splitItemCameraStreamRef.current?.getTracks?.().forEach((track) => track.stop());
    splitItemCameraStreamRef.current = null;
  };

  const handleCloseSplitItemCamera = () => {
    if (splitItemCameraVideoRef.current) {
      splitItemCameraVideoRef.current.srcObject = null;
    }
    stopSplitItemCameraStream();
    setSplitItemCameraOpen(false);
  };

  const handleCloseSplitItemUpload = () => {
    setSplitItemUploadDialogOpen(false);
    setSplitItemUploadContext({ formIndex: null, itemId: null });
    setSplitItemStagedFiles([]);
    setSplitItemDraggingFiles(false);
    handleCloseSplitItemCamera();
  };

  const addSplitItemFilesToStage = (files) => {
    const selectedFiles = Array.from(files || []);
    if (selectedFiles.length) {
      setSplitItemStagedFiles((prev) => [...prev, ...selectedFiles]);
    }
  };

  const handleBrowseSplitItemFiles = () => {
    splitItemUploadInputRef.current?.click();
  };

  const handleCaptureSplitItemImage = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      splitItemCameraInputRef.current?.click();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      splitItemCameraStreamRef.current = stream;
      setSplitItemCameraOpen(true);
    } catch (error) {
      setSnackbar({ open: true, message: error?.message || 'Unable to open camera', severity: 'error' });
    }
  };

  const handleTakeSplitItemPhoto = () => {
    const video = splitItemCameraVideoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;

      const file = new File([blob], `split-item-${Date.now()}.jpg`, { type: 'image/jpeg' });
      addSplitItemFilesToStage([file]);
      handleCloseSplitItemCamera();
    }, 'image/jpeg', 0.92);
  };

  const handleSplitItemFileSelection = (event) => {
    addSplitItemFilesToStage(event.target.files);
    event.target.value = '';
  };

  const handleSplitItemFileDrop = (event) => {
    event.preventDefault();
    setSplitItemDraggingFiles(false);
    addSplitItemFilesToStage(event.dataTransfer.files);
  };

  const handleRemoveSplitItemStagedFile = (index) => {
    setSplitItemStagedFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index));
  };

  const handleViewSplitItemStagedFile = (file, index = 0) => {
    setFullImageDialog({
      open: true,
      image: file,
      title: getImageName(file, index),
      imageType: 'freight',
    });
  };

  const handleUploadSplitItemImages = () => {
    const { formIndex, itemId, target } = splitItemUploadContext;

    if (target === 'active' && itemId !== null && itemId !== undefined) {
      setReceiptForms((prev) =>
        prev.map((form) =>
          form.id === activeTab
            ? {
                ...form,
                items: (form.items || []).map((item) =>
                  String(item.id) === String(itemId)
                    ? {
                        ...item,
                        images: splitItemStagedFiles,
                        removeImagePaths: [
                          ...new Set([
                            ...(item.removeImagePaths || []),
                            ...(item.images || [])
                              .filter(isPersistedReceiptImage)
                              .filter((image) => {
                                const imagePath = getReceiptImageRemovePath(image);
                                return !splitItemStagedFiles.some(
                                  (stagedImage) => getReceiptImageRemovePath(stagedImage) === imagePath
                                );
                              })
                              .map(getReceiptImageRemovePath)
                              .filter(Boolean),
                          ]),
                        ],
                      }
                    : item
                ),
              }
            : form
        )
      );
    } else if (Number.isInteger(formIndex) && itemId !== null && itemId !== undefined) {
      updateSplitRecalculateItem(formIndex, itemId, 'images', splitItemStagedFiles);
    }

    handleCloseSplitItemUpload();
  };

  const handleOpenSplitItemImages = (formIndex, itemIndex, item) => {
    setImageDialog({
      open: true,
      images: item.images || [],
      itemLabel: `Item ${String(itemIndex + 1).padStart(2, '0')}`,
      imageType: 'freight',
      splitFormIndex: null,
      splitItemContext: { formIndex, itemId: item.id },
    });
  };

  const getDimensionValue = (dimensions, fields) => {
    const data = Array.isArray(dimensions) ? dimensions[0] : dimensions;
    const field = fields.find((name) => data?.[name] !== undefined && data?.[name] !== null && data?.[name] !== '');
    return field ? data[field] : null;
  };

  const getDimensionImages = (dimensions) => {
    const data = Array.isArray(dimensions) ? dimensions[0] : dimensions;
    const images = data?.images || data?.cargoImages || data?.apiImages || data?.imageList;

    if (!images) return [];
    return Array.isArray(images) ? images.filter(Boolean) : [images].filter(Boolean);
  };

  const applySplitCargoDimensions = (formIndex, itemId, dimensionsResponse) => {
    const dimensions = dimensionsResponse?.data || dimensionsResponse;
    if (!Number.isInteger(formIndex) || itemId === null || itemId === undefined || !dimensions || dimensionsResponse?.error) return;

    const fieldMap = {
      length: ['length', 'cargoLength', 'apiLength'],
      width: ['width', 'cargoWidth', 'apiWidth'],
      height: ['height', 'cargoHeight', 'apiHeight'],
      weight: ['weight', 'cargoWeight', 'apiWeight', 'weightLbs'],
    };

    Object.entries(fieldMap).forEach(([field, fieldNames]) => {
      const value = getDimensionValue(dimensions, fieldNames);
      if (value !== null) {
        updateSplitRecalculateItem(formIndex, itemId, field, String(value));
      }
    });

    const images = getDimensionImages(dimensions);
    if (images.length > 0) {
      updateSplitRecalculateItem(formIndex, itemId, 'images', images);
    }
  };

  const handleSplitPackageDetailsClick = (event, formIndex, itemId) => {
    setSplitPackageDropdownAnchor(event.currentTarget);
    setSplitPackageDropdownContext({ formIndex, itemId });
  };

  const handleCloseSplitPackageDropdown = () => {
    setSplitPackageDropdownAnchor(null);
  };

  const handleSplitPackageOptionSelect = async (option) => {
    const apiId = option?.apiId || option?.id || option?.value;
    const { formIndex, itemId } = splitPackageDropdownContext;

    if (!apiId || !Number.isInteger(formIndex) || itemId === null || itemId === undefined) {
      handleCloseSplitPackageDropdown();
      return;
    }

    const loadingKey = getSplitCargoLoadingKey(formIndex, itemId);
    handleCloseSplitPackageDropdown();
    setSplitCargoApiLoadingItems((prev) => ({ ...prev, [loadingKey]: true }));

    try {
      const dimensionsResponse = await dispatch(fetchCargoApiDimensions(apiId));
      applySplitCargoDimensions(formIndex, itemId, dimensionsResponse);

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
    } finally {
      setSplitCargoApiLoadingItems((prev) => {
        const next = { ...prev };
        delete next[loadingKey];
        return next;
      });
    }
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

  const buildReceiptBatchPayload = (forms = receiptForms, options = {}) => ({
    receipts: forms.map((form, formIndex) => {
      const formRow = form.row || {};
      const freightInfo = { ...createFreightInfo(), ...(form.freightInfo || {}) };
      const customerSelection = form.customerSelection || {};
      const freightDetails = (form.items || []).map((item) => {
        const cubicMeter = formatMeasurement(calculateItemCbm(item));
        const existingImages = getFreightDetailImageNames(item.images);

        return {
          pieces: toNumberOrNull(item.pieces),
          type: toValueOrNull(item.type),
          weight: toDecimal10_2NumberOrNull(item.weight),
          length: toDecimal10_2NumberOrNull(item.length),
          width: toDecimal10_2NumberOrNull(item.width),
          height: toDecimal10_2NumberOrNull(item.height),
          cubicMeter,
          ...(options.includeFreightDetailImages && existingImages.length ? { images: existingImages } : {}),
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
      const receiptId = options.forceNewReceipts
        ? 0
        : formIndex === 0 ? toNumberOrNull(getRowValue(formRow, 'receiptId', null)) : 0;
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
          customerId: toNumberOrNull(customerSelection.customerId),
          stationId: toNumberOrNull(customerSelection.stationId),
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
          toEmails: getSubmitToEmails(formRow),
          tempEmails: normalizeTempEmailList(getRowValue(formRow, 'tempEmails', [])),
          invoiceNumber: toLimitedValueOrNull(getRowValue(formRow, ['invoiceNo', 'invoiceNumber'], ''), 50),
          poNumber: toLimitedValueOrNull(getRowValue(formRow, ['poNumber', 'poNo'], ''), 50),
          customerRefNumber: toLimitedValueOrNull(getRowValue(formRow, ['customerRefNo', 'customerReference'], ''), 50),
          freightCondition: freightInfo.badFreightCondition ? 'Y' : null,
          handlingDescription: toValueOrNull(freightInfo.freightConditionDescription),
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

  const buildReceiptPayload = () => buildReceiptBatchPayload(receiptForms);

  const formatReceiptStatusForApi = (value) =>
    String(value || 'ON_HAND')
      .trim()
      .toUpperCase()
      .replace(/-/g, '_')
      .replace(/\s+/g, '_');

  const buildWarehouseReceiptUpdatePayload = (form = activeForm) => {
    const formRow = form.row || {};
    const freightInfo = { ...createFreightInfo(), ...(form.freightInfo || {}) };
    const customerSelection = form.customerSelection || {};
    const freightDetails = (form.items || []).map((item) => {
      const existingImages = getFreightDetailImageNames((item.images || []).filter(isPersistedReceiptImage));

      return {
        freightId: toNumberOrNull(item.freightId) || 0,
        pieces: toNumberOrNull(item.pieces),
        type: toValueOrNull(item.type),
        length: toDecimal10_2NumberOrNull(item.length),
        width: toDecimal10_2NumberOrNull(item.width),
        height: toDecimal10_2NumberOrNull(item.height),
        weight: toDecimal10_2NumberOrNull(item.weight),
        cubicMeter: formatMeasurement(calculateItemCbm(item)),
        images: existingImages,
        removeImagePaths: item.removeImagePaths || [],
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

    return {
      location: toValueOrNull(form.location),
      receivedBy: toLimitedValueOrNull(form.receivedBy, 100),
      shipper: toValueOrNull(getRowValue(formRow, ['shipper', 'shipperName'], '')),
      customerId: toNumberOrNull(customerSelection.customerId),
      stationId: toNumberOrNull(customerSelection.stationId),
      verificationId: toNumberOrNull(formRow.verificationId),
      carrierId: toNumberOrNull(formRow.carrierId),
      piecesInland,
      weightInland,
      reWeight,
      proNumber: toValueOrNull(getRowValue(formRow, 'proNumber', '')),
      invoiceNumber: toLimitedValueOrNull(getRowValue(formRow, ['invoiceNo', 'invoiceNumber'], ''), 50),
      poNumber: toLimitedValueOrNull(getRowValue(formRow, ['poNumber', 'poNo'], ''), 50),
      customerRefNumber: toLimitedValueOrNull(getRowValue(formRow, ['customerRefNo', 'customerReference'], ''), 50),
      freightCondition: freightInfo.badFreightCondition ? 'Y' : 'N',
      documents: toYesNo(freightInfo.conditions.Document),
      handlingDescription: toValueOrNull(freightInfo.freightConditionDescription),
      destination: toValueOrNull(getRowValue(formRow, ['destination', 'finalDestination'], '')),
      originalDgd: freightInfo.hazMat ? toYesNo(freightInfo.originalDgd) : 'N',
      unNumber: freightInfo.hazMat ? freightInfo.unNumbers.filter(Boolean) : [],
      class: freightInfo.hazMat ? freightInfo.hazmatClasses.filter(Boolean) : [],
      packageId: toValueOrNull(getRowValue(formRow, ['packageId', 'packageNumber'], '')),
      properShippingName: toValueOrNull(freightInfo.properShippingName),
      hazardousDescription: toValueOrNull(freightInfo.hazardousDescription),
      notes: toValueOrNull(freightInfo.notes),
      status: formatReceiptStatusForApi(getRowValue(formRow, 'status', 'ON_HAND')),
      receiptType: toValueOrNull(getRowValue(formRow, 'receiptType', 'Regular')) || 'Regular',
      bandedSkid: toYesNo(freightInfo.conditions['Banded Skid']),
      shrinkWrappedSkid: toYesNo(freightInfo.conditions['Shrink Wrapped Skid']),
      shtIppcSkid: toYesNo(freightInfo.conditions['SHT / IPPC Skid'] || freightInfo.conditions['SHPT / PPC Skid']),
      plasticSkid: toYesNo(freightInfo.conditions['Plastic Skid']),
      hazMat: toYesNo(freightInfo.hazMat),
      labelCount: form.items?.length || 0,
      toEmails: getSubmitToEmails(formRow),
      cubicMeter,
      freightDetails,
      removeFreightIds: form.removeFreightIds || [],
      badFreightImages: getFreightDetailImageNames(freightInfo.freightConditionImages.filter(isPersistedReceiptImage)),
      removeBadFreightImagePaths: freightInfo.removeBadFreightImagePaths || [],
    };
  };

  const hasNewWarehouseReceiptUpdateImages = (form = activeForm) => {
    const freightInfo = { ...createFreightInfo(), ...(form.freightInfo || {}) };

    return (
      (form.items || []).some((item) => (item.images || []).some((image) => !isPersistedReceiptImage(image))) ||
      freightInfo.freightConditionImages.some((image) => !isPersistedReceiptImage(image))
    );
  };

  const buildWarehouseReceiptUpdateFormData = async (form = activeForm) => {
    const payload = buildWarehouseReceiptUpdatePayload(form);
    const formData = new FormData();

    formData.append('receipt', JSON.stringify(payload));

    await Promise.all([
      ...(form.items || []).flatMap((item, freightIndex) =>
        (item.images || [])
          .filter((image) => !isPersistedReceiptImage(image))
          .map(async (image, imageIndex) => {
            const fieldName = `freight-${freightIndex}-${imageIndex}`;
            const imageValue = await getSubmittedImageValue(image);

            if (imageValue) {
              formData.append(fieldName, imageValue);
            }
          })
      ),
      ...({ ...createFreightInfo(), ...(form.freightInfo || {}) }.freightConditionImages || [])
        .filter((image) => !isPersistedReceiptImage(image))
        .map(async (image, imageIndex) => {
          const fieldName = `bad-freight-image-${imageIndex}`;
          const renamedImage = await toRenamedImageFile(image, fieldName);

          if (renamedImage instanceof File || renamedImage instanceof Blob) {
            formData.append(fieldName, renamedImage);
            return;
          }

          const imageValue = await getSubmittedImageValue(image);
          if (imageValue) {
            formData.append(fieldName, imageValue);
          }
        }),
    ]);

    return formData;
  };

  const hasReceiptImages = (forms = receiptForms) =>
    forms.some((form) => {
      const freightInfo = { ...createFreightInfo(), ...(form.freightInfo || {}) };
      return (
        (form.items || []).some((item) => (item.images || []).length > 0) ||
        freightInfo.freightConditionImages.length > 0
      );
    });

  const hasBadFreightImages = (forms = receiptForms) =>
    forms.some((form) => {
      const freightInfo = { ...createFreightInfo(), ...(form.freightInfo || {}) };
      return freightInfo.freightConditionImages.length > 0;
    });

  const validateReceiptInfo = () => {
    const nextErrors = {};
    let firstInvalidFormId = '';

    receiptForms.forEach((form) => {
      const formErrors = { items: {} };

      if (!String(form.receivedBy || '').trim()) {
        formErrors.receivedBy = 'Received By is mandatory';
      }
      if (!String(form.location || '').trim()) {
        formErrors.location = 'Location is mandatory';
      }
      if (!hasValidCustomerSelection(form.customerSelection)) {
        formErrors.customerSelection = 'Customer is mandatory';
      }

      (form.items || []).forEach((item) => {
        REQUIRED_FREIGHT_ITEM_FIELDS.forEach(({ field, label }) => {
          if (!String(item[field] ?? '').trim()) {
            formErrors.items[`${item.id}-${field}`] = `${label} is mandatory`;
          }
        });
      });

      if (
        formErrors.receivedBy ||
        formErrors.location ||
        formErrors.customerSelection ||
        Object.keys(formErrors.items).length > 0
      ) {
        nextErrors[form.id] = formErrors;
        if (!firstInvalidFormId) firstInvalidFormId = form.id;
      }
    });

    setReceiptInfoErrors(nextErrors);

    if (firstInvalidFormId) {
      setActiveTab(firstInvalidFormId);
      setSnackbar({
        open: true,
        message: `Please fill all mandatory fields before ${isWarehouseReceiptEdit ? 'updating' : 'submitting'}`,
        severity: 'error',
      });
      return false;
    }

    return true;
  };

  const buildReceiptFormData = async (forms = receiptForms, options = {}) => {
    const payload = buildReceiptBatchPayload(forms, options);
    const formData = new FormData();

    formData.append('batchData', JSON.stringify(payload));

    await Promise.all(
      forms.flatMap((form, receiptIndex) => {
        const freightInfo = { ...createFreightInfo(), ...(form.freightInfo || {}) };
        const freightItemImageTasks = options.skipFreightItemImageUploads
          ? []
          : (form.items || []).flatMap((item, freightIndex) =>
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

    if (isWarehouseReceiptEdit) {
      const receiptId = getRowValue(activeForm?.row, 'receiptId', '');
      const payload = hasNewWarehouseReceiptUpdateImages(activeForm)
        ? await buildWarehouseReceiptUpdateFormData(activeForm)
        : buildWarehouseReceiptUpdatePayload(activeForm);
      const response = await dispatch(updateWarehouseReceipt({ receiptId, payload }));

      if (response?.error || response?.success === false) {
        setSnackbar({
          open: true,
          message: response?.message || 'Failed to update warehouse receipt',
          severity: 'error',
        });
        return;
      }

      setSuccessDialog({
        open: true,
        message: response?.message || 'Warehouse receipt updated successfully',
        receiptNumbers: getReceiptNumbersFromResponse(response),
        source: 'edit',
      });
      return;
    }

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
      source: '',
    });
  };

  const getSplitSubmitForms = () => {
    const formItemGroups = splitDimensionMode === 'existing'
      ? splitExistingFormItems.map((itemIndexes) => itemIndexes.map((itemIndex) => activeForm.items[itemIndex]).filter(Boolean))
      : splitRecalculateFormItems;

    return formItemGroups
      .map((items, formIndex) => {
        const details = ensureSplitFormDetails(formIndex, splitFormDetails);

        return {
          id: `split-${formIndex + 1}`,
          label: `Form ${formIndex + 1}`,
          receiptNumber: splitTempReceiptNumbers[formIndex] || '',
          receivedBy: activeForm.receivedBy,
          location: activeForm.location,
          customerSelection: activeForm.customerSelection,
          freightInfo: details.freightInfo,
          row: details.row,
          items,
        };
      })
      .filter((form) => form.items.length > 0);
  };

  const getSplitExistingItemErrorKey = (itemIndex, field) => `${itemIndex}-${field}`;

  const validateSplitRecalculateStep = () => {
    if (splitFormCount < 2) {
      setSnackbar({ open: true, message: 'Please add at least two New Forms before proceeding', severity: 'error' });
      return false;
    }

    const nextErrors = {};
    let invalidFormIndex = -1;

    Array.from({ length: splitFormCount }).forEach((_, formIndex) => {
      const formItems = splitRecalculateFormItems[formIndex] || [];

      if (formItems.length === 0) {
        if (invalidFormIndex === -1) invalidFormIndex = formIndex;
        return;
      }

      let hasInvalidField = false;

      formItems.forEach((item) => {
        SPLIT_ITEM_MANDATORY_FIELDS.forEach(({ field, label }) => {
          if (String(item?.[field] ?? '').trim() === '') {
            nextErrors[getSplitRecalculateItemErrorKey(formIndex, item.id, field)] = `${label} is mandatory`;
            hasInvalidField = true;
          }
        });
      });

      if (hasInvalidField && invalidFormIndex === -1) {
        invalidFormIndex = formIndex;
      }
    });

    if (invalidFormIndex !== -1) {
      setSplitRecalculateItemErrors(nextErrors);
      setActiveSplitFormTab(invalidFormIndex);
      setSnackbar({
        open: true,
        message: `Please fill all mandatory item fields in New Form ${invalidFormIndex + 1}`,
        severity: 'error',
      });
      return false;
    }

    setSplitRecalculateItemErrors({});
    return true;
  };

  const validateSplitExistingStep = () => {
    const splitItems = activeForm?.items?.length ? activeForm.items : [];
    const assignedItemIndexes = new Set(splitExistingFormItems.flat());
    const nextItemErrors = {};
    const nextFormErrors = {};
    let invalidFormIndex = -1;

    if (splitFormCount < 2) {
      setSnackbar({ open: true, message: 'Please add at least two New Forms before proceeding', severity: 'error' });
      return false;
    }

    if (assignedItemIndexes.size < splitItems.length) {
      setSnackbar({ open: true, message: 'Please move all left pane items into New Forms before proceeding', severity: 'error' });
    }

    Array.from({ length: splitFormCount }).forEach((_, formIndex) => {
      const formItemIndexes = splitExistingFormItems[formIndex] || [];

      if (formItemIndexes.length === 0) {
        nextFormErrors[formIndex] = `New Form ${formIndex + 1} must have at least one item`;
        if (invalidFormIndex === -1) invalidFormIndex = formIndex;
      }

      formItemIndexes.forEach((itemIndex) => {
        const item = splitItems[itemIndex] || {};
        let hasInvalidField = false;

        SPLIT_ITEM_MANDATORY_FIELDS.forEach(({ field, label }) => {
          if (String(item?.[field] ?? '').trim() === '') {
            nextItemErrors[getSplitExistingItemErrorKey(itemIndex, field)] = `${label} is mandatory`;
            hasInvalidField = true;
          }
        });

        if (hasInvalidField && invalidFormIndex === -1) {
          invalidFormIndex = formIndex;
        }
      });
    });

    const hasLeftPaneItems = assignedItemIndexes.size < splitItems.length;
    const hasErrors = hasLeftPaneItems || Object.keys(nextItemErrors).length > 0 || Object.keys(nextFormErrors).length > 0;

    if (hasErrors) {
      setSplitExistingItemErrors(nextItemErrors);
      setSplitExistingFormErrors(nextFormErrors);
      if (invalidFormIndex !== -1) {
        setActiveSplitFormTab(invalidFormIndex);
      }
      if (!hasLeftPaneItems) {
        setSnackbar({
          open: true,
          message: invalidFormIndex !== -1
            ? `Please fill all mandatory item fields in New Form ${invalidFormIndex + 1}`
            : 'Please fill all mandatory item fields',
          severity: 'error',
        });
      }
      return false;
    }

    setSplitExistingItemErrors({});
    setSplitExistingFormErrors({});
    return true;
  };

  const handleSplitSubmit = async () => {
    const parentReceiptId = viewReceiptSummary?.receiptId || getRowValue(activeForm?.row, 'receiptId', '');

    if (!parentReceiptId) {
      setSnackbar({ open: true, message: 'Parent receiptId is required to submit split receipts', severity: 'error' });
      return;
    }

    const splitForms = getSplitSubmitForms();

    if (!splitForms.length) {
      setSnackbar({ open: true, message: 'Please move at least one item to a New Form before submitting', severity: 'error' });
      return;
    }

    const missingReceiptNumber = splitForms.some((form) => !form.receiptNumber);

    if (missingReceiptNumber) {
      setSnackbar({ open: true, message: 'Temporary receipt number is required for each split form', severity: 'error' });
      return;
    }

    setSplitSubmitLoading(true);

    try {
      let payload;

      if (splitDimensionMode === 'existing') {
        const splitNoPayloadOptions = { forceNewReceipts: true, includeFreightDetailImages: true };
        payload = hasBadFreightImages(splitForms)
          ? await buildReceiptFormData(splitForms, { ...splitNoPayloadOptions, skipFreightItemImageUploads: true })
          : buildReceiptBatchPayload(splitForms, splitNoPayloadOptions);
      } else {
        payload = hasReceiptImages(splitForms)
          ? await buildReceiptFormData(splitForms, { forceNewReceipts: true })
          : buildReceiptBatchPayload(splitForms, { forceNewReceipts: true });
      }

      const response = await dispatch(
        submitWarehouseReceiptBatch(payload, {
          split: true,
          parentReceiptId,
        })
      );

      if (response?.error || response?.success === false) {
        setSnackbar({
          open: true,
          message: response?.message || 'Failed to submit split warehouse receipts',
          severity: 'error',
        });
        return;
      }

      handleCloseSplitDialog();
      setSuccessDialog({
        open: true,
        message: response?.message || 'Split warehouse receipts submitted successfully',
        receiptNumbers: getReceiptNumbersFromResponse(response),
        source: 'split',
      });
    } finally {
      setSplitSubmitLoading(false);
    }
  };

  const handleSuccessDialogOk = () => {
    const successSource = successDialog.source;

    setSuccessDialog({ open: false, message: '', receiptNumbers: [], source: '' });

    if (successSource === 'split') {
      navigate(PATH_DASHBOARD.warehouseReceiptDashboard);
      return;
    }

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

  const handleOpenSplitMailDialog = (formIndex, row) => {
    const splitDetailsRow = ensureSplitFormDetails(formIndex, splitFormDetails).row;
    const sourceRow = {
      ...row,
      ...splitDetailsRow,
    };

    setSplitMailFormIndex(formIndex);
    setSelectedSplitMailEmails(getUniqueMailEmails(getRowValue(sourceRow, 'toEmails', [])));
    setSplitTempEmails(normalizeTempEmailList(getRowValue(sourceRow, 'tempEmails', [])));
    setSplitTempEmailInput('');
    setSplitMailDialogOpen(true);
  };

  const handleCloseSplitMailDialog = () => {
    setSplitMailDialogOpen(false);
    setSplitMailFormIndex(null);
    setSplitTempEmails([]);
    setSplitTempEmailInput('');
  };

  const isSplitMailSelected = (email) => {
    const emailKey = getMailEmailValue(email).toLowerCase();
    return selectedSplitMailEmails.some((selectedEmail) => selectedEmail.toLowerCase() === emailKey);
  };

  const handleToggleSplitMail = (email) => {
    const emailValue = getMailEmailValue(email);
    if (!emailValue) return;

    setSelectedSplitMailEmails((prev) =>
      prev.some((selectedEmail) => selectedEmail.toLowerCase() === emailValue.toLowerCase())
        ? prev.filter((selectedEmail) => selectedEmail.toLowerCase() !== emailValue.toLowerCase())
        : [...prev, emailValue]
    );
  };

  const handleAddSplitTempEmail = (value) => {
    const emailValues = normalizeTempEmailList(value);
    if (!emailValues.length) return;

    setSplitTempEmails((prev) =>
      normalizeTempEmailList([...prev, ...emailValues])
    );
    setSplitTempEmailInput('');
  };

  const handleRemoveSplitTempEmail = (index) => {
    setSplitTempEmails((prev) => prev.filter((_, emailIndex) => emailIndex !== index));
  };

  const handleSendSplitMail = () => {
    const nextTempEmails = normalizeTempEmailList([
      ...splitTempEmails,
      ...normalizeTempEmailList(splitTempEmailInput),
    ]);

    if (Number.isInteger(splitMailFormIndex)) {
      updateSplitFormRowField(splitMailFormIndex, 'toEmails', selectedSplitMailEmails);
      updateSplitFormRowField(splitMailFormIndex, 'tempEmails', nextTempEmails);
    }

    handleCloseSplitMailDialog();
  };

  const handleOpenSplitDialog = () => {
    setSplitStep(0);
    setSplitDimensionMode('recalculate');
    setSplitFormCount(1);
    setActiveSplitFormTab(0);
    setSplitExistingFormItems([[]]);
    setSplitFormDetails([]);
    setSplitRecalculateFormItems([[createSplitRecalculateItem(1)]]);
    setSplitRecalculateItemErrors({});
    setSplitExistingItemErrors({});
    setSplitExistingFormErrors({});
    setSplitMoveMenu({ anchorEl: null, itemIndex: null });
    setSplitTempReceiptNumbers([]);
    setSplitTempReceiptLoading(false);
    setSplitSubmitLoading(false);
    setSplitCargoApiLoadingItems({});
    setSplitPackageDropdownAnchor(null);
    setSplitPackageDropdownContext({ formIndex: null, itemId: null });
    setSplitItemUploadContext({ formIndex: null, itemId: null });
    setSplitDialogOpen(true);
  };

  const handleCloseSplitDialog = () => {
    setSplitDialogOpen(false);
    setSplitBackConfirmOpen(false);
    setSplitStep(0);
    setSplitDimensionMode('recalculate');
    setSplitFormCount(1);
    setActiveSplitFormTab(0);
    setSplitExistingFormItems([[]]);
    setSplitFormDetails([]);
    setSplitRecalculateFormItems([[createSplitRecalculateItem(1)]]);
    setSplitRecalculateItemErrors({});
    setSplitExistingItemErrors({});
    setSplitExistingFormErrors({});
    setSplitMoveMenu({ anchorEl: null, itemIndex: null });
    setSplitTempReceiptNumbers([]);
    setSplitTempReceiptLoading(false);
    setSplitSubmitLoading(false);
    setSplitCargoApiLoadingItems({});
    setSplitPackageDropdownAnchor(null);
    setSplitPackageDropdownContext({ formIndex: null, itemId: null });
    setSplitItemUploadContext({ formIndex: null, itemId: null });
  };

  const resetSplitFreightInfoSelections = () => {
    setSplitDimensionMode('recalculate');
    setSplitFormCount(1);
    setActiveSplitFormTab(0);
    setSplitExistingFormItems([[]]);
    setSplitFormDetails([]);
    setSplitRecalculateFormItems([[createSplitRecalculateItem(1)]]);
    setSplitRecalculateItemErrors({});
    setSplitExistingItemErrors({});
    setSplitExistingFormErrors({});
    setSplitMoveMenu({ anchorEl: null, itemIndex: null });
    setSplitTempReceiptNumbers([]);
    setSplitTempReceiptLoading(false);
    setSplitSubmitLoading(false);
    setSplitCargoApiLoadingItems({});
    setSplitPackageDropdownAnchor(null);
    setSplitPackageDropdownContext({ formIndex: null, itemId: null });
    setSplitItemUploadContext({ formIndex: null, itemId: null });
  };

  const handleSplitBackClick = () => {
    if (splitStep === 1) {
      setSplitBackConfirmOpen(true);
      return;
    }

    setSplitStep((prev) => Math.max(prev - 1, 0));
  };

  const handleCancelSplitBackConfirm = () => {
    setSplitBackConfirmOpen(false);
  };

  const handleConfirmSplitBack = () => {
    resetSplitFreightInfoSelections();
    setSplitBackConfirmOpen(false);
    setSplitStep(0);
  };

  const createSplitTempReceiptNumber = async () => {
    setSplitTempReceiptLoading(true);

    try {
      const response = await dispatch(createTempWarehouseReceipt(buildTempReceiptPayloadFromForm(activeForm)));

      if (response?.error || response?.success === false) {
        setSnackbar({
          open: true,
          message: response?.message || 'Failed to create temporary warehouse receipt',
          severity: 'error',
        });
        return '';
      }

      const receiptNumber = response?.data?.receiptNumber || '';

      if (!receiptNumber) {
        setSnackbar({
          open: true,
          message: 'Temporary warehouse receipt number is missing',
          severity: 'error',
        });
        return '';
      }

      return receiptNumber;
    } finally {
      setSplitTempReceiptLoading(false);
    }
  };

  const handleSplitNoClick = async () => {
    const receiptNumber = await createSplitTempReceiptNumber();
    if (!receiptNumber) return;

    setSplitTempReceiptNumbers([receiptNumber]);
    setSplitFormDetails([createEmptySplitFormDetails(activeForm.row)]);
    setSplitDimensionMode('existing');
    setSplitExistingItemErrors({});
    setSplitExistingFormErrors({});
    setSplitStep(1);
  };

  const handleSplitYesClick = async () => {
    const receiptNumber = await createSplitTempReceiptNumber();
    if (!receiptNumber) return;

    setSplitTempReceiptNumbers([receiptNumber]);
    setSplitFormDetails([createEmptySplitFormDetails(activeForm.row)]);
    setSplitExistingFormItems([[]]);
    setSplitRecalculateFormItems([[createSplitRecalculateItem(1)]]);
    setSplitRecalculateItemErrors({});
    setSplitExistingItemErrors({});
    setSplitExistingFormErrors({});
    setSplitDimensionMode('recalculate');
    setSplitStep(1);
  };

  const handleAddSplitForm = async () => {
    const receiptNumber = await createSplitTempReceiptNumber();
    if (!receiptNumber) return;

    setSplitTempReceiptNumbers((prev) => [...prev, receiptNumber]);
    setSplitFormDetails((prev) => [...prev, createEmptySplitFormDetails(activeForm.row)]);

    setSplitFormCount((prev) => prev + 1);
    setSplitExistingFormItems((prev) => [...prev, []]);
    setSplitRecalculateFormItems((prev) => [...prev, [createSplitRecalculateItem(1)]]);
    setSplitRecalculateItemErrors({});
    setSplitExistingFormErrors({});
  };

  const handleRemoveSplitForm = (formIndex) => {
    setSplitRecalculateItemErrors({});
    setSplitExistingFormErrors({});
    setSplitExistingFormItems((prev) => {
      if (splitDimensionMode !== 'existing' && splitFormCount <= 1) return [[]];

      const next = Array.from({ length: splitFormCount }, (_, index) => [...(prev[index] || [])]);
      next.splice(formIndex, 1);
      return next.length || splitDimensionMode === 'existing' ? next : [[]];
    });
    setSplitTempReceiptNumbers((prev) => {
      const next = [...prev];
      next.splice(formIndex, 1);
      return next;
    });
    setSplitFormDetails((prev) => {
      const next = [...prev];
      next.splice(formIndex, 1);
      return next;
    });
    setSplitRecalculateFormItems((prev) => {
      const next = [...prev];
      next.splice(formIndex, 1);
      return next.length ? next : [[createSplitRecalculateItem(1)]];
    });
    setSplitFormCount((prev) => Math.max(splitDimensionMode === 'existing' ? 0 : 1, prev - 1));
    setActiveSplitFormTab((prev) => {
      if (splitFormCount <= 1) return 0;
      if (prev > formIndex) return prev - 1;
      return Math.min(prev, Math.max(splitFormCount - 2, 0));
    });
  };

  const getSplitItemAssignedFormIndex = (itemIndex) =>
    splitExistingFormItems.findIndex((formItems) => formItems.includes(itemIndex));

  const handleOpenSplitMoveMenu = (event, itemIndex) => {
    event.stopPropagation();
    setSplitMoveMenu({ anchorEl: event.currentTarget, itemIndex });
  };

  const handleCloseSplitMoveMenu = () => {
    setSplitMoveMenu({ anchorEl: null, itemIndex: null });
  };

  const handleMoveSplitItem = (targetFormIndex) => {
    const itemIndex = splitMoveMenu.itemIndex;
    if (!Number.isInteger(itemIndex)) {
      handleCloseSplitMoveMenu();
      return;
    }

    setSplitExistingFormItems((prev) => {
      const next = Array.from({ length: splitFormCount }, (_, index) => [...(prev[index] || [])]);
      next.forEach((formItems, index) => {
        next[index] = formItems.filter((assignedIndex) => assignedIndex !== itemIndex);
      });

      if (Number.isInteger(targetFormIndex) && targetFormIndex >= 0 && targetFormIndex < splitFormCount) {
        next[targetFormIndex] = [...next[targetFormIndex], itemIndex];
      }

      return next;
    });
    setSplitExistingFormErrors({});
    handleCloseSplitMoveMenu();
  };

  const ensureSplitFormDetails = (formIndex, details) =>
    details[formIndex] || createEmptySplitFormDetails(activeForm.row);

  const updateSplitFormRowField = (formIndex, field, value) => {
    setSplitFormDetails((prev) => {
      const next = Array.from({ length: Math.max(splitFormCount, formIndex + 1) }, (_, index) =>
        ensureSplitFormDetails(index, prev)
      );

      next[formIndex] = {
        ...next[formIndex],
        row: {
          ...next[formIndex].row,
          ...getRowFieldPatch(field, value),
        },
      };

      return next;
    });
  };

  const updateSplitFormFreightInfo = (formIndex, updater) => {
    setSplitFormDetails((prev) => {
      const next = Array.from({ length: Math.max(splitFormCount, formIndex + 1) }, (_, index) =>
        ensureSplitFormDetails(index, prev)
      );
      const currentFreightInfo = { ...createFreightInfo(), ...(next[formIndex].freightInfo || {}) };
      const nextFreightInfo = typeof updater === 'function' ? updater(currentFreightInfo) : updater;

      next[formIndex] = {
        ...next[formIndex],
        freightInfo: {
          ...currentFreightInfo,
          ...nextFreightInfo,
        },
      };

      return next;
    });
  };

  const renderSplitMoveMenu = () => {
    const assignedFormIndex = Number.isInteger(splitMoveMenu.itemIndex)
      ? getSplitItemAssignedFormIndex(splitMoveMenu.itemIndex)
      : -1;

    return (
      <Menu
        anchorEl={splitMoveMenu.anchorEl}
        open={Boolean(splitMoveMenu.anchorEl)}
        onClose={handleCloseSplitMoveMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem
          dense
          selected={assignedFormIndex === -1}
          onClick={() => handleMoveSplitItem(null)}
          sx={{ fontSize: 12, minWidth: 150 }}
        >
          Main Table
        </MenuItem>
        {Array.from({ length: splitFormCount }, (_, formIndex) => (
          <MenuItem
            dense
            key={`split-move-form-${formIndex + 1}`}
            selected={assignedFormIndex === formIndex}
            onClick={() => handleMoveSplitItem(formIndex)}
            sx={{ fontSize: 12, minWidth: 150 }}
          >
            New Form {formIndex + 1}
          </MenuItem>
        ))}
      </Menu>
    );
  };

  const renderSplitFormLegend = (formIndex) => (
    <Box
      component="legend"
      sx={{
        px: 0.8,
        display: 'flex',
        alignItems: 'center',
        gap: 0.4,
        fontSize: 13,
      }}
    >
      <Box component="span">New Form {formIndex + 1}</Box>
      {splitTempReceiptNumbers[formIndex] && (
        <Box component="span" sx={{ fontWeight: 700, color: '#0c243f' }}>
          - {splitTempReceiptNumbers[formIndex]}
        </Box>
      )}
      <IconButton
        size="small"
        aria-label={`Remove New Form ${formIndex + 1}`}
        title={`Remove New Form ${formIndex + 1}`}
        onClick={() => handleRemoveSplitForm(formIndex)}
        sx={{ p: 0.1, color: '#A22' }}
      >
        <Iconify icon="mdi:close-circle" width={15} />
      </IconButton>
    </Box>
  );

  const renderSplitImagePreviewAction = (item, itemIndex) => {
    const imageCount = item.images?.length || 0;

    return (
      <IconButton
        size="small"
        title={imageCount > 0 ? 'View uploaded images' : 'No images available'}
        disabled={imageCount === 0}
        onClick={() => handleOpenImages(item, itemIndex)}
        sx={{ p: 0.2, position: 'relative' }}
      >
        <Iconify
          icon="mdi:image-multiple"
          width={16}
          sx={{ color: imageCount > 0 ? '#0a4a8f' : '#9e9e9e' }}
        />
        {imageCount > 0 && (
          <Box
            component="span"
            sx={{
              position: 'absolute',
              top: -5,
              right: -6,
              minWidth: 14,
              height: 14,
              px: 0.3,
              borderRadius: '50%',
              bgcolor: '#A22',
              color: '#fff',
              fontSize: 9,
              lineHeight: '14px',
              fontWeight: 700,
            }}
          >
            {imageCount}
          </Box>
        )}
      </IconButton>
    );
  };

  const handleEditWarehouseReceipt = () => {
    editReceiptSnapshotRef.current = {
      receiptForms,
      activeTab,
      receiptInfoErrors,
      receiptNoteText,
    };

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
    setCancelEditConfirmOpen(true);
  };

  const handleCloseCancelEditConfirm = () => {
    setCancelEditConfirmOpen(false);
  };

  const handleConfirmCancelEditWarehouseReceipt = () => {
    const snapshot = editReceiptSnapshotRef.current;

    if (snapshot) {
      setReceiptForms(snapshot.receiptForms);
      setActiveTab(snapshot.activeTab || snapshot.receiptForms?.[0]?.id || '');
      setReceiptInfoErrors(snapshot.receiptInfoErrors || {});
      setReceiptNoteText(snapshot.receiptNoteText || '');
    } else {
      setReceiptForms(initialReceiptForms);
      setActiveTab(initialReceiptForms[0]?.id || '');
      setReceiptInfoErrors({});
      setReceiptNoteText(initialReceiptForms[0]?.freightInfo?.notes || '');
    }

    setCancelEditConfirmOpen(false);

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

  const hasActiveRateInformation = () => {
    const rateInformation = activeForm?.row?.rateInformation ?? viewReceiptSummary?.rateInformation;
    if (!rateInformation) return false;
    if (typeof rateInformation !== 'object') return true;
    return Object.keys(rateInformation).length > 0;
  };

  const getActiveRateInformation = () => activeForm?.row?.rateInformation || viewReceiptSummary?.rateInformation || {};

  const getActiveHasFlatRate = () =>
    isYes(activeForm?.row?.hasFlatRate ?? viewReceiptSummary?.hasFlatRate ?? getActiveRateInformation().hasFlatRate);

  const getActiveNotesForFlatRate = () =>
    activeForm?.row?.notesForFlatRate ?? viewReceiptSummary?.notesForFlatRate ?? '';

  const handleOpenRatesDialog = () => {
    if (!hasActiveRateInformation()) {
      setRatesNoticeOpen(true);
      return;
    }

    setRatesNoticeOpen(false);
    setRatesDialogOpen(true);
  };

  const getRateDisplayValue = (value) => {
    if (value === undefined || value === null || value === '') return '';
    return formatMeasurement(value);
  };

  const getRateDialogRows = () => {
    const rateInformation = getActiveRateInformation();
    const freightBreakdown = Array.isArray(rateInformation.freightBreakdown) ? rateInformation.freightBreakdown : [];
    const sourceRows = freightBreakdown.length
      ? freightBreakdown
      : Array.isArray(activeForm?.row?.freightInformation)
        ? activeForm.row.freightInformation
        : [];
    const hasValue = (value) => value !== undefined && value !== null && value !== '';
    const dimFactor = hasValue(rateInformation.dimFactor) ? getRateDisplayValue(rateInformation.dimFactor) : '';

    return sourceRows.map((item) => {
      const pieces = hasValue(item.pieces) ? item.pieces : '';
      const type = item.type || '';
      const length = hasValue(item.length) ? getRateDisplayValue(item.length) : '';
      const width = hasValue(item.width) ? getRateDisplayValue(item.width) : '';
      const height = hasValue(item.height) ? getRateDisplayValue(item.height) : '';
      const dimensionalWeight = hasValue(item.dimensionalWeight) ? getRateDisplayValue(item.dimensionalWeight) : '';
      const actualWeightValue = item.actualWeight ?? item.weight;
      const actualWeight = hasValue(actualWeightValue) ? getRateDisplayValue(actualWeightValue) : '';
      const hasDimensionalFormula = [pieces, length, width, height, dimFactor, dimensionalWeight].every(hasValue);

      return {
        pieces,
        type,
        formula: hasDimensionalFormula
          ? `${pieces} x ${length} x ${width} x ${height} / ${dimFactor} = ${dimensionalWeight}`
          : '',
        dimensionalWeight,
        actualWeight,
      };
    });
  };

  const getRatesTotal = () => {
    const rateInformation = getActiveRateInformation();

    return {
      dimWeightTotal: getRateDisplayValue(rateInformation.totalDimensionalWeight),
      actualWeightTotal: getRateDisplayValue(rateInformation.totalActualWeight),
      estimatedCost: getRateDisplayValue(rateInformation.finalRate),
    };
  };

  const handleOpenIdVerificationView = async (verificationId) => {
    const cleanVerificationId = String(verificationId || '').trim();
    if (!cleanVerificationId) return;

    const loadingKey = `verification:${cleanVerificationId}`;
    setStatusHistoryLinkLoadingId(loadingKey);

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

  const getWarehouseReceiptRowsByParams = async (params) => {
    const response = await axios.get(`/warehouse-receipt?${params.toString()}`);
    const responseData = response.data || {};
    return Array.isArray(responseData.data) ? responseData.data : [];
  };

  const handleOpenWarehouseReceiptView = async (receiptId) => {
    const cleanReceiptId = String(receiptId || '').trim();
    if (!cleanReceiptId) return;

    const loadingKey = `receipt:${cleanReceiptId}`;
    setStatusHistoryLinkLoadingId(loadingKey);

    try {
      const receiptIdParams = new URLSearchParams({
        page: '1',
        pageSize: '10',
        receiptId: cleanReceiptId,
      });
      const receiptNumberParams = new URLSearchParams({
        page: '1',
        pageSize: '10',
        receiptNumber: cleanReceiptId,
      });
      let sourceRows = await getWarehouseReceiptRowsByParams(receiptIdParams);
      let receipt = sourceRows.find(
        (row) =>
          String(row.receiptId || '') === cleanReceiptId ||
          String(row.receiptNumber || '') === cleanReceiptId
      );

      if (!receipt) {
        sourceRows = await getWarehouseReceiptRowsByParams(receiptNumberParams);
        receipt = sourceRows.find(
          (row) =>
            String(row.receiptId || '') === cleanReceiptId ||
            String(row.receiptNumber || '') === cleanReceiptId
        );
      }

      if (!receipt) {
        setSnackbar({
          open: true,
          message: `Warehouse Receipt ${cleanReceiptId} was not found`,
          severity: 'error',
        });
        return;
      }

      setStatusHistoryDialogOpen(false);
      navigate(PATH_DASHBOARD.warehouseReceiptForm, {
        state: buildWarehouseReceiptViewState(
          buildWarehouseReceiptGridRow(receipt),
          state?.warehouseReceiptGridState
        ),
      });
    } finally {
      setStatusHistoryLinkLoadingId('');
    }
  };

  const renderLinkedStatusHistoryText = ({ text, match, loadingKey, onClick }) => {
    const [matchedText, label, linkValue] = match;
    const startIndex = text.indexOf(matchedText);
    const beforeText = text.slice(0, startIndex);
    const afterText = text.slice(startIndex + matchedText.length);

    return (
      <>
        {beforeText}
        {label}
        {renderStatusHistoryLinkButton({ linkValue, loadingKey, onClick })}
        {afterText}
      </>
    );
  };

  const renderStatusHistoryLinkButton = ({ linkValue, loadingKey, onClick }) => (
    <Button
      variant="text"
      size="small"
      onClick={() => onClick(linkValue)}
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
      {statusHistoryLinkLoadingId === loadingKey ? (
        <CircularProgress size={12} sx={{ color: '#A22' }} />
      ) : (
        linkValue
      )}
    </Button>
  );

  const renderSplitIntoReceiptLinks = (text) => {
    const splitIntoMatch = text.match(/has\s+been\s+split\s+into\s+/i);
    if (!splitIntoMatch) return null;

    const splitIntoStartIndex = splitIntoMatch.index + splitIntoMatch[0].length;
    const beforeSplitIds = text.slice(0, splitIntoStartIndex);
    const splitIdsText = text.slice(splitIntoStartIndex);
    const splitIdMatches = [...splitIdsText.matchAll(/\d+/g)];

    if (!splitIdMatches.length) return null;

    const linkedSplitIds = [];
    let cursor = 0;

    splitIdMatches.forEach((match) => {
      const receiptId = match[0];
      const startIndex = match.index;

      linkedSplitIds.push(splitIdsText.slice(cursor, startIndex));
      linkedSplitIds.push(
        <Box component="span" key={`split-receipt-link-${receiptId}-${startIndex}`}>
          {renderStatusHistoryLinkButton({
            linkValue: receiptId,
            loadingKey: `receipt:${receiptId}`,
            onClick: handleOpenWarehouseReceiptView,
          })}
        </Box>
      );
      cursor = startIndex + receiptId.length;
    });

    linkedSplitIds.push(splitIdsText.slice(cursor));

    return (
      <>
        {beforeSplitIds}
        {linkedSplitIds}
      </>
    );
  };

  const renderStatusHistoryDescription = (description) => {
    const text = String(description || '');
    const splitIntoReceiptLinks = renderSplitIntoReceiptLinks(text);

    if (splitIntoReceiptLinks) {
      return splitIntoReceiptLinks;
    }

    const verificationMatch = text.match(/(verification\s+ID\s+)(\d+)/i);

    if (verificationMatch) {
      const verificationId = verificationMatch[2];
      return renderLinkedStatusHistoryText({
        text,
        match: verificationMatch,
        loadingKey: `verification:${verificationId}`,
        onClick: handleOpenIdVerificationView,
      });
    }

    const receiptMatch = text.match(/((?:parent\s+)?receipt\s+ID\s+)(\d+)/i);

    if (receiptMatch) {
      const receiptId = receiptMatch[2];
      return renderLinkedStatusHistoryText({
        text,
        match: receiptMatch,
        loadingKey: `receipt:${receiptId}`,
        onClick: handleOpenWarehouseReceiptView,
      });
    }

    return text;
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
      <Box sx={{ width: { xs: '100%', sm: 430 } }}>
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
          onClick={handleSplitNoClick}
          disabled={splitTempReceiptLoading}
          sx={{ height: 24, minWidth: 60, color: '#111', borderColor: '#111', textTransform: 'none', fontSize: 11 }}
        >
          {splitTempReceiptLoading ? <CircularProgress size={14} color="inherit" /> : 'No'}
        </Button>
        <Button
          variant="contained"
          size="small"
          disabled={splitTempReceiptLoading}
          onClick={handleSplitYesClick}
          sx={{ ...actionBtnSx, height: 24, minWidth: 60, fontSize: 11 }}
        >
          {splitTempReceiptLoading ? <CircularProgress size={14} color="inherit" /> : 'Yes'}
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
                <TableCell>Length (in)</TableCell>
                <TableCell>Width (in)</TableCell>
                <TableCell>Height (in)</TableCell>
                <TableCell>Weight (lbs)</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {splitItems.map((item, index) => {
                const imageCount = item.images?.length || 0;

                return (
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
                        <IconButton
                          size="small"
                          title={imageCount > 0 ? 'View uploaded images' : 'No images available'}
                          disabled={imageCount === 0}
                          onClick={() => handleOpenImages(item, index)}
                          sx={{ p: 0.2, color: imageCount > 0 ? '#0c243f' : '#9e9e9e', position: 'relative' }}
                        >
                          <Iconify icon="mdi:image-multiple" width={16} />
                          {imageCount > 0 && (
                            <Box
                              component="span"
                              sx={{
                                position: 'absolute',
                                top: -5,
                                right: -6,
                                minWidth: 14,
                                height: 14,
                                px: 0.3,
                                borderRadius: '50%',
                                bgcolor: '#A22',
                                color: '#fff',
                                fontSize: 9,
                                lineHeight: '14px',
                                fontWeight: 700,
                              }}
                            >
                              {imageCount}
                            </Box>
                          )}
                        </IconButton>
                        <IconButton
                          size="small"
                          title={imageCount > 0 ? 'Download row images' : 'No images available'}
                          disabled={imageCount === 0}
                          onClick={() => handleDownloadItemImages(item, index)}
                          sx={{ p: 0.2, color: imageCount > 0 ? '#111' : '#9e9e9e' }}
                        >
                          <Iconify icon="mdi:download" width={16} />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <Stack spacing={2} sx={{ flex: 1, minWidth: { xs: '100%', md: 0 } }}>
            {Array.from({ length: splitFormCount }, (_, formIndex) => {
              const formItems = splitRecalculateFormItems[formIndex] || [createSplitRecalculateItem(1)];

              return (
                <Box key={`split-form-${formIndex + 1}`} component="fieldset" sx={{ border: '1px solid #777', borderRadius: 1, px: 1.6, py: 1.3, m: 0 }}>
                  {renderSplitFormLegend(formIndex)}
                  <Stack spacing={1.2}>
                    {formItems.map((item, itemIndex) => {
                      const isCargoApiProcessing = Boolean(splitCargoApiLoadingItems[getSplitCargoLoadingKey(formIndex, item.id)]);
                      const getItemError = (field) => splitRecalculateItemErrors[getSplitRecalculateItemErrorKey(formIndex, item.id, field)] || '';

                      return (
                        <Stack key={item.id} direction="row" alignItems="flex-start" spacing={1.2} sx={{ minWidth: 0, flexWrap: { xs: 'wrap', xl: 'nowrap' }, rowGap: 1 }}>
                          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minWidth: 70, pt: '22px' }}>
                            <Iconify icon="mdi:package-variant-closed" width={18} />
                            <Typography sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>Item {itemIndex + 1}</Typography>
                          </Stack>
                          <Box
                            sx={{
                              flex: 1,
                              display: 'grid',
                              gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, minmax(92px, 1fr))', xl: 'repeat(6, minmax(82px, 1fr)) auto' },
                              gap: 1.2,
                              alignItems: 'start',
                              minWidth: 0,
                            }}
                          >
                            <TextField
                              variant="standard"
                              label={<Box component="span">Pieces <Box component="span" sx={{ color: '#A22' }}>*</Box></Box>}
                              value={item.pieces || ''}
                              onChange={(event) => updateSplitRecalculateItem(formIndex, item.id, 'pieces', event.target.value)}
                              size="small"
                              error={Boolean(getItemError('pieces'))}
                              sx={{ '& .MuiInputLabel-root': { fontSize: 12 }, '& input': { fontSize: 12 }, '& .MuiFormHelperText-root': { fontSize: 10, mx: 0 } }}
                            />
                            <TextField
                              select
                              variant="standard"
                              label={<Box component="span">Type <Box component="span" sx={{ color: '#A22' }}>*</Box></Box>}
                              value={item.type || ''}
                              onChange={(event) => updateSplitRecalculateItem(formIndex, item.id, 'type', event.target.value)}
                              size="small"
                              error={Boolean(getItemError('type'))}
                              sx={{
                                '& .MuiInputLabel-root': { fontSize: 12 },
                                '& .MuiInputBase-root': { height: 31, alignItems: 'flex-end' },
                                '& .MuiSelect-select': { fontSize: 12, py: 0.2 },
                                '& .MuiFormHelperText-root': { fontSize: 10, mx: 0 },
                              }}
                            >
                              <MenuItem value="">Select</MenuItem>
                              {FREIGHT_TYPE_OPTIONS.map((option) => (
                                <MenuItem key={option} value={option}>
                                  {option}
                                </MenuItem>
                              ))}
                            </TextField>
                            {[
                              { label: 'Length (in)', field: 'length' },
                              { label: 'Width (in)', field: 'width' },
                              { label: 'Height (in)', field: 'height' },
                              { label: 'Weight(lbs)', field: 'weight' },
                            ].map(({ label, field }) => (
                              <TextField
                                key={field}
                                variant="standard"
                                label={<Box component="span">{label} <Box component="span" sx={{ color: '#A22' }}>*</Box></Box>}
                                value={item[field] || ''}
                                onChange={(event) => updateSplitRecalculateItem(formIndex, item.id, field, event.target.value)}
                                size="small"
                                inputProps={{ inputMode: 'decimal' }}
                                error={Boolean(getItemError(field))}
                                sx={{ '& .MuiInputLabel-root': { fontSize: 12 }, '& input': { fontSize: 12 }, '& .MuiFormHelperText-root': { fontSize: 10, mx: 0 } }}
                              />
                            ))}
                            <Stack direction="row" alignItems="center" spacing={0.7} sx={{ pt: '18px', justifyContent: 'flex-end' }}>
                              <IconButton size="small" title="Delete item" onClick={() => removeSplitRecalculateItem(formIndex, item.id)} sx={{ p: 0.3, color: '#111' }}>
                                <Iconify icon="mdi:trash-can" width={22} />
                              </IconButton>
                              <IconButton
                                size="small"
                                title="Package details"
                                disabled={isCargoApiProcessing}
                                onClick={(event) => handleSplitPackageDetailsClick(event, formIndex, item.id)}
                                sx={{ p: 0.3, color: isCargoApiProcessing ? '#9e9e9e' : '#111' }}
                              >
                                <Iconify icon="mdi:cube" width={24} />
                              </IconButton>
                              <IconButton
                                size="small"
                                title="Upload image"
                                disabled={isCargoApiProcessing}
                                onClick={() => handleOpenSplitItemUpload(formIndex, item.id)}
                                sx={{ p: 0.3, color: '#111' }}
                              >
                                {isCargoApiProcessing ? <CircularProgress size={18} sx={{ color: '#A22' }} /> : <Iconify icon="mdi:image-plus" width={24} />}
                              </IconButton>
                              {(item.images?.length || 0) > 0 && (
                                <IconButton
                                  size="small"
                                  title="View images"
                                  onClick={() => handleOpenSplitItemImages(formIndex, itemIndex, item)}
                                  sx={{ p: 0.3, color: '#111', position: 'relative' }}
                                >
                                  <Iconify icon="mdi:image-multiple" width={24} />
                                  <Box
                                    component="span"
                                    sx={{
                                      position: 'absolute',
                                      top: -5,
                                      right: -5,
                                      minWidth: 17,
                                      height: 17,
                                      px: 0.35,
                                      borderRadius: '50%',
                                      bgcolor: '#102a63',
                                      color: '#fff',
                                      fontSize: 10,
                                      lineHeight: '17px',
                                      fontWeight: 700,
                                    }}
                                  >
                                    {item.images.length}
                                  </Box>
                                </IconButton>
                              )}
                            </Stack>
                          </Box>
                          {isCargoApiProcessing && (
                            <Typography sx={{ pt: '23px', fontSize: 12, fontWeight: 600, color: '#A22', whiteSpace: 'nowrap' }}>
                              Cargo API processing...
                            </Typography>
                          )}
                        </Stack>
                      );
                    })}
                  </Stack>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => addSplitRecalculateItem(formIndex)}
                    sx={{ ...actionBtnSx, mt: 1.2, height: 24, minWidth: 74, fontSize: 11 }}
                  >
                    Add Item
                  </Button>
                </Box>
              );
            })}
          </Stack>
        </Stack>

        <Stack alignItems="flex-end" sx={{ mt: 2 }}>
          <Button
            variant="contained"
            size="small"
            onClick={handleAddSplitForm}
            disabled={splitTempReceiptLoading}
            sx={{ ...actionBtnSx, height: 26, minWidth: 110, fontSize: 11 }}
          >
            {splitTempReceiptLoading ? 'Adding...' : 'Add New Form'}
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

    const renderExistingItemFieldCell = (item, itemIndex, field) => {
      const helperText = splitExistingItemErrors[getSplitExistingItemErrorKey(itemIndex, field)] || '';

      return (
        <TableCell>
          <Typography sx={{ fontSize: 12 }}>{item[field] || ''}</Typography>
          {helperText && (
            <Typography sx={{ color: 'error.main', fontSize: 10, lineHeight: 1.2, mt: 0.25 }}>
              {helperText}
            </Typography>
          )}
        </TableCell>
      );
    };

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
      setSplitExistingFormErrors({});
    };

    const handleRemoveFromSplitForm = (formIndex, itemIndex) => {
      setSplitExistingFormItems((prev) =>
        prev.map((formItems, index) =>
          index === formIndex ? formItems.filter((assignedIndex) => assignedIndex !== itemIndex) : formItems
        )
      );
      setSplitExistingFormErrors({});
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
                <TableCell>Length (in)</TableCell>
                <TableCell>Width (in)</TableCell>
                <TableCell>Height (in)</TableCell>
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
                  {renderExistingItemFieldCell(item, index, 'pieces')}
                  {renderExistingItemFieldCell(item, index, 'type')}
                  {renderExistingItemFieldCell(item, index, 'length')}
                  {renderExistingItemFieldCell(item, index, 'width')}
                  {renderExistingItemFieldCell(item, index, 'height')}
                  {renderExistingItemFieldCell(item, index, 'weight')}
                  <TableCell align="center">
                    <Stack direction="row" spacing={0.7} justifyContent="center">
                      {renderSplitImagePreviewAction(item, index)}
                      <IconButton
                        size="small"
                        title="Move item"
                        onClick={(event) => handleOpenSplitMoveMenu(event, index)}
                        sx={{ p: 0.2, color: '#111' }}
                      >
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
                  {renderSplitFormLegend(formIndex)}
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
                        <TableCell>Length (in)</TableCell>
                        <TableCell>Width (in)</TableCell>
                        <TableCell>Height (in)</TableCell>
                        <TableCell>Weight (lbs)</TableCell>
                        <TableCell align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {formItemIndexes.map((itemIndex) => {
                        const item = splitItems[itemIndex] || {};

                        return (
                          <TableRow
                            key={`new-form-${formIndex}-${item.id || itemIndex}`}
                            draggable
                            onDragStart={(event) => handleDragStart(event, itemIndex)}
                            sx={{ cursor: 'grab', '&:active': { cursor: 'grabbing' } }}
                          >
                            <TableCell>{String(itemIndex + 1).padStart(2, '0')}</TableCell>
                            {renderExistingItemFieldCell(item, itemIndex, 'pieces')}
                            {renderExistingItemFieldCell(item, itemIndex, 'type')}
                            {renderExistingItemFieldCell(item, itemIndex, 'length')}
                            {renderExistingItemFieldCell(item, itemIndex, 'width')}
                            {renderExistingItemFieldCell(item, itemIndex, 'height')}
                            {renderExistingItemFieldCell(item, itemIndex, 'weight')}
                            <TableCell align="center">
                              <Stack direction="row" spacing={0.7} justifyContent="center">
                                {renderSplitImagePreviewAction(item, itemIndex)}
                                <IconButton
                                  size="small"
                                  title="Move item"
                                  onClick={(event) => handleOpenSplitMoveMenu(event, itemIndex)}
                                  sx={{ p: 0.2, color: '#111' }}
                                >
                                  <Iconify icon="mdi:dots-vertical" width={16} />
                                </IconButton>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  {splitExistingFormErrors[formIndex] && (
                    <Typography sx={{ color: 'error.main', fontSize: 11, mt: 0.7 }}>
                      {splitExistingFormErrors[formIndex]}
                    </Typography>
                  )}
                </Box>
              );
            })}
          </Stack>
        </Stack>

        <Stack alignItems="flex-end" sx={{ mt: 2 }}>
          <Button
            variant="contained"
            size="small"
            onClick={handleAddSplitForm}
            disabled={splitTempReceiptLoading}
            sx={{ ...actionBtnSx, height: 26, minWidth: 110, fontSize: 11 }}
          >
            {splitTempReceiptLoading ? 'Adding...' : 'Add New Form'}
          </Button>
        </Stack>
      </Box>
    );
  };

  const renderSplitNewFormAssignmentPanel = () => {
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

    const renderItemRow = (item, itemIndex, rowKey, showRemove, formIndex = 0) => (
      <TableRow
        key={rowKey}
        draggable
        onDragStart={(event) => handleDragStart(event, itemIndex)}
        sx={{ cursor: 'grab', '&:active': { cursor: 'grabbing' } }}
      >
        <TableCell>{String(itemIndex + 1).padStart(2, '0')}</TableCell>
        <TableCell>{item.pieces || ''}</TableCell>
        <TableCell>{item.type || ''}</TableCell>
        <TableCell>{item.length || ''}</TableCell>
        <TableCell>{item.width || ''}</TableCell>
        <TableCell>{item.height || ''}</TableCell>
        <TableCell>{item.weight || ''}</TableCell>
        <TableCell align="center">
          <Stack direction="row" spacing={0.7} justifyContent="center">
            {renderSplitImagePreviewAction(item, itemIndex)}
            <IconButton
              size="small"
              title="Move item"
              onClick={(event) => handleOpenSplitMoveMenu(event, itemIndex)}
              sx={{ p: 0.2, color: '#111' }}
            >
              <Iconify icon="mdi:dots-vertical" width={16} />
            </IconButton>
          </Stack>
        </TableCell>
      </TableRow>
    );

    const assignmentTableSx = {
      border: '1px solid #d0d0d0',
      '& th': { bgcolor: '#d7d7d7', fontSize: 11, fontWeight: 700, py: 0.55 },
      '& td': { fontSize: 12, py: 0.5 },
    };

    return (
      <Box sx={{ mb: 2.2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700 }}>New Form Item Assignment</Typography>
          <Box sx={{ bgcolor: '#e6f3fb', px: 1, py: 0.35 }}>
            <Typography sx={{ fontSize: 10 }}>
              Drag items between New Forms. Empty forms will be ignored.
            </Typography>
          </Box>
        </Stack>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-start">
          <Box sx={{ width: { xs: '100%', md: 470 }, maxHeight: 260, overflow: 'auto' }}>
            <Table size="small" sx={assignmentTableSx}>
              <TableHead>
                <TableRow>
                  <TableCell>Item</TableCell>
                  <TableCell>Pieces</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Length (in)</TableCell>
                  <TableCell>Width (in)</TableCell>
                  <TableCell>Height (in)</TableCell>
                  <TableCell>Weight (lbs)</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {remainingSplitItems.map(({ item, index }) =>
                  renderItemRow(item, index, `form-info-remaining-${item.id || index}`, false)
                )}
              </TableBody>
            </Table>
          </Box>

          <Stack spacing={1.4} sx={{ flex: 1, minWidth: { xs: '100%', md: 0 }, maxHeight: 260, overflow: 'auto', pr: 0.5 }}>
            {Array.from({ length: splitFormCount }, (_, formIndex) => {
              const formItemIndexes = splitExistingFormItems[formIndex] || [];

              return (
                <Box
                  key={`form-info-split-form-${formIndex + 1}`}
                  component="fieldset"
                  onDragOver={handleDragOver}
                  onDrop={(event) => handleDropOnForm(event, formIndex)}
                  sx={{
                    minHeight: 98,
                    border: '1px solid #777',
                    borderRadius: 1,
                    px: 1.2,
                    py: 1,
                    m: 0,
                    bgcolor: formItemIndexes.length ? '#fff' : '#fafafa',
                  }}
                >
                  {renderSplitFormLegend(formIndex)}
                  <Table size="small" sx={assignmentTableSx}>
                    <TableHead>
                      <TableRow>
                        <TableCell>Item</TableCell>
                        <TableCell>Pieces</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Length (in)</TableCell>
                        <TableCell>Width (in)</TableCell>
                        <TableCell>Height (in)</TableCell>
                        <TableCell>Weight (lbs)</TableCell>
                        <TableCell align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {formItemIndexes.map((itemIndex) => {
                        const item = splitItems[itemIndex] || {};
                        return renderItemRow(item, itemIndex, `form-info-new-form-${formIndex}-${item.id || itemIndex}`, true, formIndex);
                      })}
                    </TableBody>
                  </Table>
                </Box>
              );
            })}
          </Stack>
        </Stack>

        <Stack alignItems="flex-end" sx={{ mt: 1.4 }}>
          <Button
            variant="contained"
            size="small"
            onClick={handleAddSplitForm}
            disabled={splitTempReceiptLoading}
            sx={{ ...actionBtnSx, height: 26, minWidth: 110, fontSize: 11 }}
          >
            {splitTempReceiptLoading ? 'Adding...' : 'Add New Form'}
          </Button>
        </Stack>
      </Box>
    );
  };

  const renderSplitFormInfoStep = () => {
    const splitTabValue = Math.min(activeSplitFormTab, Math.max(splitFormCount - 1, 0));
    const splitReceiptNumber = splitTempReceiptNumbers[splitTabValue] || activeForm.receiptNumber;
    const splitFormItems = splitDimensionMode === 'existing'
      ? (splitExistingFormItems[splitTabValue] || [])
          .map((itemIndex) => ({ item: activeForm.items[itemIndex], originalIndex: itemIndex }))
          .filter(({ item }) => item)
      : (splitRecalculateFormItems[splitTabValue] || [])
          .map((item, index) => ({ item, originalIndex: index }))
          .filter(({ item }) => item);
    const splitPiecesInland = splitFormItems.reduce((sum, { item }) => sum + Number(item.pieces || 0), 0);
    const splitWeightInland = splitFormItems.reduce((sum, { item }) => sum + Number(item.weight || 0), 0);
    const splitTotalWeight = splitFormItems.reduce(
      (sum, { item }) => sum + Number(item.pieces || 0) * Number(item.weight || 0),
      0
    );
    const splitTotalCbm = splitFormItems.reduce((sum, { item }) => sum + calculateItemCbm(item), 0);
    const isSplitGeneratedForm = Boolean(splitTempReceiptNumbers[splitTabValue]);
    const splitDetails = isSplitGeneratedForm ? ensureSplitFormDetails(splitTabValue, splitFormDetails) : null;
    const splitRow = isSplitGeneratedForm ? splitDetails.row : row;
    const splitFreightInfo = isSplitGeneratedForm
      ? { ...createFreightInfo(), ...(splitDetails.freightInfo || {}) }
      : activeFreightInfo;
    const updateSplitRowField = (field, value) => {
      if (isSplitGeneratedForm) {
        updateSplitFormRowField(splitTabValue, field, value);
        return;
      }

      updateActiveRowField(field, value);
    };
    const updateSplitFreight = (updater) => {
      if (isSplitGeneratedForm) {
        updateSplitFormFreightInfo(splitTabValue, updater);
        return;
      }

      updateActiveFreightInfo(updater);
    };
    const addSplitTagValue = (value, listField, inputField) => {
      const trimmedValue = value.trim();
      if (!trimmedValue) return;

      updateSplitFreight((info) => ({
        [listField]: [...info[listField], trimmedValue],
        [inputField]: '',
      }));
    };
    const removeSplitTagValue = (index, listField) => {
      updateSplitFreight((info) => ({
        [listField]: info[listField].filter((_, valueIndex) => valueIndex !== index),
      }));
    };

    return (
      <Box sx={{ mt: 3 }}>
        <Tabs
        value={splitTabValue}
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
              fontWeight: splitTabValue === formIndex ? 700 : 400,
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
                <ReceiptInfoRow label="Receipt No" value={splitReceiptNumber} />
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
                <ReceiptInfoRow label="Label Count" value={String(splitFormItems.length).padStart(2, '0')} />
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
                      error={Boolean(receiptInfoErrors[activeForm.id]?.customerSelection)}
                      helperText={receiptInfoErrors[activeForm.id]?.customerSelection || ''}
                      sx={{
                        ...fieldSx,
                        '& .MuiFormHelperText-root': {
                          display: 'block',
                          fontSize: 11,
                          mt: 0.3,
                        },
                      }}
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
                  onClick={() => handleOpenSplitMailDialog(splitTabValue, splitRow)}
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
                    value={getRowValue(splitRow, ['invoiceNo', 'invoiceNumber'], '')}
                    editable
                    maxLength={50}
                    onChange={(value) => updateSplitRowField('invoiceNo', value)}
                  />
                  <DisplayField
                    label="PO No"
                    value={getRowValue(splitRow, ['poNumber', 'poNo'], '')}
                    editable
                    maxLength={50}
                    onChange={(value) => updateSplitRowField('poNumber', value)}
                  />
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                  <DisplayField
                    label="Customer Ref No"
                    value={getRowValue(splitRow, ['customerRefNo', 'customerReference'], '')}
                    width={{ xs: '100%', sm: '25%' }}
                    editable
                    maxLength={50}
                    onChange={(value) => updateSplitRowField('customerRefNo', value)}
                  />
                  <DisplayField
                    label="Package ID"
                    value={getRowValue(splitRow, ['packageId', 'packageNumber'], '')}
                    width={{ xs: '100%', sm: '25%' }}
                    editable
                    onChange={(value) => updateSplitRowField('packageId', value)}
                  />
                  <Box sx={{ flex: 1 }} />
                  <Box sx={{ flex: 1 }} />
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                  <DisplayField label="Pieces" value={splitPiecesInland} required />
                  <DisplayField label="Weight" value={splitWeightInland} required />
                  <DisplayField label="RE Weight" value={splitTotalWeight} required />
                  <DisplayField label="CBM (m3)" value={formatMeasurement(splitTotalCbm)} required />
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
                    {FREIGHT_ITEM_TABLE_HEADERS.map(({ label: head, field }) => (
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
                                width: isWarehouseReceiptEdit ? 116 : 72,
                              }
                            : {}),
                        }}
                      >
                        {head}
                        {REQUIRED_FREIGHT_ITEM_FIELD_SET.has(field) && (
                          <Box component="span" sx={{ color: '#b01818', ml: 0.2 }}>
                            *
                          </Box>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {splitFormItems.map(({ item, originalIndex }, index) => (
                    <TableRow key={`${item.id || originalIndex}-${index}`}>
                      <TableCell sx={{ py: 0.35, px: 0.8, fontSize: 12 }}>{String(index + 1).padStart(2, '0')}</TableCell>
                      <TableCell sx={{ py: 0.35, px: 0.8, fontSize: 12 }}>
                        {isWarehouseReceiptEdit && isReceiptDetailsEditable ? (
                          <TextField
                            variant="standard"
                            value={item.pieces || ''}
                            onChange={(event) => updateActiveFreightItemField(item.id, 'pieces', event.target.value.replace(/\D/g, '').slice(0, 5))}
                            size="small"
                            inputProps={{ inputMode: 'numeric' }}
                            sx={{ minWidth: 48, '& input': { fontSize: 12, py: 0.2 } }}
                          />
                        ) : item.pieces}
                      </TableCell>
                      <TableCell sx={{ py: 0.35, px: 0.8, fontSize: 12 }}>
                        {isWarehouseReceiptEdit && isReceiptDetailsEditable ? (
                          <TextField
                            select
                            variant="standard"
                            value={item.type || ''}
                            onChange={(event) => updateActiveFreightItemField(item.id, 'type', event.target.value)}
                            size="small"
                            sx={{ minWidth: 82, '& .MuiSelect-select': { fontSize: 12, py: 0.2 } }}
                          >
                            {FREIGHT_TYPE_OPTIONS.map((option) => (
                              <MenuItem key={option} value={option}>
                                {option}
                              </MenuItem>
                            ))}
                          </TextField>
                        ) : item.type}
                      </TableCell>
                      {[
                        { field: 'length', value: item.length },
                        { field: 'width', value: item.width },
                        { field: 'height', value: item.height },
                        { field: 'weight', value: item.weight },
                      ].map(({ field, value }) => (
                        <TableCell key={field} sx={{ py: 0.35, px: 0.8, fontSize: 12 }}>
                          {isWarehouseReceiptEdit && isReceiptDetailsEditable ? (
                            <TextField
                              variant="standard"
                              value={value || ''}
                              onChange={(event) => updateActiveFreightItemField(item.id, field, event.target.value)}
                              size="small"
                              inputProps={{ inputMode: 'decimal' }}
                              sx={{ minWidth: 58, '& input': { fontSize: 12, py: 0.2 } }}
                            />
                          ) : value}
                        </TableCell>
                      ))}
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
                          onClick={() => handleOpenImages(item, originalIndex)}
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
                        {isWarehouseReceiptEdit && isReceiptDetailsEditable && activeForm.items.length > 1 && (
                          <IconButton
                            size="small"
                            title="Delete item"
                            onClick={() => handleRemoveActiveFreightItem(item.id)}
                            sx={{ p: 0.2, color: '#A22' }}
                          >
                            <Iconify icon="mdi:delete" width={18} />
                          </IconButton>
                        )}
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
                            checked={Boolean(splitFreightInfo.conditions[label])}
                            disabled={isMobileReceiptForm}
                            onChange={(event) =>
                              updateSplitFreight((info) => ({
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
                            checked={splitFreightInfo.badFreightCondition}
                            disabled={isMobileReceiptForm}
                            onChange={(event) =>
                              updateSplitFreight({
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
                      {splitFreightInfo.badFreightCondition && (
                        <>
                          <IconButton
                            size="small"
                            title="Capture freight condition image"
                            onClick={() => handleOpenFreightCamera(isSplitGeneratedForm ? splitTabValue : null)}
                            disabled={isMobileReceiptForm}
                            sx={{ bgcolor: '#A22', color: '#fff', width: 30, height: 30, borderRadius: 1, '&:hover': { bgcolor: '#8b1c1c' } }}
                          >
                            <Iconify icon="mdi:camera" width={18} />
                          </IconButton>
                          <IconButton
                            size="small"
                            title="Upload freight condition image"
                            onClick={() => handleOpenFreightUpload(isSplitGeneratedForm ? splitTabValue : null)}
                            disabled={isMobileReceiptForm}
                            sx={{ bgcolor: '#A22', color: '#fff', width: 30, height: 30, borderRadius: 1, '&:hover': { bgcolor: '#8b1c1c' } }}
                          >
                            <Iconify icon="mdi:image-plus" width={18} />
                          </IconButton>
                        </>
                      )}
                    </Stack>
                    {splitFreightInfo.badFreightCondition && splitFreightInfo.freightConditionImages.length > 0 && (
                      <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 0.5 }}>
                        {splitFreightInfo.freightConditionImages.map((file, index) => (
                          <WarehouseImage
                            key={`${getImageName(file, index)}-${index}`}
                            file={file}
                            imageType="badFreight"
                            alt={getImageName(file, index)}
                            onClick={() =>
                              setImageDialog({
                                open: true,
                                images: splitFreightInfo.freightConditionImages,
                                itemLabel: 'Bad Freight Condition',
                                imageType: 'badFreight',
                                splitFormIndex: isSplitGeneratedForm ? splitTabValue : null,
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
                      value={splitFreightInfo.freightConditionDescription}
                      onChange={(event) => updateSplitFreight({ freightConditionDescription: event.target.value })}
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
                          checked={splitFreightInfo.hazMat}
                          onChange={(event) => updateSplitFreight({ hazMat: event.target.checked })}
                          size="small"
                          sx={{ p: 0.4 }}
                        />
                      }
                      label={<Typography sx={{ fontSize: 12 }}>Haz Mat</Typography>}
                    />
                    {splitFreightInfo.hazMat && (
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={splitFreightInfo.originalDgd}
                            onChange={(event) => updateSplitFreight({ originalDgd: event.target.checked })}
                            size="small"
                            sx={{ p: 0.4 }}
                          />
                        }
                        label={<Typography sx={{ fontSize: 12 }}>Original DGD</Typography>}
                      />
                    )}
                  </Stack>
                  {splitFreightInfo.hazMat && (
                    <>
                      <TagInputBox
                        label="UN Number"
                        values={splitFreightInfo.unNumbers}
                        inputValue={splitFreightInfo.unNumberInput}
                        onInputChange={(value) => updateSplitFreight({ unNumberInput: value })}
                        onAdd={(value) => addSplitTagValue(value, 'unNumbers', 'unNumberInput')}
                        onRemove={(index) => removeSplitTagValue(index, 'unNumbers')}
                      />
                      <TagInputBox
                        label="Hazmat Class"
                        values={splitFreightInfo.hazmatClasses}
                        inputValue={splitFreightInfo.hazmatClassInput}
                        onInputChange={(value) => updateSplitFreight({ hazmatClassInput: value })}
                        onAdd={(value) => addSplitTagValue(value, 'hazmatClasses', 'hazmatClassInput')}
                        onRemove={(index) => removeSplitTagValue(index, 'hazmatClasses')}
                      />
                    </>
                  )}
                </Stack>
                <Stack sx={{ flex: 1, minWidth: 0 }} spacing={1}>
                  <DisplayField
                    label="Proper Shipping Name"
                    value={splitFreightInfo.properShippingName}
                    editable
                    onChange={(value) => updateSplitFreight({ properShippingName: value })}
                  />
                  <Typography sx={{ fontSize: 12 }}>Description</Typography>
                  <TextField
                    multiline
                    rows={6}
                    size="small"
                    value={splitFreightInfo.hazardousDescription}
                    onChange={(event) => updateSplitFreight({ hazardousDescription: event.target.value })}
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
                value={getRowValue(splitRow, ['destination', 'finalDestination'], '')}
                editable
                onChange={(value) => updateSplitRowField('destination', value)}
              />
            </Stack>
            <Stack sx={{ flex: 1, minWidth: 0 }} spacing={0.3}>
              <Typography sx={{ fontSize: 12 }}>Notes</Typography>
              <TextField
                multiline
                rows={6}
                size="small"
                value={splitFreightInfo.notes}
                onChange={(event) => updateSplitFreight({ notes: event.target.value })}
                sx={{ '& textarea': { fontSize: 12 } }}
              />
            </Stack>
          </Stack>
        </Box>
      </Box>
    </Box>
    );
  };

  const renderViewSummary = () => {
    if (!isWarehouseReceiptView || !viewReceiptSummary) return null;

    const receiptNumber = viewReceiptSummary.receiptNumber || activeForm?.receiptNumber || '';
    const status = String(viewReceiptSummary.status || getRowValue(activeForm?.row, 'status', '') || '').toUpperCase();
    const isArchivedReceipt = status === 'ARCHIVED';
    const disableViewHeaderActions = isArchivedReceipt || ['INITIATED', 'REJECTED'].includes(status);

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
                    onClick={handlePrintWarehouseReceipt}
                    disabled={disableViewHeaderActions}
                    sx={{ ...actionBtnSx, height: 26, flex: 1, fontSize: 12 }}
                  >
                    Print
                  </Button>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => handleOpenPrinterDialog(receiptNumber)}
                    disabled={disableViewHeaderActions}
                    sx={{ ...actionBtnSx, height: 26, flex: 1, fontSize: 12 }}
                  >
                    Print Labels
                  </Button>
                  <Box sx={{ position: 'relative', flex: 1, minWidth: 0 }}>
                    {ratesNoticeOpen && (
                      <Alert
                        severity="warning"
                        sx={{
                          position: 'absolute',
                          right: 0,
                          bottom: 'calc(100% + 8px)',
                          width: { xs: 'min(280px, calc(100vw - 32px))', sm: 270 },
                          py: 0.25,
                          px: 0.8,
                          zIndex: 3,
                          boxShadow: 2,
                          '& .MuiAlert-icon': { fontSize: 16, mr: 0.6, py: 0.2 },
                          '& .MuiAlert-message': { fontSize: 11, py: 0.2 },
                        }}
                      >
                        Please set rate on the station to see the rates
                      </Alert>
                    )}
                    <Button
                      variant="contained"
                      size="small"
                      onClick={handleOpenRatesDialog}
                      disabled={disableViewHeaderActions}
                      sx={{ ...actionBtnSx, height: 26, width: '100%', fontSize: 12 }}
                    >
                      Rates
                    </Button>
                  </Box>
                </Stack>
              </Box>
            </Box>
          </Box>

          <Stack direction="row" justifyContent="flex-end" spacing={1}>
            <Button
              variant="contained"
              size="small"
              onClick={handleOpenSplitDialog}
              disabled={disableViewHeaderActions}
              sx={{ ...actionBtnSx, height: 26, minWidth: 60, fontSize: 11 }}
            >
              Split
            </Button>
            <Button
              variant="contained"
              size="small"
              onClick={handleEditWarehouseReceipt}
              disabled={disableViewHeaderActions}
              sx={{ ...actionBtnSx, height: 26, minWidth: 60, fontSize: 11 }}
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

  const splitMailRow =
    Number.isInteger(splitMailFormIndex)
      ? ensureSplitFormDetails(splitMailFormIndex, splitFormDetails).row
      : {};
  const splitCustomerEmailRows = getCustomerEmailRows(getRowValue(splitMailRow, 'customerEmails', []));
  const splitMailRows = mergeCustomerAndSelectedEmailRows(splitCustomerEmailRows, selectedSplitMailEmails);

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
              disabled={updateReceiptLoading}
              onClick={handleSubmit}
              sx={{ ...actionBtnSx, height: 24, minWidth: 58 }}
            >
              {updateReceiptLoading ? 'Updating...' : 'Update'}
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
                      error={Boolean(receiptInfoErrors[activeForm.id]?.customerSelection)}
                      helperText={receiptInfoErrors[activeForm.id]?.customerSelection || ''}
                      sx={{
                        ...fieldSx,
                        '& .MuiFormHelperText-root': {
                          display: 'block',
                          fontSize: 11,
                          mt: 0.3,
                        },
                      }}
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
                    {FREIGHT_ITEM_TABLE_HEADERS.map(({ label: head, field }) => (
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
                                width: isWarehouseReceiptEdit ? 116 : 72,
                              }
                            : {}),
                        }}
                      >
                        {head}
                        {REQUIRED_FREIGHT_ITEM_FIELD_SET.has(field) && (
                          <Box component="span" sx={{ color: '#b01818', ml: 0.2 }}>
                            *
                          </Box>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {activeForm.items.map((item, index) => {
                    const getItemError = (field) =>
                      receiptInfoErrors[activeForm.id]?.items?.[`${item.id}-${field}`] || '';

                    return (
                    <TableRow key={item.id || index}>
                      <TableCell sx={{ py: 0.35, px: 0.8, fontSize: 12 }}>{String(index + 1).padStart(2, '0')}</TableCell>
                      <TableCell sx={{ py: 0.35, px: 0.8, fontSize: 12 }}>
                        {isWarehouseReceiptEdit && isReceiptDetailsEditable ? (
                          <TextField
                            variant="standard"
                            value={item.pieces ?? ''}
                            onChange={(event) => updateActiveFreightItemField(item.id, 'pieces', event.target.value.replace(/\D/g, '').slice(0, 5))}
                            size="small"
                            error={Boolean(getItemError('pieces'))}
                            inputProps={{ inputMode: 'numeric' }}
                            sx={{ minWidth: 48, '& input': { fontSize: 12, py: 0.2 }, '& .MuiFormHelperText-root': { m: 0, fontSize: 10 } }}
                          />
                        ) : item.pieces}
                      </TableCell>
                      <TableCell sx={{ py: 0.35, px: 0.8, fontSize: 12 }}>
                        {isWarehouseReceiptEdit && isReceiptDetailsEditable ? (
                          <TextField
                            select
                            variant="standard"
                            value={item.type ?? ''}
                            onChange={(event) => updateActiveFreightItemField(item.id, 'type', event.target.value)}
                            size="small"
                            error={Boolean(getItemError('type'))}
                            sx={{ minWidth: 82, '& .MuiSelect-select': { fontSize: 12, py: 0.2 }, '& .MuiFormHelperText-root': { m: 0, fontSize: 10 } }}
                          >
                            {FREIGHT_TYPE_OPTIONS.map((option) => (
                              <MenuItem key={option} value={option}>
                                {option}
                              </MenuItem>
                            ))}
                          </TextField>
                        ) : item.type}
                      </TableCell>
                      {[
                        { field: 'length', value: item.length },
                        { field: 'width', value: item.width },
                        { field: 'height', value: item.height },
                        { field: 'weight', value: item.weight },
                      ].map(({ field, value }) => (
                        <TableCell key={field} sx={{ py: 0.35, px: 0.8, fontSize: 12 }}>
                          {isWarehouseReceiptEdit && isReceiptDetailsEditable ? (
                            <TextField
                              variant="standard"
                              value={value ?? ''}
                              onChange={(event) => updateActiveFreightItemField(item.id, field, event.target.value)}
                              size="small"
                              error={Boolean(getItemError(field))}
                              inputProps={{ inputMode: 'decimal' }}
                              sx={{ minWidth: 58, '& input': { fontSize: 12, py: 0.2 }, '& .MuiFormHelperText-root': { m: 0, fontSize: 10 } }}
                            />
                          ) : value}
                        </TableCell>
                      ))}
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
                          width: isWarehouseReceiptEdit ? 116 : 72,
                        }}
                      >
                        <Stack direction="row" spacing={0.4} justifyContent="center" alignItems="center">
                          {isWarehouseReceiptEdit && isReceiptDetailsEditable && (
                            <IconButton
                              size="small"
                              title="Upload image"
                              onClick={() => handleOpenActiveItemUpload(item)}
                              sx={{ p: 0.2, color: '#111' }}
                            >
                              <Iconify icon="mdi:image-plus" width={20} />
                            </IconButton>
                          )}
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
                          {isWarehouseReceiptEdit && isReceiptDetailsEditable && activeForm.items.length > 1 && (
                            <IconButton
                              size="small"
                              title="Delete item"
                              onClick={() => handleRemoveActiveFreightItem(item.id)}
                              sx={{ p: 0.2, color: '#A22' }}
                            >
                              <Iconify icon="mdi:trash-can" width={20} />
                            </IconButton>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {isWarehouseReceiptEdit && isReceiptDetailsEditable && (
                <Stack direction="row" justifyContent="flex-end" sx={{ p: 1 }}>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleAddActiveFreightItem}
                    sx={{ ...actionBtnSx, height: 26, minWidth: 86, fontSize: 11 }}
                  >
                    Add Items
                  </Button>
                </Stack>
              )}
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
                              updateActiveFreightInfo((info) => {
                                const removePaths = event.target.checked
                                  ? info.removeBadFreightImagePaths || []
                                  : [
                                      ...(info.removeBadFreightImagePaths || []),
                                      ...info.freightConditionImages.map(getReceiptImageRemovePath).filter(Boolean),
                                    ];

                                return {
                                  badFreightCondition: event.target.checked,
                                  removeBadFreightImagePaths: [...new Set(removePaths)],
                                  ...(event.target.checked ? {} : { freightConditionImages: [] }),
                                };
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
      <Dialog open={splitItemUploadDialogOpen} onClose={handleCloseSplitItemUpload} maxWidth="md" fullWidth>
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
            <Typography sx={{ fontSize: 14, fontWeight: 600 }}>File Upload</Typography>
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
                      {!isMobileReceiptForm && isReceiptDetailsEditable && (
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
            <Typography sx={{ fontSize: 16, fontWeight: 700 }}>
              Charges/Rating - {viewReceiptSummary?.receiptNumber || activeForm?.receiptNumber || ''}
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setRatesDialogOpen(false)}
                sx={{ height: 28, minWidth: 74, color: '#111', borderColor: '#111', textTransform: 'none', fontSize: 12 }}
              >
                Close
              </Button>
            </Stack>
          </Stack>

          {(() => {
            const rateInformation = getActiveRateInformation();
            const ratesTotal = getRatesTotal();
            const rateCalculatedBy = String(rateInformation.rateCalculatedBy || '').replace(/_/g, ' ');
            const hasBaseRate = rateInformation.baseRate !== undefined && rateInformation.baseRate !== null && rateInformation.baseRate !== '';
            const hasMinRate = rateInformation.minRate !== undefined && rateInformation.minRate !== null && rateInformation.minRate !== '';
            const hasMaxRate = rateInformation.maxRate !== undefined && rateInformation.maxRate !== null && rateInformation.maxRate !== '';
            const hasFlatRate = getActiveHasFlatRate();

            return (
              <>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems={{ xs: 'stretch', md: 'flex-end' }} sx={{ mt: 2 }}>
            <TextField
              variant="standard"
              label="Dim Factor"
              value={getRateDisplayValue(rateInformation.dimFactor)}
              size="small"
              InputProps={{ readOnly: true }}
              sx={{ flex: 1, '& .MuiInputLabel-root': { fontSize: 14 }, '& input': { fontSize: 14 } }}
            />
            <TextField
              variant="standard"
              label="Base Rate"
              value={getRateDisplayValue(rateInformation.baseRate)}
              size="small"
              InputProps={{ readOnly: true }}
              sx={{ flex: 1, '& .MuiInputLabel-root': { fontSize: 14 }, '& input': { fontSize: 14 } }}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={hasFlatRate}
                  disabled
                  size="small"
                  sx={{
                    p: 0.35,
                    color: '#102a63',
                    '&.Mui-checked': { color: '#102a63' },
                    '&.Mui-disabled': { color: hasFlatRate ? '#102a63' : 'rgba(0, 0, 0, 0.26)' },
                  }}
                />
              }
              label={<Typography sx={{ fontSize: 14 }}>Flat Rate</Typography>}
              sx={{ mx: 0, pb: 0.3 }}
            />
            <TextField
              variant="standard"
              label="Flat Rate"
              value={getRateDisplayValue(rateInformation.finalRate)}
              size="small"
              InputProps={{ readOnly: true }}
              sx={{
                flex: 0.75,
                display: { xs: hasFlatRate ? 'block' : 'none', md: 'block' },
                visibility: { md: hasFlatRate ? 'visible' : 'hidden' },
                pointerEvents: 'none',
                '& .MuiInputLabel-root': { fontSize: 14 },
                '& input': { fontSize: 14 },
              }}
            />
            <TextField
              variant="standard"
              label="Notes"
              value={getActiveNotesForFlatRate()}
              size="small"
              InputProps={{ readOnly: true }}
              sx={{
                flex: 1,
                display: { xs: hasFlatRate ? 'block' : 'none', md: 'block' },
                visibility: { md: hasFlatRate ? 'visible' : 'hidden' },
                pointerEvents: 'none',
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
                <TableCell sx={{ fontWeight: 700 }}>{ratesTotal.dimWeightTotal}{ratesTotal.dimWeightTotal ? ' lbs' : ''}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{ratesTotal.actualWeightTotal}{ratesTotal.actualWeightTotal ? ' lbs' : ''}</TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <Typography sx={{ mt: 2, ml: 1.2, fontSize: 14 }}>
            Total Estimated Cost - <Box component="span" sx={{ fontWeight: 700 }}>{ratesTotal.estimatedCost ? `$${ratesTotal.estimatedCost}` : ''}</Box>{rateCalculatedBy ? ` (Calculated based on ${rateCalculatedBy})` : ''}
          </Typography>

          {(hasBaseRate || hasMinRate || hasMaxRate) && (
            <Box sx={{ mt: 1.5, ml: 1.2, bgcolor: '#dff0fa', borderRadius: 1, px: 1.5, py: 1.1, width: { xs: '100%', sm: 395 }, boxSizing: 'border-box' }}>
              {hasBaseRate && (
                <Typography sx={{ fontSize: 13 }}>
                  Calculated Based on <Box component="span" sx={{ fontWeight: 700 }}>${getRateDisplayValue(rateInformation.baseRate)}</Box> per lbs.
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
        open={splitDialogOpen}
        onClose={(event, reason) => {
          if (reason === 'backdropClick' || reason === 'escapeKeyDown') return;
          handleCloseSplitDialog();
        }}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 1,
            width: { xs: 'calc(100vw - 24px)', md: 'calc(100vw - 56px)' },
            maxWidth: 1500,
            height: splitStep === 0 ? 560 : splitStep === 1 ? 720 : 780,
            maxHeight: '92vh',
          },
        }}
      >
        <DialogContent sx={{ p: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ borderBottom: '1px solid #777', pb: 0.8 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
              Split - {viewReceiptSummary?.receiptNumber || activeForm?.receiptNumber || ''}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <IconButton
                size="small"
                onClick={handleCloseSplitDialog}
                sx={{ color: '#111', width: 28, height: 28 }}
              >
                <Iconify icon="mdi:close" width={18} />
              </IconButton>
            </Stack>
          </Stack>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ xs: 'stretch', sm: 'flex-start' }}
            justifyContent="space-between"
            spacing={2}
            sx={{ mt: 3.2 }}
          >
            <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', minWidth: 0 }}>
              {renderSplitStepper(splitStep)}
            </Box>
            {splitStep !== 0 && (
              <Stack
                direction="row"
                spacing={1}
                justifyContent="flex-end"
                sx={{ minWidth: { xs: '100%', sm: 125 }, pt: { xs: 0, sm: 0.1 } }}
              >
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleSplitBackClick}
                  disabled={splitSubmitLoading}
                  sx={{ height: 24, minWidth: 58, color: '#111', borderColor: '#111', textTransform: 'none', fontSize: 11 }}
                >
                  Back
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  disabled={
                    splitTempReceiptLoading ||
                    splitSubmitLoading ||
                    (splitDimensionMode === 'existing' && splitFormCount === 0) ||
                    (splitStep === 1 && splitDimensionMode === 'recalculate' && splitFormCount < 2)
                  }
                  onClick={() => {
                    if (splitStep === 1) {
                      if (splitDimensionMode === 'recalculate' && !validateSplitRecalculateStep()) return;
                      if (splitDimensionMode === 'existing' && !validateSplitExistingStep()) return;
                      setActiveSplitFormTab(0);
                      setSplitStep(2);
                      return;
                    }

                    handleSplitSubmit();
                  }}
                  sx={{ ...actionBtnSx, height: 24, minWidth: 58, fontSize: 11 }}
                >
                  {splitSubmitLoading ? 'Submitting...' : splitStep === 2 ? 'Submit' : 'Next'}
                </Button>
              </Stack>
            )}
          </Stack>
          {splitStep === 0 && renderSplitStartStep()}
          {splitStep === 1 && (splitDimensionMode === 'existing' ? renderSplitExistingFreightStep() : renderSplitFreightStep())}
          {splitStep === 2 && renderSplitFormInfoStep()}
          {renderSplitMoveMenu()}
        </DialogContent>
        <Dialog open={splitBackConfirmOpen} onClose={handleCancelSplitBackConfirm} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>Confirmation</DialogTitle>
          <DialogContent>
            <Typography sx={{ fontSize: 13 }}>Are you sure? Data will be lost.</Typography>
          </DialogContent>
          <DialogActions sx={{ px: 2, pb: 2 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={handleCancelSplitBackConfirm}
              sx={{ height: 28, minWidth: 64, color: '#111', borderColor: '#777', textTransform: 'none', fontSize: 12 }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              size="small"
              onClick={handleConfirmSplitBack}
              sx={{ ...actionBtnSx, height: 28, minWidth: 64, fontSize: 12 }}
            >
              OK
            </Button>
          </DialogActions>
        </Dialog>
      </Dialog>
      <Dialog open={cancelEditConfirmOpen} onClose={handleCloseCancelEditConfirm} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>Do you want to cancel?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13 }}>Any unsaved changes will lost</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={handleCloseCancelEditConfirm}
            sx={{ height: 28, minWidth: 64, color: '#111', borderColor: '#777', textTransform: 'none', fontSize: 12 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={handleConfirmCancelEditWarehouseReceipt}
            sx={{ ...actionBtnSx, height: 28, minWidth: 64, fontSize: 12 }}
          >
            OK
          </Button>
        </DialogActions>
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
        onClose={handleCloseSplitMailDialog}
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
                onClick={handleCloseSplitMailDialog}
                sx={{ height: 24, minWidth: 70, color: '#111', borderColor: '#111', textTransform: 'none', fontSize: 11 }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                size="small"
                onClick={handleSendSplitMail}
                sx={{ ...actionBtnSx, height: 24, minWidth: 70, fontSize: 11 }}
              >
                Confirm
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
              {splitMailRows.length ? (
                splitMailRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Checkbox
                        size="small"
                        checked={isSplitMailSelected(row.emailId)}
                        onChange={() => handleToggleSplitMail(row.emailId)}
                        sx={{ p: 0.2, color: '#102a63', '&.Mui-checked': { color: '#102a63' } }}
                      />
                    </TableCell>
                    <TableCell>{row.sno}</TableCell>
                    <TableCell>{row.type}</TableCell>
                    <TableCell>{row.emailId}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 3, color: '#555' }}>
                    No emails found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <Box component="fieldset" sx={{ mt: 3, border: '1px solid #777', borderRadius: 1, px: 1.2, py: 1.2, minHeight: 64 }}>
            <Box component="legend" sx={{ px: 0.7, fontSize: 12, fontWeight: 700 }}>Email Addresses</Box>
            <TagInputBox
              values={splitTempEmails}
              inputValue={splitTempEmailInput}
              onInputChange={setSplitTempEmailInput}
              onAdd={handleAddSplitTempEmail}
              onRemove={handleRemoveSplitTempEmail}
              framed={false}
            />
          </Box>
        </DialogContent>
      </Dialog>
      <Popover
        open={Boolean(splitPackageDropdownAnchor)}
        anchorEl={splitPackageDropdownAnchor}
        onClose={handleCloseSplitPackageDropdown}
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
                onClick={() => handleSplitPackageOptionSelect(option)}
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
      {printReceipt && <WarehouseReceiptPrintTemplate data={printReceipt} />}
      <Divider />
    </Box>
  );
}
