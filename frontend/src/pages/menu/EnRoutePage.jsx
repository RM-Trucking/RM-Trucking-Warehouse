import React, { useState, useEffect } from 'react';
import { Box, Button, Stack, TextField, InputAdornment, IconButton, Dialog, DialogContent, Paper, Grid, CircularProgress, Alert } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Iconify from '../../components/iconify';
// Redux
import { useSelector, useDispatch } from '../../redux/store';
import { getEnrouteData, clearEnrouteError, createEnroute } from '../../redux/slices/enroute';

const standardInputStyles = {
  '& .MuiInputLabel-asterisk': { color: '#d32f2f' },
};

export default function EnRoutePage() {
  const dispatch = useDispatch();
  const { enrouteData, isLoading, error, pagination } = useSelector((state) => state.enroutedata);

  const [paginationModel, setPaginationModel] = useState({ pageSize: 20, page: 0 });
  const [searchValue, setSearchValue] = useState('');
  const [openModal, setOpenModal] = useState(false);
  const [formData, setFormData] = useState({
    deliveryCarrier: '',
    freightForwarder: '',
    estimateDate: '2026-02-26',
    shippedDate: '2026-02-26',
    items: [
      { id: 1, pieces: '50', height: '50', weight: '50', shipper: 'NEW DIREX | Northpoint | NY' },
      { id: 2, pieces: '50', height: '50', weight: '50', shipper: 'NEW DIREX | Northpoint | NY' },
      { id: 3, pieces: '', height: '', weight: '', shipper: '' },
      { id: 4, pieces: '3', height: '', weight: '', shipper: '' },
    ],
  });

  // Fetch data on component mount
  useEffect(() => {
    dispatch(getEnrouteData({ page: paginationModel.page + 1, size: paginationModel.pageSize }));
  }, [dispatch, paginationModel.page, paginationModel.pageSize]);

  // Handle pagination change
  const handlePaginationModelChange = (newPaginationModel) => {
    setPaginationModel(newPaginationModel);
  };

  const columns = [
    { field: 'carrier', headerName: 'Carrier ⇅', flex: 1, minWidth: 120 },
    { field: 'freightForwarder', headerName: 'Freight Forwarder ⇅', flex: 1.2, minWidth: 160 },
    { field: 'estimatedDate', headerName: 'Estimated Date ⇅', flex: 0.9, minWidth: 130 },
    { field: 'scanShippedDate', headerName: 'Scan Shipped Date ⇅', flex: 1, minWidth: 150 },
    { field: 'createdDate', headerName: 'Created Date ⇅', flex: 0.9, minWidth: 130 },
    {
      field: 'action',
      headerName: 'Action',
      width: 80,
      sortable: false,
      renderCell: () => (
        <IconButton size="small" >
          <Iconify icon="mdi:eye" width={16} color="#000" />
        </IconButton>
      ),
    },
  ];

  const handleOpenModal = () => setOpenModal(true);
  const handleCloseModal = () => setOpenModal(false);

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

  const handleSubmit = async () => {
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
        <IconButton size="small" sx={{ color: '#999' }}>
          <FilterListIcon />
        </IconButton>
      </Box>

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
            <h3 style={{ margin: 0 }}>New En Route</h3>
          </Stack>
          <Stack direction="row" gap={1}>
            <Button variant="outlined" onClick={handleCloseModal} sx={{ bgcolor: 'white', color: 'black', borderColor: '#ccc' }}>
              Cancel
            </Button>
            <Button variant="contained" onClick={handleSubmit} sx={{ bgcolor: '#b71c1c', '&:hover': { bgcolor: '#8b1c1c' } }}>
              Submit
            </Button>
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
                <TextField
                  variant="standard"
                  label="Delivery Carrier"
                  fullWidth
                  value={formData.deliveryCarrier}
                  onChange={(e) => handleFormChange('deliveryCarrier', e.target.value)}
                  required
                  InputLabelProps={{ shrink: true }}
                  sx={{ ...standardInputStyles, flex: 1 }}
                />
                <TextField
                  variant="standard"
                  label="Freight Forwarder"
                  fullWidth
                  value={formData.freightForwarder}
                  onChange={(e) => handleFormChange('freightForwarder', e.target.value)}
                  required
                  InputLabelProps={{ shrink: true }}
                  sx={{ ...standardInputStyles, flex: 1 }}
                />
                <TextField
                  variant="standard"
                  label="Estimate Date"
                  type="date"
                  fullWidth
                  value={formData.estimateDate}
                  onChange={(e) => handleFormChange('estimateDate', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  required
                  sx={{ ...standardInputStyles, flex: 1 }}
                />
                <TextField
                  variant="standard"
                  label="Shipped Date"
                  type="date"
                  fullWidth
                  value={formData.shippedDate}
                  onChange={(e) => handleFormChange('shippedDate', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  required
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
                    label="Pieces"
                    type="number"
                    fullWidth
                    value={item.pieces}
                    onChange={(e) => handleItemChange(item.id, 'pieces', e.target.value)}
                    required
                    InputLabelProps={{ shrink: true }}
                    sx={{ ...standardInputStyles, flex: 1 }}
                  />
                  <TextField
                    variant="standard"
                    label="Height"
                    type="number"
                    fullWidth
                    value={item.height}
                    onChange={(e) => handleItemChange(item.id, 'height', e.target.value)}
                    required
                    InputLabelProps={{ shrink: true }}
                    sx={{ ...standardInputStyles, flex: 1 }}
                  />
                  <TextField
                    variant="standard"
                    label="Weight(lbs)"
                    type="number"
                    fullWidth
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
                    value={item.shipper}
                    onChange={(e) => handleItemChange(item.id, 'shipper', e.target.value)}
                    required
                    InputLabelProps={{ shrink: true }}
                    sx={{ ...standardInputStyles, flex: 2 }} // Double width for Shipper
                  />

                  {/* Delete Action */}
                  <Box sx={{ width: 40, pb: 0.5, textAlign: 'right' }}>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteItem(item.id)}
                      sx={{ color: '#000' }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>

                </Stack>
              ))}
              
              <Button
                variant="contained"
                onClick={handleAddItem}
                sx={{ bgcolor: '#b71c1c', '&:hover': { bgcolor: '#8b1c1c' }, mt: 1 }}
              >
                Add Item
              </Button>
            </Box>

          </Paper>
        </DialogContent>
      </Dialog>
    </Box>
  );
}