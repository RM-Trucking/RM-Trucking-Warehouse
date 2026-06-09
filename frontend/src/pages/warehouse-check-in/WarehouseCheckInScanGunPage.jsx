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
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import StyledTextField from '../../sections/shared/StyledTextField';
import Iconify from '../../components/iconify';

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
  '& .MuiInputBase-input': { fontSize: 12, py: 0.2 },
  '& .MuiFormHelperText-root': { display: 'none' },
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
          <Typography sx={{ fontSize: 12, fontWeight: 700 }}>Item {itemIndex + 1}</Typography>
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
          ['length', 'Length', true],
          ['width', 'Width', true],
          ['height', 'Height', true],
          ['weight', 'Weight(lbs)', true],
        ].map(([field, label, isDecimal]) => (
          <ScanField
            key={field}
            label={label}
            required
            value={item[field]}
            error={receiptErrors[receipt.key]?.items?.[getItemErrorKey(field)]}
            onChange={(event) => {
              updateItem(receipt.key, form.id, item.id, field, event.target.value);
              clearItemError(receipt.key, form.id, item.id, field, event.target.value);
            }}
            inputProps={isDecimal ? { inputMode: 'decimal' } : undefined}
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
  onToggle,
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
    }
  };

  return (
    <Box sx={{ width: '100vw', minHeight: '100dvh', bgcolor: '#fff', fontSize: 12, overflowX: 'hidden' }}>
      <Box sx={{ width: '100vw', maxWidth: 'none', mx: 0, bgcolor: '#fff', minHeight: '100dvh' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 1, py: 0.75 }}>
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

        <Box sx={{ p: 1 }}>
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
                <FormControlLabel value="pro" disabled={isSearchDisabled} control={<Radio size="small" sx={{ color: '#A22', '&.Mui-checked': { color: '#A22' } }} />} label={<Typography sx={{ fontSize: 11 }}>Search By PRO#</Typography>} />
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
                        onKeyDown={(event) => event.key === 'Enter' && handleSearch()}
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
                  <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{row.receiptNumber || row.proNumber}</Typography>
                  <Typography sx={{ fontSize: 11 }}>{row.carrier}</Typography>
                  <Typography sx={{ fontSize: 11 }}>{row.customer}</Typography>
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
                  <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{receipt.proNumber}</Typography>
                  <Button variant="contained" size="small" onClick={() => removeReceipt(receipt.key)} sx={scanActionBtnSx}>
                    Reset
                  </Button>
                </Stack>
                <Box sx={{ display: 'grid', gridTemplateColumns: '88px 1fr', rowGap: 0.5, columnGap: 1 }}>
                  <Typography sx={{ fontSize: 11, color: '#555' }}>Receipt No.</Typography>
                  <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{receipt.row.receiptNumber}</Typography>
                  <Typography sx={{ fontSize: 11, color: '#555' }}>Carrier</Typography>
                  <Typography sx={{ fontSize: 12 }}>{receipt.row.carrier}</Typography>
                  <Typography sx={{ fontSize: 11, color: '#555' }}>Customer</Typography>
                  <Typography sx={{ fontSize: 12 }}>{receipt.row.customer}</Typography>
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
                          {showTrailerFreightHeader && (
                            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                              <ScanField
                                label="Destination"
                                required
                                value={form.destination || ''}
                                error={receiptErrors[receipt.key]?.formFields?.[`${form.id}-destination`]}
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
                          )}
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
                            onToggle={(option) => toggleFreightOption(receipt.key, form.id, option)}
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
