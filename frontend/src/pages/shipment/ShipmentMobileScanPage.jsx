import { useEffect, useMemo, useState } from 'react';
import {
    Box, Button, CircularProgress, Stack, Tab, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Tabs, Typography,
} from '@mui/material';
import { useDispatch, useSelector } from '../../redux/store';
import { getShipmentData } from '../../redux/slices/shipment';
import ShipmentScanStatus from './ShipmentScanStatus';

const actionButtonSx = {
    minWidth: 56,
    height: 24,
    px: 1.2,
    bgcolor: '#A22',
    color: '#fff',
    fontSize: 11,
    textTransform: 'none',
    boxShadow: 'none',
    '&:hover': { bgcolor: '#8b1c1c', boxShadow: 'none' },
};

const formTabs = [
    { value: 'AIR', label: 'Air Form' },
    { value: 'LCL', label: 'LCL Form' },
    { value: 'FCL', label: 'FCL Form' },
];

export default function ShipmentMobileScanPage() {
    const dispatch = useDispatch();
    const { shipmentData, isLoading } = useSelector((state) => state.shipmentdata);
    const [shipmentType, setShipmentType] = useState('AIR');
    const [selectedShipment, setSelectedShipment] = useState(null);

    useEffect(() => {
        dispatch(getShipmentData({ pageNo: 1, pageSize: 50 }));
    }, [dispatch]);

    const rowsByType = useMemo(() => formTabs.reduce((groups, tab) => ({
        ...groups,
        [tab.value]: shipmentData.filter((shipment) => shipment.shipmentType === tab.value),
    }), {}), [shipmentData]);

    const handleScannerComplete = () => {
        setSelectedShipment(null);
        dispatch(getShipmentData({ pageNo: 1, pageSize: 50 }));
    };

    if (selectedShipment) {
        return (
            <ShipmentScanStatus
                shipment={selectedShipment}
                onClose={() => setSelectedShipment(null)}
                onCompleteSuccess={handleScannerComplete}
                mobile
            />
        );
    }

    const visibleRows = rowsByType[shipmentType] || [];

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#fff', pt: 1 }}>
            <Typography sx={{ px: 1.25, py: 0.75, fontSize: 13, fontWeight: 700 }}>
                Shipment Form
            </Typography>
            <Tabs
                value={shipmentType}
                onChange={(event, value) => setShipmentType(value)}
                variant="fullWidth"
                sx={{
                    minHeight: 38,
                    borderBottom: '1px solid #ccc',
                    '& .MuiTab-root': { minHeight: 38, minWidth: 0, px: 0.5, fontSize: 11, textTransform: 'none' },
                    '& .Mui-selected': { color: '#111 !important', fontWeight: 700 },
                    '& .MuiTabs-indicator': { bgcolor: '#A22', height: 3 },
                }}
            >
                {formTabs.map((tab) => (
                    <Tab
                        key={tab.value}
                        value={tab.value}
                        label={`${tab.label} (${rowsByType[tab.value]?.length || 0})`}
                    />
                ))}
            </Tabs>

            <TableContainer sx={{ width: '100%', overflowX: 'auto' }}>
                <Table size="small" sx={{ tableLayout: 'fixed', minWidth: 650 }}>
                    <TableHead>
                        <TableRow sx={{ bgcolor: '#d1d1d1' }}>
                            <TableCell sx={{ width: 130, px: 1, fontSize: 11, fontWeight: 700 }}>RM Pro No</TableCell>
                            <TableCell sx={{ width: 145, px: 1, fontSize: 11, fontWeight: 700 }}>Customer</TableCell>
                            <TableCell sx={{ width: 120, px: 1, fontSize: 11, fontWeight: 700 }}>Station</TableCell>
                            <TableCell sx={{ width: 130, px: 1, fontSize: 11, fontWeight: 700 }}>Air Bill No.</TableCell>
                            <TableCell sx={{ position: 'sticky', right: 0, zIndex: 3, width: 90, px: 1, bgcolor: '#d1d1d1', boxShadow: '-4px 0 6px -4px rgba(0,0,0,0.35)', fontSize: 11, fontWeight: 700 }}>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={5} align="center" sx={{ py: 5 }}>
                                    <CircularProgress size={24} />
                                </TableCell>
                            </TableRow>
                        ) : visibleRows.length ? visibleRows.map((shipment) => (
                            <TableRow key={shipment.shipmentId || shipment.id}>
                                <TableCell sx={{ px: 1, py: 0.75, fontSize: 10, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {shipment.barcodeNumber || shipment.rmNumber || '-'}
                                </TableCell>
                                <TableCell sx={{ px: 1, py: 0.75, fontSize: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {shipment.customerName || shipment.customer || '-'}
                                </TableCell>
                                <TableCell sx={{ px: 1, py: 0.75, fontSize: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {shipment.stationName || shipment.station || '-'}
                                </TableCell>
                                <TableCell sx={{ px: 1, py: 0.75, fontSize: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {shipment.airBillNumber || '-'}
                                </TableCell>
                                <TableCell sx={{ position: 'sticky', right: 0, zIndex: 2, px: 1, py: 0.5, bgcolor: '#fff', boxShadow: '-4px 0 6px -4px rgba(0,0,0,0.25)' }}>
                                    <Stack direction="row" spacing={0.5}>
                                        <Button
                                            sx={{ ...actionButtonSx, '&.Mui-disabled': { bgcolor: '#d0d0d0', color: '#777' } }}
                                            disabled={shipment.completeStatus !== 'IDEAL'}
                                            onClick={() => setSelectedShipment(shipment)}
                                        >
                                            Scan
                                        </Button>
                                    </Stack>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={5} align="center" sx={{ py: 5, fontSize: 12 }}>No shipments found</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}
