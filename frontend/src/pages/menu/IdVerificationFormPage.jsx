import { useState } from 'react';
import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import ShipmentFormLayout from '../../sections/shared/ShipmentFormLayout';
import Iconify from '../../components/iconify';

// Dummy data
const DUMMY_DATA = [
  {
    id: 1,
    idVerificationNo: '100002001',
    driverName: 'Sam',
    entryDoor: '05',
    deliverCarrier: 'CARGO',
    freightForwarder: 'Innovations LLC',
    pro: 'PTLZ22214 05012027',
    shipper: 'CHH',
    dateCreated: '03/15/2026',
  },
  {
    id: 2,
    idVerificationNo: '100002002',
    driverName: 'Alexis',
    entryDoor: '05',
    deliverCarrier: 'G-NEW',
    freightForwarder: 'Innovations LLC',
    pro: 'PTLZ22214 05012028',
    shipper: 'CHH',
    dateCreated: '07/22/2026',
  },
  {
    id: 3,
    idVerificationNo: '100002003',
    driverName: 'William',
    entryDoor: '01',
    deliverCarrier: 'ROAD ONE',
    freightForwarder: 'Ventana Serra LLC',
    pro: 'PTLZ22214 05012029',
    shipper: 'CHH',
    dateCreated: '11/09/2026',
  },
];

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
  const [searchValue, setSearchValue] = useState('');
  const [filteredData, setFilteredData] = useState(DUMMY_DATA);

  const handleSearch = () => {
    if (!searchValue.trim()) {
      setFilteredData(DUMMY_DATA);
      return;
    }
    const filtered = DUMMY_DATA.filter(
      (row) =>
        row.idVerificationNo.toLowerCase().includes(searchValue.toLowerCase()) ||
        row.driverName.toLowerCase().includes(searchValue.toLowerCase()) ||
        row.pro.toLowerCase().includes(searchValue.toLowerCase())
    );
    setFilteredData(filtered);
  };

  const handleClearSearch = () => {
    setSearchValue('');
    setFilteredData(DUMMY_DATA);
  };

  const columns = [
    {
      field: 'idVerificationNo',
      headerName: 'ID Verification No',
      width: 150,
      renderCell: (params) => (
        <Typography sx={{ fontWeight: 700, fontSize: 13 }}>
          {params.value}
        </Typography>
      ),
    },
    { field: 'driverName', headerName: "Driver's Name", width: 120 },
    { field: 'entryDoor', headerName: 'Entry Door', width: 100 },
    { field: 'deliverCarrier', headerName: 'Deliver Carrier', width: 130 },
    { field: 'freightForwarder', headerName: 'Freight Forwarder', flex: 1, minWidth: 140 },
    { field: 'pro', headerName: 'Pro', width: 160 },
    { field: 'shipper', headerName: 'Shipper', width: 100 },
    { field: 'dateCreated', headerName: 'Date Created', width: 120 },
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
    >
      <Stack spacing={3}>
        {/* Search Section */}
        <Box
          sx={{
            border: '1px solid #e0e0e0',
            borderRadius: 1,
            p: 2,
            bgcolor: '#fafafa',
          }}
        >
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-end">
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: 12, color: '#555', mb: 0.5 }}>
                Search by ID Verification No, Driver Name, or PRO
              </Typography>
              <TextField
                fullWidth
                size="small"
                variant="outlined"
                placeholder="Enter search value"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </Box>
            <Button
              variant="contained"
              size="small"
              onClick={handleSearch}
              sx={{ ...actionBtnSx, minWidth: 90, height: 36 }}
            >
              Search
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={handleClearSearch}
              sx={{ color: '#333', borderColor: '#aaa', height: 36 }}
            >
              Clear
            </Button>
          </Stack>
        </Box>

        {/* Data Grid */}
        <Box
          sx={{
            border: '1px solid #e0e0e0',
            borderRadius: 1,
            overflow: 'hidden',
          }}
        >
          <DataGrid
            rows={filteredData}
            columns={columns}
            autoHeight
            disableRowSelectionOnClick
            hideFooter
            sx={{
              border: 'none',
              '& .MuiDataGrid-columnHeaders': { bgcolor: '#f5f5f5' },
              '& .MuiDataGrid-row:nth-of-type(even)': { bgcolor: '#fafafa' },
            }}
          />
        </Box>

        {/* Empty State */}
        {filteredData.length === 0 && (
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
