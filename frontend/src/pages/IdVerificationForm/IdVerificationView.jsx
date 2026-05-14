import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Stack,
  TextField,
  Typography,
  Collapse,
  IconButton,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DataGrid } from '@mui/x-data-grid';
import ShipmentFormLayout from '../../sections/shared/ShipmentFormLayout';
import IdVerificationPrintTemplate from './IdVerificationPrintTemplate';
import Iconify from '../../components/iconify';
import StyledTextField from '../../sections/shared/StyledTextField';
import StyledCheckbox from '../../sections/shared/StyledCheckBox';
import API from '../../utils/axios';

export default function IdVerificationViewPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [collapsed, setCollapsed] = useState(false);
  const [verificationRecord, setVerificationRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openMailDialog, setOpenMailDialog] = useState(false);
  const [emailList, setEmailList] = useState([]);

  // Fetch verification data on mount
  useEffect(() => {
    const fetchVerificationData = async () => {
      try {
        setLoading(true);
        const response = await API.get(`/id-verification/${id}`);
        const data = response.data.data;

        // Map API response to form structure
        const mappedData = {
          verificationId: data.verificationId,
          carrier: data.carrierName,
          door: data.doorNo,
          driverName: data.driver?.driverName || '',
          driverSignature: data.driver?.signaturePath || '',
          firstIdType: data.firstIdType,
          firstIdMatch: data.firstIdPhotoMatch === 'Y' || data.firstIdPhotoMatch === true,
          secondIdType: data.secondIdType,
          secondIdMatch: data.secondIdPhotoMatch === 'N' || data.secondIdPhotoMatch === false ? false : true,
          customerName: data.customerName || '',
          stationName: data.stationName || '',
          shipperCompany: data.stationName || data.customerName || '',
          verifiedBy: data.verifiedByEmployee,
          toEmails: data.toEmails || [],
          proDetails: data.proDetails?.map((detail, index) => ({
            id: detail.proDetailId || index + 1,
            sno: String(index + 1).padStart(2, '0'),
            pro: detail.proNumber,
            pieces: detail.pieces,
            weight: detail.weight,
            shipper: detail.shipper,
          })) || [],
        };

        setVerificationRecord(mappedData);
      } catch (error) {
        console.error('Error fetching verification data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchVerificationData();
    }
  }, [id]);

  const handleOpenMailDialog = () => {
    setEmailList(verificationRecord?.toEmails || []);
    setOpenMailDialog(true);
  };

  const handleCloseMailDialog = () => {
    setOpenMailDialog(false);
  };

  const columns = [
    { field: 'sno', headerName: 'SNo', width: 60, sortable: false },
    {
      field: 'pro',
      headerName: 'PRO #',
      flex: 1,
      minWidth: 140,
      sortable: false,
      renderCell: (params) => (
        <Typography sx={{ fontWeight: 700, fontSize: '13px' }}>
          {params.value}
        </Typography>
      ),
    },
    { field: 'pieces', headerName: 'Pieces', flex: 1, minWidth: 80, sortable: false },
    { field: 'weight', headerName: 'Weight (lbs)', flex: 1, minWidth: 110, sortable: false },
    { field: 'shipper', headerName: 'Shipper', flex: 1, minWidth: 120, sortable: false },
  ];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!verificationRecord) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <Typography>No data found</Typography>
      </Box>
    );
  }

  const gridData = verificationRecord.proDetails || [];

  return (
    <>
    <Box sx={{ '@media print': { display: 'none' } }}>
      {/* Custom Header with Print and OK Buttons */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 3,
          py: 2,
          bgcolor: '#f5f5f5',
          borderBottom: '1px solid #e0e0e0',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1} sx={{ cursor: 'pointer' }} onClick={() => navigate(-1)}>
          <Iconify icon="eva:arrow-ios-back-fill" />
          <Typography sx={{ fontSize: '18px', fontWeight: 600 }}>ID Verification Form - {verificationRecord?.verificationId || id}</Typography>
        </Stack>
        <Stack direction="row" spacing={2}>
          <Button
            variant="contained"
            onClick={() => window.print()}
            sx={{ bgcolor: '#A22', color: '#fff', '&:hover': { bgcolor: '#8b1c1c' } }}
          >
            Print
          </Button>
          <Button
            variant="contained"
            onClick={() => navigate(-1)}
            sx={{ bgcolor: '#A22', color: '#fff', '&:hover': { bgcolor: '#8b1c1c' } }}
          >
            OK
          </Button>
        </Stack>
      </Box>

      {/* Content Area */}
      <Box sx={{ p: 3, bgcolor: '#f5f5f5', minHeight: '100vh' }}>
        <Box sx={{ bgcolor: '#fff', p: 3, borderRadius: 2, border: '1px solid #e0e0e0' }}>
          <Stack spacing={3}>
        {/* Carrier & Door Section */}
        <fieldset
          style={{
            borderColor: "#b0b0b0",
            borderRadius: "8px",
            padding: "16px",
            borderWidth: "1px",
            borderStyle: "solid"
          }}
        >
          <legend>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, px: 1 }}>
              Carrier & Door
            </Typography>
          </legend>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={3}
            alignItems="flex-end"
          >
            <StyledTextField
              variant="standard"
              size="small"
              label="Delivering Carrier"
              value={verificationRecord?.carrier || ''}
              InputProps={{ readOnly: true }}
              sx={{ width: { xs: "100%", md: "40%" } }}
            />
            <StyledTextField
              variant="standard"
              size="small"
              label="Door"
              value={verificationRecord?.door || ''}
              InputProps={{ readOnly: true }}
              sx={{ width: { xs: "100%", md: "30%" } }}
            />
          </Stack>
        </fieldset>

        {/* Driver Details Section */}
        <fieldset
          style={{
            borderColor: "#b0b0b0",
            borderRadius: "8px",
            padding: "16px",
            borderWidth: "1px",
            borderStyle: "solid"
          }}
        >
          <legend>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, px: 1 }}>
              Driver Details
            </Typography>
          </legend>
          <Stack spacing={3}>
            {/* Driver Name & Signature */}
            <Stack
              direction={{ xs: "column", lg: "row" }}
              spacing={3}
              alignItems="flex-end"
            >
              <Stack
                direction="row"
                spacing={2}
                alignItems="center"
                sx={{ width: { xs: "100%", lg: "46%" } }}
              >
                <StyledTextField
                  variant="standard"
                  size="small"
                  label="Driver Name"
                  value={verificationRecord?.driverName || ''}
                  InputProps={{ readOnly: true }}
                  sx={{ flex: 1 }}
                />
              </Stack>
              <Box
                sx={{
                  width: { xs: "100%", lg: "26%" },
                  height: 50,
                  border: "1px dashed #707070",
                  borderRadius: 1,
                  bgcolor: "#e6e6e6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  backgroundImage: verificationRecord?.driverSignature ? `url(data:image/png;base64,${verificationRecord.driverSignature})` : 'none',
                  backgroundSize: 'contain',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                }}
              >
                {!verificationRecord?.driverSignature && (
                  <Typography sx={{ fontSize: "12px", color: "#999" }}>
                    Signature
                  </Typography>
                )}
              </Box>
            </Stack>

            {/* First ID Reviewed */}
            <Stack direction={{ xs: "column", lg: "row" }} spacing={3} alignItems="center">
              <Typography sx={{ width: { xs: "100%", lg: "46%" }, fontSize: "0.75rem", color: '#333', fontWeight: 600 }}>
                TYPE OF FIRST ID REVIEWED. (GOVERNMENT ISSUED ID OR COMPANY ISSUED)
              </Typography>
              <StyledTextField
                variant="standard"
                size="small"
                value={verificationRecord?.firstIdType || ''}
                InputProps={{ readOnly: true }}
                sx={{ width: { xs: "100%", lg: "26%" } }}
              />
              <Stack direction="row" alignItems="center" sx={{ width: { xs: "100%", lg: "28%" } }}>
                <StyledCheckbox
                  size="small"
                  checked={verificationRecord?.firstIdMatch || false}
                  sx={{ p: 0, mr: 1 }}
                  disabled
                />
                <Typography sx={{ fontSize: 12, lineHeight: 1.2 }}>
                  MATCHING PHOTO ON ID
                </Typography>
              </Stack>
            </Stack>

            {/* Second ID Reviewed */}
            <Stack direction={{ xs: "column", lg: "row" }} spacing={3} alignItems="center">
              <Typography sx={{ width: { xs: "100%", lg: "46%" }, fontSize: "0.75rem", color: '#333', fontWeight: 600 }}>
                TYPE OF SECOND ID REVIEWED (IF THE FIRST ID WAS NOT A PHOTO ID ISSUED
                BY A GOVERNMENT AUTHORITY OR IS NOT A COMPANY ID)
              </Typography>
              <StyledTextField
                variant="standard"
                size="small"
                value={verificationRecord?.secondIdType || ''}
                InputProps={{ readOnly: true }}
                sx={{ width: { xs: "100%", lg: "26%" } }}
              />
              <Stack direction="row" alignItems="center" sx={{ width: { xs: "100%", lg: "28%" } }}>
                <StyledCheckbox
                  size="small"
                  checked={verificationRecord?.secondIdMatch || false}
                  sx={{ p: 0, mr: 1 }}
                  disabled
                />
                <Typography sx={{ fontSize: 12, lineHeight: 1.2 }}>
                  MATCHING PHOTO ON ID
                </Typography>
              </Stack>
            </Stack>

            {/* Shipper's Company Name */}
            <Stack direction={{ xs: "column", lg: "row" }} spacing={3} alignItems="center">
              <Typography sx={{ width: { xs: "100%", lg: "46%" }, fontSize: "0.75rem", color: '#333', fontWeight: 600 }}>
                SHIPPER'S COMPANY NAME (WHERE APPLICABLE)
              </Typography>
              <StyledTextField
                variant="standard"
                size="small"
                value={"Listed Above"}
                InputProps={{ readOnly: true }}
                sx={{ width: { xs: "100%", lg: "26%" } }}
              />
              <Box sx={{ width: { xs: "100%", lg: "28%" } }} />
            </Stack>

            {/* Verifier Name */}
            <Stack direction={{ xs: "column", lg: "row" }} spacing={3} alignItems="center">
              <Typography sx={{ width: { xs: "100%", lg: "46%" }, fontSize: "0.75rem", color: '#333', fontWeight: 600 }}>
                NAME OF EMPLOYEE OR AUTHORIZED REPRESENTATIVE WHO VERIFIED ID INFORMATION
              </Typography>
              <StyledTextField
                variant="standard"
                size="small"
                value={verificationRecord?.verifiedBy || ''}
                InputProps={{ readOnly: true }}
                sx={{ width: { xs: "100%", lg: "26%" } }}
              />
              <Box sx={{ width: { xs: "100%", lg: "28%" } }} />
            </Stack>
          </Stack>
        </fieldset>

        {/* Freight Forwarder Table Section */}
        <Box sx={{ border: "1px solid #b0b0b0", borderRadius: 1, overflow: "hidden" }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ bgcolor: "#b3b3b3", px: 2, py: 1 }}
          >
            <Typography sx={{ fontWeight: 700, fontSize: "14px", color: '#000' }}>
              Freight Forwarder - {verificationRecord?.stationName ? `${verificationRecord?.customerName || 'N/A'} | ${verificationRecord?.stationName}` : verificationRecord?.shipperCompany || 'N/A'}
            </Typography>
            <Stack direction="row" alignItems="center">
              <IconButton
                size="small"
                sx={{ color: "#A22" }}
                onClick={handleOpenMailDialog}
                disabled={!verificationRecord?.toEmails || verificationRecord?.toEmails.length === 0}
              >
                <Iconify icon="mdi:email" width={20} />
              </IconButton>
              <IconButton size="small" onClick={() => setCollapsed(!collapsed)} sx={{ color: '#000' }}>
                <Iconify icon={collapsed ? "mdi:chevron-down" : "mdi:chevron-up"} width={24} />
              </IconButton>
            </Stack>
          </Stack>

          <Collapse in={!collapsed}>
            <Box sx={{ borderTop: "1px solid #f0f0f0" }}>
              <DataGrid
                rows={gridData}
                columns={columns}
                autoHeight
                disableRowSelectionOnClick
                disableColumnMenu
                hideFooter
                sx={{
                  border: "none",
                  "& .MuiDataGrid-columnHeaders": {
                    backgroundColor: "#f4f6f8",
                    borderBottom: '1px solid #ccc'
                  },
                  "& .MuiDataGrid-cell": {
                    borderBottom: '1px solid #e0e0e0',
                    display: 'flex',
                    alignItems: 'center',
                  }
                }}
              />
            </Box>
          </Collapse>
        </Box>
</Stack> {/* 1. Closes <Stack spacing={3}> */}
        </Box>  
              </Box>     
    </Box>     
      {/* Mail List Dialog */}
      <Dialog
        open={openMailDialog}
        onClose={handleCloseMailDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            border: '3px solid #a22'
          }
        }}
      >
        <Box sx={{ p: 2, bgcolor: '#a22', color: 'white', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Mail List</span>
          <Stack direction="row" alignItems="center" spacing={1}>
            <span sx={{ fontSize: '12px' }}>(Read Only)</span>
            <IconButton
              size="small"
              onClick={handleCloseMailDialog}
              sx={{ color: 'white', p: 0 }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Box>
        <DialogContent sx={{ p: 2, minHeight: '300px' }}>
          {emailList && emailList.length > 0 ? (
            <DataGrid
              rows={emailList.map((email, index) => ({
                id: index + 1,
                sno: String(index + 1).padStart(2, '0'),
                emailId: email
              }))}
              columns={[
                {
                  field: 'sno',
                  headerName: 'SNO',
                  width: 80,
                  sortable: false
                },
                {
                  field: 'emailId',
                  headerName: 'Email ID',
                  flex: 1,
                  sortable: false
                }
              ]}
              hideFooter
              disableRowSelectionOnClick
              sx={{
                '& .MuiDataGrid-columnHeaders': {
                  bgcolor: '#f5f5f5',
                  borderBottom: '2px solid #e0e0e0'
                },
                '& .MuiDataGrid-cell': {
                  borderBottom: '1px solid #e0e0e0'
                }
              }}
            />
          ) : (
            <Typography variant="body2" sx={{ color: '#999', p: 2 }}>
              No emails available
            </Typography>
          )}
        </DialogContent>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #e0e0e0' }}>
          <Button
            variant="contained"
            onClick={handleCloseMailDialog}
            sx={{ bgcolor: '#a22', '&:hover': { bgcolor: '#811' }, textTransform: 'uppercase', fontSize: '12px' }}
          >
            Close
          </Button>
        </Box>
      </Dialog>

      {/* Print Template */}
      {verificationRecord && (
        <IdVerificationPrintTemplate
          data={{
            verificationId: verificationRecord.verificationId,
            date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }),
            carrier: verificationRecord.carrier,
            freightForwarder: verificationRecord.shipperCompany,
            customerName: verificationRecord.customerName,
            stationName: verificationRecord.stationName,
            door: verificationRecord.door,
            driverName: verificationRecord.driverName,
            signature: verificationRecord.driverSignature,
            firstIdType: verificationRecord.firstIdType,
            firstIdMatch: verificationRecord.firstIdMatch,
            secondIdType: verificationRecord.secondIdType,
            secondIdMatch: verificationRecord.secondIdMatch,
            shipperCompany: verificationRecord.shipperCompany,
            verifiedBy: verificationRecord.verifiedBy,
            freightDetails: verificationRecord.proDetails || [],
          }}
        />
      )}
    </>
  );    

}
