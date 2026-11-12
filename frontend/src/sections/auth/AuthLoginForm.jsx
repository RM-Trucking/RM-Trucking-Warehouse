import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Alert, Box, Button, IconButton, InputAdornment, TextField, Typography } from '@mui/material';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlined from '@mui/icons-material/VisibilityOffOutlined';
import ArrowBackOutlined from '@mui/icons-material/ArrowBackOutlined';
import VerifiedUserRounded from '@mui/icons-material/VerifiedUserRounded';
import GppMaybeRounded from '@mui/icons-material/GppMaybeRounded';
import { useAuthContext } from '../../auth/useAuthContext';
import { useEffect } from 'react';
import ResetPasswordForm from './ResetPasswordForm';

export default function AuthLoginForm() {
  const { login } = useAuthContext();
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState('');
  const recoveryForm = useForm({ defaultValues: { email: '' } });
  const otpForm = useForm({ defaultValues: { code: '' } });
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => {
    if (!otpVerified) return undefined;
    const timer = setTimeout(() => setShowReset(true), 1000);
    return () => clearTimeout(timer);
  }, [otpVerified]);

  const submitForm = async (data) => {
    setLoginError('');
    try {
      if (login) await login(data.email, data.password);
    } catch {
      setLoginError('Unable to sign in. Please check your credentials and try again.');
    }
  };

  const fieldStyles = {
    '& .MuiInputBase-root': { fontSize: 16, backgroundColor: 'transparent' },
    '& .MuiInputLabel-root': { fontSize: 16, color: '#262626' },
    '& .MuiInput-underline:before': { borderBottomColor: '#dedede' },
    '& .MuiInput-underline:after': { borderBottomColor: '#ad2227' },
    '& .MuiInputLabel-root.Mui-focused': { color: '#ad2227' },
  };

  if (showReset) {
    return <ResetPasswordForm onBack={() => {
      setShowReset(false);
      setShowOtp(false);
      setShowRecovery(false);
      setOtpVerified(false);
      setRecoveryMessage('');
      setLoginError('');
      otpForm.reset();
      recoveryForm.reset();
    }} />;
  }

  if (showOtp) {
    return (
      <Box sx={{ width: '100%', color: '#303030' }}>
        <Typography component="h1" sx={{ fontSize: 30, fontWeight: 600, lineHeight: 1.3, mb: 1 }}>Verify OTP</Typography>
        <Typography sx={{ fontSize: 15, color: '#858585', mb: 3 }}>
          We’ve sent a 6-digit verification code to your email.<br />
          Please enter it below to proceed.
        </Typography>
        <Box component="form" noValidate onSubmit={otpForm.handleSubmit(() => {
          if (otpForm.getValues('code') === '983243') {
            setOtpVerified(true);
            setRecoveryMessage('');
          } else {
            setOtpVerified(false);
            otpForm.setError('code', { type: 'validate', message: 'Invalid code. Please check the code and try again.' });
          }
        })}>
          <TextField label="Verification Code" placeholder="Enter 6-digit OTP" variant="standard" fullWidth
            autoComplete="one-time-code" sx={{ ...fieldStyles, mb: 3,
              '& .MuiInputBase-root.Mui-error': { color: 'error.main' },
            }}
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: { inputMode: 'numeric', maxLength: 6 },
              input: { endAdornment: otpForm.formState.errors.code ? (
                <InputAdornment position="end">
                  <GppMaybeRounded sx={{ color: 'error.main', fontSize: 26 }} />
                </InputAdornment>
              ) : otpVerified ? (
                <InputAdornment position="end">
                  <VerifiedUserRounded sx={{ color: '#55ad68', fontSize: 26 }} />
                </InputAdornment>
              ) : null },
            }}
            {...otpForm.register('code', {
              required: 'Verification code is required',
              pattern: { value: /^\d{6}$/, message: 'Enter a 6-digit verification code' },
              onChange: () => setOtpVerified(false),
            })}
            error={!!otpForm.formState.errors.code} helperText={otpForm.formState.errors.code?.message} />
          {recoveryMessage && <Alert severity="info" sx={{ mb: 2 }}>{recoveryMessage}</Alert>}
          {otpVerified && <Alert severity="success" sx={{ mb: 2 }} role="status">Verified successfully.</Alert>}
          <Button type="submit" variant="contained" fullWidth disableElevation
            sx={{ bgcolor: '#ad2227', '&:hover': { bgcolor: '#921d22' }, borderRadius: '4px', minHeight: 42, fontSize: 15, fontWeight: 400, textTransform: 'none' }}>
            {otpForm.formState.errors.code ? 'Verify again' : 'Verify OTP'}
          </Button>
        </Box>
        <Box sx={{ mt: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
          <Typography sx={{ fontSize: 13, color: '#858585' }}>Didn’t receive the code?</Typography>
          <Button type="button" onClick={() => {
            setOtpVerified(false);
            otpForm.reset();
            setRecoveryMessage('Demo OTP: 983243. Email delivery is not connected.');
          }}
            sx={{ color: '#ad2227', fontSize: 13, minWidth: 0, p: 0, textTransform: 'none' }}>Resend OTP</Button>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2.5 }}>
          <Button type="button" startIcon={<ArrowBackOutlined sx={{ fontSize: '16px !important' }} />}
            onClick={() => {
              setShowOtp(false);
              setShowRecovery(false);
              setOtpVerified(false);
              setRecoveryMessage('');
              otpForm.reset();
              recoveryForm.reset();
              setLoginError('');
            }}
            sx={{ color: '#ad2227', fontSize: 14, textTransform: 'none' }}>Back to login</Button>
        </Box>
      </Box>
    );
  }

  if (showRecovery) {
    return (
      <Box sx={{ width: '100%', color: '#303030' }}>
        <Typography component="h1" sx={{ fontSize: 30, fontWeight: 600, lineHeight: 1.3, mb: 1 }}>Forgot password?</Typography>
        <Typography sx={{ fontSize: 15, color: '#858585', mb: 3 }}>
          <Box component="span" sx={{ whiteSpace: { xs: 'normal', md: 'nowrap' } }}>Enter the email address associated with your account.</Box><br />
          We’ll send a verification OTP to reset your password.
        </Typography>
        <Box component="form" noValidate onSubmit={recoveryForm.handleSubmit(() => {
          setRecoveryMessage('');
          otpForm.reset();
          setOtpVerified(false);
          setShowOtp(true);
        })}>
          <TextField label="Email ID" placeholder="Enter your registered email address" variant="standard"
            type="email" autoComplete="email" fullWidth slotProps={{ inputLabel: { shrink: true } }}
            sx={{ ...fieldStyles, mb: 3 }}
            {...recoveryForm.register('email', {
              required: 'Email ID is required',
              pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address' },
            })}
            error={!!recoveryForm.formState.errors.email} helperText={recoveryForm.formState.errors.email?.message} />
          {recoveryMessage && <Alert severity="info" sx={{ mb: 2 }}>{recoveryMessage}</Alert>}
          <Button type="submit" variant="contained" fullWidth disableElevation
            sx={{ bgcolor: '#ad2227', '&:hover': { bgcolor: '#921d22' }, borderRadius: '4px', minHeight: 42, fontSize: 15, fontWeight: 400, textTransform: 'none' }}>
            Request OTP
          </Button>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2.5 }}>
          <Button type="button" startIcon={<ArrowBackOutlined sx={{ fontSize: '16px !important' }} />}
            onClick={() => { setShowRecovery(false); setRecoveryMessage(''); }}
            sx={{ color: '#ad2227', fontSize: 14, textTransform: 'none' }}>Back to login</Button>
        </Box>
        <Typography sx={{ mt: 2.5, textAlign: 'center', fontSize: 13, color: '#858585' }}>
          Can’t access your email? Contact your administrator.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', color: '#303030' }}>
      <Typography component="h1" sx={{ fontSize: 30, fontWeight: 600, lineHeight: 1.3, mb: 1 }}>Welcome back</Typography>
      <Typography sx={{ fontSize: 15, color: '#858585', mb: 3 }}>Sign in to your RM Truck account.</Typography>
      <Box component="form" onSubmit={handleSubmit(submitForm)} noValidate>
        {loginError && <Alert severity="error" sx={{ mb: 2 }}>{loginError}</Alert>}
        <TextField label="Username / Email ID" variant="standard" fullWidth autoComplete="username"
          slotProps={{ inputLabel: { shrink: true } }} sx={{ ...fieldStyles, mb: 2.5 }}
          {...register('email', { required: 'Username / Email ID is required' })}
          error={!!errors.email} helperText={errors.email?.message} />
        <TextField label="Password" type={showPassword ? 'text' : 'password'} variant="standard" fullWidth
          autoComplete="current-password" sx={fieldStyles}
          slotProps={{ inputLabel: { shrink: true }, input: { endAdornment: (
            <InputAdornment position="end">
              <IconButton size="small" edge="end" aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((value) => !value)}>
                {showPassword ? <VisibilityOffOutlined sx={{ fontSize: 17 }} /> : <VisibilityOutlined sx={{ fontSize: 17 }} />}
              </IconButton>
            </InputAdornment>
          ) } }}
          {...register('password', { required: 'Password is required' })}
          error={!!errors.password} helperText={errors.password?.message} />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1, mb: 2 }}>
          <Button type="button" aria-expanded={showRecovery} onClick={() => setShowRecovery((value) => !value)}
            sx={{ color: '#ad2227', fontSize: 14, minWidth: 0, p: 0, textTransform: 'none' }}>Forgot password?</Button>
        </Box>
        <Button type="submit" variant="contained" fullWidth disabled={isSubmitting} disableElevation
          sx={{ bgcolor: '#ad2227', '&:hover': { bgcolor: '#921d22' }, borderRadius: '4px', minHeight: 42, fontSize: 15, fontWeight: 400, textTransform: 'none' }}>
          {isSubmitting ? 'Signing in...' : 'Login'}
        </Button>
      </Box>
      <Typography sx={{ mt: 3, textAlign: 'center', fontSize: 13, color: '#858585' }}>
        Don't have an account? Contact our administrator.
      </Typography>
    </Box>
  );
}
