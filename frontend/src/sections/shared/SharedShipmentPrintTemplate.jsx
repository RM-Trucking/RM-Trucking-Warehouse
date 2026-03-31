import React from 'react';
import PropTypes from 'prop-types';
import { Box, Typography, Table, TableBody, TableCell, TableRow, Divider } from '@mui/material';
// You can use a barcode library like react-barcode
import Barcode from 'react-barcode';

const ShipmentPrintTemplate = React.forwardRef(({ data, type }, ref) => {
    if (!data) return null;

    const getTitle = () => {
        if (type === 'active') return 'Airport Transfer';
        if (type === 'inactive') return 'Ocean Export LCL';
        return 'Ocean Export FCL';
    };

    return (
        <Box ref={ref} sx={{ p: 4, width: '8.5in', minHeight: '11in', backgroundColor: 'white', color: 'black' }}>
            {/* Header Section */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Box>
                    <Typography variant="h4" fontWeight="bold">R&M TRUCKING CO.</Typography>
                    <Typography variant="body2">840 E Green St STE 100, Bensenville, IL 60106</Typography>
                    <Typography variant="body2">Ph# (847) 616-1080 Fax# (847) 616-8811</Typography>
                </Box>
                <Box sx={{ border: '1px solid black', p: 1, minWidth: '250px' }}>
                    <Typography variant="h6" align="right">{getTitle()}</Typography>
                    <Typography variant="caption" display="block" align="right">Date: {new Date().toLocaleDateString()}</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', mt: 1 }}>
                        <Barcode value={data.billNumber || '000000'} height={40} fontSize={12} width={1.5} />
                        <Typography variant="body2">RM PRO No: {data.rmNumber}</Typography>
                    </Box>
                </Box>
            </Box>

            {/* Shipper/Consignee Grid */}
            <Box sx={{ display: 'flex', border: '1px solid black', mb: 2 }}>
                <Box sx={{ flex: 1, borderRight: '1px solid black', p: 1 }}>
                    <Typography variant="caption" fontWeight="bold" sx={{ backgroundColor: 'black', color: 'white', px: 1, display: 'block' }}>SHIPPER</Typography>
                    <Typography variant="body2">Bill To: {data.customer}</Typography>
                    <Typography variant="body2">Name: R&M TRUCKING CO</Typography>
                    <Typography variant="body2">Address: 840 W GREEN ST STE 100</Typography>
                </Box>
                <Box sx={{ flex: 1, p: 1 }}>
                    <Typography variant="caption" fontWeight="bold" sx={{ backgroundColor: 'black', color: 'white', px: 1, display: 'block' }}>CONSIGNEE</Typography>
                    <Typography variant="body2">Name: {data.consignee || ''}</Typography>
                    <Typography variant="body2">Address: {data.destination || ''}</Typography>
                </Box>
            </Box>

            {/* Table Details - Logic changes based on type */}
            <Table sx={{ border: '1px solid black' }}>
                <TableBody>
                    <TableRow sx={{ backgroundColor: 'black' }}>
                        <TableCell sx={{ color: 'white', p: 0.5, fontSize: '10px' }}>Total No of Pieces</TableCell>
                        <TableCell sx={{ color: 'white', p: 0.5, fontSize: '10px' }}>Total Weight</TableCell>
                        <TableCell sx={{ color: 'white', p: 0.5, fontSize: '10px' }}>Bill Number</TableCell>
                        <TableCell sx={{ color: 'white', p: 0.5, fontSize: '10px' }}>Station</TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell sx={{ borderRight: '1px solid black' }}>{data.pieces || '-'}</TableCell>
                        <TableCell sx={{ borderRight: '1px solid black' }}>{data.weight || '-'}</TableCell>
                        <TableCell sx={{ borderRight: '1px solid black' }}>{data.billNumber}</TableCell>
                        <TableCell>{data.station}</TableCell>
                    </TableRow>
                </TableBody>
            </Table>

            <Box sx={{ mt: 4, borderTop: '2px solid black', pt: 2 }}>
                <Typography variant="caption">SUBJECT TO ALL GOVERNING TARIFFS PUBLISHED BY R&M TRUCKING, INC.</Typography>
            </Box>
        </Box>
    );
});

ShipmentPrintTemplate.displayName = 'ShipmentPrintTemplate';
export default ShipmentPrintTemplate;