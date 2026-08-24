import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { Stack, Box, Typography, FormControlLabel, Checkbox } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

import StyledTextField from '../../sections/shared/StyledTextField';
import ShipmentFormLayout from '../../sections/shared/ShipmentFormLayout';
import { TopInfoPanel, EntryDetailsSection, CustomerDetailsSection } from '../../sections/shared/SharedPickupComponents';

AirPickupEntryForm.propTypes = {
    handleClose: PropTypes.func,
    rowData: PropTypes.object
};

const getPickupDefaults = (pickupData = {}) => {
    const entryDetails = pickupData.entryDetails || {};
    const customerDetails = pickupData.customerDetails || {};
    const shipmentDetails = pickupData.shipmentDetails || {};

    return {
        rmProNo: entryDetails.barcodeNumber || '',
        shipmentType: entryDetails.shipmentType || '',
        booking: entryDetails.booking || '',
        customerRefNumber: entryDetails.customerRefNumber || '',
        additionalRefNo: entryDetails.additionalRefNumber || '',
        date: null,
        customerId: customerDetails.customerId || '',
        stationId: customerDetails.stationId || '',
        stationName: customerDetails.stationName || '',
        stationRMAccountNumber: customerDetails.stationRMAccountNumber || '',
        contactName: customerDetails.stationContactName || '',
        phoneNumber: '',
        billTo: customerDetails.customerName || '',
        addressLine1: customerDetails.stationAddressLine1 || '',
        addressLine2: customerDetails.stationAddressLine2 || '',
        state: customerDetails.stationState || '',
        city: customerDetails.stationCity || '',
        zipCode: customerDetails.stationZip || '',
        contactPersonName: customerDetails.stationContactName || '',
        customerPhoneNumber: customerDetails.stationPhoneNumber || '',
        consigneeId: shipmentDetails.consigneeId || '',
        airline: shipmentDetails.airlineCode || '',
        airBillNo: shipmentDetails.airBillNumber || '',
        hazmatInfo: false,
        totalPieces: shipmentDetails.pieces ?? '',
        totalWeight: shipmentDetails.weight ?? '',
        manualEntry: true,
        manualSkid: '',
        manualPieces: shipmentDetails.pieces ?? '',
        manualWeight: shipmentDetails.weight ?? '',
        readyTime: null,
        readyDate: null,
        closeTime: null,
        closeDate: null,
        lockoutTime: null,
        lockoutDate: null,
    };
};

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
                                <Controller name="readyTime" control={control} render={({ field: { onChange, value } }) => <TimePicker label="Ready Time *" value={value} onChange={onChange} slotProps={{ textField: { variant: 'standard', fullWidth: true, InputLabelProps: { shrink: true } } }} />} />
                                <Controller name="readyDate" control={control} render={({ field: { onChange, value } }) => <DatePicker label="Ready Date *" format="MM/DD/YYYY" value={value} onChange={onChange} slotProps={{ textField: { variant: "standard", fullWidth: true, InputLabelProps: { shrink: true } } }} />} />
                                <Controller name="closeTime" control={control} render={({ field: { onChange, value } }) => <TimePicker label="Close Time *" value={value} onChange={onChange} slotProps={{ textField: { variant: 'standard', fullWidth: true, InputLabelProps: { shrink: true } } }} />} />
                                <Controller name="closeDate" control={control} render={({ field: { onChange, value } }) => <DatePicker label="Close Date *" format="MM/DD/YYYY" value={value} onChange={onChange} slotProps={{ textField: { variant: "standard", fullWidth: true, InputLabelProps: { shrink: true } } }} />} />
                            </Stack>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ width: '50%' }}>
                                <Controller name="lockoutTime" control={control} render={({ field: { onChange, value } }) => <TimePicker label="Lockout Time *" value={value} onChange={onChange} slotProps={{ textField: { variant: 'standard', fullWidth: true, InputLabelProps: { shrink: true } } }} />} />
                                <Controller name="lockoutDate" control={control} render={({ field: { onChange, value } }) => <DatePicker label="Lockout Date *" format="MM/DD/YYYY" value={value} onChange={onChange} slotProps={{ textField: { variant: "standard", fullWidth: true, InputLabelProps: { shrink: true } } }} />} />
                            </Stack>
                        </LocalizationProvider>
                    </Stack>
                </fieldset>
            </Stack>
        </ShipmentFormLayout>
    );
}
