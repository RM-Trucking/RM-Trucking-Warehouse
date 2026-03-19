import PropTypes from 'prop-types';
// @mui
import { Typography, Stack, Card } from '@mui/material';


// styles
import {
    StyledRoot,
    StyledSectionBg,
    StyledSection,
    StyledContent,
    StyledImageContainer,
} from './styles';
import Image from '../../components/image';
import RMLOGO from '../../assets/RM.png';

// ----------------------------------------------------------------------

LoginLayout.propTypes = {
    title: PropTypes.string,
    children: PropTypes.node,
};

export default function LoginLayout({ children }) {
    return (
        <StyledRoot sx={{ height: '100%', alignContent: 'center', justifyContent: 'center' }}>
            <StyledSection>
        <StyledImageContainer>
          <Image
            disabledEffect
            visibleByDefault
            alt="R&M Trucking"
            src={RMLOGO}
            sx={{ width: '300px', height: '150px' }}
          />
        </StyledImageContainer>
        

        <StyledSectionBg />
      </StyledSection>
            <StyledContent>
                <Stack sx={{ width: 1 }}> {children} </Stack>
            </StyledContent>
        </StyledRoot>
    );
}
