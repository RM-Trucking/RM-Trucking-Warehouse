import { TextField, IconButton } from "@mui/material";
import {InputAdornment} from "@mui/material";
import Iconify from '../../../components/iconify';
import { useDispatch, useSelector } from '../../../redux/store';
import { setDashboardSearchStr } from '../../../redux/slices/dashboard';

export default function SearchBar() {
    const {
        dashboardSearchStr
    } = useSelector(({ dashboarddata }) => dashboarddata);
    const dispatch = useDispatch();
    const handleSearch = (event) => {
        dispatch(setDashboardSearchStr(event?.target?.value))
    }
    return (
        <TextField
            variant="outlined"
            placeholder="Search..."
            fullWidth
            value={dashboardSearchStr}
            onChange={handleSearch}
            InputProps={{
                endAdornment: (
                    <InputAdornment position="end">
                        <IconButton edge="end">
                            <Iconify icon="material-symbols:search" sx={{ mr: 1 }} />
                        </IconButton>
                    </InputAdornment>
                ),
            }}
            sx={{
                '& .MuiInputBase-input.MuiOutlinedInput-input': {
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 0 0 5px',
                },
                width : "25%"
              }}
        />
    );
}