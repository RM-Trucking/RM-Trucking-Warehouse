import PropTypes from 'prop-types';
import { useState } from 'react';
import { useForm, Controller, useFieldArray, useWatch } from 'react-hook-form';
import { 
    Typography, Stack, Grid, IconButton, Box, MenuItem, 
    Chip, Dialog, DialogTitle, DialogContent, 
    Checkbox
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

import StyledTextField from '../../sections/shared/StyledTextField';
import Iconify from '../../components/iconify';
import ShipmentFormLayout, { TopInfoPanel } from '../../sections/shared/ShipmentFormLayout';

// Mock Data for the Pro Number Modal
const MOCK_PRO_LIST = [
    { id: 1, proNumber: '30021816', status: 'On-Hand', customer: 'VENTANA SERRA LLC | | FL', station: 'Station 1' },
    { id: 2, proNumber: '30021817', status: 'On-Hand', customer: 'VENTANA SERRA LLC | | FL', station: 'Station 2' },
    { id: 3, proNumber: '30021818', status: 'On-Hand', customer: 'VENTANA SERRA LLC | | FL', station: 'Station 3' },
    { id: 4, proNumber: '30021819', status: 'On-Hand', customer: 'VENTANA SERRA LLC | | FL', station: 'Station 4' },
    { id: 5, proNumber: '30021820', status: 'On-Hand', customer: 'VENTANA SERRA LLC | | FL', station: 'Station 5' },
    { id: 6, proNumber: '30021821', status: 'On-Hand', customer: 'VENTANA SERRA LLC | | FL', station: 'Station 6' },
];

NewOceanFCLShipmentForm.propTypes = {
    handleClose: PropTypes.func.isRequired,
};

export default function NewOceanFCLShipmentForm({ handleClose }) {
    const defaultValues = {
        rmProNo: '',
        customer: '',
        station: '',
        destination: '',
        consignee: '',
        booking: '',
        customerRefNumber: '',
        additionalRefNumber: '',
        bookingDate: dayjs('2026-02-26'),
        earlyReturnDate: dayjs('2026-02-26'),
        dropByDate: dayjs('2026-02-26'),
        containerNo: '',
        instructions: 'UN1234, Biomedical waste N.O.S. , (Sulfate), 2.4A, N/A, 200 lbs',
        loadManifestType: 'Direct Entry',
        warehouses: [{ warehouseNo: '', pieces: 5, weight: 100 }],
        proNumbers: ['736738768', '736738768'],
        fromDate: dayjs('2026-02-26'), // Added for Date Selection
        toDate: dayjs('2026-03-26'),   // Added for Date Selection
    };

    const { control, handleSubmit, watch, setValue } = useForm({ defaultValues });

    const [barcodeValue, setBarcodeValue] = useState('');
    const [openProModal, setOpenProModal] = useState(false);

    const rmProValue = useWatch({ control, name: 'rmProNo' });
    const selectedManifestType = watch('loadManifestType');
    const selectedProNumbers = watch('proNumbers') || [];

    const { fields: warehouseFields, append: appendWarehouse, remove: removeWarehouse } = useFieldArray({
        control,
        name: "warehouses"
    });

    const watchedWarehouses = watch("warehouses");
    const totalPieces = watchedWarehouses.reduce((sum, item) => sum + (Number(item.pieces) || 0), 0);
    const totalWeight = watchedWarehouses.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);

    const handleToggleProNumber = (proNumber) => {
        if (selectedProNumbers.includes(proNumber)) {
            setValue('proNumbers', selectedProNumbers.filter((p) => p !== proNumber));
        } else {
            setValue('proNumbers', [...selectedProNumbers, proNumber]);
        }
    };

    const proColumns = [
        {
            field: 'proNumber',
            headerName: 'Pro Number',
            flex: 1,
            minWidth: 160,
            renderCell: (params) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Checkbox
                        size="small"
                        checked={selectedProNumbers.includes(params.row.proNumber)}
                        onChange={() => handleToggleProNumber(params.row.proNumber)}
                    />
                    {params.row.proNumber}
                </Box>
            ),
        },
        {
            field: 'status',
            headerName: 'Status',
            width: 120,
            renderCell: (params) => (
                <Chip
                    label={params.value}
                    size="small"
                    sx={{ bgcolor: '#66bb6a', color: '#fff', borderRadius: '8px', fontWeight: 600, height: '24px' }}
                />
            ),
        },
        { field: 'customer', headerName: 'Customer', flex: 1.2, minWidth: 220 },
        { field: 'station', headerName: 'Station', width: 120 },
        {
            field: 'action',
            headerName: 'Action',
            width: 90,
            sortable: false,
            filterable: false,
            align: 'center',
            headerAlign: 'center',
            renderCell: () => (
                <IconButton size="small" sx={{ color: '#000' }}>
                    <Iconify icon="carbon:view" width={20} />
                </IconButton>
            ),
        },
    ];

    const onSubmit = (data) => {
        console.log('Form Submitted (Ocean FCL):', data);
    };

    return (
        <ShipmentFormLayout
            title="New Ocean FCL Shipment Form"
            handleClose={handleClose}
            onSubmit={handleSubmit(onSubmit)}
            topInfoPanel={
                <TopInfoPanel 
                    showBarcodeGraphic={false}
                    barcodeValue={barcodeValue}
                    onBarcodeGenerate={() => setBarcodeValue(rmProValue)}
                    rmProInputNode={
                        <Controller
                            name="rmProNo"
                            control={control}
                            render={({ field }) => (
                                <Box sx={{ bgcolor: '#fff', borderRadius: 0.5 }}>
                                    <StyledTextField {...field} variant="outlined" size="small" fullWidth sx={{ '& .MuiOutlinedInput-root': { height: '30px' } }} />
                                </Box>
                            )}
                        />
                    }
                />
            }
        >
            <Stack spacing={4}>
                {/* --- Customer Details --- */}
                <fieldset style={{ borderColor: '#b0b0b0', borderRadius: '8px', padding: '16px' }}>
                    <legend><Typography variant="subtitle2" sx={{ fontWeight: '600', px: 1 }}>Customer Details</Typography></legend>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                        <Controller name="customer" control={control} rules={{ required: 'Required' }} render={({ field, fieldState: { error } }) => (
                            <StyledTextField {...field} variant="standard" fullWidth label="Customer / Freight Forwarder *" error={!!error} />
                        )} />
                        <Controller name="station" control={control} rules={{ required: 'Required' }} render={({ field, fieldState: { error } }) => (
                            <StyledTextField {...field} variant="standard" fullWidth label="Station *" error={!!error} />
                        )} />
                        <Controller name="destination" control={control} rules={{ required: 'Required' }} render={({ field, fieldState: { error } }) => (
                            <StyledTextField {...field} variant="standard" fullWidth label="Destination *" error={!!error} />
                        )} />
                        <Controller name="consignee" control={control} render={({ field }) => (
                            <StyledTextField {...field} variant="standard" fullWidth label="Consignee" />
                        )} />
                    </Stack>
                </fieldset>

                {/* --- Booking Details --- */}
                <fieldset style={{ borderColor: '#b0b0b0', borderRadius: '8px', padding: '16px' }}>
                    <legend><Typography variant="subtitle2" sx={{ fontWeight: '600', px: 1 }}>Booking Details</Typography></legend>
                    <Stack spacing={3}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                            <Controller name="booking" control={control} render={({ field }) => (
                                <StyledTextField {...field} variant="standard" fullWidth label="Booking" />
                            )} />
                            <Controller name="customerRefNumber" control={control} rules={{ required: 'Required' }} render={({ field, fieldState: { error } }) => (
                                <StyledTextField {...field} variant="standard" fullWidth label="Customer Ref Number *" error={!!error} />
                            )} />
                            <Controller name="additionalRefNumber" control={control} render={({ field }) => (
                                <StyledTextField {...field} variant="standard" fullWidth label="Additional Ref Number" />
                            )} />
                            <Box sx={{ width: '100%' }} /> 
                        </Stack>
                        
                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                                <Controller name="bookingDate" control={control} render={({ field: { onChange, value } }) => (
                                    <DatePicker label="Date" format="MM/DD/YYYY" value={value} onChange={onChange} slotProps={{ textField: { variant: "standard", fullWidth: true, InputLabelProps: { shrink: true } } }} />
                                )} />
                                <Controller name="earlyReturnDate" control={control} render={({ field: { onChange, value } }) => (
                                    <DatePicker label="Early Return Date" format="MM/DD/YYYY" value={value} onChange={onChange} slotProps={{ textField: { variant: "standard", fullWidth: true, InputLabelProps: { shrink: true } } }} />
                                )} />
                                <Controller name="dropByDate" control={control} render={({ field: { onChange, value } }) => (
                                    <DatePicker label="Drop by Date" format="MM/DD/YYYY" value={value} onChange={onChange} slotProps={{ textField: { variant: "standard", fullWidth: true, InputLabelProps: { shrink: true } } }} />
                                )} />
                                <Box sx={{ width: '100%' }} /> 
                            </Stack>
                        </LocalizationProvider>
                    </Stack>
                </fieldset>

                {/* --- Mid Section --- */}
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={4} alignItems="flex-start">
                    <Box sx={{ width: '25%' }}>
                        <Controller name="containerNo" control={control} rules={{ required: 'Required' }} render={({ field, fieldState: { error } }) => (
                            <StyledTextField {...field} variant="standard" fullWidth label="Container No *" error={!!error} sx={{ mt: 1.5 }} />
                        )} />
                    </Box>
                    
                    <Box sx={{ width: '45%' }}>
                        <fieldset style={{ borderColor: '#b0b0b0', borderRadius: '8px', padding: '12px' }}>
                            <legend><Typography variant="subtitle2" sx={{ fontWeight: '600', px: 1 }}>Instructions</Typography></legend>
                            <Controller name="instructions" control={control} render={({ field }) => (
                                <StyledTextField {...field} variant="standard" fullWidth multiline InputProps={{ disableUnderline: true }} sx={{ '& .MuiInputBase-root': { padding: 0 } }} />
                            )} />
                        </fieldset>
                    </Box>

                    <Box sx={{ width: '30%' }}>
                        <Controller name="loadManifestType" control={control} rules={{ required: 'Required' }} render={({ field, fieldState: { error } }) => (
                            <StyledTextField select {...field} variant="standard" fullWidth label="Select Load Manifest Type *" error={!!error} sx={{ mt: 1.5 }}>
                                <MenuItem value="Direct Entry">Direct Entry</MenuItem>
                                <MenuItem value="Pro Entry Search">Pro Entry Search</MenuItem>
                                <MenuItem value="FromToDateSelection">From & To Date Selection</MenuItem>
                            </StyledTextField>
                        )} />
                    </Box>
                </Stack>

                {/* --- Bottom Dynamic Section based on Manifest Type --- */}

                {/* 1. Show Warehouse Table if 'Direct Entry' */}
                {selectedManifestType === 'Direct Entry' && (
                    <Grid container spacing={4}>
                        <Grid item xs={12} md={7}>
                            <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 2, overflow: 'hidden' }}>
                                {/* Table Header */}
                                <Stack direction="row" sx={{ bgcolor: '#dbdbdb', p: 1 }}>
                                    <Typography sx={{ width: '10%', fontWeight: 600, fontSize: '13px', pl: 1 }}>Sno</Typography>
                                    <Typography sx={{ width: '40%', fontWeight: 600, fontSize: '13px' }}>Warehouse #</Typography>
                                    <Typography sx={{ width: '20%', fontWeight: 600, fontSize: '13px' }}>Pieces</Typography>
                                    <Typography sx={{ width: '20%', fontWeight: 600, fontSize: '13px' }}>Weight (lbs)</Typography>
                                    <Typography sx={{ width: '10%', fontWeight: 600, fontSize: '13px', textAlign: 'center' }}>Actions</Typography>
                                </Stack>

                                {/* Table Body */}
                                {warehouseFields.map((item, index) => (
                                    <Stack direction="row" alignItems="center" sx={{ p: 1, borderBottom: '1px solid #f0f0f0' }} key={item.id}>
                                        <Box sx={{ width: '10%', pl: 1 }}>
                                            <Typography sx={{ fontSize: '13px', color: '#555' }}>{String(index + 1).padStart(2, '0')}</Typography>
                                        </Box>
                                        <Box sx={{ width: '40%', pr: 1 }}>
                                            <Controller name={`warehouses.${index}.warehouseNo`} control={control} render={({ field }) => (
                                                <StyledTextField {...field} size="small" variant="standard" InputProps={{ disableUnderline: true }} sx={{ bgcolor: 'transparent' }} />
                                            )} />
                                        </Box>
                                        <Box sx={{ width: '20%', pr: 1 }}>
                                            <Controller name={`warehouses.${index}.pieces`} control={control} render={({ field }) => (
                                                <StyledTextField {...field} type="number" size="small" variant="standard" InputProps={{ disableUnderline: true }} sx={{ bgcolor: 'transparent' }} />
                                            )} />
                                        </Box>
                                        <Box sx={{ width: '20%', pr: 1 }}>
                                            <Controller name={`warehouses.${index}.weight`} control={control} render={({ field }) => (
                                                <StyledTextField {...field} type="number" size="small" variant="standard" InputProps={{ disableUnderline: true }} sx={{ bgcolor: 'transparent' }} />
                                            )} />
                                        </Box>
                                        <Box sx={{ width: '10%', textAlign: 'center' }}>
                                            {index === warehouseFields.length - 1 ? (
                                                <IconButton size="small" onClick={() => appendWarehouse({ warehouseNo: '', pieces: '', weight: '' })} sx={{ bgcolor: '#A22', color: '#fff', borderRadius: '4px', p: '2px', '&:hover': { bgcolor: '#8b1c1c' } }}>
                                                    <Iconify icon="akar-icons:plus" width={16} />
                                                </IconButton>
                                            ) : (
                                                <IconButton size="small" onClick={() => removeWarehouse(index)} sx={{ color: '#000' }}>
                                                    <Iconify icon="mingcute:delete-2-fill" width={18} />
                                                </IconButton>
                                            )}
                                        </Box>
                                    </Stack>
                                ))}

                                {/* Table Footer with Sums */}
                                <Stack direction="row" alignItems="center" sx={{ p: 1, borderTop: '2px solid #e0e0e0', mt: 1 }}>
                                    <Box sx={{ width: '10%' }} />
                                    <Box sx={{ width: '40%' }} />
                                    <Box sx={{ width: '20%' }}>
                                        <Typography sx={{ fontWeight: 600, fontSize: '14px' }}>{totalPieces}</Typography>
                                    </Box>
                                    <Box sx={{ width: '20%' }}>
                                        <Typography sx={{ fontWeight: 600, fontSize: '14px' }}>{totalWeight}</Typography>
                                    </Box>
                                    <Box sx={{ width: '10%' }} />
                                </Stack>
                            </Box>
                        </Grid>
                    </Grid>
                )}

                {/* 2. Show PRO No Section if 'Pro Entry Search' */}
                {selectedManifestType === 'Pro Entry Search' && (
                    <fieldset style={{ borderColor: '#b0b0b0', borderRadius: '8px', padding: '16px', maxWidth: '600px' }}>
                        <legend><Typography variant="subtitle2" sx={{ fontWeight: '600', px: 1 }}>PRO No</Typography></legend>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
                            {selectedProNumbers.map((proNum, index) => (
                                <Chip
                                    key={`${proNum}-${index}`}
                                    label={proNum}
                                    onDelete={() => handleToggleProNumber(proNum)}
                                    sx={{ bgcolor: '#e0f0fa', color: '#000', borderRadius: '16px', fontWeight: 500 }}
                                />
                            ))}
                            <IconButton 
                                size="small" 
                                onClick={() => setOpenProModal(true)}
                                sx={{ bgcolor: '#b82d2d', color: '#fff', borderRadius: '4px', p: '4px', '&:hover': { bgcolor: '#8b1c1c' } }}
                            >
                                <Iconify icon="akar-icons:plus" width={16} />
                            </IconButton>
                        </Box>
                    </fieldset>
                )}

                {/* 3. Show Date Selection Section if 'FromToDateSelection' */}
                {selectedManifestType === 'FromToDateSelection' && (
                    <fieldset style={{ borderColor: '#b0b0b0', borderRadius: '8px', padding: '16px', maxWidth: '600px' }}>
                        <legend><Typography variant="subtitle2" sx={{ fontWeight: '600', px: 1 }}>Date Selection</Typography></legend>
                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                                <Controller name="fromDate" control={control} render={({ field: { onChange, value } }) => (
                                    <DatePicker label="From Date" format="MM/DD/YYYY" value={value} onChange={onChange} slotProps={{ textField: { variant: "standard", fullWidth: true, InputLabelProps: { shrink: true } } }} />
                                )} />
                                <Controller name="toDate" control={control} render={({ field: { onChange, value } }) => (
                                    <DatePicker label="To Date" format="MM/DD/YYYY" value={value} onChange={onChange} slotProps={{ textField: { variant: "standard", fullWidth: true, InputLabelProps: { shrink: true } } }} />
                                )} />
                            </Stack>
                        </LocalizationProvider>
                    </fieldset>
                )}

            </Stack>

            {/* --- Dialog / Modal for Pro Entry Search --- */}
            <Dialog open={openProModal} onClose={() => setOpenProModal(false)} maxWidth="md" fullWidth>
                <DialogTitle sx={{ pb: 1, pt: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>Pro Number List</Typography>
                    <Box sx={{ width: '100%', height: '1px', bgcolor: '#e0e0e0', mt: 2 }} />
                </DialogTitle>
                <DialogContent sx={{ p: 3, pt: 0 }}>
                    <Box sx={{ border: '1px solid #f0f0f0', borderRadius: 1, overflow: 'hidden' }}>
                        <DataGrid
                            rows={MOCK_PRO_LIST}
                            columns={proColumns}
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
                </DialogContent>
            </Dialog>

        </ShipmentFormLayout>
    );
}