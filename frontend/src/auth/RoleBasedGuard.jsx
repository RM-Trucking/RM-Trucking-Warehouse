import PropTypes from 'prop-types';
import { m } from 'framer-motion';
// @mui
import { Container, Typography } from '@mui/material';
import { useAuthContext } from './useAuthContext';

// ----------------------------------------------------------------------

RoleBasedGuard.propTypes = {
  children: PropTypes.node,
  hasContent: PropTypes.bool,
  roles: PropTypes.arrayOf(PropTypes.string),
};

export default function RoleBasedGuard({ hasContent, roles, children }) {
  // Logic here to get current user role
  // const { user } = useAuthContext();

  const currentRole = 'admin';
  // const currentRole = user?.role || 'admin'; // admin;

  // if (typeof roles !== 'undefined' && !roles.includes(currentRole)) {
  if (currentRole) {
    return hasContent ? (
      <Container  sx={{ textAlign: 'center' }}>
        <m.div>
          <Typography variant="h3" paragraph>
            Permission Denied
          </Typography>
        </m.div>

        <m.div>
          <Typography sx={{ color: 'text.secondary' }}>You do not have permission to access this page</Typography>
        </m.div>
      </Container>
    ) : null;
  }

  return <>{children}</>;
}
