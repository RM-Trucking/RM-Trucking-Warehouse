import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useForm, Controller } from 'react-hook-form';
import { Alert, Stack, Typography, FormControlLabel, Checkbox } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

import StyledTextField from '../../sections/shared/StyledTextField';
import ShipmentFormLayout from '../../sections/shared/ShipmentFormLayout';
import { TopInfoPanel, EntryDetailsSection, CustomerDetailsSection } from '../../sections/shared/SharedPickupComponents';
import { useDispatch, useSelector } from '../../redux/store';
import { postPickupEntry } from '../../redux/slices/shipment';

AirPickupEntryForm.propTypes = {
    handleClose: PropTypes.func,
    rowData: PropTypes.object,
    onCompleteSuccess: PropTypes.func,
};

const getPickupDefaults = (pickupData = {}) => {
    const entryDetails = pickupData.entryDetails || {};
    const customerDetails = pickupData.customerDetails || {};
    const shipmentDetails = pickupData.shipmentDetails || {};

    return {
        shipmentId: pickupData.shipmentId || entryDetails.shipmentId || shipmentDetails.shipmentId || 0,
        rmProNo: entryDetails.barcodeNumber || '',
        shipmentType: entryDetails.shipmentType || '',
        booking: entryDetails.booking || '',
        customerRefNumber: entryDetails.customerRefNumber || '',
        additionalRefNo: entryDetails.additionalRefNumber || '',
        date: dayjs(),
        customerId: customerDetails.customerId || '',
        customerNameRaw: customerDetails.customerName || '',
        stationId: customerDetails.stationId || '',
        stationName: customerDetails.stationName || '',
        stationRMAccountNumber: customerDetails.stationRMAccountNumber || '',
        contactName: customerDetails.stationContactName || '',
        phoneNumber: '',
        customerName: [customerDetails.customerName, customerDetails.stationName].filter(Boolean).join(' | '),
        billTo: customerDetails.stationRMAccountNumber || '',
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
        readyTime: null,
        readyDate: null,
        closeTime: null,
        closeDate: null,
        lockoutTime: null,
        lockoutDate: null,
    };
};

export default function AirPickupEntryForm({ handleClose, rowData, onCompleteSuccess }) {
    const dispatch = useDispatch();
    const pickupEntryLoading = useSelector((state) => state.shipmentdata.pickupEntryLoading);
    const [submitError, setSubmitError] = useState('');
    const { control, handleSubmit, reset } = useForm({
        defaultValues: getPickupDefaults(rowData),
    });

    useEffect(() => {
        reset(getPickupDefaults(rowData));
    }, [reset, rowData]);

    const formatDate = (value) => value?.format?.('YYYY-MM-DD') || '';
    const formatTime = (value) => value?.format?.('HH:mm:ss') || '';

    const onSubmit = async (data) => {
        setSubmitError('');
        const payload = {
            shipmentId: Number(data.shipmentId || 0),
            barcodeNumber: data.rmProNo || '',
            pickupDate: formatDate(data.date),
            contactName: data.contactName || '',
            contactPhoneNumber: data.phoneNumber || '',
            customerId: Number(data.customerId || 0),
            customerName: data.customerNameRaw || '',
            stationId: Number(data.stationId || 0),
            stationName: data.stationName || '',
            billTo: data.billTo || '',
            stationAddressLine1: data.addressLine1 || '',
            stationAddressLine2: data.addressLine2 || '',
            stationCity: data.city || '',
            stationState: data.state || '',
            stationZipCode: data.zipCode || '',
            stationPhoneNumber: data.customerPhoneNumber || '',
            airlineCode: data.airline || '',
            airBillNumber: data.airBillNo || '',
            hazmat: data.hazmatInfo ? 'Y' : 'N',
            pieces: Number(data.totalPieces || 0),
            weight: Number(data.totalWeight || 0),
            readyTime: formatTime(data.readyTime),
            readyDate: formatDate(data.readyDate),
            closeTime: formatTime(data.closeTime),
            closeDate: formatDate(data.closeDate),
            loTime: formatTime(data.lockoutTime),
            loDate: formatDate(data.lockoutDate),
        };

        const result = await dispatch(postPickupEntry(payload));
        if (result?.success) {
            if (onCompleteSuccess) {
                onCompleteSuccess(result.message || 'Pickup entry submitted successfully');
            } else {
                handleClose();
            }
            return;
        }
        setSubmitError(result?.error || 'Failed to submit pickup entry');
    };

    return (
        <ShipmentFormLayout title="AIR Pickup Entry" handleClose={handleClose} onSubmit={handleSubmit(onSubmit)} submitLoading={pickupEntryLoading}
            topInfoPanel={
                <TopInfoPanel showBarcodeGraphic={true} status="Pickup Entry" showNotes={false}
                    rmProInputNode={<Controller name="rmProNo" control={control} render={({ field }) => (<StyledTextField {...field} variant="outlined" size="small" fullWidth slotProps={{ input: { readOnly: true } }} sx={{ '& .MuiOutlinedInput-root': { height: '30px', bgcolor: '#fff' } }} />)} />}
                />
            }>
            <Stack spacing={4}>
                {submitError && <Alert severity="error">{submitError}</Alert>}
                <EntryDetailsSection control={control} dateReadOnly detailsReadOnly formatPhone />
                <CustomerDetailsSection control={control} showCustomerName hideContactPerson stateOnSecondRow readOnly />

                {/* AIR Shipment Details */}
                <fieldset style={{ borderColor: '#b0b0b0', borderRadius: '8px', padding: '16px' }}>
                    <legend><Typography variant="subtitle2" sx={{ fontWeight: '600', px: 1 }}>Shipment Details</Typography></legend>
                    <Stack spacing={3}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems="center">
                            <Controller name="airline" control={control} rules={{ required: true }} render={({ field }) => <StyledTextField {...field} variant="standard" fullWidth label="Airline *" slotProps={{ input: { readOnly: true } }} />} />
                            <Controller name="airBillNo" control={control} rules={{ required: true }} render={({ field }) => <StyledTextField {...field} variant="standard" fullWidth label="Air Bill No *" slotProps={{ input: { readOnly: true } }} />} />
                        </Stack>

                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems="center">
                            <Controller name="totalPieces" control={control} render={({ field }) => <StyledTextField {...field} variant="standard" fullWidth label="Total Pieces" slotProps={{ input: { readOnly: true } }} />} />
                            <Controller name="totalWeight" control={control} render={({ field }) => <StyledTextField {...field} variant="standard" fullWidth label="Total Weight" slotProps={{ input: { readOnly: true } }} />} />
                            <Controller name="hazmatInfo" control={control} render={({ field }) => <FormControlLabel control={<Checkbox checked={field.value} onChange={field.onChange} />} label="Hazmat Info" sx={{ width: '100%' }}/>} />
                        </Stack>

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
