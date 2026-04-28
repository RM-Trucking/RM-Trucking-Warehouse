import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "../../redux/store";
import {
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Collapse,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import StyledTextField from "../../sections/shared/StyledTextField";
import StyledCheckbox from "../../sections/shared/StyledCheckBox";
import ShipmentFormLayout from "../../sections/shared/ShipmentFormLayout";
import Iconify from "../../components/iconify";
import { searchCarriers, addNewCarrier, searchCustomers } from "../../redux/slices/enroute";
import { verifyProNumber, clearProVerification, submitDriverCheckIn } from "../../redux/slices/driverCheckIn";
import formatPhoneNumber from "../../utils/formatPhoneNumber";

const actionBtnSx = {
  bgcolor: "#A22",
  color: "#fff",
  textTransform: "none",
  minWidth: 96,
  height: 30,
  px: 2,
  fontSize: 12,
  "&:hover": { bgcolor: "#8b1c1c" },
};

const INITIAL_GROUPS = [];

// Dummy PRO data for validation
const DUMMY_PROS = {
  'PRO7898710001': {
    pro: 'PRO7898710001',
    pieces: 20,
    weight: 600,
    shipper: 'Shipper052',
    freightForwarder: 'KUEHNE & NAGEL'
  },
  'PRO7898710002': {
    pro: 'PRO7898710002',
    pieces: 15,
    weight: 450,
    shipper: 'Shipper053',
    freightForwarder: 'SEACOAST'
  },
  'PRO7898710003': {
    pro: 'PRO7898710003',
    pieces: 25,
    weight: 750,
    shipper: 'Shipper054',
    freightForwarder: 'KUEHNE & NAGEL'
  }
};

export default function DriverCheckInPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { carrierOptions, carrierLoading, customerOptions, customerLoading } = useSelector(
    (state) => state.enroutedata,
  );

  const [proGroups, setProGroups] = useState(INITIAL_GROUPS);
  const [collapsed, setCollapsed] = useState({});
  const [editingEntry, setEditingEntry] = useState(null);
  const [editingValues, setEditingValues] = useState({});
  const [carrierSearchValue, setCarrierSearchValue] = useState("");
  const [selectedCarrier, setSelectedCarrier] = useState(null);
  const isSelectingRef = useRef(false);
  const [customerSearchValue, setCustomerSearchValue] = useState("");
  const isSelectingCustomerRef = useRef(false);
  const [openAddCarrierModal, setOpenAddCarrierModal] = useState(false);
  const [newCarrierForm, setNewCarrierForm] = useState({
    name: "",
    phone: "",
  });
  const [addCarrierLoading, setAddCarrierLoading] = useState(false);
  const [addCarrierError, setAddCarrierError] = useState(null);
  const [signature, setSignature] = useState(true);
  const [doorValue, setDoorValue] = useState("");
  const [driverNameValue, setDriverNameValue] = useState("");
  const [firstIdTypeValue, setFirstIdTypeValue] = useState("");
  const [firstIdPhotoChecked, setFirstIdPhotoChecked] = useState(false);
  const [employeeNameValue, setEmployeeNameValue] = useState("");
  const [formValues, setFormValues] = useState({
    freightForwarder: "",
    pro: "",
    pieces: "",
    weight: "",
    shipper: "",
  });

  // PRO validation states
  const [proValidating, setProValidating] = useState(false);
  const [showRemainingFields, setShowRemainingFields] = useState(false);
  const [proValidationError, setProValidationError] = useState(null);
  const [proValidated, setProValidated] = useState(false);
  const [openProDialog, setOpenProDialog] = useState(false);
  const [proDialogSuccess, setProDialogSuccess] = useState(false);
  const [proFormError, setProFormError] = useState(null);
  const [openRejectionDialog, setOpenRejectionDialog] = useState(false);
  const [rejectedProData, setRejectedProData] = useState(null);
  const [openApiErrorDialog, setOpenApiErrorDialog] = useState(false);
  const [apiErrorMessage, setApiErrorMessage] = useState('');
  const [formErrors, setFormErrors] = useState({
    selectedCarrier: false,
    doorValue: false,
    driverNameValue: false,
    firstIdTypeValue: false,
    employeeNameValue: false,
    proGroups: false,
    signatureData: false
  });

  // Debounced search effect for carriers
  useEffect(() => {
    if (isSelectingRef.current) {
      isSelectingRef.current = false;
      return;
    }

    const timer = setTimeout(() => {
      dispatch(searchCarriers(carrierSearchValue));
    }, 500);

    return () => clearTimeout(timer);
  }, [dispatch, carrierSearchValue]);

  // Debounced search effect for customers
  useEffect(() => {
    if (isSelectingCustomerRef.current) {
      isSelectingCustomerRef.current = false;
      return;
    }

    const timer = setTimeout(() => {
      dispatch(searchCustomers(customerSearchValue));
    }, 500);

    return () => clearTimeout(timer);
  }, [dispatch, customerSearchValue]);

  const handleOpenAddCarrierModal = () => setOpenAddCarrierModal(true);
  // Add to your state declarations
  const [isSignatureVisible, setIsSignatureVisible] = useState(false);
  const [signatureData, setSignatureData] = useState(null); // Will store your fetched Base64
  const [openVerificationDialog, setOpenVerificationDialog] = useState(false);
  const [verificationIds, setVerificationIds] = useState([]);
  const signatureBase64 = "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";

  const handleCloseAddCarrierModal = () => {
    setOpenAddCarrierModal(false);
    setAddCarrierError(null);
    setNewCarrierForm({ name: "", phone: "" });
  };

  const handleResetAddCarrierForm = () => {
    setNewCarrierForm({ name: "", phone: "" });
  };

  const validatePhoneNumber = (phone) => {
    if (!phone) {
      return 'Phone number is required';
    }
    if (phone.length > 20) {
      return 'Phone number cannot exceed 20 characters';
    }
    const phoneRegex = /^\(\d{3}\) \d{3}-\d{4}.*$/;
    if (!phoneRegex.test(phone)) {
      return 'Invalid phone format. Use format: (XXX) XXX-XXXX';
    }
    return null;
  };

  const handleGetSignature = () => {
    // In your final implementation, call your Topaz integration logic here
    // Example: SigWeb.GetSignature().then(data => setSignatureData(data));

    // For now, to show the hardcoded one:
    setSignatureData(signatureBase64);
    setIsSignatureVisible(true);
    clearFieldError('signatureData');
  };

  const handleClearSignature = () => {
    setSignatureData(null);
    setIsSignatureVisible(false);
  };

  const handleResetForm = () => {
    setSelectedCarrier(null);
    setCarrierSearchValue("");
    setCustomerSearchValue("");
    setFormValues({
      freightForwarder: null,
      pro: "",
      pieces: "",
      weight: "",
      shipper: "",
    });
    setSignature(true);
    setProGroups([]);
    setShowRemainingFields(false);
    setProValidationError(null);
    setProValidated(false);
    setDoorValue("");
    setDriverNameValue("");
    setFirstIdTypeValue("");
    setFirstIdPhotoChecked(false);
    setEmployeeNameValue("");
    setSignatureData(null);
    setIsSignatureVisible(false);
    setFormErrors({
      selectedCarrier: false,
      doorValue: false,
      driverNameValue: false,
      firstIdTypeValue: false,
      employeeNameValue: false,
      signatureData: false,
      proGroups: false
    });
    dispatch(clearProVerification());
  };

  const validateCheckInForm = () => {
    const newErrors = {
      selectedCarrier: !selectedCarrier?.carrierId,
      doorValue: !doorValue.trim(),
      driverNameValue: !driverNameValue.trim(),
      firstIdTypeValue: !firstIdTypeValue.trim(),
      employeeNameValue: !employeeNameValue.trim(),
      signatureData: !signatureData,
      proGroups: proGroups.length === 0
    };
    return newErrors;
  };

  const clearFieldError = (fieldName) => {
    setFormErrors(prev => ({
      ...prev,
      [fieldName]: false
    }));
  };

  const handleSubmitCheckIn = async () => {
    // Validate required fields
    const errors = validateCheckInForm();
    const hasErrors = Object.values(errors).some(error => error);

    if (hasErrors) {
      setFormErrors(errors);
      return;
    }

    // Clear errors if validation passes
    setFormErrors({
      selectedCarrier: false,
      doorValue: false,
      driverNameValue: false,
      firstIdTypeValue: false,
      employeeNameValue: false,
      signatureData: false,
      proGroups: false
    });

    try {
      // Build freight details from proGroups
      const freightDetails = [];
      proGroups.forEach(group => {
        group.entries.forEach(entry => {
          freightDetails.push({
            customerId: entry.customerId || 0,
            stationId: entry.stationId || 0,
            proNumber: entry.pro,
            pieces: entry.pieces,
            weight: entry.weight,
            shipper: entry.shipper,
            toEmails: ['demo1@gmail.com', 'demo2@gmail.com']
          });
        });
      });

      const checkInData = {
        carrierId: selectedCarrier.carrierId,
        doorNo: doorValue,
        firstIdType: firstIdTypeValue.toUpperCase().replace(/\s+/g, '_'),
        firstIdPhotoMatch: firstIdPhotoChecked,
        driverName: driverNameValue,
        driverSignature: signatureData || '',
        verifiedByEmployee: employeeNameValue,
        freightDetails: freightDetails
      };

      const response = await dispatch(submitDriverCheckIn(checkInData));

      // Show verification ID dialog
      if (response?.verificationIds) {
        setVerificationIds(response.verificationIds);
        setOpenVerificationDialog(true);
      } else {
        alert('Driver Check-In submitted successfully!');
        handleResetForm();
      }
    } catch (error) {
      alert('Error submitting check-in: ' + (error.message || 'Unknown error'));
      console.error('Submit error:', error);
    }
  };

  const handleValidateProNumber = async () => {
    if (!selectedCarrier?.carrierId) {
      setProValidationError('Please select a carrier first');
      return;
    }

    if (!formValues.pro.trim()) {
      setProValidationError('Please enter a PRO number');
      return;
    }

    setProValidating(true);
    setProValidationError(null);

    try {
      const proData = await dispatch(verifyProNumber(selectedCarrier.carrierId, formValues.pro));

      if (proData?.error) {
        // Check the error message type
        if (proData.message.toLowerCase().includes('no record found')) {
          // PRO not found - show not available dialog (allow manual entry)
          setProDialogSuccess(false);
          setOpenProDialog(true);
          setProValidated(false);
          setShowRemainingFields(true);
        } else {
          // Other API error (like duplicate record) - show error dialog and reset PRO
          setApiErrorMessage(proData.message);
          setOpenApiErrorDialog(true);
          // Reset the pro field
          setFormValues(prev => ({
            ...prev,
            pro: ''
          }));
          setProValidated(false);
          setShowRemainingFields(false);
        }
      } else if (proData) {
        // Check if PRO is rejected
        if (proData.isRejected) {
          setRejectedProData(proData);
          setOpenRejectionDialog(true);
        } else {
          // PRO found - show success dialog
          setProDialogSuccess(true);
          setOpenProDialog(true);

          // Auto-populate fields with API response
          setFormValues(prev => ({
            ...prev,
            freightForwarder: {
              customerId: proData.customerId,
              stationId: proData.stationId,
              customerName: proData.customerName,
              stationName: proData.stationName,
              emails: proData.toEmails || []
            },
            pieces: proData.pieces?.toString() || '',
            weight: proData.weight?.toString() || '',
            shipper: proData.shipper || ''
          }));
          setProValidated(true);
          setShowRemainingFields(true);
        }
      } else {
        // PRO not found (404) - show not available dialog
        setProDialogSuccess(false);
        setOpenProDialog(true);
        setProValidated(false);
        setShowRemainingFields(true);
      }
    } catch (error) {
      setProValidationError(error.message || 'Error validating PRO number');
    } finally {
      setProValidating(false);
    }
  };

  const handleCloseProDialog = () => {
    setOpenProDialog(false);
    setProFormError(null);
  };

  const handleResetProValidation = () => {
    setFormValues(prev => ({
      ...prev,
      pro: '',
      freightForwarder: null,
      pieces: '',
      weight: '',
      shipper: ''
    }));
    setShowRemainingFields(false);
    setProValidationError(null);
    setProValidated(false);
    setProFormError(null);
    dispatch(clearProVerification());
  };

  const handleRejectionYes = () => {
    if (rejectedProData) {
      // Auto-populate fields with rejected PRO data
      setFormValues(prev => ({
        ...prev,
        freightForwarder: {
          customerId: rejectedProData.customerId,
          stationId: rejectedProData.stationId,
          customerName: rejectedProData.customerName,
          stationName: rejectedProData.stationName,
          emails: rejectedProData.toEmails || []
        },
        pieces: rejectedProData.pieces?.toString() || '',
        weight: rejectedProData.weight?.toString() || '',
        shipper: rejectedProData.shipper || ''
      }));
      setProValidated(true);
      setShowRemainingFields(true);
      setOpenRejectionDialog(false);
      setRejectedProData(null);
    }
  };

  const handleRejectionNo = () => {
    // Reset the PRO field
    setFormValues(prev => ({
      ...prev,
      pro: ''
    }));
    setOpenRejectionDialog(false);
    setRejectedProData(null);
    setProValidationError(null);
  };

  const validateProDetails = () => {
    const errors = [];

    // Handle both object and string formats for backward compatibility
    const freightForwarderName = typeof formValues.freightForwarder === 'string'
      ? formValues.freightForwarder
      : (formValues.freightForwarder?.customerName || '');

    if (!freightForwarderName || !freightForwarderName.trim()) {
      errors.push('Freight Forwarder is required');
    }

    if (!formValues.pieces || !formValues.pieces.toString().trim()) {
      errors.push('Pieces is required');
    } else if (isNaN(formValues.pieces) || Number(formValues.pieces) <= 0) {
      errors.push('Pieces must be a valid number greater than 0');
    }

    if (!formValues.weight || !formValues.weight.toString().trim()) {
      errors.push('Weight is required');
    } else if (isNaN(formValues.weight) || Number(formValues.weight) <= 0) {
      errors.push('Weight must be a valid number greater than 0');
    }

    if (!formValues.shipper || !formValues.shipper.trim()) {
      errors.push('Shipper is required');
    }

    return errors;
  };

  const handleAddCarrierSubmit = async () => {
    if (!newCarrierForm.name.trim()) {
      setAddCarrierError('Delivering Carrier name is required');
      return;
    }

    const phoneError = validatePhoneNumber(newCarrierForm.phone);
    if (phoneError) {
      setAddCarrierError(phoneError);
      return;
    }

    setAddCarrierLoading(true);
    setAddCarrierError(null);

    try {
      const result = await dispatch(addNewCarrier(newCarrierForm.name, newCarrierForm.phone));

      // Set the newly created carrier as selected
      if (result && result.carrierId && result.carrierName) {
        setSelectedCarrier(result);
      }

      // Reset form and close modal on success
      setNewCarrierForm({ name: "", phone: "" });
      handleCloseAddCarrierModal();
    } catch (error) {
      setAddCarrierError(error.message || 'Failed to add carrier');
    } finally {
      setAddCarrierLoading(false);
    }
  };

  const toggleCollapse = (groupId) =>
    setCollapsed((prev) => ({ ...prev, [groupId]: !prev[groupId] }));

  const handleFormChange = (field) => (e) =>
    setFormValues((prev) => ({ ...prev, [field]: e.target.value }));

  const addEntry = (freightForwarder, pro, pieces, weight, shipper) => {
    // Handle both object and string formats for backward compatibility
    const freightForwarderName = typeof freightForwarder === 'string'
      ? freightForwarder
      : (freightForwarder?.customerName || '');

    if (!freightForwarderName || !pro) return;
    const groupId = freightForwarderName.toUpperCase().replace(/\s+/g, "_");

    setProGroups((prev) => {
      const existing = prev.find((g) => g.id === groupId);
      // Generate serial number based on existing entries
      const sno = existing ? String(existing.entries.length + 1).padStart(2, "0") : "01";

      const newEntry = {
        id: Date.now(),
        sno,
        pro,
        pieces: Number(pieces),
        weight: Number(weight),
        shipper,
        customerId: typeof freightForwarder === 'object' ? freightForwarder?.customerId : null,
        stationId: typeof freightForwarder === 'object' ? freightForwarder?.stationId : null,
      };

      if (existing) {
        return prev.map((g) =>
          g.id === groupId ? { ...g, entries: [...g.entries, newEntry] } : g,
        );
      }
      return [
        ...prev,
        {
          id: groupId,
          label: `Freight Forwarder - ${freightForwarderName} | Elk Grove Village | IL`,
          entries: [newEntry],
        },
      ];
    });
  };

  const handleFormAdd = () => {
    // Validate form fields
    const errors = validateProDetails();

    if (errors.length > 0) {
      setProFormError(errors.join('\n'));
      return;
    }

    const { freightForwarder, pro, pieces, weight, shipper } = formValues;
    addEntry(freightForwarder, pro, pieces, weight, shipper);
    setFormValues({
      freightForwarder: null,
      pro: "",
      pieces: "",
      weight: "",
      shipper: "",
    });
    setCustomerSearchValue("");
    setShowRemainingFields(false);
    setProValidationError(null);
    setProValidated(false);
    setProFormError(null);
    dispatch(clearProVerification());
  };

  const handleDelete = (groupId, entryId) => {
    setProGroups((prev) =>
      prev
        .map((g) =>
          g.id === groupId
            ? { ...g, entries: g.entries.filter((e) => e.id !== entryId) }
            : g,
        )
        .filter((g) => g.entries.length > 0),
    );
  };

  const handleEditEntry = (entry) => {
    setEditingEntry(entry.id);
    setEditingValues({
      pro: entry.pro,
      pieces: entry.pieces,
      weight: entry.weight,
      shipper: entry.shipper
    });
  };

  const handleSaveEdit = (groupId, entryId) => {
    setProGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? {
              ...g,
              entries: g.entries.map((e) =>
                e.id === entryId
                  ? {
                      ...e,
                      pro: editingValues.pro,
                      pieces: Number(editingValues.pieces),
                      weight: Number(editingValues.weight),
                      shipper: editingValues.shipper
                    }
                  : e
              )
            }
          : g
      )
    );
    setEditingEntry(null);
    setEditingValues({});
  };

  const handleCancelEdit = () => {
    setEditingEntry(null);
    setEditingValues({});
  };

  const handleGroupAdd = (groupId) => {
    setProGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        const nextSno = String(g.entries.length + 1).padStart(2, "0");
        const entryId = Date.now();
        const newEntry = {
          id: entryId,
          sno: nextSno,
          pro: "",
          pieces: "",
          weight: "",
          shipper: "",
        };
        // Set the new entry as editing immediately
        setEditingEntry(entryId);
        setEditingValues({
          pro: "",
          pieces: "",
          weight: "",
          shipper: "",
        });
        return { ...g, entries: [...g.entries, newEntry] };
      }),
    );
  };

  const getColumns = (groupId) => [
    { field: "sno", headerName: "SNo", width: 60 },
    {
      field: "pro",
      headerName: "PRO #",
      flex: 1,
      minWidth: 140,
      renderCell: (params) => {
        if (editingEntry === params.row.id) {
          return (
            <TextField
              size="small"
              variant="outlined"
              value={editingValues.pro}
              onChange={(e) =>
                setEditingValues((prev) => ({
                  ...prev,
                  pro: e.target.value,
                }))
              }
              sx={{ width: "100%" }}
            />
          );
        }
        return (
          <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
            <Typography sx={{ fontWeight: 700, fontSize: "13px" }}>
              {params.value}
            </Typography>
          </Box>
        );
      },
    },
    {
      field: "pieces",
      headerName: "Pieces",
      flex: 1,
      minWidth: 80,
      renderCell: (params) => {
        if (editingEntry === params.row.id) {
          return (
            <TextField
              size="small"
              variant="outlined"
              type="number"
              value={editingValues.pieces}
              onChange={(e) =>
                setEditingValues((prev) => ({
                  ...prev,
                  pieces: e.target.value,
                }))
              }
              sx={{ width: "100%" }}
            />
          );
        }
        return params.value;
      },
    },
    {
      field: "weight",
      headerName: "Weight (lbs)",
      flex: 1,
      minWidth: 110,
      renderCell: (params) => {
        if (editingEntry === params.row.id) {
          return (
            <TextField
              size="small"
              variant="outlined"
              type="number"
              value={editingValues.weight}
              onChange={(e) =>
                setEditingValues((prev) => ({
                  ...prev,
                  weight: e.target.value,
                }))
              }
              sx={{ width: "100%" }}
            />
          );
        }
        return params.value;
      },
    },
    {
      field: "shipper",
      headerName: "Shipper",
      flex: 1,
      minWidth: 120,
      renderCell: (params) => {
        if (editingEntry === params.row.id) {
          return (
            <TextField
              size="small"
              variant="outlined"
              value={editingValues.shipper}
              onChange={(e) =>
                setEditingValues((prev) => ({
                  ...prev,
                  shipper: e.target.value,
                }))
              }
              sx={{ width: "100%" }}
            />
          );
        }
        return params.value;
      },
    },
 {
      field: "actions",
      headerName: "Actions",
      width: 120,
      sortable: false,
      renderCell: (params) => {
        // Helper function to stop the DataGrid from stealing focus on click
        const stopPropagation = (e) => {
          e.stopPropagation();
        };

        return (
          <Stack direction="row" spacing={0.5} alignItems="center">
            {editingEntry === params.row.id ? (
              <>
                <IconButton
                  size="small"
                  sx={{ color: "#4caf50" }}
                  onClick={(e) => {
                    e.stopPropagation(); // Stop click bubbling
                    handleSaveEdit(groupId, params.row.id);
                  }}
                  onMouseDown={stopPropagation} // Intercept focus
                  title="Save"
                >
                  <Iconify icon="mdi:check" width={18} />
                </IconButton>
                <IconButton
                  size="small"
                  sx={{ color: "#f44336" }}
                  onClick={(e) => {
                    e.stopPropagation(); // Stop click bubbling
                    handleCancelEdit();
                  }}
                  onMouseDown={stopPropagation} // Intercept focus
                  title="Cancel"
                >
                  <Iconify icon="mdi:close" width={18} />
                </IconButton>
              </>
            ) : (
              <>
                <IconButton
                  size="small"
                  sx={{ color: "#555" }}
                  onClick={(e) => {
                    e.stopPropagation(); // Stop click bubbling
                    handleEditEntry(params.row);
                  }}
                  onMouseDown={stopPropagation} // Intercept focus
                  title="Edit"
                >
                  <Iconify icon="mdi:pencil-outline" width={18} />
                </IconButton>
                <IconButton
                  size="small"
                  sx={{ color: "#555" }}
                  onClick={(e) => {
                    e.stopPropagation(); // Stop click bubbling
                    handleDelete(groupId, params.row.id);
                  }}
                  onMouseDown={stopPropagation} // Intercept focus
                  title="Delete"
                >
                  <Iconify icon="mingcute:delete-2-fill" width={18} />
                </IconButton>
              </>
            )}
          </Stack>
        );
      },
    },
  ];

  return (
    <ShipmentFormLayout
      title="Driver Check-In"
      handleClose={() => navigate(-1)}
      onSubmit={handleSubmitCheckIn}
      onReset={handleResetForm}
      showCancel={false}
    >
      <Stack spacing={4}>
        <fieldset
          style={{
            borderColor: "#b0b0b0",
            borderRadius: "8px",
            padding: "16px",
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
            <Autocomplete
              options={carrierOptions}
              getOptionLabel={(option) =>
                option.carrierName || option.name || option.toString()
              }
              value={selectedCarrier}
              onChange={(event, newValue) => {
                isSelectingRef.current = true;
                setSelectedCarrier(newValue);
                clearFieldError('selectedCarrier');
                // Clear search results when field is cleared
                if (!newValue) {
                  setCarrierSearchValue("");
                  dispatch(searchCarriers(""));
                }
              }}
              onInputChange={(event, newInputValue, reason) => {
                // Only update search value for manual input, not selection
                if (reason !== "reset") {
                  setCarrierSearchValue(newInputValue);
                  clearFieldError('selectedCarrier');
                  // If field is cleared, clear the options immediately
                  if (!newInputValue || newInputValue.trim() === "") {
                    dispatch(searchCarriers(""));
                  }
                }
              }}
              loading={carrierLoading}
              loadingText="Searching carriers..."
              noOptionsText={carrierSearchValue ? "No carriers found" : "Type to search for carriers"}
              renderInput={(params) => (
                <TextField
                  {...params}
                  variant="standard"
                  label="Delivering Carrier"
                  required
                  error={formErrors.selectedCarrier}
                  helperText={formErrors.selectedCarrier ? 'Delivering Carrier is required' : ' '}
                  InputLabelProps={{ shrink: true }}
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {carrierLoading ? (
                          <CircularProgress color="inherit" size={20} />
                        ) : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              sx={{ width: { xs: "100%", md: "23%" } }}
            />
            <StyledTextField
              variant="standard"
              size="small"
              required
              label="Door"
              value={doorValue}
              onChange={(e) => {
                setDoorValue(e.target.value);
                clearFieldError('doorValue');
              }}
              error={formErrors.doorValue}
              helperText={formErrors.doorValue ? 'Door is required' : ' '}
              sx={{ width: { xs: "100%", md: "23%" } }}
            />
            <Button
              variant="contained"
              size="small"
              sx={{ ...actionBtnSx, minWidth: 110, flexShrink: 0 }}
              onClick={handleOpenAddCarrierModal}
            >
              Add Carrier
            </Button>
          </Stack>
        </fieldset>

        <fieldset
          style={{
            borderColor: "#b0b0b0",
            borderRadius: "8px",
            padding: "16px",
          }}
        >
          <legend>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, px: 1 }}>
              Driver Details
            </Typography>
          </legend>
          <Stack spacing={4}>
            {/* Row 1: Driver Name & Signature */}
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
                  required
                  label="Driver Name"
                  value={driverNameValue}
                  onChange={(e) => {
                    setDriverNameValue(e.target.value);
                    clearFieldError('driverNameValue');
                  }}
                  error={formErrors.driverNameValue}
                  helperText={formErrors.driverNameValue ? 'Driver Name is required' : ' '}
                  sx={{ flex: 1 }}
                />
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleGetSignature}
                  sx={{ ...actionBtnSx, minWidth: 110, flexShrink: 0 }}
                >
                  Get Signature
                </Button>
              </Stack>
              <Box
                sx={{
                  width: { xs: "100%", lg: "26%" },
                  height: 50,
                  border: formErrors.signatureData
                    ? "2px solid #d32f2f"
                    : isSignatureVisible
                    ? "1px solid #ccc"
                    : "1px dashed #707070",
                  borderRadius: 1,
                  bgcolor: "#e6e6e6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {isSignatureVisible && signatureData && (
                  <img
                    src={`data:image/png;base64,${signatureData}`}
                    alt="Signature"
                    style={{ maxWidth: "100%", maxHeight: "100%" }}
                  />
                )}
              </Box>
              {formErrors.signatureData && (
                <Typography variant="body2" sx={{ color: "#d32f2f", fontSize: "0.75rem" }}>
                  Signature is required
                </Typography>
              )}
              {isSignatureVisible && (
                <Button
                  variant="contained"
                  size="small"
                  sx={{ ...actionBtnSx, minWidth: 110, flexShrink: 0 }}
                  onClick={handleClearSignature}
                >
                  Clear
                </Button>
              )}
            </Stack>

            {/* Row 2: First ID Reviewed */}
            <Stack
              direction={{ xs: "column", lg: "row" }}
              spacing={3}
              alignItems="center"
            >
              <Typography
                sx={{ width: { xs: "100%", lg: "46%" }, fontSize: "0.8rem" }}
              >
                TYPE OF FIRST ID REVIEWED. (GOVERNMENT ISSUED ID OR COMPANY
                ISSUED)
              </Typography>
              <StyledTextField
                variant="standard"
                size="small"
                placeholder="ID Type *"
                value={firstIdTypeValue}
                onChange={(e) => {
                  setFirstIdTypeValue(e.target.value);
                  clearFieldError('firstIdTypeValue');
                }}
                error={formErrors.firstIdTypeValue}
                helperText={formErrors.firstIdTypeValue ? 'ID Type is required' : ' '}
                sx={{ width: { xs: "100%", lg: "26%" } }}
              />
              <Stack
                direction="row"
                alignItems="center"
                sx={{ width: { xs: "100%", lg: "28%" } }}
              >
                <StyledCheckbox
                  size="small"
                  sx={{ p: 0, mr: 1 }}
                  checked={firstIdPhotoChecked}
                  onChange={(e) => setFirstIdPhotoChecked(e.target.checked)}
                />
                <Typography sx={{ fontSize: 12, lineHeight: 1.2 }}>
                  MATCHING PHOTO ON ID
                </Typography>
              </Stack>
            </Stack>

            {/* Row 3: Second ID Reviewed */}
            <Stack
              direction={{ xs: "column", lg: "row" }}
              spacing={3}
              alignItems="center"
            >
              <Typography
                sx={{ width: { xs: "100%", lg: "46%" }, fontSize: "0.8rem" }}
              >
                TYPE OF SECOND ID REVIEWED (IF THE FIRST ID WAS NOT A PHOTO ID
                ISSUED BY A GOVERNMENT AUTHORITY OR IS NOT A COMPANY 10)
              </Typography>
              <StyledTextField
                variant="standard"
                size="small"
                defaultValue="NA"
                placeholder="ID Type"
                sx={{ width: { xs: "100%", lg: "26%" } }}
                disabled
              />
              <Stack
                direction="row"
                alignItems="center"
                sx={{ width: { xs: "100%", lg: "28%" } }}
              >
                <StyledCheckbox size="small" sx={{ p: 0, mr: 1 }} disabled />
                <Typography sx={{ fontSize: 12, lineHeight: 1.2 }}>
                  MATCHING PHOTO ON ID
                </Typography>
              </Stack>
            </Stack>

            {/* Row 4: Shipper's Company Name */}
            <Stack
              direction={{ xs: "column", lg: "row" }}
              spacing={3}
              alignItems="center"
            >
              <Typography
                sx={{ width: { xs: "100%", lg: "46%" }, fontSize: "0.8rem" }}
              >
                SHIPPER'S COMPANY NAME (WHERE APPLICABLE)
              </Typography>
              <StyledTextField
                variant="standard"
                size="small"
                defaultValue="Listed Above"
                sx={{ width: { xs: "100%", lg: "26%" } }}
                disabled
              />
              <Box sx={{ width: { xs: "100%", lg: "28%" } }} />
            </Stack>

            {/* Row 5: Verifier */}
            <Stack
              direction={{ xs: "column", lg: "row" }}
              spacing={3}
              alignItems="center"
            >
              <Typography
                sx={{ width: { xs: "100%", lg: "46%" }, fontSize: "0.8rem" }}
              >
                NAME OF EMPLOYEE OR AUTHORIZED REPRESENTATIVE WHO VERIFIED ID
                INFORMATION
              </Typography>
              <StyledTextField
                variant="standard"
                size="small"
                required
                placeholder="Verifier *"
                value={employeeNameValue}
                onChange={(e) => {
                  setEmployeeNameValue(e.target.value);
                  clearFieldError('employeeNameValue');
                }}
                error={formErrors.employeeNameValue}
                helperText={formErrors.employeeNameValue ? 'Employee Name is required' : ' '}
                sx={{ width: { xs: "100%", lg: "26%" } }}
              />
              <Box sx={{ width: { xs: "100%", lg: "28%" } }} />
            </Stack>
          </Stack>
        </fieldset>

        <fieldset
          style={{
            borderColor: "#b0b0b0",
            borderRadius: "8px",
            padding: "16px",
          }}
        >
          <legend>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, px: 1 }}>
              Pro Details
            </Typography>
          </legend>

          {/* Step 1: Pro Number and Validate Button */}
          <Stack
            direction={{ xs: "column", lg: "row" }}
            spacing={3}
            alignItems="flex-end"
            sx={{ mb: showRemainingFields ? 3 : 0 }}
          >
            <StyledTextField
              variant="standard"
              size="small"
              required
              label="Pro"
              value={formValues.pro}
              onChange={handleFormChange("pro")}
              sx={{ width: { xs: "100%", lg: "30%" } }}
              disabled={proValidated}
            />
            <Button
              variant="contained"
              size="small"
              sx={{ ...actionBtnSx, minWidth: 110, flexShrink: 0 }}
              onClick={proValidated ? handleResetProValidation : handleValidateProNumber}
              disabled={proValidating}
            >
              {proValidating ? (
                <CircularProgress size={20} sx={{ color: 'white' }} />
              ) : proValidated ? (
                'Reset'
              ) : (
                'Validate'
              )}
            </Button>
          </Stack>

          {/* Error message */}
          {proValidationError && (
            <Typography variant="body2" sx={{ color: "#d32f2f", mb: 2 }}>
              {proValidationError}
            </Typography>
          )}

          {/* Form validation errors */}
          {proFormError && (
            <Typography variant="body2" sx={{ color: "#d32f2f", mb: 2, whiteSpace: 'pre-line' }}>
              {proFormError}
            </Typography>
          )}

          {/* Step 2: Remaining fields (shown after validation) */}
          {showRemainingFields && (
            <>
              <Stack
                direction={{ xs: "column", lg: "row" }}
                spacing={3}
                alignItems="flex-end"
                sx={{ mb: 3 }}
              >
                <Autocomplete
                  fullWidth
                  disabled={proValidated}
                  options={customerOptions}
                  getOptionLabel={(option) =>
                    option.customerName && option.stationName
                      ? `${option.customerName} | ${option.stationName}`
                      : option.toString()
                  }
                  value={formValues.freightForwarder}
                  onChange={(event, newValue) => {
                    isSelectingCustomerRef.current = true;
                    setFormValues((prev) => ({
                      ...prev,
                      freightForwarder: newValue,
                    }));
                  }}
                  onInputChange={(event, newInputValue, reason) => {
                    if (reason !== "reset") {
                      setCustomerSearchValue(newInputValue);
                      if (!newInputValue || newInputValue.trim() === "") {
                        dispatch(searchCustomers(""));
                      }
                    }
                  }}
                  loading={customerLoading}
                  loadingText="Searching customers..."
                  noOptionsText={customerSearchValue ? "No customers found" : "Type to search for customers"}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      variant="standard"
                      label="Freight Forwarder"
                      required
                      InputLabelProps={{ shrink: true }}
                      sx={{
                        '& .MuiInputBase-input:disabled': {
                          color: '#000',
                          WebkitTextFillColor: '#000'
                        }
                      }}
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {customerLoading ? <CircularProgress color="inherit" size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                  sx={{ width: { xs: "100%", lg: "30%" } }}
                />
                <StyledTextField
                  variant="standard"
                  size="small"
                  required
                  label="Pieces"
                  value={formValues.pieces}
                  onChange={handleFormChange("pieces")}
                  sx={{ width: { xs: "100%", lg: "22%" } }}
                />
                <StyledTextField
                  variant="standard"
                  size="small"
                  required
                  label="Weight (lbs)"
                  value={formValues.weight}
                  onChange={handleFormChange("weight")}
                  sx={{ width: { xs: "100%", lg: "22%" } }}
                />
              </Stack>
              <Stack
                direction={{ xs: "column", lg: "row" }}
                spacing={3}
                alignItems="flex-end"
              >
                <StyledTextField
                  variant="standard"
                  size="small"
                  required
                  label="Shipper"
                  value={formValues.shipper}
                  onChange={handleFormChange("shipper")}
                  sx={{ width: { xs: "100%", lg: "22%" } }}
                />
                <Button
                  variant="contained"
                  size="small"
                  sx={actionBtnSx}
                  onClick={handleFormAdd}
                >
                  Add
                </Button>
              </Stack>
            </>
          )}
        </fieldset>

        {/* Pro Groups Error */}
        {formErrors.proGroups && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ color: "#d32f2f" }}>
              At least one Pro Detail is required
            </Typography>
          </Box>
        )}

        {/* Freight Forwarder grouped tables */}
        {proGroups.map((group) => (
          <Box
            key={group.id}
            sx={{
              border: "1px solid #e0e0e0",
              borderRadius: 1,
              overflow: "hidden",
            }}
          >
            {/* Group header */}
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ bgcolor: "#d9d9d9", px: 2, py: 0.75 }}
            >
              <Typography sx={{ fontWeight: 600, fontSize: "13px" }}>
                {group.label}
              </Typography>
              <Stack direction="row" alignItems="center">
                <IconButton size="small" sx={{ color: "#A22" }}>
                  <Iconify icon="mdi:email-outline" width={20} />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => toggleCollapse(group.id)}
                >
                  <Iconify
                    icon={
                      collapsed[group.id]
                        ? "mdi:chevron-up"
                        : "mdi:chevron-down"
                    }
                    width={20}
                  />
                </IconButton>
              </Stack>
            </Stack>

            {/* Collapsible DataGrid */}
            <Collapse in={!collapsed[group.id]}>
              <Box sx={{ borderTop: "1px solid #f0f0f0" }}>
                <DataGrid
                  rows={group.entries}
                  columns={getColumns(group.id)}
                  getRowId={(row) => row.id}
                  autoHeight
                  disableRowSelectionOnClick
                  hideFooter
                  sx={{
                    border: "none",
                    "& .MuiDataGrid-columnHeaders": {
                      backgroundColor: "#f4f6f8",
                    },
                  }}
                />
              </Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "flex-end",
                  px: 2,
                  py: 1,
                  borderTop: "1px solid #f0f0f0",
                }}
              >
                <Button
                  variant="contained"
                  size="small"
                  sx={actionBtnSx}
                  onClick={() => handleGroupAdd(group.id)}
                >
                  Add
                </Button>
              </Box>
            </Collapse>
          </Box>
        ))}
      </Stack>

      {/* Add New Delivering Carrier Modal */}
      <Dialog
        open={openAddCarrierModal}
        onClose={handleCloseAddCarrierModal}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600, fontSize: "16px", pb: 1 }}>
          Add New Delivering Carrier
          <IconButton
            onClick={handleCloseAddCarrierModal}
            sx={{ position: "absolute", right: 8, top: 8, color: "#333" }}
          >
            <Iconify icon="mdi:close" width={20} />
          </IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3 }}>
          <Typography variant="body2" sx={{ color: "#666", mb: 3 }}>
            Begin by adding the carrier name and phone number, followed by
            including other details in maintenance.
          </Typography>

          {addCarrierError && (
            <Typography variant="body2" sx={{ color: "#d32f2f", mb: 2 }}>
              {addCarrierError}
            </Typography>
          )}

          <Box sx={{ display: "flex", gap: 3 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                Delivering Carrier <span style={{ color: "#d32f2f" }}>*</span>
              </Typography>
              <TextField
                fullWidth
                variant="standard"
                placeholder=""
                value={newCarrierForm.name}
                onChange={(e) =>
                  setNewCarrierForm((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                sx={{
                  "& .MuiInputBase-input::placeholder": {
                    color: "#999",
                    opacity: 0.7,
                  },
                }}
              />
            </Box>

            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                Phone Number <span style={{ color: "#d32f2f" }}>*</span>
              </Typography>
              <TextField
                fullWidth
                variant="standard"
                placeholder="(XXX) XXX-XXXX"
                value={newCarrierForm.phone}
                onChange={(e) => {
                  const formatted = formatPhoneNumber(e.target.value);
                  setNewCarrierForm((prev) => ({
                    ...prev,
                    phone: formatted,
                  }));
                }}
              />
            </Box>
          </Box>

          <Stack
            direction="row"
            spacing={2}
            sx={{ mt: 4, justifyContent: "flex-start" }}
          >
            <Button
              variant="outlined"
              sx={{ color: "#333", borderColor: "#333", px: 3 }}
              onClick={handleCloseAddCarrierModal}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              sx={{ bgcolor: "#a22", "&:hover": { bgcolor: "#811" }, px: 3 }}
              onClick={handleAddCarrierSubmit}
              disabled={addCarrierLoading}
            >
              {addCarrierLoading ? <CircularProgress size={20} sx={{ color: 'white' }} /> : 'Submit'}
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>

      {/* API Error Dialog */}
      <Dialog
        open={openApiErrorDialog}
        onClose={() => setOpenApiErrorDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2
          }
        }}
      >
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
            <Box
              sx={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                bgcolor: '#f44336',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Iconify icon="mdi:alert" width={32} color="white" />
            </Box>
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
            PRO Validation Error
          </Typography>
          <Typography variant="body2" sx={{ color: '#666', mb: 3, whiteSpace: 'pre-wrap' }}>
            {apiErrorMessage}
          </Typography>
          <Button
            variant="contained"
            onClick={() => setOpenApiErrorDialog(false)}
            sx={{ bgcolor: '#a22', '&:hover': { bgcolor: '#811' }, px: 4 }}
          >
            OK
          </Button>
        </Box>
      </Dialog>

      {/* Rejection Confirmation Dialog */}
      <Dialog
        open={openRejectionDialog}
        onClose={handleRejectionNo}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2
          }
        }}
      >
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
            <Box
              sx={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                bgcolor: '#ff9800',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Iconify icon="mdi:alert-outline" width={32} color="white" />
            </Box>
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
            PRO Number Already Rejected
          </Typography>
          <Typography variant="body2" sx={{ color: '#666', mb: 3 }}>
            This pro number is already rejected for this Carrier. Do you want to proceed?
          </Typography>
          <Stack direction="row" spacing={2} sx={{ justifyContent: 'center' }}>
            <Button
              variant="outlined"
              sx={{ color: "#333", borderColor: "#333", px: 3 }}
              onClick={handleRejectionNo}
            >
              No
            </Button>
            <Button
              variant="contained"
              sx={{ bgcolor: '#a22', '&:hover': { bgcolor: '#811' }, px: 3 }}
              onClick={handleRejectionYes}
            >
              Yes
            </Button>
          </Stack>
        </Box>
      </Dialog>

      {/* PRO Verification Dialog */}
      <Dialog
        open={openProDialog}
        onClose={handleCloseProDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2
          }
        }}
      >
        <Box sx={{ p: 3, textAlign: 'center' }}>
          {proDialogSuccess ? (
            <>
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
                <Box
                  sx={{
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    bgcolor: '#4caf50',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Iconify icon="mdi:check" width={32} color="white" />
                </Box>
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                Pro Number Available
              </Typography>
              <Typography variant="body2" sx={{ color: '#666', mb: 3 }}>
                The PRO number has been found in the database. Details have been auto-populated.
              </Typography>
            </>
          ) : (
            <>
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
                <Box
                  sx={{
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    bgcolor: '#f44336',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Iconify icon="mdi:alert" width={32} color="white" />
                </Box>
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                Pro Number Not Available
              </Typography>
              <Typography variant="body2" sx={{ color: '#666', mb: 3 }}>
                The PRO number was not found in the database. Please proceed manually by entering the details.
              </Typography>
            </>
          )}
          <Button
            variant="contained"
            onClick={handleCloseProDialog}
            sx={{ bgcolor: '#a22', '&:hover': { bgcolor: '#811' }, px: 4 }}
          >
            OK
          </Button>
        </Box>
      </Dialog>

      {/* Verification ID Dialog */}
      <Dialog
        open={openVerificationDialog}
        onClose={() => {
          setOpenVerificationDialog(false);
          handleResetForm();
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2
          }
        }}
      >
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
            <Box
              sx={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                bgcolor: '#4caf50',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Iconify icon="mdi:check" width={32} color="white" />
            </Box>
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
            Driver Check-In Submitted Successfully
          </Typography>
          <Typography variant="body2" sx={{ color: '#666', mb: 3 }}>
            Your verification ID(s):
          </Typography>
          <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 1, mb: 3 }}>
            {verificationIds.map((id, index) => (
              <Typography
                key={index}
                variant="body1"
                sx={{
                  fontWeight: 600,
                  color: '#333',
                  fontSize: '16px',
                  py: 0.5
                }}
              >
                {id}
              </Typography>
            ))}
          </Box>
          <Button
            variant="contained"
            onClick={() => {
              setOpenVerificationDialog(false);
              handleResetForm();
            }}
            sx={{ bgcolor: '#a22', '&:hover': { bgcolor: '#811' }, px: 4 }}
          >
            OK
          </Button>
        </Box>
      </Dialog>
    </ShipmentFormLayout>
  );
}
