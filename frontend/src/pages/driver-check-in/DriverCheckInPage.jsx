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
import { searchCarriers, addNewCarrier } from "../../redux/slices/enroute";
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

const INITIAL_GROUPS = [
  {
    id: "KUEHNE_NAGEL",
    label: "Freight Forwarder - KUEHNE & NAGEL | Elk Grove Village | IL",
    entries: [
      {
        id: 1,
        sno: "01",
        pro: "PRO7898710001",
        pieces: 20,
        weight: 600,
        shipper: "Shipper052",
      },
      {
        id: 2,
        sno: "02",
        pro: "PRO7898710001",
        pieces: 20,
        weight: 600,
        shipper: "Shipper052",
      },
      {
        id: 3,
        sno: "03",
        pro: "PRO7898710001",
        pieces: 20,
        weight: 600,
        shipper: "Shipper052",
      },
      {
        id: 4,
        sno: "04",
        pro: "PRO7898710001",
        pieces: 20,
        weight: 600,
        shipper: "Shipper052",
      },
    ],
  },
  {
    id: "SEACOAST",
    label: "Freight Forwarder - SEACOAST | Elk Grove Village | IL",
    entries: [
      {
        id: 1,
        sno: "01",
        pro: "PRO7898710001",
        pieces: 20,
        weight: 600,
        shipper: "Shipper052",
      },
    ],
  },
];

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
  const { carrierOptions, carrierLoading } = useSelector(
    (state) => state.enroutedata,
  );

  const [proGroups, setProGroups] = useState(INITIAL_GROUPS);
  const [collapsed, setCollapsed] = useState({});
  const [carrierSearchValue, setCarrierSearchValue] = useState("");
  const [selectedCarrier, setSelectedCarrier] = useState(null);
  const isSelectingRef = useRef(false);
  const [openAddCarrierModal, setOpenAddCarrierModal] = useState(false);
  const [newCarrierForm, setNewCarrierForm] = useState({
    name: "",
    phone: "",
  });
  const [addCarrierLoading, setAddCarrierLoading] = useState(false);
  const [addCarrierError, setAddCarrierError] = useState(null);
  const [signature, setSignature] = useState(true);
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

  const handleOpenAddCarrierModal = () => setOpenAddCarrierModal(true);
  // Add to your state declarations
  const [isSignatureVisible, setIsSignatureVisible] = useState(false);
  const [signatureData, setSignatureData] = useState(null); // Will store your fetched Base64
  const signatureBase64 =
    "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";

  const handleCloseAddCarrierModal = () => {
    setOpenAddCarrierModal(false);
    setAddCarrierError(null);
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
  };

  const handleClearSignature = () => {
    setSignatureData(null);
    setIsSignatureVisible(false);
  };

  const handleResetForm = () => {
    setSelectedCarrier(null);
    setCarrierSearchValue("");
    setFormValues({
      freightForwarder: "",
      pro: "",
      pieces: "",
      weight: "",
      shipper: "",
    });
    setSignature(true);
    setProGroups(INITIAL_GROUPS);
    setShowRemainingFields(false);
    setProValidationError(null);
    setProValidated(false);
  };

  const handleValidateProNumber = async () => {
    if (!formValues.pro.trim()) {
      setProValidationError('Please enter a PRO number');
      return;
    }

    setProValidating(true);
    setProValidationError(null);

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));

      const proData = DUMMY_PROS[formValues.pro.toUpperCase()];

      if (proData) {
        // PRO found - populate fields
        setFormValues(prev => ({
          ...prev,
          freightForwarder: proData.freightForwarder,
          pieces: proData.pieces.toString(),
          weight: proData.weight.toString(),
          shipper: proData.shipper
        }));
        setProValidated(true);
        setShowRemainingFields(true);
      } else {
        // PRO not found - show fields for manual entry
        setProValidated(false);
        setShowRemainingFields(true);
      }
    } catch (error) {
      setProValidationError('Error validating PRO number');
    } finally {
      setProValidating(false);
    }
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
    if (!freightForwarder || !pro) return;
    const groupId = freightForwarder.toUpperCase().replace(/\s+/g, "_");
    const newEntry = {
      id: Date.now(),
      sno: "01",
      pro,
      pieces: Number(pieces),
      weight: Number(weight),
      shipper,
    };
    setProGroups((prev) => {
      const existing = prev.find((g) => g.id === groupId);
      if (existing) {
        return prev.map((g) =>
          g.id === groupId ? { ...g, entries: [...g.entries, newEntry] } : g,
        );
      }
      return [
        ...prev,
        {
          id: groupId,
          label: `Freight Forwarder - ${freightForwarder} | Elk Grove Village | IL`,
          entries: [newEntry],
        },
      ];
    });
  };

  const handleFormAdd = () => {
    const { freightForwarder, pro, pieces, weight, shipper } = formValues;
    addEntry(freightForwarder, pro, pieces, weight, shipper);
    setFormValues({
      freightForwarder: "",
      pro: "",
      pieces: "",
      weight: "",
      shipper: "",
    });
    setShowRemainingFields(false);
    setProValidationError(null);
    setProValidated(false);
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

  const handleGroupAdd = (groupId) => {
    setProGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        const nextSno = String(g.entries.length + 1).padStart(2, "0");
        const newEntry = {
          id: Date.now(),
          sno: nextSno,
          pro: "",
          pieces: "",
          weight: "",
          shipper: "",
        };
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
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Typography sx={{ fontWeight: 700, fontSize: "13px" }}>
            {params.value}
          </Typography>
        </Box>
      ),
    },
    { field: "pieces", headerName: "Pieces", flex: 1, minWidth: 80 },
    { field: "weight", headerName: "Weight (lbs)", flex: 1, minWidth: 110 },
    { field: "shipper", headerName: "Shipper", flex: 1, minWidth: 120 },
    {
      field: "actions",
      headerName: "Actions",
      width: 100,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5} alignItems="center">
          <IconButton size="small" sx={{ color: "#555" }}>
            <Iconify icon="mdi:pencil-outline" width={18} />
          </IconButton>
          <IconButton
            size="small"
            sx={{ color: "#555" }}
            onClick={() => handleDelete(groupId, params.row.id)}
          >
            <Iconify icon="mingcute:delete-2-fill" width={18} />
          </IconButton>
        </Stack>
      ),
    },
  ];

  return (
    <ShipmentFormLayout
      title="Driver Check-In"
      handleClose={() => navigate(-1)}
      onSubmit={() => {}}
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
                  // If field is cleared, clear the options immediately
                  if (!newInputValue || newInputValue.trim() === "") {
                    dispatch(searchCarriers(""));
                  }
                }
              }}
              loading={carrierLoading}
              loadingText="Searching carriers..."
              noOptionsText="No carriers found"
              renderInput={(params) => (
                <TextField
                  {...params}
                  variant="standard"
                  label="Delivering Carrier"
                  required
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
                  defaultValue=""
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
                  border: isSignatureVisible
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
                placeholder="ID Type"
                sx={{ width: { xs: "100%", lg: "26%" } }}
              />
              <Stack
                direction="row"
                alignItems="center"
                sx={{ width: { xs: "100%", lg: "28%" } }}
              >
                <StyledCheckbox size="small" sx={{ p: 0, mr: 1 }} />
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
                placeholder="ID Type"
                sx={{ width: { xs: "100%", lg: "26%" } }}
              />
              <Stack
                direction="row"
                alignItems="center"
                sx={{ width: { xs: "100%", lg: "28%" } }}
              >
                <StyledCheckbox size="small" sx={{ p: 0, mr: 1 }} />
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
              onClick={handleValidateProNumber}
              disabled={proValidating || proValidated}
            >
              {proValidating ? <CircularProgress size={20} sx={{ color: 'white' }} /> : 'Validate'}
            </Button>
          </Stack>

          {/* Error message */}
          {proValidationError && (
            <Typography variant="body2" sx={{ color: "#d32f2f", mb: 2 }}>
              {proValidationError}
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
                <StyledTextField
                  variant="standard"
                  size="small"
                  required
                  label="Freight Forwarder"
                  value={formValues.freightForwarder}
                  onChange={handleFormChange("freightForwarder")}
                  sx={{ width: { xs: "100%", lg: "22%" } }}
                  disabled={proValidated}
                />
                <StyledTextField
                  variant="standard"
                  size="small"
                  required
                  label="Pieces"
                  value={formValues.pieces}
                  onChange={handleFormChange("pieces")}
                  sx={{ width: { xs: "100%", lg: "22%" } }}
                  disabled={proValidated}
                />
                <StyledTextField
                  variant="standard"
                  size="small"
                  required
                  label="Weight (lbs)"
                  value={formValues.weight}
                  onChange={handleFormChange("weight")}
                  sx={{ width: { xs: "100%", lg: "22%" } }}
                  disabled={proValidated}
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
                  disabled={proValidated}
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
    </ShipmentFormLayout>
  );
}
