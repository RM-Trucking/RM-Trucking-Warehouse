import PropTypes from 'prop-types';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { Typography, Stack, Grid, IconButton, Box, MenuItem } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

import StyledTextField from '../../sections/shared/StyledTextField';
import Iconify from '../../components/iconify';
import ShipmentFormLayout, { TopInfoPanel } from '../../sections/shared/ShipmentFormLayout';

NewOceanFCLShipmentForm.propTypes = {
    handleClose: PropTypes.func.isRequired,
};

export default function NewOceanFCLShipmentForm({ handleClose }) {
    // Define default values based on the Ocean FCL image mockup
    const defaultValues = {
        rmProNo: '78297982897287',
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
        // Pre-filling with one row, calculations will update dynamically
        warehouses: [{ warehouseNo: '2526752652', pieces: 5, weight: 100 }],
    };

    const { control, handleSubmit, watch } = useForm({ defaultValues });

    const { fields: warehouseFields, append: appendWarehouse, remove: removeWarehouse } = useFieldArray({
        control,
        name: "warehouses"
    });

    // Watch the warehouses array to dynamically calculate the totals in the footer
    const watchedWarehouses = watch("warehouses");
    const totalPieces = watchedWarehouses.reduce((sum, item) => sum + (Number(item.pieces) || 0), 0);
    const totalWeight = watchedWarehouses.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);

    const onSubmit = (data) => {
        console.log('Form Submitted (Ocean FCL):', data);
        // Handle API submission logic here
    };

    return (
        <ShipmentFormLayout
            title="New Ocean FCL Shipment Form"
            handleClose={handleClose}
            onSubmit={handleSubmit(onSubmit)}
            topInfoPanel={
                <TopInfoPanel 
                    showBarcodeGraphic={true} 
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
                {/* Customer Details */}
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

                {/* Booking Details */}
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
                            {/* Placeholder box to align the top row with 4 columns layout of bottom row if needed, or just let it scale */}
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

                {/* Mid Section: Container, Instructions, Manifest Type */}
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
                                <MenuItem value="Indirect Entry">Indirect Entry</MenuItem>
                            </StyledTextField>
                        )} />
                    </Box>
                </Stack>

                {/* Dynamic Warehouse Table */}
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
                                        <Typography sx={{ fontSize: '13px', color: '#555' }}>
                                            {String(index + 1).padStart(2, '0')}
                                        </Typography>
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
                                        <IconButton size="small" onClick={() => removeWarehouse(index)} sx={{ color: '#000' }}>
                                            <Iconify icon="mingcute:delete-2-fill" width={18} />
                                        </IconButton>
                                    </Box>
                                </Stack>
                            ))}

                            {/* Table Footer with Sums and Add Action */}
                            <Stack direction="row" alignItems="center" sx={{ p: 1, borderTop: '2px solid #e0e0e0', mt: 1 }}>
                                <Box sx={{ width: '10%' }} />
                                <Box sx={{ width: '40%' }} />
                                <Box sx={{ width: '20%' }}>
                                    <Typography sx={{ fontWeight: 600, fontSize: '14px' }}>{totalPieces}</Typography>
                                </Box>
                                <Box sx={{ width: '20%' }}>
                                    <Typography sx={{ fontWeight: 600, fontSize: '14px' }}>{totalWeight}</Typography>
                                </Box>
                                <Box sx={{ width: '10%', textAlign: 'center' }}>
                                    <IconButton 
                                        size="small" 
                                        onClick={() => appendWarehouse({ warehouseNo: '', pieces: '', weight: '' })} 
                                        sx={{ bgcolor: '#A22', color: '#fff', borderRadius: '4px', p: '2px', '&:hover': { bgcolor: '#8b1c1c' } }}
                                    >
                                        <Iconify icon="akar-icons:plus" width={16} />
                                    </IconButton>
                                </Box>
                            </Stack>
                        </Box>
                    </Grid>
                </Grid>
            </Stack>
        </ShipmentFormLayout>
    );
}