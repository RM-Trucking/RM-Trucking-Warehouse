import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BrowserMultiFormatReader } from "@zxing/browser";
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
  Autocomplete,
  Alert,
  InputAdornment,
  Snackbar,
  useMediaQuery,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { DataGrid } from "@mui/x-data-grid";
import ShipmentFormLayout from "../../sections/shared/ShipmentFormLayout";
import StyledTextField from "../../sections/shared/StyledTextField";
import Iconify from "../../components/iconify";
import { useDispatch, useSelector } from "../../redux/store";
import {
  searchWarehouseReceipt,
  searchWarehouseReceiptProDetail,
  clearReceiptSearch,
  createTempWarehouseReceipt,
  fetchCargoApiDropdown,
  fetchCargoApiDimensions,
  fetchPrintersDropdown,
  printWarehouseReceiptLabel,
  submitWarehouseReceiptBatch,
  searchParcelCarriers,
  setWarehouseCheckInDraft,
  clearWarehouseCheckInDraft,
} from "../../redux/slices/warehouse";
import { searchCustomers } from "../../redux/slices/enroute";
import axios from "../../utils/axios";
import { PATH_DASHBOARD } from "../../routes/paths";
import WarehouseCheckInScanGunPage from "./WarehouseCheckInScanGunPage";

// ─── Styling helpers ────────────────────────────────────────────────
const actionBtnSx = {
  bgcolor: "#A22",
  color: "#fff",
  textTransform: "none",
  minWidth: 80,
  height: 28,
  px: 1.5,
  fontSize: 12,
  "&:hover": { bgcolor: "#8b1c1c" },
};

const SEARCH_BY_OPTIONS = ["PRO", "ID"];
const FREIGHT_TYPE_OPTIONS = [
  "Skid",
  "Crate",
  "Drum",
  "Pail",
  "Bundle",
  "Bag",
  "Basket",
  "Box",
  "Carton",
  "Jerrican",
  "Package",
  "Pallet",
  "Cylinder",
  "Tote",
  "Roll",
  "Reel",
  "Tube",
];
const REQUIRED_ITEM_FIELDS = [
  { field: 'pieces', label: 'Pieces' },
  { field: 'type', label: 'Type' },
  { field: 'length', label: 'Length (in)' },
  { field: 'width', label: 'Width (in)' },
  { field: 'height', label: 'Height (in)' },
  { field: 'weight', label: 'Weight' },
];
const DECIMAL_ITEM_FIELDS = new Set(["length", "width", "height", "weight"]);
const INCH_TO_METER = 0.0254;

const formatDecimal10_2Input = (value) => {
  const inputValue = String(value ?? "").replace(/[^\d.]/g, "");
  const hasDecimal = inputValue.includes(".");
  const [integerPart = "", ...decimalParts] = inputValue.split(".");
  const integerValue = integerPart.slice(0, 8);
  const decimalValue = decimalParts.join("").slice(0, 2);

  return hasDecimal ? `${integerValue || "0"}.${decimalValue}` : integerValue;
};

const createParcelForm = () => ({
  proNumber: "",
  carrier: "",
  customer: "",
  shipper: "",
  driverName: "",
  pieces: "",
  weight: "",
});

const createParcelErrors = () => ({
  proNumber: "",
  carrier: "",
  customer: "",
  shipper: "",
  driverName: "",
  pieces: "",
  weight: "",
});

// ─── Helpers to create blank form / item ────────────────────────────
const createItem = (id) => ({
  id,
  pieces: "",
  type: "",
  length: "",
  width: "",
  height: "",
  weight: "",
  images: [],
});
const createForm = (id, receiptNumber = null, defaults = {}) => ({
  id,
  collapsed: false,
  items: [createItem(1)],
  receiptNumber,
  destination: defaults.destination || "",
  customerRefNoPackageId: defaults.customerRefNoPackageId || "",
  freightOptions: [],
  badFreightImages: [],
});

const getNextFormId = (forms = []) =>
  forms.reduce((maxId, form) => Math.max(maxId, Number(form.id) || 0), 0) + 1;

const getNextItemId = (items = []) =>
  items.reduce((maxId, item) => Math.max(maxId, Number(item.id) || 0), 0) + 1;

const getCargoApiLoadingKey = (key, formId, itemId) =>
  `${key}-${formId}-${itemId}`;

const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isNaN(number) ? null : number;
};

const toDecimal10_2NumberOrNull = (value) =>
  toNumberOrNull(formatDecimal10_2Input(value));

const toValueOrNull = (value) => {
  if (value === null || value === undefined) return null;
  const stringValue = String(value).trim();
  return stringValue ? stringValue : null;
};

const toYesNo = (value) => (value ? 'Y' : 'N');

const calculateItemCbm = (item) =>
  Number(formatDecimal10_2Input(item.length)) *
  INCH_TO_METER *
  Number(formatDecimal10_2Input(item.width)) *
  INCH_TO_METER *
  Number(formatDecimal10_2Input(item.height)) *
  INCH_TO_METER;

const calculateRoundedItemCbm = (item) =>
  Number(calculateItemCbm(item).toFixed(2));

const formatMeasurement = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number === 0) return 0;
  return Number.isInteger(number) ? number : Number(number.toFixed(3));
};

const normalizeEmailList = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((email) =>
        typeof email === "string"
          ? email
          : email?.entryEmail || email?.email || "",
      )
      .map((email) => String(email || "").trim())
      .filter(Boolean);
  }
  if (typeof value === "string")
    return value
      .split(",")
      .map((email) => email.trim())
      .filter(Boolean);
  return [];
};

const mergeUniqueEmailLists = (...emailLists) => {
  const seenEmails = new Set();

  return emailLists
    .flatMap((emailList) => normalizeEmailList(emailList))
    .filter((email) => {
      const emailKey = email.toLowerCase();
      if (seenEmails.has(emailKey)) return false;
      seenEmails.add(emailKey);
      return true;
    });
};

const hasStationDefaultEmails = (row = {}) =>
  String(row.stationDefaultEmails?.hasDefaultEmails || "")
    .trim()
    .toUpperCase() === "Y";

const getStationDefaultEmailList = (row = {}) =>
  hasStationDefaultEmails(row)
    ? normalizeEmailList(row.stationDefaultEmails?.emails || [])
    : [];

const getSubmitToEmails = (row = {}) =>
  mergeUniqueEmailLists(
    getRowValue(row, "toEmails", []),
    getStationDefaultEmailList(row),
  );

const needsEmailSelection = (row = {}) =>
  !hasStationDefaultEmails(row) &&
  normalizeEmailList(getRowValue(row, "toEmails", [])).length === 0;

const normalizeEmailRows = (emails) => {
  if (!Array.isArray(emails)) return [];

  return emails
    .map((email, index) => {
      if (typeof email === "string") {
        return {
          entryId: `email_${index}_${email}`,
          entryType: "Email",
          entryEmail: email,
        };
      }

      if (email && typeof email === "object") {
        const entryEmail = email.entryEmail || email.email || "";

        return {
          entryId: email.entryId || `email_${index}_${entryEmail}`,
          entryType: email.entryType || email.type || "Email",
          entryEmail,
        };
      }

      return null;
    })
    .filter((email) => email?.entryEmail);
};

const buildSelectedEmailMap = (emails = [], toEmails = []) => {
  const selectedEmailSet = new Set(
    normalizeEmailList(toEmails)
      .map((email) =>
        typeof email === "string"
          ? email
          : email?.entryEmail || email?.email || "",
      )
      .filter(Boolean)
      .map((email) => String(email).trim().toLowerCase()),
  );

  return emails.reduce((selectedMap, email) => {
    const emailAddress = String(email.entryEmail || "")
      .trim()
      .toLowerCase();

    if (emailAddress && selectedEmailSet.has(emailAddress)) {
      selectedMap[email.entryId] = true;
    }

    return selectedMap;
  }, {});
};

const getReceiptMailRows = (row = {}) => {
  const customerEmails = normalizeEmailRows(row.customerEmails || []);
  if (customerEmails.length) return customerEmails;

  return normalizeEmailRows(row.toEmails || []);
};

// const fileToBase64 = (file) =>
//   new Promise((resolve, reject) => {
//     if (!file) {
//       resolve('');
//       return;
//     }

//     if (typeof file === 'string') {
//       resolve(file.includes(',') ? file.split(',').pop() : file);
//       return;
//     }

//     if (!(file instanceof Blob)) {
//       resolve('');
//       return;
//     }

//     const reader = new FileReader();
//     reader.onload = () => {
//       const result = String(reader.result || '');
//       resolve(result.includes(',') ? result.split(',').pop() : result);
//     };
//     reader.onerror = reject;
//     reader.readAsDataURL(file);
//   });

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    if (!file) {
      resolve("");
      return;
    }

    if (typeof file === "string") {
      resolve(file.includes(",") ? file.split(",").pop() : file);
      return;
    }

    // Use Duck Typing instead of strict instanceof Blob
    if (!isFileLike(file)) {
      resolve("");
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || "");
        resolve(result.includes(",") ? result.split(",").pop() : result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    } catch (error) {
      reject(error);
    }
  });

const isFileLike = (obj) => {
  if (!obj) return false;
  if (obj instanceof File || obj instanceof Blob) return true;
  // Duck typing for cross-context WebViews (Zebra Scanners)
  return (
    typeof obj === "object" &&
    typeof obj.size === "number" &&
    typeof obj.type === "string"
  );
};

const getCargoApiImageValue = (image) => {
  if (!image) return "";
  if (typeof image === "string") return image.trim();

  // Safely skip camera Files/Blobs using Duck Typing
  if (isFileLike(image)) return "";

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
    ""
  );
};

const getSubmittedImageValue = async (image) => {
  const cargoImageValue = getCargoApiImageValue(image);

  if (cargoImageValue) {
    const cleanValue = String(cargoImageValue).trim();
    if (!cleanValue) return "";
    if (/^(https?:\/\/|blob:)/i.test(cleanValue)) return cleanValue;
    if (cleanValue.startsWith("data:image/")) {
      const base64Value = cleanValue.includes(",")
        ? cleanValue.split(",").pop()
        : cleanValue;
      return base64Value ? `base64,${base64Value}` : "";
    }
    if (cleanValue.startsWith("base64,")) return cleanValue;
    return looksLikeBase64Image(cleanValue)
      ? `base64,${cleanValue}`
      : cleanValue;
  }

  const base64Image = await fileToBase64(image);
  if (!base64Image) return "";

  return base64Image.startsWith("base64,")
    ? base64Image
    : `base64,${base64Image}`;
};

const getReceiptPrintEntriesFromResponse = (response) => {
  const receiptNumbers = response?.data?.receiptNumbers || [];
  if (receiptNumbers.length) {
    return [...new Set(receiptNumbers.filter(Boolean))].map(
      (receiptNumber) => ({
        label: receiptNumber,
        receiptNumber,
      }),
    );
  }

  const receipts = [
    ...(response?.data?.updated || []),
    ...(response?.data?.created || []),
  ];

  return receipts
    .map((receipt) => {
      const receiptNumber = receipt.receiptNumber || receipt.receiptNo || "";
      const verificationId =
        receipt.verificationId || receipt.verificationID || receipt.id || "";
      const label = verificationId || receiptNumber;

      return label
        ? {
            label,
            receiptNumber: receiptNumber || label,
          }
        : null;
    })
    .filter(Boolean);
};

const getFileExtension = (file) => {
  if (file?.name?.includes(".")) return file.name.split(".").pop();
  if (file?.type?.includes("/")) return file.type.split("/").pop();
  return "jpg";
};

const toRenamedImageFile = async (image, fieldName) => {
  if (image instanceof File) {
    return new File([image], `${fieldName}.${getFileExtension(image)}`, {
      type: image.type || "image/jpeg",
    });
  }

  if (typeof image === "string" && image.startsWith("data:")) {
    const response = await fetch(image);
    const blob = await response.blob();
    return new File([blob], `${fieldName}.${getFileExtension(blob)}`, {
      type: blob.type || "image/jpeg",
    });
  }

  return image;
};

const getDropdownOptionLabel = (option) => {
  if (option === null || option === undefined) return "";
  if (typeof option !== "object") return String(option);

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
    ""
  );
};

const getCarrierOptionLabel = (option) => {
  if (!option) return "";
  if (typeof option === "string") return option;
  return option.carrierName || option.name || option.label || "";
};

const getCustomerOptionLabel = (option) => {
  if (!option) return "";
  if (typeof option === "string") return option;

  const customerName = option.customerName || option.name || option.label || "";
  const stationName = option.stationName || "";
  return stationName ? `${customerName} | ${stationName}` : customerName;
};

const createReceiptFreightInfo = () => ({
  conditions: {
    "Banded Skid": false,
    "Shrink Wrapped Skid": false,
    "SHT / IPPC Skid": false,
    "Plastic Skid": false,
    Document: false,
  },
  badFreightCondition: false,
  freightConditionImages: [],
  hazMat: false,
  originalDgd: false,
  unNumbers: [],
  hazmatClasses: [],
  unNumberInput: "",
  hazmatClassInput: "",
  properShippingName: "",
  freightConditionDescription: "",
  hazardousDescription: "",
  notes: "",
});

const RECEIPT_FREIGHT_OPTION_FIELD_MAP = {
  "Banded Skid": "Banded Skid",
  "Shrink Wrapped Skid": "Shrink Wrapped Skid",
  "SHT / IPPC Skid": "SHT / IPPC Skid",
  "SHPT / PPC Skid": "SHT / IPPC Skid",
  "Plastic Skid": "Plastic Skid",
  Document: "Document",
};

const FileItem = ({ filename, onRemove, onView, hideRemove = false }) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      bgcolor: "#f5f5f5",
      border: "1px solid #e0e0e0",
      borderRadius: 1,
      p: "4px 8px",
      mb: 1,
      width: "100%",
    }}
  >
    <Stack direction="row" alignItems="center" spacing={1}>
      <IconButton
        size="small"
        onClick={onView}
        sx={{ bgcolor: "#dbdbdb", borderRadius: 0.5, p: "4px", color: "#000" }}
      >
        <Iconify icon="mdi:eye" width={16} color="#000" />
      </IconButton>
      <Typography sx={{ fontSize: 12 }}>{filename}</Typography>
    </Stack>
    {!hideRemove && (
      <IconButton
        size="small"
        onClick={onRemove}
        sx={{ p: "2px", color: "#000" }}
      >
        <Iconify icon="carbon:close-filled" width={16} />
      </IconButton>
    )}
  </Box>
);

const looksLikeBase64Image = (value) => {
  const compactValue = String(value || "").trim();
  return (
    compactValue.length > 80 && /^[A-Za-z0-9+/]+={0,2}$/.test(compactValue)
  );
};

const getBase64ImageMimeType = (value) => {
  const compactValue = String(value || "").trim();

  if (compactValue.startsWith("/9j/")) return "image/jpeg";
  if (compactValue.startsWith("iVBORw0KGgo")) return "image/png";
  if (compactValue.startsWith("R0lGOD")) return "image/gif";
  if (compactValue.startsWith("UklGR")) return "image/webp";
  return "image/jpeg";
};

const getImageUrl = (file) => {
  if (!file) return "";
  if (typeof file === "string") {
    const image = file.trim();
    if (/^(data:image\/|https?:\/\/|blob:)/i.test(image)) return image;
    if (looksLikeBase64Image(image))
      return `data:${getBase64ImageMimeType(image)};base64,${image}`;
    return image;
  }
  if (file.url) return file.url;
  if (file.preview) return file.preview;
  if (file.base64) return getImageUrl(file.base64);
  if (file.image) return getImageUrl(file.image);
  if (file instanceof File) return URL.createObjectURL(file);
  return "";
};

const getImageName = (file, index) => {
  if (!file) return `Image ${index + 1}`;
  if (typeof file === "string") {
    if (looksLikeBase64Image(file) || file.startsWith("data:image/"))
      return `Cargo API Image ${index + 1}`;
    return file.split("/").pop() || `Image ${index + 1}`;
  }
  return file.name || file.filename || `Image ${index + 1}`;
};

const openImagePreviewTab = (imageUrl, title = "Image Preview") => {
  const previewWindow = window.open("", "_blank");
  if (!previewWindow) return false;

  previewWindow.document.title = title;
  previewWindow.document.body.style.margin = "0";
  previewWindow.document.body.style.minHeight = "100vh";
  previewWindow.document.body.style.background = "#111";
  previewWindow.document.body.style.display = "flex";
  previewWindow.document.body.style.alignItems = "center";
  previewWindow.document.body.style.justifyContent = "center";
  previewWindow.document.body.style.padding = "24px";
  previewWindow.document.body.style.boxSizing = "border-box";

  const image = previewWindow.document.createElement("img");
  image.src = imageUrl;
  image.alt = title;
  image.style.maxWidth = "100%";
  image.style.maxHeight = "calc(100vh - 48px)";
  image.style.objectFit = "contain";
  image.style.background = "#fff";

  previewWindow.document.body.appendChild(image);
  previewWindow.document.close();
  return true;
};

const getRowValue = (row, fields, fallback = "") => {
  const fieldList = Array.isArray(fields) ? fields : [fields];
  const field = fieldList.find(
    (name) =>
      row?.[name] !== undefined && row?.[name] !== null && row?.[name] !== "",
  );
  return field ? row[field] : fallback;
};

const buildReceiptCustomerSelection = (row = {}) => {
  const customerDisplay = getRowValue(row, ["customer", "customerName"], "");
  if (!customerDisplay) return null;

  const [customerName, stationName] = String(customerDisplay)
    .split("|")
    .map((value) => value.trim());

  return {
    customerId: row.customerId,
    customerName: row.customerName || customerName,
    stationId: row.stationId,
    stationName: row.stationName || stationName || "",
  };
};

const applyReceiptFreightOption = (freightInfo, option) => {
  if (option === "Bad Freight Condition") {
    freightInfo.badFreightCondition = true;
    return;
  }

  if (option === "Haz Mat") {
    freightInfo.hazMat = true;
    return;
  }

  const conditionKey = RECEIPT_FREIGHT_OPTION_FIELD_MAP[option];
  if (conditionKey) {
    freightInfo.conditions[conditionKey] = true;
  }
};

const buildReceiptFreightInfo = (form = {}) => {
  const freightInfo = createReceiptFreightInfo();

  (form.freightOptions || []).forEach((option) =>
    applyReceiptFreightOption(freightInfo, option),
  );
  if (form.badFreightImages?.length) {
    freightInfo.badFreightCondition = true;
    freightInfo.freightConditionImages.push(...form.badFreightImages);
  }

  (form.items || []).forEach((item) => {
    (item.freightOptions || []).forEach((option) =>
      applyReceiptFreightOption(freightInfo, option),
    );

    if (item.badFreightImages?.length) {
      freightInfo.badFreightCondition = true;
      freightInfo.freightConditionImages.push(...item.badFreightImages);
    }
  });

  return freightInfo;
};

const buildReceiptFormsFromReceipts = (receipts = []) =>
  receipts.flatMap((receipt, receiptIndex) =>
    (receipt.forms || []).map((form, formIndex) => {
      const customerRefNoPackageId = String(
        form.customerRefNoPackageId || "",
      ).trim();
      const destination = String(form.destination || "").trim();
      const row = {
        ...receipt.row,
        ...(destination ? { destination } : {}),
        ...(customerRefNoPackageId
          ? { packageId: customerRefNoPackageId }
          : {}),
      };

      return {
        id: `${receipt.key || receiptIndex}-${form.id}`,
        label: `Form ${formIndex + 1}`,
        receiptNumber:
          form.receiptNumber || row.receiptNumber || receipt.proNumber || "",
        receivedBy: receipt.receivedBy,
        location: receipt.location,
        customerSelection: buildReceiptCustomerSelection(row),
        freightInfo: buildReceiptFreightInfo(form),
        row,
        items: form.items,
      };
    }),
  );

const normalizeCommonReceiptField = (value) => String(value || "").trim();

const haveCommonReceiptFieldsChanged = (
  savedReceipts = [],
  currentReceipts = [],
) => {
  const savedReceiptMap = new Map(
    savedReceipts.map((receipt) => [receipt.key, receipt]),
  );

  return currentReceipts.some((receipt) => {
    const savedReceipt = savedReceiptMap.get(receipt.key);
    if (!savedReceipt) return false;

    return (
      normalizeCommonReceiptField(savedReceipt.receivedBy) !==
        normalizeCommonReceiptField(receipt.receivedBy) ||
      normalizeCommonReceiptField(savedReceipt.location) !==
        normalizeCommonReceiptField(receipt.location)
    );
  });
};

const mergeReceiptItemsWithCurrentCheckInValues = (
  savedItems = [],
  currentItems = [],
) => {
  const currentItemMap = new Map(currentItems.map((item) => [item.id, item]));
  const savedItemIds = new Set(savedItems.map((item) => item.id));

  const mergedSavedItems = savedItems.map((savedItem) => {
    const currentItem = currentItemMap.get(savedItem.id);
    if (!currentItem) return savedItem;

    return {
      ...savedItem,
      ...currentItem,
      images: currentItem.images?.length ? currentItem.images : savedItem.images || [],
    };
  });

  return [
    ...mergedSavedItems,
    ...currentItems.filter((item) => !savedItemIds.has(item.id)),
  ];
};

const mergeReceiptFormsWithSaved = (
  savedForms = [],
  currentForms = [],
  applyCommonFieldsToAll = false,
) => {
  const savedFormMap = new Map(savedForms.map((form) => [form.id, form]));

  return currentForms.map((currentForm) => {
    const savedForm = savedFormMap.get(currentForm.id);

    if (!savedForm) {
      return currentForm;
    }

    const mergedForm = {
      ...currentForm,
      ...savedForm,
      row: {
        ...(currentForm.row || {}),
        ...(savedForm.row || {}),
      },
      items: mergeReceiptItemsWithCurrentCheckInValues(
        savedForm.items || [],
        currentForm.items || [],
      ),
    };

    if (!applyCommonFieldsToAll) {
      return mergedForm;
    }

    return {
      ...mergedForm,
      receivedBy: currentForm.receivedBy,
      location: currentForm.location,
    };
  });
};

const buildTempReceiptPayload = (receipt) => {
  const { row, proNumber, receivedBy, location } = receipt;

  return {
    verificationId: getRowValue(row, "verificationId", 0),
    shipper: getRowValue(row, ["shipper", "shipperName", "shipperCompany"], ""),
    customerId: getRowValue(row, "customerId", 0),
    stationId: getRowValue(row, "stationId", 0),
    carrierId: getRowValue(row, "carrierId", 0),
    status: "INITIATE",
    receivedBy: receivedBy || "",
    location: location || "",
    destination: getRowValue(row, ["destination", "finalDestination"], 0),
    proNumber: getRowValue(row, "proNumber", proNumber),
    packageId: getRowValue(row, ["packageId", "packageNumber"], 0),
  };
};

// ─── Dummy data keyed by PRO number ─────────────────────────────────
const DUMMY_DATA = {
  PRO7898710001: [
    {
      id: 1,
      sno: "01",
      receiptNumber: "100006878",
      carrier: "CA12",
      customer: "NEW DIREX | Northpoint | NY",
    },
    {
      id: 2,
      sno: "01",
      receiptNumber: "100006880",
      carrier: "-",
      customer: "NEW DIREX | Northpoint | NY",
    },
    {
      id: 3,
      sno: "01",
      receiptNumber: "100006882",
      carrier: "CA12",
      customer: "-",
    },
    {
      id: 4,
      sno: "01",
      receiptNumber: "100006880",
      carrier: "CA12",
      customer: "NEW DIREX | Northpoint | NY",
    },
  ],
  PRO1234500001: [
    {
      id: 1,
      sno: "01",
      receiptNumber: "100007001",
      carrier: "CA08",
      customer: "XYZ LOGISTICS | Chicago | IL",
    },
    {
      id: 2,
      sno: "02",
      receiptNumber: "100007002",
      carrier: "CA08",
      customer: "XYZ LOGISTICS | Chicago | IL",
    },
  ],
};

export default function WarehouseCheckInPage({
  title = "Warehouse Check-In / Regular",
  showParcelOption = true,
  showTrailerFreightHeader = false,
  draftKey = "regular",
}) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const cameraVideoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const barcodeVideoRef = useRef(null);
  const barcodeStreamRef = useRef(null);
  const barcodeReaderRef = useRef(null);
  const barcodeControlsRef = useRef(null);
  const draftRestoredRef = useRef(false);
  const searchLoadingRef = useRef(false);
  const {
    warehouseReceiptSearch,
    cargoApiDropdown,
    printersDropdown,
    parcelCarrierDropdown,
    warehouseCheckInDrafts,
  } = useSelector((state) => state.warehousedata);
  const { customerOptions, customerLoading } = useSelector(
    (state) => state.enroutedata,
  );
  const warehouseCheckInDraft = warehouseCheckInDrafts?.[draftKey];
  const isScanGunScreen = useMediaQuery("(max-width:599.95px)", {
    noSsr: true,
  });
  const showScanGunPage = isScanGunScreen;

  const [searchType, setSearchType] = useState("pro"); // 'pro' | 'rmDriver' | 'fedexUps'
  const [searchBy, setSearchBy] = useState("PRO");
  const [searchValue, setSearchValue] = useState("");
  const handleSearchValueChange = useCallback((value) => {
    setSearchValue(String(value || "").slice(0, 100));
  }, []);
  const [savedResults, setSavedResults] = useState(null); // snapshot before Proceed
  const [collapsed, setCollapsed] = useState({});
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectRow, setRejectRow] = useState(null);
  const [rejectLoading, setRejectLoading] = useState(false);
  const [resetReceiptDialog, setResetReceiptDialog] = useState(null);
  const [noDataSearchValue, setNoDataSearchValue] = useState("");
  const [rejectedRowIds, setRejectedRowIds] = useState([]);
  const [noDataDialogOpen, setNoDataDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [isSearchDisabled, setIsSearchDisabled] = useState(false);
  const [tempReceiptLoading, setTempReceiptLoading] = useState({});
  const [receiptErrors, setReceiptErrors] = useState({});
  const [uploadDialog, setUploadDialog] = useState({
    open: false,
    mode: "upload",
    key: null,
    formId: null,
    itemId: null,
    imageField: "images",
  });
  const [imagePreviewDialog, setImagePreviewDialog] = useState({
    open: false,
    images: [],
    itemLabel: "",
    key: null,
    formId: null,
    itemId: null,
  });
  const [fullImageDialog, setFullImageDialog] = useState({
    open: false,
    image: null,
    title: "",
  });
  const [stagedFiles, setStagedFiles] = useState([]);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [cameraDialogOpen, setCameraDialogOpen] = useState(false);
  const [barcodeScannerOpen, setBarcodeScannerOpen] = useState(false);
  const [barcodeScannerStatus, setBarcodeScannerStatus] = useState("");
  const [barcodeScannerTarget, setBarcodeScannerTarget] =
    useState("parcelPro");
  const [barcodeScannerContext, setBarcodeScannerContext] = useState({
    receiptKey: "",
    formId: null,
  });
  const [packageDropdownAnchor, setPackageDropdownAnchor] = useState(null);
  const [packageDropdownContext, setPackageDropdownContext] = useState({
    key: null,
    formId: null,
    itemId: null,
  });
  const [cargoApiLoadingItems, setCargoApiLoadingItems] = useState({});
  const [printerDialogOpen, setPrinterDialogOpen] = useState(false);
  const [selectedPrinterId, setSelectedPrinterId] = useState("");
  const [printerContext, setPrinterContext] = useState(null);
  const [printLoading, setPrintLoading] = useState(false);
  const [mailListDialog, setMailListDialog] = useState({
    open: false,
    receiptKey: "",
    emails: [],
    selectedEmails: {},
  });
  const [emailSelectionAlertOpen, setEmailSelectionAlertOpen] =
    useState(false);
  const [mailAlertReceiptKey, setMailAlertReceiptKey] = useState("");
  const [regularMobileSubmitConfirmOpen, setRegularMobileSubmitConfirmOpen] =
    useState(false);
  const [commonFieldsConfirm, setCommonFieldsConfirm] = useState({
    open: false,
    nextErrors: {},
    currentForms: [],
    savedForms: [],
  });
  const [mobileRegularSuccessDialog, setMobileRegularSuccessDialog] = useState({
    open: false,
    message: "",
    entries: [],
  });
  const [parcelForm, setParcelForm] = useState(createParcelForm());
  const [parcelErrors, setParcelErrors] = useState(createParcelErrors());
  const [parcelCarrierSearchValue, setParcelCarrierSearchValue] = useState("");
  const [parcelCustomerSearchValue, setParcelCustomerSearchValue] =
    useState("");
  const isSelectingParcelCarrierRef = useRef(false);
  const isSelectingParcelCustomerRef = useRef(false);

  // ── Proceeded receipts state ───────────────────────────────────────
  const [proceededReceipts, setProceededReceipts] = useState([]);

  const resetCheckInState = () => {
    setSearchType("pro");
    setSearchBy("PRO");
    setSearchValue("");
    setSavedResults(null);
    setCollapsed({});
    setRejectOpen(false);
    setRejectReason("");
    setRejectRow(null);
    setRejectLoading(false);
    setResetReceiptDialog(null);
    setNoDataSearchValue("");
    setRejectedRowIds([]);
    setNoDataDialogOpen(false);
    setSnackbar({ open: false, message: "", severity: "success" });
    setIsSearchDisabled(false);
    setTempReceiptLoading({});
    setReceiptErrors({});
    setUploadDialog({
      open: false,
      mode: "upload",
      key: null,
      formId: null,
      itemId: null,
    });
    setImagePreviewDialog({
      open: false,
      images: [],
      itemLabel: "",
      key: null,
      formId: null,
      itemId: null,
    });
    setStagedFiles([]);
    setIsDraggingFiles(false);
    setCameraDialogOpen(false);
    setBarcodeScannerOpen(false);
    setBarcodeScannerStatus("");
    setBarcodeScannerTarget("parcelPro");
    setBarcodeScannerContext({ receiptKey: "", formId: null });
    setPackageDropdownAnchor(null);
    setPackageDropdownContext({ key: null, formId: null, itemId: null });
    setCargoApiLoadingItems({});
    setPrinterDialogOpen(false);
    setSelectedPrinterId("");
    setPrinterContext(null);
    setPrintLoading(false);
    setRegularMobileSubmitConfirmOpen(false);
    setEmailSelectionAlertOpen(false);
    setMailAlertReceiptKey("");
    setCommonFieldsConfirm({
      open: false,
      nextErrors: {},
      currentForms: [],
      savedForms: [],
    });
    setMobileRegularSuccessDialog({ open: false, message: "", entries: [] });
    setParcelForm(createParcelForm());
    setParcelErrors(createParcelErrors());
    setParcelCarrierSearchValue("");
    setParcelCustomerSearchValue("");
    setProceededReceipts([]);
  };

  useEffect(() => {
    dispatch(fetchCargoApiDropdown());
  }, [dispatch]);

  useEffect(
    () => () => {
      cameraStreamRef.current?.getTracks?.().forEach((track) => track.stop());
      cameraStreamRef.current = null;
      barcodeControlsRef.current?.stop?.();
      barcodeControlsRef.current = null;
      barcodeStreamRef.current?.getTracks?.().forEach((track) => track.stop());
      barcodeStreamRef.current = null;
      barcodeReaderRef.current = null;
    },
    [],
  );

  // useEffect(() => {
  //   if (!cameraDialogOpen || !cameraStreamRef.current || !cameraVideoRef.current) return;

  //   const video = cameraVideoRef.current;
  //   video.srcObject = cameraStreamRef.current;
  //   video.muted = true;
  //   video.playsInline = true;
  //   const playVideo = () => video.play?.().catch(() => {});
  //   playVideo();
  //   const retryTimer = window.setTimeout(playVideo, 300);

  //   return () => window.clearTimeout(retryTimer);
  // }, [cameraDialogOpen]);

  useEffect(() => {
    if (isSelectingParcelCarrierRef.current) {
      isSelectingParcelCarrierRef.current = false;
      return undefined;
    }

    const timer = setTimeout(() => {
      dispatch(searchParcelCarriers(parcelCarrierSearchValue));
    }, 500);

    return () => clearTimeout(timer);
  }, [dispatch, parcelCarrierSearchValue]);

  useEffect(() => {
    if (isSelectingParcelCustomerRef.current) {
      isSelectingParcelCustomerRef.current = false;
      return undefined;
    }

    const timer = setTimeout(() => {
      dispatch(searchCustomers(parcelCustomerSearchValue));
    }, 500);

    return () => clearTimeout(timer);
  }, [dispatch, parcelCustomerSearchValue]);

  useEffect(() => {
    draftRestoredRef.current = false;
    resetCheckInState();
    dispatch(clearReceiptSearch());
  }, [draftKey, dispatch]);

  useEffect(() => {
    if (!warehouseCheckInDraft) {
      draftRestoredRef.current = false;
      resetCheckInState();
      return;
    }

    if (draftRestoredRef.current) return;

    draftRestoredRef.current = true;
    setSearchType(warehouseCheckInDraft.searchType || "pro");
    setSearchBy(warehouseCheckInDraft.searchBy || "PRO");
    handleSearchValueChange(warehouseCheckInDraft.searchValue || "");
    setSavedResults(warehouseCheckInDraft.savedResults || null);
    setCollapsed(warehouseCheckInDraft.collapsed || {});
    setRejectedRowIds(warehouseCheckInDraft.rejectedRowIds || []);
    setIsSearchDisabled(Boolean(warehouseCheckInDraft.isSearchDisabled));
    setReceiptErrors(warehouseCheckInDraft.receiptErrors || {});
    setParcelForm(warehouseCheckInDraft.parcelForm || createParcelForm());
    setParcelErrors(warehouseCheckInDraft.parcelErrors || createParcelErrors());
    setProceededReceipts(warehouseCheckInDraft.proceededReceipts || []);
  }, [handleSearchValueChange, warehouseCheckInDraft]);

  // Show no data dialog when search returns empty results
  useEffect(() => {
    const { loading, found, data, error } = warehouseReceiptSearch;

    if (loading) {
      searchLoadingRef.current = true;
      return;
    }

    if (!searchLoadingRef.current) return;
    searchLoadingRef.current = false;

    const rows = data?.rows;
    const isEmpty =
      Boolean(error) ||
      found === false ||
      (Array.isArray(rows) && rows.length === 0) ||
      (Array.isArray(data) && data.length === 0) ||
      (found && !data);

    if (isEmpty) {
      setNoDataDialogOpen(true);
    }
  }, [
    warehouseReceiptSearch.loading,
    warehouseReceiptSearch.found,
    warehouseReceiptSearch.data,
    warehouseReceiptSearch.error,
  ]);

  const handleProceed = (row) => {
    const key = `${warehouseReceiptSearch.data.proNumber}-${row.id}`;
    if (proceededReceipts.find((p) => p.key === key)) return;
    setSavedResults(warehouseReceiptSearch.data);
    const normalizedRow = {
      ...row,
      driverName: getRowValue(row, ["driverName", "driver"], ""),
      piecesInland: getRowValue(
        row,
        "piecesInland",
        getRowValue(warehouseReceiptSearch.data, "piecesInland", ""),
      ),
      customerEmails:
        row.customerEmails || warehouseReceiptSearch.data.customerEmails || [],
      toEmails: row.toEmails || warehouseReceiptSearch.data.toEmails || [],
      stationDefaultEmails:
        row.stationDefaultEmails ||
        warehouseReceiptSearch.data.stationDefaultEmails ||
        null,
    };
    const formDefaults = {
      destination: getRowValue(
        normalizedRow,
        ["destination", "finalDestination"],
        "",
      ),
      customerRefNoPackageId: getRowValue(
        normalizedRow,
        ["packageId", "packageNumber"],
        "",
      ),
    };
    setProceededReceipts((prev) => [
      ...prev,
      {
        key,
        proNumber: warehouseReceiptSearch.data.proNumber,
        row: normalizedRow,
        receivedBy: "",
        location: "OH",
        sectionCollapsed: false,
        forms: [createForm(1, null, formDefaults)],
      },
    ]);
    setIsSearchDisabled(true);
    if (needsEmailSelection(normalizedRow)) {
      setEmailSelectionAlertOpen(true);
      setMailAlertReceiptKey(key);
    } else {
      setMailAlertReceiptKey("");
    }
    // Clear search results
    dispatch(clearReceiptSearch());
  };

  const updateReceipt = (key, updater) =>
    setProceededReceipts((prev) =>
      prev.map((p) => (p.key === key ? { ...p, ...updater(p) } : p)),
    );

  const handleOpenMailList = (receipt) => {
    const emails = getReceiptMailRows(receipt.row);
    const selectedEmails = buildSelectedEmailMap(
      emails,
      getRowValue(receipt.row, "toEmails", []),
    );

    setMailListDialog({
      open: true,
      receiptKey: receipt.key,
      emails,
      selectedEmails,
    });
    setMailAlertReceiptKey("");
  };

  const handleCloseMailList = () => {
    setMailListDialog((prev) => ({ ...prev, open: false }));
  };

  const handleEmailCheckboxChange = (emailId) => {
    setMailListDialog((prev) => ({
      ...prev,
      selectedEmails: {
        ...prev.selectedEmails,
        [emailId]: !prev.selectedEmails[emailId],
      },
    }));
  };

  const handleMailSubmit = () => {
    const selectedToEmails = mailListDialog.emails
      .filter((email) => mailListDialog.selectedEmails[email.entryId])
      .map((email) => email.entryEmail);

    updateReceipt(mailListDialog.receiptKey, (receipt) => ({
      row: {
        ...receipt.row,
        toEmails: mergeUniqueEmailLists(selectedToEmails),
      },
    }));
    setMailListDialog((prev) => ({ ...prev, open: false }));
    setMailAlertReceiptKey("");
  };

  const removeReceipt = (key) => {
    dispatch(clearWarehouseCheckInDraft(draftKey));
    draftRestoredRef.current = false;
    setProceededReceipts((prev) => prev.filter((p) => p.key !== key));
    setIsSearchDisabled(false);
    setSearchValue("");
    setParcelForm(createParcelForm());
    setParcelErrors(createParcelErrors());
    setParcelCarrierSearchValue("");
    setParcelCustomerSearchValue("");
    if (savedResults) {
      // Restore the previous search results
      // Note: This is a simple restoration from saved state
    }
    setSavedResults(null);
  };

  const requestResetReceipt = (key) => {
    setResetReceiptDialog({
      key,
    });
  };

  const handleCancelResetReceipt = () => {
    setResetReceiptDialog(null);
  };

  const handleConfirmResetReceipt = () => {
    if (resetReceiptDialog?.key) {
      removeReceipt(resetReceiptDialog.key);
    }
    setResetReceiptDialog(null);
  };

  const getItemErrorKey = (formId, itemId, field) =>
    `${formId}-${itemId}-${field}`;
  const getFormErrorKey = (formId, field) => `${formId}-${field}`;

  const addForm = async (key, { collapseExistingForms = false } = {}) => {
    const receipt = proceededReceipts.find((p) => p.key === key);
    if (!receipt) return;

    const lastForm = receipt.forms[receipt.forms.length - 1];
    const itemErrors = {};
    const formErrors = {};

    const receivedByError = !String(receipt.receivedBy || "").trim()
      ? "Received By is mandatory"
      : "";
    const locationError = !String(receipt.location || "").trim()
      ? "Location is mandatory"
      : "";

    if (receivedByError || locationError) {
      setReceiptErrors((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          receivedBy: receivedByError,
          location: locationError,
        },
      }));
      updateReceipt(key, () => ({ sectionCollapsed: false }));
      setSnackbar({
        open: true,
        message: "Please fill all mandatory fields before adding a new form",
        severity: "error",
      });
      return;
    }

    lastForm.items.forEach((item) => {
      REQUIRED_ITEM_FIELDS.forEach(({ field, label }) => {
        if (!String(item[field]).trim()) {
          itemErrors[getItemErrorKey(lastForm.id, item.id, field)] =
            `${label} is mandatory`;
        }
      });
    });

    if (showTrailerFreightHeader) {
      if (!String(lastForm.destination || "").trim()) {
        formErrors[getFormErrorKey(lastForm.id, "destination")] =
          "Destination is mandatory";
      }
    }

    if (
      Object.keys(itemErrors).length > 0 ||
      Object.keys(formErrors).length > 0
    ) {
      setReceiptErrors((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          receivedBy: "",
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
        forms: p.forms.map((form) =>
          form.id === lastForm.id ? { ...form, collapsed: false } : form,
        ),
      }));
      setSnackbar({
        open: true,
        message: "Please fill all mandatory fields before adding a new form",
        severity: "error",
      });
      return;
    }

    setReceiptErrors((prev) => ({
      ...prev,
      [key]: { ...prev[key], receivedBy: "" },
    }));
    setTempReceiptLoading((prev) => ({ ...prev, [key]: true }));

    try {
      const payload = buildTempReceiptPayload(receipt);
      const response = await dispatch(createTempWarehouseReceipt(payload));

      if (response?.error || response?.success === false) {
        setSnackbar({
          open: true,
          message:
            response?.message || "Failed to create temporary warehouse receipt",
          severity: "error",
        });
        return;
      }

      const receiptNumber = response?.data?.receiptNumber;
      const formDefaults = {
        destination: getRowValue(
          receipt.row,
          ["destination", "finalDestination"],
          "",
        ),
        customerRefNoPackageId: getRowValue(
          receipt.row,
          ["packageId", "packageNumber"],
          "",
        ),
      };
      updateReceipt(key, (p) => ({
        forms: [
          ...p.forms.map((form) =>
            collapseExistingForms ? { ...form, collapsed: true } : form,
          ),
          createForm(getNextFormId(p.forms), receiptNumber, formDefaults),
        ],
      }));
      setSnackbar({
        open: true,
        message: "Temporary warehouse receipt created successfully",
        severity: "success",
      });
    } finally {
      setTempReceiptLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const removeForm = (key, formId) =>
    updateReceipt(key, (p) => ({
      forms: p.forms.filter((f) => f.id !== formId),
    }));

  const toggleFormCollapse = (key, formId) =>
    updateReceipt(key, (p) => ({
      forms: p.forms.map((f) =>
        f.id === formId ? { ...f, collapsed: !f.collapsed } : f,
      ),
    }));

  const updateFormField = (key, formId, field, value) =>
    updateReceipt(key, (p) => ({
      forms: p.forms.map((f) =>
        f.id === formId ? { ...f, [field]: value } : f,
      ),
    }));

  const addItem = (key, formId) =>
    updateReceipt(key, (p) => ({
      forms: p.forms.map((f) =>
        f.id === formId
          ? { ...f, items: [...f.items, createItem(getNextItemId(f.items))] }
          : f,
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
              i.id === itemId ? { ...createItem(i.id) } : i,
            ),
          };
        }
        // Otherwise, remove the item
        return { ...f, items: f.items.filter((i) => i.id !== itemId) };
      }),
    }));

  const updateItem = (key, formId, itemId, field, value) => {
    const nextValue = DECIMAL_ITEM_FIELDS.has(field)
      ? formatDecimal10_2Input(value)
      : value;

    updateReceipt(key, (p) => ({
      forms: p.forms.map((f) =>
        f.id === formId
          ? {
              ...f,
              items: f.items.map((i) =>
                i.id === itemId ? { ...i, [field]: nextValue } : i,
              ),
            }
          : f,
      ),
    }));
  };

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

  const handleOpenImageUpload = (
    key,
    formId,
    itemId,
    existingFiles = [],
    mode = "upload",
    imageField = "images",
  ) => {
    setUploadDialog({ open: true, mode, key, formId, itemId, imageField });
    setStagedFiles(existingFiles);
    setIsDraggingFiles(false);
  };

  const handleCloseImageUpload = () => {
    setUploadDialog({
      open: false,
      mode: "upload",
      key: null,
      formId: null,
      itemId: null,
      imageField: "images",
    });
    setStagedFiles([]);
    setIsDraggingFiles(false);
    handleCloseCamera();
  };

  const handleOpenImagePreview = (
    images = [],
    itemLabel = "",
    context = {},
  ) => {
    setImagePreviewDialog({ open: true, images, itemLabel, ...context });
  };

  const handleCloseImagePreview = () => {
    setImagePreviewDialog({
      open: false,
      images: [],
      itemLabel: "",
      key: null,
      formId: null,
      itemId: null,
      imageField: "images",
    });
    setFullImageDialog({ open: false, image: null, title: "" });
  };

  const handleOpenFullImage = (image, title) => {
    setFullImageDialog({ open: true, image, title });
  };

  const handleCloseFullImage = () => {
    setFullImageDialog({ open: false, image: null, title: "" });
  };

  const handleRemovePreviewImage = (index) => {
    const { key, formId, itemId, imageField = "images" } = imagePreviewDialog;
    if (!key || !formId) return;

    const nextImages = imagePreviewDialog.images.filter(
      (_, imageIndex) => imageIndex !== index,
    );
    if (itemId) {
      updateItem(key, formId, itemId, imageField, nextImages);
    } else {
      updateFormField(key, formId, imageField, nextImages);
    }
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
      // setSnackbar({
      //   open: true,
      //   message: 'Camera is not available in this browser. Please use file upload.',
      //   severity: 'warning',
      // });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      cameraStreamRef.current = stream;
      setCameraDialogOpen(true);
    } catch (error) {
      setSnackbar({
        open: true,
        message: error?.message || "Unable to open camera",
        severity: "error",
      });
    }
  };

  const handleCloseCamera = () => {
    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null;
    }
    stopCameraStream();
    setCameraDialogOpen(false);
  };

  const handleTakePhoto = () => {
    const video = cameraVideoRef.current;
    if (!video) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;

        const file = new File([blob], `camera-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        addFilesToStage([file]);
        handleCloseCamera();
      },
      "image/jpeg",
      0.92,
    );
  };

  const addFilesToStage = (files) => {
    const selectedFiles = Array.from(files || []);

    if (selectedFiles.length > 0) {
      setStagedFiles((prev) => [...prev, ...selectedFiles]);
    }
  };

  const handleFileSelection = (event) => {
    addFilesToStage(event.target.files);
    event.target.value = "";
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

  const handleViewStagedFile = (file, index = 0) => {
    if (!file) return;

    if (isScanGunScreen) {
      handleOpenFullImage(file, getImageName(file, index));
      return;
    }

    const previewUrl = getImageUrl(file);
    if (!previewUrl) return;

    const opened = openImagePreviewTab(previewUrl, getImageName(file, index));

    if (opened && file instanceof File) {
      setTimeout(() => {
        URL.revokeObjectURL(previewUrl);
      }, 1000);
    }
  };

  const handleUploadImages = () => {
    if (!uploadDialog.key || !uploadDialog.formId) return;

    if (uploadDialog.itemId) {
      updateItem(
        uploadDialog.key,
        uploadDialog.formId,
        uploadDialog.itemId,
        uploadDialog.imageField || "images",
        stagedFiles,
      );
    } else {
      updateFormField(
        uploadDialog.key,
        uploadDialog.formId,
        uploadDialog.imageField || "images",
        stagedFiles,
      );
    }
    handleCloseImageUpload();
  };

  const getDimensionValue = (dimensions, fields) => {
    const data = Array.isArray(dimensions) ? dimensions[0] : dimensions;
    const field = fields.find(
      (name) =>
        data?.[name] !== undefined &&
        data?.[name] !== null &&
        data?.[name] !== "",
    );
    return field ? data[field] : null;
  };

  const getDimensionImages = (dimensions) => {
    const data = Array.isArray(dimensions) ? dimensions[0] : dimensions;
    const images =
      data?.images || data?.cargoImages || data?.apiImages || data?.imageList;

    if (!images) return [];
    return Array.isArray(images)
      ? images.filter(Boolean)
      : [images].filter(Boolean);
  };

  const applyCargoDimensions = (dimensionsResponse) => {
    const { key, formId, itemId } = packageDropdownContext;
    const dimensions = dimensionsResponse?.data || dimensionsResponse;

    if (!key || !formId || !itemId || !dimensions || dimensionsResponse?.error)
      return;

    const fieldMap = {
      length: ["length", "cargoLength", "apiLength"],
      width: ["width", "cargoWidth", "apiWidth"],
      height: ["height", "cargoHeight", "apiHeight"],
      weight: ["weight", "cargoWeight", "apiWeight", "weightLbs"],
    };

    Object.entries(fieldMap).forEach(([field, fieldNames]) => {
      const value = getDimensionValue(dimensions, fieldNames);
      if (value !== null) {
        updateItem(key, formId, itemId, field, String(value));
        clearItemError(key, formId, itemId, field, String(value));
      }
    });

    const images = getDimensionImages(dimensions);
    if (images.length > 0) {
      updateItem(key, formId, itemId, "images", images);
    }
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
    const { key, formId, itemId } = packageDropdownContext;

    if (!apiId) {
      handleClosePackageDropdown();
      return;
    }

    if (!key || !formId || !itemId) {
      handleClosePackageDropdown();
      return;
    }

    const loadingKey = getCargoApiLoadingKey(key, formId, itemId);
    handleClosePackageDropdown();

    setCargoApiLoadingItems((prev) => ({ ...prev, [loadingKey]: true }));

    try {
      const dimensionsResponse = await dispatch(fetchCargoApiDimensions(apiId));
      applyCargoDimensions(dimensionsResponse);

      if (dimensionsResponse?.message) {
        setSnackbar({
          open: true,
          message: dimensionsResponse.message,
          severity:
            dimensionsResponse.error || dimensionsResponse.success === false
              ? "error"
              : dimensionsResponse.warning
                ? "warning"
                : "success",
        });
      }
    } finally {
      setCargoApiLoadingItems((prev) => {
        const next = { ...prev };
        delete next[loadingKey];
        return next;
      });
    }
  };

  const buildLabelPrintPayload = (receipt, form) => {
    const row = receipt?.row || {};
    const items = form?.items || [];
    const customerDisplay = getRowValue(row, ["customerName", "customer"], "");
    const carrierDisplay = getRowValue(row, ["carrierName", "carrier"], "");

    return {
      customerName: String(customerDisplay || "")
        .split("|")[0]
        .trim(),
      packageId:
        form?.customerRefNoPackageId ||
        getRowValue(row, ["packageId", "packageNumber"], ""),
      shipper: getRowValue(
        row,
        ["shipper", "shipperName", "shipperCompany"],
        "",
      ),
      carrierName: String(carrierDisplay || "")
        .split("|")[0]
        .trim(),
      proNumber: getRowValue(row, "proNumber", receipt?.proNumber || ""),
      destination:
        form?.destination ||
        getRowValue(row, ["destination", "finalDestination"], ""),
      pieces: items.reduce((sum, item) => sum + Number(item.pieces || 0), 0),
      labelCount: items.length,
    };
  };

  const isTrailerFormReadyForPrint = (form) =>
    Boolean(String(form?.destination || "").trim()) &&
    (form?.items || []).length > 0 &&
    (form?.items || []).every((item) =>
      REQUIRED_ITEM_FIELDS.every(({ field }) =>
        String(item[field] || "").trim(),
      ),
    );

  const handleOpenPrinterDialog = (receipt = null, form = null) => {
    setPrinterDialogOpen(true);
    setSelectedPrinterId("");
    setPrinterContext(receipt && form ? { receipt, form } : null);
    dispatch(fetchPrintersDropdown());
  };

  const buildTrailerMobileSubmitPayload = (receipt, form) => {
    const row = {
      ...(receipt?.row || {}),
      ...(String(form?.destination || "").trim()
        ? { destination: String(form.destination).trim() }
        : {}),
      ...(String(form?.customerRefNoPackageId || "").trim()
        ? { packageId: String(form.customerRefNoPackageId).trim() }
        : {}),
    };
    const selectedOptions = form?.freightOptions || [];
    const freightDetails = (form?.items || []).map((item) => {
      const cubicMeter = calculateRoundedItemCbm(item);

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
    const piecesInland = freightDetails.reduce(
      (sum, item) => sum + Number(item.pieces || 0),
      0,
    );
    const weightInland = freightDetails.reduce(
      (sum, item) => sum + Number(item.weight || 0),
      0,
    );
    const reWeight = freightDetails.reduce(
      (sum, item) => sum + Number(item.pieces || 0) * Number(item.weight || 0),
      0,
    );
    const cubicMeter = formatMeasurement(
      freightDetails.reduce(
        (sum, item) => sum + Number(item.pieces || 0) * Number(item.cubicMeter || 0),
        0,
      ),
    );
    const verificationId = toNumberOrNull(row.verificationId);
    const hasNoVerificationId = verificationId === 0 || verificationId === null;
    const isTempReceiptForm =
      Boolean(form?.receiptNumber) &&
      String(form.receiptNumber) !== String(row.receiptNumber || "");

    return {
      receipts: [
        {
          receipt: {
            receiptId: isTempReceiptForm
              ? 0
              : toNumberOrNull(row.receiptId) || 0,
            receiptNumber: toNumberOrNull(
              form?.receiptNumber || row.receiptNumber,
            ),
            receiptType: draftKey === "trailer" ? "Trailer" : "Regular",
            receivedBy: toValueOrNull(
              String(receipt?.receivedBy || "").slice(0, 100),
            ),
            location: toValueOrNull(receipt?.location),
            shipper: toValueOrNull(
              getRowValue(row, ["shipper", "shipperName"], ""),
            ),
            customerId: toNumberOrNull(row.customerId),
            stationId: toNumberOrNull(row.stationId),
            verificationId,
            ...(hasNoVerificationId
              ? {
                  driverName:
                    toValueOrNull(
                      getRowValue(row, ["driverName", "driver"], ""),
                    ) || "",
                }
              : {}),
            carrierId: toNumberOrNull(row.carrierId),
            piecesInland,
            weightInland,
            reWeight,
            cubicMeter,
            proNumber: toValueOrNull(
              getRowValue(row, "proNumber", receipt?.proNumber || ""),
            ),
            toEmails: getSubmitToEmails(row),
            invoiceNumber: toValueOrNull(
              getRowValue(row, ["invoiceNo", "invoiceNumber"], ""),
            ),
            poNumber: toValueOrNull(getRowValue(row, ["poNumber", "poNo"], "")),
            customerRefNumber: toValueOrNull(
              getRowValue(row, ["customerRefNo", "customerReference"], ""),
            ),
            freightCondition:
              selectedOptions.includes("Bad Freight Condition") ||
              (form?.badFreightImages || []).length
                ? "Y"
                : null,
            handlingDescription: null,
            notes: null,
            destination: toValueOrNull(
              getRowValue(row, ["destination", "finalDestination"], ""),
            ),
            originalDgd: null,
            unNumber: [],
            class: [],
            packageId: toValueOrNull(
              getRowValue(row, ["packageId", "packageNumber"], ""),
            ),
            properShippingName: null,
            hazardousDescription: null,
            status: "INITIATE",
            withSkid: toYesNo(
              selectedOptions.includes("Banded Skid") ||
                selectedOptions.includes("Shrink Wrapped Skid") ||
                selectedOptions.includes("SHT / IPPC Skid") ||
                selectedOptions.includes("Plastic Skid"),
            ),
            bandedSkid: toYesNo(selectedOptions.includes("Banded Skid")),
            shrinkWrappedSkid: toYesNo(
              selectedOptions.includes("Shrink Wrapped Skid"),
            ),
            shtIppcSkid: toYesNo(selectedOptions.includes("SHT / IPPC Skid")),
            plasticSkid: toYesNo(selectedOptions.includes("Plastic Skid")),
            hazMat: toYesNo(selectedOptions.includes("Haz Mat")),
            documents: toYesNo(selectedOptions.includes("Document")),
            labelCount: form?.items?.length || 0,
          },
          freightDetails,
        },
      ],
    };
  };

  const hasTrailerMobileSubmitImages = (form) =>
    (form?.items || []).some((item) => (item.images || []).length > 0) ||
    (form?.badFreightImages || []).length > 0;

  const buildTrailerMobileSubmitFormData = async (receipt, form) => {
    const formData = new FormData();
    formData.append(
      "batchData",
      JSON.stringify(buildTrailerMobileSubmitPayload(receipt, form)),
    );

    await Promise.all([
      ...(form.items || []).flatMap((item, freightIndex) =>
        (item.images || []).map(async (image, imageIndex) => {
          const fieldName = `freight-0-${freightIndex}-${imageIndex}`;
          const imageValue = await getSubmittedImageValue(image);

          if (imageValue) {
            formData.append(fieldName, imageValue);
          }
        }),
      ),
      ...(form.badFreightImages || []).map(async (image, imageIndex) => {
        const fieldName = `bad-freight-image-0-${imageIndex}`;
        const renamedImage = await toRenamedImageFile(image, fieldName);

        if (renamedImage instanceof File || renamedImage instanceof Blob) {
          formData.append(fieldName, renamedImage);
        }
      }),
    ]);

    return formData;
  };

  const buildMobileSubmitPayload = (receipts = []) => ({
    receipts: receipts.flatMap((receipt) =>
      (receipt.forms || []).map(
        (form) => buildTrailerMobileSubmitPayload(receipt, form).receipts[0],
      ),
    ),
  });

  const hasMobileSubmitImages = (receipts = []) =>
    receipts.some((receipt) =>
      (receipt.forms || []).some((form) => hasTrailerMobileSubmitImages(form)),
    );

  const buildMobileSubmitFormData = async (receipts = []) => {
    const forms = receipts.flatMap((receipt) =>
      (receipt.forms || []).map((form) => ({ receipt, form })),
    );
    const formData = new FormData();
    formData.append(
      "batchData",
      JSON.stringify(buildMobileSubmitPayload(receipts)),
    );

    await Promise.all(
      forms.flatMap(({ form }, receiptIndex) => [
        ...(form.items || []).flatMap((item, freightIndex) =>
          (item.images || []).map(async (image, imageIndex) => {
            const fieldName = `freight-${receiptIndex}-${freightIndex}-${imageIndex}`;
            const imageValue = await getSubmittedImageValue(image);

            if (imageValue) {
              formData.append(fieldName, imageValue);
            }
          }),
        ),
        ...(form.badFreightImages || []).map(async (image, imageIndex) => {
          const fieldName = `bad-freight-image-${receiptIndex}-${imageIndex}`;
          const renamedImage = await toRenamedImageFile(image, fieldName);

          if (renamedImage instanceof File || renamedImage instanceof Blob) {
            formData.append(fieldName, renamedImage);
          }
        }),
      ]),
    );

    return formData;
  };

  const validateTrailerMobileFreightForm = (receipt, form) => {
    const receivedBy = !String(receipt?.receivedBy || "").trim()
      ? "Received By is mandatory"
      : "";
    const location = !String(receipt?.location || "").trim()
      ? "Location is mandatory"
      : "";
    const formFields = {};
    const items = {};

    if (!String(form?.destination || "").trim()) {
      formFields[getFormErrorKey(form.id, "destination")] =
        "Destination is mandatory";
    }

    (form?.items || []).forEach((item) => {
      REQUIRED_ITEM_FIELDS.forEach(({ field, label }) => {
        if (!String(item[field] || "").trim()) {
          items[getItemErrorKey(form.id, item.id, field)] =
            `${label} is mandatory`;
        }
      });
    });

    const hasErrors =
      Object.keys(formFields).length > 0 || Object.keys(items).length > 0;

    setReceiptErrors((prev) => ({
      ...prev,
      [receipt.key]: {
        ...(prev[receipt.key] || {}),
        receivedBy,
        location,
        formFields: {
          ...(prev[receipt.key]?.formFields || {}),
          ...formFields,
        },
        items: {
          ...(prev[receipt.key]?.items || {}),
          ...items,
        },
      },
    }));

    if (hasErrors || receivedBy || location) {
      setSnackbar({
        open: true,
        message: "Please fill all mandatory fields before continuing",
        severity: "error",
      });
    }

    return !hasErrors && !receivedBy && !location;
  };

  const handleTrailerMobilePrintLabelAndSubmit = (receiptKey) => {
    const receipt = proceededReceipts.find(
      (currentReceipt) => currentReceipt.key === receiptKey,
    );
    const form = receipt?.forms?.[receipt.forms.length - 1];

    if (!receipt || !form) {
      setSnackbar({
        open: true,
        message: "Please add freight information before continuing",
        severity: "error",
      });
      return;
    }

    if (!validateTrailerMobileFreightForm(receipt, form)) return;

    setPrinterDialogOpen(true);
    setSelectedPrinterId("");
    setPrinterContext({
      receipt,
      form,
      receiptKey,
      mode: "mobileTrailerSubmit",
    });
    dispatch(fetchPrintersDropdown());
  };

  const handleTrailerMobilePrinterSubmit = async () => {
    const printer = printersDropdown.data.find(
      (item) => String(item.printerId) === String(selectedPrinterId),
    );
    const { receipt, form, receiptKey } = printerContext || {};

    if (!printer) {
      setSnackbar({
        open: true,
        message: "Please select a printer",
        severity: "error",
      });
      return;
    }

    if (!receipt || !form || !receiptKey) {
      setSnackbar({
        open: true,
        message: "Freight information is required to submit",
        severity: "error",
      });
      return;
    }

    if (!validateTrailerMobileFreightForm(receipt, form)) return;

    const receiptNumber =
      form.receiptNumber ||
      receipt.row?.receiptNumber ||
      receipt.row?.receiptNo ||
      "";

    if (!receiptNumber) {
      setSnackbar({
        open: true,
        message: "Receipt number is required to print the label",
        severity: "error",
      });
      return;
    }

    setTempReceiptLoading((prev) => ({ ...prev, [receiptKey]: true }));
    setPrintLoading(true);

    try {
      const submitPayload = hasTrailerMobileSubmitImages(form)
        ? await buildTrailerMobileSubmitFormData(receipt, form)
        : buildTrailerMobileSubmitPayload(receipt, form);
      const submitResponse = await dispatch(
        submitWarehouseReceiptBatch(submitPayload),
      );

      if (submitResponse?.error || submitResponse?.success === false) {
        setSnackbar({
          open: true,
          message:
            submitResponse?.message || "Failed to submit warehouse receipt",
          severity: "error",
        });
        return;
      }

      const tempResponse = await dispatch(
        createTempWarehouseReceipt(buildTempReceiptPayload(receipt)),
      );

      if (tempResponse?.error || tempResponse?.success === false) {
        setSnackbar({
          open: true,
          message:
            tempResponse?.message ||
            "Failed to create temporary warehouse receipt",
          severity: "error",
        });
        return;
      }

      const tempReceiptNumber = tempResponse?.data?.receiptNumber;
      const nextReceiptErrors = {
        ...receiptErrors,
        [receiptKey]: {
          ...(receiptErrors[receiptKey] || {}),
          formFields: {},
          items: {},
        },
      };
      const nextProceededReceipts = proceededReceipts.map((currentReceipt) =>
        currentReceipt.key === receiptKey
          ? {
              ...currentReceipt,
              forms: [
                createForm(
                  getNextFormId(currentReceipt.forms),
                  tempReceiptNumber,
                ),
              ],
            }
          : currentReceipt,
      );

      const printResponse = await dispatch(
        printWarehouseReceiptLabel({
          printerIP: printer.printerIP,
          printerPort: printer.printerPort,
          receiptNumber,
          payload: buildLabelPrintPayload(receipt, form),
        }),
      );

      if (printResponse?.error || printResponse?.success === false) {
        setSnackbar({
          open: true,
          message:
            printResponse?.message ||
            "Warehouse receipt submitted, but label print failed",
          severity: "error",
        });
        return;
      }

      setProceededReceipts(nextProceededReceipts);
      setReceiptErrors(nextReceiptErrors);
      dispatch(
        setWarehouseCheckInDraft(
          {
            searchType,
            searchBy,
            searchValue,
            savedResults,
            collapsed,
            rejectedRowIds,
            isSearchDisabled,
            receiptErrors: nextReceiptErrors,
            parcelForm,
            parcelErrors,
            proceededReceipts: nextProceededReceipts,
          },
          draftKey,
        ),
      );
      handleClosePrinterDialog();
      setSnackbar({
        open: true,
        message: printResponse?.message || "Label print sent successfully",
        severity: "success",
      });
      navigate(PATH_DASHBOARD.warehouseCheckInTrailer, { replace: true });
    } finally {
      setTempReceiptLoading((prev) => ({ ...prev, [receiptKey]: false }));
      setPrintLoading(false);
    }
  };

  const handleClosePrinterDialog = () => {
    setPrinterDialogOpen(false);
    setSelectedPrinterId("");
    setPrinterContext(null);
  };

  const handlePrint = async () => {
    const printer = printersDropdown.data.find(
      (item) => String(item.printerId) === String(selectedPrinterId),
    );

    if (!printer) {
      setSnackbar({
        open: true,
        message: "Please select a printer",
        severity: "error",
      });
      return;
    }

    const receiptNumber =
      printerContext?.receiptNumber ||
      printerContext?.form?.receiptNumber ||
      printerContext?.receipt?.row?.receiptNumber ||
      printerContext?.receipt?.row?.receiptNo ||
      "";

    if (!receiptNumber) {
      setSnackbar({
        open: true,
        message: "Receipt number is required to print the label",
        severity: "error",
      });
      return;
    }

    setPrintLoading(true);
    const printPayload =
      printerContext?.receipt && printerContext?.form
        ? buildLabelPrintPayload(printerContext.receipt, printerContext.form)
        : undefined;
    const response = await dispatch(
      printWarehouseReceiptLabel({
        printerIP: printer.printerIP,
        printerPort: printer.printerPort,
        receiptNumber,
        payload: printPayload,
      }),
    );
    setPrintLoading(false);

    if (response?.error || response?.success === false) {
      setSnackbar({
        open: true,
        message: response?.message || "Failed to print label",
        severity: "error",
      });
      return;
    }

    setSnackbar({
      open: true,
      message:
        response?.message || `Print requested for ${printer.printerName}`,
      severity: "success",
    });
    handleClosePrinterDialog();
  };

  const isMobileTrailerPrinterSubmit =
    printerContext?.mode === "mobileTrailerSubmit";

  const handleParcelFormChange = useCallback((field, value) => {
    setParcelForm((prev) => ({ ...prev, [field]: value }));
    if (value && String(value).trim()) {
      setParcelErrors((prev) => ({ ...prev, [field]: "" }));
    }
  }, []);

  const stopParcelBarcodeScanner = useCallback(() => {
    barcodeControlsRef.current?.stop?.();
    barcodeControlsRef.current = null;
    barcodeStreamRef.current?.getTracks?.().forEach((track) => track.stop());
    barcodeStreamRef.current = null;
    if (barcodeVideoRef.current) barcodeVideoRef.current.srcObject = null;
  }, []);

  const handleCloseParcelBarcodeScanner = useCallback(() => {
    stopParcelBarcodeScanner();
    setBarcodeScannerOpen(false);
    setBarcodeScannerStatus("");
    setBarcodeScannerTarget("parcelPro");
    setBarcodeScannerContext({ receiptKey: "", formId: null });
  }, [stopParcelBarcodeScanner]);

  const handleOpenBarcodeScanner = async (target = "parcelPro", context = {}) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setSnackbar({
        open: true,
        message: "Camera is not available in this browser",
        severity: "warning",
      });
      return;
    }

    setBarcodeScannerTarget(target);
    setBarcodeScannerContext({
      receiptKey: context.receiptKey || "",
      formId: context.formId || null,
    });
    setBarcodeScannerStatus("Point the camera at the QR or barcode");
    setBarcodeScannerOpen(true);
  };

  const handleOpenParcelBarcodeScanner = () =>
    handleOpenBarcodeScanner("parcelPro");

  const handleOpenSearchIdBarcodeScanner = () =>
    handleOpenBarcodeScanner("searchId");

  const handleOpenPackageIdBarcodeScanner = (receiptKey, formId) =>
    handleOpenBarcodeScanner("packageId", { receiptKey, formId });

  useEffect(() => {
    if (!barcodeScannerOpen) return undefined;

    let disposed = false;
    let controls = null;

    const startScanner = async () => {
      // Ensure the video element is mounted in the DOM
      if (!barcodeVideoRef.current) return;

      try {
        const reader = new BrowserMultiFormatReader();
        barcodeReaderRef.current = reader;

        // Passing `undefined` as the first argument tells ZXing to choose the default camera automatically
        controls = await reader.decodeFromVideoDevice(
          undefined,
          barcodeVideoRef.current,
          (result) => {
            const scannedValue = String(result?.getText?.() || "").trim();
            if (!scannedValue) return;

            const nextValue = scannedValue.slice(0, 100);
            if (barcodeScannerTarget === "searchId") {
              handleSearchValueChange(nextValue);
            } else if (barcodeScannerTarget === "packageId") {
              updateFormField(
                barcodeScannerContext.receiptKey,
                barcodeScannerContext.formId,
                "customerRefNoPackageId",
                nextValue,
              );
              clearFormFieldError(
                barcodeScannerContext.receiptKey,
                barcodeScannerContext.formId,
                "customerRefNoPackageId",
                nextValue,
              );
            } else {
              handleParcelFormChange("proNumber", nextValue);
            }
            setSnackbar({
              open: true,
              message:
                barcodeScannerTarget === "searchId"
                  ? "ID scanned"
                  : barcodeScannerTarget === "packageId"
                    ? "Package ID scanned"
                    : "PRO number scanned",
              severity: "success",
            });
            handleCloseParcelBarcodeScanner();
          },
        );

        if (disposed) {
          controls.stop();
          return;
        }

        barcodeControlsRef.current = controls;
      } catch (error) {
        console.error("ZXing initialization failed:", error);
        setBarcodeScannerStatus(
          error?.message || "Unable to open barcode scanner",
        );
      }
    };

    // Small delay to ensure the Dialog animation is complete and the video element is painted
    const timer = setTimeout(startScanner, 100);

    return () => {
      disposed = true;
      clearTimeout(timer);
      if (controls) {
        controls.stop();
      }
      barcodeControlsRef.current = null;
    };
  }, [
    barcodeScannerOpen,
    barcodeScannerContext.formId,
    barcodeScannerContext.receiptKey,
    barcodeScannerTarget,
    clearFormFieldError,
    handleCloseParcelBarcodeScanner,
    handleParcelFormChange,
    handleSearchValueChange,
    updateFormField,
  ]);

  const validateParcelForm = () => {
    const nextErrors = createParcelErrors();

    if (!String(parcelForm.proNumber || "").trim())
      nextErrors.proNumber = "Pro is required";
    if (!parcelForm.carrier) nextErrors.carrier = "Carrier is required";
    if (!parcelForm.customer) nextErrors.customer = "Customer is required";
    if (!String(parcelForm.shipper || "").trim())
      nextErrors.shipper = "Shipper is required";
    if (!String(parcelForm.driverName || "").trim())
      nextErrors.driverName = "Driver Name is required";
    if (!String(parcelForm.pieces || "").trim())
      nextErrors.pieces = "Pieces is required";
    if (!String(parcelForm.weight || "").trim())
      nextErrors.weight = "Weight is required";

    setParcelErrors(nextErrors);
    return !Object.values(nextErrors).some(Boolean);
  };

  const handleParcelSubmit = async () => {
    if (!validateParcelForm()) {
      setSnackbar({
        open: true,
        message: "Please fill all mandatory parcel fields",
        severity: "error",
      });
      return;
    }

    const payload = {
      verificationId: 0,
      shipper: parcelForm.shipper || "",
      customerId: parcelForm.customer?.customerId || 0,
      stationId: parcelForm.customer?.stationId || 0,
      carrierId: parcelForm.carrier?.carrierId || 0,
      status: "INITIATE",
      receivedBy: "",
      location: "",
      destination: "",
      proNumber: parcelForm.proNumber || "",
      packageId: "",
    };

    const response = await dispatch(createTempWarehouseReceipt(payload));

    if (response?.error || response?.success === false) {
      setSnackbar({
        open: true,
        message:
          response?.message || "Failed to create temporary warehouse receipt",
        severity: "error",
      });
      return;
    }

    const receiptData = response?.data || {};
    const row = {
      id: receiptData.receiptNumber || receiptData.verificationId || Date.now(),
      receiptNumber: receiptData.receiptNumber || "",
      carrier: receiptData.carrierName || "",
      customer: receiptData.customerName
        ? `${receiptData.customerName}${receiptData.stationName ? ` | ${receiptData.stationName}` : ""}`
        : "",
      piecesInland: parcelForm.pieces,
      weightInland: parcelForm.weight,
      driverName: parcelForm.driverName || "",
      ...receiptData,
    };
    const key = `${receiptData.proNumber || parcelForm.proNumber}-${row.id}`;
    const form = createForm(1, receiptData.receiptNumber);
    const parcelItem = createItem(1);

    setSavedResults({
      proNumber: receiptData.proNumber || parcelForm.proNumber,
      rows: [row],
    });
    setProceededReceipts([
      {
        key,
        proNumber: receiptData.proNumber || parcelForm.proNumber,
        row,
        receivedBy: receiptData.receivedBy || "",
        location: receiptData.location || "OH",
        sectionCollapsed: false,
        forms: [{ ...form, items: [parcelItem] }],
      },
    ]);
    setIsSearchDisabled(true);

    setSnackbar({
      open: true,
      message:
        response?.message || "Temporary warehouse receipt created successfully",
      severity: "success",
    });
  };

  const handleRejectOpen = (row) => {
    setRejectRow(row);
    setRejectReason("");
    setRejectOpen(true);
  };

  const handleRejectClose = () => {
    setRejectOpen(false);
    setRejectRow(null);
    setRejectReason("");
  };

  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) {
      setSnackbar({
        open: true,
        message: "Please enter a rejection reason",
        severity: "error",
      });
      return;
    }

    if (!rejectRow) {
      setSnackbar({
        open: true,
        message: "No receipt selected",
        severity: "error",
      });
      return;
    }

    setRejectLoading(true);

    try {
      const receiptId = rejectRow.receiptId || rejectRow.id;

      // Make API call to reject the receipt
      const response = await axios.put(
        `/warehouse-receipt/${receiptId}/reject`,
        {
          rejectionReason: rejectReason,
        },
      );

      if (response.data?.success) {
        setSnackbar({
          open: true,
          message: "Receipt rejected successfully",
          severity: "success",
        });

        // Remove only the rejected row from the display
        setRejectedRowIds((prev) => [...prev, rejectRow.id]);

        handleRejectClose();
      } else {
        setSnackbar({
          open: true,
          message: response.data?.message || "Failed to reject receipt",
          severity: "error",
        });
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Error rejecting receipt";
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: "error",
      });
      console.error("Error rejecting receipt:", error);
    } finally {
      setRejectLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleCancel = () => {
    dispatch(clearWarehouseCheckInDraft());
    draftRestoredRef.current = false;
    resetCheckInState();
    dispatch(clearReceiptSearch());
  };

  const completeHandleNext = (nextErrors, receiptForms = []) => {
    dispatch(
      setWarehouseCheckInDraft(
        {
          searchType,
          searchBy,
          searchValue,
          savedResults,
          collapsed,
          rejectedRowIds,
          isSearchDisabled,
          receiptErrors: nextErrors,
          parcelForm,
          parcelErrors,
          proceededReceipts,
          ...(receiptForms.length ? { receiptForms } : {}),
        },
        draftKey,
      ),
    );

    navigate(PATH_DASHBOARD.warehouseReceiptForm, {
      state: { receipts: proceededReceipts, receiptForms, title, draftKey },
    });
  };

  const handleCancelCommonFieldsConfirm = () => {
    const { nextErrors, currentForms, savedForms } = commonFieldsConfirm;
    const receiptForms = mergeReceiptFormsWithSaved(
      savedForms,
      currentForms,
      false,
    );

    setCommonFieldsConfirm({
      open: false,
      nextErrors: {},
      currentForms: [],
      savedForms: [],
    });
    completeHandleNext(nextErrors, receiptForms);
  };

  const handleConfirmCommonFieldsApplyAll = () => {
    const { nextErrors, currentForms, savedForms } = commonFieldsConfirm;
    const receiptForms = mergeReceiptFormsWithSaved(
      savedForms,
      currentForms,
      true,
    );

    setCommonFieldsConfirm({
      open: false,
      nextErrors: {},
      currentForms: [],
      savedForms: [],
    });
    completeHandleNext(nextErrors, receiptForms);
  };

  const handleNext = () => {
    if (proceededReceipts.length === 0) {
      setSnackbar({
        open: true,
        message: "Please proceed with a warehouse receipt before continuing",
        severity: "error",
      });
      return;
    }

    const nextErrors = {};
    let hasErrors = false;

    proceededReceipts.forEach((receipt) => {
      const receiptError = { formFields: {}, items: {} };

      if (!String(receipt.receivedBy || "").trim()) {
        receiptError.receivedBy = "Received By is mandatory";
        hasErrors = true;
      }
      if (!String(receipt.location || "").trim()) {
        receiptError.location = "Location is mandatory";
        hasErrors = true;
      }

      receipt.forms.forEach((form) => {
        if (showTrailerFreightHeader) {
          if (!String(form.destination || "").trim()) {
            receiptError.formFields[getFormErrorKey(form.id, "destination")] =
              "Destination is mandatory";
            hasErrors = true;
          }
        }

        form.items.forEach((item) => {
          REQUIRED_ITEM_FIELDS.forEach(({ field, label }) => {
            if (!String(item[field]).trim()) {
              receiptError.items[getItemErrorKey(form.id, item.id, field)] =
                `${label} is mandatory`;
              hasErrors = true;
            }
          });
        });
      });

      if (
        receiptError.receivedBy ||
        receiptError.location ||
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
                  receiptError.formFields?.[
                    getFormErrorKey(form.id, "destination")
                  ],
                ) ||
                form.items.some((item) =>
                  REQUIRED_ITEM_FIELDS.some(
                    ({ field }) =>
                      receiptError.items[
                        getItemErrorKey(form.id, item.id, field)
                      ],
                  ),
                )
                  ? false
                  : form.collapsed,
            })),
          };
        }),
      );
      setSnackbar({
        open: true,
        message: "Please fill all mandatory fields before continuing",
        severity: "error",
      });
      return;
    }

    const currentReceiptForms =
      buildReceiptFormsFromReceipts(proceededReceipts);
    const savedReceiptForms = warehouseCheckInDraft?.receiptForms || [];
    const savedProceededReceipts =
      warehouseCheckInDraft?.proceededReceipts || [];
    const commonFieldsChanged =
      savedReceiptForms.length > 0 &&
      haveCommonReceiptFieldsChanged(savedProceededReceipts, proceededReceipts);

    if (commonFieldsChanged) {
      setCommonFieldsConfirm({
        open: true,
        nextErrors,
        currentForms: currentReceiptForms,
        savedForms: savedReceiptForms,
      });
      return;
    }

    const receiptForms = savedReceiptForms.length
      ? mergeReceiptFormsWithSaved(
          savedReceiptForms,
          currentReceiptForms,
          false,
        )
      : [];

    completeHandleNext(nextErrors, receiptForms);
  };

  // ── Search handler ─────────────────────────────────────────────────
  const validateRegularMobileSubmit = () => {
    if (proceededReceipts.length === 0) {
      setSnackbar({
        open: true,
        message: "Please proceed with a warehouse receipt before submitting",
        severity: "error",
      });
      return false;
    }

    const nextErrors = {};
    let hasErrors = false;

    proceededReceipts.forEach((receipt) => {
      const receiptError = { formFields: {}, items: {} };

      if (!String(receipt.receivedBy || "").trim()) {
        receiptError.receivedBy = "Received By is mandatory";
        hasErrors = true;
      }
      if (!String(receipt.location || "").trim()) {
        receiptError.location = "Location is mandatory";
        hasErrors = true;
      }

      (receipt.forms || []).forEach((form) => {
        (form.items || []).forEach((item) => {
          REQUIRED_ITEM_FIELDS.forEach(({ field, label }) => {
            if (!String(item[field] || "").trim()) {
              receiptError.items[getItemErrorKey(form.id, item.id, field)] =
                `${label} is mandatory`;
              hasErrors = true;
            }
          });
        });
      });

      if (
        receiptError.receivedBy ||
        receiptError.location ||
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
              collapsed: form.items.some((item) =>
                REQUIRED_ITEM_FIELDS.some(
                  ({ field }) =>
                    receiptError.items[
                      getItemErrorKey(form.id, item.id, field)
                    ],
                ),
              )
                ? false
                : form.collapsed,
            })),
          };
        }),
      );
      setSnackbar({
        open: true,
        message: "Please fill all mandatory fields before submitting",
        severity: "error",
      });
      return false;
    }

    return true;
  };

  const handleRegularMobileSubmit = async () => {
    setRegularMobileSubmitConfirmOpen(false);
    if (!validateRegularMobileSubmit()) return;

    const payload = hasMobileSubmitImages(proceededReceipts)
      ? await buildMobileSubmitFormData(proceededReceipts)
      : buildMobileSubmitPayload(proceededReceipts);
    const response = await dispatch(submitWarehouseReceiptBatch(payload));

    if (response?.error || response?.success === false) {
      setSnackbar({
        open: true,
        message: response?.message || "Failed to submit warehouse receipts",
        severity: "error",
      });
      return;
    }

    setMobileRegularSuccessDialog({
      open: true,
      message: response?.message || "Warehouse receipts submitted successfully",
      entries: getReceiptPrintEntriesFromResponse(response),
    });
  };

  const requestRegularMobileSubmit = () => {
    if (!validateRegularMobileSubmit()) return;

    setRegularMobileSubmitConfirmOpen(true);
  };

  const handleMobileRegularSuccessOk = () => {
    setMobileRegularSuccessDialog({ open: false, message: '', entries: [] });
    dispatch(clearWarehouseCheckInDraft(draftKey));
    draftRestoredRef.current = false;
    resetCheckInState();
    dispatch(clearReceiptSearch());
  };

  const handleOpenMobileRegularPrintDialog = (entry) => {
    setPrinterDialogOpen(true);
    setSelectedPrinterId("");
    setPrinterContext({
      receiptNumber: entry.receiptNumber,
      mode: "mobileRegularSuccessPrint",
    });
    dispatch(fetchPrintersDropdown());
  };

  const handleComplete = () => {
    dispatch(clearWarehouseCheckInDraft(draftKey));
    draftRestoredRef.current = false;
    resetCheckInState();
    dispatch(clearReceiptSearch());
    navigate(PATH_DASHBOARD.warehouseCheckInRegular);
  };

  const handleSearch = () => {
    if (!searchValue.trim()) {
      return;
    }
    setNoDataDialogOpen(false);
    setNoDataSearchValue(searchValue.trim());
    if (searchType === "rmDriver") {
      dispatch(searchWarehouseReceiptProDetail(searchValue.trim()));
    } else {
      dispatch(
        searchWarehouseReceipt(searchValue.trim(), searchBy.toLowerCase()),
      );
    }
    setCollapsed({});
  };

  const toggleCollapse = (key) =>
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  // ── DataGrid columns ───────────────────────────────────────────────
  const columns = [
    { field: "sno", headerName: "SNo ⇅", width: 70 },
    {
      field: "receiptNumber",
      headerName: "Receipt Number ⇅",
      flex: 1,
      minWidth: 140,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Typography sx={{ fontWeight: 700, fontSize: 13 }}>
            {params.value}
          </Typography>
        </Box>
      ),
    },
    { field: "carrier", headerName: "Carrier ⇅", flex: 1, minWidth: 100 },
    { field: "customer", headerName: "Customer ⇅", flex: 2, minWidth: 180 },
    {
      field: "actions",
      headerName: "Actions",
      width: 180,
      sortable: false,
      renderCell: (params) => (
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{ height: "100%" }}
        >
          {searchType !== "rmDriver" && (
            <Button
              size="small"
              sx={actionBtnSx}
              onClick={() => handleRejectOpen(params.row)}
            >
              Reject
            </Button>
          )}
          <Button
            size="small"
            sx={actionBtnSx}
            onClick={() => handleProceed(params.row)}
          >
            Proceed
          </Button>
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
      plain={showScanGunPage}
      stickyHeader={!showScanGunPage}
    >
      {showScanGunPage ? (
        <WarehouseCheckInScanGunPage
          title={title}
          onComplete={
            showTrailerFreightHeader
              ? handleComplete
              : requestRegularMobileSubmit
          }
          searchType={searchType}
          setSearchType={setSearchType}
          searchBy={searchBy}
          setSearchBy={setSearchBy}
          searchValue={searchValue}
          setSearchValue={handleSearchValueChange}
          handleSearch={handleSearch}
          warehouseReceiptSearch={warehouseReceiptSearch}
          isSearchDisabled={isSearchDisabled}
          showParcelOption={showParcelOption}
          parcelForm={parcelForm}
          parcelErrors={parcelErrors}
          parcelCarrierDropdown={parcelCarrierDropdown}
          customerOptions={customerOptions}
          customerLoading={customerLoading}
          parcelCarrierSearchValue={parcelCarrierSearchValue}
          setParcelCarrierSearchValue={setParcelCarrierSearchValue}
          parcelCustomerSearchValue={parcelCustomerSearchValue}
          setParcelCustomerSearchValue={setParcelCustomerSearchValue}
          getCarrierOptionLabel={getCarrierOptionLabel}
          getCustomerOptionLabel={getCustomerOptionLabel}
          handleParcelFormChange={handleParcelFormChange}
          handleParcelSubmit={handleParcelSubmit}
          proceededReceipts={proceededReceipts}
          mailAlertReceiptKey={mailAlertReceiptKey}
          rejectedRowIds={rejectedRowIds}
          receiptErrors={receiptErrors}
          updateReceipt={updateReceipt}
          removeReceipt={requestResetReceipt}
          addForm={addForm}
          removeForm={removeForm}
          addItem={addItem}
          removeItem={removeItem}
          updateFormField={updateFormField}
          updateItem={updateItem}
          clearFormFieldError={clearFormFieldError}
          clearItemError={clearItemError}
          handlePackageDetailsClick={handlePackageDetailsClick}
          handleOpenImageUpload={handleOpenImageUpload}
          handleOpenImagePreview={handleOpenImagePreview}
          cargoApiLoadingItems={cargoApiLoadingItems}
          getCargoApiLoadingKey={getCargoApiLoadingKey}
          freightTypeOptions={FREIGHT_TYPE_OPTIONS}
          showTrailerFreightHeader={showTrailerFreightHeader}
          handleTrailerMobilePrintLabelAndSubmit={
            handleTrailerMobilePrintLabelAndSubmit
          }
          tempReceiptLoading={tempReceiptLoading}
          handleRejectOpen={handleRejectOpen}
          handleProceed={handleProceed}
          dispatchClearReceiptSearch={() => dispatch(clearReceiptSearch())}
        />
      ) : (
        <Stack spacing={3}>
          {/* Warehouse Receipt fieldset */}
          <fieldset
            style={{
              borderColor: "#b0b0b0",
              borderRadius: "8px",
              padding: "16px",
            }}
          >
            <legend>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, px: 1 }}>
                Warehouse Receipt
              </Typography>
            </legend>

            {/* Radio group */}
            <RadioGroup
              row
              value={searchType}
              onChange={(e) => {
                setSearchType(e.target.value);
                dispatch(clearReceiptSearch());
                handleSearchValueChange("");
              }}
              sx={{ mb: 2 }}
            >
              <FormControlLabel
                value="pro"
                disabled={isSearchDisabled}
                control={
                  <Radio
                    size="small"
                    sx={{ color: "#A22", "&.Mui-checked": { color: "#A22" } }}
                  />
                }
                label={
                  <Typography sx={{ fontSize: 13 }}>Search By PRO#</Typography>
                }
              />
              <FormControlLabel
                value="rmDriver"
                disabled={isSearchDisabled}
                control={
                  <Radio
                    size="small"
                    sx={{ color: "#A22", "&.Mui-checked": { color: "#A22" } }}
                  />
                }
                label={<Typography sx={{ fontSize: 13 }}>RM Driver</Typography>}
              />
              {showParcelOption && (
                <FormControlLabel
                  value="parcel"
                  disabled={isSearchDisabled}
                  control={
                    <Radio
                      size="small"
                      sx={{ color: "#A22", "&.Mui-checked": { color: "#A22" } }}
                    />
                  }
                  label={<Typography sx={{ fontSize: 13 }}>Parcel</Typography>}
                />
              )}
            </RadioGroup>

            {searchType === "parcel" ? (
              <Stack spacing={3}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={4}
                  alignItems={{ xs: "stretch", sm: "flex-end" }}
                  sx={{ flexWrap: { sm: "wrap" }, rowGap: 1 }}
                >
                  <StyledTextField
                    variant="standard"
                    size="small"
                    required
                    label="Pro"
                    value={parcelForm.proNumber}
                    onChange={(event) =>
                      handleParcelFormChange("proNumber", event.target.value)
                    }
                    disabled={isSearchDisabled}
                    error={Boolean(parcelErrors.proNumber)}
                    helperText={parcelErrors.proNumber || " "}
                    inputProps={{ maxLength: 100 }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            onClick={handleOpenParcelBarcodeScanner}
                            disabled={isSearchDisabled}
                            title="Scan QR or barcode"
                            sx={{ color: "#A22", p: 0.5 }}
                          >
                            <Iconify icon="mdi:camera" width={18} />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{ minWidth: 220 }}
                  />
                  <Autocomplete
                    disabled={isSearchDisabled}
                    options={parcelCarrierDropdown.data}
                    value={parcelForm.carrier}
                    getOptionLabel={getCarrierOptionLabel}
                    isOptionEqualToValue={(option, value) =>
                      option.carrierId === value.carrierId ||
                      option.carrierName === value.carrierName
                    }
                    onChange={(event, newValue) => {
                      isSelectingParcelCarrierRef.current = true;
                      handleParcelFormChange("carrier", newValue);
                      setParcelCarrierSearchValue("");
                      if (!newValue) {
                        dispatch(searchParcelCarriers(""));
                      }
                    }}
                    onInputChange={(event, newInputValue, reason) => {
                      if (reason !== "reset") {
                        setParcelCarrierSearchValue(newInputValue);
                        if (!newInputValue || !newInputValue.trim()) {
                          dispatch(searchParcelCarriers(""));
                        }
                      }
                    }}
                    loading={parcelCarrierDropdown.loading}
                    loadingText="Searching carriers..."
                    noOptionsText={
                      parcelCarrierSearchValue
                        ? "No carriers found"
                        : "Type to search for carriers"
                    }
                    clearIcon={
                      parcelCarrierSearchValue ? (
                        <CloseIcon fontSize="small" />
                      ) : null
                    }
                    sx={{ minWidth: 220 }}
                    renderInput={(params) => (
                      <StyledTextField
                        {...params}
                        variant="standard"
                        size="small"
                        required
                        label="Select Carrier"
                        error={Boolean(parcelErrors.carrier)}
                        helperText={parcelErrors.carrier || " "}
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {parcelCarrierDropdown.loading ? (
                                <CircularProgress color="inherit" size={16} />
                              ) : null}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                  />
                  <Autocomplete
                    disabled={isSearchDisabled}
                    options={customerOptions}
                    value={parcelForm.customer}
                    getOptionLabel={getCustomerOptionLabel}
                    isOptionEqualToValue={(option, value) =>
                      option.customerId === value.customerId &&
                      option.stationId === value.stationId
                    }
                    onChange={(event, newValue) => {
                      isSelectingParcelCustomerRef.current = true;
                      handleParcelFormChange("customer", newValue);
                      setParcelCustomerSearchValue("");
                      if (!newValue) {
                        dispatch(searchCustomers(""));
                      }
                    }}
                    onInputChange={(event, newInputValue, reason) => {
                      if (reason !== "reset") {
                        setParcelCustomerSearchValue(newInputValue);
                        if (!newInputValue || !newInputValue.trim()) {
                          dispatch(searchCustomers(""));
                        }
                      }
                    }}
                    loading={customerLoading}
                    loadingText="Searching customers..."
                    noOptionsText={
                      parcelCustomerSearchValue
                        ? "No customers found"
                        : "Type to search for customers"
                    }
                    clearIcon={
                      parcelCustomerSearchValue ? (
                        <CloseIcon fontSize="small" />
                      ) : null
                    }
                    sx={{ minWidth: 220 }}
                    renderInput={(params) => (
                      <StyledTextField
                        {...params}
                        variant="standard"
                        size="small"
                        required
                        label="Select Customer"
                        error={Boolean(parcelErrors.customer)}
                        helperText={parcelErrors.customer || " "}
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {customerLoading ? (
                                <CircularProgress color="inherit" size={16} />
                              ) : null}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                  />
                  <StyledTextField
                    variant="standard"
                    size="small"
                    required
                    label="Shipper"
                    value={parcelForm.shipper}
                    onChange={(event) =>
                      handleParcelFormChange("shipper", event.target.value)
                    }
                    disabled={isSearchDisabled}
                    error={Boolean(parcelErrors.shipper)}
                    helperText={parcelErrors.shipper || " "}
                    sx={{ minWidth: 220 }}
                  />
                </Stack>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={4}
                  alignItems={{ xs: "stretch", sm: "flex-end" }}
                  sx={{ flexWrap: { sm: "wrap" }, rowGap: 1 }}
                >
                  {[
                    { field: "driverName", label: "Driver Name" },
                    { field: "pieces", label: "Pieces" },
                    { field: "weight", label: "Weight" },
                  ].map(({ field, label }) => (
                    <StyledTextField
                      key={field}
                      variant="standard"
                      size="small"
                      required
                      label={label}
                      value={parcelForm[field]}
                      onChange={(event) =>
                        handleParcelFormChange(field, event.target.value)
                      }
                      disabled={isSearchDisabled}
                      error={Boolean(parcelErrors[field])}
                      helperText={parcelErrors[field] || " "}
                      sx={{ minWidth: 220 }}
                    />
                  ))}
                </Stack>
                <Box>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleParcelSubmit}
                    disabled={isSearchDisabled}
                    sx={{ ...actionBtnSx, minWidth: 76 }}
                  >
                    Submit
                  </Button>
                </Box>
              </Stack>
            ) : (
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                alignItems="flex-end"
              >
                {searchType !== "rmDriver" && (
                  <Stack spacing={0.5} sx={{ minWidth: 160 }}>
                    <Typography sx={{ fontSize: 12, color: "#555" }}>
                      Search By <span style={{ color: "red" }}>*</span>
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
                        <MenuItem key={opt} value={opt}>
                          {opt}
                        </MenuItem>
                      ))}
                    </StyledTextField>
                  </Stack>
                )}

                <StyledTextField
                  variant="standard"
                  size="small"
                  required
                  label={searchType === "rmDriver" ? "Pro" : searchBy}
                  value={searchValue}
                  onChange={(e) => handleSearchValueChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSearch();
                    }
                  }}
                  disabled={isSearchDisabled}
                  inputProps={{ maxLength: 100 }}
                  InputProps={
                    searchType !== "rmDriver" && searchBy === "ID"
                      ? {
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                size="small"
                                onClick={handleOpenSearchIdBarcodeScanner}
                                disabled={isSearchDisabled}
                                title="Scan QR or barcode"
                                sx={{ color: "#A22", p: 0.5 }}
                              >
                                <Iconify icon="mdi:camera" width={18} />
                              </IconButton>
                            </InputAdornment>
                          ),
                        }
                      : undefined
                  }
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
            )}
          </fieldset>

          {/* Results */}
          {warehouseReceiptSearch.loading && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
              <CircularProgress size={40} />
            </Box>
          )}

          {warehouseReceiptSearch.error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {warehouseReceiptSearch.error}
            </Alert>
          )}

          {!warehouseReceiptSearch.loading &&
            warehouseReceiptSearch.found &&
            warehouseReceiptSearch.data && (
              <Box>
                {!warehouseReceiptSearch.data.rows ||
                warehouseReceiptSearch.data.rows.length === 0 ? null : (
                  <Box
                    sx={{
                      border: "1px solid #ddd",
                      borderRadius: 1,
                      overflow: "hidden",
                    }}
                  >
                    {/* Group header */}
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      sx={{
                        bgcolor: "#c8c8c8",
                        px: 2,
                        py: 1,
                        cursor: "pointer",
                      }}
                      onClick={() =>
                        toggleCollapse(warehouseReceiptSearch.data.proNumber)
                      }
                    >
                      <Typography sx={{ fontWeight: 700, fontSize: 14 }}>
                        {warehouseReceiptSearch.data.proNumber}
                      </Typography>
                      <IconButton size="small">
                        <Iconify
                          icon={
                            collapsed[warehouseReceiptSearch.data.proNumber]
                              ? "eva:arrow-ios-forward-fill"
                              : "eva:arrow-ios-downward-fill"
                          }
                          width={20}
                        />
                      </IconButton>
                    </Stack>

                    {/* Table */}
                    <Collapse
                      in={!collapsed[warehouseReceiptSearch.data.proNumber]}
                      timeout="auto"
                    >
                      <DataGrid
                        rows={
                          warehouseReceiptSearch.data.rows?.filter(
                            (row) => !rejectedRowIds.includes(row.id),
                          ) || []
                        }
                        columns={columns}
                        autoHeight
                        disableRowSelectionOnClick
                        disableColumnFilter
                        hideFooter
                        sx={{
                          border: "none",
                          "& .MuiDataGrid-columnHeaders": {
                            bgcolor: "#f5f5f5",
                          },
                          "& .MuiDataGrid-row:nth-of-type(even)": {
                            bgcolor: "#fafafa",
                          },
                        }}
                      />
                    </Collapse>
                  </Box>
                )}
              </Box>
            )}
          {/* ── Proceeded Receipt Sections ───────────────────────────────── */}
          {proceededReceipts.map((pr) => (
            <Box
              key={pr.key}
              sx={{
                border: "1px solid #ddd",
                borderRadius: 1,
                overflow: "hidden",
              }}
            >
              {/* Section header */}
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ bgcolor: "#c8c8c8", px: 2, py: 1 }}
              >
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography sx={{ fontWeight: 700, fontSize: 14 }}>
                    {pr.proNumber}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => handleOpenMailList(pr)}
                    sx={{
                      color: mailAlertReceiptKey === pr.key ? "#f59e0b" : "#A22",
                      p: 0.25,
                      bgcolor:
                        mailAlertReceiptKey === pr.key
                          ? "rgba(245, 158, 11, 0.16)"
                          : "transparent",
                      border:
                        mailAlertReceiptKey === pr.key
                          ? "1px solid #f59e0b"
                          : "1px solid transparent",
                      "&:hover": {
                        bgcolor:
                          mailAlertReceiptKey === pr.key
                            ? "rgba(245, 158, 11, 0.24)"
                            : "rgba(162, 34, 34, 0.08)",
                      },
                    }}
                  >
                    <Iconify icon="mdi:email-outline" width={20} />
                  </IconButton>
                </Stack>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => requestResetReceipt(pr.key)}
                    sx={actionBtnSx}
                  >
                    Reset
                  </Button>
                  <IconButton
                    size="small"
                    onClick={() =>
                      updateReceipt(pr.key, (p) => ({
                        sectionCollapsed: !p.sectionCollapsed,
                      }))
                    }
                  >
                    <Iconify
                      icon={
                        pr.sectionCollapsed
                          ? "eva:arrow-ios-forward-fill"
                          : "eva:arrow-ios-downward-fill"
                      }
                      width={20}
                    />
                  </IconButton>
                </Stack>
              </Stack>

              <Collapse in={!pr.sectionCollapsed} timeout="auto">
                <Box>
                  {/* Selected row mini-table */}
                  <Box sx={{ borderBottom: "1px solid #e0e0e0" }}>
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "80px 1fr 1fr 2fr",
                        bgcolor: "#f5f5f5",
                        px: 2,
                        py: 1,
                        borderBottom: "1px solid #e0e0e0",
                      }}
                    >
                      {[
                        "SNo \u21C5",
                        "Receipt Number \u21C5",
                        "Carrier \u21C5",
                        "Customer \u21C5",
                      ].map((h) => (
                        <Typography
                          key={h}
                          sx={{ fontSize: 12, fontWeight: 600, color: "#444" }}
                        >
                          {h}
                        </Typography>
                      ))}
                    </Box>
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "80px 1fr 1fr 2fr",
                        px: 2,
                        py: 1.5,
                        alignItems: "center",
                      }}
                    >
                      <Typography sx={{ fontSize: 13 }}>
                        {pr.row.sno}
                      </Typography>
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                          {pr.row.receiptNumber}
                        </Typography>
                        <Iconify
                          icon="eva:checkmark-circle-2-fill"
                          width={18}
                          sx={{ color: "#2e7d32" }}
                        />
                      </Stack>
                      <Typography sx={{ fontSize: 13 }}>
                        {pr.row.carrier}
                      </Typography>
                      <Typography sx={{ fontSize: 13 }}>
                        {pr.row.customer}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Location & Receiver */}
                  <Box sx={{ p: 2 }}>
                    <fieldset
                      style={{
                        borderColor: "#b0b0b0",
                        borderRadius: "8px",
                        padding: "16px",
                      }}
                    >
                      <legend>
                        <Typography
                          variant="subtitle2"
                          sx={{ fontWeight: 600, px: 1 }}
                        >
                          Location &amp; Receiver
                        </Typography>
                      </legend>
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={3}
                      >
                        <Stack spacing={0.5} sx={{ minWidth: 200 }}>
                          <Typography sx={{ fontSize: 12, color: "#555" }}>
                            Received By <span style={{ color: "red" }}>*</span>
                          </Typography>
                          <StyledTextField
                            variant="standard"
                            size="small"
                            value={pr.receivedBy}
                            onChange={(e) => {
                              const nextReceivedBy = e.target.value.slice(
                                0,
                                100,
                              );
                              updateReceipt(pr.key, () => ({
                                receivedBy: nextReceivedBy,
                              }));
                              if (nextReceivedBy.trim()) {
                                setReceiptErrors((prev) => ({
                                  ...prev,
                                  [pr.key]: { ...prev[pr.key], receivedBy: "" },
                                }));
                              }
                            }}
                            error={!!receiptErrors[pr.key]?.receivedBy}
                            helperText={
                              receiptErrors[pr.key]?.receivedBy || " "
                            }
                            inputProps={{ maxLength: 100 }}
                            sx={{ minWidth: 200 }}
                          />
                        </Stack>
                        <Stack spacing={0.5} sx={{ minWidth: 200 }}>
                          <Typography sx={{ fontSize: 12, color: "#555" }}>
                            Location <span style={{ color: "red" }}>*</span>
                          </Typography>
                          <StyledTextField
                            variant="standard"
                            size="small"
                            value={pr.location}
                            onChange={(e) => {
                              updateReceipt(pr.key, () => ({
                                location: e.target.value,
                              }));
                              if (e.target.value.trim()) {
                                setReceiptErrors((prev) => ({
                                  ...prev,
                                  [pr.key]: { ...prev[pr.key], location: "" },
                                }));
                              }
                            }}
                            error={!!receiptErrors[pr.key]?.location}
                            helperText={receiptErrors[pr.key]?.location || " "}
                            sx={{ minWidth: 200 }}
                          />
                        </Stack>
                      </Stack>
                    </fieldset>
                  </Box>

                  {/* Freight Information */}
                  <Box sx={{ px: 2, pb: 2 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 1.5 }}>
                      Freight Information
                    </Typography>

                    <Stack spacing={2}>
                      {pr.forms.map((form, fIdx) => (
                        <fieldset
                          key={form.id}
                          style={{
                            borderColor: "#b0b0b0",
                            borderRadius: "8px",
                            padding: "16px",
                          }}
                        >
                          <legend>
                            <Stack
                              direction="row"
                              alignItems="center"
                              spacing={0.5}
                            >
                              <Typography
                                variant="subtitle2"
                                sx={{ fontWeight: 600, px: 1 }}
                              >
                                New Form {fIdx + 1} -{" "}
                                {form.receiptNumber || pr.row.receiptNumber}
                              </Typography>
                              <IconButton
                                size="small"
                                onClick={() =>
                                  toggleFormCollapse(pr.key, form.id)
                                }
                                sx={{ p: 0.3 }}
                              >
                                <Iconify
                                  icon={
                                    form.collapsed
                                      ? "eva:arrow-ios-forward-fill"
                                      : "eva:arrow-ios-downward-fill"
                                  }
                                  width={16}
                                />
                              </IconButton>
                              {pr.forms.length > 1 && (
                                <IconButton
                                  size="small"
                                  onClick={() => removeForm(pr.key, form.id)}
                                  sx={{ p: 0.3, color: "#A22" }}
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
                                  direction={{ xs: "column", md: "row" }}
                                  spacing={2}
                                  alignItems={{ xs: "stretch", md: "flex-end" }}
                                  justifyContent="space-between"
                                >
                                  <Stack
                                    direction={{ xs: "column", sm: "row" }}
                                    spacing={3}
                                    sx={{ flex: 1, minWidth: 0 }}
                                  >
                                    <Stack
                                      spacing={0.3}
                                      sx={{
                                        width: { xs: "100%", sm: 260 },
                                        minWidth: 0,
                                      }}
                                    >
                                      <Typography
                                        sx={{ fontSize: 11, color: "#555" }}
                                      >
                                        Destination{" "}
                                        <span style={{ color: "red" }}>*</span>
                                      </Typography>
                                      <StyledTextField
                                        variant="standard"
                                        size="small"
                                        value={form.destination || ""}
                                        onChange={(e) => {
                                          updateFormField(
                                            pr.key,
                                            form.id,
                                            "destination",
                                            e.target.value,
                                          );
                                          clearFormFieldError(
                                            pr.key,
                                            form.id,
                                            "destination",
                                            e.target.value,
                                          );
                                        }}
                                        error={
                                          !!receiptErrors[pr.key]?.formFields?.[
                                            getFormErrorKey(
                                              form.id,
                                              "destination",
                                            )
                                          ]
                                        }
                                        helperText={
                                          receiptErrors[pr.key]?.formFields?.[
                                            getFormErrorKey(
                                              form.id,
                                              "destination",
                                            )
                                          ] || " "
                                        }
                                        inputProps={{ style: { fontSize: 13 } }}
                                      />
                                    </Stack>
                                    <Stack
                                      spacing={0.3}
                                      sx={{
                                        width: { xs: "100%", sm: 260 },
                                        minWidth: 0,
                                      }}
                                    >
                                      <Typography
                                        sx={{ fontSize: 11, color: "#555" }}
                                      >
                                        Package ID
                                      </Typography>
                                      <StyledTextField
                                        variant="standard"
                                        size="small"
                                        value={
                                          form.customerRefNoPackageId || ""
                                        }
                                        onChange={(e) => {
                                          updateFormField(
                                            pr.key,
                                            form.id,
                                            "customerRefNoPackageId",
                                            e.target.value,
                                          );
                                          clearFormFieldError(
                                            pr.key,
                                            form.id,
                                            "customerRefNoPackageId",
                                            e.target.value,
                                          );
                                        }}
                                        helperText=" "
                                        InputProps={{
                                          endAdornment: (
                                            <InputAdornment position="end">
                                              <IconButton
                                                size="small"
                                                onClick={() =>
                                                  handleOpenPackageIdBarcodeScanner(
                                                    pr.key,
                                                    form.id,
                                                  )
                                                }
                                                title="Scan QR or barcode"
                                                sx={{ color: "#A22", p: 0.5 }}
                                              >
                                                <Iconify
                                                  icon="mdi:camera"
                                                  width={18}
                                                />
                                              </IconButton>
                                            </InputAdornment>
                                          ),
                                        }}
                                        inputProps={{ style: { fontSize: 13 } }}
                                      />
                                    </Stack>
                                  </Stack>
                                  {isTrailerFormReadyForPrint(form) && (
                                    <Button
                                      variant="contained"
                                      size="small"
                                      startIcon={
                                        <Iconify
                                          icon="mdi:printer"
                                          width={16}
                                        />
                                      }
                                      onClick={() =>
                                        handleOpenPrinterDialog(pr, form)
                                      }
                                      sx={{
                                        ...actionBtnSx,
                                        minWidth: 76,
                                        alignSelf: {
                                          xs: "flex-end",
                                          md: "flex-start",
                                        },
                                      }}
                                    >
                                      Print
                                    </Button>
                                  )}
                                </Stack>
                              )}
                              {form.items.map((item, iIdx) => {
                                const isCargoApiProcessing =
                                  !!cargoApiLoadingItems[
                                    getCargoApiLoadingKey(
                                      pr.key,
                                      form.id,
                                      item.id,
                                    )
                                  ];

                                return (
                                  <Stack
                                    key={item.id}
                                    direction="row"
                                    spacing={1.5}
                                    alignItems="flex-start"
                                    sx={{
                                      width: "100%",
                                      flexWrap: { xs: "wrap", lg: "nowrap" },
                                      rowGap: 1,
                                    }}
                                  >
                                    {/* Box icon + label */}
                                    <Stack
                                      direction="row"
                                      alignItems="center"
                                      spacing={0.5}
                                      sx={{ minWidth: 64, pt: "22px" }}
                                    >
                                      <Iconify
                                        icon="mdi:package-variant-closed"
                                        width={22}
                                        sx={{ color: "#555" }}
                                      />
                                      <Typography
                                        sx={{
                                          fontSize: 12,
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        Item {iIdx + 1}
                                      </Typography>
                                    </Stack>

                                    {/* Pieces */}
                                    <Stack
                                      spacing={0.3}
                                      sx={{ flex: 1, minWidth: 80 }}
                                    >
                                      <Typography
                                        sx={{ fontSize: 11, color: "#555" }}
                                      >
                                        Pieces{" "}
                                        <span style={{ color: "red" }}>*</span>
                                      </Typography>
                                      <StyledTextField
                                        variant="standard"
                                        size="small"
                                        value={item.pieces}
                                        onChange={(e) => {
                                          const nextPieces = e.target.value
                                            .replace(/\D/g, "")
                                            .slice(0, 5);
                                          updateItem(
                                            pr.key,
                                            form.id,
                                            item.id,
                                            "pieces",
                                            nextPieces,
                                          );
                                          clearItemError(
                                            pr.key,
                                            form.id,
                                            item.id,
                                            "pieces",
                                            nextPieces,
                                          );
                                        }}
                                        error={
                                          !!receiptErrors[pr.key]?.items?.[
                                            getItemErrorKey(
                                              form.id,
                                              item.id,
                                              "pieces",
                                            )
                                          ]
                                        }
                                        helperText={
                                          receiptErrors[pr.key]?.items?.[
                                            getItemErrorKey(
                                              form.id,
                                              item.id,
                                              "pieces",
                                            )
                                          ] || " "
                                        }
                                        inputProps={{
                                          inputMode: "numeric",
                                          pattern: "[0-9]*",
                                          style: { fontSize: 13 },
                                        }}
                                      />
                                    </Stack>

                                    {/* Type dropdown */}
                                    <Stack
                                      spacing={0.3}
                                      sx={{ flex: 1.3, minWidth: 100 }}
                                    >
                                      <Typography
                                        sx={{ fontSize: 11, color: "#555" }}
                                      >
                                        Type{" "}
                                        <span style={{ color: "red" }}>*</span>
                                      </Typography>
                                      <StyledTextField
                                        select
                                        variant="standard"
                                        size="small"
                                        value={item.type}
                                        onChange={(e) => {
                                          updateItem(
                                            pr.key,
                                            form.id,
                                            item.id,
                                            "type",
                                            e.target.value,
                                          );
                                          clearItemError(
                                            pr.key,
                                            form.id,
                                            item.id,
                                            "type",
                                            e.target.value,
                                          );
                                        }}
                                        error={
                                          !!receiptErrors[pr.key]?.items?.[
                                            getItemErrorKey(
                                              form.id,
                                              item.id,
                                              "type",
                                            )
                                          ]
                                        }
                                        helperText={
                                          receiptErrors[pr.key]?.items?.[
                                            getItemErrorKey(
                                              form.id,
                                              item.id,
                                              "type",
                                            )
                                          ] || " "
                                        }
                                        inputProps={{ style: { fontSize: 13 } }}
                                        SelectProps={{
                                          sx: {
                                            "& .MuiSelect-select.MuiInputBase-input.MuiInput-input":
                                              {
                                                pt: 0,
                                                pb: "3px",
                                                minHeight: "1.4375em",
                                                lineHeight: "1.4375em",
                                              },
                                            "& .MuiSelect-icon": {
                                              top: "calc(50% - 0.7em)",
                                            },
                                          },
                                        }}
                                        sx={{
                                          "& .MuiInputBase-root": {
                                            alignItems: "flex-start",
                                          },
                                        }}
                                      >
                                        {FREIGHT_TYPE_OPTIONS.map((opt) => (
                                          <MenuItem key={opt} value={opt}>
                                            {opt}
                                          </MenuItem>
                                        ))}
                                      </StyledTextField>
                                    </Stack>

                                {/* Length, Width, Height, Weight */}
                                {[
                                  { label: 'Length (in)', field: 'length' },
                                  { label: 'Width (in)', field: 'width' },
                                  { label: 'Height (in)', field: 'height' },
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
                                      inputProps={{ inputMode: 'decimal', style: { fontSize: 13 } }}
                                    />
                                  </Stack>
                                ))}

                                    {/* Action icons */}
                                    <Stack
                                      direction="row"
                                      spacing={0.7}
                                      alignItems="center"
                                      sx={{
                                        pt: "19px",
                                        width: { xs: "100%", lg: "auto" },
                                        ml: { xs: 0, lg: 0 },
                                        justifyContent: "flex-end",
                                      }}
                                    >
                                      <IconButton
                                        size="small"
                                        onClick={() =>
                                          removeItem(pr.key, form.id, item.id)
                                        }
                                        title="Delete item"
                                        sx={{ p: 0.4 }}
                                      >
                                        <Iconify
                                          icon="mdi:trash-can"
                                          width={24}
                                          sx={{ color: "#000" }}
                                        />
                                      </IconButton>
                                      <IconButton
                                        size="small"
                                        title="Package details"
                                        onClick={(event) =>
                                          handlePackageDetailsClick(
                                            event,
                                            pr.key,
                                            form.id,
                                            item.id,
                                          )
                                        }
                                        disabled={isCargoApiProcessing}
                                        sx={{ p: 0.4 }}
                                      >
                                        <Iconify
                                          icon="mdi:cube"
                                          width={28}
                                          sx={{
                                            color: isCargoApiProcessing
                                              ? "#9e9e9e"
                                              : "#000",
                                          }}
                                        />
                                      </IconButton>
                                      <IconButton
                                        size="small"
                                        title="Upload image"
                                        onClick={() =>
                                          handleOpenImageUpload(
                                            pr.key,
                                            form.id,
                                            item.id,
                                            item.images || [],
                                          )
                                        }
                                        disabled={isCargoApiProcessing}
                                        sx={{ p: 0.4 }}
                                      >
                                        {isCargoApiProcessing ? (
                                          <CircularProgress
                                            size={22}
                                            sx={{ color: "#A22" }}
                                          />
                                        ) : (
                                          <Iconify
                                            icon="mdi:image-plus"
                                            width={28}
                                            sx={{ color: "#000" }}
                                          />
                                        )}
                                      </IconButton>
                                      {(item.images?.length || 0) > 0 && (
                                        <IconButton
                                          size="small"
                                          title="View images"
                                          onClick={() =>
                                            handleOpenImagePreview(
                                              item.images || [],
                                              `Item ${String(iIdx + 1).padStart(2, "0")}`,
                                              {
                                                key: pr.key,
                                                formId: form.id,
                                                itemId: item.id,
                                              },
                                            )
                                          }
                                          sx={{ p: 0.4, position: "relative" }}
                                        >
                                          <Iconify
                                            icon="mdi:image-multiple"
                                            width={30}
                                            sx={{ color: "#000" }}
                                          />
                                          <Box
                                            sx={{
                                              position: "absolute",
                                              top: -5,
                                              right: -3,
                                              width: 22,
                                              height: 22,
                                              borderRadius: "50%",
                                              bgcolor: "#102a63",
                                              color: "#fff",
                                              display: "flex",
                                              alignItems: "center",
                                              justifyContent: "center",
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
                                    {isCargoApiProcessing && (
                                      <Stack
                                        direction="row"
                                        spacing={0.8}
                                        alignItems="center"
                                        sx={{
                                          minWidth: 150,
                                          pt: "23px",
                                          color: "#A22",
                                        }}
                                      >
                                        <Typography
                                          sx={{
                                            fontSize: 12,
                                            fontWeight: 600,
                                            whiteSpace: "nowrap",
                                          }}
                                        >
                                          Cargo API processing...
                                        </Typography>
                                      </Stack>
                                    )}
                                  </Stack>
                                );
                              })}

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

                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "flex-end",
                        mt: 2,
                      }}
                    >
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => addForm(pr.key)}
                        disabled={!!tempReceiptLoading[pr.key]}
                        sx={{ ...actionBtnSx, minWidth: 110, height: 32 }}
                      >
                        {tempReceiptLoading[pr.key] ? (
                          <>
                            <CircularProgress
                              size={14}
                              sx={{ color: "white", mr: 1 }}
                            />
                            Adding...
                          </>
                        ) : (
                          "Add New Form"
                        )}
                      </Button>
                    </Box>
                  </Box>
                </Box>
              </Collapse>
            </Box>
          ))}
        </Stack>
      )}
      {/* Mail List Dialog */}
      <Dialog
        open={mailListDialog.open}
        onClose={handleCloseMailList}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            border: "3px solid #a22",
          },
        }}
      >
        <Box sx={{ p: 2, bgcolor: "#a22", color: "white", fontWeight: "bold" }}>
          Mail List
        </Box>
        <DialogContent sx={{ p: 2, height: 400 }}>
          {mailListDialog.emails.length > 0 ? (
            <DataGrid
              rows={mailListDialog.emails.map((email, index) => ({
                id: email.entryId,
                sno: String(index + 1).padStart(2, "0"),
                entryType: email.entryType || "",
                emailid: email.entryEmail,
                selected: mailListDialog.selectedEmails[email.entryId] || false,
              }))}
              columns={[
                {
                  field: "selected",
                  headerName: "",
                  width: 50,
                  sortable: false,
                  renderCell: (params) => (
                    <input
                      type="checkbox"
                      checked={params.row.selected}
                      onChange={() => handleEmailCheckboxChange(params.row.id)}
                      style={{ cursor: "pointer" }}
                    />
                  ),
                },
                {
                  field: "sno",
                  headerName: "SNO",
                  width: 80,
                  sortable: false,
                },
                {
                  field: "entryType",
                  headerName: "Type",
                  width: 100,
                  sortable: false,
                },
                {
                  field: "emailid",
                  headerName: "Email ID",
                  flex: 1,
                  sortable: false,
                },
              ]}
              hideFooter
              disableRowSelectionOnClick
              sx={{
                "& .MuiDataGrid-columnHeaders": {
                  bgcolor: "#f5f5f5",
                  borderBottom: "2px solid #e0e0e0",
                },
                "& .MuiDataGrid-cell": {
                  borderBottom: "1px solid #e0e0e0",
                },
              }}
            />
          ) : (
            <Typography variant="body2" sx={{ color: "#999", p: 2 }}>
              No emails available for this receipt
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button
            variant="outlined"
            onClick={handleCloseMailList}
            sx={{ color: "black", borderColor: "#ccc" }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleMailSubmit}
            sx={{ bgcolor: "#a22", "&:hover": { bgcolor: "#811" } }}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={emailSelectionAlertOpen}
        onClose={() => setEmailSelectionAlertOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>
          No Default Email Set
        </DialogTitle>
        <DialogContent dividers>
          <Typography sx={{ fontSize: 13 }}>
            This Customer does not have a default email address configured. Please select an email address from the list.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button
            variant="contained"
            onClick={() => setEmailSelectionAlertOpen(false)}
            sx={{ bgcolor: "#a22", "&:hover": { bgcolor: "#811" } }}
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Freight Dialog */}
      <Dialog
        open={rejectOpen}
        onClose={handleRejectClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16, pr: 5 }}>
          Reject Freight
          <IconButton
            onClick={handleRejectClose}
            size="small"
            sx={{ position: "absolute", right: 12, top: 12 }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Typography sx={{ fontSize: 13, mb: 1 }}>
            Reason for Rejection <span style={{ color: "red" }}>*</span>
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
            sx={{ textTransform: "none", color: "#333", borderColor: "#aaa" }}
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
                <CircularProgress size={16} sx={{ color: "white", mr: 1 }} />
                Rejecting...
              </>
            ) : (
              "Reject"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(resetReceiptDialog)}
        onClose={handleCancelResetReceipt}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>
          Reset Receipt
        </DialogTitle>
        <DialogContent dividers>
          <Typography sx={{ fontSize: 13 }}>
            Are you sure you want to reset?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={handleCancelResetReceipt}
            sx={{ textTransform: "none", color: "#333", borderColor: "#aaa" }}
          >
            No
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={handleConfirmResetReceipt}
            sx={{ ...actionBtnSx, height: 32 }}
          >
            Yes
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={commonFieldsConfirm.open}
        onClose={handleCancelCommonFieldsConfirm}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>
          Apply Common Changes
        </DialogTitle>
        <DialogContent dividers>
          <Typography sx={{ fontSize: 13 }}>
            Do you want the Received By or Location changes to apply to all
            forms?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={handleCancelCommonFieldsConfirm}
            sx={{ textTransform: "none", color: "#333", borderColor: "#aaa" }}
          >
            No
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={handleConfirmCommonFieldsApplyAll}
            sx={{ ...actionBtnSx, height: 32 }}
          >
            Yes
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={regularMobileSubmitConfirmOpen}
        onClose={() => setRegularMobileSubmitConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>
          Submit Warehouse Check-In
        </DialogTitle>
        <DialogContent dividers>
          <Typography sx={{ fontSize: 13 }}>
            Are you sure you want to submit?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setRegularMobileSubmitConfirmOpen(false)}
            sx={{ textTransform: "none", color: "#333", borderColor: "#aaa" }}
          >
            No
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={handleRegularMobileSubmit}
            sx={{ ...actionBtnSx, height: 32 }}
          >
            Yes
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={mobileRegularSuccessDialog.open} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>
          Success
        </DialogTitle>
        <DialogContent dividers>
          <Typography sx={{ fontSize: 14 }}>
            {mobileRegularSuccessDialog.message}
          </Typography>
          {mobileRegularSuccessDialog.entries.length > 0 && (
            <Stack spacing={1} sx={{ mt: 2 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                Verification IDs
              </Typography>
              {mobileRegularSuccessDialog.entries.map((entry) => (
                <Stack
                  key={`${entry.label}-${entry.receiptNumber}`}
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  spacing={2}
                  sx={{
                    border: "1px solid #e2e2e2",
                    borderRadius: 1,
                    px: 1.2,
                    py: 0.8,
                  }}
                >
                  <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                    {entry.label}
                  </Typography>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<Iconify icon="mdi:printer" width={16} />}
                    onClick={() => handleOpenMobileRegularPrintDialog(entry)}
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
            onClick={handleMobileRegularSuccessOk}
            sx={{ ...actionBtnSx, height: 32, minWidth: 70 }}
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={printerDialogOpen}
        onClose={handleClosePrinterDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16, pr: 5 }}>
          Select Printer
          <IconButton
            onClick={handleClosePrinterDialog}
            size="small"
            sx={{ position: "absolute", right: 12, top: 12 }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems={{ xs: "stretch", sm: "flex-end" }}
          >
            <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0, width: "100%" }}>
              <Typography sx={{ fontSize: 12, color: "#555" }}>
                Printer <span style={{ color: "red" }}>*</span>
              </Typography>
              <StyledTextField
                select
                size="small"
                value={selectedPrinterId}
                onChange={(event) => setSelectedPrinterId(event.target.value)}
                disabled={printersDropdown.loading || printLoading}
                helperText={printersDropdown.error || ""}
                error={Boolean(printersDropdown.error)}
                sx={{ width: "100%" }}
              >
                {printersDropdown.loading ? (
                  <MenuItem value="" disabled>
                    Loading printers...
                  </MenuItem>
                ) : printersDropdown.data.length > 0 ? (
                  printersDropdown.data.map((printer) => (
                    <MenuItem key={printer.printerId} value={printer.printerId}>
                      {printer.printerName}
                      {printer.printerIP ? ` - ${printer.printerIP}` : ""}
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
              disabled={
                printersDropdown.loading || printLoading || !selectedPrinterId
              }
              onClick={
                isMobileTrailerPrinterSubmit
                  ? handleTrailerMobilePrinterSubmit
                  : handlePrint
              }
              sx={{
                ...actionBtnSx,
                height: 36,
                minWidth: 82,
                mt: { xs: 0, sm: "21px" },
                alignSelf: { xs: "flex-end", sm: "auto" },
              }}
            >
              {printLoading ? "Printing..." : "Print"}
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>

      {/* No Data Dialog */}
      <Dialog
        open={noDataDialogOpen}
        onClose={() => {
          setNoDataDialogOpen(false);
          setNoDataSearchValue("");
          dispatch(clearReceiptSearch());
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16, pr: 5 }}>
          {searchType === "rmDriver" && warehouseReceiptSearch.error
            ? "Error"
            : "No Data Available"}
          <IconButton
            onClick={() => {
              setNoDataDialogOpen(false);
              setNoDataSearchValue("");
              dispatch(clearReceiptSearch());
            }}
            size="small"
            sx={{ position: "absolute", right: 12, top: 12 }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {searchType === "rmDriver" && warehouseReceiptSearch.error ? (
            <Typography sx={{ fontSize: 14 }}>
              {warehouseReceiptSearch.error}
            </Typography>
          ) : (
            <Typography sx={{ fontSize: 14 }}>
              No data available for {searchBy === "ID" ? "ID" : "PRO number"}{" "}
              <strong>
                {warehouseReceiptSearch.data?.proNumber ||
                  noDataSearchValue ||
                  searchValue}
              </strong>
              .
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button
            variant="contained"
            size="small"
            onClick={() => {
              setNoDataDialogOpen(false);
              setNoDataSearchValue("");
              dispatch(clearReceiptSearch());
            }}
            sx={{ ...actionBtnSx, height: 32 }}
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={imagePreviewDialog.open}
        onClose={handleCloseImagePreview}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16, pr: 5 }}>
          Uploaded Images - {imagePreviewDialog.itemLabel}
          <IconButton
            onClick={handleCloseImagePreview}
            size="small"
            sx={{ position: "absolute", right: 12, top: 12 }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {imagePreviewDialog.images.length === 0 ? (
            <Typography sx={{ fontSize: 13 }}>
              No uploaded images available.
            </Typography>
          ) : (
            <Stack direction="row" flexWrap="wrap" gap={2}>
              {imagePreviewDialog.images.map((file, index) => {
                const imageUrl = getImageUrl(file);

                return (
                  <Stack
                    key={`${getImageName(file, index)}-${index}`}
                    spacing={0.7}
                    sx={{ width: 170 }}
                  >
                    <Box
                      sx={{
                        position: "relative",
                        width: 170,
                        height: 130,
                        border: "1px solid #d0d0d0",
                        borderRadius: 1,
                        overflow: "hidden",
                        bgcolor: "#f7f7f7",
                      }}
                    >
                      {imageUrl ? (
                        <Box
                          component="img"
                          src={imageUrl}
                          alt={getImageName(file, index)}
                          onClick={() =>
                            handleOpenFullImage(file, getImageName(file, index))
                          }
                          sx={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            cursor: "zoom-in",
                          }}
                        />
                      ) : (
                        <Stack
                          alignItems="center"
                          justifyContent="center"
                          sx={{ height: "100%", opacity: 0.5 }}
                        >
                          <Iconify icon="mdi:image-off" width={28} />
                        </Stack>
                      )}
                      <IconButton
                        size="small"
                        title="Remove image"
                        onClick={() => handleRemovePreviewImage(index)}
                        sx={{
                          position: "absolute",
                          top: 4,
                          right: 4,
                          bgcolor: "rgba(255,255,255,0.9)",
                          color: "#A22",
                          "&:hover": { bgcolor: "#fff" },
                        }}
                      >
                        <Iconify icon="mdi:close-circle" width={18} />
                      </IconButton>
                    </Box>
                    <Typography sx={{ fontSize: 12, wordBreak: "break-word" }}>
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

      <Dialog
        open={fullImageDialog.open}
        onClose={handleCloseFullImage}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16, pr: 5 }}>
          {fullImageDialog.title || "Image Preview"}
          <IconButton
            onClick={handleCloseFullImage}
            size="small"
            sx={{ position: "absolute", right: 12, top: 12 }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ bgcolor: "#111", p: 2 }}>
          {getImageUrl(fullImageDialog.image) ? (
            <Box
              component="img"
              src={getImageUrl(fullImageDialog.image)}
              alt={fullImageDialog.title || "Image Preview"}
              sx={{
                display: "block",
                maxWidth: "100%",
                maxHeight: "75vh",
                mx: "auto",
                objectFit: "contain",
                bgcolor: "#fff",
              }}
            />
          ) : (
            <Stack
              alignItems="center"
              justifyContent="center"
              sx={{ minHeight: 320, color: "#fff" }}
              spacing={1}
            >
              <Iconify icon="mdi:image-off" width={32} />
              <Typography sx={{ fontSize: 13 }}>
                Image preview unavailable.
              </Typography>
            </Stack>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={barcodeScannerOpen}
        onClose={handleCloseParcelBarcodeScanner}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16, pr: 5 }}>
          {barcodeScannerTarget === "searchId"
            ? "Scan ID Barcode"
            : barcodeScannerTarget === "packageId"
              ? "Scan Package ID Barcode"
              : "Scan PRO Barcode"}
          <IconButton
            onClick={handleCloseParcelBarcodeScanner}
            size="small"
            sx={{ position: "absolute", right: 12, top: 12 }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5}>
            <Box
              sx={{
                position: "relative",
                bgcolor: "#000",
                borderRadius: 1,
                overflow: "hidden",
                minHeight: { xs: 320, sm: 460, md: 520 },
              }}
            >
              <Box
                component="video"
                ref={barcodeVideoRef} // Simplify down to a direct reference assignment
                autoPlay
                playsInline
                muted
                sx={{
                  width: "100%",
                  height: { xs: 320, sm: 460, md: 520 },
                  display: "block",
                  objectFit: "cover",
                }}
              />
              <Box
                sx={{
                  position: "absolute",
                  left: "6%",
                  right: "6%",
                  top: "24%",
                  height: "46%",
                  border: "2px solid #fff",
                  borderRadius: 1,
                  boxShadow: "0 0 0 999px rgba(0,0,0,0.28)",
                }}
              />
            </Box>
            <Typography sx={{ fontSize: 12, color: "#555" }}>
              {barcodeScannerStatus || "Point the camera at the QR or barcode"}
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={handleCloseParcelBarcodeScanner}
            sx={{ textTransform: "none", color: "#333", borderColor: "#aaa" }}
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Image Upload Dialog */}
      <Dialog
        open={uploadDialog.open}
        onClose={handleCloseImageUpload}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16, pr: 5 }}>
          {uploadDialog.mode === "view" ? "Uploaded Images" : "Image Upload"}
          <IconButton
            onClick={handleCloseImageUpload}
            size="small"
            sx={{ position: "absolute", right: 12, top: 12 }}
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
            style={{ display: "none" }}
            onChange={handleFileSelection}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: "none" }}
            onChange={handleFileSelection}
          />

          <Stack spacing={2}>
            {uploadDialog.mode !== "view" && (
              <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
                File Upload
              </Typography>
            )}
            <Stack
              direction={{ xs: "column", md: "row" }}
              sx={{ border: "1px dashed #a0a0a0", borderRadius: 2, p: 2 }}
            >
              {uploadDialog.mode !== "view" && (
                <Stack
                  sx={{
                    width: { xs: "100%", md: "50%" },
                    borderRight: { xs: "none", md: "1px solid #e0e0e0" },
                    borderBottom: { xs: "1px solid #e0e0e0", md: "none" },
                    pr: { xs: 0, md: 2 },
                    pb: { xs: 2, md: 0 },
                    mb: { xs: 2, md: 0 },
                    bgcolor: isDraggingFiles ? "#fff3f3" : "transparent",
                    borderRadius: 1,
                    transition: "background-color 0.2s ease",
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
                  <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
                    Drag & Drop File
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: "#777" }}>
                    File Supported: Image, JIF
                  </Typography>
                  <Typography sx={{ fontSize: 14, fontWeight: 600, my: 0.5 }}>
                    OR
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <IconButton
                      size="small"
                      onClick={handleCaptureImage}
                      title="Capture image"
                      sx={{
                        bgcolor: "#A22",
                        color: "#fff",
                        width: 32,
                        height: 32,
                        borderRadius: 1,
                        "&:hover": { bgcolor: "#8b1c1c" },
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

              <Stack
                sx={{
                  width:
                    uploadDialog.mode === "view"
                      ? "100%"
                      : { xs: "100%", md: "50%" },
                  pl: uploadDialog.mode === "view" ? 0 : { xs: 0, md: 2 },
                }}
              >
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ mb: 1 }}
                >
                  <Typography sx={{ fontWeight: 600, fontSize: 13 }}>
                    Uploaded Files
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: "#555" }}>
                    {stagedFiles.length} file(s)
                  </Typography>
                </Stack>
                <Divider sx={{ mb: 1 }} />

                {stagedFiles.length === 0 ? (
                  <Stack
                    alignItems="center"
                    justifyContent="center"
                    sx={{ minHeight: 140, opacity: 0.5 }}
                    spacing={1}
                  >
                    <Iconify icon="mdi:file-document-multiple" width={32} />
                    <Typography sx={{ fontSize: 12 }}>No Files</Typography>
                  </Stack>
                ) : (
                  <Box sx={{ maxHeight: 180, overflowY: "auto", pr: 1 }}>
                    {stagedFiles.map((file, idx) => (
                      <FileItem
                        key={`${getImageName(file, idx)}-${file.lastModified || idx}-${idx}`}
                        filename={getImageName(file, idx)}
                        onView={() => handleViewStagedFile(file, idx)}
                        onRemove={
                          uploadDialog.mode === "view"
                            ? undefined
                            : () => handleRemoveStagedFile(idx)
                        }
                        hideRemove={uploadDialog.mode === "view"}
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
            sx={{ textTransform: "none", color: "#333", borderColor: "#aaa" }}
          >
            Cancel
          </Button>
          {uploadDialog.mode !== "view" && (
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

      <Dialog
        open={cameraDialogOpen}
        onClose={handleCloseCamera}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16, pr: 5 }}>
          Capture Image
          <IconButton
            onClick={handleCloseCamera}
            size="small"
            sx={{ position: "absolute", right: 12, top: 12 }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box
            component="video"
            ref={(node) => {
              cameraVideoRef.current = node;
              if (
                node &&
                cameraStreamRef.current &&
                node.srcObject !== cameraStreamRef.current
              ) {
                node.srcObject = cameraStreamRef.current;
                node.play?.().catch(() => {});
              }
            }}
            autoPlay
            playsInline
            muted
            onLoadedMetadata={(event) =>
              event.currentTarget.play?.().catch(() => {})
            }
            onCanPlay={(event) => event.currentTarget.play?.().catch(() => {})}
            sx={{
              width: "100%",
              height: { xs: "60vh", md: "70vh" },
              minHeight: { xs: 360, md: 560 },
              maxHeight: 760,
              bgcolor: "#000",
              borderRadius: 1,
              objectFit: "contain",
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={handleCloseCamera}
            sx={{ textTransform: "none", color: "#333", borderColor: "#aaa" }}
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
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        transformOrigin={{ vertical: "top", horizontal: "center" }}
        PaperProps={{
          sx: {
            mt: 0.5,
            minWidth: 180,
            maxWidth: 260,
            maxHeight: 280,
            border: "1px solid #d9d9d9",
            boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
          },
        }}
      >
        {cargoApiDropdown.loading ? (
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{ px: 2, py: 1.5 }}
          >
            <CircularProgress size={16} />
            <Typography sx={{ fontSize: 12 }}>Loading...</Typography>
          </Stack>
        ) : cargoApiDropdown.error ? (
          <Typography
            sx={{ px: 2, py: 1.5, fontSize: 12, color: "error.main" }}
          >
            {cargoApiDropdown.error}
          </Typography>
        ) : cargoApiDropdown.data.length > 0 ? (
          <MenuList dense sx={{ py: 0.5 }}>
            {cargoApiDropdown.data.map((option, index) => (
              <MenuItem
                key={
                  option?.apiId ||
                  option?.id ||
                  option?.value ||
                  option?.code ||
                  index
                }
                onClick={() => handlePackageOptionSelect(option)}
                sx={{ fontSize: 12, minHeight: 30 }}
              >
                {getDropdownOptionLabel(option)}
              </MenuItem>
            ))}
          </MenuList>
        ) : (
          <Typography sx={{ px: 2, py: 1.5, fontSize: 12 }}>
            No package details available
          </Typography>
        )}
      </Popover>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </ShipmentFormLayout>
  );
}
