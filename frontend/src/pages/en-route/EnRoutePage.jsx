import React, { useState, useEffect, useMemo, useRef, useCallback  } from 'react';
import { Box, Button, Stack, TextField, InputAdornment, IconButton, Dialog, DialogContent, Paper, Grid, CircularProgress, Alert, Autocomplete, Collapse, Snackbar, Badge, DialogTitle, Divider, Typography } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ClearIcon from '@mui/icons-material/Clear';
import Iconify from '../../components/iconify';
// Redux
import { useSelector, useDispatch } from '../../redux/store';
import { getEnrouteData, clearEnrouteError, createEnroute, searchCarriers, searchCustomers, addNewCarrier } from '../../redux/slices/enroute';
import formatPhoneNumber from '../../utils/formatPhoneNumber';

const standardInputStyles = {
  '& .MuiInputLabel-asterisk': { color: '#d32f2f' },
};

export default function EnRoutePage() {
  const dispatch = useDispatch();
  const { enrouteData, isLoading, error, pagination, carrierOptions, carrierLoading, customerOptions, customerLoading } = useSelector((state) => state.enroutedata);

  const [paginationModel, setPaginationModel] = useState({ pageSize: 10, page: 0 });
  const [searchValue, setSearchValue] = useState('');
  const [openModal, setOpenModal] = useState(false);
  const [viewMode, setViewMode] = useState(false); // Track if modal is in view mode
  const [showFilters, setShowFilters] = useState(false); // Track filter panel visibility
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'error' });
  const [openMailList, setOpenMailList] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState({});
  const [currentFormEmails, setCurrentFormEmails] = useState([]);
  const [confirmedEmailCount, setConfirmedEmailCount] = useState(0);
  const [confirmedEmailIds, setConfirmedEmailIds] = useState({});

  // Filter state
  const [filters, setFilters] = useState({
    carrier: '',
    freightForwarder: '',
    fromDate: '',
    toDate: ''
  });

  // Add Carrier Modal state
  const [openAddCarrierModal, setOpenAddCarrierModal] = useState(false);
  const [newCarrierForm, setNewCarrierForm] = useState({
    name: "",
    phone: "",
  });
  const [addCarrierLoading, setAddCarrierLoading] = useState(false);
  const [addCarrierError, setAddCarrierError] = useState(null);
  const [addCarrierFieldErrors, setAddCarrierFieldErrors] = useState({
    name: '',
    phone: ''
  });
  const [submitLoading, setSubmitLoading] = useState(false);

  // Local state for carrier search debounce
  const [carrierSearchValue, setCarrierSearchValue] = useState('');
  const isSelectingRef = useRef(false);

  // Local state for customer search debounce
  const [customerSearchValue, setCustomerSearchValue] = useState('');
  const isSelectingCustomerRef = useRef(false);

  const handleOpenMailList = () => {
    // Don't reset selections - keep the persisted ones
    setOpenMailList(true);
  };

  const handleCloseMailList = () => {
    setOpenMailList(false);
  };

  const handleCancelMailList = () => {
    // Reset selections to the confirmed emails when Cancel is clicked
    setSelectedEmails(confirmedEmailIds);
    setOpenMailList(false);
  };

  const handleEmailCheckboxChange = (emailId) => {
    setSelectedEmails((prev) => ({
      ...prev,
      [emailId]: !prev[emailId]
    }));
  };

  const handleMailSubmit = () => {
    const selectedEmailAddresses = currentFormEmails
      .filter((email) => selectedEmails[email.entryId])
      .map((email) => email.entryEmail);

    console.log('Sending enroute details to:', selectedEmailAddresses);
    // Update the count and IDs of confirmed emails
    setConfirmedEmailCount(selectedEmailAddresses.length);
    setConfirmedEmailIds(selectedEmails); // Save the confirmed selection state
    setOpenMailList(false); // Close the dialog without resetting selections
    // TODO: Make API call to send emails
  };

  const [formData, setFormData] = useState({
    deliveryCarrier: null, // Changed to null for autocomplete
    freightForwarder: null, // Changed to null for autocomplete
    stationId: '',
    estimateDate: '',
    shippedDate: '',
    items: [
      { id: 1, proNumber: '', pieces: '', height: '', weight: '', shipper: '', activeStatus: 'Y' }
    ],
  });

  // Form validation errors state
  const [formErrors, setFormErrors] = useState({
    deliveryCarrier: false,
    freightForwarder: false,
    items: {} // Will store item-level errors like { 1: { proNumber: false, pieces: false, ... } }
  });

  // Fetch data on component mount and when pagination/search changes
  useEffect(() => {
    dispatch(getEnrouteData({
      page: paginationModel.page + 1,
      pageSize: paginationModel.pageSize,
      searchTerm: searchValue,
      filters: filters
    }));
  }, [dispatch, paginationModel.page, paginationModel.pageSize]);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch(getEnrouteData({
        page: 1,
        pageSize: paginationModel.pageSize,
        searchTerm: searchValue,
        filters: filters
      }));
      // Reset to first page when searching
      if (paginationModel.page !== 0) {
        setPaginationModel(prev => ({ ...prev, page: 0 }));
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [dispatch, searchValue, paginationModel.pageSize, filters]);

  // Handle pagination change
  const handlePaginationModelChange = (newPaginationModel) => {
    setPaginationModel(newPaginationModel);
  };

  // Handle filter changes
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  // Apply filters
  const handleApplyFilters = () => {
    dispatch(getEnrouteData({
      page: 1,
      pageSize: paginationModel.pageSize,
      searchTerm: searchValue,
      filters: filters
    }));
    // Reset to first page when applying filters
    if (paginationModel.page !== 0) {
      setPaginationModel(prev => ({ ...prev, page: 0 }));
    }
  };

  // Clear filters
  const handleClearFilters = () => {
    const clearedFilters = {
      carrier: '',
      freightForwarder: '',
      fromDate: '',
      toDate: ''
    };
    setFilters(clearedFilters);
    dispatch(getEnrouteData({
      page: 1,
      pageSize: paginationModel.pageSize,
      searchTerm: searchValue,
      filters: clearedFilters
    }));
    // Reset to first page when clearing filters
    if (paginationModel.page !== 0) {
      setPaginationModel(prev => ({ ...prev, page: 0 }));
    }
  };

  // Debounce the carrier search using Redux action
  useEffect(() => {
    if (isSelectingRef.current) {
      isSelectingRef.current = false;
      return;
    }

    const timer = setTimeout(() => {
      dispatch(searchCarriers(carrierSearchValue));
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [dispatch, carrierSearchValue]);

  // Debounce the customer search using Redux action
  useEffect(() => {
    if (isSelectingCustomerRef.current) {
      isSelectingCustomerRef.current = false;
      return;
    }

    const timer = setTimeout(() => {
      dispatch(searchCustomers(customerSearchValue));
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [dispatch, customerSearchValue]);

const handleViewModal = useCallback((rowData) => {
  setOpenModal(true);
  setViewMode(true);

    // Populate form with row data
    const rawData = rowData.rawData || {};
    const cleanDate = (date) => (date && date.includes('1970') ? '' : date);
    setFormData({
      deliveryCarrier: { carrierId: rawData.carrierId, carrierName: rawData.carrierName || rowData.carrier },
      freightForwarder: { customerId: rawData.customerId, customerName: rawData.customerName || rowData.freightForwarder, stationId: rawData.stationId, stationName: rawData.stationName },
      stationId: rawData.stationId || '',
      estimateDate: cleanDate(rawData.estimatedDate) || cleanDate(rowData.estimatedDate)?.split('/').reverse().join('-') || '',
      shippedDate: cleanDate(rawData.shippedDate) || cleanDate(rowData.scanShippedDate)?.split('/').reverse().join('-') || '',
      items: rawData.pros?.map((pro, index) => ({
        id: index + 1,
        proNumber: pro.proNumber || '',
        pieces: pro.pieces?.toString() || '',
        height: '', // Not available in API response
        weight: pro.weight?.toString() || '',
        shipper: pro.shipper || '',
        activeStatus: pro.activeStatus || 'N'
      })) || [
        { id: 1, proNumber: '', pieces: '', height: '', weight: '', shipper: '', activeStatus: 'N' },
      ],
    });

    // Handle toEmails data if present
    if (rawData.toEmails && rawData.toEmails.length > 0) {
      // Convert toEmails array to currentFormEmails format
      const emailsList = rawData.toEmails.map((email, index) => ({
        entryId: index,
        entryEmail: email
      }));
      setCurrentFormEmails(emailsList);

      // Pre-select all emails in readonly mode
      const preSelectedEmails = {};
      emailsList.forEach((email) => {
        preSelectedEmails[email.entryId] = true;
      });
      setSelectedEmails(preSelectedEmails);
      setConfirmedEmailIds(preSelectedEmails);
      setConfirmedEmailCount(rawData.toEmails.length);
    } else {
      setCurrentFormEmails([]);
      setSelectedEmails({});
      setConfirmedEmailIds({});
      setConfirmedEmailCount(0);
    }
  }, []);

  const columns = useMemo(() => [
    { field: 'carrier', headerName: 'Carrier', flex: 1, minWidth: 120 },
    {
      field: 'freightForwarder',
      headerName: 'Freight Forwarder',
      flex: 1.2,
      minWidth: 160,
      renderCell: (params) => {
        const customerName = params.row.freightForwarder || '';
        const stationName = params.row.stationName || '';
        return stationName ? `${customerName} | ${stationName}` : '';
      }
    },
    { 
      field: 'estimatedDate', 
      headerName: 'Estimated Date', 
      flex: 0.9, 
      minWidth: 130,
      renderCell: (params) => {
        const val = params.value || '';
        return val.includes('1970') ? '' : val;
      }
    },
    { 
      field: 'scanShippedDate', 
      headerName: 'Scan Shipped Date', 
      flex: 1, 
      minWidth: 150,
      renderCell: (params) => {
        const val = params.value || '';
        return val.includes('1970') ? '' : val;
      }
    },
    { 
      field: 'createdDate', 
      headerName: 'Created Date', 
      flex: 0.9, 
      minWidth: 130,
      renderCell: (params) => {
        const val = params.value || '';
        return val.includes('1970') ? '' : val;
      }
    },
 {
  field: 'action',
  headerName: 'Action',
  width: 80,
  sortable: false,
  renderCell: (params) => {
    const onActionClick = (e) => {
      e.stopPropagation(); 
      handleViewModal(params.row);
    };

    // Intercept the event BEFORE the click fully registers
    const onMouseDown = (e) => {
      e.stopPropagation();
    };

    return (
      <IconButton 
        size="small" 
        onClick={onActionClick}
        onMouseDown={onMouseDown} // <-- Add this line
      >
        <Iconify icon="mdi:eye" width={16} color="#000" />
      </IconButton>
    );
  }
},], [handleViewModal]);

  const handleOpenModal = () => {
    setViewMode(false);
    setOpenModal(true);
  };


  const handleCloseModal = () => {
    setOpenModal(false);
    // Reset viewMode after a small delay to prevent button flash
    setTimeout(() => {
      setViewMode(false);
    }, 150);
    // Clear form data when closing modal
    setFormData({
      deliveryCarrier: null,
      freightForwarder: null,
      stationId: '',
      estimateDate: '',
      shippedDate: '',
      items: [
        { id: 1, proNumber: '', pieces: '', height: '', weight: '', shipper: '', activeStatus: 'Y' },
      ],
    });
    // Reset form errors
    setFormErrors({
      deliveryCarrier: false,
      freightForwarder: false,
      items: {}
    });
    // Clear search values and options
    setCarrierSearchValue('');
    setCustomerSearchValue('');
    setCurrentFormEmails([]);
    setConfirmedEmailCount(0);
    setSelectedEmails({});
    setConfirmedEmailIds({});
    dispatch(searchCarriers(''));
    dispatch(searchCustomers(''));
    // Clear Redux error when closing modal
    dispatch(clearEnrouteError());
  };

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when value changes
    if (field === 'deliveryCarrier') {
      setFormErrors((prev) => ({ ...prev, deliveryCarrier: false }));
    } else if (field === 'freightForwarder') {
      setFormErrors((prev) => ({ ...prev, freightForwarder: false }));
    }
  };

  const handleItemChange = (itemId, field, value) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === itemId ? { ...item, [field]: value } : item
      ),
    }));
    // Clear error for this field when value changes
    setFormErrors((prev) => ({
      ...prev,
      items: {
        ...prev.items,
        [itemId]: {
          ...prev.items[itemId],
          [field]: false
        }
      }
    }));
  };

  const handleAddItem = () => {
    const newId = Math.max(...formData.items.map((i) => i.id), 0) + 1;
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { id: newId, proNumber: '', pieces: '', height: '', weight: '', shipper: '', activeStatus: 'Y' }],
    }));
  };

  const handleDeleteItem = (itemId) => {
    // If only one item exists, clear the values instead of deleting
    if (formData.items.length === 1) {
      setFormData((prev) => ({
        ...prev,
        items: prev.items.map((item) =>
          item.id === itemId
            ? { id: item.id, proNumber: '', pieces: '', height: '', weight: '', shipper: '', activeStatus: 'Y' }
            : item
        ),
      }));
    } else {
      // Delete the item if multiple items exist
      setFormData((prev) => ({
        ...prev,
        items: prev.items.filter((item) => item.id !== itemId),
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {
      deliveryCarrier: false,
      freightForwarder: false,
      items: {}
    };

    // Check delivery carrier
    if (!formData.deliveryCarrier) {
      newErrors.deliveryCarrier = true;
    }

    // Check freight forwarder
    if (!formData.freightForwarder) {
      newErrors.freightForwarder = true;
    }

    // Check each item for required fields
    formData.items.forEach((item) => {
      const itemErrors = {
        proNumber: false,
        pieces: false,
        weight: false,
        shipper: false
      };

      if (!item.proNumber || item.proNumber.trim() === '') {
        itemErrors.proNumber = true;
      }
      if (!item.pieces || item.pieces.toString().trim() === '') {
        itemErrors.pieces = true;
      }
      if (!item.weight || item.weight.toString().trim() === '') {
        itemErrors.weight = true;
      }
      if (!item.shipper || item.shipper.trim() === '') {
        itemErrors.shipper = true;
      }

      newErrors.items[item.id] = itemErrors;
    });

    return newErrors;
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
    // Clear Redux error when snackbar closes so it doesn't show on the grid
    dispatch(clearEnrouteError());
  };

  // Add Carrier Modal handlers
  const handleOpenAddCarrierModal = () => setOpenAddCarrierModal(true);

  const handleCloseAddCarrierModal = () => {
    setOpenAddCarrierModal(false);
    setAddCarrierError(null);
    setAddCarrierFieldErrors({ name: '', phone: '' });
    setNewCarrierForm({ name: "", phone: "" });
  };

  const validatePhoneNumber = (phone) => {
    if (!phone) {
      return 'Phone number is required';
    }
    // Check for exactly 14 characters: (XXX) XXX-XXXX
    if (phone.length !== 14) {
      return 'Phone number must be in format: (XXX) XXX-XXXX';
    }
    const phoneRegex = /^\(\d{3}\) \d{3}-\d{4}$/;
    if (!phoneRegex.test(phone)) {
      return 'Invalid phone format. Use format: (XXX) XXX-XXXX';
    }
    return null;
  };

  const handleAddCarrierSubmit = async () => {
    const errors = { name: '', phone: '' };

    if (!newCarrierForm.name.trim()) {
      errors.name = 'Delivery Carrier name is required';
    }

    const phoneError = validatePhoneNumber(newCarrierForm.phone);
    if (phoneError) {
      errors.phone = phoneError;
    }

    // If there are any errors, set them and return
    if (errors.name || errors.phone) {
      setAddCarrierFieldErrors(errors);
      return;
    }

    setAddCarrierLoading(true);
    setAddCarrierError(null);
    setAddCarrierFieldErrors({ name: '', phone: '' });

    try {
      const result = await dispatch(addNewCarrier(newCarrierForm.name, newCarrierForm.phone));

      // Set the newly created carrier as selected
      if (result && result.carrierId && result.carrierName) {
        // Set selected carrier in formData
        setFormData((prev) => ({
          ...prev,
          deliveryCarrier: {
            carrierId: result.carrierId,
            carrierName: result.carrierName
          }
        }));
      }

      // Reset form and close modal on success
      setNewCarrierForm({ name: "", phone: "" });
      handleCloseAddCarrierModal();
    } catch (error) {
      setAddCarrierError(error.message || 'Failed to add carrier');
    } finally {
      setAddCarrierLoading(false);
    }
  };

  const handleSubmit = async () => {
    const errors = validateForm();

    // Check if there are any errors
    const hasErrors = errors.deliveryCarrier || errors.freightForwarder ||
                      Object.values(errors.items).some(itemErrors => Object.values(itemErrors).some(e => e));

    if (hasErrors) {
      setFormErrors(errors);
      return;
    }

    // Clear errors if validation passes
    setFormErrors({
      deliveryCarrier: false,
      freightForwarder: false,
      items: {}
    });

    setSubmitLoading(true);

    try {
      // Convert selectedEmails object to array of actual email addresses
      const toEmailsList = currentFormEmails
        .filter((email) => selectedEmails[email.entryId])
        .map((email) => email.entryEmail);

      // Add toEmails to formData
      const submitData = {
        ...formData,
        toEmails: toEmailsList
      };

      await dispatch(createEnroute(submitData));
      handleCloseModal();
    } catch (error) {
      // Extract error message from the error object
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to create en route. Please try again.';

      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error'
      });
      // Clear the Redux error immediately so it doesn't show on the grid
      dispatch(clearEnrouteError());
      console.error('Failed to create enroute:', error);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleCloseError = () => {
    dispatch(clearEnrouteError());
  };

  return (
    <Box sx={{ p: 2 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <h2>En Route</h2>
        <Button variant="contained" onClick={handleOpenModal} sx={{ bgcolor: '#A22', '&:hover': { bgcolor: '#8b1c1c' } }}>
          New En Route
        </Button>
      </Stack>

      {/* Search and Filter Bar */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1 }}>
        <TextField
          placeholder="Search..."
          variant="outlined"
          size="small"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          sx={{ width: 200 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#999', fontSize: 20 }} />
              </InputAdornment>
            ),
            endAdornment: searchValue && (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={() => setSearchValue('')}
                  edge="end"
                  sx={{ color: '#999', padding: '4px' }}
                >
                  <ClearIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        {/* <IconButton size="small" onClick={() => setShowFilters(!showFilters)} sx={{ color: showFilters ? '#1976d2' : '#999' }}>
          <FilterListIcon />
        </IconButton> */}
      </Box>

      {/* Filter Panel */}
      <Collapse in={showFilters}>
        <Paper sx={{ p: 2, mb: 2, border: '1px solid #e0e0e0' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={3}>
              <TextField
                label="Filter by Carrier"
                size="small"
                fullWidth
                value={filters.carrier}
                onChange={(e) => handleFilterChange('carrier', e.target.value)}
                placeholder="Enter carrier name..."
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="Filter by Freight Forwarder"
                size="small"
                fullWidth
                value={filters.freightForwarder}
                onChange={(e) => handleFilterChange('freightForwarder', e.target.value)}
                placeholder="Enter freight forwarder..."
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={2}>
              <TextField
                label="From Date"
                type="date"
                size="small"
                fullWidth
                value={filters.fromDate}
                onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={2}>
              <TextField
                label="To Date"
                type="date"
                size="small"
                fullWidth
                value={filters.toDate}
                onChange={(e) => handleFilterChange('toDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={2}>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleApplyFilters}
                  sx={{ bgcolor: '#1976d2' }}
                >
                  Apply
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleClearFilters}
                >
                  Clear
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </Paper>
      </Collapse>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={handleCloseError}>
          {error}
        </Alert>
      )}

      {/* DataGrid */}
      {isLoading && enrouteData.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <DataGrid
          rows={enrouteData}
          columns={columns}
          paginationModel={paginationModel}
          onPaginationModelChange={handlePaginationModelChange}
          pageSizeOptions={[10, 20, 50, 100]}
          rowCount={pagination.totalRecords}
          paginationMode="server"
          loading={isLoading}
          disableRowSelectionOnClick
          sx={{
            '& .MuiDataGrid-root': { border: 'none' },
            '& .MuiDataGrid-cell': { borderBottom: '1px solid #e0e0e0' },
          }}
        />
      )}

      <Dialog 
        open={openModal} 
        onClose={handleCloseModal} 
        maxWidth="xl" 
        fullWidth
        PaperProps={{ 
          sx: { 
            bgcolor: '#ececec', 
            minHeight: '80vh',
            maxWidth: '1480px', 
            width: '100%' 
          } 
        }} 
      >
        <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Stack direction="row" alignItems="center" gap={1}>
            <IconButton size="small" onClick={handleCloseModal}>
              <ArrowBackIcon />
            </IconButton>
            <h3 style={{ margin: 0 }}>{viewMode ? 'View En Route' : 'New En Route'}</h3>
          </Stack>
          <Stack direction="row" gap={1}>
            <Button variant="outlined" onClick={handleCloseModal} sx={{ bgcolor: 'white', color: 'black', borderColor: '#ccc' }}>
              {viewMode ? 'Close' : 'Cancel'}
            </Button>
            {!viewMode && (
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={submitLoading}
                sx={{ bgcolor: '#b71c1c', '&:hover': { bgcolor: '#8b1c1c' }, '&:disabled': { bgcolor: '#d0d0d0' } }}
              >
                {submitLoading ? (
                  <>
                    <CircularProgress size={20} sx={{ color: 'white', mr: 1 }} />
                    Submitting...
                  </>
                ) : (
                  'Submit'
                )}
              </Button>
            )}
          </Stack>
        </Box>

        <DialogContent sx={{ p: 3, pt: 0 }}>
          <Paper sx={{ p: 4, borderRadius: 2 }}>

            {/* Mail Button Section */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              {currentFormEmails.length > 0 && (
                <Badge badgeContent={confirmedEmailCount} color="error">
                  <Button
                    variant="contained"
                    onClick={handleOpenMailList}
                    sx={{
                      bgcolor: '#b71c1c',
                      '&:hover': { bgcolor: '#8b1c1c' },
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }}
                  >
                    <Iconify icon="mdi:email" width={18} />
                    Mail
                  </Button>
                </Badge>
              )}
            </Box>

            {/* UPDATED: Grey border and Flex Stack layout to force full width */}
            <Box 
              component="fieldset" 
              sx={{ 
                border: '1px solid #ccc', // Changed to Grey
                borderRadius: 1, 
                p: 3, 
                mb: 4,
                width: '100%',
                boxSizing: 'border-box',
                marginInline: 0
              }}
            >
              <legend style={{ padding: '0 8px', fontWeight: 'bold', fontSize: '15px' }}>
                En Route Details
              </legend>
              <Stack direction="row" spacing={4} sx={{ width: '100%' }}>
                <Stack direction="column" spacing={1} sx={{ flex: 1 }}>
                  <Autocomplete
                    fullWidth
                    disabled={viewMode}
                    options={carrierOptions}
                    getOptionLabel={(option) => option.carrierName || option.name || option.toString()}
                    value={formData.deliveryCarrier}
                    onChange={(event, newValue) => {
                      isSelectingRef.current = true;
                      handleFormChange('deliveryCarrier', newValue);
                      // Clear search results when field is cleared
                      if (!newValue) {
                        setCarrierSearchValue('');
                        dispatch(searchCarriers(''));
                      }
                    }}
                    onInputChange={(event, newInputValue, reason) => {
                      // Only update search value for manual input, not selection
                      if (reason !== 'reset') {
                        setCarrierSearchValue(newInputValue);
                        // Clear error when user starts typing
                        setFormErrors((prev) => ({ ...prev, deliveryCarrier: false }));
                        // If field is cleared, clear the options immediately
                        if (!newInputValue || newInputValue.trim() === '') {
                          dispatch(searchCarriers(''));
                        }
                      }
                    }}
                    loading={carrierLoading}
                    loadingText="Searching carriers..."
                    noOptionsText={carrierSearchValue ? "No carriers found" : "Type to search for carriers"}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        variant="standard"
                        label="Delivery Carrier"
                        required
                        error={formErrors.deliveryCarrier}
                        helperText={formErrors.deliveryCarrier ? 'Delivery Carrier is required' : ' '}
                        InputLabelProps={{ shrink: true }}
                        sx={{ ...standardInputStyles }}
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {carrierLoading ? <CircularProgress color="inherit" size={20} /> : null}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                  />
                  {!viewMode && (
                    <Button
                      variant="contained"
                      size="small"
                      onClick={handleOpenAddCarrierModal}
                      sx={{
                        bgcolor: '#A22',
                        color: '#fff',
                        textTransform: 'none',
                        minWidth: 96,
                        height: 30,
                        px: 2,
                        fontSize: 12,
                        '&:hover': { bgcolor: '#8b1c1c' },
                        alignSelf: 'flex-start'
                      }}
                    >
                      Add Carrier
                    </Button>
                  )}
                </Stack>
                <Autocomplete
                  fullWidth
                  disabled={viewMode}
                  options={customerOptions}
                  getOptionLabel={(option) =>
                    option.customerName && option.stationName
                      ? `${option.customerName} | ${option.stationName}`
                      : option.toString()
                  }
                  value={formData.freightForwarder}
                  onChange={(event, newValue) => {
                    isSelectingCustomerRef.current = true;
                    handleFormChange('freightForwarder', newValue);
                    // Set emails from the selected freight forwarder
                    if (newValue && newValue.emails) {
                      setCurrentFormEmails(newValue.emails);
                      // Reset email selection states when customer changes
                      setSelectedEmails({});
                      setConfirmedEmailIds({});
                      setConfirmedEmailCount(0);
                    } else {
                      setCurrentFormEmails([]);
                      // Reset email selection states when customer is cleared
                      setSelectedEmails({});
                      setConfirmedEmailIds({});
                      setConfirmedEmailCount(0);
                    }
                    // Clear search results when field is cleared
                    if (!newValue) {
                      setCustomerSearchValue('');
                      dispatch(searchCustomers(''));
                    }
                  }}
                  onInputChange={(event, newInputValue, reason) => {
                    // Only update search value for manual input, not selection
                    if (reason !== 'reset') {
                      setCustomerSearchValue(newInputValue);
                      // Clear error when user starts typing
                      setFormErrors((prev) => ({ ...prev, freightForwarder: false }));
                      // If field is cleared, clear the options immediately
                      if (!newInputValue || newInputValue.trim() === '') {
                        dispatch(searchCustomers(''));
                      }
                    }
                  }}
                  loading={customerLoading}
                  loadingText="Searching customers..."
                  noOptionsText={customerSearchValue ? "No customers found" : "Type to search for customers"}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      variant="standard"
                      label="Freight Forwarder"
                      required
                      error={formErrors.freightForwarder}
                      helperText={formErrors.freightForwarder ? 'Freight Forwarder is required' : ' '}
                      InputLabelProps={{ shrink: true }}
                      sx={{ ...standardInputStyles, flex: 1 }}
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {customerLoading ? <CircularProgress color="inherit" size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                  sx={{ flex: 1 }}
                />
                <TextField
                  variant="standard"
                  label="Estimate Date"
                  type="date"
                  fullWidth
                  disabled={viewMode}
                  value={formData.estimateDate}
                  onChange={(e) => handleFormChange('estimateDate', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ ...standardInputStyles, flex: 1 }}
                />
                <TextField
                  variant="standard"
                  label="Shipped Date"
                  type="date"
                  fullWidth
                  disabled={viewMode}
                  value={formData.shippedDate}
                  onChange={(e) => handleFormChange('shippedDate', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ ...standardInputStyles, flex: 1 }}
                />
              </Stack>
            </Box>

            {/* UPDATED: Grey border and Flex Stack layout to force full width */}
            <Box sx={{ border: '1px solid #ccc', borderRadius: 1, p: 3, width: '100%', boxSizing: 'border-box' }}>
              {formData.items.map((item, index) => (
                <Stack key={item.id} direction="row" spacing={3} alignItems="flex-end" sx={{ mb: 4, width: '100%' }}>
                  
                  {/* Icon and Index */}
                  <Stack direction="row" alignItems="center" sx={{ width: 60, pb: 0.5 }}>
                    <Iconify icon="mdi:cube-outline" width={24} style={{ marginRight: 8, color: '#444' }} />
                    <Box sx={{ fontWeight: 'bold' }}>0{index + 1}</Box>
                  </Stack>

                  {/* Standard Inputs - Flex rules enforce perfect distribution */}
                  <TextField
                    variant="standard"
                    label="Pro Number"
                    fullWidth
                    disabled={viewMode}
                    value={item.proNumber}
                    onChange={(e) => handleItemChange(item.id, 'proNumber', e.target.value.slice(0, 50))}
                    required
                    error={formErrors.items[item.id]?.proNumber}
                    helperText={formErrors.items[item.id]?.proNumber ? 'Required' : ' '}
                    inputProps={{ maxLength: 50 }}
                    InputLabelProps={{ shrink: true }}
                    sx={{ ...standardInputStyles, flex: 1 }}
                  />
                  <TextField
                    variant="standard"
                    label="Pieces"
                    type="number"
                    fullWidth
                    disabled={viewMode}
                    value={item.pieces}
                    onChange={(e) => handleItemChange(item.id, 'pieces', e.target.value)}
                    required
                    error={formErrors.items[item.id]?.pieces}
                    helperText={formErrors.items[item.id]?.pieces ? 'Required' : ' '}
                    InputLabelProps={{ shrink: true }}
                    sx={{ ...standardInputStyles, flex: 1 }}
                  />
                  <TextField
                    variant="standard"
                    label="Weight(lbs)"
                    type="number"
                    fullWidth
                    disabled={viewMode}
                    value={item.weight}
                    onChange={(e) => handleItemChange(item.id, 'weight', e.target.value)}
                    required
                    error={formErrors.items[item.id]?.weight}
                    helperText={formErrors.items[item.id]?.weight ? 'Required' : ' '}
                    InputLabelProps={{ shrink: true }}
                    sx={{ ...standardInputStyles, flex: 1 }}
                  />
                  <TextField
                    variant="standard"
                    label="Shipper"
                    fullWidth
                    disabled={viewMode}
                    value={item.shipper}
                    onChange={(e) => handleItemChange(item.id, 'shipper', e.target.value.slice(0, 255))}
                    required
                    error={formErrors.items[item.id]?.shipper}
                    helperText={formErrors.items[item.id]?.shipper ? 'Required' : ' '}
                    inputProps={{ maxLength: 255 }}
                    InputLabelProps={{ shrink: true }}
                    sx={{ ...standardInputStyles, flex: 2 }} // Double width for Shipper
                  />

                  {/* Status/Delete Action */}
                  <Box sx={{ minWidth: 100, pb: 0.5, textAlign: 'right' }}>
                    {viewMode ? (
                      <Button
                        variant="contained"
                        size="small"
                        sx={{
                          bgcolor: item.activeStatus === 'Y' ? '#4caf50' : '#9e9e9e',
                          color: 'white',
                          textTransform: 'none',
                          fontSize: '12px',
                          '&:hover': {
                            bgcolor: item.activeStatus === 'Y' ? '#45a049' : '#858585'
                          }
                        }}
                      >
                        {item.activeStatus === 'Y' ? 'Active' : 'Inactive'}
                      </Button>
                    ) : (
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteItem(item.id)}
                        sx={{ color: '#000' }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>

                </Stack>
              ))}

              {!viewMode && (
                <Button
                  variant="contained"
                  onClick={handleAddItem}
                  sx={{ bgcolor: '#b71c1c', '&:hover': { bgcolor: '#8b1c1c' }, mt: 1 }}
                >
                  Add Item
                </Button>
              )}
            </Box>

          </Paper>
        </DialogContent>
      </Dialog>

      {/* Mail List Dialog */}
      <Dialog
        open={openMailList}
        onClose={handleCloseMailList}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            border: '3px solid #b71c1c'
          }
        }}
      >
        <Box sx={{ p: 2, bgcolor: '#b71c1c', color: 'white', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Mail List</span>
          {viewMode && <span style={{ fontSize: '12px', fontStyle: 'italic' }}>(Read Only)</span>}
        </Box>
        <DialogContent sx={{ p: 2, height: '400px' }}>
          <DataGrid
            rows={currentFormEmails.map((email, index) => ({
              id: email.entryId,
              sno: String(index + 1).padStart(2, '0'),
              entryType: email.entryType,
              emailid: email.entryEmail,
              selected: selectedEmails[email.entryId] || false
            }))}
            columns={[
              {
                field: 'selected',
                headerName: '',
                width: 50,
                sortable: false,
                renderCell: (params) => (
                  <input
                    type="checkbox"
                    checked={params.row.selected}
                    onChange={() => !viewMode && handleEmailCheckboxChange(params.row.id)}
                    disabled={viewMode}
                    style={{ cursor: viewMode ? 'not-allowed' : 'pointer' }}
                  />
                )
              },
              {
                field: 'sno',
                headerName: 'SNO',
                width: 80,
                sortable: false
              },
              ...(viewMode ? [] : [{
                field: 'entryType',
                headerName: 'Type',
                sortable: false
              }]),
              {
                field: 'emailid',
                headerName: 'Email ID',
                flex: 1,
                sortable: false
              }
            ]}
            hideFooter
            sx={{
              '& .MuiDataGrid-columnHeaders': {
                bgcolor: '#f5f5f5',
                borderBottom: '2px solid #e0e0e0'
              },
              '& .MuiDataGrid-cell': {
                borderBottom: '1px solid #e0e0e0'
              }
            }}
          />
        </DialogContent>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end', gap: 1, borderTop: '1px solid #e0e0e0' }}>
          <Button
            variant="outlined"
            onClick={viewMode ? handleCloseMailList : handleCancelMailList}
            sx={{ color: 'black', borderColor: '#ccc' }}
          >
            {viewMode ? 'Close' : 'Cancel'}
          </Button>
          {!viewMode && (
            <Button
              variant="contained"
              onClick={handleMailSubmit}
              sx={{ bgcolor: '#b71c1c', '&:hover': { bgcolor: '#8b1c1c' } }}
            >
              Confirm
            </Button>
          )}
        </Box>
      </Dialog>

      {/* Snackbar for validation errors */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ whiteSpace: 'pre-line' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Add New Delivery Carrier Modal */}
      <Dialog
        open={openAddCarrierModal}
        onClose={handleCloseAddCarrierModal}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600, fontSize: "16px", pb: 1 }}>
          Add New Delivery Carrier
          <IconButton
            onClick={handleCloseAddCarrierModal}
            sx={{ position: "absolute", right: 8, top: 8, color: "#333" }}
          >
            <Iconify icon="mdi:close" width={20} />
          </IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3 }}>
          <Typography variant="body2" sx={{ color: "#666", mb: 3 }}>
            Begin by adding the carrier name and phone number, followed by including other details in maintenance.
          </Typography>

          {addCarrierError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {addCarrierError}
            </Alert>
          )}

          <Box sx={{ display: "flex", gap: 3 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                Delivery Carrier <span style={{ color: "#d32f2f" }}>*</span>
              </Typography>
              <TextField
                fullWidth
                variant="standard"
                placeholder=""
                value={newCarrierForm.name}
                inputProps={{ maxLength: 100 }}
                onChange={(e) => {
                  setNewCarrierForm((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }));
                  if (addCarrierFieldErrors.name) {
                    setAddCarrierFieldErrors((prev) => ({
                      ...prev,
                      name: ''
                    }));
                  }
                }}
                error={!!addCarrierFieldErrors.name}
                sx={{
                  "& .MuiInputBase-input::placeholder": {
                    color: "#999",
                    opacity: 0.7,
                  },
                  "& .MuiInputBase-root.Mui-error:after": {
                    borderBottomColor: "#d32f2f"
                  }
                }}
              />
              {addCarrierFieldErrors.name && (
                <Typography variant="caption" sx={{ color: "#d32f2f", display: "block", mt: 0.5 }}>
                  {addCarrierFieldErrors.name}
                </Typography>
              )}
            </Box>

            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                Phone Number <span style={{ color: "#d32f2f" }}>*</span>
              </Typography>
              <TextField
                fullWidth
                variant="standard"
                placeholder="(XXX) XXX-XXXX"
                value={newCarrierForm.phone}
                onChange={(e) => {
                  const formatted = formatPhoneNumber(e.target.value);
                  setNewCarrierForm((prev) => ({
                    ...prev,
                    phone: formatted,
                  }));
                  if (addCarrierFieldErrors.phone) {
                    setAddCarrierFieldErrors((prev) => ({
                      ...prev,
                      phone: ''
                    }));
                  }
                }}
                error={!!addCarrierFieldErrors.phone}
                sx={{
                  "& .MuiInputBase-root.Mui-error:after": {
                    borderBottomColor: "#d32f2f"
                  }
                }}
              />
              {addCarrierFieldErrors.phone && (
                <Typography variant="caption" sx={{ color: "#d32f2f", display: "block", mt: 0.5 }}>
                  {addCarrierFieldErrors.phone}
                </Typography>
              )}
            </Box>
          </Box>

          <Stack
            direction="row"
            spacing={2}
            sx={{ mt: 4, justifyContent: "flex-start" }}
          >
            <Button
              variant="outlined"
              sx={{ color: "#333", borderColor: "#333", px: 3 }}
              onClick={handleCloseAddCarrierModal}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              sx={{ bgcolor: "#a22", "&:hover": { bgcolor: "#811" }, px: 3 }}
              onClick={handleAddCarrierSubmit}
              disabled={addCarrierLoading}
            >
              {addCarrierLoading ? <CircularProgress size={20} sx={{ color: 'white' }} /> : 'Submit'}
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>
    </Box>
  );
}