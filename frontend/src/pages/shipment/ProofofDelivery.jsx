import React, { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useForm, Controller } from 'react-hook-form';
import { 
    Box, 
    Stack, 
    Typography, 
    Button, 
    Divider, 
    MenuItem,
    IconButton
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

// Assumed imports based on your environment
import StyledTextField from '../../sections/shared/StyledTextField';
import Iconify from '../../components/iconify';

// --- Reusable File Item Component (Used in Upload Box and Table) ---
const FileItem = ({ filename, onRemove, onView, hideRemove }) => (
    <Box sx={{ 
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
        bgcolor: '#f5f5f5', border: '1px solid #e0e0e0', borderRadius: 1, p: '4px 8px', mb: 1, width: '100%' 
    }}>
        <Stack direction="row" alignItems="center" spacing={1}>
            <IconButton size="small" onClick={onView} sx={{ bgcolor: '#dbdbdb', borderRadius: 0.5, p: '4px', color: '#000' }}>
                <Iconify icon="mdi:eye" width={16} color="#000" />
            </IconButton>
            <Typography sx={{ fontSize: '12px' }}>{filename}</Typography>
        </Stack>
        {!hideRemove && (
            <IconButton size="small" onClick={onRemove} sx={{ p: '2px', color: '#000' }}>
                <Iconify icon="carbon:close-filled" width={16} />
            </IconButton>
        )}
    </Box>
);

ProofOfDeliveryForm.propTypes = {
    handleClose: PropTypes.func.isRequired,
};

FileItem.propTypes = {
    filename: PropTypes.string.isRequired,
    onRemove: PropTypes.func,
    onView: PropTypes.func,
    hideRemove: PropTypes.bool
};

FileItem.defaultProps = {
    onRemove: undefined,
    onView: undefined,
    hideRemove: false
};

export default function ProofOfDeliveryForm({ handleClose }) {
    const fileInputRef = useRef(null);
    const { control, handleSubmit, watch } = useForm({
        defaultValues: {
            name: 'William',
            date: dayjs('2026-02-26'),
            time: '',
            fileCategory: ''
        }
    });

    const selectedCategory = watch('fileCategory');

    // Local state for files selected from the user's device before upload
    const [stagedFiles, setStagedFiles] = useState([]);
    const [isDragging, setIsDragging] = useState(false);

    // Mock data for the historical table at the bottom (Stage 4)
    const mockTableData = [
        { 
            id: 1, category: 'Bill of Lading', date: '09/09/2026 23:09:60', 
            user: 'William', role: 'Customer', 
            files: ['6876878filename.png', '6876878filename.png', '6876878filename.png', '6876878filename.png'] 
        },
        { 
            id: 2, category: 'Misc', date: '09/09/2026 23:09:60', 
            user: 'Chris', role: 'Warehouse Staff', 
            files: ['6876878filename.png', '6876878filename.png'] 
        }
    ];

    const onSubmit = (data) => {
        console.log('Proof of Delivery Data:', data, 'Staged Files:', stagedFiles);
    };

    const handleBrowseFiles = () => {
        fileInputRef.current?.click();
    };

    const addFilesToStage = (files) => {
        const selectedFiles = Array.from(files || []);

        if (selectedFiles.length > 0) {
            setStagedFiles((prev) => [...prev, ...selectedFiles]);
        }
    };

    const handleFileSelection = (event) => {
        addFilesToStage(event.target.files);

        event.target.value = '';
    };

    const handleDragOver = (event) => {
        event.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (event) => {
        event.preventDefault();
        setIsDragging(false);
    };

    const handleFileDrop = (event) => {
        event.preventDefault();
        setIsDragging(false);
        addFilesToStage(event.dataTransfer.files);
    };

    const handleRemoveStagedFile = (index) => {
        setStagedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleViewStagedFile = (file) => {
        if (!file) {
            return;
        }

        const previewUrl = URL.createObjectURL(file);
        window.open(previewUrl, '_blank', 'noopener,noreferrer');

        setTimeout(() => {
            URL.revokeObjectURL(previewUrl);
        }, 1000);
    };

    return (
        <Box sx={{ p: 3, bgcolor: '#fff', height: '100%' }}>
            <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.jif"
                style={{ display: 'none' }}
                onChange={handleFileSelection}
            />

            {/* Form Header */}
            <Typography sx={{ fontSize: '16px', fontWeight: 600, mb: 1 }}>Proof of Delivery Details</Typography>
            <Divider sx={{ mb: 3, borderColor: '#e0e0e0' }} />

            <Stack spacing={4}>
                {/* Top Input Row */}
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={4}>
                    <Controller name="name" control={control} rules={{ required: true }} render={({ field }) => (
                        <StyledTextField {...field} variant="standard" fullWidth label="Name *" sx={{ width: '30%' }} />
                    )} />
                    
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <Controller name="date" control={control} rules={{ required: true }} render={({ field: { onChange, value } }) => (
                            <DatePicker 
                                label="Date *" 
                                format="MM/DD/YYYY" 
                                value={value} 
                                onChange={onChange} 
                                slotProps={{ textField: { variant: "standard", fullWidth: true, InputLabelProps: { shrink: true }, sx: { width: '30%' } } }} 
                            />
                        )} />
                    </LocalizationProvider>

                    <Controller name="time" control={control} rules={{ required: true }} render={({ field }) => (
                        <StyledTextField {...field} variant="standard" fullWidth label="Time *" sx={{ width: '30%' }} />
                    )} />
                </Stack>

                {/* Dropdown & Conditional Upload Section */}
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={4} alignItems="flex-start">
                    {/* File Category Dropdown */}
                    <Box sx={{ width: '30%' }}>
                        <Controller name="fileCategory" control={control} rules={{ required: true }} render={({ field }) => (
                            <StyledTextField {...field} select variant="standard" fullWidth label="File Category *">
                                <MenuItem value="Bill of Lading">Bill of Lading</MenuItem>
                                <MenuItem value="POD">POD</MenuItem>
                                <MenuItem value="Customer Image">Customer Image</MenuItem>
                                <MenuItem value="Misc">Misc</MenuItem>
                            </StyledTextField>
                        )} />
                    </Box>

                    {/* Conditional Upload Area appears once any file category is selected */}
                    {Boolean(selectedCategory) && (
                        <Box sx={{ width: '60%', position: 'relative' }}>
                            {/* Legend text floating on the border */}
                            <Typography sx={{ position: 'absolute', top: '-10px', left: '16px', bgcolor: '#fff', px: 1, fontSize: '13px', fontWeight: 600, color: '#000', zIndex: 1 }}>
                                File Upload
                            </Typography>
                            
                            <Stack direction="row" sx={{ border: '1px dashed #a0a0a0', borderRadius: 2, p: 2, pt: 3 }}>
                                {/* Left Side: Drag & Drop */}
                                <Stack
                                    sx={{
                                        width: '50%',
                                        borderRight: '1px solid #e0e0e0',
                                        pr: 2,
                                        bgcolor: isDragging ? '#fff3f3' : 'transparent',
                                        borderRadius: 1,
                                        transition: 'background-color 0.2s ease'
                                    }}
                                    alignItems="center"
                                    justifyContent="center"
                                    spacing={1}
                                    onDragOver={handleDragOver}
                                    onDragEnter={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleFileDrop}
                                >
                                    <Iconify icon="mdi:tray-arrow-up" width={32} color="#A22" />
                                    <Typography sx={{ fontWeight: 600, fontSize: '14px' }}>Drag & Drop File</Typography>
                                    <Typography sx={{ fontSize: '11px', color: '#777' }}>File Supported: Image, PDF, JIF</Typography>
                                    <Typography sx={{ fontSize: '14px', fontWeight: 600, my: 0.5 }}>OR</Typography>
                                    <Button 
                                        variant="contained" 
                                        size="small" 
                                        onClick={handleBrowseFiles}
                                        sx={{ bgcolor: '#A22', color: '#fff', '&:hover': { bgcolor: '#8b1c1c' }, borderRadius: '4px', textTransform: 'none' }}
                                    >
                                        Browse Files
                                    </Button>
                                </Stack>

                                {/* Right Side: Uploaded Files List */}
                                <Stack sx={{ width: '50%', pl: 2 }}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                                        <Typography sx={{ fontWeight: 600, fontSize: '13px' }}>Uploaded Files</Typography>
                                        {stagedFiles.length > 0 && (
                                            <Button size="small" variant="contained" sx={{ bgcolor: '#A22', color: '#fff', minWidth: 'auto', p: '2px 12px', fontSize: '12px', '&:hover': { bgcolor: '#8b1c1c' }}}>
                                                Upload
                                            </Button>
                                        )}
                                    </Stack>

                                    {stagedFiles.length === 0 ? (
                                        <Stack alignItems="center" justifyContent="center" sx={{ height: '100%', opacity: 0.5 }} spacing={1}>
                                            <Iconify icon="mdi:file-document-multiple" width={32} />
                                            <Typography sx={{ fontSize: '12px' }}>No Files</Typography>
                                        </Stack>
                                    ) : (
                                        <Box sx={{ maxHeight: '120px', overflowY: 'auto', pr: 1 }}>
                                            {stagedFiles.map((file, idx) => (
                                                <FileItem
                                                    key={`${file.name}-${idx}`}
                                                    filename={file.name}
                                                    onView={() => handleViewStagedFile(file)}
                                                    onRemove={() => handleRemoveStagedFile(idx)}
                                                />
                                            ))}
                                        </Box>
                                    )}
                                </Stack>
                            </Stack>
                        </Box>
                    )}
                </Stack>

                {/* Conditional Final Stage Table (Displays uploaded history) */}
                {Boolean(selectedCategory) && (
                    <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 2, overflow: 'hidden', mt: 4 }}>
                        {/* Table Header */}
                        <Stack direction="row" sx={{ bgcolor: '#dbdbdb', p: '10px 16px' }}>
                            <Typography sx={{ width: '5%', fontWeight: 600, fontSize: '13px' }}>Sno</Typography>
                            <Typography sx={{ width: '15%', fontWeight: 600, fontSize: '13px' }}>File Category</Typography>
                            <Typography sx={{ width: '25%', fontWeight: 600, fontSize: '13px' }}>Date & TimeStamp</Typography>
                            <Typography sx={{ width: '20%', fontWeight: 600, fontSize: '13px' }}>Uploaded by</Typography>
                            <Typography sx={{ width: '25%', fontWeight: 600, fontSize: '13px' }}>Uploaded file</Typography>
                            <Typography sx={{ width: '10%', fontWeight: 600, fontSize: '13px', textAlign: 'center' }}>Action</Typography>
                        </Stack>

                        {/* Table Rows */}
                        {mockTableData.map((row, index) => (
                            <Stack direction="row" sx={{ p: '12px 16px', borderTop: index !== 0 ? '1px solid #e0e0e0' : 'none' }} key={row.id}>
                                <Box sx={{ width: '5%' }}>
                                    <Typography sx={{ fontSize: '13px' }}>{String(index + 1).padStart(2, '0')}</Typography>
                                </Box>
                                <Box sx={{ width: '15%' }}>
                                    <Typography sx={{ fontSize: '13px' }}>{row.category}</Typography>
                                </Box>
                                <Box sx={{ width: '25%' }}>
                                    <Typography sx={{ fontSize: '13px' }}>{row.date}</Typography>
                                </Box>
                                <Box sx={{ width: '20%' }}>
                                    <Typography sx={{ fontSize: '13px', fontWeight: 600 }}>{row.user}</Typography>
                                    <Typography sx={{ fontSize: '12px', fontStyle: 'italic', color: '#555' }}>{row.role}</Typography>
                                </Box>
                                <Box sx={{ width: '25%', pr: 2 }}>
                                    {row.files.map((file, i) => (
                                        <FileItem key={i} filename={file} hideRemove />
                                    ))}
                                </Box>
                                <Box sx={{ width: '10%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                    <Button size="small" variant="contained" sx={{ bgcolor: '#A22', color: '#fff', fontSize: '12px', textTransform: 'none', '&:hover': { bgcolor: '#8b1c1c' }}}>
                                        Upload
                                    </Button>
                                </Box>
                            </Stack>
                        ))}
                    </Box>
                )}
            </Stack>

            {/* Footer Buttons */}
            <Stack direction="row" spacing={2} sx={{ mt: 4 }}>
                <Button 
                    variant="outlined" 
                    onClick={handleClose} 
                    size="small"
                    sx={{ color: '#000', borderColor: '#000', '&:hover': { bgcolor: '#f0f0f0', borderColor: '#000' } }}
                >
                    Cancel
                </Button>
                <Button 
                    variant="contained" 
                    onClick={handleSubmit(onSubmit)} 
                    size="small"
                    sx={{ bgcolor: '#A22', color: '#fff', '&:hover': { bgcolor: '#8b1c1c' } }}
                >
                    Submit
                </Button>
            </Stack>
        </Box>
    );
}