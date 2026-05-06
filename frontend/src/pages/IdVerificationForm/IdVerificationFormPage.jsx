import { useState, useEffect, useRef } from 'react';
import {
  Alert,
  Box,
  Button,
  Collapse,
  Grid,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import FilterListIcon from '@mui/icons-material/FilterList';
import { useDispatch, useSelector } from 'react-redux';
import ShipmentFormLayout from '../../sections/shared/ShipmentFormLayout';
import Iconify from '../../components/iconify';
import { getIdVerificationData, clearIdVerificationError, setIdVerificationSearchTerm } from '../../redux/slices/idVerification';

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

export default function IdVerificationFormPage() {
  const dispatch = useDispatch();
  const { idVerificationData, isLoading, error, pagination, searchTerm } = useSelector((state) => state.idVerificationdata);
  const isInitialMount = useRef(true);

  const [searchValue, setSearchValue] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [paginationModel, setPaginationModel] = useState({ pageSize: 10, page: 0 });
  const [filters, setFilters] = useState({
    carrier: '',
    freightForwarder: '',
    fromDate: '',
    toDate: '',
  });

  // Fetch data when pagination/pageSize changes
 // Fetch data when pagination/pageSize changes
  useEffect(() => {
    dispatch(getIdVerificationData({
      page: paginationModel.page + 1,
      pageSize: paginationModel.pageSize,
      searchTerm: searchValue
    }));
    // ❌ REMOVED: Do not set isInitialMount.current = false here.
  }, [paginationModel.page, paginationModel.pageSize]);

  // Debounced search effect - skip on initial mount
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false; 
      return;
    }

    const timer = setTimeout(() => {
      dispatch(getIdVerificationData({
        page: 1,
        pageSize: paginationModel.pageSize,
        searchTerm: searchValue
      }));
      // Reset to first page when searching
      if (paginationModel.page !== 0) {
        setPaginationModel(prev => ({ ...prev, page: 0 }));
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchValue]); 

  const handlePaginationModelChange = (newModel) => {
    setPaginationModel(newModel);
  };

  const handleFilterChange = (filterName, value) => {
    setFilters((prev) => ({
      ...prev,
      [filterName]: value,
    }));
  };

  const handleApplyFilters = () => {
    // For now, filters are client-side. In production, these would be sent to API
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      carrier: '',
      freightForwarder: '',
      fromDate: '',
      toDate: '',
    };
    setFilters(clearedFilters);
    dispatch(getIdVerificationData({
      page: 1,
      pageSize: paginationModel.pageSize,
      searchTerm: ''
    }));
    dispatch(setIdVerificationSearchTerm(''));
    setSearchValue('');
    // Reset to first page when clearing filters
    if (paginationModel.page !== 0) {
      setPaginationModel(prev => ({ ...prev, page: 0 }));
    }
  };

  const handleCloseError = () => {
    dispatch(clearIdVerificationError());
  };

  const columns = [
    {
      field: 'verificationId',
      headerName: 'Verification ID',
      flex: 0.9,
      minWidth: 130,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Typography sx={{ fontWeight: 700, fontSize: 13 }}>
            {params.value}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'driver',
      headerName: "Driver's Name",
      flex: 0.8,
      minWidth: 110,
      renderCell: (params) => {
        if (!params.row.driver || !params.row.driver.driverName) return '-';
        return params.row.driver.driverName;
      },
    },
    { field: 'doorNo', headerName: 'Entry Door', flex: 0.6, minWidth: 90 },
    { field: 'carrierName', headerName: 'Deliver Carrier', flex: 0.9, minWidth: 120 },
    {
      field: 'freightForwarder',
      headerName: 'Freight Forwarder',
      flex: 1.2,
      minWidth: 160,
      renderCell: (params) => {
        const customerName = params.row.customerName || '';
        const stationName = params.row.stationName || '';
        return stationName ? `${customerName} | ${stationName}` : '';
      }
    },
    { field: 'firstIdPhotoMatch', headerName: 'Photo Match', flex: 0.7, minWidth: 100 },
    { field: 'verifiedByEmployee', headerName: 'Verified By', flex: 0.8, minWidth: 110 },
    {
      field: 'createdAt',
      headerName: 'Created Date',
      flex: 1.1,
      minWidth: 160,
      renderCell: (params) => {
        if (!params.value) return '-';
        return new Date(params.value).toLocaleDateString();
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 80,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Iconify icon="mdi:eye" width={20} sx={{ cursor: 'pointer', color: '#555' }} />
        </Box>
      ),
    },
  ];

  return (
    <ShipmentFormLayout
      title="ID Verification Form"
      handleClose={() => {}}
      onSubmit={() => {}}
      showCancel={false}
      showSubmit={false}
    >
      <Stack spacing={3}>
        {/* Search Section */}
        <Box>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2, justifyContent: 'flex-end' }}>
            <TextField
              size="small"
              variant="outlined"
              placeholder="Search..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              // onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              sx={{
                width: 250,
                '& .MuiOutlinedInput-root': {
                  paddingRight: 0,
                },
                '& .MuiOutlinedInput-input': {
                  padding: '8px 12px',
                },
              }}
              InputProps={{
                endAdornment: (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      pr: 1,
                      cursor: 'pointer',
                    }}
                    // onClick={handleSearch}
                  >
                    <Iconify icon="eva:search-fill" width={20} sx={{ color: '#999' }} />
                  </Box>
                ),
              }}
            />
            <IconButton
              size="small"
              onClick={() => setShowFilters(!showFilters)}
              sx={{ color: showFilters ? '#1976d2' : '#999' }}
            >
              <FilterListIcon />
            </IconButton>
          </Stack>

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
        </Box>

        {/* Data Grid */}
        <DataGrid
          rows={idVerificationData}
          columns={columns}
          getRowId={(row) => row.verificationId}
          paginationModel={paginationModel}
          onPaginationModelChange={handlePaginationModelChange}
          pageSizeOptions={[10, 25, 50]}
          rowCount={pagination.total}
          paginationMode="server"
          loading={isLoading}
          disableRowSelectionOnClick
          sx={{
            '& .MuiDataGrid-root': { border: 'none' },
            '& .MuiDataGrid-cell': { borderBottom: '1px solid #e0e0e0' },
          }}
        />

        {/* Empty State */}
        {!isLoading && idVerificationData.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 5 }}>
            <Typography sx={{ color: '#999', fontSize: 14 }}>
              No records found
            </Typography>
          </Box>
        )}
      </Stack>
    </ShipmentFormLayout>
  );
}
