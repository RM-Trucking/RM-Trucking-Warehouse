import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { useForm, Controller } from 'react-hook-form';
import { Stack, Box, Typography, FormControlLabel, Checkbox } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

import StyledTextField from '../../sections/shared/StyledTextField';
import ShipmentFormLayout from '../../sections/shared/ShipmentFormLayout';
import { TopInfoPanel, EntryDetailsSection, CustomerDetailsSection } from '../../sections/shared/SharedPickupComponents';

LclPickupEntryForm.propTypes = {
    handleClose: PropTypes.func,
    rowData: PropTypes.object
};

export default function LclPickupEntryForm({ handleClose, rowData }) {
    const { control, handleSubmit, watch, setValue } = useForm({
        defaultValues: {
            rmProNo: rowData?.rmNumber || '78297982897287',
            date: dayjs('2026-02-26'),
            readyDate: dayjs('2026-02-26'),
            closeDate: dayjs('2026-02-26'),
            lockoutDate: dayjs('2026-02-26'),
            manualEntry: true,
            manualAddress: true,
            hazmatInfo: false
        }
    });

    useEffect(() => {
        if (rowData?.rmNumber) {
            setValue('rmProNo', rowData.rmNumber);
        }
    }, [rowData, setValue]);

    const isManualEntry = watch('manualEntry');
    const isManualAddress = watch('manualAddress');

    const onSubmit = (data) => console.log('LCL Form:', data);

    return (
        <ShipmentFormLayout title="LCL Pickup Entry" handleClose={handleClose} onSubmit={handleSubmit(onSubmit)}
            topInfoPanel={
                <TopInfoPanel showBarcodeGraphic={true} status="Pickup Entry" onUpdateStatus={() => {}}
                    rmProInputNode={<Controller name="rmProNo" control={control} render={({ field }) => (<StyledTextField {...field} variant="outlined" size="small" fullWidth sx={{ '& .MuiOutlinedInput-root': { height: '30px', bgcolor: '#fff' } }} />)} />}
                />
            }>
            <Stack spacing={4}>
                <EntryDetailsSection control={control} />
                <CustomerDetailsSection control={control} />

                {/* LCL Shipment Details */}
                <fieldset style={{ borderColor: '#b0b0b0', borderRadius: '8px', padding: '16px' }}>
                    <legend><Typography variant="subtitle2" sx={{ fontWeight: '600', px: 1 }}>Shipment Details</Typography></legend>
                    <Stack spacing={3}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems="center">
                            <Controller name="lclWarehouseList" control={control} render={({ field }) => <StyledTextField {...field} variant="standard" fullWidth label="LCL Warehouse List *" />} />
                            <Controller name="totalPieces" control={control} render={({ field }) => <StyledTextField {...field} variant="standard" fullWidth label="Total Pieces" />} />
                            <Controller name="totalWeight" control={control} render={({ field }) => <StyledTextField {...field} variant="standard" fullWidth label="Total Weight" />} />
                            <Controller name="hazmatInfo" control={control} render={({ field }) => <FormControlLabel control={<Checkbox checked={field.value} onChange={field.onChange} />} label="Hazmat Info" sx={{ width: '100%' }}/>} />
                        </Stack>

                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems="center">
                            <Controller name="manualEntry" control={control} render={({ field }) => <FormControlLabel control={<Checkbox checked={field.value} onChange={field.onChange} />} label="Manual Entry" sx={{ width: '100%' }}/>} />
                            <Controller name="manualAddress" control={control} render={({ field }) => <FormControlLabel control={<Checkbox checked={field.value} onChange={field.onChange} />} label="Manual Address" sx={{ width: '100%' }}/>} />
                            <Box sx={{ width: '100%' }} /> <Box sx={{ width: '100%' }} />
                        </Stack>

                        {isManualEntry && (
                            <fieldset style={{ borderColor: '#e0e0e0', borderRadius: '8px', padding: '16px' }}>
                                <legend><Typography variant="caption" sx={{ fontWeight: '600', px: 1, color: '#555' }}>Manual Entry Details</Typography></legend>
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                                    <Controller name="manualSkid" control={control} render={({ field }) => <StyledTextField {...field} variant="standard" fullWidth label="Skid" />} />
                                    <Controller name="manualPieces" control={control} render={({ field }) => <StyledTextField {...field} variant="standard" fullWidth label="Pieces" />} />
                                    <Controller name="manualWeight" control={control} render={({ field }) => <StyledTextField {...field} variant="standard" fullWidth label="Weight" />} />
                                </Stack>
                            </fieldset>
                        )}

                        {isManualAddress && (
                            <fieldset style={{ borderColor: '#e0e0e0', borderRadius: '8px', padding: '16px' }}>
                                <legend><Typography variant="caption" sx={{ fontWeight: '600', px: 1, color: '#555' }}>Manual Address Details</Typography></legend>
                                <Stack spacing={3}>
                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                                        <Controller name="whName" control={control} render={({ field }) => <StyledTextField {...field} variant="standard" fullWidth label="Warehouse Name *" />} />
                                        <Controller name="whAddr1" control={control} render={({ field }) => <StyledTextField {...field} variant="standard" fullWidth label="Address Line 1 *" />} />
                                        <Controller name="whAddr2" control={control} render={({ field }) => <StyledTextField {...field} variant="standard" fullWidth label="Address Line 2" />} />
                                        <Controller name="whState" control={control} render={({ field }) => <StyledTextField {...field} variant="standard" fullWidth label="State *" />} />
                                    </Stack>
                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                                        <Controller name="whCity" control={control} render={({ field }) => <StyledTextField {...field} variant="standard" fullWidth label="City *" />} />
                                        <Controller name="whZip" control={control} render={({ field }) => <StyledTextField {...field} variant="standard" fullWidth label="Zip Code" />} />
                                        <Controller name="whContact" control={control} render={({ field }) => <StyledTextField {...field} variant="standard" fullWidth label="Contact Person Name" />} />
                                        <Controller name="whPhone" control={control} render={({ field }) => <StyledTextField {...field} variant="standard" fullWidth label="Phone Number" />} />
                                    </Stack>
                                </Stack>
                            </fieldset>
                        )}

                        {/* Date/Time rows reused */}
                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                                <Controller name="readyTime" control={control} render={({ field }) => <StyledTextField {...field} variant="standard" fullWidth label="Ready Time*" />} />
                                <Controller name="readyDate" control={control} render={({ field: { onChange, value } }) => <DatePicker label="Ready Date *" format="MM/DD/YYYY" value={value} onChange={onChange} slotProps={{ textField: { variant: "standard", fullWidth: true, InputLabelProps: { shrink: true } } }} />} />
                                <Controller name="closeTime" control={control} render={({ field }) => <StyledTextField {...field} variant="standard" fullWidth label="Close Time*" />} />
                                <Controller name="closeDate" control={control} render={({ field: { onChange, value } }) => <DatePicker label="Close Date *" format="MM/DD/YYYY" value={value} onChange={onChange} slotProps={{ textField: { variant: "standard", fullWidth: true, InputLabelProps: { shrink: true } } }} />} />
                            </Stack>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ width: '50%' }}>
                                <Controller name="lockoutTime" control={control} render={({ field }) => <StyledTextField {...field} variant="standard" fullWidth label="Lockout Time*" />} />
                                <Controller name="lockoutDate" control={control} render={({ field: { onChange, value } }) => <DatePicker label="Lockout Date *" format="MM/DD/YYYY" value={value} onChange={onChange} slotProps={{ textField: { variant: "standard", fullWidth: true, InputLabelProps: { shrink: true } } }} />} />
                            </Stack>
                        </LocalizationProvider>
                    </Stack>
                </fieldset>
            </Stack>
        </ShipmentFormLayout>
    );
}