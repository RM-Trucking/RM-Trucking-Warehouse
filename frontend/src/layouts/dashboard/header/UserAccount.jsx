import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Iconify from '../../../components/iconify';
import { Stack, IconButton, MenuItem } from "@mui/material";

import MenuPopover from '../../../components/menu-popover';
import { PATH_AUTH } from '../../../routes/paths';
import { useAuthContext } from '../../../auth/useAuthContext';


export default function UserAccount() {
    const navigate = useNavigate();
    const { logout } = useAuthContext();
        
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
            <IconButton
                aria-label="Account menu"
                aria-haspopup="menu"
                aria-expanded={openPopover ? 'true' : undefined}
                onClick={handleUserMenu}
                sx={{ color: 'inherit' }}
            >
                <Iconify icon="qlementine-icons:menu-dots-16" />
            </IconButton>

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
