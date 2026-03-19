import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Iconify from '../../../components/iconify';
import { Stack, Typography, MenuItem } from "@mui/material";
import { useDispatch, useSelector } from '../../../redux/store';

import MenuPopover from '../../../components/menu-popover';
import { PATH_AUTH } from '../../../routes/paths';
import { useAuthContext } from '../../../auth/useAuthContext';


export default function UserAccount() {
    const navigate = useNavigate();
    const {
        dashboardSearchStr
    } = useSelector(({ dashboarddata }) => dashboarddata);
    const { logout } = useAuthContext();
        
    const dispatch = useDispatch();
    const [openPopover, setOpenPopover] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);

    const handleUserMenu = (event) => {
        setOpenPopover(true);
        setAnchorEl(event?.currentTarget);
    }
    const handleClosePopover = () => {
        setOpenPopover(false);
        setAnchorEl(null);
    };
    const handleClickedItem = async (event) => {
        if (event?.target?.id === 'logout') {
            await logout();
            navigate(PATH_AUTH.login, { replace: true });
        }
        setOpenPopover(false);
        setAnchorEl(null);
    }
    return (
        <Stack flexDirection={"row"} alignItems={"center"}>
            <Iconify icon="mdi:bell-notification" sx={{ mr: 2 }} />
            <Stack flexDirection={"row"} alignItems={"center"} sx={{ mr: 1.2 }}>
                <Iconify icon="carbon:user-avatar-filled" sx={{ mr: 1.2, cursor: "pointer" }} />
                <Stack flexDirection={"column"}>
                    <Typography variant="subtitle2" noWrap sx={{ fontStyle: "Open Sans, sans-serif !important", fontWeight: "600", fontSize: "14px", lineHeight: "1" }}>
                        {dashboardSearchStr?.displayName || "Valli Veluvarthi"}
                    </Typography>
                    <Typography variant="subtitle2" noWrap sx={{ fontStyle: "Open Sans, sans-serif !important", fontWeight: "600", fontSize: "12px", lineHeight: "1.2" }}>
                        {dashboardSearchStr?.role || "Program Analyst"}
                    </Typography>
                </Stack>
            </Stack>
            <Iconify icon="qlementine-icons:menu-dots-16" sx={{ mr: 1.2, cursor: "pointer" }} onClick={handleUserMenu} />

            {/*  user menu */}
            <MenuPopover open={openPopover} anchorEl={anchorEl} onClose={handleClosePopover} sx={{ width: 150, p: 0 }} disableScrollLock>
                <Stack sx={{ p: 1 }}>
                    <MenuItem key="1" onClick={handleClickedItem} id={"logout"}>
                        <Iconify icon="streamline-sharp:logout-2-remix" sx={{ mr: 1 }} /> Logout
                    </MenuItem>
                </Stack>
            </MenuPopover>
        </Stack>
    );
}