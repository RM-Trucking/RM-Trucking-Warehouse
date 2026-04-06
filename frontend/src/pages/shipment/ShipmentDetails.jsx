import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
    Button,
    Box,
    Typography,
    Stack,
    Divider,
    FormControlLabel,
    Dialog,
    IconButton,
    DialogTitle,
    DialogContent, CircularProgress, MenuItem,
    ListSubheader, Checkbox, ListItemText
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

// for date picker
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

// import StyledTextField from '../shared/StyledTextField';
// import StyledCheckbox from '../shared/StyledCheckBox';
import { useDispatch, useSelector } from '../../redux/store';
import Iconify from '../../components/iconify';
import formatPhoneNumber from '../../utils/formatPhoneNumber';
// import CarrierViewTabs from './CarrierViewTabs';
// import CarrierViewTable from './CarrierViewTable';
import { setTableBeingViewed } from '../../redux/slices/customer';
import { postCarrierData, putCarrierData } from '../../redux/slices/carrier';
// ----------------------------------------------------------------------


ShipmentDetails.propTypes = {
    type: PropTypes.string,
    handleCloseConfirm: PropTypes.func,
    selectedCarrierRowDetails: PropTypes?.object
};

export default function ShipmentDetails({ type, handleCloseConfirm, selectedCarrierRowDetails }) {
    const dispatch = useDispatch();
    const operationalMessage = useSelector((state) => state?.carrierdata?.operationalMessage);
    const isLoading = useSelector((state) => state?.carrierdata?.isLoading);
    const selectedRowCarrierType = useSelector((state) => state?.carrierdata?.selectedRowCarrierType);
    // Define default values for the form
    const defaultValues = {
        carrierName: '',
        carrierType: [],
        carrierStatus: type === 'Add' ? 'active' : '',
        corpAddressLine1: '',
        corpAddressLine2: '',
        corpCity: '',
        corpState: '',
        corpZipCode: '',
        sameAsCorporate: false,
        billAddressLine1: '',
        billAddressLine2: '',
        billCity: '',
        billState: '',
        billZipCode: '',
        tsa: false,
        ustDotNo: '',
        mcNo: '',
        insuranceExpiryDate: '',
        tariffRenewalDate: '',
        salesRepName: '',
        salesRepPhoneNumber: '',
        salesRepEmailId: '',
        carrierNotes: '',
    };

    const btnStyle = {
  borderRadius: '4px',
  color: '#fff',
  boxShadow: 'none',
  fontSize: '14px',
  px: 2,
  py: 0.5,
  bgcolor: '#A22',
  fontWeight: 'normal',
};
    const [readOnly, setReadOnly] = useState(false);
    const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
    const [alertDialog, setAlertDialog] = useState(false);
    const [warning, setWarning] = useState(false);

    const { control, handleSubmit, watch, getValues, setValue } = useForm({ defaultValues });

    // Watch the checkbox value to conditionally render billing address
    const sameAsCorporate = watch('sameAsCorporate');

    const onSubmit = (data) => {
        console.log('Form Submitted (RHF Data):', data);
        if (data.sameAsCorporate && (data.corpAddressLine1 !== data.billAddressLine1 || data.corpAddressLine2 !== data.billAddressLine2 ||
            data.corpCity !== data.billCity || data.corpState !== data.billState ||
            data.corpZipCode !== data.billZipCode)) {
            setOpenConfirmDialog(true);
            return;
        }
        const rawValueIED = data.insuranceExpiryDate;
        const rawValueTRD = data.tariffRenewalDate;

        // 3. Convert to Date object and format
        const dateObjIED = new Date(rawValueIED);
        const formattedIED = dateObjIED.toLocaleDateString('en-CA'); // Result: "2026-03-10"

        const dateObjTRD = new Date(rawValueTRD);
        const formattedTRD = dateObjTRD.toLocaleDateString('en-CA'); // Result: "2026-03-10"

        if (type === 'Add') {
            const obj = {
                "carrierName": data.carrierName,
                "carrierType": data.carrierType.join(", "),
                "carrierStatus": "Active",
                "tsaCertified": data.tsa ? 'Y' : 'N',
                "ustDotNo": data.ustDotNo,
                "mcnNo": data.mcNo,
                "insuranceExpiry": formattedIED || '',
                "tariffRenewalDate": formattedTRD || '',
                "salesRepName": data.salesRepName,
                "salesRepPhone": data.salesRepPhoneNumber,
                "salesRepEmail": data.salesRepEmailId,
                "corporateBillingSame": data.sameAsCorporate ? 'Y' : 'N',
                "addresses": [
                    {
                        "line1": data.corpAddressLine1,
                        "line2": data.corpAddressLine2,
                        "city": data.corpCity,
                        "state": data.corpState,
                        "zipCode": data.corpZipCode,
                        "addressRole": "Corporate"
                    },
                    {
                        "line1": data.billAddressLine1,
                        "line2": data.billAddressLine2,
                        "city": data.billCity,
                        "state": data.billState,
                        "zipCode": data.billZipCode,
                        "addressRole": "Billing"
                    },
                ],
                "note": {
                    "messageText": data.carrierNotes
                }
            }
            dispatch(postCarrierData(obj));
            console.log('data')
        }
        if (type === 'Edit') {
            const obj = {
                "carrierName": data.carrierName,
                "carrierType": data.carrierType.join(", "),
                "carrierStatus": data.carrierStatus,
                "tsaCertified": data.tsa ? 'Y' : 'N',
                "totalShipments": selectedCarrierRowDetails?.totalShipments,
                "rmOnTimePercent": selectedCarrierRowDetails?.rmOnTimePercent,
                "lateShipments": selectedCarrierRowDetails?.lateShipments,
                "ustDotNo": data.ustDotNo,
                "mcnNo": data.mcNo,
                "insuranceExpiry": formattedIED || '',
                "tariffRenewalDate": formattedTRD || '',
                "salesRepName": data.salesRepName,
                "salesRepPhone": data.salesRepPhoneNumber,
                "salesRepEmail": data.salesRepEmailId,
                "corporateBillingSame": data.sameAsCorporate ? 'Y' : 'N',
                "addresses": [
                    {
                        "line1": data.corpAddressLine1,
                        "line2": data.corpAddressLine2,
                        "city": data.corpCity,
                        "state": data.corpState,
                        "zipCode": data.corpZipCode,
                        "addressRole": "Corporate"
                    },
                    {
                        "line1": data.billAddressLine1,
                        "line2": data.billAddressLine2,
                        "city": data.billCity,
                        "state": data.billState,
                        "zipCode": data.billZipCode,
                        "addressRole": "Billing"
                    },
                ]
            }
            obj.addresses[0].addressId = (selectedCarrierRowDetails.addresses[0].addressRole === 'Corporate') ? selectedCarrierRowDetails.addresses[0].addressId : selectedCarrierRowDetails.addresses[1].addressId;
            obj.addresses[1].addressId = (selectedCarrierRowDetails.addresses[1].addressRole === 'Billing') ? selectedCarrierRowDetails.addresses[1].addressId : selectedCarrierRowDetails.addresses[0].addressId;;
            console.log('data');
            dispatch(putCarrierData(obj, selectedCarrierRowDetails?.carrierId))
        }
    };
    useEffect(() => {
        dispatch(setTableBeingViewed('terminal'));
    }, []);
    useEffect(() => {
        if (warning) setAlertDialog(true);
    }, [warning]);
    useEffect(() => {
        if (operationalMessage && handleCloseConfirm) {
            handleCloseConfirm();
        }
    }, [operationalMessage]);
    useEffect(() => {
        console.log('Selected Customer Details:', selectedCarrierRowDetails);
        console.log('Selected Customer Details:', selectedCarrierRowDetails?.carrierType?.split(","));

        if ((type === 'Edit' || type === 'View') && selectedCarrierRowDetails) {
            setValue('carrierName', selectedCarrierRowDetails?.carrierName || '');
            setValue('carrierType', selectedCarrierRowDetails?.carrierType?.split(",")?.map(s => s.trim()) || []);
            setValue('carrierStatus', selectedCarrierRowDetails?.carrierStatus?.charAt(0).toLowerCase() + selectedCarrierRowDetails?.carrierStatus?.slice(1) || '');
            setValue('corpAddressLine1', selectedCarrierRowDetails?.addresses?.[0]?.line1 || '');
            setValue('corpAddressLine2', selectedCarrierRowDetails?.addresses?.[0]?.line2 || '');
            setValue('corpCity', selectedCarrierRowDetails?.addresses?.[0]?.city || '');
            setValue('corpState', selectedCarrierRowDetails?.addresses?.[0]?.state || '');
            setValue('corpZipCode', selectedCarrierRowDetails?.addresses?.[0]?.zipCode || '');
            setValue('sameAsCorporate', selectedCarrierRowDetails?.corporateBillingSame === 'Y' ? true : false);
            setReadOnly(selectedCarrierRowDetails?.corporateBillingSame === 'Y' ? true : false);
            setValue('billAddressLine1', selectedCarrierRowDetails?.addresses?.[1]?.line1 || '');
            setValue('billAddressLine2', selectedCarrierRowDetails?.addresses?.[1]?.line2 || '');
            setValue('billCity', selectedCarrierRowDetails?.addresses?.[1]?.city || '');
            setValue('billState', selectedCarrierRowDetails?.addresses?.[1]?.state || '');
            setValue('billZipCode', selectedCarrierRowDetails?.addresses?.[1]?.zipCode || '');
            setValue('tsa', selectedCarrierRowDetails?.tsaCertified === 'Y' ? true : false|| '');
            setValue('ustDotNo', selectedCarrierRowDetails?.ustDotNo || '');
            setValue('mcNo', selectedCarrierRowDetails?.mcnNo || '');
            setValue('insuranceExpiryDate', selectedCarrierRowDetails?.insuranceExpiry || '');
            setValue('tariffRenewalDate', selectedCarrierRowDetails?.tariffRenewalDate || '');
            setValue('salesRepName', selectedCarrierRowDetails?.salesRepName || '');
            setValue('salesRepPhoneNumber', selectedCarrierRowDetails?.salesRepPhone || '');
            setValue('salesRepEmailId', selectedCarrierRowDetails?.salesRepEmail || '');
        }

    }, [selectedCarrierRowDetails]);
    useEffect(() => {
        if (type === 'View') {
            setReadOnly(true);
        } else {
            setReadOnly(false);
        }
    }, [type]);
    // dialog actions and functions
    const handleCloseConfirmDialog = () => {
        setOpenConfirmDialog(false);
    };
    const handleAlertDialog = () => {
        setAlertDialog(false);
        setWarning(false);
    }

    return (
        <>
            {/* header  */}
            
                {/* <Stack flexDirection="row" alignItems={'center'} justifyContent="space-between" sx={{ mb: 1 }}>
                    <Typography sx={{ fontSize: '18px', fontWeight: 600 }}>Select Shipment</Typography>
                    {type === 'Add' && <Iconify icon="carbon:close" onClick={() => handleCloseConfirm()} sx={{ cursor: 'pointer' }} />}
                </Stack>
                <Divider sx={{ borderColor: 'rgba(143, 143, 143, 1)' }} /> */}
            
            {/* <Box component="form" sx={{ pt: 2, pb: 2 }}> */}

                    {/* <Stack flexDirection={'row'} alignItems={'center'} sx={{ mt: 4 }}>
                        <Button
                                variant="contained"
                                size="small"
                                type='submit'
                                onClick={handleSubmit(onSubmit)}
                                sx={{
                                    '&.MuiButton-contained': {
                                        borderRadius: '4px',
                                        color: '#ffffff',
                                        boxShadow: 'none',
                                    fontSize: '14px',
                                    p: '2px 16px',
                                    bgcolor: '#A22',
                                    fontWeight: 'normal',
                                    ml: 1,
                                    mb: 1
                                },
                            }}
                        >
                        Air Shipmwnent Form
                    </Button>
                     <Button
                            variant="contained"
                            size="small"
                            type='submit'
                            onClick={handleSubmit(onSubmit)}
                            sx={{
                                '&.MuiButton-contained': {
                                    borderRadius: '4px',
                                    color: '#ffffff',
                                    boxShadow: 'none',
                                    fontSize: '14px',
                                    p: '2px 16px',
                                    bgcolor: '#A22',
                                    fontWeight: 'normal',
                                    ml: 1,
                                    mb: 1
                                },
                            }}
                        >
                        LCL Shipment Form
                    </Button>
                    
                        <Button
                            variant="contained"
                            size="small"
                            type='submit'
                            onClick={handleSubmit(onSubmit)}
                            sx={{
                                '&.MuiButton-contained': {
                                    borderRadius: '4px',
                                    color: '#ffffff',
                                    boxShadow: 'none',
                                    fontSize: '14px',
                                    p: '2px 16px',
                                    bgcolor: '#A22',
                                    fontWeight: 'normal',
                                    ml: 1,
                                    mb: 1
                                },
                            }}
                        >
                            FCL Shipment Form
                        </Button>
                </Stack> */}
                        {/* <SharedHomepageHeader title="Shipment Form" buttonText='New Shipment'  />
                        <SharedHomepageHeader title="Shipment Form" buttonText='New Shipment'  />
                        <SharedHomepageHeader title="Shipment Form" buttonText='New Shipment'  /> */}
              

            {/* </Box>            */}

            <Dialog
  open={open} // control this with state
  onClose={handleCloseConfirm}
  maxWidth="sm"
  fullWidth={false}
>
  {/* Header */}
  <DialogTitle sx={{ pb: 1 }}>
    <Stack direction="row" justifyContent="space-between" alignItems="center">
      <Typography sx={{ fontSize: '18px', fontWeight: 600 }}>
        Select Shipment
      </Typography>
      <IconButton onClick={handleCloseConfirm}>
        <CloseIcon />
      </IconButton>
    </Stack>
    <Divider sx={{ mt: 1 }} />
  </DialogTitle>

  {/* Content */}
  <DialogContent>
    <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
      <Button variant="contained" size="small" sx={btnStyle}>
        Air Shipment Form
      </Button>

      <Button variant="contained" size="small" sx={btnStyle}>
        LCL Shipment Form
      </Button>

      <Button variant="contained" size="small" sx={btnStyle}>
        FCL Shipment Form
      </Button>
    </Stack>
  </DialogContent>
</Dialog>
           
        </>
    );
}
