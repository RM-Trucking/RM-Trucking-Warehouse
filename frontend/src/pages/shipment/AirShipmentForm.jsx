import PropTypes from 'prop-types';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { Typography, Stack, Grid, IconButton, Box } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

import StyledTextField from '../../sections/shared/StyledTextField';
import Iconify from '../../components/iconify';
import ShipmentFormLayout, { TopInfoPanel } from '../../sections/shared/ShipmentFormLayout';

NewAirShipmentForm.propTypes = {
    handleClose: PropTypes.func.isRequired,
};

export default function NewAirShipmentForm({ handleClose }) {
    // Define default values based on the Air Shipment image mockup
    const defaultValues = {
        rmProNo: '',
        customer: '',
        station: '',
        airBill: '',
        consignee: '',
        booking: '',
        customerRefNumber: '',
        additionalRefNo: '',
        bookingDate: dayjs('2026-02-26'),
        instructions: 'UN1234, Biomedical waste N.O.S. , (Sulfate), 2.4A, N/A, 200 lbs',
        containers: [{ containerNo: '' }],
        warehouses: [{ warehouseNo: '' }],
    };

    const { control, handleSubmit } = useForm({ defaultValues });

    // Field arrays for dynamic Container and Warehouse lists
    const { fields: containerFields, append: appendContainer } = useFieldArray({
        control,
        name: "containers"
    });

    const { fields: warehouseFields, append: appendWarehouse } = useFieldArray({
        control,
        name: "warehouses"
    });

    const onSubmit = (data) => {
        console.log('Form Submitted (Air Shipment):', data);
        // Handle API submission logic here
    };

    return (
        <ShipmentFormLayout
            title="New Air Shipment Form"
            handleClose={handleClose}
            onSubmit={handleSubmit(onSubmit)}
            topInfoPanel={
                <TopInfoPanel 
                    showBarcodeGraphic={false} // Hides the barcode to match the Air mockup
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
                        <Controller name="airBill" control={control} rules={{ required: 'Required' }} render={({ field, fieldState: { error } }) => (
                            <StyledTextField {...field} variant="standard" fullWidth label="Air Bill *" error={!!error} />
                        )} />
                        <Controller name="consignee" control={control} render={({ field }) => (
                            <StyledTextField {...field} variant="standard" fullWidth label="Consignee" />
                        )} />
                    </Stack>
                </fieldset>

                {/* Booking Details */}
                <fieldset style={{ borderColor: '#b0b0b0', borderRadius: '8px', padding: '16px' }}>
                    <legend><Typography variant="subtitle2" sx={{ fontWeight: '600', px: 1 }}>Booking Details</Typography></legend>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                        <Controller name="booking" control={control} render={({ field }) => (
                            <StyledTextField {...field} variant="standard" fullWidth label="Booking" />
                        )} />
                        <Controller name="customerRefNumber" control={control} rules={{ required: 'Required' }} render={({ field, fieldState: { error } }) => (
                            <StyledTextField {...field} variant="standard" fullWidth label="Customer Ref Number *" error={!!error} />
                        )} />
                        <Controller name="additionalRefNo" control={control} render={({ field }) => (
                            <StyledTextField {...field} variant="standard" fullWidth label="Additional Ref No" />
                        )} />
                        
                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                            <Controller
                                name="bookingDate"
                                control={control}
                                render={({ field: { onChange, value } }) => (
                                    <DatePicker
                                        label="Date"
                                        format="MM/DD/YYYY"
                                        value={value}
                                        onChange={onChange}
                                        slotProps={{ textField: { variant: "standard", fullWidth: true, InputLabelProps: { shrink: true } } }}
                                    />
                                )}
                            />
                        </LocalizationProvider>
                    </Stack>
                </fieldset>

                {/* Instructions */}
                <fieldset style={{ borderColor: '#b0b0b0', borderRadius: '8px', padding: '16px', width: '60%' }}>
                    <legend><Typography variant="subtitle2" sx={{ fontWeight: '600', px: 1 }}>Instructions</Typography></legend>
                    <Controller name="instructions" control={control} render={({ field }) => (
                        <StyledTextField {...field} variant="standard" fullWidth multiline InputProps={{ disableUnderline: true }} sx={{ '& .MuiInputBase-root': { padding: 0 } }} />
                    )} />
                </fieldset>

                {/* Dynamic Lists Section (Container & Warehouse) */}
                <Grid container spacing={4}>
                    {/* Container Table */}
                    <Grid item xs={12} md={6}>
                        <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 2, overflow: 'hidden' }}>
                            <Stack direction="row" sx={{ bgcolor: '#dbdbdb', p: 1 }}>
                                <Typography sx={{ width: '15%', fontWeight: 600, fontSize: '13px' }}>Sno</Typography>
                                <Typography sx={{ width: '65%', fontWeight: 600, fontSize: '13px' }}>Container #</Typography>
                                <Typography sx={{ width: '20%', fontWeight: 600, fontSize: '13px', textAlign: 'center' }}>Actions</Typography>
                            </Stack>
                            {containerFields.map((item, index) => (
                                <Stack direction="row" alignItems="center" sx={{ p: 1 }} key={item.id}>
                                    <Box sx={{ width: '15%' }}>
                                        <Box sx={{ bgcolor: '#e0e0e0', p: '4px 8px', borderRadius: 1, display: 'inline-block', fontSize: '13px' }}>
                                            {String(index + 1).padStart(2, '0')}
                                        </Box>
                                    </Box>
                                    <Box sx={{ width: '65%' }}>
                                        <Controller name={`containers.${index}.containerNo`} control={control} render={({ field }) => (
                                            <StyledTextField {...field} size="small" sx={{ bgcolor: '#e0e0e0', borderRadius: 1, '& fieldset': { border: 'none' } }} />
                                        )} />
                                    </Box>
                                    <Box sx={{ width: '20%', textAlign: 'center' }}>
                                        {index === containerFields.length - 1 && (
                                            <IconButton size="small" onClick={() => appendContainer({ containerNo: '' })} sx={{ bgcolor: '#A22', color: '#fff', borderRadius: '4px', p: '2px', '&:hover': { bgcolor: '#8b1c1c' } }}>
                                                <Iconify icon="akar-icons:plus" width={16} />
                                            </IconButton>
                                        )}
                                    </Box>
                                </Stack>
                            ))}
                        </Box>
                    </Grid>

                    {/* Warehouse Table */}
                    <Grid item xs={12} md={6}>
                        <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 2, overflow: 'hidden' }}>
                            <Stack direction="row" sx={{ bgcolor: '#dbdbdb', p: 1 }}>
                                <Typography sx={{ width: '15%', fontWeight: 600, fontSize: '13px' }}>Sno</Typography>
                                <Typography sx={{ width: '65%', fontWeight: 600, fontSize: '13px' }}>Warehouse #</Typography>
                                <Typography sx={{ width: '20%', fontWeight: 600, fontSize: '13px', textAlign: 'center' }}>Actions</Typography>
                            </Stack>
                            {warehouseFields.map((item, index) => (
                                <Stack direction="row" alignItems="center" sx={{ p: 1 }} key={item.id}>
                                    <Box sx={{ width: '15%' }}>
                                        <Box sx={{ bgcolor: '#e0e0e0', p: '4px 8px', borderRadius: 1, display: 'inline-block', fontSize: '13px' }}>
                                            {String(index + 1).padStart(2, '0')}
                                        </Box>
                                    </Box>
                                    <Box sx={{ width: '65%' }}>
                                        <Controller name={`warehouses.${index}.warehouseNo`} control={control} render={({ field }) => (
                                            <StyledTextField {...field} size="small" sx={{ bgcolor: '#e0e0e0', borderRadius: 1, '& fieldset': { border: 'none' } }} />
                                        )} />
                                    </Box>
                                    <Box sx={{ width: '20%', textAlign: 'center' }}>
                                        {index === warehouseFields.length - 1 && (
                                            <IconButton size="small" onClick={() => appendWarehouse({ warehouseNo: '' })} sx={{ bgcolor: '#A22', color: '#fff', borderRadius: '4px', p: '2px', '&:hover': { bgcolor: '#8b1c1c' } }}>
                                                <Iconify icon="akar-icons:plus" width={16} />
                                            </IconButton>
                                        )}
                                    </Box>
                                </Stack>
                            ))}
                        </Box>
                    </Grid>
                </Grid>
            </Stack>
        </ShipmentFormLayout>
    );
}