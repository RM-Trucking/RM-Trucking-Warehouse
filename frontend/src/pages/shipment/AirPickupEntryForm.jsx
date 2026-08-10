import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { Stack, Box, Typography, FormControlLabel, Checkbox } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

import StyledTextField from '../../sections/shared/StyledTextField';
import ShipmentFormLayout from '../../sections/shared/ShipmentFormLayout';
import { TopInfoPanel, EntryDetailsSection, CustomerDetailsSection } from '../../sections/shared/SharedPickupComponents';

AirPickupEntryForm.propTypes = {
    handleClose: PropTypes.func,
    rowData: PropTypes.object
};

const firstValue = (source, keys, fallback = '') => {
    const key = keys.find((candidate) => source?.[candidate] !== undefined && source?.[candidate] !== null && source?.[candidate] !== '');
    return key ? source[key] : fallback;
};

const toDateValue = (value) => {
    if (!value) return null;
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed : null;
};

const toBoolean = (value) => value === true || value === 1 || String(value || '').toUpperCase() === 'Y';

const getPickupDefaults = (row = {}) => ({
    rmProNo: firstValue(row, ['barcodeNumber', 'rmNumber']),
    booking: firstValue(row, ['booking', 'bookingNumber']),
    customerRefNumber: firstValue(row, ['customerRefNumber', 'customerReferenceNumber']),
    additionalRefNo: firstValue(row, ['additionalRefNumber', 'additionalRefNo']),
    date: toDateValue(firstValue(row, ['pickupDate', 'shipmentDate', 'date', 'createdAt'])),
    contactName: firstValue(row, ['contactName', 'customerContactName', 'contactPersonName']),
    phoneNumber: firstValue(row, ['phoneNumber', 'contactPhoneNumber', 'customerPhoneNumber']),
    billTo: firstValue(row, ['billTo', 'customerName', 'customer']),
    addressLine1: firstValue(row, ['addressLine1', 'customerAddressLine1', 'customerAddress', 'address']),
    addressLine2: firstValue(row, ['addressLine2', 'customerAddressLine2']),
    state: firstValue(row, ['state', 'customerState']),
    city: firstValue(row, ['city', 'customerCity']),
    zipCode: firstValue(row, ['zipCode', 'customerZipCode', 'postalCode']),
    contactPersonName: firstValue(row, ['contactPersonName', 'customerContactName', 'contactName']),
    customerPhoneNumber: firstValue(row, ['customerPhoneNumber', 'contactPhoneNumber', 'phoneNumber']),
    airline: firstValue(row, ['airlineName', 'consigneeName', 'airline']),
    airBillNo: firstValue(row, ['airBillNumber', 'airBillNo', 'billNumber']),
    hazmatInfo: toBoolean(firstValue(row, ['hazmatInfo', 'isHazmat', 'hazmat'])),
    totalPieces: firstValue(row, ['pieces', 'totalPieces']),
    totalWeight: firstValue(row, ['weight', 'totalWeight']),
    manualEntry: row.manualEntry === undefined ? true : toBoolean(row.manualEntry),
    manualSkid: firstValue(row, ['skid', 'skids', 'totalSkids']),
    manualPieces: firstValue(row, ['manualPieces', 'pieces', 'totalPieces']),
    manualWeight: firstValue(row, ['manualWeight', 'weight', 'totalWeight']),
    readyTime: firstValue(row, ['readyTime']),
    readyDate: toDateValue(firstValue(row, ['readyDate'])),
    closeTime: firstValue(row, ['closeTime']),
    closeDate: toDateValue(firstValue(row, ['closeDate'])),
    lockoutTime: firstValue(row, ['lockoutTime']),
    lockoutDate: toDateValue(firstValue(row, ['lockoutDate'])),
});

export default function AirPickupEntryForm({ handleClose, rowData }) {
    const { control, handleSubmit, reset } = useForm({
        defaultValues: getPickupDefaults(rowData),
    });

    useEffect(() => {
        reset(getPickupDefaults(rowData));
    }, [reset, rowData]);

    const isManualEntry = useWatch({ control, name: 'manualEntry' });

    const onSubmit = (data) => console.log('AIR Form:', data);

    return (
        <ShipmentFormLayout title="AIR Pickup Entry" handleClose={handleClose} onSubmit={handleSubmit(onSubmit)}
            topInfoPanel={
                <TopInfoPanel showBarcodeGraphic={true} status="Pickup Entry" onUpdateStatus={() => {}}
                    rmProInputNode={<Controller name="rmProNo" control={control} render={({ field }) => (<StyledTextField {...field} variant="outlined" size="small" fullWidth sx={{ '& .MuiOutlinedInput-root': { height: '30px', bgcolor: '#fff' } }} />)} />}
                />
            }>
            <Stack spacing={4}>
                <EntryDetailsSection control={control} />
                <CustomerDetailsSection control={control} />

                {/* AIR Shipment Details */}
                <fieldset style={{ borderColor: '#b0b0b0', borderRadius: '8px', padding: '16px' }}>
                    <legend><Typography variant="subtitle2" sx={{ fontWeight: '600', px: 1 }}>Shipment Details</Typography></legend>
                    <Stack spacing={3}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems="center">
                            <Controller name="airline" control={control} rules={{ required: true }} render={({ field }) => <StyledTextField {...field} variant="standard" fullWidth label="Airline *" />} />
                            <Controller name="airBillNo" control={control} rules={{ required: true }} render={({ field }) => <StyledTextField {...field} variant="standard" fullWidth label="Air Bill No *" />} />
                            <Controller name="hazmatInfo" control={control} render={({ field }) => <FormControlLabel control={<Checkbox checked={field.value} onChange={field.onChange} />} label="Hazmat Info" sx={{ width: '100%' }}/>} />
                        </Stack>

                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems="center">
                            <Controller name="totalPieces" control={control} render={({ field }) => <StyledTextField {...field} variant="standard" fullWidth label="Total Pieces" />} />
                            <Controller name="totalWeight" control={control} render={({ field }) => <StyledTextField {...field} variant="standard" fullWidth label="Total Weight" />} />
                            <Controller name="manualEntry" control={control} render={({ field }) => <FormControlLabel control={<Checkbox checked={field.value} onChange={field.onChange} />} label="Manual Entry" sx={{ width: '100%' }}/>} />
                        </Stack>

                        {isManualEntry && (
                            <fieldset style={{ borderColor: '#e0e0e0', borderRadius: '8px', padding: '16px', marginTop: '8px' }}>
                                <legend><Typography variant="caption" sx={{ fontWeight: '600', px: 1, color: '#555' }}>Manual Entry Details</Typography></legend>
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                                    <Controller name="manualSkid" control={control} render={({ field }) => <StyledTextField {...field} variant="standard" fullWidth label="Skid" />} />
                                    <Controller name="manualPieces" control={control} render={({ field }) => <StyledTextField {...field} variant="standard" fullWidth label="Pieces" />} />
                                    <Controller name="manualWeight" control={control} render={({ field }) => <StyledTextField {...field} variant="standard" fullWidth label="Weight" />} />
                                </Stack>
                            </fieldset>
                        )}

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
