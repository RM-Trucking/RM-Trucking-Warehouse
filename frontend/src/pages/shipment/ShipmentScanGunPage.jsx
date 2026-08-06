import PropTypes from 'prop-types';
import { useState } from 'react';
import { Box, IconButton, Tab, Tabs, Typography } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import Iconify from '../../components/iconify';
import ShipmentScanStatus from './ShipmentScanStatus';

const TAB_OPTIONS = [
    { value: 'active', label: 'Air Form' },
    { value: 'inactive', label: 'LCL Form' },
    { value: 'incomplete', label: 'FCL Form' },
];

const MobileScanIcon = () => (
    <Box component="svg" viewBox="0 0 24 24" aria-hidden="true" sx={{ width: 20, height: 20, display: 'block' }}>
        <path d="M5 7V4h14v3M3 12h18M5 17v3h14v-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" />
    </Box>
);

export default function ShipmentScanGunPage({
    currentTab,
    onTabChange,
    rows,
    loading,
    paginationModel,
    rowCount,
    onPaginationModelChange,
}) {
    const [scanShipment, setScanShipment] = useState(null);

    if (scanShipment) {
        return (
            <Box sx={{ width: '100%', minWidth: 0 }}>
                <ShipmentScanStatus shipment={scanShipment} onClose={() => setScanShipment(null)} />
            </Box>
        );
    }

    const columns = [
        { field: 'rmNumber', headerName: 'RM Number', minWidth: 130, flex: 1 },
        { field: 'customer', headerName: 'Customer', minWidth: 150, flex: 1 },
        { field: 'station', headerName: 'Station', minWidth: 110, flex: 0.8 },
        { field: 'billNumber', headerName: currentTab === 'active' ? 'Air Bill No' : 'Bill Number', minWidth: 130, flex: 1 },
        {
            field: 'action',
            headerName: 'Action',
            width: 72,
            minWidth: 72,
            align: 'center',
            headerAlign: 'center',
            sortable: false,
            filterable: false,
            disableColumnMenu: true,
            headerClassName: 'mobile-sticky-action-header',
            cellClassName: 'mobile-sticky-action-cell',
            renderCell: (params) => (
                <IconButton
                    size="small"
                    aria-label={params.row.isShipped !== 'Y' ? 'Open scanner' : 'Shipment completed'}
                    onClick={(event) => {
                        event.stopPropagation();
                        if (params.row.isShipped !== 'Y') setScanShipment(params.row);
                    }}
                    sx={{ color: '#A22' }}
                >
                    {params.row.isShipped !== 'Y' ? <MobileScanIcon /> : <Iconify icon="mdi:check-circle" width={20} />}
                </IconButton>
            ),
        },
    ];

    return (
        <Box sx={{ width: '100%', minWidth: 0 }}>
            <Typography sx={{ mb: 0.5, fontSize: 11, color: '#555' }}>Scanner device Mobile view</Typography>
            <Tabs
                value={currentTab}
                onChange={(event, value) => onTabChange(value)}
                variant="scrollable"
                scrollButtons={false}
                sx={{ minHeight: 34, borderBottom: '1px solid #bbb', '& .MuiTabs-indicator': { bgcolor: '#A22' } }}
            >
                {TAB_OPTIONS.map((tab) => (
                    <Tab key={tab.value} value={tab.value} label={tab.label} sx={{ minHeight: 34, minWidth: 76, px: 1, fontSize: 11, textTransform: 'none' }} />
                ))}
            </Tabs>
            <Box sx={{ width: '100%', overflow: 'hidden', mt: 1 }}>
                <DataGrid
                    rows={rows}
                    columns={columns}
                    loading={loading}
                    getRowId={(row) => row.shipmentId}
                    autoHeight
                    disableRowSelectionOnClick
                    pagination
                    paginationMode="server"
                    paginationModel={paginationModel}
                    rowCount={rowCount}
                    pageSizeOptions={[5, 10, 25]}
                    onPaginationModelChange={onPaginationModelChange}
                    columnHeaderHeight={36}
                    rowHeight={42}
                    sx={{
                        fontSize: 11,
                        minWidth: 0,
                        '& .MuiDataGrid-columnHeaders': { bgcolor: '#d7d7d7' },
                        '& .mobile-sticky-action-header': {
                            position: 'sticky',
                            right: 0,
                            zIndex: 5,
                            bgcolor: '#d7d7d7',
                            boxShadow: '-4px 0 6px -4px rgba(0,0,0,0.4)',
                        },
                        '& .mobile-sticky-action-cell': {
                            position: 'sticky',
                            right: 0,
                            zIndex: 4,
                            bgcolor: '#fff',
                            boxShadow: '-4px 0 6px -4px rgba(0,0,0,0.32)',
                        },
                        '& .MuiDataGrid-row:hover .mobile-sticky-action-cell': { bgcolor: '#f5f5f5' },
                    }}
                />
            </Box>
        </Box>
    );
}

ShipmentScanGunPage.propTypes = {
    currentTab: PropTypes.string.isRequired,
    onTabChange: PropTypes.func.isRequired,
    rows: PropTypes.array.isRequired,
    loading: PropTypes.bool,
    paginationModel: PropTypes.object.isRequired,
    rowCount: PropTypes.number.isRequired,
    onPaginationModelChange: PropTypes.func.isRequired,
};
