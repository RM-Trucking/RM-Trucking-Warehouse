// @mui
import { styled, alpha } from '@mui/material/styles';
import backgroundImage from '../../assets/rm-truck.jpg';

// ----------------------------------------------------------------------

export const StyledRoot = styled('main')(({ theme }) => ({
  backgroundImage: `url(${backgroundImage})`,
  // height: '100%',
  display: 'flex',
  justifyContent : "center",
  position: 'relative',
  // zIndex: '-1',
  zIndex: 0,
  // padding : "2% 15% 0 15%",
  backgroundSize: "cover",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "center",
}));

export const StyledSection = styled('div')(({ theme }) => ({
  display: 'none',
  position: 'relative',
  [theme.breakpoints.up('xl')]: {
    // flexGrow: 1,
    minWidth: '663px',
    // height : "800px",
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
  },
}));

export const StyledSectionBg = styled('div')(({ theme }) => ({
  // ...bgGradient({
  //   color: alpha(theme.palette.background.default, theme.palette.mode === 'light' ? 0.9 : 0.94),
  //   imgUrl: '/assets/background/overlay_2.jpg',
  // }),
  backgroundColor: alpha(theme.palette.background.default, 0.71),
  top: 0,
  left: 0,
  zIndex: -1,
  width: '100%',
  height: '100%',
  position: 'absolute',
  transform: 'scaleX(-1)',
  boxShadow: "0px 3px 16px #00000029",
}));

export const StyledContent = styled('div')(({ theme }) => ({
  width: 700,
  margin: '0px',
  display: 'flex',
  zIndex : 1,
  height : "max-content",
  justifyContent: 'center',
  padding: theme.spacing(1, 2),
  boxShadow: "0px 0px 5px #00000029",
  backgroundColor : "rgba(255, 255, 255, 0.5)",
  [theme.breakpoints.up('md')]: {
    flexShrink: 0,
    padding: theme.spacing(0),
  },
  [theme.breakpoints.up('xl')]: {
  },
}));

export const StyledImageContainer = styled('div')(() => ({
  display: 'flex',
  alignItems: 'center',
}));
export const StyledImageSecondaryContainer = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  flexDirection: 'column',
  [theme.breakpoints.up('md')]: {
    flexDirection: 'row',
  },
}));
export const StyledImageLabel = styled('div')(() => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  marginLeft: '15px',
}));
export const StyledLoginImageLabel = styled('div')(() => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
}));
export const StyledBannerContainer = styled('div')(() => ({
  display: 'flex',
  justifyContent: 'flex-end',
  paddingLeft: '10%',
  maxWidth: 'fit-content',
  marginTop: '20%',
}));
export const StyledBannerContent = styled('div')(() => ({
  textAlign: 'left',
  paddingBottom: '12.5px',
  marginTop: '7%',
}));
export const StyledIconContainer = styled('div')(() => ({
  padding : "12px",
}));
