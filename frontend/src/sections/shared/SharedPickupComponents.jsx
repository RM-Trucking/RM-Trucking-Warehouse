import React from 'react';
import PropTypes from 'prop-types';
import { Typography, Stack, Box, Button, FormControlLabel, Checkbox } from '@mui/material';
import { Controller } from 'react-hook-form';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import StyledTextField from '../shared/StyledTextField';
import Iconify from '../../components/iconify';
import formatPhoneNumber from '../../utils/formatPhoneNumber';

// --- Updated Top Info Panel (Includes 'Update' button) ---
export function TopInfoPanel({ showBarcodeGraphic, rmProInputNode, status = "Pickup Entry", onUpdateStatus, showNotes = true }) {
    return (
        <Box sx={{ bgcolor: '#dbdbdb', p: 2, borderRadius: 1, position: 'relative', mb: 3 }}>
            <Stack spacing={2} sx={{ width: { xs: '100%', sm: '60%', md: '40%' } }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography sx={{ width: '100px', fontSize: '14px' }}>Bar Code :</Typography>
                    {showBarcodeGraphic && (
                        <Box sx={{ bgcolor: '#fff', px: 1, borderRadius: 0.5, display: 'flex', alignItems: 'center', height: '36px' }}>
                            <Typography sx={{ letterSpacing: '2px', fontWeight: 'bold', fontSize: '20px' }}>
                                ||| || |||| | |||
                            </Typography>
                        </Box>
                    )}
                </Stack>
                <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography sx={{ width: '100px', fontSize: '14px' }}>RM PRO No :</Typography>
                    <Box sx={{ flex: 1 }}>{rmProInputNode}</Box>
                    <Box sx={{ bgcolor: '#A22', color: '#fff', borderRadius: '4px', p: '2px 4px', display: 'flex', cursor: 'pointer' }}>
                        <Iconify icon="mdi:barcode-scan" />
                    </Box>
                </Stack>
                <Stack direction="row" alignItems="center" spacing={2}>
                    <Typography sx={{ width: '90px', fontSize: '14px' }}>Status :</Typography>
                    <Typography sx={{ fontWeight: 600, fontSize: '14px' }}>{status}</Typography>
                    {onUpdateStatus && (
                         <Button 
                            variant="contained" 
                            size="small" 
                            onClick={onUpdateStatus}
                            sx={{ bgcolor: '#A22', color: '#fff', '&:hover': { bgcolor: '#8b1c1c' }, height: '24px', fontSize: '12px', minWidth: 'auto', px: 2 }}
                         >
                             Update
                         </Button>
                    )}
                </Stack>
            </Stack>
            {showNotes && (
                <Box sx={{ position: 'absolute', right: 16, bottom: 16, color: '#A22', cursor: 'pointer' }}>
                    <Iconify icon="mdi:file-document" width={24} height={24} />
                </Box>
            )}
        </Box>
    );
}

// --- Shared Entry Details Section ---
export function EntryDetailsSection({ control, dateReadOnly = false, detailsReadOnly = false, formatPhone = false }) {
    return (
        <fieldset style={{ borderColor: '#b0b0b0', borderRadius: '8px', padding: '16px' }}>
            <legend><Typography variant="subtitle2" sx={{ fontWeight: '600', px: 1 }}>Entry Details</Typography></legend>
            <Stack spacing={3}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                    <Controller name="booking" control={control} render={({ field }) => (
                        <StyledTextField {...field} variant="standard" fullWidth label="Booking" slotProps={{ input: { readOnly: detailsReadOnly } }} />
                    )} />
                    <Controller name="customerRefNumber" control={control} rules={{ required: 'Required' }} render={({ field, fieldState: { error } }) => (
                        <StyledTextField {...field} variant="standard" fullWidth label="Customer Ref Number *" error={!!error} slotProps={{ input: { readOnly: detailsReadOnly } }} />
                    )} />
                    <Controller name="additionalRefNo" control={control} render={({ field }) => (
                        <StyledTextField {...field} variant="standard" fullWidth label="Additional Ref No" slotProps={{ input: { readOnly: detailsReadOnly } }} />
                    )} />
                    {dateReadOnly ? (
                        <Controller name="date" control={control} render={({ field: { value } }) => (
                            <StyledTextField
                                label="Date"
                                value={value?.format?.('MM/DD/YYYY') || ''}
                                variant="standard"
                                fullWidth
                                slotProps={{ input: { readOnly: true }, inputLabel: { shrink: true } }}
                            />
                        )} />
                    ) : (
                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                            <Controller name="date" control={control} render={({ field: { onChange, value } }) => (
                                <DatePicker label="Date" format="MM/DD/YYYY" value={value} onChange={onChange} slotProps={{ textField: { variant: "standard", fullWidth: true, InputLabelProps: { shrink: true } } }} />
                            )} />
                        </LocalizationProvider>
                    )}
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ width: '50%' }}>
                    <Controller name="contactName" control={control} rules={{ required: 'Required' }} render={({ field, fieldState: { error } }) => (
                        <StyledTextField {...field} variant="standard" fullWidth label="Contact Name *" error={!!error} />
                    )} />
                    <Controller name="phoneNumber" control={control} render={({ field }) => (
                        <StyledTextField
                            {...field}
                            variant="standard"
                            fullWidth
                            label="Phone Number"
                            placeholder="(XXX) XXX-XXXX"
                            onChange={(event) => field.onChange(formatPhone ? formatPhoneNumber(event.target.value) : event.target.value)}
                        />
                    )} />
                </Stack>
            </Stack>
        </fieldset>
    );
}

// --- Shared Customer Details Section ---
export function CustomerDetailsSection({ control, showCustomerName = false, hideContactPerson = false, stateOnSecondRow = false, readOnly = false }) {
    return (
        <fieldset style={{ borderColor: '#b0b0b0', borderRadius: '8px', padding: '16px' }}>
            <legend><Typography variant="subtitle2" sx={{ fontWeight: '600', px: 1 }}>Customer Details</Typography></legend>
            <Stack spacing={3}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                    {showCustomerName && (
                        <Controller name="customerName" control={control} render={({ field }) => (
                            <StyledTextField {...field} variant="standard" fullWidth label="Customer Name" slotProps={{ input: { readOnly } }} />
                        )} />
                    )}
                    <Controller name="billTo" control={control} render={({ field }) => (
                        <StyledTextField {...field} variant="standard" fullWidth label="Bill To" slotProps={{ input: { readOnly } }} />
                    )} />
                    <Controller name="addressLine1" control={control} render={({ field }) => (
                        <StyledTextField {...field} variant="standard" fullWidth label="Address Line 1" slotProps={{ input: { readOnly } }} />
                    )} />
                    <Controller name="addressLine2" control={control} render={({ field }) => (
                        <StyledTextField {...field} variant="standard" fullWidth label="Address Line 2" slotProps={{ input: { readOnly } }} />
                    )} />
                    {!stateOnSecondRow && (
                        <Controller name="state" control={control} render={({ field }) => (
                            <StyledTextField {...field} variant="standard" fullWidth label="State" slotProps={{ input: { readOnly } }} />
                        )} />
                    )}
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                    {stateOnSecondRow && (
                        <Controller name="state" control={control} render={({ field }) => (
                            <StyledTextField {...field} variant="standard" fullWidth label="State" slotProps={{ input: { readOnly } }} />
                        )} />
                    )}
                    <Controller name="city" control={control} render={({ field }) => (
                        <StyledTextField {...field} variant="standard" fullWidth label="City" slotProps={{ input: { readOnly } }} />
                    )} />
                    <Controller name="zipCode" control={control} render={({ field }) => (
                        <StyledTextField {...field} variant="standard" fullWidth label="Zip Code" slotProps={{ input: { readOnly } }} />
                    )} />
                    {!hideContactPerson && (
                        <Controller name="contactPersonName" control={control} render={({ field }) => (
                            <StyledTextField {...field} variant="standard" fullWidth label="Contact Person Name" slotProps={{ input: { readOnly } }} />
                        )} />
                    )}
                    <Controller name="customerPhoneNumber" control={control} render={({ field }) => (
                        <StyledTextField {...field} variant="standard" fullWidth label="Phone Number" slotProps={{ input: { readOnly } }} />
                    )} />
                </Stack>
            </Stack>
        </fieldset>
    );
}

// Ensure you also export ShipmentFormLayout from this file or import it from your existing location.
