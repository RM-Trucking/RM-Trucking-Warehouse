import { useState, useEffect } from 'react';
// @mui
import { Box, Divider, Tab, Tabs } from '@mui/material';
import { useLocation } from 'react-router-dom';

// hooks
import useResponsive from '../../hooks/useResponsive';
// auth
// import { useAuthContext } from '../../auth/useAuthContext';
// layouts
import LoginLayout from '../../layouts/login';
//
import AuthLoginForm from './AuthLoginForm';
import { PATH_DASHBOARD } from '../../routes/paths';
// ----------------------------------------------------------------------

export default function Login() {
    // const { getSession } = useAuthContext();
    const location = useLocation();

    // useEffect(() => {
    //     async function getUserSession() {
    //         const response = await getSession();
    //         if (response?.session?.idToken?.jwtToken) {
    //             window.location.href = PATH_DASHBOARD.general.dashboard;
    //         }
    //     }
    //     getUserSession();
    // }, []);


    return (
        <LoginLayout>
            <AuthLoginForm />
        </LoginLayout>
    );
}
