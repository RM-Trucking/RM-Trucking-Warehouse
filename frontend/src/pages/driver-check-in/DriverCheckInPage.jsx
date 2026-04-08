import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Collapse,
  IconButton,
  Stack,
  Typography
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import StyledTextField from '../../sections/shared/StyledTextField';
import StyledCheckbox from '../../sections/shared/StyledCheckBox';
import ShipmentFormLayout from '../../sections/shared/ShipmentFormLayout';
import Iconify from '../../components/iconify';

const actionBtnSx = {
  bgcolor: '#A22',
  color: '#fff',
  textTransform: 'none',
  minWidth: 96,
  height: 30,
  px: 2,
  fontSize: 12,
  '&:hover': { bgcolor: '#8b1c1c' }
};

const INITIAL_GROUPS = [
  {
    id: 'KUEHNE_NAGEL',
    label: 'Freight Forwarder - KUEHNE & NAGEL | Elk Grove Village | IL',
    entries: [
      { id: 1, sno: '01', pro: 'PRO7898710001', pieces: 20, weight: 600, shipper: 'Shipper052' },
      { id: 2, sno: '02', pro: 'PRO7898710001', pieces: 20, weight: 600, shipper: 'Shipper052' },
      { id: 3, sno: '03', pro: 'PRO7898710001', pieces: 20, weight: 600, shipper: 'Shipper052' },
      { id: 4, sno: '04', pro: 'PRO7898710001', pieces: 20, weight: 600, shipper: 'Shipper052' },
    ],
  },
  {
    id: 'SEACOAST',
    label: 'Freight Forwarder - SEACOAST | Elk Grove Village | IL',
    entries: [
      { id: 1, sno: '01', pro: 'PRO7898710001', pieces: 20, weight: 600, shipper: 'Shipper052' },
    ],
  },
];

export default function DriverCheckInPage() {
  const navigate = useNavigate();
  const [proGroups, setProGroups] = useState(INITIAL_GROUPS);
  const [collapsed, setCollapsed] = useState({});
  const [formValues, setFormValues] = useState({
    freightForwarder: '',
    pro: '',
    pieces: '',
    weight: '',
    shipper: '',
  });

  const toggleCollapse = (groupId) =>
    setCollapsed((prev) => ({ ...prev, [groupId]: !prev[groupId] }));

  const handleFormChange = (field) => (e) =>
    setFormValues((prev) => ({ ...prev, [field]: e.target.value }));

  const addEntry = (freightForwarder, pro, pieces, weight, shipper) => {
    if (!freightForwarder || !pro) return;
    const groupId = freightForwarder.toUpperCase().replace(/\s+/g, '_');
    const newEntry = { id: Date.now(), sno: '01', pro, pieces: Number(pieces), weight: Number(weight), shipper };
    setProGroups((prev) => {
      const existing = prev.find((g) => g.id === groupId);
      if (existing) {
        return prev.map((g) =>
          g.id === groupId ? { ...g, entries: [...g.entries, newEntry] } : g
        );
      }
      return [
        ...prev,
        {
          id: groupId,
          label: `Freight Forwarder - ${freightForwarder} | Elk Grove Village | IL`,
          entries: [newEntry],
        },
      ];
    });
  };

  const handleFormAdd = () => {
    const { freightForwarder, pro, pieces, weight, shipper } = formValues;
    addEntry(freightForwarder, pro, pieces, weight, shipper);
    setFormValues({ freightForwarder: '', pro: '', pieces: '', weight: '', shipper: '' });
  };

  const handleDelete = (groupId, entryId) => {
    setProGroups((prev) =>
      prev
        .map((g) =>
          g.id === groupId ? { ...g, entries: g.entries.filter((e) => e.id !== entryId) } : g
        )
        .filter((g) => g.entries.length > 0)
    );
  };

  const handleGroupAdd = (groupId) => {
    setProGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        const nextSno = String(g.entries.length + 1).padStart(2, '0');
        const newEntry = { id: Date.now(), sno: nextSno, pro: '', pieces: '', weight: '', shipper: '' };
        return { ...g, entries: [...g.entries, newEntry] };
      })
    );
  };

  const getColumns = (groupId) => [
    { field: 'sno', headerName: 'SNo', width: 60 },
    {
      field: 'pro',
      headerName: 'PRO #',
      flex: 1,
      minWidth: 140,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Typography sx={{ fontWeight: 700, fontSize: '13px' }}>{params.value}</Typography>
        </Box>
      ),
    },
    { field: 'pieces', headerName: 'Pieces', flex: 1, minWidth: 80 },
    { field: 'weight', headerName: 'Weight (lbs)', flex: 1, minWidth: 110 },
    { field: 'shipper', headerName: 'Shipper', flex: 1, minWidth: 120 },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5} alignItems="center">
          <IconButton size="small" sx={{ color: '#555' }}>
            <Iconify icon="mdi:pencil-outline" width={18} />
          </IconButton>
          <IconButton size="small" sx={{ color: '#555' }} onClick={() => handleDelete(groupId, params.row.id)}>
            <Iconify icon="mingcute:delete-2-fill" width={18} />
          </IconButton>
        </Stack>
      ),
    },
  ];

  return (
    <ShipmentFormLayout
      title="Driver Check-In"
      handleClose={() => navigate(-1)}
      onSubmit={() => {}}
    >
      <Stack spacing={4}>
        <fieldset style={{ borderColor: '#b0b0b0', borderRadius: '8px', padding: '16px' }}>
          <legend><Typography variant="subtitle2" sx={{ fontWeight: 600, px: 1 }}>Carrier & Door</Typography></legend>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="flex-end">
            <StyledTextField
              variant="standard"
              size="small"
              required
              label="Delivering Carrier"
              defaultValue="Truck"
              sx={{ width: { xs: '100%', md: '23%' } }}
            />
            <StyledTextField
              variant="standard"
              size="small"
              required
              label="Door"
              sx={{ width: { xs: '100%', md: '23%' } }}
            />
            <Button variant="contained" size="small" sx={actionBtnSx}>Add Carrier</Button>
          </Stack>
        </fieldset>

        <fieldset style={{ borderColor: '#b0b0b0', borderRadius: '8px', padding: '16px' }}>
          <legend><Typography variant="subtitle2" sx={{ fontWeight: 600, px: 1 }}>Driver Details</Typography></legend>
          <Stack spacing={4}>
            
            {/* Row 1: Driver Name & Signature */}
            <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3} alignItems="flex-end">
              <Stack direction="row" spacing={2} alignItems="center" sx={{ width: { xs: '100%', lg: '46%' } }}>
                <StyledTextField
                  variant="standard"
                  size="small"
                  required
                  label="Driver Name"
                  defaultValue="William"
                  sx={{ flex: 1 }}
                />
                <Button variant="contained" size="small" sx={{ ...actionBtnSx, minWidth: 110, flexShrink: 0 }}>Get Signature</Button>
              </Stack>

              <Box
                sx={{
                  width: { xs: '100%', lg: '26%' },
                  height: 50,
                  border: '1px dashed #707070',
                  borderRadius: 1,
                  bgcolor: '#e6e6e6'
                }}
              />

              <Box sx={{ width: { xs: '100%', lg: '28%' } }} />
            </Stack>

            {/* Row 2: First ID Reviewed */}
            <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3} alignItems="center">
              <Typography sx={{ width: { xs: '100%', lg: '46%' }, fontSize: '0.8rem' }}>
                TYPE OF FIRST ID REVIEWED. (GOVERNMENT ISSUED ID OR COMPANY ISSUED)
              </Typography>
              <StyledTextField 
                variant="standard" 
                size="small" 
                placeholder="ID Type" 
                sx={{ width: { xs: '100%', lg: '26%' } }} 
              />
              <Stack direction="row" alignItems="center" sx={{ width: { xs: '100%', lg: '28%' } }}>
                <StyledCheckbox size="small" sx={{ p: 0, mr: 1 }} />
                <Typography sx={{ fontSize: 12, lineHeight: 1.2 }}>MATCHING PHOTO ON ID</Typography>
              </Stack>
            </Stack>

            {/* Row 3: Second ID Reviewed */}
            <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3} alignItems="center">
              <Typography sx={{ width: { xs: '100%', lg: '46%' }, fontSize: '0.8rem' }}>
                TYPE OF SECOND ID REVIEWED (IF THE FIRST ID WAS NOT A PHOTO ID ISSUED BY A GOVERNMENT AUTHORITY OR IS NOT A COMPANY 10)
              </Typography>
              <StyledTextField 
                variant="standard" 
                size="small" 
                placeholder="ID Type" 
                sx={{ width: { xs: '100%', lg: '26%' } }} 
              />
              <Stack direction="row" alignItems="center" sx={{ width: { xs: '100%', lg: '28%' } }}>
                <StyledCheckbox size="small" sx={{ p: 0, mr: 1 }} />
                <Typography sx={{ fontSize: 12, lineHeight: 1.2 }}>MATCHING PHOTO ON ID</Typography>
              </Stack>
            </Stack>

            {/* Row 4: Shipper's Company Name */}
            <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3} alignItems="center">
              <Typography sx={{ width: { xs: '100%', lg: '46%' }, fontSize: '0.8rem' }}>
                SHIPPER'S COMPANY NAME (WHERE APPLICABLE)
              </Typography>
              <StyledTextField
                variant="standard"
                size="small"
                defaultValue="Listed Above"
                sx={{ width: { xs: '100%', lg: '26%' } }}
              />
              <Box sx={{ width: { xs: '100%', lg: '28%' } }} />
            </Stack>

            {/* Row 5: Verifier */}
            <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3} alignItems="center">
              <Typography sx={{ width: { xs: '100%', lg: '46%' }, fontSize: '0.8rem' }}>
                NAME OF EMPLOYEE OR AUTHORIZED REPRESENTATIVE WHO VERIFIED ID INFORMATION
              </Typography>
              <StyledTextField 
                variant="standard" 
                size="small" 
                required 
                placeholder="Verifier *" 
                sx={{ width: { xs: '100%', lg: '26%' } }} 
              />
              <Box sx={{ width: { xs: '100%', lg: '28%' } }} />
            </Stack>

          </Stack>
        </fieldset>

        <fieldset style={{ borderColor: '#b0b0b0', borderRadius: '8px', padding: '16px' }}>
          <legend><Typography variant="subtitle2" sx={{ fontWeight: 600, px: 1 }}>Pro Details</Typography></legend>
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3} alignItems="flex-end" sx={{ mb: 3 }}>
            <StyledTextField
              variant="standard" size="small" required label="Freight Forwarder"
              value={formValues.freightForwarder}
              onChange={handleFormChange('freightForwarder')}
              sx={{ width: { xs: '100%', lg: '22%' } }}
            />
            <StyledTextField
              variant="standard" size="small" required label="Pro"
              value={formValues.pro}
              onChange={handleFormChange('pro')}
              sx={{ width: { xs: '100%', lg: '22%' } }}
            />
            <StyledTextField
              variant="standard" size="small" required label="Pieces"
              value={formValues.pieces}
              onChange={handleFormChange('pieces')}
              sx={{ width: { xs: '100%', lg: '22%' } }}
            />
            <StyledTextField
              variant="standard" size="small" required label="Weight (lbs)"
              value={formValues.weight}
              onChange={handleFormChange('weight')}
              sx={{ width: { xs: '100%', lg: '22%' } }}
            />
          </Stack>
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3} alignItems="flex-end">
            <StyledTextField
              variant="standard" size="small" required label="Shipper"
              value={formValues.shipper}
              onChange={handleFormChange('shipper')}
              sx={{ width: { xs: '100%', lg: '22%' } }}
            />
            <Button variant="contained" size="small" sx={actionBtnSx} onClick={handleFormAdd}>Add</Button>
          </Stack>
        </fieldset>

        {/* Freight Forwarder grouped tables */}
        {proGroups.map((group) => (
          <Box key={group.id} sx={{ border: '1px solid #e0e0e0', borderRadius: 1, overflow: 'hidden' }}>
            {/* Group header */}
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ bgcolor: '#d9d9d9', px: 2, py: 0.75 }}
            >
              <Typography sx={{ fontWeight: 600, fontSize: '13px' }}>{group.label}</Typography>
              <Stack direction="row" alignItems="center">
                <IconButton size="small" sx={{ color: '#A22' }}>
                  <Iconify icon="mdi:email-outline" width={20} />
                </IconButton>
                <IconButton size="small" onClick={() => toggleCollapse(group.id)}>
                  <Iconify
                    icon={collapsed[group.id] ? 'mdi:chevron-up' : 'mdi:chevron-down'}
                    width={20}
                  />
                </IconButton>
              </Stack>
            </Stack>

            {/* Collapsible DataGrid */}
            <Collapse in={!collapsed[group.id]}>
              <Box sx={{ borderTop: '1px solid #f0f0f0' }}>
                <DataGrid
                  rows={group.entries}
                  columns={getColumns(group.id)}
                  getRowId={(row) => row.id}
                  autoHeight
                  disableRowSelectionOnClick
                  hideFooter
                  sx={{
                    border: 'none',
                    '& .MuiDataGrid-columnHeaders': { backgroundColor: '#f4f6f8' },
                  }}
                />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 2, py: 1, borderTop: '1px solid #f0f0f0' }}>
                <Button
                  variant="contained"
                  size="small"
                  sx={actionBtnSx}
                  onClick={() => handleGroupAdd(group.id)}
                >
                  Add
                </Button>
              </Box>
            </Collapse>
          </Box>
        ))}
      </Stack>
    </ShipmentFormLayout>
  );
}