import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Popover,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { GridOverlay } from '@mui/x-data-grid';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import ClearIcon from '@mui/icons-material/Clear';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import FilterListIcon from '@mui/icons-material/FilterList';
import dayjs from 'dayjs';
import { useDispatch, useSelector } from 'react-redux';
import ShipmentFormLayout from '../../sections/shared/ShipmentFormLayout';
import Iconify from '../../components/iconify';
import StyledTextField from '../../sections/shared/StyledTextField';
import { getIdVerificationData, clearIdVerificationError, setIdVerificationSearchTerm } from '../../redux/slices/idVerification';
import {
  setAppliedFilterParams,
  setAppliedLogicOperator,
  setFilters,
  setLogicOperator,
  setTempSearchValue,
  setSearchValue,
  setIdVerificationPaginationModel
} from '../../redux/slices/idVerification';

const createEmptyFilter = (id) => ({ id, field: '', value: '' });

const getFreightForwarder = (row) => {
  const customerName = row.customerName || '';
  const stationName = row.stationName || '';
  return stationName ? `${customerName} | ${stationName}` : customerName;
};

const getFilterParams = (filters) => filters.reduce((params, filter) => {
  const value = String(filter.value || '').trim();
  if (!filter.field || !value) return params;

  if (filter.field === 'driver') {
    params.driverName = value;
    return params;
  }

  if (filter.field === 'freightForwarder') {
    const [customerName, stationName] = value.split('|').map((part) => part.trim());
    if (customerName) params.customerName = customerName;
    if (stationName) params.stationName = stationName;
    return params;
  }

  if (filter.field === 'startDate') {
    params.startDate = `${value}T00:00:00Z`;
    return params;
  }

  if (filter.field === 'endDate') {
    params.endDate = `${value}T23:59:59Z`;
    return params;
  }

  params[filter.field] = value;
  return params;
}, {});

const getRequestFilterParams = (filterParams, verificationId) => {
  const trimmedVerificationId = String(verificationId || '').trim();
  return {
    ...filterParams,
    ...(trimmedVerificationId && { verificationId: trimmedVerificationId }),
  };
};

const CustomNoRowsOverlay = () => (
  <GridOverlay>
    <Box sx={{ textAlign: 'center', py: 5 }}>
      <Typography sx={{ color: '#999', fontSize: 14 }}>
        No records found
      </Typography>
    </Box>
  </GridOverlay>
);

export default function IdVerificationFormPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    idVerificationData,
    isLoading,
    error,
    pagination,
    paginationModel: savedPaginationModel,
  } = useSelector((state) => state.idVerificationdata);
  const isInitialMount = useRef(true);

  const [filterAnchorEl, setFilterAnchorEl] = useState(null);
  const [paginationModel, setPaginationModel] = useState(savedPaginationModel || { pageSize: 10, page: 0 });

  // Redux selectors for filter state
  const appliedFilterParams = useSelector((state) => state.idVerificationdata.appliedFilterParams);
  const appliedLogicOperator = useSelector((state) => state.idVerificationdata.appliedLogicOperator);
  const filters = useSelector((state) => state.idVerificationdata.filters);
  const logicOperator = useSelector((state) => state.idVerificationdata.logicOperator);
  const tempSearchValue = useSelector((state) => state.idVerificationdata.tempSearchValue);
  const searchValue = useSelector((state) => state.idVerificationdata.searchValue);
  const filterIdRef = useRef(1);
  const hasAppliedFilters = Object.keys(appliedFilterParams).length > 0;

  const handleViewVerification = (row) => {
    // Navigate to IdVerificationView page with the verification ID
    navigate(`/app/id-verification-form/${row.verificationId}`);
  };

  // Fetch data when pagination/pageSize changes
 // Fetch data when pagination/pageSize changes
  useEffect(() => {
    dispatch(getIdVerificationData({
      page: paginationModel.page + 1,
      pageSize: paginationModel.pageSize,
    }));
    // ❌ REMOVED: Do not set isInitialMount.current = false here.
  }, [dispatch, paginationModel.page, paginationModel.pageSize]);

  // Debounced search effect - skip on initial mount
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false; 
      return;
    }

    const timer = setTimeout(() => {
      const requestFilters = getRequestFilterParams(appliedFilterParams, searchValue);

      dispatch(getIdVerificationData({
        page: 1,
        pageSize: paginationModel.pageSize,
        filters: requestFilters,
        filterLogic: Object.keys(requestFilters).length ? appliedLogicOperator.toUpperCase() : '',
      }));
      // Reset to first page when searching
      if (paginationModel.page !== 0) {
        const nextPaginationModel = { ...paginationModel, page: 0 };
        setPaginationModel(nextPaginationModel);
        dispatch(setIdVerificationPaginationModel(nextPaginationModel));
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchValue]); 

  const handlePaginationModelChange = (newModel) => {
    setPaginationModel(newModel);
    dispatch(setIdVerificationPaginationModel(newModel));
  };

  const updateFilter = (filterId, key, value) => {
    const updatedFilters = filters.map((filter) => (
      filter.id === filterId ? { ...filter, [key]: value, ...(key === 'field' ? { value: '' } : {}) } : filter
    ));
    dispatch(setFilters(updatedFilters));
  };

  const addFilter = () => {
    filterIdRef.current += 1;
    const newFilters = [...filters, createEmptyFilter(filterIdRef.current)];
    dispatch(setFilters(newFilters));
  };

  const removeFilter = (filterId) => {
    const nextFilters = filters.filter((filter) => filter.id !== filterId);
    const finalFilters = nextFilters.length ? nextFilters : [createEmptyFilter(filterIdRef.current)];
    dispatch(setFilters(finalFilters));
  };

  const handleApplyFilters = () => {
    const nextFilterParams = getFilterParams(filters);
    const requestFilters = getRequestFilterParams(nextFilterParams, searchValue);
    dispatch(setAppliedFilterParams(nextFilterParams));
    dispatch(setAppliedLogicOperator(logicOperator));
    setFilterAnchorEl(null);
    dispatch(getIdVerificationData({
      page: 1,
      pageSize: paginationModel.pageSize,
      filters: requestFilters,
      filterLogic: Object.keys(requestFilters).length ? logicOperator.toUpperCase() : '',
    }));
    if (paginationModel.page !== 0) {
      const nextPaginationModel = { ...paginationModel, page: 0 };
      setPaginationModel(nextPaginationModel);
      dispatch(setIdVerificationPaginationModel(nextPaginationModel));
    }
  };

  const handleClearFilters = () => {
    filterIdRef.current += 1;
    dispatch(setFilters([createEmptyFilter(filterIdRef.current)]));
    dispatch(setAppliedFilterParams({}));
    dispatch(setLogicOperator('and'));
    dispatch(setAppliedLogicOperator('and'));
    dispatch(getIdVerificationData({
      page: 1,
      pageSize: paginationModel.pageSize,
      filters: {},
    }));
    dispatch(setIdVerificationSearchTerm(''));
    setSearchValue('');
    // Reset to first page when clearing filters
    if (paginationModel.page !== 0) {
      const nextPaginationModel = { ...paginationModel, page: 0 };
      setPaginationModel(nextPaginationModel);
      dispatch(setIdVerificationPaginationModel(nextPaginationModel));
    }
  };

  const getSelectedFields = (currentFilterId) => {
    return filters
      .filter((f) => f.id !== currentFilterId && f.field)
      .map((f) => f.field);
  };

  const handleCloseError = () => {
    dispatch(clearIdVerificationError());
  };

  const handleSearch = () => {
    dispatch(setSearchValue(tempSearchValue));
    const nextPaginationModel = { pageSize: paginationModel.pageSize, page: 0 };
    setPaginationModel(nextPaginationModel);
    dispatch(setIdVerificationPaginationModel(nextPaginationModel));
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
      renderCell: (params) => getFreightForwarder(params.row),
    },
    {
      field: 'proCount',
      headerName: 'Pro Count',
      flex: 0.7,
      minWidth: 90,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Typography sx={{ fontSize: 13 }}>
            {params.row.proDetails?.length || 0}
          </Typography>
        </Box>
      ),
    },
    // { field: 'firstIdPhotoMatch', headerName: 'Photo Match', flex: 0.7, minWidth: 100 },
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
          <IconButton
            size="small"
            aria-label={`View verification ${params.row.verificationId}`}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              handleViewVerification(params.row);
            }}
            sx={{ color: '#555' }}
          >
            <Iconify icon="mdi:eye" width={20} />
          </IconButton>
        </Box>
      ),
    },
  ];

  const filterColumns = useMemo(
    () => [
      ...columns.filter((column) => !['actions', 'proCount', 'createdAt', 'doorNo'].includes(column.field)),
      { field: 'startDate', headerName: 'Start Date' },
      { field: 'endDate', headerName: 'End Date' },
    ],
    [columns]
  );

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
              placeholder="Search verification ID..."
              value={tempSearchValue}
              onChange={(e) => dispatch(setTempSearchValue(e.target.value))}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
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
                      gap: 0.5,
                      pr: 1,
                    }}
                  >
                    {tempSearchValue && (
                      <IconButton
                        size="small"
                        onClick={() => {
                          dispatch(setTempSearchValue(''));
                          dispatch(setSearchValue(''));
                          const nextPaginationModel = { pageSize: paginationModel.pageSize, page: 0 };
                          setPaginationModel(nextPaginationModel);
                          dispatch(setIdVerificationPaginationModel(nextPaginationModel));
                        }}
                        edge="end"
                        sx={{ cursor: 'pointer' }}
                      >
                        <ClearIcon fontSize="small" sx={{ color: '#999' }} />
                      </IconButton>
                    )}
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'pointer',
                      }}
                      onClick={handleSearch}
                    >
                      <Iconify icon="eva:search-fill" width={20} sx={{ color: '#999' }} />
                    </Box>
                  </Box>
                ),
              }}
            />
            <IconButton
              size="small"
              onClick={(e) => setFilterAnchorEl(e.currentTarget)}
              sx={{
                color: hasAppliedFilters ? '#1976d2' : '#999',
                bgcolor: hasAppliedFilters ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
                '&:hover': {
                  bgcolor: hasAppliedFilters ? 'rgba(25, 118, 210, 0.12)' : 'rgba(0, 0, 0, 0.04)',
                },
              }}
            >
              <FilterListIcon />
            </IconButton>
          </Stack>

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
          disableColumnFilter
          slots={{
            noRowsOverlay: CustomNoRowsOverlay,
          }}
          sx={{
            '& .MuiDataGrid-root': { border: 'none' },
            '& .MuiDataGrid-cell': { borderBottom: '1px solid #e0e0e0' },
            '& .MuiDataGrid-columnHeaders': { fontWeight: 'bold !important', fontSize: '14px !important' },
            '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 'bold', fontSize: '14px' },
          }}
        />

        {/* Empty State - REMOVED: Custom "No records found" message is now inside the DataGrid */}

        {/* Filter Popover */}
        <Popover
          open={Boolean(filterAnchorEl)}
          anchorEl={filterAnchorEl}
          onClose={() => setFilterAnchorEl(null)}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          <Paper sx={{ p: 2, width: 520, maxWidth: '90vw' }}>
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2">Logic Operator</Typography>
                <IconButton
                  size="small"
                  onClick={() => setFilterAnchorEl(null)}
                  sx={{ p: 0 }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
              <StyledTextField
                select
                value={logicOperator}
                onChange={(e) => dispatch(setLogicOperator(e.target.value))}
                size="small"
                sx={{ mb: 2, width: 150 }}
                SelectProps={{ MenuProps: { disablePortal: true } }}
              >
                <MenuItem value="and">And</MenuItem>
                <MenuItem value="or">Or</MenuItem>
              </StyledTextField>

              {filters.map((filter) => (
                <Box
                  key={filter.id}
                  sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}
                >
                  <StyledTextField
                    select
                    value={filter.field}
                    onChange={(e) => updateFilter(filter.id, 'field', e.target.value)}
                    size="small"
                    displayEmpty
                    sx={{ width: 170, flexShrink: 0 }}
                    SelectProps={{ MenuProps: { disablePortal: true } }}
                  >
                    <MenuItem value="" disabled>Select Column</MenuItem>
                    {filterColumns.map((column) => {
                      const selectedFields = getSelectedFields(filter.id);
                      const isDisabled = selectedFields.includes(column.field);
                      return (
                        <MenuItem key={column.field} value={column.field} disabled={isDisabled} sx={{ opacity: isDisabled ? 0.5 : 1 }}>
                          {column.headerName || column.field}
                        </MenuItem>
                      );
                    })}
                  </StyledTextField>

                  {['startDate', 'endDate'].includes(filter.field) ? (
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                      <DatePicker
                        format="MM/DD/YYYY"
                        value={filter.value ? dayjs(filter.value) : null}
                        onChange={(newValue) => {
                          updateFilter(
                            filter.id,
                            'value',
                            newValue && newValue.isValid() ? newValue.format('YYYY-MM-DD') : ''
                          );
                        }}
                        slotProps={{
                          textField: {
                            size: 'small',
                            placeholder: 'Select date...',
                            sx: { width: 260 },
                          },
                          popper: {
                            disablePortal: true,
                          },
                        }}
                      />
                    </LocalizationProvider>
                  ) : (
                    <StyledTextField
                      size="small"
                      placeholder="Filter value..."
                      value={filter.value}
                      onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
                      sx={{ width: 260 }}
                      InputProps={{
                        endAdornment: filter.value ? (
                          <InputAdornment position="end">
                            <IconButton
                              size="small"
                              onClick={() => updateFilter(filter.id, 'value', '')}
                              edge="end"
                            >
                              <ClearIcon fontSize="small" />
                            </IconButton>
                          </InputAdornment>
                        ) : null,
                      }}
                    />
                  )}

                  <IconButton
                    onClick={() => removeFilter(filter.id)}
                    color="error"
                    size="small"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}

              <Button size="small" onClick={addFilter} sx={{ mt: 1 }}>
                + Add Filter Condition
              </Button>

              <Box mt={3} display="flex" justifyContent="flex-end" gap={1}>
                <Button variant="outlined" onClick={handleClearFilters}>
                  Clear
                </Button>
                <Button variant="contained" onClick={handleApplyFilters}>
                  Apply Filter
                </Button>
              </Box>
            </Box>
          </Paper>
        </Popover>
      </Stack>
    </ShipmentFormLayout>
  );
}
