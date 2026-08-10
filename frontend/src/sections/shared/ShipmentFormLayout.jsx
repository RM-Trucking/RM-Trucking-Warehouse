import PropTypes from 'prop-types';
import { cloneElement } from 'react';
import { Box, Stack, Typography, Button, CircularProgress } from '@mui/material';
import Iconify from '../../components/iconify';
import Barcode from "react-barcode";

// --- Shared Layout Wrapper ---
export default function ShipmentFormLayout({
    title,
    handleClose,
    onSubmit,
    onReset,
    onCancel,
    submitLabel = 'Submit',
    submitLoadingLabel = 'Submitting...',
    showCancel = true,
    showSubmit = true,
    submitLoading = false,
    readOnly = false,
    plain = false,
    topInfoPanel,
    stickyHeader = false,
    children
}) {
    if (plain) {
        return <>{children}</>;
    }

    return (
        <Box sx={{ p: 2, bgcolor: '#f5f5f5', minHeight: '100vh', ...(stickyHeader && { pt: '64px' }) }}>
            {/* Header */}
            <Stack
                flexDirection="row"
                alignItems={'center'}
                justifyContent="space-between"
                sx={{
                    mb: 2,
                    ...(stickyHeader && {
                        position: 'fixed',
                        top: 60,
                        left: { xs: 0, lg: 280 },
                        right: 0,
                        zIndex: 1200,
                        bgcolor: '#f5f5f5',
                        px: 2,
                        py: 1.5,
                        borderBottom: '1px solid #e0e0e0',
                    }),
                }}
            >
                <Stack direction="row" alignItems="center" spacing={1} sx={{ cursor: 'pointer' }} onClick={handleClose}>
                    <Iconify icon="eva:arrow-ios-back-fill" />
                    <Typography sx={{ fontSize: '18px', fontWeight: 600 }}>{title}</Typography>
                </Stack>
                <Stack direction="row" spacing={2}>
                    {showCancel && (
                        <Button
                            variant="outlined"
                            onClick={onCancel || handleClose}
                            size="small"
                            sx={{
                                bgcolor: '#fff', color: '#000', borderColor: '#000',
                                '&:hover': { bgcolor: '#f0f0f0', borderColor: '#000' }
                            }}
                        >
                            Cancel
                        </Button>
                    )}
                    {onReset && (
                        <Button
                            variant="outlined"
                            onClick={onReset}
                            size="small"
                            sx={{
                                bgcolor: '#fff', color: '#000', borderColor: '#000',
                                '&:hover': { bgcolor: '#f0f0f0', borderColor: '#000' }
                            }}
                        >
                            Reset
                        </Button>
                    )}
                    {showSubmit && (
                        <Button
                            variant="contained"
                            onClick={onSubmit}
                            disabled={submitLoading}
                            size="small"
                            sx={{ bgcolor: '#A22', color: '#fff', '&:hover': { bgcolor: '#8b1c1c' }, '&:disabled': { bgcolor: '#d0d0d0' } }}
                        >
                            {submitLoading ? (
                                <>
                                    <CircularProgress size={16} sx={{ color: 'white', mr: 1 }} />
                                    {submitLoadingLabel}
                                </>
                            ) : (
                                submitLabel
                            )}
                        </Button>
                    )}
                </Stack>
            </Stack>

            {/* Render the Grey Top Info Panel if provided */}
            {topInfoPanel && (
                <Box sx={{ mb: 3, minWidth: 0 }}>
                    {cloneElement(topInfoPanel, { readOnly })}
                </Box>
            )}

            {/* Main Form Content */}
            <Box component="form" sx={{ bgcolor: '#fff', p: 3, borderRadius: 2, border: '1px solid #e0e0e0' }}>
                <Box component="fieldset" disabled={readOnly} sx={{ border: 0, p: 0, m: 0, minWidth: 0 }}>
                    {children}
                </Box>
            </Box>
        </Box>
    );
}

ShipmentFormLayout.propTypes = {
    title: PropTypes.string.isRequired,
    handleClose: PropTypes.func.isRequired,
    onSubmit: PropTypes.func.isRequired,
    onReset: PropTypes.func,
    onCancel: PropTypes.func,
    submitLabel: PropTypes.string,
    submitLoadingLabel: PropTypes.string,
    showCancel: PropTypes.bool,
    showSubmit: PropTypes.bool,
    submitLoading: PropTypes.bool,
    readOnly: PropTypes.bool,
    plain: PropTypes.bool,
    topInfoPanel: PropTypes.node,
    stickyHeader: PropTypes.bool,
    children: PropTypes.node.isRequired,
};

// --- Shared Top Info Panel ---
export function TopInfoPanel({ 
    showBarcodeGraphic, 
    rmProInputNode, 
    status = "At Warehouse",
    barcodeValue,
    onBarcodeGenerate,
    showEdit = false,
    onEdit,
    readOnly = false,
}) {
    return (
        <Box sx={{ bgcolor: '#dbdbdb', p: 2, borderRadius: 1, position: 'relative' }}>
            <Stack spacing={2} sx={{ width: { xs: '100%', sm: '60%', md: '40%' } }}>
                <Box component="fieldset" disabled={readOnly} sx={{ border: 0, p: 0, m: 0, display: 'grid', gap: 2 }}>
                {/* Conditionally render the Barcode Graphic or just the text label */}
                <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography sx={{ width: '100px', fontSize: '14px' }}>Bar Code :</Typography>
                    {barcodeValue ? (
                        <Box sx={{ bgcolor: '#fff', px: 1, borderRadius: 0.5, display: 'flex', alignItems: 'center' }}>
                            <Barcode value={barcodeValue} height={40} />
                        </Box>
                    ) : showBarcodeGraphic && (
                        <Box sx={{ bgcolor: '#fff', px: 1, borderRadius: 0.5, display: 'flex', alignItems: 'center', height: '36px' }}>
                            <Typography sx={{ letterSpacing: '2px', fontWeight: 'bold', fontSize: '20px' }}>
                                ||| || |||| | |||
                            </Typography>
                        </Box>
                    )}
                </Stack>

                {/* RM PRO No Input Node (Passed from React Hook Form Controller) */}
                <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography sx={{ width: '100px', fontSize: '14px' }}>RM PRO No :</Typography>
                    <Box sx={{ flex: 1 }}>
                        {rmProInputNode}
                    </Box>
                    <Box sx={{ bgcolor: '#A22', color: '#fff', borderRadius: '4px', p: '2px 4px', display: 'flex', cursor: 'pointer' }} onClick={onBarcodeGenerate}>
                        <Iconify icon="mdi:barcode-scan" />
                    </Box>
                </Stack>

                </Box>

                <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography sx={{ width: '100px', fontSize: '14px' }}>Status :</Typography>
                    <Typography sx={{ fontWeight: 600, fontSize: '14px' }}>{status}</Typography>
                </Stack>
            </Stack>
            
            <Stack direction="row" alignItems="center" spacing={1} sx={{ position: 'absolute', right: 16, bottom: 16 }}>
                {showEdit && (
                    <Button variant="contained" size="small" onClick={onEdit} sx={{ bgcolor: '#A22', '&:hover': { bgcolor: '#8b1c1c' }, textTransform: 'none' }}>
                        Edit
                    </Button>
                )}
                <Box sx={{ color: '#A22', cursor: 'pointer', display: 'flex' }}>
                <Iconify icon="streamline-ultimate:notes-book-bold" width={24} height={24} />
                </Box>
            </Stack>
        </Box>
    );
}

TopInfoPanel.propTypes = {
    showBarcodeGraphic: PropTypes.bool,
    rmProInputNode: PropTypes.node.isRequired,
    status: PropTypes.string,
    barcodeValue: PropTypes.string,
    onBarcodeGenerate: PropTypes.func,
    showEdit: PropTypes.bool,
    onEdit: PropTypes.func,
    readOnly: PropTypes.bool,
};
