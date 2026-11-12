import { useState } from 'react';
import PropTypes from 'prop-types';
import { useForm } from 'react-hook-form';
import { Box, Button, Dialog, IconButton, InputAdornment, TextField, Typography } from '@mui/material';
import CheckRounded from '@mui/icons-material/CheckRounded';
import ArrowBackOutlined from '@mui/icons-material/ArrowBackOutlined';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlined from '@mui/icons-material/VisibilityOffOutlined';

ResetPasswordForm.propTypes = { onBack: PropTypes.func.isRequired };

export default function ResetPasswordForm({ onBack }) {
  const [visible, setVisible] = useState({ password: false, confirmPassword: false });
  const [complete, setComplete] = useState(false);
  const { register, handleSubmit, getValues, reset, formState: { errors } } = useForm({
    defaultValues: { password: '', confirmPassword: '' },
  });
  return (
    <Box sx={{ width: '100%', color: '#303030' }}>
      <Typography component="h1" sx={{ fontSize: 30, fontWeight: 600, lineHeight: 1.3, mb: 1 }}>Reset password</Typography>
      <Typography sx={{ fontSize: 15, color: '#858585', mb: 3 }}>Create a new password for your account.</Typography>
      <Box sx={{ fontSize: 14, color: '#858585', mb: 3 }}>
        Password must :
        <Box component="ul" sx={{ m: 0, pl: 2.5, lineHeight: 1.7 }}>
          <li>An uppercase letter &amp; lowercase letter</li>
          <li>A number &amp; special character</li>
          <li>At least 8 characters long.</li>
        </Box>
      </Box>
        <Box component="form" noValidate onSubmit={handleSubmit(() => { setComplete(true); reset(); })}>
          {['password', 'confirmPassword'].map((name) => (
            <TextField key={name} label={name === 'password' ? 'New Password' : 'Confirm Password'}
              type={visible[name] ? 'text' : 'password'} variant="standard" fullWidth autoComplete="new-password"
              sx={{ mb: 3, '& .MuiInputBase-root': { fontSize: 16 }, '& .MuiInputLabel-root': { fontSize: 16, color: '#262626' }, '& .MuiInput-underline:after': { borderBottomColor: '#ad2227' } }}
              slotProps={{ inputLabel: { shrink: true }, input: { endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" edge="end" aria-label={`${visible[name] ? 'Hide' : 'Show'} ${name === 'password' ? 'new password' : 'confirm password'}`}
                    onClick={() => setVisible((value) => ({ ...value, [name]: !value[name] }))}>
                    {visible[name] ? <VisibilityOffOutlined sx={{ fontSize: 18 }} /> : <VisibilityOutlined sx={{ fontSize: 18 }} />}
                  </IconButton>
                </InputAdornment>
              ) } }}
              {...register(name, name === 'password' ? {
                required: 'New password is required',
                deps: ['confirmPassword'],
                validate: (value) => (value.length >= 8 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value) && /[^A-Za-z0-9\s]/.test(value)) || 'Please meet all password requirements',
              } : {
                required: 'Please confirm your password',
                validate: (value) => value === getValues('password') || 'Passwords do not match',
              })}
              error={!!errors[name]} helperText={errors[name]?.message} />
          ))}
          <Button type="submit" variant="contained" fullWidth disableElevation
            sx={{ bgcolor: '#ad2227', '&:hover': { bgcolor: '#921d22' }, borderRadius: '4px', minHeight: 42, fontSize: 15, fontWeight: 400, textTransform: 'none' }}>Reset password</Button>
        </Box>
      <Dialog open={complete} aria-labelledby="password-reset-success-title" aria-describedby="password-reset-success-description"
        maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: '10px', maxWidth: 520, m: 2 } } }}>
        <Box sx={{ px: { xs: 3, sm: 5 }, py: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <Box sx={{ width: 52, height: 52, borderRadius: '50%', bgcolor: '#e0ffe7', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2.5 }}>
            <CheckRounded sx={{ color: '#55ad68', fontSize: 30 }} />
          </Box>
          <Typography id="password-reset-success-title" component="h2" sx={{ fontSize: 24, fontWeight: 600, color: '#303030', mb: 1 }}>
            Password updated successfully
          </Typography>
          <Typography id="password-reset-success-description" sx={{ fontSize: 14, color: '#858585', mb: 3 }}>
            You’ll be redirected to the login page.
          </Typography>
          <Button variant="contained" disableElevation onClick={onBack}
            sx={{ bgcolor: '#ad2227', '&:hover': { bgcolor: '#921d22' }, borderRadius: '4px', width: 235, maxWidth: '100%', minHeight: 42, fontSize: 14, textTransform: 'none' }}>
            Go to login
          </Button>
        </Box>
      </Dialog>
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2.5 }}>
        <Button type="button" startIcon={<ArrowBackOutlined sx={{ fontSize: '16px !important' }} />} onClick={onBack}
          sx={{ color: '#ad2227', fontSize: 14, textTransform: 'none' }}>Back to login</Button>
      </Box>
    </Box>
  );
}
