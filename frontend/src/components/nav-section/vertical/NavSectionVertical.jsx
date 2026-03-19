import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { List, Stack, Button, Collapse } from '@mui/material';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import {
  setCurrentRateRoutedFrom
} from '../../../redux/slices/rate';
import { useDispatch } from '../../../redux/store';

// 1. Recursive Item Component
function NavItem({ item, depth = 0 }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const hasActiveChild = (node) => {
    if (node.path && pathname.startsWith(node.path)) return true;
    // if (node.path === pathname) return true;
    return node.children?.some(child => hasActiveChild(child));
  };

  const [open, setOpen] = useState(hasActiveChild(item));
  const hasChildren = item.children && item.children.length > 0;
  const isActive = item.path ? pathname.startsWith(item.path) : false;
  // const isActive = pathname === item.path;

  // FIX: This function now handles BOTH opening the list AND routing
  const handleClick = (e) => {
    // 1. If it has a path, go there immediately
    if (item.path) {
      if (item.path.includes('/customer-maintenance/rate-maintenance')) {
        dispatch(setCurrentRateRoutedFrom('customer'));
      }
      if (item.path.includes('/carrier-maintenance/rate-maintenance')) {
        dispatch(setCurrentRateRoutedFrom('carrier'));
      }
      navigate(item.path);
    }

    // 2. If it has children, toggle the sub-menu open/closed
    if (hasChildren) {
      setOpen(!open);
    }
  };

  return (
    <>
      <Button
        onClick={handleClick}
        fullWidth
        sx={{
          justifyContent: 'space-between',
          pl: depth * 2 + 2,
          // color: isActive ? 'primary.main' : '#fff',
          color: '#fff',
          fontWeight: isActive ? 700 : 400,
          fontSize: '13px',
          textTransform: 'none',
          '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.08)' }
        }}
      >
        <span style={{ textDecoration: isActive ? 'underline' : 'none' }}>
          {item.title}
        </span>
        {/* Only show arrows if there are children to expand */}
        {hasChildren && (open ? <ExpandLess /> : <ExpandMore />)}
      </Button>

      {hasChildren && (
        <Collapse in={open} timeout="auto" unmountOnExit>
          <Stack sx={{ width: '100%' }}>
            {item.children.map((child) => (
              <NavItem key={child.title + child.path} item={child} depth={depth + 1} />
            ))}
          </Stack>
        </Collapse>
      )}
    </>
  );
}


// 2. Main Section Component
export default function NavSectionVertical({ data, ...other }) {
  return (
    <Stack sx={{ pt: 2, width: '100%' }} {...other}>
      <List disablePadding sx={{ px: 1 }}>
        {data.map((group) => (
          <NavItem key={group.title} item={group} />
        ))}
      </List>
    </Stack>
  );
}
