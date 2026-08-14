import { useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
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
  Typography,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import StyledTextField from '../../sections/shared/StyledTextField';
import Iconify from '../../components/iconify';
import { HEADER } from '../../config';

const scanActionBtnSx = {
  bgcolor: '#A22',
  color: '#fff',
  textTransform: 'none',
  minWidth: 58,
  height: 24,
  px: 1.2,
  fontSize: 11,
  '&:hover': { bgcolor: '#8b1c1c' },
};

const sectionSx = { bgcolor: '#fff', border: '1px solid #9d9d9d', borderRadius: 0.75, p: 1 };
const FREIGHT_BUTTON_OPTIONS = ['Banded Skid', 'Shrink Wrapped Skid', 'SHT / IPPC Skid', 'Plastic Skid', 'Document', 'Haz Mat', 'Bad Freight Condition'];
const mobileFieldSx = {
  '& .MuiInputBase-root': { color: '#000' },
  '& .MuiInputBase-input': { fontSize: 12, py: 0.2, color: '#000', WebkitTextFillColor: '#000' },
  '& .MuiFormHelperText-root': { display: 'none' },
};

const normalizeEmailList = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((email) => (typeof email === 'string' ? email : email?.entryEmail || email?.email || ''))
      .map((email) => String(email || '').trim())
      .filter(Boolean);
  }
  if (typeof value === 'string') return value.split(',').map((email) => email.trim()).filter(Boolean);
  return [];
};

const getUniqueEmailList = (emails) => {
  const seenEmails = new Set();

  return normalizeEmailList(emails).filter((email) => {
    const emailKey = email.toLowerCase();
    if (seenEmails.has(emailKey)) return false;
    seenEmails.add(emailKey);
    return true;
  });
};

const normalizeEmailRows = (emails) => {
  if (!Array.isArray(emails)) return [];

  return emails
    .map((email, index) => {
      if (typeof email === 'string') {
        return {
          entryId: `email_${index}_${email}`,
          entryType: 'Email',
          entryEmail: email,
        };
      }

      if (email && typeof email === 'object') {
        const entryEmail = email.entryEmail || email.email || '';

        return {
          entryId: email.entryId || `email_${index}_${entryEmail}`,
          entryType: email.entryType || email.type || 'Email',
          entryEmail,
        };
      }

      return null;
    })
    .filter((email) => email?.entryEmail);
};

const buildSelectedEmailMap = (emails = [], toEmails = []) => {
  const selectedEmailSet = new Set(normalizeEmailList(toEmails).map((email) => String(email).toLowerCase()));

  return emails.reduce((selectedMap, email) => {
    const emailAddress = String(email.entryEmail || '').trim().toLowerCase();

    if (emailAddress && selectedEmailSet.has(emailAddress)) {
      selectedMap[email.entryId] = true;
    }

    return selectedMap;
  }, {});
};

const getScanRowValue = (row = {}, fields = [], fallback = '-') => {
  const fieldList = Array.isArray(fields) ? fields : [fields];
  const value = fieldList.map((field) => row?.[field]).find((entry) => entry !== undefined && entry !== null && String(entry).trim() !== '');

  return value === undefined ? fallback : value;
};

const getScanReceiptNumber = (row = {}) =>
  getScanRowValue(row, ['receiptNumber', 'receiptNo', 'verificationId', 'proNumber']);

const getScanCarrier = (row = {}) =>
  getScanRowValue(row, ['carrier', 'carrierName']);

const getScanPieces = (row = {}) =>
  getScanRowValue(row, 'piecesInland');

const getScanCustomer = (row = {}) => {
  const customer = getScanRowValue(row, ['customer', 'customerName'], '');
  if (!customer) return '-';

  if (row.stationName && !String(customer).includes('|')) {
    return `${customer} | ${row.stationName}`;
  }

  return customer;
};

const getReceiptMailRows = (row = {}) => {
  const customerEmails = normalizeEmailRows(row.customerEmails || []);
  if (customerEmails.length) return customerEmails;

  return normalizeEmailRows(row.toEmails || []);
};

function ScanField({ label, value, onChange, required = false, error = false, select = false, children, ...rest }) {
  return (
    <Stack spacing={0.15} sx={{ minWidth: 0 }}>
      <Typography sx={{ fontSize: 11, color: '#333' }}>
        {label} {required && <Box component="span" sx={{ color: '#A22' }}>*</Box>}
      </Typography>
      <StyledTextField
        select={select}
        variant="standard"
        size="small"
        value={value || ''}
        onChange={onChange}
        error={Boolean(error)}
        sx={mobileFieldSx}
        {...rest}
      >
        {children}
      </StyledTextField>
    </Stack>
  );
}

function ScanAutocompleteField({
  label,
  value,
  options,
  loading,
  disabled = false,
  required = false,
  error = false,
  getOptionLabel,
  isOptionEqualToValue,
  onChange,
  onInputChange,
  noOptionsText,
}) {
  return (
    <Stack spacing={0.15} sx={{ minWidth: 0 }}>
      <Typography sx={{ fontSize: 11, color: '#333' }}>
        {label} {required && <Box component="span" sx={{ color: '#A22' }}>*</Box>}
      </Typography>
      <Autocomplete
        size="small"
        options={options}
        value={value || null}
        loading={loading}
        disabled={disabled}
        getOptionLabel={getOptionLabel}
        isOptionEqualToValue={isOptionEqualToValue}
        onChange={onChange}
        onInputChange={onInputChange}
        loadingText="Searching..."
        noOptionsText={noOptionsText}
        renderInput={(params) => (
          <StyledTextField
            {...params}
            variant="standard"
            size="small"
            error={Boolean(error)}
            sx={mobileFieldSx}
          />
        )}
      />
    </Stack>
  );
}

function ScanItem({
  item,
  itemIndex,
  receipt,
  form,
  receiptErrors,
  updateItem,
  clearItemError,
  removeItem,
  handlePackageDetailsClick,
  handleOpenImageUpload,
  handleOpenImagePreview,
  isCargoApiProcessing,
  freightTypeOptions,
}) {
  const getItemErrorKey = (field) => `${form.id}-${item.id}-${field}`;

  return (
    <Box sx={{ bgcolor: '#dff0fa', border: '1px solid #b8d2df', borderRadius: 0.75, p: 1 }}>
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" sx={{ mb: 0.75 }}>
        <Stack direction="row" alignItems="center" spacing={0.7} sx={{ minWidth: 0 }}>
          <Iconify icon="mdi:package-variant-closed" width={18} />
          <Stack spacing={0.1}>
            <Typography sx={{ fontSize: 12, fontWeight: 700 }}>Item {itemIndex + 1}</Typography>
            {item.freightBarcodeValue != null && (
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#A22', whiteSpace: 'nowrap' }}>
                {item.freightBarcodeValue}
              </Typography>
            )}
          </Stack>
          <Button
            size="small"
            variant="contained"
            onClick={(event) => handlePackageDetailsClick(event, receipt.key, form.id, item.id)}
            disabled={isCargoApiProcessing}
            sx={{
              ...scanActionBtnSx,
              alignSelf: 'flex-start',
              minWidth: 44,
              height: 24,
              px: 1,
            }}
          >
            DIMS
          </Button>
        </Stack>
        <Stack direction="row" spacing={0.5}>
          <IconButton size="small" onClick={() => handleOpenImageUpload(receipt.key, form.id, item.id, item.images || [])} disabled={isCargoApiProcessing} sx={{ bgcolor: '#A22', color: '#fff', borderRadius: 0.5, p: 0.45 }}>
            {isCargoApiProcessing ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <Iconify icon="mdi:image-plus" width={15} />}
          </IconButton>
          {(item.images?.length || 0) > 0 && (
            <IconButton size="small" onClick={() => handleOpenImagePreview(item.images || [], `Item ${String(itemIndex + 1).padStart(2, '0')}`, { key: receipt.key, formId: form.id, itemId: item.id })} sx={{ bgcolor: '#102a63', color: '#fff', borderRadius: 0.5, p: 0.45, position: 'relative' }}>
              <Iconify icon="mdi:image-multiple" width={15} />
              <Box
                sx={{
                  position: 'absolute',
                  top: -6,
                  right: -6,
                  minWidth: 16,
                  height: 16,
                  borderRadius: '50%',
                  bgcolor: '#A22',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  fontWeight: 700,
                  lineHeight: 1,
                }}
              >
                {item.images.length}
              </Box>
            </IconButton>
          )}
          <IconButton size="small" onClick={() => removeItem(receipt.key, form.id, item.id, itemIndex)} sx={{ bgcolor: '#c46b7a', color: '#fff', borderRadius: 0.5, p: 0.45 }}>
            <Iconify icon="mdi:trash-can" width={15} />
          </IconButton>
        </Stack>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
        <ScanField
          label="Type"
          required
          select
          value={item.type}
          error={receiptErrors[receipt.key]?.items?.[getItemErrorKey('type')]}
          onChange={(event) => {
            updateItem(receipt.key, form.id, item.id, 'type', event.target.value);
            clearItemError(receipt.key, form.id, item.id, 'type', event.target.value);
          }}
        >
          {freightTypeOptions.map((option) => (
            <MenuItem key={option} value={option}>{option}</MenuItem>
          ))}
        </ScanField>
        {[
          ['pieces', 'Pieces', false],
          ['length', 'Length (inches)', true],
          ['width', 'Width (inches)', true],
          ['height', 'Height (inches)', true],
          ['weight', 'Weight(lbs)', true],
        ].map(([field, label, isDecimal]) => (
          <ScanField
            key={field}
            label={label}
            required
            value={item[field]}
            error={receiptErrors[receipt.key]?.items?.[getItemErrorKey(field)]}
            onChange={(event) => {
              const nextValue = field === 'pieces'
                ? event.target.value.replace(/\D/g, '').slice(0, 5)
                : event.target.value;
              updateItem(receipt.key, form.id, item.id, field, nextValue);
              clearItemError(receipt.key, form.id, item.id, field, nextValue);
            }}
            inputProps={field === 'pieces'
              ? { inputMode: 'numeric', pattern: '[0-9]*' }
              : isDecimal ? { inputMode: 'decimal' } : undefined}
          />
        ))}
      </Box>
      {isCargoApiProcessing && <Typography sx={{ mt: 0.75, fontSize: 11, color: '#A22', fontWeight: 700 }}>Cargo API processing...</Typography>}
    </Box>
  );
}

function FreightOptionButtons({
  selectedOptions = [],
  badFreightImageCount = 0,
  handlingDescription = '',
  onToggle,
  onHandlingDescriptionChange,
  onBadFreightUpload,
  onBadFreightPreview,
}) {
  const badFreightSelected = selectedOptions.includes('Bad Freight Condition');
  const renderBadFreightActions = () => (
    <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-start" sx={{ minHeight: 32 }}>
      <IconButton
        size="small"
        title="Camera"
        onClick={onBadFreightUpload}
        sx={{ bgcolor: '#A22', color: '#fff', borderRadius: 0.5, p: 0.6, '&:hover': { bgcolor: '#8b1c1c' } }}
      >
        <Iconify icon="mdi:camera" width={18} />
      </IconButton>
      <IconButton
        size="small"
        title="Upload image"
        onClick={onBadFreightUpload}
        sx={{ bgcolor: '#A22', color: '#fff', borderRadius: 0.5, p: 0.6, '&:hover': { bgcolor: '#8b1c1c' } }}
      >
        <Iconify icon="mdi:image-plus" width={18} />
      </IconButton>
      {badFreightImageCount > 0 && (
        <IconButton
          size="small"
          title="View bad freight images"
          onClick={onBadFreightPreview}
          sx={{ bgcolor: '#102a63', color: '#fff', borderRadius: 0.5, p: 0.6, position: 'relative' }}
        >
          <Iconify icon="mdi:image-multiple" width={18} />
          <Box
            sx={{
              position: 'absolute',
              top: -6,
              right: -6,
              minWidth: 16,
              height: 16,
              borderRadius: '50%',
              bgcolor: '#A22',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              fontWeight: 700,
              lineHeight: 1,
            }}
          >
            {badFreightImageCount}
          </Box>
        </IconButton>
      )}
    </Stack>
  );

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mt: 1 }}>
      {FREIGHT_BUTTON_OPTIONS.map((label) => {
        const selected = selectedOptions.includes(label);
        const isBadFreight = label === 'Bad Freight Condition';

        return (
        <Box key={label} sx={{ display: 'contents' }}>
          <Button
            variant={selected ? 'contained' : 'outlined'}
            size="small"
            onClick={() => onToggle(label)}
            sx={{
              bgcolor: selected ? '#A22' : 'transparent',
              color: selected ? '#fff' : '#333',
              borderColor: selected ? '#A22' : '#888',
              fontSize: 10,
              textTransform: 'none',
              minHeight: 32,
              px: 0.75,
              '&:hover': {
                bgcolor: selected ? '#8b1c1c' : '#fff3f3',
                borderColor: '#A22',
              },
            }}
          >
            {label}
          </Button>
          {isBadFreight && badFreightSelected && renderBadFreightActions()}
          {isBadFreight && badFreightSelected && (
            <Box sx={{ gridColumn: '1 / -1' }}>
              <ScanField
                label="Freight Condition"
                value={handlingDescription}
                onChange={onHandlingDescriptionChange}
                variant="outlined"
                multiline
                rows={2}
              />
            </Box>
          )}
        </Box>
        );
      })}
    </Box>
  );
}

export default function WarehouseCheckInScanGunPage({
  title,
  onComplete,
  searchType,
  setSearchType,
  searchBy,
  setSearchBy,
  searchValue,
  setSearchValue,
  handleSearch,
  warehouseReceiptSearch,
  isSearchDisabled,
  showParcelOption,
  parcelForm,
  parcelErrors,
  parcelCarrierDropdown,
  customerOptions,
  customerLoading,
  parcelCarrierSearchValue,
  setParcelCarrierSearchValue,
  parcelCustomerSearchValue,
  setParcelCustomerSearchValue,
  getCarrierOptionLabel,
  getCustomerOptionLabel,
  handleParcelFormChange,
  handleParcelSubmit,
  proceededReceipts,
  mailAlertReceiptKey = '',
  rejectedRowIds = [],
  receiptErrors,
  updateReceipt,
  removeReceipt,
  addForm,
  removeForm,
  addItem,
  removeItem,
  updateFormField,
  updateItem,
  clearFormFieldError,
  clearItemError,
  handlePackageDetailsClick,
  handleOpenImageUpload,
  handleOpenImagePreview,
  cargoApiLoadingItems,
  getCargoApiLoadingKey,
  freightTypeOptions,
  showTrailerFreightHeader = false,
  handleTrailerMobilePrintLabelAndSubmit = () => {},
  tempReceiptLoading,
  handleRejectOpen,
  handleProceed,
  dispatchClearReceiptSearch,
}) {
  const visibleRows = (warehouseReceiptSearch.data?.rows || []).filter((row) => !rejectedRowIds.includes(row.id));
  const [deleteItemDialog, setDeleteItemDialog] = useState(null);
  const [deleteFormDialog, setDeleteFormDialog] = useState(null);
  const [mailListDialog, setMailListDialog] = useState({
    open: false,
    receiptKey: '',
    emails: [],
    selectedEmails: {},
  });
  const [notesDialog, setNotesDialog] = useState({
    open: false,
    receiptKey: '',
    value: '',
  });
  const requestRemoveItem = (receiptKey, formId, itemId, itemIndex) => {
    setDeleteItemDialog({ receiptKey, formId, itemId, itemIndex });
  };
  const handleCancelRemoveItem = () => {
    setDeleteItemDialog(null);
  };
  const handleConfirmRemoveItem = () => {
    if (!deleteItemDialog) return;

    removeItem(deleteItemDialog.receiptKey, deleteItemDialog.formId, deleteItemDialog.itemId);
    setDeleteItemDialog(null);
  };
  const requestRemoveForm = (receiptKey, formId, formIndex) => {
    setDeleteFormDialog({ receiptKey, formId, formIndex });
  };
  const handleCancelRemoveForm = () => {
    setDeleteFormDialog(null);
  };
  const handleConfirmRemoveForm = () => {
    if (!deleteFormDialog) return;

    removeForm(deleteFormDialog.receiptKey, deleteFormDialog.formId);
    setDeleteFormDialog(null);
  };

  const handleOpenMailList = (receipt) => {
    const emails = getReceiptMailRows(receipt.row);
    const selectedEmails = buildSelectedEmailMap(emails, receipt.row?.toEmails || []);

    setMailListDialog({
      open: true,
      receiptKey: receipt.key,
      emails,
      selectedEmails,
    });
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
        toEmails: getUniqueEmailList(selectedToEmails),
      },
    }));
    setMailListDialog((prev) => ({ ...prev, open: false }));
  };

  const handleOpenNotes = (receipt) => {
    setNotesDialog({
      open: true,
      receiptKey: receipt.key,
      value: receipt.notes || '',
    });
  };

  const handleCloseNotes = () => {
    setNotesDialog((previous) => ({ ...previous, open: false }));
  };

  const handleSaveNotes = () => {
    updateReceipt(notesDialog.receiptKey, () => ({ notes: notesDialog.value }));
    handleCloseNotes();
  };

  const toggleFreightOption = (receiptKey, formId, option) => {
    const receipt = proceededReceipts.find((currentReceipt) => currentReceipt.key === receiptKey);
    const form = receipt?.forms?.find((currentForm) => currentForm.id === formId);
    const selectedOptions = form?.freightOptions || [];
    const isSelected = selectedOptions.includes(option);
    const nextOptions = isSelected
      ? selectedOptions.filter((selectedOption) => selectedOption !== option)
      : [...selectedOptions, option];

    updateFormField(receiptKey, formId, 'freightOptions', nextOptions);
    if (option === 'Bad Freight Condition' && isSelected) {
      updateFormField(receiptKey, formId, 'badFreightImages', []);
      updateFormField(receiptKey, formId, 'handlingDescription', '');
    }
  };

  return (
    <Box sx={{ width: '100vw', minHeight: '100dvh', bgcolor: '#fff', color: '#000', fontSize: 12, overflowX: 'hidden' }}>
      <Box sx={{ width: '100vw', maxWidth: 'none', mx: 0, bgcolor: '#fff', minHeight: '100dvh' }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{
            position: 'fixed',
            top: `${HEADER.H_MOBILE}px`,
            left: 4,
            right: 4,
            width: 'auto',
            boxSizing: 'border-box',
            zIndex: (theme) => theme.zIndex.appBar - 1,
            px: 1,
            py: 0.75,
            bgcolor: '#fff',
            borderBottom: '1px solid #e0e0e0',
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            spacing={0.4}
            sx={{ minWidth: 0, color: '#111' }}
          >
            <Iconify icon="eva:arrow-ios-back-fill" width={16} />
            <Typography sx={{ fontSize: 12, fontWeight: 700, minWidth: 0 }}>
              {title}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={0.75} alignItems="center">
            {/* <Button variant="outlined" size="small" onClick={onCancel} sx={{ color: '#111', borderColor: '#111', height: 24, fontSize: 11, textTransform: 'none' }}>Cancel</Button> */}
            <Button variant="contained" size="small" onClick={onComplete} sx={scanActionBtnSx}>
              {showTrailerFreightHeader ? 'Complete' : 'Submit'}
            </Button>
          </Stack>
        </Stack>

        <Box sx={{ px: 1, pb: 1, pt: 6 }}>
          <Accordion defaultExpanded disableGutters sx={{ boxShadow: 'none', border: '1px solid #777', mb: 1 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: '#d0d0d0', minHeight: 38, '& .MuiAccordionSummary-content': { my: 0.5 } }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700 }}>Warehouse Receipt</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 1 }}>
              <RadioGroup
                value={searchType}
                onChange={(event) => {
                  setSearchType(event.target.value);
                  dispatchClearReceiptSearch();
                  setSearchValue('');
                }}
              >
                <FormControlLabel value="pro" disabled={isSearchDisabled} control={<Radio size="small" sx={{ color: '#A22', '&.Mui-checked': { color: '#A22' } }} />} label={<Typography sx={{ fontSize: 11 }}>Search By PRO / ID</Typography>} />
                <FormControlLabel value="rmDriver" disabled={isSearchDisabled} control={<Radio size="small" sx={{ color: '#A22', '&.Mui-checked': { color: '#A22' } }} />} label={<Typography sx={{ fontSize: 11 }}>RM Driver</Typography>} />
                {showParcelOption && <FormControlLabel value="parcel" disabled={isSearchDisabled} control={<Radio size="small" sx={{ color: '#A22', '&.Mui-checked': { color: '#A22' } }} />} label={<Typography sx={{ fontSize: 11 }}>Parcel</Typography>} />}
              </RadioGroup>

              {searchType === 'parcel' ? (
                <Stack spacing={1}>
                  {[
                    ['proNumber', 'Search By Pro'],
                    ['shipper', 'Shipper'],
                    ['driverName', 'Driver Name'],
                    ['pieces', 'Pieces'],
                    ['weight', 'Weight'],
                  ].map(([field, label]) => (
                    <ScanField key={field} label={label} required value={parcelForm[field]} error={parcelErrors[field]} disabled={isSearchDisabled} onChange={(event) => handleParcelFormChange(field, event.target.value)} />
                  ))}
                  <ScanAutocompleteField
                    label="Select Carrier"
                    required
                    value={parcelForm.carrier}
                    options={parcelCarrierDropdown.data || []}
                    loading={parcelCarrierDropdown.loading}
                    disabled={isSearchDisabled}
                    error={parcelErrors.carrier}
                    getOptionLabel={getCarrierOptionLabel}
                    isOptionEqualToValue={(option, value) => option.carrierId === value.carrierId}
                    onChange={(event, newValue) => {
                      handleParcelFormChange('carrier', newValue);
                      setParcelCarrierSearchValue('');
                    }}
                    onInputChange={(event, newInputValue, reason) => {
                      if (reason !== 'reset') setParcelCarrierSearchValue(newInputValue);
                    }}
                    noOptionsText={parcelCarrierSearchValue ? 'No carriers found' : 'Type to search for carriers'}
                  />
                  <ScanAutocompleteField
                    label="Select Customer"
                    required
                    value={parcelForm.customer}
                    options={customerOptions || []}
                    loading={customerLoading}
                    disabled={isSearchDisabled}
                    error={parcelErrors.customer}
                    getOptionLabel={getCustomerOptionLabel}
                    isOptionEqualToValue={(option, value) =>
                      option.customerId === value.customerId && option.stationId === value.stationId
                    }
                    onChange={(event, newValue) => {
                      handleParcelFormChange('customer', newValue);
                      setParcelCustomerSearchValue('');
                    }}
                    onInputChange={(event, newInputValue, reason) => {
                      if (reason !== 'reset') setParcelCustomerSearchValue(newInputValue);
                    }}
                    noOptionsText={parcelCustomerSearchValue ? 'No customers found' : 'Type to search for customers'}
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button variant="contained" size="small" onClick={handleParcelSubmit} disabled={isSearchDisabled} sx={scanActionBtnSx}>Submit</Button>
                  </Box>
                </Stack>
              ) : (
                <Stack spacing={1}>
                  {searchType !== 'rmDriver' && (
                    <ScanField label="Search By Pro" required select value={searchBy} disabled={isSearchDisabled} onChange={(event) => setSearchBy(event.target.value)}>
                      {['PRO', 'ID'].map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
                    </ScanField>
                  )}
                  <Stack direction="row" spacing={0.75} alignItems="flex-end">
                    <Box sx={{ flex: 1 }}>
                      <ScanField
                        label={searchType === 'rmDriver' ? 'Pro' : searchBy}
                        required
                        value={searchValue}
                        disabled={isSearchDisabled}
                        onChange={(event) => setSearchValue(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            event.stopPropagation();
                            handleSearch();
                          }
                        }}
                        inputProps={{ maxLength: 100 }}
                      />
                    </Box>
                    <Button variant="contained" size="small" onClick={handleSearch} disabled={isSearchDisabled} sx={{ ...scanActionBtnSx, height: 28 }}>Search</Button>
                  </Stack>
                </Stack>
              )}
            </AccordionDetails>
          </Accordion>

          {warehouseReceiptSearch.loading && <Stack alignItems="center" sx={{ py: 2 }}><CircularProgress size={24} /></Stack>}

          {!warehouseReceiptSearch.loading && visibleRows.length > 0 && proceededReceipts.length === 0 && (
            <Stack spacing={1}>
              {visibleRows.map((row) => (
                <Box key={row.id} sx={sectionSx}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#000' }}>{getScanReceiptNumber(row)}</Typography>
                  <Typography sx={{ fontSize: 11, color: '#000' }}>{getScanCarrier(row)}</Typography>
                  <Typography sx={{ fontSize: 11, color: '#000' }}>{getScanCustomer(row)}</Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.75, mt: 1 }}>
                    {searchType !== 'rmDriver' && (
                      <Button variant="contained" size="small" onClick={() => handleRejectOpen(row)} sx={scanActionBtnSx}>Reject</Button>
                    )}
                    <Button variant="contained" size="small" onClick={() => handleProceed(row)} sx={scanActionBtnSx}>Proceed</Button>
                  </Box>
                </Box>
              ))}
            </Stack>
          )}

          {proceededReceipts.map((receipt) => (
            <Stack key={receipt.key} spacing={1.2}>
              <Box sx={sectionSx}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.75 }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#000' }}>{receipt.proNumber}</Typography>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenMailList(receipt)}
                      sx={{
                        color: mailAlertReceiptKey === receipt.key ? '#f59e0b' : '#A22',
                        p: 0.25,
                        bgcolor:
                          mailAlertReceiptKey === receipt.key
                            ? 'rgba(245, 158, 11, 0.16)'
                            : 'transparent',
                        border:
                          mailAlertReceiptKey === receipt.key
                            ? '1px solid #f59e0b'
                            : '1px solid transparent',
                        '&:hover': {
                          bgcolor:
                            mailAlertReceiptKey === receipt.key
                              ? 'rgba(245, 158, 11, 0.24)'
                              : 'rgba(162, 34, 34, 0.08)',
                        },
                      }}
                    >
                      <Iconify icon="mdi:email-outline" width={20} />
                    </IconButton>
                  </Stack>
                  <Stack direction="row" spacing={0.75}>
                    <Button variant="contained" size="small" onClick={() => handleOpenNotes(receipt)} sx={scanActionBtnSx}>
                      Notes
                    </Button>
                    <Button variant="contained" size="small" onClick={() => removeReceipt(receipt.key)} sx={scanActionBtnSx}>
                      Reset
                    </Button>
                  </Stack>
                </Stack>
                <Box sx={{ display: 'grid', gridTemplateColumns: '88px 1fr', rowGap: 0.5, columnGap: 1 }}>
                  <Typography sx={{ fontSize: 11, color: '#555' }}>Receipt No.</Typography>
                  <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{getScanReceiptNumber(receipt.row)}</Typography>
                  <Typography sx={{ fontSize: 11, color: '#555' }}>Carrier</Typography>
                  <Typography sx={{ fontSize: 12 }}>{getScanCarrier(receipt.row)}</Typography>
                  <Typography sx={{ fontSize: 11, color: '#555' }}>Customer</Typography>
                  <Typography sx={{ fontSize: 12 }}>{getScanCustomer(receipt.row)}</Typography>
                  <Typography sx={{ fontSize: 11, color: '#555' }}>Pieces</Typography>
                  <Typography sx={{ fontSize: 12 }}>{getScanPieces(receipt.row)}</Typography>
                </Box>
              </Box>

              <Box sx={sectionSx}>
                <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1 }}>Location & Receiver</Typography>
                <ScanField
                  label="Received By"
                  required
                  value={receipt.receivedBy}
                  error={receiptErrors[receipt.key]?.receivedBy}
                  onChange={(event) => updateReceipt(receipt.key, () => ({ receivedBy: event.target.value.slice(0, 100) }))}
                  inputProps={{ maxLength: 100 }}
                />
                <ScanField label="Location" required value={receipt.location} error={receiptErrors[receipt.key]?.location} onChange={(event) => updateReceipt(receipt.key, () => ({ location: event.target.value }))} />
              </Box>

              <Box>
                <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 0.75, borderBottom: '1px solid #777' }}>Freight Information</Typography>
                <Stack spacing={1}>
                  {receipt.forms.map((form, formIndex) => (
                    <Accordion
                      key={form.id}
                      expanded={!form.collapsed}
                      onChange={(event, expanded) => updateFormField(receipt.key, form.id, 'collapsed', !expanded)}
                      disableGutters
                      sx={{ boxShadow: 'none', border: '1px solid #999' }}
                    >
                      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: '#d0d0d0', minHeight: 34, '& .MuiAccordionSummary-content': { my: 0.4 } }}>
                        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ width: '100%', minWidth: 0, pr: 0.5 }}>
                          <Typography sx={{ fontSize: 12, fontWeight: 700, flex: 1, minWidth: 0 }}>
                            {`New Form ${formIndex + 1} - ${form.receiptNumber || receipt.row.receiptNumber}`}
                          </Typography>
                          {receipt.forms.length > 1 && (
                            <IconButton
                              size="small"
                              title="Remove form"
                              onClick={(event) => {
                                event.stopPropagation();
                                requestRemoveForm(receipt.key, form.id, formIndex);
                              }}
                              sx={{ p: 0.25, color: '#A22' }}
                            >
                              <Iconify icon="mdi:close" width={16} />
                            </IconButton>
                          )}
                        </Stack>
                      </AccordionSummary>
                      <AccordionDetails sx={{ p: 1 }}>
                        <Stack spacing={1}>
                          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                            <ScanField
                              label="Destination"
                              required={showTrailerFreightHeader}
                              value={form.destination || ''}
                              error={showTrailerFreightHeader ? receiptErrors[receipt.key]?.formFields?.[`${form.id}-destination`] : false}
                              onChange={(event) => {
                                updateFormField(receipt.key, form.id, 'destination', event.target.value);
                                clearFormFieldError(receipt.key, form.id, 'destination', event.target.value);
                              }}
                            />
                            <ScanField
                              label="Package ID"
                              value={form.customerRefNoPackageId || ''}
                              onChange={(event) => {
                                updateFormField(receipt.key, form.id, 'customerRefNoPackageId', event.target.value);
                                clearFormFieldError(receipt.key, form.id, 'customerRefNoPackageId', event.target.value);
                              }}
                            />
                          </Box>
                          {(form.items || []).map((item, itemIndex) => (
                            <Box key={item.id}>
                              <ScanItem
                                item={item}
                                itemIndex={itemIndex}
                                receipt={receipt}
                                form={form}
                                receiptErrors={receiptErrors}
                                updateItem={updateItem}
                                clearItemError={clearItemError}
                                removeItem={requestRemoveItem}
                                handlePackageDetailsClick={handlePackageDetailsClick}
                                handleOpenImageUpload={handleOpenImageUpload}
                                handleOpenImagePreview={handleOpenImagePreview}
                                isCargoApiProcessing={!!cargoApiLoadingItems[getCargoApiLoadingKey(receipt.key, form.id, item.id)]}
                                freightTypeOptions={freightTypeOptions}
                              />
                            </Box>
                          ))}
                          {!showTrailerFreightHeader && (
                            <Button variant="contained" size="small" onClick={() => addItem(receipt.key, form.id)} sx={{ ...scanActionBtnSx, alignSelf: 'flex-start' }}>Add Item</Button>
                          )}
                          <FreightOptionButtons
                            selectedOptions={form.freightOptions || []}
                            handlingDescription={form.handlingDescription || ''}
                            onToggle={(option) => toggleFreightOption(receipt.key, form.id, option)}
                            onHandlingDescriptionChange={(event) =>
                              updateFormField(receipt.key, form.id, 'handlingDescription', event.target.value)
                            }
                            badFreightImageCount={(form.badFreightImages || []).length}
                            onBadFreightUpload={() =>
                              handleOpenImageUpload(
                                receipt.key,
                                form.id,
                                null,
                                form.badFreightImages || [],
                                'upload',
                                'badFreightImages'
                              )
                            }
                            onBadFreightPreview={() =>
                              handleOpenImagePreview(
                                form.badFreightImages || [],
                                `Bad Freight - Form ${String(formIndex + 1).padStart(2, '0')}`,
                                { key: receipt.key, formId: form.id, itemId: null, imageField: 'badFreightImages' }
                              )
                            }
                          />
                        </Stack>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </Stack>
                {showTrailerFreightHeader ? (
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                    <Button
                      variant="contained"
                      size="small"
                      disabled={!!tempReceiptLoading[receipt.key]}
                      onClick={() => handleTrailerMobilePrintLabelAndSubmit(receipt.key)}
                      sx={{ ...scanActionBtnSx, minWidth: 132 }}
                    >
                      {tempReceiptLoading[receipt.key] ? 'Submitting...' : 'Print Label and Submit'}
                    </Button>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                    <Button variant="contained" size="small" disabled={!!tempReceiptLoading[receipt.key]} onClick={() => addForm(receipt.key, { collapseExistingForms: true })} sx={scanActionBtnSx}>
                      {tempReceiptLoading[receipt.key] ? 'Adding...' : 'Add New Form'}
                    </Button>
                  </Box>
                )}
              </Box>
            </Stack>
          ))}
        </Box>
      </Box>
      <Dialog
        open={mailListDialog.open}
        onClose={handleCloseMailList}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            border: '3px solid #a22',
            m: 1.5,
            width: 'calc(100% - 24px)',
          },
        }}
      >
        <Box sx={{ p: 1.25, bgcolor: '#a22', color: 'white', fontWeight: 'bold', fontSize: 13 }}>
          Mail List
        </Box>
        <DialogContent sx={{ p: 1, height: 300 }}>
          {mailListDialog.emails.length > 0 ? (
            <DataGrid
              rows={mailListDialog.emails.map((email, index) => ({
                id: email.entryId,
                sno: String(index + 1).padStart(2, '0'),
                entryType: email.entryType || '',
                emailid: email.entryEmail,
                selected: mailListDialog.selectedEmails[email.entryId] || false,
              }))}
              columns={[
                {
                  field: 'selected',
                  headerName: '',
                  width: 44,
                  sortable: false,
                  renderCell: (params) => (
                    <input
                      type="checkbox"
                      checked={params.row.selected}
                      onChange={() => handleEmailCheckboxChange(params.row.id)}
                      style={{ cursor: 'pointer' }}
                    />
                  ),
                },
                {
                  field: 'sno',
                  headerName: 'SNO',
                  width: 56,
                  sortable: false,
                },
                {
                  field: 'entryType',
                  headerName: 'Type',
                  width: 78,
                  sortable: false,
                },
                {
                  field: 'emailid',
                  headerName: 'Email ID',
                  flex: 1,
                  sortable: false,
                },
              ]}
              hideFooter
              disableRowSelectionOnClick
              sx={{
                fontSize: 11,
                '& .MuiDataGrid-columnHeaders': {
                  bgcolor: '#f5f5f5',
                  borderBottom: '2px solid #e0e0e0',
                  minHeight: '34px !important',
                  maxHeight: '34px !important',
                },
                '& .MuiDataGrid-columnHeader': { px: 0.5 },
                '& .MuiDataGrid-cell': {
                  borderBottom: '1px solid #e0e0e0',
                  px: 0.5,
                },
              }}
            />
          ) : (
            <Typography variant="body2" sx={{ color: '#999', p: 2 }}>
              No emails available for this receipt
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 1, pb: 1 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={handleCloseMailList}
            sx={{ textTransform: 'none', color: '#333', borderColor: '#aaa' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={handleMailSubmit}
            sx={{ ...scanActionBtnSx, height: 32 }}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={notesDialog.open} onClose={handleCloseNotes} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 16, fontWeight: 700 }}>Notes</DialogTitle>
        <DialogContent dividers>
          <StyledTextField
            fullWidth
            multiline
            rows={4}
            variant="outlined"
            value={notesDialog.value}
            onChange={(event) =>
              setNotesDialog((previous) => ({ ...previous, value: event.target.value }))
            }
            placeholder="Enter notes"
          />
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button variant="outlined" size="small" onClick={handleCloseNotes} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button variant="contained" size="small" onClick={handleSaveNotes} sx={scanActionBtnSx}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={Boolean(deleteItemDialog)} onClose={handleCancelRemoveItem} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 16, fontWeight: 700 }}>Delete Item</DialogTitle>
        <DialogContent dividers>
          <Typography sx={{ fontSize: 13 }}>
            Are you sure you want to delete Item {(deleteItemDialog?.itemIndex ?? 0) + 1}?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={handleCancelRemoveItem}
            sx={{ textTransform: 'none', color: '#333', borderColor: '#aaa' }}
          >
            No
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={handleConfirmRemoveItem}
            sx={{ ...scanActionBtnSx, height: 32 }}
          >
            Yes
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={Boolean(deleteFormDialog)} onClose={handleCancelRemoveForm} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 16, fontWeight: 700 }}>Delete Form</DialogTitle>
        <DialogContent dividers>
          <Typography sx={{ fontSize: 13 }}>
            Are you sure you want to delete Form {(deleteFormDialog?.formIndex ?? 0) + 1}?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={handleCancelRemoveForm}
            sx={{ textTransform: 'none', color: '#333', borderColor: '#aaa' }}
          >
            No
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={handleConfirmRemoveForm}
            sx={{ ...scanActionBtnSx, height: 32 }}
          >
            Yes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
