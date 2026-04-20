import React, { useState, useEffect, useRef } from 'react';
import { Box, Button, Stack, TextField, InputAdornment, IconButton, Dialog, DialogContent, Paper, Grid, CircularProgress, Alert, Autocomplete, Collapse, Snackbar } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Iconify from '../../components/iconify';
// Redux
import { useSelector, useDispatch } from '../../redux/store';
import { getEnrouteData, clearEnrouteError, createEnroute, searchCarriers, searchCustomers } from '../../redux/slices/enroute';

const standardInputStyles = {
  '& .MuiInputLabel-asterisk': { color: '#d32f2f' },
};

export default function EnRoutePage() {
  const dispatch = useDispatch();
  const { enrouteData, isLoading, error, pagination, carrierOptions, carrierLoading, customerOptions, customerLoading } = useSelector((state) => state.enroutedata);

  const [paginationModel, setPaginationModel] = useState({ pageSize: 20, page: 0 });
  const [searchValue, setSearchValue] = useState('');
  const [openModal, setOpenModal] = useState(false);
  const [viewMode, setViewMode] = useState(false); // Track if modal is in view mode
  const [showFilters, setShowFilters] = useState(false); // Track filter panel visibility
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'error' });

  // Filter state
  const [filters, setFilters] = useState({
    carrier: '',
    freightForwarder: '',
    fromDate: '',
    toDate: ''
  });

  // Local state for carrier search debounce
  const [carrierSearchValue, setCarrierSearchValue] = useState('');
  const isSelectingRef = useRef(false);

  // Local state for customer search debounce
  const [customerSearchValue, setCustomerSearchValue] = useState('');
  const isSelectingCustomerRef = useRef(false);

  const [formData, setFormData] = useState({
    deliveryCarrier: null, // Changed to null for autocomplete
    freightForwarder: null, // Changed to null for autocomplete
    stationId: '',
    estimateDate: '',
    shippedDate: '',
    items: [
      { id: 1, proNumber: '', pieces: '', height: '', weight: '', shipper: '' }
    ],
  });

  // Fetch data on component mount and when pagination/search changes
  useEffect(() => {
    dispatch(getEnrouteData({
      page: paginationModel.page + 1,
      size: paginationModel.pageSize,
      searchTerm: searchValue,
      filters: filters
    }));
  }, [dispatch, paginationModel.page, paginationModel.pageSize]);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch(getEnrouteData({
        page: 1,
        size: paginationModel.pageSize,
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
      size: paginationModel.pageSize,
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
      size: paginationModel.pageSize,
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

  const columns = [
    { field: 'carrier', headerName: 'Carrier', flex: 1, minWidth: 120 },
    { field: 'freightForwarder', headerName: 'Freight Forwarder', flex: 1.2, minWidth: 160 },
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
      renderCell: (params) => (
        <IconButton size="small" onClick={() => handleViewModal(params.row)}>
          <Iconify icon="mdi:eye" width={16} color="#000" />
        </IconButton>
      ),
    },
  ];

  const handleOpenModal = () => {
    setViewMode(false);
    setOpenModal(true);
  };

  const handleViewModal = (rowData) => {
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
        shipper: pro.shipper || ''
      })) || [
        { id: 1, proNumber: '', pieces: '', height: '', weight: '', shipper: '' },
      ],
    });

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
        { id: 1, proNumber: '', pieces: '', height: '', weight: '', shipper: '' },
      ],
    });
    // Clear search values and options
    setCarrierSearchValue('');
    setCustomerSearchValue('');
    dispatch(searchCarriers(''));
    dispatch(searchCustomers(''));
  };

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleItemChange = (itemId, field, value) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === itemId ? { ...item, [field]: value } : item
      ),
    }));
  };

  const handleAddItem = () => {
    const newId = Math.max(...formData.items.map((i) => i.id), 0) + 1;
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { id: newId, pieces: '', height: '', weight: '', shipper: '' }],
    }));
  };

  const handleDeleteItem = (itemId) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== itemId),
    }));
  };

  const validateForm = () => {
    const errors = [];

    // Check delivery carrier
    if (!formData.deliveryCarrier) {
      errors.push('Delivery Carrier is required');
    }

    // Check freight forwarder
    if (!formData.freightForwarder) {
      errors.push('Freight Forwarder is required');
    }

    // Check items array is not empty
    if (!formData.items || formData.items.length === 0) {
      errors.push('At least one item is required');
    } else {
      // Check each item for required fields
      formData.items.forEach((item, index) => {
        if (!item.proNumber || item.proNumber.trim() === '') {
          errors.push(`Item ${index + 1}: Pro Number is required`);
        }
        if (!item.pieces || item.pieces.toString().trim() === '') {
          errors.push(`Item ${index + 1}: Pieces is required`);
        }
        if (!item.weight || item.weight.toString().trim() === '') {
          errors.push(`Item ${index + 1}: Weight is required`);
        }
        if (!item.shipper || item.shipper.trim() === '') {
          errors.push(`Item ${index + 1}: Shipper is required`);
        }
      });
    }

    return errors;
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleSubmit = async () => {
    const errors = validateForm();

    if (errors.length > 0) {
      setSnackbar({
        open: true,
        message: `Please fill the mandatory fields:\n${errors.join('\n')}`,
        severity: 'error'
      });
      return;
    }

    try {
      await dispatch(createEnroute(formData));
      handleCloseModal();
    } catch (error) {
      // Error is handled by Redux slice
      console.error('Failed to create enroute:', error);
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
          }}
        />
        <IconButton size="small" onClick={() => setShowFilters(!showFilters)} sx={{ color: showFilters ? '#1976d2' : '#999' }}>
          <FilterListIcon />
        </IconButton>
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
          pageSizeOptions={[20, 50, 100]}
          rowCount={pagination.totalRecords}
          paginationMode="server"
          loading={isLoading}
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
              <Button variant="contained" onClick={handleSubmit} sx={{ bgcolor: '#b71c1c', '&:hover': { bgcolor: '#8b1c1c' } }}>
                Submit
              </Button>
            )}
          </Stack>
        </Box>

        <DialogContent sx={{ p: 3, pt: 0 }}>
          <Paper sx={{ p: 4, borderRadius: 2 }}>
            
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
                      // If field is cleared, clear the options immediately
                      if (!newInputValue || newInputValue.trim() === '') {
                        dispatch(searchCarriers(''));
                      }
                    }
                  }}
                  loading={carrierLoading}
                  loadingText="Searching carriers..."
                  noOptionsText="No carriers found"
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      variant="standard"
                      label="Delivery Carrier"
                      required
                      InputLabelProps={{ shrink: true }}
                      sx={{ ...standardInputStyles, flex: 1 }}
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
                  sx={{ flex: 1 }}
                />
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
                      // If field is cleared, clear the options immediately
                      if (!newInputValue || newInputValue.trim() === '') {
                        dispatch(searchCustomers(''));
                      }
                    }
                  }}
                  loading={customerLoading}
                  loadingText="Searching customers..."
                  noOptionsText="No customers found"
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      variant="standard"
                      label="Freight Forwarder"
                      required
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
                    onChange={(e) => handleItemChange(item.id, 'proNumber', e.target.value)}
                    required
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
                    InputLabelProps={{ shrink: true }}
                    sx={{ ...standardInputStyles, flex: 1 }}
                  />
                  <TextField
                    variant="standard"
                    label="Shipper"
                    fullWidth
                    disabled={viewMode}
                    value={item.shipper}
                    onChange={(e) => handleItemChange(item.id, 'shipper', e.target.value)}
                    required
                    InputLabelProps={{ shrink: true }}
                    sx={{ ...standardInputStyles, flex: 2 }} // Double width for Shipper
                  />

                  {/* Delete Action */}
                  <Box sx={{ width: 40, pb: 0.5, textAlign: 'right' }}>
                    {!viewMode && (
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
    </Box>
  );
}