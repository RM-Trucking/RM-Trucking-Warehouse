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

FclPickupEntryForm.propTypes = {
    handleClose: PropTypes.func,
    rowData: PropTypes.object
};

export default function FclPickupEntryForm({ handleClose, rowData }) {
    const { control, handleSubmit, setValue } = useForm({
        defaultValues: {
            rmProNo: rowData?.rmNumber || '78297982897287',
            date: dayjs('2026-02-26'),
            earlyReturnDate: dayjs('2026-02-26'),
            dropByDate: dayjs('2026-02-26'),
            hazmatInfo: false
        }
    });

    useEffect(() => {
        if (rowData?.rmNumber) {
            setValue('rmProNo', rowData.rmNumber);
        }
    }, [rowData, setValue]);

    const onSubmit = (data) => console.log('FCL Form:', data);

    return (
        <ShipmentFormLayout title="FCL Pickup Entry" handleClose={handleClose} onSubmit={handleSubmit(onSubmit)}
            topInfoPanel={
                <TopInfoPanel showBarcodeGraphic={true} status="Pickup Entry" onUpdateStatus={() => {}}
                    rmProInputNode={<Controller name="rmProNo" control={control} render={({ field }) => (<StyledTextField {...field} variant="outlined" size="small" fullWidth sx={{ '& .MuiOutlinedInput-root': { height: '30px', bgcolor: '#fff' } }} />)} />}
                />
            }>
            <Stack spacing={4}>
                <EntryDetailsSection control={control} />
                <CustomerDetailsSection control={control} />

                {/* FCL Shipment Details */}
                <fieldset style={{ borderColor: '#b0b0b0', borderRadius: '8px', padding: '16px' }}>
                    <legend><Typography variant="subtitle2" sx={{ fontWeight: '600', px: 1 }}>Shipment Details</Typography></legend>
                    <Stack spacing={3}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems="center">
                            <Controller name="containerNo" control={control} render={({ field }) => <StyledTextField {...field} variant="standard" fullWidth label="Container No *" />} />
                            <Controller name="railYard" control={control} render={({ field }) => <StyledTextField {...field} variant="standard" fullWidth label="Rail yard *" />} />
                            <Controller name="hazmatInfo" control={control} render={({ field }) => <FormControlLabel control={<Checkbox checked={field.value} onChange={field.onChange} />} label="Hazmat Info" sx={{ width: '100%' }}/>} />
                        </Stack>

                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ width: '66%' }}>
                            <Controller name="totalPieces" control={control} render={({ field }) => <StyledTextField {...field} variant="standard" fullWidth label="Total Pieces" />} />
                            <Controller name="totalWeight" control={control} render={({ field }) => <StyledTextField {...field} variant="standard" fullWidth label="Total Weight" />} />
                        </Stack>

                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                                <Controller name="earlyReturnTime" control={control} render={({ field }) => <StyledTextField {...field} variant="standard" fullWidth label="Early Return Time *" />} />
                                <Controller name="earlyReturnDate" control={control} render={({ field: { onChange, value } }) => <DatePicker label="Early Return Date *" format="MM/DD/YYYY" value={value} onChange={onChange} slotProps={{ textField: { variant: "standard", fullWidth: true, InputLabelProps: { shrink: true } } }} />} />
                                <Controller name="dropByTime" control={control} render={({ field }) => <StyledTextField {...field} variant="standard" fullWidth label="Drop by Time *" />} />
                                <Controller name="dropByDate" control={control} render={({ field: { onChange, value } }) => <DatePicker label="Drop by Date *" format="MM/DD/YYYY" value={value} onChange={onChange} slotProps={{ textField: { variant: "standard", fullWidth: true, InputLabelProps: { shrink: true } } }} />} />
                            </Stack>
                        </LocalizationProvider>

                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ width: '25%' }}>
                            <Controller name="sealNo" control={control} render={({ field }) => <StyledTextField {...field} variant="standard" fullWidth label="Seal No *" />} />
                        </Stack>
                    </Stack>
                </fieldset>
            </Stack>
        </ShipmentFormLayout>
    );
}